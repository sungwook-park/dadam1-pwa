// scripts/utils/error-handler.js

// 로딩 스피너 표시
export function showLoading(message = '로딩 중...') {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    const messageEl = spinner.querySelector('p');
    if (messageEl) {
      messageEl.textContent = message;
    }
    spinner.style.display = 'flex';
  }
}

// 로딩 스피너 숨김
export function hideLoading() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    spinner.style.display = 'none';
  }
}

// 에러 메시지 표시
export function showError(message, duration = 5000) {
  const errorDiv = document.getElementById('error-message');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.className = 'error-message show';
    
    // 자동으로 숨김
    setTimeout(() => {
      hideError();
    }, duration);
  } else {
    // fallback으로 alert 사용
    alert(message);
  }
  
  console.error('에러:', message);
}

// 에러 메시지 숨김
export function hideError() {
  const errorDiv = document.getElementById('error-message');
  if (errorDiv) {
    errorDiv.style.display = 'none';
    errorDiv.className = 'error-message';
  }
}

// 성공 메시지 표시
export function showSuccess(message, duration = 3000) {
  const errorDiv = document.getElementById('error-message');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.className = 'error-message success show';
    
    // 자동으로 숨김
    setTimeout(() => {
      hideError();
    }, duration);
  } else {
    // fallback으로 alert 사용
    alert(message);
  }
  
  console.log('성공:', message);
}

// Firebase 에러를 사용자 친화적 메시지로 변환
export function getFirebaseErrorMessage(error) {
  const errorMessages = {
    // Auth 에러
    'auth/user-not-found': '등록되지 않은 이메일입니다.',
    'auth/wrong-password': '비밀번호가 틀렸습니다.',
    'auth/invalid-email': '이메일 형식이 올바르지 않습니다.',
    'auth/network-request-failed': '네트워크 연결을 확인해주세요.',
    'auth/too-many-requests': '너무 많은 시도입니다. 잠시 후 다시 시도해주세요.',
    'auth/user-disabled': '비활성화된 계정입니다.',
    'auth/invalid-credential': '인증 정보가 올바르지 않습니다.',
    
    // Firestore 에러
    'permission-denied': '권한이 없습니다.',
    'not-found': '데이터를 찾을 수 없습니다.',
    'already-exists': '이미 존재하는 데이터입니다.',
    'resource-exhausted': '할당량을 초과했습니다.',
    'failed-precondition': '작업 조건을 만족하지 않습니다.',
    'cancelled': '작업이 취소되었습니다.',
    'data-loss': '데이터 손실이 발생했습니다.',
    'deadline-exceeded': '시간 초과되었습니다.',
    'internal': '내부 서버 오류가 발생했습니다.',
    'invalid-argument': '잘못된 인수입니다.',
    'out-of-range': '범위를 벗어났습니다.',
    'unauthenticated': '인증이 필요합니다.',
    'unavailable': '서비스를 사용할 수 없습니다.',
    'unimplemented': '구현되지 않은 기능입니다.',
    'unknown': '알 수 없는 오류가 발생했습니다.'
  };
  
  const errorCode = error?.code || error?.message || 'unknown';
  return errorMessages[errorCode] || `오류가 발생했습니다: ${error?.message || '알 수 없는 오류'}`;
}

// 디바운싱 함수 (검색 등에 사용)
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 전역 에러 핸들러 설정
window.addEventListener('error', (event) => {
  console.error('전역 에러:', event.error);
  showError('예상치 못한 오류가 발생했습니다.');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('처리되지 않은 Promise 거부:', event.reason);
  showError('비동기 작업 중 오류가 발생했습니다.');
  event.preventDefault(); // 콘솔에 에러 로그가 나타나는 것을 방지
});

// 네트워크 상태 확인
export function checkNetworkStatus() {
  if (!navigator.onLine) {
    showError('인터넷 연결을 확인해주세요.');
    return false;
  }
  return true;
}

// 네트워크 상태 변화 감지
window.addEventListener('online', () => {
  hideError();
  showSuccess('인터넷 연결이 복원되었습니다.');
});

window.addEventListener('offline', () => {
  showError('인터넷 연결이 끊어졌습니다.', 0); // 무제한 표시
});