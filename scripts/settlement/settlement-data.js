// scripts/settlement/settlement-data.js
// Firebase 데이터 로드 모듈

/**
 * 완료된 작업 데이터 로드
 * @returns {Promise<Array>} 완료된 작업 목록
 */
export async function loadCompletedTasks() {
  try {
    const db = window.db;
    const { getDocs, collection, where, query } = window.firebase;
    
    if (!db || !getDocs) {
      throw new Error('Firebase가 초기화되지 않았습니다.');
    }

    const tasksQuery = query(collection(db, "tasks"), where("done", "==", true));
    const tasksSnapshot = await getDocs(tasksQuery);
    
    console.log(`✅ 완료된 작업 ${tasksSnapshot.size}개 로드`);

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
 * 직원 정보 로드 (NEW!)
 * @returns {Promise<Array>} 직원 목록
 */
export async function loadUsers() {
  try {
    const db = window.db;
    const { getDocs, collection } = window.firebase;
    
    if (!db || !getDocs) {
      throw new Error('Firebase가 초기화되지 않았습니다.');
    }

    const usersSnapshot = await getDocs(collection(db, "users"));
    
    console.log(`✅ 직원 정보 ${usersSnapshot.size}명 로드`);

    const users = [];
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      
      // 신버전 필드만 사용 (개발 중인 정산 시스템용)
      users.push({
        id: doc.id,
        name: data.name || '',
        type: data.employeeType || 'executive',  // "executive" or "contract_worker"
        ratio: data.executiveShare || 0,  // 분배비율 (임원용)
        allowanceRate: data.workerCommissionRate || 0,  // 수당% (도급기사용)
        active: data.isActive !== false,  // 활성 상태
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
 * 출고 부품 데이터 로드
 * @returns {Promise<Array>} 출고 부품 목록
 */
export async function loadOutboundParts() {
  try {
    const db = window.db;
    const { getDocs, collection, where, query } = window.firebase;
    
    if (!db || !getDocs) {
      throw new Error('Firebase가 초기화되지 않았습니다.');
    }

    const outboundQuery = query(
      collection(db, "inventory"), 
      where("type", "==", "out"),
      where("reason", "==", "작업사용")
    );
    const outboundSnapshot = await getDocs(outboundQuery);
    
    console.log(`✅ 출고 부품 ${outboundSnapshot.size}개 로드`);

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
 * 회사 자금 데이터 로드
 * @returns {Promise<Array>} 회사 자금 내역
 */
export async function loadCompanyFunds() {
  try {
    const db = window.db;
    const { getDocs, collection } = window.firebase;
    
    if (!db || !getDocs) {
      throw new Error('Firebase가 초기화되지 않았습니다.');
    }

    const fundsSnapshot = await getDocs(collection(db, "companyFunds"));
    
    console.log(`✅ 회사자금 ${fundsSnapshot.size}개 로드`);

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
 * 모든 정산 데이터 한번에 로드
 * @returns {Promise<Object>} 모든 데이터
 */
export async function loadAllSettlementData() {
  console.log('📊 정산 데이터 전체 로드 시작...');
  
  try {
    const [tasks, users, outboundParts, companyFunds] = await Promise.all([
      loadCompletedTasks(),
      loadUsers(),
      loadOutboundParts(),
      loadCompanyFunds()
    ]);
    
    console.log('✅ 모든 데이터 로드 완료!');
    
    return {
      tasks,
      users,
      outboundParts,
      companyFunds,
      loadedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ 데이터 로드 실패:', error);
    throw error;
  }
}
