// scripts/company-funds.js - 회사운영비 관리 시스템 (오류 수정 버전)

import { db } from './firebase-config.js';
import {
  collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc,
  orderBy, Timestamp, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 지출 카테고리 정의
const EXPENSE_CATEGORIES = {
  '인건비': { icon: '👷', allowWorker: false },
  '차량비': { icon: '⛽', allowWorker: true },
  '사무비': { icon: '🏢', allowWorker: false },
  '장비/도구구매비': { icon: '🔧', allowWorker: true },
  '식사비': { icon: '🍽️', allowWorker: true },
  '세금': { icon: '💼', allowWorker: false },
  '기타': { icon: '📋', allowWorker: false }
};

const PAYMENT_METHODS = ['현금', '카드', '계좌이체', '기타'];

let currentFunds = 0;
let monthlyExpenses = [];
let initialFundsSet = false;

// 메인 로드 함수
window.loadCompanyFunds = async function() {
  try {
    const tabBody = document.getElementById('tab-body');
    if (!tabBody) return;
    
    tabBody.innerHTML = getCompanyFundsHTML();
    await loadInitialData();
    setupEventListeners();
  } catch (error) {
    console.error('회사운영비 로드 오류:', error);
    alert('로드 중 오류: ' + error.message);
  }
};

// 초기 데이터 로드
async function loadInitialData() {
  try {
    await checkInitialFunds();
    await calculateCurrentFunds();
    await loadMonthlyExpenses();
    updateFundsDisplay();
  } catch (error) {
    console.error('데이터 로드 오류:', error);
  }
}

// 초기 자금 확인
async function checkInitialFunds() {
  try {
    const fundsDoc = await getDoc(doc(db, "company_settings", "initial_funds"));
    if (fundsDoc.exists()) {
      initialFundsSet = true;
    } else {
      initialFundsSet = false;
      setTimeout(() => showInitialFundsModal(), 1000);
    }
  } catch (error) {
    console.error('초기 자금 확인 오류:', error);
  }
}

// 현재 회사자금 계산
async function calculateCurrentFunds() {
  try {
    let totalFunds = 0;
    
    // 초기 자금
    const initialDoc = await getDoc(doc(db, "company_settings", "initial_funds"));
    if (initialDoc.exists()) {
      totalFunds += initialDoc.data().amount || 0;
    }
    
    // 정산에서 회사자금 몫
    const completedTasksQuery = query(collection(db, "tasks"), where("done", "==", true));
    const tasksSnapshot = await getDocs(completedTasksQuery);
    let totalCompanyShare = 0;
    
    tasksSnapshot.forEach(docSnapshot => {
      const task = docSnapshot.data();
      const amount = task.amount || 0;
      const partSpend = calculatePartsSpend(task.parts);
      const fee = calculateFee(task.client, amount, task.fee);
      const profit = amount - partSpend - fee;
      const companyShare = Math.round(profit * 0.2);
      totalCompanyShare += companyShare;
    });
    
    totalFunds += totalCompanyShare;
    
    // 운영비 지출 차감
    const expensesQuery = query(collection(db, "company_expenses"));
    const expensesSnapshot = await getDocs(expensesQuery);
    let totalExpenses = 0;
    
    expensesSnapshot.forEach(docSnapshot => {
      const expense = docSnapshot.data();
      totalExpenses += expense.amount || 0;
    });
    
    totalFunds -= totalExpenses;
    currentFunds = totalFunds;
  } catch (error) {
    console.error('회사자금 계산 오류:', error);
    currentFunds = 0;
  }
}

// 이번달 지출 로드
async function loadMonthlyExpenses() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    const expensesQuery = query(
      collection(db, "company_expenses"),
      where("date", ">=", startOfMonth.toISOString()),
      where("date", "<", startOfNextMonth.toISOString()),
      orderBy("date", "desc")
    );
    
    const snapshot = await getDocs(expensesQuery);
    monthlyExpenses = [];
    
    snapshot.forEach(docSnapshot => {
      monthlyExpenses.push({
        id: docSnapshot.id,
        ...docSnapshot.data()
      });
    });
  } catch (error) {
    console.error('월별 지출 로드 오류:', error);
    monthlyExpenses = [];
  }
}

