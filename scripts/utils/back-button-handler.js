// scripts/utils/back-button-handler.js - 안드로이드 물리 뒤로가기 버튼 처리

/**
 * 뒤로가기 버튼 핸들러
 * 옵션 1: 탭 간 이동 (작업 상세 → 목록 → 홈)
 */

let backPressedOnce = false;
let backPressTimer = null;

/**
 * 현재 화면 상태 감지
 */
function getCurrentScreenState() {
  // 1. 작업 수정 중인지 확인
  if (window.editingTaskId) {
    return 'editing';
  }
  
  // 2. 작업자 수정 폼이 표시되어 있는지 확인
  const workerEditContainer = document.querySelector('.worker-edit-container');
  if (workerEditContainer) {
    return 'worker-editing';
  }
  
  // 3. 현재 활성화된 탭 확인
  const tabContent = document.getElementById('tab-content');
  const homeButtons = document.getElementById('home-buttons');
  
  if (tabContent && tabContent.style.display === 'block') {
    // 탭 화면이 열려 있음
    const activeTab = document.querySelector('.worker-tab-btn.active, .tab-btn.active');
    if (activeTab) {
      const tabId = activeTab.id;
      if (tabId === 'today-tab' || tabId === 'done-tab' || tabId === 'reserve-tab') {
        return 'task-list';
      }
      return 'other-tab';
    }
    return 'task-list';
  } else if (homeButtons && homeButtons.style.display !== 'none') {
    // 홈 화면
    return 'home';
  }
  
  return 'home';
}

/**
 * 폼이 수정되었는지 확인
 */
function isFormModified() {
  const form = document.getElementById('task-form');
  if (!form) return false;
  
  // 간단한 체크: 폼에 입력된 값이 있는지 확인
  const inputs = form.querySelectorAll('input, textarea, select');
  for (let input of inputs) {
    if (input.value && input.value.trim() !== '') {
      return true;
    }
  }
  
  return false;
}

/**
 * 토스트 메시지 표시
 */
