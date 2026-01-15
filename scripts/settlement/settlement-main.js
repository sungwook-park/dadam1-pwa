// scripts/settlement/settlement-main.js
// 정산 메인 컨트롤러 - 모든 모듈 통합

import { loadAllSettlementData } from './settlement-data.js';
import { 
  calculateNewDaySettlement, 
  calculateWorkerAnalysis, 
  calculateFeeAnalysis 
} from './settlement-calculator.js';
import { 
  getTodayString, 
  filterByDateRange, 
  createPriceMap,
  getCurrentMonthRange
} from './settlement-utils.js';
import { 
  getSettlementMainHTML,
  getDailySettlementHTML,
  getWorkerAnalysisHTML,
  getFeeAnalysisHTML
} from './settlement-ui.js';

// 전역 데이터 저장소
let globalData = {
  tasks: [],
  users: [],
  outboundParts: [],
  companyFunds: [],
  priceMap: {},
  loadedAt: null
};

// 현재 활성 서브탭
let currentSettleSubTab = 'daily';

/**
 * 정산 시스템 초기화 (진입점)
 */
export async function loadSettlement() {
  try {
    console.log('🚀 새로운 정산 시스템 시작...');
    
    // 오늘 날짜로 데이터 로드
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;
    
    console.log(`📅 기본 조회 날짜: ${todayDate} (오늘)`);
    
    // 모든 데이터 로드 (오늘만!)
    const data = await loadAllSettlementData(todayDate, todayDate);
    globalData.tasks = data.tasks;
    globalData.users = data.users;
    globalData.outboundParts = data.outboundParts;
    globalData.companyFunds = data.companyFunds;
    globalData.loadedAt = data.loadedAt;
    
    // 부품 단가 맵 생성
    globalData.priceMap = createPriceMap();
    
    console.log('📊 데이터 로드 완료:');
    console.log(`  - 작업: ${globalData.tasks.length}개`);
    console.log(`  - 직원: ${globalData.users.length}명`);
    console.log(`  - 출고: ${globalData.outboundParts.length}개`);
    console.log(`  - 부품 단가: ${Object.keys(globalData.priceMap).length}개`);
    
    // 🔍 출고 데이터 샘플 확인
    if (globalData.outboundParts.length > 0) {
      console.log('📦 출고 데이터 샘플:', globalData.outboundParts[0]);
    }
    
    // 🔍 부품 단가 샘플 확인
    if (Object.keys(globalData.priceMap).length > 0) {
      const samplePartName = Object.keys(globalData.priceMap)[0];
      console.log(`💰 부품 단가 샘플: ${samplePartName} = ${globalData.priceMap[samplePartName]}원`);
    }
    
    // 정산 메인 HTML 표시
    document.getElementById('settle-result').innerHTML = getSettlementMainHTML();
    
    // 기본으로 일별정산 탭 로드 (오늘만)
    await showSettleSubTab('daily');
    
  } catch (error) {
    console.error('❌ 정산 오류:', error);
    document.getElementById('settle-result').innerHTML = `
      <div style="background: #f8d7da; color: #721c24; padding: 20px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
        <h3 style="margin: 0 0 15px 0; font-size: 18px;">❌ 정산 오류</h3>
        <p style="margin: 0 0 10px 0; font-size: 14px;">오류: ${error.message}</p>
        <p style="margin: 0; opacity: 0.8;">브라우저 콘솔(F12)에서 자세한 내용을 확인해주세요.</p>
      </div>
    `;
  }
}

/**
 * 서브탭 전환
 */
export async function showSettleSubTab(tabType) {
  console.log('📑 정산 서브탭 전환:', tabType);
  
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
    console.error('❌ 서브탭 로드 오류:', error);
    contentDiv.innerHTML = '<div class="loading-message">데이터 로드 중 오류가 발생했습니다.</div>';
  }
}

/**
 * 일별정산 로드
 */
async function loadDailySettlement() {
  console.log('📊 일별정산 로드');
  
  const todayStr = getTodayString();
  
  // 오늘 작업만 필터링
  const todayTasks = globalData.tasks.filter(task => {
    if (!task.date) return false;
    return task.date.startsWith(todayStr);
  });
  
  // 새로운 정산 계산
  const result = calculateNewDaySettlement(
    todayTasks,
    globalData.users,
    globalData.outboundParts,
    globalData.priceMap
  );
  
  // 🔥 디버깅을 위해 전역 변수에 저장
  window.settlementResult = result;
  window.todayTasks = todayTasks;
  window.globalData = globalData;
  
  console.log('📊 정산 결과:', result);
  console.log('  → 임원 매출:', result.executiveRevenue.toLocaleString());
  console.log('  → 도급기사 매출:', result.contractRevenue.toLocaleString());
  
  const contentDiv = document.getElementById('settlement-content');
  contentDiv.innerHTML = getDailySettlementHTML(
    result, 
    todayTasks, 
    todayStr, 
    todayStr
  );
}

