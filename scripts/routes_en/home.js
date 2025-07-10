export function render(container) {
  container.innerHTML = `
    <div class="box">
      <h2>📋 관리자 홈</h2>
      <div class="tab" style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
        <button onclick="routeTo('work')">작업지시</button>
        <button onclick="routeTo('reserve')">예약</button>
        <button onclick="routeTo('expense')">지출</button>
        <button onclick="routeTo('settlement')">정산</button>
        <button onclick="routeTo('stock')">입출고</button>
        <button onclick="routeTo('holiday')">휴무관리</button>
      </div>
    </div>
  `;
}
