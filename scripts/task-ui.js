// CSS 스타일 추가 (작업자 수정 폼용 + 관리자 통계용 + 팀 작업 스타일)
const workerEditStyles = `
<style>
.worker-edit-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  margin: 10px;
  overflow: hidden;
}

.mobile-edit-header {
  background: linear-gradient(135deg, #8ecae6, #219ebc);
  color: white;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mobile-edit-header h3 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.header-cancel-btn {
  background: rgba(255,255,255,0.2) !important;
  border: 2px solid rgba(255,255,255,0.3) !important;
  color: white !important;
  padding: 8px 12px !important;
  border-radius: 8px !important;
  font-size: 14px !important;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: auto !important;
  width: auto !important;
  margin: 0 !important;
  min-height: auto !important;
}

.header-cancel-btn:hover {
  background: rgba(255,255,255,0.3) !important;
  transform: none;
  box-shadow: none;
}

/* 관리자용 통계 스타일 */
.task-stats-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  margin-bottom: 25px;
  padding: 25px;
}

.stats-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 25px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.stat-item.total {
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
  border-left: 4px solid #2196f3;
}

.stat-item.pending {
  background: linear-gradient(135deg, #fff3e0, #ffe0b2);
  border-left: 4px solid #ff9800;
}

.stat-item.completed {
  background: linear-gradient(135deg, #e8f5e8, #c8e6c9);
  border-left: 4px solid #4caf50;
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

.worker-stats {
  border-top: 2px solid #e6e6e6;
  padding-top: 20px;
}

.worker-stats h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 1.1rem;
}

.worker-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
}

.worker-stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #219ebc;
}

.worker-name {
  font-weight: 600;
  color: #333;
}

.worker-count {
  font-weight: 700;
  color: #219ebc;
  background: #e3f2fd;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

/* 작업자별 섹션 스타일 */
.worker-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  margin-bottom: 20px;
  overflow: hidden;
}

.worker-header {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  padding: 15px 20px;
  border-bottom: 1px solid #e6e6e6;
}

.worker-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.worker-task-list {
  padding: 0;
}

.worker-task-list .task-item {
  margin: 0;
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-top: none;
}

.worker-task-list .task-item:last-child {
  border-bottom: none;
}

.no-tasks {
  text-align: center;
  padding: 60px 20px;
  color: #666;
  font-style: italic;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

/* 팀 작업 스타일 */
.team-badge {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 600;
  margin-left: 8px;
  display: inline-block;
}

.team-badge.leader {
  background: #ffd700;
  color: #b8860b;
}

.team-badge.member {
  background: #e3f2fd;
  color: #1976d2;
}

/* 팀장 작업 - 금색 테두리 */
.task-item.team-work.team-leader {
  border-left: 4px solid #ffd700 !important;
}

.task-item.team-work.team-leader:hover {
  border-left-color: #ffca28 !important;
}

.worker-task-list .task-item.team-work.team-leader {
  border-left: 4px solid #ffd700 !important;
  border-right: none;
  border-top: none;
}

/* 팀원 작업 - 파란색 테두리 */
.task-item.team-work.team-member {
  border-left: 4px solid #2196f3 !important;
}

.task-item.team-work.team-member:hover {
  border-left-color: #1976d2 !important;
}

.worker-task-list .task-item.team-work.team-member {
  border-left: 4px solid #2196f3 !important;
  border-right: none;
  border-top: none;
}

.team-participants {
  background: #fff3e0;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  color: #e65100;
  margin-top: 8px;
  border-left: 3px solid #ff9800;
}

@media (max-width: 480px) {
  .worker-edit-container {
    margin: 5px;
  }
  
  .mobile-edit-header {
    padding: 15px;
  }
  
  .mobile-edit-header h3 {
    font-size: 1.1rem;
  }
  
  .task-stats-container {
    padding: 15px;
  }
  
  .stats-summary {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .stat-item {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }
  
  .worker-stats-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .worker-section {
    margin-bottom: 15px;
  }
  
  .worker-header {
    padding: 12px 15px;
  }
  
  .worker-header h3 {
    font-size: 1rem;
  }
  
  .team-badge {
    font-size: 11px;
    padding: 1px 4px;
    margin-left: 4px;
  }
}
</style>
`;

// 스타일 추가
if (!document.getElementById('worker-edit-styles')) {
  const styleElement = document.createElement('div');
  styleElement.id = 'worker-edit-styles';
  styleElement.innerHTML = workerEditStyles;
  document.head.appendChild(styleElement);
}

// scripts/task-ui.js - 수정 폼 개선 및 모바일 최적화 (다중 작업자 지원 버전) + 검색어 입력 기능
import { db } from './firebase-config.js';
import {
  collection, query, where, getDocs, updateDoc, doc, deleteDoc, orderBy, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import "./task-save.js";
import { loadSettlement } from './settle.js';

// utils 임포트
import { formatKoreanDate, getTodayStart, getTomorrowStart, getNowYYYYMMDDHHMM } from './utils/date-utils.js';
import { toggleTaskDetail } from './utils/dom-utils.js';
import { renderItemsInput } from './components/task-item.js';
import { 
  getTaskSubTabsHTML, 
  getTaskInputFormHTML, 
  getTaskListHTML,
  getReserveTabHTML,
  getDoneTabHTML,
  getTaskItemHTML 
} from './templates/task-templates.js';

// 오늘 날짜 문자열 생성
function getTodayString() {
  const today = new Date();
  return today.getFullYear() + '-' + 
    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
    String(today.getDate()).padStart(2, '0');
}

// 내일 날짜 문자열 생성
function getTomorrowString() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.getFullYear() + '-' + 
    String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + 
    String(tomorrow.getDate()).padStart(2, '0');
}

// 현재 사용자가 관리자인지 확인
function isCurrentUserAdmin() {
  const userInfo = window.getCurrentUserInfo();
  return window.isAdmin && window.isAdmin(userInfo);
}

// 작업 필터링 함수 (작업자별)
function filterTasksForCurrentUser(tasks) {
  const userInfo = window.getCurrentUserInfo();
  
  // 관리자는 모든 작업 표시
  if (isCurrentUserAdmin()) {
    console.log('👑 관리자 - 모든 작업 표시:', tasks.length + '개');
    return tasks;
  }
  
  // 작업자는 본인 작업만 표시
  if (!userInfo || !userInfo.name) {
    console.warn('⚠️ 사용자 정보 없음 - 빈 배열 반환');
    return [];
  }
  
  const userName = userInfo.name;
  const filteredTasks = tasks.filter(task => {
    if (!task.worker) return false;
    
    // 작업자 필드에 현재 사용자 이름이 포함되어 있는지 확인
    const isAssigned = task.worker.includes(userName);
    
    if (isAssigned) {
      console.log(`✅ ${userName} 작업 발견:`, task.items || task.client);
    }
    
    return isAssigned;
  });
  
  console.log(`👷 작업자(${userName}) - 필터링된 작업:`, filteredTasks.length + '개');
  return filteredTasks;
}

