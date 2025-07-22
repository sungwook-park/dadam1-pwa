// scripts/company-funds.js - 회사운영비 관리 시스템 (완전한 디버그 버전)

console.log('💰 company-funds.js 로드 시작');

import { db } from './firebase-config.js';
import {
  collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc,
  orderBy, Timestamp, writeBatch, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

console.log('✅ Firebase 모듈 임포트 완료');

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

// 결제 방법 정의
const PAYMENT_METHODS = ['현금', '카드', '계좌이체', '기타'];

// 전역 변수
let currentFunds = 0;
let monthlyExpenses = [];
let initialFundsSet = false;

// 회사운영비 메인 로드 함수
window.loadCompanyFunds = async function() {
  console.log('💰 회사운영비 관리 로드 시작');
  
  try {
    // Firebase 연결 확인
    if (!db) {
      console.error('❌ Firebase DB가 연결되지 않았습니다.');
      showError('데이터베이스 연결 오류');
      return;
    }
    console.log('✅ Firebase DB 연결 확인됨');
    
    const tabBody = document.getElementById('tab-body');
    if (!tabBody) {
      console.error('❌ tab-body 요소를 찾을 수 없습니다.');
      return;
    }
    console.log('✅ tab-body 요소 찾음');
    
    // HTML 삽입
    tabBody.innerHTML = getCompanyFundsHTML();
    console.log('✅ HTML 삽입 완료');
    
    // 데이터 로드
    await loadInitialData();
    
    // 이벤트 리스너 설정
    setupEventListeners();
    
    console.log('✅ 회사운영비 로드 완료');
    
  } catch (error) {
    console.error('❌ 회사운영비 로드 오류:', error);
    showError('회사운영비 로드 중 오류가 발생했습니다: ' + error.message);
  }
};

// 초기 데이터 로드
async function loadInitialData() {
  try {
    console.log('📊 회사운영비 데이터 로드 시작');
    
    // 초기 자금 설정 확인
    await checkInitialFunds();
    
    // 현재 회사자금 계산
    await calculateCurrentFunds();
    
    // 이번달 지출 로드
    await loadMonthlyExpenses();
    
    // UI 업데이트
    updateFundsDisplay();
    updateExpensesList();
    
    console.log('✅ 회사운영비 데이터 로드 완료');
    
  } catch (error) {
    console.error('❌ 데이터 로드 오류:', error);
    showError('데이터를 불러오는 중 오류가 발생했습니다: ' + error.message);
  }
}

// 초기 자금 설정 확인
async function checkInitialFunds() {
  try {
    console.log('💰 초기 자금 설정 확인 중...');
    
    const fundsDoc = await getDoc(doc(db, "company_settings", "initial_funds"));
    
    if (fundsDoc.exists()) {
      const data = fundsDoc.data();
      initialFundsSet = true;
      console.log('💰 초기 자금 설정됨:', data.amount?.toLocaleString() + '원');
    } else {
      initialFundsSet = false;
      console.log('⚠️ 초기 자금 미설정 - 모달 표시');
      
      // 잠깐 기다린 후 모달 표시
      setTimeout(() => {
        showInitialFundsModal();
      }, 1000);
    }
  } catch (error) {
    console.error('❌ 초기 자금 확인 오류:', error);
    showError('초기 자금 확인 중 오류: ' + error.message);
  }
}

// 현재 회사자금 계산
async function calculateCurrentFunds() {
  try {
    console.log('💰 현재 회사자금 계산 시작');
    
    let totalFunds = 0;
    
    // 1. 초기 자금
    const initialDoc = await getDoc(doc(db, "company_settings", "initial_funds"));
    if (initialDoc.exists()) {
      totalFunds += initialDoc.data().amount || 0;
      console.log('💰 초기 자금:', (initialDoc.data().amount || 0).toLocaleString() + '원');
    }
    
    // 2. 정산에서 회사자금 몫 (순이익의 20%)
    const completedTasksQuery = query(
      collection(db, "tasks"),
      where("done", "==", true)
    );
    
    const tasksSnapshot = await getDocs(completedTasksQuery);
    let totalCompanyShare = 0;
    
    tasksSnapshot.forEach(docSnapshot => {
      const task = docSnapshot.data();
      const amount = task.amount || 0;
      const partSpend = calculatePartsSpend(task.parts);
      const fee = calculateFee(task.client, amount, task.fee); // 수정된 함수 사용
      const profit = amount - partSpend - fee;
      const companyShare = Math.round(profit * 0.2); // 순이익의 20%만
      totalCompanyShare += companyShare;
    });
    
    totalFunds += totalCompanyShare;
    console.log('💰 회사자금 몫 (순이익):', totalCompanyShare.toLocaleString() + '원');
    
    // 3. 운영비 지출 차감
    const expensesQuery = query(collection(db, "company_expenses"));
    const expensesSnapshot = await getDocs(expensesQuery);
    let totalExpenses = 0;
    
    expensesSnapshot.forEach(docSnapshot => {
      const expense = docSnapshot.data();
      totalExpenses += expense.amount || 0;
    });
    
    totalFunds -= totalExpenses;
    console.log('💸 총 운영비 지출:', totalExpenses.toLocaleString() + '원');
    
    currentFunds = totalFunds;
    console.log('💰 현재 회사자금:', currentFunds.toLocaleString() + '원');
    
  } catch (error) {
    console.error('❌ 회사자금 계산 오류:', error);
    currentFunds = 0;
  }
}



// 이번달 지출 로드
async function loadMonthlyExpenses() {
  try {
    console.log('📊 이번달 지출 로드 시작');
    
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
    
    console.log('📊 이번달 지출:', monthlyExpenses.length + '건');
    
  } catch (error) {
    console.error('❌ 월별 지출 로드 오류:', error);
    monthlyExpenses = [];
  }
}

// 부품비 계산 (기존 정산 로직 재사용)
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
          
          // 부품 가격 찾기
          const partInfo = window.PARTS_LIST?.find(p => p.name === partName);
          const partPrice = partInfo?.price || 0;
          
          partSpend += partPrice * partCount;
        }
      });
    }
  } catch (error) {
    console.warn('부품비 계산 오류:', error);
  }
  
  return partSpend;
}

