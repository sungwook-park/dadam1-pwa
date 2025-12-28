// scripts/settings/system-settings.js - 시스템설정

/**
 * 시스템설정 탭 로드
 */
window.loadSystemSettings = async function() {
  console.log('🔧 시스템설정 탭 로드');
  
  const settingsContent = document.getElementById('settings-content');
  
  if (!settingsContent) {
    console.error('❌ settings-content 요소를 찾을 수 없습니다.');
    return;
  }
  
  // 현재 사용자 정보
  const currentUser = window.getCurrentUserInfo();
  
  // UI 렌더링
  settingsContent.innerHTML = `
    <div class="system-settings">
      <div class="section-header">
        <div class="header-info">
          <h4>🔧 시스템설정</h4>
          <p>앱 정보 및 시스템 환경을 관리합니다.</p>
        </div>
      </div>
      
      <!-- 설정 카드 그리드 -->
      <div class="settings-grid">
        <!-- 앱 정보 -->
        <div class="setting-card">
          <div class="setting-header">
            <h5>📱 앱 정보</h5>
            <p>다담업무관리 시스템 정보</p>
          </div>
          <div class="setting-content">
            <div class="info-item">
              <span>버전</span>
              <span>1.0.0</span>
            </div>
            <div class="info-item">
              <span>업데이트</span>
              <span>2025.01.01</span>
            </div>
            <div class="info-item">
              <span>환경</span>
              <span>PWA</span>
            </div>
          </div>
        </div>
        
        <!-- 사용자 정보 -->
        <div class="setting-card">
          <div class="setting-header">
            <h5>👤 내 정보</h5>
            <p>현재 로그인한 사용자 정보</p>
          </div>
          <div class="setting-content">
            <div class="info-item">
              <span>이름</span>
              <span>${currentUser?.name || '-'}</span>
            </div>
            <div class="info-item">
              <span>이메일</span>
              <span>${currentUser?.email || '-'}</span>
            </div>
            <div class="info-item">
              <span>권한</span>
              <span>${currentUser?.role === 'admin' ? '관리자' : '작업자'}</span>
            </div>
          </div>
        </div>
        
        <!-- 데이터 관리 -->
        <div class="setting-card">
          <div class="setting-header">
            <h5>💾 데이터 관리</h5>
            <p>캐시 및 데이터 관리</p>
          </div>
          <div class="setting-content">
            <div class="info-item">
              <span>캐시 상태</span>
              <span id="cache-status">확인 중...</span>
            </div>
          </div>
          <div class="setting-actions">
            <button onclick="window.clearAllCache()" class="action-btn">
              🧹 캐시 삭제
            </button>
          </div>
        </div>
        
        <!-- Service Worker -->
        <div class="setting-card">
          <div class="setting-header">
            <h5>⚙️ Service Worker</h5>
            <p>오프라인 지원 및 캐싱</p>
          </div>
          <div class="setting-content">
            <div class="info-item">
              <span>상태</span>
              <span id="sw-status">확인 중...</span>
            </div>
          </div>
          <div class="setting-actions">
            <button onclick="window.reregisterServiceWorker()" class="action-btn">
              🔄 재등록
            </button>
          </div>
        </div>
        
        <!-- 알림 설정 (추후 구현) -->
        <div class="setting-card disabled">
          <div class="setting-header">
            <h5>🔔 알림 설정</h5>
            <p>푸시 알림 관리 (준비 중)</p>
          </div>
          <div class="setting-content">
            <div class="info-item">
              <span>알림 권한</span>
              <span id="notification-status">준비 중</span>
            </div>
          </div>
        </div>
        
        <!-- 데이터 통계 -->
        <div class="setting-card">
          <div class="setting-header">
            <h5>📊 데이터 통계</h5>
            <p>저장된 데이터 현황</p>
          </div>
          <div class="setting-content">
            <div class="info-item">
              <span>직원 수</span>
              <span id="employee-count">-</span>
            </div>
            <div class="info-item">
              <span>휴무 일정</span>
              <span id="holiday-count">-</span>
            </div>
          </div>
          <div class="setting-actions">
            <button onclick="window.loadDataStatistics()" class="action-btn">
              🔄 새로고침
            </button>
          </div>
        </div>
      </div>
      
      <!-- 정보 섹션 -->
      <div class="info-section">
        <h5>ℹ️ 시스템 정보</h5>
        <div class="info-box">
          <p><strong>다담업무관리 시스템</strong></p>
          <p>작업 지시, 정산, 재고 관리를 통합한 업무 관리 시스템입니다.</p>
          <p style="margin-top: 10px; color: #666; font-size: 14px;">
            문의: admin@dadam.tv
          </p>
        </div>
      </div>
    </div>
  `;
  
  // 스타일 추가
  addSystemSettingsStyles();
  
  // 시스템 상태 확인
  checkSystemStatus();
  
  // 데이터 통계 로드
  await loadDataStatistics();
};

