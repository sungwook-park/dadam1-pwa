// 작업 데이터 필터링 함수들

// 키워드로 작업 검색
export function filterTasksByKeyword(tasks, keyword) {
  if (!keyword) return tasks;
  
  return tasks.filter(task =>
    (task.client && task.client.includes(keyword)) ||
    (task.worker && task.worker.includes(keyword)) ||
    (task.note && task.note.includes(keyword)) ||
    (task.items && task.items.includes(keyword)) ||
    (task.removeAddress && task.removeAddress.includes(keyword)) ||
    (task.installAddress && task.installAddress.includes(keyword))
  );
}

// 날짜로 작업 필터링
export function filterTasksByDate(tasks, dateValue) {
  if (!dateValue) return tasks;
  
  return tasks.filter(task => 
    task.date && task.date.startsWith(dateValue)
  );
}

// 날짜와 키워드로 동시 필터링
export function filterTasksByDateAndKeyword(tasks, dateValue, keyword) {
  let filtered = tasks;
  
  if (dateValue) {
    filtered = filterTasksByDate(filtered, dateValue);
  }
  
  if (keyword) {
    filtered = filterTasksByKeyword(filtered, keyword);
  }
  
  return filtered;
}

// 작업 타입으로 필터링
export function filterTasksByType(tasks, taskType) {
  if (!taskType) return tasks;
  
  return tasks.filter(task => 
    task.taskType === taskType
  );
}

// 작업자로 필터링
export function filterTasksByWorker(tasks, workerName) {
  if (!workerName) return tasks;
  
  return tasks.filter(task => 
    task.worker && task.worker.includes(workerName)
  );
}

// 거래처로 필터링
export function filterTasksByClient(tasks, clientName) {
  if (!clientName) return tasks;
  
  return tasks.filter(task => 
    task.client && task.client.includes(clientName)
  );
}