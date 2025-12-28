// scripts/templates/task-templates.js - 검색어 입력 기능 추가 + 날짜 필터 반응형 개선 + 팀 작업 지원

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

// 주소를 지도 검색용으로 정리하는 함수
function cleanAddressForMap(address) {
  if (!address || !address.trim()) {
    return '';
  }
  
  let cleanAddress = address.trim();
  
  // 하이픈이나 슬래시로 구분된 동호수 패턴 제거
  // 예: 101-1001, 101/1001, A-501, B/301 등
  cleanAddress = cleanAddress.replace(/\s+[0-9A-Za-z가-힣]+[-\/][0-9A-Za-z가-힣]+/g, '');
  
  // 기존 동호수 패턴 제거 (더 정확한 패턴)
  // 예: 101동 1001호, 1동 101호, A동 1호, 가동 나호 등
  cleanAddress = cleanAddress.replace(/\s+[0-9A-Za-z가-힣]+동\s+[0-9A-Za-z가-힣]+호/g, '');
  
  // 동만 있는 경우 (예: 101동, A동)
  cleanAddress = cleanAddress.replace(/\s+[0-9A-Za-z가-힣]+동/g, '');
  
  // 호수만 있는 경우 (예: 1001호, 101호)
  cleanAddress = cleanAddress.replace(/\s+[0-9A-Za-z가-힣]+호/g, '');
  
  // 층수 정보 제거 (예: 10층, B1층)
  cleanAddress = cleanAddress.replace(/\s+[B0-9]+층/g, '');
  
  // 상세 주소 정보 제거 (괄호 안 내용)
  cleanAddress = cleanAddress.replace(/\s*\([^)]*\)/g, '');
  
  // 연속된 공백을 하나로 정리
  cleanAddress = cleanAddress.replace(/\s+/g, ' ').trim();
  
  return cleanAddress;
}

// 주소를 지도 링크로 변환하는 함수 (T맵 우선, 폴백: 카카오맵)
function formatAddressLink(address) {
  if (!address || !address.trim()) {
    return '';
  }
  
  // 지도 검색용으로 주소 정리
  const cleanAddress = cleanAddressForMap(address);
  const encodedAddress = encodeURIComponent(cleanAddress);
  
  // 모바일 감지
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  
  if (isMobile) {
    // 모바일: T맵 시도 → 실패시 카카오맵
    const tmapUrl = `tmap://search?name=${encodedAddress}`;
    const kakaoMapUrl = `https://map.kakao.com/link/search/${encodedAddress}`;
    
    return `<a href="${tmapUrl}" class="address-link" onclick="event.stopPropagation(); handleMapLink(event, '${kakaoMapUrl}');" title="지도에서 보기: ${cleanAddress}">${address}</a>`;
  } else {
    // 웹: 바로 카카오맵 (T맵은 웹에서 지원 안함)
    const kakaoMapUrl = `https://map.kakao.com/link/search/${encodedAddress}`;
    
    return `<a href="${kakaoMapUrl}" class="address-link" onclick="event.stopPropagation();" target="_blank" title="지도에서 보기: ${cleanAddress}">${address}</a>`;
  }
}

