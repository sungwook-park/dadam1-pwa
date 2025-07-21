// scripts/templates/inventory-templates.js - 입출고 관리 UI 템플릿

import { PARTS_LIST } from '../parts-list.js';

// 입출고 관리 메인 탭 HTML
export function getInventoryTabHTML() {
  return `
    <div class="inventory-container">
      <!-- 입출고 서브탭 -->
      <div class="inventory-subtabs">
        <button onclick="showInventorySubTab('stock')" class="inventory-tab-btn active" id="stock-tab">
          📊 재고현황
        </button>
        <button onclick="showInventorySubTab('in')" class="inventory-tab-btn" id="in-tab">
          📥 입고등록
        </button>
        <button onclick="showInventorySubTab('out')" class="inventory-tab-btn" id="out-tab">
          📤 출고처리
        </button>
        <button onclick="showInventorySubTab('history')" class="inventory-tab-btn" id="history-tab">
          📋 입출고내역
        </button>
      </div>
      
      <!-- 탭 컨텐츠 영역 -->
      <div id="inventory-content">
        <div class="loading-message">재고 현황을 불러오는 중...</div>
      </div>
    </div>
    
    <style>
      .inventory-container {
        max-width: 1200px;
        margin: 0 auto;
      }
      
      .inventory-subtabs {
        display: flex;
        gap: 8px;
        margin-bottom: 25px;
        background: white;
        padding: 15px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        overflow-x: auto;
      }
      
      .inventory-tab-btn {
        flex: 1;
        min-width: 120px;
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
      
      .inventory-tab-btn:hover {
        border-color: #8ecae6;
        background: #e3f2fd !important;
      }
      
      .inventory-tab-btn.active {
        background: #219ebc !important;
        border-color: #219ebc;
        color: #fff !important;
        transform: translateY(-1px);
        box-shadow: 0 3px 8px rgba(33,158,188,0.2);
      }
      
      #inventory-content {
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
      
      /* 모바일 반응형 */
      @media (max-width: 768px) {
        .inventory-subtabs {
          padding: 12px;
          gap: 6px;
        }
        
        .inventory-tab-btn {
          padding: 10px 12px;
          font-size: 14px;
          min-width: 100px;
        }
      }
      
      @media (max-width: 480px) {
        .inventory-subtabs {
          flex-direction: column;
          gap: 8px;
        }
        
        .inventory-tab-btn {
          min-width: auto;
          width: 100%;
        }
      }
    </style>
  `;
}

