// scripts/templates/task-templates.js - 날짜 필터 1줄 정렬 개선

// 유틸리티 함수들
function formatKoreanDate(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${month}/${day} ${hours}:${minutes}`;
  } catch (error) {
    console.error('날짜 포맷팅 오류:', error);
    return '';
  }
}

// 내일 날짜 문자열 생성
function getTomorrowString() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.getFullYear() + '-' + 
    String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + 
    String(tomorrow.getDate()).padStart(2, '0');
}

// 오늘 날짜 문자열 생성
function getTodayString() {
  const today = new Date();
  return today.getFullYear() + '-' + 
    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
    String(today.getDate()).padStart(2, '0');
}

// 연락처를 전화 링크로 변환하는 함수
function formatPhoneLink(contact) {
  if (!contact || !contact.trim()) {
    return '';
  }
  
  // 전화번호 정리 (공백, 하이픈 제거)
  const cleanNumber = contact.replace(/[\s\-\(\)]/g, '');
  
  // 전화번호 형태인지 확인 (숫자로만 구성되고 10자리 이상)
  if (/^\d{10,11}$/.test(cleanNumber)) {
    return `<a href="tel:${cleanNumber}" class="phone-link" onclick="event.stopPropagation();">${contact}</a>`;
  }
  
  // 전화번호가 아니면 일반 텍스트로 반환
  return contact;
}

// 전화 링크 스타일 추가 함수
function addPhoneStyles() {
  if (document.getElementById('phone-link-styles')) {
    return; // 이미 추가됨
  }
  
  const phoneStyles = `
    <style>
      .phone-link {
        color: #219ebc !important;
        text-decoration: none;
        font-weight: 600;
        border-bottom: 1px dotted #219ebc;
        transition: all 0.2s ease;
        cursor: pointer;
      }
      
      .phone-link:hover {
        color: #1a7a96 !important;
        border-bottom-style: solid;
        background-color: rgba(33, 158, 188, 0.1);
        padding: 2px 4px;
        border-radius: 4px;
      }
      
      .phone-link:active {
        background-color: rgba(33, 158, 188, 0.2);
      }
      
      /* 모바일에서 터치 피드백 */
      @media (max-width: 768px) {
        .phone-link {
          padding: 4px 6px;
          border-radius: 4px;
          background-color: rgba(33, 158, 188, 0.05);
          border-bottom: none;
          display: inline-block;
          min-height: 44px;
          line-height: 36px;
        }
        
        .phone-link:active {
          background-color: rgba(33, 158, 188, 0.2);
          transform: scale(0.98);
        }
      }
    </style>
  `;

  // 스타일을 문서에 추가
  const styleElement = document.createElement('div');
  styleElement.id = 'phone-link-styles';
  styleElement.innerHTML = phoneStyles;
  document.head.appendChild(styleElement);
}

export function getTaskSubTabsHTML(activeType) {
  return `
    <div class="task-subtabs">
      <button onclick="showTaskTab('input')" ${activeType === 'input' ? 'class="active"' : ''}>작업입력</button>
      <button onclick="showTaskTab('check')" ${activeType === 'check' ? 'class="active"' : ''}>오늘작업</button>
      <button onclick="showTaskTab('done')" ${activeType === 'done' ? 'class="active"' : ''}>완료작업</button>
    </div>
  `;
}

export function getTaskInputFormHTML(defaultDate) {
  return `
    <form id="task-form" class="box">
      <input type="datetime-local" name="date" value="${defaultDate}">
      
      <!-- 작업자 선택 (체크박스 방식) -->
      <div style="margin: 5px 0;">
        <label style="display: block; margin-bottom: 5px; font-size: 16px; color: #333; font-weight: 600;">작업자 선택</label>
        <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
          <label style="display: flex; align-items: center; margin: 0; font-size: 16px;">
            <input type="checkbox" name="worker" value="박성욱" style="width: auto; margin: 0 8px 0 0; padding: 0; min-width: 20px; min-height: 20px;">
            박성욱
          </label>
          <label style="display: flex; align-items: center; margin: 0; font-size: 16px;">
            <input type="checkbox" name="worker" value="박성호" style="width: auto; margin: 0 8px 0 0; padding: 0; min-width: 20px; min-height: 20px;">
            박성호
          </label>
          <label style="display: flex; align-items: center; margin: 0; font-size: 16px;">
            <input type="checkbox" name="worker" value="배희종" style="width: auto; margin: 0 8px 0 0; padding: 0; min-width: 20px; min-height: 20px;">
            배희종
          </label>
          <label style="display: flex; align-items: center; margin: 0; font-size: 16px;">
            <input type="checkbox" name="worker" value="오태희" style="width: auto; margin: 0 8px 0 0; padding: 0; min-width: 20px; min-height: 20px;">
            오태희
          </label>
          <div style="display: flex; gap: 8px; align-items: center; width: 100%; margin-top: 8px;">
            <input type="text" id="custom-worker" placeholder="작업자 추가" style="flex: 1; margin: 0; padding: 8px 12px; font-size: 16px; min-height: 40px;">
            <button type="button" onclick="addCustomWorker()" style="width: auto; margin: 0; padding: 8px 16px; font-size: 14px; min-height: 40px;">추가</button>
          </div>
        </div>
        <input type="hidden" name="worker" id="selected-workers">
      </div>
      
      <input type="text" name="client" id="client-input" placeholder="거래처명 입력">
      
      <input type="text" name="removeAddress" placeholder="철거 주소">
      <input type="text" name="installAddress" placeholder="설치 주소">
      <input type="text" name="contact" placeholder="연락처">
      
      <select name="taskType">
        <option value="">작업구분</option>
        <option value="이전설치">이전설치</option>
        <option value="설치">설치</option>
        <option value="철거">철거</option>
        <option value="철거보관">철거보관</option>
        <option value="보관설치">보관설치</option>
        <option value="A/S">A/S</option>
      </select>
      
      <div id="items-input"></div>
      
      <input type="number" name="amount" id="amount-input" placeholder="금액">
      
      <!-- 수수료 필드 추가 (비고 바로 위) -->
      <input type="number" name="fee" id="fee-input" placeholder="수수료" readonly>
      <div class="fee-info" id="fee-info" style="font-size:14px;color:#666;margin-top:-5px;margin-bottom:10px;display:none;"></div>
      
      <div id="parts-input"></div>
      
      <textarea name="note" placeholder="비고" style="min-height: 80px;"></textarea>
      
      <button type="button" onclick="handleTaskSave(false, null, null)">저장</button>
    </form>
  `;
}

export function getTaskListHTML() {
  return `
    <div class="task-list"></div>
  `;
}

// 예약탭 - 날짜 필터 1줄 정렬
export function getReserveTabHTML() {
  const tomorrow = getTomorrowString();
  
  return `
    <div class="date-filter-container">
      <div class="date-filter-row">
        <input type="date" id="reserve-start-date" value="${tomorrow}" class="date-filter-input">
        <span class="date-separator">~</span>
        <input type="date" id="reserve-end-date" value="${tomorrow}" class="date-filter-input">
        <button id="reserve-search-btn" class="filter-search-btn">🔍 검색</button>
        <button onclick="resetReserveFilter()" class="filter-reset-btn">내일</button>
      </div>
    </div>
    ${getTaskListHTML()}
    
    <style>
      .date-filter-container {
        background: white;
        padding: 15px 20px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        margin-bottom: 20px;
      }
      
      .date-filter-row {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: nowrap;
      }
      
      .date-filter-input {
        flex: 1;
        margin: 0 !important;
        padding: 12px 16px !important;
        font-size: 16px !important;
        border-radius: 8px !important;
        border: 2px solid #ddd !important;
        min-height: 45px !important;
        background: #fff !important;
        color: #333 !important;
        font-family: inherit;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
        touch-action: manipulation;
        min-width: 140px;
      }
      
      .date-filter-input:focus {
        outline: none !important;
        border-color: #8ecae6 !important;
        box-shadow: 0 0 0 3px rgba(142, 202, 230, 0.15) !important;
        background: #fff !important;
        color: #333 !important;
      }
      
      .date-separator {
        font-weight: 600;
        color: #666;
        margin: 0 5px;
        flex-shrink: 0;
      }
      
      .filter-search-btn, .filter-reset-btn {
        padding: 12px 18px !important;
        margin: 0 !important;
        font-size: 15px !important;
        border-radius: 8px !important;
        min-height: 45px !important;
        white-space: nowrap;
        border: none !important;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s ease;
        touch-action: manipulation;
        flex-shrink: 0;
      }
      
      .filter-search-btn {
        background: #219ebc !important;
        color: white !important;
        min-width: 90px;
      }
      
      .filter-search-btn:hover,
      .filter-search-btn:active {
        background: #1a7a96 !important;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(33,158,188,0.2);
      }
      
      .filter-reset-btn {
        background: #6c757d !important;
        color: white !important;
        min-width: 70px;
      }
      
      .filter-reset-btn:hover {
        background: #5a6268 !important;
        transform: translateY(-1px);
      }
      
      /* 모바일 반응형 */
      @media (max-width: 768px) {
        .date-filter-container {
          padding: 12px 15px;
        }
        
        .date-filter-row {
          gap: 8px;
        }
        
        .date-filter-input {
          min-width: 110px;
          font-size: 15px !important;
          padding: 10px 12px !important;
          min-height: 42px !important;
        }
        
        .filter-search-btn,
        .filter-reset-btn {
          font-size: 14px !important;
          padding: 10px 14px !important;
          min-height: 42px !important;
        }
        
        .filter-search-btn {
          min-width: 80px;
        }
        
        .filter-reset-btn {
          min-width: 60px;
        }
      }
      
      @media (max-width: 600px) {
        .date-filter-row {
          gap: 6px;
        }
        
        .date-filter-input {
          min-width: 100px;
          font-size: 14px !important;
          padding: 8px 10px !important;
          min-height: 40px !important;
        }
        
        .filter-search-btn,
        .filter-reset-btn {
          font-size: 13px !important;
          padding: 8px 12px !important;
          min-height: 40px !important;
        }
        
        .filter-search-btn {
          min-width: 70px;
        }
        
        .filter-reset-btn {
          min-width: 50px;
        }
        
        .date-separator {
          font-size: 14px;
          margin: 0 3px;
        }
      }
    </style>
  `;
}

// 완료작업탭 - 날짜 필터 1줄 정렬
export function getDoneTabHTML() {
  const today = getTodayString();
  
  return `
    ${getTaskSubTabsHTML('done')}
    <div class="date-filter-container">
      <div class="date-filter-row">
        <input type="date" id="done-start-date" value="${today}" class="date-filter-input">
        <span class="date-separator">~</span>
        <input type="date" id="done-end-date" value="${today}" class="date-filter-input">
        <button id="done-search-btn" class="filter-search-btn">🔍 검색</button>
        <button onclick="resetDoneFilter()" class="filter-reset-btn">오늘</button>
      </div>
    </div>
    ${getTaskListHTML()}
    
    <style>
      /* 완료작업탭도 동일한 스타일 적용 */
      .date-filter-container {
        background: white;
        padding: 15px 20px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        margin-bottom: 20px;
      }
      
      .date-filter-row {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: nowrap;
      }
      
      .date-filter-input {
        flex: 1;
        margin: 0 !important;
        padding: 12px 16px !important;
        font-size: 16px !important;
        border-radius: 8px !important;
        border: 2px solid #ddd !important;
        min-height: 45px !important;
        background: #fff !important;
        color: #333 !important;
        font-family: inherit;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
        touch-action: manipulation;
        min-width: 140px;
      }
      
      .date-filter-input:focus {
        outline: none !important;
        border-color: #8ecae6 !important;
        box-shadow: 0 0 0 3px rgba(142, 202, 230, 0.15) !important;
        background: #fff !important;
        color: #333 !important;
      }
      
      .date-separator {
        font-weight: 600;
        color: #666;
        margin: 0 5px;
        flex-shrink: 0;
      }
      
      .filter-search-btn, .filter-reset-btn {
        padding: 12px 18px !important;
        margin: 0 !important;
        font-size: 15px !important;
        border-radius: 8px !important;
        min-height: 45px !important;
        white-space: nowrap;
        border: none !important;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s ease;
        touch-action: manipulation;
        flex-shrink: 0;
      }
      
      .filter-search-btn {
        background: #219ebc !important;
        color: white !important;
        min-width: 90px;
      }
      
      .filter-search-btn:hover,
      .filter-search-btn:active {
        background: #1a7a96 !important;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(33,158,188,0.2);
      }
      
      .filter-reset-btn {
        background: #6c757d !important;
        color: white !important;
        min-width: 70px;
      }
      
      .filter-reset-btn:hover {
        background: #5a6268 !important;
        transform: translateY(-1px);
      }
      
      /* 모바일 반응형 */
      @media (max-width: 768px) {
        .date-filter-container {
          padding: 12px 15px;
        }
        
        .date-filter-row {
          gap: 8px;
        }
        
        .date-filter-input {
          min-width: 110px;
          font-size: 15px !important;
          padding: 10px 12px !important;
          min-height: 42px !important;
        }
        
        .filter-search-btn,
        .filter-reset-btn {
          font-size: 14px !important;
          padding: 10px 14px !important;
          min-height: 42px !important;
        }
        
        .filter-search-btn {
          min-width: 80px;
        }
        
        .filter-reset-btn {
          min-width: 60px;
        }
      }
      
      @media (max-width: 600px) {
        .date-filter-row {
          gap: 6px;
        }
        
        .date-filter-input {
          min-width: 100px;
          font-size: 14px !important;
          padding: 8px 10px !important;
          min-height: 40px !important;
        }
        
        .filter-search-btn,
        .filter-reset-btn {
          font-size: 13px !important;
          padding: 8px 12px !important;
          min-height: 40px !important;
        }
        
        .filter-search-btn {
          min-width: 70px;
        }
        
        .filter-reset-btn {
          min-width: 50px;
        }
        
        .date-separator {
          font-size: 14px;
          margin: 0 3px;
        }
      }
    </style>
  `;
}

export function getTaskItemHTML(task, id, tabType) {
  const dateStr = formatKoreanDate(task.date);
  
  // 부품 데이터 처리
  let partsDisplay = '';
  if (task.parts) {
    try {
      if (typeof task.parts === 'string') {
        const parsed = JSON.parse(task.parts);
        if (Array.isArray(parsed)) {
          partsDisplay = parsed.map(part => `${part.name || part} (${part.quantity || 1}개)`).join(', ');
        } else {
          partsDisplay = task.parts;
        }
      } else if (Array.isArray(task.parts)) {
        partsDisplay = task.parts.map(part => `${part.name || part} (${part.quantity || 1}개)`).join(', ');
      } else if (typeof task.parts === 'object') {
        partsDisplay = Object.entries(task.parts).map(([key, value]) => {
          if (typeof value === 'object') {
            return `${key} (${value.quantity || 1}개)`;
          }
          return `${key}: ${value}`;
        }).join(', ');
      } else {
        partsDisplay = task.parts;
      }
    } catch (e) {
      partsDisplay = task.parts;
    }
  }
  
  // 모바일과 데스크탑 감지
  const isMobile = window.innerWidth <= 768;
  
  if (isMobile) {
    // 모바일용 한 줄 레이아웃
    return `
      <div class="task-item">
        <div class="task-summary" onclick="toggleTaskDetail('${id}')">
          <div class="task-summary-mobile">
            <div class="task-date-mobile">${dateStr}</div>
            <div class="task-info-mobile">
              ${task.worker ? `<span class="task-worker-mobile">${task.worker}</span>` : ''}
              ${task.client ? `<span class="task-client-mobile">${task.client}</span>` : ''}
              ${task.taskType ? `<span class="task-type-mobile">${task.taskType}</span>` : ''}
            </div>
            ${task.items ? `<div class="task-content-mobile">${task.items}</div>` : ''}
          </div>
          <span class="arrow">▼</span>
        </div>
        <div id="detail-${id}" class="task-detail" style="display:none;">
          ${task.removeAddress ? `<div><strong>철거:</strong> ${task.removeAddress}</div>` : ''}
          <div><strong>설치:</strong> ${task.installAddress || ''}</div>
          <div><strong>연락처:</strong> ${formatPhoneLink(task.contact)}</div>
          <div><strong>작업구분:</strong> ${task.taskType || ''}</div>
          <div><strong>금액:</strong> ${parseInt(task.amount || 0).toLocaleString()}원</div>
          ${task.fee ? `<div><strong>수수료:</strong> ${parseInt(task.fee).toLocaleString()}원</div>` : ''}
          ${partsDisplay ? `<div><strong>부품:</strong> ${partsDisplay}</div>` : ''}
          ${task.note ? `<div><strong>비고:</strong> ${task.note}</div>` : ''}
          <div class="task-actions">
            ${tabType === 'today' ? `<button onclick="completeTask('${id}')" style="background:#28a745 !important;">완료</button>` : ''}
            <button onclick="editTask('${id}', '${tabType}')" style="background:#ffc107 !important;color:#333 !important;">수정</button>
            <button onclick="deleteTask('${id}', '${tabType}')" style="background:#dc3545 !important;">삭제</button>
          </div>
        </div>
      </div>
    `;
  } else {
    // 데스크탑용 기존 레이아웃
    return `
      <div class="task-item">
        <div class="task-summary" onclick="toggleTaskDetail('${id}')">
          <div class="col-date">${dateStr}</div>
          <div class="col-staff">${task.worker || ''}</div>
          <div class="col-client">${task.client || ''}</div>
          <div class="col-tasktype">${task.taskType || ''}</div>
          <div class="col-content">${task.items || ''}</div>
          <span class="arrow">▼</span>
        </div>
        <div id="detail-${id}" class="task-detail" style="display:none;">
          ${task.removeAddress ? `<div><strong>철거:</strong> ${task.removeAddress}</div>` : ''}
          <div><strong>설치:</strong> ${task.installAddress || ''}</div>
          <div><strong>연락처:</strong> ${formatPhoneLink(task.contact)}</div>
          <div><strong>작업구분:</strong> ${task.taskType || ''}</div>
          <div><strong>금액:</strong> ${parseInt(task.amount || 0).toLocaleString()}원</div>
          ${task.fee ? `<div><strong>수수료:</strong> ${parseInt(task.fee).toLocaleString()}원</div>` : ''}
          ${partsDisplay ? `<div><strong>부품:</strong> ${partsDisplay}</div>` : ''}
          ${task.note ? `<div><strong>비고:</strong> ${task.note}</div>` : ''}
          <div class="task-actions">
            ${tabType === 'today' ? `<button onclick="completeTask('${id}')" style="background:#28a745 !important;">완료</button>` : ''}
            <button onclick="editTask('${id}', '${tabType}')" style="background:#ffc107 !important;color:#333 !important;">수정</button>
            <button onclick="deleteTask('${id}', '${tabType}')" style="background:#dc3545 !important;">삭제</button>
          </div>
        </div>
      </div>
    `;
  }
}

// 전역 함수로 등록
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

// 유틸리티 함수들
function formatPartsForDisplay(partsData) {
  if (!partsData) return '<span style="color: #999;">부품 사용 없음</span>';
  
  try {
    if (typeof partsData === 'string') {
      try {
        const parsed = JSON.parse(partsData);
        if (Array.isArray(parsed)) {
          return parsed.map(part => 
            `<span class="part-item">${part.name || part}: ${part.quantity || 1}개</span>`
          ).join(', ');
        } else {
          return `<span class="part-item">${partsData}</span>`;
        }
      } catch (e) {
        // JSON 파싱 실패 시 텍스트로 처리
        return `<span class="part-item">${partsData}</span>`;
      }
    } else if (Array.isArray(partsData)) {
      return partsData.map(part => 
        `<span class="part-item">${part.name || part}: ${part.quantity || 1}개</span>`
      ).join(', ');
    } else {
      return `<span class="part-item">${String(partsData)}</span>`;
    }
  } catch (error) {
    return '<span style="color: #999;">부품 정보 오류</span>';
  }
}

// 화면 크기 변경 감지하여 리스트 다시 렌더링
window.addEventListener('resize', () => {
  // 리사이즈 디바운싱
  clearTimeout(window.resizeTimeout);
  window.resizeTimeout = setTimeout(() => {
    // 현재 표시된 작업 목록이 있다면 다시 렌더링
    const taskList = document.querySelector('.task-list');
    if (taskList && taskList.innerHTML.trim() !== '') {
      // 현재 활성 탭에 따라 적절한 함수 호출
      const activeWorkerTab = document.querySelector('.worker-tab-btn.active');
      const activeAdminTab = document.querySelector('.task-subtabs button.active');
      
      if (activeWorkerTab) {
        if (activeWorkerTab.id === 'today-tab' && window.loadWorkerTodayTasks) {
          window.loadWorkerTodayTasks();
        } else if (activeWorkerTab.id === 'done-tab' && window.loadWorkerDoneTasks) {
          window.loadWorkerDoneTasks();
        }
      } else if (activeAdminTab && window.isCurrentUserAdmin && window.isCurrentUserAdmin()) {
        const tabText = activeAdminTab.textContent.trim();
        if (tabText === '오늘작업' && window.loadTodayTasks) {
          window.loadTodayTasks();
        } else if (tabText === '완료작업' && window.loadDoneTasks) {
          window.loadDoneTasks();
        }
      }
    }
  }, 300);
});

// DOM 로드 시 스타일 추가
document.addEventListener('DOMContentLoaded', addPhoneStyles);

// 전역 함수 등록
window.formatDate = formatKoreanDate;
window.formatPartsForDisplay = formatPartsForDisplay;
window.formatPhoneLink = formatPhoneLink;