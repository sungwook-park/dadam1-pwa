import { db } from './firebase-config.js';
import { collection, addDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getTodayStart, getTomorrowStart } from './utils/date-utils.js';

window.handleTaskSave = async function(isEdit = false, editId = null, tabType = null) {
  const form = document.getElementById('task-form');
  if (!form) return;

  console.log('=== 저장 프로세스 시작 ===');
  console.log('편집모드:', isEdit, '편집ID:', editId, '탭타입:', tabType);
  console.log('window.editingTaskId:', window.editingTaskId);
  
  // 편집 상태 강제 초기화 (혹시 남아있을 수 있는 편집 상태 제거)
  if (!isEdit && !editId) {
    window.editingTaskId = null;
    window.editingTabType = null;
  }

  // 기존 필드들
  const date = form.date.value || '';
  const worker = document.getElementById('selected-workers').value || '';
  const client = form.client.value || '';
  const removeAddress = form.removeAddress.value || '';
  const installAddress = form.installAddress.value || '';
  const contact = form.contact.value || '';
  const taskType = form.taskType.value || '';
  const items = form.items ? form.items.value || '' : '';
  const amount = form.amount.value || '';
  const parts = form.parts ? form.parts.value || '' : '';
  const note = form.note.value || '';
  
  // 수수료 필드 추가
  const feeInput = form.querySelector('[name="fee"]');
  const fee = feeInput ? (parseFloat(feeInput.value) || 0) : 0;

  const taskData = {
    date,
    worker,
    client,
    removeAddress,
    installAddress,
    contact,
    taskType,
    items,
    amount: amount ? parseFloat(amount) : 0,
    fee,
    parts,
    note,
    done: false,
    updatedAt: new Date().toISOString()
  };

  // 새 작업인 경우에만 createdAt 추가
  if (!isEdit) {
    taskData.createdAt = new Date().toISOString();
  }

  console.log('저장할 데이터:', taskData);

  try {
    if (isEdit && editId) {
      console.log('=== 수정 모드 실행 ===');
      await updateDoc(doc(db, "tasks", editId), taskData);
      alert('수정되었습니다!');
      
      // 편집 상태 초기화
      window.editingTaskId = null;
      window.editingTabType = null;
      
    } else {
      console.log('=== 새 작업 저장 모드 실행 ===');
      const docRef = await addDoc(collection(db, "tasks"), taskData);
      console.log('새 문서 ID:', docRef.id);
      alert('저장되었습니다!');
    }
    
    // 폼 초기화
    form.reset();
    
    // 작업자 체크박스 초기화
    const workerCheckboxes = document.querySelectorAll('input[name="worker"][type="checkbox"]');
    workerCheckboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
    document.getElementById('selected-workers').value = '';
    
    // 수수료 필드 초기화
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
    
    // 저장 후 탭 이동 결정
    if (isEdit && editId) {
      console.log('=== 수정 완료 - 원래 탭으로 복귀 ===');
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
    } else {
      console.log('=== 새 작업 저장 - 날짜 기반 탭 결정 ===');
      console.log('📅 원본 입력 날짜:', date);
      
      if (!date) {
        console.log('📅 날짜가 없음 → 오늘작업탭');
        window.loadTodayTasks();
        return;
      }
      
      // 입력된 날짜를 Date 객체로 변환
      const inputDate = new Date(date);
      const today = new Date();
      
      // 오늘 날짜 (시간 0시 0분 0초)
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const tomorrowStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      console.log('📅 상세 날짜 비교:');
      console.log('  입력 날짜 (Date):', inputDate);
      console.log('  입력 날짜 (연-월-일):', inputDate.getFullYear(), inputDate.getMonth() + 1, inputDate.getDate());
      console.log('  오늘 시작:', todayStart);
      console.log('  오늘 (연-월-일):', todayStart.getFullYear(), todayStart.getMonth() + 1, todayStart.getDate());
      console.log('  내일 시작:', tomorrowStart);
      
      // 날짜만 비교 (시간 무시)
      const inputDateOnly = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      console.log('📊 날짜만 비교 (시간 무시):');
      console.log('  입력 날짜 (날짜만):', inputDateOnly);
      console.log('  오늘 (날짜만):', todayDateOnly);
      console.log('  같은 날짜?:', inputDateOnly.getTime() === todayDateOnly.getTime());
      console.log('  입력 날짜 >= 오늘?:', inputDateOnly.getTime() >= todayDateOnly.getTime());
      
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
    
  } catch (error) {
    console.error('❌ 저장 오류:', error);
    alert('저장 중 오류가 발생했습니다: ' + error.message);
  }
};