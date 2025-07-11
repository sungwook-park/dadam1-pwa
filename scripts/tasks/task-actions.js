import { db } from '../firebase-config.js';
import { doc, getDoc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { setEditTaskId } from './task-save.js';

export async function markDone(id) {
  await updateDoc(doc(db, 'tasks', id), { done: true });
  window.loadTasks('incomplete');
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
  document.getElementById('parts').value = d.parts || '';
  document.getElementById('memo').value = d.memo || '';

  window.setTab('input');
}
