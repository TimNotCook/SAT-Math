/* TD SAT Math — 独立账号系统（Supabase 邮箱登录，唯一通道）。
 *
 * 登录后每个账号拥有完全独立的学习档案：进度自动保存、切换账号自动切换档案，
 * 用户无需理解"云端 / 备份 / 恢复 / 同步"，也不需要点任何保存按钮。
 * 昵称由用户在设置里自定义，界面上不展示邮箱。
 *
 * 当前过渡形态：邮件链接登录。填邮箱 → 点「发送登录邮件」→ 收信 → 点邮件里的
 * 登录按钮 → 回站自动登录；首次登录自动建档。不设口令、不用账号名、不接第三方令牌。
 * [BLOCKED-BY-EXTERNAL] 6 位数字验证码版本待自定义 SMTP + 邮件模板加 {{ .Token }} 后切回，
 * 前端验码接口保留在 supa-cloud.js，面板不接这条路径。
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

  var SB = window.TDSUPA || null;   // Supabase 通道：cloud-config 里填了 url + anonKey 才存在
  // 数据通道优先级：只有 Supabase 一条。
  function auth() {
    if (SB && SB.available && SB.available()) return SB;
    return null;
  }
  var SNAP_PREFIX = 'tdsat_';
  // 不同步到云端的本机键：外观偏好，以及登录会话（access/refresh token 绝不能进档案，
  // 否则既泄露到云端，又会在 applyPayload 清空 tdsat_* 时把刚登录的会话一起删掉 → 刷新退登录）。
  var NO_SYNC = { 'tdsat_prefs_v1': 1, 'tdsat_auth_v1': 1 };
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
  var otpSent = false;
  var otpEmail = '';
  var pwdEmail = '';
  var loginMode = 'password';   // password | link
  var pwdBusy = false;
  var otpCooldown = 0;
  var otpCountdownTimer = null;
  var activeTab = 'account'; // account | appearance | practice | about

  /* ---------- preferences（外观，只存这台设备） ---------- */
  var PREFS_KEY = 'tdsat_prefs_v1';
  var prefs = { fontScale: 'normal', compact: false, calcUnit: false };
  /* 偏好也可能是字符串 'false'：!! 会把它当开启，紧凑布局/计算器单位被误开。 */
  function flagKey(v) { return typeof v === 'string' ? v.trim().toLowerCase() : v; }
  function isTrueFlag(v) { v = flagKey(v); return v === true || v === 1 || v === 'true' || v === '1'; }
  function loadPrefs() {
    try {
      var raw = localStorage.getItem(PREFS_KEY);
      if (raw) { var p = JSON.parse(raw); if (p && typeof p === 'object') {
        prefs.fontScale = p.fontScale || 'normal';
        prefs.calcUnit = isTrueFlag(p.calcUnit);
        prefs.compact = isTrueFlag(p.compact);
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
  // 界面上的名称：只用昵称，绝不回退到邮箱。
  function displayName() { return nickname || DEFAULT_NICK; }

  // 设置齿轮图标（内联 SVG，无需外部图标字体）
  function setBtnIcon(btn) {
    if (!btn) return;
    /* 模考五屏一律英文（docs/UI-COPY.md v1.2）：入口跟 Bluebook 一样叫 Settings。
       is-mock 由 exam.html 内联脚本打在 body 上；cloud-account 是 defer，读得到。 */
    var isMock = !!(document.body && document.body.classList.contains('is-mock'));
    var label = isMock ? 'Settings' : '设置';
    // Bluebook 顶栏风格：细线描边图标 + 文字标签（同 Reference / 退出）。
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" ' +
      'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true"><circle cx="12" cy="12" r="3"></circle>' +
      '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg><span>' + label + '</span>';
    btn.setAttribute('aria-label', label); btn.title = label;
  }
  function friendlyError(e) {
    var c = e && e.code, m = e && e.message;
    if (c === 'auth/invalid-email') return '邮箱格式不正确，请检查后再试。';
    if (c === 'auth/invalid-credential') return '邮箱或密码不对。第一次用这个邮箱请点「注册新账号」。';
    if (c === 'auth/email-already-in-use') return '这个邮箱已经注册过了，直接点「登录」。';
    if (c === 'auth/invalid-code' || c === 'auth/email-not-confirm') return '登录链接已失效或邮件有误，请重新发送登录邮件。';
    if (c === 'auth/too-many-requests') return '操作太频繁了，等一分钟再试。';
    if (c === 'auth/network-request-failed') return '网络异常，请检查连接后重试。';
    if (c === 'auth/internal-error') return '登录服务返回异常，请刷新页面后重试。';
    var lm = String(m || '').toLowerCase();
    if (lm.indexOf('does not match') >= 0 || lm.indexOf('verification code') >= 0 || lm.indexOf('token') >= 0 || lm.indexOf('expired') >= 0) {
      return '登录链接已失效或邮件有误，请重新发送登录邮件。';
    }
    if (lm.indexOf('failed to fetch') >= 0 || lm.indexOf('request failed') >= 0) return '登录服务暂时连不上，请检查网络后重试。';
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
  /* 档案载荷必须是普通对象：云端/本地草稿被写成数组或字符串时，
     canon() 会筛出 0 个快照键，但下面已经先把本机 tdsat_* 全删了——
     结果“恢复成功”地清空整份进度。坏载荷一律拒绝，连一个键都不动。 */
  function isPlainPayload(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function applyPayload(payload) {
    if (!isPlainPayload(payload)) return false;
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
    return true;
  }

  /* 对象级深合并：键取并集；带数字时间戳 ts 的叶子（答题记录 {v,correct,ts}、
     最近题 {mode,ids,ts}、进度标记 {sec,qid,ts} 等）按"最后写入者赢"取较新的
     那份，绝不因"本机优先"而让旧答案覆盖新答案；数组取并集去重，不再整段丢弃
     云端；其余无时间戳的轻量 UI 状态（cursor / completed / marks 等，不涉及判分）
     冲突时仍以本机为准。仅用于"首次登录、本机进度无归属"的场景。 */
  function isPlainObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  /* 时间戳可能是原生数字，也可能是旧版/手工导入写的数字字符串（'1700…'）。
     以前只认 typeof === 'number'：字符串 ts 的旧答案会在深合并里靠「本机优先」
     赢过云端更新的答案，记录数组也会因签名不同叠出重复条目。 */
  function stampNum(v) {
    if (v == null || v === '' || typeof v === 'boolean' || typeof v === 'object') return null;
    var n = Number(v);
    return isFinite(n) && n >= 0 ? n : null;
  }
  function itemSig(x) {
    if (isPlainObj(x)) {
      var d = stampNum(x.date); if (d != null) return 'd:' + d;
      var t = stampNum(x.ts); if (t != null) return 't:' + t;
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
    // 版本化叶子：两边都带可解析 ts → 较新的那份胜出（最后写入者赢）。
    if (isPlainObj(lo) && isPlainObj(co)) {
      var lt = stampNum(lo.ts), ct = stampNum(co.ts);
      if (lt != null && ct != null) return ct > lt ? co : lo;
    }
    if (Array.isArray(lo) || Array.isArray(co)) {
      if (Array.isArray(lo) && Array.isArray(co)) return mergeArrays(lo, co);
      /* 一边是数组、一边是对象：数组那侧按本项目所有状态容器的约定都是坏形状
         （sections / answers / marks 被旧版写成 []）。以前这里总返回数组，
         云端一个坏 [] 就能把本机整段 answers 顶掉；保留非数组那侧。 */
      return Array.isArray(lo) ? co : lo;
    }
    if (isPlainObj(lo) && isPlainObj(co)) {
      var out = {};
      Object.keys(Object.assign({}, lo, co)).forEach(function (k) {
        out[k] = deepMerge(lo[k], co[k]);
      });
      return out;
    }
    /* 一边是普通对象、另一边是标量/null：快照容器（sections/answers/marks）
       的标量那侧是坏形状，保留对象那侧。以前最后一句无条件 `return lo`：
       本机 tdsat_app_v1 被写成 "null"（合法 JSON、形状不对）时，会顶掉云端
       完好的整份进度，再被 silentPush 推上去，账号里唯一的好数据就没了。 */
    if (isPlainObj(co)) return co;
    if (isPlainObj(lo)) return lo;
    return lo;
  }
  /* 首次登录一个已有档案的账号时，把本机"无主"做题记录并入该档案，
     保证一条都不丢；冲突以本机为准。切换账号（owner 是别的 uid）不走这里。 */
  /* 「一锅端」键：整份对象是同一台设备上的同一次会话/同一个存档，
     逐字段深合并只会拼出半张卷子（paper 并集、answers 交错、stage 打架）。
     这类键按时间戳整份取新，绝不拼接。 */
  var ATOMIC_KEYS = { 'tdsat_exam_suite_session_v1': 'startedAt', 'tdsat_progress_save_v1': 'savedAt' };
  function pickAtomic(localRaw, cloudRaw, stampKey) {
    var lo = null, co = null;
    try { lo = JSON.parse(localRaw); } catch (e) {}
    try { co = JSON.parse(cloudRaw); } catch (e) {}
    if (!co || typeof co !== 'object') return localRaw;
    if (!lo || typeof lo !== 'object') return cloudRaw;
    var lt = Number(lo[stampKey]) || 0, ct = Number(co[stampKey]) || 0;
    return ct > lt ? cloudRaw : localRaw;   // 平手取本机，和深合并的本地优先一致
  }
  function mergeLocalWithCloud(cloudPayload) {
    var local = snapshot();
    var out = canon(cloudPayload);
    Object.keys(local).forEach(function (k) {
      if (!(k in out)) { out[k] = local[k]; return; }
      if (out[k] === local[k]) return;
      if (ATOMIC_KEYS[k]) { out[k] = pickAtomic(local[k], out[k], ATOMIC_KEYS[k]); return; }
      try {
        var lo = JSON.parse(local[k]), co = JSON.parse(out[k]);
        out[k] = JSON.stringify(deepMerge(lo, co));
      } catch (e) {
        /* 两边至少有一份不是合法 JSON：别让坏的那份覆盖好的那份。
           本机半截存档 + 云端完好时，以前的实现会把坏值写回 out[k]，
           接着被 silentPush 推上云，等于把账号里的好数据冲掉。 */
        var coOk = true;
        try { JSON.parse(out[k]); } catch (e2) { coOk = false; }
        out[k] = coOk ? out[k] : local[k];
      }
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
    if (draft && draft.uid === uid && isPlainPayload(draft.payload) && Object.keys(draft.payload).length) {
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

  /* ---------- 登录动作（邮件链接） ---------- */
  function sendBtnLabel() {
    if (otpCooldown > 0) return '重新发送 (' + otpCooldown + 's)';
    return otpSent ? '重新发送' : '发送登录邮件';
  }

  function startOtpCooldown() {
    otpCooldown = 60;
    if (otpCountdownTimer) { clearInterval(otpCountdownTimer); otpCountdownTimer = null; }
    otpCountdownTimer = setInterval(function () {
      otpCooldown -= 1;
      if (otpCooldown < 0) otpCooldown = 0;
      if (otpCooldown <= 0) { clearInterval(otpCountdownTimer); otpCountdownTimer = null; }
      if (ui && ui.otpSendBtn) {
        ui.otpSendBtn.disabled = busy || otpCooldown > 0;
        ui.otpSendBtn.textContent = sendBtnLabel();
      }
    }, 1000);
  }

  function syncOtpSendBtn() {
    if (!ui || !ui.otpSendBtn) return;
    ui.otpSendBtn.disabled = busy || otpCooldown > 0;
    ui.otpSendBtn.textContent = sendBtnLabel();
  }

  function readEmail() { return ui && ui.email ? ui.email.value.trim() : ''; }
  function readPw() { return ui && ui.pw ? ui.pw.value : ''; }

  async function doSetPassword(pw) {
    if (!pw || pw.length < 6) { setError('密码至少 6 位。'); return; }
    if (!SB || !SB.setPassword) { setError('登录模块未加载，请刷新页面重试。'); return; }
    try {
      setBusy(true); setError('');
      await SB.setPassword(pw);
      setStatus('密码已保存，下次可以用这个账号登录。', 'ok');
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); renderBody(); }
  }

  async function doSignInPwd() {
    var email = readEmail(), pw = readPw();
    if (!email) { setError('请先填写邮箱或手机号。'); return; }
    if (!pw) { setError('请输入密码。'); return; }
    if (!SB || !SB.available()) { setError('登录模块未加载，请刷新页面重试。'); return; }
    try {
      setBusy(true); setError('');
      pwdEmail = email;
      await SB.signInPassword(email, pw);
      setStatus('登录成功，正在读取你的学习档案…', 'ok');
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); renderBody(); }
  }

  async function doSignUpPwd() {
    var email = readEmail(), pw = readPw();
    if (!email) { setError('请先填写邮箱或手机号。'); return; }
    if (pw.length < 6) { setError('密码至少 6 位。'); return; }
    if (!SB || !SB.available()) { setError('登录模块未加载，请刷新页面重试。'); return; }
    try {
      setBusy(true); setError('');
      pwdEmail = email;
      await SB.signUpPassword(email, pw);
      setStatus('账号已建立，正在读取你的学习档案…', 'ok');
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); renderBody(); }
  }

  async function doSendLink() {
    var email = ui && ui.email ? ui.email.value.trim() : '';
    if (!email) { setError('请先填写邮箱。'); return; }
    if (!SB || !SB.available()) { setError('登录模块未加载，请刷新页面重试。'); return; }
    try {
      setBusy(true); setError('');
      otpEmail = email;
      await (SB.sendMagicLink || SB.sendOtp)(email);
      otpSent = true;
      startOtpCooldown();
      renderBody(); // 重绘会把状态栏重置成「未登录」，所以提示必须写在它之后
      setStatus('已发送到 ' + email + '，点邮件里的登录按钮即可完成登录。链接只能用一次，请尽快点击（也可以在垃圾箱里找一下）。', 'ok');
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); syncOtpSendBtn(); }
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
    otpSent = false;
    setStatus('已退出登录 · 进度仍保留在这台设备', 'plain');
    setError(''); setBusy(false); renderBody();
  }
  function onState(u) {
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
      /* 已登录时别把侧栏「设置」整块刷成实心蓝：glass/bluebook 对 [data-on="1"] 写了蓝底，
         特异性比这里高，必须用四段选择器压回去，保持和未登录时一样的安静样式。 */
      'html:not([data-theme="dark"]) .site-rail .td-acct-btn.rail-settings[data-on="1"]{',
      'background:rgba(255,255,255,.5)!important;color:var(--navy,#0f2744)!important}',
      'html:not([data-theme="dark"]) .site-rail .td-acct-btn.rail-settings[data-on="1"]:hover{',
      'background:#f3f7fc!important;color:#1d4ed8!important}',
      '.drill-context-right .td-acct-btn.ctx-settings[data-on="1"]{background:transparent!important;color:#51648a!important}',
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
      '.td-set-seg button[data-active="1"]{background:var(--blue,#2563eb);color:var(--paper,#fff)}',
      '.td-set-switch{position:relative;width:40px;height:22px;border-radius:11px;flex:none;',
      'border:0;background:var(--line-strong,#bcd0e8);cursor:pointer;transition:background .15s}',
      '.td-set-switch[data-on="1"]{background:var(--blue,#2563eb)}',
      '.td-set-switch::after{content:"";position:absolute;top:2px;left:2px;width:18px;height:18px;',
      'border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);transition:transform .15s}',
      '.td-set-switch[data-on="1"]::after{transform:translateX(18px)}',
      '[data-theme="dark"] .td-set-switch[data-on="1"]::after{background:#1c1c1e}',
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
      '.td-acct-actions--stack{flex-direction:column;gap:8px}',
      '.td-acct-primary{background:var(--blue,#2563eb)!important;border-color:var(--blue,#2563eb)!important;color:#fff!important}',
      '.td-acct-primary:hover{background:#1d4ed8!important;border-color:#1d4ed8!important}',
      '.td-acct-primary:disabled{opacity:.55!important}',
      '.td-acct-linkbtn{display:block;margin:10px 0 0;padding:0;border:0;background:transparent;color:#2563eb;font:inherit;font-size:12.5px;font-weight:600;text-align:left;cursor:pointer}',
      '.td-acct-linkbtn:hover{text-decoration:underline}',
      '.td-otp-row{display:flex;gap:8px;align-items:flex-end;margin-bottom:10px}',
      '.td-otp-row .td-acct-field{flex:1;margin-bottom:0}',
      '.td-otp-send{white-space:nowrap;height:36px;padding:0 12px;font-size:13px}',
      '.td-nick-row+.td-acct-note{margin-top:8px}',
      '.td-acct-note+.td-nick-row{margin-top:14px}',
      '.td-acct-note{font-size:12px;color:var(--sub,#51648a);line-height:1.6;margin:14px 0 0}',
      '.td-acct-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}',
      '.td-acct-who{font-size:13px;font-weight:600;margin-bottom:4px;word-break:break-all}',
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
      /* 侧栏版设置入口：与「← 返回真题练习」收进同一个 .rail-tail 组（DOM 锚点在
         分隔线之后；有返回链接则链接在前、按钮紧跟其后）。宽屏不再被 margin:auto
         顶到侧栏底，窄屏不再 margin-left:auto 单独飞到横条最右；视觉沿用导航项同款。 */
      '.rail-tail{display:flex;flex-direction:column;gap:4px;margin-top:6px}',
      '.site-rail .td-acct-btn.rail-settings{margin:0;width:100%;justify-content:flex-start;gap:8px;',
      'padding:10px 12px!important;border-radius:9px!important;color:var(--navy,#0f2744)!important;',
      'font-size:14px!important;font-weight:600!important;text-align:left}',
      '.site-rail .td-acct-btn.rail-settings:hover{background:#f3f7fc!important;color:#1d4ed8!important}',
      '@media(max-width:999px){',
      /* 横条模式：整组（链接 + 按钮）靠右，按钮紧挨链接右侧；组内不换行、不分裂。
         无返回链接的页面（drill 列表）按钮保持常规流，不单独甩到行尾。 */
      '.rail-tail{flex-direction:row;align-items:center;gap:8px;margin-top:0}',
      '.rail-tail:has(.rail-back){margin-left:auto}',
      '.site-rail .td-acct-btn.rail-settings{margin:0;width:auto;',
      'padding:8px 10px!important;font-size:13px!important}}',
      /* 做题视图顶栏版：跟 Reference / 退出 同一排的幽灵按钮 */
      '.drill-context-right .td-acct-btn.ctx-settings{padding:6px 8px!important;margin:0 2px 0 0!important}',
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
    var tabDefs = [['account', '账户'], ['appearance', '外观'], ['language', '语言'], ['practice', '练习'], ['about', '关于']];
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


  function renderAccountTab() {
    var b = ui.body;
    ui.email = null; ui.otpSendBtn = null; ui.pw = null;
    if (user) {
      var p = el('div', 'td-prof');
      var initial = (displayName().trim().charAt(0) || DEFAULT_NICK).toUpperCase();
      p.appendChild(el('div', 'td-prof-av', initial));
      var info = el('div');
      info.appendChild(el('div', 'td-prof-name', displayName()));
      var acct = (SB && SB.maskAccount && user.email) ? SB.maskAccount(user.email) : '';
      info.appendChild(el('div', 'td-prof-sub', acct || '你的专属学习档案'));
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

      if (SB && SB.setPassword) {
        var pwField = field('登录密码', 'password', '至少 6 位，设好后可换设备登录', 'new-password');
        var pwRow = el('div', 'td-nick-row');
        pwRow.appendChild(pwField.box);
        var pwSave = el('button', 'td-acct-btn2 td-nick-save', '保存密码');
        pwSave.setAttribute('data-neutral', '1');
        pwSave.type = 'button'; pwSave.setAttribute('data-busy', '1');
        pwSave.onclick = function () { doSetPassword(pwField.input.value); };
        pwField.input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') doSetPassword(pwField.input.value);
        });
        pwRow.appendChild(pwSave);
        b.appendChild(pwRow);
        b.appendChild(el('p', 'td-acct-note',
          '设好密码后，换设备可以直接用邮箱或手机号 + 密码登录，不必等邮件。'));
      }

      var acts = el('div', 'td-acct-actions');
      var out = el('button', 'td-acct-btn2', '退出登录');
      out.type = 'button'; out.setAttribute('data-neutral', '1'); out.setAttribute('data-busy', '1');
      out.onclick = doSignOut;
      acts.appendChild(out); b.appendChild(acts);
      b.appendChild(el('p', 'td-acct-note',
        '做题进度会自动保存，换设备或重新登录后接着练，不需要任何手动操作。'));
      return;
    }

    if (!SB || !SB.available || !SB.available()) {
      setStatus('登录暂时不可用', 'warn');
      b.appendChild(el('p', 'td-acct-note', '账号模块未能加载，做题与进度照常保存，不受影响。'));
      return;
    }

    /* 两条入口：默认邮箱 / 手机号 + 密码（注册即用，完全不走邮件投递），
       备用邮件链接（邮件能收到的人可以用，点开回站自动登录）。 */
    var seed = pwdEmail || otpEmail;

    if (loginMode === 'link') {
      var emLink = field('邮箱', 'email', 'you@example.com', 'email');
      if (seed) emLink.input.value = seed;
      ui.email = emLink.input;
      b.appendChild(el('div', 'td-acct-who', '邮箱链接登录'));
      b.appendChild(emLink.box);
      var linkRow = el('div', 'td-acct-actions');
      var sendBtn = el('button', 'td-acct-btn2 td-acct-btn--wide td-acct-primary', sendBtnLabel());
      sendBtn.type = 'button';
      sendBtn.setAttribute('data-busy', '1');
      if (otpCooldown > 0) sendBtn.disabled = true;
      sendBtn.onclick = doSendLink;
      ui.otpSendBtn = sendBtn;
      linkRow.appendChild(sendBtn);
      b.appendChild(linkRow);
      emLink.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSendLink(); });
      var back = el('button', 'td-acct-linkbtn', '改用邮箱 / 手机号 + 密码登录');
      back.type = 'button';
      back.onclick = function () { loginMode = 'password'; setError(''); renderBody(); };
      b.appendChild(back);
      b.appendChild(el('p', 'td-acct-note',
        '邮件里的按钮只能用一次，几分钟内有效；收不到就去垃圾箱翻一下。'));
      return;
    }

    var em = field('邮箱或手机号', 'text', '邮箱或手机号', 'username');
    if (seed) em.input.value = seed;
    ui.email = em.input;
    b.appendChild(el('div', 'td-acct-who', '邮箱 / 手机号 + 密码'));
    b.appendChild(em.box);

    var pw = field('密码', 'password', '至少 6 位', 'current-password');
    ui.pw = pw.input;
    b.appendChild(pw.box);

    var actions = el('div', 'td-acct-actions td-acct-actions--stack');
    var signIn = el('button', 'td-acct-btn2 td-acct-btn--wide td-acct-primary', '登录');
    signIn.type = 'button'; signIn.setAttribute('data-busy', '1');
    signIn.onclick = doSignInPwd;
    actions.appendChild(signIn);

    var signUp = el('button', 'td-acct-btn2 td-acct-btn--wide', '注册新账号');
    signUp.type = 'button'; signUp.setAttribute('data-busy', '1');
    signUp.setAttribute('data-neutral', '1');
    signUp.onclick = doSignUpPwd;
    actions.appendChild(signUp);
    b.appendChild(actions);

    pw.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSignInPwd(); });

    var onlyLink = el('button', 'td-acct-linkbtn', '改用邮箱链接登录');
    onlyLink.type = 'button';
    onlyLink.onclick = function () { loginMode = 'link'; setError(''); renderBody(); };
    b.appendChild(onlyLink);

    b.appendChild(el('p', 'td-acct-note',
      '第一次用这个账号，先点「注册新账号」，会自动建好学习档案，之前做过的题一并带上。'));
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

  function renderLanguageTab() {
    var b = ui.body;
    var r = row('语言', '切换后立即生效，做题内容本身不受影响。');
    var seg = el('div', 'td-set-seg');
    var get = (window.TDI18n && window.TDI18n.get) ? window.TDI18n.get : function () { return 'zh'; };
    var cur = get();
    [['zh', '中文'], ['en', 'English']].forEach(function (pair) {
      var btn = el('button', '', pair[1]);
      btn.type = 'button';
      if (cur === pair[0]) btn.setAttribute('data-active', '1');
      btn.onclick = function () {
        if (window.TDI18n && window.TDI18n.set) window.TDI18n.set(pair[0]);
        else { try { localStorage.setItem('tdsat_lang', pair[0]); } catch (e) { console.warn('保存语言失败', e); } }
        renderBody();
      };
      seg.appendChild(btn);
    });
    r.appendChild(seg); b.appendChild(r);
    b.appendChild(el('p', 'td-acct-note', '只切换界面文字；题目、讲义原文与你的作答记录不变。'));
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
    } else if (activeTab === 'language') {
      setStatus('语言偏好自动保存在这台设备', 'plain');
      renderLanguageTab();
    } else if (activeTab === 'practice') {
      setStatus('练习偏好自动保存在这台设备', 'plain');
      renderPracticeTab();
    } else if (activeTab === 'about') {
      setStatus('关于', 'plain');
      renderAboutTab();
    }
  }

  function mountButton(btn) {
    function vis(el) { return !!el && el.getClientRects().length > 0; }
    function host() {
      // 全站侧栏（app.css 的 .site-rail）：列表视图下唯一稳定可见的导航容器。
      var rail = document.querySelector('.site-rail');
      if (vis(rail)) return { node: rail, cls: 'rail-settings', first: false };
      // 做题视图：侧栏被冻结规则整块 display:none，入口改挂顶部工具条右侧（Reference / 退出 那一排）。
      var ctx = document.querySelector('.drill-context-right');
      if (vis(ctx)) return { node: ctx, cls: 'ctx-settings', first: true };
      // 模考作答：题号条右侧那一排（Directions / Reference / Calculator / Review / Submit）。
      // 侧栏在 stage-answer 起就被 app.css 的 :has 规则藏掉，这里必须有自己的落点。
      var examTools = document.querySelector('.exam-toolbar-actions');
      if (vis(examTools)) return { node: examTools, cls: 'ctx-settings', first: true };
      // 真题结果页：底部的「返回板块列表 / 继续练习 / 查看错题」那一排。
      var resultActions = document.querySelector('.drill-result-actions');
      if (vis(resultActions)) return { node: resultActions, cls: 'ctx-settings', first: false };
      return null;
    }
    function railTail(rail) {
      // 明确插入锚点：在分隔线之后建一个 .rail-tail 组；有「← 返回真题练习」就把
      // 链接收进组内排在前面，按钮紧跟其后；没有返回链接（drill 列表）组里只放按钮。
      // 不靠 appendChild 到宿主末尾硬凑位置。
      var tail = rail.querySelector('.rail-tail');
      if (!tail) {
        tail = el('div', 'rail-tail');
        var back = rail.querySelector('.rail-back');
        if (back) {
          back.parentNode.insertBefore(tail, back);
          tail.appendChild(back);
        } else {
          var seps = rail.querySelectorAll('.rail-sep');
          var anchor = seps.length ? seps[seps.length - 1] : null;
          rail.insertBefore(tail, anchor ? anchor.nextSibling : null);
        }
      }
      return tail;
    }
    function placeIn(h) {
      if (h.cls === 'rail-settings') {
        var tail = railTail(h.node);
        var back = tail.querySelector('.rail-back');
        var next = back ? back.nextSibling : null;
        var atAnchor = back ? btn.previousElementSibling === back : btn.parentNode === tail;
        if (btn.parentNode !== tail || !atAnchor) tail.insertBefore(btn, next);
      } else {
        if (btn.parentNode !== h.node) {
          if (h.node.firstChild) h.node.insertBefore(btn, h.node.firstChild);
          else h.node.appendChild(btn);
        }
      }
    }
    function park() {
      // 最后一个兜底：既没有侧栏、也没有任何工具条时（如模考检查/交卷/成绩页），
      // 按钮不许「存在但宽 0」——挂回 body 并固定在右下角，切回有宿主的视图时 place() 会自动收回。
      if (btn.classList.contains('floating-settings')) return true;
      btn.classList.remove('rail-settings', 'ctx-settings');
      btn.classList.add('floating-settings');
      btn.style.position = 'fixed'; btn.style.right = '14px'; btn.style.bottom = '14px';
      btn.style.zIndex = '8999'; btn.style.background = 'var(--paper,#fff)';
      btn.style.borderRadius = '8px'; btn.style.padding = '8px 10px';
      btn.style.boxShadow = 'var(--shadow-3,0 8px 24px rgba(18,35,63,.16))';
      if (btn.parentNode !== document.body) document.body.appendChild(btn);
      return true;
    }
    function place() {
      var h = host();
      if (!h) {
        /* 模考开考/成绩等没有工具条的屏：按 Bluebook 把入口固定右上角；
           不 park() 到右下角（会跟计时器/题号条打架）。 */
        if (document.body && document.body.classList.contains('is-mock')) {
          btn.classList.remove('rail-settings', 'ctx-settings', 'floating-settings');
          btn.classList.add('floating-settings', 'mock-corner');
          btn.setAttribute('style', 'position:fixed;top:10px;right:16px;z-index:8999;display:flex');
          if (btn.parentNode !== document.body) document.body.appendChild(btn);
          return true;
        }
        return park();
      }
      btn.style.display = '';
      if (btn.parentNode !== h.node || btn.classList.contains('floating-settings')) {
        btn.classList.remove('rail-settings', 'ctx-settings', 'floating-settings');
        btn.classList.add(h.cls);
        btn.removeAttribute('style');
      } else if (!btn.classList.contains(h.cls)) {
        btn.classList.add(h.cls);
      }
      placeIn(h);
      return true;
    }
    function attach() {
      var rail = document.querySelector('.site-rail');
      if (rail && !btn.isConnected) {
        if (!btn.classList.contains('rail-settings')) btn.classList.add('rail-settings');
        var tail = railTail(rail);
        var back = tail.querySelector('.rail-back');
        tail.insertBefore(btn, back ? back.nextSibling : null);
        return true;
      }
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
    if (!place()) {
      if (attach()) { /* 侧栏还没渲染出来时先挂后补 */ }
    }
    // 列表 ⇄ 做题 切换时侧栏会整块隐藏，每 900ms 重新找一个「当前真的可见」的宿主
    setInterval(function () {
      if (document.visibilityState === 'hidden') return;
      place();
    }, 900);
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

  /* 诊断钩子：合并逻辑（canon / deepMerge / mergeLocalWithCloud）对外只读暴露，
     便于 tools / 单测在无账号环境里验证「坏存档不覆盖好存档」这类不变量。 */
  try {
    window.TD_CLOUD_MERGE = { canon: canon, deepMerge: deepMerge, mergeLocalWithCloud: mergeLocalWithCloud,
      mergeArrays: mergeArrays, itemSig: itemSig, pickAtomic: pickAtomic, ATOMIC_KEYS: ATOMIC_KEYS,
      isPlainPayload: isPlainPayload, applyPayload: applyPayload };
  } catch (e) { console.warn('合并诊断钩子注册失败', e); }

  function boot() {
    loadProf();
    exposeNotify();
    var btn = buildUI();
    mountButton(btn);
    renderBody();
    if (SB && typeof SB.onState === 'function') SB.onState(function (u) { onState(u); });
    startAutoSave();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
