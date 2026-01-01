// scripts/loaders/task-loaders.js - 작업 데이터 로딩 함수들 (Firebase 최적화)

import { db } from '../firebase-config.js';
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { 
  getTodayString, 
  getTomorrowString, 
  isCurrentUserAdmin, 
  filterTasksForCurrentUser, 
  groupTasksByWorker, 
  generateTaskStats,
  getCachedData,
  setCachedData,
  trackQuery,
  separateTasksByStatus,
  filterTasksByKeyword,
  sortTasks
} from '../utils/task-utils.js';

import { getStatsHTML, getWorkerTaskListHTML, adjustWorkerTaskButtons, adjustWorkerDoneTaskButtons } from '../components/task-stats.js';

import { 
  getTaskSubTabsHTML, 
  getReserveTabHTML,
  getDoneTabHTML
} from '../templates/task-templates.js';

// 오늘 작업 로드 (Firebase 최적화)
export async function loadTodayTasks() {
  const body = document.getElementById('tab-body');
  
  // 관리자와 작업자에 따라 다른 UI 표시
  if (isCurrentUserAdmin()) {
    body.innerHTML = `
      ${getTaskSubTabsHTML('check')}
      <div id="admin-stats-container"></div>
      <div id="admin-task-content"></div>
    `;
  }
  
  try {
    console.log('📅 오늘 작업 로드 시작');
    trackQuery('loadTodayTasks');
    
    const todayStr = getTodayString();
    const cacheKey = `today-tasks-${todayStr}`;
    
    // 캐시 확인
    let cachedData = getCachedData(cacheKey);
    let allTodayTasks, pendingTasks, completedTasks;
    
    if (cachedData) {
      console.log('📦 캐시에서 오늘 작업 로드');
      ({ allTodayTasks, pendingTasks, completedTasks } = cachedData);
    } else {
      // 🔥 Firebase 최적화: 단일 쿼리로 모든 오늘 작업 가져오기
      const todayQuery = query(
        collection(db, "tasks"),
        where("date", ">=", todayStr + "T00:00:00"),
        where("date", "<=", todayStr + "T23:59:59"),
        orderBy("date", "asc")
      );
      
      const querySnapshot = await getDocs(todayQuery);
      allTodayTasks = [];
      
      querySnapshot.forEach(docu => {
        const taskData = docu.data();
        allTodayTasks.push({
          id: docu.id,
          ...taskData
        });
      });
      
      // 클라이언트에서 완료/미완료 분리 (Firebase 읽기량 절약)
      const separated = separateTasksByStatus(allTodayTasks);
      pendingTasks = separated.pending;
      completedTasks = separated.completed;
      
      // 캐시에 저장
      setCachedData(cacheKey, { allTodayTasks, pendingTasks, completedTasks });
    }
    
    console.log('전체 오늘 작업:', allTodayTasks.length);
    console.log('미완료 작업:', pendingTasks.length);  
    console.log('완료 작업:', completedTasks.length);
    
    if (isCurrentUserAdmin()) {
      // 관리자: 통계 + 작업자별 분류
      const stats = generateTaskStats(allTodayTasks, completedTasks);
      const groupedTasks = groupTasksByWorker(pendingTasks);
      
      // 통계 표시
      const statsContainer = document.getElementById('admin-stats-container');
      if (statsContainer) {
        statsContainer.innerHTML = getStatsHTML(stats, 'today');
      }
      
      // 작업자별 작업 목록 표시
      const taskContent = document.getElementById('admin-task-content');
      if (taskContent) {
        taskContent.innerHTML = getWorkerTaskListHTML(groupedTasks, 'today');
      }
      
    } else {
      // 작업자: 본인 작업만 필터링
      const filteredTasks = filterTasksForCurrentUser(pendingTasks);
      
      let html = "";
      filteredTasks.forEach(task => {
        html += window.getTaskItemHTML(task, task.id, 'today');
      });
      
      const taskListElement = document.querySelector('.task-list');
      if (taskListElement) {
        taskListElement.innerHTML = html;
      }
      
      // 작업자의 경우 버튼 조정
      adjustWorkerTaskButtons();
    }
    
    console.log('오늘 작업 로드 완료');
    
  } catch (error) {
    console.error('오늘 작업 로드 오류:', error);
    alert('작업 목록을 불러오는 중 오류가 발생했습니다.');
  }
}

