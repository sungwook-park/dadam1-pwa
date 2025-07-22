// scripts/task-ui.js - 수정 폼 개선 및 모바일 최적화 (코드 정리 버전)
import { db } from './firebase-config.js';
import {
  collection, query, where, getDocs, updateDoc, doc, deleteDoc, orderBy, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import "./task-save.js";
import { loadSettlement } from './settle.js';

// utils 임포트
import { formatKoreanDate, getTodayStart, getTomorrowStart, getNowYYYYMMDDHHMM } from './utils/date-utils.js';
import { toggleTaskDetail } from './utils/dom-utils.js';
import { renderItemsInput } from './components/task-item.js';
import { 
  getTaskSubTabsHTML, 
  getTaskInputFormHTML, 
  getTaskListHTML,
  getReserveTabHTML,
  getDoneTabHTML,
  getTaskItemHTML 
} from './templates/task-templates.js';

// 오늘 날짜 문자열 생성
function getTodayString() {
  const today = new Date();
  return today.getFullYear() + '-' + 
    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
    String(today.getDate()).padStart(2, '0');
}

// 내일 날짜 문자열 생성
function getTomorrowString() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.getFullYear() + '-' + 
    String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + 
    String(tomorrow.getDate()).padStart(2, '0');
}

// 현재 사용자가 관리자인지 확인
function isCurrentUserAdmin() {
  const userInfo = window.getCurrentUserInfo();
  return window.isAdmin && window.isAdmin(userInfo);
}

// 작업 필터링 함수 (작업자별)
function filterTasksForCurrentUser(tasks) {
  const userInfo = window.getCurrentUserInfo();
  
  // 관리자는 모든 작업 표시
  if (isCurrentUserAdmin()) {
    console.log('👑 관리자 - 모든 작업 표시:', tasks.length + '개');
    return tasks;
  }
  
  // 작업자는 본인 작업만 표시
  if (!userInfo || !userInfo.name) {
    console.warn('⚠️ 사용자 정보 없음 - 빈 배열 반환');
    return [];
  }
  
  const userName = userInfo.name;
  const filteredTasks = tasks.filter(task => {
    if (!task.worker) return false;
    
    // 작업자 필드에 현재 사용자 이름이 포함되어 있는지 확인
    // 예: "박성욱, 박성호" -> 박성욱이 로그인하면 true
    const isAssigned = task.worker.includes(userName);
    
    if (isAssigned) {
      console.log(`✅ ${userName} 작업 발견:`, task.items || task.client);
    }
    
    return isAssigned;
  });
  
  console.log(`👷 작업자(${userName}) - 필터링된 작업:`, filteredTasks.length + '개');
  return filteredTasks;
}

// 수수료 자동 계산 함수
function calculateFee() {
  const clientInput = document.getElementById('client-input');
  const amountInput = document.getElementById('amount-input');
  const feeInput = document.getElementById('fee-input');
  const feeInfo = document.getElementById('fee-info');
  
  if (!clientInput || !amountInput || !feeInput) return;
  
  const clientName = clientInput.value.trim();
  const amount = parseFloat(amountInput.value) || 0;
  
  if ((clientName === '공간' || clientName === '공간티비') && amount > 0) {
    const calculatedFee = Math.round(amount * 0.22);
    feeInput.value = calculatedFee;
    feeInput.style.backgroundColor = '#e8f5e8';
    feeInput.style.borderColor = '#4caf50';
    feeInput.readOnly = true;
    
    if (feeInfo) {
      feeInfo.textContent = `${clientName}은 금액의 22%로 자동 계산됩니다.`;
      feeInfo.style.display = 'block';
    }
  } else {
    feeInput.style.backgroundColor = '';
    feeInput.style.borderColor = '';
    feeInput.readOnly = false;
    
    if (feeInfo) {
      feeInfo.style.display = 'none';
    }
  }
}

