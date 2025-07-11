import { saveTask } from './task-save.js';
import { setTab } from './tab-handler.js';
import { loadTasks, loadReserveTasks } from './task-list.js';
import { markDone, deleteTask, editTask } from './task-actions.js';
import { handleContentChange } from './ui-utils.js';
import { initInventoryTab } from './inventory-ui.js';
import { initPartsUI } from './task-parts.js';

window.saveTask = saveTask;
window.setTab = setTab;
window.loadTasks = loadTasks;
window.loadReserveTasks = loadReserveTasks;
window.markDone = markDone;
window.deleteTask = deleteTask;
window.editTask = editTask;
window.handleContentChange = handleContentChange;

window.addEventListener('DOMContentLoaded', () => {
  initInventoryTab();
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    initPartsUI(); // ✅ 부품 드롭다운 초기화
    saveBtn.onclick = window.saveTask;
  }
});
