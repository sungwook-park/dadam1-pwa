// scripts/excel-backup.js
import { db } from './firebase-config.js';
import { collection, getDocs, deleteDoc, doc, addDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

console.log('📦 excel-backup.js 모듈 로드 시작');
console.log('📦 Firebase DB 확인:', db ? '✅ 연결됨' : '❌ 연결 안됨');

// 전역 변수
let backupCache = {
  year: '',
  month: '',
  rawData: null, // JSON용 원본 데이터
  excelData: null, // 엑셀용 가공 데이터
  isBackupDownloaded: false
};

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

// 원본 데이터 수집 (JSON용)
async function collectRawData() {
  try {
    console.log('📋 원본 데이터 수집 중...');
    
    const rawData = {
      tasks: [],
      inventory: [],
      companyFunds: [],
      backupInfo: {
        date: new Date().toISOString(),
        version: '1.0',
        source: '다담업무관리 시스템'
      }
    };
    
    // Tasks 수집
    const tasksSnapshot = await getDocs(collection(db, 'tasks'));
    tasksSnapshot.forEach(doc => {
      rawData.tasks.push({
        id: doc.id,
        ...doc.data()
      });
    });
    console.log(`✅ Tasks: ${rawData.tasks.length}건`);
    
    // Inventory 수집
    const inventorySnapshot = await getDocs(collection(db, 'inventory'));
    inventorySnapshot.forEach(doc => {
      rawData.inventory.push({
        id: doc.id,
        ...doc.data()
      });
    });
    console.log(`✅ Inventory: ${rawData.inventory.length}건`);
    
    // CompanyFunds 수집
    try {
      const fundsSnapshot = await getDocs(collection(db, 'companyFunds'));
      fundsSnapshot.forEach(doc => {
        rawData.companyFunds.push({
          id: doc.id,
          ...doc.data()
        });
      });
      console.log(`✅ CompanyFunds: ${rawData.companyFunds.length}건`);
    } catch (e) {
      console.warn('⚠️ CompanyFunds 컬렉션 없음');
    }
    
    return rawData;
    
  } catch (error) {
    console.error('❌ 원본 데이터 수집 실패:', error);
    throw error;
  }
}

// 엑셀용 데이터 가공
function convertToExcelFormat(rawData) {
  console.log('📊 엑셀용 데이터 가공 중...');
  
  const excelData = {
    tasks: [],
    reservations: [],
    settlements: [],
    funds: [],
    inventory: []
  };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Tasks 가공
  rawData.tasks.forEach(task => {
    // 부품 파싱
    let partsStr = '';
    if (task.parts) {
      try {
        if (typeof task.parts === 'string') {
          const parsed = JSON.parse(task.parts);
          if (Array.isArray(parsed)) {
            partsStr = parsed.map(p => `${p.name || p}(${p.quantity || 1}개)`).join(', ');
          } else {
            partsStr = task.parts;
          }
        } else if (Array.isArray(task.parts)) {
          partsStr = task.parts.map(p => `${p.name || p}(${p.quantity || 1}개)`).join(', ');
        } else {
          partsStr = String(task.parts);
        }
      } catch (e) {
        partsStr = task.parts;
      }
    }
    
    const taskDate = task.date ? new Date(task.date) : null;
    
    // 예약 분류 (미래 & 미완료)
    if (taskDate && taskDate > today && !task.done) {
      excelData.reservations.push({
        'ID': task.id,
        '예약일시': formatDate(task.date),
        '작업자': task.worker || '',
        '고객명': task.client || '',
        '연락처': task.contact || '',
        '작업구분': task.taskType || '',
        '작업내용': task.items || '',
        '철거주소': task.removeAddress || '',
        '설치주소': task.installAddress || '',
        '비고': task.note || ''
      });
    }
    
    // 모든 작업
    excelData.tasks.push({
      'ID': task.id,
      '작업일시': formatDate(task.date),
      '작업자': task.worker || '',
      '고객명': task.client || '',
      '철거주소': task.removeAddress || '',
      '설치주소': task.installAddress || '',
      '연락처': task.contact || '',
      '작업구분': task.taskType || '',
      '작업내용': task.items || '',
      '금액': task.amount || 0,
      '수수료': task.fee || 0,
      '사용부품': partsStr,
      '상태': task.done ? '완료' : '진행중',
      '비고': task.note || ''
    });
    
    // 정산 (완료된 작업만)
    if (task.done) {
      // 실제 부품비 계산
      let actualPartCost = 0;
      const relatedInventory = rawData.inventory.filter(inv => 
        inv.taskId === task.id && inv.type === 'out' && inv.reason === '작업사용'
      );
      
      if (relatedInventory.length > 0) {
        actualPartCost = relatedInventory.reduce((sum, inv) => 
          sum + (Number(inv.totalAmount) || 0), 0
        );
      }
      
      let fee = 0;
      const amount = Number(task.amount) || 0;
      
      if (task.client && task.client.includes('공간')) {
        fee = Math.round(amount * 0.22);
      } else if (task.fee) {
        fee = Number(task.fee) || 0;
      }
      
      const totalSpend = actualPartCost + fee;
      const profit = amount - totalSpend;
      
      const company = Math.round(profit * 0.2);
      const remain = profit - company;
      const sungwook = Math.round(remain * 0.4);
      const sungho = Math.round(remain * 0.3);
      const heejong = Math.round(remain * 0.3);
      
      excelData.settlements.push({
        'ID': task.id,
        '작업일시': formatDate(task.date),
        '고객사': task.client || '',
        '작업자': task.worker || '',
        '작업내용': task.items || task.taskType || '',
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
    }
  });
  
  // CompanyFunds 가공
  rawData.companyFunds.forEach(fund => {
    excelData.funds.push({
      'ID': fund.id,
      '날짜': formatDate(fund.date),
      '구분': fund.type || fund.category || '',
      '항목': fund.item || fund.description || '',
      '금액': fund.amount || 0,
      '지출처': fund.vendor || fund.payee || '',
      '담당자': fund.manager || fund.handler || '',
      '비고': fund.note || fund.notes || ''
    });
  });
  
  // Inventory 가공
  rawData.inventory.forEach(inv => {
    excelData.inventory.push({
      'ID': inv.id,
      '날짜': formatDate(inv.date),
      '구분': inv.type === 'in' ? '입고' : inv.type === 'out' ? '출고' : inv.type || '',
      '부품명': inv.partName || inv.itemName || '',
      '수량': inv.quantity || 0,
      '단가': inv.unitPrice || inv.price || 0,
      '총액': inv.totalPrice || inv.totalAmount || 0,
      '거래처': inv.vendor || inv.supplier || '',
      '사유': inv.reason || '',
      '비고': inv.note || inv.notes || ''
    });
  });
  
  // 날짜순 정렬
  const sortByDate = (arr, dateField) => {
    arr.sort((a, b) => {
      const dateA = new Date(a[dateField] || 0);
      const dateB = new Date(b[dateField] || 0);
      return dateB - dateA;
    });
  };
  
  sortByDate(excelData.tasks, '작업일시');
  sortByDate(excelData.reservations, '예약일시');
  sortByDate(excelData.settlements, '작업일시');
  sortByDate(excelData.funds, '날짜');
  sortByDate(excelData.inventory, '날짜');
  
  console.log('✅ 엑셀 데이터 가공 완료');
  console.log(`  - 작업: ${excelData.tasks.length}건`);
  console.log(`  - 예약: ${excelData.reservations.length}건`);
  console.log(`  - 정산: ${excelData.settlements.length}건`);
  console.log(`  - 회사운영비: ${excelData.funds.length}건`);
  console.log(`  - 입출고: ${excelData.inventory.length}건`);
  
  return excelData;
}

// 월별 필터링
function filterByMonth(data, year, month) {
  const startDate = new Date(`${year}-${month}-01T00:00:00`);
  const endDate = new Date(year, parseInt(month), 1); // 다음달 1일
  
  const filtered = {
    tasks: [],
    inventory: [],
    companyFunds: []
  };
  
  data.tasks.forEach(task => {
    if (task.date) {
      const taskDate = new Date(task.date);
      if (taskDate >= startDate && taskDate < endDate) {
        filtered.tasks.push(task);
      }
    }
  });
  
  data.inventory.forEach(inv => {
    if (inv.date) {
      const invDate = new Date(inv.date);
      if (invDate >= startDate && invDate < endDate) {
        filtered.inventory.push(inv);
      }
    }
  });
  
  data.companyFunds.forEach(fund => {
    if (fund.date) {
      const fundDate = new Date(fund.date);
      if (fundDate >= startDate && fundDate < endDate) {
        filtered.companyFunds.push(fund);
      }
    }
  });
  
  return filtered;
}

// 미리보기 로드
window.loadBackupPreview = async function() {
  const year = document.getElementById('backup-year').value;
  const month = document.getElementById('backup-month').value;
  
  console.log(`🔍 ${year}년 ${month}월 미리보기 로드`);
  
  const previewDiv = document.getElementById('backup-preview');
  previewDiv.innerHTML = '<div class="loading-message">데이터 조회 중...</div>';
  previewDiv.style.display = 'block';
  
  try {
    // 원본 데이터 수집
    const rawData = await collectRawData();
    
    // 월별 필터링
    const filteredRaw = filterByMonth(rawData, year, month);
    filteredRaw.backupInfo = rawData.backupInfo;
    
    // 엑셀용 변환
    const excelData = convertToExcelFormat(filteredRaw);
    
    // 캐시 저장
    backupCache = {
      year,
      month,
      rawData: filteredRaw,
      excelData: excelData,
      isBackupDownloaded: false
    };
    
    // 완료된 작업 카운트
    const completedTasks = filteredRaw.tasks.filter(t => t.done === true);
    const totalRecords = excelData.tasks.length + excelData.reservations.length + 
                        excelData.settlements.length + excelData.funds.length + 
                        excelData.inventory.length;
    
    // 미리보기 표시
    previewDiv.innerHTML = `
      <div class="preview-card">
        <h4>📊 ${year}년 ${month}월 백업 미리보기</h4>
        
        <div class="backup-type-info">
          <div class="type-card excel-card">
            <div class="type-icon">📊</div>
            <div class="type-content">
              <h5>엑셀 백업 (보기용)</h5>
              <p>사람이 보기 편한 형식</p>
              <ul>
                <li>작업지시: ${excelData.tasks.length}건</li>
                <li>예약: ${excelData.reservations.length}건</li>
                <li>정산: ${excelData.settlements.length}건</li>
                <li>회사운영비: ${excelData.funds.length}건</li>
                <li>입출고: ${excelData.inventory.length}건</li>
              </ul>
              <div class="type-total">총 ${totalRecords}건</div>
            </div>
          </div>
          
          <div class="type-card json-card">
            <div class="type-icon">💾</div>
            <div class="type-content">
              <h5>JSON 백업 (복원용)</h5>
              <p>Firebase 복원 가능</p>
              <ul>
                <li>작업: ${filteredRaw.tasks.length}건</li>
                <li>입출고: ${filteredRaw.inventory.length}건</li>
                <li>회사운영비: ${filteredRaw.companyFunds.length}건</li>
              </ul>
              <div class="type-total">원본 데이터 구조 보존</div>
            </div>
          </div>
        </div>
        
        ${completedTasks.length > 0 ? `
          <div class="delete-warning">
            <p>⚠️ <strong>삭제 대상:</strong> 완료된 작업 <strong>${completedTasks.length}건</strong></p>
            <p style="font-size: 0.9rem; color: #666; margin-top: 8px;">
              * 입출고 기록은 삭제되지 않고 보관됩니다<br>
              * JSON 백업 파일로 언제든 복원 가능합니다
            </p>
          </div>
        ` : ''}
        
        <div class="backup-actions">
          <button onclick="downloadBothBackups()" class="backup-both-btn" ${totalRecords === 0 ? 'disabled' : ''}>
            📦 백업 다운로드 (엑셀+JSON)
          </button>
          <button onclick="showDeleteConfirmation()" class="backup-delete-btn" ${completedTasks.length === 0 ? 'disabled' : ''}>
            🗑️ 백업 & 삭제
          </button>
        </div>
      </div>
    `;
    
    if (totalRecords === 0) {
      previewDiv.innerHTML = `
        <div class="no-data-message">
          <p>⚠️ ${year}년 ${month}월에 백업할 데이터가 없습니다.</p>
        </div>
      `;
    }
    
  } catch (error) {
    console.error('미리보기 오류:', error);
    previewDiv.innerHTML = `
      <div class="error-message">
        <p>❌ 미리보기 로드 실패: ${error.message}</p>
      </div>
    `;
  }
};

// 엑셀 + JSON 동시 다운로드
window.downloadBothBackups = async function() {
  try {
    console.log('📦 엑셀 + JSON 동시 백업 시작');
    
    const loadingSpinner = document.getElementById('loading-spinner');
    if (loadingSpinner) loadingSpinner.style.display = 'flex';
    
    const { year, month, rawData, excelData } = backupCache;
    
    // 1. 엑셀 파일 생성
    await loadSheetJS();
    
    const wb = XLSX.utils.book_new();
    
    if (excelData.tasks.length > 0) {
      const ws1 = XLSX.utils.json_to_sheet(excelData.tasks);
      XLSX.utils.book_append_sheet(wb, ws1, "작업지시");
    }
    
    if (excelData.reservations.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(excelData.reservations);
      XLSX.utils.book_append_sheet(wb, ws2, "예약");
    }
    
    if (excelData.settlements.length > 0) {
      const ws3 = XLSX.utils.json_to_sheet(excelData.settlements);
      XLSX.utils.book_append_sheet(wb, ws3, "정산");
    }
    
    if (excelData.funds.length > 0) {
      const ws4 = XLSX.utils.json_to_sheet(excelData.funds);
      XLSX.utils.book_append_sheet(wb, ws4, "회사운영비");
    }
    
    if (excelData.inventory.length > 0) {
      const ws5 = XLSX.utils.json_to_sheet(excelData.inventory);
      XLSX.utils.book_append_sheet(wb, ws5, "입출고");
    }
    
    const excelFileName = `다담업무_엑셀백업_${year}년${month}월.xlsx`;
    XLSX.writeFile(wb, excelFileName);
    console.log('✅ 엑셀 파일 다운로드:', excelFileName);
    
    // 2. JSON 파일 생성
    const jsonData = JSON.stringify(rawData, null, 2);
    const jsonBlob = new Blob([jsonData], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    const jsonFileName = `다담업무_JSON백업_${year}년${month}월.json`;
    jsonLink.download = jsonFileName;
    document.body.appendChild(jsonLink);
    jsonLink.click();
    document.body.removeChild(jsonLink);
    URL.revokeObjectURL(jsonUrl);
    console.log('✅ JSON 파일 다운로드:', jsonFileName);
    
    backupCache.isBackupDownloaded = true;
    
    if (loadingSpinner) loadingSpinner.style.display = 'none';
    
    alert(`✅ 백업 완료!\n\n📊 엑셀: ${excelFileName}\n💾 JSON: ${jsonFileName}\n\n두 파일이 다운로드되었습니다.`);
    
  } catch (error) {
    console.error('❌ 백업 실패:', error);
    const loadingSpinner = document.getElementById('loading-spinner');
    if (loadingSpinner) loadingSpinner.style.display = 'none';
    alert('백업 중 오류가 발생했습니다: ' + error.message);
  }
};

// 삭제 확인 대화상자
window.showDeleteConfirmation = async function() {
  if (!backupCache.isBackupDownloaded) {
    if (!confirm('먼저 백업 파일을 다운로드합니다.\n계속하시겠습니까?')) {
      return;
    }
    await downloadBothBackups();
  }
  
  const { year, month, rawData } = backupCache;
  const completedTasks = rawData.tasks.filter(t => t.done === true);
  
  const confirmDiv = document.getElementById('delete-confirmation');
  confirmDiv.innerHTML = `
    <div class="delete-modal">
      <div class="delete-modal-content">
        <h3>⚠️ 삭제 확인</h3>
        <div class="delete-info">
          <p><strong>삭제 대상:</strong> ${year}년 ${month}월 완료된 작업</p>
          <p><strong>삭제 건수:</strong> ${completedTasks.length}건</p>
          <p style="color: #28a745; font-weight: 600; margin-top: 10px;">
            ✅ JSON 백업 파일로 언제든 복원 가능
          </p>
          <p style="color: #dc3545; font-weight: 600; margin-top: 5px;">
            ⚠️ 백업 파일을 안전한 곳에 보관하세요!
          </p>
        </div>
        <div class="delete-input-group">
          <label>계속하려면 아래에 <strong>"DELETE"</strong>를 입력하세요:</label>
          <input 
            type="text" 
            id="delete-confirm-input" 
            placeholder="DELETE 입력" 
            autocomplete="off"
            style="text-transform: uppercase;"
          >
          <div id="input-feedback" style="margin-top: 5px; font-size: 0.85rem; color: #666;"></div>
        </div>
        <div class="delete-actions">
          <button onclick="cancelDelete()" class="cancel-btn">취소</button>
          <button onclick="executeDelete()" class="delete-execute-btn" id="delete-execute-btn" disabled>
            🗑️ 삭제 실행
          </button>
        </div>
      </div>
    </div>
  `;
  
  confirmDiv.style.display = 'flex';
  
  // 이벤트 리스너 등록 (더 안전하게)
  setTimeout(() => {
    const input = document.getElementById('delete-confirm-input');
    const executeBtn = document.getElementById('delete-execute-btn');
    const feedback = document.getElementById('input-feedback');
    
    if (input && executeBtn) {
      console.log('✅ 삭제 확인 입력 필드 준비됨');
      
      // input 이벤트 (실시간 감지)
      input.addEventListener('input', (e) => {
        const value = e.target.value.trim().toUpperCase();
        console.log('입력값:', value);
        
        if (value === 'DELETE') {
          executeBtn.disabled = false;
          executeBtn.style.opacity = '1';
          if (feedback) {
            feedback.textContent = '✅ 삭제 실행 버튼이 활성화되었습니다';
            feedback.style.color = '#28a745';
          }
          console.log('✅ 버튼 활성화');
        } else {
          executeBtn.disabled = true;
          executeBtn.style.opacity = '0.5';
          if (feedback) {
            if (value.length > 0) {
              feedback.textContent = `입력: "${value}" - "DELETE"를 정확히 입력하세요`;
              feedback.style.color = '#dc3545';
            } else {
              feedback.textContent = '';
            }
          }
          console.log('❌ 버튼 비활성화');
        }
      });
      
      // keyup 이벤트도 추가 (더블 체크)
      input.addEventListener('keyup', (e) => {
        const value = e.target.value.trim().toUpperCase();
        if (value === 'DELETE') {
          executeBtn.disabled = false;
          executeBtn.style.opacity = '1';
        }
      });
      
      // Enter 키로도 실행 가능
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const value = e.target.value.trim().toUpperCase();
          if (value === 'DELETE') {
            executeDelete();
          }
        }
      });
      
      input.focus();
      console.log('✅ 이벤트 리스너 등록 완료');
    } else {
      console.error('❌ 입력 필드 또는 버튼을 찾을 수 없음');
    }
  }, 100);
};

window.cancelDelete = function() {
  document.getElementById('delete-confirmation').style.display = 'none';
};

window.executeDelete = async function() {
  try {
    console.log('🗑️ 삭제 실행 시작');
    
    const loadingSpinner = document.getElementById('loading-spinner');
    if (loadingSpinner) loadingSpinner.style.display = 'flex';
    
    const { year, month, rawData } = backupCache;
    const completedTasks = rawData.tasks.filter(t => t.done === true);
    
    console.log(`삭제 대상: ${completedTasks.length}건`);
    
    let deletedCount = 0;
    for (const task of completedTasks) {
      try {
        await deleteDoc(doc(db, 'tasks', task.id));
        deletedCount++;
        console.log(`삭제 진행: ${deletedCount}/${completedTasks.length}`);
      } catch (error) {
        console.error(`작업 ${task.id} 삭제 실패:`, error);
      }
    }
    
    // 삭제 로그 저장
    try {
      await addDoc(collection(db, 'backup_logs'), {
        backupDate: serverTimestamp(),
        period: `${year}년 ${month}월`,
        deletedTasksCount: deletedCount,
        deletedBy: window.auth?.currentUser?.email || 'unknown',
        excelFileName: `다담업무_엑셀백업_${year}년${month}월.xlsx`,
        jsonFileName: `다담업무_JSON백업_${year}년${month}월.json`,
        note: '월별 백업 후 완료 작업 삭제 (JSON 복원 가능)'
      });
      console.log('✅ 삭제 로그 저장 완료');
    } catch (error) {
      console.warn('⚠️ 삭제 로그 저장 실패:', error);
    }
    
    if (loadingSpinner) loadingSpinner.style.display = 'none';
    
    document.getElementById('delete-confirmation').style.display = 'none';
    
    alert(`✅ 삭제 완료!\n\n${year}년 ${month}월 완료 작업 ${deletedCount}건이 삭제되었습니다.\n\nJSON 백업 파일로 언제든 복원할 수 있습니다.`);
    
    document.getElementById('backup-preview').innerHTML = '';
    backupCache = {
      year: '',
      month: '',
      rawData: null,
      excelData: null,
      isBackupDownloaded: false
    };
    
    console.log('✅ 삭제 완료');
    
  } catch (error) {
    console.error('❌ 삭제 실패:', error);
    const loadingSpinner = document.getElementById('loading-spinner');
    if (loadingSpinner) loadingSpinner.style.display = 'none';
    alert('삭제 중 오류가 발생했습니다: ' + error.message);
  }
};

// JSON 복원 기능
window.restoreFromJSON = function() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      console.log('📥 JSON 파일 복원 시작:', file.name);
      
      const loadingSpinner = document.getElementById('loading-spinner');
      if (loadingSpinner) loadingSpinner.style.display = 'flex';
      
      // 파일 읽기
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const jsonData = JSON.parse(event.target.result);
          
          console.log('복원 데이터:', jsonData);
          console.log(`  - Tasks: ${jsonData.tasks?.length || 0}건`);
          console.log(`  - Inventory: ${jsonData.inventory?.length || 0}건`);
          console.log(`  - CompanyFunds: ${jsonData.companyFunds?.length || 0}건`);
          
          if (!confirm(`다음 데이터를 복원하시겠습니까?\n\n작업: ${jsonData.tasks?.length || 0}건\n입출고: ${jsonData.inventory?.length || 0}건\n회사운영비: ${jsonData.companyFunds?.length || 0}건`)) {
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            return;
          }
          
          let restoredCount = 0;
          
          // Tasks 복원
          if (jsonData.tasks && Array.isArray(jsonData.tasks)) {
            for (const task of jsonData.tasks) {
              try {
                const { id, ...taskData } = task;
                await setDoc(doc(db, 'tasks', id), taskData);
                restoredCount++;
                console.log(`복원 진행: ${restoredCount}`);
              } catch (error) {
                console.error(`작업 ${task.id} 복원 실패:`, error);
              }
            }
          }
          
          // Inventory 복원
          if (jsonData.inventory && Array.isArray(jsonData.inventory)) {
            for (const inv of jsonData.inventory) {
              try {
                const { id, ...invData } = inv;
                await setDoc(doc(db, 'inventory', id), invData);
                restoredCount++;
              } catch (error) {
                console.error(`입출고 ${inv.id} 복원 실패:`, error);
              }
            }
          }
          
          // CompanyFunds 복원
          if (jsonData.companyFunds && Array.isArray(jsonData.companyFunds)) {
            for (const fund of jsonData.companyFunds) {
              try {
                const { id, ...fundData } = fund;
                await setDoc(doc(db, 'companyFunds', id), fundData);
                restoredCount++;
              } catch (error) {
                console.error(`회사운영비 ${fund.id} 복원 실패:`, error);
              }
            }
          }
          
          if (loadingSpinner) loadingSpinner.style.display = 'none';
          
          alert(`✅ 복원 완료!\n\n${restoredCount}건의 데이터가 복원되었습니다.`);
          
          console.log('✅ JSON 복원 완료');
          
        } catch (error) {
          console.error('❌ JSON 파싱/복원 실패:', error);
          if (loadingSpinner) loadingSpinner.style.display = 'none';
          alert('복원 중 오류가 발생했습니다: ' + error.message);
        }
      };
      
      reader.readAsText(file);
      
    } catch (error) {
      console.error('❌ 파일 읽기 실패:', error);
      const loadingSpinner = document.getElementById('loading-spinner');
      if (loadingSpinner) loadingSpinner.style.display = 'none';
      alert('파일 읽기 중 오류가 발생했습니다: ' + error.message);
    }
  };
  
  input.click();
};

