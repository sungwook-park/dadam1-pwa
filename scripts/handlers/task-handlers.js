// scripts/handlers/task-handlers.js - 작업 이벤트 핸들러들 (Firebase 최적화 포함)

import { db } from '../firebase-config.js';
import { updateDoc, doc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { isCurrentUserAdmin, updateSelectedWorkers, clearCache } from '../utils/task-utils.js';

// 작업 완료 처리 (Firebase 최적화)
export async function completeTask(id) {
  try {
    await updateDoc(doc(db, "tasks", id), { 
      done: true,
      completedAt: new Date().toISOString(),
      completedBy: window.auth?.currentUser?.email || 'unknown'
    });
    
    alert("완료 처리되었습니다!");
    
    // 캐시 무효화 (완료된 작업의 상태가 변경됨)
    clearCache();
    
    // DOM 직접 업데이트로 Firebase 재조회 최소화
    updateTaskInDOM(id, { done: true });
    
    // 캐시 삭제 후 즉시 새로운 데이터 로드
    if (isCurrentUserAdmin()) {
      setTimeout(() => window.loadTodayTasks(), 100);
    } else {
      setTimeout(() => window.loadWorkerTodayTasks(), 100);
    }
  } catch (error) {
    console.error('작업 완료 처리 오류:', error);
    alert('작업 완료 처리 중 오류가 발생했습니다.');
  }
}

// 작업 삭제 (관리자와 작업자 모두 가능)
export async function deleteTask(id, tabType) {
  if (confirm("정말 삭제할까요?")) {
    try {
      await deleteDoc(doc(db, "tasks", id));
      alert("삭제되었습니다!");
      
      // 캐시 무효화
      clearCache();
      
      // DOM에서 직접 제거 (Firebase 재조회 없이)
      removeTaskFromDOM(id);
      
      // 캐시 삭제 후 즉시 새로운 데이터 로드
      setTimeout(() => {
        if (isCurrentUserAdmin()) {
          if (tabType === 'reserve') {
            window.loadReserveTasks();
          } else if (tabType === 'done') {
            window.loadDoneTasks();
          } else {
            window.loadTodayTasks();
          }
        } else {
          if (tabType === 'done') {
            window.loadWorkerDoneTasks();
          } else {
            window.loadWorkerTodayTasks();
          }
        }
      }, 100);
    } catch (error) {
      console.error('작업 삭제 오류:', error);
      alert('작업 삭제 중 오류가 발생했습니다.');
    }
  }
}

// 작업 수정 - 관리자와 작업자 통합 (관리자 폼 재사용)
export async function editTask(id, tabType) {
  console.log('=== 편집 시작 ===');
  console.log('편집할 작업 ID:', id);
  console.log('현재 탭 타입:', tabType);
  
  try {
    const docRef = doc(db, "tasks", id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('편집할 작업 데이터:', data);
      
      // 전역 편집 상태 설정 (중요!)
      window.editingTaskId = id;
      window.editingTabType = tabType;
      
      // 부품 데이터 강력한 초기화
      console.log('부품 데이터 강력한 초기화 시작');
      
      // 모든 전역 변수 강제 null/빈배열로 설정
      window.selectedParts = [];
      window.parts = [];
      window.currentParts = [];
      if (window.inventoryItems) window.inventoryItems = [];
      if (window.selectedItems) window.selectedItems = [];
      
      // 모든 부품 관련 DOM 즉시 초기화
      document.querySelectorAll('[name="parts"]').forEach(el => el.value = '');
      document.querySelectorAll('[id*="parts"], [class*="parts"]').forEach(el => {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.value = '';
        } else {
          el.innerHTML = '';
        }
      });
      
      console.log('편집 시작 전 부품 데이터 강력한 초기화 완료');
      
      console.log('전역 편집 상태 설정:');
      console.log('  window.editingTaskId:', window.editingTaskId);
      console.log('  window.editingTabType:', window.editingTabType);
      
      if (isCurrentUserAdmin()) {
        // 관리자: 작업입력 탭으로 이동하여 수정
        console.log('관리자 수정 모드');
        window.showTaskTab('input');
        setTimeout(() => {
          populateEditForm(data, id, tabType);
        }, 300);
      } else {
        // 작업자: 수정된 폼 사용 (하단 버튼 제거)
        console.log('작업자 수정 모드');
        showWorkerEditForm(data, id, tabType);
      }
      
    } else {
      alert('작업을 찾을 수 없습니다.');
    }
  } catch (error) {
    console.error('작업 편집 오류:', error);
    alert('작업 편집 중 오류가 발생했습니다.');
  }
}

