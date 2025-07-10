export function render(container) {
  container.innerHTML = `
    <div class="box">
      <button onclick="routeTo('home')">🏠 홈으로</button>
      <h2>휴무관리</h2>
      <p>휴무관리 기능 준비 중...</p>
    </div>
  `;
}