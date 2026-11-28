/* TD SAT Math · 图片错题识别导入
   上传题目截图 → 视觉大模型精确 OCR（数学公式保留 LaTeX）→ 本地多路文本匹配题库
   → Top-N 候选供核对 → 勾选后写入错题本。
   LLM 调用走应用已开通的云服务（keyless），不落地任何密钥；图片只在本机压缩后
   随单次模型请求发送，不落盘、不进错题数据。 */
(function () {
  'use strict';
  var A = window.TD_APP;
  var MARK = 'image_import_v1';
  var pages = [], busy = false, cloud = null;
  var CFG = window.TD_CLOUD_CONFIG || null;
  var state = { model: 'auto', ocr: [] };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return A.esc(s); }
  var ENGINE_LAST_ERR = '';
  function ocrEnv() {
    var wasm = false;
    try { wasm = typeof WebAssembly !== 'undefined' && typeof WebAssembly.instantiate === 'function'; } catch (e) {}
    var sw = false;
    try { sw = !!(navigator.serviceWorker && navigator.serviceWorker.controller); } catch (e) {}
    return { wasm: wasm, sw: sw };
  }
  // 面板底部那行小字：出问题时不用描述症状，看这一行就能定位
  var SELF_LINE = '';
  function diag() {
    var el = $('imgimpDiag'); if (!el) return;
    var e = ocrEnv();
    /* 英文模式别让这行小字整段中文：英文界面下状态栏中文最扎眼。 */
    var en = (window.TDI18n && window.TDI18n.get && window.TDI18n.get() === 'en') ||
      document.documentElement.getAttribute('data-lang') === 'en';
    if (en) {
      var self = SELF_LINE ? ' · Self-test ' + SELF_LINE.replace(/^自检[✓✗]\s*/, m => (m.indexOf('✓') >= 0 ? '✓ ' : '✗ ')) : '';
      el.textContent = 'Engine ' + (e.wasm ? 'wasm✓' : 'wasm✗ not supported here') +
        ' · cache ' + (e.sw ? 'sw✓' : 'sw✗ 7 MB on first use') +
        ' · ' + (OCR_READY ? 'ready' : 'not ready') +
        self +
        (ENGINE_LAST_ERR ? ' · last error: ' + ENGINE_LAST_ERR : '');
      return;
    }
    el.textContent = '内核 ' + (e.wasm ? 'wasm✓' : 'wasm✗ 这台浏览器不支持本地识别') +
      ' · 缓存 ' + (e.sw ? 'sw✓' : 'sw✗ 首贴要现下 7MB') +
      ' · 引擎 ' + (OCR_READY ? '就绪' : '未就绪') +
      (SELF_LINE ? ' · ' + SELF_LINE : '') +
      (ENGINE_LAST_ERR ? ' · 上次错误：' + ENGINE_LAST_ERR : '');
  }
  /* SILENT 期间（自动自检跑那几秒）不抢状态栏：自检是后台验证，把"正在识别文字…"
     盖在用户真正的导入进度上，人会以为自己的题在反复重试，或者干脆以为卡住了。 */
  var SILENT = false;
  var RESULT_AT = 0;   // 上一次"有结论"的时间（导入成功/没找到/跳过这种），用来给进度消息让位
  var IS_RESULT = function (m) { return /导入|最像|已在|没找到|认不出|待整理|跳过|没把握/.test(m); };
  function status(msg) {
    var m = String(msg || '');
    /* 自检期间只压掉"进度"消息；用户自己触发的结论（导入成功/没找到）照旧要显示出来，
       否则自检一跑，用户粘贴的题明明进了错题本，界面上却什么都不说。 */
    if (SILENT && !IS_RESULT(m)) return;
    /* 引擎预热/下载这类进度消息，在刚出过结论的十几秒里不许盖掉结论：
       否则会出现"明明已经导入成功，状态栏却在刷正在初始化识别内核"，看着像失败了。 */
    if (RESULT_AT && Date.now() - RESULT_AT < 15000 && /正在初始化识别内核|正在下载|首次准备识别引擎|正在启动本地识别/.test(m)) return;
    if (IS_RESULT(m)) RESULT_AT = Date.now();
    var el = $('imgimpStatus'); if (el) el.textContent = m; diag();
  }
  function progress(n, total) { var el = $('imgimpBar'); if (el) el.style.width = (total ? Math.round(n / total * 100) : 0) + '%'; }

  /* ---------------- 本地匹配器（与题库自测 top1 93% / top3 99%） ---------------- */
  var STOP = new Set(['the','a','an','of','to','in','is','are','and','or','for','on','at','by','with','that','this',
    'what','which','where','when','how','if','it','its','as','from','be','been','being','each','than','then','into',
    'about','all','one','two','three','per','total','value','given','following','equation','represents','closest',
    'nearest','approximately','does','do','can','could','would','should','will','has','have','had','not','no','but']);
  /* 强化归一化：先把常见 LaTeX 结构还原成纯文本，再走原 norm。
     这样 OCR 输出 $\frac{2}{3}$ / $x^{2}$ 能和题库的 2/3 / x^2 对齐。 */
  function preLatex(s) {
    return String(s == null ? '' : s)
      .replace(/\\(?:d)?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '$1/$2')
      .replace(/\\frac\s*(\d)\s*(\d)/g, '$1/$2')
      .replace(/\\sqrt\s*\{([^{}]+)\}/g, '$1')
      .replace(/\^\{?([^{}]{1,6})\}?/g, '^$1');
  }
  function norm(s) {
    s = preLatex(String(s == null ? '' : s));
    /* 先把 Unicode 数学字形折成 ASCII 再进白名单。以前这些字符会被最后那行白名单直接抹成空格，
       于是 x² → x、3≤x → 3 x、1,200 → 1 200：正确候选题的数字指纹被改掉，匹配就跑到别的题上。 */
    s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, function (c) { return '^' + '0123456789'.charAt('⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c)); })
         .replace(/[×·⋅]/g, '*').replace(/÷/g, '/')
         .replace(/√/g, 'sqrt')
         .replace(/≤/g, ' < ').replace(/≥/g, ' > ').replace(/≠/g, ' != ')
         .replace(/±/g, ' plusminus ')
         .replace(/½/g, ' 1/2 ').replace(/⅓/g, ' 1/3 ').replace(/⅔/g, ' 2/3 ')
         .replace(/¼/g, ' 1/4 ').replace(/¾/g, ' 3/4 ')
         .replace(/π/g, ' pi ').replace(/°/g, ' ')
         .replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 65248); })
         .replace(/(\d),(\d{3})(?!\d)/g, '$1$2');   /* 千分位合并：1,200 → 1200，不再被拆成 1 和 200 */
    s = s.toLowerCase();
    /* OCR 把数字认成同形字母是最高频的错误：S↔5、l↔1、O↔0、g↔9、B↔8。
       不修就会把 "= l0" 读成字母 l o，数字指纹直接崩，题匹配到别的题目上去。
       只在"混着数字的 token"里改，以及 l/o/s 单独成词时改，避免把 value / line 这类单词改坏。 */
    s = s.split(' ').map(function (t) {
      if (!t) return t;
      if (!/\d/.test(t)) {
        var core = t.replace(/[^a-z|]/g, '');   /* "IO," / "lO." 这种带标点的也认 */
        if (core === 'l' || core === '|') return '1';
        if (core === 'o') return '0';
        if (core === 's') return '5';
        if (core === 'io' || core === 'lo') return '10';
        return t;
      }
      return t.replace(/l/g, '1').replace(/o/g, '0').replace(/s/g, '5').replace(/g/g, '9').replace(/b/g, '8');
    }).join(' ');
    s = s.replace(/\\(?:dfrac|tfrac|frac|sqrt|left|right|quad|qquad|text|mathrm|operatorname|cdot|times|div|pm|le|ge|ne|approx|pi|theta|alpha|beta|gamma|circ|degree|overline|hat)\b/g, ' ');
    s = s.replace(/[{}$_~]/g, ' ');   /* 不再连 ^ 一起抹掉：x^2 与 x2 要分得开 */
    s = s.replace(/[−–—]/g, '-');
    s = s.replace(/\b(degrees?|percent)\b/g, ' ');
    s = s.replace(/[^a-z0-9.^/+\- ]+/g, ' ');
    return s.replace(/\s+/g, ' ').trim();
  }
  function numbers(s) {
    var out = [], re = /(\d+\s*\/\s*\d+|\d+\.\d+|\.\d+|\d+)/g, m;
    while ((m = re.exec(s))) { var v = parseFloat(m[1].replace(/\s/g, '')); if (isFinite(v)) out.push(v); }
    return out;
  }
  function tokens(s) { return s.split(' ').filter(function (w) { return w.length > 1 && !STOP.has(w); }); }
  function grams(s, n) { var o = [], c = s.replace(/ /g, ''); for (var i = 0; i <= c.length - n; i++) o.push(c.slice(i, i + n)); return o; }
  function numScore(a, b) {
    if (!a.length && !b.length) return 0.5;
    if (!a.length || !b.length) return 0;
    var pool = b.slice(), hit = 0;
    a.forEach(function (x) { var i = pool.findIndex(function (y) { return Math.abs(y - x) < 1e-6; }); if (i >= 0) { hit++; pool.splice(i, 1); } });
    return hit / Math.max(a.length, b.length);
  }
  /* 只按"查询侧覆盖率"算的重合度：题干被 OCR 截断一半时，分子不变、分母不涨。
     numRecall 返回 -1 表示查询里没数字（没法用数字判断）。 */
  function numRecall(a, b) {
    if (!a.length) return -1;
    var pool = b.slice(), hit = 0;
    a.forEach(function (x) { var i = pool.findIndex(function (y) { return Math.abs(y - x) < 1e-6; }); if (i >= 0) { hit++; pool.splice(i, 1); } });
    return hit / a.length;
  }
  function tokRecall(a, b) {
    var A1 = new Set(a), B1 = new Set(b); if (!A1.size || !B1.size) return 0;
    var n = 0; A1.forEach(function (x) { if (B1.has(x)) n++; });
    return n / A1.size;
  }
  function tokScore(a, b) {
    var A1 = new Set(a), B1 = new Set(b); if (!A1.size || !B1.size) return 0;
    var n = 0; A1.forEach(function (x) { if (B1.has(x)) n++; });
    return n / Math.sqrt(A1.size * B1.size);
  }
  function gramScore(a, b) {
    var A1 = new Set(a), B1 = new Set(b); if (!A1.size || !B1.size) return 0;
    var n = 0; A1.forEach(function (x) { if (B1.has(x)) n++; });
    return n / Math.max(1, Math.min(A1.size, B1.size));
  }
  function choicesText(e) {
    var c = e.choices || {}, out = [];
    ['A', 'B', 'C', 'D'].forEach(function (k) { if (c[k]) out.push(String(c[k])); });
    return out.join(' ');
  }
  var INDEX = null;
  function buildIndex() {
    if (INDEX) return INDEX;
    INDEX = [];
    (window.TD_BANK ? window.TD_BANK.questions : (A.BANK && A.BANK.questions) || []).forEach(function (q) {
      var e = (window.TD_TEXT || {})[q.id] || {};
      var stem = e.stem || q.stem || '';
      var n = norm(stem), nc = norm(choicesText(e));
      INDEX.push({
        id: q.id, no: q.no, sec: q.section, stem: stem,
        n: n, nums: numbers(n), toks: tokens(n), g3: grams(n, 3),
        nc: nc, cnums: numbers(nc), ctoks: tokens(nc)
      });
    });
    return INDEX;
  }
  /* 联合匹配题干 + 选项。题干权重 0.8、选项 0.2（选项是有文字时对题干的强补充）。
     返回候选带 ns(数字)/ts(词)/gs(字符ngram)/cs(选项)/score，供门禁判断。 */
  function matchQuestion(stem, choices, topN) {
    topN = topN || 5;
    var n = norm(stem), nums = numbers(n), toks = tokens(n), g3 = grams(n, 3), G3 = new Set(g3);
    var nc = norm(choices || ''), cnums = numbers(nc), ctoks = tokens(nc);
    var hasC = (cnums.length > 0) || (ctoks.length > 1);
    var scored = buildIndex().map(function (x) {
      var ns = numScore(nums, x.nums), ts = tokScore(toks, x.toks);
      var XG = new Set(x.g3), inter = 0; G3.forEach(function (g) { if (XG.has(g)) inter++; });
      var gs = inter / Math.max(1, Math.min(G3.size, XG.size));
      var stemS = 0.5 * ns + 0.35 * ts + 0.15 * gs;
      /* 截断容错：只看"查询里有多少内容在候选里找得到"，分母用查询自身长度。
         截图只拍到题干上半段、或者切块把题切一半时，老公式被候选长度拖死。 */
      var nr = numRecall(nums, x.nums), tr = tokRecall(toks, x.toks), gr = G3.size ? inter / G3.size : 0;
      var part = nr >= 0 ? (0.5 * nr + 0.35 * tr + 0.15 * gr)
                         : (0.35 * tr + 0.15 * gr) / 0.5;
      var ratio = Math.min(1, toks.length / Math.max(1, x.toks.length));
      var partS = part * (0.8 + 0.2 * ratio);
      var cs = 0;
      if (hasC) {
        var xHasC = (x.cnums.length > 0) || (x.ctoks.length > 1);
        if (xHasC) {
          var cns = (cnums.length && x.cnums.length) ? numScore(cnums, x.cnums) : -1;
          var cts = tokScore(ctoks, x.ctoks);
          cs = cns >= 0 ? (0.6 * cns + 0.4 * cts) : cts;
        }
      }
      /* 截断容错项权重。0.8 是扫出来的最优：截断题干 top1 +23pt、门禁误导归零；
         留 window.TD_MATCH_TUNE 只为以后 A/B，正常页面不用管它。 */
      var pmix = 0.8;
      var base = Math.max(stemS, partS * pmix);
      return { id: x.id, no: x.no, sec: x.sec, stem: x.stem, ns: ns, ts: ts, gs: gs, cs: cs,
        full: stemS, part: partS,
        score: hasC ? base * 0.8 + cs * 0.2 : base };
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, topN);
  }
  /* 旧接口兼容：只有题干时走题干匹配。 */
  function matchStem(query, topN) { return matchQuestion(query, '', topN); }
  /* 自动导入门禁：强综合分且明显领先第二名，或数字指纹极强时直通。
     返回 {pass, reason}。 */
  /* 题干里混进选项行时，选项的数字（4/6/8/10）会污染"数字指纹"，把本来能对上
     的题误判成"数字不符"。识别不出选项字母时最容易发生。这里从第一个 A)/A) 样式的
     选项标记处截断，只拿题干部分的数字去校验。 */
  function stripChoices(text) {
    var t = String(text || '');
    var m = t.match(/(?:^|[\s\n])(A|a)\s*[)\.]\s/);
    return m && m.index > 20 ? t.slice(0, m.index) : t;
  }

  function autoGate(cands, queryStem) {
    if (!cands || !cands.length) return { pass: false, reason: 'no-candidate' };
    var t = cands[0], r = cands[1];
    var margin = r ? t.score - r.score : 1;
    var strong = t.score >= 0.5 && margin >= 0.08;
    var qnums = numbers(norm(queryStem));
    var numFast = t.ns >= 0.88 && qnums.length >= 2 && margin >= 0.05;
    return { pass: strong || numFast, margin: margin,
      reason: strong ? 'strong' : (numFast ? 'number' : 'review') };
  }

  /* ---------------- 云 SDK / VLM ---------------- */
  function loadSdk(done) {
    if (cloud) { done(true); return; }
    if (!CFG || !CFG.endpoint || !CFG.publishableKey) { done(false); return; }
    // settled 保证回调只执行一次：旧实现里 9s 兜底与 onload/onerror 可能各调一次，
    // 导致 ocrImage 内部状态机重复触发。
    var settled = false;
    function finish(ok) { if (settled) return; settled = true; done(ok); }
    function make() {
      try {
        cloud = window.WorkBuddyCloud.createWorkBuddyCloud({
          endpoint: CFG.endpoint, oauthRelayBaseUrl: CFG.oauthRelayBaseUrl, publishableKey: CFG.publishableKey
        });
        finish(!!(cloud && cloud.llm && cloud.llm.chat));
      } catch (e) { finish(false); }
    }
    if (window.WorkBuddyCloud && window.WorkBuddyCloud.createWorkBuddyCloud) { make(); return; }
    // SDK 随站点本地化，毫秒级加载；不再依赖 CDN（之前 CDN 超时导致 sdkTried 永久锁死，
    // OCR 走本地兜底后判别阶段再也拿不到 SDK，全部保守跳过）。
    // 本地失败才尝 CDN，且 CDN 兜底钉死版本 @0.1.4（不用 @dev dist-tag，避免追最新开发版）+ SRI 校验。
    var SDK_CDN = 'https://cdn.jsdelivr.net/npm/@tencent-ai/workbuddy-cloud-sdk@0.1.4/lib/index.global.js';
    var SDK_CDN_SRI = 'sha384-6yxnkOdsYedUWX/Z+ulluqqMcfvl4EimVdKA7jFGD8P8a6yUWNPqK+du0PSKiGWJ';
    var triedLocal = false;
    function inject(src, isLocal) {
      var s = document.createElement('script');
      s.src = src; s.async = true;
      if (!isLocal) { s.integrity = SDK_CDN_SRI; s.crossOrigin = 'anonymous'; }
      s.onload = function () {
        if (window.WorkBuddyCloud && window.WorkBuddyCloud.createWorkBuddyCloud) make();
        else if (isLocal) inject(SDK_CDN, false);
        else finish(false);
      };
      s.onerror = function () {
        if (isLocal) inject(SDK_CDN, false);
        else finish(false);
      };
      document.head.appendChild(s);
    }
    inject('vendor/cloud/workbuddy-cloud-sdk.js', true);
    setTimeout(function () { if (!cloud) finish(false); }, 15000);
  }

  /* ---------------- 云端账号会话层 ----------------
     站点账号体系与图片识别 VLM 会话是两套独立体系：做题进度走站点账号，
     视觉模型调用走 Cloud SDK。这里单独保障 cloud 会话，根治无会话时 llm 调用
     返回 login_required（"该能力需要登录后使用"）导致识别从未真正可用的问题。 */
  var sessionPromise = null;
  var OAUTH_KEYS = ['code', 'state', 'provider', 'provider_id', 'error', 'error_description', 'session_state'];

  // OAuth 回调标记：SDK 默认从 location.search 读 code/state/provider。
  function oauthCallbackPresent() {
    try {
      var q = new URLSearchParams(location.search);
      if (q.get('code') && q.get('state')) return true;
      if ((q.get('provider') || '') === 'workbuddy') return true;
      return false;
    } catch (e) { return false; }
  }
  // 只清 OAuth 参数，保留页面自身的查询参数（如 wrong.html 的 ?unit=）
  function cleanOAuthParams() {
    try {
      var u = new URL(location.href);
      OAUTH_KEYS.forEach(function (k) { u.searchParams.delete(k); });
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    } catch (e) { }
  }
  function applyCloudSessionUI(hasSession) {
    var btn = $('imgimpCloudSignIn');
    if (btn) btn.hidden = !!hasSession;
    var el = $('imgimpLoginState');
    if (el) {
      /* 这行是状态，不是推销文案：「登录后精度更高」属于系统说明，摆在不贴图的人眼前只是噪音 */
      el.textContent = hasSession ? '云端账号：已登录' : '云端账号：未登录（用离线识别）';
      el.classList.toggle('is-ok', !!hasSession);
    }
  }
  function sessionRequired() {
    var e = new Error('需要先登录云端账号才能使用图片识别');
    e.error = { code: 'cloud_login_required' };
    return e;
  }
  function doEnsureSession() {
    return new Promise(function (resolve) {
      loadSdk(function (ok) {
        if (!ok) { applyCloudSessionUI(false); resolve(false); return; }
        var auth = cloud && cloud.auth;
        if (!auth || !auth.getSession) { applyCloudSessionUI(false); resolve(false); return; }
        // getSession 返回 {data,error}：data 非空表示已有会话
        Promise.resolve(auth.getSession()).then(function (r) {
          if (r && r.data) { applyCloudSessionUI(true); resolve(true); return; }
          // 无会话：先消费 OAuth 回调。页面加载早期即执行，远早于用户点识别按钮。
          if (!oauthCallbackPresent()) {
            applyCloudSessionUI(false);
            /* 不弹「未登录…登录后更准」：这是系统说明，而且每次开面板都跳一句话。
               状态行已经写着「未登录（用离线识别）」，用户看图说话就够。 */
            resolve(false);
            return;
          }
          if (!auth.handleWorkBuddyCallback) { applyCloudSessionUI(false); resolve(false); return; }
          Promise.resolve(auth.handleWorkBuddyCallback()).then(function (r2) {
            if (r2 && r2.data) {
              cleanOAuthParams();
              applyCloudSessionUI(true);
              status(EN_UI() ? 'Cloud account connected — image import ready.' : '云端账号已登录，图片识别已就绪。');
              resolve(true);
            } else {
              applyCloudSessionUI(false);
              status(EN_UI() ? 'Cloud sign-in didn\'t finish — tap “Sign in” and try again.' : '云端登录未完成，点击「登录云端账号」重试。');
              resolve(false);
            }
          }).catch(function () { applyCloudSessionUI(false); resolve(false); });
        }).catch(function () { applyCloudSessionUI(false); resolve(false); });
      });
    });
  }
  // 合并并发校验：ocrImage 与 discriminate 可能几乎同时触发，避免重复消费同一回调 state
  function ensureSession() {
    if (!sessionPromise) {
      sessionPromise = doEnsureSession().then(function (ok) {
        if (!ok) sessionPromise = null; // 失败不缓存，允许用户完成登录后重试
        return ok;
      }, function () { sessionPromise = null; return false; });
    }
    return sessionPromise;
  }
  function ensureCloudSession(cb) { ensureSession().then(cb, function () { cb(false); }); }
  function cloudSignIn() {
    loadSdk(function (ok) {
      if (!ok) { status('云服务暂不可用，请稍后重试'); return; }
      var auth = cloud && cloud.auth;
      if (!auth || !auth.signInWithOAuth) { status('当前 SDK 不支持云端登录，请更新后重试'); return; }
      // 回调必须落在图片识别所在的真实页面，才能被本文件顶部的 ensureCloudSession 消费。
      // 本站是纯静态多文件站点（wrong.html 是真实文件，不是 SPA 路由），不带历史回退问题。
      var redirectTo = location.origin + location.pathname;
      Promise.resolve(auth.signInWithOAuth({ provider: 'workbuddy', redirectTo: redirectTo })).then(function (r) {
        var url = r && r.data && r.data.url;
        if (!url) { status('登录发起失败：' + ((r && r.error && r.error.message) || '请稍后重试')); return; }
        status('正在跳转云端账号授权…');
        location.assign(url);
      }).catch(function (e) { status('登录发起失败：' + ((e && e.message) || '请稍后重试')); });
    });
  }
  // 页面加载早期消费 OAuth 回调：跳回时 URL 带 code，必须在任何识别开始前完成登录并清理参数
  ensureCloudSession(function () { });

  var SYS_PROMPT = 'You are an expert SAT Math question transcriber with near-perfect mathematical OCR. ' +
    'Read the image and output ONLY a JSON object (no prose, no markdown). Preserve every number, exponent, fraction, root and symbol exactly. ' +
    'Write math notation in LaTeX between $...$ (e.g. $x^2-2x-9=0$, $\\frac{3}{4}$, $\\sqrt{x}$). ' +
    'Fields: {"stem": "<full question text with LaTeX math>", "type": "mcq|grid", ' +
    '"choices": {"A":"...","B":"...","C":"...","D":"..."} (empty {} for grid-in), "confidence": 0-1}. ' +
    'If the image contains more than one question, transcribe only the first/top one. Do not solve the problem.';

  /* 判别式提示词：不让模型转录整题（生成式、易错），而是给它一组候选，
     让它看着图片做选择题。判别任务比转录任务精确得多。 */
  var DISCRIMINATE_PROMPT = 'You are an expert SAT Math question matcher. ' +
    'You are given ONE screenshot of a question and a numbered list of candidate questions transcribed from a question bank. ' +
    'Compare the screenshot against EVERY candidate by QUESTION CONTENT ONLY: the exact wording, all numbers, ' +
    'equations, fractions, the question type (multiple-choice vs grid-in), and the answer choices shown. ' +
    'The candidate numbers (1,2,3...) are just list positions - ignore them as clues. ' +
    'Output ONLY a JSON object: {"index": <the 1-based candidate number that best matches the screenshot>, "confidence": 0-1}. ' +
    'If none of the candidates matches the screenshot, output {"index": 0, "confidence": 0}. ' +
    'Do not try to solve the question. Do not output prose or markdown.';

  /* 保守精确判别：两个不同视觉模型各投一票，必须一致且置信度达标才采纳。
     返回 { idx, confidence, agree }；任何一环失败返回 null（上层静默跳过，绝不硬猜）。 */
  var DISCRIMINATE_MIN_CONF = 0.75;

  function discriminate(messages, candidates, model) {
    return new Promise(function (res, rej) {
      loadSdk(function (ok) {
        if (!ok) { res(null); return; }
        // 会话层：无云端会话时不做模型判别，返回 null 让下游保守跳过（绝不硬导、不推给用户点选）
        ensureCloudSession(function (signedIn) {
          if (!signedIn) {
            status('云端未登录，跳过精确匹配；本地识别结果仅供核对，不会自动导入。');
            res(null);
            return;
          }
          var chain = (!model || model === 'auto') ? MODEL_CHAIN.slice() : [model];
          var votes = [], i = 0;
          // 依次尝试模型，收集最多 2 个成功投票
          function next() {
            if (votes.length >= 2 || i >= chain.length) { res(combineVotes(votes)); return; }
            var m = chain[i++];
            status('正在比对候选题（模型 ' + i + '/' + chain.length + '）…');
            callModelOnce(messages, m, function (o) { return !!(o && o.index !== undefined); }).then(function (obj) {
              var idx = parseInt(obj.index, 10);
              var conf = parseFloat(obj.confidence);
              if (idx >= 1 && idx <= candidates.length && isFinite(conf)) {
                votes.push({ idx: idx, conf: conf, model: m });
              }
              next();
            }).catch(function () { setTimeout(next, 150); });
          }
          next();
        });
      });
    });
  }
  function combineVotes(votes) {
    if (!votes.length) return null;
    // 单票也可信，但必须高置信；两票必须一致（保守）
    if (votes.length === 1) {
      var v = votes[0];
      return v.conf >= DISCRIMINATE_MIN_CONF + 0.1 ? { idx: v.idx, confidence: v.conf, agree: false } : null;
    }
    var a = votes[0], b = votes[1];
    if (a.idx !== b.idx) return null; // 两模型分歧 → 不确定，跳过
    var conf = Math.min(a.conf, b.conf); // 取较低者，保守
    return conf >= DISCRIMINATE_MIN_CONF ? { idx: a.idx, confidence: conf, agree: true } : null;
  }
  /* 构造判别消息：只给题干+选项原文，绝不给题号/ID——题号不可靠，
     不能让它成为模型的判断线索。候选序号(1..N)仅用于投票映射回内部 id。 */
  function discriminateMessages(dataUrl, candidates) {
    var list = candidates.map(function (c, i) {
      var ch = c.choices || {};
      var chs = ['A', 'B', 'C', 'D'].map(function (k) { return ch[k] ? k + ') ' + ch[k] : ''; }).filter(Boolean).join(' | ');
      return (i + 1) + '. Question: ' + (c.stem || '') + '\n' +
        (chs ? '   Choices: ' + chs + '\n' : '   Type: grid-in\n');
    }).join('\n');
    return [
      { role: 'system', content: DISCRIMINATE_PROMPT },
      { role: 'user', content: [
        { type: 'text', text: 'Screenshot:\n\nCandidates:\n' + list + '\n\nReturn {"index":N,"confidence":x}.' },
        { type: 'image_url', image_url: { url: dataUrl } }
      ] }
    ];
  }

  function compressImage(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        /* 只按宽度限幅，不按"最长边"限幅：长截图（1280×4000 这种整页/整屏截图）
           按最长边一缩，宽度只剩 400px，字全糊成一团——这正是"整页截图认不出"的元凶。
           高度放到 12000 再兜一次，避免离谱图把内存撑爆。 */
        var MAXW = 1700, MAXH = 12000, W = img.width, H = img.height;
        var sc = Math.min(1, MAXW / W);
        if (H * sc > MAXH) sc = MAXH / H;
        W = Math.max(1, Math.round(W * sc)); H = Math.max(1, Math.round(H * sc));
        var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, W, H); cx.drawImage(img, 0, 0, W, H);
        res({ url: cv.toDataURL('image/jpeg', 0.82), thumb: cv.toDataURL('image/jpeg', 0.5), w: W, h: H });
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('图片读取失败')); };
      img.src = url;
    });
  }
  /* 一张截屏里常有 3~5 道题并排/竖排。整块喂给 OCR 会把几道题的题干糊成一锅（数字互相串），
     匹配自然不稳、认不出来。这里按"横向空白带"把图切成一块一块，每块当成一道题分别识别。
     切不动（单题大图、有题图/表格）就原样整张走老流程，不改变原有行为。 */
  function splitBands(dataUrl, depth) {
    depth = depth || 0;
    return new Promise(function (res) {
      var img = new Image();
      img.onload = function () {
        try {
          var W = img.width, H = img.height, sc = Math.min(1, 980 / W);
          var cw = Math.max(1, Math.round(W * sc)), ch = Math.max(1, Math.round(H * sc));
          var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
          var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cw, ch); cx.drawImage(img, 0, 0, cw, ch);
          var px = cx.getImageData(0, 0, cw, ch).data;
          var i, x, y;

          /* 双栏页（PDF 论文/真题书排版）先竖着切一刀：两栏的文字在同一个横向行里，
             按横向空白带切根本切不开，OCR 会把左右两栏交错读成一句（实测"Line r ... The graph of 4x..."）。
             找"整列都是空白"的竖直缝，位置在中间区域、左右两边都还有字，才认定是两栏。 */
          if (depth < 1) {
            var colInk = [], m;
            for (x = 0; x < cw; x++) {
              m = 0;
              for (y = 0; y < ch; y += 2) {
                i = (y * cw + x) * 4;
                if (px[i] < 205 || px[i + 1] < 205 || px[i + 2] < 205) { m++; if (m > 2) break; }
              }
              colInk.push(m > 2);
            }
            /* 收集所有"整列空白"的竖条，再从里面挑最靠中间的那条。
               只取全局最长会把右边页边距当成中缝（页边距往往比中缝更宽），于是一直切不开。 */
            var runs = [], runStart = -1, len;
            for (x = 0; x <= cw; x++) {
              var blank = x < cw ? !colInk[x] : false;
              if (blank) { if (runStart < 0) runStart = x; }
              else if (runStart >= 0) { len = x - runStart; runs.push([runStart, len]); runStart = -1; }
            }
            var bestStart = -1, bestLen = 0;
            runs.forEach(function (r) {
              if (r[1] < 20) return;
              if (r[0] <= cw * 0.2 || r[0] + r[1] >= cw * 0.85) return;   // 只认中间那块
              if (r[1] > bestLen) { bestLen = r[1]; bestStart = r[0]; }
            });
            if (bestLen) {
              var gx0 = bestStart, gx1 = bestStart + bestLen;
              var li = 0, ri = 0, k;
              for (k = 0; k < gx0; k++) if (colInk[k]) li++;
              for (k = gx1; k < cw; k++) if (colInk[k]) ri++;
              /* 两道打字保险：左右各自至少要有 3 行文字，才可能是真的双栏排版。
                 只有一行题干时，句子中间那个空格在竖直方向看也是"整列空白"，
                 不加这道锁会把一整行题从中间劈开，两半都匹配不上（实测
                 "If 2(x - 5) + 3(x - 5)" / "10, what is the value of x - 5 ?" 被劈成两块）。 */
              /* 数"文字行数"（连续的墨迹横带），不是数像素行：只有一行题干时左右各只有 1 带。 */
              var bandL = 0, bandR = 0, prevL = false, prevR = false, inL, inR;
              for (y = 0; y < ch; y += 2) {
                inL = inR = false;
                for (x = 0; x < gx0; x += 2) { i = (y * cw + x) * 4; if (px[i] < 205) { inL = true; break; } }
                for (x = gx1; x < cw; x += 2) { i = (y * cw + x) * 4; if (px[i] < 205) { inR = true; break; } }
                if (inL && !prevL) bandL++;
                if (inR && !prevR) bandR++;
                prevL = inL; prevR = inR;
              }
              var looksTwoCol = bandL >= 3 && bandR >= 3;
              if (looksTwoCol && li > cw * 0.06 && ri > cw * 0.06) {
                var xL = Math.max(1, Math.round(gx0 / sc)), xR = Math.min(W - 1, Math.round(gx1 / sc));
                var half = function (sx, sw) {
                  var c2 = document.createElement('canvas'); c2.width = sw; c2.height = H;
                  var x2 = c2.getContext('2d'); x2.fillStyle = '#fff'; x2.fillRect(0, 0, sw, H);
                  x2.drawImage(img, sx, 0, sw, H, 0, 0, sw, H);
                  return c2.toDataURL('image/jpeg', 0.9);
                };
                var lUrl = half(0, xL), rUrl = half(xR, W - xR);
                return Promise.all([splitBands(lUrl, depth + 1), splitBands(rUrl, depth + 1)]).then(function (two) {
                  res(two[0].concat(two[1]));
                });
              }
            }
          }

          var ink = [];
          for (y = 0; y < ch; y++) {
            var n = 0;
            for (x = 0; x < cw; x++) {
              i = (y * cw + x) * 4;
              if (px[i] < 205 || px[i + 1] < 205 || px[i + 2] < 205) { n++; if (n > 6) break; }
            }
            ink.push(n > 6);   // 这一行有字
          }
          // 找空白带：连续 >= 18 行没有字，就当成一道题的分界
          var blocks = [], start = -1, blank = 0;
          for (y = 0; y < ch; y++) {
            if (ink[y]) { if (start < 0) start = y; blank = 0; }
            else if (start >= 0) { blank++; if (blank >= 18) { blocks.push([start, y - blank]); start = -1; blank = 0; } }
          }
          if (start >= 0) blocks.push([start, ch - 1]);
          blocks = blocks.filter(function (b) { return b[1] - b[0] >= 10; });
          /* 顶端若是一小行标题（"Questions 12-15"、页码），把它并进第一块，避免多出一道假题。
             阈值按"原图 30px"算：按比例算会随图高变化，长截图时把正常短题也并掉，两题混一条。 */
          if (blocks.length > 1 && (blocks[0][1] - blocks[0][0]) < 30 * sc) { blocks[1] = [blocks[0][0], blocks[1][1]]; blocks.shift(); }
          if (blocks.length < 2 || blocks.length > 8) return res([{ url: dataUrl }]);
          var out = blocks.map(function (b) {
            var y0 = Math.max(0, Math.round(b[0] / sc) - 8), y1 = Math.min(H, Math.round(b[1] / sc) + 8);
            var hh = y1 - y0; if (hh < 30) return null;
            var c2 = document.createElement('canvas'); c2.width = W; c2.height = hh;
            var x2 = c2.getContext('2d'); x2.fillStyle = '#fff'; x2.fillRect(0, 0, W, hh);
            x2.drawImage(img, 0, y0, W, hh, 0, 0, W, hh);
            return { url: c2.toDataURL('image/jpeg', 0.85), thumb: c2.toDataURL('image/jpeg', 0.5) };
          }).filter(Boolean);
          res(out.length >= 2 ? out : [{ url: dataUrl }]);
        } catch (e) { res([{ url: dataUrl }]); }
      };
      img.onerror = function () { res([{ url: dataUrl }]); };
      img.src = dataUrl;
    });
  }
  // 视觉模型自动 fallback 链：全部来自当前应用 enabled + supportsImages 的真实模型 ID，
  // 免费/低倍率且视觉能力强的排前面。任一模型未授权/限流/额度不足/网关错误，自动尝试下一个。
  var MODEL_CHAIN = [
    'hy4flash-free',       // x0.00 免费 · 混元视觉
    'glm-4.6v',            // 老牌视觉模型
    'deepseek-v4.1-flash', // 原生多模态
    'glm-5.3-flash',       // 原生多模态
    'minimax-m3.1-flash',  // 原生多模态
    'space-bunny',         // 匿名多模态
    'mimo-v2.6-pro',       // 多模态
    'step-5-preview',      // 视觉旗舰
    'hy4std',              // 混元旗舰
    'auto'                 // 平台自动兜底
  ];
  function errCode(e) { return (e && e.error && e.error.code) || ''; }
  function errText(e) {
    var code = errCode(e);
    var retries = e && e.retryAfterMs;
    var tried = e && e._tried ? '（已自动尝试 ' + e._tried + ' 个视觉模型）' : '';
    if (code === 'cloud_login_required') return '云端识别需要先登录账号，请点击「登录云端账号」后重试';
    if (String(code).indexOf('auth_') === 0) return '云服务校验失败：请从应用线上域名访问后重试。';
    if (code === 'quota_exhausted' || code === 'quota_insufficient') return '云端模型额度不足，请在应用管理后台补充额度后再试' + tried + '。';
    if (code === 'quota_rate_limited') return '视觉模型服务暂时繁忙' + (retries ? '（建议 ' + Math.ceil(retries / 1000) + ' 秒后重试）' : '') + tried + '，请稍后再试。';
    if (code === 'model_not_granted') return '视觉模型暂时不可用' + tried + '，请稍后再试。';
    if (code === 'gateway_network_error') {
      return '无法连接云端模型服务：请先确认当前网络正常；若网络正常仍失败，通常是云端应用的站点域名授权被重置，' +
        '需到 WorkBuddy 后台把本站点域名重新加入允许列表' + tried + '。';
    }
    if (String(code).indexOf('gateway_') === 0 || String(code).indexOf('model_') === 0) return '模型服务暂时不可用' + tried + '，请重试。';
    if (code === 'ocr_timeout') return '识别超时，请换一张更清晰的图片重试。';
    if (code === 'local_ocr_timeout') return '本地识别超时（网络过慢），请换个网络或稍后点「重试失败项」。';
    if (code === 'local_stage_timeout') return '本地识别组件加载超时，请换个网络或稍后点「重试失败项」。';
    return (e && e.message) || '识别失败，请重试。';
  }
  // 单次调用：把一个模型的流式返回解析成 JSON，失败则抛错交给上层 fallback。
  // validate 可选：默认要求 {stem}（转录）；判别模式传函数校验 {index}。
  function callModelOnce(messages, model, validate) {
    return new Promise(function (res, rej) {
      var answer = '';
      var timer = setTimeout(function () { var e = new Error('识别超时'); e.error = { code: 'ocr_timeout' }; rej(e); }, 30000);
      (async function () {
        try {
          for await (var chunk of cloud.llm.chat.completions.create({ model: model, messages: messages, stream: true, response_format: { type: 'json_object' } })) {
            var d = chunk && chunk.choices && chunk.choices[0] && chunk.choices[0].delta;
            if (d && d.content) answer += d.content;
          }
          clearTimeout(timer);
          var clean = answer.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
          var obj;
          try { obj = JSON.parse(clean); } catch (e2) {
            var a = clean.indexOf('{'), b = clean.lastIndexOf('}');
            if (a >= 0 && b > a) { try { obj = JSON.parse(clean.slice(a, b + 1)); } catch (e3) { obj = null; } }
          }
          var valid = validate ? validate(obj) : !!(obj && obj.stem);
          if (!valid) { var pe = new Error('模型未返回有效结果'); pe.error = { code: 'ocr_no_stem' }; throw pe; }
          obj._model = model;
          res(obj);
        } catch (e) { clearTimeout(timer); rej(e); }
      })();
    });
  }
  /* 双模型交叉验证：比对两份转录的数字指纹。
     数字一致 → 高可信，取题干更长（更完整）的一份；
     数字不一致 → 取数字集更丰富的一份，并下调 confidence 让下游门禁更保守。 */
  function pickBestOcr(a, b) {
    var na = numbers(norm(a.stem || '')), nb = numbers(norm(b.stem || ''));
    var overlap = numScore(na, nb);
    var agree = overlap >= 0.9 || (na.length === 0 && nb.length === 0);
    var win = (String(a.stem || '').length >= String(b.stem || '').length) ? a : b;
    var other = (win === a) ? b : a;
    var out = {
      stem: win.stem, type: win.type || other.type || 'mcq',
      choices: (win.choices && Object.keys(win.choices).length) ? win.choices : (other.choices || {}),
      confidence: agree ? Math.max(win.confidence || 0, other.confidence || 0)
                        : Math.min(win.confidence || 0.6, other.confidence || 0.6),
      _model: win._model + '+' + other._model,
      _cross: true, _agree: agree
    };
    return out;
  }
  /* ---------------- 本地 OCR 兜底（Tesseract.js WASM，无需登录/密钥/域名授权） ----------------
     云端 VLM 不可用（未授权域名、限流、断网等）时自动启用：组件/内核/语言包**本地全量打包优先**，
     离线可完整识别（vendor/tesseract 已含 5.1.1 全套），CDN 仅作镜像兜底。
     识别全程在浏览器内完成，图片不上传任何服务器。适合 Bluebook 截图这类清晰印刷体。 */
  // 镜像链：本地优先（离线/快），jsdelivr、unpkg 兜底（本地缺非 SIMD 内核或极端网络时）。
  // 每个镜像自带 script/worker/core/lang 四件套，worker 会按 SIMD/LSTM 自行拼 core 文件名。
  var TESS_CDN_SRI = 'sha384-GJqSu7vueQ9qN0E9yLPb3Wtpd7OrgK8KmYzC8T1IysG1bcvxvIO4qtYR/D3A991F';
  var TESS_MIRRORS = [
    { script: 'vendor/tesseract/tesseract.min.js', worker: 'vendor/tesseract/worker.min.js', core: 'vendor/tesseract', lang: 'vendor/tesseract' },
    { script: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js', worker: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js', core: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1', lang: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int' },
    { script: 'https://unpkg.com/tesseract.js@5.1.1/dist/tesseract.min.js', worker: 'https://unpkg.com/tesseract.js@5.1.1/dist/worker.min.js', core: 'https://unpkg.com/tesseract.js-core@5.1.1', lang: 'https://unpkg.com/@tesseract.js-data/eng@1.0.0/4.0.0_best_int' }
  ];
  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    function attempt(mi) {
      return new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = TESS_MIRRORS[mi].script;
        s.async = true;
        if (mi > 0) { s.integrity = TESS_CDN_SRI; s.crossOrigin = 'anonymous'; }  // CDN 兜底加 SRI，本地同源无需
        s.onload = function () { window.Tesseract ? resolve(window.Tesseract) : reject(new Error('组件加载失败')); };
        s.onerror = function () { reject(new Error('组件加载失败（网络）')); };
        document.head.appendChild(s);
      });
    }
    // 不缓存 rejected 状态：失败后换镜像/允许重试，避免一次网络抖动永久锁死
    return attempt(0).catch(function () { return attempt(1).catch(function () { return attempt(2); }); });
  }
  /* 本地引擎常驻：worker 建一次一直用。
     原来每次识别都 createWorker + terminate，等于每贴一张图就重走一遍内核初始化
     （语言包 2.9MB 解压 + wasm 编译），再快也要 2~4 秒，还得反复吃网络。
     现在页面打开后在空闲时就把引擎建好、语言包读进内存，贴图只跑 recognize。 */
  var OCR_W = null, OCR_WARM = null, OCR_READY = false, TESS_FAST = 0;

  function createWorkerAt(T, mi, onProgress) {
    var m = TESS_MIRRORS[mi];
    var opts = function (useBlob) { return {
      workerPath: m.worker,
      corePath: m.core,
      langPath: m.lang,
      gzip: true,
      workerBlobURL: useBlob,
      logger: function (msg) {
        if (!onProgress || !msg) return;
        if (msg.status === 'loading language traineddata' && msg.progress < 1) {
          onProgress('正在下载识别语言包 ' + Math.round(msg.progress * 100) + '%');
        } else if (msg.status === 'initializing api') {
          onProgress('正在初始化识别内核…');
        }
      }
    }; };
    /* 默认 tesseract.js 会用 blob: URL 现场造一个 Worker。豆包内置浏览器这类 WebView
       里 blob Worker 常被直接拦掉，表现就是"卡在启动本地识别、一直不出字"。
       我们的 worker.min.js 就在同源 vendor/ 下，直接按 URL 加载就不依赖 blob；
       万一某个环境反过来只认 blob，再退回去试一次。 */
    /* 哪个先试取决于镜像是否同源：跨域镜像（jsdelivr/unpkg）用脚本 URL 造 Worker
       必然被浏览器拦（"cannot be accessed from origin"），那条尝试纯属白等还把
       错误写进诊断行，让人以为坏了。所以跨域直接走 blob，同源才先走脚本 URL。 */
    var sameOrigin = false;
    try { sameOrigin = (new URL(m.worker, location.href)).origin === location.origin; } catch (e) { }
    return T.createWorker('eng', 1, opts(sameOrigin ? false : true)).catch(function (e) {
      ENGINE_LAST_ERR = (e && e.message) || String(e);
      return T.createWorker('eng', 1, opts(sameOrigin ? true : false));
    });
  }

  /* 不再 fetch CDN 探测顺序：站点 CSP 的 connect-src 只放行同源/Supabase，
     jsdelivr/unpkg/cdnjs 会被浏览器直接拒绝，控制台每页刷 4 条错误，耗时还全 1e9。
     优先复用上次成功的镜像；没有记录就按内置顺序逐个回落到可用镜像。
     真正性能来自单 worker 常驻 + 预取，不靠探测。 */
  function probeOrder() {
    var all = [0, 1, 2];
    var first = TESS_FAST >= 0 && TESS_FAST < 3 ? TESS_FAST : 0;
    return Promise.resolve([first].concat(all.filter(function (i) { return i !== first; })));
  }

  /* 首次使用要下 6.8MB 引擎（国内实测 GitHub Pages 约 440KB/s ≈ 15 秒），
     以前这段只显示"正在初始化识别内核"，人只能干等、还以为卡死。
     这里自己先把内核 + 语言包并行拉一遍：内核和语言包原本在 worker 里是串行的，
     并行能省掉一次完整往返；顺便报出真实 MB 和预计剩余时间。
     只在 SW 已接管时做（否则预取的文件 worker 不认，等于白下 6.8MB）。 */
  var ENGINE_FILES = [
    ['vendor/tesseract/tesseract.min.js', 123724],
    ['vendor/tesseract/worker.min.js', 66995],
    ['vendor/tesseract/tesseract-core-simd-lstm.wasm.js', 3938657],
    ['vendor/tesseract/eng.traineddata.gz', 2952873]
  ];
  var ENGINE_TOTAL = 3938657 + 2952873 + 123724 + 66995;

  function prefetchEngine(onProgress) {
    var ctrl = navigator.serviceWorker && navigator.serviceWorker.controller;
    if (!ctrl) return Promise.resolve();
    var got = 0, t0 = Date.now(), done = false;
    function report() {
      if (!onProgress || done) return;
      var mb = (got / 1048576).toFixed(1), tot = (ENGINE_TOTAL / 1048576).toFixed(1);
      var sec = got > 262144 ? Math.max(1, Math.round((ENGINE_TOTAL - got) / (got / ((Date.now() - t0) / 1000)))) : null;
      onProgress('首次准备识别引擎 ' + mb + '/' + tot + 'MB' + (sec ? '（约剩 ' + sec + ' 秒，之后永久缓存不用再下）' : '…'));
    }
    report();
    var jobs = ENGINE_FILES.map(function (f) {
      return fetch(f[0], { cache: 'force-cache' }).then(function (r) {
        /* 404/500 也会 resolve，不能拿错误页的字节数冒充“下载进度”；不 ok 就不计数。 */
        if (!r.ok) return 0;
        var rd = r.body && r.body.getReader ? r.body.getReader() : null;
        if (!rd) { got += f[1]; report(); return 1; }
        function pump() {
          return rd.read().then(function (x) {
            if (x.done) return 1;
            got += x.value.length; report(); return pump();
          });
        }
        return pump();
      }).catch(function () { return 1; });
    });
    return Promise.all(jobs).then(function () { done = true; return 1; });
  }

  function warmOcr(onProgress) {
    if (OCR_W) return Promise.resolve(OCR_W);
    if (OCR_WARM) return OCR_WARM;
    OCR_WARM = prefetchEngine(onProgress).then(function () { return loadTesseract(); }).then(function (T) {
      function bounded(mi) {
        var t;
        return Promise.race([
          createWorkerAt(T, mi, onProgress),
          new Promise(function (_, reject) {
            t = setTimeout(function () {
              var e = new Error('镜像 ' + (mi + 1) + ' 加载超时');
              e.error = { code: 'local_stage_timeout' };
              reject(e);
            }, 15000);
          })
        ]).then(function (w) { clearTimeout(t); return w; }, function (e) { clearTimeout(t); throw e; });
      }
      /* 镜像顺序不能写死：中国网络下 GitHub Pages / jsdelivr / unpkg 谁快谁慢看运气。
         但也不能同时起三个 Worker —— 实测三个 wasm 内核抢内存/线程会把唯一本该成功的
         本地内核饿死，冷启动 60 秒还不就绪。所以先花几百毫秒探一下谁响应快，
         再只建一个 Worker，按探测顺序回落。 */
      return probeOrder().then(function (order) {
        /* 保留「先探测、再按序回落」的原策略（三个 Worker 同时起会互相饿死内核，
           实测冷启动 60 秒都不就绪），但换成显式 settled 标记：超时兜底与
           onload/onerror 竞态时只认第一个成功，不会重复 resolve 或半途改写结果。 */
        return new Promise(function (resolve, reject) {
          var settled = false, k = 0;
          function next() {
            if (settled) return;
            if (k >= order.length) { reject(new Error('三个镜像都没起来')); return; }
            var mi = order[k++];
            bounded(mi).then(function (w) {
              if (settled) { try { w.terminate && w.terminate(); } catch (e) {} return; }
              settled = true;
              resolve(w);
            }, function () { if (!settled) next(); });
          }
          next();
        });
      });
    }).then(function (w) {
      OCR_W = w; OCR_READY = true;
      /* 起来了就把中间那些失败尝试从诊断行抹掉：同源/跨域某个镜像试失败很常见，
         留着"上次错误"只会让人以为引擎坏了。 */
      ENGINE_LAST_ERR = '';
      // 单题截图是"一整块文字"，按单块版面分析比默认的全页分析准
      try { w.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' }); } catch (e) { console.warn('设置识别参数失败', e); }
      return w;
    }).catch(function (e) {
      OCR_WARM = null; OCR_READY = false;
      ENGINE_LAST_ERR = (e && e.message) || String(e);
      diag();
      /* 引擎彻底起不来时别让人干等：直接告诉他有条不依赖引擎的路。 */
      try {
        if (!document.getElementById('imgImportPanel').hidden) {
          status('本地识别引擎这次没起来（' + ENGINE_LAST_ERR + '）。不用等它，把题干文字贴到上面的框里点「用文字导入」，一样能配题写库。');
        }
      } catch (e2) {}
      throw e;
    });
    return OCR_WARM;
  }

  /* 诊断行每 2 秒自己刷新：引擎是在后台异步就绪的，不刷新人就永远看着
     「未就绪」——这也是之前误判「卡住」的来源。 */
  if (!window.__imgimpDiagTimer) {
    window.__imgimpDiagTimer = setInterval(function () { try { diag(); } catch (e) {} }, 2000);
  }

  function engineWarmInBackground() {
    if (OCR_READY || OCR_WARM) return;
    var go = function () { warmOcr(function (msg) { status(msg); }).catch(function () {}); };
    if (window.requestIdleCallback) window.requestIdleCallback(go, { timeout: 4000 });
    else setTimeout(go, 2500);
  }

  function localOcr(dataUrl) {
    var timer;
    var work = warmOcr(function (msg) { status(msg); }).then(function (w) {
      status('正在识别文字…');
      return w.recognize(dataUrl).then(function (out) {
        var raw = String((out && out.data && out.data.text) || '').replace(/\s+/g, ' ').trim();
        var conf = out && out.data && isFinite(out.data.confidence) ? out.data.confidence / 100 : 0.6;
        if (raw.length < 8) throw new Error('本地识别未读到有效文字');
        return { stem: raw, type: 'mcq', choices: {}, confidence: Math.max(0.5, Math.min(0.95, conf)), _model: 'tesseract-local' };
      }, function (e) {
        // 引擎状态可能已坏（内存/线程异常），丢掉重来，下次自动重建
        try { w.terminate(); } catch (e2) { console.warn('重置识别引擎失败', e2); }
        OCR_W = null; OCR_WARM = null; OCR_READY = false;
        throw e;
      });
    });
    var timeout = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        var e = new Error('本地识别超时（引擎没在 26 秒内出结果）');
        e.error = { code: 'local_ocr_timeout' };
        reject(e);
      }, 26000);
    });
    return Promise.race([work, timeout]).then(function (out) { clearTimeout(timer); return out; },
      function (e) { clearTimeout(timer); throw e; });
  }

  /* 同一块图多试几种预处理，谁跟题库对得上用谁。
     现实里"认不出来"多半不是引擎坏了，是这张图的字太小/太淡/带底纹：
     放大 1.6 倍、或转灰度拉对比，往往就能认出来。评分用题库匹配分，
     而不是 OCR 自己的置信度——认错字但认得很自信的情况太常见。 */
  /* 反色：深色背景的截图（暗色模式 PDF、拍照的黑板/屏幕）Tesseract 直接认不出，
     把像素取反变成白底黑字它就能读。只在前几遍分数都不够时用，不占常规耗时。 */
  function invertImage(dataUrl) {
    return new Promise(function (res) {
      var img = new Image();
      img.onload = function () {
        try {
          var cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
          var cx = cv.getContext('2d');
          cx.drawImage(img, 0, 0);
          var d = cx.getImageData(0, 0, cv.width, cv.height), px = d.data;
          for (var i = 0; i < px.length; i += 4) {
            px[i] = 255 - px[i]; px[i + 1] = 255 - px[i + 1]; px[i + 2] = 255 - px[i + 2];
          }
          cx.putImageData(d, 0, 0);
          res(cv.toDataURL('image/png'));
        } catch (e) { res(null); }
      };
      img.onerror = function () { res(null); };
      img.src = dataUrl;
    });
  }

  function scaleImage(dataUrl, scale, gray) {
    return new Promise(function (res) {
      var img = new Image();
      img.onload = function () {
        try {
          var W = Math.round(img.width * scale), H = Math.round(img.height * scale);
          var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
          var cx = cv.getContext('2d');
          cx.fillStyle = '#fff'; cx.fillRect(0, 0, W, H);
          cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
          cx.drawImage(img, 0, 0, W, H);
          if (gray) {
            var d = cx.getImageData(0, 0, W, H), px = d.data;
            for (var i = 0; i < px.length; i += 4) {
              var g = (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11);
              g = g > 150 ? 255 : (g < 105 ? 0 : Math.round((g - 105) / 45 * 255));
              px[i] = px[i + 1] = px[i + 2] = g;
            }
            cx.putImageData(d, 0, 0);
          }
          res(cv.toDataURL('image/jpeg', 0.9));
        } catch (e) { res(null); }
      };
      img.onerror = function () { res(null); };
      img.src = dataUrl;
    });
  }

  function ocrBest(dataUrl, model, quick) {
    var best = null;
    function scoreOf(text) {
      var r = matchQuestion(String(text || ''), '', 5);
      return r.length ? r[0].score : 0;
    }
    function run(url, tag) {
      status(tag === 'base' ? '正在识别文字…' : (tag === 'zoom' ? '字有点小，放大后再认一次…'
        : (tag === 'invert' ? '像是深色背景，取反后再认一次…' : '对比度不够，换个方式再认一次…')));
      return ocrImage(url, model).then(function (ocr) {
        var sc = scoreOf(ocr.stem);
        if (!best || sc > best.score) best = { ocr: ocr, url: url, score: sc };
        return sc;
      }, function () { return -1; });
    }
    return run(dataUrl, 'base').then(function (sc) {
      if (sc >= 0.62 || quick) return best;   // 多块/已经慢了：只认一遍，别为一道题耗十几秒
      return scaleImage(dataUrl, 1.6).then(function (v) {
        if (!v) return best;
        return run(v, 'zoom').then(function (sc2) {
          if (sc2 >= 0.62 || (best && best.score >= 0.5)) return best;
          return scaleImage(dataUrl, 1.25, true).then(function (v2) {
            if (!v2) return best;
            return run(v2, 'gray').then(function (sc3) {
              if (sc3 >= 0.5 || (best && best.score >= 0.42)) return best;
              /* 深色背景最后补一刀：取反后再认一次 */
              return invertImage(dataUrl).then(function (v3) {
                if (!v3) return best;
                return run(v3, 'invert').then(function () { return best; });
              });
            });
          });
        });
      });
    }).then(function (r) {
      if (!r || !r.ocr) throw new Error('本地识别未读到有效文字');
      return r;
    });
  }

  function ocrImage(dataUrl, model) {
    return new Promise(function (res, rej) {
      // 云端走不通时的统一兜底：本地 WASM OCR
      function fallbackLocal(why) {
        status('云端识别不可用，正在切换本地识别…');
        // 本地兜底也失败时，优先展示本地原因（更贴近可操作信息），云端原因只在本地无有效错误时兜底
        localOcr(dataUrl).then(res, function (localErr) {
          rej((localErr && localErr.message) ? localErr : (why || localErr || new Error('云端与本地识别均失败')));
        });
      }
      loadSdk(function (ok) {
        if (!ok) { fallbackLocal(new Error('云服务不可用，已切换本地识别')); return; }
        // 会话层：无云端会话时走本地 OCR 兜底（保留离线可用），并提示登录后精度更高
        ensureCloudSession(function (signedIn) {
          if (!signedIn) {
            status('云端未登录，本次用本地识别（精度较低）；点「登录云端账号」可启用精确识别。');
            fallbackLocal(sessionRequired());
            return;
          }
          var messages = [
            { role: 'system', content: SYS_PROMPT },
            { role: 'user', content: [
              { type: 'text', text: 'Transcribe the SAT math question in this image. Return the JSON object exactly as instructed.' },
              { type: 'image_url', image_url: { url: dataUrl } }
            ] }
          ];
          // 自动模式：先用主模型识别，再用另一模型复核，两个数指纹一致的答案才最可信。
          // 手动指定模型：只调一次，保持原有行为。
          var auto = !model || model === 'auto';
          var chain = auto ? MODEL_CHAIN.slice() : [model];
          var i = 0, lastErr = null;
          function next() {
            if (i >= chain.length) {
              lastErr = lastErr || new Error('所有视觉模型均不可用');
              lastErr._tried = i;
              fallbackLocal(lastErr);
              return;
            }
            var m = chain[i++];
            status('正在识别（视觉模型 ' + i + '/' + chain.length + '）…');
            callModelOnce(messages, m).then(function (obj) {
              if (!auto) { res(obj); return; }
              // 主模型成功后，找链里下一个不同模型做交叉验证
              var verifyM = chain[i];
              if (!verifyM) { res(obj); return; }
              status('正在交叉核对（第二模型）…');
              callModelOnce(messages, verifyM).then(function (obj2) {
                i++; // 消耗掉复核模型
                res(pickBestOcr(obj, obj2));
              }).catch(function () {
                // 复核模型失败：用主结果，但标记未交叉验证
                obj._cross = false;
                res(obj);
              });
            }).catch(function (e) {
              lastErr = e;
              var code = errCode(e);
              // auth 错误换模型无效，直接转本地兜底；其余（未授权/限流/额度/网关/超时/无题干）自动换下一个
              if (String(code).indexOf('auth_') === 0) { e._tried = i; fallbackLocal(e); return; }
              setTimeout(next, 180);
            });
          }
          next();
        });
      });
    });
  }

  /* ---------------- 状态与 UI ---------------- */
  /* 待整理：没匹配上的题不丢。题干文字存本地，面板底部列出来，
     点一下"用文字导入"就重跑一遍匹配——换台设备/明天再看都还在。 */
  var INBOX_KEY = 'satmath_imgimp_inbox_v1';
  function inboxList() { try { return JSON.parse(localStorage.getItem(INBOX_KEY) || '[]') || []; } catch (e) { return []; } }
  function inboxSave(a) { try { localStorage.setItem(INBOX_KEY, JSON.stringify(a.slice(0, 20))); } catch (e) {} }
  function inboxAdd(text) {
    var t = String(text || '').replace(/\s+/g, ' ').trim();
    if (t.length < 8) return;
    var a = inboxList();
    if (a.some(function (x) { return x.t === t; })) return;
    a.unshift({ t: t, ts: Date.now() });
    inboxSave(a);
  }
  function inboxDrop(i) { var a = inboxList(); a.splice(i, 1); inboxSave(a); renderRows(); }
  function inboxHtml() {
    var a = inboxList();
    if (!a.length) return '';
    return '<div class="imgimp-inbox"><div class="imgimp-finder-hint">待整理 ' + a.length +
      ' 道（没匹配上但已经存住，不会丢）</div>' +
      a.map(function (x, i) {
        return '<button type="button" class="imgimp-cand" data-inbox-i="' + i + '">' +
          esc(x.t.slice(0, 70)) + '<small>点一下重新配题</small></button>';
      }).join('') + '</div>';
  }

  /* 「识别失败可重试：重试失败项/自检」这一行只在真的失败过才出现。
      pages 里没有 p.error 时，用户什么都没导入，不该先看到一句失败。 */
  function syncFailBar() {
    var has = false;
    for (var i = 0; i < pages.length; i++) { if (pages[i] && pages[i].error) { has = true; break; } }
    ['imgimpFailHint', 'btnImgRetry', 'imgimpSelfTest'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.hidden = !has;
    });
  }
  function renderRows() {
    var host = $('imgimpRows'); if (!host) return;
    host.innerHTML = (pages.length ? pages.map(rowHtml).join('') :
      '<div class="imgimp-empty">把截图拖进来，认得出就自动进错题本。</div>') + inboxHtml();
    syncFailBar();
  }
  /* 导入结果的一条：只给用户能用的信息（第几张、识别到没、配到哪题、候选取哪个）。
     置信度、双模型比对、数字校验这类是自己调参看的，摆到界面上就是技术噪音，删掉不影响任何判断。 */
  function EN_UI() {
    return !!(window.TDI18n && window.TDI18n.get && window.TDI18n.get() === 'en') ||
      document.documentElement.getAttribute('data-lang') === 'en';
  }
  function rowHtml(p) {
    var en = EN_UI();
    var cand = p.cands || [];
    var label = p.error ? (en ? 'Failed' : '识别失败')
      : (!p.ocr ? (en ? 'Reading' : '识别中')
      : (p.qid ? (en ? 'Imported' : '已导入') : (en ? 'Check it' : '待核对')));
    var cls = p.qid ? 'ok' : 'warn';
    var thumb = p.thumb
      ? '<img src="' + p.thumb + '" alt="' + (en ? 'Shot ' + p.i : '第 ' + p.i + ' 张截图') + '">'
      : '<span class="imgimp-thumb-ph">' + (en ? 'Image' : '图片') + '</span>';
    var stem;
    if (p.ocr) stem = esc(String(p.ocr.stem).slice(0, 180));
    else if (p.error) stem = '<small class="muted">' + (en
      ? 'Can\'t read it? Paste the question text or search a keyword instead.'
      : '认不出？把题干文字贴进来，或用关键词搜。') + '</small>';
    else stem = '<small class="muted">' + (en ? 'Reading…' : '正在识别…') + '</small>';
    var matched = '', picks = '';
    if (p.qid) {
      var c = cand.filter(function (x) { return x.id === p.qid; })[0] || {};
      matched = '<div class="imgimp-matched"><b>' + esc((c.sec || '') + ' · #' + (c.no || '')) + '</b></div>';
    } else if (p.skipReason) {
      matched = '<div class="imgimp-matched">' + (en ? 'Not auto-imported — pick it below.' : '没能自动认出来，下面挑一道。') + '</div>';
    }
    /* 没自动匹配上时把候选题目摆出来：点一下就按这道题写进错题回顾。 */
    if (!p.qid && p.ocr && cand.length) {
      picks = '<div class="imgimp-picks"><span class="muted">' + (en ? 'Which one is it? Tap to import:' : '是下面哪一道？点一下即导入：') + '</span>' +
        cand.slice(0, 5).map(function (x) {
          var st = String(x.stem || '').replace(/\s+/g, ' ').trim();
          return '<button type="button" class="imgimp-cand" data-page="' + p.i + '" data-qid="' + esc(x.id) + '">' +
            esc(x.sec ? (x.sec + ' · #' + (x.no == null ? '' : x.no)) : String(x.id || '')) +
            (st ? '<small>' + esc(st.slice(0, 40)) + '</small>' : '') + '</button>';
        }).join('') + '</div>';
    }
    return '<article class="imgimp-row"><div class="imgimp-thumb">' + thumb + '</div>' +
      '<div class="imgimp-fields"><div class="imgimp-line"><b>' + (en ? 'Shot ' + p.i : '第 ' + p.i + ' 张') + '</b>' +
      '<span class="imgimp-badge' + cls + '">' + esc(label) + '</span></div>' +
      '<div class="imgimp-ocr">' + stem + '</div>' + matched + picks + '</div></article>';
  }
  function findQ(id) {
    for (var i = 0; i < A.SECS.length; i++) {
      var q = (A.CATALOG[A.SECS[i]] || []).find(function (x) { return x.id === id; });
      if (q) return { sec: A.SECS[i], q: q };
    }
    return null;
  }
  function refreshHost() { var h = window.TD_IMPORT_WRONG; if (h && h.refresh) h.refresh(); }

  /* 最近一次导入的记录 id：识别偶有认错题，得留一条后悔药，一键撤回本次写入。 */
  var lastAdded = [];
  /* 撤销只覆盖「最近一次导入」，不是整个页面生命周期：每次新的导入动作
     先清空上一批，否则连续导入两批后点一次撤销会把两批一起删掉。 */
  function beginBatch() { lastAdded = []; showUndo(); }
  function rememberAdd(qid) {
    if (lastAdded.indexOf(qid) < 0) lastAdded.push(qid);
    showUndo();
  }
  function showUndo() {
    var b = $('imgimpUndo');
    if (b) b.hidden = !lastAdded.length;
  }
  function undoLast() {
    if (!A || !lastAdded.length) { status('没有可撤销的导入'); return 0; }
    var n = 0, removed = [];
    lastAdded.forEach(function (qid) {
      var hit = findQ(qid); if (!hit) return;
      var st = A.secState(hit.sec, false);
      var a = st && st.answers[hit.q.id];
      if (a && a.importSrc === MARK) {
        removed.push({ sec: hit.sec, q: hit.q.id, a: a });
        delete st.answers[hit.q.id]; st.completed = A.stats(hit.sec).completed; n++;
      }
    });
    var savedUndo = true;
    if (n) {
      savedUndo = A.save();
      /* 写盘失败时内存里已经删掉了，但盘上还是导入记录；这时把内存也恢复，
         撤销按钮保留，用户再点一次就能重试，避免“看起来撤了、下次自动保存又写回去”。 */
      if (!savedUndo) {
        removed.forEach(function (x) {
          var st2 = A.secState(x.sec, true);
          if (st2) { st2.answers[x.q] = x.a; st2.completed = A.stats(x.sec).completed; }
        });
      }
    }
    if (!n || savedUndo) lastAdded = [];
    refreshHost();
    showUndo();
    var undoMsg = n
      ? (savedUndo ? ('已撤销本次导入的 ' + n + ' 道（只删掉导入记录，不动你原来的作答）')
        : ('撤销没有生效：本机进度写入失败，已恢复这 ' + n + ' 道导入记录。清出存储空间后再点一次「撤销本次」重试。'))
      : '这些题已被你动过，撤销时没有删除任何作答';
    status(undoMsg);
    return n;
  }

  function importChecked(keepBatch) {
    if (!A) return { added: 0, message: '题库未就绪' };
    if (!keepBatch) beginBatch();
    var conflicts = [], now = Date.now(), added = 0, alreadys = 0;
    pages.forEach(function (p) {
      if (!p.checked || !p.qid) return;
      var hit = findQ(p.qid); if (!hit) return;
      var old = A.secState(hit.sec, false), cur = old && old.answers[hit.q.id];
      if (cur) {
        /* 错题记录只增不改：该题已有任何作答记录（真实作答或此前导入），一律跳过，绝不覆盖。 */
        if (cur.importSrc === MARK) { alreadys++; return; }
        conflicts.push({ page: p.i, qid: hit.q.id, v: cur.v });
        return;
      }
      var st = A.secState(hit.sec, true); if (!st) return;
      st.answers[hit.q.id] = { v: '', correct: false, ts: now, importSrc: MARK };
      st.completed = A.stats(hit.sec).completed;
      rememberAdd(hit.q.id);
      added++;
    });
    var msg = added ? ('已导入 ' + added + ' 道图片错题（仅新增记录）') : '这批图里的题没有新东西可写';
    if (alreadys) msg += '；' + alreadys + ' 道此前已导入过，不重复写';
    if (conflicts.length) msg += '；' + conflicts.length + ' 道已有作答记录，按只增不改原则跳过（未改动）';
    if (!added) { status(msg); return { added: 0, skipped: conflicts.length, dups: alreadys, message: msg }; }
    /* A.save() 会返回写盘成败：存储满/只读时内存里有记录，但刷新就没了，
       不能再只报“已导入”。 */
    var localWriteFailed = !A.save();
    refreshHost();
    if (localWriteFailed) msg += '；但本机进度写入失败，刷新后这些题可能丢失，请清理存储空间后重试';
    status(msg);
    return { added: added, skipped: conflicts.length, dups: alreadys, message: msg, localWriteFailed: localWriteFailed };
  }

  /* ---------------- 手动定位（不依赖 OCR） ----------------
     识别慢/识别不出时的兜底：用户敲题干里的几个词或数字，直接在题库里找，
     点一下就把这道题写进错题回顾。零组件、零等待。 */
  /* 贴文字导入：完全不经过 OCR。图认不出、引擎起不来、照片太糊，
     只要能把题干文字复制/打进来，照样能精确配题并写入。
     用的仍是同一套匹配 + 数字指纹门禁，不是另一套松标准。 */
  function importByText(text) {
    var t = String(text || '').replace(/\s+/g, ' ').trim();
    if (t.length < 8) { status('文字太短，至少贴半句题干（8 个字符以上）。'); return 0; }
    var recalled = matchQuestion(t, '', 8);
    if (!recalled.length) { status('题库里没找到像这道题的，换个说法或只贴题干里的关键词。'); finderRender([], t); return 0; }
    var qn = numbers(norm(stripChoices(t))), c0 = numbers(norm(recalled[0].stem || ''));
    var agree = numScore(qn, c0);
    var numOk = qn.length >= 2 ? agree >= 0.85 : (qn.length === 1 ? agree >= 0.6 : true);
    var tg = autoGate(recalled, t);
    var list = recalled.map(function (c) {
      return { id: c.id, sec: c.sec, no: c.no, stem: c.stem || '' };
    });
    if (tg.pass && numOk) {
      importSingle(recalled[0].id);
      return 1;
    }
    status('文字最像的是 ' + (recalled[0].sec || '') + ' · #' + recalled[0].no +
      '（' + Math.round(recalled[0].score * 100) + '%），但没到自动写入的把握，下面点一下即导入。');
    finderRender(list, t);
    return 0;
  }

  function finderRender(list, query) {
    var host = $('imgimpFinder'); if (!host) return;
    if (!query) { host.hidden = true; host.innerHTML = ''; return; }
    if (!list.length) {
      host.hidden = false;
      host.innerHTML = '<div class="imgimp-finder-hint">没找到匹配「' + esc(query) + '」的题。试试只敲数字（如 24 36）或题干里的英文短语。</div>';
      return;
    }
    host.hidden = false;
    host.innerHTML = '<div class="imgimp-finder-hint">找到 ' + list.length + ' 道，点一道即导入：</div><div class="imgimp-finder-list">' +
      list.map(function (x) {
        var st = String(x.stem || '').replace(/\s+/g, ' ').trim();
        return '<button type="button" class="imgimp-cand" data-manual-qid="' + esc(x.id) + '">' +
          esc((x.sec || '') + ' · #' + (x.no == null ? '' : x.no)) +
          (st ? '<small>' + esc(st.slice(0, 60)) + '</small>' : '') + '</button>';
      }).join('') + '</div>';
  }
  /* 真题卷里的题（SP2-xxx / R03-xxx 等）不在 CATALOG 里，写不进错题本；
     同一道题在 CATALOG 里另有一份（题干一模一样）。按题干建索引，指回那份可写的。 */
  var aliasMap = null;
  function ensureAlias() {
    if (aliasMap || !A) return;
    aliasMap = {};
    A.SECS.forEach(function (sec) {
      (A.CATALOG[sec] || []).forEach(function (q) {
        var k = norm(String(q.stem || '')).slice(0, 120);
        if (k && !aliasMap[k]) aliasMap[k] = { id: q.id, sec: sec, no: q.no };
      });
    });
  }

  /* 从识别文本里挑关键词：长词（更可能是题目专属名词）+ 题干里的数字。
     停用词和短词全部滤掉，避免把 "what is the value of" 这类通用串拿去搜，
     搜出来全是题干句式相近的无关题。 */
  var STOPWORDS = ('the a an and or of to in on at for with that this is are was were be been from as by it its what which how many value given above following about ' +
    'if then when than more less each every per total number numbers equation equations graph shown figure table line lines slope intercept point points').split(' ');
  function pickKeywords(stem) {
    var words = String(stem || '').toLowerCase().replace(/[^a-z0-9.]+/g, ' ').split(' ').filter(Boolean);
    var keep = words.filter(function (w) { return w.length >= 4 && STOPWORDS.indexOf(w) < 0 && !/^[0-9.]+$/.test(w); })
      .sort(function (a, b) { return b.length - a.length; }).slice(0, 4);
    var nums = String(stem || '').match(/[0-9][0-9,.]*/g) || [];
    nums = nums.filter(function (n) { return n.replace(/[,.]/g, '').length >= 2; }).slice(0, 3);
    return keep.concat(nums).join(' ').slice(0, 80);
  }

  function finderSearch() {
    var inp = $('imgimpSearch'); if (!inp) return 0;
    var q = String(inp.value || '').trim();
    if (q.length < 2) { finderRender([], ''); status('敲两个字符以上再找，比如 24 或 slope。'); return 0; }
    /* 手动搜索不走 OCR 那套字符频率打分（它靠「像不像一段被认错的英文」取胜，
       会把手打的关键词组偏到题干雷同的题上）。这里按词命中率 + 数字命中率排。 */
    var qt = String(q).toLowerCase().replace(/[^a-z0-9.]+/g, ' ').split(' ')
      .filter(function (w) { return w.length > 1; });
    var qn = numbers(q);
    var banks = (window.TD_BANK && window.TD_BANK.questions) || [];
    var rows = [];
    banks.forEach(function (bq) {
      var st = String(bq.stem || ''); if (!st) return;
      var ns = norm(st);
      var cover = qt.length ? qt.filter(function (w) { return ns.indexOf(w) >= 0; }).length / qt.length : 0;
      var sn = numbers(st);
      var num = qn.length ? qn.filter(function (n) { return sn.indexOf(n) >= 0; }).length / qn.length : 0;
      if (!cover && !num) return;
      var hit = findQ(bq.id);
      if (!hit) {
        ensureAlias();
        var al = aliasMap[norm(st).slice(0, 120)];
        if (!al) return;
        rows.push({ id: al.id, sec: al.sec, no: al.no, stem: st, cover: cover, num: num });
        return;
      }
      rows.push({ id: bq.id, sec: hit.sec || '', no: hit.q ? hit.q.no : '', stem: st, cover: cover, num: num });
    });
    rows.sort(function (a, b) {
      if (Math.abs(b.cover - a.cover) > 0.02) return b.cover - a.cover;
      if (Math.abs(b.num - a.num) > 0.02) return b.num - a.num;
      return b.cover - a.cover;
    });
    /* 同一道题可能以真题卷 id 和单元 id 各存一份，映射后要按 id 去重 */
    var seen = {}, list = [];
    for (var ri = 0; ri < rows.length && list.length < 8; ri++) {
      if (seen[rows[ri].id]) continue;
      seen[rows[ri].id] = 1; list.push(rows[ri]);
    }
    finderRender(list, q);
    status(list.length ? ('题库里找到 ' + list.length + ' 道，点一道即导入。') : '没找到，换个关键词试试（数字或题干短语更准）。');
    return list.length;
  }
  function importSingle(qid, keepBatch) {
    if (!A) return { added: 0 };
    var hit = findQ(qid); if (!hit) return { added: 0 };
    var old = A.secState(hit.sec, false), cur = old && old.answers[hit.q.id];
    if (cur) {
      status('这道题已有作答记录，按「只增不改」原则没有改动（' + hit.sec + ' · #' + hit.q.no + '）。');
      return { added: 0, skipped: 1 };
    }
    var st = A.secState(hit.sec, true);
    if (!st) return { added: 0 };
    if (!keepBatch) beginBatch();
    st.answers[hit.q.id] = { v: '', correct: false, ts: Date.now(), importSrc: MARK };
    st.completed = A.stats(hit.sec).completed;
    rememberAdd(hit.q.id);
    var savedOne = A.save();
    refreshHost();
    var oneMsg = '已导入 ' + hit.sec + ' · #' + hit.q.no + '（点上面「在题库里找」还能继续加）。';
    if (!savedOne) oneMsg += '；但本机进度写入失败，刷新后这道题可能丢失';
    status(oneMsg);
    return { added: 1, localWriteFailed: !savedOne };
  }

  function select(i, qid) {
    var p = pages.filter(function (x) { return x.i === +i; })[0]; if (!p) return false;
    p.qid = qid || ''; p.checked = !!qid; p.gate = 'manual'; renderRows();
    // 用户确认后立即写入（识别结束那轮 importChecked 已跑过，此刻需补一次）
    if (qid && !busy) { try { importChecked(); } catch (e) { console.warn('导入错题失败', e); } }
    return true;
  }
  function check(i, on) { var p = pages.filter(function (x) { return x.i === +i; })[0]; if (!p) return false; p.checked = !!on; renderRows(); return true; }

  /* 一张图里挤了好几道短题（题库列表截图最常见）：OCR 会把它们读成一整段，
     既对不上任何一道、也不会被切块切开。这里按问号把段落拆回单题，
     每题都过同一套门禁，只有数字指纹和文字都对得上的才导，不猜。 */
  function multiSplit(stem) {
    var t = String(stem || '').replace(/\s+/g, ' ').trim();
    if ((t.match(/\?/g) || []).length < 2) return [];
    var parts = t.split('?').map(function (x) { return x.trim(); }).filter(Boolean);
    if (parts.length < 2) return [];
    var segs = parts.map(function (x, i) { return x + (i < parts.length - 1 ? ' ?' : ''); });
    /* 两题之间的分界通常是"上一句以问号结尾"，最后一题没有问号。
       每题至少 30 字符，短于此的丢弃（多半是"?"碎片），最多 6 题。 */
    segs = segs.filter(function (x) { return x.length >= 30; }).slice(0, 6);
    return segs.length >= 2 ? segs : [];
  }
  function salvageMulti() {
    var added = 0, localWriteFailed = false;
    /* 一张图拆出来的多道题属于同一次导入，撤销要一起撤：这里只开一个批次，
       后面 importSingle 不要再各开各的，否则“撤销本次”只能撤掉最后一道。 */
    beginBatch();
    pages.forEach(function (p) {
      if (p.qid || !p.ocr || !p.ocr.stem) return;
      var segs = multiSplit(p.ocr.stem);
      if (!segs.length) return;
      var hits = [], seen = {};
      segs.forEach(function (sg) {
        /* 段首的题号（"2." "3)"）会被当成题目里的数字，把数字指纹校验拖垮——
           先剥掉题号再比对。 */
        sg = sg.replace(/^\s*\d{1,2}\s*[.)]\s*/, '').trim();
        var rc = matchQuestion(sg, '', 8); if (!rc.length) return;
        var qn = numbers(norm(sg)), cn = numbers(norm(rc[0].stem || ''));
        var ag = numScore(qn, cn);
        var numOk = qn.length >= 2 ? ag >= 0.9 : (qn.length === 1 ? ag >= 0.7 : false);
        var tg = autoGate(rc, sg);
        if (tg.pass && numOk && !seen[rc[0].id]) { seen[rc[0].id] = 1; hits.push(rc[0]); }
      });
      hits.forEach(function (c) {
        var r = importSingle(c.id, true);
        if (r && r.added) { added++; if (r.localWriteFailed) localWriteFailed = true; }
      });
      if (hits.length) { p.salvaged = hits.length; p.salvageIds = hits.map(function (c) { return c.id; }); }
    });
    return { added: added, localWriteFailed: localWriteFailed };
  }

  function recognizeAll(images) {
    if (busy || !images || !images.length) return Promise.resolve(null);
    busy = true;
    pages = []; renderRows(); progress(0, 1);
    var prep = Promise.resolve();
    var t0 = Date.now();
    images.forEach(function (f, i) {
      prep = prep.then(function () {
        status('正在准备第 ' + (i + 1) + ' / ' + images.length + ' 张…');
        return compressImage(f).then(function (img) {
          return splitBands(img.url).then(function (bands) {
            bands.forEach(function (b, j) {
              pages.push({ i: pages.length + 1, file: f,
                label: (images.length > 1 ? '第 ' + (i + 1) + ' 张 · ' : '') + (bands.length > 1 ? '第 ' + (j + 1) + ' 块' : ''),
                thumb: b.thumb || img.thumb, dataUrl: b.url,
                ocr: null, cands: [], qid: '', checked: false, error: '' });
            });
            renderRows();
          });
        }).catch(function (e) {
          pages.push({ i: pages.length + 1, file: f, label: '', thumb: '', dataUrl: '', ocr: null, cands: [], qid: '', checked: false, error: errText(e) });
          renderRows();
        });
      });
    });
    // 切块是异步的，必须等 pages 填好再排队识别（否则循环跑在空数组上，全部记成"识别失败"）
    var chain = prep.then(function () {
    progress(0, pages.length);
    var c2 = Promise.resolve();
    pages.forEach(function (p, idx) {
      c2 = c2.then(function () {
        if (!ocrEnv().wasm) {
          p.error = '这台浏览器的内核禁用了 WebAssembly，本地识别起不来';
          return;
        }
        status('正在识别第 ' + p.i + ' / ' + pages.length + ' 块…');
        // 多种预处理各认一遍，取"跟题库最对得上"的那一版，不迷信 OCR 自己的置信度
        return ocrBest(p.dataUrl, state.model, Date.now() - t0 > 8000).then(function (bestRes) {
            var ocr = bestRes.ocr;
            if (bestRes.url) p.dataUrl = bestRes.url;
            p.ocr = ocr;
            var stemTxt = String(ocr.stem || '').trim();
            var choicesTxt = ocr.choices ? Object.keys(ocr.choices).map(function (k) { return ocr.choices[k]; }).join(' ') : '';
            // 第一步：轻量文本匹配只用于召回候选（宽松；真实题库 top-10 覆盖已 ≈100%，取 15 留冗余）
            var recalled = matchQuestion(stemTxt, choicesTxt, 15);
            // 用题库真实题干+选项构造判别候选（不是 OCR 文本）
            var bankCands = recalled.map(function (c) {
              var e = (window.TD_TEXT || {})[c.id] || {};
              return { id: c.id, no: c.no, sec: c.sec, stem: e.stem || c.stem || '', choices: e.choices || {} };
            });
            status('正在比对 ' + bankCands.length + ' 道候选题…');
            // 第二步：双模型判别式投票（不一致/低置信 → 跳过）
            return discriminate(discriminateMessages(p.dataUrl, bankCands), bankCands, state.model).then(function (verdict) {
              var chosen = null, qNums = numbers(norm(stripChoices(stemTxt)));
              if (verdict && verdict.idx >= 1 && verdict.idx <= bankCands.length) {
                var cand = bankCands[verdict.idx - 1];
                // 第三步：独立数字指纹校验——OCR 题干的数字必须和候选题干数字吻合。
                // 这是不依赖模型的客观闸门，能挡住"模型看错图"导致的错导。
                var cNums = numbers(norm(cand.stem || ''));
                var numAgree = numScore(qNums, cNums);
                // 只读到一两个数字时不再一律放行：数字少就要求型号置信度更高，否则退回让用户点选
                var numOk = qNums.length >= 2 ? (numAgree >= 0.8)
                  : (numAgree >= 0.7 && verdict.confidence >= 0.9);
                if (numOk) {
                  chosen = cand;
                  p.matchInfo = { agree: verdict.agree, conf: verdict.confidence, numAgree: numAgree };
                } else {
                  p.skipReason = '数字校验未通过（识别出的数字和这道题不符）';
                }
              } else if (!verdict) {
                /* 云端比对用不了（未登录、断网、模型全挂）时不再直接判死：
                   退回纯文本匹配，分数够高又明显领先、数字对得上才自动导入；否则把候选摆出来让用户点一下。 */
                var tg = autoGate(recalled, stemTxt);
                // 数字指纹也要对得上才敢自动写：题库里没有这道题时，光靠文字相似度
                // 会挑到题干句式相近的另一道（实测 55 分也能被放进来），宁可不导。
                var c0Nums = numbers(norm((bankCands[0] || {}).stem || ''));
                var c0Agree = numScore(qNums, c0Nums);
                var numGate = qNums.length >= 2 ? c0Agree >= 0.85 : (qNums.length === 1 ? c0Agree >= 0.6 : true);
                if (tg.pass && recalled[0] && numGate) {
                  chosen = bankCands[0];
                  p.matchInfo = { agree: false, conf: recalled[0].score, margin: tg.margin,
                    numAgree: numScore(qNums, numbers(norm(bankCands[0].stem || ''))) };
                } else {
                  p.skipReason = tg.pass ? '文字最像的那道数字对不上，没敢自动写（可点下面任一道）'
                    : '云端比对不可用，文本匹配也不够稳（可从下面的题目里点一个）';
                }
              } else {
                p.skipReason = '两个模型判断不一致或置信不足（可从下面的题目里点一个）';
              }
              if (chosen) {
                p.qid = chosen.id; p.checked = true;
                p.gate = verdict ? 'discriminated' : 'text';
                p.cands = [chosen].concat(bankCands.filter(function (x) { return x.id !== chosen.id; }).slice(0, 4));
              } else {
                // 保守：不硬猜，但把候选摆到界面上，用户点一下就能确认
                p.qid = ''; p.checked = false; p.cands = recalled.slice(0, 5);
              }
              p.ocr.stem = stemTxt;
              renderRows(); progress(p.i, pages.length);
            });
        }).catch(function (e) {
          p.error = errText(e); p.ocr = null; p.cands = []; p.qid = ''; p.checked = false;
          renderRows(); progress(p.i, pages.length);
        });
      });
    });
    return c2;
    });
    return chain.then(function () {
      busy = false;
      var ok = pages.filter(function (p) { return p.ocr; }).length;
      var fail = pages.length - ok;
      // 全自动：识别结束后立即写入错题本，不等待任何用户操作
      /* 先把"一张图里多道短题"拆开抢救一遍，再走常规导入 */
      var salvageRes = null;
      try { salvageRes = salvageMulti(); } catch (e) { console.warn('拆多题失败', e); }
      var salvaged = salvageRes && salvageRes.added ? salvageRes.added : 0;
      var salvageSaveFailed = !!(salvageRes && salvageRes.localWriteFailed);
      var res = null;
      try { res = importChecked(true); } catch (e) { console.warn('导入错题失败', e); }
      var added = (res && res.added ? res.added : 0) + salvaged;
      var skipped = res && res.skipped ? res.skipped : 0;
      var dups = res && res.dups ? res.dups : 0;
      var unmatched = pages.filter(function (p) { return p.ocr && !p.error && !p.qid && !p.salvaged; }).length;
      var msg = '已自动识别并写入错题回顾：' + added + ' 道';
      if (salvaged) msg += '（其中 ' + salvaged + ' 道来自一张图里的多道短题，已按问号拆开逐题核对）';
      if (dups) msg += '；' + dups + ' 道此前已在错题本里（不重复写）';
      if (unmatched) msg += '；' + unmatched + ' 道未能确认，为免导错已跳过（可重试）';
      if (fail) msg += '；' + fail + ' 张识别失败（可点「重试失败项」）';
      if (skipped) msg += '；' + skipped + ' 道因已有作答被跳过';
      if (!added && dups && !fail && !unmatched) msg = '这些题已经在错题本里了（' + dups + ' 道，没有重复写入）';
      if (!added && !fail && !skipped && !unmatched && !dups) msg = '未能匹配到题库题目，本次未导入';
      if ((res && res.localWriteFailed) || salvageSaveFailed) msg += '；但本机进度写入失败，刷新后已导入记录可能丢失，请清理存储空间后重试';
      if (fail || unmatched) msg += '　→ 已把最可能的几道题列在下面，点一道直接导入。';
      // 有没认准的块：拿它读到的字自动搜一遍题库，把候选直接摆出来，
      // 用户不用自己想关键词——这一步是"识别不出来"时最快的出路。
      var miss = pages.filter(function (p) { return !p.qid && p.ocr && p.ocr.stem; })[0];
      if (miss && $('imgimpSearch')) {
        var kw = pickKeywords(miss.ocr.stem);
        $('imgimpSearch').value = kw;
        try { finderSearch(); } catch (e) { console.warn('自动搜题失败', e); }
      }
      /* 同时把认出来的原文字填进"贴文字导入"框：认错一两个字符时，
         他改一个字再点按钮，比重新贴图快得多。 */
      if (miss && $('imgimpText') && !$('imgimpText').value) {
        $('imgimpText').value = String(miss.ocr.stem).slice(0, 600);
      }
      /* 所有没落到题号上的块，题干文字都先进"待整理"，保证一道都不落空。 */
      pages.forEach(function (p) { if (!p.qid && p.ocr && p.ocr.stem) inboxAdd(p.ocr.stem); });
      status(msg);
      renderRows();
      return { total: pages.length, ok: ok, fail: fail, added: added, skipped: skipped };
    });
  }
  /* 预热：面板一打开就开始准备引擎，并把引擎文件交给 SW 永久缓存。
     目的是让人贴图那一刻不用等下载/解压——第一次打开错题页时就把活干完。 */
  var warmedCache = false;
  function prewarm() {
    engineWarmInBackground();
    if (warmedCache) return;
    warmedCache = true;
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(function (reg) {
          if (reg.active) reg.active.postMessage({ type: 'warm-ocr' });
        });
      }
    } catch (e) { console.warn('通知缓存预热失败', e); }
  }

  function acceptFiles(fileList) {
    var files = [].slice.call(fileList || []).filter(function (f) { return /^image\//.test(f.type) || /\.(png|jpe?g|webp|gif|bmp|heic)$/i.test(f.name || ''); });
    if (!files.length) { status('请选择图片文件（PNG / JPG / WebP 等）'); return false; }
    if (busy) { status('正在识别上一批图片，请稍候…'); return false; }
    if ($('imgImportPanel').hidden) window.TD_IMG_IMPORT.open();
    recognizeAll(files); return true;
  }

  window.TD_IMG_IMPORT = {
    open: function () {
      $('imgImportPanel').hidden = false; $('btnImgImport').setAttribute('aria-expanded', 'true');
      diag();
      renderRows();   /* 打开就把"待整理"摆出来，上次没配上的题不会看不见 */
      ensureCloudSession(function () { });
      prewarm();
      autoSelfTest();
      if (!ocrEnv().wasm) status('这台浏览器不支持本地识别内核；把题干里几个词敲进下面的搜框，照样能查题导入。');
    },
    prewarm: prewarm,
    close: function () { $('imgImportPanel').hidden = true; $('btnImgImport').setAttribute('aria-expanded', 'false'); },
    acceptFiles: acceptFiles, recognizeAll: recognizeAll, matchStem: matchStem, _gate: autoGate,
    select: select, check: check, importChecked: importChecked,
    selfTest: selfTest, importByText: importByText, inbox: inboxList,
    search: finderSearch, importSingle: importSingle, undoLast: undoLast, _splitBands: splitBands, _recognizeAll: recognizeAll,
    cloudSignIn: cloudSignIn,
    setModel: function (m) { state.model = m; },
    getModel: function () { return state.model; },
    getModelChain: function () { return MODEL_CHAIN.slice(); },
    lastModel: function () { return pages.length && pages[pages.length - 1].ocr ? pages[pages.length - 1].ocr._model || '' : ''; },
    getState: function () { return pages.map(function (p) { return { i: p.i, qid: p.qid, sec: p.qid ? (findQ(p.qid) || {}).sec : '', checked: p.checked, cands: p.cands.length, ocr: !!p.ocr, error: p.error, score: p.cands[0] && typeof p.cands[0].score === 'number' ? +p.cands[0].score.toFixed(3) : 0, gate: p.gate || '', skipReason: p.skipReason || '', matchInfo: p.matchInfo || null, ocrStem: p.ocr ? String(p.ocr.stem || '').slice(0, 160) : '', candIds: (p.cands || []).slice(0, 5).map(function (c) { return c.id; }) }; }); },
    debugSetPages: function (list) { pages = (list || []).map(function (p, i) { return { i: p.i || i + 1, qid: p.qid || '', checked: p.checked !== false, cands: p.cands || [], ocr: p.ocr || null, thumb: '', dataUrl: '', error: '' }; }); renderRows(); return pages.length; },
    isBusy: function () { return busy; },
    retryFailed: function () {
      var files = pages.filter(function (p) { return p.error; }).map(function (p) { return p.file; });
      if (!files.length) { status('没有需要重试的图片'); return 0; }
      return recognizeAll(files);
    }
  };
  /* 一键自检：不看用户环境也能知道这台机器到底哪一环不行。
     自己造一张"x+3=10 what is x"的图，跑完整识别链路，报耗时与结果。 */
  /* 自动自检：第一次打开面板时悄悄跑一遍完整链路（造一张已知题目的图 → 识别 → 配题）。
     目的不是炫技，是让"到底能不能用"这件事在界面上有答案：通过就写 ✓ 几秒，
     不通过就把原始错误摆在诊断行里，不用用户回忆、也不用他点按钮。 */
  var autoSelfDone = false;
  function autoSelfTest() {
    if (autoSelfDone) return;
    if (sessionStorage.getItem('satmath_self_line')) { SELF_LINE = sessionStorage.getItem('satmath_self_line'); return; }
    autoSelfDone = true;
    var t0 = Date.now();
    SILENT = true;
    warmOcr(function () {}).then(function () {
      if (busy) return;
      var cv = document.createElement('canvas'); cv.width = 900; cv.height = 160;
      var cx = cv.getContext('2d');
      cx.fillStyle = '#fff'; cx.fillRect(0, 0, 900, 160);
      cx.fillStyle = '#222'; cx.font = '24px Georgia';
      cx.fillText('If x + 3 = 10, what is the value of x ?', 30, 70);
      var url = cv.toDataURL('image/png');
      return ocrBest(url, state.model).then(function (r) {
        var sec = ((Date.now() - t0) / 1000).toFixed(1);
        SELF_LINE = '自检✓ ' + sec + 's ' + Math.round((r.score || 0) * 100) + '%';
      });
    }).catch(function (e) {
      SELF_LINE = '自检✗ ' + ((e && e.message) || e);
    }).then(function () {
      SILENT = false;
      try { sessionStorage.setItem('satmath_self_line', SELF_LINE); } catch (e) {}
      diag();
    }, function () { SILENT = false; });
  }

  function selfTest() {
    var btn = $('imgimpSelfTest'); if (btn) btn.disabled = true;
    var t0 = Date.now();
    var cv = document.createElement('canvas'); cv.width = 900; cv.height = 180;
    var cx = cv.getContext('2d');
    cx.fillStyle = '#fff'; cx.fillRect(0, 0, 900, 180);
    cx.fillStyle = '#222'; cx.font = '24px Georgia';
    cx.fillText('If x + 3 = 10, what is the value of x ?', 30, 70);
    cx.fillText('A) 3    B) 7    C) 10    D) 13', 30, 120);
    var url = cv.toDataURL('image/png');
    var e0 = ocrEnv();
    status('自检中：内核 ' + (e0.wasm ? 'wasm✓' : 'wasm✗') + ' 缓存 ' + (e0.sw ? 'sw✓' : 'sw✗') + '，正在识别测试图…');
    ocrBest(url, state.model).then(function (r) {
      var sec = ((Date.now() - t0) / 1000).toFixed(1);
      status('自检通过：' + sec + ' 秒，认到「' + String(r.ocr.stem).slice(0, 60) + '」，匹配分 '
        + (r.score ? (r.score * 100).toFixed(0) : '0') + '%（这一条只是演示图，不会写进错题本）');
    }, function (e) {
      var sec = ((Date.now() - t0) / 1000).toFixed(1);
      status('自检失败：' + sec + ' 秒 · ' + ((e && e.message) || e) + '（这不是你的错，把这句话发我就行）');
    }).then(function () { if (btn) btn.disabled = false; });
  }

  function on(id, ev, fn) { var el = $(id); if (el) el.addEventListener(ev, fn); }
  on('btnImgImport', 'click', function () { window.TD_IMG_IMPORT.open(); });
  /* 打开错题页就悄悄把识别引擎备好，别等用户贴图才开始下载 */
  if (window.requestIdleCallback) window.requestIdleCallback(prewarm, { timeout: 3000 });
  else setTimeout(prewarm, 1500);
  on('imgImportClose', 'click', window.TD_IMG_IMPORT.close);
  on('fileImgImport', 'change', function (e) { acceptFiles(e.target.files); e.target.value = ''; });
  on('btnImgRetry', 'click', function () { window.TD_IMG_IMPORT.retryFailed(); });
  on('imgimpCloudSignIn', 'click', cloudSignIn);
  on('imgimpSearchGo', 'click', finderSearch);
  on('imgimpTextGo', 'click', function () {
    var ta = $('imgimpText'); importByText(ta ? ta.value : '');
  });
  on('imgimpUndo', 'click', undoLast);
  on('imgimpSelfTest', 'click', selfTest);
  var inpSearch = $('imgimpSearch');
  if (inpSearch) {
    inpSearch.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); finderSearch(); } });
    inpSearch.addEventListener('input', function () { if (!inpSearch.value) finderRender([], ''); });
  }
  on('imgimpFinder', 'click', function (e) {
    var t = e.target.closest ? e.target.closest('.imgimp-cand') : null;
    var qid = t && t.getAttribute('data-manual-qid');
    if (qid) importSingle(qid);
  });
  on('imgimpRows', 'change', function (e) {
    var t = e.target, c = t.getAttribute && t.getAttribute('data-img-cand'), k = t.getAttribute && t.getAttribute('data-img-check');
    if (c) select(c, t.value); else if (k) check(k, t.checked);
  });
  // 待核对候选按钮：点一下即确认该题为正确匹配并写入
  on('imgimpRows', 'click', function (e) {
    var t = e.target.closest ? e.target.closest('.imgimp-cand') : null;
    if (!t) return;
    var ib = t.getAttribute('data-inbox-i');
    if (ib != null) {
      var row = inboxList()[+ib];
      if (!row) return;
      if ($('imgimpText')) $('imgimpText').value = row.t;   /* 先把文字填进框，认错的字能直接改 */
      var ok = importByText(row.t);
      if (ok) inboxDrop(+ib);
      return;
    }
    select(t.getAttribute('data-page'), t.getAttribute('data-qid'));
  });
  var dz = $('imgDropZone'), pn = $('imgImportPanel');
  if (dz) {
    dz.addEventListener('click', function () { $('fileImgImport').click(); });
    dz.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('fileImgImport').click(); } });
    ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('is-dragover'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('is-dragover'); }); });
    dz.addEventListener('drop', function (e) { acceptFiles(e.dataTransfer && e.dataTransfer.files); });
  }
  // paste support：任意位置粘贴图片即触发全自动识别导入（无需先打开面板）
  document.addEventListener('paste', function (e) {
    var items = e.clipboardData && e.clipboardData.items, files = [];
    if (!items) return;
    for (var i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf('image/') === 0) { var f = items[i].getAsFile(); if (f) files.push(f); }
    }
    if (files.length) { e.preventDefault(); acceptFiles(files); return; }
    /* 只复制文字也能用：在网页上选中题干按 Cmd/Ctrl+V，粘进来的是一段文本而不是图片。
       以前这种情况没反应，人会以为功能坏了。现在直接走"贴文字导入"。 */
    var txt = (e.clipboardData && (e.clipboardData.getData('text/plain') || '')) || '';
    var el = e.target;
    if (el && /^(INPUT|TEXTAREA)$/.test(el.tagName || '')) return;   // 在输入框里粘，交给输入框自己
    var flat = txt.replace(/\s+/g, ' ').trim();
    if (flat.length >= 20 && /[A-Za-z]/.test(flat)) {
      e.preventDefault();
      if ($('imgImportPanel').hidden) window.TD_IMG_IMPORT.open();
      var ta2 = $('imgimpText'); if (ta2) ta2.value = txt.trim();
      status('从粘贴的文字里找这道题…');
      importByText(txt);
    }
  });
  /* 从访达/桌面把截图拖进页面（不是精确落到虚线框里）也应该触发相同的识别流程。
     以前只有 dropzone 有 drop 事件，拖到页面其它位置浏览器会直接把图片当文件"打开"，
     页面跳走，人只会觉得"这功能没反应"。 */
  ['dragenter', 'dragover'].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      var has = e.dataTransfer && [].slice.call(e.dataTransfer.types || []).indexOf('Files') > -1;
      if (has) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }
    });
  });
  document.addEventListener('drop', function (e) {
    var files = e.dataTransfer && e.dataTransfer.files;
    if (!files || !files.length) return;
    var imgs = [].slice.call(files).filter(function (f) { return /^image\//.test(f.type) || /\.(png|jpe?g|webp|gif|bmp|heic)$/i.test(f.name || ''); });
    if (!imgs.length) return;
    e.preventDefault();
    var dz2 = $('imgDropZone');
    if (dz2 && dz2.contains(e.target)) return;   /* 落在虚线框里已由它自己处理，别再识别一遍 */
    if (dz2) dz2.classList.remove('is-dragover');
    acceptFiles(imgs);
  });
  var sel = $('imgimpModel');
  if (sel) { sel.value = state.model; sel.addEventListener('change', function () { state.model = sel.value; }); }
})();
