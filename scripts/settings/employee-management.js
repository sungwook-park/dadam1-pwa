// scripts/settings/employee-management.js - 직원관리 (임원 + 도급기사)

import { db } from '../firebase-config.js';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/**
 * 직원관리 탭 로드
 */
window.loadEmployeeManagement = async function() {
  console.log('👥 직원관리 탭 로드');
  
  const settingsContent = document.getElementById('settings-content');
  
  if (!settingsContent) {
    console.error('❌ settings-content 요소를 찾을 수 없습니다.');
    return;
  }
  
  // 로딩 표시
  settingsContent.innerHTML = `
    <div class="loading-placeholder">
      <div class="spinner-modern"></div>
      <p>직원 정보를 불러오는 중...</p>
    </div>
  `;
  
  try {
    // 직원 목록 조회
    const employees = await getEmployeeList();
    
    // 임원과 도급기사 분리
    const executives = employees.filter(emp => emp.employeeType === 'executive');
    const workers = employees.filter(emp => emp.employeeType === 'contract_worker');
    
    // UI 렌더링
    settingsContent.innerHTML = `
      <div class="employee-management">
        <!-- 임원 섹션 -->
        <div class="employee-section">
          <div class="section-header">
            <div class="header-info">
              <h4>📊 임원 (${executives.length}명)</h4>
              <p>정산 시 분배 비율에 따라 수익을 분배받습니다.</p>
            </div>
            <button class="add-btn" onclick="window.openEmployeeModal('create', 'executive')">
              ➕ 임원 추가
            </button>
          </div>
          
          <div class="employee-grid">
            ${executives.length > 0 ? 
              executives.map(emp => createEmployeeCard(emp, 'executive')).join('') :
              '<div class="empty-state"><p>👤 등록된 임원이 없습니다.</p></div>'
            }
          </div>
        </div>
        
        <!-- 도급기사 섹션 -->
        <div class="employee-section">
          <div class="section-header">
            <div class="header-info">
              <h4>👷 도급기사 (${workers.length}명)</h4>
              <p>개별 매출에서 설정된 비율만큼 수당을 받습니다.</p>
            </div>
            <button class="add-btn" onclick="window.openEmployeeModal('create', 'contract_worker')">
              ➕ 기사 추가
            </button>
          </div>
          
          <div class="employee-grid">
            ${workers.length > 0 ? 
              workers.map(emp => createEmployeeCard(emp, 'contract_worker')).join('') :
              '<div class="empty-state"><p>👤 등록된 도급기사가 없습니다.</p></div>'
            }
          </div>
        </div>
      </div>
      
      <!-- 직원 등록/수정 모달 (숨김) -->
      <div id="employee-modal" class="modal" style="display: none;">
        <div class="modal-backdrop" onclick="window.closeEmployeeModal()"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h4 id="modal-title">직원 등록</h4>
            <button class="modal-close" onclick="window.closeEmployeeModal()">×</button>
          </div>
          <div class="modal-body">
            <form id="employee-form" onsubmit="return false;">
              <!-- 폼 내용은 모달 열 때 동적 생성 -->
            </form>
          </div>
        </div>
      </div>
    `;
    
    // 스타일 추가
    addEmployeeManagementStyles();
    
  } catch (error) {
    console.error('❌ 직원 목록 로드 오류:', error);
    settingsContent.innerHTML = `
      <div class="error-placeholder">
        <p>❌ 직원 정보를 불러오는 중 오류가 발생했습니다.</p>
        <p style="font-size: 14px; color: #666;">${error.message}</p>
        <button onclick="window.loadEmployeeManagement()" class="retry-btn">다시 시도</button>
      </div>
    `;
  }
};

/**
 * Firebase에서 직원 목록 조회
 */
