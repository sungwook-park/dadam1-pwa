import { db } from './firebase-config.js';
import { collection, addDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getTodayStart, getTomorrowStart } from './utils/date-utils.js';

window.handleTaskSave = async function(isEdit = false, editId = null, tabType = null) {
  const form = document.getElementById('task-form') || document.getElementById('worker-edit-form');
  if (!form) {
    console.error('❌ 폼을 찾을 수 없습니다.');
    return;
  }

  console.log('=== 저장 프로세스 시작 ===');
  console.log('편집모드:', isEdit);
  console.log('편집ID:', editId);
  console.log('탭타입:', tabType);
  console.log('window.editingTaskId:', window.editingTaskId);
  console.log('window.editingTabType:', window.editingTabType);
  
  // 편집 상태 정리 - 우선순위: 매개변수 > window 전역변수
  const finalIsEdit = isEdit || (window.editingTaskId !== null && window.editingTaskId !== undefined);
  const finalEditId = editId || window.editingTaskId;
  const finalTabType = tabType || window.editingTabType;
  
  console.log('=== 최종 편집 상태 ===');
  console.log('isEdit 매개변수:', isEdit);
  console.log('window.editingTaskId:', window.editingTaskId);
  console.log('최종 편집모드:', finalIsEdit);
  console.log('최종 편집ID:', finalEditId);
  console.log('최종 탭타입:', finalTabType);

  // 기존 필드들 - 폼 형태에 따라 다르게 처리
  const isWorkerEditForm = form.id === 'worker-edit-form';
  
  let formData;
  if (isWorkerEditForm) {
    // 작업자 수정 폼
    const rawFormData = new FormData(form);
    formData = {
      date: rawFormData.get('date') || '',
      worker: document.getElementById('edit-selected-workers')?.value || '',
      client: rawFormData.get('client') || '',
      removeAddress: rawFormData.get('removeAddress') || '',
      installAddress: rawFormData.get('installAddress') || '',
      contact: rawFormData.get('contact') || '',
      taskType: rawFormData.get('taskType') || '',
      items: rawFormData.get('items') || '',
      amount: rawFormData.get('amount') || '',
      fee: rawFormData.get('fee') || '',
      parts: rawFormData.get('parts') || '',
      note: rawFormData.get('note') || ''
    };
  } else {
    // 관리자 폼
    formData = {
      date: form.date?.value || '',
      worker: document.getElementById('selected-workers')?.value || '',
      client: form.client?.value || '',
      removeAddress: form.removeAddress?.value || '',
      installAddress: form.installAddress?.value || '',
      contact: form.contact?.value || '',
      taskType: form.taskType?.value || '',
      items: form.items?.value || '',
      amount: form.amount?.value || '',
      fee: form.querySelector('[name="fee"]')?.value || '',
      parts: form.parts?.value || '',
      note: form.note?.value || ''
    };
  }

  const taskData = {
    date: formData.date,
    worker: formData.worker,
    client: formData.client,
    removeAddress: formData.removeAddress,
    installAddress: formData.installAddress,
    contact: formData.contact,
    taskType: formData.taskType,
    items: formData.items,
    amount: formData.amount ? parseFloat(formData.amount) : 0,
    fee: formData.fee ? parseFloat(formData.fee) : 0,
    parts: formData.parts,
    note: formData.note,
    done: false,
    updatedAt: new Date().toISOString(),
    updatedBy: window.auth?.currentUser?.email || 'unknown'
  };

  // 새 작업인 경우에만 createdAt 추가
  if (!finalIsEdit) {
    taskData.createdAt = new Date().toISOString();
    taskData.createdBy = window.auth?.currentUser?.email || 'unknown';
  }

  console.log('저장할 데이터:', taskData);

  try {
    if (finalIsEdit && finalEditId) {
      console.log('=== 수정 모드 실행 ===');
      console.log('수정할 문서 ID:', finalEditId);
      
      await updateDoc(doc(db, "tasks", finalEditId), taskData);
      console.log('✅ 수정 완료:', finalEditId);
      alert('수정되었습니다!');
      
      // 편집 상태 초기화
      window.editingTaskId = null;
      window.editingTabType = null;
      
      // 작업자 폼인 경우 원래 화면으로 돌아가기
      if (isWorkerEditForm || !window.isCurrentUserAdmin()) {
        console.log('📱 작업자 수정 완료 - 화면 복원');
        if (finalTabType === 'done') {
          console.log('→ 완료작업탭으로 이동');
          window.loadWorkerDoneTasks();
        } else {
          console.log('→ 오늘작업탭으로 이동');
          window.loadWorkerTodayTasks();
        }
        return; // 여기서 함수 종료
      }
      
      // 관리자 수정 완료 후 원래 탭으로 이동
      if (finalTabType === 'reserve') {
        console.log('→ 예약탭으로 이동');
        window.loadReserveTasks();
      } else if (finalTabType === 'done') {
        console.log('→ 완료탭으로 이동');
        window.loadDoneTasks();
      } else {
        console.log('→ 오늘작업탭으로 이동');
        window.loadTodayTasks();
      }
      
    } else {
      console.log('=== 새 작업 저장 모드 실행 ===');
      const docRef = await addDoc(collection(db, "tasks"), taskData);
      console.log('✅ 새 문서 저장 완료 ID:', docRef.id);
      alert('저장되었습니다!');
      
      // 🔧 새 작업 저장 시 탭 이동 방지 - 더 확실하게
      console.log('🔧 새 작업 저장 완료 - isEdit:', isEdit, 'editingTaskId:', window.editingTaskId);
      if (!isEdit && !window.editingTaskId) {
        console.log('✅ 새 작업 저장 완료 - 작업입력탭에 머무름');
        
        // 관리자 폼만 초기화
        if (window.isCurrentUserAdmin()) {
          resetAdminForm(form);
        }
        
        return; // 여기서 함수 종료하여 탭 이동 방지
      }
    }
    
    // 관리자 폼만 초기화 (작업자 폼은 위에서 이미 처리됨)
    if (!isWorkerEditForm && window.isCurrentUserAdmin()) {
      resetAdminForm(form);
    }
    
    // 🚫 새 작업 저장 후에는 탭 이동하지 않음 - 작업입력탭에 그대로 머물기
    if (!finalIsEdit) {
      console.log('=== 새 작업 저장 완료 - 작업입력탭에 머무름 ===');
      // 아무것도 하지 않음 (작업입력탭에 그대로 머무름)
    }
    
  } catch (error) {
    console.error('❌ 저장 오류:', error);
    alert('저장 중 오류가 발생했습니다: ' + error.message);
  }
};

