// scripts/worker-settings.js - 직원용 설정 (비밀번호 변경)

import { auth } from './firebase-config.js';
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/**
 * 직원용 설정 화면 로드
 */
window.loadWorkerSettings = function() {
  console.log('⚙️ 직원용 설정 화면 로드');
  
  // 탭 활성화
  document.querySelectorAll('.worker-tab-btn').forEach(btn => btn.classList.remove('active'));
  const settingsTab = document.getElementById('settings-tab');
  if (settingsTab) settingsTab.classList.add('active');
  
  const content = document.getElementById('worker-task-content');
  if (!content) return;
  
  const user = auth.currentUser;
  const userInfo = window.currentUserInfo;
  
  content.innerHTML = `
    <div class="worker-settings">
      <div class="settings-header">
        <h3>⚙️ 설정</h3>
      </div>
      
      <!-- 내 정보 -->
      <div class="settings-section">
        <h4 class="section-title">👤 내 정보</h4>
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">이름</span>
            <span class="info-value">${userInfo?.name || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">이메일</span>
            <span class="info-value">${user?.email || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">연락처</span>
            <span class="info-value">${userInfo?.phone || '-'}</span>
          </div>
        </div>
      </div>
      
      <!-- 비밀번호 변경 -->
      <div class="settings-section">
        <h4 class="section-title">🔑 비밀번호 변경</h4>
        <div class="password-change-card">
          <form id="password-change-form" onsubmit="return false;">
            <div class="form-group">
              <label for="current-password">현재 비밀번호</label>
              <input type="password" id="current-password" placeholder="현재 비밀번호" required>
            </div>
            
            <div class="form-group">
              <label for="new-password">새 비밀번호</label>
              <input type="password" id="new-password" placeholder="새 비밀번호 (최소 6자)" required>
            </div>
            
            <div class="form-group">
              <label for="new-password-confirm">새 비밀번호 확인</label>
              <input type="password" id="new-password-confirm" placeholder="새 비밀번호 확인" required>
            </div>
            
            <button type="button" id="change-password-btn" class="btn-primary">
              🔑 비밀번호 변경
            </button>
          </form>
          
          <div class="password-tips">
            <p class="tip-title">💡 비밀번호 변경 시 유의사항</p>
            <ul>
              <li>비밀번호는 최소 6자 이상이어야 합니다</li>
              <li>변경 후 다시 로그인해야 할 수 있습니다</li>
              <li>보안을 위해 주기적으로 변경해주세요</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // CSS 추가
  addWorkerSettingsStyles();
  
  // 비밀번호 변경 버튼 이벤트
  const changePasswordBtn = document.getElementById('change-password-btn');
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', handlePasswordChange);
  }
};

/**
 * 비밀번호 변경 처리
 */
async function handlePasswordChange() {
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const newPasswordConfirm = document.getElementById('new-password-confirm').value;
  const btn = document.getElementById('change-password-btn');
  
  // 유효성 검사
  if (!currentPassword) {
    alert('현재 비밀번호를 입력해주세요.');
    return;
  }
  
  if (!newPassword || newPassword.length < 6) {
    alert('새 비밀번호는 최소 6자 이상이어야 합니다.');
    return;
  }
  
  if (newPassword !== newPasswordConfirm) {
    alert('새 비밀번호가 일치하지 않습니다.');
    return;
  }
  
  if (currentPassword === newPassword) {
    alert('현재 비밀번호와 새 비밀번호가 같습니다.\n다른 비밀번호를 입력해주세요.');
    return;
  }
  
  try {
    btn.disabled = true;
    btn.textContent = '🔄 변경 중...';
    
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }
    
    // 1. 재인증 (보안을 위해 현재 비밀번호 확인)
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    console.log('✅ 재인증 성공');
    
    // 2. 비밀번호 변경
    await updatePassword(user, newPassword);
    console.log('✅ 비밀번호 변경 성공');
    
    alert('✅ 비밀번호가 변경되었습니다!');
    
    // 입력 필드 초기화
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('new-password-confirm').value = '';
    
    btn.textContent = '✅ 변경 완료!';
    btn.style.background = '#28a745';
    
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '🔑 비밀번호 변경';
      btn.style.background = '';
    }, 3000);
    
  } catch (error) {
    console.error('❌ 비밀번호 변경 실패:', error);
    
    let errorMessage = '비밀번호 변경에 실패했습니다.';
    
    if (error.code === 'auth/wrong-password') {
      errorMessage = '현재 비밀번호가 틀렸습니다.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = '새 비밀번호가 너무 약합니다. (최소 6자)';
    } else if (error.code === 'auth/requires-recent-login') {
      errorMessage = '보안을 위해 다시 로그인해주세요.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    alert(`❌ ${errorMessage}`);
    
    btn.disabled = false;
    btn.textContent = '🔑 비밀번호 변경';
  }
}

/**
 * 스타일 추가
 */
function addWorkerSettingsStyles() {
  const existingStyle = document.getElementById('worker-settings-style');
  if (existingStyle) return;
  
  const style = document.createElement('style');
  style.id = 'worker-settings-style';
  style.textContent = `
    .worker-settings {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .settings-header {
      margin-bottom: 30px;
    }
    
    .settings-header h3 {
      font-size: 24px;
      font-weight: 700;
      color: #1a202c;
      margin: 0;
    }
    
    .settings-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #2d3748;
      margin: 0 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .info-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      background: #f7fafc;
      border-radius: 8px;
    }
    
    .info-label {
      font-weight: 600;
      color: #4a5568;
      font-size: 14px;
    }
    
    .info-value {
      font-weight: 600;
      color: #1a202c;
      font-size: 14px;
    }
    
    .password-change-card {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    #password-change-form {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .form-group label {
      font-weight: 600;
      color: #4a5568;
      font-size: 14px;
    }
    
    .form-group input {
      padding: 12px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.2s;
    }
    
    .form-group input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    
    .btn-primary {
      padding: 14px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 15px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-primary:hover:not(:disabled) {
      background: #5568d3;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    
    .password-tips {
      background: #edf2f7;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    
    .tip-title {
      font-weight: 700;
      color: #2d3748;
      font-size: 14px;
      margin: 0 0 10px 0;
    }
    
    .password-tips ul {
      margin: 0;
      padding-left: 20px;
    }
    
    .password-tips li {
      color: #4a5568;
      font-size: 13px;
      line-height: 1.6;
      margin-bottom: 5px;
    }
    
    @media (max-width: 768px) {
      .worker-settings {
        padding: 15px;
      }
      
      .settings-section {
        padding: 15px;
      }
    }
  `;
  
  document.head.appendChild(style);
}
