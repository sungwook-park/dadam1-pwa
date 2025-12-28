// scripts/settings/holiday-management.js - 휴무관리

import { db } from '../firebase-config.js';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 현재 표시 중인 월
let currentDate = new Date();

/**
 * 휴무관리 탭 로드
 */
window.loadHolidayManagement = async function() {
  console.log('🏖️ 휴무관리 탭 로드');
  
  const settingsContent = document.getElementById('settings-content');
  
  if (!settingsContent) {
    console.error('❌ settings-content 요소를 찾을 수 없습니다.');
    return;
  }
  
  // UI 렌더링
  settingsContent.innerHTML = `
    <div class="holiday-management">
      <div class="section-header">
        <div class="header-info">
          <h4>🏖️ 휴무관리</h4>
          <p>직원별 휴무일정을 관리하고 확인할 수 있습니다.</p>
        </div>
        <button class="add-btn" onclick="window.openHolidayModal()">
          ➕ 휴무 등록
        </button>
      </div>
      
      <!-- 달력 -->
      <div class="holiday-calendar">
        <div class="calendar-header">
          <button class="calendar-nav-btn" onclick="window.changeMonth(-1)">◀</button>
          <h5 id="current-month"></h5>
          <button class="calendar-nav-btn" onclick="window.changeMonth(1)">▶</button>
        </div>
        <div class="calendar-grid" id="calendar-grid">
          <!-- 달력 동적 생성 -->
        </div>
      </div>
      
      <!-- 휴무 목록 -->
      <div class="holiday-list">
        <h5>📅 휴무 목록</h5>
        <div id="holiday-items">
          <!-- 휴무 목록 동적 생성 -->
        </div>
      </div>
    </div>
    
    <!-- 휴무 등록 모달 -->
    <div id="holiday-modal" class="modal" style="display: none;">
      <div class="modal-backdrop" onclick="window.closeHolidayModal()"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h4>휴무 등록</h4>
          <button class="modal-close" onclick="window.closeHolidayModal()">×</button>
        </div>
        <div class="modal-body">
          <form id="holiday-form" onsubmit="return false;">
            <div class="form-group">
              <label>휴무 대상자 <span class="required">*</span></label>
              <select id="holiday-employee" required>
                <option value="">선택하세요</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>시작일 <span class="required">*</span></label>
              <input type="date" id="holiday-start-date" required>
            </div>
            
            <div class="form-group">
              <label>종료일 <span class="required">*</span></label>
              <input type="date" id="holiday-end-date" required>
            </div>
            
            <div class="form-group">
              <label>휴무 사유</label>
              <textarea id="holiday-reason" placeholder="휴무 사유를 입력하세요 (선택)" rows="3"></textarea>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn-cancel" onclick="window.closeHolidayModal()">취소</button>
              <button type="button" class="btn-save" onclick="window.saveHoliday()">등록</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
  
  // 스타일 추가
  addHolidayManagementStyles();
  
  // 달력 렌더링
  renderCalendar();
  
  // 휴무 목록 로드
  await loadHolidayList();
  
  // 직원 목록 로드 (모달용)
  await loadEmployeeSelectOptions();
};

/**
 * 달력 렌더링
 */
async function renderCalendar() {
  const calendarGrid = document.getElementById('calendar-grid');
  const currentMonthElement = document.getElementById('current-month');
  
  if (!calendarGrid || !currentMonthElement) return;
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // 월 표시
  currentMonthElement.textContent = `${year}년 ${month + 1}월`;
  
  // 달력 시작일 (이번 달 1일)
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // 요일 (0: 일요일, 6: 토요일)
  const firstDayOfWeek = firstDay.getDay();
  const lastDate = lastDay.getDate();
  
  // 휴무 데이터 가져오기
  const holidays = await getHolidaysForMonth(year, month);
  
  // 달력 그리드 생성
  let html = `
    <div class="calendar-weekdays">
      <div class="calendar-weekday sun">일</div>
      <div class="calendar-weekday">월</div>
      <div class="calendar-weekday">화</div>
      <div class="calendar-weekday">수</div>
      <div class="calendar-weekday">목</div>
      <div class="calendar-weekday">금</div>
      <div class="calendar-weekday sat">토</div>
    </div>
    <div class="calendar-days">
  `;
  
  // 빈 칸 추가 (이전 달)
  for (let i = 0; i < firstDayOfWeek; i++) {
    html += '<div class="calendar-day empty"></div>';
  }
  
  // 날짜 추가
  for (let date = 1; date <= lastDate; date++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    const dayOfWeek = new Date(year, month, date).getDay();
    const isToday = isSameDate(new Date(), new Date(year, month, date));
    const holidaysOnDate = holidays.filter(h => isDateInRange(dateStr, h.startDate, h.endDate));
    
    let dayClass = 'calendar-day';
    if (isToday) dayClass += ' today';
    if (dayOfWeek === 0) dayClass += ' sun';
    if (dayOfWeek === 6) dayClass += ' sat';
    if (holidaysOnDate.length > 0) dayClass += ' has-holiday';
    
    html += `
      <div class="${dayClass}">
        <div class="date-number">${date}</div>
        ${holidaysOnDate.length > 0 ? `
          <div class="holiday-badges">
            ${holidaysOnDate.slice(0, 2).map(h => `
              <div class="holiday-badge" title="${h.employeeName} - ${h.reason || '휴무'}">
                ${h.employeeName.substring(0, 2)}
              </div>
            `).join('')}
            ${holidaysOnDate.length > 2 ? `<div class="holiday-badge more">+${holidaysOnDate.length - 2}</div>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }
  
  html += '</div>';
  calendarGrid.innerHTML = html;
}

