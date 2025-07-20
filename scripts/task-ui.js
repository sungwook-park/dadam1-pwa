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
  const container = customInput.parentNode;
  
  // 새 체크박스 생성
  const newLabel = document.createElement('label');
  newLabel.style.cssText = 'display: flex; align-items: center; margin: 0; font-size: 14px;';
  
  const newCheckbox = document.createElement('input');
  newCheckbox.type = 'checkbox';
  newCheckbox.name = 'worker';
  newCheckbox.value = workerName;
  newCheckbox.checked = true;
  newCheckbox.style.cssText = 'width: auto; margin: 0 5px 0 0; padding: 0;';
  newCheckbox.addEventListener('change', updateSelectedWorkers);
  
  newLabel.appendChild(newCheckbox);
  newLabel.appendChild(document.createTextNode(workerName));
  
  // 입력 필드 앞에 삽입
  container.insertBefore(newLabel, customInput);
  
  // 입력 초기화
  customInput.value = '';
  
  // 선택된 작업자 목록 업데이트
  updateSelectedWorkers();
};

// 메인 탭 관리
window.openTab = function(name) {
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
      padding: 15px 20px;
      border-radius: 10px;
      margin-bottom: 20px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      text-align: center;
      border-left: 4px solid #8ecae6;
    ">
      <h3 style="
        margin: 0;
        font-size: 18px;
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
  }
};

window.backToHome = function() {
  document.getElementById('tab-content').style.display = 'none';
  document.getElementById('home-buttons').style.display = 'grid';
};

window.showTaskTab = function(type) {
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

// 데이터 로딩 함수들
window.loadTodayTasks = async function() {
  const body = document.getElementById('tab-body');
  body.innerHTML = `
    ${getTaskSubTabsHTML('check')}
    ${getTaskListHTML()}
  `;
  
  const q = query(
    collection(db, "tasks"),
    where("date", ">=", getTodayStart()),
    where("date", "<", getTomorrowStart()),
    where("done", "==", false),
    orderBy("date", "asc")
  );
  const querySnapshot = await getDocs(q);
  let html = "";
  querySnapshot.forEach(docu => {
    const t = docu.data();
    const id = docu.id;
    html += getTaskItemHTML(t, id, 'today');
  });
  document.querySelector('.task-list').innerHTML = html;
};

window.loadReserveTasks = async function() {
  const body = document.getElementById('tab-body');
  body.innerHTML = getReserveTabHTML();

  const q = query(
    collection(db, "tasks"),
    where("date", ">=", getTomorrowStart()),
    where("done", "==", false),
    orderBy("date", "asc")
  );
  const querySnapshot = await getDocs(q);

  let taskArr = [];
  querySnapshot.forEach(docu => {
    const t = docu.data();
    t._id = docu.id;
    taskArr.push(t);
  });

  const renderList = (arr) => {
    let html = "";
    arr.forEach(t => {
      const id = t._id;
      html += getTaskItemHTML(t, id, 'reserve');
    });
    document.querySelector('.task-list').innerHTML = html;
  };

  renderList(taskArr);

  // 검색 이벤트 연결
  document.getElementById('reserve-search-btn').onclick = function() {
    const dateVal = document.getElementById('reserve-date').value;
    const keyword = document.getElementById('reserve-search').value.trim();
    let filtered = taskArr;
    
    if (dateVal) {
      filtered = filtered.filter(t => (t.date && t.date.startsWith(dateVal)));
    }
    if (keyword) {
      filtered = filtered.filter(t =>
        (t.client && t.client.includes(keyword)) ||
        (t.worker && t.worker.includes(keyword)) ||
        (t.note && t.note.includes(keyword))
      );
    }
    renderList(filtered);
  };

  document.getElementById('reserve-search').addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById('reserve-search-btn').click();
    }
  });
  
  document.getElementById('reserve-date').addEventListener("change", function(e) {
    document.getElementById('reserve-search-btn').click();
  });
};

