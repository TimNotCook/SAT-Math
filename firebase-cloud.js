/* firebase-cloud.js — 独立 Firebase 账号（Google / Apple / 邮箱密码）+ Firestore 专属学习档案。
 *
 * 这是本网站唯一的账号后端，完全不依赖 WorkBuddy / 任何第三方中继。
 * 配置来源：cloud-config.js 的 TD_CLOUD_CONFIG.firebase。
 *
 * 每个账号一份档案：progress/{uid}，按 uid 天然隔离，字段：
 *   payload    — 做题记录（tdsat_* 键的快照）
 *   nickname   — 用户自定义昵称
 *   email      — 仅后台留存，界面永不展示
 *   updated_at — 最后写入时间
 *
 * 对外门面（window.TDFB）：
 *   TDFB.available()            — 是否已配置
 *   TDFB.emailPasswordEnabled() — 邮箱密码登录是否已在控制台开启（异步）
 *   TDFB.onState(cb)            — 登录态变化回调(user|null)
 *   TDFB.user()                 — 当前用户或 null
 *   TDFB.signInGoogle()         — Google 弹窗登录
 *   TDFB.signInApple()          — Apple 弹窗登录
 *   TDFB.signInEmail(email,pw)  — 邮箱密码登录
 *   TDFB.signUpEmail(email,pw)  — 邮箱密码注册
 *   TDFB.sendReset(email)       — 发送重置密码邮件
 *   TDFB.signOut()              — 退出登录
 *   TDFB.getArchive()           — 读完整档案 {payload, nickname, updated_at}|null
 *   TDFB.pushProgress(payload)  — 写进度（merge，不会覆盖昵称）
 *   TDFB.updateNickname(name)   — 改昵称（Auth displayName + Firestore 同文档）
 *   TDFB.pullProgress()         — 读进度（兼容旧调用，返回 payload|null）
 */
