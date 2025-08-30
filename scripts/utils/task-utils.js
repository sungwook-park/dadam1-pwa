// scripts/utils/task-utils.js - 작업 관련 유틸리티 함수들 (Firebase 최적화 포함)

import { formatKoreanDate } from './date-utils.js';

// 캐시 시스템
const taskCache = {
  data: new Map(),
  timestamps: new Map(),
  CACHE_DURATION: 10 * 60 * 1000 // 10분
};

// 캐시 유틸리티 함수들
export function getCachedData(key) {
  const timestamp = taskCache.timestamps.get(key);
  if (!timestamp || (Date.now() - timestamp) > taskCache.CACHE_DURATION) {
    return null;
  }
  return taskCache.data.get(key);
}

export function setCachedData(key, data) {
  taskCache.data.set(key, data);
  taskCache.timestamps.set(key, Date.now());
}

export function clearCache() {
  taskCache.data.clear();
  taskCache.timestamps.clear();
}

// 오늘 날짜 문자열 생성
export function getTodayString() {
  const today = new Date();
  return today.getFullYear() + '-' + 
    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
    String(today.getDate()).padStart(2, '0');
}

// 내일 날짜 문자열 생성
export function getTomorrowString() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.getFullYear() + '-' + 
    String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + 
    String(tomorrow.getDate()).padStart(2, '0');
}

// 현재 사용자가 관리자인지 확인
export function isCurrentUserAdmin() {
  const userInfo = window.getCurrentUserInfo();
  return window.isAdmin && window.isAdmin(userInfo);
}

// 작업 필터링 함수 (작업자별) - Firebase 읽기량 최적화
export function filterTasksForCurrentUser(tasks) {
  const userInfo = window.getCurrentUserInfo();
  
  // 관리자는 모든 작업 표시
  if (isCurrentUserAdmin()) {
    console.log('🔑 관리자 - 모든 작업 표시:', tasks.length + '개');
    return tasks;
  }
  
  // 작업자는 본인 작업만 표시
  if (!userInfo || !userInfo.name) {
    console.warn('⚠️ 사용자 정보 없음 - 빈 배열 반환');
    return [];
  }
  
  const userName = userInfo.name;
  const filteredTasks = tasks.filter(task => {
    if (!task.worker) return false;
    
    // 작업자 필드에 현재 사용자 이름이 포함되어 있는지 확인
    const isAssigned = task.worker.includes(userName);
    
    if (isAssigned) {
      console.log(`✅ ${userName} 작업 발견:`, task.items || task.client);
    }
    
    return isAssigned;
  });
  
  console.log(`👷 작업자(${userName}) - 필터링된 작업:`, filteredTasks.length + '개');
  return filteredTasks;
}

// 작업자별로 작업 그룹화 (수정됨 - 모든 작업자에게 복제)
export function groupTasksByWorker(tasks) {
  const grouped = {};
  
  tasks.forEach(task => {
    if (!task.worker || task.worker.trim() === '') {
      // ✅ 미지정 작업을 "미지정" 그룹으로 분류
      if (!grouped['미지정']) {
        grouped['미지정'] = [];
      }
      grouped['미지정'].push({
        ...task,
        isTeamLeader: true,
        isTeamWork: false,
        allWorkers: []
      });
      return;
    }
    
    // 🔥 모든 작업자에게 작업 할당 (수정된 부분)
    const workers = task.worker.split(',').map(w => w.trim());
    
    workers.forEach((worker, index) => {
      if (!worker) return;
      
      if (!grouped[worker]) {
        grouped[worker] = [];
      }
      
      // 각 작업자에게 작업 복사본 생성
      grouped[worker].push({
        ...task,
        isTeamLeader: index === 0,  // 첫 번째 작업자가 팀장
        isTeamWork: workers.length > 1,  // 2명 이상이면 팀 작업
        allWorkers: workers  // 전체 참여자 목록
      });
    });
  });
  
  return grouped;
}

