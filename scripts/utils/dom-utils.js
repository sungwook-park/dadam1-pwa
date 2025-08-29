// utils/dom-utils.js

export function toggleTaskDetail(taskId) {
  const detailElement = document.getElementById(`detail-${taskId}`);
  const arrowElement = document.querySelector(`[onclick="toggleTaskDetail('${taskId}')"] .arrow`);
  
  if (!detailElement) return;
  
  if (detailElement.style.display === 'none' || !detailElement.style.display) {
    detailElement.style.display = 'block';
    if (arrowElement) arrowElement.textContent = '▲';
    
    // 부품리스트가 있다면 렌더링
    const partsDisplayElement = document.getElementById(`parts-display-${taskId}`);
    if (partsDisplayElement && window.renderPartsDisplay) {
      // 작업 데이터에서 부품 정보 가져와서 렌더링
      // 이 부분은 실제 데이터를 가져오는 로직으로 대체해야 합니다
      setTimeout(() => {
        const taskElement = detailElement.closest('.task-item');
        if (taskElement && taskElement.dataset.parts) {
          window.renderPartsDisplay(JSON.parse(taskElement.dataset.parts), `parts-display-${taskId}`);
        }
      }, 50);
    }
  } else {
    detailElement.style.display = 'none';
    if (arrowElement) arrowElement.textContent = '▼';
  }
}