// 백업 탭 UI
export function loadBackupTab() {
  console.log('💾 백업 탭 로드 시작');
  
  const tabTitle = document.getElementById('tab-title');
  const tabBody = document.getElementById('tab-body');
  
  if (!tabTitle || !tabBody) {
    console.error('❌ tab-title 또는 tab-body 요소를 찾을 수 없습니다.');
    return;
  }
  
  const titleIcon = `<div style="display: inline-block; width: 36px; height: 36px; border: 2.5px solid #000000; border-radius: 6px; position: relative; vertical-align: middle; margin-right: 8px;"><div style="position: absolute; top: 8px; left: 6px; right: 6px; height: 2px; background: #000000; border-radius: 1px;"></div><div style="position: absolute; top: 14px; left: 6px; right: 6px; height: 2px; background: #000000; border-radius: 1px;"></div><div style="position: absolute; top: 20px; left: 6px; right: 6px; height: 2px; background: #000000; border-radius: 1px;"></div><div style="position: absolute; bottom: 6px; right: 6px; width: 0; height: 0; border: 3px solid transparent; border-top: 5px solid #000000;"></div></div>`;
  
  tabTitle.innerHTML = `
    <div class="card" style="padding: 20px 25px; margin-bottom: 25px; text-align: center; border-left: 4px solid var(--primary-color);">
      <h3 style="margin: 0; font-size: 1.4rem; font-weight: 600; color: #000000;">${titleIcon} 데이터 백업 & 복원</h3>
    </div>
  `;
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  
  const yearOptions = [];
  for (let i = 0; i < 5; i++) {
    const y = currentYear - i;
    yearOptions.push(`<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}년</option>`);
  }
  
  tabBody.innerHTML = `
    <div class="backup-container">
      <!-- 백업 섹션 -->
      <div class="card" style="margin-bottom: 25px;">
        <div class="card-body" style="padding: 30px;">
          <div class="backup-header">
            <div style="font-size: 48px; text-align: center; margin-bottom: 15px;">📦</div>
            <h4 style="text-align: center; margin-bottom: 10px; color: var(--gray-900);">월별 백업 (엑셀 + JSON)</h4>
            <p style="text-align: center; color: var(--gray-600); margin-bottom: 30px;">
              특정 월의 데이터를 엑셀과 JSON으로 동시 백업합니다
            </p>
          </div>
          
          <div class="month-selector">
            <label style="font-weight: 600; margin-bottom: 10px; display: block;">📅 백업할 월 선택:</label>
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
              <select id="backup-year" class="backup-select">
                ${yearOptions.join('')}
              </select>
              <select id="backup-month" class="backup-select">
                ${Array.from({length: 12}, (_, i) => {
                  const m = String(i + 1).padStart(2, '0');
                  return `<option value="${m}" ${m === currentMonth ? 'selected' : ''}>${i + 1}월</option>`;
                }).join('')}
              </select>
              <button onclick="loadBackupPreview()" class="btn btn-primary" style="flex-shrink: 0;">
                🔍 미리보기
              </button>
            </div>
          </div>
          
          <div id="backup-preview" style="display: none;"></div>
        </div>
      </div>
      
      <!-- 복원 섹션 -->
      <div class="card">
        <div class="card-body" style="padding: 30px;">
          <div class="restore-header">
            <div style="font-size: 48px; text-align: center; margin-bottom: 15px;">📥</div>
            <h4 style="text-align: center; margin-bottom: 10px; color: var(--gray-900);">JSON 파일 복원</h4>
            <p style="text-align: center; color: var(--gray-600); margin-bottom: 30px;">
              백업한 JSON 파일을 업로드하여 데이터를 복원합니다
            </p>
          </div>
          
          <div style="text-align: center;">
            <button onclick="restoreFromJSON()" class="btn btn-success btn-lg" style="min-width: 250px;">
              💾 JSON 파일 선택 & 복원
            </button>
          </div>
          
          <div class="restore-info" style="margin-top: 30px; padding: 20px; background: #e8f5e9; border-radius: 8px; border-left: 4px solid #4caf50;">
            <h5 style="margin-bottom: 15px; color: #2e7d32;">✅ 복원 안내</h5>
            <ul style="color: #1b5e20; font-size: 0.9rem; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>JSON 백업 파일만 복원이 가능합니다</li>
              <li>엑셀 파일은 확인용이므로 복원 불가합니다</li>
              <li>복원 시 동일한 ID의 데이터는 덮어씌워집니다</li>
              <li>복원 전 현재 데이터를 백업하는 것을 권장합니다</li>
            </ul>
          </div>
        </div>
      </div>
      
      <!-- 안내 -->
      <div class="backup-info" style="margin-top: 25px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
        <h5 style="margin-bottom: 15px; color: var(--gray-900);">💡 백업 & 복원 안내</h5>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <h6 style="color: #219ebc; margin-bottom: 10px;">📊 엑셀 백업</h6>
            <ul style="color: var(--gray-700); font-size: 0.9rem; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>사람이 보기 편한 형식</li>
              <li>엑셀에서 바로 열람 가능</li>
              <li>인쇄 및 공유 용이</li>
              <li>복원 불가능</li>
            </ul>
          </div>
          <div>
            <h6 style="color: #28a745; margin-bottom: 10px;">💾 JSON 백업</h6>
            <ul style="color: var(--gray-700); font-size: 0.9rem; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>원본 데이터 구조 보존</li>
              <li>Firebase로 완벽 복원</li>
              <li>시스템 이전/복구 가능</li>
              <li>프로그래밍 처리 가능</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    
    <div id="delete-confirmation" style="display: none;"></div>
    
    <style>
      .backup-container {
        max-width: 1000px;
        margin: 0 auto;
      }
      
      .backup-select {
        flex: 1;
        padding: 10px 15px;
        border: 2px solid #ddd;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .backup-select:hover {
        border-color: #219ebc;
      }
      
      .backup-select:focus {
        outline: none;
        border-color: #219ebc;
        box-shadow: 0 0 0 3px rgba(33, 158, 188, 0.1);
      }
      
      .loading-message, .no-data-message, .error-message {
        text-align: center;
        padding: 40px 20px;
        color: #666;
      }
      
      .preview-card {
        background: white;
        border: 2px solid #e6e6e6;
        border-radius: 12px;
        padding: 25px;
        margin-top: 20px;
      }
      
      .preview-card h4 {
        margin: 0 0 25px 0;
        color: #333;
        font-size: 1.2rem;
        text-align: center;
      }
      
      .backup-type-info {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 25px;
      }
      
      .type-card {
        border: 2px solid #e6e6e6;
        border-radius: 12px;
        padding: 20px;
        transition: all 0.2s ease;
      }
      
      .type-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.1);
      }
      
      .type-card.excel-card {
        border-color: #219ebc;
        background: linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%);
      }
      
      .type-card.json-card {
        border-color: #28a745;
        background: linear-gradient(135deg, #e8f5e9 0%, #ffffff 100%);
      }
      
      .type-icon {
        font-size: 48px;
        text-align: center;
        margin-bottom: 15px;
      }
      
      .type-content h5 {
        margin: 0 0 10px 0;
        color: #333;
        font-size: 1.1rem;
        text-align: center;
      }
      
      .type-content p {
        margin: 0 0 15px 0;
        color: #666;
        font-size: 0.9rem;
        text-align: center;
      }
      
      .type-content ul {
        margin: 0;
        padding-left: 20px;
        color: #666;
        font-size: 0.85rem;
        line-height: 1.8;
      }
      
      .type-total {
        margin-top: 15px;
        padding-top: 15px;
        border-top: 2px solid rgba(0,0,0,0.1);
        text-align: center;
        font-weight: 600;
        color: #333;
      }
      
      .delete-warning {
        background: #fff3cd;
        border: 2px solid #ffc107;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 20px;
      }
      
      .delete-warning p {
        margin: 0;
        color: #856404;
      }
      
      .backup-actions {
        display: flex;
        gap: 10px;
      }
      
      .backup-both-btn, .backup-delete-btn {
        flex: 1;
        padding: 12px 20px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .backup-both-btn {
        background: #219ebc;
        color: white;
      }
      
      .backup-both-btn:hover:not(:disabled) {
        background: #1a7a96;
        transform: translateY(-2px);
      }
      
      .backup-delete-btn {
        background: #dc3545;
        color: white;
      }
      
      .backup-delete-btn:hover:not(:disabled) {
        background: #c82333;
        transform: translateY(-2px);
      }
      
      .backup-both-btn:disabled, .backup-delete-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      #delete-confirmation {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      
      .delete-modal-content {
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 500px;
        width: 100%;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      }
      
      .delete-modal-content h3 {
        margin: 0 0 20px 0;
        color: #dc3545;
        font-size: 1.5rem;
        text-align: center;
      }
      
      .delete-info {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 20px;
      }
      
      .delete-info p {
        margin: 8px 0;
        color: #333;
      }
      
      .delete-input-group {
        margin-bottom: 20px;
      }
      
      .delete-input-group label {
        display: block;
        margin-bottom: 10px;
        color: #333;
        font-weight: 600;
      }
      
      .delete-input-group input {
        width: 100%;
        padding: 12px 15px;
        border: 2px solid #ddd;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        text-transform: uppercase;
      }
      
      .delete-input-group input:focus {
        outline: none;
        border-color: #dc3545;
      }
      
      .delete-actions {
        display: flex;
        gap: 10px;
      }
      
      .cancel-btn, .delete-execute-btn {
        flex: 1;
        padding: 12px 20px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .cancel-btn {
        background: #6c757d;
        color: white;
      }
      
      .cancel-btn:hover {
        background: #5a6268;
      }
      
      .delete-execute-btn {
        background: #dc3545;
        color: white;
      }
      
      .delete-execute-btn:hover:not(:disabled) {
        background: #c82333;
      }
      
      .delete-execute-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      @media (max-width: 768px) {
        .backup-type-info {
          grid-template-columns: 1fr;
        }
        
        .backup-actions {
          flex-direction: column;
        }
        
        .delete-actions {
          flex-direction: column;
        }
        
        .backup-info > div {
          grid-template-columns: 1fr;
        }
      }
    </style>
  `;
  
  console.log('✅ 백업 탭 UI 생성 완료');
}

// 전역 함수로 등록
window.loadBackupTab = loadBackupTab;
window.loadBackupPreview = loadBackupPreview;
window.downloadBothBackups = downloadBothBackups;
window.showDeleteConfirmation = showDeleteConfirmation;
window.cancelDelete = cancelDelete;
window.executeDelete = executeDelete;
window.restoreFromJSON = restoreFromJSON;

console.log('✅ excel-backup.js 모듈 로드 완료 (엑셀+JSON 동시백업 & 복원)');
