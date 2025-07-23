// mobile-back-handler.js - 모바일 뒤로가기 버튼 간단한 종료 확인 처리

/**
 * 간단하고 확실한 모바일 뒤로가기 처리
 */

class MobileBackHandler {
  constructor() {
    this.isMobile = this.detectMobile();
    this.isBackPressed = false;
    this.init();
  }

  // 모바일 기기 감지
  detectMobile() {
    const userAgent = navigator.userAgent;
    const mobilePattern = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return mobilePattern.test(userAgent);
  }

  // 초기화
  init() {
    if (!this.isMobile) {
      console.log('💻 데스크탑 환경 - 모바일 뒤로가기 처리 비활성화');
      return;
    }

    console.log('📱 모바일 환경 감지 - 뒤로가기 처리 활성화');
    
    // DOM 로드 확인 후 설정
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupHandler());
    } else {
      this.setupHandler();
    }
  }

  // 핸들러 설정
  setupHandler() {
    // 간단한 히스토리 조작
    window.history.pushState(null, '', window.location.href);
    
    // popstate 이벤트 (뒤로가기 감지)
    window.addEventListener('popstate', () => {
      this.handleBackPress();
    });

    // beforeunload 이벤트 (페이지 나갈 때)
    window.addEventListener('beforeunload', (e) => {
      if (!this.isBackPressed) {
        const message = '정말 앱을 종료하시겠습니까?';
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    });

    console.log('✅ 뒤로가기 처리 설정 완료');
  }

  // 뒤로가기 처리
  handleBackPress() {
    console.log('🔙 뒤로가기 감지');

    // 히스토리 즉시 복원
    window.history.pushState(null, '', window.location.href);

    // 간단한 확인
    const shouldExit = confirm('앱을 종료하시겠습니까?');
    
    if (shouldExit) {
      console.log('✅ 종료 확인됨');
      this.exitApp();
    } else {
      console.log('❌ 종료 취소됨');
    }
  }

  // 앱 종료
  exitApp() {
    this.isBackPressed = true;
    
    try {
      // 안드로이드 웹뷰 종료
      if (window.Android && window.Android.finishApp) {
        window.Android.finishApp();
        return;
      }

      // iOS 웹뷰 종료
      if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.close) {
        window.webkit.messageHandlers.close.postMessage('');
        return;
      }

      // 일반 브라우저: 뒤로가기로 종료
      if (window.history.length > 1) {
        window.history.back();
      } else {
        // 히스토리가 없으면 창 닫기 시도
        window.close();
      }

      // 위의 방법들이 안 되면 알림
      setTimeout(() => {
        alert('브라우저의 뒤로가기 버튼을 한 번 더 누르거나\n브라우저를 닫아서 앱을 종료해주세요.');
      }, 500);

    } catch (error) {
      console.error('종료 오류:', error);
      alert('뒤로가기 버튼을 한 번 더 누르거나 브라우저를 닫아주세요.');
    }
  }
}

// 전역에서 사용할 수 있도록 등록
const mobileBackHandler = new MobileBackHandler();

// 전역 객체로 제어 가능
window.MobileBackHandler = {
  instance: mobileBackHandler,
  isMobile: () => mobileBackHandler.isMobile
};

console.log('📱 mobile-back-handler.js 로드 완료 (간단 버전)');