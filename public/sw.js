// Hindu Subscription Portal - Service Worker (PWA & Web Push)
const CACHE_NAME = 'hindu-pwa-v2';
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/favicon.ico',
  '/offline.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-caching offline assets failed:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: ONLY handle offline fallback for document navigation.
// NEVER intercept or cache Next.js chunks, CSS, or JS files to avoid FOUC or style breaking.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Let browser natively handle all Next.js assets, scripts, stylesheets, and APIs
  const url = new URL(event.request.url);
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.match(/\.(css|js|map|json)$/)
  ) {
    return;
  }

  // Only handle HTML navigation requests for offline page fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html').then((cached) => {
          return cached || new Response('Offline - No connection', { status: 503, statusText: 'Service Unavailable' });
        });
      })
    );
  }
});

// Push Notifications
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Subscription Reminder', body: event.data.text() };
    }
  }

  const title = data.title || '🔔 Hindu — Subscription Renewal';
  const options = {
    body: data.body || 'Upcoming newspaper subscription requires renewal attention.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'renewal-reminder',
    data: {
      url: data.url || '/renewals',
    },
    actions: [
      { action: 'open', title: 'Open Renewals' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/renewals';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