(function () {
  'use strict';
  var CFG = (window.TD_CLOUD_CONFIG || {}).firebase;
  if (!CFG || !CFG.apiKey) { window.TDFB = { available: function () { return false; } }; return; }

  // SDK 随站点一起部署到 vendor/firebase/，不再依赖 www.gstatic.com。
  // 国内网络下 gstatic 加载极慢（曾实测浏览器 25s 超时），本地加载后登录稳定。
  // 相对路径：四个页面都在站点根，浏览器相对文档 URL 解析即可命中 /SAT-Math/vendor/firebase/。
  var SDK_BASE = 'vendor/firebase/';
  var fb = null, auth = null, db = null;
  var stateCb = null, currentUser = null;

  // 网络被墙/超时时 Promise 永远不 settle：弹窗一直转圈、按钮一直禁用且无任何提示。
  // 所有外部请求统一加超时兜底，超时时抛出中文提示，由上层 friendlyError 展示。
  function withTimeout(promise, ms, message) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { reject(new Error(message)); }, ms);
      promise.then(function (v) { clearTimeout(timer); resolve(v); },
        function (e) { clearTimeout(timer); reject(e); });
    });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        reject(new Error('SDK 加载超时：当前网络无法访问 Firebase 服务，请检查网络后重试。'));
      }, 12000);
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { clearTimeout(timer); resolve(); };
      s.onerror = function () { clearTimeout(timer); reject(new Error('SDK 加载失败：' + src)); };
      document.head.appendChild(s);
    });
  }

  var loading = null;
  function init() {
    if (loading) return loading;
    loading = (async function () {
      // SDK 已本地化，串行加载也是同源毫秒级；保持串行以确保
      // app-compat 先注册，auth/firestore-compat 依赖它。
      await loadScript(SDK_BASE + 'firebase-app-compat.js');
      await loadScript(SDK_BASE + 'firebase-auth-compat.js');
      await loadScript(SDK_BASE + 'firebase-firestore-compat.js');
      fb = window.firebase;
      var app = fb.apps.length ? fb.app() : fb.initializeApp(CFG);
      auth = app.auth();
      db = app.firestore();
      auth.onAuthStateChanged(function (u) {
        currentUser = u || null;
        if (stateCb) stateCb(currentUser);
      });
    })();
    return loading;
  }

  // 探测邮箱密码登录是否已在 Firebase 控制台启用：发一个必然失败的登录请求，
  // 若错误码是 operation-not-allowed 说明控制台没开该项。
  var emailEnabled = null;
  async function emailPasswordEnabled() {
    if (emailEnabled !== null) return emailEnabled;
    await init();
    try {
      await auth.signInWithEmailAndPassword('__probe__@invalid.local', '__probe__');
      emailEnabled = true;
    } catch (e) {
      emailEnabled = !(e && e.code === 'auth/operation-not-allowed');
    }
    return emailEnabled;
  }

  window.TDFB = {
    available: function () { return true; },
    emailPasswordEnabled: emailPasswordEnabled,
    // 轻量探测认证服务是否可达（4 秒内无响应视为不可达）；不初始化 SDK。
    reachable: function () {
      return new Promise(function (resolve) {
        var ctrl = new AbortController();
        var timer = setTimeout(function () { ctrl.abort(); resolve(false); }, 4000);
        fetch('https://identitytoolkit.googleapis.com/v1/projects?key=' + encodeURIComponent(CFG.apiKey), { signal: ctrl.signal })
          .then(function () { clearTimeout(timer); resolve(true); })
          .catch(function () { clearTimeout(timer); resolve(false); });
      });
    },
    onState: function (cb) {
      stateCb = cb;
      if (auth) auth.onAuthStateChanged(cb);
      else init().then(function () { auth.onAuthStateChanged(cb); });
    },
    user: function () { return currentUser; },
    signInGoogle: function () {
      return withTimeout((async function () {
        await init();
        var provider = new fb.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        return auth.signInWithPopup(provider);
      })(), 25000, '登录窗口加载超时：当前网络连不上 Google 登录服务，可改用 Apple 账号或邮箱登录。');
    },
    signInApple: function () {
      return withTimeout((async function () {
        await init();
        var provider = new fb.auth.OAuthProvider('apple.com');
        provider.addScope('name');
        provider.addScope('email');
        return auth.signInWithPopup(provider);
      })(), 25000, '登录窗口加载超时：当前网络连不上 Apple 登录服务，可改用 Google 或邮箱登录。');
    },
    signInEmail: function (email, pw) {
      return withTimeout((async function () {
        await init();
        return auth.signInWithEmailAndPassword(String(email).trim(), pw);
      })(), 20000, '登录请求超时：当前网络连不上 Firebase 认证服务，请检查网络后重试。');
    },
    signUpEmail: function (email, pw) {
      return withTimeout((async function () {
        await init();
        return auth.createUserWithEmailAndPassword(String(email).trim(), pw);
      })(), 20000, '注册请求超时：当前网络连不上 Firebase 认证服务，请检查网络后重试。');
    },
    sendReset: function (email) {
      return withTimeout((async function () {
        await init();
        return auth.sendPasswordResetEmail(String(email).trim());
      })(), 20000, '请求超时：当前网络连不上 Firebase 认证服务，请检查网络后重试。');
    },
    signOut: async function () { await init(); return auth.signOut(); },

    getArchive: async function () {
      await init();
      var u = auth.currentUser;
      if (!u) return null;
      var doc = await withTimeout(
        db.collection('progress').doc(u.uid).get(), 15000,
        '网络较慢，暂时读取不到云端档案；本机进度不受影响，联网后会自动同步。');
      if (!doc.exists) return null;
      var d = doc.data() || {};
      return {
        payload: (d.payload && typeof d.payload === 'object') ? d.payload : null,
        nickname: typeof d.nickname === 'string' ? d.nickname : '',
        updated_at: d.updated_at || ''
      };
    },

    pushProgress: async function (payload) {
      await init();
      var u = auth.currentUser;
      if (!u) throw new Error('请先登录');
      var patch = {
        payload: payload,
        email: u.email || '',
        updated_at: new Date().toISOString()
      };
      // 顺带把昵称补进档案，避免老档案缺字段；merge 不会覆盖用户改过的昵称以外的东西。
      if (u.displayName) patch.nickname = u.displayName;
      await withTimeout(
        db.collection('progress').doc(u.uid).set(patch, { merge: true }), 20000,
        '保存超时：当前网络连不上云端，进度会在联网后自动补存。');
    },

    updateNickname: async function (name) {
      await init();
      var u = auth.currentUser;
      if (!u) throw new Error('请先登录');
      var clean = String(name == null ? '' : name).trim().slice(0, 24);
      // Auth 的 displayName 跨设备持久化；即使这一步失败，也要把昵称落到 Firestore。
      try { await u.updateProfile({ displayName: clean }); } catch (e) { /* 继续落库 */ }
      await withTimeout(
        db.collection('progress').doc(u.uid).set({
          nickname: clean,
          updated_at: new Date().toISOString()
        }, { merge: true }), 15000,
        '保存超时：当前网络连不上云端，昵称稍后会自动补存。');
      return clean;
    },

    pullProgress: async function () {
      await init();
      var u = auth.currentUser;
      if (!u) throw new Error('请先登录');
      var doc = await db.collection('progress').doc(u.uid).get();
      if (!doc.exists) return null;
      return (doc.data() || {}).payload || null;
    }
  };
})();
