import { getUserInfo } from './auth.js';

export function renderNav() {
  const { currentUserRole } = getUserInfo();
  const nav = document.getElementById('navContainer');

  const isAdmin = currentUserRole === 'admin';

  const menuItems = [
    { id: 'home', label: '🏠 홈' },
    ...(isAdmin ? [
      { id: 'work', label: '작업지시' },
      { id: 'reserve', label: '예약현황' },
      { id: 'settlement', label: '정산' },
      { id: 'expense', label: '지출' },
      { id: 'stock', label: '입출고' },
      { id: 'holiday', label: '휴무관리' }
    ] : [
      { id: 'work', label: '작업지시' }
    ])
  ];

  const current = location.hash?.replace('#', '') || 'home';

  nav.innerHTML = `
    <div style="display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0;">
      ${menuItems.map(item => `
        <button 
          onclick="routeTo('${item.id}'); location.hash='${item.id}'"
          style="
            padding: 6px 14px;
            font-size: 15px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            background: ${current === item.id ? '#219ebc' : '#d0eaff'};
            color: ${current === item.id ? 'white' : 'black'};
          ">
          ${item.label}
        </button>
      `).join('')}
    </div>
  `;
}

renderNav();
window.addEventListener('hashchange', renderNav);
