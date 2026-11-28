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
  // 不同步到云端的本机键：
  // - 外观偏好（prefs / 主题 / 语言）：这是「这台设备」的显示选择，不该被别的设备改掉；
  // - 登录会话（access/refresh token 绝不能进档案，否则既泄露到云端，
  //   又会在 applyPayload 清空 tdsat_* 时把刚登录的会话一起删掉 → 刷新退登录）；
  // - 重置密码标记：这是「这次点击」的临时状态。之前它跟着档案同步，
  //   在另一台设备登录时会凭空冒出一句「已经通过重置链接登录」，吓得人以为账号出问题；
  // - 启动重试计数 / 写盘探针：纯本机诊断键。
  var NO_SYNC = {
    'tdsat_prefs_v1': 1, 'tdsat_auth_v1': 1,
    'tdsat_lang': 1, 'tdsat_theme': 1,
    'tdsat_recovery_v1': 1, 'tdsat_boot_retry_v1': 1, 'tdsat_write_probe__': 1,
    '__tdsat_write_probe__': 1
  };
  var PROFILE_KEY = 'tdprofile_v1';
  var DRAFT_KEY = 'tdprofile_draft_v1';
  /* 登出前最后一次"已确认写进云端"的本机状态。登录别的账号时拿它做基线，
     只有基线之后以游客身份改动过的部分才是"无主增量"，不会被整份替换掉。 */
  var BASE_KEY = 'tdprofile_base_v1';
  var DEFAULT_NICK = '同学';
  /* 没设昵称时显示什么：跟着界面语言走。英文界面里冒出一个「同学」，
     读起来像漏翻的半截中文；已经存过昵称的用户不受影响（那是人家自己的名字）。 */
  function defaultNick() {
    try {
      if (window.TDI18n && window.TDI18n.get && window.TDI18n.get() === 'en') return 'Student';
    } catch (e) { /* 语言模块没加载就按中文 */ }
    return DEFAULT_NICK;
  }

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
  var loginMode = 'password';   // password | link | code | reset
  var recoveryOpened = false;   // 重置链接回来只自动开一次面板
  var codeSent = false;
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
    } catch (e) {
      /* 读不到 ≠ 空档案：Safari 无痕/禁用站点数据时 localStorage.length 或 key()
         会抛。旧实现返回 {}，登录后 localHash 变成空档案哈希，和 lastSynced
         不等就会 silentPush 一份空 payload 上云，把账号里唯一的好档案冲掉。
         这里用 null 明确表示「本机快照不可读」，上层拒绝推送/暂存。 */
      return null;
    }
    return out;
  }
  function localHash() { var s = snapshot(); return s == null ? null : hashOf(s); }
  /* 状态栏/报错是动态写 textContent 的，i18n 的 MutationObserver 只能翻
     「整句恰好有词条」的文本；含邮箱的句子永远匹配不上。这里在落 DOM 前
     先过一次词典，动态句用 {email} 这类占位符先翻译、再替换。 */
  function trText(s) {
    var api = window.TDI18n;
    var raw = String(s == null ? '' : s);
    /* TDI18n.t 是无条件查英文词典的；中文模式必须先看 getLang，否则状态栏
       会整片变成英文。 */
    try {
      if (!api || !api.t) return raw;
      if (api.get && api.get() !== 'en') return raw;
      return api.t(raw);
    } catch (e) { return raw; }
  }
  function trTpl(tpl, vars) {
    var out = trText(tpl);
    var o = vars || {};
    Object.keys(o).forEach(function (k) { out = out.split('{' + k + '}').join(String(o[k])); });
    return out;
  }
  function setStatus(text, kind) {
    if (!ui || !ui.status) return;
    ui.status.textContent = trText(text);
    ui.status.setAttribute('data-kind', kind || 'plain');
  }
  function setError(text) {
    if (!ui || !ui.error) return;
    text = trText(text);
    /* 先显出来再写文字：live region 在 hidden 状态下改内容不会播报，
       读屏用户提交后只会听到沉默。 */
    if (text) { ui.error.hidden = false; ui.error.textContent = text; return; }
    ui.error.textContent = '';
    ui.error.hidden = true;
  }
  function setBusy(on) {
    busy = !!on;
    if (!ui) return;
    var nodes = ui.root.querySelectorAll('[data-busy]');
    for (var i = 0; i < nodes.length; i++) nodes[i].disabled = !!on;
  }
  // 界面上的名称：只用昵称，绝不回退到邮箱。
  function displayName() { return nickname || defaultNick(); }

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
  function isPhoneAccount(v) {
    var s = String(v || '').trim();
    /* 手机号可能带国家码、空格、横线、括号：面板里填 +1 (415) 555-0123
       也是合法输入。先只放过电话字符，再按数字个数判断，别把它误判成
       邮箱，否则密码错误提示会叫用户去查邮箱。 */
    if (!/^\+?\s*[\d(][\d\s().-]*$/.test(s)) return false;
    var digits = s.replace(/[^\d]/g, '');
    return digits.length >= 7 && digits.length <= 15;
  }
  function friendlyError(e, account) {
    var c = e && e.code, m = e && e.message;
    if (c === 'auth/invalid-email') return '邮箱格式不正确，请检查后再试。';
    if (c === 'auth/weak-password') return '密码太短或强度不够，换一个更长一点的密码再试。';
    if (c === 'auth/same-password') return '新密码不能和旧密码一样，换一个再保存。';
    if (c === 'auth/signup-disabled') return '当前暂未开放新账号注册，请稍后再试。';
    if (c === 'auth/phone-signup-closed') return '手机号注册需要短信验证，当前暂未开通；请改用邮箱注册。已有手机号账号可以直接登录。';
    if (c === 'auth/phone-signup-no-session') return '手机号注册没有直接登录成功；这个号码没有可收确认邮件的邮箱，请稍后重试，或改用邮箱注册。';
    if (c === 'auth/invalid-credential') {
      return (isPhoneAccount(account) ? '手机号' : '邮箱') + '或密码不对。';
    }
    if (c === 'auth/email-already-in-use') {
      return (isPhoneAccount(account) ? '这个手机号' : '这个邮箱') + '已经注册过了，直接点「登录」。';
    }
    /* supa-cloud 把 GoTrue 的 Email not confirmed 归一成带 -ed 的码；
       这里原来只认少一个 ed 的拼写，用户会直接看到英文技术错误。 */
    if (c === 'auth/email-confirm-required') {
      return '注册成功，但邮箱还没确认：先去邮件里点确认链接（垃圾箱也翻一下），再回来登录。';
    }
    if (c === 'auth/email-not-confirmed' || c === 'auth/email-not-confirm') {
      return '邮箱还没有验证：先去邮件里点确认链接（垃圾箱也翻一下），再回来登录。';
    }
    if (c === 'auth/invalid-code') return '登录链接已失效或邮件有误，请重新发送登录邮件。';
    if (c === 'auth/too-many-requests') return '操作太频繁了，等一分钟再试。';
    if (c === 'auth/network-request-failed') return '网络异常，请检查连接后重试。';
    if (c === 'auth/internal-error') return '登录服务返回异常，请刷新页面后重试。';
    var lm = String(m || '').toLowerCase();
    if (lm.indexOf('does not match') >= 0 || lm.indexOf('verification code') >= 0 || lm.indexOf('token') >= 0 || lm.indexOf('expired') >= 0) {
      return '登录链接已失效或邮件有误，请重新发送登录邮件。';
    }
    if (lm.indexOf('failed to fetch') >= 0 || lm.indexOf('request failed') >= 0) return '登录服务暂时连不上，请检查网络后重试。';
    /* supa-cloud 自己抛的校验提示是中文，必须原样给用户；未归一的 Supabase
       原文可能是英文甚至“Database error saving new user”这类内部信息，才收成
       一句可行动的提示，细节留给控制台。 */
    if (/[\u4e00-\u9fa5]/.test(String(m || ''))) return m;
    if (m) { try { console.warn('账号操作失败：', m); } catch (e) {} }
    return '操作失败，请稍后重试。';
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
  /* 草稿按账号分槽：A→B→C 连续切号时，不能用一个单槽把 A 的未同步增量
     覆盖掉。旧格式 {uid,payload} 仍能读；新格式 {v:2,items:{uid:{payload,ts}}}，
     读写都保持向后兼容。解析失败一律当空槽，后续写入会换成新格式。 */
  function draftsFromRaw(raw) {
    try {
      var o = raw ? JSON.parse(raw) : null;
      if (!o || typeof o !== 'object' || Array.isArray(o)) return {};
      if (o.v === 2 && o.items && typeof o.items === 'object' && !Array.isArray(o.items)) return o.items;
      if (typeof o.uid === 'string') {
        var one = {}; one[o.uid] = { payload: o.payload, ts: o.ts || 0 }; return one;
      }
      return {};
    } catch (e) { return {}; }
  }
  function loadDraft(uid) {
    try {
      var items = draftsFromRaw(localStorage.getItem(DRAFT_KEY));
      var key = uid || (Object.keys(items).length === 1 ? Object.keys(items)[0] : '');
      if (!key || !items[key]) return null;
      return { uid: key, payload: items[key].payload, ts: items[key].ts || 0 };
    } catch (e) { return null; }
  }
  function saveDraft(uid, payload) {
    if (!uid || payload == null) return false;
    try {
      var items = draftsFromRaw(localStorage.getItem(DRAFT_KEY));
      items[uid] = { payload: payload, ts: Date.now() };
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ v: 2, items: items }));
      return true;
    } catch (e) { console.warn('保存草稿失败', e); return false; }
  }
  function clearDraft(uid) {
    try {
      var items = draftsFromRaw(localStorage.getItem(DRAFT_KEY));
      if (uid) delete items[uid]; else items = {};
      if (Object.keys(items).length) localStorage.setItem(DRAFT_KEY, JSON.stringify({ v: 2, items: items }));
      else {
        try { localStorage.removeItem(DRAFT_KEY); }
        catch (e) {
          /* 某些实现 removeItem 被禁用但 setItem 可用：留一个空槽也比留旧草稿好，
             否则下次登录会把已经应用过的旧草稿再盖回本机。 */
          localStorage.setItem(DRAFT_KEY, JSON.stringify({ v: 2, items: {} }));
        }
      }
      return true;
    } catch (e) { console.warn('清除草稿失败', e); return false; }
  }
  /* 应用一份云端/草稿档案：统一加抑制同步，并把成功/失败返回给调用方。
     账号分支必须看这个返回值，不能“调用完就当打开了”。 */
  function applyArchive(payload) {
    var ok = false;
    suppress = true;
    try { ok = applyPayload(payload); } finally { suppress = false; }
    return ok;
  }
  /* 应用一份本地草稿：只有整份写回成功才清草稿。坏载荷（数组、或某个快照值
     不是字符串、本地存储不可写）会返回 false，草稿原样保留，供后续恢复/排查。 */
  function applyDraft(draft) {
    if (!draft) return false;
    var ok = applyArchive(draft.payload);
    if (ok) clearDraft(draft.uid);
    return ok;
  }

  // 用档案内容整体替换本机副本；本机外观偏好保持不变。
  /* 档案载荷必须是普通对象：云端/本地草稿被写成数组或字符串时，
     canon() 会筛出 0 个快照键，但下面已经先把本机 tdsat_* 全删了——
     结果“恢复成功”地清空整份进度。坏载荷一律拒绝，连一个键都不动。 */
  function isPlainPayload(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function applyPayload(payload) {
    if (!isPlainPayload(payload)) return false;
    /* 云端快照值必须是 localStorage 能原样写回的字符串。顶层是对象、里面某个
       tdsat_* 却是对象/数字/null 时，旧实现会先清空本机再把这些键静默跳过，
       用户进度被清空且无法恢复。形状不对就整份拒绝，一个键都不动。 */
    var clean = canon(payload || {});
    var badValue = Object.keys(clean).some(function (key) { return typeof clean[key] !== 'string'; });
    if (badValue) return false;
    /* 先试写一个探针键：Safari 无痕/配额满/只读存储时 setItem 会抛错，旧实现
       仍然先把本机 tdsat_* 全删掉，然后每个写入都失败并被 catch 吞掉，最后
       返回“成功”。探针失败时一个键都不动，宁可让用户继续用本机进度。 */
    try {
      localStorage.setItem('__tdsat_write_probe__', '1');
      localStorage.removeItem('__tdsat_write_probe__');
    } catch (e) {
      console.warn('本地存储不可写，拒绝整份替换', e);
      return false;
    }
    var keep = {}, k;
    for (k in NO_SYNC) {
      if (!Object.prototype.hasOwnProperty.call(NO_SYNC, k)) continue;
      var v = null;
      try { v = localStorage.getItem(k); } catch (e) { console.warn('读取本地存储失败', e); }
      if (v != null) keep[k] = v;
    }
    var cur = snapshot();
    if (cur == null) {
      /* 读不到本机快照 ≠ 本机是空档案：此时无法知道哪些键会被覆盖，
         整份替换会把看不见的本机进度永久清掉。直接拒绝，保留原状。 */
      console.warn('本地快照不可读，拒绝整份替换');
      return false;
    }
    /* 先记下这次可能写到的键：回滚时即使 snapshot() 中途读失败，也能把这些
       半成品键删掉，不会留下一份“云端写了一半 + 本机旧档”的混合状态。 */
    var written = Object.keys(clean).concat(Object.keys(keep));
    var failed = false;
    Object.keys(cur).forEach(function (key) { try { localStorage.removeItem(key); } catch (e) { console.warn('清除本地存储失败', e); } });
    Object.keys(clean).forEach(function (key) {
      try { if (typeof clean[key] === 'string') localStorage.setItem(key, clean[key]); }
      catch (e) { failed = true; console.warn('写入本地存储失败', e); }
    });
    Object.keys(keep).forEach(function (key) {
      try { localStorage.setItem(key, keep[key]); } catch (e) { failed = true; console.warn('写入本地存储失败', e); }
    });
    if (failed) {
      /* 写到一半失败（例如配额在复制大档案时才满）：把刚才的旧快照写回去，
         不让“恢复”变成半份新档 + 半份空档。written 不依赖再次读盘，
         读失败时也不会留下半成品键。 */
      written.forEach(function (key) { try { localStorage.removeItem(key); } catch (e) {} });
      try { Object.keys(snapshot()).forEach(function (key) { try { localStorage.removeItem(key); } catch (e) {} }); } catch (e) {}
      Object.keys(cur).forEach(function (key) { try { localStorage.setItem(key, cur[key]); } catch (e) { console.warn('回滚本地存储失败', e); } });
      Object.keys(keep).forEach(function (key) { try { localStorage.setItem(key, keep[key]); } catch (e) { console.warn('回滚本地存储失败', e); } });
      return false;
    }
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
    var local = snapshot() || {};
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

  /* ---------- 登出后的"游客增量"：与最后一次已同步基线做差分 ---------- */
  function loadBase() {
    try {
      var raw = localStorage.getItem(BASE_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || typeof o !== 'object' || !isPlainPayload(o.payload)) return null;
      return o;
    } catch (e) { return null; }
  }
  function saveBase(payload, owner) {
    try {
      if (!isPlainPayload(payload) || !Object.keys(payload).length) return false;
      localStorage.setItem(BASE_KEY, JSON.stringify({ owner: owner || '', ts: Date.now(), payload: payload }));
      return true;
    } catch (e) { console.warn('保存同步基线失败', e); return false; }
  }
  function clearBase() { try { localStorage.removeItem(BASE_KEY); } catch (e) { /* 忽略 */ } }

  /* 只取"基线里没有 / 比基线新"的部分；返回 undefined 表示这份子树没有增量。 */
  function diffTree(base, local) {
    if (local === undefined) return undefined;
    if (base === undefined) return local;
    if (isPlainObj(local) && isPlainObj(base)) {
      var lt = stampNum(local.ts), bt = stampNum(base.ts);
      if (lt != null && bt != null) return lt > bt ? local : undefined;
      var out = {}, any = false;
      Object.keys(local).forEach(function (k) {
        var d = diffTree(base[k], local[k]);
        if (d !== undefined) { out[k] = d; any = true; }
      });
      return any ? out : undefined;
    }
    if (Array.isArray(local) && Array.isArray(base)) {
      var seen = {};
      base.forEach(function (x) { seen[itemSig(x)] = 1; });
      var extra = local.filter(function (x) { return !seen[itemSig(x)]; });
      return extra.length ? extra : undefined;
    }
    if (local === base) return undefined;
    return local;
  }
  /* 整份存档的增量：基线缺失时返回 null（无从判断，交给原有分支）。 */
  function guestDelta(basePayload, localPayload) {
    if (!isPlainPayload(basePayload) || !isPlainPayload(localPayload)) return null;
    var out = {}, any = false;
    Object.keys(localPayload).forEach(function (k) {
      if (!(k in basePayload)) { out[k] = localPayload[k]; any = true; return; }
      if (localPayload[k] === basePayload[k]) return;
      try {
        var lo = JSON.parse(localPayload[k]), bo = JSON.parse(basePayload[k]);
        var d = diffTree(bo, lo);
        if (d !== undefined) { out[k] = JSON.stringify(d); any = true; }
      } catch (e) { out[k] = localPayload[k]; any = true; }
    });
    return any ? out : null;
  }
  /* 把增量并进目标档案（增量那侧按 ts 较新胜出；目标独有内容原样保留）。 */
  function mergeIntoPayload(target, add) {
    var out = canon(target || {});
    if (!isPlainPayload(add)) return out;
    Object.keys(add).forEach(function (k) {
      var raw = add[k];
      if (typeof raw !== 'string') return;
      if (!(k in out)) { out[k] = raw; return; }
      if (out[k] === raw) return;
      if (ATOMIC_KEYS[k]) { out[k] = pickAtomic(raw, out[k], ATOMIC_KEYS[k]); return; }
      try {
        out[k] = JSON.stringify(deepMerge(JSON.parse(raw), JSON.parse(out[k])));
      } catch (e) {
        var addOk = true;
        try { JSON.parse(raw); } catch (e2) { addOk = false; }
        out[k] = addOk ? raw : out[k];
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
      if (!snap) return false;
      var h = hashOf(snap);
      await A.pushProgress(snap);
      prof.owner = user.uid;
      prof.lastSynced = h;
      saveProf();
      /* 这一步写成功了，云端此刻 = snap：把它记成"游客增量"的基线。 */
      saveBase(snap, user.uid);
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
    if (!nickname) nickname = defaultNick();
    try { user._nick = nickname; } catch (e) { console.warn('写入昵称未生效', e); }
    if (cloudNick !== nickname) {
      try { await A.updateNickname(nickname); } catch (e) { /* 下次登录会重试 */ }
    }
    try { if (user && !user.displayName) user.displayName = nickname; } catch (e) { console.warn('写入昵称未生效', e); }

    var cloudPayload = archive && archive.payload ? canon(archive.payload) : null;
    var cloudHash = cloudPayload && Object.keys(cloudPayload).length ? hashOf(cloudPayload) : '';
    var lh = localHash();

    /* 登出后以游客身份做的题：与「最后一次确认写进云端」的本机基线比差，
       得到这段无主的增量。登录任何账号都先把它并进去——以前切号分支直接整份
       换成该账号的档案，游客记录就这么被"刷新"掉了。 */
    var baseRec = loadBase();
    var guestAdd = baseRec ? guestDelta(baseRec.payload, snapshot() || {}) : null;

    /* 回到旧账号时，先恢复"登出后以游客身份做题"留下的增量，保证零丢失。 */
    var draft = loadDraft(uid);
    if (draft && draft.uid === uid && isPlainPayload(draft.payload) && Object.keys(draft.payload).length) {
      /* 草稿也要过 applyPayload 的整份校验。旧实现不看返回值：载荷里只要
         有一个非字符串快照值，applyPayload 会拒绝（本机不动），这里却照样
         clearDraft(draft.uid) 并 silentPush——把用户登出后以游客身份做的唯一一份
         增量直接删掉。失败时保留草稿，不覆盖本机，也不再自动推云端。 */
      if (!applyDraft(draft)) {
        setStatus('本地暂存档案形状异常，已保留未合并，本机进度不受影响', 'warn');
        renderBody();
        return;
      }
      /* 草稿已经合并到本机，但写回云端失败时不能把 lastSynced 记成本地哈希：
         否则下次登录会以为云端已同步，草稿增量永远不再上传。 */
      var draftPushed = await silentPush();
      prof.owner = uid;
      if (!draftPushed) {
        saveProf();
        setStatus('本地暂存已合并到本机，但暂时无法写回云端，联网后会自动重试', 'warn');
        renderBody();
        reloadSoon('正在打开你的学习档案…');
        return;
      }
      saveProf();
      renderBody();
      reloadSoon('正在打开你的学习档案…');
      return;
    }

    if (prof.owner === uid) {
      /* 同一账号：以变化为准，全自动，不提示、不让用户做选择。 */
      if (lh !== prof.lastSynced) {
        /* 本机动过、云端也可能被别的设备动过：先按 ts 合并再推。
           旧实现直接 silentPush 整份本机，另一台设备刚做的题会被这台机器盖掉。 */
        var cloudChangedToo = !!(cloudPayload && Object.keys(cloudPayload).length && cloudHash && cloudHash !== prof.lastSynced);
        if (cloudChangedToo) {
          var bothMerged = mergeLocalWithCloud(cloudPayload);
          if (guestAdd) bothMerged = mergeIntoPayload(bothMerged, guestAdd);
          if (hashOf(bothMerged) !== lh) {
            if (!applyArchive(bothMerged)) {
              setStatus('云端档案内容异常，已保留本机进度，未覆盖', 'warn');
              renderBody();
              return;
            }
          }
        }
        var ok = await silentPush();
        setStatus(ok ? '进度已自动保存' : '暂时无法保存进度，联网后会自动重试', ok ? 'ok' : 'warn');
      } else if (cloudHash && cloudHash !== prof.lastSynced) {
        /* 云端档案被 applyPayload 拒绝时（值形状坏/本机存储不可写），旧实现
           照样更新 lastSynced 并提示“已打开你在其他设备上的进度”——其实本机
           一个字节都没变，还把云端哈希记成本地已同步，后续不再重试。 */
        if (!applyArchive(cloudPayload)) {
          setStatus('云端档案内容异常，已保留本机进度，未覆盖', 'warn');
          renderBody();
          return;
        }
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
        /* 从 A 切到 B 之前必须先把 A 未同步的增量暂存下来。saveDraft 写失败
           （Safari 无痕/配额满/只读存储）时如果继续，下面 applyArchive 清掉
           A 的本机副本，A 的增量就永久没了。失败就取消这次切换。 */
        if (!saveDraft(prof.owner, snapshot())) {
          try { await A.signOut(); } catch (e) { /* 本地会话清不掉就只保留本机 */ }
          user = null; nickname = '';
          setStatus('本机存储不可写，无法暂存当前账号进度，已取消切换；本机进度未受影响', 'warn');
          renderBody();
          return;
        }
      }
      var fresh = !prof.owner || prof.owner === 'guest';
      if (cloudPayload && Object.keys(cloudPayload).length) {
        // 该账号已有档案 → 切过去。首次登录且本机有"无主"进度时先并入，避免丢题。
        var target = (fresh && Object.keys(snapshot() || {}).length)
          ? mergeLocalWithCloud(cloudPayload) : cloudPayload;
        if (guestAdd) target = mergeIntoPayload(target, guestAdd);
        // canon()/mergeLocalWithCloud() 每次返回新对象，引用比较永远为真；
        // 改为内容指纹比对，只有真的发生了合并（内容有差异）才回传，避免无谓覆盖。
        var merged = hashOf(target) !== cloudHash;
        /* 应用失败时绝不能继续：下面会把 owner 改成新账号，还会把本机快照
           silentPush 上去——等于用 A 的进度覆盖 B 的云端档案。失败就退出
           这次登录，保留本机进度，不跨账号写入。 */
        if (!applyArchive(target)) {
          try { await A.signOut(); } catch (e) { /* 本地会话已清不掉就只保留本机 */ }
          user = null; nickname = '';
          setStatus('云端档案内容异常，已退出该账号；本机进度未受影响', 'warn');
          renderBody();
          return;
        }
        prof.owner = uid; saveProf();
        if (merged) {
          /* 并集写回云端失败时，lastSynced 只能停在云端旧哈希；否则本地会
             被误认为已经同步，另一台设备永远收不到这次并集。 */
          var mergedPushed = await silentPush();
          if (!mergedPushed) {
            prof.lastSynced = cloudHash || '';
            saveProf();
            setStatus('云端档案已合并到本机，但暂时无法写回云端，联网后会自动重试', 'warn');
            renderBody();
            reloadSoon('正在打开你的学习档案…');
            return;
          }
        } else {
          prof.lastSynced = localHash(); saveProf();
        }
        renderBody();
        reloadSoon('正在打开你的学习档案…');
        return;
      } else if (fresh) {
        // 首次在这台设备使用该账号 → 把已有做题记录归到它名下
        var ok2 = await silentPush();
        prof.owner = uid; saveProf();
        setStatus(ok2 ? '已为你建立专属学习档案' : '暂时无法保存进度，联网后会自动重试', ok2 ? 'ok' : 'warn');
      } else {
        // 新账号、本机副本属于别的账号 → 干净起点，不串档；
        // 唯一例外：登出后当游客做的那部分要跟着这次登录走，不能被清掉。
        /* applyPayload 在本地存储不可写/只读时会返回 false；旧实现不看
           返回值，照样把 owner 改成新账号并 silentPush，等于用 A 的本机进度
           覆盖 B 的空档案。失败就退出这次登录，本机进度原样保留。 */
        if (!applyArchive(guestAdd || {})) {
          try { await A.signOut(); } catch (e) { /* 本地会话已清不掉就只保留本机 */ }
          user = null; nickname = '';
          setStatus('本机存储不可写，已退出该账号；本机进度未受影响', 'warn');
          renderBody();
          return;
        }
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
    if (otpCooldown > 0) return trTpl('重新发送 ({seconds}s)', { seconds: otpCooldown });
    return trText(otpSent ? '重新发送' : '发送登录邮件');
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
        ui.otpSendBtn.textContent = (loginMode === 'code' ? codeBtnLabel()
          : loginMode === 'reset' ? resetBtnLabel() : sendBtnLabel());
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

  async function doSetPassword(pw, pw2) {
    if (busy) return;   // 按钮禁用后回车仍能触发，防重复登录/重复发信
    if (!pw || pw.length < 6) { setError('密码至少 6 位。'); return; }
    if (pw2 !== undefined && pw !== pw2) { setError('两次输入的新密码不一致，请重新确认。'); return; }
    if (!SB || !SB.setPassword) { setError('登录模块未加载，请刷新页面重试。'); return; }
    var ok = false;
    try {
      setBusy(true); setError('');
      await SB.setPassword(pw);
      if (SB.clearRecovery) SB.clearRecovery();
      ok = true;
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); renderBody(); }
    if (ok) setStatus('密码已保存，下次可以用这个账号登录。', 'ok');
  }

  function loginSuccess(msg) {
    if (SB && SB.sessionWriteFailed && SB.sessionWriteFailed()) {
      setStatus('登录成功，但浏览器存储不可写；刷新后需要重新登录。', 'warn');
    } else setStatus(msg, 'ok');
  }
  async function doSignInPwd() {
    if (busy) return;   // 按钮禁用后回车仍能触发，防重复登录/重复发信
    var email = readEmail(), pw = readPw();
    if (!email) { setError('请先填写邮箱或手机号。'); return; }
    if (!pw) { setError('请输入密码。'); return; }
    if (!SB || !SB.available()) { setError('登录模块未加载，请刷新页面重试。'); return; }
    try {
      setBusy(true); setError('');
      pwdEmail = email;
      await SB.signInPassword(email, pw);
      loginSuccess('登录成功，正在读取你的学习档案…');
    } catch (e) { setError(friendlyError(e, email)); }
    finally { setBusy(false); renderBody(); }
  }

  async function doSignUpPwd() {
    if (busy) return;   // 按钮禁用后回车仍能触发，防重复登录/重复发信
    var email = readEmail(), pw = readPw();
    var pw2 = ui && ui.pw2 ? ui.pw2.value : '';
    if (!email) { setError(loginMode === 'signup' ? '请先填写邮箱。' : '请先填写邮箱或手机号。'); return; }
    if (pw.length < 6) { setError('密码至少 6 位。'); return; }
    if (ui && ui.pw2 && pw !== pw2) { setError('两次输入的密码不一致，请重新确认。'); return; }
    if (!SB || !SB.available()) { setError('登录模块未加载，请刷新页面重试。'); return; }
    try {
      setBusy(true); setError('');
      pwdEmail = email;
      await SB.signUpPassword(email, pw);
      loginSuccess('账号已建立，正在读取你的学习档案…');
    } catch (e) {
      setError(friendlyError(e, email));
      /* 账号已经建好、只差邮件确认：把面板切回登录，确认完直接点登录；
         留在注册页会让人以为没注册成功又点一次。 */
      if (e && (e.code === 'auth/email-confirm-required' ||
                e.code === 'auth/email-already-in-use')) {
        /* 提示里写「直接点登录」，注册页却没有登录按钮；把面板切回登录，
           用户输密码就能进，不必再找返回键。 */
        pwdEmail = email; loginMode = 'password';
      }
    }
    finally { setBusy(false); renderBody(); }
  }

  async function doSendLink() {
    if (busy) return;   // 按钮禁用后回车仍能触发，防重复登录/重复发信
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
      setStatus(trTpl('已发送到 {email}，点邮件里的登录按钮即可完成登录。链接只能用一次，请尽快点击（也可以在垃圾箱里找一下）。', { email: email }), 'ok');
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); syncOtpSendBtn(); }
  }

  /* ---------- 登录动作（重置密码） ---------- */
  async function doSendReset() {
    if (busy) return;   // 按钮禁用后回车仍能触发，防重复登录/重复发信
    var email = ui && ui.email ? ui.email.value.trim() : '';
    if (!email) { setError('请先填写注册时用的邮箱。'); return; }
    if (!SB || !SB.sendRecovery) { setError('登录模块未加载，请刷新页面重试。'); return; }
    var ok = false;
    try {
      setBusy(true); setError('');
      pwdEmail = email;
      await SB.sendRecovery(email);
      startOtpCooldown();   // 60 秒内不许连点，否则会被服务端按频率挡回来
      ok = true;
    } catch (e) { setError(friendlyError(e)); }
    /* 顺序不能反：未登录时 renderBody 会把状态栏重置成「未登录」，
       成功提示必须写在重绘之后，否则用户点完什么都看不到。 */
    finally { setBusy(false); renderBody(); }
    if (ok) setStatus(trTpl('重置链接已发到 {email}，点邮件里的按钮就回到这里设新密码（垃圾箱也翻一下）。', { email: email }), 'ok');
  }

  /* ---------- 登录动作（邮箱验证码） ---------- */
  function readCode() {
    return ui && ui.code ? String(ui.code.value || '').replace(/[^\d]/g, '').slice(0, 6) : '';
  }

  function resetBtnLabel() {
    if (otpCooldown > 0) return trTpl('重新发送 ({seconds}s)', { seconds: otpCooldown });
    return trText('发送重置链接');
  }

  function codeBtnLabel() {
    if (otpCooldown > 0) return trTpl('重新获取 ({seconds}s)', { seconds: otpCooldown });
    return trText(codeSent ? '重新获取' : '获取验证码');
  }

  function syncCodeBtn() {
    if (!ui || !ui.otpSendBtn) return;
    ui.otpSendBtn.disabled = busy || otpCooldown > 0;
    ui.otpSendBtn.textContent = codeBtnLabel();
  }

  async function doSendCode() {
    if (busy) return;   // 按钮禁用后回车仍能触发，防重复登录/重复发信
    var email = readEmail();
    if (!email) { setError('请先填写邮箱。'); return; }
    if (!SB || !SB.codeReady || !SB.codeReady()) { setError('验证码通道尚未启用，请用密码或邮件链接登录。'); return; }
    try {
      setBusy(true); setError('');
      await SB.sendEmailCode(email);
      /* 发送成功后才记“码发给谁”；失败时保留上一个有效地址，避免把
         一次限流失败误当成已发到新邮箱。 */
      otpEmail = email;
      codeSent = true;
      startOtpCooldown();
      renderBody(); // 重绘会把状态栏重置成「未登录」，所以提示必须写在它之后
      setStatus(trTpl('验证码已发到 {email}，收 6 位数字填到下面；没收到先翻垃圾箱。', { email: email }), 'ok');
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); syncCodeBtn(); }
  }

  async function doVerifyCode() {
    if (busy) return;   // 按钮禁用后回车仍能触发，防重复登录/重复发信
    var email = readEmail(), code = readCode();
    if (!email) { setError('请先填写邮箱。'); return; }
    /* 验证码只对发送时那个邮箱有效。邮箱框是可编辑的，只改邮箱不重发码
       会让 verifyOtp 去校验一个从没收到码的地址，用户只看到“验证码错误”。 */
    if (otpEmail && email !== otpEmail) {
      setError(trTpl('验证码已发到 {email}；要换邮箱请重新获取。', { email: otpEmail }));
      return;
    }
    if (code.length !== 6) { setError('请输入邮件里的 6 位数字验证码。'); return; }
    if (!SB || !SB.verifyOtp) { setError('登录模块未加载，请刷新页面重试。'); return; }
    try {
      setBusy(true); setError('');
      await SB.verifyOtp(otpEmail || email, code);
      loginSuccess('登录成功，正在读取你的学习档案…');
    } catch (e) {
      /* 验证码走的是 /verify，不是邮件链接；不能把「验证码过期」说成
         「登录邮件失效」，否则用户会去重发一封根本不需要的邮件。 */
      var codeMsg = e && e.code === 'auth/invalid-code'
        ? '验证码不对或已过期，请重新获取。' : friendlyError(e);
      setError(codeMsg);
    }
    finally { setBusy(false); renderBody(); }
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
    var cleared = true;
    /* 登出前先跟云端对一次账：本机可能停在旧状态，直接 silentPush 整份本机
       会把另一台设备刚做的题冲掉。先按 ts 合并，再推合并结果。 */
    try {
      var outArchive = await auth().getArchive();
      var outCloud = outArchive && outArchive.payload ? canon(outArchive.payload) : null;
      if (outCloud && Object.keys(outCloud).length) {
        var outMerged = mergeLocalWithCloud(outCloud);
        if (hashOf(outMerged) !== localHash() && !applyArchive(outMerged)) {
          console.warn('登出前合并云端档案失败，保留本机进度');
        }
      }
    } catch (e) { /* 离线/读不到云端：保持本机，下面照常尝试推送 */ }
    try { await silentPush(); } catch (e) { /* 离线时下次登录会补 */ }
    /* 登出的这一刻，本机内容都算"已归属当前账号"（没推上去的会留在它自己的
       草稿里）。这里固定一次基线：之后游客再做的才叫无主增量，登录别的账号
       时只把这部分带过去，不会把 A 没同步完的答案串给 B。 */
    saveBase(snapshot(), prof.owner);
    try { cleared = await auth().signOut(); } catch (e) { cleared = false; }
    user = null; nickname = '';
    // owner 保持原 uid：本机副本仍属于该账号，登录别的账号时才会切档。
    otpSent = false;
    /* removeItem 也可能被浏览器拒绝：这时内存里退了，磁盘上的会话还在，
       刷新会悄悄把人登回去。不能继续报「已退出」。 */
    if (cleared === false) setStatus('当前页面已退出，但浏览器拒绝清除登录缓存；刷新后可能仍处于登录状态，请先清出空间再退出', 'warn');
    else setStatus('已退出登录 · 进度仍保留在这台设备', 'plain');
    setError(''); setBusy(false); renderBody();
  }
  /* 从「重置密码」链接回来的：直接把设置面板打开在账户页，
     否则人点了邮件里的按钮只看到首页，根本不知道去哪儿设新密码。
     只在这个标签页里开一次——没设密码就走开的人，之后每次翻页不该被弹窗拦。 */
  function openAuthNoticeOnce() {
    if (!ui || !SB || !SB.takeAuthNotice) return;
    var notice = SB.takeAuthNotice();
    if (!notice) return;
    activeTab = 'account';
    ui.layer.setAttribute('data-open', '1');
    renderBody();
    setError(notice);
  }

  function openRecoveryOnce() {
    if (recoveryOpened || !ui) return;
    if (!SB || !SB.recoveryPending || !SB.recoveryPending() || !user) return;
    try {
      if (sessionStorage.getItem('tdsat_recovery_opened') === '1') return;
      sessionStorage.setItem('tdsat_recovery_opened', '1');
    } catch (e) { /* 存储不可用就按每次开 */ }
    recoveryOpened = true;
    openPanel('account');
  }

  /* 打开面板的唯一入口：开完必须把焦点送进面板。
     只把 data-open 置 1 时焦点仍留在 body 上，键盘用户按 Tab 会直接跑到
     遮罩后面的页面里（aria-modal 写着 true，实际却能被绕过），读屏也会念错上下文。 */
  function openPanel(tab) {
    if (!ui || !ui.layer) return;
    if (tab) activeTab = tab;
    ui.layer.setAttribute('data-open', '1');
    renderBody();
    var panel = ui.root.querySelector('.td-acct-panel');
    var x = panel && panel.querySelector('.td-acct-x');
    try {
      if (x && x.focus) x.focus();
      else if (panel) { panel.setAttribute('tabindex', '-1'); panel.focus(); }
    } catch (e) { console.warn('面板初次聚焦失败', e); }
  }
  /* 面板内的可聚焦元素（当前真实可见、未禁用），用于 Tab 首尾回绕。 */
  function panelFocusables() {
    var panel = ui && ui.root && ui.root.querySelector('.td-acct-panel');
    if (!panel) return [];
    return Array.prototype.filter.call(
      panel.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'),
      function (n) { return !n.disabled && n.getClientRects().length > 0; }
    );
  }

  /* 面板只有一条关闭路径：X、点遮罩、按 Esc 都走这里，
     关掉之后焦点回到入口按钮，键盘用户不会掉到页面开头。 */
  function closePanel() {
    if (!ui || !ui.layer) return;
    ui.layer.setAttribute('data-open', '0');
    if (ui.btn && ui.btn.focus) ui.btn.focus();
  }

  function onState(u) {
    var was = user;
    user = u || null;
    if (user) {
      setError('');   // 登录成功后别把上一次的“密码不对”留在档案块上方
      if (ui) ui.btn.setAttribute('data-on', '1');
      if (!was || was.uid !== user.uid) afterSignIn();
      else renderBody();
      openRecoveryOnce();
    } else {
      nickname = '';
      if (ui) ui.btn.setAttribute('data-on', '0');
      if (was) setStatus('已退出登录 · 进度仍保留在这台设备', 'plain');
      renderBody();
    }
    openAuthNoticeOnce();
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
      '.td-set-tab{flex:1;min-width:0;white-space:nowrap;font:inherit;font-size:13px;font-weight:600;padding:9px 4px;cursor:pointer;',
      'border:0;border-bottom:2px solid transparent;background:transparent;color:var(--sub,#51648a)}',
      '.td-set-tab:hover{color:var(--blue,#2563eb)}',
      '.td-set-tab[data-active="1"]{color:var(--blue,#2563eb);border-bottom-color:var(--blue,#2563eb)}',
      '@media(max-width:400px){.td-set-tabs{gap:0}.td-set-tab{font-size:11.5px;letter-spacing:-.2px;padding:8px 2px}}',
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
      /* 主按钮跟站内 #btnStart 同一套语言：实心强调蓝、胶囊、按下有反馈。
         唯一要注意的是暗色主题把 --blue 换成了近白色，所以这里写死强调蓝，
         不跟着主题变量走，否则暗色下会变成一块白板配白字。 */
      '.td-acct-primary{background:#2563eb!important;border-color:#2563eb!important;color:#fff!important;',
      'border-radius:999px!important;min-height:44px!important;padding:11px 18px!important;font-weight:650!important;',
      'box-shadow:0 1px 3px rgba(37,99,235,.16)!important}',
      '.td-acct-primary:hover{background:#1d4ed8!important;border-color:#1d4ed8!important;box-shadow:0 4px 14px rgba(37,99,235,.24)!important}',
      '.td-acct-primary:active{transform:translateY(1px)}',
      '.td-acct-primary:disabled{opacity:.55!important;box-shadow:none!important}',
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
    x.onclick = function () { closePanel(); };
    head.appendChild(x);
    panel.appendChild(head);
    // 标签栏：账户 / 外观 / 关于
    var tabs = el('div', 'td-set-tabs');
    /* 模考页是英文 Bluebook 界面，语言由页面强制英文；「语言」页签在那儿点了也没用，
       干脆不摆出来（宁可不显示，也不做一个点了不生效的开关）。 */
    var tabDefs = [['account', '账户'], ['appearance', '外观'], ['language', '语言'], ['practice', '练习'], ['about', '关于']];
    if (document.body && document.body.classList.contains('is-mock')) {
      tabDefs = tabDefs.filter(function (p) { return p[0] !== 'language'; });
    }
    if (activeTab === 'language' && tabDefs.every(function (p) { return p[0] !== 'language'; })) activeTab = 'account';
    tabDefs.forEach(function (pair) {
      var t = el('button', 'td-set-tab', pair[1]);
      t.type = 'button';
      t.setAttribute('data-tab', pair[0]);
      t.onclick = function () { activeTab = pair[0]; setError(''); renderBody(); };
      tabs.appendChild(t);
    });
    panel.appendChild(tabs);
    var status = el('div', 'td-acct-status');
    /* 状态与错误都是「异步冒出来的一句话」：读屏默认不会念，键盘用户提交后
       只听到一片安静，以为按钮没生效。给它们 live region，变化时才播报。 */
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    var err = el('div', 'td-acct-err'); err.hidden = true;
    err.setAttribute('role', 'alert');
    err.setAttribute('aria-live', 'assertive');
    var body = el('div');
    panel.appendChild(status); panel.appendChild(err); panel.appendChild(body);
    layer.appendChild(panel);
    layer.addEventListener('click', function (e) { if (e.target === layer) closePanel(); });
    document.addEventListener('keydown', function (e) {
      if (layer.getAttribute('data-open') !== '1') return;
      if (e.key === 'Escape') { e.preventDefault(); closePanel(); return; }
      if (e.key !== 'Tab') return;
      var f = panelFocusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1], a = document.activeElement;
      var inside = !!(a && layer.contains(a));
      if (e.shiftKey && (!inside || a === first)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (!inside || a === last)) { e.preventDefault(); first.focus(); }
    });
    document.body.appendChild(layer);

    var btn = el('button', 'td-acct-btn td-acct-icon-btn');
    btn.type = 'button';
    btn.setAttribute('aria-label', '设置');
    btn.title = '设置';
    setBtnIcon(btn);
    btn.onclick = function () { openPanel(); };

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
    ui.email = null; ui.otpSendBtn = null; ui.pw = null; ui.pw2 = null; ui.code = null;
    if (user) {
      var p = el('div', 'td-prof');
      var initial = (displayName().trim().charAt(0) || defaultNick()).toUpperCase();
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

      var recovering = !!(SB && SB.recoveryPending && SB.recoveryPending());
      if (recovering) {
        b.appendChild(el('p', 'td-acct-note',
          '已经通过重置链接登录，在下面设一个新密码就完成重置。'));
      }
      if (SB && SB.setPassword) {
        var pwField = field('登录密码', 'password', '至少 6 位，设好后可换设备登录', 'new-password');
        var pw2Field = field('确认新密码', 'password', '再输一次', 'new-password');
        b.appendChild(pwField.box);
        b.appendChild(pw2Field.box);
        var pwRow = el('div', 'td-acct-actions');
        var pwSave = el('button', 'td-acct-btn2 td-acct-btn--wide', '保存密码');
        pwSave.setAttribute('data-neutral', '1');
        pwSave.type = 'button'; pwSave.setAttribute('data-busy', '1');
        pwSave.onclick = function () { doSetPassword(pwField.input.value, pw2Field.input.value); };
        [pwField, pw2Field].forEach(function (f) {
          f.input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') doSetPassword(pwField.input.value, pw2Field.input.value);
          });
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
      b.appendChild(el('p', 'td-acct-note', '进度自动保存，换设备登录后接着练。'));
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

    if (loginMode === 'reset') {
      var emReset = field('邮箱', 'email', '注册时用的邮箱', 'email');
      if (seed) emReset.input.value = seed;
      ui.email = emReset.input;
      b.appendChild(el('div', 'td-acct-who', '重置密码'));
      b.appendChild(emReset.box);
      var resetRow = el('div', 'td-acct-actions');
      var resetBtn = el('button', 'td-acct-btn2 td-acct-btn--wide td-acct-primary', resetBtnLabel());
      resetBtn.type = 'button'; resetBtn.setAttribute('data-busy', '1');
      if (otpCooldown > 0) resetBtn.disabled = true;
      ui.otpSendBtn = resetBtn;
      resetBtn.onclick = doSendReset;
      resetRow.appendChild(resetBtn);
      b.appendChild(resetRow);
      emReset.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSendReset(); });
      var backReset = el('button', 'td-acct-linkbtn', '返回登录');
      backReset.type = 'button';
      backReset.onclick = function () { loginMode = 'password'; setError(''); renderBody(); };
      b.appendChild(backReset);
      b.appendChild(el('p', 'td-acct-note',
        '重置链接只发到邮箱。手机号账号没有短信重置；如果还处于登录状态，请在设置里改密码。'));
      return;
    }

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

    if (loginMode === 'code') {
      var emCode = field('邮箱', 'email', 'you@example.com', 'email');
      if (seed) emCode.input.value = seed;
      ui.email = emCode.input;
      b.appendChild(el('div', 'td-acct-who', '邮箱验证码'));
      b.appendChild(emCode.box);

      var sendCode = el('button', 'td-acct-btn2 td-acct-btn--wide', codeBtnLabel());
      sendCode.type = 'button';
      sendCode.setAttribute('data-busy', '1');
      sendCode.setAttribute('data-neutral', '1');
      if (otpCooldown > 0) sendCode.disabled = true;
      sendCode.onclick = doSendCode;
      ui.otpSendBtn = sendCode;
      b.appendChild(sendCode);

      var codeField = field('验证码', 'text', '邮件里的 6 位数字', 'one-time-code');
      codeField.input.inputMode = 'numeric';
      codeField.input.maxLength = 6;
      codeField.input.autocomplete = 'one-time-code';
      ui.code = codeField.input;
      b.appendChild(codeField.box);

      var codeRow = el('div', 'td-acct-actions');
      var verifyBtn = el('button', 'td-acct-btn2 td-acct-btn--wide td-acct-primary', '登录');
      verifyBtn.type = 'button'; verifyBtn.setAttribute('data-busy', '1');
      verifyBtn.onclick = doVerifyCode;
      codeRow.appendChild(verifyBtn);
      b.appendChild(codeRow);

      codeField.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') doVerifyCode(); });

      var backPwd = el('button', 'td-acct-linkbtn', '改用邮箱 / 手机号 + 密码登录');
      backPwd.type = 'button';
      backPwd.onclick = function () { loginMode = 'password'; setError(''); renderBody(); };
      b.appendChild(backPwd);
      b.appendChild(el('p', 'td-acct-note',
        '验证码就在邮件正文里，有效期 1 小时；收不到先去垃圾箱翻一下。'));
      return;
    }

    if (loginMode === 'signup') {
      /* 手机号注册暂未开放（要短信验证），注册框就只写邮箱：
         摆一个「邮箱或手机号」再弹「暂未开通」等于假入口。 */
      var emSign = field('邮箱', 'text', '邮箱', 'username');
      if (seed) emSign.input.value = seed;
      ui.email = emSign.input;
      b.appendChild(el('div', 'td-acct-who', '注册新账号'));
      b.appendChild(emSign.box);

      var pwSign = field('设置密码', 'password', '至少 6 位', 'new-password');
      ui.pw = pwSign.input;
      b.appendChild(pwSign.box);

      var pwSign2 = field('确认密码', 'password', '再输一次', 'new-password');
      ui.pw2 = pwSign2.input;
      b.appendChild(pwSign2.box);

      var signRow = el('div', 'td-acct-actions');
      var signBtn = el('button', 'td-acct-btn2 td-acct-btn--wide td-acct-primary', '注册并登录');
      signBtn.type = 'button'; signBtn.setAttribute('data-busy', '1');
      signBtn.onclick = doSignUpPwd;
      signRow.appendChild(signBtn);
      b.appendChild(signRow);

      var backSign = el('button', 'td-acct-linkbtn', '返回登录');
      backSign.type = 'button';
      backSign.onclick = function () { pwdEmail = readEmail() || pwdEmail; loginMode = 'password'; setError(''); renderBody(); };
      b.appendChild(backSign);

      [pwSign, pwSign2].forEach(function (f) {
        f.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSignUpPwd(); });
      });
      b.appendChild(el('p', 'td-acct-note', '注册完直接登录。'));
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

    var forgot = el('button', 'td-acct-linkbtn', '忘记密码？');
    forgot.type = 'button';
    forgot.onclick = function () {
      pwdEmail = readEmail() || pwdEmail;
      loginMode = 'reset'; setError(''); renderBody();
    };
    b.appendChild(forgot);

    var actions = el('div', 'td-acct-actions td-acct-actions--stack');
    var signIn = el('button', 'td-acct-btn2 td-acct-btn--wide td-acct-primary', '登录');
    signIn.type = 'button'; signIn.setAttribute('data-busy', '1');
    signIn.onclick = doSignInPwd;
    actions.appendChild(signIn);

    var signUp = el('button', 'td-acct-btn2 td-acct-btn--wide', '注册新账号');
    signUp.type = 'button'; signUp.setAttribute('data-busy', '1');
    signUp.setAttribute('data-neutral', '1');
    signUp.onclick = function () { pwdEmail = readEmail() || pwdEmail; loginMode = 'signup'; setError(''); renderBody(); };
    actions.appendChild(signUp);
    b.appendChild(actions);

    em.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSignInPwd(); });
    pw.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSignInPwd(); });

    var onlyLink = el('button', 'td-acct-linkbtn', '改用邮箱链接登录');
    onlyLink.type = 'button';
    onlyLink.onclick = function () { loginMode = 'link'; setError(''); renderBody(); };
    b.appendChild(onlyLink);

    /* 验证码入口只在服务端真的能发码时出现（cloud-config 里 otpCode 打开）。 */
    if (SB && SB.codeReady && SB.codeReady()) {
      var toCode = el('button', 'td-acct-linkbtn', '改用邮箱验证码登录');
      toCode.type = 'button';
      toCode.onclick = function () { loginMode = 'code'; setError(''); renderBody(); };
      b.appendChild(toCode);
    }

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

  /* 说明页按当前界面语言直接出整句：节点里混着换行和数字时，
     逐词替换的词典翻不动，英文模式下会剩半句中文。 */
  function langEn() {
    return !!(window.TDI18n && window.TDI18n.get && window.TDI18n.get() === 'en');
  }

  function renderAboutTab() {
    var b = ui.body;
    var en = langEn();
    b.appendChild(el('div', 'td-acct-who', 'SAT Math'));
    b.appendChild(el('p', 'td-acct-note', en
      ? 'Practice · Unit Quiz · Wrong Answers · Mock Test'
      : '真题练习 · 单元抽查 · 错题回顾 · 模考'));
    b.appendChild(el('p', 'td-acct-note', en
      ? 'Each signed-in user gets a separate study profile; progress saves and follows automatically.'
      : '登录后每位用户都有独立的学习档案，进度自动保存、自动跟随。'));
    b.appendChild(el('p', 'td-acct-note', en
      ? 'Signing in is optional — every feature works without an account.'
      : '登录完全自愿，不登录也能使用全部功能。'));
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
      isPlainPayload: isPlainPayload, applyPayload: applyPayload, applyArchive: applyArchive, applyDraft: applyDraft,
      saveDraft: saveDraft, loadDraft: loadDraft, clearDraft: clearDraft, snapshot: snapshot, localHash: localHash,
      BASE_KEY: BASE_KEY, loadBase: loadBase, saveBase: saveBase, clearBase: clearBase,
      diffTree: diffTree, guestDelta: guestDelta, mergeIntoPayload: mergeIntoPayload };
  } catch (e) { console.warn('合并诊断钩子注册失败', e); }

  function boot() {
    loadProf();
    /* 模考页是英文 Bluebook 界面（exam.html 里把 lang 直接设成 en），
       设置面板跟着英文，不然同一个屏幕上「Settings」配一屏中文。 */
    var mockPage = !!(document.body && document.body.classList.contains('is-mock'));
    if (mockPage && window.TDI18n && window.TDI18n.force) {
      try { window.TDI18n.force('en'); } catch (e) { console.warn('模考页强制英文失败', e); }
    }
    exposeNotify();
    var btn = buildUI();
    mountButton(btn);
    renderBody();
    /* cloud 模块有可能在注册 onState 之前就把「已登录」抛过一次，
       这时 onState 收不到首次状态，重置链接回来的面板就没人开。 */
    openRecoveryOnce();
    if (SB && typeof SB.onState === 'function') SB.onState(function (u) { onState(u); });
    startAutoSave();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
