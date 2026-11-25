/* SAT Math — 账号与进度同步后端（Supabase，邮箱登录唯一通道）。
 *
 * 为什么是 Supabase：identitytoolkit.googleapis.com 在国内不翻墙直接超时；
 * Supabase 的 REST / Auth 接口国内实测可直连。
 *
 * 当前过渡形态：**邮件链接登录（magic link）**。
 *   1. sendOtp(email) → POST /auth/v1/otp { email, create_user: true }
 *      邮件里收到一条登录链接（首次登录自动建档，create_user=true）。
 *   2. 用户在邮件里点链接，Supabase 回跳到本站，会话参数带在 `location.hash`
 *      （`#access_token=...&refresh_token=...&expires_in=3600&type=magiclink`）；
 *      `consumeHashSession()` 在页面加载时取出参数，按 packSession 等价路径落
 *      localStorage，再清掉地址栏 hash。
 *
 * [BLOCKED-BY-EXTERNAL] 数字验证码版本：`verifyOtp(email, code)`（6 位码
 * `POST /auth/v1/verify { type: 'email', token, email }`）代码保留未删，但当前
 * 默认 SMTP 下邮件模板被硬门禁锁死、加不进 `{{ .Token }}`，UI 不接这条路径。
 * 等总监提供自定义 SMTP 凭据、模板挂上 `{{ .Token }}` 后，再把面板切回数字码版本。
 *
 * 会话持久：packSession 结构沿用旧版，localStorage key `tdsat_auth_v1`；
 * 刷新页面、关标签页再开、跨标签页（storage 事件）都能恢复；过期用 refresh_token 续期。
 *
 * 对外暴露 window.TDSUPA：cloud-account.js 只关心「谁登录了、档案读/写」，不关心底层细节。
 */
