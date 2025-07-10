import '../tasks.js';

export function render(container) {
  container.innerHTML = `
    <div class="box">
      <button onclick="routeTo('home')">🏠 홈으로</button>
      <h2>예약 등록</h2>
      <div class="section box">
        <input type="datetime-local" id="date" />
        <input type="text" id="staff" placeholder="작업자 이름 (,로 구분)" />
        <input type="text" id="client" placeholder="거래처명" />
        <input type="text" id="removeAddr" placeholder="철거주소" />
        <input type="text" id="installAddr" placeholder="설치주소" />
        <input type="text" id="contact" placeholder="고객연락처" />
        <select id="content" onchange="handleContentChange()">
          <option value="">작업내용 선택</option>
          <option value="이전설치">이전설치</option>
          <option value="설치">설치</option>
          <option value="철거">철거</option>
          <option value="철거+보관">철거+보관</option>
          <option value="보관+설치">보관+설치</option>
          <option value="A/S">A/S</option>
        </select>
        <input type="text" id="contentEtc" placeholder="기타 작업내용 입력" style="display:none" />
        <input type="text" id="items" placeholder="작업품목" />
        <input type="text" id="price" placeholder="금액" />
        <textarea id="parts" placeholder="사용부품"></textarea>
        <textarea id="memo" placeholder="비고"></textarea>
        <button id="saveBtn">작업 저장</button>
      </div>
      <h2 style="margin-top:30px;">예약 목록</h2>
      <div class="section box">
        <div id="taskList"></div>
      </div>
    </div>
  `;

  setTimeout(() => {
    window.loadTasks('reserve');
  }, 100);
}