// 작업자별로 작업 그룹화 (수정됨 - 모든 작업자에게 복제)
function groupTasksByWorker(tasks) {
  const grouped = {};
  
  tasks.forEach(task => {
    if (!task.worker || task.worker.trim() === '') {
      // ✅ 미지정 작업을 "미지정" 그룹으로 분류
      if (!grouped['미지정']) {
        grouped['미지정'] = [];
      }
      grouped['미지정'].push({
        ...task,
        isTeamLeader: true,
        isTeamWork: false,
        allWorkers: []
      });
      return;
    }
    
    // 🔥 모든 작업자에게 작업 할당 (수정된 부분)
    const workers = task.worker.split(',').map(w => w.trim());
    
    workers.forEach((worker, index) => {
      if (!worker) return;
      
      if (!grouped[worker]) {
        grouped[worker] = [];
      }
      
      // 각 작업자에게 작업 복사본 생성
      grouped[worker].push({
        ...task,
        isTeamLeader: index === 0,  // 첫 번째 작업자가 팀장
        isTeamWork: workers.length > 1,  // 2명 이상이면 팀 작업
        allWorkers: workers  // 전체 참여자 목록
      });
    });
  });
  
  return grouped;
}

// 통계 정보 생성 (수정됨 - 중복 제거)
function generateTaskStats(allTasks, completedTasks, isReserveTab = false) {
  // 🔥 중복 제거: 작업 ID 기준으로 유니크하게 만들기
  const uniqueAllTasks = Array.from(
    new Map(allTasks.map(task => [task.id, task])).values()
  );
  const uniqueCompletedTasks = Array.from(
    new Map(completedTasks.map(task => [task.id, task])).values()
  );
  
  if (isReserveTab) {
    // 예약 탭: 내일 해야할 작업수만
    return {
      totalReserveTasks: uniqueAllTasks.length
    };
  }
  
  // 오늘작업/완료작업 탭 공통
  const workerStats = {};
  const groupedAll = groupTasksByWorker(uniqueAllTasks);
  const groupedCompleted = groupTasksByWorker(uniqueCompletedTasks);
  
  // 모든 작업자 목록 수집
  const allWorkers = new Set([
    ...Object.keys(groupedAll),
    ...Object.keys(groupedCompleted)
  ]);
  
  allWorkers.forEach(worker => {
    // 🔥 중복 제거된 작업 수 계산
    const workerAllTasks = groupedAll[worker] || [];
    const workerCompletedTasks = groupedCompleted[worker] || [];
    
    const uniqueWorkerAllTasks = Array.from(
      new Map(workerAllTasks.map(task => [task.id, task])).values()
    );
    const uniqueWorkerCompletedTasks = Array.from(
      new Map(workerCompletedTasks.map(task => [task.id, task])).values()
    );
    
    workerStats[worker] = {
      total: uniqueWorkerAllTasks.length,
      completed: uniqueWorkerCompletedTasks.length,
      pending: uniqueWorkerAllTasks.length - uniqueWorkerCompletedTasks.length
    };
  });
  
  return {
    totalTasks: uniqueAllTasks.length,
    completedTasks: uniqueCompletedTasks.length,
    pendingTasks: uniqueAllTasks.length - uniqueCompletedTasks.length,
    workerStats: workerStats
  };
}

