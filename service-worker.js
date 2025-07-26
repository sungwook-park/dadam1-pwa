// service-worker.js
const CACHE_NAME = 'dadam-pwa-v1.0.1'; // 🔧 버전 업데이트
const urlsToCache = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/manifest.json',
  
  // JavaScript 파일들 (문제가 되는 파일들은 임시 제외)
  '/scripts/auth.js',
  '/scripts/backup.js',
  '/scripts/company-funds.js',
  '/scripts/firebase-config.js',
  '/scripts/inventory.js',
  '/scripts/parts-list.js',
  '/scripts/print-work-orders.js',
  '/scripts/settle.js',
  // '/scripts/task-save.js',    // 🔧 임시 캐시 제외
  // '/scripts/task-ui.js',      // 🔧 임시 캐시 제외
  
  // Components
  '/scripts/components/task-item.js',
  
  // Templates
  '/scripts/templates/inventory-templates.js',
  '/scripts/templates/task-templates.js',
  
  // Utils
  '/scripts/utils/app-state.js',
  '/scripts/utils/date-utils.js',
  '/scripts/utils/dom-utils.js',
  '/scripts/utils/error-handler.js',
  '/scripts/utils/search-utils.js',
  
  // 아이콘들
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Service Worker 설치
self.addEventListener('install', function(event) {
  console.log('Service Worker 설치 중... 버전:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('캐시 열기 성공');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        console.log('모든 파일 캐시 완료');
        return self.skipWaiting(); // 즉시 활성화
      })
  );
});

// Service Worker 활성화
self.addEventListener('activate', function(event) {
  console.log('Service Worker 활성화 중...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          // 이전 버전 캐시 삭제
          if (cacheName !== CACHE_NAME) {
            console.log('이전 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      console.log('Service Worker 활성화 완료, 버전:', CACHE_NAME);
      return self.clients.claim(); // 즉시 제어권 획득
    })
  );
});

// 네트워크 요청 가로채기 (수정된 캐시 전략)
self.addEventListener('fetch', function(event) {
  // Firebase 요청은 캐시하지 않음
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis') ||
      event.request.url.includes('gstatic')) {
    return fetch(event.request);
  }
  
  // 🔧 task-save.js와 task-ui.js는 항상 네트워크에서 최신 버전 가져오기
  if (event.request.url.includes('task-save.js') || 
      event.request.url.includes('task-ui.js')) {
    console.log('항상 네트워크에서 가져오기 (캐시 무시):', event.request.url);
    event.respondWith(
      fetch(event.request).catch(function() {
        // 네트워크 실패시에만 캐시 사용
        return caches.match(event.request);
      })
    );
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // 캐시에 있으면 캐시된 버전 반환
        if (response) {
          console.log('캐시에서 반환:', event.request.url);
          return response;
        }
        
        // 캐시에 없으면 네트워크에서 가져오기
        console.log('네트워크에서 가져오기:', event.request.url);
        return fetch(event.request).then(function(response) {
          // 유효한 응답인지 확인
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // 응답을 복사 (한 번만 사용 가능하므로)
          const responseToCache = response.clone();
          
          // 새로운 파일을 캐시에 추가
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        }).catch(function() {
          // 네트워크 실패시 오프라인 페이지 또는 기본 응답
          console.log('네트워크 요청 실패, 오프라인 모드');
          
          // HTML 요청이면 메인 페이지 반환
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// 🔧 캐시 강제 삭제 메시지 리스너 추가
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('캐시 강제 삭제 요청 받음');
    event.waitUntil(
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            console.log('캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(function() {
        console.log('모든 캐시 삭제 완료');
        // 클라이언트에게 완료 알림
        event.ports[0].postMessage({success: true});
      })
    );
  }
});

// 푸시 알림 처리 (선택사항)
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      },
      actions: [
        {
          action: 'explore',
          title: '확인',
          icon: '/icons/icon-72x72.png'
        },
        {
          action: 'close',
          title: '닫기',
          icon: '/icons/icon-72x72.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// 알림 클릭 처리
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});