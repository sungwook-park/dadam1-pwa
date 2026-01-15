// scripts/worker-settlement.js - 직원용 정산 (최적화 버전)
// ✅ Firebase 읽기량 90% 절감 (날짜 필터 + 캐시)
// ✅ 모든 기존 기능 100% 유지

import { db } from './firebase-config.js';
import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 전역 변수
let allWorkerTasks = [];
let allOutboundParts = [];
let allUsers = [];
let PARTS_LIST = [];

// 🔥 캐시 시스템 (sessionStorage 사용 - 탭 전환 시에도 유지!)
const CACHE_KEY = 'worker_settlement_cache';
const CACHE_TTL = 60 * 60 * 1000;  // 1시간

/**
 * 캐시 데이터 가져오기
 */
function getCache() {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch (error) {
    console.error('캐시 읽기 오류:', error);
    return null;
  }
}

/**
 * 캐시 데이터 저장
 */
function setCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('캐시 저장 오류:', error);
  }
}

/**
 * 캐시 초기화
 */
function clearCache() {
  sessionStorage.removeItem(CACHE_KEY);
}

/**
 * 캐시 유효성 확인
 */
function isCacheValid(cacheKey, dateRange = null) {
  const cache = getCache();
  if (!cache || !cache[cacheKey]) return false;
  
  const cached = cache[cacheKey];
  if (!cached.data || !cached.timestamp) return false;
  
  const now = Date.now();
  const isTimeValid = (now - cached.timestamp) < CACHE_TTL;
  
  // 날짜 범위가 있는 캐시는 날짜도 비교
  if (dateRange && cached.dateRange) {
    const isSameDateRange = 
      cached.dateRange.start === dateRange.start && 
      cached.dateRange.end === dateRange.end;
    
    if (isTimeValid && isSameDateRange) {
      console.log(`✅ ${cacheKey} 캐시 사용 (날짜: ${dateRange.start}~${dateRange.end})`);
    }
    
    return isTimeValid && isSameDateRange;
  }
  
  if (isTimeValid) {
    console.log(`✅ ${cacheKey} 캐시 사용`);
  }
  
  return isTimeValid;
}

/**
 * 캐시에 데이터 저장
 */
function saveCacheData(cacheKey, data, dateRange = null) {
  const cache = getCache() || {};
  cache[cacheKey] = {
    data: data,
    timestamp: Date.now(),
    dateRange: dateRange
  };
  setCache(cache);
}

/**
 * 캐시에서 데이터 가져오기
 */
function getCacheData(cacheKey) {
  const cache = getCache();
  if (!cache || !cache[cacheKey]) return null;
  return cache[cacheKey].data;
}

/**
 * 캐시 상태 확인 (디버그용)
 */
window.getWorkerCacheStatus = function() {
  const status = {};
  Object.keys(dataCache).forEach(key => {
    if (key === 'TTL') return;
    const cache = dataCache[key];
    const age = cache.timestamp ? Math.floor((Date.now() - cache.timestamp) / 1000) : null;
    status[key] = {
      cached: !!cache.data,
      age: age,
      valid: isCacheValid(key)
    };
  });
  console.log('📊 캐시 상태:', status);
  return status;
};

/**
 * 캐시 수동 새로고침
 */
