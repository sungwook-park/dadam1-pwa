// scripts/templates/inventory-templates.js - 입출고 관리 템플릿

// 메인 입출고 관리 탭 HTML
export function getInventoryTabHTML() {
  return `
    <div class="inventory-container">
      <!-- 서브탭 네비게이션 -->
      <div class="inventory-nav">
        <button id="stock-tab" class="inventory-tab-btn active" onclick="showInventorySubTab('stock')">
          📦 재고현황
        </button>
        <button id="in-tab" class="inventory-tab-btn" onclick="showInventorySubTab('in')">
          📥 입고등록
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
        border-color: #8ecae6;
        background: #e3f2fd;
        transform: translateY(-2px);
      }
      
      .inventory-tab-btn.active {
        background: #219ebc;
        color: white;
        border-color: #219ebc;
        box-shadow: 0 4px 12px rgba(33,158,188,0.3);
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

// 1. 재고 현황 HTML
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
          입고 등록을 통해 재고를 추가해주세요.
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

// 2. 입고 등록 폼 HTML
export function getInboundFormHTML() {
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
    <div class="inbound-container">
      <div class="inbound-header">
        <h3>📥 입고 등록</h3>
        <button onclick="resetInboundForm()" class="reset-btn">🔄 폼 초기화</button>
      </div>
      
      <form id="inbound-form" class="inbound-form">
        <div class="form-section">
          <h4>📦 부품 정보</h4>
          
          <div class="form-row">
            <div class="form-group">
              <label for="inbound-part">부품명 *</label>
              <select id="inbound-part" name="part" required>
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
              <label for="inbound-quantity">수량 *</label>
              <input type="number" id="inbound-quantity" name="quantity" min="1" required placeholder="개수 입력">
            </div>
            
            <div class="form-group">
              <label for="inbound-price">단가</label>
              <input type="number" id="inbound-price" name="price" min="0" placeholder="원" step="100">
            </div>
            
            <div class="form-group">
              <label for="inbound-total">총액</label>
              <input type="number" id="inbound-total" name="total" readonly placeholder="자동계산">
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <h4>📝 입고 정보</h4>
          
          <div class="form-row">
            <div class="form-group">
              <label for="inbound-date">입고일자 *</label>
              <input type="date" id="inbound-date" name="date" value="${today}" required>
            </div>
            
            <div class="form-group">
              <label for="inbound-reason">입고사유</label>
              <select id="inbound-reason" name="reason">
                <option value="구매입고">구매입고</option>
                <option value="반품입고">반품입고</option>
                <option value="이월입고">이월입고</option>
                <option value="기타">기타</option>
              </select>
            </div>
          </div>
          
          <div class="form-group full-width">
            <label for="inbound-note">비고</label>
            <textarea id="inbound-note" name="note" placeholder="입고 관련 메모사항" rows="3"></textarea>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="submit-btn">📥 입고 등록</button>
        </div>
      </form>
    </div>
    
    <style>
      .inbound-container {
        padding: 25px;
        max-width: 800px;
        margin: 0 auto;
      }
      
      .inbound-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 25px;
        padding-bottom: 15px;
        border-bottom: 2px solid #e6e6e6;
      }
      
      .inbound-header h3 {
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
      
      .inbound-form {
        display: flex;
        flex-direction: column;
        gap: 25px;
      }
      
      .form-section {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 10px;
        border-left: 4px solid #219ebc;
      }
      
      .form-section h4 {
        margin: 0 0 20px 0;
        color: #219ebc;
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
        border-color: #8ecae6;
        box-shadow: 0 0 0 3px rgba(142, 202, 230, 0.15);
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
      
      /* 모바일 반응형 */
      @media (max-width: 768px) {
        .inbound-container {
          padding: 15px;
        }
        
        .inbound-header {
          flex-direction: column;
          gap: 15px;
          align-items: stretch;
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

// 3. 출고 처리 HTML
export function getOutboundProcessHTML(pendingTasks) {
  if (!pendingTasks || pendingTasks.length === 0) {
    return `
      <div class="outbound-container">
        <div class="outbound-header">
          <h3>📤 출고 처리</h3>
          <button onclick="showInventorySubTab('out')" class="refresh-btn">🔄 새로고침</button>
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
        <h3>📤 출고 처리</h3>
        <div class="outbound-actions">
          <button onclick="showInventorySubTab('out')" class="refresh-btn">🔄 새로고침</button>
          <button onclick="processBatchOutbound()" class="batch-btn" disabled>📤 선택 항목 일괄 출고</button>
        </div>
      </div>
      
      <div class="outbound-summary">
        <div class="summary-text">
          📋 출고 대기 중인 작업: <strong>${pendingTasks.length}건</strong>
        </div>
        <div class="help-text">
          ※ 완료된 작업 중 부품이 사용된 작업들입니다. 출고 처리하면 재고에서 차감됩니다.
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
        margin-bottom: 25px;
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
        height: 300px;
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

// 4. 입출고 내역 HTML (수정됨 - 검색해야만 표시)
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
  const inboundTotal = inboundData.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  const outboundTotal = outboundData.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  
  // 테이블 데이터 생성
  const historyRows = historyData.map(item => {
    const date = new Date(item.date).toLocaleDateString();
    const type = item.type === 'in' ? '입고' : '출고';
    const typeClass = item.type === 'in' ? 'inbound' : 'outbound';
    const amountDisplay = item.type === 'in' ? 
      `+${(item.totalAmount || 0).toLocaleString()}원` :
      `-${(item.totalAmount || 0).toLocaleString()}원`;
    
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
        <td class="history-reason">${item.reason || ''}</td>
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
          <div class="stat-item outbound">
            <div class="stat-label">📤 출고</div>
            <div class="stat-value">${outboundData.length}건 / -${outboundTotal.toLocaleString()}원</div>
          </div>
          <div class="stat-item total">
            <div class="stat-label">💰 순변동</div>
            <div class="stat-value">${(inboundTotal - outboundTotal).toLocaleString()}원</div>
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
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
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
    
    .stat-item.outbound {
      background: #ffebee;
      border-left-color: #dc3545;
    }
    
    .stat-item.total {
      background: #e3f2fd;
      border-left-color: #219ebc;
    }
    
    .stat-label {
      font-size: 14px;
      color: #666;
      margin-bottom: 8px;
    }
    
    .stat-value {
      font-size: 1.2rem;
      font-weight: 700;
      color: #333;
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
        gap: 15px;
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
  .part-item {
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
  
  /* 공통 애니메이션 효과 */
  .inventory-container * {
    transition: all 0.2s ease;
  }
  
  /* 스크롤바 스타일링 */
  .stock-table-container::-webkit-scrollbar,
  .outbound-table-container::-webkit-scrollbar,
  .history-table-container::-webkit-scrollbar {
    height: 8px;
  }
  
  .stock-table-container::-webkit-scrollbar-track,
  .outbound-table-container::-webkit-scrollbar-track,
  .history-table-container::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  
  .stock-table-container::-webkit-scrollbar-thumb,
  .outbound-table-container::-webkit-scrollbar-thumb,
  .history-table-container::-webkit-scrollbar-thumb {
    background: #219ebc;
    border-radius: 4px;
  }
  
  .stock-table-container::-webkit-scrollbar-thumb:hover,
  .outbound-table-container::-webkit-scrollbar-thumb:hover,
  .history-table-container::-webkit-scrollbar-thumb:hover {
    background: #1a7a96;
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

console.log('📦 입출고 관리 템플릿 모듈 로드 완료');