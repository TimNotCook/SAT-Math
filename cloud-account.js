/* TD SAT Math 独立账号系统（合并 Firebase + WorkBuddy 邮箱验证码 + GitHub 令牌备用通道）
   - 通道 1（国内直连推荐）：WorkBuddy 邮箱验证码登录（window.TDWB -> auth-relay.html）
   - 通道 2（海外/代理）：Firebase 登录（Google / Apple / 邮箱+密码 / 重置密码，window.TDFB）
   - 通道 3（备用）：GitHub Personal Access Token（window.TDGH）
   各通道共享同一套本地进度快照（tdsat_*）、档案归属（tdprofile_v1）与自动保存引擎。 */
(function () {
  'use strict';

  var FB = window.TDFB || null;
  var WB = window.TDWB || null;
  var GH = window.TDGH || null;
  function auth() {
    if (GH && GH.active && GH.active()) return GH;
    if (WB && WB.active && WB.active()) return WB;
    return FB;
  }

  var SNAP_PREFIX = 'tdsat_';
  var NO_SYNC = { 'tdsat_prefs_v1': 1 };
  var PROFILE_KEY = 'tdprofile_v1';
  var DRAFT_KEY = 'tdprofile_draft_v1';
  var DEFAULT_NICK = '同学';

  var user = null;
  var nickname = '';
  var prof = { owner: '', lastSynced: '' };
  var busy = false;
  var saving = false;
  var pendingSave = false;
  var suppress = false;
  var pushTimer = null;
  var ui = null;
  // 默认优先展示邮箱验证码登录（国内可直连），也可一键切换为 Firebase 邮箱密码/注册/重置
  var emailMode = 'otp'; // 'otp' | 'login' | 'register' | 'reset'
  var otpSent = false;
  var otpEmail = '';
  var otpCooldown = 0;
  var otpCountdownTimer = null;
  var activeTab = 'account'; // 'account' | 'appearance' | 'about'

  /* ---------- 外观偏好（仅存本机，不随云端覆盖） ---------- */
  var PREFS_KEY = 'tdsat_prefs_v1';
  var prefs = { fontScale: 'normal', compact: false };

  function loadPrefs() {
    try {
      var raw = localStorage.getItem(PREFS_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && (p.fontScale === 'small' || p.fontScale === 'normal' || p.fontScale === 'large')) prefs.fontScale = p.fontScale;
        if (p && typeof p.compact === 'boolean') prefs.compact = p.compact;
      }
    } catch (e) {}
  }
  function savePrefs() {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) {}
    applyPrefs();
  }
  function applyPrefs() {
    var scale = prefs.fontScale === 'small' ? 0.92 : prefs.fontScale === 'large' ? 1.12 : 1;
    try { if (document.body) document.body.style.zoom = scale === 1 ? '' : String(scale); } catch (e) {}
    document.documentElement.setAttribute('data-compact', prefs.compact ? '1' : '0');
  }
  loadPrefs();
  applyPrefs();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyPrefs);

  /* ---------- helpers ---------- */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }
  function canon(obj) {
    var out = {};
    if (!obj || typeof obj !== 'object') return out;
    Object.keys(obj).sort().forEach(function (k) {
      if (k.indexOf(SNAP_PREFIX) === 0 && !NO_SYNC[k] && typeof obj[k] === 'string') out[k] = obj[k];
    });
    return out;
  }
  function hashOf(obj) { return hash(JSON.stringify(canon(obj))); }
  function snapshot() {
    var out = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(SNAP_PREFIX) === 0 && !NO_SYNC[k]) {
          var v = localStorage.getItem(k);
          if (typeof v === 'string') out[k] = v;
        }
      }
    } catch (e) {}
    return canon(out);
  }
  function localHash() { return hashOf(snapshot()); }

  function setStatus(text, kind) {
    if (!ui) return;
    ui.status.textContent = text;
    ui.status.setAttribute('data-kind', kind || 'plain');
  }
  function setError(text) {
    if (!ui) return;
    ui.error.textContent = text || '';
    ui.error.hidden = !text;
  }
  function setBusy(on) {
    busy = !!on;
    if (!ui) return;
    var btns = ui.root.querySelectorAll('button[data-busy]');
    for (var i = 0; i < btns.length; i++) btns[i].disabled = busy;
  }
  function displayName() { return (nickname || '').trim() || DEFAULT_NICK; }

  function setBtnIcon(btn) {
    btn.textContent = '';
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.6');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    var p1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    p1.setAttribute('cx', '12'); p1.setAttribute('cy', '12'); p1.setAttribute('r', '3');
    var p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p2.setAttribute('d', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z');
    svg.appendChild(p1); svg.appendChild(p2);
    btn.appendChild(svg);
    var lbl = document.createElement('span');
    lbl.textContent = '设置';
    btn.appendChild(lbl);
  }

  function friendlyError(e) {
    var code = (e && e.code) ? String(e.code) : '';
    var msg = (e && e.message) ? String(e.message) : '';
    var low = msg.toLowerCase();
    if (code === 'auth/operation-not-allowed') return '该登录方式尚未在后台启用，请改用邮箱验证码登录。';
    if (code === 'auth/invalid-email' || low.indexOf('invalid email') >= 0) return '邮箱格式不太对，请检查后重试。';
    if (code === 'auth/weak-password') return '密码至少需要 6 位。';
    if (code === 'auth/email-already-in-use') return '这个邮箱已经注册过了，请直接登录或切换邮箱验证码登录。';
    if (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'auth/wrong-password') return '邮箱或密码不对。';
    if (code === 'auth/too-many-requests' || low.indexOf('rate limit') >= 0 || low.indexOf('too many') >= 0) return '操作太频繁，请稍后再试。';
    if (code === 'auth/popup-closed-by-user') return '登录窗口已关闭，如需登录请再试一次。';
    if (code === 'auth/account-exists-with-different-credential') return '这个邮箱已绑定过其他登录方式，请用原来的方式登录。';
    if (code === 'auth/network-request-failed') return '无法连接 Google Firebase（国内网络可能需要代理），建议改用上方「邮箱验证码登录」。';
    if (low.indexOf('otp') >= 0 || low.indexOf('token') >= 0 || low.indexOf('expired') >= 0) return '验证码无效或已过期，请重新获取后再试。';
    if (low.indexOf('sdk load failed') >= 0) return '验证码组件加载失败，请刷新页面或检查网络后重试。';
    if (low.indexOf('failed to fetch') >= 0 || low.indexOf('request failed') >= 0) return '验证码服务暂时连不上，请检查网络后重试，或改用下方 Firebase / GitHub 令牌登录。';
    return msg || '操作失败，请稍后重试。';
  }

  /* ---------- 档案归属 / 暂存 ---------- */
  function loadProf() {
    try {
      var raw = localStorage.getItem(PROFILE_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p === 'object') {
          prof.owner = p.owner || '';
          prof.lastSynced = p.lastSynced || '';
        }
      }
    } catch (e) {}
  }
  function saveProf() {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(prof)); } catch (e) {}
  }
  function loadDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function saveDraft(uid, payload) {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ uid: uid, payload: payload })); } catch (e) {}
  }
  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
  }

  /* ---------- 云端数据同步 ---------- */
  function applyPayload(payload) {
    var keep = {}, k;
    for (k in NO_SYNC) {
      if (!Object.prototype.hasOwnProperty.call(NO_SYNC, k)) continue;
      var v = null;
      try { v = localStorage.getItem(k); } catch (e) {}
      if (v != null) keep[k] = v;
    }
    var cur = snapshot();
    Object.keys(cur).forEach(function (key) {
      try { localStorage.removeItem(key); } catch (e) {}
    });
    var clean = canon(payload || {});
    Object.keys(clean).forEach(function (key) {
      try { if (typeof clean[key] === 'string') localStorage.setItem(key, clean[key]); } catch (e) {}
    });
    Object.keys(keep).forEach(function (key) {
      try { localStorage.setItem(key, keep[key]); } catch (e) {}
    });
  }

  function isPlainObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function itemSig(x) {
    if (isPlainObj(x)) {
      if (typeof x.date === 'number') return 'd:' + x.date;
      if (typeof x.ts === 'number') return 't:' + x.ts;
      if (x.id != null) return 'i:' + x.id;
      if (x.uid != null) return 'u:' + x.uid;
    }
    return 'j:' + JSON.stringify(x);
  }
  function mergeArrays(a, b) {
    var out = (a || []).slice(), seen = {};
    out.forEach(function (x) { seen[itemSig(x)] = 1; });
    (b || []).forEach(function (x) {
      var k = itemSig(x);
      if (!seen[k]) { seen[k] = 1; out.push(x); }
    });
    return out;
  }
  function deepMerge(lo, co) {
    if (lo === undefined) return co;
    if (co === undefined) return lo;
    if (isPlainObj(lo) && isPlainObj(co) && typeof lo.ts === 'number' && typeof co.ts === 'number') {
      return co.ts > lo.ts ? co : lo;
    }
    if (Array.isArray(lo) || Array.isArray(co)) {
      if (Array.isArray(lo) && Array.isArray(co)) return mergeArrays(lo, co);
      return Array.isArray(lo) ? lo : co;
    }
    if (isPlainObj(lo) && isPlainObj(co)) {
      var out = {};
      Object.keys(Object.assign({}, lo, co)).forEach(function (k) {
        out[k] = deepMerge(lo[k], co[k]);
      });
      return out;
    }
    return lo;
  }

  function mergeLocalWithCloud(cloudPayload) {
    var local = snapshot();
    var out = canon(cloudPayload);
    Object.keys(local).forEach(function (k) {
      if (!(k in out)) { out[k] = local[k]; return; }
      if (out[k] === local[k]) return;
      try {
        var lo = JSON.parse(local[k]), co = JSON.parse(out[k]);
        out[k] = JSON.stringify(deepMerge(lo, co));
      } catch (e) {
        out[k] = local[k];
      }
    });
    return out;
  }

  function reloadSoon(msg) {
    setStatus(msg || '正在打开你的学习档案...', 'ok');
    setTimeout(function () { location.reload(); }, 550);
  }

  async function silentPush() {
    var A = auth();
    if (!user || !A) return false;
    if (saving) { pendingSave = true; return false; }
    saving = true;
    try {
      var snap = snapshot();
      var h = hashOf(snap);
      await A.pushProgress(snap);
      prof.owner = user.uid;
      prof.lastSynced = h;
      saveProf();
      return true;
    } catch (e) {
      return false;
    } finally {
      saving = false;
      if (pendingSave) { pendingSave = false; schedulePush(); }
    }
  }

  function schedulePush() {
    if (!user || !auth()) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(async function () {
      pushTimer = null;
      if (!user || localHash() === prof.lastSynced) return;
      var ok = await silentPush();
      setStatus(ok ? '进度已自动保存' : '暂时无法保存进度，联网后会自动重试', ok ? 'ok' : 'warn');
    }, 1500);
  }

  function onLocalWrite(k) {
    if (suppress || !user || !auth()) return;
    if (typeof k !== 'string' || k.indexOf(SNAP_PREFIX) !== 0 || NO_SYNC[k]) return;
    schedulePush();
  }

  function exposeNotify() {
    try { window.TDSync = { notify: onLocalWrite }; } catch (e) {}
  }

  async function afterSignIn() {
    var A = auth();
    if (!user || !A) return;
    var uid = user.uid;
    loadProf();

    var archive = null;
    try {
      archive = await A.getArchive();
    } catch (e) {
      setStatus('已登录 · 本地进度不受影响', 'ok');
      renderBody();
      return;
    }

    var cloudNick = archive && archive.nickname ? archive.nickname : '';
    nickname = cloudNick || (user && user.displayName) || '';
    if (!nickname) nickname = DEFAULT_NICK;
    try { user._nick = nickname; } catch (e) {}
    if (cloudNick !== nickname) {
      try { await A.updateNickname(nickname); } catch (e) {}
    }
    try { if (user && !user.displayName) user.displayName = nickname; } catch (e) {}

    var cloudPayload = archive && archive.payload ? canon(archive.payload) : null;
    var cloudHash = cloudPayload && Object.keys(cloudPayload).length ? hashOf(cloudPayload) : '';
    var lh = localHash();

    var draft = loadDraft();
    if (draft && draft.uid === uid && draft.payload && Object.keys(draft.payload).length) {
      suppress = true;
      try { applyPayload(draft.payload); } finally { suppress = false; }
      clearDraft();
      await silentPush();
      prof.lastSynced = localHash();
      saveProf();
      renderBody();
      reloadSoon('正在打开你的学习档案...');
      return;
    }

    if (prof.owner === uid) {
      if (lh !== prof.lastSynced) {
        var ok = await silentPush();
        setStatus(ok ? '进度已自动保存' : '暂时无法保存进度，联网后会自动重试', ok ? 'ok' : 'warn');
      } else if (cloudHash && cloudHash !== prof.lastSynced) {
        suppress = true;
        try { applyPayload(cloudPayload); } finally { suppress = false; }
        prof.lastSynced = localHash();
        saveProf();
        renderBody();
        reloadSoon('已打开你在其他设备上的进度');
        return;
      } else {
        prof.lastSynced = lh;
        saveProf();
        setStatus('进度已自动保存', 'ok');
      }
    } else {
      if (prof.owner && prof.owner !== 'guest' && lh !== prof.lastSynced) {
        saveDraft(prof.owner, snapshot());
      }
      var fresh = !prof.owner || prof.owner === 'guest';
      if (cloudPayload && Object.keys(cloudPayload).length) {
        var target = (fresh && Object.keys(snapshot()).length) ? mergeLocalWithCloud(cloudPayload) : cloudPayload;
        var merged = hashOf(target) !== cloudHash;
        suppress = true;
        try { applyPayload(target); } finally { suppress = false; }
        prof.owner = uid;
        prof.lastSynced = localHash();
        saveProf();
        if (merged) await silentPush();
        renderBody();
        reloadSoon('正在打开你的学习档案...');
        return;
      } else if (fresh) {
        var ok2 = await silentPush();
        prof.owner = uid;
        saveProf();
        setStatus(ok2 ? '已为你建立专属学习档案' : '已登录 · 本地进度正常保存', ok2 ? 'ok' : 'plain');
      } else {
        suppress = true;
        try { applyPayload({}); } finally { suppress = false; }
        prof.owner = uid;
        prof.lastSynced = localHash();
        saveProf();
        await silentPush();
        renderBody();
        reloadSoon('正在打开你的学习档案...');
        return;
      }
    }
    renderBody();
  }

  /* ---------- auth actions ---------- */
  function startOtpCooldown() {
    otpCooldown = 60;
    if (otpCountdownTimer) clearInterval(otpCountdownTimer);
    otpCountdownTimer = setInterval(function () {
      otpCooldown--;
      if (otpCooldown <= 0) {
        otpCooldown = 0;
        clearInterval(otpCountdownTimer);
        otpCountdownTimer = null;
      }
      if (ui && ui.otpSendBtn) {
        ui.otpSendBtn.disabled = busy || otpCooldown > 0;
        ui.otpSendBtn.textContent = otpCooldown > 0 ? ('重新发送 (' + otpCooldown + 's)') : (otpSent ? '重新发送验证码' : '获取验证码');
      }
    }, 1000);
  }

  async function doSendOtp() {
    var email = ui && ui.email ? ui.email.value.trim() : '';
    if (!email) { setError('请先填写邮箱。'); return; }
    if (!WB || !WB.available()) { setError('邮箱验证码模块未加载，请刷新页面重试。'); return; }
    try {
      setBusy(true); setError('');
      otpEmail = email;
      await WB.sendOtp(email);
      otpSent = true;
      startOtpCooldown();
      setStatus('验证码已发送至 ' + email + '，请查收邮箱（注意查看垃圾箱）', 'ok');
      renderBody();
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }

  async function doVerifyOtp() {
    var email = ui && ui.email ? ui.email.value.trim() : otpEmail;
    var code = ui && ui.otpCode ? ui.otpCode.value.trim() : '';
    if (!email) { setError('请填写邮箱。'); return; }
    if (!code) { setError('请填写收到的邮箱验证码。'); return; }
    if (!WB || !WB.available()) { setError('邮箱验证码模块未加载，请刷新页面重试。'); return; }
    try {
      setBusy(true); setError('');
      await WB.verifyOtp(email, code);
      otpSent = false;
      setStatus('验证码登录成功', 'ok');
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }

  async function doGoogle() {
    try { setBusy(true); setError(''); await FB.signInGoogle(); }
    catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }
  async function doApple() {
    try { setBusy(true); setError(''); await FB.signInApple(); }
    catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }
  async function doEmail() {
    var email = ui && ui.email ? ui.email.value.trim() : '';
    var pw = ui && ui.pw ? ui.pw.value : '';
    if (!email) { setError('请填写邮箱。'); return; }
    if (emailMode !== 'reset' && !pw) { setError('请填写密码。'); return; }
    try {
      setBusy(true); setError('');
      if (emailMode === 'register') await FB.signUpEmail(email, pw);
      else if (emailMode === 'reset') {
        await FB.sendReset(email);
        setStatus('重置密码邮件已发送，请查收 ' + email, 'ok');
        return;
      } else await FB.signInEmail(email, pw);
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }
  async function doGhLogin() {
    var pat = ui && ui.ghToken ? ui.ghToken.value.trim() : '';
    if (!pat) { setError('请粘贴 GitHub 令牌。'); return; }
    if (!GH) { setError('GitHub 登录模块未加载，请刷新页面重试。'); return; }
    try {
      setBusy(true); setError('');
      await GH.signInToken(pat);
    } catch (e) { setError((e && e.message) || '登录失败，请重试。'); }
    finally { setBusy(false); }
  }

  async function saveNickname(name) {
    var A = auth();
    if (!user || !A) return;
    var clean = String(name || '').trim().slice(0, 24) || DEFAULT_NICK;
    try {
      setBusy(true); setError('');
      await A.updateNickname(clean);
      nickname = clean;
      try { user._nick = clean; user.displayName = clean; } catch (e) {}
      setStatus('昵称已保存', 'ok');
      renderBody();
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }

  async function doSignOut() {
    var A = auth();
    if (!A) return;
    try {
      setBusy(true); setError('');
      try { await silentPush(); } catch (e) {}
      await A.signOut();
      user = null;
      nickname = '';
      setStatus('已退出登录 · 进度仍保留在这台设备', 'plain');
      renderBody();
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }

  function onState(u, provider) {
    if (GH && GH.active && GH.active() && (!u || String(u.uid || '').indexOf('gh:') !== 0)) return;
    if (WB && WB.active && WB.active() && provider !== 'workbuddy' && (!u || String(u.uid || '').indexOf('wb:') !== 0)) return;
    if (FB && FB.active && FB.active() && provider === 'workbuddy' && !u) return;

    user = u || null;
    if (user) {
      if (ui && ui.btn) ui.btn.setAttribute('data-on', '1');
      afterSignIn();
    } else {
      nickname = '';
      if (ui && ui.btn) ui.btn.setAttribute('data-on', '0');
      renderBody();
    }
  }

  /* ---------- UI 样式与面板 ---------- */
  function buildUI() {
    var css = [
      '.td-acct-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:6px 12px;border-radius:8px;border:1px solid var(--border,rgba(128,128,128,.25));background:transparent;color:inherit;font:inherit;font-size:13px;cursor:pointer;line-height:1.2}',
      '.td-acct-icon-btn{padding:6px;width:auto;min-width:34px;height:34px;border-radius:8px;white-space:nowrap}',
      '.td-acct-btn[data-on="1"]{border-color:#16a34a;color:#16a34a}',
      '.td-acct-layer{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;padding:16px}',
      '.td-acct-layer[data-open="1"]{display:flex}',
      '.td-acct-panel{width:100%;max-width:400px;max-height:90vh;overflow-y:auto;background:var(--surface,#fff);color:var(--text,#111827);border:1px solid var(--border,rgba(128,128,128,.25));border-radius:14px;padding:20px;box-shadow:0 20px 50px rgba(0,0,0,.25);font-family:inherit}',
      '.td-acct-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}',
      '.td-acct-head h2{margin:0;font-size:17px;font-weight:700}',
      '.td-acct-x{border:0;background:transparent;color:inherit;font-size:22px;line-height:1;cursor:pointer;padding:2px 6px;opacity:.7}',
      '.td-set-tabs{display:flex;gap:6px;border-bottom:1px solid var(--border,rgba(128,128,128,.2));margin-bottom:14px;padding-bottom:8px}',
      '.td-set-tab{border:0;background:transparent;color:inherit;font:inherit;font-size:13px;font-weight:600;padding:5px 10px;border-radius:7px;cursor:pointer;opacity:.65}',
      '.td-set-tab[data-active="1"]{opacity:1;background:rgba(37,99,235,.12);color:#2563eb}',
      '.td-acct-status{font-size:13px;padding:8px 10px;border-radius:8px;margin-bottom:12px;background:rgba(128,128,128,.08)}',
      '.td-acct-status[data-kind="ok"]{background:rgba(22,163,74,.12);color:#15803d}',
      '.td-acct-status[data-kind="warn"]{background:rgba(234,179,8,.15);color:#a16207}',
      '.td-acct-err{font-size:13px;padding:8px 10px;border-radius:8px;margin-bottom:12px;background:rgba(220,38,38,.12);color:#b91c1c}',
      '.td-acct-field{margin-bottom:10px}',
      '.td-acct-field label{display:block;font-size:12px;font-weight:600;margin-bottom:4px;opacity:.85}',
      '.td-acct-input{width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1px solid var(--border,rgba(128,128,128,.3));background:transparent;color:inherit;font:inherit;font-size:14px;margin-top:4px}',
      '.td-acct-btn2{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 14px;border-radius:8px;border:0;background:#2563eb;color:#fff;font:inherit;font-size:14px;font-weight:600;cursor:pointer}',
      '.td-acct-btn2[data-neutral="1"]{background:transparent;color:inherit;border:1px solid var(--border,rgba(128,128,128,.3))}',
      '.td-acct-btn2:disabled{opacity:.55;cursor:not-allowed}',
      '.td-acct-btn--wide{width:100%;margin-top:6px}',
      '.td-acct-apple{background:#111827;color:#fff;margin-top:8px}',
      '.td-acct-note{font-size:12px;opacity:.75;line-height:1.5;margin:10px 0 0;white-space:pre-line}',
      '.td-acct-toggle{border:0;background:transparent;color:#2563eb;font:inherit;font-size:12px;cursor:pointer;padding:4px 0;margin-top:6px;display:inline-block;margin-right:12px}',
      '.td-gh-alt{margin-top:12px;padding-top:10px;border-top:1px dashed var(--border,rgba(128,128,128,.25))}',
      '.td-acct-actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}',
      '.td-acct-who{font-size:14px;font-weight:700;margin-bottom:6px}',
      '.td-acct-or{display:flex;align-items:center;gap:10px;margin:12px 0;font-size:12px;opacity:.6}',
      '.td-acct-or::before,.td-acct-or::after{content:"";flex:1;height:1px;background:var(--border,rgba(128,128,128,.25))}',
      '.td-otp-row{display:flex;gap:8px;align-items:flex-end;margin-bottom:10px}',
      '.td-otp-row .td-acct-field{flex:1;margin-bottom:0}',
      '.td-otp-send{white-space:nowrap;height:36px;padding:0 12px;font-size:13px}',
      '.td-prof{display:flex;align-items:center;gap:12px;margin-bottom:14px}',
      '.td-prof-av{width:40px;height:40px;border-radius:999px;background:#2563eb;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0}',
      '.td-prof-name{font-weight:700;font-size:15px}',
      '.td-prof-sub{font-size:12px;opacity:.7}',
      '.td-nick-row{display:flex;gap:8px;align-items:flex-end}',
      '.td-nick-row .td-acct-field{flex:1;margin-bottom:0}',
      '.td-nick-save{height:36px}',
      '.td-set-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--border,rgba(128,128,128,.15))}',
      '.td-set-label{font-size:14px;font-weight:600}',
      '.td-set-desc{font-size:12px;opacity:.7;margin-top:2px}',
      '.td-set-seg{display:inline-flex;border:1px solid var(--border,rgba(128,128,128,.3));border-radius:8px;overflow:hidden}',
      '.td-set-seg button{border:0;background:transparent;color:inherit;font:inherit;font-size:12px;padding:5px 10px;cursor:pointer}',
      '.td-set-seg button[data-active="1"]{background:#2563eb;color:#fff}',
      '.td-set-switch{width:40px;height:22px;border-radius:999px;border:0;background:rgba(128,128,128,.35);position:relative;cursor:pointer;flex-shrink:0}',
      '.td-set-switch::after{content:"";position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:999px;background:#fff;transition:transform .15s}',
      '.td-set-switch[data-on="1"]{background:#2563eb}',
      '.td-set-switch[data-on="1"]::after{transform:translateX(18px)}',
      'html[data-compact="1"] .drill-select-inner,html[data-compact="1"] .drill-result-inner{',
      'max-width:none!important;padding-top:16px!important}',
      'html[data-compact="1"] .drill-select-h,html[data-compact="1"] .drill-result-h{font-size:26px!important}',
      'html[data-compact="1"] .drill-unit-button{padding:12px!important}',
      'html[data-compact="1"] .appbar-inner,html[data-compact="1"] .drill-context,',
      'html[data-compact="1"] .drill-questionbar-inner{min-height:48px!important}',
      '@media(max-width:640px){.td-acct-panel{padding:16px}}'
    ].join('');
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);

    var layer = el('div', 'td-acct-layer');
    layer.setAttribute('data-open', '0');
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-modal', 'true');
    layer.setAttribute('aria-label', '设置');

    var panel = el('div', 'td-acct-panel');
    var head = el('div', 'td-acct-head');
    head.appendChild(el('h2', '', '设置'));
    var x = el('button', 'td-acct-x', '×');
    x.type = 'button'; x.setAttribute('aria-label', '关闭');
    x.onclick = function () { layer.setAttribute('data-open', '0'); };
    head.appendChild(x);
    panel.appendChild(head);

    var tabs = el('div', 'td-set-tabs');
    [['account', '账户'], ['appearance', '外观'], ['about', '关于']].forEach(function (pair) {
      var t = el('button', 'td-set-tab', pair[1]);
      t.type = 'button';
      t.setAttribute('data-tab', pair[0]);
      t.onclick = function () { activeTab = pair[0]; setError(''); renderBody(); };
      tabs.appendChild(t);
    });
    panel.appendChild(tabs);

    var status = el('div', 'td-acct-status');
    var err = el('div', 'td-acct-err'); err.hidden = true;
    var body = el('div');
    panel.appendChild(status);
    panel.appendChild(err);
    panel.appendChild(body);
    layer.appendChild(panel);
    layer.addEventListener('click', function (e) { if (e.target === layer) layer.setAttribute('data-open', '0'); });
    document.body.appendChild(layer);

    var btn = el('button', 'td-acct-btn');
    btn.type = 'button';
    btn.setAttribute('aria-label', '设置');
    btn.title = '设置';
    setBtnIcon(btn);
    btn.onclick = function () { layer.setAttribute('data-open', '1'); renderBody(); };

    ui = { root: layer, layer: layer, btn: btn, status: status, error: err, body: body, tabs: tabs };
    return btn;
  }

  function field(labelText, inputType, placeholder, autocomplete) {
    var f = el('div', 'td-acct-field');
    var lab = el('label', '', labelText);
    var input = el('input', 'td-acct-input');
    input.type = inputType;
    input.placeholder = placeholder;
    if (autocomplete) input.autocomplete = autocomplete;
    lab.appendChild(input);
    f.appendChild(lab);
    return { box: f, input: input };
  }

  function renderAccountTab() {
    var b = ui.body;

    if (user) {
      var p = el('div', 'td-prof');
      var initial = (displayName().trim().charAt(0) || DEFAULT_NICK).toUpperCase();
      p.appendChild(el('div', 'td-prof-av', initial));
      var info = el('div');
      info.appendChild(el('div', 'td-prof-name', displayName()));
      var via = user._provider === 'workbuddy' ? '邮箱验证码登录' : user._provider === 'github' ? 'GitHub 令牌同步' : 'Firebase 账号';
      info.appendChild(el('div', 'td-prof-sub', '你的专属学习档案 · ' + via));
      p.appendChild(info);
      b.appendChild(p);

      var f = field('昵称', 'text', '给自己起个名字', 'off');
      f.input.value = displayName();
      f.input.maxLength = 24;
      var rowBox = el('div', 'td-nick-row');
      rowBox.appendChild(f.box);
      var save = el('button', 'td-acct-btn2 td-nick-save', '保存');
      save.type = 'button';
      save.setAttribute('data-busy', '1');
      save.onclick = function () { saveNickname(f.input.value); };
      f.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') saveNickname(f.input.value); });
      rowBox.appendChild(save);
      b.appendChild(rowBox);
      b.appendChild(el('p', 'td-acct-note', '昵称只用于显示，不会展示你的邮箱或手机号。'));
      ui.nameInput = f.input;

      var acts = el('div', 'td-acct-actions');
      var out = el('button', 'td-acct-btn2', '退出登录');
      out.type = 'button'; out.setAttribute('data-neutral', '1'); out.setAttribute('data-busy', '1');
      out.onclick = doSignOut;
      acts.appendChild(out);
      b.appendChild(acts);
      b.appendChild(el('p', 'td-acct-note', '做题进度会自动保存，换设备或重新登录后接着练，不需要任何手动操作。'));
      return;
    }

    var hasWB = !!(WB && WB.available());
    var hasFB = !!(FB && FB.available());
    if (!hasWB && !hasFB) {
      setStatus('登录暂时不可用', 'warn');
      b.appendChild(el('p', 'td-acct-note', '账号模块未能加载，做题与进度照常保存，不受影响。'));
      return;
    }

    if (emailMode === 'otp' && hasWB) {
      b.appendChild(el('div', 'td-acct-who', '邮箱验证码登录（国内直连）'));
      var emOtp = field('邮箱', 'email', 'you@example.com', 'email');
      if (otpEmail) emOtp.input.value = otpEmail;
      ui.email = emOtp.input;

      var otpRow = el('div', 'td-otp-row');
      otpRow.appendChild(emOtp.box);
      var sendBtn = el('button', 'td-acct-btn2 td-otp-send',
        otpCooldown > 0 ? ('重新发送 (' + otpCooldown + 's)') : (otpSent ? '重新发送' : '获取验证码'));
      sendBtn.type = 'button';
      sendBtn.setAttribute('data-busy', '1');
      if (otpCooldown > 0) sendBtn.disabled = true;
      sendBtn.onclick = doSendOtp;
      ui.otpSendBtn = sendBtn;
      otpRow.appendChild(sendBtn);
      b.appendChild(otpRow);

      var codeField = field('验证码', 'text', '输入邮箱收到的 6 位验证码', 'one-time-code');
      b.appendChild(codeField.box);
      ui.otpCode = codeField.input;
      codeField.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') doVerifyOtp(); });

      var verifyBtn = el('button', 'td-acct-btn2 td-acct-btn--wide', '验证码登录');
      verifyBtn.type = 'button';
      verifyBtn.setAttribute('data-busy', '1');
      verifyBtn.onclick = doVerifyOtp;
      b.appendChild(verifyBtn);

      if (hasFB) {
        var toPw = el('button', 'td-acct-toggle', '改用密码登录 / 注册（Firebase）');
        toPw.type = 'button';
        toPw.onclick = function () { emailMode = 'login'; setError(''); renderBody(); };
        b.appendChild(toPw);
      }
    } else if (hasFB) {
      if (emailMode === 'register') b.appendChild(el('div', 'td-acct-who', '注册新账号（Firebase）'));
      else if (emailMode === 'reset') b.appendChild(el('div', 'td-acct-who', '重置密码（Firebase）'));
      else b.appendChild(el('div', 'td-acct-who', '邮箱密码登录（Firebase）'));

      var em = field('邮箱', 'email', 'you@example.com', 'email');
      b.appendChild(em.box); ui.email = em.input;
      if (emailMode !== 'reset') {
        var pw = field('密码', 'password', emailMode === 'register' ? '至少 6 位' : '输入密码', 'current-password');
        b.appendChild(pw.box); ui.pw = pw.input;
      } else ui.pw = null;

      var submit = el('button', 'td-acct-btn2 td-acct-btn--wide',
        emailMode === 'register' ? '注册并登录' : emailMode === 'reset' ? '发送重置邮件' : '登录');
      submit.type = 'button'; submit.setAttribute('data-busy', '1');
      submit.onclick = doEmail;
      b.appendChild(submit);

      if (hasWB) {
        var toOtp = el('button', 'td-acct-toggle', '改用邮箱验证码登录（国内直连）');
        toOtp.type = 'button';
        toOtp.onclick = function () { emailMode = 'otp'; setError(''); renderBody(); };
        b.appendChild(toOtp);
      }
      if (emailMode === 'register' || emailMode === 'reset') {
        var back = el('button', 'td-acct-toggle', '已有账号？密码登录');
        back.type = 'button';
        back.onclick = function () { emailMode = 'login'; setError(''); renderBody(); };
        b.appendChild(back);
      } else {
        var reg = el('button', 'td-acct-toggle', '没有账号？注册');
        reg.type = 'button';
        reg.onclick = function () { emailMode = 'register'; setError(''); renderBody(); };
        b.appendChild(reg);

        var reset = el('button', 'td-acct-toggle', '忘记密码？');
        reset.type = 'button';
        reset.onclick = function () { emailMode = 'reset'; setError(''); renderBody(); };
        b.appendChild(reset);
      }
    }

    if (hasFB) {
      b.appendChild(el('div', 'td-acct-or', '或使用第三方账号（需境外网络）'));
      var g = el('button', 'td-acct-btn2 td-acct-btn--wide', '使用 Google 账号继续');
      g.type = 'button'; g.setAttribute('data-neutral', '1'); g.setAttribute('data-busy', '1');
      g.onclick = doGoogle;
      b.appendChild(g);

      var a = el('button', 'td-acct-btn2 td-acct-btn--wide td-acct-apple', '使用 Apple 账号继续');
      a.type = 'button'; a.setAttribute('data-busy', '1');
      a.onclick = doApple;
      b.appendChild(a);
    }

    b.appendChild(el('p', 'td-acct-note', '登录后会为你建立独立的学习档案，之前做过的题会一并带上。不登录同样可以使用全部功能。'));

    var alt = el('div', 'td-gh-alt');
    var altToggle = el('button', 'td-acct-toggle', '其他登录方式（GitHub 令牌）');
    altToggle.type = 'button';
    var altBox = el('div'); altBox.hidden = true;
    altToggle.onclick = function () { altBox.hidden = !altBox.hidden; };
    alt.appendChild(altToggle);
    alt.appendChild(altBox);

    var gt = field('GitHub 令牌', 'password', '粘贴 Personal Access Token', 'off');
    altBox.appendChild(gt.box); ui.ghToken = gt.input;
    var gl = el('button', 'td-acct-btn2 td-acct-btn--wide', '使用 GitHub 令牌登录');
    gl.type = 'button'; gl.setAttribute('data-busy', '1');
    gl.onclick = doGhLogin;
    altBox.appendChild(gl);
    altBox.appendChild(el('p', 'td-acct-note',
      '进度存进你自己的私有仓库 sat-math-data（首次同步会自动创建）。令牌仅保存在本标签页会话内，关闭标签即失效。'));
    b.appendChild(alt);
  }

  function row(label, desc) {
    var r = el('div', 'td-set-row');
    var left = el('div');
    left.appendChild(el('div', 'td-set-label', label));
    if (desc) left.appendChild(el('div', 'td-set-desc', desc));
    r.appendChild(left);
    return r;
  }

  function renderAppearanceTab() {
    var b = ui.body;
    var r0 = row('主题', '淡奶白或暗黑，立即生效并保存。');
    var seg0 = el('div', 'td-set-seg');
    var getTheme = (window.TDGetTheme || function () { return 'light'; });
    var curT = getTheme();
    [['light', '浅色'], ['dark', '暗黑']].forEach(function (pair) {
      var btn = el('button', '', pair[1]);
      btn.type = 'button';
      if (curT === pair[0]) btn.setAttribute('data-active', '1');
      btn.onclick = function () {
        if (window.TDSetTheme) window.TDSetTheme(pair[0]);
        else {
          try { localStorage.setItem('tdsat_theme', pair[0]); } catch (e) {}
          document.documentElement.setAttribute('data-theme', pair[0]);
          try { onLocalWrite('tdsat_theme'); } catch (e) {}
        }
        renderBody();
      };
      seg0.appendChild(btn);
    });
    r0.appendChild(seg0); b.appendChild(r0);

    var r1 = row('字号', '调整全站文字大小，立即生效并保存。');
    var seg = el('div', 'td-set-seg');
    [['small', '小'], ['normal', '标准'], ['large', '大']].forEach(function (pair) {
      var btn = el('button', '', pair[1]);
      btn.type = 'button';
      if (prefs.fontScale === pair[0]) btn.setAttribute('data-active', '1');
      btn.onclick = function () { prefs.fontScale = pair[0]; savePrefs(); renderBody(); };
      seg.appendChild(btn);
    });
    r1.appendChild(seg); b.appendChild(r1);

    var r2 = row('紧凑模式', '收紧页面留白，一屏显示更多题目。');
    var sw = el('button', 'td-set-switch');
    sw.type = 'button';
    sw.setAttribute('data-on', prefs.compact ? '1' : '0');
    sw.setAttribute('aria-label', '紧凑模式');
    sw.onclick = function () { prefs.compact = !prefs.compact; savePrefs(); renderBody(); };
    r2.appendChild(sw); b.appendChild(r2);

    b.appendChild(el('p', 'td-acct-note', '外观偏好保存在这台设备，刷新后依然有效。'));
  }

  function renderAboutTab() {
    var b = ui.body;
    b.appendChild(el('div', 'td-acct-who', 'TD SAT Math'));
    var bank = (window.TD_BANK && window.TD_BANK.questions) ? window.TD_BANK.questions.length : 0;
    b.appendChild(el('p', 'td-acct-note', '真题练习 · 单元抽查 · 错题回顾 · 模考\n题库 ' + bank + ' 题。'));
    b.appendChild(el('p', 'td-acct-note', '登录后每位用户都有独立的学习档案，进度自动保存、自动跟随。\n登录完全自愿，不登录也能使用全部功能。'));
  }

  function renderBody() {
    if (!ui) return;
    var b = ui.body;
    b.textContent = '';
    setBtnIcon(ui.btn);
    ui.btn.setAttribute('data-on', user ? '1' : '0');
    var tabs = ui.tabs.querySelectorAll('[data-tab]');
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].getAttribute('data-tab') === activeTab) tabs[i].setAttribute('data-active', '1');
      else tabs[i].removeAttribute('data-active');
    }
    if (activeTab === 'account') {
      if (!user && !otpSent) setStatus('未登录 · 进度保存在这台设备', 'plain');
      renderAccountTab();
    } else if (activeTab === 'appearance') {
      setStatus('外观偏好自动保存在这台设备', 'plain');
      renderAppearanceTab();
    } else if (activeTab === 'about') {
      setStatus('关于', 'plain');
      renderAboutTab();
    }
  }

  function mountButton(btn) {
    function attach() {
      var targets = ['#appnav .mainnav', '.mainnav', '#appnav .appbar-inner', '.appbar-inner', '#appnav', '.appbar'];
      for (var i = 0; i < targets.length; i++) {
        var host = document.querySelector(targets[i]);
        if (host && host.offsetParent !== null) {
          host.appendChild(btn);
          return true;
        }
      }
      return false;
    }
    if (attach()) return;
    var obs = new MutationObserver(function () { if (attach()) obs.disconnect(); });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () {
      obs.disconnect();
      if (!btn.parentNode) {
        btn.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:8999;background:var(--surface,#fff);box-shadow:0 4px 16px rgba(0,0,0,.15)';
        document.body.appendChild(btn);
      }
    }, 6000);
  }

  function startAutoSave() {
    setInterval(function () {
      if (user && !saving && !busy && localHash() !== prof.lastSynced) {
        silentPush().then(function (ok) {
          if (ok) setStatus('进度已自动保存', 'ok');
        });
      }
    }, 10000);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden' && user && localHash() !== prof.lastSynced) silentPush();
    });
    window.addEventListener('pagehide', function () {
      if (user && localHash() !== prof.lastSynced) silentPush();
    });
  }

  function boot() {
    loadProf();
    exposeNotify();
    var btn = buildUI();
    mountButton(btn);
    renderBody();
    if (FB && FB.onState) FB.onState(function (u) { onState(u, 'firebase'); });
    if (WB && WB.onState) WB.onState(function (u) { onState(u, 'workbuddy'); });
    if (GH && GH.onState) GH.onState(function (u) { onState(u, 'github'); });
    startAutoSave();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
