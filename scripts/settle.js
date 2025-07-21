// scripts/settle.js (ES6 모듈) - 서브탭 추가 및 분석 기능
import { PARTS_LIST } from './parts-list.js';

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

// 1. 일별정산 로드 (오늘만, 날짜 필터링 가능)
async function loadDailySettlement() {
  console.log('일별정산 로드');
  
  // 오늘 날짜
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // 오늘 작업만 필터링
  todayTasks = allCompletedTasks.filter(task => {
    if (!task.date) return false;
    return task.date.startsWith(todayStr);
  });
  
  const contentDiv = document.getElementById('settlement-content');
  contentDiv.innerHTML = getDailySettlementHTML(todayTasks, todayStr);
}

// 일별정산 HTML
function getDailySettlementHTML(tasks, selectedDate) {
  const dayStats = calculateDayStats(tasks);
  
  return `
    <div class="daily-settlement-container">
      <div class="settlement-header">
        <h3>📊 일별정산</h3>
        <div class="date-filter-container">
          <label>📅 날짜:</label>
          <input type="date" id="daily-date-filter" value="${selectedDate}">
          <button onclick="filterDailyByDate()" class="filter-btn">검색</button>
          <button onclick="resetDailyFilter()" class="reset-btn">오늘</button>
        </div>
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
            <span>회사자금:</span>
            <span>${dayStats.company.toLocaleString()}원</span>
          </div>
          <div class="breakdown-item">
            <span>🤠성욱:</span>
            <span>${dayStats.sungwook.toLocaleString()}원</span>
          </div>
          <div class="breakdown-item">
            <span>💪성호:</span>
            <span>${dayStats.sungho.toLocaleString()}원</span>
          </div>
          <div class="breakdown-item">
            <span>🙉희종:</span>
            <span>${dayStats.heejong.toLocaleString()}원</span>
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
        margin-bottom: 25px;
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
        }
        
        .daily-stats {
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
        }
        
        .stat-card {
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
  
  const contentDiv = document.getElementById('settlement-content');
  contentDiv.innerHTML = getWorkerAnalysisHTML();
}

// 직원별분석 HTML
function getWorkerAnalysisHTML() {
  const workerStats = calculateWorkerStats();
  
  return `
    <div class="worker-analysis-container">
      <div class="analysis-header">
        <h3>👷 직원별 분석</h3>
        <p>각 직원별 작업량과 매출 기여도를 분석합니다.</p>
      </div>
      
      <div class="worker-stats-grid">
        ${Object.entries(workerStats).map(([worker, stats]) => `
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
                <div class="metric-label">총 매출</div>
                <div class="metric-value revenue">${stats.totalAmount.toLocaleString()}원</div>
              </div>
              
              <div class="metric-item">
                <div class="metric-label">평균 작업단가</div>
                <div class="metric-value">${Math.round(stats.totalAmount / (stats.taskCount || 1)).toLocaleString()}원</div>
              </div>
              
              <div class="metric-item">
                <div class="metric-label">매출 기여도</div>
                <div class="metric-value percentage">${stats.percentage.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    
    <style>
      .worker-analysis-container {
        padding: 25px;
      }
      
      .analysis-header {
        margin-bottom: 25px;
        padding-bottom: 15px;
        border-bottom: 2px solid #e6e6e6;
      }
      
      .analysis-header h3 {
        margin: 0 0 8px 0;
        color: #333;
        font-size: 1.4rem;
      }
      
      .analysis-header p {
        margin: 0;
        color: #666;
        font-size: 14px;
      }
      
      .worker-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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
        gap: 12px;
      }
      
      .metric-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
      }
      
      .metric-label {
        font-size: 14px;
        color: #666;
        font-weight: 500;
      }
      
      .metric-value {
        font-size: 16px;
        font-weight: 700;
        color: #333;
      }
      
      .metric-value.revenue {
        color: #219ebc;
      }
      
      .metric-value.percentage {
        color: #28a745;
      }
      
      @media (max-width: 768px) {
        .worker-analysis-container {
          padding: 15px;
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
  
  const contentDiv = document.getElementById('settlement-content');
  contentDiv.innerHTML = getFeeAnalysisHTML();
}

// 수수료분석 HTML
function getFeeAnalysisHTML() {
  const feeStats = calculateFeeStats();
  
  return `
    <div class="fee-analysis-container">
      <div class="analysis-header">
        <h3>💳 수수료 분석</h3>
        <p>공간/공간티비와 기타 업체별 수수료 내역을 분석합니다.</p>
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
        </div>
      </div>
    </div>
    
    <style>
      .fee-analysis-container {
        padding: 25px;
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

// 날짜별 필터링
window.filterDailyByDate = async function() {
  const dateInput = document.getElementById('daily-date-filter');
  const selectedDate = dateInput.value;
  
  if (!selectedDate) {
    alert('날짜를 선택해주세요.');
    return;
  }
  
  console.log('날짜별 필터링:', selectedDate);
  
  // 선택한 날짜의 작업 필터링
  const filteredTasks = allCompletedTasks.filter(task => {
    if (!task.date) return false;
    return task.date.startsWith(selectedDate);
  });
  
  // HTML 업데이트
  const contentDiv = document.getElementById('settlement-content');
  contentDiv.innerHTML = getDailySettlementHTML(filteredTasks, selectedDate);
};

// 오늘로 필터 리셋
window.resetDailyFilter = async function() {
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('daily-date-filter');
  if (dateInput) {
    dateInput.value = today;
  }
  
  // 오늘 데이터로 다시 로드
  await loadDailySettlement();
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

// 직원별 통계 계산
function calculateWorkerStats() {
  const workerStats = {};
  let totalAmount = 0;
  
  allCompletedTasks.forEach(task => {
    if (!task.worker) return;
    
    const workers = task.worker.split(',').map(w => w.trim());
    const amount = Number(task.amount) || 0;
    totalAmount += amount;
    
    workers.forEach(worker => {
      if (!workerStats[worker]) {
        workerStats[worker] = {
          taskCount: 0,
          totalAmount: 0
        };
      }
      
      workerStats[worker].taskCount += 1;
      // 여러 작업자가 있는 경우 균등 분할
      workerStats[worker].totalAmount += amount / workers.length;
    });
  });
  
  // 매출 기여도 계산
  Object.keys(workerStats).forEach(worker => {
    workerStats[worker].percentage = totalAmount > 0 ? 
      (workerStats[worker].totalAmount / totalAmount) * 100 : 0;
  });
  
  return workerStats;
}

// 수수료 통계 계산
function calculateFeeStats() {
  const gongganTasks = [];
  const othersTasks = [];
  let gongganTotal = 0;
  let othersTotal = 0;
  
  allCompletedTasks.forEach(task => {
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

// 날짜 포맷팅 함수 (수정됨 - 날짜 표시 오류 해결)
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

// 기존 전역 함수와의 호환성을 위해 window에 등록
window.loadSettlement = loadSettlement;
window.showSettleSubTab = showSettleSubTab;
window.filterDailyByDate = filterDailyByDate;
window.resetDailyFilter = resetDailyFilter;