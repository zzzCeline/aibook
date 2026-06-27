// ========================================================
//                    AI书伴 — Service Worker
// 缓存策略：安装时预缓存 → 请求时缓存优先 → 离线回退
// ========================================================

const CACHE_NAME = 'aibook-v1-20260627';
const PRE_CACHE = [
    './',
    'index.html',
    'style.css',
    'app.js',
    'books.js',
    'config.js',
    'manifest.json',
    'icon-192.png',
    'icon-512.png',
];

// 安装事件：预缓存所有静态文件
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(PRE_CACHE).catch(function(err) {
                console.warn('SW: 部分文件预缓存失败（不影响使用）', err);
            });
        }).then(function() {
            return self.skipWaiting();
        })
    );
});

// 激活事件：清理旧版本缓存
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.filter(function(key) {
                    return key !== CACHE_NAME;
                }).map(function(key) {
                    return caches.delete(key);
                })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

// 请求拦截：缓存优先 + 网络回退 + 离线保护
self.addEventListener('fetch', function(event) {
    // 跳过 DeepSeek API 请求（必须在线）
    if (event.request.url.indexOf('api.deepseek.com') !== -1) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(function(cached) {
            // 命中缓存直接返回
            if (cached) {
                return cached;
            }

            // 否则请求网络
            return fetch(event.request).then(function(response) {
                // 只缓存成功的 GET 请求
                if (!response || response.status !== 200 || event.request.method !== 'GET') {
                    return response;
                }

                var clone = response.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(event.request, clone);
                });
                return response;
            }).catch(function() {
                // 网络失败：离线时返回主页（或已缓存的页面）
                return caches.match('./');
            });
        })
    );
});
