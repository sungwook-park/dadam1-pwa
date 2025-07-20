// scripts/task-ui.js - 권한별 UI 제어 및 모바일 최적화
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

// 현재 사용자가 관리자인지 확인
function isCurrentUserAdmin() {
  const user = window.auth?.currentUser;
  return user && window.isAdmin && window.isAdmin(user.email);
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
  const container = customInput.parentNode;
  
  // 새 체크박스 생성
  const newLabel = document.createElement('label');
  newLabel.style.cssText = 'display: flex; align-items: center; margin: 0; font-size: 16px;'; // 모바일 폰트 크기
  
  const newCheckbox = document.createElement('input');
  newCheckbox.type = 'checkbox';
  newCheckbox.name = 'worker';
  newCheckbox.value = workerName;
  newCheckbox.checked = true;
  newCheckbox.style.cssText = 'width: auto; margin: 0 8px 0 0; padding: 0; min-width: 20px; min-height: 20px;'; // 터치 영역 증가
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
    
    const taskListElement = document.querySelector('.task-list');
    if (taskListElement) {
      taskListElement.innerHTML = html;
    }
    
    // 작업자의 경우 버튼 조정
    if (!isCurrentUserAdmin()) {
      adjustWorkerTaskButtons();
    }
    
  } catch (error) {
    console.error('오늘 작업 로드 오류:', error);
    alert('작업 목록을 불러오는 중 오류가 발생했습니다.');
  }
};

// 예약 작업 로드 (관리자만)
window.loadReserveTasks = async function() {
  if (!isCurrentUserAdmin()) {
    console.log('❌ 작업자는 예약 작업 접근 불가');
    return;
  }
  
  const body = document.getElementById('tab-body');
  body.innerHTML = getReserveTabHTML();

  try {
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
    
  } catch (error) {
    console.error('예약 작업 로드 오류:', error);
    alert('예약 작업 목록을 불러오는 중 오류가 발생했습니다.');
  }
};

// 완료 작업 로드
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
      
      // 작업자의 경우 버튼 조정
      if (!isCurrentUserAdmin()) {
        adjustWorkerDoneTaskButtons();
      }
    }

    renderList(taskArr);

    // 관리자만 검색 이벤트 설정
    if (isCurrentUserAdmin()) {
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
    }
    
  } catch (error) {
    console.error('완료 작업 로드 오류:', error);
    alert('완료 작업 목록을 불러오는 중 오류가 발생했습니다.');
  }
};

// 작업자용 작업 버튼 조정 (오늘작업 - 완료, 수정만 표시)
function adjustWorkerTaskButtons() {
  setTimeout(() => {
    const taskActions = document.querySelectorAll('.task-actions');
    taskActions.forEach(actions => {
      const buttons = actions.querySelectorAll('button');
      buttons.forEach(button => {
        const text = button.textContent.trim();
        if (text !== '완료' && text !== '수정') {
          button.style.display = 'none';
        }
      });
    });
  }, 300);
}

