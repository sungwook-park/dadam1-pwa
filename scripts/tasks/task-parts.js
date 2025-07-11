// scripts/tasks/task-parts.js

// ✅ 부품 리스트 정의 (단가 포함)
const partsList = [
  { name: '--사용부품--', price: 0 },
  { name: 'CT60', price: 12500 },
  { name: 'W-60T', price: 27500 },
  { name: 'WB60', price: 35000 },
  { name: 'WB70', price: 40000 },
  { name: 'DN60', price: 65000 },
  { name: 'DN85', price: 90000 },
  { name: 'DN110', price: 10000 },
  { name: 'DN140', price: 12000 },
  { name: '사운드바', price: 20000 },
  { name: '가벽키트', price: 20000 },
  { name: '하부커버40', price: 20000 },
  { name: '하부커버85', price: 30000 },
];

let selectedParts = []; // { name: 'CT60', quantity: 2 }

export function initPartsUI() {
  const container = document.getElementById('partsContainer');
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex; gap:10px; margin-bottom:10px;">
      <select id="partSelect"></select>
      <input type="number" id="partQty" min="1" value="1" style="width:70px;"/>
      <button type="button" id="addPartBtn">추가</button>
    </div>
    <ul id="selectedPartsList"></ul>
  `;

  const select = document.getElementById('partSelect');
  partsList.forEach(p => {
    const option = document.createElement('option');
    option.value = p.name;
    option.textContent = `${p.name} (${p.price.toLocaleString()}원)`;

    // ✅ '--'로 시작하는 항목은 선택 불가 (구분용)
    if (p.name.startsWith('--')) {
      option.disabled = true;
      option.selected = true; // 기본 선택
    }

    select.appendChild(option);
  });

  document.getElementById('addPartBtn').onclick = () => {
    const name = select.value;
    const quantity = parseInt(document.getElementById('partQty').value);
    if (!name || quantity <= 0 || name.startsWith('--')) return;

    const exist = selectedParts.find(p => p.name === name);
    if (exist) {
      exist.quantity += quantity;
    } else {
      selectedParts.push({ name, quantity });
    }
    renderPartsList();
  };
}

function renderPartsList() {
  const list = document.getElementById('selectedPartsList');
  list.innerHTML = '';
  selectedParts.forEach(({ name, quantity }, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `${name} x ${quantity} <button data-idx="${idx}" style="margin-left:10px">삭제</button>`;
    list.appendChild(li);
  });

  list.querySelectorAll('button').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.idx);
      selectedParts.splice(idx, 1);
      renderPartsList();
    };
  });
}

// ✅ 저장 전에 호출: parts 문자열로 변환
export function getPartsString() {
  return selectedParts.map(p => `${p.name}:${p.quantity}`).join('\n');
}

// ✅ 수정 시 호출: 문자열 → 드롭다운 리스트로 복원
export function setPartsFromString(str) {
  selectedParts = [];
  const lines = str.split(/\n|\r/);
  lines.forEach(line => {
    const [name, qty] = line.split(':');
    if (name && qty && !isNaN(parseInt(qty))) {
      selectedParts.push({ name: name.trim(), quantity: parseInt(qty) });
    }
  });
  renderPartsList();
}
