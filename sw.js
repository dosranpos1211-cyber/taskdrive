// タスクドライブ ランチャーの service worker
// ランチャー本体（このフォルダのファイル）だけをキャッシュする。ネット優先で、つながらないときだけキャッシュを使う。
// ツール本体（iframe の中）は別オリジンなので、ここでは一切扱わない。
var CACHE = 'taskdrive-launcher-v1';
var SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/favicon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) { return cache.addAll(SHELL); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  var url = new URL(request.url);
  // 同じオリジンの GET 以外（ツール本体など）は素通し
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(request).then(function (response) {
      if (response && response.ok) {
        var copy = response.clone();
        caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
      }
      return response;
    }).catch(function () {
      return caches.match(request, { ignoreSearch: true }).then(function (hit) {
        return hit || caches.match('./index.html');
      });
    })
  );
});
