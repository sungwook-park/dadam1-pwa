// scripts/print-work-orders.js - 작업지시서 인쇄 시스템

import { db } from './firebase-config.js';
import {
  collection, query, where, getDocs, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 빠른 날짜 설정 함수
function setQuickDate(type) {
  const dateInput = document.getElementById('print-date');
  if (!dateInput) return;
  
  const today = new Date();
  let targetDate;
  
  switch (type) {
    case 'today':
      targetDate = today;
      break;
    case 'tomorrow':
      targetDate = new Date(today);
      targetDate.setDate(today.getDate() + 1);
      break;
    default:
      targetDate = today;
  }
  
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  
  dateInput.value = `${year}-${month}-${day}`;
  
  // 빠른 날짜 버튼 활성화 상태 업데이트
  updateQuickDateButtons(type);
}

// 빠른 날짜 버튼 활성화 상태 업데이트
function updateQuickDateButtons(activeType) {
  const buttons = document.querySelectorAll('.quick-date-btn');
  buttons.forEach(btn => {
    btn.classList.remove('active');
  });
  
  if (activeType === 'today') {
    document.querySelector('.quick-date-btn.today')?.classList.add('active');
  } else if (activeType === 'tomorrow') {
    document.querySelector('.quick-date-btn.tomorrow')?.classList.add('active');
  }
}

// 빠른 날짜 선택 동기화 설정
function setupQuickDateSync() {
  const dateInput = document.getElementById('print-date');
  if (!dateInput) return;
  
  // 날짜 입력이 변경될 때 빠른 날짜 버튼 상태 동기화
  dateInput.addEventListener('change', function() {
    const selectedDate = this.value;
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // 버튼 활성화 상태 초기화
    const buttons = document.querySelectorAll('.quick-date-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    // 해당 날짜에 맞는 버튼 활성화
    if (selectedDate === today) {
      document.querySelector('.quick-date-btn.today')?.classList.add('active');
    } else if (selectedDate === tomorrowStr) {
      document.querySelector('.quick-date-btn.tomorrow')?.classList.add('active');
    }
  });
  
  // 초기 상태 설정 (오늘 날짜가 기본값이므로)
  const initialDate = dateInput.value;
  const today = new Date().toISOString().split('T')[0];
  if (initialDate === today) {
    document.querySelector('.quick-date-btn.today')?.classList.add('active');
  }
}

// 작업지시서 인쇄 메인 로드 함수
function loadWorkOrderPrint() {
  console.log('📄 작업지시서 인쇄 로드 시작');
  const tabBody = document.getElementById('tab-body');
  if (tabBody) {
    tabBody.innerHTML = getWorkOrderPrintHTML();
    setupPrintEventListeners();
    
    // 기본값으로 오늘 날짜 설정
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('print-date');
    if (dateInput) {
      dateInput.value = today;
    }
    
    console.log('📄 작업지시서 인쇄 UI 로드 완료');
  } else {
    console.error('❌ tab-body 요소를 찾을 수 없습니다');
  }
}

// 작업지시서 인쇄 메인 HTML
function getWorkOrderPrintHTML() {
  const today = new Date().toISOString().split('T')[0];
  
  return `
    <div class="work-order-print-container">
      <!-- 제어 패널 -->
      <div class="print-control-panel">
        <div class="date-control-row">
          <div class="date-input-group">
            <label for="print-date">📅 인쇄 날짜</label>
            <input type="date" id="print-date" value="${today}">
          </div>
          <button onclick="window.setQuickDate('today')" class="quick-date-btn today">오늘</button>
          <button onclick="window.setQuickDate('tomorrow')" class="quick-date-btn tomorrow">내일</button>
        </div>
        
        <button onclick="window.loadTasksForPrint()" class="load-tasks-btn">📋 작업 불러오기</button>
        
        <div class="print-options">
          <label class="option-item">
            <input type="checkbox" id="separate-pages" checked>
            <span>작업자별 페이지 분리</span>
          </label>
        </div>
      </div>
      
      <!-- 작업 목록 미리보기 -->
      <div id="tasks-preview-container" class="tasks-preview-container">
        <div class="preview-placeholder">
          <div class="placeholder-icon">📋</div>
          <div class="placeholder-text">날짜를 선택하고 '작업 불러오기' 버튼을 클릭해주세요</div>
        </div>
      </div>
      
      <!-- 인쇄 액션 버튼들 -->
      <div id="print-action-buttons" class="print-action-buttons" style="display: none;">
        <button onclick="window.printAllWorkers()" class="print-btn primary">🖨️ 전체 인쇄</button>
        <button onclick="window.printSelectedWorkers()" class="print-btn secondary">✅ 선택 인쇄</button>
        <button onclick="window.previewPrint()" class="print-btn outline">👁️ 미리보기</button>
      </div>
    </div>
    
    <!-- 인쇄용 스타일 -->
    <style>
      /* 메인 컨테이너 */
      .work-order-print-container {
        max-width: 1000px;
        margin: 0 auto;
        padding: 25px;
        background: #f4f6f8;
      }
      
      /* 제어 패널 */
      .print-control-panel {
        background: white;
        padding: 25px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        margin-bottom: 25px;
      }
      
      /* 날짜 제어 행 */
      .date-control-row {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 15px;
        margin-bottom: 20px;
        align-items: end;
      }
      
      .date-input-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .date-input-group label {
        font-weight: 600;
        color: #333;
        font-size: 1rem;
      }
      
      .date-input-group input {
        padding: 12px 15px;
        border: 2px solid #ddd;
        border-radius: 8px;
        font-size: 16px;
        transition: border-color 0.2s ease;
      }
      
      .date-input-group input:focus {
        outline: none;
        border-color: #8ecae6;
        box-shadow: 0 0 0 3px rgba(142, 202, 230, 0.15);
      }
      
      .quick-date-btn {
        padding: 12px 20px;
        border: 2px solid #219ebc;
        background: white;
        color: #219ebc;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        height: fit-content;
      }
      
      .quick-date-btn:hover {
        background: #219ebc;
        color: white;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(33,158,188,0.3);
      }
      
      .quick-date-btn.active {
        background: #219ebc;
        color: white;
        box-shadow: 0 2px 8px rgba(33,158,188,0.3);
      }
      
      .quick-date-btn.today {
        border-color: #28a745;
        color: #28a745;
      }
      
      .quick-date-btn.today:hover,
      .quick-date-btn.today.active {
        background: #28a745;
        color: white;
        box-shadow: 0 2px 8px rgba(40,167,69,0.3);
      }
      
      .quick-date-btn.tomorrow {
        border-color: #ffc107;
        color: #856404;
      }
      
      .quick-date-btn.tomorrow:hover,
      .quick-date-btn.tomorrow.active {
        background: #ffc107;
        color: #856404;
        box-shadow: 0 2px 8px rgba(255,193,7,0.3);
      }
      
      .load-tasks-btn {
        background: #28a745;
        color: white;
        border: none;
        padding: 15px 30px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
        width: 100%;
        margin-bottom: 20px;
      }
      
      .load-tasks-btn:hover {
        background: #218838;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(40,167,69,0.3);
      }
      
      .print-options {
        padding-top: 20px;
        border-top: 1px solid #e6e6e6;
      }
      
      .option-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px;
        background: #f8f9fa;
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.2s ease;
        font-size: 14px;
        color: #333;
      }
      
      .option-item:hover {
        background: #e9ecef;
      }
      
      .option-item input[type="checkbox"] {
        width: auto;
        margin: 0;
        transform: scale(1.1);
      }
      
      /* 미리보기 컨테이너 */
      .tasks-preview-container {
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        min-height: 400px;
        margin-bottom: 25px;
        overflow: hidden;
      }
      
      .preview-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 400px;
        color: #666;
        text-align: center;
      }
      
      .placeholder-icon {
        font-size: 4rem;
        margin-bottom: 15px;
        opacity: 0.5;
      }
      
      .placeholder-text {
        font-size: 1.1rem;
        font-style: italic;
      }
      
      /* 작업자 리스트 카드 스타일 */
      .worker-card {
        border: 1px solid #e6e6e6;
        border-radius: 8px;
        margin-bottom: 20px;
        overflow: hidden;
        background: white;
      }
      
      .worker-header {
        background: #f8f9fa;
        padding: 20px;
        border-bottom: 1px solid #dee2e6;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .worker-info {
        display: flex;
        align-items: center;
        gap: 15px;
      }
      
      .worker-name {
        font-size: 1.2rem;
        font-weight: 700;
        color: #333;
      }
      
      .task-count-badge {
        background: #219ebc;
        color: white;
        padding: 6px 12px;
        border-radius: 15px;
        font-size: 14px;
        font-weight: 600;
      }
      
      .worker-controls {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .worker-checkbox {
        transform: scale(1.3);
        cursor: pointer;
      }

      /* 작업 리스트 스타일 */
      .worker-tasks-list {
        padding: 20px;
      }

      .task-item {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 12px;
        transition: box-shadow 0.2s ease;
      }

      .task-item:hover {
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }

      .task-item.empty-task {
        opacity: 0.6;
        border-style: dashed;
      }

      .task-time-client {
        font-size: 16px;
        font-weight: 700;
        color: #333;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .task-client {
        font-size: 14px;
        color: #000;
        margin-bottom: 6px;
        line-height: 1.5;
        font-weight: 600;
      }

      .client-highlight {
        background: #fff3cd;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
      }

      .task-details {
        font-size: 14px;
        color: #555;
        margin-bottom: 6px;
        line-height: 1.5;
      }

      .task-addresses {
        font-size: 14px;
        color: #666;
        margin: 4px 0;
        padding-left: 10px;
      }

      .task-note {
        font-size: 13px;
        color: #856404;
        background: #fff3cd;
        padding: 8px 12px;
        border-radius: 6px;
        margin-top: 8px;
        border-left: 3px solid #ffc107;
      }
      
      /* 인쇄 액션 버튼 */
      .print-action-buttons {
        display: flex;
        justify-content: center;
        gap: 15px;
        flex-wrap: wrap;
      }
      
      .print-btn {
        padding: 15px 30px;
        border: none;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 160px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      
      .print-btn.primary {
        background: #28a745;
        color: white;
        box-shadow: 0 3px 10px rgba(40,167,69,0.3);
      }
      
      .print-btn.secondary {
        background: #219ebc;
        color: white;
        box-shadow: 0 3px 10px rgba(33,158,188,0.3);
      }
      
      .print-btn.outline {
        background: white;
        color: #6c757d;
        border: 2px solid #6c757d;
      }
      
      .print-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.15);
      }
      
      .print-btn.primary:hover {
        background: #218838;
      }
      
      .print-btn.secondary:hover {
        background: #1a7a96;
      }
      
      .print-btn.outline:hover {
        background: #6c757d;
        color: white;
      }
      
      /* 프린트 전용 스타일 */
      @media print {
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        
        /* 전체 초기화 */
        * {
          box-sizing: border-box !important;
        }
        
        /* 불필요한 요소 숨기기 */
        .print-control-panel,
        .print-action-buttons,
        .preview-placeholder,
        .placeholder-icon,
        .placeholder-text,
        .worker-controls {
          display: none !important;
          visibility: hidden !important;
        }
        
        /* 전체 컨테이너 */
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          font-family: 'Malgun Gothic', '맑은 고딕', Arial, sans-serif !important;
          height: auto !important;
          overflow: visible !important;
        }
        
        .work-order-print-container {
          padding: 0 !important;
          max-width: none !important;
          background: white !important;
          margin: 0 !important;
          width: 100% !important;
        }
        
        .tasks-preview-container {
          background: white !important;
          border: none !important;
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          width: 100% !important;
        }
        
        /* 작업자 카드 */
        .worker-card {
          page-break-inside: avoid !important;
          page-break-after: always !important;
          margin: 0 !important;
          padding: 0 !important;
          border: 3px solid #000 !important;
          border-radius: 0 !important;
          background: white !important;
          min-height: 250mm !important;
          width: 100% !important;
        }
        
        .worker-card:last-child {
          page-break-after: auto !important;
        }
        
        /* 헤더 - 한 줄 배치 */
        .worker-header {
          background: #f5f5f5 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          border-bottom: 2px solid #000 !important;
          padding: 5mm !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          gap: 15px !important;
          flex-wrap: nowrap !important;
          white-space: nowrap !important;
        }

        .worker-header::before {
          content: "작업지시서 - " attr(data-date) " |" !important;
          font-size: 16px !important;
          font-weight: bold !important;
          color: #000 !important;
          margin: 0 !important;
        }
        
        .worker-info {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          margin: 0 !important;
        }

        .worker-name {
          font-size: 16px !important;
          font-weight: bold !important;
          margin: 0 !important;
        }

        .task-count-badge {
          background: #000 !important;
          color: white !important;
          padding: 4px 8px !important;
          border-radius: 10px !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        /* 작업 리스트 */
        .worker-tasks-list {
          padding: 3mm !important;
        }
        
        /* 작업 아이템 - 18px 글씨, 최소 여백 */
        .task-item {
          margin-bottom: 2mm !important;
          font-size: 18px !important;
          line-height: 1.2 !important;
          page-break-inside: avoid !important;
          border: 1px solid #333 !important;
          border-radius: 4px !important;
          padding: 2mm !important;
          background: white !important;
          min-height: 20mm !important;
        }
        
        .task-time-client {
          font-size: 18px !important;
          font-weight: bold !important;
          margin-bottom: 1mm !important;
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          color: #000 !important;
        }
        
        .task-details {
          font-size: 18px !important;
          margin-bottom: 1mm !important;
          color: #333 !important;
          line-height: 1.2 !important;
        }
        
        .task-addresses {
          font-size: 18px !important;
          margin: 0.5mm 0 !important;
          padding-left: 2mm !important;
          color: #444 !important;
          line-height: 1.2 !important;
        }
        
        .task-note {
          font-size: 18px !important;
          background: #f8f8f8 !important;
          border: 1px solid #666 !important;
          padding: 1mm !important;
          margin-top: 1mm !important;
          border-left: 2px solid #000 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          line-height: 1.2 !important;
        }
      }
      
      /* 모바일 반응형 */
      @media (max-width: 768px) {
        .work-order-print-container {
          padding: 15px;
        }
        
        .date-control-row {
          grid-template-columns: 1fr;
          gap: 12px;
        }
        
        .quick-date-btn {
          width: 100%;
        }
        
        .worker-header {
          flex-direction: column;
          gap: 10px;
          align-items: center;
        }
        
        .worker-tasks-list {
          padding: 15px;
        }
        
        .print-action-buttons {
          flex-direction: column;
        }
        
        .print-btn {
          min-width: unset;
          width: 100%;
        }
      }
    </style>
  `;
}

// 이벤트 리스너 설정
function setupPrintEventListeners() {
  // 전체 선택/해제 (동적으로 생성될 예정)
  document.addEventListener('change', function(e) {
    if (e.target.id === 'select-all-workers') {
      const workerCheckboxes = document.querySelectorAll('.worker-checkbox');
      workerCheckboxes.forEach(checkbox => {
        checkbox.checked = e.target.checked;
      });
    }
  });
  
  // 빠른 날짜 선택 동기화 설정
  setTimeout(() => {
    setupQuickDateSync();
  }, 100);
}

// 작업 불러오기
async function loadTasksForPrint() {
  const dateInput = document.getElementById('print-date');
  const selectedDate = dateInput.value;
  
  if (!selectedDate) {
    alert('날짜를 선택해주세요.');
    return;
  }
  
  try {
    console.log('📋 작업지시서용 작업 로딩:', selectedDate);
    
    // 해당 날짜의 모든 작업 조회
    const startDate = selectedDate + 'T00:00:00';
    const endDate = selectedDate + 'T23:59:59';
    
    const q = query(
      collection(db, "tasks"),
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "asc")
    );
    
    const querySnapshot = await getDocs(q);
    let allTasks = [];
    
    querySnapshot.forEach(doc => {
      allTasks.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('📊 불러온 작업 수:', allTasks.length);
    
    if (allTasks.length === 0) {
      document.getElementById('tasks-preview-container').innerHTML = 
        '<div class="preview-placeholder"><div class="placeholder-icon">📭</div><div class="placeholder-text">선택한 날짜에 등록된 작업이 없습니다</div></div>';
      document.getElementById('print-action-buttons').style.display = 'none';
      return;
    }
    
    // 작업자별로 그룹화
    const groupedTasks = groupTasksByWorker(allTasks);
    
    // 미리보기 생성
    displayWorkerTasksPreview(groupedTasks, selectedDate);
    
    // 인쇄 버튼 표시
    document.getElementById('print-action-buttons').style.display = 'flex';
    
  } catch (error) {
    console.error('❌ 작업 로딩 오류:', error);
    alert('작업을 불러오는 중 오류가 발생했습니다: ' + error.message);
  }
}

// 작업자별 그룹화
function groupTasksByWorker(tasks) {
  const grouped = {};
  
  tasks.forEach(task => {
    if (!task.worker || task.worker.trim() === '') {
      if (!grouped['미지정']) {
        grouped['미지정'] = [];
      }
      grouped['미지정'].push(task);
      return;
    }
    
    const workers = task.worker.split(',').map(w => w.trim());
    const teamLeader = workers[0];
    
    if (!grouped[teamLeader]) {
      grouped[teamLeader] = [];
    }
    
    grouped[teamLeader].push(task);
  });
  
  return grouped;
}

// 작업자별 작업 미리보기 표시 (카드형으로 개선)
function displayWorkerTasksPreview(groupedTasks, selectedDate) {
  const container = document.getElementById('tasks-preview-container');
  
  let html = '';
  
  Object.entries(groupedTasks).forEach(([worker, tasks]) => {
    html += `
      <div class="worker-card" data-date="${selectedDate}">
        <div class="worker-header" data-date="${selectedDate}">
          <div class="worker-info">
            <span class="worker-name">👤 ${worker}</span>
            <span class="task-count-badge">${tasks.length}건</span>
          </div>
          <div class="worker-controls">
            <input type="checkbox" class="worker-checkbox" value="${worker}" checked>
          </div>
        </div>
        
        <div class="worker-tasks-list">
    `;
    
    // 실제 작업들만 표시 (빈 슬롯 없음)
    tasks.forEach((task, index) => {
      const taskTime = formatTaskTime(task.date);
      const addresses = formatAddressesForCard(task.removeAddress, task.installAddress);
      const parts = formatPartsForCard(task.parts);
      const amount = formatAmount(task.amount);
      const fee = formatFee(task.fee);
      const taskType = task.taskType || '';
      const note = task.note || '';
      const client = task.client || '';
      const contact = task.contact || '';
      const items = task.items || '';
      
      // 작업 세부 정보 배열 생성 (거래처명을 span으로 감싸기)
      const detailParts = [];
      if (client) detailParts.push(`🏢 <span class="client-highlight">${client}</span>`);
      if (contact) detailParts.push(`📞 ${contact}`);
      if (fee && fee !== '없음') detailParts.push(`💸 수수료 ${fee}`);
      if (parts && parts !== '없음') detailParts.push(`📦 ${parts}`);
      
      html += `
        <div class="task-item">
          <div class="task-time-client">
            <span>🕐 ${taskTime}${taskType ? ` | 📋 ${taskType}` : ''}${items ? ` ${items}` : ''}</span>
            <span>💰 ${amount}</span>
          </div>
          ${detailParts.length > 0 ? `<div class="task-details">${detailParts.join(' | ')}</div>` : ''}
          ${addresses}
          ${note ? `<div class="task-note">📝 비고: ${note}</div>` : ''}
        </div>
      `;
    });
    
    // 빈 슬롯 추가 안함 - 실제 작업만 표시
    
    html += `
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

// 시간 포맷팅
function formatTaskTime(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (error) {
    return '';
  }
}

// 주소 포맷팅 (카드용)
function formatAddressesForCard(removeAddr, installAddr) {
  let html = '';
  
  if (removeAddr && removeAddr.trim()) {
    html += `<div class="task-addresses">🔴 철거: ${removeAddr}</div>`;
  }
  
  if (installAddr && installAddr.trim()) {
    html += `<div class="task-addresses">🔵 설치: ${installAddr}</div>`;
  }
  
  if (!removeAddr && !installAddr) {
    html += `<div class="task-addresses">📍 주소: 미등록</div>`;
  }
  
  return html;
}

// 부품 정보 카드용 포맷팅
function formatPartsForCard(partsData) {
  if (!partsData || partsData.trim() === '') return '없음';
  
  try {
    if (typeof partsData === 'string') {
      try {
        const parsed = JSON.parse(partsData);
        if (Array.isArray(parsed)) {
          return parsed.map(part => `${part.name}(${part.quantity}개)`).join(', ');
        } else {
          return partsData;
        }
      } catch (e) {
        return partsData;
      }
    } else if (Array.isArray(partsData)) {
      return partsData.map(part => `${part.name}(${part.quantity}개)`).join(', ');
    } else {
      return String(partsData);
    }
  } catch (error) {
    return '없음';
  }
}

// 금액 포맷팅
function formatAmount(amount) {
  if (!amount || amount === 0) return '미정';
  
  if (amount >= 10000) {
    const manWon = Math.floor(amount / 10000);
    const remainder = amount % 10000;
    if (remainder === 0) {
      return `${manWon}만원`;
    } else {
      return `${manWon}만 ${remainder.toLocaleString()}원`;
    }
  } else {
    return `${amount.toLocaleString()}원`;
  }
}

// 수수료 포맷팅
function formatFee(fee) {
  if (!fee || fee === 0) return '없음';
  
  if (fee >= 10000) {
    const manWon = Math.floor(fee / 10000);
    const remainder = fee % 10000;
    if (remainder === 0) {
      return `${manWon}만원`;
    } else {
      return `${manWon}만 ${remainder.toLocaleString()}원`;
    }
  } else {
    return `${fee.toLocaleString()}원`;
  }
}

// 전체 작업자 인쇄
function printAllWorkers() {
  const separatePages = document.getElementById('separate-pages').checked;
  
  // 인쇄 전용 스타일 시트 추가
  const printStyle = document.createElement('style');
  printStyle.id = 'print-only-styles';
  printStyle.innerHTML = `
    @media print {
      @page {
        size: A4;
        margin: 10mm;
      }
      
      /* 모든 요소 숨기기 */
      body * {
        visibility: hidden !important;
      }
      
      /* 작업지시서 컨테이너만 보이기 */
      .tasks-preview-container,
      .tasks-preview-container * {
        visibility: visible !important;
      }
      
      /* 불필요한 요소 완전 제거 */
      .worker-controls {
        display: none !important;
      }
      
      /* 거래처명만 노란색 배경 */
      .client-highlight {
        background: yellow !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        font-weight: bold !important;
        padding: 1mm 2mm !important;
        border-radius: 2px !important;
      }
      
      /* 모든 글씨 진하게 */
      .task-item,
      .task-item * {
        font-weight: bold !important;
      }
      
      .tasks-preview-container {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        background: white !important;
      }
    }
  `;
  document.head.appendChild(printStyle);
  
  if (separatePages) {
    // 모든 작업자 페이지 분리하여 인쇄
    document.querySelectorAll('.worker-card').forEach(card => {
      card.style.pageBreakAfter = 'always';
    });
    
    // 마지막 카드는 페이지 분리 해제
    const lastCard = document.querySelector('.worker-card:last-child');
    if (lastCard) {
      lastCard.style.pageBreakAfter = 'auto';
    }
  }
  
  // 인쇄 실행
  window.print();
  
  // 인쇄 후 스타일 제거
  setTimeout(() => {
    const styleElement = document.getElementById('print-only-styles');
    if (styleElement) {
      styleElement.remove();
    }
  }, 1000);
}

// 선택된 작업자만 인쇄
function printSelectedWorkers() {
  const checkedWorkers = document.querySelectorAll('.worker-checkbox:checked');
  
  if (checkedWorkers.length === 0) {
    alert('인쇄할 작업자를 선택해주세요.');
    return;
  }
  
  const selectedWorkerNames = Array.from(checkedWorkers).map(cb => cb.value);
  const separatePages = document.getElementById('separate-pages').checked;
  
  // 인쇄 전용 스타일 시트 추가
  const printStyle = document.createElement('style');
  printStyle.id = 'print-only-styles';
  printStyle.innerHTML = `
    @media print {
      @page {
        size: A4;
        margin: 10mm;
      }
      
      /* 모든 요소 숨기기 */
      body * {
        visibility: hidden !important;
      }
      
      /* 작업지시서 컨테이너만 보이기 */
      .tasks-preview-container,
      .tasks-preview-container * {
        visibility: visible !important;
      }
      
      /* 불필요한 요소 완전 제거 */
      .worker-controls {
        display: none !important;
      }
      
      /* 거래처명 노란색 배경 */
      .task-details {
        background: yellow !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        font-weight: bold !important;
        padding: 1mm !important;
        border-radius: 2px !important;
      }
      
      /* 모든 글씨 진하게 */
      .task-item,
      .task-item * {
        font-weight: bold !important;
      }
      
      .tasks-preview-container {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        background: white !important;
      }
    }
  `;
  document.head.appendChild(printStyle);
  
  // 선택되지 않은 작업자 카드 숨기기
  document.querySelectorAll('.worker-card').forEach(card => {
    const workerName = card.querySelector('.worker-name').textContent.replace('👤 ', '');
    if (selectedWorkerNames.includes(workerName)) {
      card.style.display = 'block';
      if (separatePages) {
        card.style.pageBreakAfter = 'always';
      }
    } else {
      card.style.display = 'none';
    }
  });
  
  // 마지막 선택된 카드는 페이지 분리 해제
  if (separatePages) {
    const visibleCards = Array.from(document.querySelectorAll('.worker-card')).filter(c => c.style.display !== 'none');
    if (visibleCards.length > 0) {
      visibleCards[visibleCards.length - 1].style.pageBreakAfter = 'auto';
    }
  }
  
  // 인쇄 실행
  window.print();
  
  // 인쇄 후 모든 카드 다시 표시 및 스타일 제거
  setTimeout(() => {
    document.querySelectorAll('.worker-card').forEach(card => {
      card.style.display = 'block';
      card.style.pageBreakAfter = '';
    });
    
    const styleElement = document.getElementById('print-only-styles');
    if (styleElement) {
      styleElement.remove();
    }
  }, 1000);
}

// 인쇄 미리보기
function previewPrint() {
  const printWindow = window.open('', '_blank');
  const selectedDate = document.getElementById('print-date').value;
  const separatePages = document.getElementById('separate-pages').checked;
  
  // 미리보기 HTML 생성
  const previewHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>작업지시서 미리보기 - ${selectedDate}</title>
      <meta charset="UTF-8">
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm;
        }
        
        body {
          font-family: 'Malgun Gothic', '맑은 고딕', Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: white;
          color: #333;
        }
        
        .worker-card {
          margin-bottom: 40px;
          ${separatePages ? 'page-break-after: always;' : ''}
          border: 2px solid #333;
          border-radius: 8px;
          overflow: hidden;
          min-height: 250mm;
        }
        
        .worker-card:last-child {
          page-break-after: auto;
        }
        
        .worker-header {
          background: #f0f0f0;
          padding: 20mm 10mm;
          border-bottom: 2px solid #333;
          text-align: center;
          position: relative;
        }

        .worker-header::before {
          content: "작업지시서 - ${new Date(selectedDate).toLocaleDateString('ko-KR', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
          })} | ";
          display: inline;
          font-size: 18px;
          font-weight: bold;
          margin-right: 10px;
          color: #000;
        }
        
        .worker-info {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
        }

        .worker-name {
          font-size: 18px;
          font-weight: bold;
        }

        .task-count-badge {
          background: #000;
          color: white;
          padding: 6px 12px;
          border-radius: 15px;
          font-size: 16px;
          font-weight: 600;
        }
        
        .worker-tasks-list {
          padding: 10mm;
        }
        
        .task-item {
          margin-bottom: 8mm;
          font-size: 15px;
          line-height: 1.4;
          border: 2px solid #666;
          border-radius: 4px;
          padding: 5mm;
          background: white;
          min-height: 35mm;
        }
        
        .task-time-client {
          font-size: 17px;
          font-weight: bold;
          margin-bottom: 3mm;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .task-details {
          font-size: 15px;
          margin-bottom: 2mm;
        }
        
        .task-addresses {
          font-size: 14px;
          margin: 1mm 0;
          padding-left: 3mm;
        }
        
        .task-note {
          font-size: 14px;
          background: #f5f5f5;
          border: 1px solid #999;
          padding: 3mm;
          margin-top: 2mm;
          border-left: 2px solid #000;
        }
        
        .task-item.empty-task {
          opacity: 0.7;
          border-style: dashed;
        }
        
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      ${document.getElementById('tasks-preview-container').innerHTML.replace(/class="worker-controls"[^>]*>.*?<\/div>/gs, '')}
    </body>
    </html>
  `;
  
  printWindow.document.write(previewHTML);
  printWindow.document.close();
  printWindow.focus();
}

// 전역 함수 등록
window.loadWorkOrderPrint = loadWorkOrderPrint;
window.loadTasksForPrint = loadTasksForPrint;
window.printAllWorkers = printAllWorkers;
window.printSelectedWorkers = printSelectedWorkers;
window.previewPrint = previewPrint;
window.setQuickDate = setQuickDate;

console.log('📄 작업지시서 인쇄 모듈 로드 완료');
console.log('✅ loadWorkOrderPrint 함수 등록:', typeof window.loadWorkOrderPrint);