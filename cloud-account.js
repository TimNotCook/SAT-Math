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
  // 默认走「邮箱 + 密码」登录（国内直连、服务端校验密码）；
  // otp = 只用验证码登录（老账号/不想设密码时用）。
  var emailMode = 'login'; // 'login' | 'register' | 'reset' | 'otp'
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
    // 全站大量尺寸用 px 写死，改 html font-size 无效；用 body zoom 才能真正放大/缩小。
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
  // 归一化：只保留参与同步的 tdsat_* 键，且按键排序，保证本机与档案的指纹可比。
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
  // 界面上的名称：只用昵称，绝不回退到邮箱 / 手机号。
  function displayName() { return nickname || DEFAULT_NICK; }

  // 设置齿轮图标（内联 SVG，无需外部图标字体）
  function setBtnIcon(btn) {
    if (!btn) return;
    // Bluebook 顶栏风格：细线描边图标 + 文字标签（同 Reference / 退出）。
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
    // 国内通道（腾讯云开发）的错误码
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

  // 用档案内容整体替换本机副本；本机外观偏好保持不变。
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

  /* 对象级深合并：键取并集；带数字时间戳 ts 的叶子（答题记录 {v,correct,ts}、
     最近题 {mode,ids,ts}、进度标记 {sec,qid,ts} 等）按"最后写入者赢"取较新的
     那份，绝不因"本机优先"而让旧答案覆盖新答案；数组取并集去重，不再整段丢弃
     云端；其余无时间戳的轻量 UI 状态（cursor / completed / marks 等，不涉及判分）
     冲突时仍以本机为准。仅用于"首次登录、本机进度无归属"的场景。 */
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
    // 版本化叶子：两边都带数字 ts → 较新的那份胜出（最后写入者赢）。
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
  /* 首次登录一个已有档案的账号时，把本机"无主"做题记录并入该档案，
     保证一条都不丢；冲突以本机为准。切换账号（owner 是别的 uid）不走这里。 */
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
  // 云同步通知总线：各写入点在 localStorage.setItem 后显式调用 window.TDSync.notify(key)。
  // 替代旧方案（改写 Storage.prototype 全局劫持所有本地写入）——不再有全局 API 劫持。
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

  /* ---------- UI ---------- */
  function buildUI() {
    var css = document.createElement('style');
    css.textContent = [
      '.td-acct-btn{margin-left:2px;flex:none}',
      /* 幽灵图标按钮：无边框、无底色，颜色跟导航文字一致；hover 才淡背景。
         用 !important 覆盖 bluebook.css 里旧的描边按钮样式。 */
      '.td-acct-icon-btn,.appbar-inner .td-acct-icon-btn,.appbar .td-acct-icon-btn{',
      'display:inline-flex!important;align-items:center;gap:6px;justify-content:center;',
      'width:auto!important;height:auto!important;padding:6px 9px;border:0!important;border-radius:6px;',
      'background:transparent!important;color:#51648a!important;',
      'font:inherit!important;font-size:13px!important;font-weight:500!important;',
      'box-shadow:none!important;cursor:pointer;flex:0 0 auto;line-height:1.2;white-space:nowrap}',
      '.td-acct-icon-btn svg{display:block;width:16px;height:16px;stroke-width:1.6}',
      '.td-acct-icon-btn:hover,.appbar-inner .td-acct-icon-btn:hover{',
      'color:var(--navy,#12233f)!important;background:var(--wash,#eef4fd)!important}',
      '.td-acct-icon-btn[data-on="1"],.appbar-inner .td-acct-icon-btn[data-on="1"]{',
      'color:#51648a!important;background:transparent!important}',
      '.td-acct-layer{position:fixed;inset:0;z-index:9000;display:none;align-items:center;justify-content:center;',
      'background:var(--veil,rgba(18,35,63,.45));padding:20px}',
      '.td-acct-layer[data-open="1"]{display:flex}',
      '.td-acct-panel{width:min(430px,100%);max-height:88vh;overflow:auto;background:var(--paper,#fff);',
      'border:1px solid var(--line,#d2e0f1);border-radius:12px;box-shadow:var(--shadow-3,0 16px 40px rgba(18,35,63,.18));',
      'padding:22px;color:var(--ink,#12233f);font-size:14px}',
      '.td-set-tabs{display:flex;gap:2px;border-bottom:1px solid var(--line,#d2e0f1);margin-bottom:16px}',
      '.td-set-tab{flex:1;font:inherit;font-size:13px;font-weight:600;padding:9px 4px;cursor:pointer;',
      'border:0;border-bottom:2px solid transparent;background:transparent;color:var(--sub,#51648a)}',
      '.td-set-tab:hover{color:var(--blue,#2563eb)}',
      '.td-set-tab[data-active="1"]{color:var(--blue,#2563eb);border-bottom-color:var(--blue,#2563eb)}',
      '.td-set-row{display:flex;align-items:center;justify-content:space-between;gap:12px;',
      'padding:11px 0;border-bottom:1px solid var(--line-soft,#eef3fb)}',
      '.td-set-row:last-child{border-bottom:0}',
      '.td-set-label{font-size:13.5px;font-weight:600;color:var(--ink,#12233f)}',
      '.td-set-desc{font-size:12px;color:var(--sub,#51648a);margin-top:2px;line-height:1.5}',
      '.td-set-seg{display:flex;gap:0;border:1px solid var(--line,#d2e0f1);border-radius:6px;overflow:hidden;flex:none}',
      '.td-set-seg button{font:inherit;font-size:12px;font-weight:600;padding:6px 11px;cursor:pointer;',
      'border:0;background:transparent;color:var(--sub,#51648a)}',
      '.td-set-seg button[data-active="1"]{background:var(--blue,#2563eb);color:#fff}',
      '.td-set-switch{position:relative;width:40px;height:22px;border-radius:11px;flex:none;',
      'border:0;background:var(--line-strong,#bcd0e8);cursor:pointer;transition:background .15s}',
      '.td-set-switch[data-on="1"]{background:var(--blue,#2563eb)}',
      '.td-set-switch::after{content:"";position:absolute;top:2px;left:2px;width:18px;height:18px;',
      'border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);transition:transform .15s}',
      '.td-set-switch[data-on="1"]::after{transform:translateX(18px)}',
      '.td-acct-head{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px}',
      '.td-acct-head h2{font-size:17px;margin:0;flex:1;line-height:1.35}',
      '.td-acct-x{border:0;background:transparent;font-size:22px;line-height:1;cursor:pointer;color:var(--sub,#51648a);padding:0 2px}',
      '.td-acct-status{font-size:12.5px;padding:8px 10px;border-radius:6px;background:var(--wash,#eef4fd);',
      'color:var(--sub,#51648a);margin-bottom:12px;line-height:1.5}',
      '.td-acct-status[data-kind="ok"]{background:var(--ok-soft,#e7f6ee);color:var(--ok,#157a52)}',
      '.td-acct-status[data-kind="warn"]{background:var(--warn-soft,#fbf3e2);color:var(--warn,#b07a12)}',
      '.td-acct-err{font-size:12.5px;padding:8px 10px;border-radius:6px;background:var(--bad-soft,#fdecea);',
      'color:var(--bad,#c0392b);margin-bottom:12px;line-height:1.5}',
      '.td-acct-field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}',
      '.td-acct-field label{font-size:12.5px;color:var(--sub,#51648a)}',
      '.td-acct-input{font:inherit;font-size:14px;padding:9px 11px;border:1px solid var(--line-strong,#bcd0e8);',
      'border-radius:6px;color:var(--ink,#12233f);background:var(--paper,#fff);width:100%;box-sizing:border-box}',
      '.td-acct-input:focus{outline:2px solid var(--blue-soft,#e8f0fe);border-color:var(--blue,#2563eb)}',
      '.td-acct-btn2{font:inherit;font-size:13px;font-weight:600;padding:9px 14px;border-radius:6px;cursor:pointer;',
      'border:1px solid var(--blue,#2563eb);background:var(--blue,#2563eb);color:#fff;white-space:nowrap}',
      '.td-acct-btn2[data-neutral="1"]{background:transparent;color:var(--ink,#12233f);border-color:var(--line-strong,#bcd0e8)}',
      '.td-acct-btn2:disabled{opacity:.55;cursor:default}',
      '.td-acct-btn--wide{width:100%;margin-bottom:10px}',
      '.td-otp-row{display:flex;gap:8px;align-items:flex-end;margin-bottom:10px}',
      '.td-otp-row .td-acct-field{flex:1;margin-bottom:0}',
      '.td-otp-send{white-space:nowrap;height:36px;padding:0 12px;font-size:13px}',
      '.td-acct-apple{background:#000;color:#fff;border-color:#000;font-weight:600}',
      '.td-acct-apple:hover{background:#1a1a1a}',
      '.td-acct-apple:disabled{opacity:.55}',
      '.td-acct-note{font-size:12px;color:var(--sub,#51648a);line-height:1.6;margin:14px 0 0}',
      '.td-acct-toggle{display:block;margin-top:10px;font-size:12.5px;color:var(--blue,#2563eb);',
      'background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;text-align:left}',
      '.td-gh-alt{margin-top:16px;padding-top:14px;border-top:1px solid var(--line-soft,#eef3fb)}',
      '.td-acct-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}',
      '.td-acct-who{font-size:13px;font-weight:600;margin-bottom:4px;word-break:break-all}',
      '.td-acct-or{display:flex;align-items:center;gap:10px;margin:14px 0;color:var(--sub,#51648a);font-size:12px}',
      '.td-acct-or::before,.td-acct-or::after{content:"";flex:1;height:1px;background:var(--line,#d2e0f1)}',
      /* 个人档案头部 + 昵称编辑 */
      '.td-prof{display:flex;align-items:center;gap:12px;padding:2px 0 14px;',
      'border-bottom:1px solid var(--line-soft,#eef3fb);margin-bottom:14px}',
      '.td-prof-av{width:42px;height:42px;border-radius:50%;flex:none;display:flex;',
      'align-items:center;justify-content:center;background:var(--blue-soft,#e8f0fe);',
      'color:var(--blue,#2563eb);font-size:17px;font-weight:700}',
      '.td-prof-name{font-size:16px;font-weight:700;color:var(--ink,#12233f);line-height:1.35;word-break:break-all}',
      '.td-prof-sub{font-size:12px;color:var(--sub,#51648a);margin-top:2px}',
      '.td-nick-row{display:flex;gap:8px;align-items:flex-end;margin-bottom:6px}',
      '.td-nick-row .td-acct-field{flex:1;min-width:0;margin-bottom:0}',
      '.td-nick-save{flex:none;height:38px}',
      /* 紧凑模式：收紧留白与行高，让一屏看到更多内容 */
      'html[data-compact="1"] .drill-select-inner,html[data-compact="1"] .drill-result-inner{',
      'max-width:none!important;padding-top:16px!important}',
      'html[data-compact="1"] .drill-select-h,html[data-compact="1"] .drill-result-h{font-size:26px!important}',
      'html[data-compact="1"] .drill-unit-button{padding:12px!important}',
      'html[data-compact="1"] .appbar-inner,html[data-compact="1"] .drill-context,',
      'html[data-compact="1"] .drill-questionbar-inner{min-height:48px!important}',
      '@media(max-width:640px){.td-acct-btn{font-size:12px;padding:5px 9px}}'
    ].join('');
    document.head.appendChild(css);

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
    // 标签栏：账户 / 外观 / 关于
    var tabs = el('div', 'td-set-tabs');
    var tabDefs = [['account', '账户'], ['appearance', '外观'], ['practice', '练习'], ['about', '关于']];
    tabDefs.forEach(function (pair) {
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
    panel.appendChild(status); panel.appendChild(err); panel.appendChild(body);
    layer.appendChild(panel);
    layer.addEventListener('click', function (e) { if (e.target === layer) layer.setAttribute('data-open', '0'); });
    document.body.appendChild(layer);

    var btn = el('button', 'td-acct-btn td-acct-icon-btn');
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
    lab.appendChild(input); f.appendChild(lab);
    return { box: f, input: input };
  }

  /* ---- 国内直连通道（WorkBuddy / 腾讯云开发）的表单积木 ---- */
  function setMode(m) { emailMode = m; setError(''); renderBody(); }

  function linkToggle(b, text, onclick) {
    var t = el('button', 'td-acct-toggle', text);
    t.type = 'button';
    t.onclick = function () { setError(''); onclick(); renderBody(); };
    b.appendChild(t);
    return t;
  }

  function emailWithSend(b, forReset) {
    var em = field('邮箱', 'email', 'you@example.com', 'email');
    if (otpEmail) em.input.value = otpEmail;
    ui.email = em.input;
    var row = el('div', 'td-otp-row');
    row.appendChild(em.box);
    var sendBtn = el('button', 'td-acct-btn2 td-otp-send',
      otpCooldown > 0 ? ('重新发送 (' + otpCooldown + 's)') : (otpSent ? '重新发送' : '获取验证码'));
    sendBtn.type = 'button';
    sendBtn.setAttribute('data-busy', '1');
    if (otpCooldown > 0) sendBtn.disabled = true;
    sendBtn.onclick = function () { doSendOtp(!!forReset); };
    ui.otpSendBtn = sendBtn;
    row.appendChild(sendBtn);
    b.appendChild(row);
    return em.input;
  }

  function codeInput(b, onEnter) {
    var cf = field('验证码', 'text', '输入邮箱收到的 6 位验证码', 'one-time-code');
    cf.input.inputMode = 'numeric';
    cf.input.maxLength = 6;
    b.appendChild(cf.box);
    ui.otpCode = cf.input;
    cf.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') onEnter(); });
    return cf.input;
  }

  function pwInput(b, label, placeholder, autocomplete, onEnter) {
    var pf = field(label, 'password', placeholder, autocomplete);
    b.appendChild(pf.box);
    ui.pw = pf.input;
    pf.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') onEnter(); });
    return pf.input;
  }

  function wideBtn(b, text, onclick) {
    var btn = el('button', 'td-acct-btn2 td-acct-btn--wide', text);
    btn.type = 'button';
    btn.setAttribute('data-busy', '1');
    btn.onclick = onclick;
    b.appendChild(btn);
    return btn;
  }

  // 登录：邮箱 + 密码（服务端校验）
  function renderWbLogin(b) {
    b.appendChild(el('div', 'td-acct-who', '登录（邮箱 + 密码）'));
    var em = field('邮箱', 'email', 'you@example.com', 'email');
    if (otpEmail) em.input.value = otpEmail;
    b.appendChild(em.box); ui.email = em.input;
    var pw = pwInput(b, '密码', '输入密码', 'current-password', doWbSignIn);
    em.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') pw.focus(); });
    wideBtn(b, '登录', doWbSignIn);
    linkToggle(b, '没有账号？注册（验证码 + 自设密码）', function () { emailMode = 'register'; });
    linkToggle(b, '忘记密码？', function () { emailMode = 'reset'; });
    linkToggle(b, '不想用密码？改用验证码登录', function () { emailMode = 'otp'; });
  }

  // 注册：验证码证明邮箱 + 自设密码
  function renderWbRegister(b) {
    b.appendChild(el('div', 'td-acct-who', '注册新账号（邮箱验证码 + 自设密码）'));
    emailWithSend(b, false);
    codeInput(b, doWbRegister);
    pwInput(b, '设置密码', '至少 8 位，之后登录用它', 'new-password', doWbRegister);
    wideBtn(b, '注册并登录', doWbRegister);
    linkToggle(b, '已有账号？返回登录', function () { emailMode = 'login'; });
    b.appendChild(el('p', 'td-acct-note',
      '先点「获取验证码」，邮件里的 6 位数字码证明这个邮箱是你的；填上码和你想要的密码，账号就建好了。'));
  }

  // 重设密码：发码 → 码 + 新密码
  function renderWbReset(b) {
    b.appendChild(el('div', 'td-acct-who', '重设密码'));
    emailWithSend(b, true);
    codeInput(b, doWbReset);
    pwInput(b, '新密码', '至少 8 位', 'new-password', doWbReset);
    wideBtn(b, '重设密码并登录', doWbReset);
    linkToggle(b, '返回登录', function () { emailMode = 'login'; });
    b.appendChild(el('p', 'td-acct-note',
      '先点「获取验证码」（发的是重设密码专用码），填上码和新密码即可。'));
  }

  // 老账号：只用验证码登录
  function renderWbOtp(b) {
    b.appendChild(el('div', 'td-acct-who', '邮箱验证码登录（不设密码）'));
    emailWithSend(b, false);
    codeInput(b, doVerifyOtp);
    wideBtn(b, '验证码登录', doVerifyOtp);
    linkToggle(b, '改用邮箱 + 密码登录', function () { emailMode = 'login'; });
    linkToggle(b, '没有账号？注册', function () { emailMode = 'register'; });
  }

  /* ---------- Supabase 通道（cloud-config 填了 supabase.url + anonKey 才出现） ---------- */
  var supaPending = null;   // 注册待验证：{ email, username }

  function renderSupaLogin(b) {
    b.appendChild(el('div', 'td-acct-who', '登录（用户名 + 密码）'));
    var un = field('用户名', 'text', '你的用户名', 'username');
    un.input.maxLength = 20;
    b.appendChild(un.box); ui.username = un.input;
    var pw = pwInput(b, '密码', '输入密码', 'current-password', doSupaSignIn);
    un.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') pw.focus(); });
    wideBtn(b, '登录', doSupaSignIn);
    linkToggle(b, '没有账号？用用户名注册', function () { emailMode = 'supaRegister'; renderBody(); });
    b.appendChild(el('p', 'td-acct-note', '账号只认用户名，不收邮箱'));
  }

  function renderSupaRegister(b) {
    b.appendChild(el('div', 'td-acct-who', '注册（用户名 + 密码）'));
    var un = field('用户名', 'text', '3–20 位小写字母/数字，可用 . _ -', 'username');
    un.input.maxLength = 20;
    b.appendChild(un.box); ui.username = un.input;
    var pw = pwInput(b, '设置密码', '至少 6 位，之后登录用它', 'new-password', doSupaRegister);
    wideBtn(b, '注册并登录', doSupaRegister);
    linkToggle(b, '已有账号？返回登录', function () { emailMode = 'login'; renderBody(); });
    b.appendChild(el('p', 'td-acct-note',
      '只记用户名，不收邮箱：内部用 用户名@satmath.local 作为占位邮箱，界面上不会出现。'));
  }

  function renderSupaVerify(b) {
    b.appendChild(el('div', 'td-acct-who', '不需要邮箱验证'));
    b.appendChild(el('p', 'td-acct-note', '现在注册即登录，没有验证码这一步。'));
    linkToggle(b, '返回登录', function () { emailMode = 'login'; renderBody(); });
  }

  function renderSupaReset(b) {
    b.appendChild(el('div', 'td-acct-who', '密码重置'));
    b.appendChild(el('p', 'td-acct-note',
      '账号不收邮箱，所以没有「邮件重置」，也不做安全问题。' +
      '忘了密码：联系管理员（后续可以加「登录态内改密码」）。'));
    linkToggle(b, '返回登录', function () { emailMode = 'login'; renderBody(); });
  }

  async function doSupaSignIn() {
    var un = ui && ui.username ? ui.username.value.trim() : '';
    var pw = ui && ui.pw ? ui.pw.value : '';
    if (!un) { setError('请填写用户名。'); return; }
    if (!pw) { setError('请填写密码。'); return; }
    try {
      setBusy(true); setError('');
      await SB.signInEmail(un, pw);
      setStatus('登录成功，正在打开你的学习档案…', 'ok');
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }

  async function doSupaRegister() {
    var un = ui && ui.username ? ui.username.value.trim().toLowerCase() : '';
    var pw = ui && ui.pw ? ui.pw.value : '';
    if (!/^[a-z0-9][a-z0-9._-]{2,19}$/.test(un)) { setError('用户名要 3–20 位：小写字母/数字，可用 . _ -，首字符必须是字母或数字。'); return; }
    if (String(pw).length < 6) { setError('密码至少 6 位。'); return; }
    try {
      setBusy(true); setError('');
      await SB.register(un, pw);
      setStatus('账号已创建，正在打开你的学习档案…', 'ok');
    } catch (e) {
      var msg = friendlyError(e);
      if (e && e.status === 409) msg = '这个用户名已经被占用了，换一个。';
      setError(msg);
    } finally { setBusy(false); }
  }

  async function doSupaVerify() {
    setError('现在注册即登录，没有验证码这一步。');
  }

  async function doSupaReset() {
    setError('账号不收邮箱，没有邮件重置；改密码请联系管理员。');
  }

  async function doRenameUsername(input) {
    if (!SB || !SB.renameUsername) { setError('当前后端不支持改用户名。'); return; }
    var next = String(input && input.value || '').trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{2,19}$/.test(next)) {
      setError('用户名要 3–20 位：小写字母/数字，可用 . _ -，首字符必须是字母或数字。');
      return;
    }
    try {
      setBusy(true); setError('');
      var got = await SB.renameUsername(next);
      if (input) input.value = got;
      setStatus('用户名已改为 ' + got + '，旧名已失效。', 'ok');
      renderBody();
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }

  /* GitHub 令牌备用通道（Supabase / WorkBuddy 之外） */
  function renderAltLogin(b) {
    // 备用通道：登录连不上时，可用 GitHub 令牌把进度存进自己的私有仓库。
    var alt = el('div', 'td-gh-alt');
    var altToggle = el('button', 'td-acct-toggle', '其他登录方式（GitHub 令牌）');
    altToggle.type = 'button';
    var altBox = el('div');
    altBox.hidden = true;
    altToggle.onclick = function () { altBox.hidden = !altBox.hidden; };
    alt.appendChild(altToggle);
    alt.appendChild(altBox);
    var gt = field('GitHub 令牌', 'password', '粘贴 Personal Access Token', 'off');
    altBox.appendChild(gt.box);
    ui.ghToken = gt.input;
    var gl = el('button', 'td-acct-btn2 td-acct-btn--wide', '使用 GitHub 令牌登录');
    gl.type = 'button'; gl.setAttribute('data-busy', '1'); gl.onclick = doGhLogin;
    altBox.appendChild(gl);
    altBox.appendChild(el('p', 'td-acct-note',
      '进度存进你自己的私有仓库 sat-math-data（首次同步会自动创建）。' +
      '推荐用 Fine-grained 令牌、只勾选该仓库的 Contents 读写（github.com → Settings → Developer settings → Personal access tokens）。' +
      '令牌仅保存在本标签页会话内，关闭标签即失效；随时可在 GitHub 设置里吊销。'));
    b.appendChild(alt);
  }

  function renderAccountTab() {
    var b = ui.body;
    ui.email = null; ui.pw = null; ui.otpCode = null; ui.otpSendBtn = null;
    if (user) {
      var p = el('div', 'td-prof');
      var initial = (displayName().trim().charAt(0) || DEFAULT_NICK).toUpperCase();
      p.appendChild(el('div', 'td-prof-av', initial));
      var info = el('div');
      info.appendChild(el('div', 'td-prof-name', displayName()));
      info.appendChild(el('div', 'td-prof-sub', '你的专属学习档案'));
      p.appendChild(info);
      b.appendChild(p);

      var f = field('昵称', 'text', '给自己起个名字', 'off');
      f.input.value = displayName();
      f.input.maxLength = 24;
      var rowBox = el('div', 'td-nick-row');
      rowBox.appendChild(f.box);
      var save = el('button', 'td-acct-btn2 td-nick-save', '保存');
      save.type = 'button'; save.setAttribute('data-busy', '1');
      save.onclick = function () { saveNickname(f.input.value); };
      f.input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') saveNickname(f.input.value);
      });
      rowBox.appendChild(save);
      b.appendChild(rowBox);
      b.appendChild(el('p', 'td-acct-note', '昵称只用于显示，不参与登录。'));
      ui.nameInput = f.input;

      var unF = field('用户名（登录用）', 'text', '3–20 位小写字母/数字，可用 . _ -', 'username');
      unF.input.value = (user && user.username) || '';
      unF.input.maxLength = 20;
      var unRow = el('div', 'td-nick-row');
      unRow.appendChild(unF.box);
      var unSave = el('button', 'td-acct-btn2 td-nick-save', '改用户名');
      unSave.type = 'button'; unSave.setAttribute('data-busy', '1');
      unSave.onclick = function () { doRenameUsername(unF.input); };
      unF.input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') doRenameUsername(unF.input);
      });
      unRow.appendChild(unSave);
      b.appendChild(unRow);
      b.appendChild(el('p', 'td-acct-note',
        '改完旧用户名立刻失效、新用户名立刻可登录，之前用它登录过的记录仍然认你这个账号。'));

      var acts = el('div', 'td-acct-actions');
      var out = el('button', 'td-acct-btn2', '退出登录');
      out.type = 'button'; out.setAttribute('data-neutral', '1'); out.setAttribute('data-busy', '1');
      out.onclick = doSignOut;
      acts.appendChild(out); b.appendChild(acts);
      b.appendChild(el('p', 'td-acct-note',
        '做题进度会自动保存，换设备或重新登录后接着练，不需要任何手动操作。'));
      return;
    }

    var hasSB = !!(SB && SB.available && SB.available());
    if (hasSB) {
      if (emailMode === 'supaRegister') renderSupaRegister(b);
      else if (emailMode === 'supaVerify') renderSupaVerify(b);
      else if (emailMode === 'supaReset') renderSupaReset(b);
      else renderSupaLogin(b);
      b.appendChild(el('p', 'td-acct-note',
        '登录后会自动为你建立独立的学习档案，之前做过的题会一并带上；换设备登录也能接着练。不登录同样可以使用全部功能。'));
      renderAltLogin(b);
      return;
    }

    var hasWB = !!(WB && WB.available());
    var hasFB = !!(FB && FB.available());
    if (!hasWB && !hasFB) {
      setStatus('登录暂时不可用', 'warn');
      b.appendChild(el('p', 'td-acct-note', '账号模块未能加载，做题与进度照常保存，不受影响。'));
      return;
    }

    if (hasWB) {
      if (emailMode === 'register') renderWbRegister(b);
      else if (emailMode === 'reset') renderWbReset(b);
      else if (emailMode === 'otp') renderWbOtp(b);
      else renderWbLogin(b);
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

    if (hasFB && !hasWB) {
      b.appendChild(el('div', 'td-acct-or', '或使用第三方账号（需境外网络）'));
      var g = el('button', 'td-acct-btn2 td-acct-btn--wide', '使用 Google 账号继续');
      g.type = 'button'; g.setAttribute('data-neutral', '1'); g.setAttribute('data-busy', '1');
      g.onclick = doGoogle;
      b.appendChild(g);

      var a = el('button', 'td-acct-btn2 td-acct-btn--wide td-acct-apple', ' 使用 Apple 账号继续');
      a.type = 'button'; a.setAttribute('data-busy', '1');
      a.onclick = doApple;
      b.appendChild(a);
    }

    b.appendChild(el('p', 'td-acct-note',
      '登录后会自动为你建立独立的学习档案，之前做过的题会一并带上；换设备登录也能接着练。不登录同样可以使用全部功能。'));

    renderAltLogin(b);
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
    // 主题（从右下角浮动球收进设置）：读写 theme.js 暴露的单一数据源
    var r0 = row('主题', '淡奶白或暗黑，立即生效并保存。');
    var seg0 = el('div', 'td-set-seg');
    var getTheme = (window.TDGetTheme || function(){ return 'light'; });
    var curT = getTheme();
    [['light','浅色'],['dark','暗黑']].forEach(function(pair){
      var btn = el('button','',pair[1]);
      btn.type='button';
      if (curT===pair[0]) btn.setAttribute('data-active','1');
      btn.onclick=function(){
        if (window.TDSetTheme) window.TDSetTheme(pair[0]);
        else { try{localStorage.setItem('tdsat_theme',pair[0])}catch(e){console.warn('保存主题失败',e)} document.documentElement.setAttribute('data-theme',pair[0]); try{onLocalWrite('tdsat_theme')}catch(e){console.warn('同步主题未生效',e)} }
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

  function renderPracticeTab() {
    var b = ui.body;
    var r0 = row('单元练习计算器', '打开后，单元练习答题页也会显示计算器按钮；关闭则只有专项训练、单元抽查与模考可用。');
    var sw = el('button', 'td-set-switch');
    sw.type = 'button';
    sw.setAttribute('data-on', prefs.calcUnit ? '1' : '0');
    sw.setAttribute('aria-label', '单元练习计算器');
    sw.onclick = function () {
      prefs.calcUnit = !prefs.calcUnit;
      savePrefs();
      try { window.dispatchEvent(new CustomEvent('td:prefs')); } catch (e) { console.warn('通知计算器设置失败', e); }
      renderBody();
    };
    r0.appendChild(sw); b.appendChild(r0);
    b.appendChild(el('p', 'td-acct-note', '只有单元练习受这个开关控制：专项训练、单元抽查与模考始终显示计算器。设置保存在这台设备。'));
  }

  function renderAboutTab() {
    var b = ui.body;
    b.appendChild(el('div', 'td-acct-who', 'SAT Math'));
    var bank = (window.TD_BANK && window.TD_BANK.questions) ? window.TD_BANK.questions.length : 0;
    b.appendChild(el('p', 'td-acct-note',
      '真题练习 · 单元抽查 · 错题回顾 · 模考\n题库 ' + bank + ' 题。'));
    b.appendChild(el('p', 'td-acct-note',
      '登录后每位用户都有独立的学习档案，进度自动保存、自动跟随。\n登录完全自愿，不登录也能使用全部功能。'));
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
      if (!user) setStatus('未登录 · 进度保存在这台设备', 'plain');
      renderAccountTab();
    } else if (activeTab === 'appearance') {
      setStatus('外观偏好自动保存在这台设备', 'plain');
      renderAppearanceTab();
    } else if (activeTab === 'practice') {
      setStatus('练习偏好自动保存在这台设备', 'plain');
      renderPracticeTab();
    } else if (activeTab === 'about') {
      setStatus('关于', 'plain');
      renderAboutTab();
    }
  }

  function mountButton(btn) {
    function attach() {
      // 顶部导航栏由 app-ui.js 渲染进 #appnav（内含 .appbar-inner）。
      // 注意：.drill-nav-header 是题号弹层的 header（默认 hidden），不能挂这里。
      var bar = document.querySelector('#appnav .mainnav') ||
                document.querySelector('.mainnav') ||
                document.querySelector('#appnav .appbar-inner') ||
                document.querySelector('.appbar-inner') ||
                document.querySelector('#appnav') ||
                document.querySelector('.appbar');
      if (bar && !btn.isConnected) { bar.appendChild(btn); return true; }
      return btn.isConnected;
    }
    if (attach()) return;
    var obs = new MutationObserver(function () { if (attach()) obs.disconnect(); });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () {
      obs.disconnect();
      if (!btn.isConnected) {
        btn.style.position = 'fixed'; btn.style.right = '14px'; btn.style.bottom = '14px';
        btn.style.zIndex = '8999'; btn.style.background = 'var(--paper,#fff)';
        btn.style.boxShadow = 'var(--shadow-2,0 2px 10px rgba(18,35,63,.12))';
        document.body.appendChild(btn);
      }
    }, 6000);
  }

  function startAutoSave() {
    setInterval(async function () {
      if (!user || !auth() || saving || busy) return;
      if (localHash() === prof.lastSynced) return;
      var ok = await silentPush();
      if (ok) setStatus('进度已自动保存', 'ok');
    }, 10000);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'hidden' || !user || !auth() || saving) return;
      if (localHash() === prof.lastSynced) return;
      silentPush();
    });
    window.addEventListener('pagehide', function () {
      if (!user || !auth() || saving) return;
      if (localHash() === prof.lastSynced) return;
      silentPush();
    });
  }

  function boot() {
    loadProf();
    exposeNotify();
    var btn = buildUI();
    mountButton(btn);
    renderBody();
    if (FB && typeof FB.onState === 'function') FB.onState(function (u) { onState(u, 'firebase'); });
    if (WB && typeof WB.onState === 'function') WB.onState(function (u) { onState(u, 'workbuddy'); });
    if (GH && typeof GH.onState === 'function') GH.onState(function (u) { onState(u, 'github'); });
    startAutoSave();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
