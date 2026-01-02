// scripts/settlement/settlement-ui.js
// 정산 UI 렌더링 모듈 (개선 버전)

import { formatDate, formatCurrency, joinWorkerNames } from './settlement-utils.js';

/**
 * 정산 메인 HTML (탭 구조)
 */
export function getSettlementMainHTML() {
  return `
    <div class="settlement-container">
      <!-- 정산 서브탭 -->
      <div class="settlement-subtabs">
        <button onclick="showSettleSubTab('daily')" class="settle-tab-btn active" id="daily-settle-tab">
          📊 일별정산
        </button>
        <button onclick="showSettleSubTab('worker')" class="settle-tab-btn" id="worker-settle-tab">
          👷 직원별분석
        </button>
        <button onclick="showSettleSubTab('fee')" class="settle-tab-btn" id="fee-settle-tab">
          💳 수수료분석
        </button>
      </div>
      
      <!-- 탭 컨텐츠 영역 -->
      <div id="settlement-content">
        <div class="loading-message">정산 데이터를 불러오는 중...</div>
      </div>
    </div>
    
    ${getSettlementStyles()}
  `;
}

/**
 * 일별정산 HTML (개선 버전)
 */
export function getDailySettlementHTML(result, tasks, startDate, endDate = null, monthlyDistribution = {}, monthRange = null) {
  const displayDate = endDate && endDate !== startDate ? `${startDate} ~ ${endDate}` : startDate;
  
  // 임원 리스트
  const executives = Object.keys(result.executiveDistribution);
  const contractWorkers = Object.keys(result.contractPayments);
  const hasContract = result.contractRevenue > 0;
  const hasExecutive = result.executiveRevenue > 0;
  
  let html = `
    <div class="daily-settlement-container">
      <!-- 헤더 & 빠른 필터 -->
      <div class="settlement-header">
        <h3>📊 일별정산</h3>
        <div class="quick-filters">
          <button onclick="loadSettlementByFilter('today')" class="quick-filter-btn active">오늘</button>
          <button onclick="loadSettlementByFilter('yesterday')" class="quick-filter-btn">어제</button>
          <button onclick="loadSettlementByFilter('week')" class="quick-filter-btn">이번주</button>
          <button onclick="loadSettlementByFilter('month')" class="quick-filter-btn">이번달</button>
          <button onclick="toggleCustomDate()" class="quick-filter-btn custom">📅</button>
        </div>
      </div>
      
      <!-- 사용자 지정 날짜 (숨김) -->
      <div id="custom-date-picker" class="custom-date-picker" style="display: none;">
        <div class="date-inputs">
          <input type="date" id="daily-start-date" value="${startDate}">
          <span>~</span>
          <input type="date" id="daily-end-date" value="${endDate || startDate}">
          <button onclick="filterDailyByDateRange()" class="apply-btn">적용</button>
        </div>
      </div>
      
      <div class="period-badge">
        📅 선택 기간: ${displayDate} (${tasks.length}건)
      </div>
      
      <!-- 대시보드 요약 카드 (3개) -->
      <div class="dashboard-cards">
        <div class="dash-card revenue">
          <div class="card-icon">💵</div>
          <div class="card-content">
            <div class="card-label">총 매출</div>
            <div class="card-value">${formatCurrency(result.totalRevenue)}</div>
          </div>
        </div>
        
        <div class="dash-card expense">
          <div class="card-icon">🧩</div>
          <div class="card-content">
            <div class="card-label">총 지출</div>
            <div class="card-value">${formatCurrency(result.totalPartCost + result.totalFee)}</div>
          </div>
        </div>
        
        <div class="dash-card profit">
          <div class="card-icon">💰</div>
          <div class="card-content">
            <div class="card-label">순이익</div>
            <div class="card-value">${formatCurrency(result.totalProfit)}</div>
          </div>
        </div>
      </div>
  `;
  
  // 🔥 지출 내역 섹션 (실제 출고비 반영)
  html += `
    <div class="expense-section">
      <h4 class="section-title">💸 지출 내역 (실제 출고비 반영)</h4>
      <div class="expense-grid">
        <div class="expense-item">
          <span class="label">부품비 (실제 출고):</span>
          <span class="value cyan">${formatCurrency(result.totalPartCost)}</span>
        </div>
        <div class="expense-item">
          <span class="label">부품비 (기존 계산):</span>
          <span class="value gray">${formatCurrency(result.totalPartCost)}</span>
        </div>
        <div class="expense-item">
          <span class="label">수수료:</span>
          <span class="value orange">${formatCurrency(result.totalFee)}</span>
        </div>
        <div class="expense-separator"></div>
        <div class="expense-item total">
          <span class="label">총 지출:</span>
          <span class="value red">${formatCurrency(result.totalPartCost + result.totalFee)}</span>
        </div>
      </div>
    </div>
  `;
  
  // 🔥 상단 2개 섹션을 가로로 배치
  html += `<div class="settlement-two-columns">`;
  
  // 🔥 1️⃣ 임원 작업 정산 (왼쪽)
  if (hasExecutive) {
    html += getExecutiveWorkSettlementHTML(result);
  } else {
    html += `
      <div class="section-box executive-work-section">
        <div class="section-header-simple">
          <h4>1️⃣ 임원 작업 정산</h4>
        </div>
        <div class="simple-calc-box">
          <div class="no-data-message">임원 작업이 없습니다.</div>
        </div>
      </div>
    `;
  }
  
  // 🔥 2️⃣ 도급기사 정산 (오른쪽)
  if (hasContract) {
    html += getContractWorkerDetailHTML(result, contractWorkers);
  } else {
    html += `
      <div class="section-box contract-section">
        <div class="section-header-simple">
          <h4>2️⃣ 도급기사 정산</h4>
        </div>
        <div class="simple-calc-box">
          <div class="no-data-message">도급기사 작업이 없습니다.</div>
        </div>
      </div>
    `;
  }
  
  html += `</div>`; // settlement-two-columns 종료
  
  // 🔥 3️⃣ 임원 최종 분배 (전체 폭, 아래)
  html += getFinalExecutiveDistributionHTML(result, executives, hasContract);
  
  html += `
    </div>
    
    <style>
      /* 🔥 새로운 3단계 섹션 스타일 */
      .section-header-simple {
        background: linear-gradient(135deg, #f8fafc, #e2e8f0);
        padding: 15px 20px;
        border-radius: 10px 10px 0 0;
        border-bottom: 3px solid #cbd5e1;
      }
      
      .section-header-simple h4 {
        margin: 0;
        font-size: 18px;
        color: #0f172a;
        font-weight: 700;
      }
      
      .simple-calc-box {
        background: white;
        padding: 20px;
        border-radius: 0 0 10px 10px;
      }
      
      .section-subtitle {
        font-size: 13px;
        color: #6b7280;
        font-weight: 600;
        margin-bottom: 10px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .result-line {
        background: linear-gradient(135deg, #f0fdf4, #dcfce7);
        padding: 12px;
        border-radius: 8px;
        margin-top: 10px;
        border-left: 4px solid #22c55e;
      }
      
      .calc-detail {
        font-size: 12px;
        color: #9ca3af;
        margin-top: 4px;
        padding-left: 12px;
      }
      
      .worker-allocation {
        background: #fef3c7;
        padding: 12px;
        border-radius: 8px;
        margin: 8px 0;
        border-left: 4px solid #f59e0b;
      }
      
      .worker-allocation .worker-name {
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 8px;
      }
      
      .executive-list {
        margin-top: 10px;
      }
      
      .exec-item {
        margin-bottom: 8px;
      }
      
      /* 섹션별 색상 */
      .executive-work-section .section-header-simple {
        background: linear-gradient(135deg, #dbeafe, #bfdbfe);
        border-bottom-color: #3b82f6;
      }
      
      /* 🔥 2열 레이아웃 */
      .settlement-two-columns {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
        margin-bottom: 15px;
      }
      
      /* 섹션 박스 높이 제한 */
      .settlement-two-columns .section-box {
        margin-bottom: 0;
        max-height: 500px;
        display: flex;
        flex-direction: column;
      }
      
      .settlement-two-columns .simple-calc-box {
        overflow-y: auto;
        flex: 1;
        max-height: 440px;
      }
      
      /* 스크롤바 스타일 */
      .settlement-two-columns .simple-calc-box::-webkit-scrollbar {
        width: 6px;
      }
      
      .settlement-two-columns .simple-calc-box::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 10px;
      }
      
      .settlement-two-columns .simple-calc-box::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 10px;
      }
      
      .settlement-two-columns .simple-calc-box::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
      
      /* 데이터 없음 메시지 */
      .no-data-message {
        text-align: center;
        padding: 40px 20px;
        color: #9ca3af;
        font-size: 14px;
      }
      
      /* 반응형: 모바일(768px 이하)에서만 세로로 */
      @media (max-width: 768px) {
        .settlement-two-columns {
          grid-template-columns: 1fr;
        }
        
        .settlement-two-columns .section-box {
          max-height: none;
        }
        
        .settlement-two-columns .simple-calc-box {
          max-height: none;
          overflow-y: visible;
        }
      }
      
      .contract-section .section-header-simple {
        background: linear-gradient(135deg, #fed7aa, #fdba74);
        border-bottom-color: #f97316;
      }
      
      .final-distribution-section .section-header-simple {
        background: linear-gradient(135deg, #d1fae5, #a7f3d0);
        border-bottom-color: #10b981;
      }
    </style>
  `;
  
  return html;
}

