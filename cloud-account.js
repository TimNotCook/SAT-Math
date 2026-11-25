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