// 부품비 계산
function calculatePartsSpend(partsData) {
  if (!partsData) return 0;
  
  let partSpend = 0;
  try {
    if (typeof partsData === 'string') {
      const parts = partsData.split(',');
      parts.forEach(part => {
        const trimmedPart = part.trim();
        if (trimmedPart) {
          const [name, count] = trimmedPart.split(':');
          const partName = name ? name.trim() : '';
          const partCount = Number(count) || 1;
          
          const partInfo = window.PARTS_LIST ? window.PARTS_LIST.find(p => p.name === partName) : null;
          const partPrice = partInfo ? partInfo.price || 0 : 0;
          
          partSpend += partPrice * partCount;
        }
      });
    }
  } catch (error) {
    console.warn('부품비 계산 오류:', error);
  }
  
  return partSpend;
}

// 수수료 계산
function calculateFee(client, amount, inputFee) {
  if (client && client.includes("공간")) {
    return Math.round(amount * 0.22);
  } else if (inputFee && inputFee > 0) {
    return Number(inputFee);
  }
  return 0;
}

// 이벤트 리스너 설정
function setupEventListeners() {
  const expenseForm = document.getElementById('expense-form');
  if (expenseForm) {
    expenseForm.addEventListener('submit', handleExpenseSubmit);
  }
  
  const categorySelect = document.getElementById('expense-category');
  if (categorySelect) {
    categorySelect.addEventListener('change', checkCategoryPermission);
  }
  
  const setFundsBtn = document.getElementById('set-initial-funds-btn');
  if (setFundsBtn) {
    setFundsBtn.addEventListener('click', showInitialFundsModal);
  }
}

// 지출 입력 처리
async function handleExpenseSubmit(event) {
  event.preventDefault();
  
  try {
    const formData = new FormData(event.target);
    const userInfo = window.getCurrentUserInfo ? window.getCurrentUserInfo() : {};
    
    const expenseData = {
      date: formData.get('date'),
      category: formData.get('category'),
      amount: parseFloat(formData.get('amount')),
      paymentMethod: formData.get('paymentMethod'),
      note: formData.get('note') || '',
      createdBy: userInfo.email || 'unknown',
      createdByName: userInfo.name || 'unknown',
      createdAt: Timestamp.now()
    };
    
    if (!expenseData.date || !expenseData.category || expenseData.amount <= 0) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }
    
    if (!checkUserPermission(expenseData.category)) {
      alert('이 카테고리는 입력 권한이 없습니다.');
      return;
    }
    
    await addDoc(collection(db, "company_expenses"), expenseData);
    alert('지출이 등록되었습니다.');
    
    await loadInitialData();
    event.target.reset();
  } catch (error) {
    console.error('지출 저장 오류:', error);
    alert('지출 저장 중 오류: ' + error.message);
  }
}

// 사용자 권한 확인
function checkUserPermission(category) {
  const userInfo = window.getCurrentUserInfo ? window.getCurrentUserInfo() : {};
  const isAdmin = window.isCurrentUserAdmin ? window.isCurrentUserAdmin() : false;
  
  if (isAdmin) return true;
  
  return EXPENSE_CATEGORIES[category] ? EXPENSE_CATEGORIES[category].allowWorker || false : false;
}

// 카테고리 권한 체크 UI
function checkCategoryPermission() {
  const categorySelect = document.getElementById('expense-category');
  const submitButton = document.querySelector('#expense-form button[type="submit"]');
  
  if (!categorySelect || !submitButton) return;
  
  const selectedCategory = categorySelect.value;
  const hasPermission = checkUserPermission(selectedCategory);
  
  if (!hasPermission && selectedCategory) {
    submitButton.disabled = true;
    submitButton.textContent = '권한 없음';
    submitButton.style.background = '#ccc';
  } else {
    submitButton.disabled = false;
    submitButton.textContent = '💰 지출 등록';
    submitButton.style.background = '#28a745';
  }
}