// 수수료 계산 (기존 로직 재사용)
function calculateFee(client, amount) {
  if (client && client.includes("공간")) {
    return Math.round(amount * 0.22);
  }
  return 0;
}

// 이벤트 리스너 설정
function setupEventListeners() {
  console.log('🎯 이벤트 리스너 설정 시작');
  
  // 지출 입력 폼 제출
  const expenseForm = document.getElementById('expense-form');
  if (expenseForm) {
    expenseForm.addEventListener('submit', handleExpenseSubmit);
    console.log('✅ 지출 폼 이벤트 리스너 설정');
  }
  
  // 카테고리 변경 시 권한 체크
  const categorySelect = document.getElementById('expense-category');
  if (categorySelect) {
    categorySelect.addEventListener('change', checkCategoryPermission);
    console.log('✅ 카테고리 선택 이벤트 리스너 설정');
  }
  
  // 월별 검색
  const monthFilter = document.getElementById('month-filter');
  if (monthFilter) {
    monthFilter.addEventListener('change', filterByMonth);
    console.log('✅ 월별 필터 이벤트 리스너 설정');
  }
  
  // 초기 자금 설정 버튼
  const setFundsBtn = document.getElementById('set-initial-funds-btn');
  if (setFundsBtn) {
    setFundsBtn.addEventListener('click', showInitialFundsModal);
    console.log('✅ 초기 자금 설정 버튼 이벤트 리스너 설정');
  }
  
  console.log('✅ 이벤트 리스너 설정 완료');
}

