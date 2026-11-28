/* 忘记密码：用 Supabase 的邮件重置链接（免费版能发链接，改不了模板也能用）。
   检查三件事：发的端点对不对、面板有没有入口、点回来知不知道自己是来设密码的。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const cloud = fs.readFileSync(path.join(ROOT, 'supa-cloud.js'), 'utf8');
const acct = fs.readFileSync(path.join(ROOT, 'cloud-account.js'), 'utf8');

test('重置密码走 /auth/v1/recover 且带 redirect_to', () => {
  assert.ok(/async function sendRecovery\(email\)/.test(cloud), '缺 sendRecovery');
  assert.ok(/['"]\/auth\/v1\/recover['"]/.test(cloud), '端点必须是 /auth/v1/recover');
  assert.ok(/redirect_to=/.test(cloud), 'redirect_to 要进 query');
  assert.ok(/sendRecovery: sendRecovery/.test(cloud), 'sendRecovery 没导出');
});

test('手机号账号不会被假装发一封重置邮件', () => {
  const body = cloud.slice(cloud.indexOf('async function sendRecovery'));
  assert.ok(/id\.phone/.test(body.slice(0, 400)), '手机号要先挡住');
});

test('recovery 回跳会被记住', () => {
  assert.ok(/type.*recovery|recovery.*type/s.test(cloud.slice(cloud.indexOf('function consumeHashSession'), cloud.indexOf('function toUser'))),
    'consumeHashSession 没记 type=recovery');
  assert.ok(/tdsat_recovery_v1/.test(cloud), '缺 recovery 标记 key');
  assert.ok(/recoveryPending: recoveryPending/.test(cloud), 'recoveryPending 没导出');
});

test('面板上有「忘记密码」入口和重置页', () => {
  assert.ok(/'忘记密码？'/.test(acct), '缺「忘记密码？」入口');
  assert.ok(/'发送重置链接'/.test(acct), '缺发送按钮');
  assert.ok(/loginMode === 'reset'/.test(acct), '缺 reset 面板');
  assert.ok(/doSendReset/.test(acct), '没接 doSendReset');
});

test('从重置链接回来会自动把面板打开在账户页', () => {
  assert.ok(/function openRecoveryOnce/.test(acct), '缺 openRecoveryOnce');
  assert.ok(acct.split('function openRecoveryOnce').length === 2, 'openRecoveryOnce 被重复定义');
  const seg = acct.slice(acct.indexOf('function openRecoveryOnce'));
  assert.ok(/recoveryPending/.test(seg.slice(0, 400)), 'openRecoveryOnce 里没检查 recovery 标记');
  assert.ok(/tdsat_recovery_opened/.test(seg.slice(0, 400)), '没有「每个标签页只开一次」的存储守卫');
  assert.ok(/openRecoveryOnce\(\);/.test(acct.slice(acct.indexOf('function boot'))), 'boot 里没调 openRecoveryOnce');
  assert.ok(/openRecoveryOnce\(\);/.test(acct.slice(acct.indexOf('function onState')), acct.indexOf('function onState') + 900), 'onState 里没调 openRecoveryOnce');
});

test('设完密码清掉标签页守卫，下次重置还能自动开', () => {
  const seg = cloud.slice(cloud.indexOf('function clearRecovery'));
  assert.ok(/tdsat_recovery_opened/.test(seg.slice(0, 200)), 'clearRecovery 没清 sessionStorage 守卫');
});

test('发过重置链接后按钮进 60 秒冷却，不许连点', () => {
  assert.ok(/function resetBtnLabel/.test(acct), '缺 resetBtnLabel');
  const seg = acct.slice(acct.indexOf('async function doSendReset'));
  assert.ok(/startOtpCooldown/.test(seg.slice(0, 700)), '发成功后没进冷却');
});

test('设好新密码后清掉 recovery 标记', () => {
  const seg = acct.slice(acct.indexOf('async function doSetPassword'));
  assert.ok(/clearRecovery/.test(seg.slice(0, 700)), '设密码后没清标记');
});

test('设置面板能按 Esc 关，关掉焦点回到入口', () => {
  assert.ok(/function closePanel/.test(acct), '缺 closePanel');
  assert.ok(/e\.key === 'Escape'/.test(acct), '没有 Esc 监听');
  assert.ok(/if \(ui\.btn && ui\.btn\.focus\) ui\.btn\.focus\(\)/.test(acct), '关掉没把焦点还给入口按钮');
});

test('密码登错的提示跟着账号类型走（手机号别说成邮箱）', () => {
  assert.ok(/function isPhoneAccount/.test(acct), '缺 isPhoneAccount');
  const seg = acct.slice(acct.indexOf('function friendlyError'), acct.indexOf('function loadProf'));
  assert.ok(seg.indexOf("isPhoneAccount(account) ? '手机号' : '邮箱'") >= 0, 'invalid-credential 没有区分手机号/邮箱');
  assert.ok(seg.indexOf('或密码不对。') >= 0 && seg.indexOf('还没有账号就点') < 0, '错误提示还在长篇劝注册');
  assert.ok(/friendlyError\(e, email\)/.test(acct), '登录失败没把输入的账号传给 friendlyError');
  assert.ok(!/第一次用这个邮箱请点/.test(acct), '旧的「第一次用这个邮箱」措辞还在');
});


test('打开面板把焦点送进面板（否则键盘 Tab 会跑到遮罩后面）', () => {
  assert.ok(/function openPanel\(tab\)/.test(acct), '缺统一打开入口 openPanel');
  const seg = acct.slice(acct.indexOf('function openPanel'), acct.indexOf('function panelFocusables'));
  assert.ok(/\.td-acct-x/.test(seg) && /\.focus\(\)/.test(seg), '打开后没聚焦面板内元素');
  assert.ok(acct.indexOf("btn.onclick = function () { openPanel(); }") >= 0, '入口按钮没走 openPanel');
  assert.ok(acct.indexOf("openPanel('account')") >= 0, '重置回站自动打开没走 openPanel');
  assert.ok(acct.indexOf("ui.layer.setAttribute('data-open', '1');\n    renderBody();\n  }") < 0, '还有绕过 openPanel 的直接置位');
});

test('Tab 在面板内首尾回绕，不会落到后台页面', () => {
  const seg = acct.slice(acct.indexOf("if (e.key !== 'Tab') return;"), acct.indexOf('document.body.appendChild(layer)'));
  assert.ok(/panelFocusables\(\)/.test(seg), 'Tab 处理没取面板内可聚焦元素');
  assert.ok(/e\.preventDefault\(\); last\.focus\(\)/.test(seg) && /e\.preventDefault\(\); first\.focus\(\)/.test(seg), '缺首尾回绕');
});

test('登录页不再把「注册新账号」这句话在按钮下面重复一遍', () => {
  assert.ok(!acct.includes('还没有账号？点「注册新账号」就行。'), '按钮下方还有重复的注册提示');
});

test('主按钮是胶囊实心强调蓝，且暗色下不会变成白板', () => {
  var seg = acct.slice(acct.indexOf('.td-acct-primary{'), acct.indexOf('.td-acct-linkbtn{'));
  assert.ok(/border-radius:999px/.test(seg), '主按钮还不是胶囊');
  assert.ok(/background:#2563eb/.test(seg), '主按钮没跟站内 #btnStart 同一套强调蓝');
  assert.ok(seg.indexOf('background:var(--blue,') < 0, '主按钮跟了 --blue 变量：暗色主题里它是近白色，会白底白字');
});

test('错误与状态是 live region，提交失败读屏能播报', () => {
  assert.ok(/err\.setAttribute\('role', 'alert'\)/.test(acct), '错误提示没有 role=alert');
  assert.ok(/err\.setAttribute\('aria-live', 'assertive'\)/.test(acct), '错误提示没有 assertive');
  assert.ok(/status\.setAttribute\('role', 'status'\)/.test(acct), '状态行没有 role=status');
  var seg = acct.slice(acct.indexOf('function setError'), acct.indexOf('function setBusy'));
  assert.ok(seg.indexOf('ui.error.hidden = false; ui.error.textContent = text') >= 0, '先写字后显示，live region 不会播报');
});