// 초기 자금 설정 모달
function showInitialFundsModal() {
  const existingModal = document.querySelector('.initial-funds-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const modal = document.createElement('div');
  modal.className = 'initial-funds-modal';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeInitialFundsModal()"></div>
    <div class="modal-content">
      <h3>💰 초기 회사자금 설정</h3>
      <p>현재 보유하고 있는 회사자금을 입력해주세요.</p>
      <input type="number" id="initial-amount" placeholder="금액 입력 (원)" min="0" style="width: 100%; margin: 20px 0; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
      <div class="modal-buttons">
        <button onclick="closeInitialFundsModal()" class="cancel-btn">취소</button>
        <button onclick="saveInitialFunds()" class="save-btn">설정</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  setTimeout(() => {
    const input = document.getElementById('initial-amount');
    if (input) input.focus();
  }, 100);
}

// 초기 자금 저장
window.saveInitialFunds = async function() {
  try {
    const amountInput = document.getElementById('initial-amount');
    const amount = parseFloat(amountInput.value);
    
    if (isNaN(amount) || amount < 0) {
      alert('올바른 금액을 입력해주세요.');
      return;
    }
    
    const userInfo = window.getCurrentUserInfo ? window.getCurrentUserInfo() : {};
    const fundsData = {
      amount: amount,
      setDate: new Date().toISOString(),
      setBy: userInfo.email || 'unknown',
      setByName: userInfo.name || 'unknown'
    };
    
    await setDoc(doc(db, "company_settings", "initial_funds"), fundsData);
    alert('초기 자금이 설정되었습니다.');
    
    closeInitialFundsModal();
    await loadInitialData();
  } catch (error) {
    console.error('초기 자금 설정 오류:', error);
    alert('초기 자금 설정 중 오류: ' + error.message);
  }
};

// 초기 자금 모달 닫기
window.closeInitialFundsModal = function() {
  const modal = document.querySelector('.initial-funds-modal');
  if (modal) {
    modal.remove();
  }
};

// 자금 현황 업데이트
function updateFundsDisplay() {
  const fundsAmountElement = document.getElementById('current-funds-amount');
  const monthlyTotalElement = document.getElementById('monthly-total');
  
  if (fundsAmountElement) {
    fundsAmountElement.textContent = currentFunds.toLocaleString() + '원';
    fundsAmountElement.className = 'funds-amount ' + (currentFunds >= 0 ? 'positive' : 'negative');
  }
  
  if (monthlyTotalElement) {
    const monthlyTotal = monthlyExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    monthlyTotalElement.textContent = monthlyTotal.toLocaleString() + '원';
  }
  
  updateCategorySummary();
}

// 카테고리별 집계 업데이트
function updateCategorySummary() {
  const summaryContainer = document.getElementById('category-summary');
  if (!summaryContainer) return;
  
  const categoryTotals = {};
  
  monthlyExpenses.forEach(expense => {
    const category = expense.category;
    if (!categoryTotals[category]) {
      categoryTotals[category] = 0;
    }
    categoryTotals[category] += expense.amount || 0;
  });
  
  let summaryHTML = '';
  Object.entries(categoryTotals).forEach(([category, total]) => {
    const categoryInfo = EXPENSE_CATEGORIES[category] || { icon: '📋' };
    summaryHTML += `
      <div class="category-item">
        <span class="category-icon">${categoryInfo.icon}</span>
        <span class="category-name">${category}</span>
        <span class="category-amount">${total.toLocaleString()}원</span>
      </div>
    `;
  });
  
  if (summaryHTML === '') {
    summaryHTML = '<div class="no-data">이번달 지출이 없습니다.</div>';
  }
  
  summaryContainer.innerHTML = summaryHTML;
}

// 지출 검색
window.searchExpensesByRange = async function() {
  const startDateInput = document.getElementById('expense-start-date');
  const endDateInput = document.getElementById('expense-end-date');
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  
  if (!startDate || !endDate) {
    alert('시작 날짜와 종료 날짜를 모두 선택해주세요.');
    return;
  }
  
  try {
    const expensesQuery = query(
      collection(db, "company_expenses"),
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "desc")
    );
    
    const querySnapshot = await getDocs(expensesQuery);
    const expensesList = document.getElementById('expenses-list');
    
    const searchResults = [];
    querySnapshot.forEach((doc) => {
      searchResults.push({
        id: doc.id,
        ...doc.data()
      });
    });
    window.lastSearchResults = searchResults;
    
    if (querySnapshot.empty) {
      expensesList.innerHTML = '<div class="no-data">선택한 기간에 지출 내역이 없습니다.</div>';
      return;
    }
    
    let expensesHTML = '';
    searchResults.forEach((expense) => {
      expensesHTML += getExpenseItemHTML(expense, expense.id);
    });
    
    expensesList.innerHTML = expensesHTML;
  } catch (error) {
    console.error('지출 내역 검색 오류:', error);
    document.getElementById('expenses-list').innerHTML = '<div class="no-data">검색 중 오류가 발생했습니다.</div>';
  }
};

