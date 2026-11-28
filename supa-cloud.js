/* SAT Math — 账号与进度同步后端（Supabase，邮箱 / 手机号登录）。
 *
 * 为什么是 Supabase：identitytoolkit.googleapis.com 在国内不翻墙直接超时；
 * Supabase 的 REST / Auth 接口国内实测可直连。
 *
 * 主通道：**邮箱或手机号 + 密码**（signUpPassword / signInPassword）。本项目 mailer_autoconfirm=true，
 * 注册当场返回 access_token，完全不经过邮件投递，因此不受默认 SMTP 额度影响。
 * 手机号走 idToEmail：11 位大陆号统一补 86，折成 p86…@p.satmath.app 当账号用，
 * 不发短信、不依赖运营商，换设备输同一个号就是同一个账号。
 * 备用通道：**邮件链接登录（magic link）**。
 *   1. sendOtp(email) → POST /auth/v1/otp { email, create_user: true }
 *      邮件里收到一条登录链接（首次登录自动建档，create_user=true）。
 *   2. 用户在邮件里点链接，Supabase 回跳到本站，会话参数带在 `location.hash`
 *      （`#access_token=...&refresh_token=...&expires_in=3600&type=magiclink`）；
 *      `consumeHashSession()` 在页面加载时取出参数，按 packSession 等价路径落
 *      localStorage，再清掉地址栏 hash。
 *
 * [BLOCKED-BY-EXTERNAL] 数字验证码版本：`verifyOtp(email, code)`（6 位码
 * `POST /auth/v1/verify { type: 'email', token, email }`）代码保留未删，但当前
 * 默认 SMTP 下邮件模板被硬门禁锁死、加不进 `{{ .Token }}`，UI 不接这条路径。
 * 等总监提供自定义 SMTP 凭据、模板挂上 `{{ .Token }}` 后，再把面板切回数字码版本。
 *
 * 会话持久：packSession 结构沿用旧版，localStorage key `tdsat_auth_v1`；
 * 刷新页面、关标签页再开、跨标签页（storage 事件）都能恢复；过期用 refresh_token 续期。
 *
 * 对外暴露 window.TDSUPA：cloud-account.js 只关心「谁登录了、档案读/写」，不关心底层细节。
 */
