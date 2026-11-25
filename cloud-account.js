/* TD SAT Math — 独立账号系统（Firebase：Google / Apple / 邮箱密码）。
 *
 * 登录后每个账号拥有完全独立的学习档案：进度自动保存、切换账号自动切换档案，
 * 用户无需理解"云端 / 备份 / 恢复 / 同步"，也不需要点任何保存按钮。
 * 昵称由用户在设置里自定义，界面上永不展示邮箱或手机号。
 *
 * 档案归属：本机 localStorage 始终是当前账号档案的工作副本。
 *   tdprofile_v1       （不参与同步）记录 { owner, lastSynced }
 *   tdprofile_draft_v1 暂存"切换账号前，旧账号尚未保存的本机增量"
 * 自动保存：拦截 localStorage.setItem 的 tdsat_* 写入（1.5s 防抖）、
 *   页面隐藏 / 关闭时、以及 10s 兜底轮询；只在内容变化时静默写入。
 * 只同步 tdsat_* 做题数据；外观偏好 tdsat_prefs_v1 只留在这台设备。
 */
(function () {
  'use strict';

  var FB = window.TDFB || null;
  var WB = window.TDWB || null;
  var GH = window.TDGH || null;
  var SB = window.TDSUPA || null;   // Supabase 通道：cloud-config 里填了 url + anonKey 才存在
  // 数据通道优先级：GitHub 令牌 > Supabase > WorkBuddy 邮箱验证码 > Firebase。
  function auth() {
    if (GH && GH.active && GH.active()) return GH;
    if (SB && SB.available && SB.available() && SB.active && SB.active()) return SB;
    if (WB && WB.active && WB.active()) return WB;
    if (SB && SB.available && SB.available()) return SB;
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
  var emailMode = 'login'; // 'login' | 'register' | 'reset' | 'otp'
  var supaMaintainOpen = false; // 用户名维护折叠块的展开态（renderBody 重渲染后要保留）
  var otpSent = false;
  var otpEmail = '';
  var otpCooldown = 0;
  var otpCountdownTimer = null;
  var activeTab = 'account'; // account | appearance | about

  /* ---------- preferences（外观，只存这台设备） ---------- */
  var PREFS_KEY = 'tdsat_prefs_v1';
  var prefs = { fontScale: 'normal', compact: false, calcUnit: false };
  function loadPrefs() {
    try {
      var raw = localStorage.getItem(PREFS_KEY);
      if (raw) { var p = JSON.parse(raw); if (p && typeof p === 'object') {
        prefs.fontScale = p.fontScale || 'normal';
        prefs.calcUnit = !!p.calcUnit;
        prefs.compact = !!p.compact;
      } }
    } catch (e) { console.warn('读取外观偏好失败', e); }
  }
  function savePrefs() {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { console.warn('保存外观偏好失败', e); }
    applyPrefs();
  }
  function applyPrefs() {
    var root = document.documentElement;
    var zooms = { small: 0.92, normal: 1, large: 1.12 };
    if (document.body) document.body.style.zoom = zooms[prefs.fontScale] || 1;
    root.setAttribute('data-compact', prefs.compact ? '1' : '0');
  }
  loadPrefs();
  applyPrefs();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyPrefs);

  /* ---------- helpers ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function hash(str) {
    var h = 5385, i = str.length;
    while (i) h = (h * 33) ^ str.charCodeAt(--i);
    return (h >>> 0).toString(36) + ':' + str.length;
  }
  function canon(obj) {
    var out = {};
    Object.keys(obj || {}).filter(function (k) {
      return k.indexOf(SNAP_PREFIX) === 0 && !NO_SYNC[k];
    }).sort().forEach(function (k) { out[k] = obj[k]; });
    return out;
  }
  function hashOf(obj) { return hash(JSON.stringify(canon(obj))); }
  function snapshot() {
    var out = {}, i, k;
    try {
      for (i = 0; i < localStorage.length; i++) {
        k = localStorage.key(i);
        if (k && k.indexOf(SNAP_PREFIX) === 0 && !NO_SYNC[k]) out[k] = localStorage.getItem(k);
      }
    } catch (e) { return {}; }
    return out;
  }
  function localHash() { return hashOf(snapshot()); }
  function setStatus(text, kind) {
    if (!ui || !ui.status) return;
    ui.status.textContent = text;
    ui.status.setAttribute('data-kind', kind || 'plain');
  }
  function setError(text) {
    if (!ui || !ui.error) return;
    ui.error.textContent = text || '';
    ui.error.hidden = !text;
  }
  function setBusy(on) {
    busy = !!on;
    if (!ui) return;
    var nodes = ui.root.querySelectorAll('[data-busy]');
    for (var i = 0; i < nodes.length; i++) nodes[i].disabled = !!on;
  }
  function displayName() { return nickname || DEFAULT_NICK; }

  function setBtnIcon(btn) {
    if (!btn) return;
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" ' +
      'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true"><circle cx="12" cy="12" r="3"></circle>' +
      '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg><span>设置</span>';
  }
  function friendlyError(e) {
    var c = e && e.code, m = e && e.message;
    if (c === 'auth/operation-not-allowed') return '该登录方式暂未开放，请换一种方式。';
    if (c === 'auth/invalid-email') return '邮箱格式不正确。';
    if (c === 'auth/weak-password') return '密码太短，请至少输入 6 位。';
    if (c === 'auth/email-already-in-use') return '该邮箱已注册，请直接登录。';
    if (c === 'auth/user-not-found' || c === 'auth/invalid-credential') return '邮箱或密码不正确。';
    if (c === 'auth/wrong-password') return '密码不正确。';
    if (c === 'auth/too-many-requests') return '尝试次数过多，请稍后再试。';
    if (c === 'auth/popup-closed-by-user') return '登录窗口已关闭。';
    if (c === 'auth/apple-provider-disabled') return 'Apple 登录暂未开放，请稍后再试。';
    if (c === 'auth/account-exists-with-different-credential') return '该邮箱已用其他方式注册，请用原方式登录。';
    if (c === 'auth/network-request-failed') return '网络异常，请检查连接后重试。';
    if (c === 'auth/unauthorized-domain') return '当前网址未被 Firebase 授权，「Google / Apple 登录」用不了；请改用邮箱密码登录。';
    if (c === 'auth/popup-blocked') return '浏览器拦下了登录弹窗，请允许弹窗后重试。';
    if (c === 'auth/cancelled-popup-request') return '上一次登录还没结束，请稍等两秒再点。';
    if (c === 'auth/internal-error') return '登录服务返回异常，请刷新页面后重试。';
    if (c === 'invalid_username_or_password') return '邮箱或密码不正确。';
    if (c === 'INVALID_USERNAME_OR_PASSWORD') return '邮箱或密码不正确。';
    if (c === 'vcode-missing') return '请先点「获取验证码」，收到邮件后再填验证码。';
    if (c === 'invalid_request') return m || '请求参数不对，请检查后重试。';
    if (c === 'permission-denied') return '没有权限，请重新登录后再试。';
    if (c === 'rate-limited') return '操作太频繁了，等一分钟再试。';
    var lm = String(m || '').toLowerCase();
    if (lm.indexOf('does not match') >= 0 || lm.indexOf('verification code') >= 0) {
      return '验证码不对或已过期，请用最新一封邮件里的码，或重新获取。';
    }
    if (c === 'auth/network-request-failed') return '网络异常；国内网络可能连不上 Google，建议改用上方「邮箱验证码登录」。';
    if (!c && lm.indexOf('otp') >= 0 || lm.indexOf('token') >= 0 || lm.indexOf('expired') >= 0) return '验证码无效或已过期，请重新获取后再试。';
    if (!c && lm.indexOf('sdk load failed') >= 0) return '验证码组件加载失败，请刷新页面或检查网络后重试。';
    if (!c && lm.indexOf('failed to fetch') >= 0 || lm.indexOf('request failed') >= 0) return '验证码服务暂时连不上，请检查网络后重试，或改用下方 Firebase / GitHub 令牌登录。';
    return m || '操作失败，请重试。';
  }

  /* ---------- 档案归属 / 暂存 ---------- */
  function loadProf() {
    try {
      var raw = localStorage.getItem(PROFILE_KEY);
      if (raw) { var p = JSON.parse(raw); if (p && typeof p === 'object') {
        prof.owner = p.owner || '';
        prof.lastSynced = p.lastSynced || '';
      } }
    } catch (e) { console.warn('读取档案归属失败', e); }
  }
  function saveProf() {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(prof)); } catch (e) { console.warn('保存档案归属失败', e); }
  }
  function loadDraft() {
    try { var raw = localStorage.getItem(DRAFT_KEY); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }
  function saveDraft(uid, payload) {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ uid: uid, payload: payload })); } catch (e) { console.warn('保存草稿失败', e); }
  }
  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) { console.warn('清除草稿失败', e); } }

  function applyPayload(payload) {
    var keep = {}, k;
    for (k in NO_SYNC) {
      if (!Object.prototype.hasOwnProperty.call(NO_SYNC, k)) continue;
      var v = null;
      try { v = localStorage.getItem(k); } catch (e) { console.warn('读取本地存储失败', e); }
      if (v != null) keep[k] = v;
    }
    var cur = snapshot();
    Object.keys(cur).forEach(function (key) { try { localStorage.removeItem(key); } catch (e) { console.warn('清除本地存储失败', e); } });
    var clean = canon(payload || {});
    Object.keys(clean).forEach(function (key) {
      try { if (typeof clean[key] === 'string') localStorage.setItem(key, clean[key]); } catch (e) { console.warn('写入本地存储失败', e); }
    });
    Object.keys(keep).forEach(function (key) {
      try { localStorage.setItem(key, keep[key]); } catch (e) { console.warn('写入本地存储失败', e); }
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
      } catch (e) { out[k] = local[k]; }
    });
    return out;
  }

  function reloadSoon(msg) {
    setStatus(msg || '正在打开你的学习档案…', 'ok');
    setTimeout(function () { location.reload(); }, 550);
  }

  /* ---------- 自动保存引擎（用户全程无感） ---------- */
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
    try { window.TDSync = { notify: onLocalWrite }; } catch (e) { console.warn('注册同步通知未生效', e); }
  }

  /* 登录成功后：自动决定"切到该账号档案 / 归档本机进度 / 拉取别的设备进度"，
     全部后台完成，不弹确认、不让用户做选择。 */
  async function afterSignIn() {
    var A = auth();
    if (!user || !A) return;
    var uid = user.uid;
    loadProf();
    var archive = null;
    try { archive = await A.getArchive(); }
    catch (e) {
      setStatus('暂时无法读取你的学习档案，这台设备上的进度不受影响', 'warn');
      renderBody();
      return;
    }

    /* 昵称：档案 > Auth displayName > 默认「同学」；首次自动建档，永不显示邮箱。 */
    var cloudNick = archive && archive.nickname ? archive.nickname : '';
    nickname = cloudNick || (user && user.displayName) || '';
    if (!nickname) nickname = DEFAULT_NICK;
    try { user._nick = nickname; } catch (e) { console.warn('写入昵称未生效', e); }
    if (cloudNick !== nickname) {
      try { await A.updateNickname(nickname); } catch (e) { /* 下次登录会重试 */ }
    }
    try { if (user && !user.displayName) user.displayName = nickname; } catch (e) { console.warn('写入昵称未生效', e); }

    var cloudPayload = archive && archive.payload ? canon(archive.payload) : null;
    var cloudHash = cloudPayload && Object.keys(cloudPayload).length ? hashOf(cloudPayload) : '';
    var lh = localHash();

    /* 回到旧账号时，先恢复"登出后以游客身份做题"留下的增量，保证零丢失。 */
    var draft = loadDraft();
    if (draft && draft.uid === uid && draft.payload && Object.keys(draft.payload).length) {
      suppress = true;
      try { applyPayload(draft.payload); } finally { suppress = false; }
      clearDraft();
      await silentPush();
      prof.lastSynced = localHash(); saveProf();
      renderBody();
      reloadSoon('正在打开你的学习档案…');
      return;
    }

    if (prof.owner === uid) {
      /* 同一账号：以变化为准，全自动，不提示、不让用户做选择。 */
      if (lh !== prof.lastSynced) {
        var ok = await silentPush();
        setStatus(ok ? '进度已自动保存' : '暂时无法保存进度，联网后会自动重试', ok ? 'ok' : 'warn');
      } else if (cloudHash && cloudHash !== prof.lastSynced) {
        suppress = true;
        try { applyPayload(cloudPayload); } finally { suppress = false; }
        prof.lastSynced = localHash(); saveProf();
        renderBody();
        reloadSoon('已打开你在其他设备上的进度');
        return;
      } else {
        prof.lastSynced = lh; saveProf();
        setStatus('进度已自动保存', 'ok');
      }
    } else {
      /* 切换到另一个账号 / 首次登录：绝不把 A 的进度串给 B。 */
      if (prof.owner && prof.owner !== 'guest' && lh !== prof.lastSynced) {
        saveDraft(prof.owner, snapshot());
      }
      var fresh = !prof.owner || prof.owner === 'guest';
      if (cloudPayload && Object.keys(cloudPayload).length) {
        // 该账号已有档案 → 切过去。首次登录且本机有"无主"进度时先并入，避免丢题。
        var target = (fresh && Object.keys(snapshot()).length)
          ? mergeLocalWithCloud(cloudPayload) : cloudPayload;
        // canon()/mergeLocalWithCloud() 每次返回新对象，引用比较永远为真；
        // 改为内容指纹比对，只有真的发生了合并（内容有差异）才回传，避免无谓覆盖。
        var merged = hashOf(target) !== cloudHash;
        suppress = true;
        try { applyPayload(target); } finally { suppress = false; }
        prof.owner = uid; prof.lastSynced = localHash(); saveProf();
        if (merged) await silentPush();  // 把并集回传该账号
        renderBody();
        reloadSoon('正在打开你的学习档案…');
        return;
      } else if (fresh) {
        // 首次在这台设备使用该账号 → 把已有做题记录归到它名下
        var ok2 = await silentPush();
        prof.owner = uid; saveProf();
        setStatus(ok2 ? '已为你建立专属学习档案' : '暂时无法保存进度，联网后会自动重试', ok2 ? 'ok' : 'warn');
      } else {
        // 新账号、本机副本属于别的账号 → 干净起点，不串档
        suppress = true;
        try { applyPayload({}); } finally { suppress = false; }
        prof.owner = uid; prof.lastSynced = localHash(); saveProf();
        await silentPush();
        renderBody();
        reloadSoon('正在打开你的学习档案…');
        return;
      }
    }
    renderBody();
  }

  /* ---------- auth actions ---------- */
  function startOtpCooldown() {
    otpCooldown = 60;
    if (otpCountdownTimer) { clearInterval(otpCountdownTimer); otpCountdownTimer = null; }
    otpCountdownTimer = setInterval(function () {
      otpCooldown -= 1;
      if (otpCooldown < 0) otpCooldown = 0;
      if (otpCooldown <= 0) { clearInterval(otpCountdownTimer); otpCountdownTimer = null; }
      if (ui && ui.otpSendBtn) {
        ui.otpSendBtn.disabled = busy || otpCooldown > 0;
        ui.otpSendBtn.textContent = otpCooldown > 0 ? ('重新发送 (' + otpCooldown + 's)') : (otpSent ? '重新发送' : '获取验证码');
      }
    }, 1000);
  }

  function syncOtpSendBtn() {
    if (!ui || !ui.otpSendBtn) return;
    ui.otpSendBtn.disabled = busy || otpCooldown > 0;
    ui.otpSendBtn.textContent = otpCooldown > 0 ? ('重新发送 (' + otpCooldown + 's)') : (otpSent ? '重新发送' : '获取验证码');
  }

  // forReset=true 时发的是「重设密码」的码
  async function doSendOtp(forReset) {
    var email = ui && ui.email ? ui.email.value.trim() : '';
    if (!email) { setError('请先填写邮箱。'); return; }
    if (!WB || !WB.available()) { setError('登录模块未加载，请刷新页面重试。'); return; }
    try {
      setBusy(true); setError('');
      otpEmail = email;
      if (forReset) await WB.sendResetCode(email);
      else await WB.sendOtp(email);
      otpSent = true;
      startOtpCooldown();
      renderBody(); // 重绘会把状态栏重置成「未登录」，所以提示必须写在它之后
      setStatus('验证码已发送至 ' + email + '，5 分钟内有效，记得看一眼垃圾箱。', 'ok');
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); syncOtpSendBtn(); }
  }

  // 日常登录：邮箱 + 密码
  async function doWbSignIn() {
    var email = ui && ui.email ? ui.email.value.trim() : '';
    var pw = ui && ui.pw ? ui.pw.value : '';
    if (!email) { setError('请填写邮箱。'); return; }
    if (!pw) { setError('请填写密码。'); return; }
    try {
      setBusy(true); setError('');
      otpEmail = email; // 登录失败会被重绘，留着邮箱免得用户重填
      await WB.signInPassword(email, pw);
      setStatus('登录成功，正在打开你的学习档案…', 'ok');
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }

  // 注册：验证码证明邮箱是你的 + 自设密码
  async function doWbRegister() {
    var email = ui && ui.email ? ui.email.value.trim() : '';
    var code = ui && ui.otpCode ? ui.otpCode.value.trim() : '';
    var pw = ui && ui.pw ? ui.pw.value : '';
    if (!email) { setError('请填写邮箱。'); return; }
    if (!code) { setError('请填写邮箱收到的 6 位验证码。'); return; }
    if (!pw) { setError('请设置密码（至少 8 位）。'); return; }
    if (String(pw).length < 8) { setError('密码至少 8 位，可以用几个单词拼起来。'); return; }
    try {
      setBusy(true); setError('');
      otpEmail = email;
      await WB.registerWithPassword(email, code, pw);
      setStatus('账号已创建，正在打开你的学习档案…', 'ok');
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }

  // 忘记密码：发码 → 码 + 新密码 → 重设并登录
  async function doWbReset() {
    var email = ui && ui.email ? ui.email.value.trim() : '';
    var code = ui && ui.otpCode ? ui.otpCode.value.trim() : '';
    var pw = ui && ui.pw ? ui.pw.value : '';
    if (!email) { setError('请填写邮箱。'); return; }
    if (!code) { setError('请填写邮箱收到的 6 位验证码。'); return; }
    if (!pw) { setError('请设置新密码（至少 8 位）。'); return; }
    if (String(pw).length < 8) { setError('密码至少 8 位，可以用几个单词拼起来。'); return; }
    try {
      setBusy(true); setError('');
      otpEmail = email;
      await WB.resetPassword(email, code, pw);
      setStatus('密码已重设，正在打开你的学习档案…', 'ok');
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }

  // 老账号：只用验证码登录
  async function doVerifyOtp() {
    var email = ui && ui.email ? ui.email.value.trim() : otpEmail;
    var code = ui && ui.otpCode ? ui.otpCode.value.trim() : '';
    if (!email) { setError('请填写邮箱。'); return; }
    if (!code) { setError('请填写收到的邮箱验证码。'); return; }
    if (!WB || !WB.available()) { setError('登录模块未加载，请刷新页面重试。'); return; }
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
    if (emailMode === 'register' && String(pw).length < 6) { setError('密码至少 6 位。'); return; }
    try {
      setBusy(true); setError('');
      if (emailMode === 'register') await FB.signUpEmail(email, pw);
      else if (emailMode === 'reset') {
        await FB.sendReset(email);
        setStatus('重置密码邮件已发送，请查收 ' + email, 'ok');
        return;
      } else await FB.signInEmail(email, pw);
      if (emailMode !== 'reset') setStatus(emailMode === 'register' ? '账号已创建，正在打开你的学习档案…' : '登录成功，正在打开你的学习档案…', 'ok');
    } catch (e) {
      var msg = friendlyError(e);
      if (emailMode === 'login' && (e && (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password'))) {
        msg = '邮箱或密码不正确。如果这个邮箱之前是用 Google / Apple 登录的，请改用同一种方式；也可以点「忘记密码？」重设密码。';
      } else if (emailMode === 'register' && e && e.code === 'auth/email-already-in-use') {
        msg = '这个邮箱已经有账号了：请返回登录；如果忘了密码，点「忘记密码？」重置。';
      }
      setError(msg);
    }
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
    var clean = String(name == null ? '' : name).trim().slice(0, 24);
    if (!clean) { setError('昵称不能为空。'); return; }
    var A = auth();
    if (!user || !A) { setError('请先登录。'); return; }
    try {
      setBusy(true); setError('');
      var saved = await A.updateNickname(clean);
      nickname = saved;
      try { user.displayName = saved; } catch (e) { console.warn('写入昵称未生效', e); }
      setStatus('昵称已保存', 'ok');
      renderBody();
    } catch (e) {
      setError('昵称未能保存：' + friendlyError(e));
    } finally { setBusy(false); }
  }
  async function doSignOut() {
    setBusy(true);
    try { await silentPush(); } catch (e) { /* 离线时下次登录会补 */ }
    try { await auth().signOut(); } catch (e) { /* ignore */ }
    user = null; nickname = '';
    // owner 保持原 uid：本机副本仍属于该账号，登录别的账号时才会切档。
    emailMode = 'login';  // 登出后一律回到登录表单，不停在注册/重置页
    supaMaintainOpen = false; // 维护折叠块收回，别把展开态留给下一个人
    setStatus('已退出登录 · 进度仍保留在这台设备', 'plain');
    setError(''); setBusy(false); renderBody();
  }
  function onState(u, provider) {
    // 通道互斥：各 SDK 初始化都会广播空态，不能让它覆盖已生效的其他通道会话。
    if (GH && GH.active && GH.active() && (!u || String(u.uid || '').indexOf('gh:') !== 0)) return;
    if (WB && WB.active && WB.active() && provider !== 'workbuddy' && (!u || String(u.uid || '').indexOf('wb:') !== 0)) return;
    if (FB && FB.active && FB.active() && provider === 'workbuddy' && !u) return;
    var was = user;
    user = u || null;
    if (user) {
      if (ui) ui.btn.setAttribute('data-on', '1');
      if (!was || was.uid !== user.uid) afterSignIn();
      else renderBody();
    } else {
      nickname = '';
      if (ui) ui.btn.setAttribute('data-on', '0');
      if (was) setStatus('已退出登录 · 进度仍保留在这台设备', 'plain');
      renderBody();
    }
  }
