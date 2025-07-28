// scripts/utils/validation.js - 공통 검증 함수들

/**
 * 이메일 형식 검증
 * @param {string} email - 검증할 이메일
 * @returns {boolean} 유효한 이메일인지 여부
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email?.trim());
}

/**
 * 전화번호 형식 검증 (한국 형식)
 * @param {string} phone - 검증할 전화번호
 * @returns {boolean} 유효한 전화번호인지 여부
 */
export function isValidPhone(phone) {
  const phoneRegex = /^[0-9]{2,3}-?[0-9]{3,4}-?[0-9]{4}$/;
  return phoneRegex.test(phone?.replace(/\s/g, ''));
}

/**
 * 숫자 형식 검증
 * @param {any} value - 검증할 값
 * @returns {boolean} 유효한 숫자인지 여부
 */
export function isValidNumber(value) {
  return !isNaN(value) && !isNaN(parseFloat(value)) && isFinite(value);
}

/**
 * 양의 정수 검증
 * @param {any} value - 검증할 값
 * @returns {boolean} 양의 정수인지 여부
 */
export function isPositiveInteger(value) {
  const num = parseInt(value);
  return Number.isInteger(num) && num > 0;
}

/**
 * 가격/금액 검증 (0 이상)
 * @param {any} value - 검증할 값
 * @returns {boolean} 유효한 가격인지 여부
 */
export function isValidAmount(value) {
  const num = parseFloat(value);
  return isValidNumber(num) && num >= 0;
}

/**
 * 문자열 길이 검증
 * @param {string} str - 검증할 문자열
 * @param {number} minLength - 최소 길이
 * @param {number} maxLength - 최대 길이
 * @returns {boolean} 길이가 유효한지 여부
 */
export function isValidLength(str, minLength = 0, maxLength = Infinity) {
  const length = str?.trim().length || 0;
  return length >= minLength && length <= maxLength;
}

/**
 * 필수 필드 검증
 * @param {any} value - 검증할 값
 * @returns {boolean} 필수 값이 존재하는지 여부
 */
export function isRequired(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

/**
 * 날짜 형식 검증 (YYYY-MM-DD)
 * @param {string} dateString - 검증할 날짜 문자열
 * @returns {boolean} 유효한 날짜 형식인지 여부
 */
export function isValidDate(dateString) {
  if (!dateString) return false;
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date.toISOString().split('T')[0] === dateString;
}

/**
 * 시간 형식 검증 (HH:MM)
 * @param {string} timeString - 검증할 시간 문자열
 * @returns {boolean} 유효한 시간 형식인지 여부
 */
export function isValidTime(timeString) {
  if (!timeString) return false;
  
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString);
}

/**
 * 한국어 이름 검증
 * @param {string} name - 검증할 이름
 * @returns {boolean} 유효한 한국어 이름인지 여부
 */
export function isValidKoreanName(name) {
  if (!name || typeof name !== 'string') return false;
  
  const koreanNameRegex = /^[가-힣]{2,4}$/;
  return koreanNameRegex.test(name.trim());
}

/**
 * 작업자명 검증 (한글, 영문, 숫자 허용)
 * @param {string} workerName - 검증할 작업자명
 * @returns {boolean} 유효한 작업자명인지 여부
 */
export function isValidWorkerName(workerName) {
  if (!workerName || typeof workerName !== 'string') return false;
  
  const workerNameRegex = /^[가-힣a-zA-Z0-9\s]{1,10}$/;
  return workerNameRegex.test(workerName.trim());
}

/**
 * 거래처명 검증
 * @param {string} clientName - 검증할 거래처명
 * @returns {boolean} 유효한 거래처명인지 여부
 */
export function isValidClientName(clientName) {
  if (!clientName || typeof clientName !== 'string') return false;
  
  return isValidLength(clientName.trim(), 1, 50);
}

/**
 * 주소 검증
 * @param {string} address - 검증할 주소
 * @returns {boolean} 유효한 주소인지 여부
 */
export function isValidAddress(address) {
  if (!address || typeof address !== 'string') return false;
  
  return isValidLength(address.trim(), 5, 200);
}

/**
 * 작업 종류 검증
 * @param {string} taskType - 검증할 작업 종류
 * @returns {boolean} 유효한 작업 종류인지 여부
 */
export function isValidTaskType(taskType) {
  const validTypes = ['설치', '철거', '이전', '수리', 'A/S', '점검', '기타'];
  return validTypes.includes(taskType);
}

/**
 * 수수료 계산 결과 검증
 * @param {number} amount - 작업 금액
 * @param {number} fee - 계산된 수수료
 * @param {string} client - 거래처명
 * @returns {boolean} 수수료 계산이 올바른지 여부
 */