// 지출 입력 처리
async function handleExpenseSubmit(event) {
  event.preventDefault();
  console.log('💸 지출 입력 처리 시작');
  
  try {
    const formData = new FormData(event.target);
    const userInfo = window.getCurrentUserInfo();
    
    const expenseData = {
      date: formData.get('date'),
      category: formData.get('category'),
      amount: parseFloat(formData.get('amount')),
      paymentMethod: formData.get('paymentMethod'),
      note: formData.get('note') || '',
      createdBy: userInfo?.email || '',
      createdByName: userInfo?.name || '',
      createdAt: Timestamp.now()
    };
    
    console.log('💸 지출 데이터:', expenseData);
    
    // 유효성 검사
    if (!expenseData.date || !expenseData.category || expenseData.amount <= 0) {
      showError('모든 필수 항목을 입력해주세요.');
      return;
    }
    
    // 권한 검사
    if (!checkUserPermission(expenseData.category)) {
      showError('이 카테고리는 입력 권한이 없습니다.');
      return;
    }
    
    // 저장
    await addDoc(collection(db, "company_expenses"), expenseData);
    
    console.log('✅ 지출 저장 완료:', expenseData);
    showSuccess('지출이 등록되었습니다.');
    
    // 데이터 새로고침
    await loadInitialData();
    
    // 폼 초기화
    event.target.reset();
    
  } catch (error) {
    console.error('❌ 지출 저장 오류:', error);
    showError('지출 저장 중 오류가 발생했습니다: ' + error.message);
  }
}

// 사용자 권한 확인
function checkUserPermission(category) {
  const userInfo = window.getCurrentUserInfo();
  const isAdmin = window.isAdmin && window.isAdmin(userInfo);
  
  if (isAdmin) return true; // 관리자는 모든 카테고리 가능
  
  // 작업자는 특정 카테고리만 가능
  return EXPENSE_CATEGORIES[category]?.allowWorker || false;
}

// 카테고리 권한 체크 UI
function checkCategoryPermission() {
  const categorySelect = document.getElementById('expense-category');
  const submitButton = document.querySelector('#expense-form button[type="submit"]');
  
  if (!categorySelect || !submitButton) return;
  
  const selectedCategory = categorySelect.value;
  const hasPermission = checkUserPermission(selectedCategory);
  
  if (!hasPermission) {
    submitButton.disabled = true;
    submitButton.textContent = '권한 없음';
    submitButton.style.background = '#ccc';
  } else {
    submitButton.disabled = false;
    submitButton.textContent = '💰 지출 등록';
    submitButton.style.background = '#28a745';
  }
}

// 초기 자금 설정 모달 표시
function showInitialFundsModal() {
  console.log('💰 초기 자금 설정 모달 표시');
  
  // 기존 모달 제거
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
  
  // 입력 필드에 포커스
  setTimeout(() => {
    const input = document.getElementById('initial-amount');
    if (input) input.focus();
  }, 100);
  
  console.log('✅ 초기 자금 모달 표시 완료');
}

// 초기 자금 설정 저장
window.saveInitialFunds = async function() {
  console.log('💰 초기 자금 저장 시작');
  
  try {
    const amountInput = document.getElementById('initial-amount');
    const amount = parseFloat(amountInput.value);
    
    if (isNaN(amount) || amount < 0) {
      showError('올바른 금액을 입력해주세요.');
      return;
    }
    
    const userInfo = window.getCurrentUserInfo();
    const fundsData = {
      amount: amount,
      setDate: new Date().toISOString(),
      setBy: userInfo?.email || '',
      setByName: userInfo?.name || ''
    };
    
    await setDoc(doc(db, "company_settings", "initial_funds"), fundsData);
    
    console.log('✅ 초기 자금 설정 완료:', amount.toLocaleString() + '원');
    showSuccess('초기 자금이 설정되었습니다.');
    
    closeInitialFundsModal();
    
    // 데이터 다시 로드
    await loadInitialData();
    
  } catch (error) {
    console.error('❌ 초기 자금 설정 오류:', error);
    showError('초기 자금 설정 중 오류가 발생했습니다: ' + error.message);
  }
};

// 초기 자금 설정 모달 닫기
window.closeInitialFundsModal = function() {
  const modal = document.querySelector('.initial-funds-modal');
  if (modal) {
    modal.remove();
    console.log('💰 초기 자금 모달 닫힘');
  }
};

// 월별 필터링
async function filterByMonth() {
  const monthFilter = document.getElementById('month-filter');
  if (!monthFilter) return;
  
  const selectedMonth = monthFilter.value;
  console.log('📅 월별 필터링:', selectedMonth);
  
  if (!selectedMonth) {
    await loadMonthlyExpenses();
  } else {
    await loadExpensesByMonth(selectedMonth);
  }
  
  updateExpensesList();
}

