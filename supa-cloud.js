/* SAT Math — 账号与进度同步后端（Supabase）。
 *
 * 为什么不是 Firebase：identitytoolkit.googleapis.com 在国内不翻墙直接超时，
 * 注册/登录/发验证码全都走不通；Supabase 的 REST 接口国内实测可直连。
 *
 * 对外暴露 window.TDFB，方法与旧 Firebase 模块保持一致，
 * cloud-account.js 只关心「谁登录了、档案读/写」，不关心底层是哪家后端。
 *
 * 注册流程（邮箱验证码）：
 *   startRegister(email, password, username)
 *     → Supabase signup，邮件里带 6 位数字验证码（Auth 模板里需放 {{ .Token }}）
 *   confirmRegister(email, code)
 *     → verify(type=signup)，成功即拿到会话，密码在注册那一步就已设定
 * 之后登录：signInEmail('邮箱或用户名', password)，用户名会在 usernames 表里换成邮箱。
 */
(function () {
  'use strict';

  var CFG = (window.TD_CLOUD_CONFIG || {}).supabase || {};
  var BASE = String(CFG.url || '').replace(/\/+$/, '');
  var KEY = CFG.anonKey || '';
  var SESSION_KEY = 'tdsat_auth_v1';

  var stateCb = null;
  var session = null;      // { access, refresh, expiresAt, user }
  var currentUser = null;  // 给上层看的精简对象 { uid, email, displayName }

  function available() { return !!(BASE && KEY); }
  if (!available()) { window.TDFB = { available: function () { return false; } }; return; }

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
    else if (low.indexOf('password should be') >= 0 || low.indexOf('weak') >= 0) e.code = 'auth/weak-password';
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
  function toUser(u) {
    if (!u || !u.id) return null;
    var meta = u.user_metadata || {};
    return {
      uid: u.id,
      email: u.email || '',
      displayName: meta.display_name || meta.nickname || '',
      username: meta.username || ''
    };
  }
  function emit(force) {
    currentUser = session ? toUser(session.user) : null;
    if (stateCb && (force || true)) stateCb(currentUser);
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

  /* ---------- 用户名 ↔ 邮箱 ---------- */
  function looksLikeEmail(v) { return String(v || '').indexOf('@') > 0; }
  function normUser(v) { return String(v || '').trim().toLowerCase(); }

  async function emailOfUsername(username) {
    var name = normUser(username);
    if (!name) throw errOf(400, { msg: '请填写邮箱或用户名。' });
    var rows = await rest('/usernames?username=eq.' + encodeURIComponent(name) + '&select=email', { timeout: 15000 });
    if (rows && rows.length) return rows[0].email;
    throw errOf(404, { msg: '没有找到这个用户名。' });
  }

  async function usernameTaken(username) {
    var name = normUser(username);
    if (!name) return false;
    try {
      var rows = await rest('/usernames?username=eq.' + encodeURIComponent(name) + '&select=username', { timeout: 12000 });
      return !!(rows && rows.length);
    } catch (e) { return false; } // 查不到就交给数据库唯一约束兜底
  }

  async function bindUsername(tk, username, email, uid) {
    var name = normUser(username);
    if (!name) return;
    try {
      await rest('/usernames', {
        method: 'POST',
        token: tk,
        headers: { Prefer: 'return=minimal' },
        body: [{ username: name, uid: uid, email: email }],
        timeout: 15000
      });
    } catch (e) {
      // 409 = 已被占用；自己重复注册同一条不算错
      if (e.status !== 409 && !/duplicate/i.test(String(e.message))) console.warn('用户名映射写入失败', e);
    }
  }

  /* ---------- 对外 API ---------- */
  function userMetaPayload(username) { return { data: { username: username, display_name: username } }; }

  window.TDFB = {
    available: available,
    backend: 'supabase',

    onState: function (cb) {
      stateCb = cb;
      boot().then(function () { cb(currentUser); });
    },
    user: function () { return currentUser; },

    // 登录：邮箱或用户名 + 密码
    signInEmail: async function (identifier, pw) {
      var id = String(identifier || '').trim();
      var email = looksLikeEmail(id) ? id : await emailOfUsername(id);
      var r = await raw('/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: authHeaders(null),
        body: JSON.stringify({ email: email, password: String(pw || '') }),
        timeout: 20000
      });
      return sessionFrom(r);
    },

    // 注册第一步：建账号并发验证码邮件（此时还没登录）
    startRegister: async function (email, pw, username) {
      var mail = String(email || '').trim();
      var name = normUser(username);
      if (!looksLikeEmail(mail)) throw errOf(400, { msg: '邮箱格式不正确。' });
      if (!name) throw errOf(400, { msg: '请填写用户名。' });
      if (await usernameTaken(name)) throw errOf(409, { msg: '这个用户名已被占用，换一个吧。' });
      var r = await raw('/auth/v1/signup', {
        method: 'POST',
        headers: authHeaders(null),
        body: JSON.stringify({
          email: mail,
          password: String(pw || ''),
          data: { username: name, display_name: name }
        }),
        timeout: 20000
      });
      // 项目若关闭了「Confirm email」，signup 会直接返回会话
      if (r && r.access_token) {
        var u = sessionFrom(r);
        await bindUsername(r.access_token, name, mail, (r.user && r.user.id) || '');
        return { verified: true, user: u };
      }
      try { localStorage.setItem('tdsat_auth_pending', JSON.stringify({ email: mail, username: name, at: Date.now() })); } catch (e) {}
      return { verified: false, email: mail, username: name };
    },

    // 注册第二步：输入 6 位验证码
    confirmRegister: async function (email, code) {
      var mail = String(email || '').trim();
      var token = String(code || '').trim();
      if (!mail || !token) throw errOf(400, { msg: '请填写邮箱和验证码。' });
      var r = await raw('/auth/v1/verify', {
        method: 'POST',
        headers: authHeaders(null),
        body: JSON.stringify({ type: 'signup', email: mail, token: token }),
        timeout: 20000
      });
      var u = sessionFrom(r);
      var meta = (r.user && r.user.user_metadata) || {};
      await bindUsername(r.access_token, meta.username || '', mail, (r.user && r.user.id) || '');
      try { localStorage.removeItem('tdsat_auth_pending'); } catch (e) {}
      return u;
    },

    resendCode: async function (email) {
      await raw('/auth/v1/resend', {
        method: 'POST',
        headers: authHeaders(null),
        body: JSON.stringify({ type: 'signup', email: String(email || '').trim() }),
        timeout: 20000
      });
      return true;
    },

    sendReset: async function (email) {
      await raw('/auth/v1/recover', {
        method: 'POST',
        headers: authHeaders(null),
        body: JSON.stringify({ email: String(email || '').trim() }),
        timeout: 20000
      });
      return true;
    },

    // 兼容旧调用名
    signUpEmail: async function (email, pw, username) { return this.startRegister(email, pw, username); },

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
          body: JSON.stringify(userMetaPayload(clean)),
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