// 지출 항목 HTML 생성
function getExpenseItemHTML(expense, id) {
  const categoryInfo = EXPENSE_CATEGORIES[expense.category] || { icon: '📋' };
  const formattedDate = formatDate(expense.date);
  
  const userInfo = window.getCurrentUserInfo ? window.getCurrentUserInfo() : {};
  const isAdmin = window.isCurrentUserAdmin ? window.isCurrentUserAdmin() : false;
  const isOwner = expense.createdBy === (userInfo.email || '');
  const canEdit = isAdmin || isOwner;
  
  return `
    <div class="expense-item ${canEdit ? 'editable' : ''}" data-expense-id="${id}" ${canEdit ? `onclick="editExpense('${id}')"` : ''}>
      <div class="expense-header">
        <span class="expense-category">
          ${categoryInfo.icon} ${expense.category}
        </span>
        <span class="expense-date">${formattedDate}</span>
        <span class="expense-amount">-${(expense.amount || 0).toLocaleString()}원</span>
      </div>
      <div class="expense-details">
        <span class="payment-method">${expense.paymentMethod || ''}</span>
        ${expense.note ? `<span class="expense-note">${expense.note}</span>` : ''}
        <span class="created-by">등록: ${expense.createdByName || expense.createdBy}</span>
        ${canEdit ? '<span class="edit-hint">✏️ 클릭하여 수정</span>' : ''}
      </div>
      ${canEdit ? `
        <div class="expense-actions" onclick="event.stopPropagation();">
          <button onclick="editExpense('${id}')" class="edit-btn">✏️</button>
          <button onclick="deleteExpense('${id}')" class="delete-btn">🗑️</button>
        </div>
      ` : ''}
    </div>
  `;
}

// 지출 수정
window.editExpense = function(expenseId) {
  const currentExpenses = getCurrentExpensesList();
  const expense = currentExpenses.find(exp => exp.id === expenseId);
  
  if (!expense) {
    alert('지출 내역을 찾을 수 없습니다.');
    return;
  }
  
  const userInfo = window.getCurrentUserInfo ? window.getCurrentUserInfo() : {};
  const isAdmin = window.isCurrentUserAdmin ? window.isCurrentUserAdmin() : false;
  const isOwner = expense.createdBy === (userInfo.email || '');
  
  if (!isAdmin && !isOwner) {
    alert('수정 권한이 없습니다. (관리자 또는 등록자만 수정 가능)');
    return;
  }
  
  showExpenseEditModal(expense);
};

// 현재 지출 목록 가져오기
function getCurrentExpensesList() {
  const expensesList = document.getElementById('expenses-list');
  if (!expensesList) return [];
  
  const expenseElements = expensesList.querySelectorAll('.expense-item[data-expense-id]');
  const currentExpenseIds = Array.from(expenseElements).map(el => el.dataset.expenseId);
  
  if (window.lastSearchResults && Array.isArray(window.lastSearchResults)) {
    return window.lastSearchResults.filter(exp => currentExpenseIds.includes(exp.id));
  }
  
  return [];
}

