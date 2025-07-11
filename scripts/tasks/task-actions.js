// scripts/tasks/task-actions.js
import { db } from '../firebase-config.js';
import { doc, getDoc, updateDoc, deleteDoc, addDoc, collection } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { setEditTaskId } from './task-save.js';

export async function markDone(id) {
  const ref = doc(db, 'tasks', id);
  const snap = await getDoc(ref);
  const task = snap.data();

  await updateDoc(ref, { done: true });
  await recordPartsOut(task);

  window.loadTasks('incomplete');
}

async function recordPartsOut(task) {
  if (!task.parts) return;
  const lines = task.parts.split(/\n|\r/);
  const { currentUserName } = window.getUserInfo();

  for (const line of lines) {
    const [name, qty] = line.split(':');
    const quantity = parseInt(qty);
    if (!name || isNaN(quantity)) continue;

    await addDoc(collection(db, 'inventory'), {
      date: task.date || new Date().toISOString(),
      type: '출고',
      item: name.trim(),
      quantity: -quantity,
      memo: '작업 완료 출고',
      createdBy: currentUserName
    });
  }
}

export async function deleteTask(id) {
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
}

export async function editTask(id) {
  const ref = doc(db, 'tasks', id);
  const snap = await getDoc(ref);
  const d = snap.data();
  setEditTaskId(id);

  document.getElementById('date').value = d.date || '';
  document.getElementById('staff').value = (d.staffNames || []).join(', ');
  document.getElementById('client').value = d.client || '';
  document.getElementById('removeAddr').value = d.removeAddr || '';
  document.getElementById('installAddr').value = d.installAddr || '';
  document.getElementById('contact').value = d.contact || '';
  document.getElementById('content').value = d.content || '';
  document.getElementById('items').value = d.items || '';
  document.getElementById('price').value = d.price || '';
  document.getElementById('memo').value = d.memo || '';
  document.getElementById('parts').value = d.parts || '';

  const { setPartsFromString } = await import('./task-parts.js');
  setPartsFromString(d.parts || '');

  window.setTab('input');
}
