import { auth, db } from './firebase-config.js';
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, getDoc, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let editTaskId = null;

window.setTab = function (tabName) {
  document.querySelectorAll('.tab button').forEach(btn => btn.classList.remove('active'));
  if (tabName === 'home') document.getElementById('tabHome')?.classList.add('active');
  if (tabName === 'input') document.getElementById('tabInput')?.classList.add('active');
  if (tabName === 'list') document.getElementById('tabList')?.classList.add('active');
  if (tabName === 'done') document.getElementById('tabDone')?.classList.add('active');

  document.getElementById('sectionHome')?.classList.toggle('active', tabName === 'home');
  document.getElementById('sectionInput').classList.toggle('active', tabName === 'input');
  document.getElementById('sectionList').classList.toggle('active', tabName !== 'input' && tabName !== 'home');

  document.getElementById('doneSearchBox').style.display = tabName === 'done' ? 'flex' : 'none';
  document.getElementById('excelExportBox').style.display = tabName === 'done' ? 'block' : 'none';

  if (tabName === 'done') requestAnimationFrame(setupDoneFilterInputs);
};

function setupDoneFilterInputs() {
  ['startDateInput', 'endDateInput', 'doneSearchInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.dataset.bound) {
      el.addEventListener('input', () => {
        window.loadTasks('done');
      });
      el.dataset.bound = 'true'; // 중복 방지
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

  snap.forEach(docSnap => {
    const d = docSnap.data();
    const id = docSnap.id;

    if (d.deletedBy?.includes(currentUserRole === 'admin' ? 'admin' : currentUserName)) return;
    if (mode === 'incomplete' && d.done) return;
    if (mode === 'done' && !d.done) return;

    if (currentUserRole !== 'admin') {
      if (!d.staffNames?.includes(currentUserName)) return;
    }

    const taskDate = new Date(d.date);
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

document.getElementById('saveBtn').onclick = async () => {
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

  alert("작업이 저장되었습니다.");
  ['date','staff','client','removeAddr','installAddr','contact','content','items','price','parts','memo'].forEach(id => document.getElementById(id).value = '');
  window.setTab('list');
  window.loadTasks('incomplete');
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