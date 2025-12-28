// scripts/settings/settings-main.js - 설정 메인 화면 및 탭 전환

/**
 * 설정 관리 메인 로드 함수
 */
export async function loadSettingsManagement() {
  console.log('⚙️ 설정 관리 시스템 로드');
  
  const tabContent = document.getElementById('tab-content');
  const tabTitle = document.getElementById('tab-title');
  const tabBody = document.getElementById('tab-body');
  
  if (!tabContent || !tabTitle || !tabBody) {
    console.error('❌ 필요한 DOM 요소를 찾을 수 없습니다.');
    return;
  }
  
  // 탭 컨텐츠 표시
  tabContent.style.display = 'block';
  
  // 타이틀 설정
  tabTitle.innerHTML = `
    <h3 style="margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px 12px 0 0;">
      ⚙️ 설정 관리
    </h3>
  `;
  
  // 현재 사용자 정보 가져오기
  const currentUser = window.getCurrentUserInfo();
  if (!currentUser) {
    tabBody.innerHTML = '<p style="padding: 20px; text-align: center;">사용자 정보를 불러올 수 없습니다.</p>';
    return;
  }
  
  // 권한별 탭 표시 결정
  const availableTabs = getAvailableSettingsTabs(currentUser);
  
  // 설정 메인 UI 생성
  tabBody.innerHTML = `
    <div class="settings-container">
      <!-- 설정 서브탭 -->
      <div class="settings-subtabs">
        ${availableTabs.map((tab, index) => `
          <button 
            class="settings-tab-btn ${index === 0 ? 'active' : ''}" 
            id="${tab.id}-tab"
            onclick="window.showSettingsTab('${tab.id}')"
          >
            ${tab.icon} ${tab.name}
          </button>
        `).join('')}
      </div>
      
      <!-- 설정 컨텐츠 영역 -->
      <div id="settings-content">
        <div class="loading-placeholder">
          <div class="spinner-modern"></div>
          <p>로딩 중...</p>
        </div>
      </div>
    </div>
  `;
  
  // CSS 스타일 추가
  addSettingsStyles();
  
  // 기본으로 첫 번째 탭 로드
  if (availableTabs.length > 0) {
    setTimeout(() => {
      window.showSettingsTab(availableTabs[0].id);
    }, 100);
  }
}

/**
 * 권한별 사용 가능한 설정 탭들 반환
 */
function getAvailableSettingsTabs(userInfo) {
  const allTabs = [
    {
      id: 'employee-management',
      name: '직원관리',
      icon: '👥',
      requiredRole: 'admin', // 관리자만
      description: '직원 및 임원 등록, 수정, 관리'
    },
    {
      id: 'holiday-management', 
      name: '휴무관리',
      icon: '🏖️',
      requiredRole: 'all', // 모든 사용자
      description: '휴무일정 관리'
    },
    {
      id: 'system-settings',
      name: '시스템설정',
      icon: '🔧',
      requiredRole: 'admin', // 관리자만
      description: '시스템 환경설정'
    }
  ];
  
  // 권한 확인
  const isAdmin = userInfo.role === 'admin';
  
  return allTabs.filter(tab => {
    if (tab.requiredRole === 'all') return true;
    if (tab.requiredRole === 'admin') return isAdmin;
    return false;
  });
}

/**
 * 설정 탭 전환 함수
 */
