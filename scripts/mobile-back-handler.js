// mobile-back-handler.js - 모바일 뒤로가기 버튼 종료 확인 처리

/**
 * 모바일 뒤로가기 버튼 처리 모듈
 * 모바일 기기에서 뒤로가기 버튼을 누르면 "앱을 종료하시겠습니까?" 확인 다이얼로그 표시
 */

class MobileBackHandler {
  constructor() {
    this.isMobile = this.detectMobile();
    this.isInitialized = false;
    this.userConfirmedExit = false; // 종료 확인 플래그 추가
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
      // 홈화면 보호를 위한 특별 처리
      this.createProtectionLayer();

      // popstate 이벤트 리스너 등록 (뒤로가기 버튼 감지)
      window.addEventListener('popstate', (event) => this.handleBackButton(event));
      
      // beforeunload 이벤트 (페이지 떠날 때)
      window.addEventListener('beforeunload', (event) => {
        console.log('📤 beforeunload 이벤트 발생');
        // 모든 페이지 이탈 시도에서 확인창 표시
        const message = '정말 앱을 종료하시겠습니까?';
        event.preventDefault();
        event.returnValue = message;
        return message;
      });

      // pagehide 이벤트 (페이지 숨겨질 때)
      window.addEventListener('pagehide', (event) => {
        console.log('👁️ pagehide 이벤트 발생');
        if (!this.userConfirmedExit) {
          // 사용자가 종료를 확인하지 않은 상태에서 페이지가 숨겨지려 함
          event.preventDefault();
          this.showExitConfirmDialog();
        }
      });
      
      this.isInitialized = true;
      console.log('✅ 모바일 뒤로가기 처리 초기화 완료');

    } catch (error) {
      console.error('❌ 뒤로가기 처리 초기화 실패:', error);
    }
  }

  // 보호 레이어 생성 (홈화면용)
  createProtectionLayer() {
    // URL 해시를 이용한 방법
    if (!window.location.hash) {
      window.location.hash = '#app';
      console.log('🔒 홈화면 보호 해시 추가');
    }

    // 히스토리 상태 추가
    if (window.history && window.history.pushState) {
      window.history.pushState({ preventBack: true }, null, window.location.href);
      console.log('🔒 보호 히스토리 추가');
    }

    // hashchange 이벤트로 홈화면 뒤로가기 감지
    window.addEventListener('hashchange', (event) => {
      console.log('🔗 해시 변경 감지:', event);
      if (!window.location.hash || window.location.hash === '#') {
        // 해시가 제거되면 뒤로가기로 판단
        console.log('🏠 홈화면 뒤로가기 감지');
        window.location.hash = '#app'; // 해시 복원
        this.showExitConfirmDialog();
      }
    });
  }

  // 뒤로가기 버튼 처리
  handleBackButton(event) {
    console.log('🔙 뒤로가기 버튼 감지됨 (popstate)');
    
    // 이벤트 기본 동작 방지
    if (event && event.preventDefault) {
      event.preventDefault();
    }
    if (event && event.stopPropagation) {
      event.stopPropagation();
    }
    
    // 히스토리 복원
    if (window.history && window.history.pushState) {
      window.history.pushState({ preventBack: true }, null, window.location.href);
    }
    
    // 확인창 표시
    this.showExitConfirmDialog();
    
    return false;
  }

  // 커스텀 종료 확인 다이얼로그
  showExitConfirmDialog() {
    // 기존 다이얼로그가 있다면 제거
    const existingDialog = document.getElementById('exit-confirm-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }

    // 다이얼로그 HTML 생성
    const dialogHTML = `
      <div id="exit-confirm-dialog" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          background: white;
          border-radius: 12px;
          padding: 25px;
          margin: 20px;
          max-width: 300px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        ">
          <div style="
            font-size: 48px;
            margin-bottom: 15px;
          ">🚪</div>
          
          <h3 style="
            margin: 0 0 10px 0;
            font-size: 18px;
            color: #333;
            font-weight: 600;
          ">앱을 종료하시겠습니까?</h3>
          
          <p style="
            margin: 0 0 25px 0;
            font-size: 14px;
            color: #666;
            line-height: 1.4;
          ">종료하면 현재 작업이 저장되지 않을 수 있습니다.</p>
          
          <div style="
            display: flex;
            gap: 10px;
          ">
            <button id="exit-cancel-btn" style="
              flex: 1;
              padding: 12px 20px;
              border: 2px solid #ddd;
              background: white;
              color: #333;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s ease;
            ">취소</button>
            
            <button id="exit-confirm-btn" style="
              flex: 1;
              padding: 12px 20px;
              border: 2px solid #dc3545;
              background: #dc3545;
              color: white;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s ease;
            ">종료</button>
          </div>
        </div>
      </div>
    `;

    // 다이얼로그를 body에 추가
    document.body.insertAdjacentHTML('beforeend', dialogHTML);

    // 버튼 이벤트 연결
    const cancelBtn = document.getElementById('exit-cancel-btn');
    const confirmBtn = document.getElementById('exit-confirm-btn');
    const dialog = document.getElementById('exit-confirm-dialog');

    // 취소 버튼
    cancelBtn.addEventListener('click', () => {
      console.log('❌ 사용자가 종료 취소');
      dialog.remove();
      this.cancelExit();
    });

    // 종료 버튼
    confirmBtn.addEventListener('click', () => {
      console.log('✅ 사용자가 종료 선택');
      dialog.remove();
      this.exitApp();
    });

    // 배경 클릭 시 취소
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        console.log('❌ 배경 클릭으로 취소');
        dialog.remove();
        this.cancelExit();
      }
    });

    // 버튼 호버 효과
    cancelBtn.addEventListener('mouseenter', () => {
      cancelBtn.style.background = '#f8f9fa';
      cancelBtn.style.borderColor = '#bbb';
    });
    
    cancelBtn.addEventListener('mouseleave', () => {
      cancelBtn.style.background = 'white';
      cancelBtn.style.borderColor = '#ddd';
    });

    confirmBtn.addEventListener('mouseenter', () => {
      confirmBtn.style.background = '#c82333';
      confirmBtn.style.borderColor = '#bd2130';
    });
    
    confirmBtn.addEventListener('mouseleave', () => {
      confirmBtn.style.background = '#dc3545';
      confirmBtn.style.borderColor = '#dc3545';
    });
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
    console.log('🔚 사용자가 종료 선택');
    this.userConfirmedExit = true; // 종료 확인 플래그 설정
    
    try {
      // 간단하고 확실한 종료 방법들을 순서대로 시도
      
      // 방법 1: window.close() 시도
      console.log('🚪 window.close() 시도');
      if (window.close && typeof window.close === 'function') {
        window.close();
        // close()가 즉시 실행되지 않을 수 있으므로 잠시 기다림
        setTimeout(() => {
          this.tryAlternativeExit();
        }, 200);
        return;
      }
      
      this.tryAlternativeExit();
      
    } catch (error) {
      console.error('❌ 종료 처리 오류:', error);
      this.tryAlternativeExit();
    }
  }

  // 대안 종료 방법들
  tryAlternativeExit() {
    try {
      console.log('🔄 대안 종료 방법 시도');

      // 방법 2: 안드로이드 웹뷰 네이티브 함수
      if (window.Android && typeof window.Android.finishApp === 'function') {
        console.log('📱 안드로이드 네이티브 종료');
        window.Android.finishApp();
        return;
      }

      // 방법 3: iOS 웹뷰 메시지 핸들러
      if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.finishApp) {
        console.log('🍎 iOS 네이티브 종료');
        window.webkit.messageHandlers.finishApp.postMessage('exit');
        return;
      }

      // 방법 4: 히스토리를 모두 비우고 about:blank로
      console.log('🧹 히스토리 정리 후 종료');
      
      // 현재 페이지를 about:blank로 교체
      window.location.replace('about:blank');
      
      // 혹시 replace가 안 되면 assign 시도
      setTimeout(() => {
        try {
          window.location.assign('about:blank');
        } catch (e) {
          console.log('💥 최종 수단: 강제 리로드');
          window.location.href = 'about:blank';
        }
      }, 100);

    } catch (error) {
      console.error('❌ 대안 종료 방법 실패:', error);
      
      // 최후 수단: 사용자에게 수동 종료 안내
      this.showManualExitGuide();
    }
  }

  // 수동 종료 안내
  showManualExitGuide() {
    alert('자동 종료가 지원되지 않는 환경입니다.\n\n' +
          '다음 방법으로 앱을 종료해주세요:\n' +
          '• 뒤로가기 버튼을 한 번 더 누르세요\n' +
          '• 또는 브라우저를 직접 닫아주세요');
    
    // 사용자가 수동으로 종료할 수 있도록 beforeunload 비활성화
    this.userConfirmedExit = true;
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