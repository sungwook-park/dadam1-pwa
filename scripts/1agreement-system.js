import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// jsPDF와 html2canvas 동적 로드
async function loadPDFLibraries() {
  if (window.jsPDF && window.html2canvas) {
    console.log('✅ PDF 라이브러리 이미 로드됨');
    return;
  }
  
  console.log('📥 PDF 라이브러리 로딩 중...');
  
  // html2canvas 로드
  if (!window.html2canvas) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  // jsPDF 로드
  if (!window.jsPDF) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  console.log('✅ PDF 라이브러리 로드 완료');
}

function createModals() {
  const modalsHTML = `
    <!-- 동의 방법 선택 모달 -->
    <div id="agreementActionModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:999999;justify-content:center;align-items:center;">
      <div style="background:white;padding:30px;border-radius:10px;max-width:400px;width:90%;">
        <h3 style="margin-bottom:20px;color:black;font-size:20px;">동의 받기 방법 선택</h3>
        <button onclick="handleSendSMS()" style="width:100%;padding:15px;margin-bottom:10px;background:#667eea;color:white;border:none;border-radius:5px;cursor:pointer;font-size:16px;">문자로 링크 보내기</button>
        <button onclick="handleDirectAgreement()" style="width:100%;padding:15px;margin-bottom:10px;background:#667eea;color:white;border:none;border-radius:5px;cursor:pointer;font-size:16px;">직접 동의받기</button>
        <button class="close-agreement-modal" style="width:100%;padding:15px;background:#ccc;color:black;border:none;border-radius:5px;cursor:pointer;font-size:16px;">취소</button>
      </div>
    </div>

    <!-- 직접 동의 모달 -->
    <div id="directAgreementModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:999999;justify-content:center;align-items:center;overflow-y:auto;">
      <div style="background:white;padding:30px;border-radius:10px;max-width:600px;width:90%;max-height:90vh;overflow-y:auto;margin:20px;">
        <h3 style="margin-bottom:20px;color:black;font-size:20px;">고객 동의서</h3>
        
        <div style="margin:20px 0;">
          <h4 style="color:black;font-size:16px;margin:0 0 15px 0;">개인정보 수집 및 이용 동의</h4>
          <div style="padding:15px;background:#f8f9fa;border-radius:5px;font-size:14px;color:#333;line-height:1.6;border:1px solid #ddd;margin-bottom:10px;">
            <p style="margin-bottom:10px;"><strong>1. 수집 항목:</strong> 성명, 연락처, 주소</p>
            <p style="margin-bottom:10px;"><strong>2. 수집 목적:</strong> TV 설치 서비스 제공, 일정 안내 및 고객 관리</p>
            <p style="margin-bottom:10px;"><strong>3. 보유 기간:</strong> 서비스 완료 후 1년간 보관 후 파기(단, 관련 법령에 따라 보관이 필요한 경우는 예외)</p>
            <p style="margin-bottom:0;"><strong>4. 동의 거부 권리:</strong> 개인정보 수집·이용에 대한 동의를 거부할 수 있으나, 동의하지 않을 경우 서비스 제공이 제한될 수 있습니다.</p>
          </div>
          <label style="display:flex;align-items:center;color:black;font-size:15px;cursor:pointer;font-weight:bold;">
            <input type="checkbox" id="privacyAgree" style="margin-right:8px;width:20px;height:20px;">
            동의합니다
          </label>
        </div>

        <div style="margin:20px 0;">
          <h4 style="color:black;font-size:16px;margin:0 0 15px 0;">TV 이전 설치 안내사항 및 책임 범위</h4>
          <div style="padding:15px;background:#f8f9fa;border-radius:5px;font-size:14px;color:#333;line-height:1.6;border:1px solid #ddd;margin-bottom:10px;">
            <p style="margin-bottom:12px;font-weight:bold;">본인은 TV 이전 설치 서비스와 관련하여 아래 안내사항을 충분히 확인하고 이에 동의합니다.</p>
            
            <p style="margin-bottom:8px;font-weight:bold;">1. 제품 파손에 대한 책임</p>
            <p style="margin-bottom:12px;">이전 설치 작업 중 작업자의 과실로 인해 TV 패널 파손, 외관 파손 등 물리적인 파손이 발생한 경우에 한하여 회사에서 책임지고 보상합니다.</p>
            
            <p style="margin-bottom:8px;font-weight:bold;">2. 전자제품 특성에 따른 고장 발생 안내</p>
            <p style="margin-bottom:8px;">TV는 정밀 전자제품으로서 이전 설치 전·후를 불문하고 다음과 같은 고장 증세가 발생할 수 있음을 인지합니다.</p>
            <ul style="margin:0 0 12px 20px;padding:0;">
              <li>화면 미출력, 깜빡임, 줄 발생, 멍, 번짐</li>
              <li>색상 이상(변색, 색 왜곡 등)</li>
              <li>전원 불량 또는 갑작스러운 꺼짐</li>
              <li>소리 출력 불량 및 잡음</li>
              <li>채널 수신 불량</li>
              <li>외부기기 및 입력 신호 인식 오류</li>
              <li>리모컨 작동 불량</li>
              <li>네트워크 및 스마트 기능 이상</li>
              <li>기타 모든 전기·전자적 고장 증세</li>
            </ul>
            
            <p style="margin-bottom:8px;font-weight:bold;">3. 고장 증세에 대한 책임 범위</p>
            <p style="margin-bottom:12px;">위와 같은 모든 전기·전자적 고장 증세는 이전 설치 작업과의 인과관계와 관계없이 회사의 보상 또는 A/S 대상이 아니며, 제조사 A/S를 이용하는 것에 동의합니다.</p>
            
            <p style="margin-bottom:8px;font-weight:bold;">4. 출장비 발생 안내(고객 변심 및 설치 불가)</p>
            <p style="margin-bottom:12px;">작업자가 현장에 방문한 이후 고객의 단순 변심, 설치 위치 변경 요청, 현장 구조 또는 설치 환경 문제로 인해 설치가 진행되지 못한 경우에도 출장비가 발생할 수 있음에 동의합니다.</p>
            
            <p style="margin-bottom:8px;font-weight:bold;">5. 통신선 연장 및 통신 관련 안내</p>
            <p style="margin-bottom:12px;">TV 시청을 위한 통신선 연장, 인터넷·유선 방송 관련 작업은 회사의 작업 범위에 포함되지 않으며, 필요 시 고객이 이용 중인 통신사 또는 유선 방송사에 별도로 요청해야 함을 확인합니다.</p>
            
            <p style="margin-bottom:8px;font-weight:bold;">6. 설치 위치 및 추가 작업 안내</p>
            <p style="margin-bottom:0;">설치 완료 후 TV 위치 변경, 재설치, 추가 배선 또는 별도 작업 요청 시 추가 비용이 발생할 수 있음을 확인합니다.</p>
          </div>
          <label style="display:flex;align-items:center;color:black;font-size:15px;cursor:pointer;font-weight:bold;">
            <input type="checkbox" id="noticeAgree" style="margin-right:8px;width:20px;height:20px;">
            동의합니다
          </label>
        </div>

        <div style="margin:20px 0;">
          <h4 style="color:black;font-size:16px;margin-bottom:10px;">서명</h4>
          <canvas id="signatureCanvas" style="width:100%;height:200px;border:2px solid #ddd;border-radius:5px;background:#fff;"></canvas>
          <button onclick="clearSignature()" style="margin-top:10px;padding:6px 12px;background:#e0e0e0;color:#666;border:none;border-radius:4px;cursor:pointer;font-size:13px;">서명 다시하기</button>
        </div>

        <div style="margin-top:30px;display:flex;gap:10px;">
          <button onclick="submitDirectAgreement()" style="flex:7;padding:15px;background:#667eea;color:white;border:none;border-radius:5px;cursor:pointer;font-size:16px;font-weight:bold;">동의 완료</button>
          <button class="close-agreement-modal" style="flex:3;padding:15px;background:#ccc;color:black;border:none;border-radius:5px;cursor:pointer;font-size:16px;">취소</button>
        </div>
      </div>
    </div>

    <!-- 동의서 조회 모달 -->
    <div id="viewAgreementModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:999999;justify-content:center;align-items:center;overflow-y:auto;">
      <div style="background:white;padding:30px;border-radius:10px;max-width:700px;width:90%;max-height:90vh;overflow-y:auto;margin:20px;">
        <!-- 동의서 내용이 동적으로 들어갈 영역 -->
        <div id="agreementViewContent"></div>
        
        <!-- 하단 버튼 -->
        <div style="margin-top:30px;display:flex;gap:10px;flex-wrap:wrap;">
          <button onclick="downloadAgreementPDF()" style="flex:1;min-width:120px;padding:15px;background:#4caf50;color:white;border:none;border-radius:5px;cursor:pointer;font-size:15px;font-weight:bold;">📥 PDF 다운로드</button>
          <button onclick="printAgreement()" style="flex:1;min-width:120px;padding:15px;background:#2196f3;color:white;border:none;border-radius:5px;cursor:pointer;font-size:15px;font-weight:bold;">🖨️ 인쇄</button>
          <button onclick="closeViewAgreementModal()" style="flex:1;min-width:120px;padding:15px;background:#ccc;color:black;border:none;border-radius:5px;cursor:pointer;font-size:15px;font-weight:bold;">닫기</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalsHTML);
  
  // 닫기 버튼 이벤트
  document.querySelectorAll('.close-agreement-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('agreementActionModal').style.display = 'none';
      document.getElementById('directAgreementModal').style.display = 'none';
    });
  });
}

// 동의서 도메인 설정
const AGREEMENT_DOMAIN = 'https://dadam1-pwa.vercel.app';

function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

async function sendAgreementSMS(taskId, taskData) {
  try {
    const token = generateToken();
    const url = AGREEMENT_DOMAIN + '/agreement.html?token=' + token;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    await setDoc(doc(db, 'agreementLinks', token), {
      taskId: taskId,
      customerPhone: taskData.contact || '',
      status: 'pending',
      createdAt: serverTimestamp(),
      expiresAt: expiresAt
    });
    
    await updateDoc(doc(db, 'tasks', taskId), {
      agreementStatus: 'pending',
      agreementLink: { token: token, url: url, createdAt: new Date(), expiresAt: expiresAt }
    });
    
    window.location.href = 'sms:' + (taskData.contact || '') + '?body=' + encodeURIComponent('다담티비 동의서: ' + url);
    return { success: true };
  } catch (error) {
    console.error('SMS Error:', error);
    return { success: false, error: error.message };
  }
}

function setupSignatureCanvas() {
  const canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;
  
  canvas.width = canvas.offsetWidth;
  canvas.height = 200;
  
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  
  let isDrawing = false;
  window.hasSignature = false;
  
  // Placeholder 그리기 함수
  function drawPlaceholder() {
    ctx.save();
    ctx.fillStyle = '#ccc';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('이름을 적어주세요', canvas.width / 2, canvas.height / 2);
    ctx.restore();
  }
  
  // 초기 placeholder 표시
  drawPlaceholder();
  
  canvas.addEventListener('mousedown', (e) => {
    if (!window.hasSignature) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    isDrawing = true;
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
  });
  
  canvas.addEventListener('mousemove', (e) => {
    if (isDrawing) {
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
      window.hasSignature = true;
    }
  });
  
  canvas.addEventListener('mouseup', () => {
    isDrawing = false;
  });
  
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!window.hasSignature) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    ctx.beginPath();
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
  });
  
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (isDrawing) {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
      ctx.stroke();
      window.hasSignature = true;
    }
  });
  
  canvas.addEventListener('touchend', () => {
    isDrawing = false;
  });
  
  // clearSignature에서 사용할 수 있도록 저장
  window.drawSignaturePlaceholder = drawPlaceholder;
}

window.clearSignature = function() {
  const canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  window.hasSignature = false;
  // Placeholder 다시 그리기
  if (window.drawSignaturePlaceholder) {
    window.drawSignaturePlaceholder();
  }
};

async function saveDirectAgreement(taskId) {
  try {
    const privacyCheck = document.getElementById('privacyAgree');
    const noticeCheck = document.getElementById('noticeAgree');
    
    if (!privacyCheck.checked || !noticeCheck.checked) {
      alert('개인정보 수집 및 안내사항에 모두 동의해주세요.');
      return { success: false };
    }
    
    if (!window.hasSignature) {
      alert('서명을 해주세요.');
      return { success: false };
    }
    
    const canvas = document.getElementById('signatureCanvas');
    const agreementData = {
      method: 'direct',
      privacyAgreed: true,
      noticeAgreed: true,
      agreedAt: serverTimestamp(),
      agreementType: 'signature',
      signatureData: canvas.toDataURL()
    };
    
    await updateDoc(doc(db, 'tasks', taskId), {
      agreementStatus: 'completed',
      customerAgreement: agreementData
    });
    
    return { success: true };
  } catch (error) {
    console.error('Save Error:', error);
    return { success: false, error: error.message };
  }
}

// 동의서 조회 함수
window.viewAgreement = async function(taskId) {
  try {
    // 작업 데이터 가져오기
    const taskDoc = await getDoc(doc(db, 'tasks', taskId));
    if (!taskDoc.exists()) {
      alert('작업 데이터를 찾을 수 없습니다.');
      return;
    }
    
    const task = taskDoc.data();
    const agreement = task.customerAgreement;
    
    if (!agreement) {
      alert('동의서 데이터가 없습니다.');
      return;
    }
    
    // 동의 날짜 포맷
    let agreedDate = '정보 없음';
    if (agreement.agreedAt) {
      const date = agreement.agreedAt.toDate ? agreement.agreedAt.toDate() : new Date(agreement.agreedAt);
      agreedDate = date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // 동의서 HTML 생성
    const contentHTML = `
      <div id="agreementPrintArea" style="background:white;padding:20px;">
        <h2 style="text-align:center;color:#333;margin-bottom:30px;font-size:24px;border-bottom:3px solid #667eea;padding-bottom:15px;">
          다담티비 고객 동의서
        </h2>
        
        <div style="background:#f0f4ff;padding:15px;border-radius:8px;margin-bottom:25px;">
          <div style="display:grid;grid-template-columns:120px 1fr;gap:10px;font-size:15px;">
            <div style="font-weight:bold;color:#555;">고객명:</div>
            <div style="color:#333;">${task.client || '정보 없음'}</div>
            
            <div style="font-weight:bold;color:#555;">연락처:</div>
            <div style="color:#333;">${task.contact || '정보 없음'}</div>
            
            <div style="font-weight:bold;color:#555;">설치주소:</div>
            <div style="color:#333;">${task.installAddress || '정보 없음'}</div>
            
            <div style="font-weight:bold;color:#555;">동의일시:</div>
            <div style="color:#333;">${agreedDate}</div>
            
            <div style="font-weight:bold;color:#555;">동의방법:</div>
            <div style="color:#333;">${agreement.method === 'direct' ? '직접 동의' : 'SMS 링크'}</div>
          </div>
        </div>

        <div style="margin:25px 0;">
          <h3 style="color:#333;font-size:18px;margin-bottom:15px;border-left:4px solid #667eea;padding-left:12px;">
            개인정보 수집 및 이용 동의
          </h3>
          <div style="padding:15px;background:#f8f9fa;border-radius:5px;font-size:14px;color:#333;line-height:1.8;border:1px solid #ddd;">
            <p style="margin-bottom:10px;"><strong>1. 수집 항목:</strong> 성명, 연락처, 주소</p>
            <p style="margin-bottom:10px;"><strong>2. 수집 목적:</strong> TV 설치 서비스 제공, 일정 안내 및 고객 관리</p>
            <p style="margin-bottom:10px;"><strong>3. 보유 기간:</strong> 서비스 완료 후 1년간 보관 후 파기</p>
            <p style="margin-bottom:0;"><strong>4. 동의 거부 권리:</strong> 동의를 거부할 수 있으나, 서비스 제공이 제한될 수 있습니다.</p>
          </div>
          <div style="margin-top:12px;padding:10px;background:#e8f5e9;border-radius:5px;border-left:4px solid #4caf50;">
            <strong style="color:#2e7d32;font-size:15px;">✓ 동의함 (${agreedDate})</strong>
          </div>
        </div>

        <div style="margin:25px 0;">
          <h3 style="color:#333;font-size:18px;margin-bottom:15px;border-left:4px solid #667eea;padding-left:12px;">
            TV 이전 설치 안내사항 및 책임 범위
          </h3>
          <div style="padding:15px;background:#f8f9fa;border-radius:5px;font-size:14px;color:#333;line-height:1.8;border:1px solid #ddd;">
            <p style="margin-bottom:12px;font-weight:bold;">본인은 TV 이전 설치 서비스와 관련하여 아래 안내사항을 충분히 확인하고 이에 동의합니다.</p>
            
            <p style="margin-bottom:8px;font-weight:bold;color:#555;">1. 제품 파손에 대한 책임</p>
            <p style="margin-bottom:12px;">작업자의 과실로 인한 물리적 파손 발생시 회사에서 책임지고 보상합니다.</p>
            
            <p style="margin-bottom:8px;font-weight:bold;color:#555;">2. 전자제품 특성에 따른 고장 발생 안내</p>
            <p style="margin-bottom:8px;">TV는 정밀 전자제품으로 다음과 같은 고장 증세가 발생할 수 있습니다:</p>
            <ul style="margin:0 0 12px 25px;padding:0;">
              <li>화면 미출력, 깜빡임, 줄 발생, 멍, 번짐</li>
              <li>색상 이상, 전원 불량, 소리 출력 불량</li>
              <li>채널 수신 불량, 리모컨 작동 불량</li>
              <li>네트워크 및 스마트 기능 이상</li>
            </ul>
            
            <p style="margin-bottom:8px;font-weight:bold;color:#555;">3. 고장 증세에 대한 책임 범위</p>
            <p style="margin-bottom:12px;">전기·전자적 고장 증세는 회사의 보상 대상이 아니며, 제조사 A/S를 이용합니다.</p>
            
            <p style="margin-bottom:8px;font-weight:bold;color:#555;">4. 출장비 발생 안내</p>
            <p style="margin-bottom:12px;">고객 변심 또는 설치 불가 시에도 출장비가 발생할 수 있습니다.</p>
            
            <p style="margin-bottom:8px;font-weight:bold;color:#555;">5. 통신선 연장 및 통신 관련 안내</p>
            <p style="margin-bottom:12px;">통신선 연장 작업은 회사 작업 범위에 포함되지 않습니다.</p>
            
            <p style="margin-bottom:8px;font-weight:bold;color:#555;">6. 설치 위치 및 추가 작업 안내</p>
            <p style="margin-bottom:0;">설치 후 위치 변경, 재설치 요청 시 추가 비용이 발생할 수 있습니다.</p>
          </div>
          <div style="margin-top:12px;padding:10px;background:#e8f5e9;border-radius:5px;border-left:4px solid #4caf50;">
            <strong style="color:#2e7d32;font-size:15px;">✓ 동의함 (${agreedDate})</strong>
          </div>
        </div>

        ${agreement.signatureData ? `
        <div style="margin:25px 0;">
          <h3 style="color:#333;font-size:18px;margin-bottom:15px;border-left:4px solid #667eea;padding-left:12px;">
            고객 서명
          </h3>
          <div style="border:2px solid #ddd;border-radius:8px;padding:15px;background:white;text-align:center;">
            <img src="${agreement.signatureData}" style="max-width:100%;height:auto;max-height:200px;" alt="고객 서명">
          </div>
        </div>
        ` : ''}

        <div style="margin-top:40px;padding:20px;background:#f5f5f5;border-radius:8px;text-align:center;border:1px solid #ddd;">
          <p style="margin:0;color:#666;font-size:14px;">본 동의서는 전자적으로 작성되었으며 법적 효력을 가집니다.</p>
          <p style="margin:10px 0 0 0;color:#999;font-size:13px;">다담티비 | 문의: 대표 연락처</p>
        </div>
      </div>
    `;
    
    // 모달에 내용 삽입
    document.getElementById('agreementViewContent').innerHTML = contentHTML;
    
    // 현재 작업 ID 저장 (PDF/인쇄에서 사용)
    window.currentViewingTaskId = taskId;
    window.currentViewingTask = task;
    
    // 모달 표시
    document.getElementById('viewAgreementModal').style.display = 'flex';
    
  } catch (error) {
    console.error('동의서 조회 오류:', error);
    alert('동의서를 불러오는 중 오류가 발생했습니다.');
  }
};

// PDF 다운로드 함수
window.downloadAgreementPDF = async function() {
  try {
    await loadPDFLibraries();
    
    const element = document.getElementById('agreementPrintArea');
    if (!element) {
      alert('동의서 내용을 찾을 수 없습니다.');
      return;
    }
    
    const task = window.currentViewingTask;
    const fileName = `동의서_${task.client || '고객'}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // html2canvas로 이미지 생성
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/png');
    
    // jsPDF로 PDF 생성
    const { jsPDF } = window.jsPDF;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    pdf.save(fileName);
    alert('PDF 다운로드가 완료되었습니다.');
    
  } catch (error) {
    console.error('PDF 생성 오류:', error);
    alert('PDF 생성 중 오류가 발생했습니다.');
  }
};

