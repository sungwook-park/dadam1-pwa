import { auth, db } from './firebase-config.js';
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, getDoc, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let editTaskId = null;

window.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.onclick = window.saveTask;
  }
});

window.saveTask = async () => {
  const staffInput = document.getElementById('staff').value;
  const staffNames = staffInput.split(',').map(name => name.trim()).filter(Boolean);

  const task = {
    uid: auth.currentUser.uid,
    staffNames,
    date: document.getElementById('date').value,
    client: document.getElementById('client').value,
    removeAddr: document.getElementById('removeAddr').value,
    installAddr: document.getElementById('installAddr').value,
    contact: document.getElementById('contact').value,
    content: document.getElementById('content').value,
    items: document.getElementById('items').value,
    price: document.getElementById('price').value,
    parts: document.getElementById('parts').value,
    memo: document.getElementById('memo').value,
    done: false,
    deletedBy: []
  };

  if (editTaskId) {
    await updateDoc(doc(db, 'tasks', editTaskId), task);
    editTaskId = null;
  } else {
    task.createdAt = new Date();
    await addDoc(collection(db, 'tasks'), task);
  }

  alert('작업이 저장되었습니다.');
  ['date','staff','client','removeAddr','installAddr','contact','content','items','price','parts','memo'].forEach(id => document.getElementById(id).value = '');
  window.setTab('list');
  window.loadTasks('incomplete');
};


window.setTab = function (tabName) {
  document.querySelectorAll('.tab button').forEach(btn => btn.classList.remove('active'));
  document.getElementById('sectionInput').classList.remove('active');
  document.getElementById('sectionList').classList.remove('active');
  document.getElementById('sectionReserve')?.classList.remove('active');
  document.getElementById('doneSearchBox').style.display = 'none';
  document.getElementById('excelExportBox').style.display = 'none';

  if (tabName === 'input') {
    document.getElementById('tabInput')?.classList.add('active');
    document.getElementById('sectionInput').classList.add('active');
  } else if (tabName === 'list') {
    document.getElementById('tabList')?.classList.add('active');
    document.getElementById('sectionList').classList.add('active');
  } else if (tabName === 'done') {
    document.getElementById('tabDone')?.classList.add('active');
    document.getElementById('sectionList').classList.add('active');
    document.getElementById('doneSearchBox').style.display = 'flex';
    document.getElementById('excelExportBox').style.display = 'block';
    requestAnimationFrame(setupDoneFilterInputs);
  } else if (tabName === 'reserve') {
    document.getElementById('tabReserve')?.classList.add('active');
    document.getElementById('sectionReserve')?.classList.add('active');
  }
};

function setupDoneFilterInputs() {
  ['startDateInput', 'endDateInput', 'doneSearchInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.dataset.bound) {
      el.addEventListener('input', () => {
        window.loadTasks('done');
      });
      el.dataset.bound = 'true';
    }
  });
}

window.loadTasks = async function (mode = 'incomplete') {
  const { currentUserRole, currentUserName } = window.getUserInfo();
  const tasksRef = collection(db, 'tasks');

  let baseQuery = query(tasksRef, orderBy('date', mode === 'done' ? 'desc' : 'asc'));
  const snap = await getDocs(baseQuery);

  const list = document.getElementById('taskList');
  list.innerHTML = '';

  const startDate = (mode === 'done') ? document.getElementById('startDateInput')?.value : '';
  const endDate = (mode === 'done') ? document.getElementById('endDateInput')?.value : '';
  const keyword = (mode === 'done') ? document.getElementById('doneSearchInput')?.value?.toLowerCase() : '';
  const today = new Date(); today.setHours(0, 0, 0, 0);

  snap.forEach(docSnap => {
    const d = docSnap.data();
    const id = docSnap.id;
    const taskDate = new Date(d.date);
    taskDate.setHours(0, 0, 0, 0);

    if (d.deletedBy?.includes(currentUserRole === 'admin' ? 'admin' : currentUserName)) return;
    if (mode === 'incomplete') {
      if (d.done || taskDate > today) return;
    }
    if (mode === 'done' && !d.done) return;

    if (currentUserRole !== 'admin') {
      if (!d.staffNames?.includes(currentUserName)) return;
    }

    if (mode === 'done') {
      if (startDate && taskDate < new Date(startDate + 'T00:00:00')) return;
      if (endDate && taskDate > new Date(endDate + 'T23:59:59')) return;
      if (keyword) {
        const combined = [d.staffNames?.join(', ') || '', d.client || '', d.content || '', d.items || '', d.memo || ''].join(' ').toLowerCase();
        if (!combined.includes(keyword)) return;
      }
    }

    const div = document.createElement('div');
    div.className = 'task' + (d.done ? ' done' : '');
    div.innerHTML = `
      <strong>${formatKoreanDateTime(d.date)}</strong> / ${d.staffNames?.join(', ')} / <span style="background: yellow; font-weight: bold;">${d.client}</span> / ${d.content}<br>
      <small>${d.items}</small>
      <div class="details">
        <p>철거: ${d.removeAddr}</p>
        <p>설치: ${d.installAddr}</p>
        <p>연락처: <a href="tel:${d.contact}" style="color:blue;">${d.contact}</a></p>
        <p>금액: ${d.price}</p>
        <p>부품: ${d.parts}</p>
        <p>비고: ${d.memo}</p>
      </div>
      <div class="actions">
        <button onclick="markDone('${id}')">완료</button>
        <button onclick="deleteTask('${id}')">삭제</button>
        <button onclick="editTask('${id}')">수정</button>
      </div>
    `;
    div.onclick = () => {
      const det = div.querySelector('.details');
      det.style.display = det.style.display === 'block' ? 'none' : 'block';
    };
    list.appendChild(div);
  });
};