// 지출 수정 모달 표시
function showExpenseEditModal(expense) {
  const existingModal = document.querySelector('.expense-edit-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const userInfo = window.getCurrentUserInfo ? window.getCurrentUserInfo() : {};
  const isAdmin = window.isCurrentUserAdmin ? window.isCurrentUserAdmin() : false;
  
  const modal = document.createElement('div');
  modal.className = 'expense-edit-modal';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeExpenseEditModal()"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>✏️ 지출 수정</h3>
        <button onclick="closeExpenseEditModal()" class="close-btn">❌</button>
      </div>
      
      <form id="expense-edit-form" class="expense-edit-form">
        <input type="hidden" id="edit-expense-id" value="${expense.id}">
        
        <div class="form-row">
          <div class="form-group">
            <label for="edit-expense-date">날짜 *</label>
            <input type="date" id="edit-expense-date" value="${expense.date}" required>
          </div>
          
          <div class="form-group">
            <label for="edit-expense-category">카테고리 *</label>
            <select id="edit-expense-category" required>
              <option value="">카테고리 선택</option>
              ${Object.entries(EXPENSE_CATEGORIES).map(([category, info]) => {
                const canUse = isAdmin || info.allowWorker;
                const selected = expense.category === category ? 'selected' : '';
                return `<option value="${category}" ${!canUse ? 'disabled' : ''} ${selected}>${info.icon} ${category}${!canUse ? ' (권한없음)' : ''}</option>`;
              }).join('')}
            </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="edit-expense-amount">금액 *</label>
            <input type="number" id="edit-expense-amount" value="${expense.amount}" min="1" required>
          </div>
          
          <div class="form-group">
            <label for="edit-expense-payment">결제방법 *</label>
            <select id="edit-expense-payment" required>
              <option value="">결제방법</option>
              ${PAYMENT_METHODS.map(method => `<option value="${method}" ${expense.paymentMethod === method ? 'selected' : ''}>${method}</option>`).join('')}
            </select>
          </div>
        </div>
        
        <div class="form-group full-width">
          <label for="edit-expense-note">비고</label>
          <textarea id="edit-expense-note" rows="3">${expense.note || ''}</textarea>
        </div>
        
        <div class="modal-buttons">
          <button type="button" onclick="closeExpenseEditModal()" class="cancel-btn">취소</button>
          <button type="submit" class="save-btn">💾 저장</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const form = document.getElementById('expense-edit-form');
  form.addEventListener('submit', handleExpenseEdit);
  
  const categorySelect = document.getElementById('edit-expense-category');
  const submitButton = form.querySelector('button[type="submit"]');
  
  categorySelect.addEventListener('change', function() {
    const selectedCategory = this.value;
    const hasPermission = isAdmin || (EXPENSE_CATEGORIES[selectedCategory] ? EXPENSE_CATEGORIES[selectedCategory].allowWorker || false : false);
    
    if (!hasPermission && selectedCategory) {
      submitButton.disabled = true;
      submitButton.textContent = '권한 없음';
      submitButton.style.background = '#ccc';
    } else {
      submitButton.disabled = false;
      submitButton.textContent = '💾 저장';
      submitButton.style.background = '#28a745';
    }
  });
}

// 지출 수정 처리
async function handleExpenseEdit(event) {
  event.preventDefault();
  
  try {
    const expenseId = document.getElementById('edit-expense-id').value;
    const userInfo = window.getCurrentUserInfo ? window.getCurrentUserInfo() : {};
    
    const updatedData = {
      date: document.getElementById('edit-expense-date').value,
      category: document.getElementById('edit-expense-category').value,
      amount: parseFloat(document.getElementById('edit-expense-amount').value),
      paymentMethod: document.getElementById('edit-expense-payment').value,
      note: document.getElementById('edit-expense-note').value || '',
      updatedAt: Timestamp.now(),
      updatedBy: userInfo.email || 'unknown'
    };
    
    if (!updatedData.date || !updatedData.category || updatedData.amount <= 0) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }
    
    if (!checkUserPermission(updatedData.category)) {
      alert('이 카테고리는 수정 권한이 없습니다.');
      return;
    }
    
    await updateDoc(doc(db, "company_expenses", expenseId), updatedData);
    alert('지출이 수정되었습니다.');
    
    closeExpenseEditModal();
    await loadInitialData();
    
    const startDate = document.getElementById('expense-start-date') ? document.getElementById('expense-start-date').value : '';
    const endDate = document.getElementById('expense-end-date') ? document.getElementById('expense-end-date').value : '';
    if (startDate && endDate) {
      await window.searchExpensesByRange();
    }
  } catch (error) {
    console.error('지출 수정 오류:', error);
    alert('지출 수정 중 오류: ' + error.message);
  }
}

