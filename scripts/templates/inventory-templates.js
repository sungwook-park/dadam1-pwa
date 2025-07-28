// 4. 입출고 내역 HTML (기존과 동일)
export function getInventoryHistoryHTML(historyData) {
  const today = new Date().toISOString().split('T')[0];
  
  // 검색 헤더는 항상 표시
  const searchHeader = `
    <div class="history-container">
      <div class="history-header">
        <h3>📋 입출고 내역</h3>
        <div class="history-actions">
          <button onclick="getMonthlyInventorySummary()" class="summary-btn">📊 월별 요약</button>
          <button onclick="exportHistory()" class="export-btn" ${historyData.length === 0 ? 'disabled' : ''}>📊 Excel 내보내기</button>
        </div>
      </div>
      
      <div class="date-search-section">
        <div class="search-header">
          <h4>🔍 기간별 검색</h4>
          <div class="search-controls">
            <input type="date" id="history-start-date" value="${today}" class="date-input">
            <span class="date-separator">~</span>
            <input type="date" id="history-end-date" value="${today}" class="date-input">
            <button onclick="searchHistoryByRange()" class="search-btn">🔍 검색</button>
          </div>
        </div>
      </div>
  `;
  
  // 검색 결과가 없으면 안내 메시지 표시
  if (!historyData || historyData.length === 0) {
    return searchHeader + `
      <div class="history-content">
        <div class="no-data">
          📅 기간을 선택하고 검색 버튼을 클릭해주세요.<br>
          선택한 기간의 입출고 내역을 확인할 수 있습니다.
        </div>
      </div>
    </div>`;
  }
  
  // 통계 계산
  const inboundData = historyData.filter(item => item.type === 'in');
  const outboundData = historyData.filter(item => item.type === 'out');
  const workOutboundData = outboundData.filter(item => item.reason === '작업사용');
  const directOutboundData = outboundData.filter(item => item.reason !== '작업사용');
  
  const inboundTotal = inboundData.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  const workOutboundTotal = workOutboundData.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  const directOutboundTotal = directOutboundData.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  const totalOutbound = workOutboundTotal + directOutboundTotal;
  
  // 테이블 데이터 생성
  const historyRows = historyData.map(item => {
    const date = new Date(item.date).toLocaleDateString();
    const type = item.type === 'in' ? '입고' : '출고';
    const typeClass = item.type === 'in' ? 'inbound' : 'outbound';
    const amountDisplay = item.type === 'in' ? 
      `+${(item.totalAmount || 0).toLocaleString()}원` :
      `-${(item.totalAmount || 0).toLocaleString()}원`;
    
    // 출고 유형별 구분 표시
    let reasonDisplay = item.reason || '';
    if (item.type === 'out') {
      if (item.reason === '작업사용') {
        reasonDisplay += ' 💼';
      } else {
        reasonDisplay += ' 🚚';
      }
    }
    
    return `
      <tr class="history-row ${typeClass}">
        <td class="history-date">${date}</td>
        <td class="history-type">
          <span class="type-badge ${typeClass}">${item.type === 'in' ? '📥' : '📤'} ${type}</span>
        </td>
        <td class="history-part">${item.partName}</td>
        <td class="history-quantity">${item.quantity}개</td>
        <td class="history-price">${(item.unitPrice || 0).toLocaleString()}원</td>
        <td class="history-amount ${typeClass}">${amountDisplay}</td>
        <td class="history-reason">${reasonDisplay}</td>
        <td class="history-worker">${item.worker || ''}</td>
        <td class="history-note">${item.note || ''}</td>
      </tr>
    `;
  }).join('');
  
  return searchHeader + `
    <div class="history-content">
      <!-- 검색 결과 요약 -->
      <div class="search-summary">
        <div class="summary-stats">
          <div class="stat-item inbound">
            <div class="stat-label">📥 입고</div>
            <div class="stat-value">${inboundData.length}건 / +${inboundTotal.toLocaleString()}원</div>
          </div>
          <div class="stat-item outbound work">
            <div class="stat-label">📤 작업출고 💼</div>
            <div class="stat-value">${workOutboundData.length}건 / -${workOutboundTotal.toLocaleString()}원</div>
            <div class="stat-sub">(정산 반영)</div>
          </div>
          <div class="stat-item outbound direct">
            <div class="stat-label">📤 직접출고 🚚</div>
            <div class="stat-value">${directOutboundData.length}건 / -${directOutboundTotal.toLocaleString()}원</div>
            <div class="stat-sub">(정산 제외)</div>
          </div>
          <div class="stat-item total">
            <div class="stat-label">💰 순변동</div>
            <div class="stat-value">${(inboundTotal - totalOutbound).toLocaleString()}원</div>
          </div>
        </div>
      </div>
      
      <!-- 입출고 내역 테이블 -->
      <div class="history-table-container">
        <table class="history-table">
          <thead>
            <tr>
              <th>날짜</th>
              <th>구분</th>
              <th>부품명</th>
              <th>수량</th>
              <th>단가</th>
              <th>총액</th>
              <th>사유</th>
              <th>처리자</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            ${historyRows}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  
  <style>
    .history-container {
      padding: 25px;
    }
    
    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 2px solid #e6e6e6;
    }
    
    .history-header h3 {
      margin: 0;
      color: #333;
      font-size: 1.3rem;
    }
    
    .history-actions {
      display: flex;
      gap: 10px;
    }
    
    .summary-btn, .export-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 13px;
    }
    
    .summary-btn {
      background: #6c757d;
      color: white;
    }
    
    .export-btn {
      background: #219ebc;
      color: white;
    }
    
    .export-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    
    .summary-btn:hover:not(:disabled),
    .export-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    
    .date-search-section {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 25px;
      border-left: 4px solid #219ebc;
    }
    
    .search-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 15px;
    }
    
    .search-header h4 {
      margin: 0;
      color: #219ebc;
      font-size: 1.1rem;
    }
    
    .search-controls {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    
    .date-input {
      padding: 8px 12px;
      border: 2px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      min-width: 140px;
    }
    
    .date-input:focus {
      outline: none;
      border-color: #8ecae6;
    }
    
    .date-separator {
      font-weight: 600;
      color: #666;
      margin: 0 5px;
    }
    
    .search-btn {
      background: #219ebc;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 14px;
      white-space: nowrap;
    }
    
    .search-btn:hover {
      background: #1a7a96;
      transform: translateY(-1px);
    }
    
    .search-summary {
      background: white;
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 20px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    
    .summary-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 15px;
    }
    
    .stat-item {
      text-align: center;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #ddd;
    }
    
    .stat-item.inbound {
      background: #e8f5e9;
      border-left-color: #28a745;
    }
    
    .stat-item.outbound.work {
      background: #fff3e0;
      border-left-color: #ff9800;
    }
    
    .stat-item.outbound.direct {
      background: #e3f2fd;
      border-left-color: #2196f3;
    }
    
    .stat-item.total {
      background: #f3e5f5;
      border-left-color: #9c27b0;
    }
    
    .stat-label {
      font-size: 13px;
      color: #666;
      margin-bottom: 5px;
      font-weight: 600;
    }
    
    .stat-value {
      font-size: 1.1rem;
      font-weight: 700;
      color: #333;
      margin-bottom: 2px;
    }
    
    .stat-sub {
      font-size: 11px;
      color: #999;
      font-style: italic;
    }
    
    .history-table-container {
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid #e6e6e6;
      background: white;
    }
    
    .history-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    
    .history-table th {
      background: #f8f9fa;
      padding: 12px 8px;
      text-align: center;
      font-weight: 600;
      color: #333;
      border-bottom: 2px solid #e6e6e6;
      white-space: nowrap;
    }
    
    .history-table td {
      padding: 10px 8px;
      text-align: center;
      border-bottom: 1px solid #f1f1f1;
    }
    
    .history-row:hover {
      background: #f8f9fa;
    }
    
    .history-row.inbound:hover {
      background: #e8f5e9;
    }
    
    .history-row.outbound:hover {
      background: #ffebee;
    }
    
    .type-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }
    
    .type-badge.inbound {
      background: #d4edda;
      color: #155724;
    }
    
    .type-badge.outbound {
      background: #f8d7da;
      color: #721c24;
    }
    
    .history-amount.inbound {
      color: #28a745;
      font-weight: 700;
    }
    
    .history-amount.outbound {
      color: #dc3545;
      font-weight: 700;
    }
    
    .history-date {
      font-weight: 600;
      color: #219ebc;
    }
    
    .history-part {
      font-weight: 600;
      color: #333;
    }
    
    .history-reason {
      font-size: 12px;
    }
    
    .history-note {
      max-width: 150px;
      word-break: break-word;
      font-size: 11px;
      color: #666;
    }
    
    .no-data {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 300px;
      color: #666;
      font-style: italic;
      font-size: 16px;
      text-align: center;
      line-height: 1.6;
    }
    
    /* 모바일 반응형 */
    @media (max-width: 768px) {
      .history-container {
        padding: 15px;
      }
      
      .history-header {
        flex-direction: column;
        gap: 15px;
        align-items: stretch;
      }
      
      .history-actions {
        justify-content: space-between;
      }
      
      .summary-btn, .export-btn {
        flex: 1;
        font-size: 12px;
      }
      
      .search-header {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }
      
      .search-controls {
        justify-content: space-between;
        gap: 8px;
      }
      
      .date-input {
        flex: 1;
        min-width: 100px;
        font-size: 13px;
      }
      
      .search-btn {
        min-width: 80px;
        font-size: 13px;
      }
      
      .date-separator {
        display: none;
      }
      
      .summary-stats {
        grid-template-columns: 1fr;
        gap: 10px;
      }
      
      .stat-item {
        padding: 12px;
      }
      
      .history-table-container {
        font-size: 11px;
      }
      
      .history-table th,
      .history-table td {
        padding: 6px 4px;
      }
      
      .history-note {
        max-width: 80px;
        font-size: 10px;
      }
    }
    
    @media (max-width: 480px) {
      .search-controls {
        flex-direction: column;
        gap: 10px;
      }
      
      .date-input, .search-btn {
        width: 100%;
      }
    }
  </style>
  `;
}