window.loadReserveTasks = async function () {
  const { currentUserName } = window.getUserInfo();
  const list = document.getElementById('reserveList');
  list.innerHTML = '';
  const startDate = document.getElementById('reserveStartDate')?.value;
  const endDate = document.getElementById('reserveEndDate')?.value;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const snap = await getDocs(query(collection(db, 'tasks'), orderBy('date', 'asc')));

  snap.forEach(docSnap => {
    const d = docSnap.data();
    const id = docSnap.id;
    const taskDate = new Date(d.date);
    taskDate.setHours(0, 0, 0, 0);

    if (d.done || taskDate <= today) return;
    if (startDate && taskDate < new Date(startDate)) return;
    if (endDate && taskDate > new Date(endDate)) return;

    const div = document.createElement('div');
    div.className = 'task';
    div.innerHTML = `
      <strong>${formatKoreanDateTime(d.date)}</strong> / ${d.staffNames?.join(', ')} / <span style="background: yellow; font-weight: bold;">${d.client}</span> / ${d.content}<br>
      <small>${d.items}</small>
      <div class="details">
        <p>철거: ${d.removeAddr}</p>
        <p>설치: ${d.installAddr}</p>
        <p>연락처: <a href="tel:${d.contact}" style="color:blue;">${d.contact}</a></p>
        <p>금액: ${d.price}</p>
        <p>부품: ${d.parts}</p>
        <p>비고: ${d.memo}</p>
      </div>
      <div class="actions">
        <button onclick="markDone('${id}')">완료</button>
        <button onclick="deleteTask('${id}')">삭제</button>
        <button onclick="editTask('${id}')">수정</button>
      </div>
    `;
    div.onclick = () => {
      const det = div.querySelector('.details');
      det.style.display = det.style.display === 'block' ? 'none' : 'block';
    };
    list.appendChild(div);
  });
};

window.editTask = async function (id) {
  const ref = doc(db, 'tasks', id);
  const snap = await getDoc(ref);
  const d = snap.data();
  editTaskId = id;

  document.getElementById('date').value = d.date || '';
  document.getElementById('staff').value = (d.staffNames || []).join(', ');
  document.getElementById('client').value = d.client || '';
  document.getElementById('removeAddr').value = d.removeAddr || '';
  document.getElementById('installAddr').value = d.installAddr || '';
  document.getElementById('contact').value = d.contact || '';
  document.getElementById('content').value = d.content || '';
  document.getElementById('items').value = d.items || '';
  document.getElementById('price').value = d.price || '';
  document.getElementById('parts').value = d.parts || '';
  document.getElementById('memo').value = d.memo || '';

  window.setTab('input');
};

window.markDone = async id => {
  await updateDoc(doc(db, 'tasks', id), { done: true });
  window.loadTasks('incomplete');
};

window.deleteTask = async id => {
  const ref = doc(db, 'tasks', id);
  const snap = await getDoc(ref);
  const data = snap.data();
  const { currentUserRole, currentUserName } = window.getUserInfo();

  if (currentUserRole === 'admin') {
    await deleteDoc(ref);
  } else {
    const deletedBy = data.deletedBy || [];
    if (!deletedBy.includes(currentUserName)) {
      deletedBy.push(currentUserName);
      await updateDoc(ref, { deletedBy });
    }
  }
  window.loadTasks('incomplete');
};

function formatKoreanDateTime(dateString) {
  const d = new Date(dateString);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  let hour = d.getHours();
  const minute = String(d.getMinutes()).padStart(2, '0');
  const period = hour < 12 ? '오전' : '오후';
  hour = hour % 12 || 12;
  const hourStr = String(hour).padStart(2, '0');
  return `${yyyy}.${mm}.${dd} ${period}${hourStr}:${minute}`;
}
window.handleContentChange = () => {
  const contentSelect = document.getElementById('content');
  const etcInput = document.getElementById('contentEtc');
  if (!contentSelect || !etcInput) return;

  if (contentSelect.value === '') {
    etcInput.style.display = 'none';
  } else if (contentSelect.value === '기타') {
    etcInput.style.display = 'block';
  } else {
    etcInput.style.display = 'none';
  }
};