// 예약 작업 로드 (관리자만) - 내일 작업만 기본 표시 (Firebase 최적화)
export async function loadReserveTasks() {
  if (!isCurrentUserAdmin()) {
    console.log('작업자는 예약 작업 접근 불가');
    return;
  }
  
  const body = document.getElementById('tab-body');
  body.innerHTML = `
    ${getReserveTabHTML()}
    <div id="reserve-stats-container"></div>
    <div id="reserve-task-content"></div>
  `;

  try {
    console.log('예약 작업 로드 시작');
    trackQuery('loadReserveTasks');
    
    const tomorrowStr = getTomorrowString();
    const cacheKey = `reserve-tasks-${tomorrowStr}`;
    
    // 캐시 확인
    let allTasks = getCachedData(cacheKey);
    
    if (!allTasks) {
      // 📊 최적화: done 조건 제거, 단일 쿼리로 내일의 모든 작업 가져오기
      const q = query(
        collection(db, "tasks"),
        where("date", ">=", tomorrowStr + "T00:00:00"),
        where("date", "<=", tomorrowStr + "T23:59:59"),
        orderBy("date", "asc")
      );
      
      const querySnapshot = await getDocs(q);
      allTasks = [];
      
      querySnapshot.forEach(docu => {
        const taskData = docu.data();
        allTasks.push({
          id: docu.id,
          ...taskData
        });
      });
      
      // 캐시에 저장
      setCachedData(cacheKey, allTasks);
    }
    
    // 📊 클라이언트에서 미완료 작업만 필터링
    const pendingTasks = allTasks.filter(task => task.done === false);
    
    console.log('내일 전체 작업:', allTasks.length);
    console.log('내일 예약 작업 수:', pendingTasks.length);
    
    // 통계 표시
    const stats = generateTaskStats(pendingTasks, [], true);
    const statsContainer = document.getElementById('reserve-stats-container');
    if (statsContainer) {
      statsContainer.innerHTML = getStatsHTML(stats, 'reserve');
    }
    
    // 작업자별 작업 목록 표시
    const groupedTasks = groupTasksByWorker(pendingTasks);
    const taskContent = document.getElementById('reserve-task-content');
    if (taskContent) {
      taskContent.innerHTML = getWorkerTaskListHTML(groupedTasks, 'reserve');
    }

    // 검색 이벤트 연결 (향상된 검색 함수 사용)
    document.getElementById('reserve-search-btn').onclick = searchReserveTasksEnhanced;

    // 리셋 버튼 이벤트
    window.resetReserveFilter = function() {
      const tomorrowStr = getTomorrowString();
      document.getElementById('reserve-start-date').value = tomorrowStr;
      document.getElementById('reserve-end-date').value = tomorrowStr;
      document.getElementById('reserve-search-keyword').value = '';
      document.getElementById('reserve-sort-order').value = 'date-asc';
      
      const summaryEl = document.getElementById('reserve-search-summary');
      if (summaryEl) {
        summaryEl.style.display = 'none';
      }
      
      loadReserveTasks();
    };
    
    console.log('예약 작업 로드 완료');
    
  } catch (error) {
    console.error('예약 작업 로드 오류:', error);
    alert('예약 작업 목록을 불러오는 중 오류가 발생했습니다.');
  }
}

