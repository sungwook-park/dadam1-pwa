export function render(container) {
  container.innerHTML = `
    <style>
      .admin-button {
        height: 100px;
        font-size: 20px;
        background-color: #219ebc;
        color: white;
        border: none;
        border-radius: 14px;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      .admin-button:hover {
        background-color: #126782;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      }
    </style>
    <div class="box" style="padding: 60px 30px; min-height: 85vh; display: flex; flex-direction: column; justify-content: center;">
      <h2 style="text-align:center; font-size: 30px; margin-bottom: 40px;">📋 관리자 홈</h2>
      <div style="
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 24px;
        max-width: 600px;
        margin: 0 auto;
      ">
        <button onclick="routeTo('work')" class="admin-button">작업지시</button>
        <button onclick="routeTo('reserve')" class="admin-button">예약</button>
        <button onclick="routeTo('expense')" class="admin-button">지출</button>
        <button onclick="routeTo('settlement')" class="admin-button">정산</button>
        <button onclick="routeTo('stock')" class="admin-button">입출고</button>
        <button onclick="routeTo('holiday')" class="admin-button">휴무관리</button>
      </div>
    </div>
  `;
}