// 작업자용 수정 취소
export function cancelWorkerEdit() {
  console.log('=== 작업자 수정 취소 ===');
  
  // 취소 시에도 부품 데이터 완전 초기화
  console.log('작업자 수정 취소 - 부품 데이터 초기화');
  
  // 전역 변수 강제 초기화
  delete window.selectedParts;
  delete window.parts;
  delete window.currentParts;
  window.selectedParts = [];
  window.parts = [];
  window.currentParts = [];
  
  if (window.inventoryItems) window.inventoryItems = [];
  if (window.selectedItems) window.selectedItems = [];
  if (window.inventoryData) window.inventoryData = [];
  
  // DOM 요소 초기화
  document.querySelectorAll('[name="parts"]').forEach(el => el.value = '');
  document.querySelectorAll('#selected-parts-display').forEach(el => el.innerHTML = '');
  document.querySelectorAll('.inventory-item').forEach(el => el.remove());
  document.querySelectorAll('.added-part-item').forEach(el => el.remove());
  document.querySelectorAll('input[type="checkbox"][data-part-id]').forEach(el => el.checked = false);
  
  console.log('작업자 수정 취소 - 부품 데이터 초기화 완료');
  
  // 편집 상태 초기화
  window.editingTaskId = null;
  window.editingTabType = null;
  
  // 원래 화면으로 돌아가기
  const activeTab = document.querySelector('.worker-tab-btn.active');
  if (activeTab && activeTab.id === 'done-tab') {
    window.loadWorkerDoneTasks();
  } else {
    window.loadWorkerTodayTasks();
  }
}

// 작업자용 커스텀 작업자 추가
export function addCustomWorker() {
  const customInput = document.getElementById('custom-worker');
  if (!customInput || !customInput.value.trim()) {
    alert('작업자명을 입력해주세요.');
    return;
  }
  
  const workerName = customInput.value.trim();
  const container = customInput.parentNode.parentNode;
  
  // 새 체크박스 생성
  const newLabel = document.createElement('label');
  newLabel.style.cssText = 'display: flex; align-items: center; margin: 0; font-size: 16px;';
  
  const newCheckbox = document.createElement('input');
  newCheckbox.type = 'checkbox';
  newCheckbox.name = 'worker';
  newCheckbox.value = workerName;
  newCheckbox.checked = true;
  newCheckbox.style.cssText = 'width: auto; margin: 0 8px 0 0; padding: 0; min-width: 20px; min-height: 20px;';
  newCheckbox.addEventListener('change', updateSelectedWorkers);
  
  newLabel.appendChild(newCheckbox);
  newLabel.appendChild(document.createTextNode(workerName));
  
  // 기존 작업자들과 함께 배치
  const firstLine = container.querySelector('div:first-child');
  if (firstLine) {
    firstLine.appendChild(newLabel);
  }
  
  // 입력 초기화
  customInput.value = '';
  
  // 선택된 작업자 목록 업데이트
  updateSelectedWorkers();
}

// 수정용 커스텀 작업자 추가 (작업자용)
export function addEditCustomWorker() {
  const customInput = document.getElementById('custom-worker');
  if (!customInput || !customInput.value.trim()) {
    alert('작업자명을 입력해주세요.');
    return;
  }
  
  const workerName = customInput.value.trim();
  const container = customInput.parentNode.parentNode;
  
  // 새 체크박스 생성
  const newLabel = document.createElement('label');
  newLabel.style.cssText = 'display: flex; align-items: center; margin: 0; font-size: 16px;';
  
  const newCheckbox = document.createElement('input');
  newCheckbox.type = 'checkbox';
  newCheckbox.name = 'worker';
  newCheckbox.value = workerName;
  newCheckbox.checked = true;
  newCheckbox.style.cssText = 'width: auto; margin: 0 8px 0 0; padding: 0; min-width: 20px; min-height: 20px;';
  newCheckbox.addEventListener('change', updateSelectedWorkers);
  
  newLabel.appendChild(newCheckbox);
  newLabel.appendChild(document.createTextNode(workerName));
  
  // 기존 작업자들과 함께 배치
  const firstLine = container.querySelector('div:first-child');
  if (firstLine) {
    firstLine.appendChild(newLabel);
  }
  
  // 입력 초기화
  customInput.value = '';
  
  // 선택된 작업자 목록 업데이트
  updateSelectedWorkers();
}

