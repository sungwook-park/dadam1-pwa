// scripts/worker-settlement.js - 직원용 정산 (올바른 로직)

import { db } from './firebase-config.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 전역 변수
let allWorkerTasks = [];
let allOutboundParts = [];
let allUsers = [];
let PARTS_LIST = [];

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
    // 데이터 로드
    await loadAllData(userInfo.name);
    
    // 오늘 날짜로 초기화
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;
    
    console.log(`📅 기본 기간: ${todayDate} (오늘)`);
    
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
 * 모든 데이터 로드
 */
async function loadAllData(workerName) {
  console.log('🔍 데이터 로드 시작, 작업자:', workerName);
  
  // 1. 모든 완료 작업 로드 (필터링 없이)
  const tasksRef = collection(db, 'tasks');
  const q = query(
    tasksRef,
    where('done', '==', true)
  );
  
  const snapshot = await getDocs(q);
  const allTasks = [];
  
  snapshot.forEach(doc => {
    allTasks.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  console.log('📦 전체 완료 작업 수:', allTasks.length);
  
  // 2. 본인 작업만 필터링 (협업 작업 포함)
  allWorkerTasks = allTasks.filter(task => {
    if (!task.worker) return false;
    
    // 협업 작업 처리: "박성호,김철수" 또는 "박성호"
    const workers = task.worker.split(',').map(w => w.trim());
    return workers.includes(workerName);
  });
  
  console.log('👤 내 작업 수:', allWorkerTasks.length);
  
  // 3. 출고 부품 로드 (inventory 컬렉션)
  const inventoryRef = collection(db, 'inventory');
  const outboundQuery = query(
    inventoryRef,
    where('type', '==', 'out'),
    where('reason', '==', '작업사용')
  );
  const outboundSnapshot = await getDocs(outboundQuery);
  allOutboundParts = [];
  
  outboundSnapshot.forEach(doc => {
    allOutboundParts.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  console.log('📦 출고 부품 수:', allOutboundParts.length);
  
  // 출고 부품 샘플 출력 (처음 3개)
  if (allOutboundParts.length > 0) {
    console.log('📦 출고 부품 샘플 (처음 3개):');
    allOutboundParts.slice(0, 3).forEach((part, idx) => {
      console.log(`  ${idx + 1}. taskId: "${part.taskId}", partName: "${part.partName}", totalAmount: ${part.totalAmount}`);
    });
  }
  
  // 4. 부품 목록 로드
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
  
  // 5. 사용자 정보 로드
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
            <div class="stat-label">내 매출</div>
            <div class="stat-value">${formatCurrency(stats.myRevenue)}</div>
            <div class="stat-subtitle">${stats.collaborationNote}</div>
          </div>
          
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
          <li>최종 수령액 = 매출 × ${userInfo.workerCommissionRate || 70}% - 부품비 - 수수료</li>
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
    
    console.log('\n📊 도급기사 최종 정산:');
    console.log(`  내 매출: ${stats.myRevenue.toLocaleString()}원`);
    console.log(`  총 수당 (${stats.allowanceRate}%): ${stats.grossAllowance.toLocaleString()}원`);
    console.log(`  (-) 부품비: ${stats.myPartCost.toLocaleString()}원`);
    console.log(`  (-) 일반수수료: ${stats.myGeneralFee.toLocaleString()}원 👈 확인!`);
    console.log(`  = 최종 수령액: ${stats.netAllowance.toLocaleString()}원`);
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
window.filterWorkerSettlement = function() {
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
  content.innerHTML = getWorkerSettlementHTML(userInfo, startDate, endDate);
  
  console.log('정산 기간 필터링:', startDate, '~', endDate);
};

/**
 * 오늘로 리셋
 */
window.resetWorkerSettlement = function() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayDate = `${year}-${month}-${day}`;
  
  const userInfo = window.currentUserInfo;
  const content = document.getElementById('worker-task-content');
  content.innerHTML = getWorkerSettlementHTML(userInfo, todayDate, todayDate);
  
  console.log('오늘로 리셋:', todayDate);
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
    .worker-settlement-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .settlement-header {
      margin-bottom: 20px;
    }
    
    .settlement-header h3 {
      font-size: 24px;
      font-weight: 700;
      color: #1a202c;
      margin: 0;
    }
    
    /* 날짜 필터 */
    .date-filter {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 25px;
      padding: 15px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    
    .date-filter label {
      font-weight: 600;
      color: #4a5568;
    }
    
    .date-filter input {
      padding: 8px 12px;
      border: 2px solid #e2e8f0;
      border-radius: 6px;
      font-size: 14px;
    }
    
    .date-filter span {
      font-weight: 600;
      color: #718096;
    }
    
    .btn-filter, .btn-reset {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-filter {
      background: #667eea;
      color: white;
    }
    
    .btn-filter:hover {
      background: #5568d3;
    }
    
    .btn-reset {
      background: #e2e8f0;
      color: #4a5568;
    }
    
    .btn-reset:hover {
      background: #cbd5e0;
    }
    
    /* 통계 카드 */
    .stats-card {
      background: white;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      margin-bottom: 25px;
    }
    
    .worker-info-header {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 25px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .worker-icon {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
    }
    
    .worker-details {
      flex: 1;
    }
    
    .worker-name {
      font-size: 20px;
      font-weight: 800;
      color: #1a202c;
      margin-bottom: 5px;
    }
    
    .worker-type {
      font-size: 14px;
      font-weight: 600;
      color: #667eea;
    }
    
    /* 통계 그리드 */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 15px;
    }
    
    .stat-item {
      padding: 15px;
      border-radius: 12px;
      text-align: center;
      border: none;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    
    .stat-item::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: rgba(255,255,255,0.5);
    }
    
    .stat-item:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.15);
    }
    
    /* 작업 - 파스텔 블루 */
    .stat-tasks {
      background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
    }
    
    .stat-tasks .stat-label {
      color: #1976D2;
    }
    
    .stat-tasks .stat-value {
      color: #0D47A1;
    }
    
    /* 내 매출 - 파스텔 그린 */
    .stat-revenue {
      background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
    }
    
    .stat-revenue .stat-label {
      color: #388E3C;
    }
    
    .stat-revenue .stat-value {
      color: #1B5E20;
    }
    
    /* 부품비 - 파스텔 핑크 */
    .stat-part-cost {
      background: linear-gradient(135deg, #FCE4EC 0%, #F8BBD0 100%);
    }
    
    .stat-part-cost .stat-label {
      color: #C2185B;
    }
    
    .stat-part-cost .stat-value {
      color: #880E4F;
    }
    
    /* 일반수수료 - 파스텔 오렌지 */
    .stat-fee {
      background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
    }
    
    .stat-fee .stat-label {
      color: #F57C00;
    }
    
    .stat-fee .stat-value {
      color: #E65100;
    }
    
    /* 최종 수령액 - 파스텔 퍼플 (강조) */
    .stat-final-payment {
      background: linear-gradient(135deg, #EDE7F6 0%, #D1C4E9 100%);
      border: 2px solid #9575CD;
    }
    
    .stat-final-payment .stat-label {
      color: #5E35B1;
      font-weight: 700;
    }
    
    .stat-final-payment .stat-value {
      color: #4527A0;
      font-size: 20px;
    }
    
    /* 순이익 (임원용) - 파스텔 인디고 */
    .stat-profit {
      background: linear-gradient(135deg, #E8EAF6 0%, #C5CAE9 100%);
      border: 2px solid #7986CB;
    }
    
    .stat-profit .stat-label {
      color: #3949AB;
      font-weight: 700;
    }
    
    .stat-profit .stat-value {
      color: #283593;
      font-size: 20px;
    }
    
    .stat-label {
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .stat-value {
      font-size: 18px;
      font-weight: 800;
    }
    
    .stat-value.negative {
      opacity: 0.85;
    }
    
    .stat-subtitle {
      font-size: 11px;
      font-weight: 600;
      margin-top: 4px;
      opacity: 0.7;
    }
    
    /* 거래처별 상세 */
    .client-details-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      margin-bottom: 25px;
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
      padding-bottom: 15px;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 15px;
    }
    
    .section-header:hover {
      opacity: 0.8;
    }
    
    .section-header h4 {
      font-size: 18px;
      font-weight: 700;
      color: #2d3748;
      margin: 0;
    }
    
    .toggle-icon {
      font-size: 14px;
      font-weight: 700;
      color: #718096;
    }
    
    .client-details-content {
      display: block;
    }
    
    .client-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: #f7fafc;
      border-radius: 8px;
      margin-bottom: 8px;
      transition: all 0.2s;
    }
    
    .client-row:hover {
      background: #edf2f7;
    }
    
    .client-name {
      font-weight: 700;
      color: #2d3748;
      font-size: 14px;
    }
    
    .client-stats {
      display: flex;
      gap: 15px;
    }
    
    .client-count {
      font-size: 13px;
      font-weight: 600;
      color: #718096;
    }
    
    .client-amount {
      font-size: 14px;
      font-weight: 800;
      color: #667eea;
    }
    
    /* 안내 박스 */
    .info-box {
      background: #edf2f7;
      border-left: 4px solid #4299e1;
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 25px;
    }
    
    .info-box h4 {
      margin: 0 0 10px 0;
      font-size: 16px;
      font-weight: 700;
      color: #2d3748;
    }
    
    .info-box ul {
      margin: 0;
      padding-left: 20px;
    }
    
    .info-box li {
      font-size: 13px;
      color: #4a5568;
      line-height: 1.6;
      margin-bottom: 5px;
    }
    
    /* 빈 상태 */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
    }
    
    .empty-icon {
      font-size: 48px;
      margin-bottom: 15px;
    }
    
    .empty-state p {
      color: #a0aec0;
      font-size: 15px;
    }
    
    /* 오류 및 로딩 */
    .worker-settlement-error,
    .worker-settlement-loading {
      text-align: center;
      padding: 60px 20px;
    }
    
    .worker-settlement-error {
      background: #fff5f5;
      border: 2px solid #fc8181;
      border-radius: 8px;
      color: #c53030;
      font-weight: 600;
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
        grid-template-columns: 1fr 1fr;
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
