// scripts/utils/api-helpers.js - Firebase API 관련 헬퍼 함수들

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  orderBy, 
  limit,
  Timestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * 안전한 Firestore 문서 생성
 * @param {Object} db - Firestore 인스턴스
 * @param {string} collectionName - 컬렉션 이름
 * @param {Object} data - 저장할 데이터
 * @returns {Promise<string>} 생성된 문서 ID
 */
export async function safeAddDoc(db, collectionName, data) {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    console.log(`✅ 문서 생성 성공: ${collectionName}/${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error(`❌ 문서 생성 실패: ${collectionName}`, error);
    throw new Error(`데이터 저장 중 오류가 발생했습니다: ${error.message}`);
  }
}

/**
 * 안전한 Firestore 문서 업데이트
 * @param {Object} db - Firestore 인스턴스
 * @param {string} collectionName - 컬렉션 이름
 * @param {string} docId - 문서 ID
 * @param {Object} data - 업데이트할 데이터
 * @returns {Promise<void>}
 */
export async function safeUpdateDoc(db, collectionName, docId, data) {
  try {
    await updateDoc(doc(db, collectionName, docId), {
      ...data,
      updatedAt: Timestamp.now()
    });
    
    console.log(`✅ 문서 업데이트 성공: ${collectionName}/${docId}`);
  } catch (error) {
    console.error(`❌ 문서 업데이트 실패: ${collectionName}/${docId}`, error);
    throw new Error(`데이터 수정 중 오류가 발생했습니다: ${error.message}`);
  }
}

/**
 * 안전한 Firestore 문서 삭제
 * @param {Object} db - Firestore 인스턴스
 * @param {string} collectionName - 컬렉션 이름
 * @param {string} docId - 문서 ID
 * @returns {Promise<void>}
 */
export async function safeDeleteDoc(db, collectionName, docId) {
  try {
    await deleteDoc(doc(db, collectionName, docId));
    console.log(`✅ 문서 삭제 성공: ${collectionName}/${docId}`);
  } catch (error) {
    console.error(`❌ 문서 삭제 실패: ${collectionName}/${docId}`, error);
    throw new Error(`데이터 삭제 중 오류가 발생했습니다: ${error.message}`);
  }
}

/**
 * 안전한 Firestore 문서 조회
 * @param {Object} db - Firestore 인스턴스
 * @param {string} collectionName - 컬렉션 이름
 * @param {string} docId - 문서 ID
 * @returns {Promise<Object|null>} 문서 데이터 또는 null
 */
export async function safeGetDoc(db, collectionName, docId) {
  try {
    const docSnap = await getDoc(doc(db, collectionName, docId));
    
    if (docSnap.exists()) {
      console.log(`✅ 문서 조회 성공: ${collectionName}/${docId}`);
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.warn(`⚠️ 문서 없음: ${collectionName}/${docId}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ 문서 조회 실패: ${collectionName}/${docId}`, error);
    throw new Error(`데이터 조회 중 오류가 발생했습니다: ${error.message}`);
  }
}

/**
 * 조건부 문서 조회 (여러 문서)
 * @param {Object} db - Firestore 인스턴스
 * @param {string} collectionName - 컬렉션 이름
 * @param {Array} conditions - 조건 배열 [{ field, operator, value }]
 * @param {string} orderByField - 정렬 필드
 * @param {string} orderDirection - 정렬 방향 ('asc' | 'desc')
 * @param {number} limitCount - 제한 개수
 * @returns {Promise<Array>} 문서 배열
 */
export async function safeQueryDocs(db, collectionName, conditions = [], orderByField = null, orderDirection = 'asc', limitCount = null) {
  try {
    let q = collection(db, collectionName);
    
    // 조건 추가
    conditions.forEach(condition => {
      q = query(q, where(condition.field, condition.operator, condition.value));
    });
    
    // 정렬 추가
    if (orderByField) {
      q = query(q, orderBy(orderByField, orderDirection));
    }
    
    // 제한 추가
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    
    const querySnapshot = await getDocs(q);
    const docs = [];
    
    querySnapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`✅ 쿼리 성공: ${collectionName} (${docs.length}개 문서)`);
    return docs;
  } catch (error) {
    console.error(`❌ 쿼리 실패: ${collectionName}`, error);
    throw new Error(`데이터 조회 중 오류가 발생했습니다: ${error.message}`);
  }
}

/**
 * 날짜 범위로 문서 조회
 * @param {Object} db - Firestore 인스턴스
 * @param {string} collectionName - 컬렉션 이름
 * @param {string} dateField - 날짜 필드명
 * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
 * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
 * @param {Array} additionalConditions - 추가 조건들
 * @returns {Promise<Array>} 문서 배열
 */
export async function queryDocsByDateRange(db, collectionName, dateField, startDate, endDate, additionalConditions = []) {
  try {
    const conditions = [
      { field: dateField, operator: '>=', value: startDate + 'T00:00:00' },
      { field: dateField, operator: '<=', value: endDate + 'T23:59:59' },
      ...additionalConditions
    ];
    
    return await safeQueryDocs(db, collectionName, conditions, dateField, 'desc');
  } catch (error) {
    console.error(`❌ 날짜 범위 쿼리 실패: ${collectionName}`, error);
    throw error;
  }
}

/**
 * 오늘 날짜 문서 조회
 * @param {Object} db - Firestore 인스턴스
 * @param {string} collectionName - 컬렉션 이름
 * @param {string} dateField - 날짜 필드명
 * @param {Array} additionalConditions - 추가 조건들
 * @returns {Promise<Array>} 문서 배열
 */
export async function queryTodayDocs(db, collectionName, dateField, additionalConditions = []) {
  const today = new Date().toISOString().split('T')[0];
  return await queryDocsByDateRange(db, collectionName, dateField, today, today, additionalConditions);
}

/**
 * 사용자별 문서 조회
 * @param {Object} db - Firestore 인스턴스
 * @param {string} collectionName - 컬렉션 이름
 * @param {string} userField - 사용자 필드명 ('createdBy', 'worker' 등)
 * @param {string} userValue - 사용자 값 (이메일, 이름 등)
 * @param {Array} additionalConditions - 추가 조건들
 * @returns {Promise<Array>} 문서 배열
 */
export async function queryUserDocs(db, collectionName, userField, userValue, additionalConditions = []) {
  try {
    const conditions = [
      { field: userField, operator: '==', value: userValue },
      ...additionalConditions
    ];
    
    return await safeQueryDocs(db, collectionName, conditions, 'createdAt', 'desc');
  } catch (error) {
    console.error(`❌ 사용자별 쿼리 실패: ${collectionName}`, error);
    throw error;
  }
}

/**
 * 배치 작업 실행 (여러 문서 동시 처리)
 * @param {Object} db - Firestore 인스턴스
 * @param {Array} operations - 작업 배열 [{ type: 'add'|'update'|'delete', collection, docId?, data? }]
 * @returns {Promise<Array>} 결과 배열
 */
export async function executeBatchOperations(db, operations) {
  const results = [];
  
  try {
    console.log(`🔄 배치 작업 시작: ${operations.length}개 작업`);
    
    for (const operation of operations) {
      let result = null;
      
      switch (operation.type) {
        case 'add':
          result = await safeAddDoc(db, operation.collection, operation.data);
          break;
        case 'update':
          await safeUpdateDoc(db, operation.collection, operation.docId, operation.data);
          result = operation.docId;
          break;
        case 'delete':
          await safeDeleteDoc(db, operation.collection, operation.docId);
          result = operation.docId;
          break;
        default:
          throw new Error(`알 수 없는 작업 타입: ${operation.type}`);
      }
      
      results.push({ success: true, result, operation });
    }
    
    console.log(`✅ 배치 작업 완료: ${results.length}개 성공`);
    return results;
  } catch (error) {
    console.error('❌ 배치 작업 실패:', error);
    throw new Error(`배치 작업 중 오류가 발생했습니다: ${error.message}`);
  }
}

/**
 * 문서 존재 여부 확인
 * @param {Object} db - Firestore 인스턴스
 * @param {string} collectionName - 컬렉션 이름
 * @param {string} docId - 문서 ID
 * @returns {Promise<boolean>} 존재 여부
 */
export async function docExists(db, collectionName, docId) {
  try {
    const docSnap = await getDoc(doc(db, collectionName, docId));
    return docSnap.exists();
  } catch (error) {
    console.error(`❌ 문서 존재 확인 실패: ${collectionName}/${docId}`, error);
    return false;
  }
}

/**
 * 컬렉션의 전체 문서 수 조회
 * @param {Object} db - Firestore 인스턴스
 * @param {string} collectionName - 컬렉션 이름
 * @param {Array} conditions - 조건 배열
 * @returns {Promise<number>} 문서 수
 */
export async function getDocumentCount(db, collectionName, conditions = []) {
  try {
    const docs = await safeQueryDocs(db, collectionName, conditions);
    return docs.length;
  } catch (error) {
    console.error(`❌ 문서 수 조회 실패: ${collectionName}`, error);
    return 0;
  }
}

/**
 * 중복 문서 확인 (특정 필드 값으로)
 * @param {Object} db - Firestore 인스턴스
 * @param {string} collectionName - 컬렉션 이름
 * @param {string} field - 확인할 필드명
 * @param {any} value - 확인할 값
 * @param {string} excludeDocId - 제외할 문서 ID (수정 시 자신 제외)
 * @returns {Promise<boolean>} 중복 여부
 */
export async function checkDuplicate(db, collectionName, field, value, excludeDocId = null) {
  try {
    const conditions = [{ field, operator: '==', value }];
    const docs = await safeQueryDocs(db, collectionName, conditions);
    
    if (excludeDocId) {
      return docs.some(doc => doc.id !== excludeDocId);
    }
    
    return docs.length > 0;
  } catch (error) {
    console.error(`❌ 중복 확인 실패: ${collectionName}`, error);
    return false;
  }
}

/**
 * 최근 문서 조회
 * @param {Object} db - Firestore 인스턴스
 * @param {string} collectionName - 컬렉션 이름
 * @param {number} count - 조회할 개수
 * @param {Array} conditions - 추가 조건들
 * @returns {Promise<Array>} 최근 문서 배열
 */
export async function getRecentDocs(db, collectionName, count = 10, conditions = []) {
  try {
    return await safeQueryDocs(db, collectionName, conditions, 'createdAt', 'desc', count);
  } catch (error) {
    console.error(`❌ 최근 문서 조회 실패: ${collectionName}`, error);
    return [];
  }
}

/**
 * 문서 검색 (텍스트 필드 포함 검색)
 * @param {Object} db - Firestore 인스턴스
 * @param {string} collectionName - 컬렉션 이름
 * @param {string} searchField - 검색할 필드명
 * @param {string} searchTerm - 검색어
 * @param {Array} additionalConditions - 추가 조건들
 * @returns {Promise<Array>} 검색 결과 배열
 */
export async function searchDocs(db, collectionName, searchField, searchTerm, additionalConditions = []) {
  try {
    // Firestore는 부분 문자열 검색을 직접 지원하지 않으므로,
    // 전체 문서를 가져와서 클라이언트에서 필터링
    const docs = await safeQueryDocs(db, collectionName, additionalConditions);
    
    const filteredDocs = docs.filter(doc => {
      const fieldValue = doc[searchField];
      if (!fieldValue) return false;
      
      return String(fieldValue).toLowerCase().includes(searchTerm.toLowerCase());
    });
    
    console.log(`🔍 검색 완료: ${collectionName}/${searchField} "${searchTerm}" (${filteredDocs.length}개 결과)`);
    return filteredDocs;
  } catch (error) {
    console.error(`❌ 검색 실패: ${collectionName}`, error);
    return [];
  }
}

/**
 * 통계 정보 조회
 * @param {Object} db - Firestore 인스턴스
 * @param {string} collectionName - 컬렉션 이름
 * @param {Array} conditions - 조건들
 * @param {string} groupByField - 그룹화 필드 (선택사항)
 * @returns {Promise<Object>} 통계 정보
 */
export async function getStatistics(db, collectionName, conditions = [], groupByField = null) {
  try {
    const docs = await safeQueryDocs(db, collectionName, conditions);
    
    const stats = {
      total: docs.length,
      createdToday: 0,
      createdThisWeek: 0,
      createdThisMonth: 0,
      groupedData: {}
    };
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    docs.forEach(doc => {
      const createdAt = doc.createdAt?.toDate() || new Date(doc.date || 0);
      
      // 날짜별 통계
      if (createdAt >= today) stats.createdToday++;
      if (createdAt >= weekStart) stats.createdThisWeek++;
      if (createdAt >= monthStart) stats.createdThisMonth++;
      
      // 그룹별 통계
      if (groupByField && doc[groupByField]) {
        const groupValue = doc[groupByField];
        if (!stats.groupedData[groupValue]) {
          stats.groupedData[groupValue] = 0;
        }
        stats.groupedData[groupValue]++;
      }
    });
    
    console.log(`📊 통계 조회 완료: ${collectionName}`, stats);
    return stats;
  } catch (error) {
    console.error(`❌ 통계 조회 실패: ${collectionName}`, error);
    return {
      total: 0,
      createdToday: 0,
      createdThisWeek: 0,
      createdThisMonth: 0,
      groupedData: {}
    };
  }
}

/**
 * 데이터 백업 (특정 컬렉션의 모든 문서)
 * @param {Object} db - Firestore 인스턴스
 * @param {string} collectionName - 컬렉션 이름
 * @param {Array} conditions - 조건들 (선택사항)
 * @returns {Promise<Array>} 백업된 문서 배열
 */
export async function backupCollection(db, collectionName, conditions = []) {
  try {
    console.log(`💾 백업 시작: ${collectionName}`);
    
    const docs = await safeQueryDocs(db, collectionName, conditions);
    
    // Timestamp 객체를 ISO 문자열로 변환 (JSON 직렬화 가능하게)
    const backupData = docs.map(doc => ({
      ...doc,
      createdAt: doc.createdAt?.toDate()?.toISOString() || null,
      updatedAt: doc.updatedAt?.toDate()?.toISOString() || null,
      completedAt: doc.completedAt?.toDate()?.toISOString() || null,
      backupDate: new Date().toISOString()
    }));
    
    console.log(`✅ 백업 완료: ${collectionName} (${backupData.length}개 문서)`);
    return backupData;
  } catch (error) {
    console.error(`❌ 백업 실패: ${collectionName}`, error);
    throw error;
  }
}

/**
 * 오류 재시도 래퍼
 * @param {Function} operation - 실행할 함수
 * @param {number} maxRetries - 최대 재시도 횟수
 * @param {number} delay - 재시도 간격 (ms)
 * @returns {Promise<any>} 작업 결과
 */
export async function retryOperation(operation, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (i === maxRetries) {
        console.error(`❌ 최대 재시도 횟수 초과 (${maxRetries}회)`, error);
        break;
      }
      
      console.warn(`⚠️ 작업 실패, ${delay}ms 후 재시도 (${i + 1}/${maxRetries}):`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * 연결 상태 확인
 * @param {Object} db - Firestore 인스턴스
 * @returns {Promise<boolean>} 연결 상태
 */
export async function checkConnection(db) {
  try {
    // 테스트용 컬렉션에서 빈 쿼리 실행
    await getDocs(query(collection(db, '_connection_test'), limit(1)));
    return true;
  } catch (error) {
    console.warn('⚠️ Firestore 연결 상태 확인 실패:', error);
    return false;
  }
}

/**
 * 현재 사용자 정보 조회 (캐시 포함)
 * @param {Object} auth - Firebase Auth 인스턴스
 * @param {Object} db - Firestore 인스턴스
 * @returns {Promise<Object|null>} 사용자 정보
 */
export async function getCurrentUserInfo(auth, db) {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    
    // 캐시된 정보 확인
    if (window.currentUserInfo && window.currentUserInfo.email === currentUser.email) {
      return window.currentUserInfo;
    }
    
    // DB에서 사용자 정보 조회
    const userDocs = await safeQueryDocs(db, 'users', [
      { field: 'email', operator: '==', value: currentUser.email }
    ]);
    
    if (userDocs.length > 0) {
      const userInfo = userDocs[0];
      window.currentUserInfo = userInfo; // 캐시 저장
      return userInfo;
    }
    
    return null;
  } catch (error) {
    console.error('❌ 사용자 정보 조회 실패:', error);
    return null;
  }
}

/**
 * 데이터 정합성 검사
 * @param {Object} db - Firestore 인스턴스
 * @param {string} collectionName - 컬렉션 이름
 * @param {Function} validator - 검증 함수
 * @returns {Promise<Object>} 검사 결과
 */
export async function validateDataIntegrity(db, collectionName, validator) {
  try {
    console.log(`🔍 데이터 정합성 검사 시작: ${collectionName}`);
    
    const docs = await safeQueryDocs(db, collectionName);
    const validDocs = [];
    const invalidDocs = [];
    
    docs.forEach(doc => {
      if (validator(doc)) {
        validDocs.push(doc);
      } else {
        invalidDocs.push(doc);
      }
    });
    
    const result = {
      total: docs.length,
      valid: validDocs.length,
      invalid: invalidDocs.length,
      invalidDocs: invalidDocs.map(doc => ({ id: doc.id, data: doc }))
    };
    
    console.log(`✅ 정합성 검사 완료: ${collectionName}`, result);
    return result;
  } catch (error) {
    console.error(`❌ 정합성 검사 실패: ${collectionName}`, error);
    throw error;
  }
}

// 전역 등록 (기존 호환성)
if (typeof window !== 'undefined') {
  window.ApiHelpers = {
    safeAddDoc,
    safeUpdateDoc,
    safeDeleteDoc,
    safeGetDoc,
    safeQueryDocs,
    queryDocsByDateRange,
    queryTodayDocs,
    queryUserDocs,
    executeBatchOperations,
    docExists,
    getDocumentCount,
    checkDuplicate,
    getRecentDocs,
    searchDocs,
    getStatistics,
    backupCollection,
    retryOperation,
    checkConnection,
    getCurrentUserInfo,
    validateDataIntegrity
  };
}