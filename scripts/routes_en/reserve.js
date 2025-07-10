import '../tasks.js';

export function render(container) {
  container.innerHTML = `
    <div class="box">
      <button onclick="routeTo('home')">🏠 홈으로</button>
      <h2>예약 등록</h2>
      <div id="sectionInput" class="section box"></div>
      <h2 style="margin-top:30px;">예약 목록</h2>
      <div class="section box">
        <div id="taskList"></div>
      </div>
    </div>
  `;

  setTimeout(() => {
    // 작업입력폼 복사
    const inputHTML = document.querySelector('#mainApp #sectionInput')?.innerHTML;
    if (inputHTML) {
      document.querySelector('#sectionInput').innerHTML = inputHTML;
    }

    // 기본값 설정 (예: content → '예약')
    document.getElementById('content').value = '예약';

    // 불필요한 버튼 숨기기
    const extraBtns = document.querySelectorAll('#sectionInput .actions, #sectionInput .section .tab');
    extraBtns.forEach(el => el?.remove());

    // 예약 목록 불러오기
    window.loadTasks('reserve');
  }, 100);
}
