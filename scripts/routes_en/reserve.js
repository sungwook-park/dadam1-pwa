import '../tasks.js';

export function render(container) {
  container.innerHTML = `
    <div class="box">
      <button onclick="routeTo('home')">🏠 홈으로</button>
      <h2>예약 확인</h2>
      <div class="section box">
        <div id="taskList"></div>
      </div>
    </div>
  `;

  setTimeout(() => {
    window.loadTasks('reserve');
  }, 100);
}
