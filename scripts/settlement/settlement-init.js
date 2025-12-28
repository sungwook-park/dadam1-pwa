// scripts/settlement/settlement-init.js
// 정산 시스템 초기화 및 이벤트 바인딩

import { loadSettlement } from './settlement-main.js';

/**
 * 정산 시스템 초기화
 * 이 함수는 정산 탭이 열릴 때 호출됩니다
 */
export function initSettlement() {
  console.log('🎬 정산 시스템 초기화...');
  
  // 정산 버튼 이벤트 바인딩 (main.js에서 이미 처리됨)
  // 여기서는 추가적인 초기화만 수행
  
  // 정산 시스템 로드
  loadSettlement();
}

/**
 * DOM이 로드된 후 초기화
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM 로드 완료 - 정산 시스템 대기 중...');
  
  // 정산 버튼이 클릭되면 initSettlement가 호출됨
  // (main.js에서 처리)
});

// 전역으로 export
window.initSettlement = initSettlement;
