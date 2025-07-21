// scripts/inventory.js - 입출고 관리 메인 로직

import { db } from './firebase-config.js';
import {
  collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc,
  orderBy, Timestamp, writeBatch, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getInventoryTabHTML,
  getStockStatusHTML,
  getInboundFormHTML,
  getOutboundProcessHTML,
  getInventoryHistoryHTML
} from './templates/inventory-templates.js';

// 현재 활성 서브탭
let currentSubTab = 'stock';

// 전역 데이터 캐시
let stockData = [];
let inventoryHistory = [];
let pendingOutboundTasks = [];

// 입출고 관리 메인 로드 함수
window.loadInventoryManagement = function() {
  console.log('📦 입출고 관리 로드');
  
  const tabBody = document.getElementById('tab-body');
  if (tabBody) {
    tabBody.innerHTML = getInventoryTabHTML();
    
    // 기본적으로 재고현황 탭 로드
    setTimeout(() => {
      showInventorySubTab('stock');
    }, 100);
  }
};

// 서브탭 전환
window.showInventorySubTab = async function(tabType) {
  console.log('📂 입출고 서브탭 전환:', tabType);
  
  currentSubTab = tabType;
  
  // 탭 버튼 활성화 상태 변경
  document.querySelectorAll('.inventory-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const activeBtn = document.getElementById(`${tabType}-tab`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
  
  const contentDiv = document.getElementById('inventory-content');
  if (!contentDiv) return;
  
  // 로딩 표시
  contentDiv.innerHTML = '<div class="loading-message">데이터를 불러오는 중...</div>';
  
  try {
    switch (tabType) {
      case 'stock':
        await loadStockStatus();
        break;
      case 'in':
        await loadInboundForm();
        break;
      case 'out':
        await loadOutboundProcess();
        break;
      case 'history':
        await loadInventoryHistory();
        break;
      default:
        contentDiv.innerHTML = '<div class="loading-message">잘못된 탭입니다.</div>';
    }
  } catch (error) {
    console.error('❌ 서브탭 로드 오류:', error);
    contentDiv.innerHTML = '<div class="loading-message">데이터 로드 중 오류가 발생했습니다.</div>';
  }
};

// 1. 재고 현황 로드
async function loadStockStatus() {
  console.log('📊 재고 현황 로드');
  
  try {
    // stock 컬렉션에서 현재 재고 조회
    const stockQuery = query(collection(db, "stock"), orderBy("partName", "asc"));
    const stockSnapshot = await getDocs(stockQuery);
    
    stockData = [];
    stockSnapshot.forEach(doc => {
      stockData.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('📦 재고 데이터:', stockData.length + '개 품목');
    
    const contentDiv = document.getElementById('inventory-content');
    contentDiv.innerHTML = getStockStatusHTML(stockData);
    
  } catch (error) {
    console.error('❌ 재고 현황 로드 오류:', error);
    throw error;
  }
}

// 2. 입고 등록 폼 로드
async function loadInboundForm() {
  console.log('📥 입고 등록 폼 로드');
  
  const contentDiv = document.getElementById('inventory-content');
  contentDiv.innerHTML = getInboundFormHTML();
  
  // 폼 이벤트 리스너 설정
  setupInboundFormEvents();
}

// 입고 폼 이벤트 설정
function setupInboundFormEvents() {
  // 부품 선택 시 단가 자동 입력
  const partSelect = document.getElementById('inbound-part');
  const priceInput = document.getElementById('inbound-price');
  const customPartGroup = document.getElementById('custom-part-group');
  
  if (partSelect && priceInput) {
    partSelect.addEventListener('change', function() {
      const selectedOption = this.options[this.selectedIndex];
      const price = selectedOption.dataset.price;
      
      if (this.value === '기타') {
        // 기타 선택 시 직접입력 필드 표시
        customPartGroup.style.display = 'block';
        priceInput.value = '';
        priceInput.readOnly = false;
      } else {
        // 기존 부품 선택 시 단가 자동 입력
        customPartGroup.style.display = 'none';
        if (price) {
          priceInput.value = price;
        }
        priceInput.readOnly = false;
      }
      
      calculateTotal();
    });
  }
  
  // 수량, 단가 변경 시 총액 자동 계산
  const quantityInput = document.getElementById('inbound-quantity');
  if (quantityInput) {
    quantityInput.addEventListener('input', calculateTotal);
  }
  if (priceInput) {
    priceInput.addEventListener('input', calculateTotal);
  }
  
  // 폼 제출 이벤트
  const form = document.getElementById('inbound-form');
  if (form) {
    form.addEventListener('submit', handleInboundSubmit);
  }
}

// 총액 자동 계산
function calculateTotal() {
  const quantity = parseFloat(document.getElementById('inbound-quantity')?.value) || 0;
  const price = parseFloat(document.getElementById('inbound-price')?.value) || 0;
  const totalInput = document.getElementById('inbound-total');
  
  if (totalInput) {
    totalInput.value = quantity * price;
  }
}

// 입고 등록 처리
async function handleInboundSubmit(event) {
  event.preventDefault();
  
  console.log('📥 입고 등록 처리 시작');
  
  try {
    // 폼 데이터 수집
    const partSelect = document.getElementById('inbound-part');
    const customPartInput = document.getElementById('custom-part-name');
    const quantity = parseInt(document.getElementById('inbound-quantity').value);
    const unitPrice = parseFloat(document.getElementById('inbound-price').value) || 0;
    const reason = document.getElementById('inbound-reason').value;
    const note = document.getElementById('inbound-note').value;
    
    // 부품명 결정
    let partName;
    if (partSelect.value === '기타') {
      partName = customPartInput.value.trim();
      if (!partName) {
        alert('부품명을 입력해주세요.');
        return;
      }
    } else {
      partName = partSelect.value;
    }
    
    if (!partName || quantity <= 0) {
      alert('부품명과 수량을 올바르게 입력해주세요.');
      return;
    }
    
    const userInfo = window.getCurrentUserInfo();
    const totalAmount = quantity * unitPrice;
    
    // 입고 내역 저장
    const inventoryData = {
      type: 'in',
      partName: partName,
      quantity: quantity,
      unitPrice: unitPrice,
      totalAmount: totalAmount,
      reason: reason,
      worker: userInfo?.name || '',
      note: note,
      date: new Date().toISOString(),
      createdAt: Timestamp.now(),
      createdBy: userInfo?.email || ''
    };
    
    await addDoc(collection(db, "inventory"), inventoryData);
    
    // 재고 업데이트
    await updateStock(partName, quantity, unitPrice, 'in');
    
    console.log('✅ 입고 등록 완료:', partName, quantity + '개');
    alert(`입고 등록이 완료되었습니다!\n\n${partName}: ${quantity}개`);
    
    // 폼 초기화
    document.getElementById('inbound-form').reset();
    document.getElementById('custom-part-group').style.display = 'none';
    document.getElementById('inbound-total').value = '';
    
  } catch (error) {
    console.error('❌ 입고 등록 오류:', error);
    alert('입고 등록 중 오류가 발생했습니다: ' + error.message);
  }
}

// 3. 출고 처리 로드
async function loadOutboundProcess() {
  console.log('📤 출고 처리 로드');
  
  try {
    // 출고 처리되지 않은 완료 작업들 조회
    pendingOutboundTasks = await getPendingOutboundTasks();
    
    console.log('📋 출고 대기 작업:', pendingOutboundTasks.length + '건');
    
    const contentDiv = document.getElementById('inventory-content');
    contentDiv.innerHTML = getOutboundProcessHTML(pendingOutboundTasks);
    
    // 출고 처리 이벤트 설정
    setupOutboundEvents();
    
  } catch (error) {
    console.error('❌ 출고 처리 로드 오류:', error);
    throw error;
  }
}

// 출고 대기 작업 조회
async function getPendingOutboundTasks() {
  try {
    // 완료된 작업 중 부품이 있는 것들 조회
    const completedTasksQuery = query(
      collection(db, "tasks"),
      where("done", "==", true),
      orderBy("date", "desc")
    );
    
    const tasksSnapshot = await getDocs(completedTasksQuery);
    const allCompletedTasks = [];
    
    tasksSnapshot.forEach(doc => {
      const taskData = doc.data();
      if (taskData.parts && taskData.parts.trim()) {
        allCompletedTasks.push({
          id: doc.id,
          ...taskData
        });
      }
    });
    
    // 이미 출고 처리된 작업들 조회
    const processedTasksQuery = query(
      collection(db, "inventory"),
      where("type", "==", "out"),
      where("reason", "==", "작업사용")
    );
    
    const processedSnapshot = await getDocs(processedTasksQuery);
    const processedTaskIds = new Set();
    
    processedSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.taskId) {
        processedTaskIds.add(data.taskId);
      }
    });
    
    // 아직 출고 처리되지 않은 작업들 필터링
    const pendingTasks = allCompletedTasks.filter(task => 
      !processedTaskIds.has(task.id)
    );
    
    return pendingTasks;
    
  } catch (error) {
    console.error('❌ 출고 대기 작업 조회 오류:', error);
    return [];
  }
}

