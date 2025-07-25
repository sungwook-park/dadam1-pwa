// service-worker.js
const CACHE_NAME = 'dadam-pwa-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/manifest.json',
  
  // JavaScript 파일들
  '/scripts/auth.js',
  '/scripts/backup.js',
  '/scripts/company-funds.js',
  '/scripts/firebase-config.js',
  '/scripts/inventory.js',
  '/scripts/parts-list.js',
  '/scripts/print-work-orders.js',
  '/scripts/settle.js',
  '/scripts/task-save.js',
  '/scripts/task-ui.js',
  
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
  
  // 추가 아이콘들 (있으면 주석 해제)
  // '/icons/icon-72x72.png',
  // '/icons/icon-96x96.png',
  // '/icons/icon-128x128.png',
  // '/icons/icon-144x144.png',
  // '/icons/icon-152x152.png',
  // '/icons/icon-384x384.png'
];

// Service Worker 설치
self.addEventListener('install', function(event) {
  console.log('Service Worker 설치 중...');
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
      console.log('Service Worker 활성화 완료');
      return self.clients.claim(); // 즉시 제어권 획득
    })
  );
});

// 네트워크 요청 가로채기 (캐시 우선 전략)
self.addEventListener('fetch', function(event) {
  // Firebase 요청은 캐시하지 않음
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis') ||
      event.request.url.includes('gstatic')) {
    return fetch(event.request);
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