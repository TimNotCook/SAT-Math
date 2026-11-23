/* WorkBuddy 邮箱验证码适配层 (window.TDWB)
   通过隐藏沙箱 iframe (auth-relay.html) 调用 WorkBuddy Cloud SDK，
   与 Firebase (window.TDFB) 及 GitHub 令牌 (window.TDGH) 并存，互不干扰。 */
(function () {
  'use strict';

  var STORE_KEY = 'tdwb_relay_store_v1';
  var NICK_KEY = 'tdwb_nick_v1';
  var ARCHIVE_TABLE = 'profiles';
  var RPC_TIMEOUT = 15000;

  var cfg = window.TD_CLOUD_CONFIG || {};
  var iframe = null;
  var readyPromise = null;
  var initialized = false;
  var sdkFailedErr = null;
  var callId = 1;
  var pending = {};
  var currentUser = null;
  var listeners = [];

  function available() {
    return !!(cfg && cfg.endpoint && cfg.publishableKey);
  }

  function loadRelayStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function saveRelayStore(data) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data || {})); } catch (e) {}
  }

  function loadLocalNick() {
    try { return localStorage.getItem(NICK_KEY) || ''; } catch (e) { return ''; }
  }

  function saveLocalNick(name) {
    try {
      if (name) localStorage.setItem(NICK_KEY, name);
      else localStorage.removeItem(NICK_KEY);
    } catch (e) {}
  }

  function normalizeUser(raw) {
    if (!raw || !raw.id) return null;
    var nick = (raw.user_metadata && (raw.user_metadata.nickname || raw.user_metadata.name)) || loadLocalNick() || '';
    return {
      uid: 'wb:' + raw.id,
      rawId: raw.id,
      email: raw.email || '',
      displayName: nick,
      _provider: 'workbuddy'
    };
  }

  function notifyListeners() {
    listeners.forEach(function (cb) {
      try { cb(currentUser); } catch (e) {}
    });
  }

  function rejectAll(err) {
    Object.keys(pending).forEach(function (id) {
      var p = pending[id];
      delete pending[id];
      clearTimeout(p.timer);
      p.reject(err);
    });
  }

  window.addEventListener('message', function (ev) {
    if (!iframe || ev.source !== iframe.contentWindow) return;
    var msg = ev.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'store') {
      saveRelayStore(msg.data);
      return;
    }

    if (msg.type === 'sdk-ready') {
      sendRaw('init', {
        data: loadRelayStore(),
        endpoint: cfg.endpoint,
        oauthRelayBaseUrl: cfg.oauthRelayBaseUrl || '',
        publishableKey: cfg.publishableKey
      }).then(function () {
        initialized = true;
        return restoreSession();
      }).catch(function (e) {
        sdkFailedErr = e;
      });
      return;
    }

    if (msg.type === 'sdk-error') {
      sdkFailedErr = new Error((msg.error && msg.error.message) || 'WorkBuddy SDK 加载失败');
      rejectAll(sdkFailedErr);
      return;
    }

    if (msg.type === 'event') {
      var u = msg.session && msg.session.user ? normalizeUser(msg.session.user) : null;
      currentUser = u;
      notifyListeners();
      return;
    }

    if (msg.type === 'reply') {
      var item = pending[msg.id];
      if (!item) return;
      delete pending[msg.id];
      clearTimeout(item.timer);
      if (msg.ok) {
        item.resolve(msg.data);
      } else {
        var err = msg.error || (msg.data && msg.data.error) || { message: '请求失败' };
        var e = new Error(err.message || err.error_description || '请求失败');
        e.code = err.code || '';
        e.status = err.status || 0;
        item.reject(e);
      }
    }
  });

  function sendRaw(method, args) {
    return new Promise(function (resolve, reject) {
      if (!iframe || !iframe.contentWindow) {
        reject(new Error('认证中继未就绪'));
        return;
      }
      var id = callId++;
      var timer = setTimeout(function () {
        delete pending[id];
        reject(new Error('验证码服务连接超时，请检查网络后重试'));
      }, RPC_TIMEOUT);
      pending[id] = { resolve: resolve, reject: reject, timer: timer };
      try {
        iframe.contentWindow.postMessage({
          type: 'call',
          id: id,
          method: method,
          args: args || {},
          data: args && args.data,
          endpoint: args && args.endpoint,
          oauthRelayBaseUrl: args && args.oauthRelayBaseUrl,
          publishableKey: args && args.publishableKey
        }, '*');
      } catch (err) {
        clearTimeout(timer);
        delete pending[id];
        reject(err);
      }
    });
  }

  function ensureReady() {
    if (!available()) return Promise.reject(new Error('未配置 WorkBuddy 服务'));
    if (sdkFailedErr) return Promise.reject(sdkFailedErr);
    if (initialized) return Promise.resolve();
    if (readyPromise) return readyPromise;

    readyPromise = new Promise(function (resolve, reject) {
      iframe = document.createElement('iframe');
      iframe.src = 'auth-relay.html?v=3';
      iframe.setAttribute('sandbox', 'allow-scripts');
      iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none;';
      iframe.setAttribute('aria-hidden', 'true');
      iframe.tabIndex = -1;

      var start = Date.now();
      var poll = setInterval(function () {
        if (initialized) {
          clearInterval(poll);
          resolve();
        } else if (sdkFailedErr) {
          clearInterval(poll);
          readyPromise = null;
          reject(sdkFailedErr);
        } else if (Date.now() - start > RPC_TIMEOUT) {
          clearInterval(poll);
          readyPromise = null;
          reject(new Error('认证模块初始化超时，请刷新页面重试'));
        }
      }, 100);

      (document.body || document.documentElement).appendChild(iframe);
    });
    return readyPromise;
  }

  async function restoreSession() {
    try {
      var res = await sendRaw('getSession');
      var session = res && res.data && res.data.session ? res.data.session : res && res.data;
      var rawUser = session && session.user ? session.user : null;
      if (!rawUser) {
        var uRes = await sendRaw('getUser');
        rawUser = uRes && uRes.data && uRes.data.user ? uRes.data.user : null;
      }
      currentUser = normalizeUser(rawUser);
      if (currentUser) notifyListeners();
    } catch (e) {
      /* 静默失败：无有效会话 */
    }
  }

  async function rpc(method, args) {
    await ensureReady();
    var res = await sendRaw(method, args);
    if (res && res.error) {
      var e = new Error(res.error.message || res.error.error_description || '请求失败');
      e.code = res.error.code || '';
      e.status = res.error.status || 0;
      throw e;
    }
    return res ? res.data : null;
  }

  async function sendOtp(email) {
    var data = await rpc('sendOtp', { email: email });
    return {
      verificationId: (data && data.verificationId) || '',
      isExistingUser: !!(data && data.isExistingUser)
    };
  }

  // SDK 返回的是 { accessToken, refreshToken, expiresAt, user }，统一在这里换成登录态并广播
  async function applySession(data) {
    var rawUser = (data && data.user) || (data && data.session && data.session.user) || null;
    if (!rawUser) {
      try {
        var uRes = await rpc('getUser', {});
        rawUser = (uRes && uRes.user) || null;
      } catch (e) { /* 无会话 */ }
    }
    currentUser = normalizeUser(rawUser);
    notifyListeners();
    return currentUser;
  }

  // 老账号：只用验证码登录（历史上没设密码的用户也能进）
  async function verifyOtp(email, token) {
    var data = await rpc('verifyOtp', { email: email, token: token });
    return applySession(data);
  }

  // 注册：验证码证明邮箱归属 + 自设密码，一步注册并登录
  async function registerWithPassword(email, token, password) {
    var data = await rpc('register', { email: email, token: token, password: password });
    return applySession(data);
  }

  // 日常登录：邮箱 + 密码（密码在服务端校验）
  async function signInPassword(email, password) {
    var data = await rpc('signInPassword', { email: email, password: password });
    return applySession(data);
  }

  // 找回/重设密码：先发码，再用「码 + 新密码」重设并直接登录
  async function sendResetCode(email) {
    await rpc('resetSend', { email: email });
    return true;
  }

  async function resetPassword(email, token, password) {
    var data = await rpc('resetApply', { email: email, token: token, password: password });
    return applySession(data);
  }

  async function signOut() {
    try {
      if (initialized) await rpc('signOut', {});
    } catch (e) {}
    currentUser = null;
    saveRelayStore({});
    notifyListeners();
  }

  async function getArchive() {
    if (!currentUser) return null;
    try {
      var row = await rpc('db', { table: ARCHIVE_TABLE, op: 'select' });
      if (row && row.payload) {
        var p = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
        var nick = (p && p._nick) || loadLocalNick() || '';
        return { nickname: nick, payload: p };
      }
    } catch (e) {
      /* 若 WorkBuddy 侧未建表或无权限，则仅使用本地档案，不阻断登录 */
    }
    return { nickname: loadLocalNick(), payload: null };
  }

  async function pushProgress(snap) {
    if (!currentUser) return false;
    var body = Object.assign({}, snap || {});
    var nick = loadLocalNick();
    if (nick) body._nick = nick;
    try {
      var existing = await rpc('db', { table: ARCHIVE_TABLE, op: 'select' });
      if (existing && existing.id) {
        await rpc('db', { table: ARCHIVE_TABLE, op: 'update', eq: existing.id, payload: { payload: body } });
      } else {
        await rpc('db', { table: ARCHIVE_TABLE, op: 'insert', payload: { id: currentUser.rawId, payload: body } });
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  async function updateNickname(name) {
    saveLocalNick(name);
    if (currentUser) currentUser.displayName = name;
  }

  // 若本地已有 WorkBuddy 会话缓存，页面加载后自动静默恢复
  if (available()) {
    var cached = loadRelayStore();
    if (cached && Object.keys(cached).length > 0) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { ensureReady().catch(function () {}); });
      } else {
        ensureReady().catch(function () {});
      }
    }
  }

  window.TDWB = {
    available: available,
    active: function () { return !!currentUser; },
    onState: function (cb) {
      if (typeof cb === 'function') listeners.push(cb);
    },
    sendOtp: sendOtp,
    verifyOtp: verifyOtp,
    registerWithPassword: registerWithPassword,
    signInPassword: signInPassword,
    sendResetCode: sendResetCode,
    resetPassword: resetPassword,
    signOut: signOut,
    getArchive: getArchive,
    pushProgress: pushProgress,
    updateNickname: updateNickname
  };
})();