// 작업자 관리 함수들
function updateSelectedWorkers() {
  const checkboxes = document.querySelectorAll('input[name="worker"][type="checkbox"]:checked');
  const selectedWorkers = Array.from(checkboxes).map(cb => cb.value);
  const hiddenInput = document.getElementById('selected-workers');
  
  if (hiddenInput) {
    hiddenInput.value = selectedWorkers.join(', ');
  }
}

window.addCustomWorker = function() {
  const customInput = document.getElementById('custom-worker');
  if (!customInput || !customInput.value.trim()) {
    alert('작업자명을 입력해주세요.');
    return;
  }
  
  const workerName = customInput.value.trim();
  const container = customInput.parentNode.parentNode; // 상위 div로 이동
  
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
};

// 메인 탭 관리 (관리자만)
window.openTab = function(name) {
  // 관리자가 아니면 탭 이동 불가
  if (!isCurrentUserAdmin()) {
    console.log('❌ 작업자는 탭 이동 불가');
    return;
  }
  
  document.getElementById('home-buttons').style.display = 'none';
  document.getElementById('tab-content').style.display = 'block';
  
  // 탭 제목을 박스 스타일로 설정
  const tabTitleElement = document.getElementById('tab-title');
  let titleText = '';
  let titleIcon = '';
  
  if (name === 'task') {
    titleText = '작업지시';
    titleIcon = '📋';
  } else if (name === 'reserve') {
    titleText = '예약';
    titleIcon = '📅';
  } else if (name === 'settle') {
    titleText = '정산';
    titleIcon = '💰';
  } else if (name === 'spend') {
    titleText = '지출';
    titleIcon = '💸';
  } else if (name === 'inventory') {
    titleText = '입출고';
    titleIcon = '📦';
  } else if (name === 'holiday') {
    titleText = '휴무관리';
    titleIcon = '🏖️';
  }
  
  // 박스 스타일로 제목 설정
  tabTitleElement.innerHTML = `
    <div style="
      background: white;
      padding: 20px 25px;
      border-radius: 12px;
      margin-bottom: 25px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      text-align: center;
      border-left: 4px solid #8ecae6;
    ">
      <h3 style="
        margin: 0;
        font-size: 1.4rem;
        color: #333;
        font-weight: 600;
      ">${titleIcon} ${titleText}</h3>
    </div>
  `;
  
  if (name === 'task') showTaskTab('check');
  else if (name === 'reserve') loadReserveTasks();
  else if (name === 'settle') {
    document.getElementById('tab-body').innerHTML = '<div id="settle-result"></div>';
    loadSettlement();
  } else if (name === 'inventory') {
    // 입출고 관리 로드
    if (window.loadInventoryManagement) {
      window.loadInventoryManagement();
    } else {
      console.error('❌ 입출고 관리 모듈을 찾을 수 없습니다.');
      document.getElementById('tab-body').innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">입출고 관리 모듈을 로드할 수 없습니다.</div>';
    }
  }
};

// 홈으로 돌아가기 (관리자만)
window.backToHome = function() {
  if (!isCurrentUserAdmin()) {
    console.log('❌ 작업자는 홈 이동 불가');
    return;
  }
  
  document.getElementById('tab-content').style.display = 'none';
  document.getElementById('home-buttons').style.display = 'grid';
  
  // 편집 상태 초기화
  window.editingTaskId = null;
  window.editingTabType = null;
};

// 작업 탭 표시 (관리자만)
window.showTaskTab = function(type) {
  if (!isCurrentUserAdmin()) {
    console.log('❌ 작업자는 작업 입력 탭 접근 불가');
    return;
  }
  
  const body = document.getElementById('tab-body');
  const subTabs = getTaskSubTabsHTML(type);
  
  if (type === 'input') {
    body.innerHTML = `
      ${subTabs}
      ${getTaskInputFormHTML(getNowYYYYMMDDHHMM())}
    `;
    renderItemsInput('items-input');
    
    // 수수료 계산을 위한 이벤트 리스너 추가
    setTimeout(() => {
      const clientInput = document.getElementById('client-input');
      const amountInput = document.getElementById('amount-input');
      
      if (clientInput) {
        clientInput.addEventListener('input', calculateFee);
        clientInput.addEventListener('blur', calculateFee);
      }
      if (amountInput) {
        amountInput.addEventListener('input', calculateFee);
      }
      
      // 작업자 체크박스 이벤트 리스너 추가
      const workerCheckboxes = document.querySelectorAll('input[name="worker"][type="checkbox"]');
      workerCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectedWorkers);
      });
    }, 100);
    
  } else if (type === 'check') {
    loadTodayTasks();
  } else if (type === 'done') {
    loadDoneTasks();
  }
};

