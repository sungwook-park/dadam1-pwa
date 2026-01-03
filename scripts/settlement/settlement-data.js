// scripts/settlement/settlement-data.js
// Firebase 데이터 로드 모듈 (읽기량 최적화!)

// 🔥 메모리 캐시 (30분 유효)
const settlementCache = {
  data: null,
  timestamp: null,
  TTL: 30 * 60 * 1000  // 30분
};

/**
 * 캐시 유효성 확인
 */
function isCacheValid() {
  if (!settlementCache.data || !settlementCache.timestamp) {
    return false;
  }
  
  const now = Date.now();
  const isValid = (now - settlementCache.timestamp) < settlementCache.TTL;
  
  if (isValid) {
    console.log('✅ 정산 데이터 캐시 사용 (Firebase 읽기 0회)');
    const remaining = Math.floor((settlementCache.TTL - (now - settlementCache.timestamp)) / 1000 / 60);
    console.log(`   캐시 유효 시간: ${remaining}분 남음`);
  } else {
    console.log('⏰ 정산 데이터 캐시 만료 (재조회 필요)');
  }
  
  return isValid;
}

/**
 * 날짜 포맷 함수
 */
function formatDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 완료된 작업 데이터 로드 (날짜 필터 추가!)
 * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
 * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
 * @returns {Promise<Array>} 완료된 작업 목록
 */
export async function loadCompletedTasks(startDate = null, endDate = null) {
  try {
    const db = window.db;
    const { getDocs, collection, where, query, orderBy } = window.firebase;
    
    if (!db || !getDocs) {
      throw new Error('Firebase가 초기화되지 않았습니다.');
    }

    // 🔥 날짜 미지정 시 기본값: 최근 2개월
    if (!startDate || !endDate) {
      const now = new Date();
      const twoMonthsAgo = new Date(now);
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      
      endDate = formatDateOnly(now);
      startDate = formatDateOnly(twoMonthsAgo);
      
      console.log(`📅 날짜 미지정 → 기본값 사용: ${startDate} ~ ${endDate}`);
    }

    // 🔥 최적화: 날짜 범위로 필터링
    const tasksQuery = query(
      collection(db, "tasks"), 
      where("done", "==", true),
      where("date", ">=", startDate + "T00:00:00"),
      where("date", "<=", endDate + "T23:59:59"),
      orderBy("date", "desc")
    );
    
    const tasksSnapshot = await getDocs(tasksQuery);
    
    console.log(`✅ 완료된 작업 ${tasksSnapshot.size}개 로드 (${startDate} ~ ${endDate})`);

    const tasks = [];
    tasksSnapshot.forEach(doc => {
      const data = doc.data();
      tasks.push({
        id: doc.id,
        ...data
      });
    });

    return tasks;
  } catch (error) {
    console.error('❌ 작업 데이터 로드 실패:', error);
    throw error;
  }
}

/**
 * 직원 정보 로드 (캐시 활용)
 * @returns {Promise<Array>} 직원 목록
 */
export async function loadUsers() {
  try {
    const db = window.db;
    const { getDocs, collection } = window.firebase;
    
    if (!db || !getDocs) {
      throw new Error('Firebase가 초기화되지 않았습니다.');
    }

    // 🔥 캐시에서 users 확인 (자주 바뀌지 않는 데이터)
    if (settlementCache.data && settlementCache.data.users) {
      console.log('✅ 직원 정보 캐시 사용');
      return settlementCache.data.users;
    }

    const usersSnapshot = await getDocs(collection(db, "users"));
    
    console.log(`✅ 직원 정보 ${usersSnapshot.size}명 로드`);

    const users = [];
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      
      users.push({
        id: doc.id,
        name: data.name || '',
        type: data.employeeType || 'executive',
        ratio: data.executiveShare || 0,
        allowanceRate: data.workerCommissionRate || 0,
        active: data.isActive !== false,
        email: data.email,
        phone: data.phone,
        role: data.role,
        ...data
      });
    });

    // 활성 직원만 필터링
    const activeUsers = users.filter(u => u.active);
    
    console.log(`📊 활성 직원: ${activeUsers.length}명`);
    console.log(`   - 임원: ${activeUsers.filter(u => u.type === 'executive').length}명`);
    console.log(`   - 도급기사: ${activeUsers.filter(u => u.type === 'contract_worker').length}명`);

    // 캐시 저장 (users는 전체 캐시와 별도로 저장)
    if (!settlementCache.data) {
      settlementCache.data = {};
    }
    settlementCache.data.users = activeUsers;

    return activeUsers;
  } catch (error) {
    console.error('❌ 직원 정보 로드 실패:', error);
    
    // 직원 정보가 없으면 기본값 반환 (하위 호환성)
    console.warn('⚠️ users 컬렉션이 없습니다. 기본 직원 정보 사용');
    return [
      { name: '성욱', type: 'executive', ratio: 4, active: true },
      { name: '성호', type: 'executive', ratio: 3, active: true },
      { name: '희종', type: 'executive', ratio: 3, active: true }
    ];
  }
}

/**
 * 출고 부품 데이터 로드 (날짜 필터 추가!)
 * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
 * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
 * @returns {Promise<Array>} 출고 부품 목록
 */
