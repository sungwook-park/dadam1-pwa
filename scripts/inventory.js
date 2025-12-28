// scripts/inventory.js - 입출고 관리 메인 로직 (입출고 통합 등록)

import { db } from './firebase-config.js';
import {
  collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc,
  orderBy, Timestamp, writeBatch, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getInventoryTabHTML,
  getStockStatusHTML,
  getInOutFormHTML,
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
      case 'inout':
        await loadInOutForm();
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

// 2. 입출고 등록 폼 로드 (통합)
async function loadInOutForm() {
  console.log('📝 입출고 등록 폼 로드');
  
  const contentDiv = document.getElementById('inventory-content');
  contentDiv.innerHTML = getInOutFormHTML();
  
  // 폼 이벤트 리스너 설정
  setupInOutFormEvents();
}

// 입출고 폼 이벤트 설정 (통합)
function setupInOutFormEvents() {
  // 입고/출고 타입 전환
  const typeButtons = document.querySelectorAll('.type-btn');
  typeButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const type = this.dataset.type;
      switchInOutType(type);
    });
  });
  
  // 부품 선택 시 단가 자동 입력
  const partSelect = document.getElementById('inout-part');
  const priceInput = document.getElementById('inout-price');
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
  const quantityInput = document.getElementById('inout-quantity');
  if (quantityInput) {
    quantityInput.addEventListener('input', calculateTotal);
  }
  if (priceInput) {
    priceInput.addEventListener('input', calculateTotal);
  }
  
  // 폼 제출 이벤트
  const form = document.getElementById('inout-form');
  if (form) {
    form.addEventListener('submit', handleInOutSubmit);
  }
}