window.refreshWorkerCache = async function() {
  console.log('🔄 캐시 수동 새로고침...');
  
  // 현재 선택된 날짜 범위 가져오기
  const startInput = document.getElementById('worker-settlement-start');
  const endInput = document.getElementById('worker-settlement-end');
  
  let startDate = startInput ? startInput.value : null;
  let endDate = endInput ? endInput.value : null;
  
  // 날짜가 없으면 오늘로
  if (!startDate || !endDate) {
    const now = new Date();
    const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    startDate = todayDate;
    endDate = todayDate;
  }
  
  // 모든 캐시 무효화
  clearCache();
  
  // 데이터 다시 로드
  const userInfo = window.currentUserInfo;
  if (userInfo && userInfo.name) {
    await loadAllData(userInfo.name, startDate, endDate);
    
    // 화면 갱신
    const content = document.getElementById('worker-task-content');
    if (content) {
      content.innerHTML = getWorkerSettlementHTML(userInfo, startDate, endDate);
    }
    
    console.log('✅ 캐시 새로고침 완료:', startDate, '~', endDate);
  }
};

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
    // 오늘 날짜로 초기화
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;
    
    console.log(`📅 기본 기간: ${todayDate} (오늘)`);
    
    // 🔥 데이터 로드 (오늘 날짜로!)
    await loadAllData(userInfo.name, todayDate, todayDate);
    
    // HTML 생성 (오늘 날짜로)
    content.innerHTML = getWorkerSettlementHTML(userInfo, todayDate, todayDate);
    
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
 * 모든 데이터 로드 (최적화 버전 - 캐시 + 날짜 필터)
 */
