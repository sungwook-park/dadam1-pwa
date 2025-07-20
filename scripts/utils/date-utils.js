// utils/date-utils.js

export function formatKoreanDate(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${month}/${day} ${hours}:${minutes}`;
}

export function getTodayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // 로컬 시간으로 반환 (UTC 변환 없이)
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T00:00:00`;
}

export function getTomorrowStart() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  // 로컬 시간으로 반환 (UTC 변환 없이)
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T00:00:00`;
}

export function getNowYYYYMMDDHHMM() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  const result = `${year}-${month}-${day}T${hours}:${minutes}`;
  console.log('🕐 getNowYYYYMMDDHHMM() 반환값:', result);
  return result;
}

// 디버깅을 위한 함수 추가
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
    isFuture: inputDate >= tomorrowStart
  };
}