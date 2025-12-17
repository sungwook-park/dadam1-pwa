// components/task-item.js

let selectedParts = []; // 선택된 부품 배열

export async function renderItemsInput(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // required 속성 제거
  container.innerHTML = `
    <input type="text" name="items" placeholder="작업 내용을 입력하세요">
  `;

  // Firebase에서 부품 목록 로드
  let partsListHTML = '<option value="">부품 선택</option>';
  
  try {
    const db = window.db;
    const { getDocs, collection } = window.firebase;
    
    if (db && getDocs) {
      console.log('🔧 Firebase에서 부품 목록 로드 시작...');
      
      // stock 컬렉션에서 부품 목록 조회
      const stockSnapshot = await getDocs(collection(db, "stock"));
      
      const parts = [];
      stockSnapshot.forEach(doc => {
        const data = doc.data();
        parts.push({
          name: data.partName,
          price: data.unitPrice || 0
        });
      });
      
      // 클라이언트에서 정렬
      parts.sort((a, b) => a.name.localeCompare(b.name));
      
      console.log(`✅ Firebase에서 ${parts.length}개 부품 로드 완료`);
      
      // 부품 목록 HTML 생성
      if (parts.length > 0) {
        partsListHTML = '<option value="">부품 선택</option>';
        parts.forEach(part => {
          partsListHTML += `<option value="${part.name}" data-price="${part.price}">${part.name}</option>`;
        });
      } else {
        console.warn('⚠️ Firebase에 등록된 부품이 없습니다. 기본 목록 사용');
        // Firebase에 부품이 없으면 기본 목록 사용
        if (window.PARTS_LIST) {
          partsListHTML = '<option value="">부품 선택</option>';
          window.PARTS_LIST.forEach(part => {
            partsListHTML += `<option value="${part.name}" data-price="${part.price}">${part.name}</option>`;
          });
        }
      }
    } else {
      console.warn('⚠️ Firebase 미초기화. 기본 부품 목록 사용');
      // Firebase 미초기화 시 기본 목록 사용
      if (window.PARTS_LIST) {
        partsListHTML = '<option value="">부품 선택</option>';
        window.PARTS_LIST.forEach(part => {
          partsListHTML += `<option value="${part.name}" data-price="${part.price}">${part.name}</option>`;
        });
      }
    }
  } catch (error) {
    console.error('❌ 부품 목록 로드 오류:', error);
    // 오류 시 기본 목록 사용
    if (window.PARTS_LIST) {
      partsListHTML = '<option value="">부품 선택</option>';
      window.PARTS_LIST.forEach(part => {
        partsListHTML += `<option value="${part.name}" data-price="${part.price}">${part.name}</option>`;
      });
    }
  }

  // 부품 입력 섹션
  const partsContainer = document.getElementById('parts-input');
  if (partsContainer) {
    partsContainer.innerHTML = `
      <div style="display: flex; gap: 5px; align-items: stretch;">
        <select id="parts-select" style="flex: 1; margin: 0;">
          ${partsListHTML}
        </select>
        <input type="text" id="parts-quantity" placeholder="수량" value="1" style="width: 60px; margin: 0; padding-left: 8px; padding-right: 4px; text-align: center;">
        <div style="display: flex; flex-direction: column; gap: 0; width: 20px;">
          <button type="button" onclick="incrementQuantity()" style="flex: 1; margin: 0; padding: 0; font-size: 8px; border: none; background: #2196F3; color: white; cursor: pointer; min-height: 0; line-height: 1;">▲</button>
          <button type="button" onclick="decrementQuantity()" style="flex: 1; margin: 0; padding: 0; font-size: 8px; border: none; background: #2196F3; color: white; cursor: pointer; border-top: 1px solid white; min-height: 0; line-height: 1;">▼</button>
        </div>
        <button type="button" onclick="addSelectedPart()" style="flex: 1; margin: 0;">추가</button>
      </div>
      <div id="selected-parts-display" style="margin-top: 10px;"></div>
      <textarea name="parts" placeholder="사용 부품" style="margin-top: 5px; display: none;"></textarea>
    `;
    
    // 기존 데이터가 있다면 로드
    updatePartsDisplay();
  }
}

/**
 * 작업자 체크박스 동적 렌더링
 * Settings > 직원관리에서 로드
 */