// 예약작업 향상된 검색 (검색어 + 날짜 + 정렬) (Firebase 최적화)
export async function searchReserveTasksEnhanced() {
  const startDate = document.getElementById('reserve-start-date').value;
  const endDate = document.getElementById('reserve-end-date').value;
  const keyword = document.getElementById('reserve-search-keyword').value.trim();
  const sortOrder = document.getElementById('reserve-sort-order').value;
  
  if (!startDate || !endDate) {
    alert('시작 날짜와 종료 날짜를 모두 선택해주세요.');
    return;
  }
  
  try {
    console.log('예약작업 향상된 검색:', {startDate, endDate, keyword, sortOrder});
    trackQuery('searchReserveTasksEnhanced');
    
    const cacheKey = `search-reserve-${startDate}-${endDate}`;
    let allTasks = getCachedData(cacheKey);
    
    if (!allTasks) {
      const q = query(
        collection(db, "tasks"),
        where("date", ">=", startDate + "T00:00:00"),
        where("date", "<=", endDate + "T23:59:59"),
        where("done", "==", false),
        orderBy("date", "asc")
      );
      
      const querySnapshot = await getDocs(q);
      allTasks = [];
      
      querySnapshot.forEach(docu => {
        const taskData = docu.data();
        allTasks.push({
          id: docu.id,
          ...taskData
        });
      });
      
      // 캐시에 저장
      setCachedData(cacheKey, allTasks);
    }
    
    // 클라이언트에서 검색어 필터링 및 정렬
    let filteredTasks = allTasks;
    if (keyword) {
      filteredTasks = filterTasksByKeyword(filteredTasks, keyword);
    }
    
    filteredTasks = sortTasks(filteredTasks, sortOrder);
    
    // 검색 결과 요약 표시
    const summaryEl = document.getElementById('reserve-search-summary');
    if (summaryEl) {
      const totalFound = filteredTasks.length;
      const searchInfo = [];
      
      if (keyword) searchInfo.push(`"${keyword}"`);
      searchInfo.push(`${startDate} ~ ${endDate}`);
      
      summaryEl.innerHTML = `
        검색결과: <strong>${totalFound}건</strong> 
        ${searchInfo.length > 0 ? `(${searchInfo.join(', ')})` : ''}
      `;
      summaryEl.style.display = 'block';
    }
    
    // 통계 및 목록 업데이트
    const stats = generateTaskStats(filteredTasks, [], true);
    const statsContainer = document.getElementById('reserve-stats-container');
    if (statsContainer) {
      statsContainer.innerHTML = getStatsHTML(stats, 'reserve');
    }
    
    const groupedTasks = groupTasksByWorker(filteredTasks);
    const taskContent = document.getElementById('reserve-task-content');
    if (taskContent) {
      taskContent.innerHTML = getWorkerTaskListHTML(groupedTasks, 'reserve');
    }
    
    console.log('예약작업 향상된 검색 완료:', filteredTasks.length + '건');
    
  } catch (error) {
    console.error('예약작업 향상된 검색 오류:', error);
    alert('검색 중 오류가 발생했습니다.');
  }
}