// 지도 링크 처리 함수 (T맵 실패시 카카오맵으로 폴백)
function handleMapLink(event, fallbackUrl) {
  // T맵이 열리지 않을 경우를 대비한 폴백 처리 (모바일만)
  setTimeout(() => {
    // T맵 앱이 설치되지 않았거나 열리지 않으면 카카오맵으로
    if (document.hasFocus()) {
      window.location.href = fallbackUrl;
    }
  }, 1500); // T맵은 1.5초로 단축
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
      
      .address-link {
        color: #28a745 !important;
        text-decoration: none;
        font-weight: 600;
        border-bottom: 1px dotted #28a745;
        transition: all 0.2s ease;
        cursor: pointer;
      }
      
      .address-link:hover {
        color: #1e7e34 !important;
        border-bottom-style: solid;
        background-color: rgba(40, 167, 69, 0.1);
        padding: 2px 4px;
        border-radius: 4px;
      }
      
      .address-link:active {
        background-color: rgba(40, 167, 69, 0.2);
      }
      
      /* 모바일에서 터치 피드백 */
      @media (max-width: 768px) {
        .phone-link, .address-link {
          padding: 4px 6px;
          border-radius: 4px;
          border-bottom: none;
          display: inline-block;
          min-height: 44px;
          line-height: 36px;
        }
        
        .phone-link {
          background-color: rgba(33, 158, 188, 0.05);
        }
        
        .address-link {
          background-color: rgba(40, 167, 69, 0.05);
        }
        
        .phone-link:active {
          background-color: rgba(33, 158, 188, 0.2);
          transform: scale(0.98);
        }
        
        .address-link:active {
          background-color: rgba(40, 167, 69, 0.2);
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
        <div id="worker-checkboxes-container" style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
          <!-- Settings > 직원관리에서 동적 로드 -->
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
      
      <input type="text" name="amount" id="amount-input" placeholder="금액">
      
      <!-- 수수료 필드 추가 (비고 바로 위) -->
      <input type="text" name="fee" id="fee-input" placeholder="수수료" readonly>
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

// 🔍 예약작업 탭 HTML (검색어 입력 추가)
export function getReserveTabHTML() {
  const tomorrowStr = getTomorrowString();
  
  return `
    <!-- 개선된 검색 필터 -->
    <div class="search-filter-container" style="
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      margin-bottom: 20px;
      padding: 20px;
    ">
      <h4 style="margin: 0 0 15px 0; color: #333; font-size: 1rem;">🔍 예약작업 검색</h4>
      
      <!-- 검색어 입력 -->
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #555;">검색어</label>
        <input type="text" id="reserve-search-keyword" placeholder="고객명, 주소, 연락처, 작업내용 등을 입력하세요..." style="
          width: 100%;
          padding: 10px 12px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s ease;
        " onkeypress="if(event.key==='Enter') searchReserveTasksEnhanced()">
      </div>
      
      <!-- 날짜 범위 -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto auto; gap: 10px; align-items: end;">
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #555;">시작날짜</label>
          <input type="date" id="reserve-start-date" value="${tomorrowStr}" style="
            width: 100%;
            padding: 10px 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
          ">
        </div>
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #555;">종료날짜</label>
          <input type="date" id="reserve-end-date" value="${tomorrowStr}" style="
            width: 100%;
            padding: 10px 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
          ">
        </div>
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #555;">정렬</label>
          <select id="reserve-sort-order" style="
            width: 100%;
            padding: 10px 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            background: white;
          ">
            <option value="date-asc">날짜 빠른순</option>
            <option value="date-desc">날짜 늦은순</option>
            <option value="client-asc">고객명순</option>
            <option value="worker-asc">작업자순</option>
          </select>
        </div>
        <button id="reserve-search-btn" style="
          background: linear-gradient(135deg, #2196f3, #1976d2);
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s ease;
          white-space: nowrap;
        " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
          🔍 검색
        </button>
        <button onclick="resetReserveFilter()" style="
          background: linear-gradient(135deg, #ff9800, #f57c00);
          color: white;
          border: none;
          padding: 12px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s ease;
          white-space: nowrap;
        " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
          🔄 리셋
        </button>
      </div>
      
      <!-- 검색 결과 요약 -->
      <div id="reserve-search-summary" style="
        margin-top: 15px;
        padding: 10px 12px;
        background: #f8f9fa;
        border-radius: 6px;
        font-size: 14px;
        color: #666;
        display: none;
      "></div>
    </div>
    
    <style>
      @media (max-width: 768px) {
        .search-filter-container > div:nth-child(3) {
          grid-template-columns: 1fr !important;
          gap: 15px !important;
        }
        
        .search-filter-container > div:nth-child(3) > div {
          grid-column: 1 / -1;
        }
        
        .search-filter-container > div:nth-child(3) > button {
          width: 100%;
          margin: 5px 0;
        }
      }
    </style>
    
    ${getTaskListHTML()}
  `;
}

// 🔍 완료작업 탭 HTML (검색어 입력 추가)
export function getDoneTabHTML() {
  const todayStr = getTodayString();
  
  return `
    ${getTaskSubTabsHTML('done')}
    
    <!-- 개선된 검색 필터 -->
    <div class="search-filter-container" style="
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      margin-bottom: 20px;
      padding: 20px;
    ">
      <h4 style="margin: 0 0 15px 0; color: #333; font-size: 1rem;">🔍 완료작업 검색</h4>
      
      <!-- 검색어 입력 -->
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #555;">검색어</label>
        <input type="text" id="done-search-keyword" placeholder="고객명, 주소, 연락처, 작업내용 등을 입력하세요..." style="
          width: 100%;
          padding: 10px 12px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s ease;
        " onkeypress="if(event.key==='Enter') searchDoneTasksEnhanced()">
      </div>
      
      <!-- 날짜 범위 -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto auto; gap: 10px; align-items: end;">
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #555;">시작날짜</label>
          <input type="date" id="done-start-date" value="${todayStr}" style="
            width: 100%;
            padding: 10px 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
          ">
        </div>
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #555;">종료날짜</label>
          <input type="date" id="done-end-date" value="${todayStr}" style="
            width: 100%;
            padding: 10px 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
          ">
        </div>
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #555;">정렬</label>
          <select id="done-sort-order" style="
            width: 100%;
            padding: 10px 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            background: white;
          ">
            <option value="date-desc">최신순</option>
            <option value="date-asc">과거순</option>
            <option value="client-asc">고객명순</option>
            <option value="worker-asc">작업자순</option>
          </select>
        </div>
        <button id="done-search-btn" style="
          background: linear-gradient(135deg, #4caf50, #45a049);
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s ease;
          white-space: nowrap;
        " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
          🔍 검색
        </button>
        <button onclick="resetDoneFilter()" style="
          background: linear-gradient(135deg, #ff9800, #f57c00);
          color: white;
          border: none;
          padding: 12px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s ease;
          white-space: nowrap;
        " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
          🔄 리셋
        </button>
      </div>
      
      <!-- 검색 결과 요약 -->
      <div id="done-search-summary" style="
        margin-top: 15px;
        padding: 10px 12px;
        background: #f8f9fa;
        border-radius: 6px;
        font-size: 14px;
        color: #666;
        display: none;
      "></div>
    </div>
    
    <style>
      @media (max-width: 768px) {
        .search-filter-container > div:nth-child(3) {
          grid-template-columns: 1fr !important;
          gap: 15px !important;
        }
        
        .search-filter-container > div:nth-child(3) > div {
          grid-column: 1 / -1;
        }
        
        .search-filter-container > div:nth-child(3) > button {
          width: 100%;
          margin: 5px 0;
        }
      }
    </style>
    
    ${getTaskListHTML()}
  `;
}

// 🔥 수정된 작업 아이템 HTML (팀 작업 지원 - 팀장/팀원 색상 구분)
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
  
  // 🔥 팀 작업 배지 및 CSS 클래스 생성
  let teamBadge = '';
  let teamClass = '';
  if (task.isTeamWork) {
    if (task.isTeamLeader) {
      teamBadge = '<span class="team-badge leader">👑 팀장</span>';
      teamClass = 'team-leader';
    } else {
      teamBadge = '<span class="team-badge member">👥 팀원</span>';
      teamClass = 'team-member';
    }
  }
  
  // 모바일과 데스크탑 감지
  const isMobile = window.innerWidth <= 768;
  
  if (isMobile) {
    // 모바일용 한 줄 레이아웃 (팀장/팀원 색상 구분)
    return `
      <div class="task-item ${task.isTeamWork ? `team-work ${teamClass}` : ''}">
        <div class="task-summary" onclick="toggleTaskDetail('${id}')">
          <div class="task-summary-mobile">
            <div class="task-date-mobile">
              ${dateStr}
              ${teamBadge}
            </div>
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
          ${task.removeAddress ? `<div><strong>철거:</strong> ${formatAddressLink(task.removeAddress)}</div>` : ''}
          <div><strong>설치:</strong> ${formatAddressLink(task.installAddress)}</div>
          <div><strong>연락처:</strong> ${formatPhoneLink(task.contact)}</div>
          <div><strong>작업구분:</strong> ${task.taskType || ''}</div>
          <div><strong>금액:</strong> ${parseInt(task.amount || 0).toLocaleString()}원</div>
          ${task.fee ? `<div><strong>수수료:</strong> ${parseInt(task.fee).toLocaleString()}원</div>` : ''}
          ${partsDisplay ? `<div><strong>부품:</strong> ${partsDisplay}</div>` : ''}
          ${task.note ? `<div><strong>비고:</strong> ${task.note}</div>` : ''}
          <div class="agreement-status-container" data-task-id="${id}">
            ${window.getAgreementStatusHTML ? window.getAgreementStatusHTML(task) : ''}
          </div>
          <div class="task-actions">
            ${tabType === 'today' ? `<button onclick="completeTask('${id}')" style="background:#28a745 !important;">완료</button>` : ''}
            <button onclick="editTask('${id}', '${tabType}')" style="background:#ffc107 !important;color:#333 !important;">수정</button>
            <button onclick="deleteTask('${id}', '${tabType}')" style="background:#dc3545 !important;">삭제</button>
          </div>
        </div>
      </div>
    `;
  } else {
    // 데스크탑용 기존 레이아웃 (팀장/팀원 색상 구분)
    return `
      <div class="task-item ${task.isTeamWork ? `team-work ${teamClass}` : ''}">
        <div class="task-summary" onclick="toggleTaskDetail('${id}')">
          <div class="col-date">${dateStr}${teamBadge}</div>
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
          <div class="agreement-status-container" data-task-id="${id}">
            ${window.getAgreementStatusHTML ? window.getAgreementStatusHTML(task) : ''}
          </div>
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

// 동의 상태 HTML 생성 함수
window.getAgreementStatusHTML = function(task) {
  const status = task.agreementStatus || 'none';
  
  let html = '<div style="display:flex;align-items:center;gap:8px;margin-top:8px;">';
  
  if (status === 'completed') {
    // 동의완료 - 초록 배경
    html += `
      <div style="
        background:#4caf50;
        color:white;
        padding:8px 14px;
        border-radius:6px;
        font-size:16px;
        font-weight:bold;
        display:inline-block;
        white-space:nowrap;
      ">
        동의완료 ✓
      </div>
    `;
  } else {
    // 동의대기 - 핑크 배경
    html += `
      <div style="
        background:#ffebee;
        color:#d32f2f;
        padding:8px 14px;
        border-radius:6px;
        font-size:16px;
        font-weight:bold;
        display:inline-block;
        border:2px solid #ef5350;
        white-space:nowrap;
      ">
        동의대기 !
      </div>
    `;
    
    // 동의 버튼 - 인디고 블루
    html += `
      <button 
        onclick="showAgreementModal('${task.id}')"
        style="
          background:#5c6bc0;
          color:white;
          padding:8px 14px;
          border:none;
          border-radius:6px;
          font-size:16px;
          font-weight:bold;
          cursor:pointer;
          white-space:nowrap;
        ">
        동의받기
      </button>
    `;
  }
  
  // 새로고침 버튼 - 배경 제거
  html += `
    <button 
      onclick="refreshSingleTask('${task.id}')"
      style="
        background:transparent;
        color:#666;
        padding:8px;
        border:none;
        outline:none;
        border-radius:50%;
        font-size:20px;
        cursor:pointer;
        width:36px;
        height:36px;
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow:none;
      "
      title="상태 새로고침">
      🔄
    </button>
  `;
  
  html += '</div>';
  
  return html;
};

// 개별 작업 새로고침 함수 (강력 새로고침)
window.refreshSingleTask = function(taskId) {
  console.log('🔄 강력 새로고침 시작');
  
  try {
    // 1. 현재 탭 정보 저장 (localStorage 사용)
    if (window.localStorage) {
      window.localStorage.setItem('returnToTab', 'today');
    }
    
    // 2. 모든 캐시 삭제
    if (window.sessionStorage) {
      window.sessionStorage.clear();
      console.log('✅ SessionStorage 완전 삭제');
    }
    
    if (window.localStorage) {
      // tasks 관련 캐시만 삭제
      const keysToRemove = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.includes('tasks') && key !== 'returnToTab') {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => window.localStorage.removeItem(key));
      console.log('✅ LocalStorage tasks 삭제');
    }
    
    // 3. 강제 새로고침 (캐시 무시)
    window.location.reload(true);
    
  } catch (error) {
    console.error('새로고침 오류:', error);
    // 오류 시에도 강제 새로고침
    window.location.reload(true);
  }
};

// 전역 함수 등록
window.formatDate = formatKoreanDate;
window.formatPartsForDisplay = formatPartsForDisplay;
window.formatPhoneLink = formatPhoneLink;
window.formatAddressLink = formatAddressLink;
window.handleMapLink = handleMapLink;
window.cleanAddressForMap = cleanAddressForMap;

// 페이지 로드 시 탭 자동 복원
document.addEventListener('DOMContentLoaded', function() {
  if (window.localStorage) {
    const returnToTab = window.localStorage.getItem('returnToTab');
    if (returnToTab === 'today') {
      console.log('🔄 오늘작업 탭으로 자동 복원');
      
      // returnToTab 플래그 제거
      window.localStorage.removeItem('returnToTab');
      
      // 약간의 딜레이 후 오늘작업 탭 클릭
      setTimeout(function() {
        // 작업지시 탭 먼저 클릭
        const taskTab = document.querySelector('[onclick="showTab(\'tasks\')"]');
        if (taskTab) {
          taskTab.click();
          
          // 그 다음 오늘작업 서브탭 클릭
          setTimeout(function() {
            const todayTab = document.querySelector('[onclick="showTaskTab(\'check\')"]');
            if (todayTab) {
              todayTab.click();
              console.log('✅ 오늘작업 탭 복원 완료');
            }
          }, 100);
        }
      }, 300);
    }
  }
});