// 부품 사용량 표시 포맷팅
function formatPartsDisplay(partsData) {
  if (!partsData || !partsData.trim()) {
    return '<span style="color: #999;">부품 없음</span>';
  }
  
  try {
    // JSON 형태로 저장된 경우
    if (partsData.startsWith('[') || partsData.startsWith('{')) {
      const parsed = JSON.parse(partsData);
      if (Array.isArray(parsed)) {
        return parsed.map(part => 
          `<div class="part-item">${part.name || part}: ${part.quantity || 1}개</div>`
        ).join('');
      }
    }
    
    // 텍스트 형태로 저장된 경우
    const parts = partsData.split(',');
    return parts.map(part => {
      const match = part.trim().match(/^(.+?)[:：]\s*(\d+)\s*개?$/);
      if (match) {
        return `<div class="part-item">${match[1].trim()}: ${match[2]}개</div>`;
      }
      return `<div class="part-item">${part.trim()}</div>`;
    }).join('');
    
  } catch (error) {
    // 파싱 실패 시 원본 반환
    return `<div class="part-item">${partsData}</div>`;
  }
}

// CSS 추가 스타일
const additionalStyles = `
<style>
  /* 입출고 관리 전용 스타일 - 다른 버튼에 영향 주지 않도록 구체적 선택자 사용 */
  .inventory-container .part-item {
    background: #e3f2fd;
    color: #1565c0;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
    margin: 1px 0;
    display: inline-block;
    margin-right: 4px;
  }
  
  /* 입출고 관리 내부 애니메이션만 적용 */
  .inventory-container * {
    transition: all 0.2s ease;
  }
  
  /* 입출고 관리 전용 스크롤바 스타일링 */
  .inventory-container .stock-table-container::-webkit-scrollbar,
  .inventory-container .outbound-table-container::-webkit-scrollbar,
  .inventory-container .history-table-container::-webkit-scrollbar {
    height: 8px;
  }
  
  .inventory-container .stock-table-container::-webkit-scrollbar-track,
  .inventory-container .outbound-table-container::-webkit-scrollbar-track,
  .inventory-container .history-table-container::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  
  .inventory-container .stock-table-container::-webkit-scrollbar-thumb,
  .inventory-container .outbound-table-container::-webkit-scrollbar-thumb,
  .inventory-container .history-table-container::-webkit-scrollbar-thumb {
    background: #2196f3;
    border-radius: 4px;
  }
  
  .inventory-container .stock-table-container::-webkit-scrollbar-thumb:hover,
  .inventory-container .outbound-table-container::-webkit-scrollbar-thumb:hover,
  .inventory-container .history-table-container::-webkit-scrollbar-thumb:hover {
    background: #1976d2;
  }
  
  /* 홈버튼 보호 - 기존 스타일 유지 */
  .main-nav button:not(.inventory-tab-btn):not(.type-btn) {
    /* 홈버튼 원래 스타일 복구 */
  }
</style>
`;