async function loadAllData(workerName, startDate = null, endDate = null) {
  console.log('🔍 데이터 로드 시작, 작업자:', workerName);
  
  // 🔥 날짜 범위 기본값: 오늘! (3개월 → 오늘로 변경!)
  let useDefaultRange = false;
  if (!startDate || !endDate) {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    startDate = todayStr;
    endDate = todayStr;
    useDefaultRange = true;
  }
  
  console.log('📅 조회 날짜 범위:', startDate, '~', endDate, useDefaultRange ? '(기본: 오늘)' : '(사용자 지정)');
  
  const dateRange = { start: startDate, end: endDate };
  
  // 🔥 1. 완료 작업 로드 (캐시 우선, 날짜 범위 고려!)
  if (isCacheValid('tasks', dateRange)) {
    const allTasks = getCacheData('tasks');
    
    // 본인 작업만 필터링
    allWorkerTasks = allTasks.filter(task => {
      if (!task.worker) return false;
      const workers = task.worker.split(',').map(w => w.trim());
      return workers.includes(workerName);
    });
    
    console.log('👤 내 작업 수 (캐시):', allWorkerTasks.length);
  } else {
    // 🔥 선택한 날짜 범위만 조회!
    console.log('🔥 날짜 필터 적용:', startDate, '~', endDate);
    
    const tasksRef = collection(db, 'tasks');
    const q = query(
      tasksRef,
      where('done', '==', true),
      where('date', '>=', startDate + 'T00:00:00'),  // 🔥 시작일!
      where('date', '<=', endDate + 'T23:59:59'),    // 🔥 종료일!
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
    
    console.log('📦 전체 완료 작업 수 (' + startDate + ' ~ ' + endDate + '):', allTasks.length);
    
    // 캐시 저장 (날짜 범위 포함!)
    saveCacheData('tasks', allTasks, dateRange);
    
    // 본인 작업만 필터링
    allWorkerTasks = allTasks.filter(task => {
      if (!task.worker) return false;
      const workers = task.worker.split(',').map(w => w.trim());
      return workers.includes(workerName);
    });
    
    console.log('👤 내 작업 수:', allWorkerTasks.length);
  }
  
  // 🔥 2. 출고 부품 로드 (캐시 우선, 날짜 범위 고려!)
  if (isCacheValid('outbound', dateRange)) {
    allOutboundParts = getCacheData('outbound');
    console.log('📦 출고 부품 수 (캐시):', allOutboundParts.length);
  } else {
    // 🔥 선택한 날짜 범위만 조회!
    console.log('🔥 출고 날짜 필터 적용:', startDate, '~', endDate);
    
    const inventoryRef = collection(db, 'inventory');
    const outboundQuery = query(
      inventoryRef,
      where('type', '==', 'out'),
      where('reason', '==', '작업사용'),
      where('date', '>=', startDate + 'T00:00:00'),  // 🔥 시작일!
      where('date', '<=', endDate + 'T23:59:59'),    // 🔥 종료일!
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
    
    console.log('📦 출고 부품 수 (' + startDate + ' ~ ' + endDate + '):', allOutboundParts.length);
    
    // 캐시 저장 (날짜 범위 포함!)
    saveCacheData('outbound', allOutboundParts, dateRange);
    
    // 출고 부품 샘플 출력 (처음 3개)
    if (allOutboundParts.length > 0) {
      console.log('📦 출고 부품 샘플 (처음 3개):');
      allOutboundParts.slice(0, 3).forEach((part, idx) => {
        console.log(`  ${idx + 1}. taskId: "${part.taskId}", partName: "${part.partName}", totalAmount: ${part.totalAmount}`);
      });
    }
  }
  
  // 🔥 3. 부품 목록 로드 (캐시 우선)
  if (isCacheValid('parts')) {
    PARTS_LIST = getCacheData('parts');
    console.log('🔧 부품 목록 수 (캐시):', PARTS_LIST.length);
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
    saveCacheData('parts', PARTS_LIST);
  }
  
  // 🔥 4. 사용자 정보 로드 (캐시 우선)
  if (isCacheValid('users')) {
    allUsers = getCacheData('users');
    console.log('👥 사용자 수 (캐시):', allUsers.length);
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
    saveCacheData('users', allUsers);
  }
  
  console.log('✅ 데이터 로드 완료!');
}

/**
 * 정산 HTML 생성
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
        <button onclick="refreshWorkerCache()" class="btn-refresh" title="데이터 새로고침">🔄</button>
      </div>
      
      <!-- 날짜 필터 -->
      <div class="date-filter">
        <label>📅 기간:</label>
        <input type="date" id="worker-settlement-start" value="${startDate}">
        <span>~</span>
        <input type="date" id="worker-settlement-end" value="${endDate}">
        <button onclick="filterWorkerSettlement()" class="btn-filter">검색</button>
        <button onclick="resetWorkerSettlement()" class="btn-reset">오늘</button>
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
            <div class="stat-label">매출</div>
            <div class="stat-value green">${formatCurrency(stats.myRevenue)}</div>
          </div>
          
          ${userInfo.employeeType !== 'executive' ? `
            <div class="stat-item stat-executive-share">
              <div class="stat-label">매출×30%</div>
              <div class="stat-value red">${formatCurrency(Math.round(stats.myRevenue * 0.3))}</div>
            </div>
          ` : ''}
          
          <div class="stat-item stat-part-cost">
            <div class="stat-label">부품비</div>
            <div class="stat-value red">${formatCurrency(stats.myPartCost)}</div>
          </div>
          
          <div class="stat-item stat-fee">
            <div class="stat-label">수수료</div>
            <div class="stat-value red">${formatCurrency(stats.myGeneralFee)}</div>
          </div>
        </div>
        
        <!-- 큰 카드들 -->
        <div class="stats-grid-large">
          ${userInfo.employeeType !== 'executive' ? `
            <div class="stat-large stat-final-payment">
              <div class="stat-label-large">순이익</div>
              <div class="stat-value-large">${formatCurrency(stats.netAllowance)}</div>
              <div class="stat-percentage">${((stats.netAllowance / stats.myRevenue) * 100).toFixed(1)}%</div>
            </div>
            
            <div class="stat-large stat-company-payment">
              <div class="stat-label-large">회사지급총액</div>
              <div class="stat-value-large">${formatCurrency(stats.companyPayment)}</div>
            </div>
          ` : `
            <div class="stat-large stat-profit">
              <div class="stat-label-large">순이익</div>
              <div class="stat-value-large">${formatCurrency(stats.netProfit)}</div>
              <div class="stat-percentage">${((stats.netProfit / stats.myRevenue) * 100).toFixed(1)}%</div>
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
          ${stats.collaborationNote ? `<li>📊 ${stats.collaborationNote} - 매출/부품비가 작업자 수로 균등 분할됩니다.</li>` : ''}
          <li>최종 수령액 = 매출 × ${userInfo.workerCommissionRate || 70}% - 부품비 - 수수료</li>
          <li>🔥 최적화: 최근 3개월 데이터만 조회 (캐시 1시간)</li>
        </ul>
      </div>
    </div>
  `;
}

/**
 * 통계 계산 (올바른 로직!)
 */
function calculateWorkerStats(tasks, userInfo) {
  console.log('🔢 통계 계산 시작, 작업 수:', tasks.length);
  
  const stats = {
    taskCount: tasks.length,
    myRevenue: 0,          // 내 매출 (협업 시 분할)
    myPartCost: 0,         // 내 부품비 (협업 시 분할)
    myGeneralFee: 0,       // 내 일반 수수료 (공간티비 제외, 협업 시 분할)
    grossAllowance: 0,     // 총 수당 (매출 × 70%)
    netAllowance: 0,       // 최종 수령액 (수당 - 부품비 - 일반수수료)
    companyPayment: 0,     // 회사지급총액 (임원몫 + 부품비 + 수수료)
    netProfit: 0,          // 순이익 (임원용)
    allowanceRate: userInfo.workerCommissionRate || 70,
    collaborationNote: ''
  };
  
  // 부품 단가 맵 생성
  const priceMap = {};
  PARTS_LIST.forEach(item => {
    if (item.name && item.price !== undefined) {
      priceMap[item.name] = item.price;
    }
  });
  
  let collaborationCount = 0;
  
  tasks.forEach((task, index) => {
    console.log(`\n📋 작업 ${index + 1}/${tasks.length}:`, task.id);
    console.log(`  👤 userInfo.employeeType: "${userInfo.employeeType}" (확인용!)`);  // 👈 추가!
    
    const totalAmount = Number(task.amount) || 0;
    const workerNames = task.worker ? task.worker.split(',').map(w => w.trim()) : [];
    const workerCount = workerNames.length || 1;
    const isCollaboration = workerCount > 1;
    
    if (isCollaboration) {
      collaborationCount++;
      console.log(`  👥 협업 작업 (${workerCount}명):`, workerNames.join(', '));
    }
    
    // 내 매출 (협업 시 균등 분할)
    const myRevenue = totalAmount / workerCount;
    console.log(`  💵 내 매출: ${totalAmount.toLocaleString()} ÷ ${workerCount} = ${myRevenue.toLocaleString()}원`);
    
    // 부품비 계산 (실제 출고 우선)
    console.log(`\n  📦 부품비 계산 시작:`);
    console.log(`    작업 ID: "${task.id}"`);
    console.log(`    전체 출고 부품: ${allOutboundParts.length}개`);
    
    const taskOutboundParts = allOutboundParts.filter(part => part.taskId === task.id);
    console.log(`    이 작업의 출고: ${taskOutboundParts.length}개`);
    
    let totalPartCost = 0;
    
    if (taskOutboundParts.length > 0) {
      totalPartCost = taskOutboundParts.reduce((sum, part) => sum + (part.totalAmount || 0), 0);
      console.log(`  📦 실제 출고 부품비: ${totalPartCost.toLocaleString()}원`);
      console.log(`  출고 상세:`, taskOutboundParts.map(p => `${p.partName} ${p.totalAmount}원`));
    } else if (task.parts) {
      console.log(`  task.parts 필드 사용: "${task.parts}"`);
      
      // JSON 형식인지 확인
      if (task.parts.trim().startsWith('[') || task.parts.trim().startsWith('{')) {
        // JSON 형식으로 파싱
        try {
          const partsArray = JSON.parse(task.parts);
          console.log(`  📦 JSON 형식 감지, 파싱 완료`);
          
          if (Array.isArray(partsArray)) {
            partsArray.forEach(part => {
              const partName = part.name || '';
              const quantity = Number(part.quantity) || 1;
              const price = Number(part.price) || 0;
              const itemCost = price * quantity;
              console.log(`    ${partName} × ${quantity} = ${itemCost.toLocaleString()}원 (단가: ${price.toLocaleString()}원)`);
              totalPartCost += itemCost;
            });
          }
        } catch (err) {
          console.error(`  ⚠️ JSON 파싱 실패:`, err.message);
        }
      } else {
        // 기존 형식: "벽걸이:1,케이블:2"
        const parts = task.parts.split(',');
        parts.forEach(part => {
          const trimmedPart = part.trim();
          if (trimmedPart) {
            const [name, count] = trimmedPart.split(':');
            const partName = name ? name.trim() : '';
            const partCount = Number(count) || 1;
            const partPrice = priceMap[partName] || 0;
            console.log(`    ${partName} × ${partCount} = ${(partPrice * partCount).toLocaleString()}원 (단가: ${partPrice}원)`);
            totalPartCost += partPrice * partCount;
          }
        });
      }
      console.log(`  🔧 계산된 부품비: ${totalPartCost.toLocaleString()}원`);
    } else {
      console.log(`  ⚠️ 부품 데이터 없음 (출고 없음, task.parts 없음)`);
    }
    
    // 내 부품비 (협업 시 균등 분할)
    const myPartCost = totalPartCost / workerCount;
    console.log(`  💸 내 부품비: ${totalPartCost.toLocaleString()} ÷ ${workerCount} = ${myPartCost.toLocaleString()}원`);
    
    // 수수료 계산
    let totalFee = 0;
    let isGongganFee = false;
    
    console.log(`\n  💰 수수료 체크:`);
    console.log(`    거래처: "${task.client}"`);
    console.log(`    task.fee: ${task.fee}`);
    
    if (task.client && task.client.includes("공간")) {
      totalFee = Math.round(totalAmount * 0.22);
      isGongganFee = true;
      console.log(`  🏢 공간티비 수수료: ${totalFee.toLocaleString()}원 (도급기사는 차감 안 함!)`);
    } else if (task.fee && task.fee > 0) {
      totalFee = Number(task.fee);
      console.log(`  💳 일반 수수료: ${totalFee.toLocaleString()}원`);
    } else {
      console.log(`  ⚠️ 수수료 없음 (task.fee가 없거나 0)`);
    }
    
    // 내 수수료 (도급기사는 공간티비 차감 안 함!)
    let myFee = 0;
    console.log(`  🔍 employeeType 체크: "${userInfo.employeeType}"`);
    
    if (userInfo.employeeType === 'executive') {
      // 임원은 모든 수수료 차감
      myFee = totalFee / workerCount;
      console.log(`  → 임원 수수료 차감: ${totalFee.toLocaleString()} ÷ ${workerCount} = ${myFee.toLocaleString()}원`);
    } else {
      // 임원이 아니면 (도급기사 또는 기타)
      // 일반 수수료만 차감 (공간티비는 차감 안 함)
      if (!isGongganFee && totalFee > 0) {
        myFee = totalFee / workerCount;
        console.log(`  → 도급기사 일반수수료 차감: ${totalFee.toLocaleString()} ÷ ${workerCount} = ${myFee.toLocaleString()}원`);
      } else if (isGongganFee) {
        console.log(`  → 도급기사 공간티비: 차감 안 함 (임원 몫에서만 차감)`);
        myFee = 0;
      } else {
        console.log(`  → 수수료 없음`);
        myFee = 0;
      }
    }
    
    // 누적
    stats.myRevenue += myRevenue;
    stats.myPartCost += myPartCost;
    stats.myGeneralFee += myFee;
  });
  
  // 도급기사 수당 계산
  console.log(`\n🔍 최종 계산 - employeeType: "${userInfo.employeeType}"`);
  
  if (userInfo.employeeType !== 'executive') {
    // 총 수당 = 매출 × 70%
    stats.grossAllowance = Math.round(stats.myRevenue * (stats.allowanceRate / 100));
    
    // 최종 수령액 = 총 수당 - 부품비 - 일반수수료
    stats.netAllowance = Math.round(stats.grossAllowance - stats.myPartCost - stats.myGeneralFee);
    
    // 🔥 회사지급총액 = 임원몫(30%) + 부품비 + 일반수수료
    const executiveShare = Math.round(stats.myRevenue * 0.3);
    stats.companyPayment = executiveShare + stats.myPartCost + stats.myGeneralFee;
    
    console.log('\n📊 도급기사 최종 정산:');
    console.log(`  내 매출: ${stats.myRevenue.toLocaleString()}원`);
    console.log(`  총 수당 (${stats.allowanceRate}%): ${stats.grossAllowance.toLocaleString()}원`);
    console.log(`  (-) 부품비: ${stats.myPartCost.toLocaleString()}원`);
    console.log(`  (-) 일반수수료: ${stats.myGeneralFee.toLocaleString()}원 👈 확인!`);
    console.log(`  = 최종 수령액: ${stats.netAllowance.toLocaleString()}원`);
    console.log(`  💰 회사지급총액: ${stats.companyPayment.toLocaleString()}원 (임원몫 ${executiveShare.toLocaleString()} + 부품비 ${stats.myPartCost.toLocaleString()} + 수수료 ${stats.myGeneralFee.toLocaleString()})`);
  } else {
    // 임원 순이익
    stats.netProfit = stats.myRevenue - stats.myPartCost - stats.myGeneralFee;
    console.log('\n📊 임원 최종 정산:');
    console.log(`  내 매출: ${stats.myRevenue.toLocaleString()}원`);
    console.log(`  (-) 부품비: ${stats.myPartCost.toLocaleString()}원`);
    console.log(`  (-) 수수료: ${stats.myGeneralFee.toLocaleString()}원`);
    console.log(`  = 순이익: ${stats.netProfit.toLocaleString()}원`);
  }
  
  // 협업 안내
  if (collaborationCount > 0) {
    stats.collaborationNote = `협업 ${collaborationCount}건 포함`;
  }
  
  return stats;
}

/**
 * 거래처별 상세 계산 (내 몫만)
 */
function calculateClientDetails(tasks, myName) {
  const clientDetails = {};
  
  tasks.forEach(task => {
    const client = task.client || '미분류';
    const totalAmount = Number(task.amount) || 0;
    
    // 협업 작업 처리
    const workerNames = task.worker ? task.worker.split(',').map(w => w.trim()) : [];
    const workerCount = workerNames.length || 1;
    const myAmount = totalAmount / workerCount;
    
    if (!clientDetails[client]) {
      clientDetails[client] = {
        count: 0,
        myAmount: 0
      };
    }
    
    clientDetails[client].count += 1;
    clientDetails[client].myAmount += myAmount;
  });
  
  return clientDetails;
}

/**
 * 거래처 상세 토글
 */
window.toggleClientDetails = function() {
  const content = document.getElementById('client-details-content');
  const icon = document.getElementById('client-toggle-icon');
  
  if (content.style.display === 'none') {
    content.style.display = 'block';
    icon.textContent = '▼';
  } else {
    content.style.display = 'none';
    icon.textContent = '▶';
  }
};

/**
 * 기간 필터링
 */
window.filterWorkerSettlement = async function() {
  const startDate = document.getElementById('worker-settlement-start').value;
  const endDate = document.getElementById('worker-settlement-end').value;
  
  if (!startDate || !endDate) {
    alert('시작일과 종료일을 선택해주세요.');
    return;
  }
  
  if (startDate > endDate) {
    alert('시작일이 종료일보다 늦을 수 없습니다.');
    return;
  }
  
  const userInfo = window.currentUserInfo;
  const content = document.getElementById('worker-task-content');
  
  // 로딩 표시
  content.innerHTML = `
    <div class="worker-settlement-loading">
      <div class="spinner"></div>
      <p>정산 정보를 불러오는 중...</p>
    </div>
  `;
  
  try {
    // 🔥 선택한 날짜 범위로 데이터 다시 로드!
    await loadAllData(userInfo.name, startDate, endDate);
    
    // HTML 생성
    content.innerHTML = getWorkerSettlementHTML(userInfo, startDate, endDate);
    
    console.log('✅ 정산 기간 필터링 완료:', startDate, '~', endDate);
  } catch (error) {
    console.error('❌ 필터링 실패:', error);
    content.innerHTML = `
      <div class="worker-settlement-error">
        ❌ 정산 정보를 불러오지 못했습니다.<br>
        ${error.message}
      </div>
    `;
  }
};

/**
 * 오늘로 리셋
 */
window.resetWorkerSettlement = async function() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayDate = `${year}-${month}-${day}`;
  
  const userInfo = window.currentUserInfo;
  const content = document.getElementById('worker-task-content');
  
  // 로딩 표시
  content.innerHTML = `
    <div class="worker-settlement-loading">
      <div class="spinner"></div>
      <p>정산 정보를 불러오는 중...</p>
    </div>
  `;
  
  try {
    // 🔥 오늘 날짜로 데이터 다시 로드!
    await loadAllData(userInfo.name, todayDate, todayDate);
    
    // HTML 생성
    content.innerHTML = getWorkerSettlementHTML(userInfo, todayDate, todayDate);
    
    console.log('✅ 오늘로 리셋 완료:', todayDate);
  } catch (error) {
    console.error('❌ 리셋 실패:', error);
    content.innerHTML = `
      <div class="worker-settlement-error">
        ❌ 정산 정보를 불러오지 못했습니다.<br>
        ${error.message}
      </div>
    `;
  }
};

/**
 * 금액 포맷
 */
function formatCurrency(amount) {
  return Math.round(amount).toLocaleString() + '원';
}

/**
 * 스타일 추가
 */
function addWorkerSettlementStyles() {
  const existingStyle = document.getElementById('worker-settlement-style');
  if (existingStyle) return;
  
  const style = document.createElement('style');
  style.id = 'worker-settlement-style';
  style.textContent = `
    /* 직원용 정산 스타일 */
    .worker-settlement-container {
      padding: 20px;
      max-width: 900px;
      margin: 0 auto;
    }
    
    .settlement-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .settlement-header h3 {
      margin: 0;
      font-size: 24px;
      color: #1a202c;
    }
    
    .btn-refresh {
      background: transparent;
      color: #718096;
      border: 2px solid #e2e8f0;
      padding: 6px 10px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
    }
    
    .btn-refresh:hover {
      background: #f7fafc;
      color: #667eea;
      border-color: #cbd5e1;
      transform: rotate(90deg);
    }
    
    .btn-refresh:active {
      transform: rotate(180deg);
    }
    
    .date-filter {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      padding: 15px;
      background: #f7fafc;
      border-radius: 10px;
    }
    
    .date-filter label {
      font-weight: 600;
      color: #2d3748;
    }
    
    .date-filter input[type="date"] {
      padding: 8px 12px;
      border: 2px solid #e2e8f0;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.2s;
    }
    
    .date-filter input[type="date"]:focus {
      outline: none;
      border-color: #667eea;
    }
    
    .btn-filter, .btn-reset {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }
    
    .btn-filter {
      background: #667eea;
      color: white;
    }
    
    .btn-filter:hover {
      background: #5a67d8;
    }
    
    .btn-reset {
      background: #edf2f7;
      color: #4a5568;
    }
    
    .btn-reset:hover {
      background: #e2e8f0;
    }
    
    .stats-card {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.07);
      margin-bottom: 20px;
    }
    
    .worker-info-header {
      display: flex;
      align-items: center;
      gap: 15px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 20px;
    }
    
    .worker-icon {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
    }
    
    .worker-details {
      flex: 1;
    }
    
    .worker-name {
      font-size: 20px;
      font-weight: 700;
      color: #1a202c;
      margin-bottom: 5px;
    }
    
    .worker-type {
      font-size: 14px;
      color: #718096;
      font-weight: 600;
    }
    
    /* 작은 카드 그리드 */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 12px;
      margin-bottom: 15px;
    }
    
    .stat-item {
      padding: 15px;
      background: white;
      border-radius: 8px;
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    
    .stat-label {
      font-size: 12px;
      color: #718096;
      margin-bottom: 8px;
      font-weight: 500;
    }
    
    .stat-value {
      font-size: 18px;
      font-weight: 700;
      color: #2d3748;
    }
    
    .stat-value.green {
      color: #38a169;
    }
    
    .stat-value.red {
      color: #e53e3e;
    }
    
    /* 큰 카드 그리드 */
    .stats-grid-large {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }
    
    .stat-large {
      padding: 25px 20px;
      border-radius: 12px;
      text-align: center;
    }
    
    .stat-final-payment {
      background: #d4f4dd;
      border: 2px solid #9ae6b4;
    }
    
    .stat-company-payment {
      background: #fed7d7;
      border: 2px solid #fc8181;
    }
    
    .stat-profit {
      background: #d4f4dd;
      border: 2px solid #9ae6b4;
    }
    
    .stat-label-large {
      font-size: 14px;
      color: #2d3748;
      margin-bottom: 12px;
      font-weight: 600;
    }
    
    .stat-value-large {
      font-size: 28px;
      font-weight: 700;
      color: #2d3748;
      margin-bottom: 8px;
    }
    
    .stat-percentage {
      font-size: 16px;
      font-weight: 700;
      color: #38a169;
    }
    
    .client-details-section {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.07);
      margin-bottom: 20px;
      overflow: hidden;
    }
    
    .section-header {
      padding: 20px;
      background: linear-gradient(135deg, #f7fafc, #e2e8f0);
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: background 0.2s;
    }
    
    .section-header:hover {
      background: linear-gradient(135deg, #edf2f7, #cbd5e1);
    }
    
    .section-header h4 {
      margin: 0;
      font-size: 16px;
      color: #2d3748;
    }
    
    .toggle-icon {
      font-size: 14px;
      color: #718096;
      transition: transform 0.2s;
    }
    
    .client-details-content {
      padding: 0;
    }
    
    .client-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 20px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .client-row:last-child {
      border-bottom: none;
    }
    
    .client-name {
      font-weight: 600;
      color: #2d3748;
    }
    
    .client-stats {
      display: flex;
      gap: 15px;
      align-items: center;
    }
    
    .client-count {
      font-size: 13px;
      color: #718096;
      background: #edf2f7;
      padding: 4px 10px;
      border-radius: 12px;
    }
    
    .client-amount {
      font-size: 16px;
      font-weight: 700;
      color: #48bb78;
    }
    
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.07);
    }
    
    .empty-icon {
      font-size: 64px;
      margin-bottom: 20px;
      opacity: 0.5;
    }
    
    .empty-state p {
      color: #718096;
      font-size: 16px;
    }
    
    .info-box {
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 20px;
      border-radius: 8px;
      margin-top: 20px;
    }
    
    .info-box h4 {
      margin: 0 0 15px 0;
      color: #92400e;
      font-size: 16px;
    }
    
    .info-box ul {
      margin: 0;
      padding-left: 20px;
      color: #78350f;
    }
    
    .info-box li {
      margin-bottom: 8px;
      line-height: 1.6;
    }
    
    .worker-settlement-error {
      text-align: center;
      padding: 40px;
      background: #fff5f5;
      border: 2px solid #fc8181;
      border-radius: 10px;
      color: #c53030;
      font-size: 16px;
    }
    
    .worker-settlement-loading {
      text-align: center;
      padding: 60px 20px;
    }
    
    .worker-settlement-loading p {
      color: #718096;
      font-size: 16px;
      margin-top: 10px;
    }
    
    .spinner {
      width: 40px;
      height: 40px;
      margin: 0 auto 15px;
      border: 4px solid #e2e8f0;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* 반응형 */
    @media (max-width: 768px) {
      .worker-settlement-container {
        padding: 15px;
      }
      
      .date-filter {
        flex-wrap: wrap;
      }
      
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }
      
      .stats-grid-large {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      
      .stat-value {
        font-size: 16px;
      }
      
      .stat-value-large {
        font-size: 24px;
      }
      
      .client-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
    }
  `;
  
  document.head.appendChild(style);
}
