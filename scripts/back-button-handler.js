// scripts/back-button-handler.js - 모바일 뒤로가기 버튼 제어

// 네비게이션 히스토리 관리
window.navigationHistory = window.navigationHistory || [];

// 현재 화면 추적
window.currentScreen = 'home';

// 뒤로가기 확인 타이머
let backPressedOnce = false;

// 화면 이동 기록 함수
function recordNavigation(screenName) {
  console.log('화면 이동 기록:', screenName);
  window.currentScreen = screenName;
  window.navigationHistory.push(screenName);
  
  // 히스토리가 너무 길어지지 않도록 제한 (최대 50개)
  if (window.navigationHistory.length > 50) {
    window.navigationHistory.shift();
  }
}

// 뒤로가기 처리 함수
function handleBackButton() {
  console.log('=== 뒤로가기 버튼 클릭 ===');
  console.log('현재 화면:', window.currentScreen);
  console.log('히스토리:', window.navigationHistory);
  
  const userInfo = window.getCurrentUserInfo ? window.getCurrentUserInfo() : null;
  const isAdmin = window.isCurrentUserAdmin ? window.isCurrentUserAdmin() : false;
  
  // 편집 모드인 경우 - 최우선 처리
  if (window.editingTaskId) {
    console.log('편집 모드 → 편집 취소');
    if (isAdmin) {
      // 관리자: 원래 탭으로 복귀
      const tabType = window.editingTabType || 'check';
      window.editingTaskId = null;
      window.editingTabType = null;
      
      if (tabType === 'reserve') {
        if (window.loadReserveTasks) window.loadReserveTasks();
      } else if (tabType === 'done') {
        if (window.loadDoneTasks) window.loadDoneTasks();
      } else {
        if (window.showTaskTab) window.showTaskTab('check');
      }
    } else {
      // 작업자: 취소 함수 호출
      if (window.cancelWorkerEdit) {
        window.cancelWorkerEdit();
      }
    }
    return;
  }
  
  // 관리자 모드
  if (isAdmin) {
    // 탭이 열려있는 경우
    const tabContent = document.getElementById('tab-content');
    if (tabContent && tabContent.style.display !== 'none') {
      console.log('관리자: 탭 열림 → 홈으로');
      if (window.backToHome) {
        window.backToHome();
        recordNavigation('home');
      }
      return;
    }
    
    // 홈 화면인 경우 - 종료 확인
    console.log('관리자: 홈 화면 → 종료 확인');
    showExitConfirmation();
    return;
  }
  
  // 작업자 모드
  else {
    // 작업자는 항상 작업 화면에 있으므로 바로 종료 확인
    console.log('작업자: 종료 확인');
    showExitConfirmation();
    return;
  }
}

// 종료 확인 팝업
function showExitConfirmation() {
  if (backPressedOnce) {
    console.log('앱 종료');
    // PWA에서는 window.close()가 작동하지 않으므로
    // 사용자에게 직접 종료하도록 안내
    if (confirm('앱을 종료하시겠습니까?\n\n확인을 누른 후 홈 버튼을 눌러주세요.')) {
      // 히스토리를 초기화하여 뒤로가기로 앱을 벗어날 수 있게 함
      window.history.back();
    }
    backPressedOnce = false;
    return;
  }
  
  backPressedOnce = true;
  
  // 토스트 메시지 표시
  showToast('뒤로가기 버튼을 한 번 더 누르면 종료됩니다');
  
  // 2초 후 리셋
  setTimeout(() => {
    backPressedOnce = false;
  }, 2000);
}

// 토스트 메시지 표시 함수
function showToast(message) {
  // 기존 토스트 제거
  const existingToast = document.querySelector('.exit-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // 새 토스트 생성
  const toast = document.createElement('div');
  toast.className = 'exit-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px 24px;
    border-radius: 24px;
    font-size: 14px;
    z-index: 10000;
    animation: fadeInOut 2s ease-in-out;
  `;
  
  document.body.appendChild(toast);
  
  // 2초 후 제거
  setTimeout(() => {
    toast.remove();
  }, 2000);
}

// CSS 애니메이션 추가
if (!document.getElementById('toast-animation-style')) {
  const style = document.createElement('style');
  style.id = 'toast-animation-style';
  style.textContent = `
    @keyframes fadeInOut {
      0% {
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
      }
      10% {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      90% {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      100% {
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
      }
    }
  `;
  document.head.appendChild(style);
}

// 브라우저 뒤로가기 이벤트 감지 (Android)
window.addEventListener('popstate', (event) => {
  console.log('popstate 이벤트 발생');
  event.preventDefault();
  handleBackButton();
  
  // 히스토리에 더미 상태를 추가하여 뒤로가기 버튼이 계속 작동하도록 함
  window.history.pushState(null, '', window.location.href);
});

// 초기 히스토리 상태 설정
window.addEventListener('load', () => {
  // 더미 히스토리 추가 (뒤로가기 버튼이 작동하도록)
  window.history.pushState(null, '', window.location.href);
  
  console.log('뒤로가기 핸들러 초기화 완료');
});

// 기존 네비게이션 함수들에 히스토리 기록 추가
const originalOpenTab = window.openTab;
if (originalOpenTab) {
  window.openTab = function(name) {
    recordNavigation('tab-' + name);
    return originalOpenTab.apply(this, arguments);
  };
}

const originalBackToHome = window.backToHome;
if (originalBackToHome) {
  window.backToHome = function() {
    recordNavigation('home');
    return originalBackToHome.apply(this, arguments);
  };
}

const originalShowTaskTab = window.showTaskTab;
if (originalShowTaskTab) {
  window.showTaskTab = function(type) {
    recordNavigation('task-' + type);
    return originalShowTaskTab.apply(this, arguments);
  };
}

// 작업자 탭 이동 시에도 기록
const originalLoadWorkerTodayTasks = window.loadWorkerTodayTasks;
if (originalLoadWorkerTodayTasks) {
  window.loadWorkerTodayTasks = function() {
    recordNavigation('worker-today');
    return originalLoadWorkerTodayTasks.apply(this, arguments);
  };
}

const originalLoadWorkerDoneTasks = window.loadWorkerDoneTasks;
if (originalLoadWorkerDoneTasks) {
  window.loadWorkerDoneTasks = function() {
    recordNavigation('worker-done');
    return originalLoadWorkerDoneTasks.apply(this, arguments);
  };
}

// 전역 함수 등록
window.recordNavigation = recordNavigation;
window.handleBackButton = handleBackButton;

console.log('✅ 뒤로가기 버튼 핸들러 로드 완료');