// 오늘 작업 로드
window.loadTodayTasks = async function() {
  const body = document.getElementById('tab-body');
  
  // 관리자와 작업자에 따라 다른 UI 표시
  if (isCurrentUserAdmin()) {
    body.innerHTML = `
      ${getTaskSubTabsHTML('check')}
      ${getTaskListHTML()}
    `;
  } else {
    // 작업자용 UI는 이미 auth.js에서 설정됨
    // 여기서는 작업 목록만 업데이트
  }
  
  try {
    console.log('📅 오늘 작업 로드 시작');
    
    const todayStr = getTodayString();
    const q = query(
      collection(db, "tasks"),
      where("date", ">=", todayStr + "T00:00:00"),
      where("date", "<=", todayStr + "T23:59:59"),
      where("done", "==", false),
      orderBy("date", "asc")
    );
    
    const querySnapshot = await getDocs(q);
    let allTasks = [];
    
    querySnapshot.forEach(docu => {
      const taskData = docu.data();
      allTasks.push({
        id: docu.id,
        ...taskData
      });
    });
    
    console.log('📋 전체 오늘 작업 수:', allTasks.length);
    
    // 작업자별 필터링 적용
    const filteredTasks = filterTasksForCurrentUser(allTasks);
    
    // HTML 생성
    let html = "";
    filteredTasks.forEach(task => {
      html += getTaskItemHTML(task, task.id, 'today');
    });
    
    const taskListElement = document.querySelector('.task-list');
    if (taskListElement) {
      taskListElement.innerHTML = html;
    }
    
    // 작업자의 경우 버튼 조정
    if (!isCurrentUserAdmin()) {
      adjustWorkerTaskButtons();
    }
    
    console.log('✅ 오늘 작업 로드 완료');
    
  } catch (error) {
    console.error('❌ 오늘 작업 로드 오류:', error);
    alert('작업 목록을 불러오는 중 오류가 발생했습니다.');
  }
};

// 예약 작업 로드 (관리자만) - 내일 작업만 기본 표시
window.loadReserveTasks = async function() {
  if (!isCurrentUserAdmin()) {
    console.log('❌ 작업자는 예약 작업 접근 불가');
    return;
  }
  
  const body = document.getElementById('tab-body');
  body.innerHTML = getReserveTabHTML();

  try {
    console.log('📅 예약 작업 로드 시작');
    
    // 내일 작업만 필터링
    const tomorrowStr = getTomorrowString();
    const q = query(
      collection(db, "tasks"),
      where("date", ">=", tomorrowStr + "T00:00:00"),
      where("date", "<=", tomorrowStr + "T23:59:59"),
      where("done", "==", false),
      orderBy("date", "asc")
    );
    
    const querySnapshot = await getDocs(q);
    let allTasks = [];
    
    querySnapshot.forEach(docu => {
      const taskData = docu.data();
      allTasks.push({
        id: docu.id,
        ...taskData
      });
    });
    
    console.log('📋 내일 예약 작업 수:', allTasks.length);
    
    // 관리자는 모든 예약 작업을 볼 수 있지만, 혹시 필요하다면 필터링도 가능
    const filteredTasks = filterTasksForCurrentUser(allTasks);

    const renderList = (tasks) => {
      let html = "";
      tasks.forEach(task => {
        html += getTaskItemHTML(task, task.id, 'reserve');
      });
      document.querySelector('.task-list').innerHTML = html;
    };

    renderList(filteredTasks);

    // 검색 이벤트 연결
    document.getElementById('reserve-search-btn').onclick = function() {
      const startDate = document.getElementById('reserve-start-date').value;
      const endDate = document.getElementById('reserve-end-date').value;
      
      if (!startDate || !endDate) {
        alert('시작 날짜와 종료 날짜를 모두 선택해주세요.');
        return;
      }
      
      // 날짜 범위로 검색
      searchReserveTasksByDateRange(startDate, endDate);
    };

    // 리셋 버튼 이벤트
    window.resetReserveFilter = function() {
      const tomorrowStr = getTomorrowString();
      document.getElementById('reserve-start-date').value = tomorrowStr;
      document.getElementById('reserve-end-date').value = tomorrowStr;
      loadReserveTasks();
    };
    
    console.log('✅ 예약 작업 로드 완료');
    
  } catch (error) {
    console.error('❌ 예약 작업 로드 오류:', error);
    alert('예약 작업 목록을 불러오는 중 오류가 발생했습니다.');
  }
};