// 작업자용 작업 버튼 조정 (완료작업 - 수정만 표시)
function adjustWorkerDoneTaskButtons() {
  setTimeout(() => {
    const taskActions = document.querySelectorAll('.task-actions');
    taskActions.forEach(actions => {
      const buttons = actions.querySelectorAll('button');
      buttons.forEach(button => {
        const text = button.textContent.trim();
        if (text !== '수정') {
          button.style.display = 'none';
        }
      });
    });
  }, 300);
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

// 작업 삭제 (관리자만)
window.deleteTask = async function(id, tabType) {
  if (!isCurrentUserAdmin()) {
    alert('삭제 권한이 없습니다.');
    return;
  }
  
  if (confirm("정말 삭제할까요?")) {
    try {
      await deleteDoc(doc(db, "tasks", id));
      alert("삭제되었습니다!");
      
      // 삭제 후 올바른 탭으로 이동
      if (tabType === 'reserve') {
        loadReserveTasks();
      } else if (tabType === 'done') {
        loadDoneTasks();
      } else {
        loadTodayTasks();
      }
    } catch (error) {
      console.error('작업 삭제 오류:', error);
      alert('작업 삭제 중 오류가 발생했습니다.');
    }
  }
};

// 작업 수정
window.editTask = async function(id, tabType) {
  try {
    const docRef = doc(db, "tasks", id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // 관리자는 기존 방식대로, 작업자는 모바일 최적화된 수정 화면
      if (isCurrentUserAdmin()) {
        showTaskTab('input');
        setTimeout(() => {
          populateEditForm(data, id, tabType);
        }, 200);
      } else {
        // 작업자용 수정 화면 (모바일 최적화)
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
  window.editingTabType = tabType;
  form.querySelector("button[type='button']").onclick = () => handleTaskSave(true, id, tabType);
  
  // 수수료 자동 계산
  calculateFee();
}

// 작업자용 모바일 최적화 수정 화면
function showWorkerEditForm(data, id, tabType) {
  const tabBody = document.getElementById('tab-body');
  const workerTaskContent = document.getElementById('worker-task-content');
  const targetElement = workerTaskContent || tabBody;
  
  if (!targetElement) return;
  
  const editFormHTML = `
    <div class="worker-edit-form">
      <div class="mobile-edit-header">
        <h3>📝 작업 수정</h3>
        <button onclick="cancelWorkerEdit()" class="cancel-btn">❌ 취소</button>
      </div>
      
      <form id="worker-edit-form" class="mobile-edit-form">
        <div class="form-group">
          <label>📅 작업일시</label>
          <input type="datetime-local" name="date" value="${data.date || ''}" required>
        </div>
        
        <div class="form-group">
          <label>👥 작업자</label>
          <input type="text" name="worker" value="${data.worker || ''}" placeholder="작업자명">
        </div>
        
        <div class="form-group">
          <label>🏢 거래처</label>
          <input type="text" name="client" value="${data.client || ''}" placeholder="거래처명">
        </div>
        
        <div class="form-group">
          <label>📍 철거 주소</label>
          <input type="text" name="removeAddress" value="${data.removeAddress || ''}" placeholder="철거 주소">
        </div>
        
        <div class="form-group">
          <label>📍 설치 주소</label>
          <input type="text" name="installAddress" value="${data.installAddress || ''}" placeholder="설치 주소">
        </div>
        
        <div class="form-group">
          <label>📞 연락처</label>
          <input type="text" name="contact" value="${data.contact || ''}" placeholder="연락처">
        </div>
        
        <div class="form-group">
          <label>⚙️ 작업구분</label>
          <select name="taskType">
            <option value="">작업구분 선택</option>
            <option value="이전설치" ${data.taskType === '이전설치' ? 'selected' : ''}>이전설치</option>
            <option value="설치" ${data.taskType === '설치' ? 'selected' : ''}>설치</option>
            <option value="철거" ${data.taskType === '철거' ? 'selected' : ''}>철거</option>
            <option value="철거보관" ${data.taskType === '철거보관' ? 'selected' : ''}>철거보관</option>
            <option value="보관설치" ${data.taskType === '보관설치' ? 'selected' : ''}>보관설치</option>
            <option value="A/S" ${data.taskType === 'A/S' ? 'selected' : ''}>A/S</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>📝 작업내용</label>
          <input type="text" name="items" value="${data.items || ''}" placeholder="작업 내용">
        </div>
        
        <div class="form-group">
          <label>💰 금액</label>
          <input type="number" name="amount" value="${data.amount || ''}" placeholder="금액">
        </div>
        
        <div class="form-group">
          <label>💳 수수료</label>
          <input type="number" name="fee" value="${data.fee || ''}" placeholder="수수료">
        </div>
        
        <div class="form-group">
          <label>🔧 사용부품</label>
          <textarea name="parts" placeholder="사용 부품">${data.parts || ''}</textarea>
        </div>
        
        <div class="form-group">
          <label>📄 비고</label>
          <textarea name="note" placeholder="비고">${data.note || ''}</textarea>
        </div>
        
        <div class="form-actions">
          <button type="button" onclick="saveWorkerEdit('${id}', '${tabType}')" class="save-btn">
            💾 저장
          </button>
          <button type="button" onclick="cancelWorkerEdit()" class="cancel-btn">
            ❌ 취소
          </button>
        </div>
      </form>
    </div>
  `;
  
  targetElement.innerHTML = editFormHTML;
  
  // 스크롤을 상단으로
  window.scrollTo(0, 0);
}

// 작업자용 수정 저장
window.saveWorkerEdit = async function(id, tabType) {
  const form = document.getElementById('worker-edit-form');
  if (!form) return;
  
  const formData = new FormData(form);
  const taskData = {
    date: formData.get('date'),
    worker: formData.get('worker'),
    client: formData.get('client'),
    removeAddress: formData.get('removeAddress'),
    installAddress: formData.get('installAddress'),
    contact: formData.get('contact'),
    taskType: formData.get('taskType'),
    items: formData.get('items'),
    amount: parseFloat(formData.get('amount')) || 0,
    fee: parseFloat(formData.get('fee')) || 0,
    parts: formData.get('parts'),
    note: formData.get('note'),
    updatedAt: new Date().toISOString(),
    updatedBy: window.auth?.currentUser?.email || 'unknown'
  };
  
  try {
    await updateDoc(doc(db, "tasks", id), taskData);
    alert('수정되었습니다!');
    
    // 원래 화면으로 돌아가기
    if (tabType === 'done') {
      window.loadWorkerDoneTasks();
    } else {
      window.loadWorkerTodayTasks();
    }
    
  } catch (error) {
    console.error('작업 수정 저장 오류:', error);
    alert('수정 저장 중 오류가 발생했습니다.');
  }
};

// 작업자용 수정 취소
window.cancelWorkerEdit = function() {
  // 원래 화면으로 돌아가기
  const activeTab = document.querySelector('.worker-tab-btn.active');
  if (activeTab && activeTab.id === 'done-tab') {
    window.loadWorkerDoneTasks();
  } else {
    window.loadWorkerTodayTasks();
  }
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
.worker-edit-form {
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

.mobile-edit-header .cancel-btn {
  background: rgba(255,255,255,0.2);
  border: 2px solid rgba(255,255,255,0.3);
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: auto;
  width: auto;
  margin: 0;
}

.mobile-edit-header .cancel-btn:hover {
  background: rgba(255,255,255,0.3);
  transform: none;
  box-shadow: none;
}

.mobile-edit-form {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-weight: 600;
  font-size: 16px;
  color: #333;
  margin-bottom: 8px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #ddd;
  border-radius: 10px;
  font-size: 16px;
  margin: 0;
  box-sizing: border-box;
  transition: border-color 0.2s ease;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: #8ecae6;
  outline: none;
  box-shadow: 0 0 0 3px rgba(142, 202, 230, 0.15);
}

.form-group textarea {
  min-height: 80px;
  resize: vertical;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 30px;
}

.form-actions button {
  flex: 1;
  padding: 16px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin: 0;
}

.save-btn {
  background: #28a745;
  color: white;
}

.save-btn:hover {
  background: #218838;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(40, 167, 69, 0.3);
}

.form-actions .cancel-btn {
  background: #6c757d;
  color: white;
}

.form-actions .cancel-btn:hover {
  background: #5a6268;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(108, 117, 125, 0.3);
}

@media (max-width: 480px) {
  .worker-edit-form {
    margin: 5px;
  }
  
  .mobile-edit-header {
    padding: 15px;
  }
  
  .mobile-edit-form {
    padding: 15px;
  }
  
  .form-actions {
    flex-direction: column;
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