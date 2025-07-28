// scripts/utils/formatting.js - 공통 포맷팅 함수들

/**
 * 숫자를 한국어 통화 형식으로 포맷팅
 * @param {number} amount - 포맷팅할 금액
 * @param {boolean} showUnit - '원' 단위 표시 여부
 * @returns {string} 포맷팅된 금액 문자열
 */
export function formatCurrency(amount, showUnit = true) {
  if (!amount || amount === 0) return showUnit ? '0원' : '0';
  
  const num = parseFloat(amount);
  if (isNaN(num)) return showUnit ? '0원' : '0';
  
  // 만원 단위로 변환
  if (num >= 10000) {
    const manWon = Math.floor(num / 10000);
    const remainder = num % 10000;
    
    if (remainder === 0) {
      return showUnit ? `${manWon}만원` : `${manWon}만`;
    } else {
      return showUnit ? `${manWon}만 ${remainder.toLocaleString()}원` : `${manWon}만 ${remainder.toLocaleString()}`;
    }
  }
  
  return showUnit ? `${num.toLocaleString()}원` : num.toLocaleString();
}

/**
 * 숫자를 천 단위 콤마로 포맷팅
 * @param {number} number - 포맷팅할 숫자
 * @returns {string} 포맷팅된 숫자 문자열
 */
export function formatNumber(number) {
  if (number === null || number === undefined) return '0';
  
  const num = parseFloat(number);
  if (isNaN(num)) return '0';
  
  return num.toLocaleString();
}

/**
 * 전화번호를 하이픈 포맷으로 변환
 * @param {string} phone - 포맷팅할 전화번호
 * @returns {string} 포맷팅된 전화번호
 */