// DOM이 로드된 후 스타일 추가
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('inventory-additional-styles')) {
      const styleElement = document.createElement('div');
      styleElement.id = 'inventory-additional-styles';
      styleElement.innerHTML = additionalStyles;
      document.head.appendChild(styleElement);
    }
  });
}

console.log('📦 입출고 관리 템플릿 모듈 로드 완료 (입출고 통합 등록)');// scripts/templates/inventory-templates.js - 입출고 관리 템플릿 (입출고 통합 등록)

// 메인 입출고 관리 탭 HTML (수정됨)
export function getInventoryTabHTML() {
  return `
    <div class="inventory-container">
      <!-- 서브탭 네비게이션 -->
      <div class="inventory-nav">
        <button id="stock-tab" class="inventory-tab-btn active" onclick="showInventorySubTab('stock')">
          📦 재고현황
        </button>
        <button id="inout-tab" class="inventory-tab-btn" onclick="showInventorySubTab('inout')">
          📝 입출고등록
        </button>
        <button id="out-tab" class="inventory-tab-btn" onclick="showInventorySubTab('out')">
          📤 출고처리
        </button>
        <button id="history-tab" class="inventory-tab-btn" onclick="showInventorySubTab('history')">
          📋 입출고내역
        </button>
      </div>
      
      <!-- 콘텐츠 영역 -->
      <div id="inventory-content" class="inventory-content">
        <div class="loading-message">데이터를 불러오는 중...</div>
      </div>
    </div>
    
    <style>
      .inventory-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }
      
      .inventory-nav {
        display: flex;
        gap: 10px;
        margin-bottom: 25px;
        background: white;
        padding: 15px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        overflow-x: auto;
      }
      
      .inventory-tab-btn {
        padding: 12px 20px;
        border: 2px solid #e6e6e6;
        border-radius: 10px;
        background: #f8f9fa;
        color: #333;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
        min-width: 120px;
        font-size: 14px;
      }
      
      .inventory-tab-btn:hover {
        border-color: #1976d2;
        background: #e3f2fd;
        transform: translateY(-2px);
      }
      
      .inventory-tab-btn.active {
        background: #2196f3;
        color: white;
        border-color: #2196f3;
        box-shadow: 0 4px 12px rgba(33,150,243,0.3);
      }
      
      .inventory-content {
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        min-height: 500px;
      }
      
      .loading-message {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 300px;
        color: #666;
        font-style: italic;
        font-size: 16px;
      }
      
      /* 모바일 반응형 */
      @media (max-width: 768px) {
        .inventory-container {
          padding: 10px;
        }
        
        .inventory-nav {
          padding: 12px;
          gap: 8px;
        }
        
        .inventory-tab-btn {
          min-width: 100px;
          padding: 10px 16px;
          font-size: 13px;
        }
      }
      
      @media (max-width: 480px) {
        .inventory-nav {
          padding: 10px;
          gap: 6px;
        }
        
        .inventory-tab-btn {
          min-width: 90px;
          padding: 8px 12px;
          font-size: 12px;
        }
      }
    </style>
  `;
}

