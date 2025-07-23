// mobile-back-handler.js - 모바일 뒤로가기 버튼 종료 확인 처리 (원래 방식)

/**
 * 모바일 뒤로가기 버튼 처리 모듈
 * 모바일 기기에서 뒤로가기 버튼을 누르면 커스텀 종료 확인 다이얼로그 표시
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
        window.history.pushState({ preventBack: true }, null, window.location.href);
        console.log('📋 히스토리 상태 추가 완료');
      }

      // popstate 이벤트 리스너 등록 (뒤로가기 버튼 감지)
      window.addEventListener('popstate', (event) => this.handleBackButton(event));
      
      this.isInitialized = true;
      console.log('✅ 모바일 뒤로가기 처리 초기화 완료');

    } catch (error) {
      console.error('❌ 뒤로가기 처리 초기화 실패:', error);
    }
  }

  // 뒤로가기 버튼 처리
  handleBackButton(event) {
    console.log('🔙 뒤로가기 버튼 감지됨');
    
    // 이벤트 기본 동작 방지
    if (event && event.preventDefault) {
      event.preventDefault();
    }
    if (event && event.stopPropagation) {
      event.stopPropagation();
    }
    
    // 즉시 히스토리 상태 복원 (페이지 이동 방지)
    if (window.history && window.history.pushState) {
      window.history.pushState({ preventBack: true }, null, window.location.href);
      console.log('🔄 히스토리 상태 즉시 복원');
    }
    
    // 커스텀 확인 다이얼로그 생성
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
  }

  // 앱 종료 처리
  exitApp() {
    try {
      console.log('🔚 앱 종료 시작...');

      // 방법 1: 히스토리 뒤로가기로 자연스러운 종료
      if (window.history && window.history.length > 1) {
        console.log('📜 히스토리 뒤로가기로 종료');
        window.history.go(-1);
        return;
      }

      // 방법 2: 안드로이드 웹뷰용
      if (window.Android && typeof window.Android.finishApp === 'function') {
        console.log('📱 안드로이드 앱 종료');
        window.Android.finishApp();
        return;
      }

      // 방법 3: iOS 웹뷰용
      if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.finishApp) {
        console.log('🍎 iOS 앱 종료');
        window.webkit.messageHandlers.finishApp.postMessage(null);
        return;
      }

      // 방법 4: 브라우저 창 닫기
      if (window.close) {
        console.log('🚪 브라우저 창 닫기');
        window.close();
        
        // window.close()가 즉시 작동하지 않을 수 있으므로 잠시 대기 후 확인
        setTimeout(() => {
          // 창이 아직 열려있다면 다른 방법 시도
          this.tryAlternativeExit();
        }, 200);
        return;
      }

      // 방법 5: 다른 종료 방법들
      this.tryAlternativeExit();

    } catch (error) {
      console.error('❌ 앱 종료 실패:', error);
      this.tryAlternativeExit();
    }
  }

  // 대안 종료 방법들
  tryAlternativeExit() {
    try {
      console.log('🔄 대안 종료 방법 시도');

      // 현재 페이지를 빈 페이지로 교체
      window.location.replace('data:text/html,<html><head><title>종료됨</title></head><body style="background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-family:sans-serif;color:#666;"><div style="text-align:center;"><h2>✅ 앱이 종료되었습니다</h2><p>이 탭을 닫아주세요</p></div></body></html>');

    } catch (error) {
      console.error('❌ 대안 종료 방법 실패:', error);
      
      // 최후 수단: 사용자 안내
      alert('브라우저의 뒤로가기 버튼을 한 번 더 누르거나\n수동으로 브라우저 탭을 닫아주세요.');
    }
  }

  // 종료 취소 처리
  cancelExit() {
    try {
      // 히스토리에 다시 푸시하여 뒤로가기 상태 복원
      if (window.history && window.history.pushState) {
        window.history.pushState({ preventBack: true }, null, window.location.href);
        console.log('🔄 히스토리 상태 복원 완료');
      }
    } catch (error) {
      console.error('❌ 종료 취소 처리 실패:', error);
    }
  }

  // 강제 비활성화
  disable() {
    if (!this.isInitialized) return;

    try {
      window.removeEventListener('popstate', this.handleBackButton);
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

console.log('📱 mobile-back-handler.js 로드 완료 (원래 방식)');