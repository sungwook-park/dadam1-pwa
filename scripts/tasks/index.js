import { saveTask } from './task-save.js';
import { setTab } from './tab-handler.js';
import { loadTasks, loadReserveTasks } from './task-list.js';
import { markDone, deleteTask, editTask } from './task-actions.js';
import { handleContentChange } from './ui-utils.js';

window.saveTask = saveTask;
window.setTab = setTab;
window.loadTasks = loadTasks;
window.loadReserveTasks = loadReserveTasks;
window.markDone = markDone;
window.deleteTask = deleteTask;
window.editTask = editTask;
window.handleContentChange = handleContentChange;

window.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.onclick = window.saveTask;
  }
});