function showToast(message, duration = 2000) {
  // 기존 토스트 제거
  const existingToast = document.getElementById('back-button-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.id = 'back-button-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 12px 24px;
    border-radius: 25px;
    font-size: 14px;
    font-weight: 600;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    animation: fadeInUp 0.3s ease-out;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeOutDown 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * 확인 다이얼로그 표시 (저장 확인용)
 */
function showConfirmDialog(message) {
  return new Promise((resolve) => {
    const confirmed = confirm(message);
    resolve(confirmed);
  });
}

/**
 * 홈 화면으로 이동
 */
function goToHome() {
  console.log('🏠 홈으로 이동');
  
  // 편집 상태 초기화
  window.editingTaskId = null;
  window.editingTabType = null;
  
  // 앱 상태 초기화
  if (window.appState && window.appState.clearEditingTask) {
    window.appState.clearEditingTask();
  }
  
  // 탭 컨텐츠 숨기기
  const tabContent = document.getElementById('tab-content');
  if (tabContent) {
    tabContent.style.display = 'none';
  }
  
  // 홈 버튼 표시
  const homeButtons = document.getElementById('home-buttons');
  if (homeButtons) {
    homeButtons.style.display = 'grid';
  }
  
  // 홈 버튼 표시
  const homeBtn = document.querySelector('.home-btn');
  if (homeBtn) {
    homeBtn.style.display = 'block';
  }
}

/**
 * 작업 목록으로 이동
 */
function goToTaskList() {
  console.log('📋 작업 목록으로 이동');
  
  // 편집 상태 초기화
  window.editingTaskId = null;
  window.editingTabType = null;
  
  // 작업자 모드인지 확인
  const isWorkerMode = window.currentUserInfo && !window.isCurrentUserAdmin();
  
  if (isWorkerMode) {
    // 작업자: 활성화된 탭에 따라 복원
    const activeTab = document.querySelector('.worker-tab-btn.active');
    if (activeTab && activeTab.id === 'done-tab') {
      if (window.loadWorkerDoneTasks) {
        window.loadWorkerDoneTasks();
      }
    } else {
      if (window.loadWorkerTodayTasks) {
        window.loadWorkerTodayTasks();
      }
    }
  } else {
    // 관리자: 작업입력 탭이면 홈으로
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && activeTab.id === 'input-tab') {
      goToHome();
    }
  }
}

/**
 * 뒤로가기 버튼 처리
 */
async function handleBackButton(event) {
  const screenState = getCurrentScreenState();
  console.log('🔙 뒤로가기 버튼 - 현재 화면:', screenState);
  
  switch (screenState) {
    case 'editing':
    case 'worker-editing':
      // 작업 수정 중: 저장 확인
      event.preventDefault();
      
      const confirmMessage = '변경사항을 저장하시겠습니까?';
      const shouldSave = await showConfirmDialog(confirmMessage);
      
      if (shouldSave) {
        // 저장 버튼 클릭 (저장 후 자동으로 목록으로 이동)
        const saveButton = document.querySelector('#task-form button[type="button"]');
        if (saveButton) {
          saveButton.click();
        }
      } else {
        // 저장 안 함 - 취소 처리
        if (screenState === 'worker-editing' && window.cancelWorkerEdit) {
          window.cancelWorkerEdit();
        } else {
          goToTaskList();
        }
      }
      
      // history 복원
      history.pushState(null, '', location.href);
      break;
      
    case 'task-list':
      // 작업 목록: 홈으로
      event.preventDefault();
      goToHome();
      
      // history 복원
      history.pushState(null, '', location.href);
      break;
      
    case 'other-tab':
      // 다른 탭: 홈으로
      event.preventDefault();
      goToHome();
      
      // history 복원
      history.pushState(null, '', location.href);
      break;
      
    case 'home':
      // 홈 화면: 2번 눌러 종료
      if (backPressedOnce) {
        // 2번째 누름 - 앱 종료 (실제로는 백그라운드)
        console.log('👋 앱 종료');
        // window.close()는 PWA에서 작동하지 않을 수 있음
        // 대신 아무것도 하지 않고 기본 동작 허용
        return; // 기본 동작 허용 (브라우저가 뒤로가기 처리)
      } else {
        // 1번째 누름 - 토스트 표시
        event.preventDefault();
        showToast('한 번 더 누르면 종료됩니다');
        backPressedOnce = true;
        
        // 2초 후 플래그 초기화
        if (backPressTimer) {
          clearTimeout(backPressTimer);
        }
        backPressTimer = setTimeout(() => {
          backPressedOnce = false;
        }, 2000);
        
        // history 복원
        history.pushState(null, '', location.href);
      }
      break;
      
    default:
      // 기본: 이전 화면으로
      // 기본 동작 허용
      break;
  }
}

/**
 * 초기화 및 이벤트 리스너 등록
 */
function initBackButtonHandler() {
  console.log('🔧 뒤로가기 버튼 핸들러 초기화');
  
  // popstate 이벤트 리스너
  window.addEventListener('popstate', handleBackButton);
  
  // 초기 히스토리 항목 추가 (뒤로가기 시 이벤트가 발생하도록)
  history.pushState(null, '', location.href);
  
  // CSS 애니메이션 추가
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translate(-50%, 20px);
      }
      to {
        opacity: 1;
        transform: translate(-50%, 0);
      }
    }
    
    @keyframes fadeOutDown {
      from {
        opacity: 1;
        transform: translate(-50%, 0);
      }
      to {
        opacity: 0;
        transform: translate(-50%, 20px);
      }
    }
  `;
  document.head.appendChild(style);
  
  console.log('✅ 뒤로가기 버튼 핸들러 초기화 완료');
}

// DOM 로드 후 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBackButtonHandler);
} else {
  initBackButtonHandler();
}

// 전역 함수로 등록
window.backButtonHandler = {
  init: initBackButtonHandler,
  showToast: showToast,
  goToHome: goToHome,
  goToTaskList: goToTaskList
};