// 출고 처리 이벤트 설정
function setupOutboundEvents() {
  // 전체 선택 체크박스
  const selectAllCheckbox = document.getElementById('select-all-tasks');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', function() {
      const taskCheckboxes = document.querySelectorAll('.task-checkbox');
      taskCheckboxes.forEach(checkbox => {
        checkbox.checked = this.checked;
      });
      updateBatchButton();
    });
  }
  
  // 개별 체크박스들
  const taskCheckboxes = document.querySelectorAll('.task-checkbox');
  taskCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateBatchButton);
  });
}

// 일괄 처리 버튼 상태 업데이트
function updateBatchButton() {
  const checkedBoxes = document.querySelectorAll('.task-checkbox:checked');
  const batchButton = document.querySelector('.batch-btn');
  
  if (batchButton) {
    batchButton.disabled = checkedBoxes.length === 0;
    batchButton.textContent = checkedBoxes.length > 0 ? 
      `📤 선택 항목 일괄 출고 (${checkedBoxes.length}건)` : 
      '📤 선택 항목 일괄 출고';
  }
}

// 개별 출고 처리
window.processIndividualOutbound = async function(taskId) {
  console.log('📤 개별 출고 처리:', taskId);
  
  if (!confirm('이 작업의 부품을 출고 처리하시겠습니까?')) {
    return;
  }
  
  try {
    const task = pendingOutboundTasks.find(t => t.id === taskId);
    if (!task) {
      alert('작업을 찾을 수 없습니다.');
      return;
    }
    
    await processTaskOutbound(task);
    alert('출고 처리가 완료되었습니다.');
    
    // 출고 처리 목록 새로고침
    await loadOutboundProcess();
    
  } catch (error) {
    console.error('❌ 개별 출고 처리 오류:', error);
    alert('출고 처리 중 오류가 발생했습니다: ' + error.message);
  }
};