// 완료 작업 로드 - 오늘 완료된 작업만 기본 표시 (Firebase 최적화)
export async function loadDoneTasks() {
  const body = document.getElementById('tab-body');
  
  // 관리자와 작업자에 따라 다른 UI 표시
  if (isCurrentUserAdmin()) {
    body.innerHTML = `
      ${getDoneTabHTML()}
      <div id="done-stats-container"></div>
      <div id="done-task-content"></div>
    `;
  } else {
    // 작업자용 검색박스 없이 목록만 표시
    const taskListElement = document.querySelector('.task-list');
    if (!taskListElement) {
      body.innerHTML = '<div class="task-list"></div>';
    }
  }

  try {
    console.log('완료 작업 로드 시작');
    trackQuery('loadDoneTasks');
    
    const todayStr = getTodayString();
    const cacheKey = `done-tasks-${todayStr}`;
    
    // 캐시 확인
    let cachedData = getCachedData(cacheKey);
    let allTodayTasks;
    
    if (cachedData) {
      console.log('캐시에서 완료 작업 로드');
      allTodayTasks = cachedData.allTodayTasks;
    } else {
      // 📊 최적화: 단일 쿼리로 오늘의 모든 작업 가져오기
      const todayQuery = query(
        collection(db, "tasks"),
        where("date", ">=", todayStr + "T00:00:00"),
        where("date", "<=", todayStr + "T23:59:59"),
        orderBy("date", "desc")
      );
      
      const querySnapshot = await getDocs(todayQuery);
      allTodayTasks = [];
      
      querySnapshot.forEach(docu => {
        const taskData = docu.data();
        allTodayTasks.push({
          id: docu.id,
          ...taskData
        });
      });
      
      // 캐시에 저장
      setCachedData(cacheKey, { allTodayTasks });
    }
    
    // 📊 클라이언트에서 완료 작업만 필터링
    const completedTasks = allTodayTasks.filter(task => task.done === true);
    
    console.log('오늘 전체 작업:', allTodayTasks.length);
    console.log('오늘 완료 작업 수:', completedTasks.length);
    
    if (isCurrentUserAdmin()) {
      // 관리자: 통계 + 작업자별 분류
      const stats = generateTaskStats(allTodayTasks, completedTasks);
      const groupedTasks = groupTasksByWorker(completedTasks);
      
      // 통계 표시
      const statsContainer = document.getElementById('done-stats-container');
      if (statsContainer) {
        statsContainer.innerHTML = getStatsHTML(stats, 'done');
      }
      
      // 작업자별 작업 목록 표시
      const taskContent = document.getElementById('done-task-content');
      if (taskContent) {
        taskContent.innerHTML = getWorkerTaskListHTML(groupedTasks, 'done');
      }
      
      // 관리자만 검색 이벤트 설정 (향상된 검색 함수 사용)
      document.getElementById('done-search-btn').onclick = searchDoneTasksEnhanced;

      // 리셋 버튼 이벤트
      window.resetDoneFilter = function() {
        const todayStr = getTodayString();
        document.getElementById('done-start-date').value = todayStr;
        document.getElementById('done-end-date').value = todayStr;
        document.getElementById('done-search-keyword').value = '';
        document.getElementById('done-sort-order').value = 'date-desc';
        
        const summaryEl = document.getElementById('done-search-summary');
        if (summaryEl) {
          summaryEl.style.display = 'none';
        }
        
        loadDoneTasks();
      };
      
    } else {
      // 작업자: 본인 작업만 필터링
      const filteredTasks = filterTasksForCurrentUser(completedTasks);
      
      let html = "";
      filteredTasks.forEach(task => {
        html += window.getTaskItemHTML(task, task.id, 'done');
      });
      
      const taskListElement = document.querySelector('.task-list');
      if (taskListElement) {
        taskListElement.innerHTML = html;
      }
      
      // 작업자의 경우 버튼 조정
      adjustWorkerDoneTaskButtons();
    }
    
    console.log('완료 작업 로드 완료');
    
  } catch (error) {
    console.error('완료 작업 로드 오류:', error);
    alert('완료 작업 목록을 불러오는 중 오류가 발생했습니다.');
  }
}

