// This file enables PWA functionality like offline caching.
// ไฟล์นี้เปิดใช้งานฟังก์ชัน PWA เช่น การแคชข้อมูลเพื่อใช้งานออฟไลน์

const CACHE_NAME = 'texas-pos-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/pos.html',
  '/assets/css/style.css',
  '/assets/js/pos.js',
  '/assets/js/supabase-client.js',
  '/assets/js/auth.js',
  '/assets/js/views/sales-view.js',
  '/assets/js/views/report-view.js',
  '/assets/js/views/admin-view.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
