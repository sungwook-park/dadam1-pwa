// scripts/utils/app-state.js - 애플리케이션 상태 관리

/**
 * 애플리케이션 전역 상태 관리 클래스
 */
class AppState {
  constructor() {
    this.reset();
    this.setupEventListeners();
  }

  /**
   * 상태 초기화
   */
  reset() {
    this.editingTaskId = null;
    this.editingTabType = null;
    this.selectedParts = [];
    this.currentUser = null;
    this.currentTab = 'home';
    this.currentSubTab = null;
    this.searchFilters = {
      date: '',
      keyword: '',
      taskType: '',
      worker: '',
      client: ''
    };
    this.taskCache = new Map();
    this.lastUpdate = null;
    
    console.log('🔄 앱 상태 초기화됨');
  }

  /**
   * 사용자 정보 설정
   * @param {object} user - 사용자 객체 { uid, email }
   */
  setCurrentUser(user) {
    this.currentUser = user;
    console.log('👤 현재 사용자:', user?.email);
  }

  /**
   * 현재 사용자 반환
   * @returns {object|null} - 사용자 객체
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * 편집 중인 작업 설정
   * @param {string} taskId - 작업 ID
   * @param {string} tabType - 탭 타입 ('today', 'reserve', 'done')
   */
  setEditingTask(taskId, tabType) {
    this.editingTaskId = taskId;
    this.editingTabType = tabType;
    console.log('✏️ 편집 중인 작업:', { taskId, tabType });
  }

  /**
   * 편집 상태 해제
   */
  clearEditingTask() {
    this.editingTaskId = null;
    this.editingTabType = null;
    console.log('✅ 편집 상태 해제됨');
  }

  /**
   * 편집 중인지 확인
   * @returns {boolean}
   */
  isEditing() {
    return this.editingTaskId !== null;
  }

  /**
   * 선택된 부품 목록 설정
   * @param {Array} parts - 부품 배열
   */
  setSelectedParts(parts) {
    this.selectedParts = Array.isArray(parts) ? [...parts] : [];
    console.log('🔧 선택된 부품:', this.selectedParts.length + '개');
  }

  /**
   * 부품 추가
   * @param {object} part - 부품 객체 { name, quantity, price }
   */
  addPart(part) {
    if (!part || !part.name) return;

    const existingIndex = this.selectedParts.findIndex(p => p.name === part.name);
    
    if (existingIndex >= 0) {
      this.selectedParts[existingIndex].quantity += (part.quantity || 1);
    } else {
      this.selectedParts.push({
        name: part.name,
        quantity: part.quantity || 1,
        price: part.price || 0
      });
    }
    
    console.log('➕ 부품 추가:', part.name);
  }

  /**
   * 부품 제거
   * @param {number} index - 부품 인덱스
   */
  removePart(index) {
    if (index >= 0 && index < this.selectedParts.length) {
      const removed = this.selectedParts.splice(index, 1)[0];
      console.log('➖ 부품 제거:', removed.name);
    }
  }

  /**
   * 모든 부품 제거
   */
  clearParts() {
    this.selectedParts = [];
    console.log('🗑️ 모든 부품 제거됨');
  }

  /**
   * 현재 탭 설정
   * @param {string} tab - 탭 이름
   * @param {string} subTab - 서브탭 이름 (선택사항)
   */
  setCurrentTab(tab, subTab = null) {
    this.currentTab = tab;
    this.currentSubTab = subTab;
    console.log('📂 현재 탭:', { tab, subTab });
  }

  /**
   * 검색 필터 설정
   * @param {object} filters - 필터 객체
   */
  setSearchFilters(filters) {
    this.searchFilters = { ...this.searchFilters, ...filters };
    console.log('🔍 검색 필터 설정:', this.searchFilters);
  }

  /**
   * 검색 필터 초기화
   */
  clearSearchFilters() {
    this.searchFilters = {
      date: '',
      keyword: '',
      taskType: '',
      worker: '',
      client: ''
    };
    console.log('🧹 검색 필터 초기화됨');
  }

  /**
   * 작업 캐시에 데이터 저장
   * @param {string} key - 캐시 키
   * @param {Array} tasks - 작업 배열
   */
  setCachedTasks(key, tasks) {
    this.taskCache.set(key, {
      data: tasks,
      timestamp: Date.now()
    });
    console.log('💾 작업 캐시 저장:', key, tasks.length + '개');
  }