(function () {
  'use strict';

  var CFG = (window.TD_CLOUD_CONFIG || {}).supabase || {};
  var BASE = String(CFG.url || '').replace(/\/+$/, '');
  var KEY = CFG.anonKey || '';
  var SITE_URL = String(CFG.siteUrl || '').replace(/\/+$/, '');
  var SESSION_KEY = 'tdsat_auth_v1';

  var stateCb = null;
  var session = null;      // { access, refresh, expiresAt, user }
  var currentUser = null;  // 给上层看的精简对象 { uid, email, displayName }

  function available() { return !!(BASE && KEY); }
  /* 没填 URL / anon key 就完全不动 */
  if (!available()) { return; }

  /* ---------- 基础请求 ---------- */
  function errOf(status, body) {
    var o = body || {};
    var msg = o.msg || o.message || o.error_description || o.error || ('HTTP ' + status);
    var e = new Error(msg);
    e.status = status;
    e.raw = o;
    var low = String(msg).toLowerCase();
    if (low.indexOf('invalid login credentials') >= 0) e.code = 'auth/invalid-credential';
    else if (low.indexOf('email not confirmed') >= 0) e.code = 'auth/email-not-confirmed';
    else if (low.indexOf('user already registered') >= 0 || low.indexOf('already been registered') >= 0) e.code = 'auth/email-already-in-use';
    else if (low.indexOf('email rate limit') >= 0 || low.indexOf('too many') >= 0 || low.indexOf('security purposes') >= 0) e.code = 'auth/too-many-requests';
    else if (low.indexOf('token has expired') >= 0 || low.indexOf('invalid') >= 0 && low.indexOf('token') >= 0) e.code = 'auth/invalid-code';
    else if (status === 0 || low.indexOf('failed to fetch') >= 0 || low.indexOf('network') >= 0) e.code = 'auth/network-request-failed';
    else if (status >= 500) e.code = 'auth/internal-error';
    return e;
  }

  function raw(path, opts) {
    opts = opts || {};
    return withTimeout(fetch(BASE + path, opts).then(function (res) {
      return res.text().then(function (txt) {
        var body = null;
        try { body = txt ? JSON.parse(txt) : null; } catch (e) { body = txt; }
        if (!res.ok) throw errOf(res.status, body);
        return body;
      });
    }).catch(function (e) {
      throw errOf(0, { msg: (e && e.message) || '网络异常，请检查连接后重试。' });
    }), opts.timeout || 20000, '网络较慢：连不上登录服务，请检查网络后重试。');
  }

  function withTimeout(promise, ms, message) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { reject(errOf(0, { msg: message })); }, ms);
      promise.then(function (v) { clearTimeout(timer); resolve(v); },
        function (e) { clearTimeout(timer); reject(e); });
    });
  }

  function authHeaders(token) {
    var h = { 'Content-Type': 'application/json', apikey: KEY };
    if (token) h.Authorization = 'Bearer ' + token;
    return h;
  }

  function rest(path, opts) {
    opts = opts || {};
    return raw('/rest/v1' + path, {
      method: opts.method || 'GET',
      headers: Object.assign(authHeaders(opts.token), opts.headers || {}),
      body: opts.body == null ? undefined : JSON.stringify(opts.body),
      timeout: opts.timeout
    });
  }

  /* ---------- 会话 ---------- */
  function packSession(r) {
    if (!r || !r.access_token) return null;
    return {
      access: r.access_token,
      refresh: r.refresh_token || '',
      expiresAt: Date.now() + ((r.expires_in || 3600) * 1000) - 30000,
      user: r.user || (session && session.user) || {}
    };
  }
  function saveSession(s) {
    session = s;
    try {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else localStorage.removeItem(SESSION_KEY);
    } catch (e) { console.warn('保存登录状态失败', e); }
  }
  function loadSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.access) return null;
      return s;
    } catch (e) { return null; }
  }

  /* 邮件链接回调：解析 location.hash 里的 access_token / refresh_token / expires_in，
     落本地会话后清掉 hash，避免 token 留在地址栏。hash 里不带 user 对象，
     user 由 boot() 随后用 access_token 调 /auth/v1/user 补全。 */
  function consumeHashSession() {
    if (typeof location === 'undefined') return false;
    var hash = String(location.hash || '');
    if (hash.indexOf('access_token=') < 0) return false;
    var params;
    try { params = new URLSearchParams(hash.slice(1)); } catch (e) { return false; }
    var access = params.get('access_token');
    if (!access) return false;
    var expiresAt;
    var expAt = Number(params.get('expires_at'));
    if (expAt > 0) expiresAt = expAt * 1000 - 30000;
    else expiresAt = Date.now() + ((Number(params.get('expires_in')) || 3600) * 1000) - 30000;
    saveSession({
      access: access,
      refresh: params.get('refresh_token') || '',
      expiresAt: expiresAt,
      user: {}
    });
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* 老浏览器兜底 */ }
    return true;
  }
  function toUser(u) {
    if (!u || !u.id) return null;
    var meta = u.user_metadata || {};
    return {
      uid: u.id,
      email: u.email || '',
      displayName: meta.display_name || meta.nickname || ''
    };
  }
  function emit() {
    currentUser = session ? toUser(session.user) : null;
    if (stateCb) stateCb(currentUser);
  }

  async function refreshIfNeeded() {
    if (!session) return null;
    if (session.expiresAt && Date.now() < session.expiresAt) return session;
    if (!session.refresh) return null;
    try {
      var r = await raw('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: authHeaders(null),
        body: JSON.stringify({ refresh_token: session.refresh }),
        timeout: 15000
      });
      var s = packSession(r) || session;
      s.user = r.user || session.user;
      saveSession(s);
      return s;
    } catch (e) {
      console.warn('登录状态续期失败，需要重新登录', e);
      saveSession(null);
      return null;
    }
  }

  var booted = null;
  function boot() {
    if (booted) return booted;
    booted = (async function () {
      consumeHashSession();
      session = loadSession();
      if (!session) { emit(); return; }
      session = await refreshIfNeeded();
      if (!session) { emit(); return; }
      try {
        var u = await raw('/auth/v1/user', { headers: authHeaders(session.access), timeout: 15000 });
        if (u && u.id) { session.user = u; saveSession(session); }
      } catch (e) {
        if (e.code === 'auth/invalid-credential' || e.status === 401) saveSession(null);
      }
      emit();
    })();
    return booted;
  }

  async function token() {
    await boot();
    session = await refreshIfNeeded();
    if (!session) throw errOf(401, { msg: '登录状态已失效，请重新登录。' });
    return session.access;
  }

  function sessionFrom(r) {
    var s = packSession(r);
    if (!s) throw errOf(400, { msg: '登录失败，请重试。' });
    saveSession(s);
    emit();
    return currentUser;
  }

  /* ---------- 邮箱登录 ---------- */
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim()); }

  // 发送登录邮件：create_user=true，首次输入邮箱即自动建档（后端 disable_signup:false）。
  // 当前后端默认邮件模板回的是 magic link（点链接回站带 hash 会话），不是数字码。
  async function sendOtp(email) {
    var mail = String(email || '').trim();
    if (!validEmail(mail)) throw errOf(400, { msg: '邮箱格式不正确，请检查后再发送登录邮件。' });
    var body = { email: mail, create_user: true };
    /* 显式带 redirect_to：否则后端按后台 Site URL 回跳，可能落到站点根、丢掉
       /SAT-Math/ 路径段，导致回跳 hash 接不到本站壳页。
       实测本项目 GoTrue 从 **query string** 读 redirect_to，body 字段会被忽略；
       两处都带上，兼容不同版本。 */
    var otpPath = '/auth/v1/otp';
    if (SITE_URL) {
      var redirectTo = SITE_URL + '/';
      body.redirect_to = redirectTo;
      otpPath += '?redirect_to=' + encodeURIComponent(redirectTo);
    }
    await raw(otpPath, {
      method: 'POST',
      headers: authHeaders(null),
      body: JSON.stringify(body),
      timeout: 20000
    });
    return true;
  }

  // [BLOCKED-BY-EXTERNAL] 6 位数字验证码换会话。当前默认 SMTP 模板加不进
  // {{ .Token }}，此路径不接 UI；等自定义 SMTP + 模板改造完成后再启用。
  async function verifyOtp(email, code) {
    var mail = String(email || '').trim();
    var token = String(code || '').trim();
    if (!validEmail(mail)) throw errOf(400, { msg: '邮箱格式不正确，请检查后再发送登录邮件。' });
    if (!/^\d{6}$/.test(token)) throw errOf(400, { msg: '请输入邮件里收到的 6 位数字验证码。' });
    var r = await raw('/auth/v1/verify', {
      method: 'POST',
      headers: authHeaders(null),
      body: JSON.stringify({ type: 'email', token: token, email: mail }),
      timeout: 20000
    });
    return sessionFrom(r);
  }

  /* 跨标签页同步：别的标签页登录 / 退出后，本页按 localStorage 会话快照校正状态。 */
  window.addEventListener('storage', function (ev) {
    if (ev.key !== SESSION_KEY) return;
    session = loadSession();
    emit();
    if (session) refreshIfNeeded();
  });

  /* ---------- 对外 API ---------- */
  window.TDSUPA = {
    available: available,
    backend: 'supabase',

    onState: function (cb) {
      stateCb = cb;
      boot().then(function () { cb(currentUser); });
    },
    user: function () { return currentUser; },

    sendOtp: sendOtp,
    sendMagicLink: sendOtp,
    verifyOtp: verifyOtp,

    signOut: async function () {
      var tk = session && session.access;
      saveSession(null);
      emit();
      if (tk) {
        try {
          await raw('/auth/v1/logout', { method: 'POST', headers: authHeaders(tk), timeout: 10000 });
        } catch (e) { /* 本地已经退出，服务端失败无所谓 */ }
      }
      return true;
    },

    /* ---------- 学习档案 ---------- */
    getArchive: async function () {
      var tk = await token();
      var uid = currentUser && currentUser.uid;
      if (!uid) return null;
      var rows = await rest('/progress?user_id=eq.' + encodeURIComponent(uid) + '&select=payload,nickname,updated_at', {
        token: tk, timeout: 15000
      });
      if (!rows || !rows.length) return null;
      var d = rows[0] || {};
      return {
        payload: (d.payload && typeof d.payload === 'object') ? d.payload : null,
        nickname: typeof d.nickname === 'string' ? d.nickname : '',
        updated_at: d.updated_at || ''
      };
    },

    pushProgress: async function (payload) {
      var tk = await token();
      var uid = currentUser && currentUser.uid;
      if (!uid) throw new Error('请先登录');
      var row = {
        user_id: uid,
        payload: payload || {},
        email: (currentUser && currentUser.email) || '',
        updated_at: new Date().toISOString()
      };
      if (currentUser && currentUser.displayName) row.nickname = currentUser.displayName;
      await rest('/progress?on_conflict=user_id', {
        method: 'POST',
        token: tk,
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: [row],
        timeout: 20000
      });
      return true;
    },

    updateNickname: async function (name) {
      var tk = await token();
      var uid = currentUser && currentUser.uid;
      if (!uid) throw new Error('请先登录');
      var clean = String(name == null ? '' : name).trim().slice(0, 24);
      if (!clean) throw new Error('昵称不能为空');
      await rest('/progress?on_conflict=user_id', {
        method: 'POST',
        token: tk,
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: [{ user_id: uid, nickname: clean, updated_at: new Date().toISOString() }],
        timeout: 15000
      });
      try {
        var r = await raw('/auth/v1/user', {
          method: 'PUT',
          headers: authHeaders(tk),
          body: JSON.stringify({ data: { display_name: clean } }),
          timeout: 15000
        });
        if (r && r.id) { session.user = r; saveSession(session); currentUser = toUser(r); }
      } catch (e) { /* 元数据失败不影响本地昵称 */ }
      return clean;
    }
  };

  // 后台每 20 分钟续期一次，避免长时间刷题后被踢下线
  setInterval(function () { if (session) refreshIfNeeded(); }, 20 * 60 * 1000);
})();
