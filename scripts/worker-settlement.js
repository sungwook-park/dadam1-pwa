// scripts/worker-settlement.js - 직원용 정산 (Firebase 읽기 최적화!)

import { db } from './firebase-config.js';
import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 전역 변수
let allWorkerTasks = [];
let allOutboundParts = [];
let allUsers = [];
let PARTS_LIST = [];

// 🔥 메모리 캐시 (1시간 유효)
const dataCache = {
  tasks: { data: null, timestamp: null },
  parts: { data: null, timestamp: null },
  users: { data: null, timestamp: null },
  outbound: { data: null, timestamp: null },
  TTL: 60 * 60 * 1000  // 1시간
};

/**
 * 캐시 유효성 확인
 */
function isCacheValid(cacheKey) {
  const cached = dataCache[cacheKey];
  if (!cached.data || !cached.timestamp) return false;
  
  const now = Date.now();
  const isValid = (now - cached.timestamp) < dataCache.TTL;
  
  if (isValid) {
    console.log(`✅ ${cacheKey} 캐시 사용 (Firebase 읽기 0회)`);
  } else {
    console.log(`⏰ ${cacheKey} 캐시 만료 (재조회 필요)`);
  }
  
  return isValid;
}

/**
 * 직원용 정산 화면 로드
 */
window.loadWorkerSettlement = async function() {
  console.log('💰 직원용 정산 화면 로드');
  
  // 탭 활성화
  document.querySelectorAll('.worker-tab-btn').forEach(btn => btn.classList.remove('active'));
  const settlementTab = document.getElementById('settlement-tab');
  if (settlementTab) settlementTab.classList.add('active');
  
  const content = document.getElementById('worker-task-content');
  if (!content) return;
  
  const userInfo = window.currentUserInfo;
  
  if (!userInfo || !userInfo.name) {
    content.innerHTML = `
      <div class="worker-settlement-error">
        ❌ 사용자 정보를 찾을 수 없습니다.
      </div>
    `;
    return;
  }
  
  // 로딩 표시
  content.innerHTML = `
    <div class="worker-settlement-loading">
      <div class="spinner"></div>
      <p>정산 정보를 불러오는 중...</p>
    </div>
  `;
  
  try {
    // 데이터 로드 (캐시 활용)
    await loadAllData(userInfo.name);
    
    // 🔥 최적화: 기본 기간을 최근 1개월로 설정
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const endDate = formatDateOnly(now);
    const startDate = formatDateOnly(oneMonthAgo);
    
    console.log(`📅 기본 기간: ${startDate} ~ ${endDate} (최근 1개월)`);
    
    // HTML 생성
    content.innerHTML = getWorkerSettlementHTML(userInfo, startDate, endDate);
    
    // 스타일 추가
    addWorkerSettlementStyles();
    
    console.log(`✅ 정산 정보 로드 완료: ${allWorkerTasks.length}개 작업`);
    
  } catch (error) {
    console.error('❌ 정산 정보 로드 실패:', error);
    content.innerHTML = `
      <div class="worker-settlement-error">
        ❌ 정산 정보를 불러오지 못했습니다.<br>
        ${error.message}
      </div>
    `;
  }
};

/**
 * 날짜 포맷 함수 (YYYY-MM-DD)
 */
function formatDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 모든 데이터 로드 (캐시 활용 + 날짜 필터)
 */