// 예약 작업 날짜 범위 검색
async function searchReserveTasksByDateRange(startDate, endDate) {
  try {
    console.log('🔍 예약 작업 날짜 범위 검색:', startDate, '~', endDate);
    
    const q = query(
      collection(db, "tasks"),
      where("date", ">=", startDate + "T00:00:00"),
      where("date", "<=", endDate + "T23:59:59"),
      where("done", "==", false),
      orderBy("date", "asc")
    );
    
    const querySnapshot = await getDocs(q);
    let allTasks = [];
    
    querySnapshot.forEach(docu => {
      const taskData = docu.data();
      allTasks.push({
        id: docu.id,
        ...taskData
      });
    });
    
    const filteredTasks = filterTasksForCurrentUser(allTasks);
    
    let html = "";
    filteredTasks.forEach(task => {
      html += getTaskItemHTML(task, task.id, 'reserve');
    });
    
    document.querySelector('.task-list').innerHTML = html;
    
    console.log('✅ 예약 작업 검색 완료:', filteredTasks.length + '건');
    
  } catch (error) {
    console.error('❌ 예약 작업 검색 오류:', error);
    alert('예약 작업 검색 중 오류가 발생했습니다.');
  }
}

// 완료 작업 로드 - 오늘 완료된 작업만 기본 표시
window.loadDoneTasks = async function() {
  const body = document.getElementById('tab-body');
  
  // 관리자와 작업자에 따라 다른 UI 표시
  if (isCurrentUserAdmin()) {
    body.innerHTML = getDoneTabHTML();
  } else {
    // 작업자용 검색박스 없이 목록만 표시
    const taskListElement = document.querySelector('.task-list');
    if (!taskListElement) {
      body.innerHTML = '<div class="task-list"></div>';
    }
  }

  try {
    console.log('✅ 완료 작업 로드 시작');
    
    // 오늘 완료된 작업만 필터링
    const todayStr = getTodayString();
    const q = query(
      collection(db, "tasks"),
      where("done", "==", true),
      where("date", ">=", todayStr + "T00:00:00"),
      where("date", "<=", todayStr + "T23:59:59"),
      orderBy("date", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    let allTasks = [];
    
    querySnapshot.forEach(docu => {
      const taskData = docu.data();
      allTasks.push({
        id: docu.id,
        ...taskData
      });
    });
    
    console.log('📋 오늘 완료 작업 수:', allTasks.length);
    
    // 작업자별 필터링 적용
    const filteredTasks = filterTasksForCurrentUser(allTasks);

    function renderList(tasks) {
      let html = "";
      tasks.forEach(task => {
        html += getTaskItemHTML(task, task.id, 'done');
      });
      
      const taskListElement = document.querySelector('.task-list');
      if (taskListElement) {
        taskListElement.innerHTML = html;
      }
      
      // 작업자의 경우 버튼 조정
      if (!isCurrentUserAdmin()) {
        adjustWorkerDoneTaskButtons();
      }
    }

    renderList(filteredTasks);

    // 관리자만 검색 이벤트 설정
    if (isCurrentUserAdmin()) {
      document.getElementById('done-search-btn').onclick = function() {
        const startDate = document.getElementById('done-start-date').value;
        const endDate = document.getElementById('done-end-date').value;
        
        if (!startDate || !endDate) {
          alert('시작 날짜와 종료 날짜를 모두 선택해주세요.');
          return;
        }
        
        // 날짜 범위로 검색
        searchDoneTasksByDateRange(startDate, endDate);
      };

      // 리셋 버튼 이벤트
      window.resetDoneFilter = function() {
        const todayStr = getTodayString();
        document.getElementById('done-start-date').value = todayStr;
        document.getElementById('done-end-date').value = todayStr;
        loadDoneTasks();
      };
    }
    
    console.log('✅ 완료 작업 로드 완료');
    
  } catch (error) {
    console.error('❌ 완료 작업 로드 오류:', error);
    alert('완료 작업 목록을 불러오는 중 오류가 발생했습니다.');
  }
};

// 완료 작업 날짜 범위 검색
async function searchDoneTasksByDateRange(startDate, endDate) {
  try {
    console.log('🔍 완료 작업 날짜 범위 검색:', startDate, '~', endDate);
    
    const q = query(
      collection(db, "tasks"),
      where("done", "==", true),
      where("date", ">=", startDate + "T00:00:00"),
      where("date", "<=", endDate + "T23:59:59"),
      orderBy("date", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    let allTasks = [];
    
    querySnapshot.forEach(docu => {
      const taskData = docu.data();
      allTasks.push({
        id: docu.id,
        ...taskData
      });
    });
    
    const filteredTasks = filterTasksForCurrentUser(allTasks);
    
    let html = "";
    filteredTasks.forEach(task => {
      html += getTaskItemHTML(task, task.id, 'done');
    });
    
    const taskListElement = document.querySelector('.task-list');
    if (taskListElement) {
      taskListElement.innerHTML = html;
    }
    
    // 작업자의 경우 버튼 조정
    if (!isCurrentUserAdmin()) {
      adjustWorkerDoneTaskButtons();
    }
    
    console.log('✅ 완료 작업 검색 완료:', filteredTasks.length + '건');
    
  } catch (error) {
    console.error('❌ 완료 작업 검색 오류:', error);
    alert('완료 작업 검색 중 오류가 발생했습니다.');
  }
}

// 작업자용 작업 버튼 조정 (오늘작업 - 완료, 수정, 삭제 모두 표시)
function adjustWorkerTaskButtons() {
  setTimeout(() => {
    console.log('🔧 작업자 오늘작업 버튼 조정 시작');
    const taskActions = document.querySelectorAll('.task-actions');
    console.log('발견된 task-actions:', taskActions.length);
    
    taskActions.forEach((actions, index) => {
      const buttons = actions.querySelectorAll('button');
      console.log(`작업 ${index}의 버튼들:`, Array.from(buttons).map(b => b.textContent.trim()));
      
      buttons.forEach(button => {
        const text = button.textContent.trim();
        // 완료, 수정, 삭제 버튼만 표시
        if (text === '완료' || text === '수정' || text === '삭제') {
          button.style.display = 'inline-block';
          console.log(`✅ 버튼 표시: ${text}`);
        } else {
          button.style.display = 'none';
          console.log(`❌ 버튼 숨김: ${text}`);
        }
      });
    });
  }, 500); // 시간을 늘려서 DOM이 완전히 로드된 후 실행
}

// 작업자용 작업 버튼 조정 (완료작업 - 수정, 삭제 표시)
function adjustWorkerDoneTaskButtons() {
  setTimeout(() => {
    console.log('🔧 작업자 완료작업 버튼 조정 시작');
    const taskActions = document.querySelectorAll('.task-actions');
    console.log('발견된 task-actions:', taskActions.length);
    
    taskActions.forEach((actions, index) => {
      const buttons = actions.querySelectorAll('button');
      console.log(`완료작업 ${index}의 버튼들:`, Array.from(buttons).map(b => b.textContent.trim()));
      
      buttons.forEach(button => {
        const text = button.textContent.trim();
        // 수정, 삭제 버튼만 표시
        if (text === '수정' || text === '삭제') {
          button.style.display = 'inline-block';
          console.log(`✅ 버튼 표시: ${text}`);
        } else {
          button.style.display = 'none';
          console.log(`❌ 버튼 숨김: ${text}`);
        }
      });
    });
  }, 500); // 시간을 늘려서 DOM이 완전히 로드된 후 실행
}

// 작업 완료 처리
window.completeTask = async function(id) {
  try {
    await updateDoc(doc(db, "tasks", id), { 
      done: true,
      completedAt: new Date().toISOString(),
      completedBy: window.auth?.currentUser?.email || 'unknown'
    });
    
    alert("완료 처리되었습니다!");
    
    // 현재 사용자에 따라 적절한 탭으로 리로드
    if (isCurrentUserAdmin()) {
      loadTodayTasks();
    } else {
      window.loadWorkerTodayTasks();
    }
  } catch (error) {
    console.error('작업 완료 처리 오류:', error);
    alert('작업 완료 처리 중 오류가 발생했습니다.');
  }
};

// 작업 삭제 (관리자와 작업자 모두 가능)
window.deleteTask = async function(id, tabType) {
  if (confirm("정말 삭제할까요?")) {
    try {
      await deleteDoc(doc(db, "tasks", id));
      alert("삭제되었습니다!");
      
      // 삭제 후 올바른 탭으로 이동
      if (isCurrentUserAdmin()) {
        // 관리자
        if (tabType === 'reserve') {
          loadReserveTasks();
        } else if (tabType === 'done') {
          loadDoneTasks();
        } else {
          loadTodayTasks();
        }
      } else {
        // 작업자
        if (tabType === 'done') {
          window.loadWorkerDoneTasks();
        } else {
          window.loadWorkerTodayTasks();
        }
      }
    } catch (error) {
      console.error('작업 삭제 오류:', error);
      alert('작업 삭제 중 오류가 발생했습니다.');
    }
  }
};

// 작업 수정 - 관리자와 작업자 통합 (관리자 폼 재사용)
window.editTask = async function(id, tabType) {
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
      
      console.log('전역 편집 상태 설정:');
      console.log('  window.editingTaskId:', window.editingTaskId);
      console.log('  window.editingTabType:', window.editingTabType);
      
      if (isCurrentUserAdmin()) {
        // 관리자: 작업입력 탭으로 이동하여 수정
        console.log('→ 관리자 수정 모드');
        showTaskTab('input');
        setTimeout(() => {
          populateEditForm(data, id, tabType);
        }, 200);
      } else {
        // 작업자: 관리자와 동일한 폼 사용하지만 작업자용 헤더/버튼
        console.log('→ 작업자 수정 모드');
        showWorkerEditForm(data, id, tabType);
      }
      
    } else {
      alert('작업을 찾을 수 없습니다.');
    }
  } catch (error) {
    console.error('작업 편집 오류:', error);
    alert('작업 편집 중 오류가 발생했습니다.');
  }
};

// 관리자용 수정 폼 채우기
function populateEditForm(data, id, tabType) {
  console.log('=== 관리자 수정 폼 채우기 ===');
  console.log('데이터:', data);
  
  const form = document.getElementById('task-form');
  if (!form) {
    console.error('❌ task-form을 찾을 수 없습니다.');
    return;
  }
  
  // 날짜 설정
  if (form.date && data.date) {
    form.date.value = data.date;
  }
  
  // 작업자 체크박스 설정
  const workerCheckboxes = document.querySelectorAll('input[name="worker"][type="checkbox"]');
  workerCheckboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  
  if (data.worker) {
    const workers = data.worker.split(', ');
    workers.forEach(workerName => {
      const checkbox = document.querySelector(`input[name="worker"][value="${workerName.trim()}"]`);
      if (checkbox) {
        checkbox.checked = true;
      }
    });
    
    const selectedWorkersInput = document.getElementById('selected-workers');
    if (selectedWorkersInput) {
      selectedWorkersInput.value = data.worker;
    }
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
  
  // 부품 데이터 로드
  if (data.parts && window.loadExistingParts) {
    window.loadExistingParts(data.parts);
  }
  
  // 저장 버튼 이벤트 수정 - 편집 모드로 설정
  const saveButton = form.querySelector("button[type='button']");
  if (saveButton) {
    saveButton.onclick = () => {
      console.log('💾 관리자 수정 저장 버튼 클릭');
      console.log('편집 상태:', { id, tabType });
      window.handleTaskSave(true, id, tabType);
    };
  }
  
  // 수수료 자동 계산
  calculateFee();
  
  console.log('✅ 관리자 수정 폼 설정 완료');
}

// 작업자용 수정 폼 (관리자 폼 재사용)
function showWorkerEditForm(data, id, tabType) {
  console.log('=== 작업자 수정 폼 표시 ===');
  console.log('데이터:', data);
  
  const tabBody = document.getElementById('tab-body');
  const workerTaskContent = document.getElementById('worker-task-content');
  const targetElement = workerTaskContent || tabBody;
  
  if (!targetElement) {
    console.error('❌ 대상 요소를 찾을 수 없습니다.');
    return;
  }
  
  // 관리자와 동일한 입력 폼 HTML 생성 (헤더와 버튼만 다름)
  const editFormHTML = `
    <div class="worker-edit-container">
      <div class="mobile-edit-header">
        <h3>📝 작업 수정</h3>
        <button onclick="cancelWorkerEdit()" class="header-cancel-btn">❌</button>
      </div>
      
      <div class="box" style="margin: 0;">
        ${getTaskInputFormHTML(data.date || getNowYYYYMMDDHHMM())}
      </div>
      
      <div class="form-actions" style="display: flex; gap: 12px; margin-top: 20px; padding: 0 25px;">
        <button type="button" onclick="saveWorkerEdit('${id}', '${tabType}')" style="flex: 1; background: #28a745 !important; margin: 0;">
          💾 저장
        </button>
        <button type="button" onclick="cancelWorkerEdit()" style="flex: 1; background: #6c757d !important; margin: 0;">
          ❌ 취소
        </button>
      </div>
    </div>
  `;
  
  targetElement.innerHTML = editFormHTML;
  
  // 부품 입력 렌더링
  setTimeout(() => {
    renderItemsInput('items-input');
    
    // 기존 데이터로 폼 채우기 (관리자와 동일한 로직 재사용)
    populateFormData(data);
    
    // 이벤트 리스너 설정
    setupFormEventListeners();
    
    // 스크롤을 상단으로
    window.scrollTo(0, 0);
    console.log('✅ 작업자 수정 폼 설정 완료');
  }, 100);
}

// 폼 데이터 채우기 (공통 함수)
function populateFormData(data) {
  const form = document.getElementById('task-form');
  if (!form) return;
  
  // 날짜 설정
  if (form.date && data.date) {
    form.date.value = data.date;
  }
  
  // 작업자 체크박스 설정
  const workerCheckboxes = document.querySelectorAll('input[name="worker"][type="checkbox"]');
  workerCheckboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  
  if (data.worker) {
    const workers = data.worker.split(', ');
    workers.forEach(workerName => {
      const checkbox = document.querySelector(`input[name="worker"][value="${workerName.trim()}"]`);
      if (checkbox) {
        checkbox.checked = true;
      }
    });
    
    const selectedWorkersInput = document.getElementById('selected-workers');
    if (selectedWorkersInput) {
      selectedWorkersInput.value = data.worker;
    }
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
  
  // 부품 데이터 로드
  if (data.parts && window.loadExistingParts) {
    window.loadExistingParts(data.parts);
  }
  
  // 수수료 자동 계산
  calculateFee();
}

// 폼 이벤트 리스너 설정 (공통 함수)
function setupFormEventListeners() {
  // 수수료 계산을 위한 이벤트 리스너 추가
  const clientInput = document.getElementById('client-input');
  const amountInput = document.getElementById('amount-input');
  
  if (clientInput) {
    clientInput.addEventListener('input', calculateFee);
    clientInput.addEventListener('blur', calculateFee);
  }
  if (amountInput) {
    amountInput.addEventListener('input', calculateFee);
  }
  
  // 작업자 체크박스 이벤트 리스너 추가
  const workerCheckboxes = document.querySelectorAll('input[name="worker"][type="checkbox"]');
  workerCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateSelectedWorkers);
  });
}

// 작업자용 수정 저장
window.saveWorkerEdit = async function(id, tabType) {
  console.log('=== 작업자 수정 저장 ===');
  console.log('편집 ID:', id);
  console.log('탭 타입:', tabType);
  
  // 관리자와 동일한 저장 로직 사용
  window.handleTaskSave(true, id, tabType);
};

// 작업자용 수정 취소
window.cancelWorkerEdit = function() {
  console.log('=== 작업자 수정 취소 ===');
  
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
};

// 수정 폼용 작업자 추가 (작업자용)
window.addEditCustomWorker = function() {
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
};

// 모바일에서 작업 상세 토글 최적화
window.toggleTaskDetail = function(taskId) {
  const detailElement = document.getElementById(`detail-${taskId}`);
  const arrowElement = document.querySelector(`[onclick="toggleTaskDetail('${taskId}')"] .arrow`);
  
  if (!detailElement) return;
  
  if (detailElement.style.display === 'none' || !detailElement.style.display) {
    detailElement.style.display = 'block';
    if (arrowElement) arrowElement.textContent = '▲';
    
    // 모바일에서 부드럽게 스크롤
    setTimeout(() => {
      detailElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
    }, 100);
    
  } else {
    detailElement.style.display = 'none';
    if (arrowElement) arrowElement.textContent = '▼';
  }
};

// CSS 스타일 추가 (작업자 수정 폼용)
const workerEditStyles = `
<style>
.worker-edit-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  margin: 10px;
  overflow: hidden;
}

.mobile-edit-header {
  background: linear-gradient(135deg, #8ecae6, #219ebc);
  color: white;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mobile-edit-header h3 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.header-cancel-btn {
  background: rgba(255,255,255,0.2) !important;
  border: 2px solid rgba(255,255,255,0.3) !important;
  color: white !important;
  padding: 8px 12px !important;
  border-radius: 8px !important;
  font-size: 14px !important;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: auto !important;
  width: auto !important;
  margin: 0 !important;
  min-height: auto !important;
}

.header-cancel-btn:hover {
  background: rgba(255,255,255,0.3) !important;
  transform: none;
  box-shadow: none;
}

@media (max-width: 480px) {
  .worker-edit-container {
    margin: 5px;
  }
  
  .mobile-edit-header {
    padding: 15px;
  }
  
  .mobile-edit-header h3 {
    font-size: 1.1rem;
  }
}
</style>
`;

// 스타일 추가
if (!document.getElementById('worker-edit-styles')) {
  const styleElement = document.createElement('div');
  styleElement.id = 'worker-edit-styles';
  styleElement.innerHTML = workerEditStyles;
  document.head.appendChild(styleElement);
}

// 전역 함수 등록 (분리된 파일에서 사용하기 위해)
window.formatKoreanDate = formatKoreanDate;
window.getTodayStart = getTodayStart;
window.getTomorrowStart = getTomorrowStart;
window.renderItemsInput = renderItemsInput;
window.isCurrentUserAdmin = isCurrentUserAdmin;