import '../tasks.js';

export function render(container) {
  container.innerHTML = `
    <div class="box">
      <button onclick="routeTo('home')">🏠 홈으로</button>
      <h2>작업지시</h2>
      <div class="tab" id="tabButtons"></div>
      <div id="sectionInput" class="section box"></div>
      <div id="sectionList" class="section box">
        <div id="doneSearchBox" style="margin-bottom: 10px; display: none;">
          <input type="date" id="startDateInput" />
          <input type="date" id="endDateInput" />
          <input type="text" id="doneSearchInput" placeholder="검색어 (거래처, 품목 등)" />
        </div>
        <div id="excelExportBox" style="text-align: right; margin-bottom: 10px; display: none;">
          <button onclick="exportDoneToExcel()">엑셀로 내보내기</button>
        </div>
        <div id="taskList"></div>
      </div>
    </div>
  `;

  setTimeout(() => {
    const tabButtons = document.getElementById('tabButtons');
    tabButtons.innerHTML = '';
    tabButtons.innerHTML += `
      <button id="tabInput">작업 입력</button>
      <button id="tabList" class="active">목록 보기</button>
      <button id="tabDone">완료 보기</button>
    `;

    document.getElementById('tabInput').onclick = () => window.setTab('input');
    document.getElementById('tabList').onclick = () => {
      window.setTab('list');
      window.loadTasks('incomplete');
    };
    document.getElementById('tabDone').onclick = () => {
      window.setTab('done');
      window.loadTasks('done');
    };

    const inputHTML = document.querySelector('#mainApp #sectionInput')?.innerHTML;
    if (inputHTML) {
      document.querySelector('#sectionInput').innerHTML = inputHTML;
      window.setTab('list');
      window.loadTasks('incomplete');
    }
  }, 100);
}