// 인쇄 함수
window.printAgreement = function() {
  const printContent = document.getElementById('agreementPrintArea');
  if (!printContent) {
    alert('인쇄할 내용을 찾을 수 없습니다.');
    return;
  }
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>고객 동의서 인쇄</title>
      <style>
        @media print {
          @page { margin: 10mm; }
          body { margin: 0; }
        }
        body {
          font-family: 'Malgun Gothic', sans-serif;
          line-height: 1.6;
        }
      </style>
    </head>
    <body>
      ${printContent.innerHTML}
      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 100);
        }
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
};

// 조회 모달 닫기
window.closeViewAgreementModal = function() {
  document.getElementById('viewAgreementModal').style.display = 'none';
  window.currentViewingTaskId = null;
  window.currentViewingTask = null;
};

window.showAgreementActions = function(taskId, taskData) {
  window.currentAgreementTaskId = taskId;
  window.currentAgreementTaskData = taskData;
  const modal = document.getElementById('agreementActionModal');
  modal.style.display = 'flex';
};

// 작업 ID로 동의 모달 열기 (간단 버전)
window.showAgreementModal = function(taskId) {
  window.currentAgreementTaskId = taskId;
  window.currentAgreementTaskData = null;
  const modal = document.getElementById('agreementActionModal');
  if (modal) {
    modal.style.display = 'flex';
  } else {
    console.error('동의 모달을 찾을 수 없습니다');
  }
};

