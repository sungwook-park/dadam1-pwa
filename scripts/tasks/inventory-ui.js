// scripts/tasks/inventory-ui.js
import { db } from '../firebase-config.js';
import { addDoc, collection, getDocs, orderBy, query } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export function initInventoryTab() {
  const section = document.getElementById('sectionInventory');
  if (!section) return;

  section.innerHTML = `
    <div style="margin-bottom:15px; display:flex; gap:10px;">
      <select id="invType">
        <option value="입고">입고</option>
        <option value="출고">출고</option>
      </select>
      <input type="text" id="invItem" placeholder="부품명" />
      <input type="number" id="invQty" placeholder="수량" />
      <input type="text" id="invMemo" placeholder="비고" />
      <button id="invSaveBtn">저장</button>
    </div>
    <div id="invList"></div>
  `;

  document.getElementById('invSaveBtn').onclick = saveInventory;
  loadInventory();
}

async function saveInventory() {
  const type = document.getElementById('invType').value;
  const item = document.getElementById('invItem').value;
  const quantity = parseInt(document.getElementById('invQty').value);
  const memo = document.getElementById('invMemo').value;
  const { currentUserName } = window.getUserInfo();

  if (!item || isNaN(quantity)) return alert('부품명과 수량을 정확히 입력하세요.');

  await addDoc(collection(db, 'inventory'), {
    date: new Date().toISOString(),
    type,
    item,
    quantity: type === '입고' ? quantity : -quantity,
    memo,
    createdBy: currentUserName
  });

  alert('저장되었습니다');
  document.getElementById('invItem').value = '';
  document.getElementById('invQty').value = '';
  document.getElementById('invMemo').value = '';
  loadInventory();
}

async function loadInventory() {
  const listEl = document.getElementById('invList');
  listEl.innerHTML = '';
  const snap = await getDocs(query(collection(db, 'inventory'), orderBy('date', 'desc')));

  snap.forEach(doc => {
    const d = doc.data();
    const div = document.createElement('div');
    div.className = 'task';
    div.innerHTML = `<strong>${formatKoreanDateTime(d.date)}</strong> / ${d.type} / ${d.item} (${d.quantity}) / ${d.memo}`;
    listEl.appendChild(div);
  });
}

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
