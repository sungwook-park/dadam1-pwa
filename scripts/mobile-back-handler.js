// mobile-back-handler.js - 모바일 뒤로가기 버튼 종료 확인 처리

/**
 * 모바일 뒤로가기 버튼 처리 모듈
 * 모바일 기기에서 뒤로가기 버튼을 누르면 "앱을 종료하시겠습니까?" 확인 다이얼로그 표시
 */

class MobileBackHandler {
  constructor() {
    this.isMobile = this.detectMobile();
    this.isInitialized = false;
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
      document.addEventListener('DOMContentLoaded', () => this.setupBackHandler());
    } else {
      this.setupBackHandler();
    }
  }

  // 뒤로가기 핸들러 설정
  setupBackHandler() {
    if (this.isInitialized) {
      console.log('⚠️ 이미 초기화됨');
      return;
    }

    try {
      // 현재 페이지를 히스토리에 추가 (뒤로가기 감지를 위해)
      if (window.history && window.history.pushState) {
        window.history.pushState(null, null, window.location.href);
        console.log('📋 히스토리 상태 추가 완료');
      }

      // popstate 이벤트 리스너 등록 (뒤로가기 버튼 감지)
      window.addEventListener('popstate', (event) => this.handleBackButton(event));
      
      // beforeunload 이벤트도 추가 (브라우저 탭 닫기/새로고침 시)
      window.addEventListener('beforeunload', (event) => this.handleBeforeUnload(event));
      
      this.isInitialized = true;
      console.log('✅ 모바일 뒤로가기 처리 초기화 완료');

    } catch (error) {
      console.error('❌ 뒤로가기 처리 초기화 실패:', error);
    }
  }

  // 뒤로가기 버튼 처리
  handleBackButton(event) {
    console.log('🔙 뒤로가기 버튼 감지됨');
    
    // 종료 확인 다이얼로그 표시
    const confirmExit = confirm('🚪 앱을 종료하시겠습니까?');
    
    if (confirmExit) {
      console.log('✅ 사용자가 종료 선택');
      this.exitApp();
    } else {
      console.log('❌ 사용자가 종료 취소');
      this.cancelExit();
    }
  }

  // 페이지 언로드 전 처리 (탭 닫기/새로고침)
  handleBeforeUnload(event) {
    // 모바일에서는 beforeunload가 제한적이지만 추가 보안용
    const message = '정말 페이지를 떠나시겠습니까?';
    event.returnValue = message;
    return message;
  }

  // 앱 종료 처리
  exitApp() {
    try {
      console.log('🔚 앱 종료 시작...');

      // 방법 1: 히스토리 백 (이전 페이지로)
      if (window.history && window.history.length > 1) {
        console.log('📜 히스토리 백 시도');
        window.history.back();
        return;
      }

      // 방법 2: 브라우저 탭 닫기 (지원되는 경우)
      if (window.close) {
        console.log('🚪 탭 닫기 시도');
        window.close();
      }

      // 방법 3: 안드로이드 웹뷰용 (앱에서 제공하는 경우)
      if (window.Android && typeof window.Android.finishApp === 'function') {
        console.log('📱 안드로이드 앱 종료 시도');
        window.Android.finishApp();
        return;
      }

      // 방법 4: iOS 웹뷰용 (앱에서 제공하는 경우)
      if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.finishApp) {
        console.log('🍎 iOS 앱 종료 시도');
        window.webkit.messageHandlers.finishApp.postMessage(null);
        return;
      }

      // 방법 5: about:blank 페이지로 이동 (최후 수단)
      setTimeout(() => {
        console.log('⚪ about:blank 이동');
        window.location.href = 'about:blank';
      }, 100);

    } catch (error) {
      console.error('❌ 앱 종료 실패:', error);
      
      // 종료 실패 시 사용자에게 안내
      alert('앱을 자동으로 종료할 수 없습니다.\n수동으로 브라우저를 닫아주세요.');
    }
  }

  // 종료 취소 처리
  cancelExit() {
    try {
      // 히스토리에 다시 푸시하여 뒤로가기 상태 복원
      if (window.history && window.history.pushState) {
        window.history.pushState(null, null, window.location.href);
        console.log('🔄 히스토리 상태 복원 완료');
      }
    } catch (error) {
      console.error('❌ 종료 취소 처리 실패:', error);
    }
  }

  // 강제 비활성화 (필요한 경우)
  disable() {
    if (!this.isInitialized) return;

    try {
      window.removeEventListener('popstate', this.handleBackButton);
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
      this.isInitialized = false;
      console.log('🚫 모바일 뒤로가기 처리 비활성화');
    } catch (error) {
      console.error('❌ 비활성화 실패:', error);
    }
  }

  // 활성화 상태 확인
  isActive() {
    return this.isMobile && this.isInitialized;
  }
}

// 인스턴스 생성 및 전역 변수로 등록
const mobileBackHandler = new MobileBackHandler();

// 전역 함수로 제어 가능하도록 등록
window.MobileBackHandler = {
  instance: mobileBackHandler,
  disable: () => mobileBackHandler.disable(),
  isActive: () => mobileBackHandler.isActive(),
  isMobile: () => mobileBackHandler.isMobile
};

console.log('📱 mobile-back-handler.js 로드 완료');

// ES6 모듈로도 사용 가능하도록 export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MobileBackHandler;
}