// 재고 현황 탭 HTML
export function getStockStatusHTML(stockData) {
  const stockItems = stockData || [];
  
  return `
    <div class="stock-status-container">
      <div class="stock-header">
        <h3>📊 현재 재고 현황</h3>
        <div class="stock-summary">
          <span class="stock-total">전체 품목: ${stockItems.length}개</span>
          <span class="stock-low">부족 품목: ${stockItems.filter(item => item.currentStock <= (item.minStock || 5)).length}개</span>
        </div>
      </div>
      
      <div class="stock-table-container">
        <table class="stock-table">
          <thead>
            <tr>
              <th>부품명</th>
              <th>현재재고</th>
              <th>단가</th>
              <th>총 가치</th>
              <th>상태</th>
              <th>최근업데이트</th>
            </tr>
          </thead>
          <tbody>
            ${stockItems.length > 0 ? 
              stockItems.map(item => `
                <tr class="${item.currentStock <= (item.minStock || 5) ? 'low-stock' : ''}">
                  <td class="part-name">${item.partName}</td>
                  <td class="stock-quantity">${item.currentStock}개</td>
                  <td class="unit-price">${item.unitPrice?.toLocaleString() || 0}원</td>
                  <td class="total-value">${((item.currentStock || 0) * (item.unitPrice || 0)).toLocaleString()}원</td>
                  <td class="stock-status">
                    ${item.currentStock <= (item.minStock || 5) ? 
                      '<span class="status-low">⚠️ 부족</span>' : 
                      '<span class="status-ok">✅ 충분</span>'
                    }
                  </td>
                  <td class="last-updated">${item.lastUpdated ? formatDate(item.lastUpdated) : '-'}</td>
                </tr>
              `).join('') :
              '<tr><td colspan="6" class="no-data">재고 데이터가 없습니다.</td></tr>'
            }
          </tbody>
        </table>
      </div>
      
      <div class="stock-actions">
        <button onclick="refreshStock()" class="refresh-btn">🔄 새로고침</button>
        <button onclick="exportStock()" class="export-btn">📊 Excel 내보내기</button>
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
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid #e6e6e6;
      }
      
      .stock-header h3 {
        margin: 0;
        color: #333;
        font-size: 1.4rem;
      }
      
      .stock-summary {
        display: flex;
        gap: 15px;
        font-size: 14px;
      }
      
      .stock-total {
        color: #219ebc;
        font-weight: 600;
      }
      
      .stock-low {
        color: #e63946;
        font-weight: 600;
      }
      
      .stock-table-container {
        overflow-x: auto;
        margin-bottom: 20px;
      }
      
      .stock-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
      }
      
      .stock-table th {
        background: #f8f9fa;
        padding: 12px;
        text-align: center;
        font-weight: 600;
        border-bottom: 2px solid #dee2e6;
        white-space: nowrap;
      }
      
      .stock-table td {
        padding: 10px 12px;
        text-align: center;
        border-bottom: 1px solid #f1f3f4;
      }
      
      .stock-table tr:hover {
        background-color: #f8f9fa;
      }
      
      .low-stock {
        background-color: #fff5f5 !important;
      }
      
      .low-stock:hover {
        background-color: #ffe6e6 !important;
      }
      
      .part-name {
        font-weight: 600;
        color: #333;
        text-align: left !important;
      }
      
      .stock-quantity {
        font-weight: 600;
        color: #219ebc;
      }
      
      .unit-price, .total-value {
        text-align: right !important;
        font-family: 'Segoe UI', monospace;
      }
      
      .status-ok {
        color: #28a745;
        font-weight: 600;
      }
      
      .status-low {
        color: #e63946;
        font-weight: 600;
      }
      
      .no-data {
        padding: 40px;
        color: #666;
        font-style: italic;
      }
      
      .stock-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
      }
      
      .refresh-btn, .export-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .refresh-btn {
        background: #219ebc;
        color: white;
      }
      
      .refresh-btn:hover {
        background: #1a7a96;
      }
      
      .export-btn {
        background: #28a745;
        color: white;
      }
      
      .export-btn:hover {
        background: #218838;
      }
      
      /* 모바일 반응형 */
      @media (max-width: 768px) {
        .stock-status-container {
          padding: 15px;
        }
        
        .stock-header {
          flex-direction: column;
          gap: 10px;
          align-items: flex-start;
        }
        
        .stock-summary {
          flex-direction: column;
          gap: 5px;
        }
        
        .stock-table {
          font-size: 12px;
        }
        
        .stock-table th,
        .stock-table td {
          padding: 8px 6px;
        }
        
        .stock-actions {
          flex-direction: column;
        }
      }
    </style>
  `;
}

