// service-worker.js - 캐시 문제 해결 버전
const CACHE_NAME = 'dadam-pwa-v1.0.2'; // 🔧 버전 업데이트
const STATIC_CACHE = 'dadam-static-v1.0.2';
const DYNAMIC_CACHE = 'dadam-dynamic-v1.0.2';

// 정적 파일들 (변경이 적은 파일들)
const staticUrlsToCache = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// 동적 파일들 (자주 변경되는 파일들)
const dynamicUrlsToCache = [
  '/scripts/auth.js',
  '/scripts/backup.js',
  '/scripts/company-funds.js',
  '/scripts/firebase-config.js',
  '/scripts/inventory.js',
  '/scripts/parts-list.js',
  '/scripts/print-work-orders.js',
  '/scripts/settle.js',
  '/scripts/components/task-item.js',
  '/scripts/templates/inventory-templates.js',
  '/scripts/templates/task-templates.js',
  '/scripts/utils/app-state.js',
  '/scripts/utils/date-utils.js',
  '/scripts/utils/dom-utils.js',
  '/scripts/utils/error-handler.js',
  '/scripts/utils/search-utils.js'
];

// 캐시하지 않을 파일들 (항상 네트워크에서 최신 버전)
const noCacheFiles = [
  '/scripts/task-save.js',
  '/scripts/task-ui.js'
];

// Service Worker 설치
self.addEventListener('install', function(event) {
  console.log('🔧 Service Worker 설치 중... 버전:', CACHE_NAME);
  
  event.waitUntil(
    Promise.all([
      // 정적 캐시
      caches.open(STATIC_CACHE).then(function(cache) {
        console.log('📦 정적 파일 캐시 중...');
        return cache.addAll(staticUrlsToCache);
      }),
      // 동적 캐시 (실패해도 설치 진행)
      caches.open(DYNAMIC_CACHE).then(function(cache) {
        console.log('🔄 동적 파일 캐시 중...');
        return Promise.allSettled(
          dynamicUrlsToCache.map(url => 
            fetch(url).then(response => {
              if (response.ok) {
                return cache.put(url, response);
              }
            }).catch(err => {
              console.warn('캐시 실패 (무시):', url, err);
            })
          )
        );
      })
    ]).then(() => {
      console.log('✅ Service Worker 설치 완료');
      return self.skipWaiting(); // 즉시 활성화
    }).catch(err => {
      console.error('❌ Service Worker 설치 실패:', err);
    })
  );
});

// Service Worker 활성화
self.addEventListener('activate', function(event) {
  console.log('🔧 Service Worker 활성화 중...');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          // 현재 버전이 아닌 모든 캐시 삭제
          if (cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE && 
              cacheName !== CACHE_NAME) {
            console.log('🗑️ 이전 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      console.log('✅ Service Worker 활성화 완료');
      return self.clients.claim(); // 즉시 제어권 획득
    })
  );
});

