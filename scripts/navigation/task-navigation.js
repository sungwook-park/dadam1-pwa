// scripts/navigation/task-navigation.js - 탭 네비게이션 관련 함수들

import { isCurrentUserAdmin } from '../utils/task-utils.js';
import { loadTodayTasks, loadReserveTasks, loadDoneTasks } from '../loaders/task-loaders.js';
import { loadSettlement } from '../settle.js';
import { getTaskSubTabsHTML, getTaskInputFormHTML } from '../templates/task-templates.js';
import { getNowYYYYMMDDHHMM } from '../utils/date-utils.js';
import { renderItemsInput } from '../components/task-item.js';
import { calculateFee, updateSelectedWorkers } from '../utils/task-utils.js';

// 메인 탭 관리 (관리자만)
export function openTab(name) {
  // 관리자가 아니면 탭 이동 불가
  if (!isCurrentUserAdmin()) {
    console.log('작업자는 탭 이동 불가');
    return;
  }
  
  document.getElementById('home-buttons').style.display = 'none';
  document.getElementById('tab-content').style.display = 'block';
  
  // 탭 제목을 박스 스타일로 설정
  const tabTitleElement = document.getElementById('tab-title');
  let titleText = '';
  let titleIcon = '';

  if (name === 'task') {
    titleText = '작업지시';
    titleIcon = `<div style="
      display: inline-block;
      width: 36px;
      height: 36px;
      border: 2.5px solid currentColor;
      border-radius: 6px;
      position: relative;
      vertical-align: middle;
      margin-right: 8px;
    ">
      <div style="position: absolute; top: 6px; left: 6px; right: 6px; height: 2.5px; background: currentColor; border-radius: 1px;"></div>
      <div style="position: absolute; top: 13px; left: 6px; right: 6px; height: 2.5px; background: currentColor; border-radius: 1px;"></div>
      <div style="position: absolute; top: 20px; left: 6px; right: 6px; height: 2.5px; background: currentColor; border-radius: 1px;"></div>
      <div style="position: absolute; top: 8px; left: 8px; width: 4px; height: 2px; border: solid currentColor; border-width: 0 0 2px 2px; transform: rotate(-45deg);"></div>
      <div style="position: absolute; top: 15px; left: 8px; width: 4px; height: 2px; border: solid currentColor; border-width: 0 0 2px 2px; transform: rotate(-45deg);"></div>
      <div style="position: absolute; top: 22px; left: 8px; width: 4px; height: 2px; border: solid currentColor; border-width: 0 0 2px 2px; transform: rotate(-45deg);"></div>
    </div>`;
  } else if (name === 'reserve') {
    titleText = '예약';
    titleIcon = `<div style="
      display: inline-block;
      width: 36px;
      height: 36px;
      border: 2.5px solid currentColor;
      border-radius: 6px;
      position: relative;
      vertical-align: middle;
      margin-right: 8px;
    ">
      <div style="position: absolute; top: -4px; left: 8px; right: 8px; height: 2.5px; background: currentColor; border-radius: 1px;"></div>
      <div style="position: absolute; top: 10px; left: 6px; width: 3px; height: 3px; background: currentColor; border-radius: 50%;"></div>
      <div style="position: absolute; top: 10px; left: 14px; width: 3px; height: 3px; background: currentColor; border-radius: 50%;"></div>
      <div style="position: absolute; top: 10px; left: 22px; width: 3px; height: 3px; background: currentColor; border-radius: 50%;"></div>
      <div style="position: absolute; top: 18px; left: 6px; width: 3px; height: 3px; background: currentColor; border-radius: 50%;"></div>
      <div style="position: absolute; top: 18px; left: 14px; width: 3px; height: 3px; background: currentColor; border-radius: 50%;"></div>
      <div style="position: absolute; top: 18px; left: 22px; width: 3px; height: 3px; background: currentColor; border-radius: 50%;"></div>
    </div>`;
  } else if (name === 'settle') {
    titleText = '정산';
    titleIcon = `<div style="
      display: inline-block;
      width: 36px;
      height: 36px;
      border: 2.5px solid currentColor;
      border-radius: 6px;
      position: relative;
      vertical-align: middle;
      margin-right: 8px;
    ">
      <div style="position: absolute; top: 4px; left: 4px; right: 4px; height: 6px; border: 2px solid currentColor; border-radius: 2px;"></div>
      <div style="position: absolute; bottom: 8px; left: 6px; width: 2px; height: 2px; background: currentColor; border-radius: 50%;"></div>
      <div style="position: absolute; bottom: 8px; left: 12px; width: 2px; height: 2px; background: currentColor; border-radius: 50%;"></div>
      <div style="position: absolute; bottom: 8px; left: 18px; width: 2px; height: 2px; background: currentColor; border-radius: 50%;"></div>
      <div style="position: absolute; bottom: 14px; left: 6px; width: 2px; height: 2px; background: currentColor; border-radius: 50%;"></div>
      <div style="position: absolute; bottom: 14px; left: 12px; width: 2px; height: 2px; background: currentColor; border-radius: 50%;"></div>
      <div style="position: absolute; bottom: 14px; left: 18px; width: 2px; height: 2px; background: currentColor; border-radius: 50%;"></div>
    </div>`;
  } else if (name === 'company-funds') {
    titleText = '회사운영비';
    titleIcon = `<div style="
      display: inline-block;
      width: 36px;
      height: 36px;
      border: 2.5px solid currentColor;
      border-radius: 6px;
      position: relative;
      vertical-align: middle;
      margin-right: 8px;
    ">
      <div style="position: absolute; top: 8px; right: -3px; width: 8px; height: 12px; border: 2.5px solid currentColor; border-left: none; border-radius: 0 4px 4px 0;"></div>
      <div style="position: absolute; top: 6px; left: 4px; right: 4px; height: 2px; background: currentColor; border-radius: 1px;"></div>
      <div style="position: absolute; top: 11px; left: 4px; right: 4px; height: 2px; background: currentColor; border-radius: 1px;"></div>
      <div style="position: absolute; top: 16px; left: 4px; right: 4px; height: 2px; background: currentColor; border-radius: 1px;"></div>
    </div>`;
  } else if (name === 'inventory') {
    titleText = '입출고';
    titleIcon = `<div style="
      display: inline-block;
      width: 36px;
      height: 36px;
      border: 2.5px solid currentColor;
      border-radius: 6px;
      position: relative;
      vertical-align: middle;
      margin-right: 8px;
    ">
      <div style="position: absolute; top: -3px; left: 8px; right: 8px; height: 8px; border: 2.5px solid currentColor; border-bottom: none; border-radius: 4px 4px 0 0;"></div>
      <div style="position: absolute; top: 12px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border: 4px solid transparent; border-top: 4px solid currentColor;"></div>
    </div>`;
  } else if (name === 'print-workorder') {
    titleText = '작업지시서 인쇄';
    titleIcon = `<div style="
      display: inline-block;
      width: 36px;
      height: 36px;
      border: 2.5px solid currentColor;
      border-radius: 6px;
      position: relative;
      vertical-align: middle;
      margin-right: 8px;
    ">
      <div style="position: absolute; top: -4px; left: 6px; right: 6px; height: 6px; border: 2.5px solid currentColor; border-bottom: none; border-radius: 3px 3px 0 0;"></div>
      <div style="position: absolute; bottom: -4px; left: 6px; right: 6px; height: 8px; border: 2.5px solid currentColor; border-top: none; border-radius: 0 0 3px 3px;"></div>
    </div>`;
  } else if (name === 'holiday') {
    titleText = '휴무관리';
    titleIcon = `<div style="
      display: inline-block;
      width: 36px;
      height: 36px;
      border: 2.5px solid currentColor;
      border-radius: 6px;
      position: relative;
      vertical-align: middle;
      margin-right: 8px;
    ">
      <div style="position: absolute; top: -4px; left: 8px; right: 8px; height: 2.5px; background: currentColor; border-radius: 1px;"></div>
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 12px; height: 12px; border: 2.5px solid currentColor; border-radius: 50%;"></div>
    </div>`;
  }
  
  // 박스 스타일로 제목 설정
  tabTitleElement.innerHTML = `
    <div style="
      background: white;
      padding: 20px 25px;
      border-radius: 12px;
      margin-bottom: 25px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      text-align: center;
      border-left: 4px solid #8ecae6;
    ">
      <h3 style="
        margin: 0;
        font-size: 1.4rem;
        color: #333;
        font-weight: 600;
      ">${titleIcon} ${titleText}</h3>
    </div>
  `;
  
  if (name === 'task') showTaskTab('check');
  else if (name === 'reserve') loadReserveTasks();
  else if (name === 'settle') {
    document.getElementById('tab-body').innerHTML = '<div id="settle-result"></div>';
    loadSettlement();
  } else if (name === 'inventory') {
    // 입출고 관리 로드
    if (window.loadInventoryManagement) {
      window.loadInventoryManagement();
    } else {
      console.error('입출고 관리 모듈을 찾을 수 없습니다.');
      document.getElementById('tab-body').innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">입출고 관리 모듈을 로드할 수 없습니다.</div>';
    }
  }
}