// 입고 등록 탭 HTML
export function getInboundFormHTML() {
  return `
    <div class="inbound-form-container">
      <div class="form-header">
        <h3>📥 입고 등록</h3>
        <p>새로 구매하거나 반입된 부품을 등록합니다.</p>
      </div>
      
      <form id="inbound-form" class="inbound-form">
        <div class="form-row">
          <div class="form-group">
            <label>부품명 *</label>
            <select id="inbound-part" name="partName" required>
              <option value="">부품을 선택하세요</option>
              ${PARTS_LIST.map(part => 
                `<option value="${part.name}" data-price="${part.price}">${part.name}</option>`
              ).join('')}
              <option value="기타">기타 (직접입력)</option>
            </select>
          </div>
          
          <div class="form-group" id="custom-part-group" style="display: none;">
            <label>부품명 직접입력</label>
            <input type="text" id="custom-part-name" placeholder="부품명을 입력하세요">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>수량 *</label>
            <input type="number" id="inbound-quantity" name="quantity" min="1" required placeholder="입고 수량">
          </div>
          
          <div class="form-group">
            <label>단가</label>
            <input type="number" id="inbound-price" name="unitPrice" min="0" placeholder="단가 (원)">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>총 금액</label>
            <input type="number" id="inbound-total" name="totalAmount" readonly placeholder="자동 계산됩니다">
          </div>
          
          <div class="form-group">
            <label>입고 사유</label>
            <select id="inbound-reason" name="reason">
              <option value="구매">구매</option>
              <option value="반품회수">반품회수</option>
              <option value="기타">기타</option>
            </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group full-width">
            <label>비고</label>
            <textarea id="inbound-note" name="note" placeholder="추가 메모사항" rows="3"></textarea>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="button" onclick="resetInboundForm()" class="reset-btn">🔄 초기화</button>
          <button type="submit" class="submit-btn">📥 입고 등록</button>
        </div>
      </form>
    </div>
    
    <style>
      .inbound-form-container {
        padding: 25px;
      }
      
      .form-header {
        margin-bottom: 25px;
        padding-bottom: 15px;
        border-bottom: 2px solid #e6e6e6;
      }
      
      .form-header h3 {
        margin: 0 0 8px 0;
        color: #333;
        font-size: 1.4rem;
      }
      
      .form-header p {
        margin: 0;
        color: #666;
        font-size: 14px;
      }
      
      .inbound-form {
        max-width: 800px;
      }
      
      .form-row {
        display: flex;
        gap: 20px;
        margin-bottom: 20px;
      }
      
      .form-group {
        flex: 1;
      }
      
      .form-group.full-width {
        flex: 1 1 100%;
      }
      
      .form-group label {
        display: block;
        margin-bottom: 6px;
        font-weight: 600;
        color: #333;
        font-size: 14px;
      }
      
      .form-group input,
      .form-group select,
      .form-group textarea {
        width: 100%;
        padding: 12px;
        border: 2px solid #ddd;
        border-radius: 8px;
        font-size: 14px;
        font-family: inherit;
        transition: border-color 0.2s ease;
        box-sizing: border-box;
      }
      
      .form-group input:focus,
      .form-group select:focus,
      .form-group textarea:focus {
        outline: none;
        border-color: #8ecae6;
        box-shadow: 0 0 0 3px rgba(142, 202, 230, 0.15);
      }
      
      .form-group input[readonly] {
        background-color: #f8f9fa;
        color: #666;
      }
      
      .form-actions {
        display: flex;
        gap: 15px;
        justify-content: center;
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #e6e6e6;
      }
      
      .reset-btn, .submit-btn {
        padding: 12px 30px;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 15px;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 120px;
      }
      
      .reset-btn {
        background: #6c757d;
        color: white;
      }
      
      .reset-btn:hover {
        background: #5a6268;
      }
      
      .submit-btn {
        background: #28a745;
        color: white;
      }
      
      .submit-btn:hover {
        background: #218838;
      }
      
      /* 모바일 반응형 */
      @media (max-width: 768px) {
        .inbound-form-container {
          padding: 15px;
        }
        
        .form-row {
          flex-direction: column;
          gap: 15px;
        }
        
        .form-actions {
          flex-direction: column;
        }
        
        .reset-btn, .submit-btn {
          width: 100%;
        }
      }
    </style>
  `;
}