/**
 * 시스템 상태 확인
 */
async function checkSystemStatus() {
  // 캐시 상태 확인
  const cacheStatusElement = document.getElementById('cache-status');
  if (cacheStatusElement) {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      cacheStatusElement.textContent = `${cacheNames.length}개 캐시`;
      cacheStatusElement.style.color = '#28a745';
    } else {
      cacheStatusElement.textContent = '지원 안 됨';
      cacheStatusElement.style.color = '#dc3545';
    }
  }
  
  // Service Worker 상태 확인
  const swStatusElement = document.getElementById('sw-status');
  if (swStatusElement) {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        swStatusElement.textContent = '활성화됨';
        swStatusElement.style.color = '#28a745';
      } else {
        swStatusElement.textContent = '등록 안 됨';
        swStatusElement.style.color = '#ffc107';
      }
    } else {
      swStatusElement.textContent = '지원 안 됨';
      swStatusElement.style.color = '#dc3545';
    }
  }
}

/**
 * 데이터 통계 로드
 */
window.loadDataStatistics = async function() {
  try {
    // Firebase에서 데이터 개수 가져오기
    const { collection, getDocs } = window.firebase;
    
    // 직원 수
    const usersSnapshot = await getDocs(collection(window.db, 'users'));
    const employeeCountElement = document.getElementById('employee-count');
    if (employeeCountElement) {
      employeeCountElement.textContent = `${usersSnapshot.size}명`;
    }
    
    // 휴무 일정 수
    const holidaysSnapshot = await getDocs(collection(window.db, 'holidays'));
    const holidayCountElement = document.getElementById('holiday-count');
    if (holidayCountElement) {
      holidayCountElement.textContent = `${holidaysSnapshot.size}건`;
    }
    
    console.log('✅ 데이터 통계 로드 완료');
  } catch (error) {
    console.error('❌ 데이터 통계 로드 오류:', error);
  }
};

/**
 * 스타일 추가
 */
function addSystemSettingsStyles() {
  if (document.getElementById('system-settings-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'system-settings-styles';
  style.textContent = `
    /* 시스템설정 */
    .system-settings {
      display: flex;
      flex-direction: column;
      gap: 30px;
    }
    
    /* 설정 그리드 */
    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }
    
    /* 설정 카드 */
    .setting-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      border: 2px solid #e0e0e0;
      transition: all 0.3s ease;
    }
    
    .setting-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.12);
      border-color: #667eea;
    }
    
    .setting-card.disabled {
      opacity: 0.5;
      pointer-events: none;
    }
    
    .setting-header h5 {
      margin: 0 0 5px 0;
      font-size: 1.1rem;
      color: #333;
    }
    
    .setting-header p {
      margin: 0 0 15px 0;
      color: #666;
      font-size: 14px;
    }
    
    /* 설정 컨텐츠 */
    .setting-content {
      margin-bottom: 15px;
    }
    
    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
    }
    
    .info-item:last-child {
      border-bottom: none;
    }
    
    .info-item span:first-child {
      color: #666;
      font-weight: 500;
    }
    
    .info-item span:last-child {
      color: #333;
      font-weight: 600;
    }
    
    /* 설정 액션 */
    .setting-actions {
      display: flex;
      gap: 10px;
    }
    
    .action-btn {
      flex: 1;
      background: #667eea;
      color: white;
      border: none;
      padding: 10px 16px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 14px;
    }
    
    .action-btn:hover {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    
    /* 정보 섹션 */
    .info-section {
      background: white;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    
    .info-section h5 {
      margin: 0 0 15px 0;
      font-size: 1.2rem;
      color: #333;
    }
    
    .info-box {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      border-left: 4px solid #667eea;
    }
    
    .info-box p {
      margin: 0 0 8px 0;
      color: #333;
      line-height: 1.6;
    }
    
    .info-box p:last-child {
      margin-bottom: 0;
    }
    
    /* 모바일 반응형 */
    @media (max-width: 768px) {
      .settings-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
  
  document.head.appendChild(style);
}
