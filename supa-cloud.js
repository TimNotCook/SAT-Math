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
  /* 没填 URL / anon key 就完全不动，别把已有的 Firebase 通道顶掉 */
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

  /* ---------- 用户名模型 ----------
     身份 = 用户名；邮箱只是内部的伪邮箱 <用户名>@<emailDomain>，用户不填、界面不显示。
     登录查名：先查 usernames（现役），再查 username_alias（曾用名），都走 resolve_login RPC，
     这样匿名端只读得到 username / user_id 两列，读不到 email 列。 */
  var EMAIL_DOM = String(CFG.emailDomain || 'satmath.local').replace(/^@/, '');
  function normUser(v) { return String(v || '').trim().toLowerCase(); }
  function internalEmail(u) { return normUser(u) + '@' + EMAIL_DOM; }
  function validUser(u) { return /^[a-z0-9][a-z0-9._-]{2,19}$/.test(u); }
  function badInput(msg) { return errOf(400, { msg: msg }); }

  /* 占用判定：只认服务端唯一约束顶回来的冲突信号，不靠匿名端先读 usernames 表枚举。
   * 注册前读表这条路已按 2026-11-25 裁定废弃——anon 能遍历全站用户名，抢注/撞库的代价
   * 大于「注册前先看一眼名字能不能用」的体验收益；查重完全交给数据库唯一约束。
   * 冲突来源只有两种：
   *   · GoTrue signup：确定性伪邮箱 <用户名>@satmath.local 已存在 → 422
   *     error_code=user_already_exists，msg "User already registered"（线上探针实测，
   *     证据见 docs/bugfix-2026-11-25-register-unique-constraint.md）；
   *   · 写 usernames 行：唯一索引冲突 → Postgres 23505 unique_violation / duplicate key。
   * 网络失败、42501 授权拒绝、5xx 等一律不算「被占用」，原样往上抛，不冒充冲突。 */
  function isConflictError(e) {
    if (!e) return false;
    var body = e.raw || {};
    var hay = [
      e.message, body.msg, body.message, body.error, body.error_description,
      body.error_code, body.code, body.details, body.hint
    ].map(function (x) { return String(x == null ? '' : x).toLowerCase(); }).join(' ');
    if (/user_already_exists|already registered|already been registered|email-already-in-use/.test(hay)) return true;
    if (/23505|unique_violation|duplicate key|unique constraint/.test(hay)) return true;
    return false;
  }

  function errUsernameTaken() {
    var e = errOf(409, { msg: '这个用户名已被占用，换一个吧。' });
    e.code = 'auth/username-already-in-use';
    return e;
  }

  async function loginEmail(username) {
    var name = normUser(username);
    if (!name) throw badInput('请填写用户名。');
    var r = await raw('/rest/v1/rpc/resolve_login', {
      method: 'POST',
      headers: authHeaders(null),
      body: JSON.stringify({ p_username: name }),
      timeout: 15000
    });
    var mail = typeof r === 'string' ? r : (Array.isArray(r) ? r[0] : (r && r.email) || '');
    if (!mail) {
      // 先查现役名；查不到再看是不是「改过名的旧名」——旧名一律不许登录，只给明确提示
      var retired = false;
      try {
        retired = await raw('/rest/v1/rpc/is_retired_username', {
          method: 'POST', headers: authHeaders(null),
          body: JSON.stringify({ p_username: name }), timeout: 12000
        }) === true;
      } catch (e) { /* 判不出来就按未找到处理 */ }
      if (retired) throw errOf(410, { msg: '这个用户名已经改过名，请用新用户名登录。', code: 'auth/username-retired' });
      throw errOf(404, { msg: '没有找到这个用户名。', code: 'auth/username-not-found' });
    }
    return mail;
  }

  async function bindUsername(tk, username, uid) {
    var name = normUser(username);
    if (!name || !uid) return;
    await rest('/usernames', {
      method: 'POST',
      token: tk,
      headers: { Prefer: 'return=minimal' },
      body: [{ username: name, user_id: uid, email: internalEmail(name) }],
      timeout: 15000
    });
  }

  /* ---------- 对外 API ---------- */
  function userMetaPayload(username) { return { data: { username: username, display_name: username } }; }

  window.TDSUPA = {
    available: available,
    backend: 'supabase',

    onState: function (cb) {
      stateCb = cb;
      boot().then(function () { cb(currentUser); });
    },
    user: function () { return currentUser; },

    // 登录：只收用户名 + 密码（邮箱不再对外）
    signInEmail: async function (identifier, pw) {
      var name = normUser(identifier);
      var email = await loginEmail(name);
      var r = await raw('/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: authHeaders(null),
        body: JSON.stringify({ email: email, password: String(pw || '') }),
        timeout: 20000
      });
      var u = sessionFrom(r);
      // 用户名以 usernames 表为准（改名后别的设备也能拿到新名），metadata 只当缓存
      var synced = null;
      try {
        var uid = u && u.uid;
        if (uid) {
          var rows = await rest('/usernames?user_id=eq.' + encodeURIComponent(uid) + '&select=username', {
            token: session.access, timeout: 12000
          });
          if (rows && rows.length) synced = String(rows[0].username || '');
        }
      } catch (e) { /* 读不到就用 metadata */ }
      if (synced) {
        session.user.user_metadata = Object.assign({}, session.user.user_metadata || {}, { username: synced, display_name: synced });
        saveSession(session);
        currentUser = toUser(session.user);
      }
      // 老账号若 metadata 里没写用户名，补成当前名（不改 auth.users.email）
      if (!(currentUser && currentUser.username)) {
        try {
          var fresh = await raw('/auth/v1/user', {
            method: 'PUT',
            headers: authHeaders(session.access),
            body: JSON.stringify({ data: { username: name, display_name: name } }),
            timeout: 15000
          });
          if (fresh && fresh.id) { session.user = fresh; saveSession(session); currentUser = toUser(fresh); }
        } catch (e) { /* 元数据失败不影响登录 */ }
      }
      return currentUser;
    },

    // 注册：只收用户名 + 密码，内部拼 <用户名>@satmath.local 交给 Supabase signUp。
    // 查重走唯一约束兜底（见上方 isConflictError）：注册前不读表枚举，直接尝试插入；
    // signup 撞上已有伪邮箱、或写 usernames 行撞上唯一索引，当场翻成 409「名字被占」。
    register: async function (username, pw) {
      var name = normUser(username);
      if (!validUser(name)) throw badInput('用户名要 3–20 位：小写字母/数字，可用 . _ -，首字符必须是字母或数字。');
      if (String(pw || '').length < 6) throw badInput('密码至少 6 位。');
      var mail = internalEmail(name);
      var r;
      try {
        r = await raw('/auth/v1/signup', {
          method: 'POST',
          headers: authHeaders(null),
          body: JSON.stringify({ email: mail, password: String(pw), data: { username: name, display_name: name } }),
          timeout: 20000
        });
      } catch (e) {
        if (isConflictError(e)) throw errUsernameTaken();
        throw e;
      }
      if (!(r && r.access_token)) {
        // 个别 GoTrue 形态对已存在邮箱只回 user 不发会话：先按冲突字段复核，
        // 确属占用才报 409；否则才是「没拿到会话」的邮箱确认问题——两条报错不许串。
        if (isConflictError({ raw: r, message: r && (r.msg || r.message) })) throw errUsernameTaken();
        throw errOf(400, {
          msg: '注册没有拿到会话：项目若开着「Confirm email」，伪邮箱收不到验证信。请管理员在 Auth 设置里关闭邮箱确认。',
          code: 'auth/email-not-confirm'
        });
      }
      sessionFrom(r);
      try {
        await bindUsername(r.access_token, name, (r.user && r.user.id) || '');
      } catch (e) {
        if (isConflictError(e)) throw errUsernameTaken();
        throw e;
      }
      return { verified: true, user: currentUser, username: name };
    },
    // 兼容旧调用名（旧代码传 email 的那几个入口一律不再接受真实邮箱）
    startRegister: async function (_email, pw, username) { return this.register(username, pw); },
    signUpEmail: async function (_email, pw, username) { return this.register(username, pw); },
    confirmRegister: async function () { throw badInput('现在不需要邮箱验证：注册即登录。'); },
    resendCode: async function () { throw badInput('现在不需要邮箱验证：注册即登录。'); },
    sendReset: async function () { throw badInput('账号不收邮箱，没有邮件重置；改密码请联系管理员。'); },

    // 改用户名：新旧名原子切换（服务端 rename_username：插别名 + 改现役名 + user_id = auth.uid() 校验）
    renameUsername: async function (name) {
      var tk = await token();
      var next = normUser(name);
      if (!validUser(next)) throw badInput('用户名要 3–20 位：小写字母/数字，可用 . _ -，首字符必须是字母或数字。');
      var r = await raw('/rest/v1/rpc/rename_username', {
        method: 'POST',
        headers: authHeaders(tk),
        body: JSON.stringify({ p_new: next }),
        timeout: 15000
      });
      var got = typeof r === 'string' ? r : next;
      if (session && session.user) {
        session.user.user_metadata = Object.assign({}, session.user.user_metadata || {}, { username: got, display_name: got });
        saveSession(session);
        try {
          var fresh = await raw('/auth/v1/user', {
            method: 'PUT',
            headers: authHeaders(session.access),
            body: JSON.stringify({ data: { username: got, display_name: got } }),
            timeout: 12000
          });
          if (fresh && fresh.id) { session.user = fresh; saveSession(session); }
        } catch (e) { /* metadata 写失败不影响改名结果，usernames 表才是真相 */ }
      }
      emit();
      return got;
    },

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

  /* 配置了就顶到 window.TDFB（cloud-account.js 只认这一个入口），同时留 TDSUPA 别名便于排查 */
  window.TDFB = window.TDSUPA;

  // 后台每 20 分钟续期一次，避免长时间刷题后被踢下线
  setInterval(function () { if (session) refreshIfNeeded(); }, 20 * 60 * 1000);
})();