export function isValidFeeCalculation(amount, fee, client) {
  if (!isValidAmount(amount) || !isValidAmount(fee)) return false;
  
  // 공간/공간티비의 경우 22% 계산 확인
  if (client && client.includes('공간')) {
    const expectedFee = Math.round(amount * 0.22);
    return Math.abs(fee - expectedFee) <= 1; // 반올림 오차 허용
  }
  
  // 기타 업체는 입력된 수수료 그대로 허용
  return fee <= amount; // 수수료가 작업 금액을 초과하지 않아야 함
}

/**
 * 부품 데이터 검증
 * @param {string|Array} partsData - 검증할 부품 데이터
 * @returns {boolean} 유효한 부품 데이터인지 여부
 */
export function isValidPartsData(partsData) {
  if (!partsData) return true; // 부품은 선택사항
  
  try {
    if (typeof partsData === 'string') {
      // JSON 형태인지 확인
      if (partsData.trim().startsWith('[')) {
        const parsed = JSON.parse(partsData);
        return Array.isArray(parsed) && parsed.every(part => 
          part.name && isPositiveInteger(part.quantity)
        );
      }
      
      // 텍스트 형태 검증 (예: "CT60: 2개, WB60: 1개")
      const parts = partsData.split(',');
      return parts.every(part => {
        const trimmed = part.trim();
        if (!trimmed) return true; // 빈 항목은 허용
        
        const match = trimmed.match(/^(.+?)[:：]\s*(\d+)\s*개?$/);
        return match && match[1].trim().length > 0 && parseInt(match[2]) > 0;
      });
    }
    
    if (Array.isArray(partsData)) {
      return partsData.every(part => 
        part.name && isPositiveInteger(part.quantity)
      );
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * 작업 폼 전체 검증
 * @param {Object} taskData - 검증할 작업 데이터
 * @returns {Object} 검증 결과 { isValid: boolean, errors: Array }
 */
export function validateTaskForm(taskData) {
  const errors = [];
  
  // 필수 필드 검증
  if (!isValidDate(taskData.date)) {
    errors.push('올바른 날짜를 선택해주세요.');
  }
  
  if (!isRequired(taskData.worker)) {
    errors.push('작업자를 선택해주세요.');
  }
  
  if (!isValidClientName(taskData.client)) {
    errors.push('거래처명을 올바르게 입력해주세요. (1-50자)');
  }
  
  // 선택적 필드 검증 (값이 있는 경우만)
  if (taskData.removeAddress && !isValidAddress(taskData.removeAddress)) {
    errors.push('철거 주소를 올바르게 입력해주세요. (5-200자)');
  }
  
  if (taskData.installAddress && !isValidAddress(taskData.installAddress)) {
    errors.push('설치 주소를 올바르게 입력해주세요. (5-200자)');
  }
  
  if (taskData.contact && !isValidPhone(taskData.contact)) {
    errors.push('연락처를 올바른 형식으로 입력해주세요.');
  }
  
  if (taskData.taskType && !isValidTaskType(taskData.taskType)) {
    errors.push('올바른 작업 종류를 선택해주세요.');
  }
  
  if (taskData.amount !== undefined && !isValidAmount(taskData.amount)) {
    errors.push('작업 금액을 올바르게 입력해주세요.');
  }
  
  if (taskData.fee !== undefined && !isValidAmount(taskData.fee)) {
    errors.push('수수료를 올바르게 입력해주세요.');
  }
  
  // 수수료 계산 검증
  if (taskData.amount && taskData.fee && taskData.client) {
    if (!isValidFeeCalculation(taskData.amount, taskData.fee, taskData.client)) {
      errors.push('수수료 계산이 올바르지 않습니다.');
    }
  }
  
  // 부품 데이터 검증
  if (taskData.parts && !isValidPartsData(taskData.parts)) {
    errors.push('부품 정보를 올바르게 입력해주세요.');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * 로그인 폼 검증
 * @param {Object} loginData - 검증할 로그인 데이터
 * @returns {Object} 검증 결과 { isValid: boolean, errors: Array }
 */
export function validateLoginForm(loginData) {
  const errors = [];
  
  if (!isRequired(loginData.email)) {
    errors.push('이메일을 입력해주세요.');
  } else if (!isValidEmail(loginData.email)) {
    errors.push('올바른 이메일 형식을 입력해주세요.');
  }
  
  if (!isRequired(loginData.password)) {
    errors.push('비밀번호를 입력해주세요.');
  } else if (!isValidLength(loginData.password, 6)) {
    errors.push('비밀번호는 6자 이상이어야 합니다.');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// 전역 등록 (기존 호환성)
if (typeof window !== 'undefined') {
  window.ValidationUtils = {
    isValidEmail,
    isValidPhone,
    isValidNumber,
    isPositiveInteger,
    isValidAmount,
    isValidLength,
    isRequired,
    isValidDate,
    isValidTime,
    isValidKoreanName,
    isValidWorkerName,
    isValidClientName,
    isValidAddress,
    isValidTaskType,
    isValidFeeCalculation,
    isValidPartsData,
    validateTaskForm,
    validateLoginForm
  };
}