// 특정 월 지출 로드
async function loadExpensesByMonth(monthString) {
  try {
    const [year, month] = monthString.split('-').map(Number);
    const startOfMonth = new Date(year, month - 1, 1);
    const startOfNextMonth = new Date(year, month, 1);
    
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
    
    console.log(`📊 ${year}년 ${month}월 지출:`, monthlyExpenses.length + '건');
    
  } catch (error) {
    console.error('❌ 월별 지출 로드 오류:', error);
    monthlyExpenses = [];
  }
}

// 자금 현황 표시 업데이트
function updateFundsDisplay() {
  console.log('🖥️ 자금 현황 표시 업데이트');
  
  const fundsAmountElement = document.getElementById('current-funds-amount');
  const monthlyTotalElement = document.getElementById('monthly-total');
  
  if (fundsAmountElement) {
    fundsAmountElement.textContent = currentFunds.toLocaleString() + '원';
    fundsAmountElement.className = 'funds-amount ' + (currentFunds >= 0 ? 'positive' : 'negative');
    console.log('💰 현재 자금 표시 업데이트:', currentFunds.toLocaleString() + '원');
  }
  
  if (monthlyTotalElement) {
    const monthlyTotal = monthlyExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    monthlyTotalElement.textContent = monthlyTotal.toLocaleString() + '원';
    console.log('📊 월별 총액 표시 업데이트:', monthlyTotal.toLocaleString() + '원');
  }
  
  // 카테고리별 집계 업데이트
  updateCategorySummary();
}

// 카테고리별 집계 업데이트
function updateCategorySummary() {
  console.log('📈 카테고리별 집계 업데이트');
  
  const summaryContainer = document.getElementById('category-summary');
  if (!summaryContainer) return;
  
  const categoryTotals = {};
  
  // 카테고리별 합계 계산
  monthlyExpenses.forEach(expense => {
    const category = expense.category;
    if (!categoryTotals[category]) {
      categoryTotals[category] = 0;
    }
    categoryTotals[category] += expense.amount || 0;
  });
  
  // HTML 생성
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
  console.log('✅ 카테고리별 집계 HTML 업데이트 완료');
}

// 지출 목록 업데이트
function updateExpensesList() {
  console.log('📋 지출 목록 업데이트');
  
  const expensesContainer = document.getElementById('expenses-list');
  if (!expensesContainer) return;
  
  if (monthlyExpenses.length === 0) {
    expensesContainer.innerHTML = '<div class="no-data">지출 내역이 없습니다.</div>';
    return;
  }
  
  let expensesHTML = '';
  monthlyExpenses.forEach(expense => {
    const categoryInfo = EXPENSE_CATEGORIES[expense.category] || { icon: '📋' };
    const date = new Date(expense.date);
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
    
    expensesHTML += `
      <div class="expense-item">
        <div class="expense-header">
          <span class="expense-category">
            ${categoryInfo.icon} ${expense.category}
          </span>
          <span class="expense-date">${formattedDate}</span>
          <span class="expense-amount">${expense.amount.toLocaleString()}원</span>
        </div>
        <div class="expense-details">
          <span class="payment-method">${expense.paymentMethod}</span>
          ${expense.note ? `<span class="expense-note">${expense.note}</span>` : ''}
          <span class="created-by">등록: ${expense.createdByName || expense.createdBy}</span>
        </div>
      </div>
    `;
  });
  
  expensesContainer.innerHTML = expensesHTML;
  console.log('✅ 지출 목록 HTML 업데이트 완료');
}

