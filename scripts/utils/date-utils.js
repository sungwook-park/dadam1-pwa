// scripts/utils/date-utils.js - 개선된 날짜 유틸리티

/**
 * 한국어 형식으로 날짜를 포맷팅
 * @param {string} dateString - ISO 날짜 문자열
 * @returns {string} - 포맷된 날짜 문자열 (MM/dd HH:mm)
 */
export function formatKoreanDate(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    
    // 유효한 날짜인지 확인
    if (isNaN(date.getTime())) {
      console.warn('유효하지 않은 날짜:', dateString);
      return '';
    }
    
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${month}/${day} ${hours}:${minutes}`;
  } catch (error) {
    console.error('날짜 포맷팅 오류:', error);
    return '';
  }
}

/**
 * 오늘 시작 시간을 반환 (00:00:00)
 * @returns {string} - ISO 형식의 날짜 문자열
 */
export function getTodayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}T00:00:00`;
}

/**
 * 내일 시작 시간을 반환 (00:00:00)
 * @returns {string} - ISO 형식의 날짜 문자열
 */
export function getTomorrowStart() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}T00:00:00`;
}

/**
 * 현재 시간을 YYYY-MM-DDTHH:MM 형식으로 반환
 * @returns {string} - 현재 시간
 */
export function getNowYYYYMMDDHHMM() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  const result = `${year}-${month}-${day}T${hours}:${minutes}`;
  console.log('🕐 현재 시간:', result);
  return result;
}

/**
 * 두 날짜가 같은 날인지 확인
 * @param {string|Date} date1 - 첫 번째 날짜
 * @param {string|Date} date2 - 두 번째 날짜
 * @returns {boolean} - 같은 날이면 true
 */
export function isSameDate(date1, date2) {
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  } catch (error) {
    console.error('날짜 비교 오류:', error);
    return false;
  }
}

/**
 * 주어진 날짜가 오늘인지 확인
 * @param {string|Date} dateString - 확인할 날짜
 * @returns {boolean} - 오늘이면 true
 */
export function isToday(dateString) {
  if (!dateString) return false;
  
  try {
    const inputDate = new Date(dateString);
    const today = new Date();
    
    return isSameDate(inputDate, today);
  } catch (error) {
    console.error('오늘 날짜 확인 오류:', error);
    return false;
  }
}

/**
 * 주어진 날짜가 미래인지 확인
 * @param {string|Date} dateString - 확인할 날짜
 * @returns {boolean} - 미래이면 true
 */
export function isFuture(dateString) {
  if (!dateString) return false;
  
  try {
    const inputDate = new Date(dateString);
    const today = new Date();
    
    // 날짜만 비교 (시간 제외)
    inputDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    return inputDate > today;
  } catch (error) {
    console.error('미래 날짜 확인 오류:', error);
    return false;
  }
}

/**
 * 주어진 날짜가 과거인지 확인
 * @param {string|Date} dateString - 확인할 날짜
 * @returns {boolean} - 과거이면 true
 */
export function isPast(dateString) {
  if (!dateString) return false;
  
  try {
    const inputDate = new Date(dateString);
    const today = new Date();
    
    // 날짜만 비교 (시간 제외)
    inputDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    return inputDate < today;
  } catch (error) {
    console.error('과거 날짜 확인 오류:', error);
    return false;
  }
}

/**
 * 작업 날짜 분류 (오늘/예약/과거)
 * @param {string} dateString - 작업 날짜
 * @returns {string} - 'today', 'future', 'past' 중 하나
 */
export function classifyTaskDate(dateString) {
  if (!dateString) return 'unknown';
  
  if (isToday(dateString)) return 'today';
  if (isFuture(dateString)) return 'future';
  if (isPast(dateString)) return 'past';
  
  return 'unknown';
}

/**
 * 상대적 날짜 표시 (예: "3일 전", "내일", "오늘")
 * @param {string|Date} dateString - 날짜
 * @returns {string} - 상대적 날짜 문자열
 */
export function getRelativeDate(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const today = new Date();
    
    // 날짜만 비교
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const diffTime = todayOnly.getTime() - dateOnly.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays === -1) return '내일';
    if (diffDays > 0) return `${diffDays}일 전`;
    if (diffDays < 0) return `${Math.abs(diffDays)}일 후`;
    
    return '';
  } catch (error) {
    console.error('상대적 날짜 계산 오류:', error);
    return '';
  }
}

/**
 * 날짜 범위 검증
 * @param {string} startDate - 시작 날짜
 * @param {string} endDate - 종료 날짜
 * @returns {boolean} - 유효한 범위이면 true
 */
export function isValidDateRange(startDate, endDate) {
  if (!startDate || !endDate) return true; // 한쪽이 비어있으면 유효
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return start <= end;
  } catch (error) {
    console.error('날짜 범위 검증 오류:', error);
    return false;
  }
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 변환
 * @param {string|Date} dateString - 변환할 날짜
 * @returns {string} - YYYY-MM-DD 형식의 날짜
 */
export function formatDateYYYYMMDD(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return '';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('날짜 YYYY-MM-DD 변환 오류:', error);
    return '';
  }
}

/**
 * 시간을 HH:MM 형식으로 변환
 * @param {string|Date} dateString - 변환할 날짜
 * @returns {string} - HH:MM 형식의 시간
 */
export function formatTimeHHMM(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return '';
    }
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${hours}:${minutes}`;
  } catch (error) {
    console.error('시간 HH:MM 변환 오류:', error);
    return '';
  }
}

