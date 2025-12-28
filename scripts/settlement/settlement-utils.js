// scripts/settlement/settlement-utils.js
// 정산 유틸리티 함수들

import { PARTS_LIST } from '../parts-list.js';

/**
 * 오늘 날짜 문자열 반환 (YYYY-MM-DD)
 */
export function getTodayString() {
  const today = new Date();
  return today.getFullYear() + '-' + 
    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
    String(today.getDate()).padStart(2, '0');
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD HH:mm)
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch (error) {
    return '';
  }
}

/**
 * 금액 포맷팅 (쉼표 추가)
 */
export function formatCurrency(amount) {
  if (typeof amount !== 'number') {
    amount = Number(amount) || 0;
  }
  return amount.toLocaleString() + '원';
}

/**
 * 작업자 이름 파싱
 */
export function parseWorkers(workerString) {
  if (!workerString) return [];
  return workerString.split(',').map(w => w.trim()).filter(w => w);
}

/**
 * 날짜별 그룹핑
 */
export function groupByDate(tasks) {
  const grouped = {};
  
  tasks.forEach(task => {
    if (!task.date) return;
    
    const dateKey = task.date.split('T')[0];
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(task);
  });
  
  return grouped;
}

/**
 * 날짜 범위 필터링
 */
export function filterByDateRange(tasks, startDate, endDate) {
  if (!startDate || !endDate) return tasks;
  
  return tasks.filter(task => {
    if (!task.date) return false;
    const taskDate = task.date.split('T')[0];
    return taskDate >= startDate && taskDate <= endDate;
  });
}

/**
 * 이번 달 첫날/마지막날 구하기
 */
export function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);
  
  const startStr = startOfMonth.getFullYear() + '-' + 
    String(startOfMonth.getMonth() + 1).padStart(2, '0') + '-' + 
    String(startOfMonth.getDate()).padStart(2, '0');
    
  const endStr = endOfMonth.getFullYear() + '-' + 
    String(endOfMonth.getMonth() + 1).padStart(2, '0') + '-' + 
    String(endOfMonth.getDate()).padStart(2, '0');
  
  return { startStr, endStr };
}

/**
 * 부품 단가 맵 생성
 */
export function createPriceMap() {
  const priceMap = {};
  
  if (PARTS_LIST && Array.isArray(PARTS_LIST)) {
    PARTS_LIST.forEach(item => {
      if (item.name && item.price !== undefined) {
        priceMap[item.name] = item.price;
      }
    });
  }
  
  return priceMap;
}

/**
 * 퍼센트 계산
 */
export function calculatePercentage(value, total) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * 작업자 타입 확인
 */
export function getWorkerTypes(workerNames, allUsers) {
  return workerNames.map(name => {
    const user = allUsers.find(u => u.name === name);
    return {
      name,
      type: user ? user.type : 'unknown',
      user
    };
  });
}

/**
 * 날짜 유효성 검사
 */
export function isValidDate(dateString) {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * 배열 정렬 (날짜 기준)
 */
export function sortByDate(items, dateField = 'date', ascending = false) {
  return items.sort((a, b) => {
    const dateA = new Date(a[dateField] || 0);
    const dateB = new Date(b[dateField] || 0);
    return ascending ? dateA - dateB : dateB - dateA;
  });
}

/**
 * 숫자를 안전하게 파싱
 */
export function safeNumber(value, defaultValue = 0) {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * 통계 요약 생성
 */
export function createStatsSummary(tasks, revenue, profit, companyFund) {
  return {
    taskCount: tasks.length,
    totalRevenue: revenue,
    totalProfit: profit,
    companyFund: companyFund,
    averageRevenue: tasks.length > 0 ? Math.round(revenue / tasks.length) : 0,
    profitRate: revenue > 0 ? calculatePercentage(profit, revenue) : 0
  };
}

/**
 * 직원 이름 리스트를 문자열로
 */
export function joinWorkerNames(workers) {
  if (!workers || workers.length === 0) return '작업자 없음';
  return workers.join(', ');
}

/**
 * 거래처명 정리
 */
export function normalizeClientName(clientName) {
  if (!clientName) return '미분류';
  return clientName.trim();
}