// 네트워크 요청 가로채기 (개선된 캐시 전략)
self.addEventListener('fetch', function(event) {
  const url = event.request.url;
  
  // Firebase/Google API 요청은 캐시하지 않음
  if (url.includes('firebase') || 
      url.includes('googleapis') ||
      url.includes('gstatic') ||
      url.includes('firestore')) {
    return fetch(event.request);
  }
  
  // 캐시하지 않을 파일들 - 항상 네트워크 우선
  const shouldNotCache = noCacheFiles.some(file => url.includes(file));
  if (shouldNotCache) {
    console.log('🔄 네트워크 우선 (캐시 제외):', url);
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 성공하면 그대로 반환
          return response;
        })
        .catch(() => {
          // 네트워크 실패시에만 캐시에서 찾기
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // 일반 파일들 - 캐시 우선, 네트워크 폴백
  event.respondWith(
    caches.match(event.request)
      .then(function(cachedResponse) {
        // 1. 캐시에 있으면 캐시된 버전 반환
        if (cachedResponse) {
          console.log('📦 캐시에서 반환:', url);
          
          // 백그라운드에서 최신 버전 확인 (stale-while-revalidate)
          fetch(event.request)
            .then(response => {
              if (response && response.status === 200 && response.type === 'basic') {
                const responseClone = response.clone();
                const cacheName = staticUrlsToCache.includes(new URL(url).pathname) ? 
                  STATIC_CACHE : DYNAMIC_CACHE;
                
                caches.open(cacheName).then(cache => {
                  cache.put(event.request, responseClone);
                });
              }
            })
            .catch(() => {
              // 백그라운드 업데이트 실패는 무시
            });
          
          return cachedResponse;
        }
        
        // 2. 캐시에 없으면 네트워크에서 가져오기
        console.log('🌐 네트워크에서 가져오기:', url);
        return fetch(event.request)
          .then(function(response) {
            // 유효한 응답인지 확인
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // 응답을 복사하여 캐시에 저장
            const responseToCache = response.clone();
            const pathname = new URL(url).pathname;
            const cacheName = staticUrlsToCache.includes(pathname) ? 
              STATIC_CACHE : DYNAMIC_CACHE;
            
            caches.open(cacheName)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              })
              .catch(err => {
                console.warn('캐시 저장 실패:', err);
              });
            
            return response;
          })
          .catch(function() {
            // 3. 네트워크도 실패하면 오프라인 처리
            console.log('❌ 네트워크 요청 실패, 오프라인 모드');
            
            // HTML 요청이면 메인 페이지 반환
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
            
            // 기본 오프라인 응답
            return new Response('오프라인 상태입니다.', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain; charset=utf-8'
              })
            });
          });
      })
  );
});

// 캐시 강제 삭제 메시지 리스너
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('🗑️ 캐시 강제 삭제 요청 받음');
    
    event.waitUntil(
      caches.keys()
        .then(function(cacheNames) {
          return Promise.all(
            cacheNames.map(function(cacheName) {
              console.log('🗑️ 캐시 삭제:', cacheName);
              return caches.delete(cacheName);
            })
          );
        })
        .then(function() {
          console.log('✅ 모든 캐시 삭제 완료');
          // 클라이언트에게 완료 알림
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({success: true});
          }
        })
        .catch(function(err) {
          console.error('❌ 캐시 삭제 실패:', err);
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({success: false, error: err.message});
          }
        })
    );
  }
  
  // 캐시 업데이트 요청
  if (event.data && event.data.type === 'UPDATE_CACHE') {
    console.log('🔄 캐시 업데이트 요청 받음');
    
    event.waitUntil(
      Promise.all([
        // 정적 캐시 업데이트
        caches.open(STATIC_CACHE).then(cache => {
          return Promise.all(
            staticUrlsToCache.map(url => 
              fetch(url).then(response => {
                if (response.ok) {
                  return cache.put(url, response);
                }
              }).catch(err => console.warn('정적 캐시 업데이트 실패:', url))
            )
          );
        }),
        // 동적 캐시 업데이트
        caches.open(DYNAMIC_CACHE).then(cache => {
          return Promise.all(
            dynamicUrlsToCache.map(url => 
              fetch(url).then(response => {
                if (response.ok) {
                  return cache.put(url, response);
                }
              }).catch(err => console.warn('동적 캐시 업데이트 실패:', url))
            )
          );
        })
      ]).then(() => {
        console.log('✅ 캐시 업데이트 완료');
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({success: true});
        }
      })
    );
  }
});

// 푸시 알림 처리
self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || '새로운 알림이 있습니다.',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        vibrate: [100, 50, 100],
        data: {
          dateOfArrival: Date.now(),
          primaryKey: data.primaryKey || 'default'
        },
        actions: [
          {
            action: 'explore',
            title: '확인',
            icon: '/icons/icon-192x192.png'
          },
          {
            action: 'close',
            title: '닫기',
            icon: '/icons/icon-192x192.png'
          }
        ],
        requireInteraction: true,
        tag: 'dadam-notification'
      };
      
      event.waitUntil(
        self.registration.showNotification(data.title || '다담업무관리', options)
      );
    } catch (err) {
      console.error('푸시 알림 처리 오류:', err);
    }
  }
});

// 알림 클릭 처리
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.matchAll().then(function(clientList) {
        // 이미 열린 탭이 있으면 그 탭으로 이동
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === self.location.origin + '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // 열린 탭이 없으면 새 탭 열기
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});