// scripts/parts-list.js (ES6 모듈)

export const PARTS_LIST = [
  {name: 'CT60', price: 12500},
  {name: 'W-60', price: 18700},        // ⭐️ 새로 추가된 부품
  {name: 'W-60T', price: 27500},
  {name: 'WB60', price: 35000},
  {name: 'WB70', price: 40000},
  {name: 'LW221(32인치용)', price: 11000},
  {name: 'LPA-696', price: 110000},
  {name: 'DN60', price: 65000},
  {name: 'DN85', price: 90000},
  {name: 'DN110', price: 100000},
  {name: 'DN140', price: 120000},
  {name: '사운드바', price: 20000},
  {name: '가벽키트', price: 20000},
  {name: '하부커버40', price: 20000},
  {name: '하부커버85', price: 30000},
  {name: '정품', price: 100000},
  
];

// 부품명만 필요한 곳을 위한 배열
export const PARTS_NAMES = PARTS_LIST.map(item => item.name);

// 기존 전역 변수와의 호환성을 위해 window에도 등록
window.PARTS_LIST = PARTS_LIST;

window.PARTS_NAMES = PARTS_NAMES;