/**
 * 직원별 분석 로드
 */
async function loadWorkerAnalysis() {
  console.log('👷 직원별 분석 로드');
  
  const todayStr = getTodayString();
  
  // 오늘 작업만 필터링
  const todayTasks = globalData.tasks.filter(task => {
    if (!task.date) return false;
    return task.date.startsWith(todayStr);
  });
  
  const workerStats = calculateWorkerAnalysis(
    todayTasks, 
    globalData.users,
    globalData.outboundParts,
    globalData.priceMap
  );
  
  const contentDiv = document.getElementById('settlement-content');
  contentDiv.innerHTML = getWorkerAnalysisHTML(workerStats, todayStr, todayStr);
}

/**
 * 수수료 분석 로드
 */
async function loadFeeAnalysis() {
  console.log('💳 수수료 분석 로드');
  
  const todayStr = getTodayString();
  
  // 오늘 작업만 필터링
  const todayTasks = globalData.tasks.filter(task => {
    if (!task.date) return false;
    return task.date.startsWith(todayStr);
  });
  
  const feeStats = calculateFeeAnalysis(todayTasks);
  
  const contentDiv = document.getElementById('settlement-content');
  contentDiv.innerHTML = getFeeAnalysisHTML(feeStats, todayStr, todayStr);
}

/**
 * 일별정산 날짜 필터링
 */
export async function filterDailyByDateRange() {
  const startDate = document.getElementById('daily-start-date').value;
  const endDate = document.getElementById('daily-end-date').value;
  
  if (!startDate || !endDate) {
    alert('시작일과 종료일을 모두 선택해주세요.');
    return;
  }
  
  const contentDiv = document.getElementById('settlement-content');
  contentDiv.innerHTML = '<div class="loading-message">데이터를 불러오는 중...</div>';
  
  try {
    // 🔥 Firebase에서 해당 날짜 범위 데이터 새로 로드!
    console.log(`📅 날짜 필터: ${startDate} ~ ${endDate}`);
    const data = await loadAllSettlementData(startDate, endDate);
    
    // globalData 업데이트
    globalData.tasks = data.tasks;
    globalData.outboundParts = data.outboundParts;
    globalData.companyFunds = data.companyFunds;
    globalData.loadedAt = data.loadedAt;
    
    console.log(`✅ 새로운 데이터 로드 완료: 작업 ${data.tasks.length}개`);
    
    // 필터링된 작업으로 정산 계산
    const filteredTasks = filterByDateRange(globalData.tasks, startDate, endDate);
    
    const result = calculateNewDaySettlement(
      filteredTasks,
      globalData.users,
      globalData.outboundParts,
      globalData.priceMap
    );
    
    // 🔥 디버깅을 위해 전역 변수에 저장
    window.settlementResult = result;
    window.todayTasks = filteredTasks;
    
    console.log('📊 정산 결과 (날짜 범위):', result);
    console.log('  → 임원 매출:', result.executiveRevenue.toLocaleString());
    console.log('  → 도급기사 매출:', result.contractRevenue.toLocaleString());
    
    // 🔥 이번 달 누적 정산 계산
    const monthRange = getCurrentMonthRange();
    const monthTasks = filterByDateRange(globalData.tasks, monthRange.startStr, monthRange.endStr);
    const monthResult = calculateNewDaySettlement(
      monthTasks,
      globalData.users,
      globalData.outboundParts,
      globalData.priceMap
    );
    
    contentDiv.innerHTML = getDailySettlementHTML(
      result, 
      filteredTasks, 
      startDate, 
      endDate,
      monthResult.finalDistribution,
      monthRange
    );
  } catch (error) {
    console.error('❌ 날짜 필터링 오류:', error);
    contentDiv.innerHTML = '<div class="loading-message">데이터 로드 중 오류가 발생했습니다.</div>';
  }
}

/**
 * 직원별 분석 날짜 필터링
 */