// 일괄 출고 처리
window.processBatchOutbound = async function() {
  console.log('📤 일괄 출고 처리');
  
  const checkedBoxes = document.querySelectorAll('.task-checkbox:checked');
  const selectedTaskIds = Array.from(checkedBoxes).map(cb => cb.value);
  
  if (selectedTaskIds.length === 0) {
    alert('출고 처리할 작업을 선택해주세요.');
    return;
  }
  
  if (!confirm(`선택한 ${selectedTaskIds.length}건의 작업을 일괄 출고 처리하시겠습니까?`)) {
    return;
  }
  
  try {
    let successCount = 0;
    let errorCount = 0;
    
    for (const taskId of selectedTaskIds) {
      try {
        const task = pendingOutboundTasks.find(t => t.id === taskId);
        if (task) {
          await processTaskOutbound(task);
          successCount++;
        }
      } catch (error) {
        console.error('작업 출고 처리 오류:', taskId, error);
        errorCount++;
      }
    }
    
    alert(`일괄 출고 처리 완료!\n성공: ${successCount}건\n실패: ${errorCount}건`);
    
    // 출고 처리 목록 새로고침
    await loadOutboundProcess();
    
  } catch (error) {
    console.error('❌ 일괄 출고 처리 오류:', error);
    alert('일괄 출고 처리 중 오류가 발생했습니다: ' + error.message);
  }
};

