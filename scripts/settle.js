// scripts/settle.js (ES6 모듈) - 서브탭 추가 및 분석 기능
import { PARTS_LIST } from './parts-list.js';

// 오늘 날짜 문자열 반환 함수
function getTodayString() {
  const today = new Date();
  return today.getFullYear() + '-' + 
    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
    String(today.getDate()).padStart(2, '0');
}

// 현재 활성 서브탭
let currentSettleSubTab = 'daily';

// 전역 데이터
let allCompletedTasks = [];
let todayTasks = [];

export async function loadSettlement() {
  try {
    console.log('정산 시작...');
    
    // Firebase 인스턴스 확인
    const db = window.db;
    const { getDocs, collection, where, query } = window.firebase;
    
    if (!db || !getDocs) {
      throw new Error('Firebase가 초기화되지 않았습니다.');
    }

    // 완료된 작업 가져오기
    const q = query(collection(db, "tasks"), where("done", "==", true));
    const querySnapshot = await getDocs(q);
    
    console.log(`완료된 작업 ${querySnapshot.size}개 발견`);

    // 전역 변수에 모든 작업 저장
    allCompletedTasks = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      allCompletedTasks.push({
        id: doc.id,
        ...data
      });
    });

    // 정산 메인 HTML 표시
    document.getElementById('settle-result').innerHTML = getSettlementMainHTML();
    
    // 기본으로 일별정산 탭 로드 (오늘만)
    showSettleSubTab('daily');
    
  } catch (error) {
    console.error('정산 오류:', error);
    document.getElementById('settle-result').innerHTML = `
      <div style="background: #f8d7da; color: #721c24; padding: 20px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
        <h3 style="margin: 0 0 15px 0; font-size: 18px;">❌ 정산 오류</h3>
        <p style="margin: 0 0 10px 0; font-size: 14px;">오류: ${error.message}</p>
        <p style="margin: 0; opacity: 0.8;">브라우저 콘솔(F12)에서 자세한 내용을 확인해주세요.</p>
      </div>
    `;
  }
}

// 정산 메인 HTML
function getSettlementMainHTML() {
  return `
    <div class="settlement-container">
      <!-- 정산 서브탭 -->
      <div class="settlement-subtabs">
        <button onclick="showSettleSubTab('daily')" class="settle-tab-btn active" id="daily-settle-tab">
          📊 일별정산
        </button>
        <button onclick="showSettleSubTab('worker')" class="settle-tab-btn" id="worker-settle-tab">
          👷 직원별분석
        </button>
        <button onclick="showSettleSubTab('fee')" class="settle-tab-btn" id="fee-settle-tab">
          💳 수수료분석
        </button>
      </div>
      
      <!-- 탭 컨텐츠 영역 -->
      <div id="settlement-content">
        <div class="loading-message">정산 데이터를 불러오는 중...</div>
      </div>
    </div>
    
    <style>
      .settlement-subtabs {
        display: flex;
        gap: 8px;
        margin-bottom: 25px;
        background: white;
        padding: 15px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      }
      
      .settle-tab-btn {
        flex: 1;
        padding: 12px 16px;
        border: 2px solid #dee2e6;
        border-radius: 10px;
        background: #f8f9fa !important;
        color: #333 !important;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
        touch-action: manipulation;
      }
      
      .settle-tab-btn:hover {
        border-color: #8ecae6;
        background: #e3f2fd !important;
      }
      
      .settle-tab-btn.active {
        background: #219ebc !important;
        border-color: #219ebc;
        color: #fff !important;
        transform: translateY(-1px);
        box-shadow: 0 3px 8px rgba(33,158,188,0.2);
      }
      
      #settlement-content {
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        min-height: 400px;
      }
      
      .loading-message {
        text-align: center;
        padding: 60px 20px;
        color: #666;
        font-size: 16px;
      }
      
      @media (max-width: 768px) {
        .settlement-subtabs {
          flex-direction: column;
          gap: 8px;
        }
      }
    </style>
  `;
}

