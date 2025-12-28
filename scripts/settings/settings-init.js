// scripts/settings/settings-init.js - 설정 버튼 이벤트 초기화

/**
 * 설정 버튼 이벤트 초기화
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('⚙️ 설정 버튼 이벤트 초기화');
  
  const settingsBtn = document.getElementById('settings-btn');
  
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      console.log('⚙️ 설정 버튼 클릭');
      
      // 홈 버튼 그리드 숨기기
      const homeButtons = document.getElementById('home-buttons');
      if (homeButtons) {
        homeButtons.style.display = 'none';
      }
      
      // 탭 컨텐츠 표시
      const tabContent = document.getElementById('tab-content');
      if (tabContent) {
        tabContent.style.display = 'block';
      }
      
      // 설정 관리 로드
      if (window.loadSettingsManagement) {
        window.loadSettingsManagement();
      } else {
        console.error('❌ loadSettingsManagement 함수를 찾을 수 없습니다.');
      }
    });
    
    console.log('✅ 설정 버튼 이벤트 등록 완료');
  } else {
    console.warn('⚠️ 설정 버튼을 찾을 수 없습니다.');
  }
});