// 작업의 출고 처리 실행
async function processTaskOutbound(task) {
  console.log('📤 작업 출고 처리 실행:', task.id);
  
  if (!task.parts) {
    throw new Error('사용된 부품 정보가 없습니다.');
  }
  
  // 부품 데이터 파싱
  const partsUsed = parseTaskParts(task.parts);
  
  if (partsUsed.length === 0) {
    throw new Error('유효한 부품 정보가 없습니다.');
  }
  
  const userInfo = window.getCurrentUserInfo();
  const batch = writeBatch(db);
  
  // 각 부품에 대해 출고 처리
  for (const part of partsUsed) {
    const inventoryData = {
      type: 'out',
      partName: part.name,
      quantity: part.quantity,
      unitPrice: part.price || 0,
      totalAmount: (part.quantity * (part.price || 0)),
      reason: '작업사용',
      worker: task.worker || '',
      taskId: task.id, // 작업 ID 연결
      taskDate: task.date,
      taskClient: task.client || '',
      note: `작업: ${task.items || task.taskType || ''}`,
      date: new Date().toISOString(),
      createdAt: Timestamp.now(),
      createdBy: userInfo?.email || ''
    };
    
    // 출고 내역 추가
    const inventoryRef = doc(collection(db, "inventory"));
    batch.set(inventoryRef, inventoryData);
    
    // 재고 차감
    await updateStock(part.name, part.quantity, part.price || 0, 'out');
  }
  
  // 배치 실행
  await batch.commit();
  
  console.log('✅ 작업 출고 처리 완료:', task.id, partsUsed.length + '개 부품');
}

// 작업의 부품 데이터 파싱
function parseTaskParts(partsData) {
  const partsUsed = [];
  
  try {
    if (typeof partsData === 'string') {
      try {
        // JSON 형태로 저장된 경우
        const parsed = JSON.parse(partsData);
        if (Array.isArray(parsed)) {
          parsed.forEach(part => {
            if (part.name && part.quantity) {
              partsUsed.push({
                name: part.name,
                quantity: parseInt(part.quantity) || 1,
                price: parseFloat(part.price) || 0
              });
            }
          });
        }
      } catch (e) {
        // 텍스트 형태로 저장된 경우 (예: "CT60: 2개, WB60: 1개")
        const parts = partsData.split(',');
        parts.forEach(part => {
          const match = part.trim().match(/^(.+?)[:：]\s*(\d+)\s*개?$/);
          if (match) {
            const partName = match[1].trim();
            const quantity = parseInt(match[2]);
            
            // 부품 목록에서 가격 찾기
            const partInfo = window.PARTS_LIST?.find(p => p.name === partName);
            const price = partInfo?.price || 0;
            
            partsUsed.push({
              name: partName,
              quantity: quantity,
              price: price
            });
          }
        });
      }
    } else if (Array.isArray(partsData)) {
      partsData.forEach(part => {
        if (part.name && part.quantity) {
          partsUsed.push({
            name: part.name,
            quantity: parseInt(part.quantity) || 1,
            price: parseFloat(part.price) || 0
          });
        }
      });
    }
  } catch (error) {
    console.error('부품 데이터 파싱 오류:', error);
  }
  
  return partsUsed;
}