// 지출 수정 모달 닫기
window.closeExpenseEditModal = function() {
  const modal = document.querySelector('.expense-edit-modal');
  if (modal) {
    modal.remove();
  }
};

// 지출 삭제
window.deleteExpense = async function(expenseId) {
  const currentExpenses = getCurrentExpensesList();
  const expense = currentExpenses.find(exp => exp.id === expenseId);
  
  if (!expense) {
    alert('지출 내역을 찾을 수 없습니다.');
    return;
  }
  
  const userInfo = window.getCurrentUserInfo ? window.getCurrentUserInfo() : {};
  const isAdmin = window.isCurrentUserAdmin ? window.isCurrentUserAdmin() : false;
  const isOwner = expense.createdBy === (userInfo.email || '');
  
  if (!isAdmin && !isOwner) {
    alert('삭제 권한이 없습니다. (관리자 또는 등록자만 삭제 가능)');
    return;
  }
  
  if (!confirm(`이 지출 내역을 삭제하시겠습니까?\n\n${expense.category}: ${(expense.amount || 0).toLocaleString()}원`)) {
    return;
  }
  
  try {
    await deleteDoc(doc(db, "company_expenses", expenseId));
    alert('지출 내역이 삭제되었습니다.');
    
    await loadInitialData();
    
    const startDate = document.getElementById('expense-start-date') ? document.getElementById('expense-start-date').value : '';
    const endDate = document.getElementById('expense-end-date') ? document.getElementById('expense-end-date').value : '';
    if (startDate && endDate) {
      await window.searchExpensesByRange();
    }
  } catch (error) {
    console.error('지출 삭제 오류:', error);
    alert('지출 삭제 중 오류가 발생했습니다.');
  }
};

// 날짜 포맷팅
function formatDate(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    return '';
  }
}