// 통계 정보 생성 (수정됨 - 중복 제거 + Firebase 최적화)
export function generateTaskStats(allTasks, completedTasks, isReserveTab = false) {
  // 🔥 중복 제거: 작업 ID 기준으로 유니크하게 만들기
  const uniqueAllTasks = Array.from(
    new Map(allTasks.map(task => [task.id, task])).values()
  );
  const uniqueCompletedTasks = Array.from(
    new Map(completedTasks.map(task => [task.id, task])).values()
  );
  
  if (isReserveTab) {
    // 예약 탭: 내일 해야할 작업수만
    return {
      totalReserveTasks: uniqueAllTasks.length
    };
  }
  
  // 오늘작업/완료작업 탭 공통
  const workerStats = {};
  const groupedAll = groupTasksByWorker(uniqueAllTasks);
  const groupedCompleted = groupTasksByWorker(uniqueCompletedTasks);
  
  // 모든 작업자 목록 수집
  const allWorkers = new Set([
    ...Object.keys(groupedAll),
    ...Object.keys(groupedCompleted)
  ]);
  
  allWorkers.forEach(worker => {
    // 🔥 중복 제거된 작업 수 계산
    const workerAllTasks = groupedAll[worker] || [];
    const workerCompletedTasks = groupedCompleted[worker] || [];
    
    const uniqueWorkerAllTasks = Array.from(
      new Map(workerAllTasks.map(task => [task.id, task])).values()
    );
    const uniqueWorkerCompletedTasks = Array.from(
      new Map(workerCompletedTasks.map(task => [task.id, task])).values()
    );
    
    workerStats[worker] = {
      total: uniqueWorkerAllTasks.length,
      completed: uniqueWorkerCompletedTasks.length,
      pending: uniqueWorkerAllTasks.length - uniqueWorkerCompletedTasks.length
    };
  });
  
  return {
    totalTasks: uniqueAllTasks.length,
    completedTasks: uniqueCompletedTasks.length,
    pendingTasks: uniqueAllTasks.length - uniqueCompletedTasks.length,
    workerStats: workerStats
  };
}

// 수수료 자동 계산 함수
export function calculateFee() {
  const clientInput = document.getElementById('client-input');
  const amountInput = document.getElementById('amount-input');
  const feeInput = document.getElementById('fee-input');
  const feeInfo = document.getElementById('fee-info');
  
  if (!clientInput || !amountInput || !feeInput) return;
  
  const clientName = clientInput.value.trim();
  const amount = parseFloat(amountInput.value) || 0;
  
  if ((clientName === '공간' || clientName === '공간티비') && amount > 0) {
    const calculatedFee = Math.round(amount * 0.22);
    feeInput.value = calculatedFee;
    feeInput.style.backgroundColor = '#e8f5e8';
    feeInput.style.borderColor = '#4caf50';
    feeInput.readOnly = true;
    
    if (feeInfo) {
      feeInfo.textContent = `${clientName}은 금액의 22%로 자동 계산됩니다.`;
      feeInfo.style.display = 'block';
    }
  } else {
    feeInput.style.backgroundColor = '';
    feeInput.style.borderColor = '';
    feeInput.readOnly = false;
    
    if (feeInfo) {
      feeInfo.style.display = 'none';
    }
  }
}

// 작업자 관리 함수들
export function updateSelectedWorkers() {
  const checkboxes = document.querySelectorAll('input[name="worker"][type="checkbox"]:checked');
  const selectedWorkers = Array.from(checkboxes).map(cb => cb.value);
  const hiddenInput = document.getElementById('selected-workers');
  
  if (hiddenInput) {
    hiddenInput.value = selectedWorkers.join(', ');
  }
}

// Firebase 쿼리 최적화 함수들
export function createOptimizedQuery(collection, conditions, orderField = 'date', orderDirection = 'asc') {
  // 단일 쿼리로 최대한 많은 데이터를 가져와서 클라이언트에서 분리
  const baseQuery = query(
    collection,
    ...conditions,
    orderBy(orderField, orderDirection)
  );
  
  return baseQuery;
}

// 데이터 분리 함수 (클라이언트 사이드)
export function separateTasksByStatus(tasks) {
  const completed = tasks.filter(task => task.done === true);
  const pending = tasks.filter(task => task.done === false);
  
  return { completed, pending, all: tasks };
}

// 검색 키워드 필터링 (클라이언트 사이드)
export function filterTasksByKeyword(tasks, keyword) {
  if (!keyword || !keyword.trim()) {
    return tasks;
  }
  
  const keywordLower = keyword.toLowerCase();
  
  return tasks.filter(task => {
    const searchFields = [
      task.client || '',
      task.removeAddress || '',
      task.installAddress || '',
      task.contact || '',
      task.items || '',
      task.note || '',
      task.worker || '',
      task.taskType || ''
    ].map(field => field.toLowerCase());
    
    return searchFields.some(field => field.includes(keywordLower));
  });
}

// 정렬 함수 (클라이언트 사이드)
export function sortTasks(tasks, sortOrder) {
  return tasks.sort((a, b) => {
    switch(sortOrder) {
      case 'date-desc':
        return new Date(b.date) - new Date(a.date);
      case 'date-asc':
        return new Date(a.date) - new Date(b.date);
      case 'client-asc':
        return (a.client || '').localeCompare(b.client || '');
      case 'worker-asc':
        return (a.worker || '').localeCompare(b.worker || '');
      default:
        return new Date(a.date) - new Date(b.date);
    }
  });
}

// Firebase 읽기량 추적
let queryCount = 0;
export function trackQuery(queryName) {
  queryCount++;
  console.log(`📊 Firebase Query #${queryCount}: ${queryName}`);
  
  // 개발 모드에서만 경고
  if (queryCount > 10) {
    console.warn('⚠️ Firebase 쿼리가 많습니다:', queryCount);
  }
}

export function getQueryCount() {
  return queryCount;
}

export function resetQueryCount() {
  queryCount = 0;
}