// 재고 업데이트 (입고/출고)
async function updateStock(partName, quantity, unitPrice, type) {
  console.log('📊 재고 업데이트:', partName, quantity + '개', type);
  
  try {
    // 기존 재고 조회
    const stockQuery = query(
      collection(db, "stock"),
      where("partName", "==", partName)
    );
    
    const stockSnapshot = await getDocs(stockQuery);
    
    if (stockSnapshot.empty) {
      // 새 부품인 경우 재고 생성
      const newStock = {
        partName: partName,
        currentStock: type === 'in' ? quantity : -quantity,
        unitPrice: unitPrice,
        lastUpdated: Timestamp.now(),
        minStock: 5 // 기본 최소 재고
      };
      
      await addDoc(collection(db, "stock"), newStock);
      console.log('✅ 새 재고 생성:', partName);
      
    } else {
      // 기존 재고 업데이트
      const stockDoc = stockSnapshot.docs[0];
      const currentData = stockDoc.data();
      
      const newStock = type === 'in' ? 
        (currentData.currentStock || 0) + quantity :
        (currentData.currentStock || 0) - quantity;
      
      const updateData = {
        currentStock: Math.max(0, newStock), // 음수 방지
        unitPrice: unitPrice > 0 ? unitPrice : currentData.unitPrice, // 가격이 있으면 업데이트
        lastUpdated: Timestamp.now()
      };
      
      await updateDoc(stockDoc.ref, updateData);
      console.log('✅ 재고 업데이트 완료:', partName, '→', newStock + '개');
    }
    
  } catch (error) {
    console.error('❌ 재고 업데이트 오류:', error);
    throw error;
  }
}

