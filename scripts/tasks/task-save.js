import { db, auth } from '../firebase-config.js';
import { addDoc, updateDoc, doc, collection } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let editTaskId = null;

export async function saveTask() {
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
}

export function setEditTaskId(id) {
  editTaskId = id;
}
