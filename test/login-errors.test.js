/* 登录错误提示与登录态持久化的回归：
   1) GoTrue 的 Email not confirmed 在 supa-cloud 里归一成 -confirmed，面板却
      只认 -confirm，用户会直接看到英文报错；
   2) 验证码过期不能提示成「登录邮件失效」；
   3) 手机号带括号/空格时不能被误判成邮箱；
   4) 退出登录失败不能假装已经退出；会话写盘失败要能告警。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const acct = fs.readFileSync(path.join(ROOT, 'cloud-account.js'), 'utf8');
const cloud = fs.readFileSync(path.join(ROOT, 'supa-cloud.js'), 'utf8');

function accountFns() {
  const start = acct.indexOf('function isPhoneAccount');
  const end = acct.indexOf('function loadProf');
  const src = acct.slice(start, end);
  return new Function(src + '; return { isPhoneAccount: isPhoneAccount, friendlyError: friendlyError };')();
}

test('手机号识别接受国家码、空格、横线和括号，别把账号说成邮箱', () => {
  const { isPhoneAccount } = accountFns();
  assert.equal(isPhoneAccount('+1 (415) 555-0123'), true);
  assert.equal(isPhoneAccount('+86 138-0013-8000'), true);
  assert.equal(isPhoneAccount('13800138000'), true);
  assert.equal(isPhoneAccount('you@example.com'), false);
  assert.equal(isPhoneAccount('1234'), false);
  const { friendlyError } = accountFns();
  assert.match(friendlyError({ code: 'auth/email-already-in-use' }, '+1 (415) 555-0123'), /这个手机号已经注册过了/);
  assert.match(friendlyError({ code: 'auth/email-already-in-use' }, 'you@example.com'), /这个邮箱已经注册过了/);
});

test('注册撞号提示跟着账号类型走', () => {
  const src = acct.slice(acct.indexOf('async function doSignUpPwd'), acct.indexOf('async function doSendLink'));
  assert.match(src, /friendlyError\(e, email\)/, '注册失败没把输入账号传给错误提示');
});

test('未验证邮箱的登录错误给出可执行的下一步', () => {
  const { friendlyError } = accountFns();
  const msg = friendlyError({ code: 'auth/email-not-confirmed' });
  assert.match(msg, /邮箱还没有验证/);
  assert.match(msg, /确认链接/);
  assert.doesNotMatch(msg, /Email not confirmed/);
});

test('验证码过期提示重新获取，不说成登录邮件失效', () => {
  const seg = acct.slice(acct.indexOf('async function doVerifyCode'), acct.indexOf('async function saveNickname'));
  assert.match(seg, /验证码不对或已过期，请重新获取/);
  assert.match(seg, /auth\/invalid-code/);
});

test('普通登录清掉过期的重置标记，退出登录也清', () => {
  const from = cloud.slice(cloud.indexOf('function sessionFrom'), cloud.indexOf('async function setPassword'));
  assert.match(from, /clearRecovery\(\)/, '正常登录没清重置标记');
  const consume = cloud.slice(cloud.indexOf('function authNoticeText'), cloud.indexOf('function toUser'));
  assert.match(consume, /else clearRecovery\(\)/, '普通登录链接继承了重置标记');
  const out = cloud.slice(cloud.indexOf('signOut: async function'), cloud.indexOf('/* ---------- 学习档案'));
  assert.match(out, /clearRecovery\(\)/, '退出登录没清重置标记');
});

test('会话写盘失败能告警，退出失败不只说已退出', () => {
  assert.match(cloud, /sessionWriteFailed = true/, 'saveSession 没记录写失败');
  assert.match(cloud, /sessionWriteFailed: function \(\)/, '没有暴露 sessionWriteFailed');
  assert.match(acct, /SB\.sessionWriteFailed/, '登录成功没检查会话是否落盘');
  assert.match(acct, /浏览器存储不可写；刷新后需要重新登录/, '会话没落盘仍报普通成功');
  assert.match(cloud, /return cleared;/, 'signOut 没返回清除结果');
  assert.match(acct, /浏览器拒绝清除登录缓存；刷新后可能仍处于登录状态/, '退出失败仍报已退出');
});

test('登录/发信动作防重复提交，邮箱框回车也能登录', () => {
  const fns = ['doSetPassword', 'doSignInPwd', 'doSignUpPwd', 'doSendLink', 'doSendReset', 'doSendCode', 'doVerifyCode'];
  for (const fn of fns) {
    const seg = acct.slice(acct.indexOf('async function ' + fn));
    assert.match(seg.slice(0, 200), /if \(busy\) return/, fn + ' 没防重复提交');
  }
  assert.match(acct, /em\.input\.addEventListener\('keydown', function \(e\) \{ if \(e\.key === 'Enter'\) doSignInPwd\(\); \}\)/, '邮箱框回车没触发登录');
  const onState = acct.slice(acct.indexOf('function onState'), acct.indexOf('function buildUI'));
  assert.match(onState, /setError\(''\)/, '登录成功没清掉旧的错误提示');
});

test('失效/已用登录链接回跳会留下可展示的提示，不再静默停在首页', () => {
  const consume = cloud.slice(cloud.indexOf('function authNoticeText'), cloud.indexOf('function toUser'));
  assert.match(consume, /error_description/, '没解析 error_description');
  assert.match(consume, /AUTH_NOTICE_KEY/, '没把链接错误存成提示');
  assert.match(consume, /登录链接已失效或已被使用/, '失效链接没有用户能看懂的话');
  assert.match(cloud, /takeAuthNotice: takeAuthNotice/, '没暴露 takeAuthNotice');
  const acctNotice = acct.slice(acct.indexOf('function openAuthNoticeOnce'), acct.indexOf('function openRecoveryOnce'));
  assert.match(acctNotice, /takeAuthNotice/);
  assert.match(acctNotice, /setError\(notice\)/, '拿到提示却没显示');
  assert.match(acct.slice(acct.indexOf('function onState'), acct.indexOf('function buildUI')), /openAuthNoticeOnce\(\)/);
});

test('内部手机号伪邮箱不能当普通邮箱注册/登录，避免抢注占号', () => {
  assert.match(cloud, /p\.satmath\.app/, '没识别内部伪邮箱域名');
  assert.match(cloud, /function rejectInternalMail/, '没有统一拦截口');
  const fns = ['signUpPassword', 'signInPassword', 'sendRecovery', 'sendOtp', 'sendEmailCode', 'verifyOtp'];
  for (const fn of fns) {
    const seg = cloud.slice(cloud.indexOf('async function ' + fn), cloud.indexOf('async function ', cloud.indexOf('async function ' + fn) + 20));
    assert.match(seg, /rejectInternalMail\(id\)/, fn + ' 没拦截内部伪邮箱');
  }
});

test('注册成功但待邮箱确认时，提示去点确认链接而不是再点登录', () => {
  const signup = cloud.slice(cloud.indexOf('async function signUpPassword'), cloud.indexOf('async function signInPassword'));
  assert.match(signup, /auth\/email-confirm-required/, '没区分“账号已建、待确认”');
  assert.match(signup, /去邮箱点确认链接/, '待确认提示没告诉用户下一步');
  const { friendlyError } = accountFns();
  assert.match(friendlyError({ code: 'auth/email-confirm-required' }), /邮箱还没有验证/);
});

test('注册错误码：弱密码/停注册/非法邮箱给中文提示，不甩英文原文', () => {
  const { friendlyError } = accountFns();
  assert.match(friendlyError({ code: 'auth/weak-password' }), /密码太短|强度不够/);
  assert.match(friendlyError({ code: 'auth/signup-disabled' }), /暂未开放新账号注册/);
  assert.match(friendlyError({ code: 'auth/invalid-email' }), /邮箱格式不正确/);
  assert.match(cloud, /password should be at least/, '没把 GoTrue 弱密码错误归一');
  assert.match(cloud, /signups not allowed/, '没把停注册错误归一');
});

test('注册是独立表单：必须确认密码，避免输错密码直接建号', () => {
  assert.match(acct, /loginMode === 'signup'/, '没有独立注册面板');
  assert.match(acct, /确认密码/, '缺确认密码输入框');
  assert.match(acct, /ui\.pw2/, '确认密码框没被读取');
  const fn = acct.slice(acct.indexOf('async function doSignUpPwd'), acct.indexOf('async function doSendLink'));
  assert.match(fn, /两次输入的密码不一致/, '两次密码不同没有拦住');
  assert.match(fn, /pw2/, '注册提交没比对确认密码');
  assert.match(acct, /loginMode = 'signup'/, '登录页的注册按钮没切到注册表单');
});
