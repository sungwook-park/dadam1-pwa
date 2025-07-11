import { loadTasks } from './task-list.js';

export function setTab(tabName) {
  document.querySelectorAll('.tab button').forEach(btn => btn.classList.remove('active'));
  document.getElementById('sectionInput').classList.remove('active');
  document.getElementById('sectionList').classList.remove('active');
  document.getElementById('sectionReserve')?.classList.remove('active');
  document.getElementById('doneSearchBox').style.display = 'none';
  document.getElementById('excelExportBox').style.display = 'none';

  if (tabName === 'input') {
    document.getElementById('tabInput')?.classList.add('active');
    document.getElementById('sectionInput').classList.add('active');
  } else if (tabName === 'list') {
    document.getElementById('tabList')?.classList.add('active');
    document.getElementById('sectionList').classList.add('active');
  } else if (tabName === 'done') {
    document.getElementById('tabDone')?.classList.add('active');
    document.getElementById('sectionList').classList.add('active');
    document.getElementById('doneSearchBox').style.display = 'flex';
    document.getElementById('excelExportBox').style.display = 'block';
    requestAnimationFrame(setupDoneFilterInputs);
  } else if (tabName === 'reserve') {
    document.getElementById('tabReserve')?.classList.add('active');
    document.getElementById('sectionReserve')?.classList.add('active');
  }
}

function setupDoneFilterInputs() {
  ['startDateInput', 'endDateInput', 'doneSearchInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.dataset.bound) {
      el.addEventListener('input', () => loadTasks('done'));
      el.dataset.bound = 'true';
    }
  });
}