// 2. 입출고 등록 폼 HTML (통합 - 새로 작성)
export function getInOutFormHTML() {
  // 부품 목록 옵션 생성 (PARTS_LIST가 있다면 사용)
  let partOptions = '<option value="">부품 선택</option>';
  if (window.PARTS_LIST && Array.isArray(window.PARTS_LIST)) {
    partOptions += window.PARTS_LIST.map(part => 
      `<option value="${part.name}" data-price="${part.price || 0}">${part.name} (${(part.price || 0).toLocaleString()}원)</option>`
    ).join('');
  }
  partOptions += '<option value="기타">🔧 기타 (직접입력)</option>';
  
  const today = new Date().toISOString().split('T')[0];
  
  return `
    <div class="inout-container">
      <div class="inout-header">
        <h3 id="form-title">📥 입고 등록</h3>
        <button onclick="resetInOutForm()" class="reset-btn">🔄 폼 초기화</button>
      </div>
      
      <!-- 입고/출고 타입 선택 -->
      <div class="type-selector">
        <button class="type-btn active" data-type="in">📥 입고</button>
        <button class="type-btn" data-type="out">📤 출고</button>
      </div>
      
      <form id="inout-form" class="inout-form">
        <input type="hidden" id="inout-type" value="in">
        
        <div class="form-section">
          <h4>📦 부품 정보</h4>
          
          <div class="form-row">
            <div class="form-group">
              <label for="inout-part">부품명 *</label>
              <select id="inout-part" name="part" required>
                ${partOptions}
              </select>
            </div>
            
            <div class="form-group" id="custom-part-group" style="display: none;">
              <label for="custom-part-name">직접입력 부품명 *</label>
              <input type="text" id="custom-part-name" placeholder="새 부품명 입력">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="inout-quantity">수량 *</label>
              <input type="number" id="inout-quantity" name="quantity" min="1" required placeholder="개수 입력">
            </div>
            
            <div class="form-group">
              <label for="inout-price">단가</label>
              <input type="number" id="inout-price" name="price" min="0" placeholder="원" step="100">
            </div>
            
            <div class="form-group">
              <label for="inout-total">총액</label>
              <input type="number" id="inout-total" name="total" readonly placeholder="자동계산">
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <h4>📝 처리 정보</h4>
          
          <div class="form-row">
            <div class="form-group">
              <label for="inout-date">처리일자 *</label>
              <input type="date" id="inout-date" name="date" value="${today}" required>
            </div>
            
            <div class="form-group">
              <label for="inout-reason">사유</label>
              <select id="inout-reason" name="reason">
                <option value="구매입고">구매입고</option>
                <option value="반품입고">반품입고</option>
                <option value="이월입고">이월입고</option>
                <option value="기타">기타</option>
              </select>
            </div>
          </div>
          
          <div class="form-group full-width">
            <label for="inout-note">비고</label>
            <textarea id="inout-note" name="note" placeholder="처리 관련 메모사항" rows="3"></textarea>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="submit-btn">📥 입고 등록</button>
        </div>
      </form>
    </div>
    
    <style>
      .inout-container {
        padding: 25px;
        max-width: 800px;
        margin: 0 auto;
      }
      
      .inout-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 25px;
        padding-bottom: 15px;
        border-bottom: 2px solid #e6e6e6;
      }
      
      .inout-header h3 {
        margin: 0;
        color: #333;
        font-size: 1.3rem;
      }
      
      .reset-btn {
        background: #6c757d;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .reset-btn:hover {
        background: #5a6268;
        transform: translateY(-1px);
      }
      
      .type-selector {
        display: flex;
        gap: 10px;
        margin-bottom: 25px;
        background: #f8f9fa;
        padding: 10px;
        border-radius: 10px;
        border-left: 4px solid #219ebc;
      }
      
      .type-btn {
        flex: 1;
        padding: 12px 20px;
        border: 2px solid #ddd;
        border-radius: 8px;
        background: white;
        color: #333;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 14px;
      }
      
      .type-btn:hover {
        border-color: #1976d2;
        background: #e3f2fd;
      }
      
      .type-btn.active {
        background: #2196f3;
        color: white;
        border-color: #2196f3;
        box-shadow: 0 3px 8px rgba(33,150,243,0.3);
      }
      
      .inout-form {
        display: flex;
        flex-direction: column;
        gap: 25px;
      }
      
      .form-section {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 10px;
        border-left: 4px solid #2196f3;
      }
      
      .form-section h4 {
        margin: 0 0 20px 0;
        color: #2196f3;
        font-size: 1.1rem;
      }
      
      .form-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 15px;
      }
      
      .form-group {
        display: flex;
        flex-direction: column;
      }
      
      .form-group.full-width {
        grid-column: 1 / -1;
      }
      
      .form-group label {
        margin-bottom: 5px;
        font-weight: 600;
        color: #333;
        font-size: 14px;
      }
      
      .form-group input,
      .form-group select,
      .form-group textarea {
        padding: 12px;
        border: 2px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        transition: border-color 0.2s ease;
      }
      
      .form-group input:focus,
      .form-group select:focus,
      .form-group textarea:focus {
        outline: none;
        border-color: #1976d2;
        box-shadow: 0 0 0 3px rgba(33,150,243,0.15);
      }
      
      .form-group input[readonly] {
        background: #e9ecef;
        color: #6c757d;
      }
      
      .form-actions {
        display: flex;
        justify-content: center;
        margin-top: 20px;
      }
      
      .submit-btn {
        background: #28a745;
        color: white;
        border: none;
        padding: 15px 40px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 200px;
      }
      
      .submit-btn:hover {
        background: #218838;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(40,167,69,0.3);
      }
      
      /* 출고 모드 스타일 */
      .type-btn[data-type="out"].active ~ form .submit-btn {
        background: #dc3545;
      }
      
      .type-btn[data-type="out"].active ~ form .submit-btn:hover {
        background: #c82333;
        box-shadow: 0 4px 12px rgba(220,53,69,0.3);
      }
      
      /* 모바일 반응형 */
      @media (max-width: 768px) {
        .inout-container {
          padding: 15px;
        }
        
        .inout-header {
          flex-direction: column;
          gap: 15px;
          align-items: stretch;
        }
        
        .type-selector {
          flex-direction: column;
          gap: 8px;
        }
        
        .form-row {
          grid-template-columns: 1fr;
          gap: 12px;
        }
        
        .form-section {
          padding: 15px;
        }
        
        .submit-btn {
          min-width: 100%;
          padding: 12px 20px;
        }
      }
    </style>
  `;
}