export async function loadOutboundParts(startDate = null, endDate = null) {
  try {
    const db = window.db;
    const { getDocs, collection, where, query, orderBy } = window.firebase;
    
    if (!db || !getDocs) {
      throw new Error('Firebase가 초기화되지 않았습니다.');
    }

    // 🔥 날짜 미지정 시 기본값: 최근 2개월
    if (!startDate || !endDate) {
      const now = new Date();
      const twoMonthsAgo = new Date(now);
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      
      endDate = formatDateOnly(now);
      startDate = formatDateOnly(twoMonthsAgo);
    }

    // 🔥 최적화: 날짜 범위로 필터링
    const outboundQuery = query(
      collection(db, "inventory"), 
      where("type", "==", "out"),
      where("reason", "==", "작업사용"),
      where("date", ">=", startDate),
      where("date", "<=", endDate + "T23:59:59"),
      orderBy("date", "desc")
    );
    
    const outboundSnapshot = await getDocs(outboundQuery);
    
    console.log(`✅ 출고 부품 ${outboundSnapshot.size}개 로드 (${startDate} ~ ${endDate})`);

    const outboundParts = [];
    outboundSnapshot.forEach(doc => {
      const data = doc.data();
      outboundParts.push({
        id: doc.id,
        ...data
      });
    });

    return outboundParts;
  } catch (error) {
    console.error('❌ 출고 부품 로드 실패:', error);
    return [];
  }
}

/**
 * 회사 자금 데이터 로드 (날짜 필터 추가!)
 * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
 * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
 * @returns {Promise<Array>} 회사 자금 내역
 */
export async function loadCompanyFunds(startDate = null, endDate = null) {
  try {
    const db = window.db;
    const { getDocs, collection, where, query, orderBy } = window.firebase;
    
    if (!db || !getDocs) {
      throw new Error('Firebase가 초기화되지 않았습니다.');
    }

    // 🔥 날짜 미지정 시 기본값: 최근 2개월
    if (!startDate || !endDate) {
      const now = new Date();
      const twoMonthsAgo = new Date(now);
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      
      endDate = formatDateOnly(now);
      startDate = formatDateOnly(twoMonthsAgo);
    }

    // 🔥 최적화: 날짜 범위로 필터링
    const fundsQuery = query(
      collection(db, "companyFunds"),
      where("date", ">=", startDate),
      where("date", "<=", endDate + "T23:59:59"),
      orderBy("date", "desc")
    );
    
    const fundsSnapshot = await getDocs(fundsQuery);
    
    console.log(`✅ 회사자금 ${fundsSnapshot.size}개 로드 (${startDate} ~ ${endDate})`);

    const funds = [];
    fundsSnapshot.forEach(doc => {
      const data = doc.data();
      funds.push({
        id: doc.id,
        ...data
      });
    });

    return funds;
  } catch (error) {
    console.error('❌ 회사자금 로드 실패:', error);
    return [];
  }
}

/**
 * 모든 정산 데이터 한번에 로드 (캐시 활용!)
 * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
 * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
 * @param {boolean} forceReload - 강제 새로고침 여부
 * @returns {Promise<Object>} 모든 데이터
 */
export async function loadAllSettlementData(startDate = null, endDate = null, forceReload = false) {
  console.log('📊 정산 데이터 전체 로드 시작...');
  
  // 🔥 캐시 확인 (강제 새로고침 아닐 때만)
  if (!forceReload && isCacheValid()) {
    console.log('✅ 캐시된 데이터 반환 (Firebase 읽기 0회)');
    return settlementCache.data;
  }
  
  try {
    // 날짜 기본값 설정
    if (!startDate || !endDate) {
      const now = new Date();
      const twoMonthsAgo = new Date(now);
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      
      endDate = formatDateOnly(now);
      startDate = formatDateOnly(twoMonthsAgo);
    }
    
    console.log(`📅 조회 기간: ${startDate} ~ ${endDate}`);
    
    const [tasks, users, outboundParts, companyFunds] = await Promise.all([
      loadCompletedTasks(startDate, endDate),
      loadUsers(),
      loadOutboundParts(startDate, endDate),
      loadCompanyFunds(startDate, endDate)
    ]);
    
    const data = {
      tasks,
      users,
      outboundParts,
      companyFunds,
      loadedAt: new Date().toISOString(),
      dateRange: { startDate, endDate }
    };
    
    // 🔥 캐시 저장
    settlementCache.data = data;
    settlementCache.timestamp = Date.now();
    
    console.log('✅ 모든 데이터 로드 완료!');
    console.log('📊 로드된 데이터:', {
      작업: tasks.length,
      직원: users.length,
      출고부품: outboundParts.length,
      회사자금: companyFunds.length
    });
    
    return data;
  } catch (error) {
    console.error('❌ 데이터 로드 실패:', error);
    throw error;
  }
}

/**
 * 캐시 수동 초기화 (새로고침용)
 */
export function clearSettlementCache() {
  settlementCache.data = null;
  settlementCache.timestamp = null;
  console.log('🗑️ 정산 데이터 캐시 초기화 완료');
}

/**
 * 캐시 상태 확인
 */
export function getCacheStatus() {
  if (!settlementCache.data || !settlementCache.timestamp) {
    return { cached: false, age: 0 };
  }
  
  const now = Date.now();
  const age = Math.floor((now - settlementCache.timestamp) / 1000 / 60);
  const remaining = Math.floor((settlementCache.TTL - (now - settlementCache.timestamp)) / 1000 / 60);
  
  return {
    cached: true,
    age: age,
    remaining: remaining,
    valid: isCacheValid()
  };
}
