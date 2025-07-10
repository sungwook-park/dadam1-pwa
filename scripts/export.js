window.exportDoneToExcel = function () {
  const taskElements = document.querySelectorAll('.task.done');
  if (taskElements.length === 0) {
    alert("완료된 작업이 없습니다. '완료 보기' 탭에서 시도해주세요.");
    return;
  }

  const data = [];

  taskElements.forEach(taskEl => {
    const strong = taskEl.querySelector('strong')?.textContent || '';
    const detailLines = [...taskEl.querySelectorAll('.details p')].map(p => p.textContent);

    const dateRaw = strong.split(' ')[0];
    const formattedDate = dateRaw.replace(/\./g, '-');

    const staff = (taskEl.innerText.match(/\/ (.*?) \//) || [])[1] || '';
    const client = taskEl.querySelector('span')?.textContent || '';
    const removeAddr = detailLines[0]?.replace('철거: ', '') || '';
    const installAddr = detailLines[1]?.replace('설치: ', '') || '';
    const fullAddr = removeAddr + ' ~ ' + installAddr;
    const contact = detailLines[2]?.replace('연락처: ', '') || '';
    const price = parseInt((detailLines[3]?.replace('금액: ', '') || '0').replace(/[^0-9]/g, '')) || 0;
    const parts = detailLines[4]?.replace('부품: ', '') || '';
    const memo = detailLines[5]?.replace('비고: ', '') || '';
    const items = taskEl.querySelector('small')?.textContent || '';
    const workType = taskEl.innerText.split('/').pop().trim().split('\n')[0];
    const fullWork = workType + ' - ' + items;

    const row = {
      날짜: formattedDate,
      작업자: staff,
      거래처명: client,
      주소: fullAddr,
      고객연락처: contact,
      작업: fullWork,
      금액: price,
      사용부품: parts,
      비고: memo
    };

    data.push(row);
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "완료된 작업");

  const now = new Date();
  const filename = `완료작업_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.xlsx`;

  XLSX.writeFile(workbook, filename);
};