window.handleSendSMS = async function() {
  try {
    let taskData = window.currentAgreementTaskData;
    
    if (!taskData && window.currentAgreementTaskId) {
      const taskDoc = await getDoc(doc(db, 'tasks', window.currentAgreementTaskId));
      if (taskDoc.exists()) {
        taskData = taskDoc.data();
      }
    }
    
    const result = await sendAgreementSMS(window.currentAgreementTaskId, taskData);
    if (result.success) {
      document.getElementById('agreementActionModal').style.display = 'none';
      
      // 캐시 삭제 후 목록 새로고침
      if (window.sessionStorage) {
        const keysToRemove = [];
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (key && key.includes('tasks')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => window.sessionStorage.removeItem(key));
      }
      
      setTimeout(() => {
        if (window.loadTodayTasks) window.loadTodayTasks();
      }, 300);
      
      alert('문자가 발송되었습니다.');
    } else {
      alert('문자 발송 실패: ' + result.error);
    }
  } catch (error) {
    console.error('SMS 발송 오류:', error);
    alert('문자 발송 중 오류가 발생했습니다');
  }
};

window.handleDirectAgreement = function() {
  document.getElementById('agreementActionModal').style.display = 'none';
  const modal = document.getElementById('directAgreementModal');
  modal.style.display = 'flex';
  setupSignatureCanvas();
};

window.submitDirectAgreement = async function() {
  const result = await saveDirectAgreement(window.currentAgreementTaskId);
  if (result.success) {
    alert('동의 완료!');
    document.getElementById('directAgreementModal').style.display = 'none';
    
    // 모든 캐시 강제 삭제
    if (window.sessionStorage) {
      const keysToRemove = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key && key.includes('tasks')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => window.sessionStorage.removeItem(key));
    }
    
    // 작업 목록 강제 새로고침
    setTimeout(() => {
      if (window.loadTodayTasks) {
        window.loadTodayTasks();
      }
    }, 300);
  } else if (result.error) {
    alert('오류: ' + result.error);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createModals);
} else {
  createModals();
}

// 작업 목록 새로고침 함수
window.refreshTaskList = function() {
  if (window.sessionStorage) {
    const keysToRemove = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key && key.includes('tasks')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => window.sessionStorage.removeItem(key));
  }
  
  if (window.loadTodayTasks) {
    window.loadTodayTasks();
  }
};

console.log('✅ Agreement system loaded (Enhanced with PDF/Print)');
