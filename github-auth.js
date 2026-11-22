/* github-auth.js — Firebase 在部分网络不可达时的备用账号通道：
 * 令牌登录，进度存私有仓库 sat-math-data（Contents API）。
 * 与 firebase-cloud.js 同构门面（TDFB 可用的方法这里都有），由 cloud-account.js 按活跃后端调用。
 *
 * 安全模型（2026-11 根修）：
 *   - 令牌只存 sessionStorage（标签页会话级），关闭标签即失效，不写 localStorage；
 *   - 旧版本残留在 localStorage 的明文令牌会在下次加载时迁移进 sessionStorage 并删除；
 *   - 建议使用 Fine-grained PAT 并只授权 sat-math-data 单仓库的 Contents 读写；
 *     首次同步若仓库不存在，会用令牌自动创建该私有仓库（登录页有明确提示）。
 *
 * 对外门面（window.TDGH）：
 *   TDGH.available()     — 恒 true（api.github.com 在一般网络可达）
 *   TDGH.active()        — 是否已持有令牌（当前通道是否活跃）
 *   TDGH.onState(cb)     — 登录态变化回调(user|null)
 *   TDGH.user()          — 当前用户或 null
 *   TDGH.signInToken(pat)— 校验令牌并登录（GET /user）
 *   TDGH.signOut()      — 退出登录，清除本地令牌
 *   TDGH.getArchive()   — 读档案 {payload, nickname, updated_at}|null
 *   TDGH.pushProgress(payload) — 写进度（私有仓库 Contents API upsert）
 *   TDGH.updateNickname(name)   — 改昵称（写进存档文件）
 */
(function () {
  'use strict';
  var TOKEN_KEY = 'tdgh_token_v1';
  var PROF_KEY = 'tdgh_profile_v1';
  var DATA_REPO = 'sat-math-data';
  var DATA_FILE = 'progress.json';

  var stateCb = null;
  var currentUser = null;
  var token = null;
  var meLogin = null;

  function persistProfile() {
    try {
      localStorage.setItem(PROF_KEY, JSON.stringify(currentUser || null));
    } catch (e) {}
  }
  function setUser(u) {
    currentUser = u || null;
    persistProfile();
    if (stateCb) stateCb(currentUser);
  }
  function b64(str) { return btoa(unescape(encodeURIComponent(str))); }
  function unb64(s) { return decodeURIComponent(escape(atob(s))); }

  function api(path, opts) {
    opts = opts || {};
    return fetch('https://api.github.com' + path, {
      method: opts.method || 'GET',
      headers: {
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'sat-math-progress-sync'
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) {
          var err = new Error(data.message || ('GitHub 请求失败（HTTP ' + r.status + '）'));
          err.status = r.status;
          throw err;
        }
        return r.status === 204 ? null : data;
      });
    });
  }

  function friendly(err) {
    if (err && err.status === 401) return new Error('令牌无效或已过期，请重新生成。');
    if (err && err.status === 403) return new Error('GitHub 请求频率受限，稍后再试。');
    return err;
  }

  /* 私有存档仓库不存在就建一个（auto_init 保证 main 分支已存在）。 */
  async function ensureRepo() {
    try {
      await api('/repos/' + meLogin + '/' + DATA_REPO);
      return;
    } catch (e) {
      if (e.status !== 404) throw e;
    }
    await api('/user/repos', {
      method: 'POST',
      body: { name: DATA_REPO, private: true, description: 'SAT Math 进度存档', auto_init: true }
    });
  }

  function fileUrl() {
    return '/repos/' + meLogin + '/' + DATA_REPO + '/contents/' + DATA_FILE;
  }

  window.TDGH = {
    available: function () { return true; },
    active: function () { return !!token; },
    onState: function (cb) {
      stateCb = cb;
      if (currentUser) cb(currentUser);
    },
    user: function () { return currentUser; },

    signInToken: async function (pat) {
      var t = String(pat || '').trim();
      if (!t) throw new Error('请粘贴 GitHub 个人访问令牌。');
      token = t;
      try {
        var me = await api('/user');
        meLogin = me.login;
        currentUser = {
          uid: 'gh:' + me.login,
          displayName: me.name || me.login,
          email: me.email || '',
          login: me.login
        };
        try { sessionStorage.setItem(TOKEN_KEY, token); } catch (e) {}
        try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}  // 清除旧版明文残留
        persistProfile();
        if (stateCb) stateCb(currentUser);
      } catch (e) {
        token = null;
        throw friendly(e);
      }
    },

    signOut: async function () {
      token = null;
      currentUser = null;
      meLogin = null;
      try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {}
      try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}  // 清除旧版残留
      persistProfile();
      if (stateCb) stateCb(null);
    },

    getArchive: async function () {
      await ensureRepo();
      try {
        var f = await api(fileUrl() + '?ref=main');
        var data = JSON.parse(unb64(f.content));
        return {
          payload: (data.payload && typeof data.payload === 'object') ? data.payload : null,
          nickname: typeof data.nickname === 'string' ? data.nickname : '',
          updated_at: data.updated_at || ''
        };
      } catch (e) {
        if (e.status === 404) return null;
        throw e;
      }
    },

    pushProgress: async function (payload) {
      await ensureRepo();
      var content = JSON.stringify({
        payload: payload,
        nickname: currentUser && currentUser._nick ? currentUser._nick : '',
        updated_at: new Date().toISOString()
      });
      var body = {
        message: 'progress ' + new Date().toISOString(),
        content: b64(content),
        branch: 'main'
      };
      try {
        var f = await api(fileUrl() + '?ref=main');
        body.sha = f.sha;
      } catch (e) { /* 新文件，不需要 sha */ }
      await api(fileUrl(), { method: 'PUT', body: body });
    },

    updateNickname: async function (name) {
      var clean = String(name == null ? '' : name).trim().slice(0, 24);
      if (currentUser) currentUser._nick = clean;
      await ensureRepo();
      var data = {};
      try {
        var f = await api(fileUrl() + '?ref=main');
        data = JSON.parse(unb64(f.content));
        data._sha = f.sha;
      } catch (e) { if (e.status !== 404) throw e; }
      data.nickname = clean;
      data.updated_at = new Date().toISOString();
      var body = { message: 'nickname ' + clean, content: b64(JSON.stringify(data)), branch: 'main' };
      if (data._sha) body.sha = data._sha;
      await api(fileUrl(), { method: 'PUT', body: body });
      return clean;
    }
  };

  /* 会话恢复：令牌从 sessionStorage 读取（仅本标签页有效）。
     旧版本残留在 localStorage 的明文令牌：迁移到 sessionStorage 后立即删除。 */
  (function restore() {
    try {
      var legacy = localStorage.getItem(TOKEN_KEY);
      if (legacy) {
        try { sessionStorage.setItem(TOKEN_KEY, legacy); } catch (e2) {}
        localStorage.removeItem(TOKEN_KEY);
      }
      token = sessionStorage.getItem(TOKEN_KEY) || null;
      var p = JSON.parse(localStorage.getItem(PROF_KEY) || 'null');
      if (token && p && p.uid) { currentUser = p; meLogin = p.login; }
    } catch (e) { token = null; currentUser = null; }
  })();
})();