/**
 * 월 변경
 */
window.changeMonth = function(delta) {
  currentDate.setMonth(currentDate.getMonth() + delta);
  renderCalendar();
};

/**
 * 특정 월의 휴무 데이터 가져오기
 */
async function getHolidaysForMonth(year, month) {
  try {
    const startOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;
    
    const q = query(collection(db, 'holidays'));
    const querySnapshot = await getDocs(q);
    
    const holidays = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // 휴무가 해당 월과 겹치는지 확인
      if (data.endDate >= startOfMonth && data.startDate <= endOfMonth) {
        holidays.push({
          id: doc.id,
          ...data
        });
      }
    });
    
    return holidays;
  } catch (error) {
    console.error('❌ 휴무 데이터 조회 오류:', error);
    return [];
  }
}

/**
 * 휴무 목록 로드
 */
async function loadHolidayList() {
  const holidayItems = document.getElementById('holiday-items');
  if (!holidayItems) return;
  
  holidayItems.innerHTML = '<div class="loading-placeholder"><div class="spinner-modern"></div><p>로딩 중...</p></div>';
  
  try {
    const q = query(collection(db, 'holidays'), orderBy('startDate', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const holidays = [];
    querySnapshot.forEach((doc) => {
      holidays.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    if (holidays.length === 0) {
      holidayItems.innerHTML = '<div class="empty-state"><p>등록된 휴무가 없습니다.</p></div>';
      return;
    }
    
    let html = '';
    holidays.forEach(holiday => {
      const isUpcoming = new Date(holiday.startDate) > new Date();
      const isPast = new Date(holiday.endDate) < new Date();
      const days = calculateDays(holiday.startDate, holiday.endDate);
      
      // createdAt 안전하게 처리
      let createdDate = '-';
      if (holiday.createdAt) {
        try {
          if (typeof holiday.createdAt.toDate === 'function') {
            createdDate = holiday.createdAt.toDate().toLocaleDateString();
          } else if (holiday.createdAt instanceof Date) {
            createdDate = holiday.createdAt.toLocaleDateString();
          } else if (typeof holiday.createdAt === 'string') {
            createdDate = new Date(holiday.createdAt).toLocaleDateString();
          }
        } catch (e) {
          console.warn('createdAt 변환 실패:', e);
        }
      }
      
      html += `
        <div class="holiday-item ${isPast ? 'past' : ''}">
          <div class="holiday-main">
            <div class="holiday-date">
              <span class="date">${holiday.startDate} ~ ${holiday.endDate}</span>
              <span class="badge">${days}일</span>
            </div>
            <div class="holiday-employee">${holiday.employeeName}</div>
          </div>
          ${holiday.reason ? `<div class="holiday-reason">${holiday.reason}</div>` : ''}
          <div class="holiday-footer">
            <span class="holiday-meta">등록: ${createdDate}</span>
            <div class="holiday-actions">
              <button class="edit-holiday-btn" onclick="window.openHolidayEditModal('${holiday.id}')">
                ✏️ 수정
              </button>
              <button class="delete-holiday-btn" onclick="window.deleteHoliday('${holiday.id}', '${holiday.employeeName}')">
                🗑️ 삭제
              </button>
            </div>
          </div>
        </div>
      `;
    });
    
    holidayItems.innerHTML = html;
    
  } catch (error) {
    console.error('❌ 휴무 목록 로드 오류:', error);
    holidayItems.innerHTML = '<div class="error-placeholder"><p>휴무 목록을 불러오는 중 오류가 발생했습니다.</p></div>';
  }
}

/**
 * 직원 선택 옵션 로드
 */
async function loadEmployeeSelectOptions() {
  const select = document.getElementById('holiday-employee');
  if (!select) return;
  
  try {
    const q = query(collection(db, 'users'), where('isActive', '==', true));
    const querySnapshot = await getDocs(q);
    
    let options = '<option value="">선택하세요</option>';
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      options += `<option value="${doc.id}" data-name="${data.name}">${data.name} (${data.email})</option>`;
    });
    
    select.innerHTML = options;
  } catch (error) {
    console.error('❌ 직원 목록 조회 오류:', error);
  }
}

/**
 * 휴무 등록 모달 열기
 */
window.openHolidayModal = function() {
  const modal = document.getElementById('holiday-modal');
  const modalTitle = modal.querySelector('.modal-header h4');
  const saveBtn = modal.querySelector('.btn-save');
  
  if (modal) {
    // 등록 모드 설정
    modal.dataset.mode = 'create';
    modal.dataset.holidayId = '';
    
    if (modalTitle) modalTitle.textContent = '휴무 등록';
    if (saveBtn) saveBtn.textContent = '등록';
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // 오늘 날짜로 초기화
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('holiday-start-date').value = today;
    document.getElementById('holiday-end-date').value = today;
    document.getElementById('holiday-employee').value = '';
    document.getElementById('holiday-reason').value = '';
  }
};

/**
 * 휴무 수정 모달 열기
 */
window.openHolidayEditModal = async function(holidayId) {
  const modal = document.getElementById('holiday-modal');
  const modalTitle = modal.querySelector('.modal-header h4');
  const saveBtn = modal.querySelector('.btn-save');
  
  if (!modal) return;
  
  try {
    // 휴무 데이터 가져오기
    const q = query(collection(db, 'holidays'));
    const querySnapshot = await getDocs(q);
    
    let holiday = null;
    querySnapshot.forEach((doc) => {
      if (doc.id === holidayId) {
        holiday = { id: doc.id, ...doc.data() };
      }
    });
    
    if (!holiday) {
      alert('휴무 정보를 찾을 수 없습니다.');
      return;
    }
    
    // 수정 모드 설정
    modal.dataset.mode = 'edit';
    modal.dataset.holidayId = holidayId;
    
    if (modalTitle) modalTitle.textContent = '휴무 수정';
    if (saveBtn) saveBtn.textContent = '수정';
    
    // 폼에 데이터 채우기
    document.getElementById('holiday-start-date').value = holiday.startDate || '';
    document.getElementById('holiday-end-date').value = holiday.endDate || '';
    document.getElementById('holiday-reason').value = holiday.reason || '';
    
    // 직원 선택
    const employeeSelect = document.getElementById('holiday-employee');
    if (employeeSelect) {
      // employeeId로 찾기
      for (let i = 0; i < employeeSelect.options.length; i++) {
        if (employeeSelect.options[i].value === holiday.employeeId) {
          employeeSelect.selectedIndex = i;
          break;
        }
      }
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
  } catch (error) {
    console.error('❌ 휴무 데이터 로드 오류:', error);
    alert('휴무 정보를 불러오는 중 오류가 발생했습니다.');
  }
};

/**
 * 휴무 등록 모달 닫기
 */
window.closeHolidayModal = function() {
  const modal = document.getElementById('holiday-modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    document.getElementById('holiday-form').reset();
  }
};

/**
 * 휴무 저장 (등록/수정)
 */
window.saveHoliday = async function() {
  const modal = document.getElementById('holiday-modal');
  const mode = modal.dataset.mode || 'create';
  const holidayId = modal.dataset.holidayId || '';
  
  const employeeSelect = document.getElementById('holiday-employee');
  const startDate = document.getElementById('holiday-start-date').value;
  const endDate = document.getElementById('holiday-end-date').value;
  const reason = document.getElementById('holiday-reason').value.trim();
  
  // 유효성 검증
  if (!employeeSelect.value) {
    alert('휴무 대상자를 선택해주세요.');
    return;
  }
  
  if (!startDate || !endDate) {
    alert('휴무 기간을 입력해주세요.');
    return;
  }
  
  if (new Date(startDate) > new Date(endDate)) {
    alert('종료일은 시작일보다 이후여야 합니다.');
    return;
  }
  
  const employeeId = employeeSelect.value;
  const employeeName = employeeSelect.options[employeeSelect.selectedIndex].dataset.name;
  
  // 저장 버튼 비활성화
  const saveBtn = document.querySelector('.btn-save');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = mode === 'edit' ? '수정 중...' : '저장 중...';
  }
  
  try {
    const currentUser = window.getCurrentUserInfo();
    
    if (mode === 'edit') {
      // 수정 모드
      const docRef = doc(db, 'holidays', holidayId);
      await updateDoc(docRef, {
        employeeId: employeeId,
        employeeName: employeeName,
        startDate: startDate,
        endDate: endDate,
        reason: reason || ''
      });
      
      alert('✅ 휴무가 수정되었습니다.');
    } else {
      // 등록 모드
      await addDoc(collection(db, 'holidays'), {
        employeeId: employeeId,
        employeeName: employeeName,
        startDate: startDate,
        endDate: endDate,
        reason: reason || '',
        createdAt: Timestamp.now(),
        createdBy: currentUser?.email || ''
      });
      
      alert('✅ 휴무가 등록되었습니다.');
    }
    
    // 모달 닫기
    window.closeHolidayModal();
    
    // 목록 새로고침
    await renderCalendar();
    await loadHolidayList();
    
  } catch (error) {
    console.error(`❌ 휴무 ${mode === 'edit' ? '수정' : '등록'} 오류:`, error);
    alert(`휴무 ${mode === 'edit' ? '수정' : '등록'} 중 오류가 발생했습니다: ` + error.message);
    
    // 버튼 복구
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = mode === 'edit' ? '수정' : '등록';
    }
  }
};

/**
 * 휴무 삭제
 */
window.deleteHoliday = async function(holidayId, employeeName) {
  if (!confirm(`"${employeeName}"의 휴무를 삭제하시겠습니까?`)) {
    return;
  }
  
  try {
    await deleteDoc(doc(db, 'holidays', holidayId));
    
    alert('✅ 휴무가 삭제되었습니다.');
    
    // 목록 새로고침
    await renderCalendar();
    await loadHolidayList();
    
  } catch (error) {
    console.error('❌ 휴무 삭제 오류:', error);
    alert('휴무 삭제 중 오류가 발생했습니다: ' + error.message);
  }
};

/**
 * 날짜가 범위 안에 있는지 확인
 */
function isDateInRange(date, startDate, endDate) {
  return date >= startDate && date <= endDate;
}

/**
 * 두 날짜가 같은지 확인
 */
function isSameDate(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

/**
 * 날짜 차이 계산
 */
function calculateDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  return diff;
}

/**
 * 스타일 추가
 */
function addHolidayManagementStyles() {
  if (document.getElementById('holiday-management-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'holiday-management-styles';
  style.textContent = `
    /* 휴무관리 */
    .holiday-management {
      display: flex;
      flex-direction: column;
      gap: 30px;
    }
    
    /* 달력 */
    .holiday-calendar {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    
    .calendar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .calendar-header h5 {
      margin: 0;
      font-size: 1.3rem;
      color: #333;
    }
    
    .calendar-nav-btn {
      background: #f5f5f5;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      font-size: 18px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .calendar-nav-btn:hover {
      background: #667eea;
      color: white;
    }
    
    .calendar-weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 5px;
      margin-bottom: 10px;
    }
    
    .calendar-weekday {
      text-align: center;
      font-weight: 600;
      color: #666;
      padding: 10px;
      font-size: 14px;
    }
    
    .calendar-weekday.sun {
      color: #e74c3c;
    }
    
    .calendar-weekday.sat {
      color: #3498db;
    }
    
    .calendar-days {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 5px;
    }
    
    .calendar-day {
      min-height: 80px;
      padding: 8px;
      background: #f8f9fa;
      border-radius: 8px;
      position: relative;
      transition: all 0.2s ease;
    }
    
    .calendar-day.empty {
      background: transparent;
    }
    
    .calendar-day.today {
      background: #e3f2fd;
      border: 2px solid #2196f3;
    }
    
    .calendar-day.sun .date-number {
      color: #e74c3c;
    }
    
    .calendar-day.sat .date-number {
      color: #3498db;
    }
    
    .calendar-day.has-holiday {
      background: #fff3e0;
    }
    
    .date-number {
      font-weight: 600;
      color: #333;
      margin-bottom: 5px;
    }
    
    .holiday-badges {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    
    .holiday-badge {
      background: #667eea;
      color: white;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      text-align: center;
      font-weight: 600;
    }
    
    .holiday-badge.more {
      background: #999;
    }
    
    /* 휴무 목록 */
    .holiday-list {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    
    .holiday-list h5 {
      margin: 0 0 20px 0;
      font-size: 1.2rem;
      color: #333;
    }
    
    .holiday-item {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 15px;
      margin-bottom: 15px;
      border-left: 4px solid #667eea;
      transition: all 0.2s ease;
    }
    
    .holiday-item:hover {
      transform: translateX(5px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    
    .holiday-item.past {
      opacity: 0.6;
      border-left-color: #999;
    }
    
    .holiday-main {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    
    .holiday-date {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .holiday-date .date {
      font-weight: 600;
      color: #333;
    }
    
    .holiday-date .badge {
      background: #667eea;
      color: white;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .holiday-employee {
      font-weight: 600;
      color: #667eea;
      background: #e3f2fd;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 14px;
    }
    
    .holiday-reason {
      color: #666;
      margin-bottom: 10px;
      padding: 8px;
      background: white;
      border-radius: 6px;
      font-size: 14px;
    }
    
    .holiday-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .holiday-meta {
      font-size: 12px;
      color: #999;
    }
    
    .holiday-actions {
      display: flex;
      gap: 8px;
    }
    
    .edit-holiday-btn,
    .delete-holiday-btn {
      background: #e3f2fd;
      color: #1976d2;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .edit-holiday-btn:hover {
      background: #1976d2;
      color: white;
      transform: translateY(-2px);
    }
    
    .delete-holiday-btn {
      background: #ffebee;
      color: #c62828;
    }
    
    .delete-holiday-btn:hover {
      background: #c62828;
      color: white;
      transform: translateY(-2px);
    }
    
    /* 폼 */
    .form-group textarea {
      width: 100%;
      padding: 12px 15px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 15px;
      font-family: inherit;
      resize: vertical;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }
    
    .form-group textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    
    /* 모바일 반응형 */
    @media (max-width: 768px) {
      .calendar-day {
        min-height: 60px;
        padding: 5px;
        font-size: 12px;
      }
      
      .date-number {
        font-size: 13px;
      }
      
      .holiday-badge {
        font-size: 10px;
        padding: 2px 4px;
      }
      
      .holiday-main {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }
      
      .holiday-footer {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }
      
      .holiday-actions {
        width: 100%;
      }
      
      .edit-holiday-btn,
      .delete-holiday-btn {
        flex: 1;
      }
      
      .calendar-header {
        flex-wrap: wrap;
        gap: 10px;
      }
    }
  `;
  
  document.head.appendChild(style);
}
