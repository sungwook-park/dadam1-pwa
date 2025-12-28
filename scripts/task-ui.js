// scripts/task-ui.js - 메인 task-ui 파일 (분리된 모듈들을 통합)

// Firebase 관련
import { db } from './firebase-config.js';
import {
  collection, query, where, getDocs, updateDoc, doc, deleteDoc, orderBy, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 외부 모듈들
import "./task-save.js";
import { loadSettlement } from './settlement/settlement-main.js';

// Utils 임포트 (직접 임포트)
import { formatKoreanDate, getTodayStart, getTomorrowStart, getNowYYYYMMDDHHMM } from './utils/date-utils.js';
import { toggleTaskDetail } from './utils/dom-utils.js';
import { renderItemsInput } from './components/task-item.js';
import { 
  getTaskSubTabsHTML, 
  getTaskInputFormHTML, 
  getTaskListHTML,
  getReserveTabHTML,
  getDoneTabHTML,
  getTaskItemHTML 
} from './templates/task-templates.js';

// CSS 파일 로드
if (!document.getElementById('task-ui-styles-link')) {
  const cssLink = document.createElement('link');
  cssLink.id = 'task-ui-styles-link';
  cssLink.rel = 'stylesheet';
  cssLink.href = '/styles/task-ui.css';
  document.head.appendChild(cssLink);
}

// 직접 임포트된 함수들 전역 등록
window.formatKoreanDate = formatKoreanDate;
window.getTodayStart = getTodayStart;
window.getTomorrowStart = getTomorrowStart;
window.renderItemsInput = renderItemsInput;
window.getNowYYYYMMDDHHMM = getNowYYYYMMDDHHMM;
window.getTaskInputFormHTML = getTaskInputFormHTML;
window.getTaskItemHTML = getTaskItemHTML;

// toggleTaskDetail 전역 함수 등록 (중복 방지)
if (typeof window.toggleTaskDetail === 'undefined') {
  window.toggleTaskDetail = toggleTaskDetail;
}

// 동적 모듈 로딩 및 전역 함수 등록
async function loadAndRegisterModules() {
  try {
    console.log('모듈 로딩 시작...');
    
    // 모든 모듈 동적 로딩
    const [navigationModule, loadersModule, handlersModule, utilsModule, statsModule] = await Promise.all([
      import('./navigation/task-navigation.js'),
      import('./loaders/task-loaders.js'),
      import('./handlers/task-handlers.js'),
      import('./utils/task-utils.js'),
      import('./components/task-stats.js')
    ]);
    
    // Navigation 함수들 등록
    window.openTab = navigationModule.openTab;
    window.backToHome = navigationModule.backToHome;
    window.showTaskTab = navigationModule.showTaskTab;
    
    // Loaders 함수들 등록
    window.loadTodayTasks = loadersModule.loadTodayTasks;
    window.loadReserveTasks = loadersModule.loadReserveTasks;
    window.loadDoneTasks = loadersModule.loadDoneTasks;
    window.searchReserveTasksEnhanced = loadersModule.searchReserveTasksEnhanced;
    window.searchDoneTasksEnhanced = loadersModule.searchDoneTasksEnhanced;
    
    // Handlers 함수들 등록
    window.completeTask = handlersModule.completeTask;
    window.deleteTask = handlersModule.deleteTask;
    window.editTask = handlersModule.editTask;
    window.cancelWorkerEdit = handlersModule.cancelWorkerEdit;
    window.addCustomWorker = handlersModule.addCustomWorker;
    window.addEditCustomWorker = handlersModule.addEditCustomWorker;
    
    // Utils 함수들 등록
    window.calculateFee = utilsModule.calculateFee;
    window.updateSelectedWorkers = utilsModule.updateSelectedWorkers;
    window.clearCache = utilsModule.clearCache;
    window.getQueryCount = utilsModule.getQueryCount;
    window.resetQueryCount = utilsModule.resetQueryCount;
    window.isCurrentUserAdmin = utilsModule.isCurrentUserAdmin;
    
    console.log('모든 함수가 성공적으로 등록되었습니다');
    
    // 개발 모드에서 Firebase 읽기량 추적
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      utilsModule.resetQueryCount();
      
      setInterval(() => {
        const count = utilsModule.getQueryCount();
        if (count > 0) {
          console.log(`Firebase 쿼리 수: ${count}`);
        }
        if (count > 20) {
          console.warn('Firebase 쿼리가 너무 많습니다. 최적화가 필요합니다.');
        }
      }, 30000);
    }
    
  } catch (error) {
    console.error('모듈 로드 실패:', error);
    // 에러 시 기본 함수들이라도 등록
    window.openTab = function(name) {
      console.error('openTab 함수 로드 실패, 모듈을 확인해주세요:', name);
    };
  }
}

// 애플리케이션 초기화
document.addEventListener('DOMContentLoaded', () => {
  console.log('Task-UI 모듈이 로드되었습니다.');
  console.log('Firebase 최적화: 캐싱 시스템 활성화');
  console.log('분리된 모듈: 7개 파일로 구조화 완료');
  
  // 초기 상태에서 편집 상태 초기화
  window.editingTaskId = null;
  window.editingTabType = null;
  
  // 모듈 로딩 시작
  loadAndRegisterModules();
});