/**
 * 1️⃣ 임원 작업 정산 HTML
 */
function getExecutiveWorkSettlementHTML(result) {
  return `
    <div class="section-box executive-work-section">
      <div class="section-header-simple collapsible" onclick="toggleExecutiveDetail()">
        <h4>1️⃣ 임원 작업 정산 <span class="toggle-icon" id="executive-toggle-icon">▼</span></h4>
      </div>
      
      <div class="simple-calc-box">
        <!-- 기본 화면: 순이익만 표시 -->
        <div class="executive-summary">
          <div class="profit-summary-item">
            <span class="label">순이익</span>
            <span class="profit-amount">${formatCurrency(result.executiveProfit)}</span>
          </div>
        </div>
        
        <!-- 상세 내용 (기본 숨김) -->
        <div id="executive-detail-content" style="display: none;">
          <div class="calc-separator" style="margin: 20px 0;"></div>
          
          <div class="calc-line">
            <span class="label">일별 담당 매출</span>
            <span class="value revenue-color">${formatCurrency(result.executiveRevenue)}</span>
          </div>
          <div class="calc-line">
            <span class="label">(-) 부품비</span>
            <span class="value expense-color">${formatCurrency(result.executivePartCost)}</span>
          </div>
          <div class="calc-line">
            <span class="label">(-) 수수료 (일반 + 공간티비 수수료)</span>
            <span class="value expense-color">${formatCurrency(result.executiveFee)}</span>
          </div>
          <div class="calc-line result-line">
            <span class="label">= 순이익</span>
            <span class="value profit-color">${formatCurrency(result.executiveProfit)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * 2️⃣ 도급기사 정산 HTML
 */
function getContractWorkerDetailHTML(result, contractWorkers) {
  return `
    <div class="section-box contract-section">
      <div class="section-header-simple collapsible" onclick="toggleContractDetail()">
        <h4>2️⃣ 도급기사 정산 <span class="toggle-icon" id="contract-toggle-icon">▼</span></h4>
      </div>
      
      <div class="simple-calc-box">
        <!-- 기본 화면: 각 기사별 회사 지급 총액만 표시 -->
        <div class="contract-summary">
          ${contractWorkers.map(name => {
            const details = result.contractWorkerDetails && result.contractWorkerDetails[name] ? 
                           result.contractWorkerDetails[name] : 
                           { companyPayment: 0 };
            
            const companyPayment = details.companyPayment || 0;
            
            return `
              <div class="worker-summary-item">
                <span class="worker-name">👷 ${name}</span>
                <span class="company-payment">${formatCurrency(companyPayment)}</span>
              </div>
            `;
          }).join('')}
        </div>
        
        <!-- 상세 내용 (기본 숨김) -->
        <div id="contract-detail-content" style="display: none;">
          <div class="calc-separator" style="margin: 20px 0;"></div>
          
          <div class="section-subtitle">분배 가능액</div>
          <div class="calc-line">
            <span class="label">도급기사 매출</span>
            <span class="value revenue-color">${formatCurrency(result.contractRevenue)}</span>
          </div>
          
          <div class="calc-separator"></div>
          
          ${contractWorkers.map(name => {
            const payment = result.contractPayments[name] || 0;
            const details = result.contractWorkerDetails && result.contractWorkerDetails[name] ? 
                           result.contractWorkerDetails[name] : 
                           { revenue: 0, partsCost: 0, generalFee: 0 };
            
            const revenue = details.revenue || 0;
            const partsCost = details.partsCost || 0;
            const generalFee = details.generalFee || 0;
            const grossPay = revenue * 0.7; // 70%
            
            return `
              <div class="worker-allocation">
                <div class="worker-name">👷 ${name}</div>
                <div class="calc-line">
                  <span class="label">도급기사 수당 (70%)</span>
                  <span class="value contract-color">${formatCurrency(payment)}</span>
                </div>
                <div class="calc-detail-breakdown">
                  <div class="breakdown-line">
                    <span>매출 ${formatCurrency(revenue)} × 70% = ${formatCurrency(grossPay)}</span>
                  </div>
                  <div class="breakdown-line expense">
                    <span>(-) 부품비 ${formatCurrency(partsCost)}</span>
                  </div>
                  <div class="breakdown-line expense">
                    <span>(-) 일반수수료 ${formatCurrency(generalFee)}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
          
          <div class="calc-separator"></div>
          
          <div class="calc-line">
            <span class="label">임원 몫 (30%)</span>
            <span class="value executive-color">${formatCurrency(result.contractToExecutivesBeforeFee || 0)}</span>
          </div>
          <div class="calc-line indent">
            <span class="label">(-) 공간티비 수수료</span>
            <span class="value expense-color">${formatCurrency(result.contractGongganFee || 0)}</span>
          </div>
          <div class="calc-line result-line">
            <span class="label">= 임원에게 (30% - 공간티비수수료)</span>
            <span class="value">${formatCurrency(result.contractRemainder)}</span>
          </div>
          
          <div class="calc-separator"></div>
          
          <div class="company-payment-section">
            <div class="section-subtitle" style="color: #dc2626; font-weight: 700;">회사 지급 총액</div>
            <div class="calc-line">
              <span class="label">임원 몫</span>
              <span class="value">${formatCurrency(result.contractRemainder)}</span>
            </div>
            <div class="calc-line">
              <span class="label">(+) 부품비</span>
              <span class="value">${formatCurrency(result.contractPartCost)}</span>
            </div>
            <div class="calc-line">
              <span class="label">(+) 일반수수료</span>
              <span class="value">${formatCurrency(result.contractFee)}</span>
            </div>
            <div class="calc-line result-line company-total">
              <span class="label">= 도급기사 → 회사 총 지급액</span>
              <span class="value red-emphasis">${formatCurrency(result.contractRemainder + result.contractPartCost + result.contractFee)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * 3️⃣ 임원 최종 분배 HTML
 */
function getFinalExecutiveDistributionHTML(result, executives, hasContract) {
  const executiveProfit = result.executiveProfit || 0;
  const contractRemainder = hasContract ? (result.contractRemainder || 0) : 0;
  const totalBeforeFund = executiveProfit + contractRemainder;
  const companyFund = result.companyFund || 0;
  const totalDistribution = totalBeforeFund - companyFund;
  
  return `
    <div class="section-box final-distribution-section">
      <div class="section-header-simple collapsible" onclick="toggleFinalDistribution()">
        <h4>3️⃣ 임원 최종 분배 <span class="toggle-icon" id="final-toggle-icon">▼</span></h4>
      </div>
      
      <div class="simple-calc-box">
        <!-- 기본 화면: 회사자금 + 임원 카드 -->
        <div class="final-distribution-summary">
          <!-- 회사자금 카드 -->
          <div class="distribution-card company-fund-card">
            <div class="card-icon">🏢</div>
            <div class="card-content">
              <div class="card-label">회사자금 (10%)</div>
              <div class="card-amount">${formatCurrency(companyFund)}</div>
            </div>
          </div>
          
          <!-- 임원 카드들 -->
          ${executives.map((name, index) => {
            const amount = result.finalDistribution[name] || 0;
            const colors = [
              { bg: '#dbeafe', border: '#3b82f6', icon: '👤' },  // 파란색
              { bg: '#e0e7ff', border: '#6366f1', icon: '👤' },  // 보라색
              { bg: '#d1fae5', border: '#10b981', icon: '👤' },  // 초록색
            ];
            const color = colors[index % colors.length];
            
            return `
              <div class="distribution-card executive-card" style="background: ${color.bg}; border-left: 5px solid ${color.border};">
                <div class="card-icon">${color.icon}</div>
                <div class="card-content">
                  <div class="card-label">${name}</div>
                  <div class="card-amount">${formatCurrency(amount)}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        <!-- 상세 내용 (기본 숨김) -->
        <div id="final-distribution-content" style="display: none;">
          <div class="calc-separator" style="margin: 20px 0;"></div>
          
          <div class="section-subtitle">분배 가능액</div>
          
          ${executiveProfit > 0 ? `
            <div class="calc-line">
              <span class="label">임원 작업 순이익 (1번)</span>
              <span class="value">${formatCurrency(executiveProfit)}</span>
            </div>
          ` : ''}
          
          ${hasContract ? `
            <div class="calc-line">
              <span class="label">(+) 도급기사 30% (2번)</span>
              <span class="value">${formatCurrency(contractRemainder)}</span>
            </div>
          ` : ''}
          
          <div class="calc-line result-line">
            <span class="label">= 분배 총액</span>
            <span class="value profit-color">${formatCurrency(totalBeforeFund)}</span>
          </div>
          
          <div class="calc-separator"></div>
          
          <div class="calc-line">
            <span class="label">(-) 회사자금 10%</span>
            <span class="value company-color">${formatCurrency(companyFund)}</span>
          </div>
          <div class="calc-line result-line">
            <span class="label">= 직원 분배액</span>
            <span class="value">${formatCurrency(totalDistribution)}</span>
          </div>
          
          <div class="calc-separator"></div>
          
          <div class="executive-list">
            ${executives.map(name => {
              const amount = result.finalDistribution[name] || 0;
              // 비율 계산
              const totalExecDistribution = executives.reduce((sum, n) => sum + (result.finalDistribution[n] || 0), 0);
              const ratio = totalExecDistribution > 0 ? ((amount / totalExecDistribution) * 10).toFixed(0) : 0;
              
              return `
                <div class="exec-item">
                  <div class="calc-line">
                    <span class="label">👤 ${name} (비율 ${ratio}/10)</span>
                    <span class="value executive-color">${formatCurrency(amount)}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * 임원 정산 HTML (계산 과정 포함) - 기존 함수 (사용 안 함)
 */
function getExecutiveSettlementHTML(result, executives, contractWorkers) {
  const hasContract = result.contractRevenue > 0;
  
  return `
    <div class="section-box executive-section">
      <div class="section-header" onclick="toggleSection('executive-detail')">
        <h4>💼 임원 최종 정산</h4>
        <button class="toggle-btn" id="executive-detail-toggle">
          <span class="icon">▼</span>
          <span class="text">계산과정 보기</span>
        </button>
      </div>
      
      <div class="section-summary">
        <div class="summary-grid">
          ${executives.map(name => `
            <div class="summary-item executive">
              <span class="name">👤 ${name}</span>
              <span class="amount">${formatCurrency(result.finalDistribution[name] || 0)}</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div id="executive-detail" class="section-detail" style="display: none;">
        <div class="calculation-steps">
          
          ${hasContract ? `
            <!-- 도급기사 작업분 먼저 계산 -->
            <div class="step-box contract-step">
              <div class="step-header">
                <span class="step-num">1️⃣</span>
                <span class="step-title">도급기사 작업 정산</span>
              </div>
              <div class="step-content">
                <div class="calc-line">
                  <span class="label">도급기사 담당 매출</span>
                  <span class="value revenue-color">${formatCurrency(result.contractRevenue)}</span>
                </div>
                
                <div class="calc-separator"></div>
                
                ${contractWorkers.map(name => {
                  const payment = result.contractPayments[name] || 0;
                  const rate = 70;
                  return `
                    <div class="worker-calc">
                      <div class="calc-line">
                        <span class="label worker-name">👷 ${name} 수당 (70%)</span>
                      </div>
                      <div class="calc-line indent">
                        <span class="label">매출 × 70% - 부품비 - 일반수수료</span>
                        <span class="value contract-color">${formatCurrency(payment)}</span>
                      </div>
                    </div>
                  `;
                }).join('')}
                
                <div class="calc-separator"></div>
                
                <div class="calc-line">
                  <span class="label">임원 몫 (30%)</span>
                  <span class="value">${formatCurrency(result.contractToExecutivesBeforeFee || 0)}</span>
                </div>
                <div class="calc-line indent">
                  <span class="label">(-) 공간티비 수수료</span>
                  <span class="value expense-color">${formatCurrency(result.contractGongganFee || 0)}</span>
                </div>
                <div class="calc-line result">
                  <span class="label">= 임원에게 돌아갈 금액</span>
                  <span class="value">${formatCurrency(result.contractRemainder)}</span>
                </div>
              </div>
            </div>
          ` : ''}
          
          <!-- 임원 작업분 계산 -->
          <div class="step-box executive-step">
            <div class="step-header">
              <span class="step-num">${hasContract ? '2️⃣' : '1️⃣'}</span>
              <span class="step-title">임원 작업 정산</span>
            </div>
            <div class="step-content">
              <div class="calc-line">
                <span class="label">임원 담당 매출</span>
                <span class="value revenue-color">${formatCurrency(result.executiveRevenue)}</span>
              </div>
              <div class="calc-line indent">
                <span class="label">(-) 부품비</span>
                <span class="value expense-color">${formatCurrency(result.executivePartCost)}</span>
              </div>
              <div class="calc-line indent">
                <span class="label">(-) 수수료 (일반 수수료 + 공간티비 수수료)</span>
                <span class="value expense-color">${formatCurrency(result.executiveFee)}</span>
              </div>
              <div class="calc-line result">
                <span class="label">= 순이익</span>
                <span class="value profit-color">${formatCurrency(result.executiveProfit)}</span>
              </div>
            </div>
          </div>
          
          <!-- 최종 합산 및 분배 -->
          <div class="step-box final-step">
            <div class="step-header">
              <span class="step-num">${hasContract ? '3️⃣' : '2️⃣'}</span>
              <span class="step-title">임원 최종 분배</span>
            </div>
            <div class="step-content">
              ${hasContract ? `
                <div class="calc-line">
                  <span class="label">도급기사 나머지</span>
                  <span class="value">${formatCurrency(result.contractRemainder)}</span>
                </div>
                <div class="calc-line">
                  <span class="label">(+) 임원 순이익</span>
                  <span class="value">${formatCurrency(result.executiveProfit)}</span>
                </div>
                <div class="calc-line result">
                  <span class="label">= 임원 분배 총액</span>
                  <span class="value profit-color">${formatCurrency(result.contractRemainder + result.executiveProfit)}</span>
                </div>
                
                <div class="calc-separator"></div>
              ` : ''}
              
              <div class="calc-line">
                <span class="label">분배 가능액</span>
                <span class="value">${formatCurrency((hasContract ? result.contractRemainder : 0) + result.executiveProfit)}</span>
              </div>
              <div class="calc-line indent">
                <span class="label">(-) 회사자금 10%</span>
                <span class="value company-color">${formatCurrency(result.companyFund)}</span>
              </div>
              <div class="calc-line result">
                <span class="label">= 직원 분배액</span>
                <span class="value">${formatCurrency((hasContract ? result.contractRemainder : 0) + result.executiveProfit - result.companyFund)}</span>
              </div>
              
              <div class="calc-separator"></div>
              
              ${executives.map(name => {
                const amount = result.finalDistribution[name] || 0;
                const ratio = result.executiveDistribution[name] ? 
                  (result.executiveDistribution[name] / Object.values(result.executiveDistribution).reduce((a, b) => a + b, 0) * 10).toFixed(0) : 0;
                return `
                  <div class="calc-line">
                    <span class="label">👤 ${name} (비율 ${ratio}/10)</span>
                    <span class="value executive-color">${formatCurrency(amount)}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  `;
}

/**
 * 도급기사 정산 상세 HTML
 */
function getContractWorkerSettlementHTML(result, contractWorkers) {
  return `
    <div class="section-box contract-section">
      <div class="section-header" onclick="toggleSection('contract-detail')">
        <h4>👷 도급기사 정산 상세</h4>
        <button class="toggle-btn" id="contract-detail-toggle">
          <span class="icon">▼</span>
          <span class="text">상세보기</span>
        </button>
      </div>
      
      <div class="section-summary">
        <div class="summary-grid">
          ${contractWorkers.map(name => `
            <div class="summary-item contract">
              <span class="name">👷 ${name}</span>
              <span class="amount">${formatCurrency(result.contractPayments[name] || 0)}</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div id="contract-detail" class="section-detail" style="display: none;">
        <div class="info-box">
          <div class="info-line">
            <span class="label">도급기사 담당 매출</span>
            <span class="value">${formatCurrency(result.contractRevenue)}</span>
          </div>
          <div class="info-line">
            <span class="label">부품비</span>
            <span class="value">${formatCurrency(result.contractPartCost)}</span>
          </div>
          <div class="info-line">
            <span class="label">수수료</span>
            <span class="value">${formatCurrency(result.contractFee)}</span>
          </div>
          <div class="info-line total">
            <span class="label">순이익</span>
            <span class="value">${formatCurrency(result.contractProfit)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * 최종 정산 요약 HTML
 */
function getFinalSettlementHTML(result, executives, contractWorkers) {
  return `
    <div class="section-box final-section">
      <h4>💰 최종 정산 요약</h4>
      
      <div class="final-grid">
        <div class="final-card company">
          <div class="final-icon">🏢</div>
          <div class="final-content">
            <div class="final-label">회사자금</div>
            <div class="final-value">${formatCurrency(result.companyFund)}</div>
          </div>
        </div>
        
        ${Object.keys(result.finalDistribution).map(name => {
          const amount = result.finalDistribution[name];
          if (amount <= 0) return '';
          
          const isContract = contractWorkers.includes(name);
          const icon = isContract ? '👷' : '👤';
          const className = isContract ? 'contract' : 'executive';
          
          return `
            <div class="final-card ${className}">
              <div class="final-icon">${icon}</div>
              <div class="final-content">
                <div class="final-label">${name}</div>
                <div class="final-value">${formatCurrency(amount)}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * 정산 스타일
 */
function getSettlementStyles() {
  return `
    <style>
      /* 색상 변수 */
      :root {
        --color-revenue: linear-gradient(135deg, #10b981, #059669);
        --color-expense: linear-gradient(135deg, #ef4444, #dc2626);
        --color-profit: linear-gradient(135deg, #22c55e, #16a34a);
        --color-company: linear-gradient(135deg, #f59e0b, #d97706);
        --color-executive: linear-gradient(135deg, #3b82f6, #2563eb);
        --color-contract: linear-gradient(135deg, #f97316, #ea580c);
        
        --text-revenue: #059669;
        --text-expense: #dc2626;
        --text-profit: #16a34a;
        --text-company: #d97706;
        --text-executive: #2563eb;
        --text-contract: #ea580c;
      }
      
      .settlement-subtabs {
        display: flex;
        gap: 8px;
        margin-bottom: 25px;
        background: white;
        padding: 15px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      }
      
      .settle-tab-btn {
        flex: 1;
        padding: 12px 16px;
        border: 2px solid #dee2e6;
        border-radius: 10px;
        background: #f8f9fa !important;
        color: #333 !important;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .settle-tab-btn.active {
        background: var(--color-executive) !important;
        border-color: #2563eb;
        color: #fff !important;
      }
      
      /* 메인 컨테이너 */
      .daily-settlement-container {
        padding: 20px;
      }
      
      /* 헤더 & 빠른 필터 */
      .settlement-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        flex-wrap: nowrap;
        gap: 20px;
      }
      
      .settlement-header h3 {
        margin: 0;
        font-size: 22px;
        color: #0f172a;
        font-weight: 700;
        white-space: nowrap;
      }
      
      .quick-filters {
        display: flex;
        gap: 8px;
        flex-wrap: nowrap;
        overflow-x: auto;
      }
      
      .quick-filters::-webkit-scrollbar {
        height: 4px;
      }
      
      .quick-filters::-webkit-scrollbar-track {
        background: #f1f5f9;
      }
      
      .quick-filters::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 2px;
      }
      
      .quick-filter-btn {
        padding: 8px 16px;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        background: white;
        color: #374151;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .quick-filter-btn:hover {
        border-color: #3b82f6;
        background: #eff6ff;
      }
      
      .quick-filter-btn.active {
        background: var(--color-executive);
        border-color: #2563eb;
        color: white;
      }
      
      .quick-filter-btn.custom {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      
      /* 사용자 지정 날짜 */
      .custom-date-picker {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 15px;
        animation: slideDown 0.3s ease;
      }
      
      .date-inputs {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      
      .date-inputs input[type="date"] {
        padding: 8px 12px;
        border: 2px solid #e5e7eb;
        border-radius: 6px;
        font-size: 14px;
      }
      
      .apply-btn {
        padding: 8px 16px;
        background: var(--color-executive);
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
      }
      
      .period-badge {
        display: block;
        background: #dbeafe;
        color: #1e40af;
        padding: 12px 20px;
        border-radius: 10px;
        font-size: 15px;
        font-weight: 600;
        margin-bottom: 20px;
        border-left: 4px solid #3b82f6;
      }
      
      /* 대시보드 카드 - 3개 */
      .dashboard-cards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 15px;
        margin-bottom: 20px;
      }
      
      .dash-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        display: flex;
        gap: 15px;
        align-items: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        transition: transform 0.2s;
      }
      
      .dash-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 10px rgba(0,0,0,0.12);
      }
      
      .dash-card.revenue {
        background: #dbeafe;
        border-left: 5px solid #3b82f6;
      }
      
      .dash-card.expense {
        background: #fecaca;
        border-left: 5px solid #dc2626;
      }
      
      .dash-card.profit {
        background: #d1fae5;
        border-left: 5px solid #10b981;
      }
      
      .dash-card.people {
        border-left: 5px solid #3b82f6;
      }
      
      /* 수수료 분석 카드 */
      .dash-card.gonggan-fee {
        background: #fef3c7;
        border-left: 5px solid #f59e0b;
      }
      
      .dash-card.others-fee {
        background: #e0e7ff;
        border-left: 5px solid #6366f1;
      }
      
      .dash-card.total-fee {
        background: #d1fae5;
        border-left: 5px solid #10b981;
      }
      
      .card-count {
        font-size: 12px;
        color: #6b7280;
        margin-top: 4px;
      }
      
      .card-icon {
        font-size: 40px;
      }
      
      .card-label {
        font-size: 13px;
        color: #6b7280;
        margin-bottom: 4px;
        font-weight: 500;
      }
      
      /* 월 누적 수령액 섹션 */
      /* 지출내역 섹션 - 회색톤 */
      .expense-section {
        margin: 25px 0;
        padding: 25px;
        background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
        border-radius: 12px;
        box-shadow: 0 4px 15px rgba(148, 163, 184, 0.2);
      }
      
      .expense-section .section-title {
        font-size: 18px;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid rgba(15, 23, 42, 0.15);
      }
      
      .expense-grid {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .expense-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 15px;
        background: rgba(255, 255, 255, 0.6);
        border-radius: 8px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(148, 163, 184, 0.2);
      }
      
      .expense-item.total {
        background: rgba(255, 255, 255, 0.8);
        font-weight: 700;
        font-size: 1.1em;
        padding: 15px;
        margin-top: 5px;
        border: 2px solid #64748b;
      }
      
      .expense-item .label {
        color: #475569;
        font-size: 14px;
        font-weight: 600;
      }
      
      .expense-item .value {
        color: #0f172a;
        font-size: 18px;
        font-weight: 700;
      }
      
      .expense-item .value.cyan {
        color: #0891b2;
      }
      
      .expense-item .value.gray {
        color: #64748b;
      }
      
      .expense-item .value.orange {
        color: #ea580c;
      }
      
      .expense-item .value.red {
        color: #dc2626;
        font-size: 20px;
      }
      
      .expense-separator {
        height: 1px;
        background: rgba(100, 116, 139, 0.3);
        margin: 8px 0;
      }
      
      /* 도급기사 상세 breakdown */
      .calc-detail-breakdown {
        margin-top: 10px;
        padding: 10px;
        background: rgba(0, 0, 0, 0.05);
        border-radius: 6px;
        border-left: 3px solid #f97316;
      }
      
      .breakdown-line {
        font-size: 13px;
        color: #6b7280;
        padding: 4px 0;
        font-weight: 500;
      }
      
      .breakdown-line.expense {
        color: #dc2626;
      }
      
      /* 회사 지급 총액 섹션 */
      .company-payment-section {
        margin-top: 20px;
        padding: 15px;
        background: linear-gradient(135deg, #fee2e2, #fecaca);
        border-radius: 10px;
        border: 2px solid #dc2626;
      }
      
      .company-payment-section .section-subtitle {
        margin-bottom: 15px;
      }
      
      .company-total {
        background: rgba(220, 38, 38, 0.1);
        padding: 15px !important;
        border-radius: 8px;
        margin-top: 10px;
      }
      
      .company-total .value.red-emphasis {
        color: #dc2626 !important;
        font-size: 22px !important;
        font-weight: 800 !important;
      }
      
      /* 접기/펼치기 스타일 */
      .collapsible {
        cursor: pointer;
        user-select: none;
        transition: background-color 0.2s;
      }
      
      .collapsible:hover {
        background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
      }
      
      .toggle-icon {
        font-size: 14px;
        margin-left: 8px;
        color: #64748b;
        transition: transform 0.2s;
      }
      
      /* 임원 작업 정산 요약 */
      .executive-summary {
        padding: 20px;
        background: linear-gradient(135deg, #f0fdf4, #dcfce7);
        border-radius: 10px;
        border-left: 5px solid #22c55e;
      }
      
      .profit-summary-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .profit-summary-item .label {
        font-size: 16px;
        font-weight: 700;
        color: #166534;
      }
      
      .profit-summary-item .profit-amount {
        font-size: 24px;
        font-weight: 800;
        color: #16a34a;
      }
      
      /* 임원 최종 분배 카드 그리드 */
      .final-distribution-summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
      }
      
      .distribution-card {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .distribution-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.12);
      }
      
      .distribution-card.company-fund-card {
        background: linear-gradient(135deg, #fef3c7, #fde68a);
        border-left: 5px solid #f59e0b;
      }
      
      .distribution-card .card-icon {
        font-size: 36px;
        line-height: 1;
      }
      
      .distribution-card .card-content {
        flex: 1;
      }
      
      .distribution-card .card-label {
        font-size: 13px;
        color: #374151;
        font-weight: 600;
        margin-bottom: 5px;
      }
      
      .distribution-card .card-amount {
        font-size: 22px;
        font-weight: 800;
        color: #0f172a;
      }
      
      /* 도급기사 요약 화면 스타일 */
      .contract-summary {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .worker-summary-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        background: linear-gradient(135deg, #fef3c7, #fde68a);
        border-radius: 8px;
        border-left: 4px solid #f59e0b;
      }
      
      .worker-summary-item .worker-name {
        font-size: 16px;
        font-weight: 700;
        color: #0f172a;
      }
      
      .worker-summary-item .company-payment {
        font-size: 20px;
        font-weight: 800;
        color: #dc2626;
      }
      
      @media (max-width: 768px) {
        .expense-section {
          padding: 20px;
        }
        
        .expense-item .value {
          font-size: 16px;
        }
      }
      
      .card-value {
        font-size: 24px;
        font-weight: 700;
        color: #0f172a;
      }
      
      /* 섹션 박스 - 컴팩트 */
      .section-box {
        background: white;
        border-radius: 10px;
        padding: 0;
        margin-bottom: 15px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      }
      
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        user-select: none;
      }
      
      .section-header h4 {
        margin: 0;
        font-size: 18px;
        color: #0f172a;
      }
      
      .toggle-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        background: #f3f4f6;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        color: #374151;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .toggle-btn:hover {
        background: #e5e7eb;
      }
      
      .toggle-btn .icon {
        transition: transform 0.3s;
      }
      
      .toggle-btn.active .icon {
        transform: rotate(180deg);
      }
      
      /* 요약 그리드 */
      .section-summary {
        margin-top: 15px;
      }
      
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
      }
      
      .summary-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        border-radius: 8px;
        font-weight: 600;
      }
      
      .summary-item.executive {
        background: linear-gradient(135deg, #eff6ff, #dbeafe);
        border-left: 4px solid #3b82f6;
      }
      
      .summary-item.contract {
        background: linear-gradient(135deg, #fff7ed, #ffedd5);
        border-left: 4px solid #f97316;
      }
      
      .summary-item .name {
        color: #374151;
        font-size: 15px;
      }
      
      .summary-item .amount {
        color: #0f172a;
        font-size: 18px;
      }
      
      /* 상세 계산 과정 */
      .section-detail {
        margin-top: 20px;
        animation: slideDown 0.3s ease;
      }
      
      .calculation-steps {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      
      .step-box {
        background: #f9fafb;
        border-radius: 10px;
        padding: 20px;
        border: 2px solid #e5e7eb;
      }
      
      .step-box.contract-step {
        border-left: 4px solid #f97316;
      }
      
      .step-box.executive-step {
        border-left: 4px solid #3b82f6;
      }
      
      .step-box.final-step {
        border-left: 4px solid #10b981;
      }
      
      .step-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 2px solid #e5e7eb;
      }
      
      .step-num {
        font-size: 20px;
      }
      
      .step-title {
        font-size: 16px;
        font-weight: 700;
        color: #0f172a;
      }
      
      .calc-line {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        font-size: 14px;
      }
      
      .calc-line.indent {
        padding-left: 20px;
        font-size: 13px;
        color: #6b7280;
      }
      
      .calc-line.result {
        margin-top: 8px;
        padding-top: 10px;
        border-top: 2px dashed #d1d5db;
        font-weight: 700;
        font-size: 15px;
      }
      
      .calc-line .label {
        color: #374151;
        font-size: 14px;
      }
      
      .calc-line .value {
        font-weight: 600;
        font-size: 14px;
      }
      
      .calc-separator {
        height: 1px;
        background: linear-gradient(90deg, transparent, #d1d5db, transparent);
        margin: 12px 0;
      }
      
      .worker-calc {
        margin: 10px 0;
        padding: 10px;
        background: white;
        border-radius: 6px;
      }
      
      .worker-name {
        font-weight: 700;
        color: #0f172a;
      }
      
      /* 색상 클래스 */
      .revenue-color { color: var(--text-revenue); font-weight: 700; }
      .expense-color { color: var(--text-expense); font-weight: 700; }
      .profit-color { color: var(--text-profit); font-weight: 700; }
      .company-color { color: var(--text-company); font-weight: 700; }
      .executive-color { color: var(--text-executive); font-weight: 700; }
      .contract-color { color: var(--text-contract); font-weight: 700; }
      
      /* 최종 정산 카드 */
      .final-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 15px;
        margin-top: 15px;
      }
      
      .final-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.08);
      }
      
      .final-card.company {
        background: linear-gradient(135deg, #fef3c7, #fde68a);
      }
      
      .final-card.executive {
        background: linear-gradient(135deg, #dbeafe, #bfdbfe);
      }
      
      .final-card.contract {
        background: linear-gradient(135deg, #fed7aa, #fdba74);
      }
      
      .final-icon {
        font-size: 28px;
      }
      
      .final-label {
        font-size: 13px;
        color: #6b7280;
        margin-bottom: 4px;
      }
      
      .final-value {
        font-size: 20px;
        font-weight: 700;
        color: #0f172a;
      }
      
      /* 애니메이션 */
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      /* 모바일 최적화 */
      @media (max-width: 768px) {
        .settlement-header {
          flex-direction: column;
          align-items: flex-start;
        }
        
        .quick-filters {
          width: 100%;
          flex-wrap: wrap;
        }
        
        .quick-filter-btn {
          flex: 1;
          min-width: 120px;
        }
        
        .dashboard-cards {
          grid-template-columns: 1fr;
        }
        
        .summary-grid {
          grid-template-columns: 1fr;
        }
        
        .final-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  `;
}

/**
 * 섹션 토글 함수 (전역)
 */
window.toggleSection = function(sectionId) {
  const section = document.getElementById(sectionId);
  const toggle = document.getElementById(sectionId + '-toggle');
  
  if (section.style.display === 'none') {
    section.style.display = 'block';
    if (toggle) toggle.classList.add('active');
  } else {
    section.style.display = 'none';
    if (toggle) toggle.classList.remove('active');
  }
};

/**
 * 사용자 지정 날짜 토글
 */
window.toggleCustomDate = function() {
  const picker = document.getElementById('custom-date-picker');
  if (picker) {
    picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
  }
};

window.toggleWorkerCustomDate = function() {
  const picker = document.getElementById('worker-custom-date-picker');
  if (picker) {
    picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
  }
};

window.toggleFeeCustomDate = function() {
  const picker = document.getElementById('fee-custom-date-picker');
  if (picker) {
    picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
  }
};

window.filterWorkerByDateRange = async function() {
  const startDate = document.getElementById('worker-start-date').value;
  const endDate = document.getElementById('worker-end-date').value;
  
  if (!startDate || !endDate) {
    alert('날짜를 선택해주세요.');
    return;
  }
  
  // 날짜 입력 필드 숨기기
  const picker = document.getElementById('worker-custom-date-picker');
  if (picker) {
    picker.style.display = 'none';
  }
  
  // settlement-main.js의 함수 호출
  if (window.filterWorkerAnalysisByDateRange) {
    await window.filterWorkerAnalysisByDateRange(startDate, endDate);
  }
};

window.filterFeeByDateRange = async function() {
  const startDate = document.getElementById('fee-start-date').value;
  const endDate = document.getElementById('fee-end-date').value;
  
  if (!startDate || !endDate) {
    alert('날짜를 선택해주세요.');
    return;
  }
  
  // 날짜 입력 필드 숨기기
  const picker = document.getElementById('fee-custom-date-picker');
  if (picker) {
    picker.style.display = 'none';
  }
  
  // settlement-main.js의 함수 호출
  if (window.filterFeeAnalysisByDateRange) {
    await window.filterFeeAnalysisByDateRange(startDate, endDate);
  }
};

/**
 * 빠른 필터 (나중에 구현)
 */
window.loadSettlementByFilter = async function(filter) {
  console.log('빠른 필터:', filter);
  
  // 버튼 활성화 상태 변경
  document.querySelectorAll('.quick-filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // 로컬 시간대 기준으로 날짜 문자열 생성
  function getLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // 날짜 범위 계산
  const today = new Date();
  let startDate, endDate;
  
  switch(filter) {
    case 'today':
      startDate = endDate = getLocalDateString(today);
      break;
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      startDate = endDate = getLocalDateString(yesterday);
      break;
    case 'week':
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - today.getDay()); // 일요일
      startDate = getLocalDateString(weekStart);
      endDate = getLocalDateString(today);
      break;
    case 'month':
      startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      endDate = getLocalDateString(today);
      break;
  }
  
  // 날짜 입력 필드 업데이트
  document.getElementById('daily-start-date').value = startDate;
  document.getElementById('daily-end-date').value = endDate;
  
  // 정산 실행
  if (window.filterDailyByDateRange) {
    await window.filterDailyByDateRange();
  }
};

// 기존 함수들 유지 (직원별 분석, 수수료 분석 등)
// ... (나머지 코드는 기존과 동일)

/**
 * 직원별 분석 HTML
 */
export function getWorkerAnalysisHTML(workerStats, startDate, endDate = null) {
  const displayDate = endDate && endDate !== startDate ? `${startDate} ~ ${endDate}` : startDate;
  
  let html = `
    <div class="worker-analysis-container">
      <div class="settlement-header">
        <h3>👷 직원별 분석</h3>
        <div class="quick-filters">
          <button onclick="loadWorkerAnalysisByFilter('today')" class="quick-filter-btn active">오늘</button>
          <button onclick="loadWorkerAnalysisByFilter('yesterday')" class="quick-filter-btn">어제</button>
          <button onclick="loadWorkerAnalysisByFilter('week')" class="quick-filter-btn">이번주</button>
          <button onclick="loadWorkerAnalysisByFilter('month')" class="quick-filter-btn">이번달</button>
          <button onclick="toggleWorkerCustomDate()" class="quick-filter-btn custom">📅</button>
        </div>
      </div>
      
      <!-- 사용자 지정 날짜 (숨김) -->
      <div id="worker-custom-date-picker" class="custom-date-picker" style="display: none;">
        <div class="date-inputs">
          <input type="date" id="worker-start-date" value="${startDate}">
          <span>~</span>
          <input type="date" id="worker-end-date" value="${endDate || startDate}">
          <button onclick="filterWorkerByDateRange()" class="apply-btn">적용</button>
        </div>
      </div>
      
      <div class="period-badge">
        📅 ${displayDate}
      </div>
  `;
  
  const workers = Object.values(workerStats).sort((a, b) => b.totalRevenue - a.totalRevenue);
  
  workers.forEach(worker => {
    if (worker.taskCount === 0) return;
    
    const typeIcon = worker.type === 'executive' ? '💼' : '👷';
    const typeName = worker.type === 'executive' ? '임원' : '도급기사';
    const typeClass = worker.type === 'executive' ? 'executive' : 'contract';
    
    // 수익률 계산
    let profitRate = 0;
    let actualProfit = worker.totalProfit || 0;
    
    // 🔥 도급기사의 경우 순이익 재계산 (매출 - 부품비 - 수수료 - 매출×30%)
    let executiveShare = 0;
    let companyPayment = 0;
    
    if (worker.type === 'contract_worker') {
      executiveShare = (worker.totalRevenue || 0) * 0.3;
      actualProfit = (worker.totalRevenue || 0) - (worker.totalPartCost || 0) - (worker.totalFee || 0) - executiveShare;
      companyPayment = executiveShare + (worker.totalPartCost || 0) + (worker.totalFee || 0);
      profitRate = worker.totalRevenue > 0 ? ((actualProfit / worker.totalRevenue) * 100).toFixed(1) : 0;
    } else {
      profitRate = worker.totalRevenue > 0 ? ((actualProfit / worker.totalRevenue) * 100).toFixed(1) : 0;
    }
    
    html += `
      <div class="worker-card ${typeClass}">
        <div class="worker-header">
          <div class="worker-info">
            <h4>${typeIcon} ${worker.name} <span class="type-badge ${typeClass}">${typeName}</span></h4>
            
            <!-- 요약 통계 (부품비/수수료 추가!) -->
            <div class="worker-summary-grid">
              <div class="summary-stat">
                <span class="label">작업</span>
                <span class="value">${worker.taskCount}건</span>
              </div>
              <div class="summary-stat">
                <span class="label">매출</span>
                <span class="value revenue">${formatCurrency(worker.totalRevenue)}</span>
              </div>
              ${worker.type === 'contract_worker' ? `
                <div class="summary-stat">
                  <span class="label">매출×30%</span>
                  <span class="value expense">${formatCurrency(executiveShare)}</span>
                </div>
              ` : ''}
              <div class="summary-stat">
                <span class="label">부품비</span>
                <span class="value expense">${formatCurrency(worker.totalPartCost || 0)}</span>
              </div>
              <div class="summary-stat">
                <span class="label">수수료</span>
                <span class="value expense">${formatCurrency(worker.totalFee || 0)}</span>
              </div>
              <div class="summary-stat profit-stat">
                <span class="label">순이익</span>
                <span class="value profit">${formatCurrency(actualProfit)}</span>
                <span class="rate">${profitRate}%</span>
              </div>
              ${worker.type === 'contract_worker' ? `
                <div class="summary-stat company-payment-stat">
                  <span class="label">회사지급총액</span>
                  <span class="value company">${formatCurrency(companyPayment)}</span>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
        
        <div class="client-details">
          <div class="detail-toggle" onclick="toggleClientDetail('${worker.name}')">
            <h5>📊 거래처별 상세 <span class="toggle-icon" id="toggle-${worker.name}">▼</span></h5>
          </div>
          <div id="client-detail-${worker.name}" class="client-detail-content" style="display: none;">
    `;
    
    Object.keys(worker.clientDetails).forEach(client => {
      const detail = worker.clientDetails[client];
      const clientProfitRate = detail.amount > 0 ? 
        ((detail.profit / detail.amount) * 100).toFixed(1) : 0;
      
      html += `
            <div class="client-row-enhanced">
              <div class="client-header">
                <span class="client-name">${client}</span>
                <span class="client-count">${detail.count}건</span>
              </div>
              <div class="client-stats-grid">
                <div class="client-stat">
                  <span class="label">매출</span>
                  <span class="value">${formatCurrency(detail.amount)}</span>
                </div>
                <div class="client-stat">
                  <span class="label">부품비</span>
                  <span class="value expense">${formatCurrency(detail.partCost || 0)}</span>
                </div>
                <div class="client-stat">
                  <span class="label">수수료</span>
                  <span class="value expense">${formatCurrency(detail.fee || 0)}</span>
                </div>
                <div class="client-stat profit-stat">
                  <span class="label">순이익</span>
                  <span class="value profit">${formatCurrency(detail.profit || 0)}</span>
                  <span class="rate">(${clientProfitRate}%)</span>
                </div>
              </div>
            </div>
      `;
    });
    
    html += `
          </div>
        </div>
      </div>
    `;
  });
  
  html += `
    </div>
    
    <style>
      .worker-analysis-container {
        padding: 20px;
      }
      
      .worker-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 15px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.08);
      }
      
      .worker-card.executive {
        border-left: 4px solid #3b82f6;
      }
      
      .worker-card.contract {
        border-left: 4px solid #f97316;
      }
      
      .worker-header {
        border-bottom: 2px solid #f3f4f6;
        padding-bottom: 15px;
        margin-bottom: 15px;
      }
      
      .worker-info h4 {
        margin: 0 0 12px 0;
        font-size: 18px;
        color: #0f172a;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .type-badge {
        font-size: 11px;
        padding: 3px 8px;
        border-radius: 10px;
        font-weight: 600;
      }
      
      .type-badge.executive {
        background: #dbeafe;
        color: #1e40af;
      }
      
      .type-badge.contract {
        background: #ffedd5;
        color: #9a3412;
      }
      
      /* 요약 통계 그리드 */
      .worker-summary-grid {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 10px;
      }
      
      .summary-stat {
        background: #f9fafb;
        padding: 8px 12px;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 85px;
        border: 1px solid #f3f4f6;
      }
      
      .summary-stat.profit-stat {
        background: linear-gradient(135deg, #f0fdf4, #dcfce7);
        border: 1px solid #86efac;
      }
      
      .summary-stat.company-payment-stat {
        background: linear-gradient(135deg, #fee2e2, #fecaca);
        border: 1px solid #f87171;
      }
      
      .summary-stat .label {
        font-size: 11px;
        color: #6b7280;
        font-weight: 500;
      }
      
      .summary-stat .value {
        font-size: 14px;
        font-weight: 700;
        color: #0f172a;
      }
      
      .summary-stat .value.revenue {
        color: #059669;
      }
      
      .summary-stat .value.expense {
        color: #dc2626;
      }
      
      .summary-stat .value.profit {
        color: #16a34a;
      }
      
      .summary-stat .value.company {
        color: #dc2626;
      }
      
      .summary-stat .rate {
        font-size: 10px;
        color: #16a34a;
        font-weight: 600;
      }
      
      /* 거래처 상세 토글 */
      .client-details {
        margin-top: 15px;
      }
      
      .detail-toggle {
        cursor: pointer;
        padding: 10px;
        background: #f9fafb;
        border-radius: 8px;
        margin-bottom: 10px;
        transition: background 0.2s;
      }
      
      .detail-toggle:hover {
        background: #f3f4f6;
      }
      
      .detail-toggle h5 {
        margin: 0;
        font-size: 14px;
        color: #374151;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .toggle-icon {
        transition: transform 0.3s;
        color: #9ca3af;
      }
      
      .toggle-icon.open {
        transform: rotate(180deg);
      }
      
      .client-detail-content {
        animation: slideDown 0.3s ease;
      }
      
      /* 거래처 행 개선 */
      .client-row-enhanced {
        background: #fafafa;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 8px;
        border-left: 3px solid #e5e7eb;
      }
      
      .client-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      
      .client-header .client-name {
        font-weight: 700;
        color: #0f172a;
        font-size: 14px;
      }
      
      .client-header .client-count {
        background: #e5e7eb;
        padding: 3px 8px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 600;
        color: #374151;
      }
      
      .client-stats-grid {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      
      .client-stat {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      
      .client-stat.profit-stat {
        background: #f0fdf4;
        padding: 6px 10px;
        border-radius: 6px;
      }
      
      .client-stat .label {
        font-size: 11px;
        color: #6b7280;
      }
      
      .client-stat .value {
        font-size: 13px;
        font-weight: 600;
        color: #0f172a;
      }
      
      .client-stat .value.expense {
        color: #dc2626;
      }
      
      .client-stat .value.profit {
        color: #16a34a;
      }
      
      .client-stat .rate {
        font-size: 10px;
        color: #16a34a;
        font-weight: 600;
      }
      
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    </style>
  `;
  
  return html;
}

/**
 * 수수료 분석 HTML
 */
export function getFeeAnalysisHTML(feeStats, startDate, endDate = null) {
  const displayDate = endDate && endDate !== startDate ? `${startDate} ~ ${endDate}` : startDate;
  
  let html = `
    <div class="fee-analysis-container">
      <div class="settlement-header">
        <h3>💳 수수료 분석</h3>
        <div class="quick-filters">
          <button onclick="loadFeeAnalysisByFilter('today')" class="quick-filter-btn active">오늘</button>
          <button onclick="loadFeeAnalysisByFilter('yesterday')" class="quick-filter-btn">어제</button>
          <button onclick="loadFeeAnalysisByFilter('week')" class="quick-filter-btn">이번주</button>
          <button onclick="loadFeeAnalysisByFilter('month')" class="quick-filter-btn">이번달</button>
          <button onclick="toggleFeeCustomDate()" class="quick-filter-btn custom">📅</button>
        </div>
      </div>
      
      <!-- 사용자 지정 날짜 (숨김) -->
      <div id="fee-custom-date-picker" class="custom-date-picker" style="display: none;">
        <div class="date-inputs">
          <input type="date" id="fee-start-date" value="${startDate}">
          <span>~</span>
          <input type="date" id="fee-end-date" value="${endDate || startDate}">
          <button onclick="filterFeeByDateRange()" class="apply-btn">적용</button>
        </div>
      </div>
      
      <div class="period-badge">
        📅 선택 기간: ${displayDate}
      </div>
      
      <!-- 수수료 요약 카드 (대시보드 스타일) -->
      <div class="dashboard-cards">
        <div class="dash-card gonggan-fee">
          <div class="card-icon">🏢</div>
          <div class="card-content">
            <div class="card-label">공간/공간티비</div>
            <div class="card-value">${formatCurrency(feeStats.gongganTotal)}</div>
          </div>
        </div>
        
        <div class="dash-card others-fee">
          <div class="card-icon">🏪</div>
          <div class="card-content">
            <div class="card-label">기타 업체</div>
            <div class="card-value">${formatCurrency(feeStats.othersTotal)}</div>
          </div>
        </div>
        
        <div class="dash-card total-fee">
          <div class="card-icon">💰</div>
          <div class="card-content">
            <div class="card-label">총 수수료</div>
            <div class="card-value">${formatCurrency(feeStats.gongganTotal + feeStats.othersTotal)}</div>
          </div>
        </div>
      </div>
      
      <!-- 공간/공간티비 수수료 내역 -->
      ${feeStats.gongganTasks.length > 0 ? `
      <div class="fee-section">
        <h4 class="fee-section-title">🏢 공간/공간티비 수수료 내역</h4>
        <div class="fee-cards-grid">
          ${feeStats.gongganTasks.map(task => {
            const date = task.date ? new Date(task.date).toLocaleString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            }) : '날짜 미상';
            
            return `
              <div class="fee-task-card gonggan-border">
                <div class="fee-card-header">
                  <span class="fee-card-date">${date}</span>
                  <span class="fee-card-amount">${formatCurrency(task.amount)}</span>
                </div>
                <div class="fee-card-body">
                  <div class="fee-card-row">
                    <span class="fee-icon-label">🏢</span>
                    <span class="fee-text">${task.client || '공간'}</span>
                  </div>
                  <div class="fee-card-row">
                    <span class="fee-icon-label">👤</span>
                    <span class="fee-text">${task.worker || '미정'}</span>
                  </div>
                  <div class="fee-card-row">
                    <span class="fee-icon-label">📍</span>
                    <span class="fee-text">${task.displayAddress || '주소 미입력'}</span>
                  </div>
                </div>
                <div class="fee-card-footer">
                  <span class="fee-rate-badge gonggan">22%</span>
                  <span class="fee-arrow">→</span>
                  <span class="fee-result">${formatCurrency(task.calculatedFee)}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="fee-section-total">
          공간/공간티비 총 수수료: <strong>${formatCurrency(feeStats.gongganTotal)}</strong>
        </div>
      </div>
      ` : ''}
      
      <!-- 기타 업체 수수료 내역 -->
      ${feeStats.othersTasks.length > 0 ? `
      <div class="fee-section">
        <h4 class="fee-section-title">🏪 기타 업체 수수료 내역</h4>
        <div class="fee-cards-grid">
          ${feeStats.othersTasks.map(task => {
            const date = task.date ? new Date(task.date).toLocaleString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            }) : '날짜 미상';
            
            const feeRate = task.amount > 0 ? ((task.calculatedFee / task.amount) * 100).toFixed(0) : 0;
            
            return `
              <div class="fee-task-card others-border">
                <div class="fee-card-header">
                  <span class="fee-card-date">${date}</span>
                  <span class="fee-card-amount">${formatCurrency(task.amount)}</span>
                </div>
                <div class="fee-card-body">
                  <div class="fee-card-row">
                    <span class="fee-icon-label">🏪</span>
                    <span class="fee-text">${task.client || '미분류'}</span>
                  </div>
                  <div class="fee-card-row">
                    <span class="fee-icon-label">👤</span>
                    <span class="fee-text">${task.worker || '미정'}</span>
                  </div>
                  <div class="fee-card-row">
                    <span class="fee-icon-label">📍</span>
                    <span class="fee-text">${task.displayAddress || '주소 미입력'}</span>
                  </div>
                </div>
                <div class="fee-card-footer">
                  <span class="fee-rate-badge others">${feeRate}%</span>
                  <span class="fee-arrow">→</span>
                  <span class="fee-result">${formatCurrency(task.calculatedFee)}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="fee-section-total">
          기타 업체 총 수수료: <strong>${formatCurrency(feeStats.othersTotal)}</strong>
        </div>
      </div>
      ` : ''}
  `;
  
  html += `
    </div>
    
    <style>
      .fee-analysis-container {
        padding: 20px;
      }
      
      /* 수수료 섹션 */
      .fee-section {
        margin: 30px 0;
      }
      
      .fee-section-title {
        font-size: 18px;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid #e5e7eb;
      }
      
      /* 카드 그리드 */
      .fee-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 20px;
        margin-bottom: 20px;
      }
      
      /* 개별 작업 카드 */
      .fee-task-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .fee-task-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.12);
      }
      
      .fee-task-card.gonggan-border {
        border-left: 5px solid #22c55e;
      }
      
      .fee-task-card.others-border {
        border-left: 5px solid #f59e0b;
      }
      
      /* 카드 헤더 */
      .fee-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 12px;
        border-bottom: 1px solid #f3f4f6;
      }
      
      .fee-card-date {
        font-size: 13px;
        color: #0891b2;
        font-weight: 600;
      }
      
      .fee-card-amount {
        font-size: 16px;
        font-weight: 800;
        color: #0f172a;
      }
      
      /* 카드 본문 */
      .fee-card-body {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 15px;
      }
      
      .fee-card-row {
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }
      
      .fee-icon-label {
        font-size: 14px;
        min-width: 20px;
      }
      
      .fee-text {
        font-size: 13px;
        color: #475569;
        line-height: 1.4;
        word-break: break-all;
      }
      
      /* 카드 푸터 */
      .fee-card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 15px;
        background: #f9fafb;
        border-radius: 8px;
      }
      
      .fee-rate-badge {
        padding: 5px 12px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 700;
        color: white;
      }
      
      .fee-rate-badge.gonggan {
        background: #22c55e;
      }
      
      .fee-rate-badge.others {
        background: #f59e0b;
      }
      
      .fee-arrow {
        color: #94a3b8;
        font-weight: 700;
        font-size: 16px;
      }
      
      .fee-result {
        font-size: 16px;
        font-weight: 800;
        color: #0891b2;
      }
      
      /* 섹션 합계 */
      .fee-section-total {
        text-align: right;
        padding: 15px 20px;
        background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
        border-radius: 10px;
        font-size: 15px;
        color: #475569;
      }
      
      .fee-section-total strong {
        color: #0f172a;
        font-size: 18px;
      }
      
      /* 반응형 */
      @media (max-width: 768px) {
        .fee-cards-grid {
          grid-template-columns: 1fr;
        }
      }
      
      /* 거래처별 상세 */
      .client-fee-details {
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.08);
      }
      
      .client-fee-details h4 {
        margin: 0 0 15px 0;
        font-size: 16px;
        color: #0f172a;
        font-weight: 700;
      }
      
      .client-fee-grid {
        display: grid;
        gap: 10px;
      }
      
      .client-fee-row {
        background: #f9fafb;
        padding: 15px;
        border-radius: 10px;
      }
      
      .client-fee-row.gonggan {
        border-left: 3px solid #f59e0b;
      }
      
      .client-fee-row.others {
        border-left: 3px solid #10b981;
      }
      
      .client-fee-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      
      .client-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .client-fee-header .client-name {
        font-weight: 700;
        color: #0f172a;
        font-size: 14px;
      }
      
      .client-fee-header .client-address {
        font-size: 12px;
        color: #6b7280;
        font-weight: 400;
      }
      
      .client-fee-header .client-workers {
        font-size: 12px;
        color: #3b82f6;
        font-weight: 500;
        margin-top: 2px;
      }
      
      .client-fee-header .type-badge {
        font-size: 11px;
        padding: 3px 8px;
        border-radius: 10px;
        font-weight: 600;
      }
      
      .client-fee-header .type-badge.gonggan {
        background: #fef3c7;
        color: #92400e;
      }
      
      .client-fee-header .type-badge.others {
        background: #d1fae5;
        color: #065f46;
      }
      
      .client-fee-stats {
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
      }
      
      .cfs-item {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      
      .cfs-item.highlight {
        background: #fff7ed;
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid #fed7aa;
      }
      
      .cfs-item .label {
        font-size: 11px;
        color: #6b7280;
      }
      
      .cfs-item .value {
        font-size: 13px;
        font-weight: 700;
        color: #0f172a;
      }
      
      .cfs-item .rate {
        font-size: 10px;
        color: #ea580c;
        font-weight: 600;
      }
      
      .no-data-message {
        text-align: center;
        padding: 40px 20px;
        color: #9ca3af;
        font-size: 14px;
      }
      
      @media (max-width: 768px) {
        .fee-summary {
          grid-template-columns: 1fr;
        }
        
        .client-fee-stats {
          flex-direction: column;
          gap: 10px;
        }
      }
    </style>
  `;
  
  return html;
}

// 전역 함수 - 직원별 분석에서 거래처 상세 토글
window.toggleClientDetail = function(workerName) {
  const detail = document.getElementById(`client-detail-${workerName}`);
  const toggle = document.getElementById(`toggle-${workerName}`);
  
  if (detail && toggle) {
    if (detail.style.display === "none") {
      detail.style.display = "block";
      toggle.classList.add("open");
    } else {
      detail.style.display = "none";
      toggle.classList.remove("open");
    }
  }
};

// 직원별 분석 빠른 필터
window.loadWorkerAnalysisByFilter = async function(filter) {
  console.log('직원별 분석 빠른 필터:', filter);
  
  // 버튼 활성화 상태 변경
  document.querySelectorAll('.quick-filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // 로컬 시간대 기준으로 날짜 문자열 생성
  function getLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // 날짜 범위 계산
  const today = new Date();
  let startDate, endDate;
  
  switch(filter) {
    case 'today':
      startDate = endDate = getLocalDateString(today);
      break;
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      startDate = endDate = getLocalDateString(yesterday);
      break;
    case 'week':
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - today.getDay());
      startDate = getLocalDateString(weekStart);
      endDate = getLocalDateString(today);
      break;
    case 'month':
      startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      endDate = getLocalDateString(today);
      break;
  }
  
  // 날짜 입력 필드 업데이트
  document.getElementById('worker-start-date').value = startDate;
  document.getElementById('worker-end-date').value = endDate;
  
  // 정산 실행
  if (window.filterWorkerByDateRange) {
    await window.filterWorkerByDateRange();
  }
};

// 수수료 분석 빠른 필터
window.loadFeeAnalysisByFilter = async function(filter) {
  console.log('수수료 분석 빠른 필터:', filter);
  
  // 버튼 활성화 상태 변경
  document.querySelectorAll('.quick-filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // 로컬 시간대 기준으로 날짜 문자열 생성
  function getLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // 날짜 범위 계산
  const today = new Date();
  let startDate, endDate;
  
  switch(filter) {
    case 'today':
      startDate = endDate = getLocalDateString(today);
      break;
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      startDate = endDate = getLocalDateString(yesterday);
      break;
    case 'week':
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - today.getDay());
      startDate = getLocalDateString(weekStart);
      endDate = getLocalDateString(today);
      break;
    case 'month':
      startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      endDate = getLocalDateString(today);
      break;
  }
  
  // 날짜 입력 필드 업데이트
  document.getElementById('fee-start-date').value = startDate;
  document.getElementById('fee-end-date').value = endDate;
  
  // 정산 실행
  if (window.filterFeeByDateRange) {
    await window.filterFeeByDateRange();
  }
};

/**
 * 도급기사 정산 상세 토글 함수
 */
window.toggleContractDetail = function() {
  const content = document.getElementById('contract-detail-content');
  const icon = document.getElementById('contract-toggle-icon');
  
  if (content && icon) {
    if (content.style.display === 'none') {
      content.style.display = 'block';
      icon.textContent = '▲';
    } else {
      content.style.display = 'none';
      icon.textContent = '▼';
    }
  }
};

/**
 * 임원 작업 정산 상세 토글 함수
 */
window.toggleExecutiveDetail = function() {
  const content = document.getElementById('executive-detail-content');
  const icon = document.getElementById('executive-toggle-icon');
  
  if (content && icon) {
    if (content.style.display === 'none') {
      content.style.display = 'block';
      icon.textContent = '▲';
    } else {
      content.style.display = 'none';
      icon.textContent = '▼';
    }
  }
};

/**
 * 임원 최종 분배 상세 토글 함수
 */
window.toggleFinalDistribution = function() {
  const content = document.getElementById('final-distribution-content');
  const icon = document.getElementById('final-toggle-icon');
  
  if (content && icon) {
    if (content.style.display === 'none') {
      content.style.display = 'block';
      icon.textContent = '▲';
    } else {
      content.style.display = 'none';
      icon.textContent = '▼';
    }
  }
};
