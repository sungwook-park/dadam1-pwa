// templates/task-templates.js
import { formatKoreanDate } from '../utils/date-utils.js';

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
        <label style="display: block; margin-bottom: 5px; font-size: 14px; color: #333;">작업자 선택</label>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
          <label style="display: flex; align-items: center; margin: 0; font-size: 14px;">
            <input type="checkbox" name="worker" value="박성욱" style="width: auto; margin: 0 5px 0 0; padding: 0;">
            박성욱
          </label>
          <label style="display: flex; align-items: center; margin: 0; font-size: 14px;">
            <input type="checkbox" name="worker" value="박성호" style="width: auto; margin: 0 5px 0 0; padding: 0;">
            박성호
          </label>
          <label style="display: flex; align-items: center; margin: 0; font-size: 14px;">
            <input type="checkbox" name="worker" value="배희종" style="width: auto; margin: 0 5px 0 0; padding: 0;">
            배희종
          </label>
          <label style="display: flex; align-items: center; margin: 0; font-size: 14px;">
            <input type="checkbox" name="worker" value="오태희" style="width: auto; margin: 0 5px 0 0; padding: 0;">
            오태희
          </label>
          <input type="text" id="custom-worker" placeholder="작업자 추가" style="width: 100px; margin: 0; padding: 5px; font-size: 14px;">
          <button type="button" onclick="addCustomWorker()" style="width: auto; margin: 0; padding: 5px 10px; font-size: 12px;">추가</button>
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
      <div class="fee-info" id="fee-info" style="font-size:12px;color:#666;margin-top:-5px;margin-bottom:5px;display:none;"></div>
      
      <div id="parts-input"></div>
      
      <textarea name="note" placeholder="비고"></textarea>
      
      <button type="button" onclick="handleTaskSave(false, null, null)">저장</button>
    </form>
  `;
}

export function getTaskListHTML() {
  return `
    <div class="task-list"></div>
  `;
}

export function getReserveTabHTML() {
  return `
    <div id="reserveSearchBox" style="display:flex;gap:10px;margin-bottom:10px;">
      <input type="date" id="reserve-date" style="flex:1;">
      <input type="text" id="reserve-search" placeholder="검색어 입력" style="flex:1;">
      <button id="reserve-search-btn" style="flex:1;">검색</button>
    </div>
    ${getTaskListHTML()}
  `;
}

export function getDoneTabHTML() {
  return `
    ${getTaskSubTabsHTML('done')}
    <div id="doneSearchContainer" style="display:flex;gap:10px;margin-bottom:10px;">
      <input type="date" id="done-date" style="flex:1;">
      <input type="text" id="done-search" placeholder="검색어 입력" style="flex:1;">
      <button id="done-search-btn" style="flex:1;">검색</button>
    </div>
    ${getTaskListHTML()}
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
        <div><strong>설치:</strong> ${task.installAddress}</div>
        <div><strong>연락처:</strong> ${task.contact}</div>
        <div><strong>작업구분:</strong> ${task.taskType}</div>
        <div><strong>금액:</strong> ${parseInt(task.amount).toLocaleString()}원</div>
        ${task.fee ? `<div><strong>수수료:</strong> ${parseInt(task.fee).toLocaleString()}원</div>` : ''}
        ${partsDisplay ? `<div><strong>부품:</strong> ${partsDisplay}</div>` : ''}
        ${task.note ? `<div><strong>비고:</strong> ${task.note}</div>` : ''}
        <div class="task-actions">
          ${tabType === 'today' ? `<button onclick="completeTask('${id}')">완료</button>` : ''}
          <button onclick="editTask('${id}', '${tabType}')">수정</button>
          <button onclick="deleteTask('${id}', '${tabType}')">삭제</button>
        </div>
      </div>
    </div>
  `;
}