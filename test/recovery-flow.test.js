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
  assert.ok(/recoveryOpened/.test(acct), '没有「只自动开一次」的守卫');
  const seg = acct.slice(acct.indexOf('function onState'));
  assert.ok(/recoveryPending/.test(seg.slice(0, 900)), 'onState 里没检查 recovery 标记');
});

test('发过重置链接后按钮进 60 秒冷却，不许连点', () => {
  assert.ok(/function resetBtnLabel/.test(acct), '缺 resetBtnLabel');
  const seg = acct.slice(acct.indexOf('async function doSendReset'));
  assert.ok(/startOtpCooldown/.test(seg.slice(0, 700)), '发成功后没进冷却');
});

test('设好新密码后清掉 recovery 标记', () => {
  const seg = acct.slice(acct.indexOf('async function doSetPassword'));
  assert.ok(/clearRecovery/.test(seg.slice(0, 400)), '设密码后没清标记');
});