(function () {
  'use strict';

  var CFG = (window.TD_CLOUD_CONFIG || {}).supabase || {};
  var BASE = String(CFG.url || '').replace(/\/+$/, '');
  var KEY = CFG.anonKey || '';
  var SITE_URL = String(CFG.siteUrl || '').replace(/\/+$/, '');
  var SESSION_KEY = 'tdsat_auth_v1';
  var RECOVER_KEY = 'tdsat_recovery_v1';
  var AUTH_NOTICE_KEY = 'tdsat_auth_notice_v1';

  var stateCb = null;
  var session = null;      // { access, refresh, expiresAt, user }
  var currentUser = null;  // 给上层看的精简对象 { uid, email, displayName }
  var sessionWriteFailed = false;
  var revokeOthersFailed = false;

  function available() { return !!(BASE && KEY); }
  /* 没填 URL / anon key 就完全不动 */
  if (!available()) { return; }

  /* ---------- 基础请求 ---------- */
  function errOf(status, body) {
    var o = body || {};
    var msg = o.msg || o.message || o.error_description || o.error || ('HTTP ' + status);
    var e = new Error(msg);
    e.status = status;
    e.__http = status > 0;   // 真 HTTP 错误：catch 里不许再改写成 status 0
    e.raw = o;
    var low = String(msg).toLowerCase();
    /* Supabase 新版在 body 里直接给稳定错误码（error_code / code），英文文案
       可能随版本变化；先认码，再退回文案匹配，注册撞号/弱密码才不会因为
       文案改一句就掉回「操作失败」。 */
    var ec = String(o.error_code || (typeof o.code === 'string' ? o.code : '') || '').toLowerCase();
    var BY_CODE = {
      invalid_credentials: 'auth/invalid-credential',
      email_not_confirmed: 'auth/email-not-confirmed',
      user_already_exists: 'auth/email-already-in-use',
      email_exists: 'auth/email-already-in-use',
      signup_disabled: 'auth/signup-disabled',
      weak_password: 'auth/weak-password',
      same_password: 'auth/same-password',
      email_address_invalid: 'auth/invalid-email',
      otp_expired: 'auth/invalid-code',
      over_request_rate_limit: 'auth/too-many-requests',
      over_email_send_rate_limit: 'auth/too-many-requests'
    };
    if (BY_CODE[ec]) e.code = BY_CODE[ec];
    else if (low.indexOf('invalid login credentials') >= 0) e.code = 'auth/invalid-credential';
    else if (low.indexOf('email not confirmed') >= 0) e.code = 'auth/email-not-confirmed';
    else if (low.indexOf('user already registered') >= 0 || low.indexOf('already been registered') >= 0) e.code = 'auth/email-already-in-use';
    else if (low.indexOf('signups not allowed') >= 0 || low.indexOf('signup is disabled') >= 0 || low.indexOf('signups are disabled') >= 0) e.code = 'auth/signup-disabled';
    else if (low.indexOf('different from the old password') >= 0) e.code = 'auth/same-password';
    else if (low.indexOf('password should be at least') >= 0 || low.indexOf('password should contain') >= 0 || low.indexOf('password is too short') >= 0 || low.indexOf('weak password') >= 0) e.code = 'auth/weak-password';
    else if (low.indexOf('invalid email') >= 0 || low.indexOf('validate email') >= 0) e.code = 'auth/invalid-email';
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
    }).catch(function (e) {
      if (e && e.__http) throw e;     // 401 / 400 这类要原样带上状态码，上层靠它判断是「失效」还是「断网」
      throw errOf(0, { msg: (e && e.message) || '网络异常，请检查连接后重试。' });
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
    if (s) refreshDead = false;   // 重新拿到会话就把「失效」标记复位，否则再登录也进不去
    try {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else localStorage.removeItem(SESSION_KEY);
      sessionWriteFailed = false;
      return true;
    } catch (e) {
      sessionWriteFailed = true;
      console.warn('保存登录状态失败', e);
      return false;
    }
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

  /* 邮件链接回调：解析 location.hash 里的 access_token / refresh_token / expires_in，
     落本地会话后清掉 hash，避免 token 留在地址栏。hash 里不带 user 对象，
     user 由 boot() 随后用 access_token 调 /auth/v1/user 补全。 */
  function authNoticeText(raw) {
    var m = String(raw || '').toLowerCase();
    if (m.indexOf('expired') >= 0 || m.indexOf('invalid') >= 0) return '登录链接已失效或已被使用，请重新发送登录邮件。';
    if (m.indexOf('access_denied') >= 0 || m.indexOf('cancel') >= 0) return '登录链接已被取消，请重新发送登录邮件。';
    return '登录链接没有完成，请重新发送登录邮件。';
  }
  /* 回跳地址栏里带着 access/refresh token，必须立刻擦掉。replaceState 在
     部分老浏览器/隐私模式会抛 SecurityError；只剩一句“兜底”注释时 token
     会留在地址栏和浏览器历史里。逐级退到改 hash、再退到 replace 重载。 */
  function scrubHash() {
    var clean = location.pathname + location.search;
    try { history.replaceState(null, '', clean); return; } catch (e) { /* 试下一级 */ }
    try { location.hash = ''; return; } catch (e) { /* 试下一级 */ }
    try { if (location.replace) location.replace(clean); } catch (e) { /* 已尽力 */ }
  }
  function takeAuthNotice() {
    try {
      var n = sessionStorage.getItem(AUTH_NOTICE_KEY);
      if (n) sessionStorage.removeItem(AUTH_NOTICE_KEY);
      return n || '';
    } catch (e) { return ''; }
  }
  function consumeHashSession() {
    if (typeof location === 'undefined') return false;
    var hash = String(location.hash || '');
    /* 失效/已用的邮件链接回跳只有 error/error_description，没有 access_token。
       旧实现直接 return false，用户点完链接只看到首页，不知道是链接坏了。 */
    if (hash.indexOf('error=') >= 0 || hash.indexOf('error_description=') >= 0) {
      var bp;
      try { bp = new URLSearchParams(hash.slice(1)); } catch (e) { bp = null; }
      if (bp) {
        var raw = bp.get('error_description') || bp.get('error') || '';
        try { sessionStorage.setItem(AUTH_NOTICE_KEY, authNoticeText(raw)); } catch (e) { /* 存储不可写就算了 */ }
        scrubHash();
      }
      return false;
    }
    if (hash.indexOf('access_token=') < 0) return false;
    var params;
    try { params = new URLSearchParams(hash.slice(1)); } catch (e) { return false; }
    var access = params.get('access_token');
    if (!access) return false;
    var expiresAt;
    var expAt = Number(params.get('expires_at'));
    if (expAt > 0) expiresAt = expAt * 1000 - 30000;
    else expiresAt = Date.now() + ((Number(params.get('expires_in')) || 3600) * 1000) - 30000;
    /* 记住这是「重置密码」链接回来的：面板这时应该引导设新密码，
       否则用户会以为自己只是莫名登录了。 */
    try {
      if (String(params.get('type') || '') === 'recovery') localStorage.setItem(RECOVER_KEY, '1');
      else clearRecovery();   // 普通登录链接不能继承上一封重置邮件的待设密码状态
    } catch (e) { /* 本地存储不可写也不影响登录 */ }
    saveSession({
      access: access,
      refresh: params.get('refresh_token') || '',
      expiresAt: expiresAt,
      user: {}
    });
    scrubHash();
    return true;
  }
  function toUser(u) {
    if (!u || !u.id) return null;
    var meta = u.user_metadata || {};
    return {
      uid: u.id,
      email: u.email || '',
      displayName: meta.display_name || meta.nickname || ''
    };
  }
  function emit() {
    currentUser = session ? toUser(session.user) : null;
    if (stateCb) stateCb(currentUser);
  }

  /* 续期：单飞。两个标签页 + 定时器同时打 refresh，Supabase 会轮换 refresh_token，
     后到的那次必然 invalid_grant；之前这里一失败就把本地会话删了，刷新一次就退登录。 */
  var refreshing = null;
  var refreshDead = false;   // 服务端明确说 refresh_token 不能用了

  function needsRefresh() { return !!(session && session.expiresAt && Date.now() >= session.expiresAt); }

  var retryTimer = 0;
  function scheduleRetry() {
    if (retryTimer) return;
    retryTimer = setTimeout(function () { retryTimer = 0; ensureFresh(true); }, 30000);
    if (retryTimer && retryTimer.unref) retryTimer.unref();   // 别拖住进程/测试退出
  }

  async function ensureFresh(force) {
    if (!session) return null;
    if (refreshDead) return null;
    if (!force && !needsRefresh()) return session;
    if (!session.refresh) return session;      // 没 refresh_token 也别把人踢下线
    if (refreshing) return refreshing;
    refreshing = (async function () {
      try {
        var r = await raw('/auth/v1/token?grant_type=refresh_token', {
          method: 'POST',
          headers: authHeaders(null),
          body: JSON.stringify({ refresh_token: session.refresh }),
          timeout: 15000
        });
        var s = packSession(r);
        if (!s) throw errOf(400, { msg: '续期没有拿到新会话' });
        s.user = r.user || session.user;
        saveSession(s);
        return s;
      } catch (e) {
        /* 只有服务端明确拒绝（400/401）才算真的失效；断网、超时、5xx 一律保留会话 */
        if (e && (e.status === 400 || e.status === 401)) {
          console.warn('登录已失效，需要重新登录', e);
          refreshDead = true;
          saveSession(null);
          return null;
        }
        console.warn('续期暂时失败，保留登录状态稍后重试', e);
        scheduleRetry();
        return session;
      } finally { refreshing = null; }
    })();
    return refreshing;
  }

  /* 兼容旧名字 */
  async function refreshIfNeeded() { return ensureFresh(false); }

  var booted = null;
  function boot() {
    if (booted) return booted;
    booted = (async function () {
      consumeHashSession();
      session = loadSession();
      if (!session) { emit(); return; }
      session = await ensureFresh(false);
      if (!session) { emit(); return; }
      var u = null;
      try {
        u = await raw('/auth/v1/user', { headers: authHeaders(session.access), timeout: 15000 });
      } catch (e) {
        if (e && e.status === 401 && !refreshDead) {
          /* access 过期：换一次新票再试。只有真的换到新票、且新票仍被拒，才算失效；
             断网时 ensureFresh 返回的是旧票，这时保持登录态，等联网再补 */
          var prevAccess = session.access;
          var s2 = await ensureFresh(true);
          if (!s2) { emit(); return; }
          if (!s2.access || s2.access === prevAccess) { scheduleRetry(); }
          else {
            try { u = await raw('/auth/v1/user', { headers: authHeaders(s2.access), timeout: 15000 }); }
            catch (e2) { if (e2 && e2.status === 401) { saveSession(null); emit(); return; } }
          }
        } else if (e && e.status !== 401) {
          scheduleRetry();   // 断网 / 超时：保持登录态，联网后自动补
        }
      }
      if (u && u.id) { session.user = u; saveSession(session); }
      emit();
    })();
    return booted;
  }

  async function token() {
    await boot();
    session = await ensureFresh(needsRefresh());
    if (!session) throw errOf(401, { msg: '登录状态已失效，请重新登录。' });
    return session.access;
  }

  function sessionFrom(r) {
    var s = packSession(r);
    if (!s) throw errOf(400, { msg: '登录失败，请重试。' });
    saveSession(s);
    /* 正常密码 / 验证码登录成功后，之前那封重置邮件的「待设密码」标记
       已经过时；不清掉会让下一次登录继续弹重置提示。 */
    clearRecovery();
    emit();
    return currentUser;
  }

  /* ---------- 邮箱 / 手机号 + 密码（不依赖邮件投递，注册即可用） ---------- */
  /* 下限 8 位是产品规则；上限 72 位是 Supabase/GoTrue 的密码硬上限（bcrypt
     只吃 72 字节）。不拦的话，用户把很长一段贴进来，服务端要么直接拒、
     要么截断，界面上只会看到一句莫名其妙的错误。 */
  /* bcrypt 的上限是 72 **字节**，不是 72 个字符。一个汉字/表情在 UTF-8 里占
     3 个字节，72 个汉字就是 216 字节，服务端要么拒、要么静默截断到前 72 字节，
     用户下次拿同一串密码登录却对不上。这里按字节算。 */
  function pwBytes(v) {
    var s = String(v || '');
    try { if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s).length; }
    catch (e) { /* 极老浏览器兜底 */ }
    try { return encodeURIComponent(s).replace(/%[A-F0-9]{2}/g, 'x').length; } catch (e) { return s.length; }
  }
  function pwProblem(v) {
    var n = String(v || '').length;
    if (n < 8) return '密码至少 8 位。';
    if (pwBytes(v) > 72) return '密码太长了，请删短一点再试（中文和表情占的空间更多）。';
    return '';
  }

  /* 手机号当账号用：去掉空格/横线，补国家码，再折成项目内部的登录标识。
     规则：11 位且以 1 开头按中国大陆手机号，统一补 86，
     所以「13800138000」「+86 138-0013-8000」「8613800138000」是同一个账号。 */
  var INTERNAL_MAIL_DOMAIN = 'p.satmath.app';
  function isInternalEmail(v) {
    var s = String(v || '').trim().toLowerCase();
    var at = s.lastIndexOf('@');
    return at > 0 && s.slice(at + 1) === INTERNAL_MAIL_DOMAIN;
  }
  function rejectInternalMail(id) {
    /* 手机号折出来的 p...@p.satmath.app 是内部账号标识。普通用户不能拿这个
       域名直接注册/登录，否则抢注一个伪邮箱就能占住别人的手机号账号，或
       把系统内部命名空间变成可登录入口。 */
    if (!id.phone && isInternalEmail(id.email)) {
      throw errOf(400, { msg: '这个地址是系统内部账号，不能直接注册或登录；手机号请直接填号码，邮箱请用普通邮箱。' });
    }
  }
  function idToEmail(v) {
    var s = String(v || '').trim();
    var d = s.replace(/[\s\-()]/g, '');
    if (/^\+?\d{7,15}$/.test(d)) {
      /* 显式写了 +/00 国家码的号码不能当「中国大陆 11 位手机号」再补 86：
         +1 4155550123 会被错折成 p8614155550123，和本机 10 位号码成了两个账号。 */
      var explicitCc = d.charAt(0) === '+' || d.indexOf('00') === 0;
      d = d.replace(/^\+/, '');
      if (d.indexOf('00') === 0) d = d.slice(2);
      if (!explicitCc && d.length === 11 && d.charAt(0) === '1') d = '86' + d;
      return { email: 'p' + d + '@p.satmath.app', phone: true };
    }
    return { email: s, phone: false };
  }

  async function signUpPassword(email, password, name) {
    var id = idToEmail(email);
    var mail = id.email;
    var pw = String(password || '');
    if (!id.phone && !validEmail(mail)) throw errOf(400, { msg: '邮箱或手机号格式不正确，请检查后再试。' });
    rejectInternalMail(id);
    /* 手机号注册没有短信验证：谁都能输入任意号码占号，真正号码主人之后
       反而注册不了、也找不回密码。这不是正常软件该有的注册入口；在接入
       短信验证前只保留已有手机号账号的登录。 */
    if (id.phone) {
      var ce = errOf(400, { msg: '手机号注册需要短信验证，当前暂未开通；请用邮箱注册。已有手机号账号可以直接登录。' });
      ce.code = 'auth/phone-signup-closed';
      throw ce;
    }
    var pwErr = pwProblem(pw);
    if (pwErr) throw errOf(400, { msg: pwErr });
    var body = { email: mail, password: pw };
    if (name) body.data = { display_name: String(name).slice(0, 24) };
    var r = await raw('/auth/v1/signup', {
      method: 'POST', headers: authHeaders(null), body: JSON.stringify(body), timeout: 25000
    });
    if (!r || !r.access_token) {
      /* 后端开了邮箱确认时 signup 只返回 user、不返回会话。账号已经建好，
         再点一次注册只会撞号；必须告诉用户去点确认邮件，而不是“点登录试试”。 */
      if (r && r.user) {
        if (id.phone) {
          var pe = errOf(400, { msg: '手机号注册没有直接登录成功；这个号码没有可收确认邮件的邮箱，请稍后重试，或改用邮箱注册。' });
          pe.code = 'auth/phone-signup-no-session';
          throw pe;
        }
        /* Supabase 开了邮箱确认后，重复邮箱会返回一个 identities 为空的
           假 user，既不发确认邮件，也不报 already exists。把它当成“注册成功
           等确认”，用户会一直等一封不会来的信。 */
        if (Array.isArray(r.user.identities) && r.user.identities.length === 0) {
          var ee = errOf(400, { msg: '这个邮箱已经注册过了。设过密码就直接登录；没设过密码，用下面的「改用邮箱链接登录」或「忘记密码」。' });
          ee.code = 'auth/email-already-in-use';
          throw ee;
        }
        var ne = errOf(400, { msg: '注册成功，但还需要去邮箱点确认链接；确认后再回来登录。' });
        ne.code = 'auth/email-confirm-required';
        throw ne;
      }
      throw errOf(400, { msg: '注册没有返回登录态，请刷新页面后重试。' });
    }
    return sessionFrom(r);
  }

  async function signInPassword(email, password) {
    var id = idToEmail(email);
    var mail = id.email;
    var pw = String(password || '');
    if (!id.phone && !validEmail(mail)) throw errOf(400, { msg: '邮箱或手机号格式不正确，请检查后再试。' });
    rejectInternalMail(id);
    if (!pw) throw errOf(400, { msg: '请输入密码。' });
    var r = await raw('/auth/v1/token?grant_type=password', {
      method: 'POST', headers: authHeaders(null),
      body: JSON.stringify({ email: mail, password: pw }), timeout: 25000
    });
    return sessionFrom(r);
  }

  /* 已登录状态改密码：换设备登录、忘了邮件链接都能靠它自救 */
  /* 面板上显示「你是哪个账号」：手机号打码成 138****8000，邮箱打码成 ti***@x.com。
     不做登录用，只做识别，所以不放进任何同步字段。 */
  function maskAccount(v) {
    var s = String(v || '').trim();
    var m = s.match(/^p(\d+)@p\.satmath\.app$/);
    if (m) {
      var d = m[1];
      if (d.length === 13 && d.indexOf('86') === 0) d = d.slice(2);
      return d.length >= 7 ? d.slice(0, 3) + '****' + d.slice(-4) : d;
    }
    var at = s.indexOf('@');
    if (at > 0) {
      var a = s.slice(0, at), b = s.slice(at + 1);
      return a.slice(0, Math.min(2, a.length)) + '***@' + b;
    }
    return s;
  }

  async function setPassword(password) {
    revokeOthersFailed = false;
    var pw = String(password || '');
    var pwErr = pwProblem(pw);
    if (pwErr) throw errOf(400, { msg: pwErr });
    var tk = await token();
    await raw('/auth/v1/user', {
      method: 'PUT', headers: authHeaders(tk),
      body: JSON.stringify({ password: pw }), timeout: 20000
    });
    /* 改完密码只换当前这台设备不够：别的设备上旧的 refresh token 还能续，
       密码等于白改。Supabase 的 scope=others 会踢掉除当前会话外的所有会话；
       这一步失败不回滚密码，也不能让用户以为没改成，只记日志下次再说。 */
    try {
      await raw('/auth/v1/logout?scope=others', {
        method: 'POST', headers: authHeaders(tk), body: '{}', timeout: 15000
      });
    } catch (e) {
      revokeOthersFailed = true;
      try { console.warn('revoke other sessions failed:', e && e.message); } catch (e2) {}
    }
    return true;
  }

  /* ---------- 重置密码（邮件链接） ---------- */
  /* 忘了密码的人不该被卡死。Supabase 免费版发链接是通的（只是模板改不了），
     recover 走的就是这条链接：点回站带 #type=recovery 的会话，随后用
     setPassword 覆盖旧密码，全程不需要自定义 SMTP。 */
  async function sendRecovery(email) {
    var id = idToEmail(email);
    if (id.phone) throw errOf(400, { msg: '这个账号是手机号，收不到重置邮件。' });
    if (!validEmail(id.email)) throw errOf(400, { msg: '邮箱格式不正确，请检查后再发送重置链接。' });
    rejectInternalMail(id);
    var body = { email: id.email };
    var path = '/auth/v1/recover';
    if (SITE_URL) {
      var redirectTo = SITE_URL + '/';
      body.redirect_to = redirectTo;
      path += '?redirect_to=' + encodeURIComponent(redirectTo);
    }
    await raw(path, {
      method: 'POST', headers: authHeaders(null),
      body: JSON.stringify(body), timeout: 20000
    });
    return true;
  }

  function recoveryPending() {
    try { return localStorage.getItem(RECOVER_KEY) === '1'; } catch (e) { return false; }
  }
  function clearRecovery() {
    try { localStorage.removeItem(RECOVER_KEY); } catch (e) { /* 忽略 */ }
    try { sessionStorage.removeItem('tdsat_recovery_opened'); } catch (e) { /* 忽略 */ }
  }

  /* ---------- 邮箱登录 ---------- */
  /* RFC 5321 的地址总长上限是 254；超过这个长度 Supabase 也会拒。登录、
     找回密码、发验证码都走这里，不能只在注册页拦。 */
  function validEmail(v) {
    var s = String(v || '').trim();
    return s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  }

  /* 重发注册确认邮件。邮箱确认开着时，用户第一次的确认信可能没收到/进了
     垃圾箱；没有这个入口，账号就卡在“未确认”状态进不去。 */
  async function resendConfirmation(email) {
    var id = idToEmail(email);
    var mail = id.email;
    if (id.phone) throw errOf(400, { msg: '这个账号是手机号，收不到确认邮件。' });
    if (!validEmail(mail)) throw errOf(400, { msg: '邮箱格式不正确，请检查后再重发。' });
    rejectInternalMail(id);
    await raw('/auth/v1/resend', {
      method: 'POST', headers: authHeaders(null),
      body: JSON.stringify({ type: 'signup', email: mail }), timeout: 20000
    });
    return true;
  }

  // 发送登录邮件：create_user=true，首次输入邮箱即自动建档（后端 disable_signup:false）。
  // 当前后端默认邮件模板回的是 magic link（点链接回站带 hash 会话），不是数字码。
  async function sendOtp(email) {
    var id = idToEmail(email);
    var mail = id.email;
    /* 手机号折出来的 p86…@p.satmath.app 只是账号标识，那个域名收不到信；
       在这里挡住，否则会假装发出、用户永远等不到邮件。 */
    if (id.phone) throw errOf(400, { msg: '手机号请用密码登录，登录邮件只发到邮箱。' });
    if (!validEmail(mail)) throw errOf(400, { msg: '邮箱格式不正确，请检查后再发送登录邮件。' });
    rejectInternalMail(id);
    var body = { email: mail, create_user: true };
    /* 显式带 redirect_to：否则后端按后台 Site URL 回跳，可能落到站点根、丢掉
       /SAT-Math/ 路径段，导致回跳 hash 接不到本站壳页。
       实测本项目 GoTrue 从 **query string** 读 redirect_to，body 字段会被忽略；
       两处都带上，兼容不同版本。 */
    var otpPath = '/auth/v1/otp';
    if (SITE_URL) {
      var redirectTo = SITE_URL + '/';
      body.redirect_to = redirectTo;
      otpPath += '?redirect_to=' + encodeURIComponent(redirectTo);
    }
    await raw(otpPath, {
      method: 'POST',
      headers: authHeaders(null),
      body: JSON.stringify(body),
      timeout: 20000
    });
    return true;
  }

  /* 验证码通道开关：只有「自定义 SMTP + 模板里有 {{ .Token }} + 码长 6」都配好了，
     cloud-config.js 里 supabase.otpCode 才会是 true。开关没打开时，面板不渲染
     任何验证码入口——宁可不显示，也不做点了收不到码的假按钮。 */
  function codeReady() {
    var c = window.TD_CLOUD_CONFIG && window.TD_CLOUD_CONFIG.supabase;
    return !!(c && c.otpCode === true && available());
  }

  // 发码：和发登录邮件同一个端点，区别只在邮件模板里有没有 {{ .Token }}。
  // 模板配好后用户收到的正文就是 6 位数字；模板没配好时它只发链接，所以只有在
  // codeReady() 为真时 UI 才允许调用。
  async function sendEmailCode(email) {
    var id = idToEmail(email);
    if (id.phone) throw errOf(400, { msg: '手机号请用密码登录，验证码只发到邮箱。' });
    var mail = id.email;
    if (!validEmail(mail)) throw errOf(400, { msg: '邮箱格式不正确，请检查后再获取验证码。' });
    rejectInternalMail(id);
    var body = { email: mail, create_user: true };
    var otpPath = '/auth/v1/otp';
    if (SITE_URL) {
      var redirectTo = SITE_URL + '/';
      body.redirect_to = redirectTo;
      otpPath += '?redirect_to=' + encodeURIComponent(redirectTo);
    }
    await raw(otpPath, {
      method: 'POST',
      headers: authHeaders(null),
      body: JSON.stringify(body),
      timeout: 20000
    });
    return true;
  }

  // [BLOCKED-BY-EXTERNAL] 6 位数字验证码换会话。当前默认 SMTP 模板加不进
  // {{ .Token }}，此路径不接 UI；等自定义 SMTP + 模板改造完成后再启用。
  async function verifyOtp(email, code) {
    var id = idToEmail(email);
    if (id.phone) throw errOf(400, { msg: '手机号请用密码登录，验证码只发到邮箱。' });
    var mail = id.email;
    var token = String(code || '').trim();
    if (!validEmail(mail)) throw errOf(400, { msg: '邮箱格式不正确，请检查后再发送登录邮件。' });
    rejectInternalMail(id);
    if (!/^\d{6}$/.test(token)) throw errOf(400, { msg: '请输入邮件里收到的 6 位数字验证码。' });
    var r = await raw('/auth/v1/verify', {
      method: 'POST',
      headers: authHeaders(null),
      body: JSON.stringify({ type: 'email', token: token, email: mail }),
      timeout: 20000
    });
    return sessionFrom(r);
  }

  /* 跨标签页同步：别的标签页登录 / 退出后，本页按 localStorage 会话快照校正状态。 */
  window.addEventListener('storage', function (ev) {
    if (ev.key !== SESSION_KEY) return;
    session = loadSession();
    emit();
    if (session) refreshIfNeeded();
  });

  /* ---------- 对外 API ---------- */
  window.TDSUPA = {
    available: available,
    backend: 'supabase',

    onState: function (cb) {
      stateCb = cb;
      boot().then(function () { cb(currentUser); });
    },
    user: function () { return currentUser; },

    sendOtp: sendOtp,
    sendMagicLink: sendOtp,
    sendEmailCode: sendEmailCode,
    codeReady: codeReady,
    signUpPassword: signUpPassword,
    signInPassword: signInPassword,
    maskAccount: maskAccount,
    sessionWriteFailed: function () { return sessionWriteFailed; },
    revokeOthersFailed: function () { return revokeOthersFailed; },
    setPassword: setPassword,
    sendRecovery: sendRecovery,
    resendConfirmation: resendConfirmation,
    recoveryPending: recoveryPending,
    clearRecovery: clearRecovery,
    takeAuthNotice: takeAuthNotice,
    verifyOtp: verifyOtp,

    signOut: async function () {
      var tk = session && session.access;
      var cleared = saveSession(null);
      clearRecovery();
      emit();
      if (tk) {
        try {
          await raw('/auth/v1/logout', { method: 'POST', headers: authHeaders(tk), timeout: 10000 });
        } catch (e) { /* 本地已经退出，服务端失败无所谓 */ }
      }
      return cleared;
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
          body: JSON.stringify({ data: { display_name: clean } }),
          timeout: 15000
        });
        if (r && r.id) { session.user = r; saveSession(session); currentUser = toUser(r); }
      } catch (e) { /* 元数据失败不影响本地昵称 */ }
      return clean;
    }
  };

  window.addEventListener('online', function () { ensureFresh(true); });

  // 后台每 20 分钟续期一次，避免长时间刷题后被踢下线
  setInterval(function () { if (session) refreshIfNeeded(); }, 20 * 60 * 1000);
})();
