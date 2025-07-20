// components/task-item.js

let selectedParts = []; // 선택된 부품 배열

export function renderItemsInput(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // required 속성 제거
  container.innerHTML = `
    <input type="text" name="items" placeholder="작업 내용을 입력하세요">
  `;

  // 부품 입력 섹션
  const partsContainer = document.getElementById('parts-input');
  if (partsContainer) {
    partsContainer.innerHTML = `
      <div style="display: flex; gap: 5px;">
        <select id="parts-select" style="flex: 1; margin: 0;">
          <option value="">부품 선택</option>
          ${window.PARTS_LIST ? window.PARTS_LIST.map(part => 
            `<option value="${part.name}" data-price="${part.price}">${part.name}</option>`
          ).join('') : ''}
        </select>
        <input type="number" id="parts-quantity" placeholder="수량" min="1" value="1" style="flex: 1; margin: 0;">
        <button type="button" onclick="addSelectedPart()" style="flex: 1; margin: 0;">추가</button>
      </div>
      <div id="selected-parts-display" style="margin-top: 10px;"></div>
      <textarea name="parts" placeholder="사용 부품" style="margin-top: 5px; display: none;"></textarea>
    `;
    
    // 기존 데이터가 있다면 로드
    updatePartsDisplay();
  }
}

// 부품 추가 함수
window.addSelectedPart = function() {
  const select = document.getElementById('parts-select');
  const quantityInput = document.getElementById('parts-quantity');
  
  if (!select || !quantityInput) return;
  
  const partName = select.value;
  const quantity = parseInt(quantityInput.value) || 1;
  const price = parseFloat(select.options[select.selectedIndex].dataset.price) || 0;
  
  if (!partName) {
    alert('부품을 선택해주세요.');
    return;
  }
  
  // 이미 있는 부품인지 확인
  const existingIndex = selectedParts.findIndex(p => p.name === partName);
  if (existingIndex >= 0) {
    selectedParts[existingIndex].quantity += quantity;
  } else {
    selectedParts.push({
      name: partName,
      quantity: quantity,
      price: price
    });
  }
  
  updatePartsDisplay();
  
  // 입력 초기화
  select.value = '';
  quantityInput.value = '1';
};

// 부품 삭제 함수
window.removePart = function(index) {
  selectedParts.splice(index, 1);
  updatePartsDisplay();
};

// 부품 표시 업데이트
function updatePartsDisplay() {
  const displayContainer = document.getElementById('selected-parts-display');
  const hiddenTextarea = document.querySelector('[name="parts"]');
  
  if (!displayContainer) return;
  
  if (selectedParts.length === 0) {
    displayContainer.innerHTML = '';
    if (hiddenTextarea) hiddenTextarea.value = '';
    return;
  }
  
  // 개별 부품 객체들 표시
  let html = '';
  selectedParts.forEach((part, index) => {
    html += `
      <div style="
        display: inline-flex; 
        align-items: center; 
        background: #f0f8ff; 
        border: 1px solid #8ecae6; 
        border-radius: 20px; 
        padding: 5px 10px; 
        margin: 3px; 
        font-size: 14px;
      ">
        <span>${part.name} (${part.quantity}개)</span>
        <button type="button" onclick="removePart(${index})" style="
          background: #e63946; 
          color: white; 
          border: none; 
          border-radius: 50%; 
          width: 18px; 
          height: 18px; 
          margin-left: 8px; 
          cursor: pointer; 
          font-size: 12px; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          padding: 0;
          margin: 0 0 0 8px;
        ">×</button>
      </div>
    `;
  });
  
  displayContainer.innerHTML = html;
  
  // 숨겨진 textarea에 JSON 형태로 저장
  if (hiddenTextarea) {
    hiddenTextarea.value = JSON.stringify(selectedParts);
  }
}

// 기존 부품 데이터 로드 (편집 시 사용)
window.loadExistingParts = function(partsData) {
  selectedParts = [];
  
  if (!partsData) return;
  
  try {
    if (typeof partsData === 'string') {
      // JSON 파싱 시도
      try {
        const parsed = JSON.parse(partsData);
        if (Array.isArray(parsed)) {
          selectedParts = parsed;
        } else {
          // 기존 텍스트 형태 파싱 "CT60 (1개), WB70 (1개)"
          const parts = partsData.split(',').map(part => {
            const match = part.trim().match(/^(.+?)\s*\((\d+)개\)$/);
            if (match) {
              return {
                name: match[1].trim(),
                quantity: parseInt(match[2]),
                price: 0
              };
            }
            return { name: part.trim(), quantity: 1, price: 0 };
          });
          selectedParts = parts.filter(p => p.name);
        }
      } catch (e) {
        // JSON이 아닌 기존 텍스트 형태
        const parts = partsData.split(',').map(part => {
          const match = part.trim().match(/^(.+?)\s*\((\d+)개\)$/);
          if (match) {
            return {
              name: match[1].trim(),
              quantity: parseInt(match[2]),
              price: 0
            };
          }
          return { name: part.trim(), quantity: 1, price: 0 };
        });
        selectedParts = parts.filter(p => p.name);
      }
    } else if (Array.isArray(partsData)) {
      selectedParts = partsData;
    }
  } catch (e) {
    console.error('부품 데이터 로드 오류:', e);
  }
  
  updatePartsDisplay();
};