// 통계 HTML 생성
function getStatsHTML(stats, tabType) {
  if (tabType === 'reserve') {
    return `
      <div class="task-stats-container">
        <div class="stats-summary">
          <div class="stat-item total">
            <div class="stat-icon">📅</div>
            <div class="stat-info">
              <div class="stat-label">내일 해야할 작업</div>
              <div class="stat-value">${stats.totalReserveTasks}건</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  const workerStatsHTML = Object.entries(stats.workerStats).map(([worker, data]) => {
    const isCompletedTab = tabType === 'done';
    return `
      <div class="worker-stat-item">
        <span class="worker-name">${worker}</span>
        <span class="worker-count">${isCompletedTab ? data.completed : data.pending}건</span>
      </div>
    `;
  }).join('');
  
  if (tabType === 'done') {
    return `
      <div class="task-stats-container">
        <div class="stats-summary">
          <div class="stat-item total">
            <div class="stat-icon">📊</div>
            <div class="stat-info">
              <div class="stat-label">오늘 전체 작업</div>
              <div class="stat-value">${stats.totalTasks}건</div>
            </div>
          </div>
          <div class="stat-item completed">
            <div class="stat-icon">✅</div>
            <div class="stat-info">
              <div class="stat-label">완료된 작업</div>
              <div class="stat-value">${stats.completedTasks}건</div>
            </div>
          </div>
        </div>
        <div class="worker-stats">
          <h4>👷 작업자별 완료 현황 (협업 작업 중복 제거)</h4>
          <div class="worker-stats-grid">
            ${workerStatsHTML}
          </div>
        </div>
      </div>
    `;
  } else {
    return `
      <div class="task-stats-container">
        <div class="stats-summary">
          <div class="stat-item total">
            <div class="stat-icon">📊</div>
            <div class="stat-info">
              <div class="stat-label">오늘 전체 작업</div>
              <div class="stat-value">${stats.totalTasks}건</div>
            </div>
          </div>
          <div class="stat-item pending">
            <div class="stat-icon">⏳</div>
            <div class="stat-info">
              <div class="stat-label">해야할 작업</div>
              <div class="stat-value">${stats.pendingTasks}건</div>
            </div>
          </div>
        </div>
        <div class="worker-stats">
          <h4>👷 작업자별 현황 (협업 작업 중복 제거)</h4>
          <div class="worker-stats-grid">
            ${workerStatsHTML}
          </div>
        </div>
      </div>
    `;
  }
}

// 작업자별 작업 목록 HTML 생성 (수정됨 - 실제 작업 수 표시)
function getWorkerTaskListHTML(groupedTasks, tabType) {
  let html = '';
  
  Object.entries(groupedTasks).forEach(([worker, tasks]) => {
    // 🔥 실제 작업 수 계산 (중복 제거)
    const uniqueTasks = Array.from(
      new Map(tasks.map(task => [task.id, task])).values()
    );
    
    html += `
      <div class="worker-section">
        <div class="worker-header">
          <h3>👤 ${worker} (${uniqueTasks.length}건)</h3>
        </div>
        <div class="worker-task-list">
    `;
    
    // 🔥 모든 작업 표시 (중복 포함) - 팀장/팀원 구분 표시
    tasks.forEach(task => {
      html += getTaskItemHTML(task, task.id, tabType);
    });
    
    html += `
        </div>
      </div>
    `;
  });
  
  if (html === '') {
    html = '<div class="no-tasks">해당하는 작업이 없습니다.</div>';
  }
  
  return html;
}

// 수수료 자동 계산 함수
function calculateFee() {
  const clientInput = document.getElementById('client-input');
  const amountInput = document.getElementById('amount-input');
  const feeInput = document.getElementById('fee-input');
  const feeInfo = document.getElementById('fee-info');
  
  if (!clientInput || !amountInput || !feeInput) return;
  
  const clientName = clientInput.value.trim();
  const amount = parseFloat(amountInput.value) || 0;
  
  if ((clientName === '공간' || clientName === '공간티비') && amount > 0) {
    const calculatedFee = Math.round(amount * 0.22);
    feeInput.value = calculatedFee;
    feeInput.style.backgroundColor = '#e8f5e8';
    feeInput.style.borderColor = '#4caf50';
    feeInput.readOnly = true;
    
    if (feeInfo) {
      feeInfo.textContent = `${clientName}은 금액의 22%로 자동 계산됩니다.`;
      feeInfo.style.display = 'block';
    }
  } else {
    feeInput.style.backgroundColor = '';
    feeInput.style.borderColor = '';
    feeInput.readOnly = false;
    
    if (feeInfo) {
      feeInfo.style.display = 'none';
    }
  }
}

// 작업자 관리 함수들
function updateSelectedWorkers() {
  const checkboxes = document.querySelectorAll('input[name="worker"][type="checkbox"]:checked');
  const selectedWorkers = Array.from(checkboxes).map(cb => cb.value);
  const hiddenInput = document.getElementById('selected-workers');
  
  if (hiddenInput) {
    hiddenInput.value = selectedWorkers.join(', ');
  }
}

window.addCustomWorker = function() {
  const customInput = document.getElementById('custom-worker');
  if (!customInput || !customInput.value.trim()) {
    alert('작업자명을 입력해주세요.');
    return;
  }
  
  const workerName = customInput.value.trim();
  const container = customInput.parentNode.parentNode;
  
  // 새 체크박스 생성
  const newLabel = document.createElement('label');
  newLabel.style.cssText = 'display: flex; align-items: center; margin: 0; font-size: 16px;';
  
  const newCheckbox = document.createElement('input');
  newCheckbox.type = 'checkbox';
  newCheckbox.name = 'worker';
  newCheckbox.value = workerName;
  newCheckbox.checked = true;
  newCheckbox.style.cssText = 'width: auto; margin: 0 8px 0 0; padding: 0; min-width: 20px; min-height: 20px;';
  newCheckbox.addEventListener('change', updateSelectedWorkers);
  
  newLabel.appendChild(newCheckbox);
  newLabel.appendChild(document.createTextNode(workerName));
  
  // 기존 작업자들과 함께 배치
  const firstLine = container.querySelector('div:first-child');
  if (firstLine) {
    firstLine.appendChild(newLabel);
  }
  
  // 입력 초기화
  customInput.value = '';
  
  // 선택된 작업자 목록 업데이트
  updateSelectedWorkers();
};

// 메인 탭 관리 (관리자만)
window.openTab = function(name) {
  // 관리자가 아니면 탭 이동 불가
  if (!isCurrentUserAdmin()) {
    console.log('❌ 작업자는 탭 이동 불가');
    return;
  }
  
  document.getElementById('home-buttons').style.display = 'none';
  document.getElementById('tab-content').style.display = 'block';
  
  // 탭 제목을 박스 스타일로 설정
  const tabTitleElement = document.getElementById('tab-title');
  let titleText = '';
  let titleIcon = '';
  
  if (name === 'task') {
    titleText = '작업지시';
    titleIcon = '📋';
  } else if (name === 'reserve') {
    titleText = '예약';
    titleIcon = '📅';
  } else if (name === 'settle') {
    titleText = '정산';
    titleIcon = '💰';
  } else if (name === 'spend') {
    titleText = '지출';
    titleIcon = '💸';
  } else if (name === 'inventory') {
    titleText = '입출고';
    titleIcon = '📦';
  } else if (name === 'holiday') {
    titleText = '휴무관리';
    titleIcon = '🏖️';
  }
  
  // 박스 스타일로 제목 설정
  tabTitleElement.innerHTML = `
    <div style="
      background: white;
      padding: 20px 25px;
      border-radius: 12px;
      margin-bottom: 25px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      text-align: center;
      border-left: 4px solid #8ecae6;
    ">
      <h3 style="
        margin: 0;
        font-size: 1.4rem;
        color: #333;
        font-weight: 600;
      ">${titleIcon} ${titleText}</h3>
    </div>
  `;
  
  if (name === 'task') showTaskTab('check');
  else if (name === 'reserve') loadReserveTasks();
  else if (name === 'settle') {
    document.getElementById('tab-body').innerHTML = '<div id="settle-result"></div>';
    loadSettlement();
  } else if (name === 'inventory') {
    // 입출고 관리 로드
    if (window.loadInventoryManagement) {
      window.loadInventoryManagement();
    } else {
      console.error('❌ 입출고 관리 모듈을 찾을 수 없습니다.');
      document.getElementById('tab-body').innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">입출고 관리 모듈을 로드할 수 없습니다.</div>';
    }
  }
};

// 홈으로 돌아가기 (관리자만)
window.backToHome = function() {
  if (!isCurrentUserAdmin()) {
    console.log('❌ 작업자는 홈 이동 불가');
    return;
  }
  
  document.getElementById('tab-content').style.display = 'none';
  document.getElementById('home-buttons').style.display = 'grid';
  
  // 편집 상태 초기화
  window.editingTaskId = null;
  window.editingTabType = null;
};

// 작업 탭 표시 (관리자만)
window.showTaskTab = function(type) {
  if (!isCurrentUserAdmin()) {
    console.log('❌ 작업자는 작업 입력 탭 접근 불가');
    return;
  }
  
  const body = document.getElementById('tab-body');
  const subTabs = getTaskSubTabsHTML(type);
  
  if (type === 'input') {
    // 🔧 부품 데이터 즉시 강력 초기화 (HTML 생성 전)
    console.log('🧹 작업입력탭 - 부품 데이터 즉시 강력 초기화');
    
    // 전역 변수 즉시 초기화
    window.selectedParts = [];
    window.parts = [];
    window.currentParts = [];
    if (window.inventoryItems) window.inventoryItems = [];
    if (window.selectedItems) window.selectedItems = [];
    if (window.inventoryData) window.inventoryData = [];
    
    console.log('✅ 전역 변수 즉시 초기화 완료');
    
    // HTML 생성
    body.innerHTML = `
      ${subTabs}
      ${getTaskInputFormHTML(getNowYYYYMMDDHHMM())}
    `;
    
    // HTML 생성 직후 즉시 DOM 초기화
    const clearAllPartsDOM = () => {
      // 모든 부품 관련 요소 찾기 및 초기화
      document.querySelectorAll('[name="parts"]').forEach(el => el.value = '');
      document.querySelectorAll('#selected-parts-display').forEach(el => el.innerHTML = '');
      document.querySelectorAll('.inventory-item').forEach(el => el.remove());
      document.querySelectorAll('.added-part-item').forEach(el => el.remove());
      document.querySelectorAll('input[type="checkbox"][data-part-id]').forEach(el => el.checked = false);
      
      // 전역 변수 재확인
      window.selectedParts = [];
      window.parts = [];
      window.currentParts = [];
      
      console.log('✅ DOM 요소 즉시 초기화 완료');
    };
    
    // 즉시 실행
    clearAllPartsDOM();
    
    // 부품 입력 렌더링
    renderItemsInput('items-input');
    
    // 렌더링 후 추가 초기화
    setTimeout(() => {
      console.log('🔄 렌더링 후 추가 초기화');
      clearAllPartsDOM();
      
      // 이벤트 리스너 설정
      const clientInput = document.getElementById('client-input');
      const amountInput = document.getElementById('amount-input');
      
      if (clientInput) {
        clientInput.addEventListener('input', calculateFee);
        clientInput.addEventListener('blur', calculateFee);
      }
      if (amountInput) {
        amountInput.addEventListener('input', calculateFee);
      }
      
      const workerCheckboxes = document.querySelectorAll('input[name="worker"][type="checkbox"]');
      workerCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectedWorkers);
      });
      
      console.log('✅ 이벤트 리스너 설정 완료');
    }, 100);
    
    // 한 번 더 확인 (300ms 후)
    setTimeout(() => {
      clearAllPartsDOM();
      console.log('✅ 최종 확인 초기화 완료');
    }, 300);
    
  } else if (type === 'check') {
    loadTodayTasks();
  } else if (type === 'done') {
    loadDoneTasks();
  }
};

// 오늘 작업 로드
window.loadTodayTasks = async function() {
  const body = document.getElementById('tab-body');
  
  // 관리자와 작업자에 따라 다른 UI 표시
  if (isCurrentUserAdmin()) {
    body.innerHTML = `
      ${getTaskSubTabsHTML('check')}
      <div id="admin-stats-container"></div>
      <div id="admin-task-content"></div>
    `;
  } else {
    // 작업자용 UI는 이미 auth.js에서 설정됨
    // 여기서는 작업 목록만 업데이트
  }
  
  try {
    console.log('📅 오늘 작업 로드 시작');
    
    const todayStr = getTodayString();
    
    // 미완료 작업 조회
    const pendingQuery = query(
      collection(db, "tasks"),
      where("date", ">=", todayStr + "T00:00:00"),
      where("date", "<=", todayStr + "T23:59:59"),
      where("done", "==", false),
      orderBy("date", "asc")
    );
    
    // 완료 작업 조회 (통계용)
    const completedQuery = query(
      collection(db, "tasks"),
      where("date", ">=", todayStr + "T00:00:00"),
      where("date", "<=", todayStr + "T23:59:59"),
      where("done", "==", true),
      orderBy("date", "desc")
    );
    
    const [pendingSnapshot, completedSnapshot] = await Promise.all([
      getDocs(pendingQuery),
      getDocs(completedQuery)
    ]);
    
    let allPendingTasks = [];
    let allCompletedTasks = [];
    
    pendingSnapshot.forEach(docu => {
      const taskData = docu.data();
      allPendingTasks.push({
        id: docu.id,
        ...taskData
      });
    });
    
    completedSnapshot.forEach(docu => {
      const taskData = docu.data();
      allCompletedTasks.push({
        id: docu.id,
        ...taskData
      });
    });
    
    console.log('📋 전체 오늘 미완료 작업:', allPendingTasks.length);
    console.log('📋 전체 오늘 완료 작업:', allCompletedTasks.length);
    
    if (isCurrentUserAdmin()) {
      // 관리자: 통계 + 작업자별 분류
      const allTodayTasks = [...allPendingTasks, ...allCompletedTasks];
      const stats = generateTaskStats(allTodayTasks, allCompletedTasks);
      const groupedTasks = groupTasksByWorker(allPendingTasks);
      
      // 통계 표시
      const statsContainer = document.getElementById('admin-stats-container');
      if (statsContainer) {
        statsContainer.innerHTML = getStatsHTML(stats, 'today');
      }
      
      // 작업자별 작업 목록 표시
      const taskContent = document.getElementById('admin-task-content');
      if (taskContent) {
        taskContent.innerHTML = getWorkerTaskListHTML(groupedTasks, 'today');
      }
      
    } else {
      // 작업자: 본인 작업만 필터링
      const filteredTasks = filterTasksForCurrentUser(allPendingTasks);
      
      let html = "";
      filteredTasks.forEach(task => {
        html += getTaskItemHTML(task, task.id, 'today');
      });
      
      const taskListElement = document.querySelector('.task-list');
      if (taskListElement) {
        taskListElement.innerHTML = html;
      }
      
      // 작업자의 경우 버튼 조정
      adjustWorkerTaskButtons();
    }
    
    console.log('✅ 오늘 작업 로드 완료');
    
  } catch (error) {
    console.error('❌ 오늘 작업 로드 오류:', error);
    alert('작업 목록을 불러오는 중 오류가 발생했습니다.');
  }
};

// 예약 작업 로드 (관리자만) - 내일 작업만 기본 표시
window.loadReserveTasks = async function() {
  if (!isCurrentUserAdmin()) {
    console.log('❌ 작업자는 예약 작업 접근 불가');
    return;
  }
  
  const body = document.getElementById('tab-body');
  body.innerHTML = `
    ${getReserveTabHTML()}
    <div id="reserve-stats-container"></div>
    <div id="reserve-task-content"></div>
  `;

  try {
    console.log('📅 예약 작업 로드 시작');
    
    // 내일 작업만 필터링
    const tomorrowStr = getTomorrowString();
    const q = query(
      collection(db, "tasks"),
      where("date", ">=", tomorrowStr + "T00:00:00"),
      where("date", "<=", tomorrowStr + "T23:59:59"),
      where("done", "==", false),
      orderBy("date", "asc")
    );
    
    const querySnapshot = await getDocs(q);
    let allTasks = [];
    
    querySnapshot.forEach(docu => {
      const taskData = docu.data();
      allTasks.push({
        id: docu.id,
        ...taskData
      });
    });
    
    console.log('📋 내일 예약 작업 수:', allTasks.length);
    
    // 통계 표시
    const stats = generateTaskStats(allTasks, [], true);
    const statsContainer = document.getElementById('reserve-stats-container');
    if (statsContainer) {
      statsContainer.innerHTML = getStatsHTML(stats, 'reserve');
    }
    
    // 작업자별 작업 목록 표시
    const groupedTasks = groupTasksByWorker(allTasks);
    const taskContent = document.getElementById('reserve-task-content');
    if (taskContent) {
      taskContent.innerHTML = getWorkerTaskListHTML(groupedTasks, 'reserve');
    }

    // 🔍 검색 이벤트 연결 (향상된 검색 함수 사용)
    document.getElementById('reserve-search-btn').onclick = searchReserveTasksEnhanced;

    // 리셋 버튼 이벤트
    window.resetReserveFilter = function() {
      const tomorrowStr = getTomorrowString();
      document.getElementById('reserve-start-date').value = tomorrowStr;
      document.getElementById('reserve-end-date').value = tomorrowStr;
      document.getElementById('reserve-search-keyword').value = '';
      document.getElementById('reserve-sort-order').value = 'date-asc';
      
      const summaryEl = document.getElementById('reserve-search-summary');
      if (summaryEl) {
        summaryEl.style.display = 'none';
      }
      
      loadReserveTasks();
    };
    
    console.log('✅ 예약 작업 로드 완료');
    
  } catch (error) {
    console.error('❌ 예약 작업 로드 오류:', error);
    alert('예약 작업 목록을 불러오는 중 오류가 발생했습니다.');
  }
};

// 🔍 예약작업 향상된 검색 (검색어 + 날짜 + 정렬)
window.searchReserveTasksEnhanced = async function() {
  const startDate = document.getElementById('reserve-start-date').value;
  const endDate = document.getElementById('reserve-end-date').value;
  const keyword = document.getElementById('reserve-search-keyword').value.trim();
  const sortOrder = document.getElementById('reserve-sort-order').value;
  
  if (!startDate || !endDate) {
    alert('시작 날짜와 종료 날짜를 모두 선택해주세요.');
    return;
  }
  
  try {
    console.log('🔍 예약작업 향상된 검색:', {startDate, endDate, keyword, sortOrder});
    
    const q = query(
      collection(db, "tasks"),
      where("date", ">=", startDate + "T00:00:00"),
      where("date", "<=", endDate + "T23:59:59"),
      where("done", "==", false),
      orderBy("date", sortOrder.includes('desc') ? "desc" : "asc")
    );
    
    const querySnapshot = await getDocs(q);
    let allTasks = [];
    
    querySnapshot.forEach(docu => {
      const taskData = docu.data();
      allTasks.push({
        id: docu.id,
        ...taskData
      });
    });
    
    // 검색어 필터링
    if (keyword) {
      allTasks = allTasks.filter(task => {
        const searchFields = [
          task.client || '',
          task.removeAddress || '',
          task.installAddress || '',
          task.contact || '',
          task.items || '',
          task.note || '',
          task.worker || '',
          task.taskType || ''
        ].map(field => field.toLowerCase());
        
        const keywordLower = keyword.toLowerCase();
        return searchFields.some(field => field.includes(keywordLower));
      });
    }
    
    // 정렬 적용
    allTasks = allTasks.sort((a, b) => {
      switch(sortOrder) {
        case 'date-desc':
          return new Date(b.date) - new Date(a.date);
        case 'date-asc':
          return new Date(a.date) - new Date(b.date);
        case 'client-asc':
          return (a.client || '').localeCompare(b.client || '');
        case 'worker-asc':
          return (a.worker || '').localeCompare(b.worker || '');
        default:
          return new Date(a.date) - new Date(b.date);
      }
    });
    
    // 검색 결과 요약 표시
    const summaryEl = document.getElementById('reserve-search-summary');
    if (summaryEl) {
      const totalFound = allTasks.length;
      const searchInfo = [];
      
      if (keyword) searchInfo.push(`"${keyword}"`);
      searchInfo.push(`${startDate} ~ ${endDate}`);
      
      summaryEl.innerHTML = `
        🔍 검색결과: <strong>${totalFound}건</strong> 
        ${searchInfo.length > 0 ? `(${searchInfo.join(', ')})` : ''}
      `;
      summaryEl.style.display = 'block';
    }
    
    // 통계 및 목록 업데이트
    const stats = generateTaskStats(allTasks, [], true);
    const statsContainer = document.getElementById('reserve-stats-container');
    if (statsContainer) {
      statsContainer.innerHTML = getStatsHTML(stats, 'reserve');
    }
    
    const groupedTasks = groupTasksByWorker(allTasks);
    const taskContent = document.getElementById('reserve-task-content');
    if (taskContent) {
      taskContent.innerHTML = getWorkerTaskListHTML(groupedTasks, 'reserve');
    }
    
    console.log('✅ 예약작업 향상된 검색 완료:', allTasks.length + '건');
    
  } catch (error) {
    console.error('❌ 예약작업 향상된 검색 오류:', error);
    alert('검색 중 오류가 발생했습니다.');
  }
};

// 완료 작업 로드 - 오늘 완료된 작업만 기본 표시
window.loadDoneTasks = async function() {
  const body = document.getElementById('tab-body');
  
  // 관리자와 작업자에 따라 다른 UI 표시
  if (isCurrentUserAdmin()) {
    body.innerHTML = `
      ${getDoneTabHTML()}
      <div id="done-stats-container"></div>
      <div id="done-task-content"></div>
    `;
  } else {
    // 작업자용 검색박스 없이 목록만 표시
    const taskListElement = document.querySelector('.task-list');
    if (!taskListElement) {
      body.innerHTML = '<div class="task-list"></div>';
    }
  }

  try {
    console.log('✅ 완료 작업 로드 시작');
    
    const todayStr = getTodayString();
    
    // 완료된 작업 조회
    const completedQuery = query(
      collection(db, "tasks"),
      where("done", "==", true),
      where("date", ">=", todayStr + "T00:00:00"),
      where("date", "<=", todayStr + "T23:59:59"),
      orderBy("date", "desc")
    );
    
    // 전체 작업 조회 (통계용 - 관리자만)
    let allTodayTasks = [];
    if (isCurrentUserAdmin()) {
      const allQuery = query(
        collection(db, "tasks"),
        where("date", ">=", todayStr + "T00:00:00"),
        where("date", "<=", todayStr + "T23:59:59"),
        orderBy("date", "desc")
      );
      
      const allSnapshot = await getDocs(allQuery);
      allSnapshot.forEach(docu => {
        const taskData = docu.data();
        allTodayTasks.push({
          id: docu.id,
          ...taskData
        });
      });
    }
    
    const querySnapshot = await getDocs(completedQuery);
    let completedTasks = [];
    
    querySnapshot.forEach(docu => {
      const taskData = docu.data();
      completedTasks.push({
        id: docu.id,
        ...taskData
      });
    });
    
    console.log('📋 오늘 완료 작업 수:', completedTasks.length);
    
    if (isCurrentUserAdmin()) {
      // 관리자: 통계 + 작업자별 분류
      const stats = generateTaskStats(allTodayTasks, completedTasks);
      const groupedTasks = groupTasksByWorker(completedTasks);
      
      // 통계 표시
      const statsContainer = document.getElementById('done-stats-container');
      if (statsContainer) {
        statsContainer.innerHTML = getStatsHTML(stats, 'done');
      }
      
      // 작업자별 작업 목록 표시
      const taskContent = document.getElementById('done-task-content');
      if (taskContent) {
        taskContent.innerHTML = getWorkerTaskListHTML(groupedTasks, 'done');
      }
      
      // 🔍 관리자만 검색 이벤트 설정 (향상된 검색 함수 사용)
      document.getElementById('done-search-btn').onclick = searchDoneTasksEnhanced;

      // 리셋 버튼 이벤트
      window.resetDoneFilter = function() {
        const todayStr = getTodayString();
        document.getElementById('done-start-date').value = todayStr;
        document.getElementById('done-end-date').value = todayStr;
        document.getElementById('done-search-keyword').value = '';
        document.getElementById('done-sort-order').value = 'date-desc';
        
        const summaryEl = document.getElementById('done-search-summary');
        if (summaryEl) {
          summaryEl.style.display = 'none';
        }
        
        loadDoneTasks();
      };
      
    } else {
      // 작업자: 본인 작업만 필터링
      const filteredTasks = filterTasksForCurrentUser(completedTasks);
      
      let html = "";
      filteredTasks.forEach(task => {
        html += getTaskItemHTML(task, task.id, 'done');
      });
      
      const taskListElement = document.querySelector('.task-list');
      if (taskListElement) {
        taskListElement.innerHTML = html;
      }
      
      // 작업자의 경우 버튼 조정
      adjustWorkerDoneTaskButtons();
    }
    
    console.log('✅ 완료 작업 로드 완료');
    
  } catch (error) {
    console.error('❌ 완료 작업 로드 오류:', error);
    alert('완료 작업 목록을 불러오는 중 오류가 발생했습니다.');
  }
};

// 🔍 완료작업 향상된 검색 (검색어 + 날짜 + 정렬)
window.searchDoneTasksEnhanced = async function() {
  const startDate = document.getElementById('done-start-date').value;
  const endDate = document.getElementById('done-end-date').value;
  const keyword = document.getElementById('done-search-keyword').value.trim();
  const sortOrder = document.getElementById('done-sort-order').value;
  
  if (!startDate || !endDate) {
    alert('시작 날짜와 종료 날짜를 모두 선택해주세요.');
    return;
  }
  
  try {
    console.log('🔍 완료작업 향상된 검색:', {startDate, endDate, keyword, sortOrder});
    
    // 기본 쿼리 (날짜 범위)
    const completedQuery = query(
      collection(db, "tasks"),
      where("done", "==", true),
      where("date", ">=", startDate + "T00:00:00"),
      where("date", "<=", endDate + "T23:59:59"),
      orderBy("date", sortOrder.includes('desc') ? "desc" : "asc")
    );
    
    const allQuery = query(
      collection(db, "tasks"),
      where("date", ">=", startDate + "T00:00:00"),
      where("date", "<=", endDate + "T23:59:59"),
      orderBy("date", "desc")
    );
    
    const [completedSnapshot, allSnapshot] = await Promise.all([
      getDocs(completedQuery),
      getDocs(allQuery)
    ]);
    
    let completedTasks = [];
    let allTasks = [];
    
    // 데이터 수집
    completedSnapshot.forEach(docu => {
      const taskData = docu.data();
      completedTasks.push({
        id: docu.id,
        ...taskData
      });
    });
    
    allSnapshot.forEach(docu => {
      const taskData = docu.data();
      allTasks.push({
        id: docu.id,
        ...taskData
      });
    });
    
    // 검색어 필터링 (키워드가 있는 경우)
    if (keyword) {
      const filterByKeyword = (tasks) => {
        return tasks.filter(task => {
          const searchFields = [
            task.client || '',
            task.removeAddress || '',
            task.installAddress || '',
            task.contact || '',
            task.items || '',
            task.note || '',
            task.worker || '',
            task.taskType || ''
          ].map(field => field.toLowerCase());
          
          const keywordLower = keyword.toLowerCase();
          return searchFields.some(field => field.includes(keywordLower));
        });
      };
      
      completedTasks = filterByKeyword(completedTasks);
      allTasks = filterByKeyword(allTasks);
    }
    
    // 정렬 적용
    const applySorting = (tasks, sortOrder) => {
      return tasks.sort((a, b) => {
        switch(sortOrder) {
          case 'date-desc':
            return new Date(b.date) - new Date(a.date);
          case 'date-asc':
            return new Date(a.date) - new Date(b.date);
          case 'client-asc':
            return (a.client || '').localeCompare(b.client || '');
          case 'worker-asc':
            return (a.worker || '').localeCompare(b.worker || '');
          default:
            return new Date(b.date) - new Date(a.date);
        }
      });
    };
    
    completedTasks = applySorting(completedTasks, sortOrder);
    allTasks = applySorting(allTasks, sortOrder);
    
    // 검색 결과 요약 표시
    const summaryEl = document.getElementById('done-search-summary');
    if (summaryEl) {
      const totalFound = completedTasks.length;
      const searchInfo = [];
      
      if (keyword) searchInfo.push(`"${keyword}"`);
      searchInfo.push(`${startDate} ~ ${endDate}`);
      
      summaryEl.innerHTML = `
        🔍 검색결과: <strong>${totalFound}건</strong> 
        ${searchInfo.length > 0 ? `(${searchInfo.join(', ')})` : ''}
      `;
      summaryEl.style.display = 'block';
    }
    
    // 통계 및 목록 업데이트
    const stats = generateTaskStats(allTasks, completedTasks);
    const statsContainer = document.getElementById('done-stats-container');
    if (statsContainer) {
      statsContainer.innerHTML = getStatsHTML(stats, 'done');
    }
    
    const groupedTasks = groupTasksByWorker(completedTasks);
    const taskContent = document.getElementById('done-task-content');
    if (taskContent) {
      taskContent.innerHTML = getWorkerTaskListHTML(groupedTasks, 'done');
    }
    
    console.log('✅ 완료작업 향상된 검색 완료:', completedTasks.length + '건');
    
  } catch (error) {
    console.error('❌ 완료작업 향상된 검색 오류:', error);
    alert('검색 중 오류가 발생했습니다.');
  }
};

// 작업자용 작업 버튼 조정 (오늘작업 - 완료, 수정, 삭제 모두 표시)
function adjustWorkerTaskButtons() {
  setTimeout(() => {
    console.log('🔧 작업자 오늘작업 버튼 조정 시작');
    const taskActions = document.querySelectorAll('.task-actions');
    console.log('발견된 task-actions:', taskActions.length);
    
    taskActions.forEach((actions, index) => {
      const buttons = actions.querySelectorAll('button');
      console.log(`작업 ${index}의 버튼들:`, Array.from(buttons).map(b => b.textContent.trim()));
      
      buttons.forEach(button => {
        const text = button.textContent.trim();
        // 완료, 수정, 삭제 버튼만 표시
        if (text === '완료' || text === '수정' || text === '삭제') {
          button.style.display = 'inline-block';
          console.log(`✅ 버튼 표시: ${text}`);
        } else {
          button.style.display = 'none';
          console.log(`❌ 버튼 숨김: ${text}`);
        }
      });
    });
  }, 500);
}

// 작업자용 작업 버튼 조정 (완료작업 - 수정, 삭제 표시)
function adjustWorkerDoneTaskButtons() {
  setTimeout(() => {
    console.log('🔧 작업자 완료작업 버튼 조정 시작');
    const taskActions = document.querySelectorAll('.task-actions');
    console.log('발견된 task-actions:', taskActions.length);
    
    taskActions.forEach((actions, index) => {
      const buttons = actions.querySelectorAll('button');
      console.log(`완료작업 ${index}의 버튼들:`, Array.from(buttons).map(b => b.textContent.trim()));
      
      buttons.forEach(button => {
        const text = button.textContent.trim();
        // 수정, 삭제 버튼만 표시
        if (text === '수정' || text === '삭제') {
          button.style.display = 'inline-block';
          console.log(`✅ 버튼 표시: ${text}`);
        } else {
          button.style.display = 'none';
          console.log(`❌ 버튼 숨김: ${text}`);
        }
      });
    });
  }, 500);
}

// 작업 완료 처리
window.completeTask = async function(id) {
  try {
    await updateDoc(doc(db, "tasks", id), { 
      done: true,
      completedAt: new Date().toISOString(),
      completedBy: window.auth?.currentUser?.email || 'unknown'
    });
    
    alert("완료 처리되었습니다!");
    
    // 현재 사용자에 따라 적절한 탭으로 리로드
    if (isCurrentUserAdmin()) {
      loadTodayTasks();
    } else {
      window.loadWorkerTodayTasks();
    }
  } catch (error) {
    console.error('작업 완료 처리 오류:', error);
    alert('작업 완료 처리 중 오류가 발생했습니다.');
  }
};

// 작업 삭제 (관리자와 작업자 모두 가능)
window.deleteTask = async function(id, tabType) {
  if (confirm("정말 삭제할까요?")) {
    try {
      await deleteDoc(doc(db, "tasks", id));
      alert("삭제되었습니다!");
      
      // 삭제 후 올바른 탭으로 이동
      if (isCurrentUserAdmin()) {
        // 관리자
        if (tabType === 'reserve') {
          loadReserveTasks();
        } else if (tabType === 'done') {
          loadDoneTasks();
        } else {
          loadTodayTasks();
        }
      } else {
        // 작업자
        if (tabType === 'done') {
          window.loadWorkerDoneTasks();
        } else {
          window.loadWorkerTodayTasks();
        }
      }
    } catch (error) {
      console.error('작업 삭제 오류:', error);
      alert('작업 삭제 중 오류가 발생했습니다.');
    }
  }
};

// 작업 수정 - 관리자와 작업자 통합 (관리자 폼 재사용)
window.editTask = async function(id, tabType) {
  console.log('=== 편집 시작 ===');
  console.log('편집할 작업 ID:', id);
  console.log('현재 탭 타입:', tabType);
  
  try {
    const docRef = doc(db, "tasks", id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('편집할 작업 데이터:', data);
      
      // 전역 편집 상태 설정 (중요!)
      window.editingTaskId = id;
      window.editingTabType = tabType;
      
      // 🔧 편집 시작 전 부품 데이터 강력한 초기화
      console.log('🧹 편집 전 부품 데이터 강력한 초기화 시작');
      
      // 모든 전역 변수 강제 null/빈배열로 설정
      window.selectedParts = [];
      window.parts = [];
      window.currentParts = [];
      if (window.inventoryItems) window.inventoryItems = [];
      if (window.selectedItems) window.selectedItems = [];
      
      // 모든 부품 관련 DOM 즉시 초기화
      document.querySelectorAll('[name="parts"]').forEach(el => el.value = '');
      document.querySelectorAll('[id*="parts"], [class*="parts"]').forEach(el => {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.value = '';
        } else {
          el.innerHTML = '';
        }
      });
      
      console.log('✅ 편집 시작 전 부품 데이터 강력한 초기화 완료');
      
      console.log('전역 편집 상태 설정:');
      console.log('  window.editingTaskId:', window.editingTaskId);
      console.log('  window.editingTabType:', window.editingTabType);
      
      if (isCurrentUserAdmin()) {
        // 관리자: 작업입력 탭으로 이동하여 수정
        console.log('→ 관리자 수정 모드');
        showTaskTab('input');
        setTimeout(() => {
          populateEditForm(data, id, tabType);
        }, 300); // 시간을 좀 더 늘림
      } else {
        // 작업자: 수정된 폼 사용 (하단 버튼 제거)
        console.log('→ 작업자 수정 모드');
        showWorkerEditForm(data, id, tabType);
      }
      
    } else {
      alert('작업을 찾을 수 없습니다.');
    }
  } catch (error) {
    console.error('작업 편집 오류:', error);
    alert('작업 편집 중 오류가 발생했습니다.');
  }
};

// 관리자용 수정 폼 채우기
function populateEditForm(data, id, tabType) {
  console.log('=== 관리자 수정 폼 채우기 ===');
  console.log('데이터:', data);
  
  const form = document.getElementById('task-form');
  if (!form) {
    console.error('❌ task-form을 찾을 수 없습니다.');
    return;
  }
  
  // 날짜 설정
  if (form.date && data.date) {
    form.date.value = data.date;
  }
  
  // 작업자 체크박스 설정
  const workerCheckboxes = document.querySelectorAll('input[name="worker"][type="checkbox"]');
  workerCheckboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  
  if (data.worker) {
    const workers = data.worker.split(', ');
    workers.forEach(workerName => {
      const checkbox = document.querySelector(`input[name="worker"][value="${workerName.trim()}"]`);
      if (checkbox) {
        checkbox.checked = true;
      }
    });
    
    const selectedWorkersInput = document.getElementById('selected-workers');
    if (selectedWorkersInput) {
      selectedWorkersInput.value = data.worker;
    }
  }
  
  // 나머지 필드들 설정
  if (form.client) form.client.value = data.client || '';
  if (form.removeAddress) form.removeAddress.value = data.removeAddress || '';
  if (form.installAddress) form.installAddress.value = data.installAddress || '';
  if (form.contact) form.contact.value = data.contact || '';
  if (form.taskType) form.taskType.value = data.taskType || '';
  if (form.items) form.items.value = data.items || '';
  if (form.amount) form.amount.value = data.amount || '';
  if (form.note) form.note.value = data.note || '';
  
  // 수수료 필드 설정
  const feeInput = form.querySelector('[name="fee"]');
  if (feeInput && data.fee) {
    feeInput.value = data.fee;
  }
  
  // 부품 필드 설정
  if (form.parts) {
    form.parts.value = data.parts || '';
  }
  
  // 🔧 부품 데이터 로드 (초기화 후 해당 작업의 부품만 로드)
  if (data.parts && window.loadExistingParts) {
    // 잠시 대기 후 해당 작업의 부품 로드 (초기화 완료 후)
    setTimeout(() => {
      window.loadExistingParts(data.parts);
      console.log('✅ 해당 작업의 부품만 로드 완료:', data.parts);
    }, 200);
  }
  
  // 저장 버튼 이벤트 수정 - 편집 모드로 설정
  const saveButton = form.querySelector("button[type='button']");
  if (saveButton) {
    saveButton.onclick = () => {
      console.log('💾 관리자 수정 저장 버튼 클릭');
      console.log('편집 상태:', { id, tabType });
      window.handleTaskSave(true, id, tabType);
    };
  }
  
  // 수수료 자동 계산
  calculateFee();
  
  console.log('✅ 관리자 수정 폼 설정 완료');
}

// 작업자용 수정 폼 (하단 버튼 제거된 버전)
function showWorkerEditForm(data, id, tabType) {
  console.log('=== 작업자 수정 폼 표시 ===');
  console.log('데이터:', data);
  
  // 🔧 작업자 수정 시작 전 부품 데이터 강력한 초기화
  console.log('🧹 작업자 수정 전 부품 데이터 강력한 초기화 시작');
  
  // 모든 전역 변수 강제 삭제 후 재생성
  delete window.selectedParts;
  delete window.parts;  
  delete window.currentParts;
  window.selectedParts = [];
  window.parts = [];
  window.currentParts = [];
  
  if (window.inventoryItems) {
    delete window.inventoryItems;
    window.inventoryItems = [];
  }
  if (window.selectedItems) {
    delete window.selectedItems;
    window.selectedItems = [];
  }
  if (window.inventoryData) {
    delete window.inventoryData;
    window.inventoryData = [];
  }
  
  // 기존 DOM 요소들 즉시 초기화
  document.querySelectorAll('[name="parts"]').forEach(el => el.value = '');
  document.querySelectorAll('#selected-parts-display').forEach(el => el.innerHTML = '');
  document.querySelectorAll('.inventory-item').forEach(el => el.remove());
  document.querySelectorAll('.added-part-item').forEach(el => el.remove());
  document.querySelectorAll('input[type="checkbox"][data-part-id]').forEach(el => el.checked = false);
  
  console.log('✅ 작업자 수정 전 부품 데이터 강력한 초기화 완료');
  
  const tabBody = document.getElementById('tab-body');
  const workerTaskContent = document.getElementById('worker-task-content');
  const targetElement = workerTaskContent || tabBody;
  
  if (!targetElement) {
    console.error('❌ 대상 요소를 찾을 수 없습니다.');
    return;
  }
  
  // 수정된 폼 HTML (하단 버튼 제거)
  const editFormHTML = `
    <div class="worker-edit-container">
      <div class="mobile-edit-header">
        <h3>📝 작업 수정</h3>
        <button onclick="cancelWorkerEdit()" class="header-cancel-btn">❌</button>
      </div>
      
      <div class="box" style="margin: 0;">
        ${getTaskInputFormHTML(data.date || getNowYYYYMMDDHHMM())}
      </div>
    </div>
  `;
  
  targetElement.innerHTML = editFormHTML;
  
  // HTML 생성 직후 즉시 부품 초기화
  setTimeout(() => {
    // 부품 입력 렌더링
    renderItemsInput('items-input');
    
    // 렌더링 직후 즉시 부품 초기화
    window.selectedParts = [];
    window.parts = [];
    window.currentParts = [];
    
    // DOM 요소 재초기화
    document.querySelectorAll('[name="parts"]').forEach(el => el.value = '');
    document.querySelectorAll('#selected-parts-display').forEach(el => el.innerHTML = '');
    document.querySelectorAll('.inventory-item').forEach(el => el.remove());
    document.querySelectorAll('.added-part-item').forEach(el => el.remove());
    document.querySelectorAll('input[type="checkbox"][data-part-id]').forEach(el => el.checked = false);
    
    console.log('✅ 작업자 폼 HTML 생성 후 부품 초기화 완료');
    
    // 기존 데이터로 폼 채우기 (부품 제외)
    populateWorkerFormData(data);
    
    // 이벤트 리스너 설정
    setupFormEventListeners();
    
    // 저장 버튼을 편집 모드로 변경
    const saveButton = document.querySelector('#task-form button[type="button"]');
    if (saveButton) {
      saveButton.onclick = () => {
        console.log('💾 작업자 수정 저장 버튼 클릭');
        window.handleTaskSave(true, id, tabType);
      };
      saveButton.textContent = '💾 저장';
    }
    
    // 🔧 해당 작업의 부품만 로드 (모든 초기화 완료 후)
    setTimeout(() => {
      if (data.parts && window.loadExistingParts) {
        console.log('📦 해당 작업의 부품 로드 시작:', data.parts);
        window.loadExistingParts(data.parts);
        console.log('✅ 작업자 폼 - 해당 작업의 부품만 로드 완료');
      }
    }, 300);
    
    // 스크롤을 상단으로
    window.scrollTo(0, 0);
    console.log('✅ 작업자 수정 폼 설정 완료');
  }, 100);
}

// 작업자 전용 폼 데이터 채우기 함수 (부품 제외)
function populateWorkerFormData(data) {
  const form = document.getElementById('task-form');
  if (!form) return;
  
  console.log('📝 작업자 폼 데이터 채우기 시작 (부품 제외)');
  
  // 날짜 설정
  if (form.date && data.date) {
    form.date.value = data.date;
  }
  
  // 작업자 체크박스 설정
  const workerCheckboxes = document.querySelectorAll('input[name="worker"][type="checkbox"]');
  workerCheckboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  
  if (data.worker) {
    const workers = data.worker.split(', ');
    workers.forEach(workerName => {
      const checkbox = document.querySelector(`input[name="worker"][value="${workerName.trim()}"]`);
      if (checkbox) {
        checkbox.checked = true;
      }
    });
    
    const selectedWorkersInput = document.getElementById('selected-workers');
    if (selectedWorkersInput) {
      selectedWorkersInput.value = data.worker;
    }
  }
  
  // 나머지 필드들 설정 (부품 제외)
  if (form.client) form.client.value = data.client || '';
  if (form.removeAddress) form.removeAddress.value = data.removeAddress || '';
  if (form.installAddress) form.installAddress.value = data.installAddress || '';
  if (form.contact) form.contact.value = data.contact || '';
  if (form.taskType) form.taskType.value = data.taskType || '';
  if (form.items) form.items.value = data.items || '';
  if (form.amount) form.amount.value = data.amount || '';
  if (form.note) form.note.value = data.note || '';
  
  // 수수료 필드 설정
  const feeInput = form.querySelector('[name="fee"]');
  if (feeInput && data.fee) {
    feeInput.value = data.fee;
  }
  
  // 🔧 부품 필드는 빈 값으로 설정 (나중에 별도로 로드)
  if (form.parts) {
    form.parts.value = '';
  }
  
  // 수수료 자동 계산
  calculateFee();
  
  console.log('✅ 작업자 폼 데이터 채우기 완료 (부품 제외)');
}

// 폼 이벤트 리스너 설정 (공통 함수)
function setupFormEventListeners() {
  // 수수료 계산을 위한 이벤트 리스너 추가
  const clientInput = document.getElementById('client-input');
  const amountInput = document.getElementById('amount-input');
  
  if (clientInput) {
    clientInput.addEventListener('input', calculateFee);
    clientInput.addEventListener('blur', calculateFee);
  }
  if (amountInput) {
    amountInput.addEventListener('input', calculateFee);
  }
  
  // 작업자 체크박스 이벤트 리스너 추가
  const workerCheckboxes = document.querySelectorAll('input[name="worker"][type="checkbox"]');
  workerCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateSelectedWorkers);
  });
}

// 작업자용 수정 취소
window.cancelWorkerEdit = function() {
  console.log('=== 작업자 수정 취소 ===');
  
  // 🔧 취소 시에도 부품 데이터 완전 초기화
  console.log('🧹 작업자 수정 취소 - 부품 데이터 초기화');
  
  // 전역 변수 강제 초기화
  delete window.selectedParts;
  delete window.parts;
  delete window.currentParts;
  window.selectedParts = [];
  window.parts = [];
  window.currentParts = [];
  
  if (window.inventoryItems) window.inventoryItems = [];
  if (window.selectedItems) window.selectedItems = [];
  if (window.inventoryData) window.inventoryData = [];
  
  // DOM 요소 초기화
  document.querySelectorAll('[name="parts"]').forEach(el => el.value = '');
  document.querySelectorAll('#selected-parts-display').forEach(el => el.innerHTML = '');
  document.querySelectorAll('.inventory-item').forEach(el => el.remove());
  document.querySelectorAll('.added-part-item').forEach(el => el.remove());
  document.querySelectorAll('input[type="checkbox"][data-part-id]').forEach(el => el.checked = false);
  
  console.log('✅ 작업자 수정 취소 - 부품 데이터 초기화 완료');
  
  // 편집 상태 초기화
  window.editingTaskId = null;
  window.editingTabType = null;
  
  // 원래 화면으로 돌아가기
  const activeTab = document.querySelector('.worker-tab-btn.active');
  if (activeTab && activeTab.id === 'done-tab') {
    window.loadWorkerDoneTasks();
  } else {
    window.loadWorkerTodayTasks();
  }
};

// 수정 폼용 작업자 추가 (작업자용)
window.addEditCustomWorker = function() {
  const customInput = document.getElementById('custom-worker');
  if (!customInput || !customInput.value.trim()) {
    alert('작업자명을 입력해주세요.');
    return;
  }
  
  const workerName = customInput.value.trim();
  const container = customInput.parentNode.parentNode;
  
  // 새 체크박스 생성
  const newLabel = document.createElement('label');
  newLabel.style.cssText = 'display: flex; align-items: center; margin: 0; font-size: 16px;';
  
  const newCheckbox = document.createElement('input');
  newCheckbox.type = 'checkbox';
  newCheckbox.name = 'worker';
  newCheckbox.value = workerName;
  newCheckbox.checked = true;
  newCheckbox.style.cssText = 'width: auto; margin: 0 8px 0 0; padding: 0; min-width: 20px; min-height: 20px;';
  newCheckbox.addEventListener('change', updateSelectedWorkers);
  
  newLabel.appendChild(newCheckbox);
  newLabel.appendChild(document.createTextNode(workerName));
  
  // 기존 작업자들과 함께 배치
  const firstLine = container.querySelector('div:first-child');
  if (firstLine) {
    firstLine.appendChild(newLabel);
  }
  
  // 입력 초기화
  customInput.value = '';
  
  // 선택된 작업자 목록 업데이트
  updateSelectedWorkers();
};

// 모바일에서 작업 상세 토글 최적화
window.toggleTaskDetail = function(taskId) {
  const detailElement = document.getElementById(`detail-${taskId}`);
  const arrowElement = document.querySelector(`[onclick="toggleTaskDetail('${taskId}')"] .arrow`);
  
  if (!detailElement) return;
  
  if (detailElement.style.display === 'none' || !detailElement.style.display) {
    detailElement.style.display = 'block';
    if (arrowElement) arrowElement.textContent = '▲';
    
    // 모바일에서 부드럽게 스크롤
    setTimeout(() => {
      detailElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
    }, 100);
    
  } else {
    detailElement.style.display = 'none';
    if (arrowElement) arrowElement.textContent = '▼';
  }
};

// 전역 함수 등록 (분리된 파일에서 사용하기 위해)
window.formatKoreanDate = formatKoreanDate;
window.getTodayStart = getTodayStart;
window.getTomorrowStart = getTomorrowStart;
window.renderItemsInput = renderItemsInput;
window.isCurrentUserAdmin = isCurrentUserAdmin;