// 4. 입출고 내역 로드
async function loadInventoryHistory() {
  console.log('📋 입출고 내역 로드');
  
  try {
    // inventory 컬렉션에서 모든 입출고 내역 조회
    const historyQuery = query(
      collection(db, "inventory"),
      orderBy("date", "desc")
    );
    
    const historySnapshot = await getDocs(historyQuery);
    inventoryHistory = [];
    
    historySnapshot.forEach(doc => {
      inventoryHistory.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('📊 입출고 내역:', inventoryHistory.length + '건');
    
    const contentDiv = document.getElementById('inventory-content');
    contentDiv.innerHTML = getInventoryHistoryHTML(inventoryHistory);
    
  } catch (error) {
    console.error('❌ 입출고 내역 로드 오류:', error);
    throw error;
  }
}

// 입고 폼 초기화
window.resetInboundForm = function() {
  const form = document.getElementById('inbound-form');
  if (form) {
    form.reset();
    document.getElementById('custom-part-group').style.display = 'none';
    document.getElementById('inbound-total').value = '';
  }
};

// 재고 새로고침
window.refreshStock = async function() {
  console.log('🔄 재고 새로고침');
  
  try {
    await loadStockStatus();
    alert('재고 현황이 새로고침되었습니다.');
  } catch (error) {
    console.error('❌ 재고 새로고침 오류:', error);
    alert('재고 새로고침 중 오류가 발생했습니다.');
  }
};

// 재고 현황 Excel 내보내기
window.exportStock = function() {
  console.log('📊 재고 현황 Excel 내보내기');
  
  if (stockData.length === 0) {
    alert('내보낼 재고 데이터가 없습니다.');
    return;
  }
  
  try {
    // CSV 형태로 데이터 변환
    const csvHeader = '부품명,현재재고,단가,총가치,상태,최근업데이트\n';
    const csvData = stockData.map(item => {
      const totalValue = (item.currentStock || 0) * (item.unitPrice || 0);
      const status = item.currentStock <= (item.minStock || 5) ? '부족' : '충분';
      const lastUpdated = item.lastUpdated ? 
        new Date(item.lastUpdated.toDate()).toLocaleDateString() : '';
      
      return [
        item.partName,
        item.currentStock + '개',
        (item.unitPrice || 0).toLocaleString() + '원',
        totalValue.toLocaleString() + '원',
        status,
        lastUpdated
      ].join(',');
    }).join('\n');
    
    const csvContent = csvHeader + csvData;
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 파일 다운로드
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `재고현황_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ 재고 현황 내보내기 완료');
    
  } catch (error) {
    console.error('❌ 재고 내보내기 오류:', error);
    alert('재고 내보내기 중 오류가 발생했습니다.');
  }
};

// 입출고 내역 검색
window.searchHistory = async function() {
  console.log('🔍 입출고 내역 검색');
  
  const startDate = document.getElementById('history-start-date')?.value;
  const endDate = document.getElementById('history-end-date')?.value;
  const type = document.getElementById('history-type')?.value;
  const searchKeyword = document.getElementById('history-search')?.value.trim();
  
  let filteredHistory = [...inventoryHistory];
  
  // 날짜 필터링
  if (startDate) {
    filteredHistory = filteredHistory.filter(item => 
      item.date >= startDate + 'T00:00:00'
    );
  }
  
  if (endDate) {
    filteredHistory = filteredHistory.filter(item => 
      item.date <= endDate + 'T23:59:59'
    );
  }
  
  // 타입 필터링
  if (type) {
    filteredHistory = filteredHistory.filter(item => item.type === type);
  }
  
  // 키워드 검색
  if (searchKeyword) {
    filteredHistory = filteredHistory.filter(item => 
      item.partName.includes(searchKeyword) ||
      (item.worker && item.worker.includes(searchKeyword)) ||
      (item.note && item.note.includes(searchKeyword))
    );
  }
  
  // 검색 결과로 테이블 업데이트
  const contentDiv = document.getElementById('inventory-content');
  contentDiv.innerHTML = getInventoryHistoryHTML(filteredHistory);
  
  console.log('🔍 검색 결과:', filteredHistory.length + '건');
};

// 입출고 내역 Excel 내보내기
window.exportHistory = function() {
  console.log('📊 입출고 내역 Excel 내보내기');
  
  if (inventoryHistory.length === 0) {
    alert('내보낼 입출고 내역이 없습니다.');
    return;
  }
  
  try {
    // CSV 형태로 데이터 변환
    const csvHeader = '날짜,구분,부품명,수량,단가,총액,사유,처리자,비고\n';
    const csvData = inventoryHistory.map(item => {
      const date = new Date(item.date).toLocaleString();
      const type = item.type === 'in' ? '입고' : '출고';
      
      return [
        date,
        type,
        item.partName,
        item.quantity + '개',
        (item.unitPrice || 0).toLocaleString() + '원',
        (item.totalAmount || 0).toLocaleString() + '원',
        item.reason || '',
        item.worker || '',
        item.note || ''
      ].map(cell => `"${cell}"`).join(','); // CSV 이스케이프
    }).join('\n');
    
    const csvContent = csvHeader + csvData;
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 파일 다운로드
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `입출고내역_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ 입출고 내역 내보내기 완료');
    
  } catch (error) {
    console.error('❌ 입출고 내역 내보내기 오류:', error);
    alert('입출고 내역 내보내기 중 오류가 발생했습니다.');
  }
};

// 전역 함수 등록
window.loadInventoryManagement = loadInventoryManagement;
window.showInventorySubTab = showInventorySubTab;
window.resetInboundForm = resetInboundForm;
window.refreshStock = refreshStock;
window.exportStock = exportStock;
window.searchHistory = searchHistory;
window.exportHistory = exportHistory;
window.processIndividualOutbound = processIndividualOutbound;
window.processBatchOutbound = processBatchOutbound;

console.log('📦 입출고 관리 모듈 로드 완료');