// 완료작업 향상된 검색 (검색어 + 날짜 + 정렬) (Firebase 최적화)
export async function searchDoneTasksEnhanced() {
  const startDate = document.getElementById('done-start-date').value;
  const endDate = document.getElementById('done-end-date').value;
  const keyword = document.getElementById('done-search-keyword').value.trim();
  const sortOrder = document.getElementById('done-sort-order').value;
  
  if (!startDate || !endDate) {
    alert('시작 날짜와 종료 날짜를 모두 선택해주세요.');
    return;
  }
  
  try {
    console.log('완료작업 향상된 검색:', {startDate, endDate, keyword, sortOrder});
    trackQuery('searchDoneTasksEnhanced');
    
    const cacheKey = `search-done-${startDate}-${endDate}`;
    let cachedData = getCachedData(cacheKey);
    let completedTasks, allTasks;
    
    if (cachedData) {
      ({ completedTasks, allTasks } = cachedData);
    } else {
      // 기본 쿼리 (날짜 범위)
      const completedQuery = query(
        collection(db, "tasks"),
        where("done", "==", true),
        where("date", ">=", startDate + "T00:00:00"),
        where("date", "<=", endDate + "T23:59:59"),
        orderBy("date", "desc")
      );
      
      const allQuery = query(
        collection(db, "tasks"),
        where("date", ">=", startDate + "T00:00:00"),
        where("date", "<=", endDate + "T23:59:59"),
        orderBy("date", "desc")
      );
      
      const [completedSnapshot, allSnapshot] = await Promise.all([
        getDocs(completedQuery),
        getDocs(allQuery)
      ]);
      
      completedTasks = [];
      allTasks = [];
      
      // 데이터 수집
      completedSnapshot.forEach(docu => {
        const taskData = docu.data();
        completedTasks.push({
          id: docu.id,
          ...taskData
        });
      });
      
      allSnapshot.forEach(docu => {
        const taskData = docu.data();
        allTasks.push({
          id: docu.id,
          ...taskData
        });
      });
      
      // 캐시에 저장
      setCachedData(cacheKey, { completedTasks, allTasks });
    }
    
    // 클라이언트에서 검색어 필터링 및 정렬
    let filteredCompletedTasks = completedTasks;
    let filteredAllTasks = allTasks;
    
    if (keyword) {
      filteredCompletedTasks = filterTasksByKeyword(filteredCompletedTasks, keyword);
      filteredAllTasks = filterTasksByKeyword(filteredAllTasks, keyword);
    }
    
    filteredCompletedTasks = sortTasks(filteredCompletedTasks, sortOrder);
    filteredAllTasks = sortTasks(filteredAllTasks, sortOrder);
    
    // 검색 결과 요약 표시
    const summaryEl = document.getElementById('done-search-summary');
    if (summaryEl) {
      const totalFound = filteredCompletedTasks.length;
      const searchInfo = [];
      
      if (keyword) searchInfo.push(`"${keyword}"`);
      searchInfo.push(`${startDate} ~ ${endDate}`);
      
      summaryEl.innerHTML = `
        검색결과: <strong>${totalFound}건</strong> 
        ${searchInfo.length > 0 ? `(${searchInfo.join(', ')})` : ''}
      `;
      summaryEl.style.display = 'block';
    }
    
    // 통계 및 목록 업데이트
    const stats = generateTaskStats(filteredAllTasks, filteredCompletedTasks);
    const statsContainer = document.getElementById('done-stats-container');
    if (statsContainer) {
      statsContainer.innerHTML = getStatsHTML(stats, 'done');
    }
    
    const groupedTasks = groupTasksByWorker(filteredCompletedTasks);
    const taskContent = document.getElementById('done-task-content');
    if (taskContent) {
      taskContent.innerHTML = getWorkerTaskListHTML(groupedTasks, 'done');
    }
    
    console.log('완료작업 향상된 검색 완료:', filteredCompletedTasks.length + '건');
    
  } catch (error) {
    console.error('완료작업 향상된 검색 오류:', error);
    alert('검색 중 오류가 발생했습니다.');
  }
}
window.getAgreementStatusBadge = function(status) {
  if (!status || status === 'none') {
    return '<span style="background:#f5f5f5;color:#9e9e9e;padding:3px 8px;border-radius:3px;font-size:12px;">미발송</span>';
  }
  if (status === 'pending') {
    return '<span style="background:#fff3e0;color:#f57c00;padding:3px 8px;border-radius:3px;font-size:12px;">대기</span>';
  }
  if (status === 'completed') {
    return '<span style="background:#e8f5e9;color:#388e3c;padding:3px 8px;border-radius:3px;font-size:12px;">완료</span>';
  }
  return '<span style="background:#f5f5f5;color:#9e9e9e;padding:3px 8px;border-radius:3px;font-size:12px;">미발송</span>';
};

window.getAgreementSectionHTML = function(taskId, taskData) {
  const status = taskData.agreementStatus || 'none';
  const badge = window.getAgreementStatusBadge(status);
  
  const client = (taskData.client || '').replace(/'/g, "\\'");
  const contact = (taskData.contact || '').replace(/'/g, "\\'");
  
  return '<div style="margin:10px 0;padding:10px;background:#f8f9fa;border-radius:5px;">동의상태: ' + badge + ' <button onclick="window.showAgreementActions(\'' + taskId + '\', {client:\'' + client + '\', contact:\'' + contact + '\'})" style="margin-left:10px;padding:5px 15px;background:#667eea;color:white;border:none;border-radius:5px;cursor:pointer;">동의</button></div>';
};