export function formatPhone(phone) {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  
  // 휴대폰 번호 (010-1234-5678)
  if (cleaned.length === 11 && cleaned.startsWith('010')) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }
  
  // 일반 전화번호 (02-123-4567, 031-123-4567)
  if (cleaned.length >= 9 && cleaned.length <= 11) {
    if (cleaned.startsWith('02')) {
      return cleaned.length === 9 
        ? `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5)}`
        : `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    } else {
      return cleaned.length === 10
        ? `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
        : `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
    }
  }
  
  return phone; // 형식에 맞지 않으면 원본 반환
}

/**
 * 날짜를 한국어 형식으로 포맷팅
 * @param {string|Date} date - 포맷팅할 날짜
 * @param {boolean} includeTime - 시간 포함 여부
 * @returns {string} 포맷팅된 날짜 문자열
 */
export function formatKoreanDate(date, includeTime = false) {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    let formatted = `${year}-${month}-${day}`;
    
    if (includeTime) {
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      formatted += ` ${hours}:${minutes}`;
    }
    
    return formatted;
  } catch (error) {
    return '';
  }
}

/**
 * 시간만 추출해서 포맷팅 (HH:MM)
 * @param {string|Date} datetime - 시간을 추출할 날짜시간
 * @returns {string} 포맷팅된 시간 문자열
 */
export function formatTime(datetime) {
  if (!datetime) return '';
  
  try {
    const dateObj = typeof datetime === 'string' ? new Date(datetime) : datetime;
    if (isNaN(dateObj.getTime())) return '';
    
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    
    return `${hours}:${minutes}`;
  } catch (error) {
    return '';
  }
}

/**
 * 상대적 시간 표시 (예: "2시간 전", "방금 전")
 * @param {string|Date} date - 비교할 날짜
 * @returns {string} 상대적 시간 문자열
 */
export function formatRelativeTime(date) {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    
    const now = new Date();
    const diffMs = now - dateObj;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    
    return formatKoreanDate(dateObj);
  } catch (error) {
    return '';
  }
}

/**
 * 작업자 목록을 보기 좋게 포맷팅
 * @param {string} workers - 쉼표로 구분된 작업자 목록
 * @returns {string} 포맷팅된 작업자 문자열
 */
export function formatWorkers(workers) {
  if (!workers) return '';
  
  const workerList = workers.split(',').map(w => w.trim()).filter(w => w);
  
  if (workerList.length === 0) return '';
  if (workerList.length === 1) return workerList[0];
  if (workerList.length === 2) return `${workerList[0]}, ${workerList[1]}`;
  
  return `${workerList[0]} 외 ${workerList.length - 1}명`;
}

/**
 * 주소를 축약해서 표시
 * @param {string} address - 축약할 주소
 * @param {number} maxLength - 최대 길이
 * @returns {string} 축약된 주소
 */
export function formatAddress(address, maxLength = 30) {
  if (!address) return '';
  
  if (address.length <= maxLength) return address;
  
  return address.substring(0, maxLength - 3) + '...';
}

/**
 * 부품 정보를 읽기 쉽게 포맷팅
 * @param {string|Array} partsData - 포맷팅할 부품 데이터
 * @returns {string} 포맷팅된 부품 문자열
 */
export function formatParts(partsData) {
  if (!partsData) return '없음';
  
  try {
    if (typeof partsData === 'string') {
      // JSON 형태 파싱 시도
      try {
        const parsed = JSON.parse(partsData);
        if (Array.isArray(parsed)) {
          return parsed.map(part => `${part.name}(${part.quantity}개)`).join(', ');
        }
      } catch (e) {
        // JSON이 아닌 경우 그대로 반환
        return partsData;
      }
      
      return partsData;
    }
    
    if (Array.isArray(partsData)) {
      return partsData.map(part => `${part.name}(${part.quantity}개)`).join(', ');
    }
    
    return String(partsData);
  } catch (error) {
    return '형식 오류';
  }
}

/**
 * 작업 상태를 한국어로 포맷팅
 * @param {boolean} isDone - 완료 여부
 * @param {string} date - 작업 날짜
 * @returns {string} 상태 문자열
 */
export function formatTaskStatus(isDone, date) {
  if (isDone) return '✅ 완료';
  
  if (!date) return '⏳ 대기';
  
  const taskDate = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  const taskDateStr = taskDate.toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  if (taskDateStr === todayStr) return '🔥 오늘';
  if (taskDateStr === tomorrowStr) return '📅 내일';
  if (taskDate < today) return '⚠️ 지연';
  
  return '📋 예정';
}

/**
 * 파일 크기를 읽기 쉽게 포맷팅
 * @param {number} bytes - 바이트 크기
 * @returns {string} 포맷팅된 파일 크기
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * 퍼센트 값을 포맷팅
 * @param {number} value - 퍼센트 값 (0-1 또는 0-100)
 * @param {boolean} isDecimal - 입력값이 소수점 형태인지 (0.22 vs 22)
 * @returns {string} 포맷팅된 퍼센트 문자열
 */
export function formatPercent(value, isDecimal = true) {
  if (value === null || value === undefined) return '0%';
  
  const num = parseFloat(value);
  if (isNaN(num)) return '0%';
  
  const percent = isDecimal ? num * 100 : num;
  return `${percent.toFixed(1)}%`;
}

/**
 * 에러 메시지를 사용자 친화적으로 포맷팅
 * @param {Error|string} error - 에러 객체 또는 메시지
 * @returns {string} 포맷팅된 에러 메시지
 */
export function formatErrorMessage(error) {
  if (!error) return '알 수 없는 오류가 발생했습니다.';
  
  if (typeof error === 'string') return error;
  
  if (error.message) {
    // Firebase 에러 코드 한국어 변환
    const errorCode = error.code;
    const errorMessages = {
      'auth/user-not-found': '등록되지 않은 이메일입니다.',
      'auth/wrong-password': '비밀번호가 틀렸습니다.',
      'auth/invalid-email': '이메일 형식이 올바르지 않습니다.',
      'auth/network-request-failed': '네트워크 연결을 확인해주세요.',
      'auth/too-many-requests': '너무 많은 로그인 시도입니다. 잠시 후 다시 시도해주세요.',
      'auth/user-disabled': '비활성화된 계정입니다.',
      'auth/invalid-credential': '인증 정보가 올바르지 않습니다.',
      'permission-denied': '권한이 없습니다.',
      'not-found': '요청한 데이터를 찾을 수 없습니다.',
      'already-exists': '이미 존재하는 데이터입니다.',
      'failed-precondition': '작업 조건이 충족되지 않습니다.',
      'out-of-range': '유효한 범위를 벗어났습니다.',
      'invalid-argument': '잘못된 입력값입니다.',
      'deadline-exceeded': '요청 시간이 초과되었습니다.',
      'unavailable': '서비스를 일시적으로 사용할 수 없습니다.'
    };
    
    return errorMessages[errorCode] || error.message;
  }
  
  return '오류가 발생했습니다.';
}

/**
 * 검색어를 하이라이트 처리
 * @param {string} text - 원본 텍스트
 * @param {string} searchTerm - 검색어
 * @returns {string} 하이라이트 처리된 HTML 문자열
 */
export function highlightSearchTerm(text, searchTerm) {
  if (!text || !searchTerm) return text;
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * 줄바꿈을 HTML로 변환
 * @param {string} text - 변환할 텍스트
 * @returns {string} HTML 변환된 텍스트
 */
export function formatTextToHtml(text) {
  if (!text) return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

/**
 * 요일을 한국어로 변환
 * @param {string|Date} date - 날짜
 * @returns {string} 한국어 요일
 */
export function formatDayOfWeek(date) {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${days[dateObj.getDay()]}요일`;
  } catch (error) {
    return '';
  }
}

// 전역 등록 (기존 호환성)
if (typeof window !== 'undefined') {
  window.FormatUtils = {
    formatCurrency,
    formatNumber,
    formatPhone,
    formatKoreanDate,
    formatTime,
    formatRelativeTime,
    formatWorkers,
    formatAddress,
    formatParts,
    formatTaskStatus,
    formatFileSize,
    formatPercent,
    formatErrorMessage,
    highlightSearchTerm,
    formatTextToHtml,
    formatDayOfWeek
  };
}