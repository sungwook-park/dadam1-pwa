// scripts/components/task-stats.js - 작업 통계 컴포넌트

import { getTaskItemHTML } from '../templates/task-templates.js';

// 통계 HTML 생성
export function getStatsHTML(stats, tabType) {
  if (tabType === 'reserve') {
    return `
      <div class="task-stats-container">
        <div class="stats-summary">
          <div class="stat-item total">
            <div class="stat-icon">📅</div>
            <div class="stat-info">
              <div class="stat-label">내일 해야할 작업</div>
              <div class="stat-value">${stats.totalReserveTasks}건</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  const workerStatsHTML = Object.entries(stats.workerStats || {}).map(([worker, data]) => {
    const isCompletedTab = tabType === 'done';
    return `
      <div class="worker-stat-item">
        <span class="worker-name">${worker}</span>
        <span class="worker-count">${isCompletedTab ? data.completed : data.pending}건</span>
      </div>
    `;
  }).join('');
  
  if (tabType === 'done') {
    return `
      <div class="task-stats-container">
        <div class="stats-summary">
          <div class="stat-item total">
            <div class="stat-icon">📊</div>
            <div class="stat-info">
              <div class="stat-label">오늘 전체 작업</div>
              <div class="stat-value">${stats.totalTasks}건</div>
            </div>
          </div>
          <div class="stat-item completed">
            <div class="stat-icon">✅</div>
            <div class="stat-info">
              <div class="stat-label">완료된 작업</div>
              <div class="stat-value">${stats.completedTasks}건</div>
            </div>
          </div>
        </div>
        <div class="worker-stats">
          <h4>👷 작업자별 완료 현황 (협업 작업 중복 제거)</h4>
          <div class="worker-stats-grid">
            ${workerStatsHTML}
          </div>
        </div>
      </div>
    `;
  } else {
    return `
      <div class="task-stats-container">
        <div class="stats-summary">
          <div class="stat-item total">
            <div class="stat-icon">📊</div>
            <div class="stat-info">
              <div class="stat-label">오늘 전체 작업</div>
              <div class="stat-value">${stats.totalTasks}건</div>
            </div>
          </div>
          <div class="stat-item pending">
            <div class="stat-icon">⏳</div>
            <div class="stat-info">
              <div class="stat-label">해야할 작업</div>
              <div class="stat-value">${stats.pendingTasks}건</div>
            </div>
          </div>
        </div>
        <div class="worker-stats">
          <h4>👷 작업자별 현황 (협업 작업 중복 제거)</h4>
          <div class="worker-stats-grid">
            ${workerStatsHTML}
          </div>
        </div>
      </div>
    `;
  }
}

// 작업자별 작업 목록 HTML 생성 (수정됨 - 실제 작업 수 표시)
export function getWorkerTaskListHTML(groupedTasks, tabType) {
  let html = '';
  
  Object.entries(groupedTasks).forEach(([worker, tasks]) => {
    // 실제 작업 수 계산 (중복 제거)
    const uniqueTasks = Array.from(
      new Map(tasks.map(task => [task.id, task])).values()
    );
    
    html += `
      <div class="worker-section">
        <div class="worker-header">
          <h3>👤 ${worker} (${uniqueTasks.length}건)</h3>
        </div>
        <div class="worker-task-list">
    `;
    
    // 모든 작업 표시 (중복 포함) - 팀장/팀원 구분 표시
    tasks.forEach(task => {
      html += getTaskItemHTML(task, task.id, tabType);
    });
    
    html += `
        </div>
      </div>
    `;
  });
  
  if (html === '') {
    html = '<div class="no-tasks">해당하는 작업이 없습니다.</div>';
  }
  
  return html;
}

// 작업자용 작업 버튼 조정 (오늘작업 - 완료, 수정, 삭제 모두 표시)
export function adjustWorkerTaskButtons() {
  setTimeout(() => {
    console.log('🔧 작업자 오늘작업 버튼 조정 시작');
    const taskActions = document.querySelectorAll('.task-actions');
    console.log('발견된 task-actions:', taskActions.length);
    
    taskActions.forEach((actions, index) => {
      const buttons = actions.querySelectorAll('button');
      console.log(`작업 ${index}의 버튼들:`, Array.from(buttons).map(b => b.textContent.trim()));
      
      buttons.forEach(button => {
        const text = button.textContent.trim();
        // 완료, 수정, 삭제 버튼만 표시
        if (text === '완료' || text === '수정' || text === '삭제') {
          button.style.display = 'inline-block';
          console.log(`✅ 버튼 표시: ${text}`);
        } else {
          button.style.display = 'none';
          console.log(`❌ 버튼 숨김: ${text}`);
        }
      });
    });
  }, 500);
}

// 작업자용 작업 버튼 조정 (완료작업 - 수정, 삭제 표시)
export function adjustWorkerDoneTaskButtons() {
  setTimeout(() => {
    console.log('🔧 작업자 완료작업 버튼 조정 시작');
    const taskActions = document.querySelectorAll('.task-actions');
    console.log('발견된 task-actions:', taskActions.length);
    
    taskActions.forEach((actions, index) => {
      const buttons = actions.querySelectorAll('button');
      console.log(`완료작업 ${index}의 버튼들:`, Array.from(buttons).map(b => b.textContent.trim()));
      
      buttons.forEach(button => {
        const text = button.textContent.trim();
        // 수정, 삭제 버튼만 표시
        if (text === '수정' || text === '삭제') {
          button.style.display = 'inline-block';
          console.log(`✅ 버튼 표시: ${text}`);
        } else {
          button.style.display = 'none';
          console.log(`❌ 버튼 숨김: ${text}`);
        }
      });
    });
  }, 500);
}