window.showSettingsTab = async function(tabId) {
  console.log('⚙️ 설정 탭 전환:', tabId);
  
  // 탭 버튼 활성화 상태 변경
  document.querySelectorAll('.settings-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const activeTab = document.getElementById(`${tabId}-tab`);
  if (activeTab) {
    activeTab.classList.add('active');
  }
  
  // 컨텐츠 영역 가져오기
  const settingsContent = document.getElementById('settings-content');
  if (!settingsContent) {
    console.error('❌ settings-content 요소를 찾을 수 없습니다.');
    return;
  }
  
  // 로딩 표시
  settingsContent.innerHTML = `
    <div class="loading-placeholder">
      <div class="spinner-modern"></div>
      <p>${getTabName(tabId)} 로딩 중...</p>
    </div>
  `;
  
  try {
    // 탭별 컨텐츠 로드
    switch(tabId) {
      case 'employee-management':
        if (window.loadEmployeeManagement) {
          await window.loadEmployeeManagement();
        } else {
          console.error('❌ loadEmployeeManagement 함수를 찾을 수 없습니다.');
          settingsContent.innerHTML = '<p style="padding: 20px;">직원관리 모듈을 불러올 수 없습니다.</p>';
        }
        break;
      case 'holiday-management':
        if (window.loadHolidayManagement) {
          await window.loadHolidayManagement();
        } else {
          console.error('❌ loadHolidayManagement 함수를 찾을 수 없습니다.');
          settingsContent.innerHTML = '<p style="padding: 20px;">휴무관리 모듈을 불러올 수 없습니다.</p>';
        }
        break;
      case 'system-settings':
        if (window.loadSystemSettings) {
          await window.loadSystemSettings();
        } else {
          console.error('❌ loadSystemSettings 함수를 찾을 수 없습니다.');
          settingsContent.innerHTML = '<p style="padding: 20px;">시스템설정 모듈을 불러올 수 없습니다.</p>';
        }
        break;
      default:
        settingsContent.innerHTML = '<p style="padding: 20px;">알 수 없는 설정 탭입니다.</p>';
    }
  } catch (error) {
    console.error(`❌ ${tabId} 로드 오류:`, error);
    settingsContent.innerHTML = `
      <div class="error-placeholder">
        <p>❌ 설정을 불러오는 중 오류가 발생했습니다.</p>
        <p style="font-size: 14px; color: #666;">${error.message}</p>
        <button onclick="window.showSettingsTab('${tabId}')" class="retry-btn">다시 시도</button>
      </div>
    `;
  }
};

/**
 * 탭 이름 반환 헬퍼 함수
 */
function getTabName(tabId) {
  const tabNames = {
    'employee-management': '직원관리',
    'holiday-management': '휴무관리',
    'system-settings': '시스템설정'
  };
  return tabNames[tabId] || '설정';
}

/**
 * 설정 스타일 추가
 */
function addSettingsStyles() {
  if (document.getElementById('settings-main-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'settings-main-styles';
  style.textContent = `
    /* 설정 컨테이너 */
    .settings-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    /* 설정 서브탭 */
    .settings-subtabs {
      display: flex;
      gap: 10px;
      margin-bottom: 30px;
      flex-wrap: wrap;
    }
    
    .settings-tab-btn {
      flex: 1;
      min-width: 150px;
      padding: 15px 20px;
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      color: #666;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    .settings-tab-btn:hover {
      background: #f8f9fa;
      border-color: #8ecae6;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    
    .settings-tab-btn.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-color: #667eea;
      color: white;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    /* 설정 컨텐츠 */
    #settings-content {
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      min-height: 400px;
    }
    
    /* 로딩 및 에러 상태 */
    .loading-placeholder, .error-placeholder {
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }
    
    .loading-placeholder .spinner-modern {
      width: 50px;
      height: 50px;
      margin: 0 auto 20px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .error-placeholder {
      color: #dc3545;
    }
    
    .retry-btn {
      background: #dc3545;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 20px;
      transition: all 0.2s ease;
    }
    
    .retry-btn:hover {
      background: #c82333;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3);
    }
    
    /* 모바일 반응형 */
    @media (max-width: 768px) {
      .settings-container {
        padding: 15px;
      }
      
      .settings-subtabs {
        flex-direction: column;
        gap: 8px;
      }
      
      .settings-tab-btn {
        min-width: auto;
        padding: 12px 16px;
        font-size: 15px;
      }
      
      #settings-content {
        padding: 20px;
      }
    }
  `;
  
  document.head.appendChild(style);
}

// 전역 함수 등록
window.loadSettingsManagement = loadSettingsManagement;