export async function filterWorkerByDateRange() {
  const startDate = document.getElementById('worker-start-date').value;
  const endDate = document.getElementById('worker-end-date').value;
  
  if (!startDate || !endDate) {
    alert('시작일과 종료일을 모두 선택해주세요.');
    return;
  }
  
  const contentDiv = document.getElementById('settlement-content');
  contentDiv.innerHTML = '<div class="loading-message">데이터를 불러오는 중...</div>';
  
  try {
    // 🔥 Firebase에서 해당 날짜 범위 데이터 새로 로드!
    console.log(`📅 직원별 분석 날짜 필터: ${startDate} ~ ${endDate}`);
    const data = await loadAllSettlementData(startDate, endDate);
    
    // globalData 업데이트
    globalData.tasks = data.tasks;
    globalData.outboundParts = data.outboundParts;
    globalData.companyFunds = data.companyFunds;
    globalData.loadedAt = data.loadedAt;
    
    console.log(`✅ 새로운 데이터 로드 완료: 작업 ${data.tasks.length}개`);
    
    const filteredTasks = filterByDateRange(globalData.tasks, startDate, endDate);
    const workerStats = calculateWorkerAnalysis(
      filteredTasks, 
      globalData.users,
      globalData.outboundParts,
      globalData.priceMap
    );
    
    contentDiv.innerHTML = getWorkerAnalysisHTML(workerStats, startDate, endDate);
  } catch (error) {
    console.error('❌ 직원별 분석 필터링 오류:', error);
    contentDiv.innerHTML = '<div class="loading-message">데이터 로드 중 오류가 발생했습니다.</div>';
  }
}

/**
 * 수수료 분석 날짜 필터링
 */
export async function filterFeeByDateRange() {
  const startDate = document.getElementById('fee-start-date').value;
  const endDate = document.getElementById('fee-end-date').value;
  
  if (!startDate || !endDate) {
    alert('시작일과 종료일을 모두 선택해주세요.');
    return;
  }
  
  const contentDiv = document.getElementById('settlement-content');
  contentDiv.innerHTML = '<div class="loading-message">데이터를 불러오는 중...</div>';
  
  try {
    // 🔥 Firebase에서 해당 날짜 범위 데이터 새로 로드!
    console.log(`📅 수수료 분석 날짜 필터: ${startDate} ~ ${endDate}`);
    const data = await loadAllSettlementData(startDate, endDate);
    
    // globalData 업데이트
    globalData.tasks = data.tasks;
    globalData.outboundParts = data.outboundParts;
    globalData.companyFunds = data.companyFunds;
    globalData.loadedAt = data.loadedAt;
    
    console.log(`✅ 새로운 데이터 로드 완료: 작업 ${data.tasks.length}개`);
    
    const filteredTasks = filterByDateRange(globalData.tasks, startDate, endDate);
    const feeStats = calculateFeeAnalysis(filteredTasks);
    
    contentDiv.innerHTML = getFeeAnalysisHTML(feeStats, startDate, endDate);
  } catch (error) {
    console.error('❌ 수수료 분석 필터링 오류:', error);
    contentDiv.innerHTML = '<div class="loading-message">데이터 로드 중 오류가 발생했습니다.</div>';
  }
}

/**
 * 필터 리셋 함수들
 */
export async function resetDailyFilter() {
  const todayStr = getTodayString();
  document.getElementById('daily-start-date').value = todayStr;
  document.getElementById('daily-end-date').value = todayStr;
  await loadDailySettlement();
}

export async function resetWorkerFilter() {
  const todayStr = getTodayString();
  document.getElementById('worker-start-date').value = todayStr;
  document.getElementById('worker-end-date').value = todayStr;
  await loadWorkerAnalysis();
}

export async function resetFeeFilter() {
  const todayStr = getTodayString();
  document.getElementById('fee-start-date').value = todayStr;
  document.getElementById('fee-end-date').value = todayStr;
  await loadFeeAnalysis();
}

// 전역 함수로 등록
window.loadSettlement = loadSettlement;
window.showSettleSubTab = showSettleSubTab;
window.filterDailyByDateRange = filterDailyByDateRange;
window.filterWorkerAnalysisByDateRange = filterWorkerByDateRange;
window.filterFeeAnalysisByDateRange = filterFeeByDateRange;
window.filterWorkerByDateRange = filterWorkerByDateRange;
window.filterFeeByDateRange = filterFeeByDateRange;
window.resetDailyFilter = resetDailyFilter;
window.resetWorkerFilter = resetWorkerFilter;
window.resetFeeFilter = resetFeeFilter;