async function getEmployeeList() {
  try {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const employees = [];
    querySnapshot.forEach((doc) => {
      employees.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('✅ 직원 목록 조회 완료:', employees.length + '명');
    return employees;
  } catch (error) {
    console.error('❌ 직원 목록 조회 오류:', error);
    throw error;
  }
}

/**
 * 직원 카드 생성
 */
function createEmployeeCard(employee, type) {
  const isExecutive = type === 'executive';
  const statusBadge = employee.isActive ? 
    '<span class="status-badge active">재직중</span>' : 
    '<span class="status-badge inactive">퇴사</span>';
  
  return `
    <div class="employee-card ${!employee.isActive ? 'inactive' : ''}" data-employee-id="${employee.id}">
      <div class="employee-header">
        <div class="employee-name">
          <span class="name">${employee.name}</span>
          ${statusBadge}
        </div>
        <div class="employee-actions">
          <button class="edit-btn" onclick="window.openEmployeeModal('edit', '${type}', '${employee.id}')">
            ✏️
          </button>
          <button class="delete-btn" onclick="window.deleteEmployee('${employee.id}', '${employee.name}')">
            🗑️
          </button>
        </div>
      </div>
      
      <div class="employee-info">
        ${isExecutive ? `
          <div class="info-item highlight">
            <span class="label">분배 비율:</span>
            <span class="value">${employee.executiveShare || 0}</span>
          </div>
        ` : `
          <div class="info-item highlight">
            <span class="label">수당 비율:</span>
            <span class="value">${employee.workerCommissionRate || 0}%</span>
          </div>
        `}
        
        <div class="info-item">
          <span class="label">이메일:</span>
          <span class="value">${employee.email}</span>
        </div>
        
        ${employee.phone ? `
          <div class="info-item">
            <span class="label">연락처:</span>
            <span class="value">${employee.phone}</span>
          </div>
        ` : ''}
        
        ${employee.hireDate ? `
          <div class="info-item">
            <span class="label">입사일:</span>
            <span class="value">${employee.hireDate}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * 직원 등록/수정 모달 열기
 */
window.openEmployeeModal = function(mode, type, employeeId = null) {
  console.log('📝 직원 모달 열기:', mode, type, employeeId);
  
  const modal = document.getElementById('employee-modal');
  const modalTitle = document.getElementById('modal-title');
  const form = document.getElementById('employee-form');
  
  if (!modal || !modalTitle || !form) return;
  
  const isExecutive = type === 'executive';
  const isEditMode = mode === 'edit';
  
  // 타이틀 설정
  if (isEditMode) {
    modalTitle.textContent = isExecutive ? '임원 정보 수정' : '도급기사 정보 수정';
  } else {
    modalTitle.textContent = isExecutive ? '임원 등록' : '도급기사 등록';
  }
  
  // 폼 생성
  form.innerHTML = `
    <input type="hidden" id="employee-id" value="${employeeId || ''}">
    <input type="hidden" id="employee-type" value="${type}">
    <input type="hidden" id="form-mode" value="${mode}">
    
    <div class="form-group">
      <label for="employee-name">이름 <span class="required">*</span></label>
      <input type="text" id="employee-name" placeholder="이름을 입력하세요" required>
    </div>
    
    <div class="form-group">
      <label for="employee-email">이메일 <span class="required">*</span></label>
      <input type="email" id="employee-email" placeholder="example@dadam.tv" required>
      ${isEditMode ? '<small class="email-warning">⚠️ 이메일 변경 시 로그인 정보가 변경됩니다.</small>' : ''}
    </div>
    
    <div class="form-group">
      <label for="employee-password">비밀번호 ${!isEditMode ? '<span class="required">*</span>' : ''}</label>
      <input type="password" id="employee-password" placeholder="${isEditMode ? '변경하려면 입력 (6자 이상)' : '비밀번호 (6자 이상)'}" ${!isEditMode ? 'required' : ''}>
      ${isEditMode ? '<small class="password-hint">💡 비밀번호를 변경하지 않으려면 비워두세요.</small>' : ''}
    </div>
    
    ${isExecutive ? `
      <div class="form-group">
        <label for="employee-share">분배 비율 <span class="required">*</span></label>
        <input type="number" id="employee-share" placeholder="예: 4, 3" min="1" required>
        <small>정산 시 분배받을 비율을 입력하세요. (예: 4:3:3 중 하나)</small>
      </div>
    ` : `
      <div class="form-group">
        <label for="employee-commission">수당 비율 (%) <span class="required">*</span></label>
        <input type="number" id="employee-commission" placeholder="70" min="0" max="100" required>
        <small>개별 매출에서 받을 수당 비율을 입력하세요. (0-100)</small>
      </div>
    `}
    
    <div class="form-group">
      <label for="employee-phone">연락처</label>
      <input type="tel" id="employee-phone" placeholder="010-1234-5678">
    </div>
    
    <div class="form-group">
      <label for="employee-hiredate">입사일</label>
      <input type="date" id="employee-hiredate">
    </div>
    
    ${isEditMode ? `
      <div class="form-group">
        <label>
          <input type="checkbox" id="employee-active" checked>
          재직중
        </label>
      </div>
    ` : ''}
    
    <div class="form-actions">
      <button type="button" class="btn-cancel" onclick="window.closeEmployeeModal()">취소</button>
      <button type="button" class="btn-save" onclick="window.saveEmployee()">${isEditMode ? '수정' : '등록'}</button>
    </div>
  `;
  
  // 수정 모드일 경우 데이터 로드
  if (isEditMode && employeeId) {
    loadEmployeeData(employeeId);
  }
  
  // 모달 표시
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

/**
 * 직원 모달 닫기
 */
window.closeEmployeeModal = function() {
  const modal = document.getElementById('employee-modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
};

/**
 * 직원 데이터 로드 (수정 모드)
 */
async function loadEmployeeData(employeeId) {
  try {
    // 전체 목록에서 찾기 (간단한 방법)
    const employees = await getEmployeeList();
    const employee = employees.find(emp => emp.id === employeeId);
    
    if (!employee) {
      console.error('❌ 직원 데이터를 찾을 수 없습니다:', employeeId);
      alert('직원 정보를 찾을 수 없습니다.');
      return;
    }
    
    // 폼에 데이터 채우기
    document.getElementById('employee-name').value = employee.name || '';
    document.getElementById('employee-email').value = employee.email || '';
    
    if (employee.employeeType === 'executive') {
      const shareInput = document.getElementById('employee-share');
      if (shareInput) shareInput.value = employee.executiveShare || '';
    } else {
      const commissionInput = document.getElementById('employee-commission');
      if (commissionInput) commissionInput.value = employee.workerCommissionRate || '';
    }
    
    const phoneInput = document.getElementById('employee-phone');
    if (phoneInput) phoneInput.value = employee.phone || '';
    
    const hireDateInput = document.getElementById('employee-hiredate');
    if (hireDateInput) hireDateInput.value = employee.hireDate || '';
    
    const activeCheckbox = document.getElementById('employee-active');
    if (activeCheckbox) activeCheckbox.checked = employee.isActive !== false;
    
    console.log('✅ 직원 데이터 로드 완료:', employee.name);
  } catch (error) {
    console.error('❌ 직원 데이터 로드 오류:', error);
    alert('직원 정보를 불러오는 중 오류가 발생했습니다.');
  }
}

/**
 * 직원 저장 (등록/수정)
 */
window.saveEmployee = async function() {
  const mode = document.getElementById('form-mode').value;
  const type = document.getElementById('employee-type').value;
  const employeeId = document.getElementById('employee-id').value;
  
  // 폼 데이터 수집
  const name = document.getElementById('employee-name').value.trim();
  const email = document.getElementById('employee-email').value.trim();
  const phone = document.getElementById('employee-phone')?.value.trim() || '';
  const hireDate = document.getElementById('employee-hiredate')?.value || '';
  
  const isExecutive = type === 'executive';
  let share = 0;
  let commission = 0;
  
  if (isExecutive) {
    share = parseInt(document.getElementById('employee-share').value) || 0;
  } else {
    commission = parseInt(document.getElementById('employee-commission').value) || 0;
  }
  
  // 유효성 검증
  if (!name) {
    alert('이름을 입력해주세요.');
    return;
  }
  
  if (!email) {
    alert('이메일을 입력해주세요.');
    return;
  }
  
  if (mode === 'create') {
    const password = document.getElementById('employee-password').value;
    if (!password || password.length < 6) {
      alert('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
  }
  
  if (isExecutive && share <= 0) {
    alert('분배 비율을 입력해주세요.');
    return;
  }
  
  if (!isExecutive && (commission < 0 || commission > 100)) {
    alert('수당 비율은 0-100 사이여야 합니다.');
    return;
  }
  
  // 저장 버튼 비활성화
  const saveBtn = document.querySelector('.btn-save');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';
  }
  
  try {
    if (mode === 'create') {
      // 신규 등록
      await createEmployee({
        name,
        email,
        password: document.getElementById('employee-password').value,
        type,
        share,
        commission,
        phone,
        hireDate
      });
      alert('✅ 직원이 등록되었습니다.');
    } else {
      // 수정
      const isActive = document.getElementById('employee-active')?.checked !== false;
      const password = document.getElementById('employee-password')?.value;
      
      const updateData = {
        name,
        email,  // 이메일 변경 지원
        type,
        share,
        commission,
        phone,
        hireDate,
        isActive
      };
      
      // 비밀번호가 입력되었으면 추가
      if (password && password.trim().length >= 6) {
        updateData.password = password;
      }
      
      await updateEmployee(employeeId, updateData);
      alert('✅ 직원 정보가 수정되었습니다.');
    }
    
    // 모달 닫기 및 목록 새로고침
    window.closeEmployeeModal();
    await window.loadEmployeeManagement();
    
  } catch (error) {
    console.error('❌ 직원 저장 오류:', error);
    alert('오류가 발생했습니다: ' + error.message);
    
    // 버튼 복구
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = mode === 'create' ? '등록' : '수정';
    }
  }
};

/**
 * 직원 등록
 */
async function createEmployee(data) {
  try {
    const auth = getAuth();
    
    // 1. Firebase Authentication에 사용자 생성
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );
    
    console.log('✅ Firebase Auth 사용자 생성:', userCredential.user.uid);
    
    // 2. Firestore에 사용자 정보 저장
    const userData = {
      email: data.email,
      name: data.name,
      role: data.type === 'executive' ? 'admin' : 'worker',
      employeeType: data.type,
      phone: data.phone || '',
      hireDate: data.hireDate || '',
      isActive: true,
      createdAt: Timestamp.now()
    };
    
    if (data.type === 'executive') {
      userData.executiveShare = data.share;
      userData.workerCommissionRate = 0;
    } else {
      userData.executiveShare = 0;
      userData.workerCommissionRate = data.commission;
    }
    
    await addDoc(collection(db, 'users'), userData);
    
    console.log('✅ Firestore에 사용자 정보 저장 완료');
    
  } catch (error) {
    console.error('❌ 직원 등록 오류:', error);
    
    // Firebase Auth 에러 메시지 한글화
    let errorMessage = error.message;
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = '이미 사용 중인 이메일입니다.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = '이메일 형식이 올바르지 않습니다.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = '비밀번호가 너무 약합니다. (최소 6자)';
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * 직원 정보 수정
 */
async function updateEmployee(employeeId, data) {
  try {
    const employees = await getEmployeeList();
    const employee = employees.find(emp => emp.id === employeeId);
    
    if (!employee) {
      throw new Error('직원 정보를 찾을 수 없습니다.');
    }
    
    const updateData = {
      name: data.name,
      email: data.email,  // 이메일 업데이트 지원
      phone: data.phone || '',
      hireDate: data.hireDate || '',
      isActive: data.isActive !== false
    };
    
    if (data.type === 'executive') {
      updateData.executiveShare = data.share;
    } else {
      updateData.workerCommissionRate = data.commission;
    }
    
    // Firestore 업데이트
    const docRef = doc(db, 'users', employeeId);
    await updateDoc(docRef, updateData);
    
    // 비밀번호 변경 (자기 자신을 수정할 때만)
    if (data.password && data.password.trim().length >= 6) {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (currentUser && currentUser.email === employee.email) {
        // 현재 로그인한 사용자가 자기 자신을 수정하는 경우에만 비밀번호 변경
        const { updatePassword } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
        await updatePassword(currentUser, data.password);
        console.log('✅ 비밀번호 변경 완료');
      } else {
        console.warn('⚠️ 다른 사용자의 비밀번호는 변경할 수 없습니다.');
        alert('⚠️ 비밀번호는 본인이 직접 변경해야 합니다.');
      }
    }
    
    console.log('✅ 직원 정보 수정 완료:', employeeId);
    
  } catch (error) {
    console.error('❌ 직원 정보 수정 오류:', error);
    
    if (error.code === 'auth/requires-recent-login') {
      alert('⚠️ 보안을 위해 다시 로그인이 필요합니다.');
    } else {
      throw error;
    }
  }
}

/**
 * 직원 삭제
 */
window.deleteEmployee = async function(employeeId, employeeName) {
  if (!confirm(`"${employeeName}" 직원을 정말 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.`)) {
    return;
  }
  
  try {
    const docRef = doc(db, 'users', employeeId);
    await deleteDoc(docRef);
    
    alert('✅ 직원이 삭제되었습니다.');
    
    // 목록 새로고침
    await window.loadEmployeeManagement();
    
    console.log('✅ 직원 삭제 완료:', employeeId);
    
  } catch (error) {
    console.error('❌ 직원 삭제 오류:', error);
    alert('직원 삭제 중 오류가 발생했습니다: ' + error.message);
  }
};

/**
 * 스타일 추가
 */
function addEmployeeManagementStyles() {
  if (document.getElementById('employee-management-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'employee-management-styles';
  style.textContent = `
    /* 직원관리 컨테이너 */
    .employee-management {
      display: flex;
      flex-direction: column;
      gap: 40px;
    }
    
    /* 섹션 */
    .employee-section {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 25px;
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 25px;
      flex-wrap: wrap;
      gap: 15px;
    }
    
    .header-info h4 {
      margin: 0 0 5px 0;
      font-size: 1.3rem;
      color: #333;
    }
    
    .header-info p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }
    
    .add-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    
    .add-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
    }
    
    /* 직원 그리드 */
    .employee-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }
    
    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 60px 20px;
      color: #999;
      font-size: 16px;
    }
    
    /* 직원 카드 */
    .employee-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      transition: all 0.3s ease;
      border: 2px solid transparent;
    }
    
    .employee-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.12);
      border-color: #667eea;
    }
    
    .employee-card.inactive {
      opacity: 0.6;
      background: #f5f5f5;
    }
    
    .employee-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 15px;
      padding-bottom: 15px;
      border-bottom: 2px solid #f0f0f0;
    }
    
    .employee-name {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .employee-name .name {
      font-size: 1.2rem;
      font-weight: 700;
      color: #333;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .status-badge.active {
      background: #d4edda;
      color: #155724;
    }
    
    .status-badge.inactive {
      background: #f8d7da;
      color: #721c24;
    }
    
    .employee-actions {
      display: flex;
      gap: 8px;
    }
    
    .edit-btn, .delete-btn {
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .edit-btn {
      background: #e3f2fd;
      color: #1976d2;
    }
    
    .edit-btn:hover {
      background: #1976d2;
      color: white;
      transform: scale(1.1);
    }
    
    .delete-btn {
      background: #ffebee;
      color: #c62828;
    }
    
    .delete-btn:hover {
      background: #c62828;
      color: white;
      transform: scale(1.1);
    }
    
    /* 직원 정보 */
    .employee-info {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      font-size: 14px;
    }
    
    .info-item .label {
      color: #666;
      font-weight: 500;
    }
    
    .info-item .value {
      color: #333;
      font-weight: 600;
      text-align: right;
    }
    
    .info-item.highlight {
      background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 5px;
    }
    
    .info-item.highlight .value {
      font-size: 1.3rem;
      color: #667eea;
    }
    
    /* 모달 */
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 9999;
      align-items: center;
      justify-content: center;
    }
    
    .modal-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
    }
    
    .modal-content {
      position: relative;
      background: white;
      border-radius: 16px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      z-index: 1;
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 25px;
      border-bottom: 2px solid #f0f0f0;
    }
    
    .modal-header h4 {
      margin: 0;
      font-size: 1.3rem;
      color: #333;
    }
    
    .modal-close {
      width: 36px;
      height: 36px;
      border: none;
      background: #f5f5f5;
      border-radius: 50%;
      font-size: 24px;
      color: #666;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .modal-close:hover {
      background: #e0e0e0;
      color: #333;
      transform: rotate(90deg);
    }
    
    .modal-body {
      padding: 25px;
    }
    
    /* 폼 */
    .form-group {
      margin-bottom: 20px;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
      font-size: 14px;
    }
    
    .required {
      color: #dc3545;
    }
    
    .form-group input[type="text"],
    .form-group input[type="email"],
    .form-group input[type="password"],
    .form-group input[type="number"],
    .form-group input[type="tel"],
    .form-group input[type="date"] {
      width: 100%;
      padding: 12px 15px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 15px;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }
    
    .form-group input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    
    .form-group input:disabled {
      background: #f5f5f5;
      cursor: not-allowed;
    }
    
    .form-group small {
      display: block;
      margin-top: 5px;
      font-size: 13px;
      color: #666;
    }
    
    .form-group small.email-warning {
      color: #f57c00;
      font-weight: 600;
    }
    
    .form-group small.password-hint {
      color: #4299e1;
      font-weight: 600;
    }
    
    .form-group input[type="checkbox"] {
      width: auto;
      margin-right: 8px;
    }
    
    .form-actions {
      display: flex;
      gap: 10px;
      margin-top: 30px;
    }
    
    .btn-cancel, .btn-save {
      flex: 1;
      padding: 14px 20px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .btn-cancel {
      background: #f5f5f5;
      color: #666;
    }
    
    .btn-cancel:hover {
      background: #e0e0e0;
    }
    
    .btn-save {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    
    .btn-save:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
    }
    
    .btn-save:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    
    /* 모바일 반응형 */
    @media (max-width: 768px) {
      .employee-grid {
        grid-template-columns: 1fr;
      }
      
      .section-header {
        flex-direction: column;
        align-items: stretch;
      }
      
      .add-btn {
        width: 100%;
      }
      
      .modal-content {
        width: 95%;
        max-height: 95vh;
      }
      
      .modal-body {
        padding: 20px;
      }
    }
  `;
  
  document.head.appendChild(style);
}
