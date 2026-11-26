/* TD SAT Math · Service Worker — 首屏与离线优化（罪状三）
   策略（按请求类型分流）：
   1) 导航请求（HTML）         → network-first，离线回退缓存的 drill.html
   2) 版本化资源（?v= 哈希）    → cache-first（URL 含哈希即不可变，天然缓存键）
   3) images/fonts/vendor 大件  → stale-while-revalidate（先用缓存，后台静默更新）
   4) CDN 兜底（jsdelivr/unpkg）→ stale-while-revalidate（仅当本地 vendor 失败时用到）
   5) API（Supabase 登录/进度、图片识别 VLM）→ 不拦截，network-only（数据绝不缓存、绝不回退陈旧响应）

   缓存版本号：每次部署请 bump 一次（或让 bump_assets.py 顺带写入），
   旧版本号对应的缓存会在 activate 阶段被清掉，避免 ?v= 哈希换新后缓存无限膨胀。
   v1→v2（2026-11-23）：v1 从未升过版，历史旧构建资源在缓存里永久滞留；
   导航请求 network-first 失败时（弱网/VPN 抖动）会整站回退到旧版页面。
   升版触发 activate 全量清缓存，旧构建自愈。 */
<<<<<<< HEAD
var VERSION = 'satmath-c10b23898d1a';
=======
var VERSION = 'satmath-6efb4c25ff45';
>>>>>>> 9bcf1bd (fix(history): 记录页漏装云账号模块——新设备打开看不到云端记录)

/* 从本 SW 自身路径推导站点基路径（兼容 GitHub Pages 子路径，如 /SAT-Math/） */
var BASE = self.location.pathname.replace(/\/sw\.js$/, '/');

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) {
      return c.addAll([BASE + 'drill.html', BASE + 'exam.html', BASE + 'wrong.html']);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) {
        return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  /* 跨源：仅 CDN 兜底做 SWR，其余（API）交给浏览器默认行为 = 网络直连，绝不缓存 */
  if (url.origin !== self.location.origin) {
    if (/\.(jsdelivr|unpkg)\.com$/.test(url.hostname)) {
      e.respondWith(swr(req));
    }
    return;
  }

  /* 同源导航：network-first，离线回退 */
  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, BASE + 'drill.html'));
    return;
  }

  /* 版本化资源：cache-first */
  if (url.search.indexOf('v=') >= 0) {
    e.respondWith(cacheFirst(req));
    return;
  }

  /* 大件静态资源：stale-while-revalidate */
  if (/(\/images\/|\/fonts\/|\/vendor\/)/.test(url.pathname)) {
    e.respondWith(swr(req));
    return;
  }

  /* 其余同源：network-first 兜底 */
  e.respondWith(networkFirst(req, null));
});

function networkFirst(req, fallback) {
  return fetch(req).then(function (res) {
    var copy = res.clone();
    caches.open(VERSION).then(function (c) { c.put(req, copy); });
    return res;
  }).catch(function () {
    return caches.match(req).then(function (m) {
      return m || (fallback ? caches.match(fallback) : Promise.reject(new Error('offline')));
    });
  });
}

function cacheFirst(req) {
  return caches.match(req).then(function (m) {
    if (m) return m;
    return fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(VERSION).then(function (c) { c.put(req, copy); });
      return res;
    });
  });
}

function swr(req) {
  return caches.match(req).then(function (m) {
    var refresh = fetch(req).then(function (res) {
      caches.open(VERSION).then(function (c) { c.put(req, res.clone()); });
      return res;
    }).catch(function () { return m; });
    return m || refresh;
  });
}