// 관리자 폼 초기화 함수 (부품 초기화 강화)
function resetAdminForm(form) {
  console.log('🧹 관리자 폼 초기화 시작');
  
  // 폼 리셋
  form.reset();
  
  // 작업자 체크박스 초기화
  const workerCheckboxes = document.querySelectorAll('input[name="worker"][type="checkbox"]');
  workerCheckboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  
  const selectedWorkersInput = document.getElementById('selected-workers');
  if (selectedWorkersInput) {
    selectedWorkersInput.value = '';
  }
  
  // 수수료 필드 초기화
  const feeInput = form.querySelector('[name="fee"]');
  if (feeInput) {
    feeInput.value = '';
    feeInput.style.backgroundColor = '';
    feeInput.style.borderColor = '';
    feeInput.readOnly = false;
  }
  
  const feeInfo = document.getElementById('fee-info');
  if (feeInfo) {
    feeInfo.style.display = 'none';
  }
  
  // 🔧 부품 초기화 간단 버전
  console.log('🧹 저장 후 부품 데이터 초기화');
  
  // 전역 변수 초기화
  window.selectedParts = [];
  window.parts = [];
  window.currentParts = [];
  if (window.inventoryItems) window.inventoryItems = [];
  if (window.selectedItems) window.selectedItems = [];
  
  // DOM 요소 초기화
  document.querySelectorAll('[name="parts"]').forEach(el => el.value = '');
  document.querySelectorAll('#selected-parts-display').forEach(el => el.innerHTML = '');
  document.querySelectorAll('.inventory-item').forEach(el => el.remove());
  
  // 부품 입력 UI 재렌더링
  setTimeout(() => {
    const partsContainer = document.getElementById('items-input');
    if (partsContainer && window.renderItemsInput) {
      window.renderItemsInput('items-input');
      console.log('✅ 부품 입력 UI 재렌더링 완료');
    }
    
    // 한 번 더 확인
    window.selectedParts = [];
    window.parts = [];
    window.currentParts = [];
    console.log('✅ 저장 후 부품 초기화 완료');
  }, 200);
  
  console.log('✅ 관리자 폼 초기화 완료');
}