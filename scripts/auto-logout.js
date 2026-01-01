// ========================================
// 자동 로그아웃 시스템 (3분 비활성)
// 경고 없이 바로 로그아웃
// ========================================

console.log('⏰ 자동 로그아웃 시스템 시작');

// 설정
const INACTIVITY_TIMEOUT = 3 * 60 * 1000; // 3분 (밀리초)

let inactivityTimer = null;
let lastActivityTime = Date.now();

// 활동 감지 이벤트
const activityEvents = [
  'mousedown',
  'mousemove',
  'keypress',
  'scroll',
  'touchstart',
  'click'
];

// 로그아웃 함수
async function autoLogout(reason = '비활성') {
  console.log(`🚪 자동 로그아웃: ${reason}`);
  
  try {
    // Firebase Auth 가져오기
    if (window.auth) {
      // 로그아웃 실행
      await window.auth.signOut();
      console.log('✅ Firebase 로그아웃 완료');
      
      // 세션 정리
      sessionStorage.clear();
      
      // 로그인 페이지로 이동 (또는 새로고침)
      window.location.reload();
    } else {
      console.error('❌ auth 객체를 찾을 수 없습니다');
    }
  } catch (error) {
    console.error('❌ 로그아웃 오류:', error);
    // 오류 발생해도 페이지 새로고침
    window.location.reload();
  }
}

// 비활성 타이머 리셋
function resetInactivityTimer() {
  lastActivityTime = Date.now();
  
  // 기존 타이머 제거
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }
  
  // 로그아웃 타이머 (3분 후) - 경고 없이 바로 로그아웃
  inactivityTimer = setTimeout(() => {
    autoLogout('3분 비활성');
  }, INACTIVITY_TIMEOUT);
}

// 사용자 활동 감지
function onUserActivity() {
  resetInactivityTimer();
}

// 이벤트 리스너 등록
activityEvents.forEach(eventName => {
  document.addEventListener(eventName, onUserActivity, true);
});

// 페이지 가시성 변경 감지
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // 백그라운드로 갈 때
    console.log('📱 백그라운드');
  } else {
    // 포그라운드로 복귀
    console.log('📱 포그라운드');
    
    // 얼마나 백그라운드에 있었는지 확인
    const inactiveTime = Date.now() - lastActivityTime;
    
    if (inactiveTime > INACTIVITY_TIMEOUT) {
      // 3분 넘게 백그라운드 → 즉시 로그아웃
      console.log(`⏰ ${Math.floor(inactiveTime / 60000)}분간 백그라운드 - 자동 로그아웃`);
      autoLogout('백그라운드 장시간');
    } else {
      // 3분 이내 복귀 → 타이머 재시작
      resetInactivityTimer();
    }
  }
});

// 초기 타이머 시작
resetInactivityTimer();

console.log('✅ 자동 로그아웃 시스템 준비 완료');
console.log(`⏰ ${INACTIVITY_TIMEOUT / 60000}분 비활성 시 자동 로그아웃`);
console.log('⚠️ 경고 메시지 없이 바로 로그아웃됩니다');

// 전역 함수로 등록 (디버그용)
window.getInactivityStatus = function() {
  const inactiveTime = Date.now() - lastActivityTime;
  const remainingTime = INACTIVITY_TIMEOUT - inactiveTime;
  
  console.log('⏰ 비활성 시간:', Math.floor(inactiveTime / 1000), '초');
  console.log('⏰ 남은 시간:', Math.floor(remainingTime / 1000), '초');
  
  return {
    inactiveSeconds: Math.floor(inactiveTime / 1000),
    remainingSeconds: Math.floor(remainingTime / 1000)
  };
};

// 수동 로그아웃 함수 (다른 곳에서 호출 가능)
window.manualLogout = function() {
  autoLogout('수동 로그아웃');
};
