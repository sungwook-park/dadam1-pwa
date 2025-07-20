// scripts/auth.js - 모바일 대응 및 권한 관리
import { auth, getUserInfo } from './firebase-config.js';
import {
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// 관리자 이메일 정의 (백업용)
const ADMIN_EMAIL = 'admin@dadam.tv';

// 전역 사용자 정보 저장
window.currentUserInfo = null;

// 사용자 권한 확인 (role 기반)
function isAdmin(userInfo) {
  if (!userInfo) return false;
  return userInfo.role === 'admin' || userInfo.email === ADMIN_EMAIL;
}

// 현재 사용자 정보 가져오기
function getCurrentUserInfo() {
  return window.currentUserInfo;
}

// 현재 사용자 이름 가져오기
function getCurrentUserName() {
  return window.currentUserInfo?.name || '';
}

// 사용자 타입에 따른 제목 설정
function updateTitle(userInfo) {
  const headerTitle = document.querySelector('.header-title');
  const pageTitle = document.querySelector('title');
  
  if (isAdmin(userInfo)) {
    if (headerTitle) {
      headerTitle.innerHTML = `
        <span class="header-icon">📋</span>
        다담업무관리
      `;
    }
    if (pageTitle) {
      pageTitle.textContent = '다담업무관리';
    }
  } else {
    if (headerTitle) {
      headerTitle.innerHTML = `
        <span class="header-icon">📋</span>
        다담업무 - ${userInfo?.name || ''}
      `;
    }
    if (pageTitle) {
      pageTitle.textContent = `다담업무 - ${userInfo?.name || ''}`;
    }
  }
}

// 권한에 따른 UI 표시/숨김
function setupUserInterface(userInfo) {
  const homeButtons = document.getElementById('home-buttons');
  const homeBtn = document.querySelector('.home-btn');
  
  if (isAdmin(userInfo)) {
    // 관리자: 모든 기능 표시
    if (homeButtons) homeButtons.style.display = 'grid';
    if (homeBtn) homeBtn.style.display = 'block';
    
    console.log('👑 관리자 모드 활성화:', userInfo.name);
  } else {
    // 작업자: 홈 버튼과 메뉴 숨기고 바로 작업 화면으로
    if (homeButtons) homeButtons.style.display = 'none';
    if (homeBtn) homeBtn.style.display = 'none';
    
    // 바로 오늘작업 화면으로 이동
    setTimeout(() => {
      showWorkerInterface(userInfo);
    }, 100);
    
    console.log('👷 작업자 모드 활성화:', userInfo.name);
  }
}

// 작업자 전용 인터페이스 표시
function showWorkerInterface(userInfo) {
  const tabContent = document.getElementById('tab-content');
  const tabTitle = document.getElementById('tab-title');
  const tabBody = document.getElementById('tab-body');
  
  if (tabContent && tabTitle && tabBody) {
    tabContent.style.display = 'block';
    
    // 탭 제목 설정 (작업자 이름 포함)
    tabTitle.innerHTML = `
      <div class="mobile-tab-title">
        <h3>📋 ${userInfo?.name || '작업자'} 작업 현황</h3>
      </div>
    `;
    
    // 작업자용 서브탭 (오늘작업, 완료작업만)
    tabBody.innerHTML = `
      <div class="worker-subtabs">
        <button onclick="loadWorkerTodayTasks()" class="worker-tab-btn active" id="today-tab">
          📅 오늘작업
        </button>
        <button onclick="loadWorkerDoneTasks()" class="worker-tab-btn" id="done-tab">
          ✅ 완료작업
        </button>
      </div>
      <div id="worker-task-content">
        <div class="task-list"></div>
      </div>
    `;
    
    // 기본으로 오늘작업 로드
    if (window.loadWorkerTodayTasks) {
      window.loadWorkerTodayTasks();
    }
  }
}

// Firebase 에러 메시지 한국어 변환
function getKoreanErrorMessage(errorCode) {
  const errorMessages = {
    'auth/user-not-found': '등록되지 않은 이메일입니다.',
    'auth/wrong-password': '비밀번호가 틀렸습니다.',
    'auth/invalid-email': '이메일 형식이 올바르지 않습니다.',
    'auth/network-request-failed': '네트워크 연결을 확인해주세요.',
    'auth/too-many-requests': '너무 많은 로그인 시도입니다. 잠시 후 다시 시도해주세요.',
    'auth/user-disabled': '비활성화된 계정입니다.',
    'auth/invalid-credential': '인증 정보가 올바르지 않습니다.',
    'default': '로그인에 실패했습니다.'
  };
  
  return errorMessages[errorCode] || errorMessages['default'];
}

// 로그인 처리
async function handleLogin() {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  
  if (!emailInput || !passwordInput) {
    alert('로그인 폼을 찾을 수 없습니다.');
    return;
  }
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  
  // 입력 검증
  if (!email) {
    alert('이메일을 입력해주세요.');
    emailInput.focus();
    return;
  }
  
  if (!password) {
    alert('비밀번호를 입력해주세요.');
    passwordInput.focus();
    return;
  }
  
  try {
    // 로딩 상태 표시
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = '로그인 중...';
    }
    
    await signInWithEmailAndPassword(auth, email, password);
    console.log('로그인 성공:', email);
  } catch (error) {
    console.error('로그인 에러:', error);
    const errorMessage = getKoreanErrorMessage(error.code);
    alert(errorMessage);
  } finally {
    // 로딩 상태 해제
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = '로그인';
    }
  }
}