window.loadDoneTasks = async function() {
  const body = document.getElementById('tab-body');
  body.innerHTML = getDoneTabHTML();

  const q = query(
    collection(db, "tasks"),
    where("done", "==", true),
    orderBy("date", "desc")
  );
  const querySnapshot = await getDocs(q);
  let taskArr = [];
  querySnapshot.forEach(docu => {
    const t = docu.data();
    t._id = docu.id;
    taskArr.push(t);
  });

  function renderList(arr) {
    let html = "";
    arr.forEach(t => {
      const id = t._id;
      html += getTaskItemHTML(t, id, 'done');
    });
    document.querySelector('.task-list').innerHTML = html;
  }

  renderList(taskArr);

  // 검색 이벤트
  document.getElementById('done-search-btn').onclick = function() {
    const dateVal = document.getElementById('done-date').value;
    const keyword = document.getElementById('done-search').value.trim();
    let filtered = taskArr;
    if (dateVal) {
      filtered = filtered.filter(t => (t.date && t.date.startsWith(dateVal)));
    }
    if (keyword) {
      filtered = filtered.filter(t =>
        (t.client && t.client.includes(keyword)) ||
        (t.worker && t.worker.includes(keyword)) ||
        (t.note && t.note.includes(keyword))
      );
    }
    renderList(filtered);
  };

  document.getElementById('done-search').addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById('done-search-btn').click();
    }
  });
};

// 작업 CRUD 함수들
window.completeTask = async function(id) {
  await updateDoc(doc(db, "tasks", id), { done: true });
  alert("완료 처리되었습니다!");
  loadTodayTasks();
};

window.deleteTask = async function(id, tabType) {
  if (confirm("정말 삭제할까요?")) {
    await deleteDoc(doc(db, "tasks", id));
    
    // 삭제 후 올바른 탭으로 이동
    if (tabType === 'reserve') {
      loadReserveTasks();
    } else if (tabType === 'done') {
      loadDoneTasks();
    } else {
      loadTodayTasks();
    }
  }
};

// 수정된 editTask 함수 (Firebase 쿼리 수정)
window.editTask = async function(id, tabType) {
  try {
    // 올바른 Firebase 쿼리 방식
    const docRef = doc(db, "tasks", id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      showTaskTab('input');
      
      setTimeout(() => {
        const form = document.getElementById('task-form');
        if (!form) return;
        
        form.date.value = data.date || '';
        
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
          document.getElementById('selected-workers').value = data.worker;
        }
        
        form.client.value = data.client || '';
        form.removeAddress.value = data.removeAddress || '';
        form.installAddress.value = data.installAddress || '';
        form.contact.value = data.contact || '';
        form.taskType.value = data.taskType || '';
        
        if (form.items) {
          form.items.value = data.items || '';
        }
        
        form.amount.value = data.amount || '';
        
        // 수수료 필드 추가
        const feeInput = form.querySelector('[name="fee"]');
        if (feeInput && data.fee) {
          feeInput.value = data.fee;
        }
        
        if (form.parts) {
          form.parts.value = data.parts || '';
        }
        
        // 부품 데이터 로드
        if (data.parts && window.loadExistingParts) {
          window.loadExistingParts(data.parts);
        }
        
        form.note.value = data.note || '';
        
        window.editingTaskId = id;
        window.editingTabType = tabType; // 편집 시 탭 타입 저장
        form.querySelector("button[type='button']").onclick = () => handleTaskSave(true, id, tabType);
        
        // 수수료 자동 계산
        calculateFee();
      }, 200);
    } else {
      alert('작업을 찾을 수 없습니다.');
    }
  } catch (error) {
    console.error('작업 편집 오류:', error);
    alert('작업 편집 중 오류가 발생했습니다.');
  }
};

// 전역 함수 등록 (분리된 파일에서 사용하기 위해)
window.formatKoreanDate = formatKoreanDate;
window.getTodayStart = getTodayStart;
window.getTomorrowStart = getTomorrowStart;
window.toggleTaskDetail = toggleTaskDetail;
window.renderItemsInput = renderItemsInput;