// toggleTaskDetail은 dom-utils.js에서 관리됨

// DOM 직접 업데이트 함수들 (Firebase 재조회 최소화)
function updateTaskInDOM(taskId, updates) {
  const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
  if (taskElement && updates.done) {
    // 완료된 작업은 DOM에서 제거하거나 스타일 변경
    taskElement.style.opacity = '0.6';
    taskElement.style.textDecoration = 'line-through';
    
    // 완료 버튼 숨기기
    const completeBtn = taskElement.querySelector('button[onclick*="completeTask"]');
    if (completeBtn) {
      completeBtn.style.display = 'none';
    }
  }
}

function removeTaskFromDOM(taskId) {
  const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
  if (taskElement) {
    taskElement.remove();
    
    // 해당 섹션에 작업이 없으면 "해당하는 작업이 없습니다" 메시지 표시
    const section = taskElement.closest('.worker-section');
    if (section) {
      const taskList = section.querySelector('.worker-task-list');
      if (taskList && taskList.children.length === 0) {
        section.innerHTML = '<div class="no-tasks">해당하는 작업이 없습니다.</div>';
      }
    }
  }
}

// 관리자용 수정 폼 채우기 함수들 (분리됨)
async function populateEditForm(data, id, tabType) {
  console.log('=== 관리자 수정 폼 채우기 ===');
  console.log('데이터:', data);
  
  const form = document.getElementById('task-form');
  if (!form) {
    console.error('task-form을 찾을 수 없습니다.');
    return;
  }
  
  // 날짜 설정
  if (form.date && data.date) {
    form.date.value = data.date;
  }
  
  // 🔥 작업자 체크박스 렌더링 완료 대기
  console.log('🔄 작업자 체크박스 렌더링 대기 중...');
  if (window.renderWorkerCheckboxes) {
    await window.renderWorkerCheckboxes();
  }
  
  // 🔥 작업자 체크 (재시도 로직 포함)
  if (data.worker && window.checkWorkerCheckboxes) {
    console.log('🔄 작업자 체크박스 체크 중:', data.worker);
    await window.checkWorkerCheckboxes(data.worker);
  } else if (data.worker) {
    // checkWorkerCheckboxes가 없으면 기존 방식 사용
    console.log('⚠️ checkWorkerCheckboxes 함수 없음, 기존 방식 사용');
    const workers = data.worker.split(',').map(w => w.trim());
    workers.forEach(workerName => {
      const checkbox = document.querySelector(`input[name="worker"][value="${workerName}"]`);
      if (checkbox) {
        checkbox.checked = true;
      }
    });
  }
  
  // selected-workers 입력 필드 업데이트
  const selectedWorkersInput = document.getElementById('selected-workers');
  if (selectedWorkersInput && data.worker) {
    selectedWorkersInput.value = data.worker;
  }
  
  // 나머지 필드들 설정
  if (form.client) form.client.value = data.client || '';
  if (form.removeAddress) form.removeAddress.value = data.removeAddress || '';
  if (form.installAddress) form.installAddress.value = data.installAddress || '';
  if (form.contact) form.contact.value = data.contact || '';
  if (form.taskType) form.taskType.value = data.taskType || '';
  if (form.items) form.items.value = data.items || '';
  if (form.amount) form.amount.value = data.amount || '';
  if (form.note) form.note.value = data.note || '';
  
  // 수수료 필드 설정
  const feeInput = form.querySelector('[name="fee"]');
  if (feeInput && data.fee) {
    feeInput.value = data.fee;
  }
  
  // 부품 필드 설정
  if (form.parts) {
    form.parts.value = data.parts || '';
  }
  
  // 부품 데이터 로드 (초기화 후 해당 작업의 부품만 로드)
  if (data.parts && window.loadExistingParts) {
    // 잠시 대기 후 해당 작업의 부품 로드 (초기화 완료 후)
    setTimeout(() => {
      window.loadExistingParts(data.parts);
      console.log('해당 작업의 부품만 로드 완료:', data.parts);
    }, 200);
  }
  
  // 저장 버튼 이벤트 수정 - 편집 모드로 설정
  const saveButton = form.querySelector("button[type='button']");
  if (saveButton) {
    saveButton.onclick = () => {
      console.log('관리자 수정 저장 버튼 클릭');
      console.log('편집 상태:', { id, tabType });
      window.handleTaskSave(true, id, tabType);
    };
  }
  
  // 수수료 자동 계산
  window.calculateFee();
  
  console.log('✅ 관리자 수정 폼 설정 완료');
}

