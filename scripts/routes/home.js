export function render(container) {
  container.innerHTML = `
    <div class="box">
      <h2>📋 관리자 홈</h2>
      <div class="tab" style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
        <button onclick="routeTo('작업지시')">작업지시</button>
        <button onclick="routeTo('예약')">예약</button>
        <button onclick="routeTo('지출')">지출</button>
        <button onclick="routeTo('정산')">정산</button>
        <button onclick="routeTo('입출고')">입출고</button>
        <button onclick="routeTo('휴무관리')">휴무관리</button>
      </div>
    </div>
  `;
}