// 3. 출고 처리 HTML (기존과 동일)
export function getOutboundProcessHTML(pendingTasks) {
  if (!pendingTasks || pendingTasks.length === 0) {
    return `
      <div class="outbound-container">
        <div class="outbound-header">
          <h3>📤 출고 처리 (작업 완료 건)</h3>
          <button onclick="showInventorySubTab('out')" class="refresh-btn">🔄 새로고침</button>
        </div>
        <div class="outbound-info">
          <div class="info-text">
            ℹ️ 이 탭은 <strong>작업 완료된 건들의 부품 출고 처리</strong>를 위한 화면입니다.<br>
            직접 출고(납품/판매 등)는 <strong>"입출고등록"</strong> 탭에서 처리해주세요.
          </div>
        </div>
        <div class="no-data">
          📤 출고 처리할 작업이 없습니다.<br>
          완료된 작업 중 부품이 사용된 작업이 표시됩니다.
        </div>
      </div>
    `;
  }
  
  const tasksHTML = pendingTasks.map(task => {
    const dateStr = new Date(task.date).toLocaleDateString();
    const partsDisplay = formatPartsDisplay(task.parts);
    
    return `
      <tr class="task-row">
        <td>
          <input type="checkbox" class="task-checkbox" value="${task.id}">
        </td>
        <td class="task-date">${dateStr}</td>
        <td class="task-worker">${task.worker || ''}</td>
        <td class="task-client">${task.client || ''}</td>
        <td class="task-type">${task.taskType || ''}</td>
        <td class="task-items">${task.items || ''}</td>
        <td class="task-parts">${partsDisplay}</td>
        <td class="task-actions">
          <button onclick="processIndividualOutbound('${task.id}')" class="process-btn">📤 출고</button>
        </td>
      </tr>
    `;
  }).join('');
  
  return `
    <div class="outbound-container">
      <div class="outbound-header">
        <h3>📤 출고 처리 (작업 완료 건)</h3>
        <div class="outbound-actions">
          <button onclick="showInventorySubTab('out')" class="refresh-btn">🔄 새로고침</button>
          <button onclick="processBatchOutbound()" class="batch-btn" disabled>📤 선택 항목 일괄 출고</button>
        </div>
      </div>
      
      <div class="outbound-info">
        <div class="info-text">
          ℹ️ 이 탭은 <strong>작업 완료된 건들의 부품 출고 처리</strong>를 위한 화면입니다. (정산에 부품비로 반영)<br>
          직접 출고(납품/판매 등)는 <strong>"입출고등록"</strong> 탭에서 처리해주세요. (정산에 반영되지 않음)
        </div>
      </div>
      
      <div class="outbound-summary">
        <div class="summary-text">
          📋 출고 대기 중인 작업: <strong>${pendingTasks.length}건</strong>
        </div>
        <div class="help-text">
          ※ 완료된 작업 중 부품이 사용된 작업들입니다. 출고 처리하면 재고에서 차감되고 정산에 부품비로 반영됩니다.
        </div>
      </div>
      
      <div class="outbound-table-container">
        <table class="outbound-table">
          <thead>
            <tr>
              <th>
                <input type="checkbox" id="select-all-tasks">
              </th>
              <th>작업일자</th>
              <th>작업자</th>
              <th>거래처</th>
              <th>작업구분</th>
              <th>작업내용</th>
              <th>사용부품</th>
              <th>처리</th>
            </tr>
          </thead>
          <tbody>
            ${tasksHTML}
          </tbody>
        </table>
      </div>
    </div>
    
    <style>
      .outbound-container {
        padding: 25px;
      }
      
      .outbound-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid #e6e6e6;
      }
      
      .outbound-header h3 {
        margin: 0;
        color: #333;
        font-size: 1.3rem;
      }
      
      .outbound-actions {
        display: flex;
        gap: 10px;
      }
      
      .outbound-info {
        background: #e8f4f8;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
        border-left: 4px solid #219ebc;
      }
      
      .info-text {
        font-size: 14px;
        color: #0c5460;
        line-height: 1.5;
      }
      
      .refresh-btn, .batch-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 13px;
      }
      
      .refresh-btn {
        background: #28a745;
        color: white;
      }
      
      .batch-btn {
        background: #219ebc;
        color: white;
      }
      
      .batch-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
      
      .refresh-btn:hover:not(:disabled),
      .batch-btn:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      }
      
      .outbound-summary {
        background: #e3f2fd;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
        border-left: 4px solid #219ebc;
      }
      
      .summary-text {
        font-size: 16px;
        color: #333;
        margin-bottom: 5px;
      }
      
      .help-text {
        font-size: 12px;
        color: #666;
        font-style: italic;
      }
      
      .outbound-table-container {
        overflow-x: auto;
        border-radius: 8px;
        border: 1px solid #e6e6e6;
      }
      
      .outbound-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      
      .outbound-table th {
        background: #f8f9fa;
        padding: 12px 8px;
        text-align: center;
        font-weight: 600;
        color: #333;
        border-bottom: 2px solid #e6e6e6;
        white-space: nowrap;
      }
      
      .outbound-table td {
        padding: 10px 8px;
        text-align: center;
        border-bottom: 1px solid #f1f1f1;
      }
      
      .task-row:hover {
        background: #f8f9fa;
      }
      
      .task-checkbox {
        cursor: pointer;
        transform: scale(1.2);
      }
      
      .task-date {
        font-weight: 600;
        color: #219ebc;
      }
      
      .task-parts {
        max-width: 200px;
        word-break: break-word;
        text-align: left !important;
        font-size: 12px;
        line-height: 1.4;
      }
      
      .process-btn {
        background: #ffc107;
        color: #333;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        cursor: pointer;
        font-weight: 600;
        white-space: nowrap;
      }
      
      .process-btn:hover {
        background: #ffb300;
      }
      
      .no-data {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: #666;
        font-style: italic;
        font-size: 16px;
        text-align: center;
        line-height: 1.6;
      }
      
      /* 모바일 반응형 */
      @media (max-width: 768px) {
        .outbound-container {
          padding: 15px;
        }
        
        .outbound-header {
          flex-direction: column;
          gap: 15px;
          align-items: stretch;
        }
        
        .outbound-actions {
          justify-content: space-between;
        }
        
        .refresh-btn, .batch-btn {
          flex: 1;
          font-size: 12px;
        }
        
        .outbound-table-container {
          font-size: 11px;
        }
        
        .outbound-table th,
        .outbound-table td {
          padding: 6px 4px;
        }
        
        .task-parts {
          max-width: 120px;
        }
      }
    </style>
  `;
}