// 서브탭 전환
window.showSettleSubTab = async function(tabType) {
  console.log('정산 서브탭 전환:', tabType);
  
  currentSettleSubTab = tabType;
  
  // 탭 버튼 활성화 상태 변경
  document.querySelectorAll('.settle-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const activeBtn = document.getElementById(`${tabType}-settle-tab`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
  
  const contentDiv = document.getElementById('settlement-content');
  if (!contentDiv) return;
  
  // 로딩 표시
  contentDiv.innerHTML = '<div class="loading-message">데이터를 불러오는 중...</div>';
  
  try {
    switch (tabType) {
      case 'daily':
        await loadDailySettlement();
        break;
      case 'worker':
        await loadWorkerAnalysis();
        break;
      case 'fee':
        await loadFeeAnalysis();
        break;
      default:
        contentDiv.innerHTML = '<div class="loading-message">잘못된 탭입니다.</div>';
    }
  } catch (error) {
    console.error('서브탭 로드 오류:', error);
    contentDiv.innerHTML = '<div class="loading-message">데이터 로드 중 오류가 발생했습니다.</div>';
  }
};

// 1. 일별정산 로드 (오늘만, 날짜 범위 필터링 가능)
async function loadDailySettlement() {
  console.log('일별정산 로드');
  
  // 오늘 날짜
  const todayStr = getTodayString();
  
  // 오늘 작업만 필터링
  todayTasks = allCompletedTasks.filter(task => {
    if (!task.date) return false;
    return task.date.startsWith(todayStr);
  });
  
  const contentDiv = document.getElementById('settlement-content');
  contentDiv.innerHTML = getDailySettlementHTML(todayTasks, todayStr, todayStr);
}

// 일별정산 HTML
function getDailySettlementHTML(tasks, startDate, endDate = null) {
  const dayStats = calculateDayStats(tasks);
  const monthStats = calculateMonthStats();
  const displayDate = endDate && endDate !== startDate ? `${startDate} ~ ${endDate}` : startDate;
  
  return `
    <div class="daily-settlement-container">
      <div class="settlement-header">
        <h3>📊 일별정산</h3>
        <div class="date-filter-container">
          <label>📅 기간:</label>
          <input type="date" id="daily-start-date" value="${startDate}">
          <span>~</span>
          <input type="date" id="daily-end-date" value="${endDate || startDate}">
          <button onclick="filterDailyByDateRange()" class="filter-btn">검색</button>
          <button onclick="resetDailyFilter()" class="reset-btn">오늘</button>
        </div>
      </div>
      
      <div class="period-info">
        <h4>📅 선택 기간: ${displayDate} (${tasks.length}건)</h4>
      </div>
      
      <div class="daily-stats">
        <div class="stat-card revenue">
          <div class="stat-icon">💵</div>
          <div class="stat-info">
            <div class="stat-label">총 매출</div>
            <div class="stat-value">${dayStats.total.toLocaleString()}원</div>
          </div>
        </div>
        
        <div class="stat-card expense">
          <div class="stat-icon">💸</div>
          <div class="stat-info">
            <div class="stat-label">총 지출</div>
            <div class="stat-value">${dayStats.spend.toLocaleString()}원</div>
          </div>
        </div>
        
        <div class="stat-card profit">
          <div class="stat-icon">💰</div>
          <div class="stat-info">
            <div class="stat-label">순이익</div>
            <div class="stat-value">${dayStats.profit.toLocaleString()}원</div>
          </div>
        </div>
        
        <div class="stat-card tasks">
          <div class="stat-icon">📋</div>
          <div class="stat-info">
            <div class="stat-label">완료 작업</div>
            <div class="stat-value">${tasks.length}건</div>
          </div>
        </div>
      </div>
      
      <div class="breakdown-section">
        <div class="breakdown-card">
          <h4>💸 지출 내역</h4>
          <div class="breakdown-item">
            <span>부품비:</span>
            <span>${dayStats.partSpend.toLocaleString()}원</span>
          </div>
          <div class="breakdown-item">
            <span>수수료:</span>
            <span>${dayStats.fee.toLocaleString()}원</span>
          </div>
        </div>
        
        <div class="breakdown-card">
          <h4>💰 순이익 배분</h4>
          <div class="breakdown-item">
            <span>회사자금 (20%):</span>
            <span>${dayStats.company.toLocaleString()}원</span>
          </div>
          <div class="breakdown-item">
            <span>성욱 (40%):</span>
            <span>${dayStats.sungwook.toLocaleString()}원</span>
          </div>
          <div class="breakdown-item">
            <span>성호 (30%):</span>
            <span>${dayStats.sungho.toLocaleString()}원</span>
          </div>
          <div class="breakdown-item">
            <span>희종 (30%):</span>
            <span>${dayStats.heejong.toLocaleString()}원</span>
          </div>
        </div>
      </div>
      
      <!-- 월별 정산 추가 -->
      <div class="monthly-section">
        <h3>📊 이번 달 정산</h3>
        <div class="monthly-stats">
          <div class="monthly-card">
            <div class="monthly-icon">📅</div>
            <div class="monthly-info">
              <div class="monthly-label">이번 달 총 매출</div>
              <div class="monthly-value">${monthStats.total.toLocaleString()}원</div>
              <div class="monthly-subtitle">${monthStats.taskCount}건 완료</div>
            </div>
          </div>
          
          <div class="monthly-card">
            <div class="monthly-icon">💸</div>
            <div class="monthly-info">
              <div class="monthly-label">이번 달 총 지출</div>
              <div class="monthly-value">${monthStats.spend.toLocaleString()}원</div>
              <div class="monthly-subtitle">부품비 + 수수료</div>
            </div>
          </div>
          
          <div class="monthly-card profit">
            <div class="monthly-icon">💰</div>
            <div class="monthly-info">
              <div class="monthly-label">이번 달 순이익</div>
              <div class="monthly-value">${monthStats.profit.toLocaleString()}원</div>
              <div class="monthly-subtitle">매출 - 지출</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <style>
      .daily-settlement-container {
        padding: 25px;
      }
      
      .settlement-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid #e6e6e6;
      }
      
      .settlement-header h3 {
        margin: 0;
        color: #333;
        font-size: 1.4rem;
      }
      
      .date-filter-container {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      
      .date-filter-container label {
        font-weight: 600;
        color: #333;
      }
      
      .date-filter-container input {
        padding: 8px 12px;
        border: 2px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
      }
      
      .date-filter-container span {
        font-weight: 600;
        color: #666;
      }
      
      .filter-btn, .reset-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .filter-btn {
        background: #219ebc;
        color: white;
      }
      
      .filter-btn:hover {
        background: #1a7a96;
      }
      
      .reset-btn {
        background: #6c757d;
        color: white;
      }
      
      .reset-btn:hover {
        background: #5a6268;
      }
      
      .period-info {
        margin-bottom: 20px;
        padding: 15px;
        background: #e3f2fd;
        border-radius: 8px;
        border-left: 4px solid #219ebc;
      }
      
      .period-info h4 {
        margin: 0;
        color: #1565c0;
        font-size: 1.1rem;
      }
      
      .daily-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
      }
      
      .stat-card {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
      .stat-card.revenue {
        background: linear-gradient(135deg, #e3f2fd, #bbdefb);
        border-left: 4px solid #2196f3;
      }
      
      .stat-card.expense {
        background: linear-gradient(135deg, #ffebee, #ffcdd2);
        border-left: 4px solid #f44336;
      }
      
      .stat-card.profit {
        background: linear-gradient(135deg, #e8f5e8, #c8e6c9);
        border-left: 4px solid #4caf50;
      }
      
      .stat-card.tasks {
        background: linear-gradient(135deg, #fff3e0, #ffe0b2);
        border-left: 4px solid #ff9800;
      }
      
      .stat-icon {
        font-size: 2rem;
      }
      
      .stat-label {
        font-size: 14px;
        color: #666;
        margin-bottom: 5px;
      }
      
      .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: #333;
      }
      
      .breakdown-section {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
      }
      
      .breakdown-card {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 12px;
        border-left: 4px solid #8ecae6;
      }
      
      .breakdown-card h4 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 1.1rem;
      }
      
      .breakdown-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px dotted #ddd;
      }
      
      .breakdown-item:last-child {
        border-bottom: none;
      }
      
      .breakdown-item span:last-child {
        font-weight: 600;
        color: #219ebc;
      }
      
      /* 월별 정산 스타일 */
      .monthly-section {
        border-top: 2px solid #e6e6e6;
        padding-top: 30px;
        margin-top: 30px;
      }
      
      .monthly-section h3 {
        margin: 0 0 20px 0;
        color: #333;
        font-size: 1.3rem;
      }
      
      .monthly-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
      }
      
      .monthly-card {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 25px;
        background: linear-gradient(135deg, #fff8e1, #ffecb3);
        border-radius: 12px;
        border-left: 4px solid #ffa000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
      .monthly-card.profit {
        background: linear-gradient(135deg, #e8f5e8, #c8e6c9);
        border-left: 4px solid #4caf50;
      }
      
      .monthly-icon {
        font-size: 2.2rem;
      }
      
      .monthly-label {
        font-size: 14px;
        color: #666;
        margin-bottom: 5px;
      }
      
      .monthly-value {
        font-size: 1.4rem;
        font-weight: 700;
        color: #333;
        margin-bottom: 3px;
      }
      
      .monthly-subtitle {
        font-size: 12px;
        color: #888;
      }
      
      @media (max-width: 768px) {
        .daily-settlement-container {
          padding: 15px;
        }
        
        .settlement-header {
          flex-direction: column;
          gap: 15px;
          align-items: stretch;
        }
        
        .date-filter-container {
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .date-filter-container input {
          min-width: 120px;
        }
        
        .daily-stats, .monthly-stats {
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
        }
        
        .stat-card, .monthly-card {
          flex-direction: column;
          text-align: center;
          gap: 10px;
        }
        
        .breakdown-section {
          grid-template-columns: 1fr;
          gap: 15px;
        }
      }
    </style>
  `;
}

// 2. 직원별분석 로드
async function loadWorkerAnalysis() {
  console.log('직원별분석 로드');
  
  // 오늘 날짜
  const todayStr = getTodayString();
  
  // 오늘 작업만 필터링
  const todayWorkerTasks = allCompletedTasks.filter(task => {
    if (!task.date) return false;
    return task.date.startsWith(todayStr);
  });
  
  const contentDiv = document.getElementById('settlement-content');
  contentDiv.innerHTML = getWorkerAnalysisHTML(todayWorkerTasks, todayStr, todayStr);
}

// 직원별분석 HTML
function getWorkerAnalysisHTML(tasks, startDate, endDate = null) {
  const workerStats = calculateWorkerStatsNew(tasks);
  const displayDate = endDate && endDate !== startDate ? `${startDate} ~ ${endDate}` : startDate;
  
  return `
    <div class="worker-analysis-container">
      <div class="analysis-header">
        <h3>👷 직원별 분석</h3>
        <div class="worker-date-filter">
          <label>📅 기간:</label>
          <input type="date" id="worker-start-date" value="${startDate}">
          <span>~</span>
          <input type="date" id="worker-end-date" value="${endDate || startDate}">
          <button onclick="filterWorkerByDateRange()" class="filter-btn">검색</button>
          <button onclick="resetWorkerFilter()" class="reset-btn">오늘</button>
        </div>
      </div>
      
      <div class="period-info">
        <h4>📅 선택 기간: ${displayDate} (총 ${tasks.length}건)</h4>
      </div>
      
      <div class="worker-stats-grid">
        ${Object.entries(workerStats).length > 0 ? 
          Object.entries(workerStats).map(([worker, stats]) => `
            <div class="worker-card">
              <div class="worker-header">
                <div class="worker-icon">👤</div>
                <div class="worker-info">
                  <div class="worker-name">${worker}</div>
                  <div class="worker-subtitle">${stats.taskCount}건 완료</div>
                </div>
              </div>
              
              <div class="worker-metrics">
                <div class="metric-item">
                  <div class="metric-label">총 금액</div>
                  <div class="metric-value revenue">${Math.round(stats.totalAmount).toLocaleString()}원</div>
                </div>
                
                <div class="worker-clients">
                  <div class="clients-label">거래처별 내역:</div>
                  ${Object.entries(stats.clientDetails).map(([client, detail]) => `
                    <div class="client-item">
                      <span class="client-name">${client}</span>
                      <span class="client-stats">${detail.count}건 / ${Math.round(detail.amount).toLocaleString()}원</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `).join('') :
          '<div class="no-worker-data">선택한 기간에 완료된 작업이 없습니다.</div>'
        }
      </div>
    </div>
    
    <style>
      .worker-analysis-container {
        padding: 25px;
      }
      
      .analysis-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid #e6e6e6;
      }
      
      .analysis-header h3 {
        margin: 0;
        color: #333;
        font-size: 1.4rem;
      }
      
      .worker-date-filter {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      
      .worker-date-filter label {
        font-weight: 600;
        color: #333;
      }
      
      .worker-date-filter input {
        padding: 8px 12px;
        border: 2px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
      }
      
      .worker-date-filter span {
        font-weight: 600;
        color: #666;
      }
      
      .period-info {
        margin-bottom: 20px;
        padding: 15px;
        background: #e3f2fd;
        border-radius: 8px;
        border-left: 4px solid #219ebc;
      }
      
      .period-info h4 {
        margin: 0;
        color: #1565c0;
        font-size: 1.1rem;
      }
      
      .worker-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 20px;
      }
      
      .worker-card {
        background: white;
        border: 1px solid #e6e6e6;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        transition: all 0.2s ease;
      }
      
      .worker-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(0,0,0,0.12);
      }
      
      .worker-header {
        display: flex;
        align-items: center;
        gap: 15px;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid #f1f3f4;
      }
      
      .worker-icon {
        font-size: 2.5rem;
        background: linear-gradient(135deg, #8ecae6, #219ebc);
        padding: 10px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .worker-name {
        font-size: 1.2rem;
        font-weight: 700;
        color: #333;
      }
      
      .worker-subtitle {
        font-size: 14px;
        color: #666;
      }
      
      .worker-metrics {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }
      
      .metric-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px dotted #ddd;
      }
      
      .metric-label {
        font-size: 16px;
        color: #666;
        font-weight: 600;
      }
      
      .metric-value {
        font-size: 18px;
        font-weight: 700;
        color: #333;
      }
      
      .metric-value.revenue {
        color: #219ebc;
      }
      
      .worker-clients {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
        border-left: 3px solid #8ecae6;
      }
      
      .clients-label {
        font-size: 14px;
        font-weight: 600;
        color: #333;
        margin-bottom: 10px;
      }
      
      .client-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px dotted #ddd;
      }
      
      .client-item:last-child {
        border-bottom: none;
      }
      
      .client-name {
        font-weight: 600;
        color: #333;
        background: #fff3cd;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 13px;
      }
      
      .client-stats {
        font-size: 13px;
        color: #666;
        font-weight: 500;
      }
      
      .no-worker-data {
        text-align: center;
        padding: 60px 20px;
        color: #666;
        font-style: italic;
        grid-column: 1 / -1;
      }
      
      @media (max-width: 768px) {
        .worker-analysis-container {
          padding: 15px;
        }
        
        .analysis-header {
          flex-direction: column;
          gap: 15px;
          align-items: stretch;
        }
        
        .worker-date-filter {
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .worker-date-filter input {
          min-width: 120px;
        }
        
        .worker-stats-grid {
          grid-template-columns: 1fr;
          gap: 15px;
        }
        
        .worker-card {
          padding: 15px;
        }
        
        .worker-header {
          flex-direction: column;
          text-align: center;
          gap: 10px;
        }
      }
    </style>
  `;
}

// 3. 수수료분석 로드
async function loadFeeAnalysis() {
  console.log('수수료분석 로드');
  
  // 오늘 날짜
  const todayStr = getTodayString();
  
  // 오늘 작업만 필터링
  const todayFeeTasks = allCompletedTasks.filter(task => {
    if (!task.date) return false;
    return task.date.startsWith(todayStr);
  });
  
  const contentDiv = document.getElementById('settlement-content');
  contentDiv.innerHTML = getFeeAnalysisHTML(todayFeeTasks, todayStr, todayStr);
}

// 수수료분석 HTML
function getFeeAnalysisHTML(tasks, startDate, endDate = null) {
  const feeStats = calculateFeeStatsNew(tasks);
  const displayDate = endDate && endDate !== startDate ? `${startDate} ~ ${endDate}` : startDate;
  
  return `
    <div class="fee-analysis-container">
      <div class="analysis-header">
        <h3>💳 수수료 분석</h3>
        <div class="fee-date-filter">
          <label>📅 기간:</label>
          <input type="date" id="fee-start-date" value="${startDate}">
          <span>~</span>
          <input type="date" id="fee-end-date" value="${endDate || startDate}">
          <button onclick="filterFeeByDateRange()" class="filter-btn">검색</button>
          <button onclick="resetFeeFilter()" class="reset-btn">오늘</button>
        </div>
      </div>
      
      <div class="period-info">
        <h4>📅 선택 기간: ${displayDate} (총 ${tasks.length}건)</h4>
      </div>
      
      <!-- 수수료 요약 -->
      <div class="fee-summary">
        <div class="summary-card gonggan">
          <div class="summary-icon">🏢</div>
          <div class="summary-info">
            <div class="summary-label">공간/공간티비</div>
            <div class="summary-value">${feeStats.gongganTotal.toLocaleString()}원</div>
            <div class="summary-subtitle">${feeStats.gongganTasks.length}건</div>
          </div>
        </div>
        
        <div class="summary-card others">
          <div class="summary-icon">🏬</div>
          <div class="summary-info">
            <div class="summary-label">기타 업체</div>
            <div class="summary-value">${feeStats.othersTotal.toLocaleString()}원</div>
            <div class="summary-subtitle">${feeStats.othersTasks.length}건</div>
          </div>
        </div>
        
        <div class="summary-card total">
          <div class="summary-icon">💰</div>
          <div class="summary-info">
            <div class="summary-label">총 수수료</div>
            <div class="summary-value">${(feeStats.gongganTotal + feeStats.othersTotal).toLocaleString()}원</div>
            <div class="summary-subtitle">${feeStats.gongganTasks.length + feeStats.othersTasks.length}건</div>
          </div>
        </div>
      </div>
      
      <!-- 공간/공간티비 상세 -->
      <div class="fee-details-section">
        <div class="details-card">
          <h4>🏢 공간/공간티비 수수료 내역</h4>
          <div class="fee-list">
            ${feeStats.gongganTasks.length > 0 ? 
              feeStats.gongganTasks.map(task => `
                <div class="fee-item gonggan-item">
                  <div class="fee-item-header">
                    <span class="fee-date">${formatDate(task.date)}</span>
                    <span class="fee-client">${task.client}</span>
                    <span class="fee-amount">${task.amount.toLocaleString()}원</span>
                  </div>
                  <div class="fee-item-details">
                    <span class="fee-worker">${task.worker}</span>
                    <span class="fee-content">${task.items || task.taskType || ''}</span>
                    <span class="fee-value">${Math.round(task.amount * 0.22).toLocaleString()}원 (22%)</span>
                  </div>
                </div>
              `).join('') :
              '<div class="no-data">공간/공간티비 수수료 내역이 없습니다.</div>'
            }
          </div>
          ${feeStats.gongganTasks.length > 0 ? 
            `<div class="fee-total">총 수수료: <strong>${feeStats.gongganTotal.toLocaleString()}원</strong></div>` : ''
          }
        </div>
        
        <div class="details-card">
          <h4>🏬 기타 업체 수수료 내역</h4>
          <div class="fee-list">
            ${feeStats.othersTasks.length > 0 ?
              feeStats.othersTasks.map(task => `
                <div class="fee-item others-item">
                  <div class="fee-item-header">
                    <span class="fee-date">${formatDate(task.date)}</span>
                    <span class="fee-client">${task.client}</span>
                    <span class="fee-amount">${task.amount.toLocaleString()}원</span>
                  </div>
                  <div class="fee-item-details">
                    <span class="fee-worker">${task.worker}</span>
                    <span class="fee-content">${task.items || task.taskType || ''}</span>
                    <span class="fee-value">${(task.fee || 0).toLocaleString()}원</span>
                  </div>
                </div>
              `).join('') :
              '<div class="no-data">기타 업체 수수료 내역이 없습니다.</div>'
            }
          </div>
          ${feeStats.othersTasks.length > 0 ? 
            `<div class="fee-total">총 수수료: <strong>${feeStats.othersTotal.toLocaleString()}원</strong></div>` : ''
          }
        </div>
      </div>
    </div>
    
    <style>
      .fee-analysis-container {
        padding: 25px;
      }
      
      .analysis-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid #e6e6e6;
      }
      
      .analysis-header h3 {
        margin: 0;
        color: #333;
        font-size: 1.4rem;
      }
      
      .fee-date-filter {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      
      .fee-date-filter label {
        font-weight: 600;
        color: #333;
      }
      
      .fee-date-filter input {
        padding: 8px 12px;
        border: 2px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
      }
      
      .fee-date-filter span {
        font-weight: 600;
        color: #666;
      }
      
      .fee-summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
      }
      
      .summary-card {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
      .summary-card.gonggan {
        background: linear-gradient(135deg, #e3f2fd, #bbdefb);
        border-left: 4px solid #2196f3;
      }
      
      .summary-card.others {
        background: linear-gradient(135deg, #fff3e0, #ffe0b2);
        border-left: 4px solid #ff9800;
      }
      
      .summary-card.total {
        background: linear-gradient(135deg, #e8f5e8, #c8e6c9);
        border-left: 4px solid #4caf50;
      }
      
      .summary-icon {
        font-size: 2rem;
      }
      
      .summary-label {
        font-size: 14px;
        color: #666;
        margin-bottom: 5px;
      }
      
      .summary-value {
        font-size: 1.3rem;
        font-weight: 700;
        color: #333;
      }
      
      .summary-subtitle {
        font-size: 12px;
        color: #888;
      }
      
      .fee-details-section {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 20px;
      }
      
      .details-card {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 12px;
        border-left: 4px solid #8ecae6;
      }
      
      .details-card h4 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 1.1rem;
      }
      
      .fee-list {
        max-height: 400px;
        overflow-y: auto;
        margin-bottom: 15px;
      }
      
      .fee-item {
        background: white;
        border: 1px solid #e6e6e6;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 10px;
        transition: all 0.2s ease;
      }
      
      .fee-item:hover {
        border-color: #8ecae6;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      }
      
      .fee-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      
      .fee-date {
        font-weight: 600;
        color: #219ebc;
        font-size: 14px;
      }
      
      .fee-client {
        background: #fff3cd;
        color: #856404;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
      }
      
      .fee-amount {
        font-weight: 700;
        color: #333;
        font-size: 14px;
      }
      
      .fee-item-details {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
      }
      
      .fee-worker {
        background: #e3f2fd;
        color: #1565c0;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
      }
      
      .fee-content {
        color: #666;
        flex: 1;
        margin: 0 10px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .fee-value {
        font-weight: 700;
        color: #dc3545;
        font-size: 14px;
      }
      
      .fee-total {
        text-align: right;
        padding: 10px 0;
        border-top: 2px solid #8ecae6;
        font-size: 16px;
        color: #333;
      }
      
      .fee-total strong {
        color: #219ebc;
        font-size: 18px;
      }
      
      .no-data {
        text-align: center;
        padding: 40px;
        color: #666;
        font-style: italic;
      }
      
      @media (max-width: 768px) {
        .fee-analysis-container {
          padding: 15px;
        }
        
        .analysis-header {
          flex-direction: column;
          gap: 15px;
          align-items: stretch;
        }
        
        .fee-date-filter {
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .fee-date-filter input {
          min-width: 120px;
        }
        
        .fee-summary {
          grid-template-columns: 1fr;
          gap: 15px;
        }
        
        .summary-card {
          flex-direction: column;
          text-align: center;
          gap: 10px;
        }
        
        .fee-details-section {
          grid-template-columns: 1fr;
          gap: 15px;
        }
        
        .fee-item-header,
        .fee-item-details {
          flex-direction: column;
          align-items: flex-start;
          gap: 5px;
        }
        
        .fee-content {
          margin: 5px 0;
        }
      }
    </style>
  `;
}

// 날짜 범위 필터링 함수들
window.filterDailyByDateRange = async function() {
  const startDateInput = document.getElementById('daily-start-date');
  const endDateInput = document.getElementById('daily-end-date');
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  
  if (!startDate) {
    alert('시작 날짜를 선택해주세요.');
    return;
  }
  
  if (!endDate) {
    alert('종료 날짜를 선택해주세요.');
    return;
  }
  
  console.log('일별정산 날짜 범위 필터링:', startDate, '~', endDate);
  
  // 선택한 날짜 범위의 작업 필터링
  const filteredTasks = allCompletedTasks.filter(task => {
    if (!task.date) return false;
    const taskDate = task.date.split('T')[0];
    return taskDate >= startDate && taskDate <= endDate;
  });
  
  // HTML 업데이트
  const contentDiv = document.getElementById('settlement-content');
  contentDiv.innerHTML = getDailySettlementHTML(filteredTasks, startDate, endDate);
};

window.filterWorkerByDateRange = async function() {
  const startDateInput = document.getElementById('worker-start-date');
  const endDateInput = document.getElementById('worker-end-date');
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  
  if (!startDate || !endDate) {
    alert('시작 날짜와 종료 날짜를 모두 선택해주세요.');
    return;
  }
  
  console.log('직원별분석 날짜 범위 필터링:', startDate, '~', endDate);
  
  const filteredTasks = allCompletedTasks.filter(task => {
    if (!task.date) return false;
    const taskDate = task.date.split('T')[0];
    return taskDate >= startDate && taskDate <= endDate;
  });
  
  const contentDiv = document.getElementById('settlement-content');
  contentDiv.innerHTML = getWorkerAnalysisHTML(filteredTasks, startDate, endDate);
};

window.filterFeeByDateRange = async function() {
  const startDateInput = document.getElementById('fee-start-date');
  const endDateInput = document.getElementById('fee-end-date');
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  
  if (!startDate || !endDate) {
    alert('시작 날짜와 종료 날짜를 모두 선택해주세요.');
    return;
  }
  
  console.log('수수료분석 날짜 범위 필터링:', startDate, '~', endDate);
  
  const filteredTasks = allCompletedTasks.filter(task => {
    if (!task.date) return false;
    const taskDate = task.date.split('T')[0];
    return taskDate >= startDate && taskDate <= endDate;
  });
  
  const contentDiv = document.getElementById('settlement-content');
  contentDiv.innerHTML = getFeeAnalysisHTML(filteredTasks, startDate, endDate);
};

// 필터 리셋 함수들
window.resetDailyFilter = async function() {
  const todayStr = getTodayString();
  document.getElementById('daily-start-date').value = todayStr;
  document.getElementById('daily-end-date').value = todayStr;
  await loadDailySettlement();
};

window.resetWorkerFilter = async function() {
  const todayStr = getTodayString();
  document.getElementById('worker-start-date').value = todayStr;
  document.getElementById('worker-end-date').value = todayStr;
  await loadWorkerAnalysis();
};

window.resetFeeFilter = async function() {
  const todayStr = getTodayString();
  document.getElementById('fee-start-date').value = todayStr;
  document.getElementById('fee-end-date').value = todayStr;
  await loadFeeAnalysis();
};

// 일별 통계 계산 (수정된 수수료 계산 포함)
function calculateDayStats(tasks) {
  let dayStats = {
    total: 0, 
    spend: 0, 
    partSpend: 0, 
    fee: 0, 
    profit: 0,
    company: 0, 
    sungwook: 0, 
    sungho: 0, 
    heejong: 0,
    taskCount: tasks.length
  };
  
  // 부품 단가 맵 생성
  const priceMap = {};
  if (PARTS_LIST && Array.isArray(PARTS_LIST)) {
    PARTS_LIST.forEach(item => {
      if (item.name && item.price !== undefined) {
        priceMap[item.name] = item.price;
      }
    });
  }
  
  tasks.forEach(task => {
    // 총매출
    const amount = Number(task.amount) || 0;
    dayStats.total += amount;

    // 부품지출 계산
    let partSpend = 0;
    if (task.parts) {
      const parts = task.parts.split(',');
      parts.forEach(part => {
        const trimmedPart = part.trim();
        if (trimmedPart) {
          const [name, count] = trimmedPart.split(':');
          const partName = name ? name.trim() : '';
          const partCount = Number(count) || 1;
          const partPrice = priceMap[partName] || 0;
          
          partSpend += partPrice * partCount;
        }
      });
    }
    dayStats.partSpend += partSpend;

    // 수수료 계산 (수정됨)
    let fee = 0;
    if (task.client && task.client.includes("공간")) {
      // 공간/공간티비인 경우 금액의 22%
      fee = Math.round(amount * 0.22);
    } else if (task.fee && task.fee > 0) {
      // 다른 업체인 경우 입력된 수수료 사용
      fee = Number(task.fee);
    }
    dayStats.fee += fee;
  });

  // 최종 계산
  dayStats.spend = dayStats.partSpend + dayStats.fee;
  dayStats.profit = dayStats.total - dayStats.spend;
  dayStats.company = Math.round(dayStats.profit * 0.2);
  const remain = dayStats.profit - dayStats.company;
  dayStats.sungwook = Math.round(remain * 0.4);
  dayStats.sungho = Math.round(remain * 0.3);
  dayStats.heejong = Math.round(remain * 0.3);
  
  return dayStats;
}

// 월별 정산 계산
function calculateMonthStats() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // 이번 달 첫날과 마지막날
  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
  
  const monthTasks = allCompletedTasks.filter(task => {
    if (!task.date) return false;
    const taskDate = new Date(task.date);
    return taskDate >= startOfMonth && taskDate <= endOfMonth;
  });
  
  return calculateDayStats(monthTasks);
}

// 직원별 통계 계산 (수정됨 - 팀장 기준, 거래처별 분류)
function calculateWorkerStatsNew(tasks) {
  const workerStats = {};
  
  tasks.forEach(task => {
    if (!task.worker) return;
    
    // 작업자가 여러명인 경우 첫 번째 작업자를 팀장으로 간주
    const workers = task.worker.split(',').map(w => w.trim());
    const teamLeader = workers[0]; // 첫 번째 작업자 = 팀장
    
    if (!workerStats[teamLeader]) {
      workerStats[teamLeader] = {
        taskCount: 0,
        totalAmount: 0,
        clientDetails: {}
      };
    }
    
    const amount = Number(task.amount) || 0;
    const client = task.client || '미분류';
    
    // 팀장 기준으로 집계
    workerStats[teamLeader].taskCount += 1;
    workerStats[teamLeader].totalAmount += amount;
    
    // 거래처별 분류
    if (!workerStats[teamLeader].clientDetails[client]) {
      workerStats[teamLeader].clientDetails[client] = {
        count: 0,
        amount: 0
      };
    }
    
    workerStats[teamLeader].clientDetails[client].count += 1;
    workerStats[teamLeader].clientDetails[client].amount += amount;
  });
  
  return workerStats;
}

// 수수료 통계 계산 (새로운 버전)
function calculateFeeStatsNew(tasks) {
  const gongganTasks = [];
  const othersTasks = [];
  let gongganTotal = 0;
  let othersTotal = 0;
  
  tasks.forEach(task => {
    const amount = Number(task.amount) || 0;
    
    if (task.client && task.client.includes("공간")) {
      // 공간/공간티비
      const fee = Math.round(amount * 0.22);
      gongganTasks.push({
        ...task,
        calculatedFee: fee
      });
      gongganTotal += fee;
    } else if (task.fee && task.fee > 0) {
      // 기타 업체 (수수료가 입력된 경우만)
      const fee = Number(task.fee);
      othersTasks.push({
        ...task,
        calculatedFee: fee
      });
      othersTotal += fee;
    }
  });
  
  return {
    gongganTasks,
    othersTasks,
    gongganTotal,
    othersTotal
  };
}

// 날짜 포맷팅 함수
function formatDate(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch (error) {
    return '';
  }
}

// 전역 함수 등록
window.loadSettlement = loadSettlement;
window.showSettleSubTab = showSettleSubTab;
window.filterDailyByDateRange = filterDailyByDateRange;
window.resetDailyFilter = resetDailyFilter;
window.filterWorkerByDateRange = filterWorkerByDateRange;
window.resetWorkerFilter = resetWorkerFilter;
window.filterFeeByDateRange = filterFeeByDateRange;
window.resetFeeFilter = resetFeeFilter;