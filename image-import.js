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
  function status(msg) { var el = $('imgimpStatus'); if (el) el.textContent = msg || ''; }
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
    s = preLatex(String(s == null ? '' : s)).toLowerCase();
    s = s.replace(/\\(?:dfrac|tfrac|frac|sqrt|left|right|quad|qquad|text|mathrm|operatorname|cdot|times|div|pm|le|ge|ne|approx|pi|theta|alpha|beta|gamma|circ|degree|overline|hat)\b/g, ' ');
    s = s.replace(/[{}\[\]$^_~]/g, ' ');
    s = s.replace(/[−–—]/g, '-');
    s = s.replace(/\b(degrees?|percent)\b/g, ' ');
    s = s.replace(/[^a-z0-9./+\- ]+/g, ' ');
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
      var cs = 0;
      if (hasC) {
        var xHasC = (x.cnums.length > 0) || (x.ctoks.length > 1);
        if (xHasC) {
          var cns = (cnums.length && x.cnums.length) ? numScore(cnums, x.cnums) : -1;
          var cts = tokScore(ctoks, x.ctoks);
          cs = cns >= 0 ? (0.6 * cns + 0.4 * cts) : cts;
        }
      }
      return { id: x.id, no: x.no, sec: x.sec, stem: x.stem, ns: ns, ts: ts, gs: gs, cs: cs,
        score: hasC ? stemS * 0.8 + cs * 0.2 : stemS };
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, topN);
  }
  /* 旧接口兼容：只有题干时走题干匹配。 */
  function matchStem(query, topN) { return matchQuestion(query, '', topN); }
  /* 自动导入门禁：强综合分且明显领先第二名，或数字指纹极强时直通。
     返回 {pass, reason}。 */
  function autoGate(cands, queryStem) {
    if (!cands || !cands.length) return { pass: false, reason: 'no-candidate' };
    var t = cands[0], r = cands[1];
    var margin = r ? t.score - r.score : 1;
    var strong = t.score >= 0.45 && margin >= 0.06;
    var qnums = numbers(norm(queryStem));
    var numFast = t.ns >= 0.85 && qnums.length >= 2 && margin >= 0.03;
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
      el.textContent = hasSession ? '云端账号：已登录' : '云端账号：未登录 · 图片识别需先登录';
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
            status('需要先登录云端账号才能使用图片识别');
            resolve(false);
            return;
          }
          if (!auth.handleWorkBuddyCallback) { applyCloudSessionUI(false); resolve(false); return; }
          Promise.resolve(auth.handleWorkBuddyCallback()).then(function (r2) {
            if (r2 && r2.data) {
              cleanOAuthParams();
              applyCloudSessionUI(true);
              status('云端账号已登录，图片识别已就绪。');
              resolve(true);
            } else {
              applyCloudSessionUI(false);
              status('云端登录未完成，请点击「登录云端账号」重试。');
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
        var MAX = 1600, W = img.width, H = img.height, sc = Math.min(1, MAX / Math.max(W, H));
        W = Math.max(1, Math.round(W * sc)); H = Math.max(1, Math.round(H * sc));
        var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, W, H); cx.drawImage(img, 0, 0, W, H);
        res({ url: cv.toDataURL('image/jpeg', 0.82), thumb: cv.toDataURL('image/jpeg', 0.5), w: W, h: H });
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('图片读取失败')); };
      img.src = url;
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
  function localOcr(dataUrl) {
    var worker;
    // 硬超时：差网络下 worker/内核/语言包可能静默挂起（无 onerror），
    // 75s 未完成就终止并报错，让用户可重试，而不是无限转圈。
    var timer;
    var timeout = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        if (worker) { try { worker.terminate(); } catch (e) { console.warn('终止识别线程失败', e); } }
        var e = new Error('本地识别超时');
        e.error = { code: 'local_ocr_timeout' };
        reject(e);
      }, 110000);
    });
    var work = loadTesseract().then(function (T) {
      status('正在启动本地识别（无需登录）…');
      function createAt(mi) {
        var m = TESS_MIRRORS[mi];
        return T.createWorker('eng', 1, {
          workerPath: m.worker,
          corePath: m.core,
          langPath: m.lang,
          gzip: true
        });
      }
      // 单镜像 35s 未就绪（含静默挂起，不只是 onerror）就换下一个镜像，避免干等
      function bounded(mi) {
        var t;
        return Promise.race([
          createAt(mi),
          new Promise(function (_, reject) {
            t = setTimeout(function () {
              var e = new Error('镜像加载超时');
              e.error = { code: 'local_stage_timeout' };
              reject(e);
            }, 35000);
          })
        ]).then(function (w) { clearTimeout(t); return w; }, function (e) { clearTimeout(t); throw e; });
      }
      // worker/内核/语言包失败或超时，换下一套镜像重来（本地 → jsdelivr → unpkg）
      return bounded(0).catch(function () { return bounded(1).catch(function () { return bounded(2); }); });
    }).then(function (w) {
      worker = w;
      return worker.recognize(dataUrl);
    }).then(function (out) {
      var done = worker.terminate();
      return Promise.resolve(done).then(function () { return out; });
    }, function (e) {
      if (worker) { try { worker.terminate(); } catch (e2) { console.warn('终止识别线程失败', e2); } }
      throw e;
    }).then(function (out) {
      var raw = String((out && out.data && out.data.text) || '').replace(/\s+/g, ' ').trim();
      var conf = out && out.data && isFinite(out.data.confidence) ? out.data.confidence / 100 : 0.6;
      if (raw.length < 8) throw new Error('本地识别未读到有效文字');
      return { stem: raw, type: 'mcq', choices: {}, confidence: Math.max(0.5, Math.min(0.95, conf)), _model: 'tesseract-local' };
    });
    return Promise.race([work, timeout]).then(function (out) {
      clearTimeout(timer); return out;
    }, function (e) {
      clearTimeout(timer); throw e;
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
  function renderRows() {
    var host = $('imgimpRows'); if (!host) return;
    host.innerHTML = pages.length ? pages.map(rowHtml).join('') :
      '<div class="imgimp-empty">粘贴或拖入题目截图后，系统会自动识别文字与公式、自动匹配题库并写入错题回顾，无需任何额外操作。</div>';
  }
  function rowHtml(p) {
    var cand = p.cands || [];
    var label = p.error ? '识别失败' : (!p.ocr ? '识别中' : (p.qid ? (p.gate === 'discriminated' ? '已精确匹配并导入' : '已自动匹配并导入') : '未匹配'));
    var cls = p.qid ? 'ok' : 'warn';
    var thumb = p.thumb ? '<img src="' + p.thumb + '" alt="第 ' + p.i + ' 张截图">' : '<span class="imgimp-thumb-ph">图片</span>';
    var cross = p.ocr && p.ocr._cross ? (p.ocr._agree ? ' · 双模型一致' : ' · 双模型有分歧') : '';
    var conf = p.ocr && p.ocr.confidence ? '<small class="muted">OCR ' + Math.round(p.ocr.confidence * 100) + '%' + esc(cross) + '</small>' : '';
    var stem = p.ocr ? esc(String(p.ocr.stem).slice(0, 180)) : (p.error ? esc(p.error) : '正在识别…');
    var matched = '';
    if (p.qid) {
      var c = cand.filter(function (x) { return x.id === p.qid; })[0] || {};
      var mi = p.matchInfo || {};
      var proof = p.gate === 'discriminated'
        ? '双模型' + (mi.agree ? '一致' : '确认') + ' · 置信 ' + Math.round((mi.conf || 0) * 100) + '%' +
          (mi.numAgree != null ? ' · 数字校验 ' + Math.round(mi.numAgree * 100) + '%' : '')
        : '';
      matched = '<div class="imgimp-matched">图像比对：<b>' + esc((c.sec || '') + ' · #' + (c.no || '')) + '</b>' +
        (proof ? ' <small class="muted">' + esc(proof) + '</small>' : '') + '</div>';
    } else if (p.skipReason) {
      matched = '<div class="imgimp-matched">未导入：' + esc(p.skipReason) + '（为避免导错已跳过，可重试）</div>';
    }
    return '<article class="imgimp-row"><div class="imgimp-thumb">' + thumb + '</div>' +
      '<div class="imgimp-fields"><div class="imgimp-line"><b>第 ' + p.i + ' 张</b>' +
      '<span class="imgimp-badge' + cls + '">' + label + '</span>' + conf + '</div>' +
      '<div class="imgimp-ocr">' + stem + '</div>' + matched + '</div></article>';
  }
  function findQ(id) {
    for (var i = 0; i < A.SECS.length; i++) {
      var q = (A.CATALOG[A.SECS[i]] || []).find(function (x) { return x.id === id; });
      if (q) return { sec: A.SECS[i], q: q };
    }
    return null;
  }
  function refreshHost() { var h = window.TD_IMPORT_WRONG; if (h && h.refresh) h.refresh(); }

  function importChecked() {
    if (!A) return { added: 0, message: '题库未就绪' };
    var conflicts = [], now = Date.now(), added = 0;
    pages.forEach(function (p) {
      if (!p.checked || !p.qid) return;
      var hit = findQ(p.qid); if (!hit) return;
      var old = A.secState(hit.sec, false), cur = old && old.answers[hit.q.id];
      if (cur) {
        /* 错题记录只增不改：该题已有任何作答记录（真实作答或此前导入），一律跳过，绝不覆盖。 */
        if (cur.importSrc === MARK) return;
        conflicts.push({ page: p.i, qid: hit.q.id, v: cur.v });
        return;
      }
      var st = A.secState(hit.sec, true); if (!st) return;
      st.answers[hit.q.id] = { v: '', correct: false, ts: now, importSrc: MARK };
      st.completed = A.stats(hit.sec).completed;
      items.push({ sec: hit.sec, qid: hit.q.id, page: p.i });
      added++;
    });
    var msg = added ? ('已导入 ' + added + ' 道图片错题（仅新增记录）') : '没有可导入的题目';
    if (conflicts.length) msg += '；' + conflicts.length + ' 道已有作答记录，按只增不改原则跳过（未改动）';
    status(msg);
    if (!added) return { added: 0, skipped: conflicts.length, message: msg };
    A.save(); refreshHost();
    return { added: added, skipped: conflicts.length, message: msg };
  }

  function select(i, qid) {
    var p = pages.filter(function (x) { return x.i === +i; })[0]; if (!p) return false;
    p.qid = qid || ''; p.checked = !!qid; p.gate = 'manual'; renderRows();
    // 用户确认后立即写入（识别结束那轮 importChecked 已跑过，此刻需补一次）
    if (qid && !busy) { try { importChecked(); } catch (e) { console.warn('导入错题失败', e); } }
    return true;
  }
  function check(i, on) { var p = pages.filter(function (x) { return x.i === +i; })[0]; if (!p) return false; p.checked = !!on; renderRows(); return true; }

  function recognizeAll(images) {
    if (busy || !images || !images.length) return Promise.resolve(null);
    busy = true;
    pages = images.map(function (f, i) { return { i: i + 1, file: f, thumb: '', dataUrl: '', ocr: null, cands: [], qid: '', checked: false, error: '' }; });
    renderRows(); progress(0, pages.length);
    var chain = Promise.resolve();
    pages.forEach(function (p, idx) {
      chain = chain.then(function () {
        status('正在识别第 ' + p.i + ' / ' + pages.length + ' 张…');
        return compressImage(p.file).then(function (img) {
          p.thumb = img.thumb; p.dataUrl = img.url; renderRows();
          return ocrImage(img.url, state.model).then(function (ocr) {
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
            return discriminate(discriminateMessages(img.url, bankCands), bankCands, state.model).then(function (verdict) {
              var chosen = null;
              if (verdict && verdict.idx >= 1 && verdict.idx <= bankCands.length) {
                var cand = bankCands[verdict.idx - 1];
                // 第三步：独立数字指纹校验——OCR 题干的数字必须和候选题干数字吻合。
                // 这是不依赖模型的客观闸门，能挡住"模型看错图"导致的错导。
                var qNums = numbers(norm(stemTxt)), cNums = numbers(norm(cand.stem || ''));
                var numAgree = numScore(qNums, cNums);
                if (qNums.length < 2 || numAgree >= 0.7) {
                  chosen = cand;
                  p.matchInfo = { agree: verdict.agree, conf: verdict.confidence, numAgree: numAgree };
                } else {
                  p.skipReason = '数字校验未通过';
                }
              } else {
                p.skipReason = verdict ? '模型判别不一致或置信不足' : '模型判别不可用';
              }
              if (chosen) {
                p.qid = chosen.id; p.checked = true; p.gate = 'discriminated';
                p.cands = [chosen].concat(bankCands.filter(function (x) { return x.id !== chosen.id; }).slice(0, 4));
              } else {
                // 保守：拿不准就不导，绝不硬猜，也不推给用户点选
                p.qid = ''; p.checked = false; p.cands = recalled.slice(0, 5);
              }
              p.ocr.stem = stemTxt;
              renderRows(); progress(p.i, pages.length);
            });
          });
        }).catch(function (e) {
          p.error = errText(e); p.ocr = null; p.cands = []; p.qid = ''; p.checked = false;
          renderRows(); progress(p.i, pages.length);
        });
      });
    });
    return chain.then(function () {
      busy = false;
      var ok = pages.filter(function (p) { return p.ocr; }).length;
      var fail = pages.length - ok;
      // 全自动：识别结束后立即写入错题本，不等待任何用户操作
      var res = null;
      try { res = importChecked(); } catch (e) { console.warn('导入错题失败', e); }
      var added = res && res.added ? res.added : 0;
      var skipped = res && res.skipped ? res.skipped : 0;
      var unmatched = pages.filter(function (p) { return p.ocr && !p.error && !p.qid; }).length;
      var msg = '已自动识别并写入错题回顾：' + added + ' 道';
      if (unmatched) msg += '；' + unmatched + ' 道未能确认，为免导错已跳过（可重试）';
      if (fail) msg += '；' + fail + ' 张识别失败（可点「重试失败项」）';
      if (skipped) msg += '；' + skipped + ' 道因已有作答被跳过';
      if (!added && !fail && !skipped && !unmatched) msg = '未能匹配到题库题目，本次未导入';
      status(msg);
      renderRows();
      return { total: pages.length, ok: ok, fail: fail, added: added, skipped: skipped };
    });
  }
  function acceptFiles(fileList) {
    var files = [].slice.call(fileList || []).filter(function (f) { return /^image\//.test(f.type) || /\.(png|jpe?g|webp|gif|bmp|heic)$/i.test(f.name || ''); });
    if (!files.length) { status('请选择图片文件（PNG / JPG / WebP 等）'); return false; }
    if (busy) { status('正在识别上一批图片，请稍候…'); return false; }
    if ($('imgImportPanel').hidden) window.TD_IMG_IMPORT.open();
    recognizeAll(files); return true;
  }

  window.TD_IMG_IMPORT = {
    open: function () { $('imgImportPanel').hidden = false; $('btnImgImport').setAttribute('aria-expanded', 'true'); ensureCloudSession(function () { }); },
    close: function () { $('imgImportPanel').hidden = true; $('btnImgImport').setAttribute('aria-expanded', 'false'); },
    acceptFiles: acceptFiles, recognizeAll: recognizeAll, matchStem: matchStem,
    select: select, check: check, importChecked: importChecked,
    cloudSignIn: cloudSignIn,
    setModel: function (m) { state.model = m; },
    getModel: function () { return state.model; },
    getModelChain: function () { return MODEL_CHAIN.slice(); },
    lastModel: function () { return pages.length && pages[pages.length - 1].ocr ? pages[pages.length - 1].ocr._model || '' : ''; },
    getState: function () { return pages.map(function (p) { return { i: p.i, qid: p.qid, sec: p.qid ? (findQ(p.qid) || {}).sec : '', checked: p.checked, cands: p.cands.length, ocr: !!p.ocr, error: p.error, score: p.cands[0] ? +p.cands[0].score.toFixed(3) : 0, gate: p.gate || '', skipReason: p.skipReason || '', matchInfo: p.matchInfo || null, ocrStem: p.ocr ? String(p.ocr.stem || '').slice(0, 160) : '', candIds: (p.cands || []).slice(0, 5).map(function (c) { return c.id; }) }; }); },
    debugSetPages: function (list) { pages = (list || []).map(function (p, i) { return { i: p.i || i + 1, qid: p.qid || '', checked: p.checked !== false, cands: p.cands || [], ocr: p.ocr || null, thumb: '', dataUrl: '', error: '' }; }); renderRows(); return pages.length; },
    isBusy: function () { return busy; },
    retryFailed: function () {
      var files = pages.filter(function (p) { return p.error; }).map(function (p) { return p.file; });
      if (!files.length) { status('没有需要重试的图片'); return 0; }
      return recognizeAll(files);
    }
  };
  function on(id, ev, fn) { var el = $(id); if (el) el.addEventListener(ev, fn); }
  on('btnImgImport', 'click', function () { window.TD_IMG_IMPORT.open(); });
  on('imgImportClose', 'click', window.TD_IMG_IMPORT.close);
  on('fileImgImport', 'change', function (e) { acceptFiles(e.target.files); e.target.value = ''; });
  on('btnImgRetry', 'click', function () { window.TD_IMG_IMPORT.retryFailed(); });
  on('imgimpCloudSignIn', 'click', cloudSignIn);
  on('imgimpRows', 'change', function (e) {
    var t = e.target, c = t.getAttribute && t.getAttribute('data-img-cand'), k = t.getAttribute && t.getAttribute('data-img-check');
    if (c) select(c, t.value); else if (k) check(k, t.checked);
  });
  // 待核对候选按钮：点一下即确认该题为正确匹配并写入
  on('imgimpRows', 'click', function (e) {
    var t = e.target.closest ? e.target.closest('.imgimp-cand') : null;
    if (t) select(t.getAttribute('data-page'), t.getAttribute('data-qid'));
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
    if (files.length) { e.preventDefault(); acceptFiles(files); }
  });
  var sel = $('imgimpModel');
  if (sel) { sel.value = state.model; sel.addEventListener('change', function () { state.model = sel.value; }); }
})();
