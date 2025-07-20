// scripts/settle.js (ES6 모듈)
import { PARTS_LIST } from './parts-list.js';

export async function loadSettlement() {
  try {
    console.log('정산 시작...');
    
    // Firebase 인스턴스 확인
    const db = window.db;
    const { getDocs, collection, where, query } = window.firebase;
    
    if (!db || !getDocs) {
      throw new Error('Firebase가 초기화되지 않았습니다.');
    }

    // 완료된 작업 가져오기
    const q = query(collection(db, "tasks"), where("done", "==", true));
    const querySnapshot = await getDocs(q);
    
    console.log(`완료된 작업 ${querySnapshot.size}개 발견`);

    // 부품 단가 맵 생성
    const priceMap = {};
    if (PARTS_LIST && Array.isArray(PARTS_LIST)) {
      PARTS_LIST.forEach(item => {
        if (item.name && item.price !== undefined) {
          priceMap[item.name] = item.price;
        }
      });
    }
    console.log('부품 가격 맵:', priceMap);

    const dayStats = {};
    let processedCount = 0;
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      console.log('처리 중인 작업:', data);
      
      if (!data.date) {
        console.warn('날짜 없는 작업 스킵:', doc.id);
        return;
      }
      
      const day = data.date.slice(0, 10);
      
      if (!dayStats[day]) {
        dayStats[day] = {
          total: 0, spend: 0, partSpend: 0, fee: 0, profit: 0,
          company: 0, sungwook: 0, sungho: 0, heejong: 0,
          taskCount: 0
        };
      }
      
      // 총매출
      const amount = Number(data.amount) || 0;
      dayStats[day].total += amount;
      dayStats[day].taskCount += 1;

      // 부품지출 계산
      let partSpend = 0;
      if (data.parts) {
        const parts = data.parts.split(',');
        parts.forEach(part => {
          const trimmedPart = part.trim();
          if (trimmedPart) {
            const [name, count] = trimmedPart.split(':');
            const partName = name ? name.trim() : '';
            const partCount = Number(count) || 1;
            const partPrice = priceMap[partName] || 0;
            
            partSpend += partPrice * partCount;
            console.log(`부품: ${partName}, 수량: ${partCount}, 단가: ${partPrice}, 소계: ${partPrice * partCount}`);
          }
        });
      }
      dayStats[day].partSpend += partSpend;

      // 수수료 계산 (클라이언트에 '공간' 포함시 22%)
      let fee = 0;
      if (data.client && data.client.includes("공간")) {
        fee = Math.round(amount * 0.22);
      }
      dayStats[day].fee += fee;
      
      processedCount++;
    });

    console.log(`총 ${processedCount}개 작업 처리 완료`);

    // 최종 계산
    Object.keys(dayStats).forEach(day => {
      const d = dayStats[day];
      d.spend = d.partSpend + d.fee;
      d.profit = d.total - d.spend;
      d.company = Math.round(d.profit * 0.2);
      const remain = d.profit - d.company;
      d.sungwook = Math.round(remain * 0.4);
      d.sungho = Math.round(remain * 0.3);
      d.heejong = Math.round(remain * 0.3);
    });

    // 표 출력 (내림차순 정렬로 변경)
    let sortedDays = Object.entries(dayStats).sort((a, b) => b[0].localeCompare(a[0]));
    
    if (sortedDays.length === 0) {
      document.getElementById('settle-result').innerHTML = '<p style="text-align: center; color: #666; font-size: 18px; padding: 40px;">완료된 작업이 없습니다.</p>';
      return;
    }

    // 필터링을 위한 전체 데이터 저장
    window.allSettlementData = sortedDays;
    window.dayStats = dayStats;
    
    let html = `
      <style>
        .settlement-container {
          font-family: 'Malgun Gothic', '맑은 고딕', Arial, sans-serif;
          max-width: 100%;
          margin: 0 auto;
          font-weight: 500;
        }
        
        .settlement-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          background: white;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }
        
        .settlement-table th {
          background: #f4f6f8;
          padding: 15px 10px;
          text-align: center;
          font-weight: 600;
          font-size: 14px;
          color: #333;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .settlement-table td {
          padding: 12px 10px;
          border-bottom: 1px solid #f1f3f4;
          text-align: center;
          font-size: 14px;
          font-weight: 500;
        }
        
        .settlement-table tr:hover {
          background-color: #f8f9fa;
        }
        
        .date-filter-container {
          background: white;
          padding: 15px 20px;
          border-radius: 10px;
          margin-bottom: 15px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          gap: 15px;
          justify-content: space-between;
        }
        
        .filter-group {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }
        
        .filter-input {
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 10px;
          font-size: 14px;
          flex: 1;
          min-width: 140px;
        }
        
        .filter-input:focus {
          outline: none;
          border-color: #8ecae6;
        }
        
        .filter-btn {
          background: #8ecae6;
          color: white;
          border: none;
          padding: 8px 24px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          min-width: 80px;
        }
        
        .filter-btn:hover {
          background: #219ebc;
        }
        
        .reset-btn {
          background: #6c757d;
          color: white;
          border: none;
          padding: 8px 24px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          min-width: 80px;
        }
        
        .reset-btn:hover {
          background: #5a6268;
        }
        
        .filter-label {
          font-weight: 600;
          color: #333;
          font-size: 14px;
        }
        
        .date-range-separator {
          font-weight: 600;
          color: #666;
          margin: 0 5px;
        }
        
        .amount-cell {
          text-align: right !important;
          font-family: 'Segoe UI', '맑은 고딕', Arial, sans-serif;
          font-weight: 600;
          font-size: 13px;
        }
        
        .profit-cell {
          background-color: #e8f5e8 !important;
          font-weight: 700;
          color: #2e7d32;
          font-size: 14px;
        }
        
        .summary-container {
          background: white;
          padding: 15px;
          border-radius: 10px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }
        
        .summary-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 12px;
          text-align: center;
          color: #333;
        }
        
        .summary-row {
          display: flex;
          background: #f8f9fa;
          border-radius: 10px;
          overflow: hidden;
        }
        
        .summary-item {
          flex: 1;
          padding: 15px;
          text-align: center;
          border-right: 1px solid #e0e0e0;
        }
        
        .summary-item:last-child {
          border-right: none;
        }
        
        .summary-item.total-profit {
          background: #e8f5e8;
        }
        
        .summary-label {
          font-weight: 600;
          font-size: 12px;
          color: #666;
          margin-bottom: 5px;
          display: block;
        }
        
        .summary-value {
          font-family: 'Segoe UI', '맑은 고딕', Arial, sans-serif;
          font-weight: 700;
          font-size: 16px;
          color: #333;
          display: block;
        }
        
        .total-profit .summary-value {
          color: #2e7d32 !important;
          font-size: 18px !important;
          font-weight: 800 !important;
        }
        
        .date-cell {
          font-weight: 600;
          color: #333;
          background-color: #f8f9fa !important;
          font-size: 13px;
        }
        
        @media (max-width: 768px) {
          .settlement-table, .summary-table {
            font-size: 12px;
          }
          
          .settlement-table th, .settlement-table td {
            padding: 10px 6px;
            font-size: 12px;
          }
          
          .date-filter-container {
            flex-direction: column;
            gap: 10px;
            align-items: stretch;
          }
          
          .filter-group {
            justify-content: space-between;
          }
          
          .filter-input {
            min-width: 120px;
          }
          
          .filter-btn, .reset-btn {
            padding: 8px 16px;
            font-size: 13px;
            min-width: 70px;
          }
          
          .summary-item {
            padding: 12px;
          }
          
          .summary-value {
            font-size: 14px !important;
          }
          
          .total-profit .summary-value {
            font-size: 16px !important;
          }
          
          .summary-row {
            flex-direction: column;
          }
          
          .summary-item {
            border-right: none;
            border-bottom: 1px solid #e0e0e0;
          }
          
          .summary-item:last-child {
            border-bottom: none;
          }
        }
      </style>
      
      <div class="settlement-container">
        
        <!-- 전체 합계 -->
        <div class="summary-container">
          <div class="summary-title">📊 전체 합계</div>
          <div class="summary-row">
            <div class="summary-item">
              <span class="summary-label">💵 총 매출</span>
              <span class="summary-value" id="total-revenue">
                ${sortedDays.reduce((sum, [_, d]) => sum + d.total, 0).toLocaleString()}원
              </span>
            </div>
            <div class="summary-item">
              <span class="summary-label">💸 총 지출</span>
              <span class="summary-value" id="total-expense">
                ${sortedDays.reduce((sum, [_, d]) => sum + d.spend, 0).toLocaleString()}원
              </span>
            </div>
            <div class="summary-item total-profit">
              <span class="summary-label">💰 총 순이익</span>
              <span class="summary-value" id="total-profit">
                ${sortedDays.reduce((sum, [_, d]) => sum + d.profit, 0).toLocaleString()}원
              </span>
            </div>
          </div>
        </div>
        
        <!-- 날짜 필터 -->
        <div class="date-filter-container">
          <div class="filter-group">
            <span class="filter-label">📅 기간:</span>
            <input type="date" id="start-date" class="filter-input" />
            <span class="date-range-separator">~</span>
            <input type="date" id="end-date" class="filter-input" />
          </div>
          <button onclick="applyDateFilter()" class="filter-btn">검색</button>
          <button onclick="resetDateFilter()" class="reset-btn">전체보기</button>
        </div>
        
        <table class="settlement-table" id="settlement-table">
          <thead>
            <tr>
              <th>📅 날짜</th>
              <th>📋 작업수</th>
              <th>💵 총매출</th>
              <th>🔧 부품비</th>
              <th>💳 수수료</th>
              <th>💸 총지출</th>
              <th>📈 순이익</th>
              <th>🏢 회사자금</th>
              <th>👤 성욱</th>
              <th>👤 성호</th>
              <th>👤 희종</th>
            </tr>
          </thead>
          <tbody id="settlement-tbody">
            ${sortedDays.map(([day, d]) => `
              <tr data-date="${day}">
                <td class="date-cell">${formatDate(day)}</td>
                <td><span style="background:#e3f2fd;padding:4px 8px;border-radius:6px;color:#1565c0;font-weight:600;font-size:12px;">${d.taskCount}</span></td>
                <td class="amount-cell">${d.total.toLocaleString()}원</td>
                <td class="amount-cell">${d.partSpend.toLocaleString()}원</td>
                <td class="amount-cell">${d.fee.toLocaleString()}원</td>
                <td class="amount-cell">${d.spend.toLocaleString()}원</td>
                <td class="amount-cell profit-cell">${d.profit.toLocaleString()}원</td>
                <td class="amount-cell">${d.company.toLocaleString()}원</td>
                <td class="amount-cell">${d.sungwook.toLocaleString()}원</td>
                <td class="amount-cell">${d.sungho.toLocaleString()}원</td>
                <td class="amount-cell">${d.heejong.toLocaleString()}원</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
      </div>
    `;
    
    document.getElementById('settle-result').innerHTML = html;
    console.log('정산 표시 완료');
    
  } catch (error) {
    console.error('정산 오류:', error);
    document.getElementById('settle-result').innerHTML = `
      <div style="background: #f8d7da; color: #721c24; padding: 20px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
        <h3 style="margin: 0 0 15px 0; font-size: 18px;">❌ 정산 오류</h3>
        <p style="margin: 0 0 10px 0; font-size: 14px;">오류: ${error.message}</p>
        <p style="margin: 0; opacity: 0.8;">브라우저 콘솔(F12)에서 자세한 내용을 확인해주세요.</p>
      </div>
    `;
  }
}

// 날짜 포맷팅 함수
function formatDate(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const diffTime = today.getTime() - date.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    weekday: 'short'
  };
  
  let formatted = date.toLocaleDateString('ko-KR', options);
  
  if (diffDays === 1) {
    formatted += ' (어제)';
  } else if (diffDays === 0) {
    formatted += ' (오늘)';
  } else if (diffDays < 7) {
    formatted += ` (${diffDays}일 전)`;
  }
  
  return formatted;
}

// 날짜 필터 적용 함수
export function applyDateFilter() {
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;
  
  if (!startDate && !endDate) {
    alert('시작 날짜 또는 종료 날짜를 선택해주세요.');
    return;
  }
  
  let filteredData = window.allSettlementData;
  
  if (startDate) {
    filteredData = filteredData.filter(([date, _]) => date >= startDate);
  }
  
  if (endDate) {
    filteredData = filteredData.filter(([date, _]) => date <= endDate);
  }
  
  if (filteredData.length === 0) {
    document.getElementById('settlement-tbody').innerHTML = 
      '<tr><td colspan="11" style="text-align: center; padding: 40px; color: #666;">선택한 기간에 완료된 작업이 없습니다.</td></tr>';
    updateSummary([]);
    return;
  }
  
  // 테이블 업데이트
  const tbody = document.getElementById('settlement-tbody');
  tbody.innerHTML = filteredData.map(([day, d]) => `
    <tr data-date="${day}">
      <td class="date-cell">${formatDate(day)}</td>
      <td><span style="background:#e3f2fd;padding:4px 8px;border-radius:6px;color:#1565c0;font-weight:600;font-size:12px;">${d.taskCount}</span></td>
      <td class="amount-cell">${d.total.toLocaleString()}원</td>
      <td class="amount-cell">${d.partSpend.toLocaleString()}원</td>
      <td class="amount-cell">${d.fee.toLocaleString()}원</td>
      <td class="amount-cell">${d.spend.toLocaleString()}원</td>
      <td class="amount-cell profit-cell">${d.profit.toLocaleString()}원</td>
      <td class="amount-cell">${d.company.toLocaleString()}원</td>
      <td class="amount-cell">${d.sungwook.toLocaleString()}원</td>
      <td class="amount-cell">${d.sungho.toLocaleString()}원</td>
      <td class="amount-cell">${d.heejong.toLocaleString()}원</td>
    </tr>
  `).join('');
  
  // 합계 업데이트
  updateSummary(filteredData);
}

// 날짜 필터 리셋 함수
export function resetDateFilter() {
  document.getElementById('start-date').value = '';
  document.getElementById('end-date').value = '';
  
  // 전체 데이터로 테이블 복원
  const tbody = document.getElementById('settlement-tbody');
  tbody.innerHTML = window.allSettlementData.map(([day, d]) => `
    <tr data-date="${day}">
      <td class="date-cell">${formatDate(day)}</td>
      <td><span style="background:#e3f2fd;padding:4px 8px;border-radius:6px;color:#1565c0;font-weight:600;font-size:12px;">${d.taskCount}</span></td>
      <td class="amount-cell">${d.total.toLocaleString()}원</td>
      <td class="amount-cell">${d.partSpend.toLocaleString()}원</td>
      <td class="amount-cell">${d.fee.toLocaleString()}원</td>
      <td class="amount-cell">${d.spend.toLocaleString()}원</td>
      <td class="amount-cell profit-cell">${d.profit.toLocaleString()}원</td>
      <td class="amount-cell">${d.company.toLocaleString()}원</td>
      <td class="amount-cell">${d.sungwook.toLocaleString()}원</td>
      <td class="amount-cell">${d.sungho.toLocaleString()}원</td>
      <td class="amount-cell">${d.heejong.toLocaleString()}원</td>
    </tr>
  `).join('');
  
  // 전체 합계로 복원
  updateSummary(window.allSettlementData);
}

// 합계 업데이트 함수
function updateSummary(data) {
  const totalRevenue = data.reduce((sum, [_, d]) => sum + d.total, 0);
  const totalExpense = data.reduce((sum, [_, d]) => sum + d.spend, 0);
  const totalProfit = data.reduce((sum, [_, d]) => sum + d.profit, 0);
  
  document.getElementById('total-revenue').textContent = totalRevenue.toLocaleString() + '원';
  document.getElementById('total-expense').textContent = totalExpense.toLocaleString() + '원';
  document.getElementById('total-profit').textContent = totalProfit.toLocaleString() + '원';
}

// 기존 전역 함수와의 호환성을 위해 window에 등록
window.loadSettlement = loadSettlement;
window.applyDateFilter = applyDateFilter;
window.resetDateFilter = resetDateFilter;