export async function renderWorkerCheckboxes() {
  const container = document.getElementById('worker-checkboxes-container');
  if (!container) return;

  try {
    const db = window.db;
    const { getDocs, collection } = window.firebase;
    
    if (!db || !getDocs) {
      console.error('Firebase가 초기화되지 않았습니다.');
      return;
    }

    // Firebase에서 직원 목록 로드
    const usersSnapshot = await getDocs(collection(db, "users"));
    const users = [];
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.isActive !== false) {  // 활성 직원만
        users.push({
          name: data.name || '',
          type: data.employeeType || 'executive',
          executiveShare: data.executiveShare || 0,
          workerCommissionRate: data.workerCommissionRate || 0
        });
      }
    });

    // 이름순 정렬
    users.sort((a, b) => a.name.localeCompare(b.name));

    console.log('✅ 작업자 체크박스 렌더링:', users.length, '명');

    // 체크박스 HTML 생성
    let checkboxesHTML = '';
    
    users.forEach(user => {
      // 타입 표시
      let typeLabel = '';
      if (user.type === 'executive') {
        typeLabel = `<span style="font-size: 12px; color: #666;">(임원)</span>`;
      } else if (user.type === 'contract_worker') {
        typeLabel = `<span style="font-size: 12px; color: #28a745;">(도급)</span>`;
      }
      
      checkboxesHTML += `
        <label style="display: flex; align-items: center; margin: 0; font-size: 16px; gap: 4px;">
          <input type="checkbox" name="worker" value="${user.name}" style="width: auto; margin: 0 8px 0 0; padding: 0; min-width: 20px; min-height: 20px;">
          <span>${user.name}</span>
          ${typeLabel}
        </label>
      `;
    });

    // 작업자 추가 입력
    checkboxesHTML += `
      <div style="display: flex; gap: 8px; align-items: center; width: 100%; margin-top: 8px;">
        <input type="text" id="custom-worker" placeholder="작업자 추가" style="flex: 1; margin: 0; padding: 8px 12px; font-size: 16px; min-height: 40px;">
        <button type="button" onclick="addCustomWorker()" style="width: auto; margin: 0; padding: 8px 16px; font-size: 14px; min-height: 40px;">추가</button>
      </div>
    `;

    container.innerHTML = checkboxesHTML;

  } catch (error) {
    console.error('❌ 작업자 체크박스 로드 실패:', error);
    
    // 오류 시 기본 체크박스 표시
    container.innerHTML = `
      <label style="display: flex; align-items: center; margin: 0; font-size: 16px;">
        <input type="checkbox" name="worker" value="박성욱" style="width: auto; margin: 0 8px 0 0; padding: 0; min-width: 20px; min-height: 20px;">
        박성욱
      </label>
      <label style="display: flex; align-items: center; margin: 0; font-size: 16px;">
        <input type="checkbox" name="worker" value="박성호" style="width: auto; margin: 0 8px 0 0; padding: 0; min-width: 20px; min-height: 20px;">
        박성호
      </label>
      <label style="display: flex; align-items: center; margin: 0; font-size: 16px;">
        <input type="checkbox" name="worker" value="배희종" style="width: auto; margin: 0 8px 0 0; padding: 0; min-width: 20px; min-height: 20px;">
        배희종
      </label>
      <div style="display: flex; gap: 8px; align-items: center; width: 100%; margin-top: 8px;">
        <input type="text" id="custom-worker" placeholder="작업자 추가" style="flex: 1; margin: 0; padding: 8px 12px; font-size: 16px; min-height: 40px;">
        <button type="button" onclick="addCustomWorker()" style="width: auto; margin: 0; padding: 8px 16px; font-size: 14px; min-height: 40px;">추가</button>
      </div>
    `;
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


// 부품 수량 증가/감소 함수
window.incrementQuantity = function() {
  const input = document.getElementById('parts-quantity');
  const currentValue = parseInt(input.value) || 1;
  input.value = currentValue + 1;
};

window.decrementQuantity = function() {
  const input = document.getElementById('parts-quantity');
  const currentValue = parseInt(input.value) || 1;
  if (currentValue > 1) {
    input.value = currentValue - 1;
  }
};

// 전역 함수로 등록 (중요!)
window.renderWorkerCheckboxes = renderWorkerCheckboxes;
