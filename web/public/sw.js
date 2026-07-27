const CACHE_NAME = 'alarmlock-shell-v1';
const APP_SHELL = ['/', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

// Cache-first for the app shell; everything else (notably the API) goes
// straight to the network so alarm/progress data is never served stale.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request)),
  );
});

// NOTE: this service worker cannot wake the device or fire a full-screen
// alarm while the app/tab is closed — browsers do not grant PWAs a reliable
// background-execution or lock-screen wake API. Scheduled local
// notifications (see src/services/alarmScheduler.ts) only fire while the
// page is open or, on Chrome/Android with Periodic Background Sync granted,
// on a best-effort interval the OS controls. Treat this as the known
// limitation to solve with a native wrapper (Capacitor/Expo) before
// depending on AlarmLock to wake someone up unattended.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus();
      }
      return self.clients.openWindow('/');
    }),
  );
});