  /**
   * 작업 캐시에서 데이터 가져오기
   * @param {string} key - 캐시 키
   * @param {number} maxAge - 최대 캐시 시간 (밀리초, 기본 5분)
   * @returns {Array|null} - 캐시된 작업 배열 또는 null
   */
  getCachedTasks(key, maxAge = 5 * 60 * 1000) {
    const cached = this.taskCache.get(key);
    
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > maxAge) {
      this.taskCache.delete(key);
      console.log('⏰ 캐시 만료됨:', key);
      return null;
    }
    
    console.log('📋 캐시에서 작업 로드:', key, cached.data.length + '개');
    return cached.data;
  }

  /**
   * 특정 캐시 삭제
   * @param {string} key - 캐시 키
   */
  clearCache(key) {
    if (this.taskCache.has(key)) {
      this.taskCache.delete(key);
      console.log('🗑️ 캐시 삭제됨:', key);
    }
  }

  /**
   * 모든 캐시 삭제
   */
  clearAllCache() {
    this.taskCache.clear();
    console.log('🧹 모든 캐시 삭제됨');
  }

  /**
   * 상태를 로컬 스토리지에 저장
   */
  saveToStorage() {
    try {
      const stateToSave = {
        searchFilters: this.searchFilters,
        currentTab: this.currentTab,
        currentSubTab: this.currentSubTab,
        lastUpdate: this.lastUpdate
      };
      
      localStorage.setItem('workManagementState', JSON.stringify(stateToSave));
      console.log('💾 상태 저장됨');
    } catch (error) {
      console.warn('❌ 상태 저장 실패:', error);
    }
  }

  /**
   * 로컬 스토리지에서 상태 복원
   */
  loadFromStorage() {
    try {
      const saved = localStorage.getItem('workManagementState');
      if (saved) {
        const state = JSON.parse(saved);
        this.searchFilters = { ...this.searchFilters, ...state.searchFilters };
        this.currentTab = state.currentTab || 'home';
        this.currentSubTab = state.currentSubTab;
        this.lastUpdate = state.lastUpdate;
        console.log('📂 상태 복원됨');
      }
    } catch (error) {
      console.warn('❌ 상태 복원 실패:', error);
    }
  }

  /**
   * 상태 변경 이벤트 리스너 설정
   */
  setupEventListeners() {
    // 페이지 언로드 시 상태 저장
    window.addEventListener('beforeunload', () => {
      this.saveToStorage();
    });

    // 주기적으로 상태 저장 (5분마다)
    setInterval(() => {
      this.saveToStorage();
    }, 5 * 60 * 1000);
  }

  /**
   * 디버깅용 상태 출력
   */
  debug() {
    console.log('🐛 현재 앱 상태:', {
      currentUser: this.currentUser,
      editingTaskId: this.editingTaskId,
      editingTabType: this.editingTabType,
      selectedParts: this.selectedParts,
      currentTab: this.currentTab,
      currentSubTab: this.currentSubTab,
      searchFilters: this.searchFilters,
      cacheSize: this.taskCache.size,
      lastUpdate: this.lastUpdate
    });
  }

  /**
   * 상태 검증
   * @returns {boolean} - 유효하면 true
   */
  validate() {
    const isValid = (
      typeof this.currentTab === 'string' &&
      Array.isArray(this.selectedParts) &&
      typeof this.searchFilters === 'object'
    );

    if (!isValid) {
      console.warn('⚠️ 앱 상태가 유효하지 않음');
      this.reset();
    }

    return isValid;
  }
}

// 전역 앱 상태 인스턴스 생성
export const appState = new AppState();

// 브라우저 환경에서 전역 접근 가능하도록 설정
if (typeof window !== 'undefined') {
  window.appState = appState;
  
  // 페이지 로드 시 상태 복원
  document.addEventListener('DOMContentLoaded', () => {
    appState.loadFromStorage();
  });
}

// 상태 변경을 위한 헬퍼 함수들
export const stateHelpers = {
  /**
   * 편집 모드 시작
   */
  startEditing(taskId, tabType) {
    appState.setEditingTask(taskId, tabType);
  },

  /**
   * 편집 모드 종료
   */
  stopEditing() {
    appState.clearEditingTask();
    appState.clearParts();
  },

  /**
   * 탭 변경
   */
  changeTab(tab, subTab = null) {
    appState.setCurrentTab(tab, subTab);
    appState.clearSearchFilters();
  },

  /**
   * 검색 실행
   */
  search(filters) {
    appState.setSearchFilters(filters);
    // 관련 캐시 무효화
    appState.clearCache('filtered-tasks');
  }
};

export default appState;