// 입고/출고 타입 전환
function switchInOutType(type) {
  console.log('🔄 입출고 타입 전환:', type);
  
  // 버튼 활성화 상태 변경
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-type="${type}"]`).classList.add('active');
  
  // 폼 제목 변경
  const formTitle = document.getElementById('form-title');
  if (formTitle) {
    formTitle.textContent = type === 'in' ? '📥 입고 등록' : '📤 직접 출고';
  }
  
  // 사유 옵션 변경
  const reasonSelect = document.getElementById('inout-reason');
  if (reasonSelect) {
    if (type === 'in') {
      reasonSelect.innerHTML = `
        <option value="구매입고">구매입고</option>
        <option value="반품입고">반품입고</option>
        <option value="이월입고">이월입고</option>
        <option value="기타">기타</option>
      `;
    } else {
      reasonSelect.innerHTML = `
        <option value="납품">납품</option>
        <option value="판매">판매</option>
        <option value="반품출고">반품출고</option>
        <option value="직접출고">직접출고</option>
        <option value="기타">기타</option>
      `;
    }
  }
  
  // 제출 버튼 텍스트 변경
  const submitBtn = document.querySelector('.submit-btn');
  if (submitBtn) {
    submitBtn.textContent = type === 'in' ? '📥 입고 등록' : '📤 출고 등록';
  }
  
  // 폼 데이터에 타입 저장
  const typeInput = document.getElementById('inout-type');
  if (typeInput) {
    typeInput.value = type;
  }
}

// 총액 자동 계산
function calculateTotal() {
  const quantity = parseFloat(document.getElementById('inout-quantity')?.value) || 0;
  const price = parseFloat(document.getElementById('inout-price')?.value) || 0;
  const totalInput = document.getElementById('inout-total');
  
  if (totalInput) {
    totalInput.value = quantity * price;
  }
}

// 입출고 등록 처리 (통합)
async function handleInOutSubmit(event) {
  event.preventDefault();
  
  const type = document.getElementById('inout-type').value;
  console.log(`📝 ${type === 'in' ? '입고' : '출고'} 등록 처리 시작`);
  
  try {
    // 폼 데이터 수집
    const partSelect = document.getElementById('inout-part');
    const customPartInput = document.getElementById('custom-part-name');
    const quantity = parseInt(document.getElementById('inout-quantity').value);
    const unitPrice = parseFloat(document.getElementById('inout-price').value) || 0;
    const reason = document.getElementById('inout-reason').value;
    const note = document.getElementById('inout-note').value;
    
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
    
    // 입출고 내역 저장
    const inventoryData = {
      type: type,
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
    await updateStock(partName, quantity, unitPrice, type);
    
    const typeText = type === 'in' ? '입고' : '출고';
    console.log(`✅ ${typeText} 등록 완료:`, partName, quantity + '개');
    alert(`${typeText} 등록이 완료되었습니다!\n\n${partName}: ${quantity}개`);
    
    // 폼 초기화
    document.getElementById('inout-form').reset();
    document.getElementById('custom-part-group').style.display = 'none';
    document.getElementById('inout-total').value = '';
    
    // 기본 타입으로 재설정 (입고)
    switchInOutType('in');
    
  } catch (error) {
    const typeText = type === 'in' ? '입고' : '출고';
    console.error(`❌ ${typeText} 등록 오류:`, error);
    alert(`${typeText} 등록 중 오류가 발생했습니다: ` + error.message);
  }
}

// 3. 출고 처리 로드 (작업 완료 건들)
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
      reason: '작업사용', // 작업용 출고는 정산에 반영됨
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

// 4. 입출고 내역 로드 (수정됨 - 검색해야만 표시)
async function loadInventoryHistory() {
  console.log('📋 입출고 내역 로드');
  
  try {
    // 기본적으로 빈 상태로 표시 (검색해야만 리스트 나타남)
    inventoryHistory = [];
    
    console.log('📊 입출고 내역: 검색 대기 상태');
    
    const contentDiv = document.getElementById('inventory-content');
    contentDiv.innerHTML = getInventoryHistoryHTML(inventoryHistory);
    
  } catch (error) {
    console.error('❌ 입출고 내역 로드 오류:', error);
    throw error;
  }
}

// 입출고 폼 초기화
window.resetInOutForm = function() {
  const form = document.getElementById('inout-form');
  if (form) {
    form.reset();
    document.getElementById('custom-part-group').style.display = 'none';
    document.getElementById('inout-total').value = '';
    
    // 기본 타입으로 재설정 (입고)
    switchInOutType('in');
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

// 입출고 내역 검색 (수정됨 - 날짜 범위 필터)
window.searchHistoryByRange = async function() {
  console.log('🔍 입출고 내역 날짜 범위 검색');
  
  const startDate = document.getElementById('history-start-date')?.value;
  const endDate = document.getElementById('history-end-date')?.value;
  
  if (!startDate || !endDate) {
    alert('시작 날짜와 종료 날짜를 모두 선택해주세요.');
    return;
  }
  
  try {
    console.log('🔍 입출고 내역 검색:', startDate, '~', endDate);
    
    // inventory 컬렉션에서 날짜 범위로 조회
    const historyQuery = query(
      collection(db, "inventory"),
      where("date", ">=", startDate),
      where("date", "<=", endDate + "T23:59:59"),
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
    
    console.log('📊 입출고 내역 검색 결과:', inventoryHistory.length + '건');
    
    // 검색 결과로 테이블 업데이트
    const contentDiv = document.getElementById('inventory-content');
    contentDiv.innerHTML = getInventoryHistoryHTML(inventoryHistory);
    
  } catch (error) {
    console.error('❌ 입출고 내역 검색 오류:', error);
    alert('입출고 내역 검색 중 오류가 발생했습니다.');
  }
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
window.resetInOutForm = resetInOutForm;
window.refreshStock = refreshStock;
window.exportStock = exportStock;
window.searchHistoryByRange = searchHistoryByRange;
window.exportHistory = exportHistory;
window.processIndividualOutbound = processIndividualOutbound;
window.processBatchOutbound = processBatchOutbound;

// 재고 부족 알림 확인
window.checkLowStock = async function() {
  console.log('⚠️ 재고 부족 알림 확인');
  
  try {
    const stockQuery = query(collection(db, "stock"));
    const stockSnapshot = await getDocs(stockQuery);
    
    const lowStockItems = [];
    stockSnapshot.forEach(doc => {
      const data = doc.data();
      const minStock = data.minStock || 5;
      if ((data.currentStock || 0) <= minStock) {
        lowStockItems.push({
          partName: data.partName,
          currentStock: data.currentStock || 0,
          minStock: minStock
        });
      }
    });
    
    if (lowStockItems.length > 0) {
      const message = '⚠️ 재고 부족 알림\n\n' + 
        lowStockItems.map(item => 
          `${item.partName}: ${item.currentStock}개 (최소: ${item.minStock}개)`
        ).join('\n');
      
      alert(message);
    } else {
      alert('✅ 모든 부품의 재고가 충분합니다.');
    }
    
  } catch (error) {
    console.error('❌ 재고 부족 확인 오류:', error);
    alert('재고 확인 중 오류가 발생했습니다.');
  }
};

// 재고 조정 (관리자 전용)
window.adjustStock = async function(partName, currentStock) {
  console.log('🔧 재고 조정:', partName);
  
  const userInfo = window.getCurrentUserInfo();
  const isAdmin = window.isCurrentUserAdmin && window.isCurrentUserAdmin();
  
  if (!isAdmin) {
    alert('재고 조정은 관리자만 가능합니다.');
    return;
  }
  
  const newStock = prompt(`${partName}의 현재 재고는 ${currentStock}개입니다.\n새로운 재고 수량을 입력하세요:`, currentStock);
  
  if (newStock === null || newStock === '') {
    return; // 취소
  }
  
  const adjustedStock = parseInt(newStock);
  if (isNaN(adjustedStock) || adjustedStock < 0) {
    alert('올바른 수량을 입력해주세요.');
    return;
  }
  
  const reason = prompt('재고 조정 사유를 입력하세요:', '재고조정');
  if (!reason) {
    alert('조정 사유를 입력해주세요.');
    return;
  }
  
  try {
    // 재고 조정 내역 기록
    const adjustmentQuantity = adjustedStock - currentStock;
    const inventoryData = {
      type: adjustmentQuantity > 0 ? 'in' : 'out',
      partName: partName,
      quantity: Math.abs(adjustmentQuantity),
      unitPrice: 0,
      totalAmount: 0,
      reason: '재고조정 - ' + reason,
      worker: userInfo?.name || '',
      note: `${currentStock}개 → ${adjustedStock}개`,
      date: new Date().toISOString(),
      createdAt: Timestamp.now(),
      createdBy: userInfo?.email || ''
    };
    
    await addDoc(collection(db, "inventory"), inventoryData);
    
    // 재고 직접 업데이트
    const stockQuery = query(
      collection(db, "stock"),
      where("partName", "==", partName)
    );
    
    const stockSnapshot = await getDocs(stockQuery);
    if (!stockSnapshot.empty) {
      const stockDoc = stockSnapshot.docs[0];
      await updateDoc(stockDoc.ref, {
        currentStock: adjustedStock,
        lastUpdated: Timestamp.now()
      });
    }
    
    alert(`재고 조정 완료!\n${partName}: ${currentStock}개 → ${adjustedStock}개`);
    
    // 재고 현황 새로고침
    if (currentSubTab === 'stock') {
      await loadStockStatus();
    }
    
  } catch (error) {
    console.error('❌ 재고 조정 오류:', error);
    alert('재고 조정 중 오류가 발생했습니다: ' + error.message);
  }
};

// 부품 마스터 관리 (관리자 전용)
window.manageParts = async function() {
  console.log('🔧 부품 마스터 관리');
  
  const userInfo = window.getCurrentUserInfo();
  const isAdmin = window.isCurrentUserAdmin && window.isCurrentUserAdmin();
  
  if (!isAdmin) {
    alert('부품 마스터 관리는 관리자만 가능합니다.');
    return;
  }
  
  // 간단한 부품 추가 모달 (실제로는 별도 화면으로 구현 가능)
  const action = confirm('부품 마스터 관리\n\n확인: 새 부품 추가\n취소: 부품 목록 보기');
  
  if (action) {
    // 새 부품 추가
    const partName = prompt('새 부품명을 입력하세요:');
    if (!partName) return;
    
    const partPrice = prompt('부품 단가를 입력하세요 (원):', '0');
    const price = parseFloat(partPrice) || 0;
    
    const minStock = prompt('최소 재고량을 입력하세요 (개):', '5');
    const minStockQty = parseInt(minStock) || 5;
    
    try {
      // 재고에 새 부품 추가
      const newStock = {
        partName: partName,
        currentStock: 0,
        unitPrice: price,
        minStock: minStockQty,
        lastUpdated: Timestamp.now()
      };
      
      await addDoc(collection(db, "stock"), newStock);
      
      alert(`새 부품이 추가되었습니다!\n\n${partName}\n단가: ${price.toLocaleString()}원\n최소재고: ${minStockQty}개`);
      
      // 재고 현황 새로고침
      if (currentSubTab === 'stock') {
        await loadStockStatus();
      }
      
    } catch (error) {
      console.error('❌ 부품 추가 오류:', error);
      alert('부품 추가 중 오류가 발생했습니다.');
    }
    
  } else {
    // 부품 목록 보기
    try {
      const stockQuery = query(collection(db, "stock"), orderBy("partName", "asc"));
      const stockSnapshot = await getDocs(stockQuery);
      
      let partsList = '📦 등록된 부품 목록\n\n';
      stockSnapshot.forEach(doc => {
        const data = doc.data();
        partsList += `• ${data.partName} (${data.currentStock || 0}개)\n`;
      });
      
      alert(partsList);
      
    } catch (error) {
      console.error('❌ 부품 목록 조회 오류:', error);
      alert('부품 목록 조회 중 오류가 발생했습니다.');
    }
  }
};

// 월별 입출고 요약 (관리자용)
window.getMonthlyInventorySummary = async function() {
  console.log('📊 월별 입출고 요약');
  
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    const historyQuery = query(
      collection(db, "inventory"),
      where("date", ">=", startOfMonth.toISOString()),
      where("date", "<", startOfNextMonth.toISOString())
    );
    
    const historySnapshot = await getDocs(historyQuery);
    
    let inboundTotal = 0;
    let outboundTotal = 0;
    let inboundCount = 0;
    let outboundCount = 0;
    let workOutboundTotal = 0; // 작업용 출고
    let directOutboundTotal = 0; // 직접 출고
    
    historySnapshot.forEach(doc => {
      const data = doc.data();
      if (data.type === 'in') {
        inboundTotal += data.totalAmount || 0;
        inboundCount++;
      } else {
        outboundTotal += data.totalAmount || 0;
        outboundCount++;
        
        // 출고 유형별 분류
        if (data.reason === '작업사용') {
          workOutboundTotal += data.totalAmount || 0;
        } else {
          directOutboundTotal += data.totalAmount || 0;
        }
      }
    });
    
    const summary = `📊 ${now.getMonth() + 1}월 입출고 요약\n\n` +
      `📥 입고: ${inboundCount}건 / ${inboundTotal.toLocaleString()}원\n` +
      `📤 출고(전체): ${outboundCount}건 / ${outboundTotal.toLocaleString()}원\n` +
      `  └ 작업용: ${workOutboundTotal.toLocaleString()}원 (정산반영)\n` +
      `  └ 직접출고: ${directOutboundTotal.toLocaleString()}원 (정산제외)\n\n` +
      `순 재고변동: ${(inboundTotal - outboundTotal).toLocaleString()}원`;
    
    alert(summary);
    
  } catch (error) {
    console.error('❌ 월별 요약 조회 오류:', error);
    alert('월별 요약 조회 중 오류가 발생했습니다.');
  }
};

// 추가 전역 함수 등록
window.checkLowStock = checkLowStock;
window.adjustStock = adjustStock;
window.manageParts = manageParts;
window.getMonthlyInventorySummary = getMonthlyInventorySummary;

console.log('📦 입출고 관리 모듈 로드 완료 (입출고 통합 등록)');