function showWorkerEditForm(data, id, tabType) {
  console.log('=== 작업자 수정 폼 표시 ===');
  console.log('데이터:', data);
  
  // 작업자 수정 시작 전 부품 데이터 강력한 초기화
  console.log('작업자 수정 전 부품 데이터 강력한 초기화 시작');
  
  // 모든 전역 변수 강제 삭제 후 재생성
  delete window.selectedParts;
  delete window.parts;  
  delete window.currentParts;
  window.selectedParts = [];
  window.parts = [];
  window.currentParts = [];
  
  if (window.inventoryItems) {
    delete window.inventoryItems;
    window.inventoryItems = [];
  }
  if (window.selectedItems) {
    delete window.selectedItems;
    window.selectedItems = [];
  }
  if (window.inventoryData) {
    delete window.inventoryData;
    window.inventoryData = [];
  }
  
  // 기존 DOM 요소들 즉시 초기화
  document.querySelectorAll('[name="parts"]').forEach(el => el.value = '');
  document.querySelectorAll('#selected-parts-display').forEach(el => el.innerHTML = '');
  document.querySelectorAll('.inventory-item').forEach(el => el.remove());
  document.querySelectorAll('.added-part-item').forEach(el => el.remove());
  document.querySelectorAll('input[type="checkbox"][data-part-id]').forEach(el => el.checked = false);
  
  console.log('작업자 수정 전 부품 데이터 강력한 초기화 완료');
  
  const tabBody = document.getElementById('tab-body');
  const workerTaskContent = document.getElementById('worker-task-content');
  const targetElement = workerTaskContent || tabBody;
  
  if (!targetElement) {
    console.error('대상 요소를 찾을 수 없습니다.');
    return;
  }
  
  // 수정된 폼 HTML (하단 버튼 제거)
  const editFormHTML = `
    <div class="worker-edit-container">
      <div class="mobile-edit-header">
        <h3>📝 작업 수정</h3>
        <button onclick="cancelWorkerEdit()" class="header-cancel-btn">❌</button>
      </div>
      
      <div class="box" style="margin: 0;">
        ${window.getTaskInputFormHTML(data.date || window.getNowYYYYMMDDHHMM())}
      </div>
    </div>
  `;
  
  targetElement.innerHTML = editFormHTML;
  
  // HTML 생성 직후 즉시 부품 초기화
  setTimeout(async () => {
    // 부품 입력 렌더링
    window.renderItemsInput('items-input');
    
    // 렌더링 직후 즉시 부품 초기화
    window.selectedParts = [];
    window.parts = [];
    window.currentParts = [];
    
    // DOM 요소 재초기화
    document.querySelectorAll('[name="parts"]').forEach(el => el.value = '');
    document.querySelectorAll('#selected-parts-display').forEach(el => el.innerHTML = '');
    document.querySelectorAll('.inventory-item').forEach(el => el.remove());
    document.querySelectorAll('.added-part-item').forEach(el => el.remove());
    document.querySelectorAll('input[type="checkbox"][data-part-id]').forEach(el => el.checked = false);
    
    console.log('작업자 폼 HTML 생성 후 부품 초기화 완료');
    
    // 🔥 기존 데이터로 폼 채우기 (부품 제외) - await 추가!
    await populateWorkerFormData(data);
    
    // 이벤트 리스너 설정
    setupFormEventListeners();
    
    // 저장 버튼을 편집 모드로 변경
    const saveButton = document.querySelector('#task-form button[type="button"]');
    if (saveButton) {
      saveButton.onclick = () => {
        console.log('작업자 수정 저장 버튼 클릭');
        window.handleTaskSave(true, id, tabType);
      };
      saveButton.textContent = '💾 저장';
    }
    
    // 해당 작업의 부품만 로드 (모든 초기화 완료 후)
    setTimeout(() => {
      if (data.parts && window.loadExistingParts) {
        console.log('해당 작업의 부품 로드 시작:', data.parts);
        window.loadExistingParts(data.parts);
        console.log('작업자 폼 - 해당 작업의 부품만 로드 완료');
      }
    }, 300);
    
    // 스크롤을 상단으로
    window.scrollTo(0, 0);
    console.log('작업자 수정 폼 설정 완료');
  }, 100);
}

