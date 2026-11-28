'use strict';
/* 邮箱验证码通道的「开关式」实现：
 * Supabase 免费版用自带邮件服务时禁止改模板（entitlement_required），正文里没有
 * {{ .Token }}，邮件只有链接。所以验证码入口必须被 cloud-config.js 的
 * supabase.otpCode 开关挡住：开关没开，面板一个字都不出现，避免假按钮。
 * 配好自定义 SMTP + 模板之后把开关改成 true，UI 与接口即可直接生效。
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const CONFIG = fs.readFileSync(path.join(ROOT, 'cloud-config.js'), 'utf8');
const SUPABASE = fs.readFileSync(path.join(ROOT, 'supa-cloud.js'), 'utf8');
const ACCOUNT = fs.readFileSync(path.join(ROOT, 'cloud-account.js'), 'utf8');

test('配置里验证码开关默认关闭', () => {
  assert.match(CONFIG, /otpCode\s*:\s*false/, '默认必须是 false：模板没配好之前不能露入口');
});

test('supa-cloud 暴露 codeReady / sendEmailCode，且 codeReady 依赖开关', () => {
  assert.match(SUPABASE, /function\s+codeReady\s*\(/, '缺 codeReady');
  assert.match(SUPABASE, /var\s+c\s*=\s*window\.TD_CLOUD_CONFIG\s*&&\s*window\.TD_CLOUD_CONFIG\.supabase/, '要从配置读开关');
  assert.match(SUPABASE, /c\s*&&\s*c\.otpCode\s*===\s*true/, '只有 otpCode === true 才算就绪');
  assert.match(SUPABASE, /sendEmailCode\s*:\s*sendEmailCode/, '要导出 sendEmailCode');
  assert.match(SUPABASE, /codeReady\s*:\s*codeReady/, '要导出 codeReady');
});

test('发码走 /auth/v1/otp，且带 redirect_to 兼容 query string', () => {
  const fn = SUPABASE.slice(SUPABASE.indexOf('async function sendEmailCode'), SUPABASE.indexOf('async function verifyOtp'));
  assert.match(fn, /\/auth\/v1\/otp/, '发码端点');
  assert.match(fn, /redirect_to/, '回跳地址');
  assert.match(fn, /create_user: true/, '首次输入邮箱要自动建档');
});

test('验证码校验只认 6 位数字', () => {
  const fn = SUPABASE.slice(SUPABASE.indexOf('async function verifyOtp'), SUPABASE.indexOf('跨标签页同步'));
  assert.match(fn, /\/\^\\d\{6\}\$\/\.test\(token\)/, '必须校验 6 位数字');
});

test('面板只在 codeReady 为真时给出验证码入口', () => {
  assert.match(ACCOUNT, /if\s*\(\s*SB\s*&&\s*SB\.codeReady\s*&&\s*SB\.codeReady\(\)\s*\)/, '入口要被 codeReady 包住');
  assert.match(ACCOUNT, /改用邮箱验证码登录/, '入口文案');
  assert.match(ACCOUNT, /loginMode\s*===\s*'code'/, '要有 code 模式的渲染分支');
});

test('面板发码前二次确认通道可用，不会假装发送', () => {
  const fn = ACCOUNT.slice(ACCOUNT.indexOf('async function doSendCode'), ACCOUNT.indexOf('async function doVerifyCode'));
  assert.match(fn, /SB\.codeReady/, '发码前必须检查 codeReady');
  assert.match(fn, /sendEmailCode/, '调用 sendEmailCode');
  assert.match(fn, /6 位数字/, '提示要说明收 6 位数字');
});

test('验证码登录把校验交给 verifyOtp', () => {
  const fn = ACCOUNT.slice(ACCOUNT.indexOf('async function doVerifyCode'), ACCOUNT.indexOf('async function saveNickname'));
  assert.match(fn, /code\.length\s*!==\s*6/, '长度校验');
  assert.match(fn, /SB\.verifyOtp/, '调用 verifyOtp');
  assert.match(fn, /登录成功/, '成功后给反馈');
});

test('验证码输入框是 6 位、数字键盘、一次性验证码语义', () => {
  assert.match(ACCOUNT, /inputMode\s*=\s*'numeric'/, '数字键盘');
  assert.match(ACCOUNT, /maxLength\s*=\s*6/, '最多 6 位');
  assert.match(ACCOUNT, /one-time-code/, '自动填充语义');
});

test('验证码只认发送时的邮箱，改了邮箱明确提示重发', () => {
  const send = ACCOUNT.slice(ACCOUNT.indexOf('async function doSendCode'), ACCOUNT.indexOf('async function doVerifyCode'));
  assert.match(send, /await SB\.sendEmailCode\(email\);[\s\S]*?otpEmail = email;/,
    'otpEmail 必须在发送成功后记录，失败不能覆盖上一个有效地址');
  const verify = ACCOUNT.slice(ACCOUNT.indexOf('async function doVerifyCode'), ACCOUNT.indexOf('async function saveNickname'));
  assert.match(verify, /email !== otpEmail/, '改了邮箱没有拦住');
  assert.match(verify, /重新获取/, '改了邮箱要提示重新获取');
  assert.match(verify, /verifyOtp\(otpEmail \|\| email/, '校验必须用发码时的邮箱');
});