/**
 * 주어진 날짜의 주차 정보 반환
 * @param {string|Date} dateString - 날짜
 * @returns {object} - { year, week, startDate, endDate }
 */
export function getWeekInfo(dateString) {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    
    // 주의 시작을 월요일로 설정
    const startOfWeek = new Date(date);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // 일요일이면 -6, 아니면 1
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    // ISO 주차 계산
    const yearStart = new Date(date.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((date - yearStart) / 86400000 + yearStart.getDay() + 1) / 7);
    
    return {
      year: date.getFullYear(),
      week: weekNumber,
      startDate: formatDateYYYYMMDD(startOfWeek),
      endDate: formatDateYYYYMMDD(endOfWeek)
    };
  } catch (error) {
    console.error('주차 정보 계산 오류:', error);
    return null;
  }
}

/**
 * 디버깅을 위한 날짜 비교 정보
 * @param {string} inputDate - 입력 날짜
 * @returns {object} - 비교 결과 객체
 */
export function debugDateComparison(inputDate) {
  const todayStart = getTodayStart();
  const tomorrowStart = getTomorrowStart();
  
  console.log('=== 날짜 비교 디버깅 ===');
  console.log('입력된 날짜:', inputDate);
  console.log('오늘 시작:', todayStart);
  console.log('내일 시작:', tomorrowStart);
  console.log('입력날짜 >= 오늘:', inputDate >= todayStart);
  console.log('입력날짜 < 내일:', inputDate < tomorrowStart);
  console.log('오늘 작업 조건:', inputDate >= todayStart && inputDate < tomorrowStart);
  console.log('예약 작업 조건:', inputDate >= tomorrowStart);
  
  return {
    isToday: inputDate >= todayStart && inputDate < tomorrowStart,
    isFuture: inputDate >= tomorrowStart,
    isPast: inputDate < todayStart,
    classification: classifyTaskDate(inputDate),
    relative: getRelativeDate(inputDate)
  };
}

/**
 * 월의 첫 날과 마지막 날 반환
 * @param {number} year - 연도
 * @param {number} month - 월 (1-12)
 * @returns {object} - { firstDay, lastDay }
 */
export function getMonthRange(year, month) {
  try {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    
    return {
      firstDay: formatDateYYYYMMDD(firstDay),
      lastDay: formatDateYYYYMMDD(lastDay)
    };
  } catch (error) {
    console.error('월 범위 계산 오류:', error);
    return null;
  }
}

/**
 * 현재 한국 시간 반환
 * @returns {Date} - 한국 시간대 Date 객체
 */
export function getKoreanTime() {
  const now = new Date();
  // UTC+9 (한국 시간대)
  const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  return koreanTime;
}

// 전역에서 사용할 수 있도록 window 객체에 등록
if (typeof window !== 'undefined') {
  window.dateUtils = {
    formatKoreanDate,
    getTodayStart,
    getTomorrowStart,
    getNowYYYYMMDDHHMM,
    isSameDate,
    isToday,
    isFuture,
    isPast,
    classifyTaskDate,
    getRelativeDate,
    isValidDateRange,
    formatDateYYYYMMDD,
    formatTimeHHMM,
    getWeekInfo,
    debugDateComparison,
    getMonthRange,
    getKoreanTime
  };
}