async function populateWorkerFormData(data) {
  const form = document.getElementById('task-form');
  if (!form) return;
  
  console.log('작업자 폼 데이터 채우기 시작 (부품 제외)');
  
  // 날짜 설정
  if (form.date && data.date) {
    form.date.value = data.date;
  }
  
  // 🔥 작업자 체크박스 렌더링 완료 대기
  console.log('🔄 작업자 체크박스 렌더링 대기 중...');
  if (window.renderWorkerCheckboxes) {
    await window.renderWorkerCheckboxes();
  }
  
  // 🔥 작업자 체크 (재시도 로직 포함)
  if (data.worker && window.checkWorkerCheckboxes) {
    console.log('🔄 작업자 체크박스 체크 중:', data.worker);
    await window.checkWorkerCheckboxes(data.worker);
  } else if (data.worker) {
    // checkWorkerCheckboxes가 없으면 기존 방식 사용
    console.log('⚠️ checkWorkerCheckboxes 함수 없음, 기존 방식 사용');
    const workers = data.worker.split(',').map(w => w.trim());
    workers.forEach(workerName => {
      const checkbox = document.querySelector(`input[name="worker"][value="${workerName}"]`);
      if (checkbox) {
        checkbox.checked = true;
      }
    });
  }
  
  // selected-workers 입력 필드 업데이트
  const selectedWorkersInput = document.getElementById('selected-workers');
  if (selectedWorkersInput && data.worker) {
    selectedWorkersInput.value = data.worker;
  }
  
  // 나머지 필드들 설정 (부품 제외)
  if (form.client) form.client.value = data.client || '';
  if (form.removeAddress) form.removeAddress.value = data.removeAddress || '';
  if (form.installAddress) form.installAddress.value = data.installAddress || '';
  if (form.contact) form.contact.value = data.contact || '';
  if (form.taskType) form.taskType.value = data.taskType || '';
  if (form.items) form.items.value = data.items || '';
  if (form.amount) form.amount.value = data.amount || '';
  if (form.note) form.note.value = data.note || '';
  
  // 수수료 필드 설정
  const feeInput = form.querySelector('[name="fee"]');
  if (feeInput && data.fee) {
    feeInput.value = data.fee;
  }
  
  // 부품 필드는 빈 값으로 설정 (나중에 별도로 로드)
  if (form.parts) {
    form.parts.value = '';
  }
  
  // 수수료 자동 계산
  window.calculateFee();
  
  console.log('✅ 작업자 폼 데이터 채우기 완료 (부품 제외)');
}

function setupFormEventListeners() {
  // 수수료 계산을 위한 이벤트 리스너 추가
  const clientInput = document.getElementById('client-input');
  const amountInput = document.getElementById('amount-input');
  
  if (clientInput) {
    clientInput.addEventListener('input', window.calculateFee);
  }
  if (amountInput) {
    amountInput.addEventListener('input', window.calculateFee);
  }
  
  // 작업자 체크박스 이벤트 리스너 추가
  const workerCheckboxes = document.querySelectorAll('input[name="worker"][type="checkbox"]');
  workerCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateSelectedWorkers);
  });
}