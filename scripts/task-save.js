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
  const finalIsEdit = isEdit || (window.editingTaskId !== null);
  const finalEditId = editId || window.editingTaskId;
  const finalTabType = tabType || window.editingTabType;
  
  console.log('=== 최종 편집 상태 ===');
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
      if (isWorkerEditForm) {
        if (finalTabType === 'done') {
          window.loadWorkerDoneTasks();
        } else {
          window.loadWorkerTodayTasks();
        }
        return; // 여기서 함수 종료
      }
      
    } else {
      console.log('=== 새 작업 저장 모드 실행 ===');
      const docRef = await addDoc(collection(db, "tasks"), taskData);
      console.log('✅ 새 문서 저장 완료 ID:', docRef.id);
      alert('저장되었습니다!');
    }
    
    // 관리자 폼만 초기화 (작업자 폼은 위에서 이미 처리됨)
    if (!isWorkerEditForm) {
      resetAdminForm(form);
    }
    
    // 저장 후 탭 이동 결정 (관리자만)
    if (!isWorkerEditForm) {
      if (finalIsEdit && finalEditId) {
        console.log('=== 수정 완료 - 원래 탭으로 복귀 ===');
        navigateAfterEdit(finalTabType);
      } else {
        console.log('=== 새 작업 저장 - 날짜 기반 탭 결정 ===');
        navigateAfterCreate(formData.date);
      }
    }
    
  } catch (error) {
    console.error('❌ 저장 오류:', error);
    alert('저장 중 오류가 발생했습니다: ' + error.message);
  }
};

// 관리자 폼 초기화 함수
function resetAdminForm(form) {
  console.log('🧹 관리자 폼 초기화');
  
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
  
  // 부품 초기화
  if (window.selectedParts) {
    window.selectedParts = [];
    const partsDisplay = document.getElementById('selected-parts-display');
    if (partsDisplay) {
      partsDisplay.innerHTML = '';
    }
    const partsTextarea = document.querySelector('[name="parts"]');
    if (partsTextarea) {
      partsTextarea.value = '';
    }
  }
}

// 수정 완료 후 탭 이동
function navigateAfterEdit(tabType) {
  if (tabType === 'reserve') {
    console.log('→ 예약탭으로 이동');
    window.loadReserveTasks();
  } else if (tabType === 'done') {
    console.log('→ 완료탭으로 이동');
    window.loadDoneTasks();
  } else {
    console.log('→ 오늘작업탭으로 이동');
    window.loadTodayTasks();
  }
}

// 새 작업 생성 후 탭 이동
function navigateAfterCreate(dateString) {
  console.log('📅 원본 입력 날짜:', dateString);
  
  if (!dateString) {
    console.log('📅 날짜가 없음 → 오늘작업탭');
    window.loadTodayTasks();
    return;
  }
  
  // 입력된 날짜를 Date 객체로 변환
  const inputDate = new Date(dateString);
  const today = new Date();
  
  // 날짜만 비교 (시간 무시)
  const inputDateOnly = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  console.log('📊 날짜 비교:');
  console.log('  입력 날짜 (날짜만):', inputDateOnly);
  console.log('  오늘 (날짜만):', todayDateOnly);
  
  const isToday = inputDateOnly.getTime() === todayDateOnly.getTime();
  const isFuture = inputDateOnly.getTime() > todayDateOnly.getTime();
  
  console.log('📊 최종 결과:');
  console.log('  오늘 작업:', isToday);
  console.log('  예약 작업:', isFuture);
  
  if (isToday) {
    console.log('✅ 오늘 작업으로 판정 → 오늘작업탭');
    window.loadTodayTasks();
  } else if (isFuture) {
    console.log('🔮 예약 작업으로 판정 → 예약탭');
    window.loadReserveTasks();
  } else {
    console.log('📜 과거 작업으로 판정 → 오늘작업탭');
    window.loadTodayTasks();
  }
}