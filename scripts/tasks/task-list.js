// scripts/tasks/task-list.js
import { db } from '../firebase-config.js';
import { collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { formatKoreanDateTime } from './ui-utils.js';

export async function loadTasks(mode = 'incomplete') {
  const { currentUserRole, currentUserName } = window.getUserInfo();
  const tasksRef = collection(db, 'tasks');
  const baseQuery = query(tasksRef, orderBy('date', mode === 'done' ? 'desc' : 'asc'));
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
    if (mode === 'incomplete' && (d.done || taskDate > today)) return;
    if (mode === 'done' && !d.done) return;
    if (currentUserRole !== 'admin' && !d.staffNames?.includes(currentUserName)) return;

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
}

export async function loadReserveTasks() {
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
}
