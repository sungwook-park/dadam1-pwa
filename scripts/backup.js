// scripts/backup.js - 데이터 백업 및 부품 이력 관리
import { db } from './firebase-config.js';
import {
  collection, query, where, getDocs, addDoc, deleteDoc, doc, 
  orderBy, Timestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 백업 탭 HTML 생성
export function getBackupTabHTML() {
  return `
    <div class="backup-container">
      <div class="backup-header">
        <h3>🗄️ 데이터 백업 관리</h3>
        <p>완료된 작업을 백업하고 정리하여 시스템 성능을 최적화합니다.</p>
      </div>
      
      <div class="backup-options">
        <div class="backup-card">
          <h4>📅 월간 백업</h4>
          <p>이번 달 완료된 작업을 백업하고 정리합니다.</p>
          <div class="backup-controls">
            <select id="backup-year" style="margin-right: 10px;">
              <option value="2025">2025년</option>
              <option value="2024">2024년</option>
            </select>
            <select id="backup-month" style="margin-right: 10px;">
              <option value="01">1월</option>
              <option value="02">2월</option>
              <option value="03">3월</option>
              <option value="04">4월</option>
              <option value="05">5월</option>
              <option value="06">6월</option>
              <option value="07">7월</option>
              <option value="08">8월</option>
              <option value="09">9월</option>
              <option value="10">10월</option>
              <option value="11">11월</option>
              <option value="12">12월</option>
            </select>
            <button onclick="startMonthlyBackup()" class="backup-btn">
              💾 월간 백업 시작
            </button>
          </div>
        </div>
        
        <div class="backup-card">
          <h4>📊 전체 백업</h4>
          <p>모든 완료 작업을 백업합니다. (삭제 없음)</p>
          <button onclick="startFullBackup()" class="backup-btn full-backup">
            📥 전체 백업 다운로드
          </button>
        </div>
        
        <div class="backup-card">
          <h4>🔧 부품 이력 관리</h4>
          <p>부품 사용 이력을 영구 보관 컬렉션으로 이동합니다.</p>
          <button onclick="migratePartsHistory()" class="backup-btn parts-backup">
            🔄 부품 이력 마이그레이션
          </button>
        </div>
      </div>
      
      <div id="backup-progress" style="display: none;" class="backup-progress">
        <div class="progress-header">
          <h4>🔄 백업 진행 중...</h4>
          <div class="progress-bar">
            <div class="progress-fill" id="progress-fill"></div>
          </div>
          <span id="progress-text">준비 중...</span>
        </div>
        <div id="backup-log" class="backup-log"></div>
      </div>
      
      <div id="backup-result" style="display: none;" class="backup-result">
        <h4>✅ 백업 완료</h4>
        <div id="backup-summary"></div>
        <div id="backup-actions" class="backup-actions">
          <button onclick="downloadBackupFiles()" class="download-btn">
            📁 백업 파일 다운로드
          </button>
          <div class="delete-option">
            <div class="warning-box">
              ⚠️ <strong>주의:</strong> 백업된 완료 작업을 삭제하시겠습니까?<br>
              <small>부품 사용 이력은 영구 보관되며, 작업 데이터만 삭제됩니다.</small>
            </div>
            <button onclick="confirmDataDeletion()" class="delete-btn">
              🗑️ 백업된 데이터 삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 전역 변수 (백업 데이터 저장용)
let backupData = {
  tasks: [],
  partsUsage: [],
  year: '',
  month: '',
  summary: {}
};

// 월간 백업 시작
window.startMonthlyBackup = async function() {
  const year = document.getElementById('backup-year').value;
  const month = document.getElementById('backup-month').value;
  
  console.log(`📅 ${year}년 ${month}월 백업 시작`);
  
  // UI 초기화
  showBackupProgress();
  updateProgress(0, '백업 데이터 수집 중...');
  
  try {
    // 1. 해당 월의 완료 작업 조회
    const tasks = await getCompletedTasksByMonth(year, month);
    updateProgress(20, `${tasks.length}개 완료 작업 발견`);
    
    if (tasks.length === 0) {
      showBackupError(`${year}년 ${month}월에 완료된 작업이 없습니다.`);
      return;
    }
    
    // 2. 부품 사용 내역 추출
    const partsUsage = extractPartsUsage(tasks);
    updateProgress(40, '부품 사용 내역 추출 완료');
    
    // 3. 부품 이력 데이터베이스에 저장
    await savePartsHistory(partsUsage);
    updateProgress(60, '부품 이력 영구 저장 완료');
    
    // 4. 백업 데이터 준비
    backupData = {
      tasks: tasks,
      partsUsage: partsUsage,
      year: year,
      month: month,
      summary: {
        totalTasks: tasks.length,
        totalParts: partsUsage.length,
        backupDate: new Date().toISOString(),
        revenue: tasks.reduce((sum, task) => sum + (parseFloat(task.amount) || 0), 0)
      }
    };
    
    updateProgress(80, '백업 파일 생성 중...');
    
    // 5. 백업 완료 표시
    updateProgress(100, '백업 완료!');
    showBackupResult();
    
  } catch (error) {
    console.error('백업 오류:', error);
    showBackupError('백업 중 오류가 발생했습니다: ' + error.message);
  }
};

// 전체 백업 시작
window.startFullBackup = async function() {
  console.log('📊 전체 백업 시작');
  
  showBackupProgress();
  updateProgress(0, '전체 완료 작업 조회 중...');
  
  try {
    const q = query(
      collection(db, "tasks"),
      where("done", "==", true),
      orderBy("date", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const tasks = [];
    
    querySnapshot.forEach(doc => {
      tasks.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    updateProgress(50, `${tasks.length}개 완료 작업 수집 완료`);
    
    const partsUsage = extractPartsUsage(tasks);
    updateProgress(80, '부품 사용 내역 추출 완료');
    
    // 전체 백업은 삭제 옵션 없음
    backupData = {
      tasks: tasks,
      partsUsage: partsUsage,
      year: 'all',
      month: 'all',
      summary: {
        totalTasks: tasks.length,
        totalParts: partsUsage.length,
        backupDate: new Date().toISOString(),
        revenue: tasks.reduce((sum, task) => sum + (parseFloat(task.amount) || 0), 0)
      }
    };
    
    updateProgress(100, '전체 백업 완료!');
    showBackupResult(false); // 삭제 옵션 숨김
    
  } catch (error) {
    console.error('전체 백업 오류:', error);
    showBackupError('전체 백업 중 오류가 발생했습니다: ' + error.message);
  }
};

// 특정 월의 완료 작업 조회
async function getCompletedTasksByMonth(year, month) {
  const startDate = `${year}-${month}-01T00:00:00`;
  const endMonth = month === '12' ? '01' : String(parseInt(month) + 1).padStart(2, '0');
  const endYear = month === '12' ? String(parseInt(year) + 1) : year;
  const endDate = `${endYear}-${endMonth}-01T00:00:00`;
  
  console.log(`📅 조회 기간: ${startDate} ~ ${endDate}`);
  
  const q = query(
    collection(db, "tasks"),
    where("done", "==", true),
    where("date", ">=", startDate),
    where("date", "<", endDate),
    orderBy("date", "asc")
  );
  
  const querySnapshot = await getDocs(q);
  const tasks = [];
  
  querySnapshot.forEach(doc => {
    tasks.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  return tasks;
}

// 부품 사용 내역 추출
function extractPartsUsage(tasks) {
  const partsUsage = [];
  
  tasks.forEach(task => {
    if (task.parts) {
      try {
        let parts = '';
        
        // 부품 데이터 파싱
        if (typeof task.parts === 'string') {
          try {
            const parsed = JSON.parse(task.parts);
            if (Array.isArray(parsed)) {
              parts = parsed.map(part => 
                `${part.name || part}:${part.quantity || 1}개`
              ).join(', ');
            } else {
              parts = task.parts;
            }
          } catch (e) {
            parts = task.parts;
          }
        } else if (Array.isArray(task.parts)) {
          parts = task.parts.map(part => 
            `${part.name || part}:${part.quantity || 1}개`
          ).join(', ');
        } else {
          parts = String(task.parts);
        }
        
        if (parts.trim()) {
          partsUsage.push({
            taskId: task.id,
            date: task.date,
            client: task.client || '',
            worker: task.worker || '',
            parts: parts,
            amount: task.amount || 0,
            createdAt: new Date().toISOString()
          });
        }
      } catch (error) {
        console.warn('부품 데이터 파싱 오류:', task.id, error);
      }
    }
  });
  
  return partsUsage;
}

// 부품 이력을 영구 보관 컬렉션에 저장
async function savePartsHistory(partsUsage) {
  if (partsUsage.length === 0) return;
  
  console.log(`🔧 ${partsUsage.length}개 부품 이력 저장 시작`);
  
  // 배치 처리로 효율적으로 저장
  const batch = writeBatch(db);
  let count = 0;
  
  for (const usage of partsUsage) {
    const docRef = doc(collection(db, "parts_history"));
    batch.set(docRef, {
      ...usage,
      savedAt: Timestamp.now()
    });
    
    count++;
    
    // 500개씩 배치 처리
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`📦 ${count}개 부품 이력 저장 완료`);
    }
  }
  
  // 남은 데이터 저장
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`✅ 총 ${count}개 부품 이력 영구 저장 완료`);
}

// 부품 이력 마이그레이션 (기존 데이터 일괄 처리)
window.migratePartsHistory = async function() {
  if (!confirm('모든 완료 작업의 부품 이력을 영구 보관 컬렉션으로 이동하시겠습니까?')) {
    return;
  }
  
  showBackupProgress();
  updateProgress(0, '부품 이력 마이그레이션 시작...');
  
  try {
    // 모든 완료 작업 조회
    const q = query(
      collection(db, "tasks"),
      where("done", "==", true)
    );
    
    const querySnapshot = await getDocs(q);
    const tasks = [];
    
    querySnapshot.forEach(doc => {
      tasks.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    updateProgress(30, `${tasks.length}개 완료 작업에서 부품 이력 추출 중...`);
    
    const partsUsage = extractPartsUsage(tasks);
    updateProgress(60, `${partsUsage.length}개 부품 사용 내역 추출 완료`);
    
    await savePartsHistory(partsUsage);
    updateProgress(100, '부품 이력 마이그레이션 완료!');
    
    setTimeout(() => {
      alert(`✅ 마이그레이션 완료!\n\n부품 이력 ${partsUsage.length}개가 영구 보관되었습니다.`);
      hideBackupProgress();
    }, 1000);
    
  } catch (error) {
    console.error('마이그레이션 오류:', error);
    showBackupError('마이그레이션 중 오류가 발생했습니다: ' + error.message);
  }
};

// 백업 파일 다운로드
window.downloadBackupFiles = function() {
  try {
    const { year, month, tasks, partsUsage, summary } = backupData;
    
    // 1. 전체 작업 백업 파일
    const tasksBlob = new Blob([JSON.stringify(tasks, null, 2)], {
      type: 'application/json'
    });
    downloadFile(tasksBlob, `tasks_backup_${year}_${month}.json`);
    
    // 2. 부품 사용 내역 파일
    const partsBlob = new Blob([JSON.stringify(partsUsage, null, 2)], {
      type: 'application/json'
    });
    downloadFile(partsBlob, `parts_usage_${year}_${month}.json`);
    
    // 3. 요약 보고서
    const summaryReport = {
      period: `${year}년 ${month}월`,
      summary: summary,
      backup_info: {
        created_at: new Date().toISOString(),
        created_by: window.auth?.currentUser?.email || 'unknown',
        description: '다담업무관리 시스템 백업 파일'
      }
    };
    
    const summaryBlob = new Blob([JSON.stringify(summaryReport, null, 2)], {
      type: 'application/json'
    });
    downloadFile(summaryBlob, `backup_summary_${year}_${month}.json`);
    
    console.log('📁 백업 파일 다운로드 완료');
    
  } catch (error) {
    console.error('다운로드 오류:', error);
    alert('파일 다운로드 중 오류가 발생했습니다.');
  }
};

// 파일 다운로드 헬퍼
function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 데이터 삭제 확인
window.confirmDataDeletion = async function() {
  const { year, month, tasks } = backupData;
  
  const confirmMsg = `⚠️ 정말 삭제하시겠습니까?\n\n` +
    `삭제 대상: ${year}년 ${month}월 완료 작업 ${tasks.length}개\n` +
    `- 작업 데이터: 삭제됨\n` +
    `- 부품 이력: 영구 보관됨\n\n` +
    `이 작업은 되돌릴 수 없습니다.`;
  
  if (!confirm(confirmMsg)) return;
  
  showBackupProgress();
  updateProgress(0, '백업된 데이터 삭제 중...');
  
  try {
    const batch = writeBatch(db);
    let count = 0;
    
    for (const task of tasks) {
      batch.delete(doc(db, "tasks", task.id));
      count++;
      
      if (count % 500 === 0) {
        await batch.commit();
        updateProgress((count / tasks.length) * 80, `${count}개 작업 삭제 완료`);
      }
    }
    
    // 남은 데이터 삭제
    if (count % 500 !== 0) {
      await batch.commit();
    }
    
    updateProgress(100, '데이터 삭제 완료!');
    
    setTimeout(() => {
      alert(`✅ 삭제 완료!\n\n${tasks.length}개 완료 작업이 삭제되었습니다.\n부품 이력은 안전하게 보관되었습니다.`);
      hideBackupProgress();
      
      // 작업 목록 새로고침
      if (window.loadDoneTasks) {
        window.loadDoneTasks();
      }
    }, 1000);
    
  } catch (error) {
    console.error('삭제 오류:', error);
    showBackupError('데이터 삭제 중 오류가 발생했습니다: ' + error.message);
  }
};

// UI 헬퍼 함수들
function showBackupProgress() {
  document.getElementById('backup-progress').style.display = 'block';
  document.getElementById('backup-result').style.display = 'none';
}

function hideBackupProgress() {
  document.getElementById('backup-progress').style.display = 'none';
}

function updateProgress(percent, message) {
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const backupLog = document.getElementById('backup-log');
  
  if (progressFill) progressFill.style.width = percent + '%';
  if (progressText) progressText.textContent = message;
  if (backupLog) {
    const logEntry = document.createElement('div');
    logEntry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
    backupLog.appendChild(logEntry);
    backupLog.scrollTop = backupLog.scrollHeight;
  }
  
  console.log(`📊 ${percent}% - ${message}`);
}

function showBackupResult(showDeleteOption = true) {
  document.getElementById('backup-progress').style.display = 'none';
  document.getElementById('backup-result').style.display = 'block';
  
  const { summary, year, month } = backupData;
  const summaryDiv = document.getElementById('backup-summary');
  
  summaryDiv.innerHTML = `
    <div class="summary-stats">
      <div class="stat-item">
        <span class="stat-label">📅 백업 기간:</span>
        <span class="stat-value">${year}년 ${month}월</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">📋 완료 작업:</span>
        <span class="stat-value">${summary.totalTasks}개</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">🔧 부품 사용:</span>
        <span class="stat-value">${summary.totalParts}건</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">💰 총 매출:</span>
        <span class="stat-value">${summary.revenue.toLocaleString()}원</span>
      </div>
    </div>
  `;
  
  // 삭제 옵션 표시/숨김
  const deleteOption = document.querySelector('.delete-option');
  if (deleteOption) {
    deleteOption.style.display = showDeleteOption ? 'block' : 'none';
  }
}

function showBackupError(message) {
  hideBackupProgress();
  alert('❌ ' + message);
}

// 전역 함수 등록
window.loadBackup = function() {
  const tabBody = document.getElementById('tab-body');
  if (tabBody) {
    tabBody.innerHTML = getBackupTabHTML();
    
    // 현재 날짜로 기본값 설정
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    
    document.getElementById('backup-year').value = currentYear;
    document.getElementById('backup-month').value = currentMonth;
  }
};