async function loadAllData(workerName) {
  console.log('🔍 데이터 로드 시작, 작업자:', workerName);
  
  // 🔥 최적화: 최근 3개월 데이터만 조회
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const dateFilter = formatDateOnly(threeMonthsAgo) + 'T00:00:00';
  
  console.log(`📅 조회 기간: ${dateFilter} ~ 현재`);
  
  // 1. 완료 작업 로드 (캐시 확인)
  if (isCacheValid('tasks')) {
    allWorkerTasks = dataCache.tasks.data.filter(task => {
      if (!task.worker) return false;
      const workers = task.worker.split(',').map(w => w.trim());
      return workers.includes(workerName);
    });
  } else {
    const tasksRef = collection(db, 'tasks');
    const q = query(
      tasksRef,
      where('done', '==', true),
      where('date', '>=', dateFilter),  // 🔥 날짜 필터 추가!
      orderBy('date', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const allTasks = [];
    
    snapshot.forEach(doc => {
      allTasks.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('📦 완료 작업 수 (최근 3개월):', allTasks.length);
    
    // 캐시 저장
    dataCache.tasks.data = allTasks;
    dataCache.tasks.timestamp = Date.now();
    
    // 본인 작업만 필터링
    allWorkerTasks = allTasks.filter(task => {
      if (!task.worker) return false;
      const workers = task.worker.split(',').map(w => w.trim());
      return workers.includes(workerName);
    });
  }
  
  console.log('👤 내 작업 수:', allWorkerTasks.length);
  
  // 2. 출고 부품 로드 (캐시 확인)
  if (isCacheValid('outbound')) {
    allOutboundParts = dataCache.outbound.data;
  } else {
    const inventoryRef = collection(db, 'inventory');
    const outboundQuery = query(
      inventoryRef,
      where('type', '==', 'out'),
      where('reason', '==', '작업사용'),
      where('date', '>=', dateFilter),  // 🔥 날짜 필터 추가!
      orderBy('date', 'desc')
    );
    
    const outboundSnapshot = await getDocs(outboundQuery);
    allOutboundParts = [];
    
    outboundSnapshot.forEach(doc => {
      allOutboundParts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('📦 출고 부품 수 (최근 3개월):', allOutboundParts.length);
    
    // 캐시 저장
    dataCache.outbound.data = allOutboundParts;
    dataCache.outbound.timestamp = Date.now();
  }
  
  // 3. 부품 목록 로드 (캐시 확인)
  if (isCacheValid('parts')) {
    PARTS_LIST = dataCache.parts.data;
  } else {
    const partsRef = collection(db, 'parts');
    const partsSnapshot = await getDocs(partsRef);
    PARTS_LIST = [];
    
    partsSnapshot.forEach(doc => {
      PARTS_LIST.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('🔧 부품 목록 수:', PARTS_LIST.length);
    
    // 캐시 저장
    dataCache.parts.data = PARTS_LIST;
    dataCache.parts.timestamp = Date.now();
  }
  
  // 4. 사용자 정보 로드 (캐시 확인)
  if (isCacheValid('users')) {
    allUsers = dataCache.users.data;
  } else {
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    allUsers = [];
    
    usersSnapshot.forEach(doc => {
      allUsers.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('👥 사용자 수:', allUsers.length);
    
    // 캐시 저장
    dataCache.users.data = allUsers;
    dataCache.users.timestamp = Date.now();
  }
  
  console.log('✅ 데이터 로드 완료!');
  console.log('💾 캐시 상태:', {
    tasks: dataCache.tasks.data ? '캐시됨' : '없음',
    outbound: dataCache.outbound.data ? '캐시됨' : '없음',
    parts: dataCache.parts.data ? '캐시됨' : '없음',
    users: dataCache.users.data ? '캐시됨' : '없음'
  });
}

/**
 * 캐시 수동 새로고침
 */
window.refreshWorkerSettlementCache = async function() {
  console.log('🔄 캐시 새로고침 시작...');
  
  // 캐시 초기화
  dataCache.tasks.data = null;
  dataCache.tasks.timestamp = null;
  dataCache.outbound.data = null;
  dataCache.outbound.timestamp = null;
  
  // 재로드
  await window.loadWorkerSettlement();
  
  alert('✅ 정산 데이터가 새로고침되었습니다.');
};

/**
 * 정산 HTML 생성 (기존 로직 유지)
 */
function getWorkerSettlementHTML(userInfo, startDate, endDate) {
  console.log('\n========================================');
  console.log('📅 정산 기간:', startDate, '~', endDate);
  console.log('👤 작업자:', userInfo.name);
  console.log('========================================\n');
  
  // 기간 필터링
  const filteredTasks = allWorkerTasks.filter(task => {
    if (!task.date) {
      console.log(`⚠️ 작업 ${task.id}: date 필드 없음`);
      return false;
    }
    const taskDate = task.date.split('T')[0];
    const isInRange = taskDate >= startDate && taskDate <= endDate;
    
    if (!isInRange) {
      console.log(`⏭️ 작업 ${task.id} (${taskDate}): 기간 밖`);
    } else {
      console.log(`✅ 작업 ${task.id} (${taskDate}): 기간 안 - 매출 ${task.amount}원, fee: ${task.fee}`);
    }
    
    return isInRange;
  });
  
  console.log('\n📊 필터링 결과:');
  console.log(`  전체 내 작업: ${allWorkerTasks.length}개`);
  console.log(`  기간 내 작업: ${filteredTasks.length}개`);
  
  // 통계 계산 (올바른 로직!)
  const stats = calculateWorkerStats(filteredTasks, userInfo);
  
  console.log('💰 통계:', stats);
  
  // 거래처별 분류
  const clientDetails = calculateClientDetails(filteredTasks, userInfo.name);
  
  return `
    <div class="worker-settlement-container">
      <!-- 헤더 -->
      <div class="settlement-header">
        <h3>💰 내 정산</h3>
        <button onclick="refreshWorkerSettlementCache()" class="btn-refresh" title="최신 데이터 다시 불러오기">
          🔄 새로고침
        </button>
      </div>
      
      <!-- 날짜 필터 -->
      <div class="date-filter">
        <label>📅 기간:</label>
        <input type="date" id="worker-settlement-start" value="${startDate}">
        <span>~</span>
        <input type="date" id="worker-settlement-end" value="${endDate}">
        <button onclick="filterWorkerSettlement()" class="btn-filter">검색</button>
        <button onclick="resetWorkerSettlement()" class="btn-reset">1개월</button>
      </div>
      
      <!-- 안내 메시지 -->
      <div class="info-notice">
        ℹ️ 최근 3개월 데이터만 표시됩니다. (읽기량 최적화)
      </div>
      
      <!-- 통계 카드 -->
      <div class="stats-card">
        <div class="worker-info-header">
          <div class="worker-icon">👤</div>
          <div class="worker-details">
            <div class="worker-name">${userInfo.name}</div>
            <div class="worker-type">${userInfo.employeeType === 'executive' ? '임원' : `도급기사 ${stats.allowanceRate}%`}</div>
          </div>
        </div>
        
        <div class="stats-grid">
          <div class="stat-item stat-tasks">
            <div class="stat-label">작업</div>
            <div class="stat-value">${stats.taskCount}건</div>
          </div>
          
          <div class="stat-item stat-revenue">
            <div class="stat-label">내 매출</div>
            <div class="stat-value">${formatCurrency(stats.myRevenue)}</div>
            <div class="stat-subtitle">${stats.collaborationNote}</div>
          </div>
          
          ${userInfo.employeeType !== 'executive' ? `
            <div class="stat-item stat-executive-share">
              <div class="stat-label">매출×30%</div>
              <div class="stat-value negative">${formatCurrency(stats.executiveShare)}</div>
            </div>
          ` : ''}
          
          <div class="stat-item stat-part-cost">
            <div class="stat-label">부품비</div>
            <div class="stat-value negative">${formatCurrency(stats.myPartCost)}</div>
          </div>
          
          <div class="stat-item stat-fee">
            <div class="stat-label">일반수수료</div>
            <div class="stat-value negative">${formatCurrency(stats.myGeneralFee)}</div>
          </div>
          
          ${userInfo.employeeType !== 'executive' ? `
            <div class="stat-item stat-final-payment">
              <div class="stat-label">최종 수령액</div>
              <div class="stat-value">${formatCurrency(stats.netAllowance)}</div>
            </div>
            
            <div class="stat-item stat-company-payment">
              <div class="stat-label">회사지급총액</div>
              <div class="stat-value company-highlight">${formatCurrency(stats.companyPayment)}</div>
            </div>
          ` : `
            <div class="stat-item stat-profit">
              <div class="stat-label">순이익</div>
              <div class="stat-value">${formatCurrency(stats.netProfit)}</div>
            </div>
          `}
        </div>
      </div>
      
      <!-- 거래처별 상세 -->
      ${Object.keys(clientDetails).length > 0 ? `
        <div class="client-details-section">
          <div class="section-header" onclick="toggleClientDetails()">
            <h4>📊 거래처별 상세</h4>
            <span class="toggle-icon" id="client-toggle-icon">▼</span>
          </div>
          
          <div class="client-details-content" id="client-details-content">
            ${Object.entries(clientDetails).map(([client, detail]) => `
              <div class="client-row">
                <div class="client-name">${client}</div>
                <div class="client-stats">
                  <span class="client-count">${detail.count}건</span>
                  <span class="client-amount">${formatCurrency(detail.myAmount)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      ${filteredTasks.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <p>선택한 기간에 완료된 작업이 없습니다.</p>
        </div>
      ` : ''}
      
      <!-- 상세 안내 -->
      <div class="info-box">
        <h4>💡 정산 안내</h4>
        <ul>
          <li>협업 작업의 경우 매출/부품비가 작업자 수로 균등 분할됩니다.</li>
          ${userInfo.employeeType !== 'executive' ? `
            <li>최종 수령액 = 매출 × ${userInfo.workerCommissionRate || 70}% - 부품비 - 수수료</li>
            <li>회사 지급 총액 = 매출 × 30% + 부품비 + 일반수수료</li>
          ` : `
            <li>순이익 = 매출 - 부품비 - 수수료</li>
          `}
          <li>🔄 새로고침 버튼을 누르면 최신 데이터를 다시 불러옵니다.</li>
        </ul>
      </div>
    </div>
  `;
}

// ... (나머지 함수들은 기존과 동일)