// 홈으로 돌아가기 (관리자만)
export function backToHome() {
  if (!isCurrentUserAdmin()) {
    console.log('작업자는 홈 이동 불가');
    return;
  }
  
  document.getElementById('tab-content').style.display = 'none';
  document.getElementById('home-buttons').style.display = 'grid';
  
  // 편집 상태 초기화
  window.editingTaskId = null;
  window.editingTabType = null;
}

// 작업 탭 표시 (관리자만)
export function showTaskTab(type) {
  if (!isCurrentUserAdmin()) {
    console.log('작업자는 작업 입력 탭 접근 불가');
    return;
  }
  
  const body = document.getElementById('tab-body');
  const subTabs = getTaskSubTabsHTML(type);
  
  if (type === 'input') {
    // 부품 데이터 즉시 강력 초기화 (HTML 생성 전)
    console.log('작업입력탭 - 부품 데이터 즉시 강력 초기화');
    
    // 전역 변수 즉시 초기화
    window.selectedParts = [];
    window.parts = [];
    window.currentParts = [];
    if (window.inventoryItems) window.inventoryItems = [];
    if (window.selectedItems) window.selectedItems = [];
    if (window.inventoryData) window.inventoryData = [];
    
    console.log('전역 변수 즉시 초기화 완료');
    
    // HTML 생성
    body.innerHTML = `
      ${subTabs}
      ${getTaskInputFormHTML(getNowYYYYMMDDHHMM())}
    `;
    
    // HTML 생성 직후 즉시 DOM 초기화
    const clearAllPartsDOM = () => {
      // 모든 부품 관련 요소 찾기 및 초기화
      document.querySelectorAll('[name="parts"]').forEach(el => el.value = '');
      document.querySelectorAll('#selected-parts-display').forEach(el => el.innerHTML = '');
      document.querySelectorAll('.inventory-item').forEach(el => el.remove());
      document.querySelectorAll('.added-part-item').forEach(el => el.remove());
      document.querySelectorAll('input[type="checkbox"][data-part-id]').forEach(el => el.checked = false);
      
      // 전역 변수 재확인
      window.selectedParts = [];
      window.parts = [];
      window.currentParts = [];
      
      console.log('DOM 요소 즉시 초기화 완료');
    };
    
    // 즉시 실행
    clearAllPartsDOM();
    
    // 부품 입력 렌더링
    renderItemsInput('items-input');
    
    // 렌더링 후 추가 초기화
    setTimeout(() => {
      console.log('렌더링 후 추가 초기화');
      clearAllPartsDOM();
      
      // 이벤트 리스너 설정
      const clientInput = document.getElementById('client-input');
      const amountInput = document.getElementById('amount-input');
      
      if (clientInput) {
        clientInput.addEventListener('input', calculateFee);
        clientInput.addEventListener('blur', calculateFee);
      }
      if (amountInput) {
        amountInput.addEventListener('input', calculateFee);
      }
      
      const workerCheckboxes = document.querySelectorAll('input[name="worker"][type="checkbox"]');
      workerCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectedWorkers);
      });
      
      console.log('이벤트 리스너 설정 완료');
    }, 100);
    
    // 한 번 더 확인 (300ms 후)
    setTimeout(() => {
      clearAllPartsDOM();
      console.log('최종 확인 초기화 완료');
    }, 300);
    
  } else if (type === 'check') {
    loadTodayTasks();
  } else if (type === 'done') {
    loadDoneTasks();
  }
}