// 1. 재고 현황 HTML (기존과 동일)
export function getStockStatusHTML(stockData) {
  if (!stockData || stockData.length === 0) {
    return `
      <div class="stock-status-container">
        <div class="stock-header">
          <h3>📦 재고 현황</h3>
          <div class="stock-actions">
            <button onclick="refreshStock()" class="action-btn refresh-btn">🔄 새로고침</button>
            <button onclick="checkLowStock()" class="action-btn alert-btn">⚠️ 재고부족 확인</button>
            <button onclick="manageParts()" class="action-btn manage-btn">🔧 부품관리</button>
            <button onclick="exportStock()" class="action-btn export-btn">📊 Excel 내보내기</button>
          </div>
        </div>
        <div class="no-data">
          📦 등록된 재고가 없습니다.<br>
          입출고 등록을 통해 재고를 추가해주세요.
        </div>
      </div>
    `;
  }
  
  // 재고 통계 계산
  const totalItems = stockData.length;
  const lowStockItems = stockData.filter(item => 
    (item.currentStock || 0) <= (item.minStock || 5)
  ).length;
  const totalValue = stockData.reduce((sum, item) => 
    sum + ((item.currentStock || 0) * (item.unitPrice || 0)), 0
  );
  
  const stockItemsHTML = stockData.map(item => {
    const currentStock = item.currentStock || 0;
    const minStock = item.minStock || 5;
    const unitPrice = item.unitPrice || 0;
    const totalItemValue = currentStock * unitPrice;
    const isLowStock = currentStock <= minStock;
    const lastUpdated = item.lastUpdated ? 
      new Date(item.lastUpdated.toDate()).toLocaleDateString() : '';
    
    return `
      <tr class="stock-row ${isLowStock ? 'low-stock' : ''}">
        <td class="part-name">${item.partName}</td>
        <td class="current-stock">
          <span class="stock-quantity ${isLowStock ? 'warning' : ''}">${currentStock}개</span>
          ${isLowStock ? '<span class="warning-icon">⚠️</span>' : ''}
        </td>
        <td class="unit-price">${unitPrice.toLocaleString()}원</td>
        <td class="total-value">${totalItemValue.toLocaleString()}원</td>
        <td class="min-stock">${minStock}개</td>
        <td class="last-updated">${lastUpdated}</td>
        <td class="actions">
          <button onclick="adjustStock('${item.partName}', ${currentStock})" class="adjust-btn">📝 조정</button>
        </td>
      </tr>
    `;
  }).join('');
  
  return `
    <div class="stock-status-container">
      <div class="stock-header">
        <h3>📦 재고 현황</h3>
        <div class="stock-actions">
          <button onclick="refreshStock()" class="action-btn refresh-btn">🔄 새로고침</button>
          <button onclick="checkLowStock()" class="action-btn alert-btn">⚠️ 재고부족 확인</button>
          <button onclick="manageParts()" class="action-btn manage-btn">🔧 부품관리</button>
          <button onclick="exportStock()" class="action-btn export-btn">📊 Excel 내보내기</button>
        </div>
      </div>
      
      <!-- 재고 통계 -->
      <div class="stock-summary">
        <div class="summary-item">
          <div class="summary-label">총 품목</div>
          <div class="summary-value">${totalItems}개</div>
        </div>
        <div class="summary-item warning">
          <div class="summary-label">재고부족</div>
          <div class="summary-value">${lowStockItems}개</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">총 재고가치</div>
          <div class="summary-value">${totalValue.toLocaleString()}원</div>
        </div>
      </div>
      
      <!-- 재고 테이블 -->
      <div class="stock-table-container">
        <table class="stock-table">
          <thead>
            <tr>
              <th>부품명</th>
              <th>현재재고</th>
              <th>단가</th>
              <th>총가치</th>
              <th>최소재고</th>
              <th>최근업데이트</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            ${stockItemsHTML}
          </tbody>
        </table>
      </div>
    </div>
    
    <style>
      .stock-status-container {
        padding: 25px;
      }
      
      .stock-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 25px;
        padding-bottom: 15px;
        border-bottom: 2px solid #e6e6e6;
      }
      
      .stock-header h3 {
        margin: 0;
        color: #333;
        font-size: 1.3rem;
      }
      
      .stock-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      
      .action-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 13px;
        white-space: nowrap;
      }
      
      .refresh-btn {
        background: #28a745;
        color: white;
      }
      
      .alert-btn {
        background: #ffc107;
        color: #333;
      }
      
      .manage-btn {
        background: #6c757d;
        color: white;
      }
      
      .export-btn {
        background: #219ebc;
        color: white;
      }
      
      .action-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      }
      
      .stock-summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 25px;
      }
      
      .summary-item {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        border-left: 4px solid #28a745;
      }
      
      .summary-item.warning {
        border-left-color: #ffc107;
        background: #fff8e1;
      }
      
      .summary-label {
        font-size: 14px;
        color: #666;
        margin-bottom: 8px;
      }
      
      .summary-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: #333;
      }
      
      .stock-table-container {
        overflow-x: auto;
        border-radius: 8px;
        border: 1px solid #e6e6e6;
      }
      
      .stock-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
      }
      
      .stock-table th {
        background: #f8f9fa;
        padding: 12px 8px;
        text-align: center;
        font-weight: 600;
        color: #333;
        border-bottom: 2px solid #e6e6e6;
        white-space: nowrap;
      }
      
      .stock-table td {
        padding: 12px 8px;
        text-align: center;
        border-bottom: 1px solid #f1f1f1;
      }
      
      .stock-row:hover {
        background: #f8f9fa;
      }
      
      .stock-row.low-stock {
        background: #fff3cd;
      }
      
      .stock-row.low-stock:hover {
        background: #ffeb9c;
      }
      
      .part-name {
        font-weight: 600;
        color: #333;
        text-align: left !important;
      }
      
      .stock-quantity.warning {
        color: #e74c3c;
        font-weight: 700;
      }
      
      .warning-icon {
        margin-left: 5px;
        font-size: 12px;
      }
      
      .unit-price, .total-value {
        font-weight: 600;
        color: #219ebc;
      }
      
      .adjust-btn {
        background: #ffc107;
        color: #333;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        cursor: pointer;
        font-weight: 600;
      }
      
      .adjust-btn:hover {
        background: #ffb300;
      }
      
      .no-data {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 300px;
        color: #666;
        font-style: italic;
        font-size: 16px;
        text-align: center;
        line-height: 1.6;
      }
      
      /* 모바일 반응형 */
      @media (max-width: 768px) {
        .stock-status-container {
          padding: 15px;
        }
        
        .stock-header {
          flex-direction: column;
          gap: 15px;
          align-items: stretch;
        }
        
        .stock-actions {
          justify-content: space-between;
          gap: 8px;
        }
        
        .action-btn {
          flex: 1;
          min-width: 0;
          font-size: 12px;
          padding: 8px 12px;
        }
        
        .stock-summary {
          grid-template-columns: 1fr;
          gap: 15px;
        }
        
        .stock-table-container {
          font-size: 12px;
        }
        
        .stock-table th,
        .stock-table td {
          padding: 8px 4px;
        }
      }
    </style>
  `;
}