// HTML 템플릿 생성
function getCompanyFundsHTML() {
  console.log('🎨 HTML 템플릿 생성');
  
  const userInfo = window.getCurrentUserInfo();
  const isAdmin = window.isAdmin && window.isAdmin(userInfo);
  
  return `
    <div class="company-funds-container">
      <!-- 자금 현황 헤더 -->
      <div class="funds-header">
        <div class="funds-info">
          <h3>💰 현재 회사자금</h3>
          <div class="funds-amount positive" id="current-funds-amount">계산중...</div>
          ${!initialFundsSet && isAdmin ? `
            <button id="set-initial-funds-btn" class="set-funds-btn">초기 자금 설정</button>
          ` : ''}
        </div>
        <div class="monthly-info">
          <h4>📊 이번달 지출</h4>
          <div class="monthly-amount" id="monthly-total">0원</div>
        </div>
      </div>
      
      <!-- 카테고리별 요약 -->
      <div class="category-summary-section">
        <h4>📈 카테고리별 지출 현황</h4>
        <div class="category-summary" id="category-summary">
          로딩중...
        </div>
      </div>
      
      <!-- 지출 입력 폼 -->
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
      
      <!-- 지출 내역 -->
      <div class="expenses-history-section">
        <div class="history-header">
          <h4>📋 지출 내역</h4>
          <select id="month-filter" class="month-filter">
            <option value="">이번달</option>
            ${generateMonthOptions()}
          </select>
        </div>
        <div class="expenses-list" id="expenses-list">
          로딩중...
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
      
      .funds-amount.positive {
        color: #28a745;
      }
      
      .funds-amount.negative {
        color: #dc3545;
      }
      
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
      
      .category-icon {
        font-size: 1.2rem;
      }
      
      .category-name {
        flex: 1;
        font-weight: 600;
      }
      
      .category-amount {
        font-weight: 700;
        color: #dc3545;
      }
      
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
      
      .full-width {
        grid-column: 1 / -1;
      }
      
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
      }
      
      .month-filter {
        padding: 8px 12px;
        border: 2px solid #ddd;
        border-radius: 8px;
      }
      
      .expenses-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .expense-item {
        border: 1px solid #e9ecef;
        border-radius: 10px;
        padding: 15px;
        transition: all 0.2s ease;
      }
      
      .expense-item:hover {
        border-color: #8ecae6;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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
        color: #666;
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
      }
      
      .payment-method {
        background: #e3f2fd;
        color: #1565c0;
        padding: 2px 8px;
        border-radius: 12px;
      }
      
      .no-data {
        text-align: center;
        padding: 40px;
        color: #666;
        font-style: italic;
      }
      
      /* 초기 자금 설정 모달 */
      .initial-funds-modal {
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
      }
      
      .modal-content h3 {
        margin: 0 0 10px 0;
        color: #333;
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
      }
      
      .cancel-btn {
        background: #6c757d;
        color: white;
      }
      
      .save-btn {
        background: #28a745;
        color: white;
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
      }
    </style>
  `;
}

// 월 옵션 생성 (최근 12개월)
function generateMonthOptions() {
  const options = [];
  const now = new Date();
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const monthString = `${year}-${month}`;
    const displayString = `${year}년 ${month}월`;
    
    options.push(`<option value="${monthString}">${displayString}</option>`);
  }
  
  return options.join('');
}

// 지출 삭제 (관리자만)
window.deleteExpense = async function(expenseId) {
  const userInfo = window.getCurrentUserInfo();
  const isAdmin = window.isAdmin && window.isAdmin(userInfo);
  
  if (!isAdmin) {
    showError('삭제 권한이 없습니다.');
    return;
  }
  
  if (!confirm('이 지출 내역을 삭제하시겠습니까?')) {
    return;
  }
  
  try {
    await deleteDoc(doc(db, "company_expenses", expenseId));
    showSuccess('지출 내역이 삭제되었습니다.');
    await loadInitialData();
  } catch (error) {
    console.error('❌ 지출 삭제 오류:', error);
    showError('지출 삭제 중 오류가 발생했습니다.');
  }
};

// 유틸리티 함수들
function showError(message) {
  console.error('ERROR:', message);
  alert('❌ ' + message);
}

function showSuccess(message) {
  console.log('SUCCESS:', message);
  alert('✅ ' + message);
}

// 전역 함수 등록
window.loadCompanyFunds = loadCompanyFunds;
window.deleteExpense = deleteExpense;

console.log('💰 회사운영비 관리 모듈 로드 완료');