// 출고 처리 탭 HTML
export function getOutboundProcessHTML(pendingTasks) {
  const tasks = pendingTasks || [];
  
  return `
    <div class="outbound-process-container">
      <div class="process-header">
        <h3>📤 출고 처리</h3>
        <p>완료된 작업의 부품 사용 내역을 재고에서 차감합니다.</p>
        <div class="pending-summary">
          <span class="pending-count">처리 대기: ${tasks.length}건</span>
        </div>
      </div>
      
      ${tasks.length > 0 ? `
        <div class="batch-actions">
          <label class="select-all-container">
            <input type="checkbox" id="select-all-tasks">
            <span class="checkmark"></span>
            전체 선택
          </label>
          <button onclick="processBatchOutbound()" class="batch-btn" disabled>
            📤 선택 항목 일괄 출고
          </button>
        </div>
        
        <div class="pending-tasks-list">
          ${tasks.map(task => `
            <div class="task-item" data-task-id="${task.id}">
              <label class="task-checkbox-container">
                <input type="checkbox" class="task-checkbox" value="${task.id}">
                <span class="checkmark"></span>
              </label>
              
              <div class="task-info">
                <div class="task-header">
                  <span class="task-date">${formatDate(task.date)}</span>
                  <span class="task-worker">${task.worker || ''}</span>
                  <span class="task-client">${task.client || ''}</span>
                </div>
                
                <div class="task-details">
                  <span class="task-content">${task.items || task.taskType || ''}</span>
                </div>
                
                <div class="parts-used">
                  <strong>사용 부품:</strong>
                  <div class="parts-list">
                    ${formatPartsForDisplay(task.parts)}
                  </div>
                </div>
              </div>
              
              <div class="task-actions">
                <button onclick="processIndividualOutbound('${task.id}')" class="individual-btn">
                  ✅ 개별 출고
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="no-pending-tasks">
          <div class="no-data-icon">📦</div>
          <h4>출고 처리할 작업이 없습니다</h4>
          <p>모든 완료 작업의 부품이 이미 출고 처리되었습니다.</p>
        </div>
      `}
    </div>
    
    <style>
      .outbound-process-container {
        padding: 25px;
      }
      
      .process-header {
        margin-bottom: 25px;
        padding-bottom: 15px;
        border-bottom: 2px solid #e6e6e6;
      }
      
      .process-header h3 {
        margin: 0 0 8px 0;
        color: #333;
        font-size: 1.4rem;
      }
      
      .process-header p {
        margin: 0 0 10px 0;
        color: #666;
        font-size: 14px;
      }
      
      .pending-summary {
        display: flex;
        gap: 15px;
      }
      
      .pending-count {
        background: #e3f2fd;
        color: #1565c0;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
      }
      
      .batch-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
      }
      
      .select-all-container {
        display: flex;
        align-items: center;
        cursor: pointer;
        font-weight: 600;
      }
      
      .batch-btn {
        background: #219ebc;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .batch-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
      
      .batch-btn:not(:disabled):hover {
        background: #1a7a96;
      }
      
      .pending-tasks-list {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }
      
      .task-item {
        display: flex;
        align-items: flex-start;
        gap: 15px;
        padding: 20px;
        background: white;
        border: 2px solid #e6e6e6;
        border-radius: 12px;
        transition: all 0.2s ease;
      }
      
      .task-item:hover {
        border-color: #8ecae6;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
      .task-checkbox-container {
        margin-top: 5px;
        cursor: pointer;
      }
      
      .task-info {
        flex: 1;
      }
      
      .task-header {
        display: flex;
        gap: 15px;
        margin-bottom: 8px;
        flex-wrap: wrap;
      }
      
      .task-date {
        color: #219ebc;
        font-weight: 600;
        font-size: 14px;
      }
      
      .task-worker {
        background: #e3f2fd;
        color: #1565c0;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
      }
      
      .task-client {
        background: #fff3cd;
        color: #856404;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
      }
      
      .task-details {
        margin-bottom: 12px;
        color: #666;
        font-size: 14px;
      }
      
      .parts-used {
        background: #f8f9fa;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
      }
      
      .parts-list {
        margin-top: 6px;
        color: #333;
        font-weight: 500;
      }
      
      .task-actions {
        margin-top: 5px;
      }
      
      .individual-btn {
        background: #28a745;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
      }
      
      .individual-btn:hover {
        background: #218838;
      }
      
      .no-pending-tasks {
        text-align: center;
        padding: 60px 20px;
        color: #666;
      }
      
      .no-data-icon {
        font-size: 48px;
        margin-bottom: 15px;
      }
      
      .no-pending-tasks h4 {
        margin: 0 0 10px 0;
        color: #333;
      }
      
      .no-pending-tasks p {
        margin: 0;
        font-size: 14px;
      }
      
      /* 체크박스 스타일 */
      .task-checkbox-container input[type="checkbox"],
      .select-all-container input[type="checkbox"] {
        width: 18px;
        height: 18px;
        margin-right: 8px;
        cursor: pointer;
      }
      
      /* 모바일 반응형 */
      @media (max-width: 768px) {
        .outbound-process-container {
          padding: 15px;
        }
        
        .batch-actions {
          flex-direction: column;
          gap: 12px;
          align-items: stretch;
        }
        
        .task-item {
          flex-direction: column;
          gap: 12px;
        }
        
        .task-header {
          flex-direction: column;
          gap: 8px;
        }
        
        .task-actions {
          align-self: stretch;
        }
        
        .individual-btn {
          width: 100%;
          padding: 12px;
        }
      }
    </style>
  `;
}

// 입출고 내역 탭 HTML  
export function getInventoryHistoryHTML(historyData) {
  const history = historyData || [];
  
  return `
    <div class="inventory-history-container">
      <div class="history-header">
        <h3>📋 입출고 내역</h3>
        <div class="history-controls">
          <input type="date" id="history-start-date" class="date-input">
          <span class="date-separator">~</span>
          <input type="date" id="history-end-date" class="date-input">
          <select id="history-type" class="type-filter">
            <option value="">전체</option>
            <option value="in">입고</option>
            <option value="out">출고</option>
          </select>
          <input type="text" id="history-search" placeholder="부품명 검색" class="search-input">
          <button onclick="searchHistory()" class="search-btn">🔍 검색</button>
        </div>
      </div>
      
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
            ${history.length > 0 ?
              history.map(item => `
                <tr class="${item.type === 'in' ? 'inbound-row' : 'outbound-row'}">
                  <td class="date-cell">${formatDate(item.date)}</td>
                  <td class="type-cell">
                    <span class="${item.type === 'in' ? 'type-in' : 'type-out'}">
                      ${item.type === 'in' ? '📥 입고' : '📤 출고'}
                    </span>
                  </td>
                  <td class="part-name">${item.partName}</td>
                  <td class="quantity">${item.quantity}개</td>
                  <td class="unit-price">${item.unitPrice?.toLocaleString() || 0}원</td>
                  <td class="total-amount">${item.totalAmount?.toLocaleString() || 0}원</td>
                  <td class="reason">${item.reason || ''}</td>
                  <td class="worker">${item.worker || ''}</td>
                  <td class="note">${item.note || ''}</td>
                </tr>
              `).join('') :
              '<tr><td colspan="9" class="no-data">입출고 내역이 없습니다.</td></tr>'
            }
          </tbody>
        </table>
      </div>
      
      <div class="history-actions">
        <button onclick="exportHistory()" class="export-btn">📊 Excel 내보내기</button>
      </div>
    </div>
    
    <style>
      .inventory-history-container {
        padding: 25px;
      }
      
      .history-header {
        margin-bottom: 20px;
      }
      
      .history-header h3 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 1.4rem;
      }
      
      .history-controls {
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
      }
      
      .date-input, .type-filter, .search-input {
        padding: 8px 12px;
        border: 2px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
      }
      
      .date-input {
        min-width: 140px;
      }
      
      .type-filter {
        min-width: 100px;
      }
      
      .search-input {
        min-width: 160px;
        flex: 1;
      }
      
      .date-separator {
        color: #666;
        font-weight: 600;
      }
      
      .search-btn {
        background: #219ebc;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
      }
      
      .search-btn:hover {
        background: #1a7a96;
      }
      
      .history-table-container {
        overflow-x: auto;
        margin-bottom: 20px;
        border-radius: 8px;
        border: 1px solid #e6e6e6;
      }
      
      .history-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
        min-width: 800px;
      }
      
      .history-table th {
        background: #f8f9fa;
        padding: 12px 8px;
        text-align: center;
        font-weight: 600;
        border-bottom: 2px solid #dee2e6;
        white-space: nowrap;
        position: sticky;
        top: 0;
      }
      
      .history-table td {
        padding: 10px 8px;
        text-align: center;
        border-bottom: 1px solid #f1f3f4;
      }
      
      .history-table tr:hover {
        background-color: #f8f9fa;
      }
      
      .inbound-row {
        background-color: #f0f9ff;
      }
      
      .outbound-row {
        background-color: #fef2f2;
      }
      
      .inbound-row:hover {
        background-color: #e0f2fe !important;
      }
      
      .outbound-row:hover {
        background-color: #fde8e8 !important;
      }
      
      .date-cell {
        font-weight: 600;
        color: #333;
        min-width: 100px;
      }
      
      .type-in {
        background: #3b82f6;
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
      }
      
      .type-out {
        background: #ef4444;
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
      }
      
      .part-name {
        font-weight: 600;
        color: #333;
        text-align: left !important;
      }
      
      .quantity {
        font-weight: 600;
        color: #219ebc;
      }
      
      .unit-price, .total-amount {
        text-align: right !important;
        font-family: 'Segoe UI', monospace;
        font-weight: 500;
      }
      
      .reason, .worker {
        color: #666;
        font-size: 12px;
      }
      
      .note {
        color: #999;
        font-size: 11px;
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .no-data {
        padding: 40px;
        color: #666;
        font-style: italic;
      }
      
      .history-actions {
        text-align: center;
      }
      
      .export-btn {
        background: #28a745;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .export-btn:hover {
        background: #218838;
      }
      
      /* 모바일 반응형 */
      @media (max-width: 768px) {
        .inventory-history-container {
          padding: 15px;
        }
        
        .history-controls {
          flex-direction: column;
          gap: 12px;
          align-items: stretch;
        }
        
        .history-controls > * {
          width: 100%;
        }
        
        .history-table {
          font-size: 11px;
        }
        
        .history-table th,
        .history-table td {
          padding: 8px 4px;
        }
      }
    </style>
  `;
}

// 유틸리티 함수들
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

// 전역 함수 등록
window.formatDate = formatDate;
window.formatPartsForDisplay = formatPartsForDisplay;