// 로그아웃 처리
async function handleLogout() {
  try {
    await signOut(auth);
    console.log('로그아웃 성공');
    
    // 상태 초기화
    if (window.appState && window.appState.reset) {
      window.appState.reset();
    }
  } catch (error) {
    console.error('로그아웃 에러:', error);
    alert('로그아웃 중 오류가 발생했습니다.');
  }
}

// 인증 상태 변화 감지
onAuthStateChanged(auth, async (user) => {
  const loginView = document.getElementById('login-view');
  const mainView = document.getElementById('main-view');
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (!loginView || !mainView || !logoutBtn) {
    console.error('필요한 DOM 요소를 찾을 수 없습니다.');
    return;
  }
  
  try {
    if (user) {
      // 로그인 상태 - 사용자 정보 조회
      console.log('사용자 로그인:', user.email);
      
      // Firebase users 컬렉션에서 사용자 정보 조회
      const userInfo = await getUserInfo(user.email);
      
      if (!userInfo) {
        console.error('❌ 사용자 정보를 찾을 수 없습니다:', user.email);
        alert('사용자 정보를 찾을 수 없습니다. 관리자에게 문의하세요.');
        await signOut(auth);
        return;
      }
      
      // 전역 사용자 정보 저장
      window.currentUserInfo = userInfo;
      
      loginView.style.display = 'none';
      mainView.style.display = 'block';
      logoutBtn.style.display = 'block';
      
      // 제목 업데이트
      updateTitle(userInfo);
      
      // 권한에 따른 UI 설정
      setupUserInterface(userInfo);
      
      // 앱 상태에 사용자 정보 저장
      if (window.appState) {
        window.appState.currentUser = {
          uid: user.uid,
          email: userInfo.email,
          name: userInfo.name,
          role: userInfo.role,
          isAdmin: isAdmin(userInfo)
        };
      }
      
    } else {
      // 로그아웃 상태
      console.log('사용자 로그아웃');
      
      // 전역 사용자 정보 초기화
      window.currentUserInfo = null;
      
      loginView.style.display = 'block';
      mainView.style.display = 'none';
      logoutBtn.style.display = 'none';
      
      // 폼 초기화
      const loginForm = document.getElementById('login-form');
      if (loginForm) {
        loginForm.reset();
      }
      
      // 제목 초기화
      const headerTitle = document.querySelector('.header-title');
      const pageTitle = document.querySelector('title');
      if (headerTitle) {
        headerTitle.innerHTML = `
          <span class="header-icon">📋</span>
          다담업무관리
        `;
      }
      if (pageTitle) {
        pageTitle.textContent = '다담업무관리';
      }
      
      // 앱 상태 초기화
      if (window.appState && window.appState.reset) {
        window.appState.reset();
      }
    }
  } catch (error) {
    console.error('인증 상태 처리 중 오류:', error);
    alert('인증 처리 중 오류가 발생했습니다.');
  }
});

// 작업자 전용 오늘작업 로드
window.loadWorkerTodayTasks = async function() {
  console.log('👷 작업자 오늘작업 로드');
  
  // 탭 버튼 활성화 상태 변경
  document.querySelectorAll('.worker-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const todayTab = document.getElementById('today-tab');
  if (todayTab) {
    todayTab.classList.add('active');
  }
  
  // 편집 상태 초기화
  window.editingTaskId = null;
  window.editingTabType = null;
  
  // 작업자 인터페이스 복원
  const workerTaskContent = document.getElementById('worker-task-content');
  if (workerTaskContent) {
    workerTaskContent.innerHTML = '<div class="task-list"></div>';
  }
  
  // 기존 오늘작업 로드 함수 호출
  if (window.loadTodayTasks) {
    await window.loadTodayTasks();
  }
};

// 작업자 전용 완료작업 로드
window.loadWorkerDoneTasks = async function() {
  console.log('👷 작업자 완료작업 로드');
  
  // 탭 버튼 활성화 상태 변경
  document.querySelectorAll('.worker-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const doneTab = document.getElementById('done-tab');
  if (doneTab) {
    doneTab.classList.add('active');
  }
  
  // 편집 상태 초기화
  window.editingTaskId = null;
  window.editingTabType = null;
  
  // 작업자 인터페이스 복원
  const workerTaskContent = document.getElementById('worker-task-content');
  if (workerTaskContent) {
    workerTaskContent.innerHTML = '<div class="task-list"></div>';
  }
  
  // 기존 완료작업 로드 함수 호출
  if (window.loadDoneTasks) {
    await window.loadDoneTasks();
  }
};

// DOM 로드 후 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
  // 로그인 버튼 이벤트
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
  }
  
  // 로그아웃 버튼 이벤트
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  
  // 엔터키 로그인 지원
  const passwordInput = document.getElementById('password');
  if (passwordInput) {
    passwordInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleLogin();
      }
    });
  }
  
  const emailInput = document.getElementById('email');
  if (emailInput) {
    emailInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
          passwordInput.focus();
        }
      }
    });
  }
});

// 권한 확인 유틸리티 함수 전역 등록
window.isAdmin = isAdmin;
window.getCurrentUserEmail = () => auth.currentUser?.email || null;
window.getCurrentUserInfo = getCurrentUserInfo;
window.getCurrentUserName = getCurrentUserName;
window.isCurrentUserAdmin = () => {
  const userInfo = getCurrentUserInfo();
  return isAdmin(userInfo);
};
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;