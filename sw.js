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
var VERSION = 'satmath-6e626fee37c6';

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

  /* 同源导航：network-first，离线回退。
     只回退到「用户点开的那个页面」；没缓存过的页（如首次打开讲义 / 记录）
     不要偷偷塞一个 drill.html 冒充，给一张明确的离线说明页。 */
  if (req.mode === 'navigate') {
    var page = url.pathname.split('/').pop() || 'index.html';
    var fallback = (page === 'index.html' || page === 'drill.html' || page === 'exam.html' || page === 'wrong.html')
      ? BASE + (page === 'index.html' ? 'drill.html' : page)
      : null;
    e.respondWith(networkFirst(req, fallback));
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
      return m || (fallback ? caches.match(fallback) : null);
    }).then(function (m) {
      return m || offlineNotice();
    });
  });
}

/* 离线且这页从未缓存过：说清楚，不拿别的页面顶包。 */
function offlineNotice() {
  var html = '<!doctype html><html lang="zh-CN"><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>离线 · SAT Math Prep</title>' +
    '<body style="margin:0;padding:56px 24px;font:16px/1.7 -apple-system,BlinkMacSystemFont,\'PingFang SC\',sans-serif;color:#0f2744;background:#fff">' +
    '<h1 style="font-size:20px;margin:0 0 10px">这个页面还没有离线副本</h1>' +
    '<p style="margin:0 0 18px;color:#5b6573">当前网络不可用，而这一页此前没有在本机打开过。连上网络刷新一次，之后就能离线使用。</p>' +
    '<p style="margin:0"><a href="' + BASE + 'drill.html" style="color:#1d4ed8;font-weight:600">先去练习页（已离线可用）</a></p>' +
    '</body></html>';
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
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
