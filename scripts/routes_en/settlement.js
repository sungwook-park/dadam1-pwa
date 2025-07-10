export function render(container) {
  container.innerHTML = `
    <div class="box">
      <button onclick="routeTo('home')">🏠 홈으로</button>
      <h2>정산</h2>
      <p>정산 기능 준비 중...</p>
    </div>
  `;
}
