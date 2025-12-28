// scripts/excel-backup.js
import { db } from './firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

console.log('📦 excel-backup.js 모듈 로드 시작');
console.log('📦 Firebase DB 확인:', db ? '✅ 연결됨' : '❌ 연결 안됨');

// SheetJS 라이브러리 동적 로드
async function loadSheetJS() {
  if (window.XLSX) {
    console.log('✅ SheetJS 이미 로드됨');
    return;
  }
  
  console.log('📥 SheetJS 로딩 중...');
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload = () => {
      console.log('✅ SheetJS 로드 완료');
      resolve();
    };
    script.onerror = (error) => {
      console.error('❌ SheetJS 로드 실패:', error);
      reject(error);
    };
    document.head.appendChild(script);
  });
}

// 날짜 포맷 함수
function formatDate(date) {
  if (!date) return '';
  if (date.toDate) date = date.toDate();
  if (typeof date === 'string') date = new Date(date);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 작업지시 데이터 가져오기
async function getTasksData() {
  try {
    console.log('📋 작업지시 데이터 수집 중...');
    
    const tasksSnapshot = await getDocs(collection(db, 'tasks'));
    const tasks = [];
    
    tasksSnapshot.forEach(doc => {
      const data = doc.data();
      
      // 부품 데이터 파싱
      let partsStr = '';
      if (data.parts) {
        try {
          if (typeof data.parts === 'string') {
            const parsed = JSON.parse(data.parts);
            if (Array.isArray(parsed)) {
              partsStr = parsed.map(p => `${p.name || p}(${p.quantity || 1}개)`).join(', ');
            } else {
              partsStr = data.parts;
            }
          } else if (Array.isArray(data.parts)) {
            partsStr = data.parts.map(p => `${p.name || p}(${p.quantity || 1}개)`).join(', ');
          } else {
            partsStr = String(data.parts);
          }
        } catch (e) {
          partsStr = data.parts;
        }
      }
      
      tasks.push({
        'ID': doc.id,
        '작업일시': formatDate(data.date),
        '작업자': data.worker || '',
        '고객명': data.client || '',
        '철거주소': data.removeAddress || '',
        '설치주소': data.installAddress || '',
        '연락처': data.contact || '',
        '작업구분': data.taskType || '',
        '작업내용': data.items || '',
        '금액': data.amount || 0,
        '수수료': data.fee || 0,
        '사용부품': partsStr,
        '상태': data.done ? '완료' : '진행중',
        '비고': data.note || ''
      });
    });
    
    // 날짜순으로 정렬
    tasks.sort((a, b) => {
      const dateA = new Date(a['작업일시'] || 0);
      const dateB = new Date(b['작업일시'] || 0);
      return dateB - dateA;
    });
    
    console.log(`✅ 작업지시 ${tasks.length}건 수집 완료`);
    return tasks;
  } catch (error) {
    console.error('❌ 작업지시 데이터 로드 실패:', error);
    return [];
  }
}

// 예약 데이터 가져오기
async function getReservationsData() {
  try {
    console.log('📅 예약 데이터 수집 중...');
    
    const tasksSnapshot = await getDocs(collection(db, 'tasks'));
    const reservations = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    tasksSnapshot.forEach(doc => {
      const data = doc.data();
      const taskDate = data.date ? new Date(data.date) : null;
      
      if (taskDate && taskDate > today && !data.done) {
        reservations.push({
          'ID': doc.id,
          '예약일시': formatDate(data.date),
          '작업자': data.worker || '',
          '고객명': data.client || '',
          '연락처': data.contact || '',
          '작업구분': data.taskType || '',
          '작업내용': data.items || '',
          '철거주소': data.removeAddress || '',
          '설치주소': data.installAddress || '',
          '비고': data.note || ''
        });
      }
    });
    
    reservations.sort((a, b) => {
      const dateA = new Date(a['예약일시'] || 0);
      const dateB = new Date(b['예약일시'] || 0);
      return dateB - dateA;
    });
    
    console.log(`✅ 예약 ${reservations.length}건 수집 완료`);
    return reservations;
  } catch (error) {
    console.error('❌ 예약 데이터 로드 실패:', error);
    return [];
  }
}

// ✨ 정산 데이터 실시간 계산 (새로 추가)
async function getSettlementDataCalculated() {
  try {
    console.log('💰 정산 데이터 계산 중...');
    
    // 완료된 작업만 조회
    const tasksSnapshot = await getDocs(
      query(collection(db, 'tasks'), where('done', '==', true))
    );
    
    // 출고 부품 데이터 조회
    const inventorySnapshot = await getDocs(
      query(
        collection(db, 'inventory'),
        where('type', '==', 'out'),
        where('reason', '==', '작업사용')
      )
    );
    
    // 출고 데이터를 맵으로 변환
    const outboundMap = new Map();
    inventorySnapshot.forEach(doc => {
      const data = doc.data();
      if (data.taskId) {
        if (!outboundMap.has(data.taskId)) {
          outboundMap.set(data.taskId, []);
        }
        outboundMap.get(data.taskId).push(data);
      }
    });
    
    const settlements = [];
    
    // 작업별로 정산 계산
    tasksSnapshot.forEach(doc => {
      const data = doc.data();
      const taskId = doc.id;
      
      // 실제 출고 부품비 계산
      let actualPartCost = 0;
      const outboundParts = outboundMap.get(taskId) || [];
      
      if (outboundParts.length > 0) {
        actualPartCost = outboundParts.reduce((sum, part) => {
          return sum + (part.totalAmount || 0);
        }, 0);
      }
      
      // 수수료 계산
      let fee = 0;
      const amount = Number(data.amount) || 0;
      if (data.client && data.client.includes('공간')) {
        fee = Math.round(amount * 0.22);
      } else if (data.fee) {
        fee = Number(data.fee);
      }
      
      // 순이익 계산
      const totalSpend = actualPartCost + fee;
      const profit = amount - totalSpend;
      
      // 배분 계산
      const company = Math.round(profit * 0.2);
      const remain = profit - company;
      const sungwook = Math.round(remain * 0.4);
      const sungho = Math.round(remain * 0.3);
      const heejong = Math.round(remain * 0.3);
      
      settlements.push({
        'ID': taskId,
        '작업일시': formatDate(data.date),
        '고객사': data.client || '',
        '작업자': data.worker || '',
        '작업내용': data.items || '',
        '매출': amount,
        '부품비(실제출고)': actualPartCost,
        '수수료': fee,
        '총지출': totalSpend,
        '순이익': profit,
        '회사자금(20%)': company,
        '성욱(40%)': sungwook,
        '성호(30%)': sungho,
        '희종(30%)': heejong
      });
    });
    
    // 날짜순 정렬
    settlements.sort((a, b) => {
      const dateA = new Date(a['작업일시'] || 0);
      const dateB = new Date(b['작업일시'] || 0);
      return dateB - dateA;
    });
    
    console.log(`✅ 정산 ${settlements.length}건 계산 완료`);
    return settlements;
  } catch (error) {
    console.error('❌ 정산 데이터 계산 실패:', error);
    return [];
  }
}

// 회사운영비 데이터 가져오기
async function getCompanyFundsData() {
  try {
    console.log('💸 회사운영비 데이터 수집 중...');
    
    const possibleCollections = ['companyFunds', 'companyFund', 'expenses', 'operatingExpenses'];
    let funds = [];
    
    for (const collectionName of possibleCollections) {
      try {
        const snapshot = await getDocs(collection(db, collectionName));
        if (snapshot.size > 0) {
          console.log(`✅ '${collectionName}' 컬렉션 발견 (${snapshot.size}건)`);
          
          snapshot.forEach(doc => {
            const data = doc.data();
            funds.push({
              'ID': doc.id,
              '날짜': formatDate(data.date),
              '구분': data.type || data.category || '',
              '항목': data.item || data.description || '',
              '금액': data.amount || 0,
              '지출처': data.vendor || data.payee || '',
              '담당자': data.manager || data.handler || '',
              '비고': data.note || data.notes || ''
            });
          });
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    funds.sort((a, b) => {
      const dateA = new Date(a['날짜'] || 0);
      const dateB = new Date(b['날짜'] || 0);
      return dateB - dateA;
    });
    
    console.log(`✅ 회사운영비 ${funds.length}건 수집 완료`);
    return funds;
  } catch (error) {
    console.error('❌ 회사운영비 데이터 로드 실패:', error);
    return [];
  }
}

// 입출고 데이터 가져오기
async function getInventoryData() {
  try {
    console.log('📦 입출고 데이터 수집 중...');
    
    const possibleCollections = ['inventory', 'inventoryHistory', 'stock', 'stockHistory'];
    let inventory = [];
    
    for (const collectionName of possibleCollections) {
      try {
        const snapshot = await getDocs(collection(db, collectionName));
        if (snapshot.size > 0) {
          console.log(`✅ '${collectionName}' 컬렉션 발견 (${snapshot.size}건)`);
          
          snapshot.forEach(doc => {
            const data = doc.data();
            inventory.push({
              'ID': doc.id,
              '날짜': formatDate(data.date),
              '구분': data.type === 'in' ? '입고' : data.type === 'out' ? '출고' : data.type || '',
              '부품명': data.partName || data.itemName || '',
              '수량': data.quantity || 0,
              '단가': data.unitPrice || data.price || 0,
              '총액': data.totalPrice || data.totalAmount || (data.quantity * data.unitPrice) || 0,
              '거래처': data.vendor || data.supplier || '',
              '사유': data.reason || '',
              '비고': data.note || data.notes || ''
            });
          });
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    inventory.sort((a, b) => {
      const dateA = new Date(a['날짜'] || 0);
      const dateB = new Date(b['날짜'] || 0);
      return dateB - dateA;
    });
    
    console.log(`✅ 입출고 ${inventory.length}건 수집 완료`);
    return inventory;
  } catch (error) {
    console.error('❌ 입출고 데이터 로드 실패:', error);
    return [];
  }
}

// 엑셀 파일 생성 및 다운로드
export async function exportToExcel() {
  try {
    console.log('🚀 엑셀 백업 시작');
    
    // 로딩 표시
    const loadingSpinner = document.getElementById('loading-spinner');
    if (loadingSpinner) loadingSpinner.style.display = 'flex';
    
    // SheetJS 라이브러리 로드
    await loadSheetJS();
    
    // 모든 데이터 가져오기
    console.log('📊 데이터 수집 중...');
    const [tasks, reservations, settlements, funds, inventory] = await Promise.all([
      getTasksData(),
      getReservationsData(),
      getSettlementDataCalculated(), // ✨ 실시간 계산된 정산 데이터 사용
      getCompanyFundsData(),
      getInventoryData()
    ]);
    
    console.log('📋 수집된 데이터 요약:');
    console.log('  - 작업지시:', tasks.length + '건');
    console.log('  - 예약:', reservations.length + '건');
    console.log('  - 정산:', settlements.length + '건');
    console.log('  - 회사운영비:', funds.length + '건');
    console.log('  - 입출고:', inventory.length + '건');
    
    // 워크북 생성
    const wb = XLSX.utils.book_new();
    let sheetCount = 0;
    
    // 각 시트 추가
    if (tasks.length > 0) {
      const ws1 = XLSX.utils.json_to_sheet(tasks);
      XLSX.utils.book_append_sheet(wb, ws1, "작업지시");
      sheetCount++;
      console.log('✅ "작업지시" 시트 추가 (' + tasks.length + '건)');
    }
    
    if (reservations.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(reservations);
      XLSX.utils.book_append_sheet(wb, ws2, "예약");
      sheetCount++;
      console.log('✅ "예약" 시트 추가 (' + reservations.length + '건)');
    }
    
    // ✨ 정산 시트 추가
    if (settlements.length > 0) {
      const ws3 = XLSX.utils.json_to_sheet(settlements);
      XLSX.utils.book_append_sheet(wb, ws3, "정산");
      sheetCount++;
      console.log('✅ "정산" 시트 추가 (' + settlements.length + '건)');
    }
    
    if (funds.length > 0) {
      const ws4 = XLSX.utils.json_to_sheet(funds);
      XLSX.utils.book_append_sheet(wb, ws4, "회사운영비");
      sheetCount++;
      console.log('✅ "회사운영비" 시트 추가 (' + funds.length + '건)');
    }
    
    if (inventory.length > 0) {
      const ws5 = XLSX.utils.json_to_sheet(inventory);
      XLSX.utils.book_append_sheet(wb, ws5, "입출고");
      sheetCount++;
      console.log('✅ "입출고" 시트 추가 (' + inventory.length + '건)');
    }
    
    if (sheetCount === 0) {
      throw new Error('백업할 데이터가 없습니다.');
    }
    
    console.log(`📊 총 ${sheetCount}개 시트 생성됨`);
    
    // 파일명 생성
    const now = new Date();
    const fileName = `다담업무관리_백업_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.xlsx`;
    
    console.log('📥 파일 다운로드:', fileName);
    
    // 파일 다운로드
    XLSX.writeFile(wb, fileName);
    
    // 성공 메시지
    if (loadingSpinner) loadingSpinner.style.display = 'none';
    
    const totalRecords = tasks.length + reservations.length + settlements.length + funds.length + inventory.length;
    
    const details = [];
    if (tasks.length > 0) details.push(`작업지시: ${tasks.length}건`);
    if (reservations.length > 0) details.push(`예약: ${reservations.length}건`);
    if (settlements.length > 0) details.push(`정산: ${settlements.length}건`);
    if (funds.length > 0) details.push(`회사운영비: ${funds.length}건`);
    if (inventory.length > 0) details.push(`입출고: ${inventory.length}건`);
    
    const message = `✅ 백업 완료!\n총 ${totalRecords}건의 데이터가 다운로드되었습니다.\n\n${details.join('\n')}`;
    
    if (window.showToast) {
      window.showToast(message.replace(/\n/g, ' '), 'success', 5000);
    } else {
      alert(message);
    }
    
    console.log('✅ 엑셀 백업 완료:', fileName);
    
  } catch (error) {
    console.error('❌ 엑셀 백업 실패:', error);
    
    const loadingSpinner = document.getElementById('loading-spinner');
    if (loadingSpinner) loadingSpinner.style.display = 'none';
    
    if (window.showToast) {
      window.showToast('❌ 백업 중 오류가 발생했습니다.', 'error');
    } else {
      alert('백업 중 오류가 발생했습니다: ' + error.message);
    }
  }
}

// 백업 탭 UI 로드
export function loadBackupTab() {
  console.log('💾 백업 탭 로드 시작');
  
  const tabTitle = document.getElementById('tab-title');
  const tabBody = document.getElementById('tab-body');
  
  if (!tabTitle || !tabBody) {
    console.error('❌ tab-title 또는 tab-body 요소를 찾을 수 없습니다.');
    return;
  }
  
  // 탭 타이틀
  const titleIcon = `<div style="display: inline-block; width: 36px; height: 36px; border: 2.5px solid #000000; border-radius: 6px; position: relative; vertical-align: middle; margin-right: 8px;"><div style="position: absolute; top: 8px; left: 6px; right: 6px; height: 2px; background: #000000; border-radius: 1px;"></div><div style="position: absolute; top: 14px; left: 6px; right: 6px; height: 2px; background: #000000; border-radius: 1px;"></div><div style="position: absolute; top: 20px; left: 6px; right: 6px; height: 2px; background: #000000; border-radius: 1px;"></div><div style="position: absolute; bottom: 6px; right: 6px; width: 0; height: 0; border: 3px solid transparent; border-top: 5px solid #000000;"></div></div>`;
  
  tabTitle.innerHTML = `
    <div class="card" style="padding: 20px 25px; margin-bottom: 25px; text-align: center; border-left: 4px solid var(--primary-color);">
      <h3 style="margin: 0; font-size: 1.4rem; font-weight: 600; color: #000000;">${titleIcon} 데이터 백업</h3>
    </div>
  `;
  
  // 탭 바디
  tabBody.innerHTML = `
    <div class="card" style="max-width: 600px; margin: 0 auto;">
      <div class="card-body" style="text-align: center; padding: 40px;">
        <div style="font-size: 64px; margin-bottom: 20px;">📥</div>
        <h4 style="margin-bottom: 15px; color: var(--gray-900);">엑셀 파일로 데이터 백업</h4>
        <p style="color: var(--gray-600); margin-bottom: 30px; line-height: 1.6;">
          작업지시, 예약, 정산, 회사운영비, 입출고 등<br>
          모든 데이터를 엑셀 파일로 다운로드합니다.
        </p>
        
        <button 
          id="export-excel-btn" 
          class="btn btn-primary btn-lg ripple-effect"
          style="min-width: 200px; font-size: 1.1rem; padding: 15px 30px;">
          📊 엑셀 파일 다운로드
        </button>
        
        <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; text-align: left;">
          <h5 style="margin-bottom: 10px; color: var(--gray-900);">💡 백업 정보</h5>
          <ul style="color: var(--gray-700); font-size: 0.9rem; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li>각 데이터는 별도 시트로 구분됩니다</li>
            <li>정산 데이터는 실시간으로 계산되어 포함됩니다</li>
            <li>날짜/시간 정보가 포함됩니다</li>
            <li>엑셀에서 바로 열람 가능합니다</li>
            <li>정기적인 백업을 권장합니다</li>
          </ul>
        </div>
      </div>
    </div>
  `;
  
  console.log('✅ 백업 탭 UI 생성 완료');
  
  // 버튼 이벤트 연결
  setTimeout(() => {
    const exportBtn = document.getElementById('export-excel-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        console.log('📊 엑셀 다운로드 버튼 클릭');
        exportBtn.disabled = true;
        exportBtn.innerHTML = '⏳ 백업 중...';
        
        exportToExcel().finally(() => {
          exportBtn.disabled = false;
          exportBtn.innerHTML = '📊 엑셀 파일 다운로드';
        });
      });
      console.log('✅ 다운로드 버튼 이벤트 연결 완료');
    } else {
      console.error('❌ export-excel-btn 버튼을 찾을 수 없습니다.');
    }
  }, 100);
}

// 전역 함수로 등록
window.loadBackupTab = loadBackupTab;
window.exportToExcel = exportToExcel;

console.log('✅ excel-backup.js 모듈 로드 완료');
console.log('✅ window.loadBackupTab 등록:', typeof window.loadBackupTab);
console.log('✅ window.exportToExcel 등록:', typeof window.exportToExcel);