// HTML 템플릿
function getCompanyFundsHTML() {
  const userInfo = window.getCurrentUserInfo ? window.getCurrentUserInfo() : {};
  const isAdmin = window.isCurrentUserAdmin ? window.isCurrentUserAdmin() : false;
  
  return `
    <div class="company-funds-container">
      <div class="funds-header">
        <div class="funds-info">
          <h3>💰 현재 회사자금</h3>
          <div class="funds-amount positive" id="current-funds-amount">계산중...</div>
          ${!initialFundsSet && isAdmin ? '<button id="set-initial-funds-btn" class="set-funds-btn">초기 자금 설정</button>' : ''}
        </div>
        <div class="monthly-info">
          <h4>📊 이번달 지출</h4>
          <div class="monthly-amount" id="monthly-total">0원</div>
        </div>
      </div>
      
      <div class="category-summary-section">
        <h4>📈 카테고리별 지출 현황</h4>
        <div class="category-summary" id="category-summary">로딩중...</div>
      </div>
      
      <div class="expense-form-section">
        <h4>💸 지출 등록</h4>
        <form id="expense-form" class="expense-form">
          <div class="form-row">
            <input type="date" name="date" required value="${new Date().toISOString().split('T')[0]}">
            <select name="category" id="expense-category" required>
              <option value="">카테고리 선택</option>
              ${Object.entries(EXPENSE_CATEGORIES).map(([category, info]) => {
                const canUse = isAdmin || info.allowWorker;
                return `<option value="${category}" ${!canUse ? 'disabled' : ''}>${info.icon} ${category}${!canUse ? ' (권한없음)' : ''}</option>`;
              }).join('')}
            </select>
          </div>
          
          <div class="form-row">
            <input type="number" name="amount" placeholder="금액 (원)" min="1" required>
            <select name="paymentMethod" required>
              <option value="">결제방법</option>
              ${PAYMENT_METHODS.map(method => `<option value="${method}">${method}</option>`).join('')}
            </select>
          </div>
          
          <input type="text" name="note" placeholder="비고 (선택사항)" class="full-width">
          <button type="submit" class="submit-btn">💰 지출 등록</button>
        </form>
      </div>
      
      <div class="expenses-history-section">
        <div class="history-header">
          <h4>📋 지출 내역 검색</h4>
          <div class="date-range-filter">
            <input type="date" id="expense-start-date" class="filter-input">
            <span class="date-separator">~</span>
            <input type="date" id="expense-end-date" class="filter-input">
            <button onclick="searchExpensesByRange()" class="filter-btn">🔍 검색</button>
          </div>
        </div>
        
        <div class="expenses-list-container">
          <div class="expenses-list" id="expenses-list">
            <div class="no-data">📅 기간을 선택하고 검색 버튼을 클릭해주세요.</div>
          </div>
        </div>
      </div>
    </div>
    
    <style>
      .company-funds-container {
        max-width: 1000px;
        margin: 0 auto;
        padding: 20px;
      }
      
      .funds-header {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 30px;
        margin-bottom: 30px;
        background: white;
        padding: 25px;
        border-radius: 15px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.08);
      }
      
      .funds-info h3, .monthly-info h4 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 1.2rem;
      }
      
      .funds-amount {
        font-size: 2.5rem;
        font-weight: 800;
        margin-bottom: 10px;
      }
      
      .funds-amount.positive { color: #28a745; }
      .funds-amount.negative { color: #dc3545; }
      
      .monthly-amount {
        font-size: 1.8rem;
        font-weight: 600;
        color: #dc3545;
      }
      
      .set-funds-btn {
        background: #ffc107;
        color: #333;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
      }
      
      .category-summary-section,
      .expense-form-section,
      .expenses-history-section {
        background: white;
        padding: 25px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        margin-bottom: 20px;
      }
      
      .category-summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
      }
      
      .category-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 10px;
        border-left: 4px solid #219ebc;
      }
      
      .category-icon { font-size: 1.2rem; }
      .category-name { flex: 1; font-weight: 600; }
      .category-amount { font-weight: 700; color: #dc3545; }
      
      .expense-form {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }
      
      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
      }
      
      .expense-form input,
      .expense-form select {
        padding: 12px;
        border: 2px solid #ddd;
        border-radius: 8px;
        font-size: 16px;
      }
      
      .full-width { grid-column: 1 / -1; }
      
      .submit-btn {
        background: #28a745;
        color: white;
        border: none;
        padding: 15px;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .submit-btn:hover {
        background: #218838;
        transform: translateY(-2px);
      }
      
      .submit-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
        transform: none;
      }
      
      .history-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid #e6e6e6;
      }
      
      .history-header h4 {
        margin: 0;
        color: #333;
        font-size: 1.2rem;
      }
      
      .date-range-filter {
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
      }
      
      .filter-input {
        padding: 8px 12px;
        border: 2px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        min-width: 140px;
      }
      
      .filter-input:focus {
        border-color: #8ecae6;
        outline: none;
      }
      
      .date-separator {
        font-weight: 600;
        color: #666;
        margin: 0 5px;
      }
      
      .filter-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        background: #219ebc;
        color: white;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 14px;
      }
      
      .filter-btn:hover {
        background: #1a7a96;
        transform: translateY(-1px);
      }
      
      .expenses-list-container {
        background: #f8f9fa;
        border-radius: 8px;
        min-height: 300px;
        overflow: hidden;
      }
      
      .expenses-list {
        max-height: 500px;
        overflow-y: auto;
        padding: 10px;
      }
      
      .no-data {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: #666;
        font-style: italic;
        font-size: 16px;
        text-align: center;
      }
      
      .expense-item {
        background: white;
        border: 1px solid #e6e6e6;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 10px;
        transition: all 0.2s ease;
        position: relative;
      }
      
      .expense-item.editable {
        cursor: pointer;
      }
      
      .expense-item.editable:hover {
        border-color: #8ecae6;
        box-shadow: 0 4px 12px rgba(33,158,188,0.15);
        background: #f8fdff;
      }
      
      .expense-item:hover {
        border-color: #8ecae6;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      }
      
      .expense-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      
      .expense-category {
        font-weight: 600;
        color: #333;
      }
      
      .expense-date {
        font-weight: 600;
        color: #219ebc;
        font-size: 14px;
      }
      
      .expense-amount {
        font-weight: 700;
        color: #dc3545;
        font-size: 16px;
      }
      
      .expense-details {
        display: flex;
        gap: 15px;
        font-size: 14px;
        color: #666;
        flex-wrap: wrap;
      }
      
      .payment-method {
        background: #e3f2fd;
        color: #1565c0;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
      }
      
      .expense-note {
        background: #f1f3f4;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
      }
      
      .created-by {
        font-size: 12px;
        color: #888;
      }
      
      .edit-hint {
        color: #219ebc;
        font-size: 11px;
        font-weight: 600;
        background: #e3f2fd;
        padding: 2px 6px;
        border-radius: 8px;
      }
      
      .expense-actions {
        position: absolute;
        top: 10px;
        right: 10px;
        display: flex;
        gap: 5px;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      
      .expense-item:hover .expense-actions {
        opacity: 1;
      }
      
      .edit-btn, .delete-btn {
        background: none;
        border: none;
        font-size: 14px;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s ease;
      }
      
      .edit-btn:hover {
        background: rgba(255, 193, 7, 0.2);
      }
      
      .delete-btn:hover {
        background: rgba(220, 53, 69, 0.2);
      }
      
      /* 모달 스타일 */
      .initial-funds-modal,
      .expense-edit-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1000;
      }
      
      .modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
      }
      
      .modal-content {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px;
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        min-width: 400px;
        max-width: 90%;
        max-height: 90%;
        overflow-y: auto;
      }
      
      .modal-content h3 {
        margin: 0 0 10px 0;
        color: #333;
      }
      
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid #e6e6e6;
      }
      
      .modal-header h3 {
        margin: 0;
        color: #333;
      }
      
      .close-btn {
        background: none;
        border: none;
        font-size: 16px;
        cursor: pointer;
        padding: 5px;
      }
      
      .expense-edit-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      
      .expense-edit-form .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
      }
      
      .expense-edit-form .form-group {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      
      .expense-edit-form .form-group.full-width {
        grid-column: 1 / -1;
      }
      
      .expense-edit-form label {
        font-weight: 600;
        color: #333;
        font-size: 14px;
      }
      
      .expense-edit-form input,
      .expense-edit-form select,
      .expense-edit-form textarea {
        padding: 12px;
        border: 2px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        transition: border-color 0.2s ease;
      }
      
      .expense-edit-form input:focus,
      .expense-edit-form select:focus,
      .expense-edit-form textarea:focus {
        outline: none;
        border-color: #8ecae6;
        box-shadow: 0 0 0 3px rgba(142, 202, 230, 0.15);
      }
      
      .modal-buttons {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 20px;
      }
      
      .cancel-btn, .save-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .cancel-btn {
        background: #6c757d;
        color: white;
      }
      
      .save-btn {
        background: #28a745;
        color: white;
      }
      
      .cancel-btn:hover {
        background: #5a6268;
      }
      
      .save-btn:hover {
        background: #218838;
      }
      
      .save-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
      
      /* 모바일 반응형 */
      @media (max-width: 768px) {
        .company-funds-container {
          padding: 15px;
        }
        
        .funds-header {
          grid-template-columns: 1fr;
          gap: 20px;
        }
        
        .funds-amount {
          font-size: 2rem;
        }
        
        .monthly-amount {
          font-size: 1.4rem;
        }
        
        .form-row {
          grid-template-columns: 1fr;
        }
        
        .category-summary {
          grid-template-columns: 1fr;
        }
        
        .history-header {
          flex-direction: column;
          gap: 15px;
          align-items: stretch;
        }
        
        .date-range-filter {
          justify-content: space-between;
          gap: 8px;
        }
        
        .filter-input {
          min-width: 120px;
          flex: 1;
        }
        
        .filter-btn {
          min-width: 80px;
        }
        
        .expense-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 5px;
        }
        
        .expense-details {
          flex-direction: column;
          gap: 5px;
        }
        
        .modal-content {
          min-width: 300px;
          padding: 20px;
        }
        
        .expense-edit-form .form-row {
          grid-template-columns: 1fr;
        }
        
        .expense-actions {
          position: static;
          opacity: 1;
          justify-content: flex-end;
          margin-top: 10px;
        }
      }
    </style>
  `;
}