import { precacheAndRoute } from 'workbox-precaching';

// Precache assets from build
precacheAndRoute(self.__WB_MANIFEST);

const OFFLINE_PAGE = '/offline.html';
const CACHE_NAME = 'dmt-offline-v1';

// Cache offline page on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([OFFLINE_PAGE, '/icons/icon-192x192.png']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Navigation requests - show offline page if network fails
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const offlinePage = await cache.match(OFFLINE_PAGE);
        return offlinePage || new Response('Çevrimdışı', {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      })
    );
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data?.text() };
  }

  const title = data.title || 'Bildirim';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
