'use strict';
/* 邮箱 + 密码登录单测（node --test test/password-login.test.js）
 *
 * 为什么要有这条通道：magic link 依赖邮件投递（默认 SMTP、有额度限制，收不到就等于登不上），
 * 而本项目 Supabase 的 mailer_autoconfirm=true，邮箱密码注册会**当场返回会话**，
 * 完全不经过邮件。规则：
 *   1. signUpPassword(邮箱, 密码) → POST /auth/v1/signup，body { email, password }，拿会话落库；
 *   2. signInPassword(邮箱, 密码) → POST /auth/v1/token?grant_type=password；
 *   3. 邮箱格式错 / 密码短于 6 位 → 400，且一个请求都不发；
 *   4. 账密不对 → 错误码 auth/invalid-credential（UI 靠它提示「第一次请先注册」）；
 *   5. 已登录改密码 → PUT /auth/v1/user，body { password }；
 *   6. 会话结构与 magic link 完全一致（tdsat_auth_v1，access/refresh/expiresAt/user）。
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'supa-cloud.js'), 'utf8');
const SESSION_KEY = 'tdsat_auth_v1';

function makeRes(status, body) {
  return { ok: status >= 200 && status < 300, status, text: () => Promise.resolve(JSON.stringify(body == null ? '' : body)) };
}

function loadModule(fetchStub, seedSession) {
  const store = {};
  if (seedSession) store[SESSION_KEY] = JSON.stringify(seedSession);
  const sandbox = {
    console, JSON, Math, String, Number, Array, Object, Date, isFinite,
    setTimeout, clearTimeout,
    setInterval: function () { return 0; },
    addEventListener: function () {},
    localStorage: {
      getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    fetch: fetchStub
  };
  sandbox.window = sandbox;
  sandbox.TD_CLOUD_CONFIG = {
    supabase: { url: 'https://example.supabase.co', anonKey: 'test-anon-key', siteUrl: 'https://example.com/SAT-Math/' }
  };
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox, { filename: 'supa-cloud.js' });
  return { SB: sandbox.TDSUPA, store };
}

function sessionBody(uid) {
  return {
    access_token: 'tk-' + uid,
    refresh_token: 'rt-' + uid,
    expires_in: 3600,
    user: { id: uid, email: 'tim@example.com', user_metadata: { display_name: 'Tim' } }
  };
}

describe('注册：密码通道不经过邮件', () => {
  test('POST /auth/v1/signup，body 只有邮箱和密码，返回会话落 localStorage', async () => {
    const calls = [];
    const { SB, store } = loadModule(async (url, opts) => {
      calls.push({ url, method: opts.method, body: JSON.parse(opts.body || '{}') });
      return makeRes(200, sessionBody('uid-signup'));
    });

    await SB.signUpPassword('tim@example.com', 'satmath123');
    const call = calls.find(c => c.url.includes('/auth/v1/signup'));
    assert.ok(call, '必须打到 /auth/v1/signup');
    assert.equal(call.method, 'POST');
    assert.equal(call.body.email, 'tim@example.com');
    assert.equal(call.body.password, 'satmath123');
    assert.ok(!calls.some(c => c.url.includes('/auth/v1/otp')), '密码注册不该发任何邮件');

    const saved = JSON.parse(store[SESSION_KEY]);
    assert.equal(saved.access, 'tk-uid-signup');
    assert.equal(saved.refresh, 'rt-uid-signup');
    assert.ok(saved.expiresAt > Date.now(), '过期时间应取 expires_in 减缓冲');
  });

  test('密码短于 6 位 → 400，且不发请求', async () => {
    const calls = [];
    const { SB } = loadModule(async (url) => { calls.push(url); return makeRes(200, sessionBody('x')); });
    await assert.rejects(() => SB.signUpPassword('tim@example.com', '123'), e => e.status === 400);
    assert.equal(calls.length, 0);
  });

  test('邮箱格式不对 → 400，且不发请求', async () => {
    const calls = [];
    const { SB } = loadModule(async (url) => { calls.push(url); return makeRes(200, sessionBody('x')); });
    await assert.rejects(() => SB.signUpPassword('tim.example.com', 'satmath123'), e => e.status === 400);
    assert.equal(calls.length, 0);
  });
});

describe('登录：账密换会话', () => {
  test('POST /auth/v1/token?grant_type=password，成功后写会话', async () => {
    const calls = [];
    const { SB, store } = loadModule(async (url, opts) => {
      calls.push({ url, method: opts.method, body: JSON.parse(opts.body || '{}') });
      return makeRes(200, sessionBody('uid-signin'));
    });

    const u = await SB.signInPassword('tim@example.com', 'satmath123');
    const call = calls.find(c => c.url.includes('grant_type=password'));
    assert.ok(call, '必须走 password 授权');
    assert.equal(call.body.email, 'tim@example.com');
    assert.equal(call.body.password, 'satmath123');
    assert.ok(store[SESSION_KEY], '登录后必须有本地会话');
    assert.ok(u && u.uid === 'uid-signin');
  });

  test('账密不对 → 错误码 auth/invalid-credential，不清已有会话', async () => {
    const seed = { access: 'a', refresh: 'r', expiresAt: Date.now() + 3600e3, user: { id: 'old', email: 'old@example.com' } };
    const { SB, store } = loadModule(async () => makeRes(400, { msg: 'Invalid login credentials' }), seed);
    await assert.rejects(() => SB.signInPassword('tim@example.com', 'wrongpw'),
      e => e.code === 'auth/invalid-credential');
    assert.ok(store[SESSION_KEY], '密码输错不能把原来的登录态删掉');
  });

  test('缺密码 → 400，不发请求', async () => {
    const calls = [];
    const { SB } = loadModule(async (url) => { calls.push(url); return makeRes(200, sessionBody('x')); });
    await assert.rejects(() => SB.signInPassword('tim@example.com', ''), e => e.status === 400);
    assert.equal(calls.length, 0);
  });
});

describe('已登录改密码', () => {
  test('PUT /auth/v1/user，body { password }，带当前 access token', async () => {
    const seed = { access: 'tk-live', refresh: 'rt-live', expiresAt: Date.now() + 3600e3, user: { id: 'uid-live', email: 'tim@example.com' } };
    const calls = [];
    const { SB } = loadModule(async (url, opts) => {
      if (String(url).includes('/auth/v1/user') && opts.method === 'GET') return makeRes(200, seed.user);
      calls.push({ url, method: opts.method, body: JSON.parse(opts.body || '{}'), auth: opts.headers.Authorization });
      return makeRes(200, {});
    }, seed);

    await SB.setPassword('newpass123');
    const put = calls.find(c => c.method === 'PUT' && c.url.includes('/auth/v1/user'));
    assert.ok(put, '必须 PUT /auth/v1/user');
    assert.equal(put.body.password, 'newpass123');
    assert.equal(put.auth, 'Bearer tk-live');
  });

  test('密码太短 → 400，不发请求', async () => {
    const seed = { access: 'tk-live', refresh: 'rt-live', expiresAt: Date.now() + 3600e3, user: { id: 'uid-live' } };
    const calls = [];
    const { SB } = loadModule(async (url, opts) => {
      if (opts.method === 'GET') return makeRes(200, seed.user);
      calls.push(url); return makeRes(200, {});
    }, seed);
    await assert.rejects(() => SB.setPassword('12345'), e => e.status === 400);
    assert.equal(calls.length, 0);
  });
});

describe('手机号当账号：同一个号码必须折成同一个登录标识', () => {
  test('11 位、+86、带空格横线、86 开头 → 全部折成 p86…@p.satmath.app', async () => {
    const variants = ['13800138000', '+86 138-0013-8000', '8613800138000', '8613 8001 38000'];
    for (const v of variants) {
      const calls = [];
      const { SB } = loadModule(async (url, opts) => {
        calls.push(JSON.parse(opts.body || '{}'));
        return makeRes(200, sessionBody('uid-phone'));
      });
      await SB.signInPassword(v, 'satmath123');
      assert.equal(calls[0].email, 'p8613800138000@p.satmath.app', v + ' 应折成同一个账号');
    }
  });


  test('+1 国际号码不被误折成中国大陆 86 账号', async () => {
    const calls = [];
    const { SB } = loadModule(async (url, opts) => {
      calls.push(JSON.parse(opts.body || '{}'));
      return makeRes(200, sessionBody('uid-us'));
    });
    await SB.signInPassword('+1 415-555-0123', 'satmath123');
    assert.equal(calls[0].email, 'p14155550123@p.satmath.app',
      '+1 开头的号码被补成 86，和本机号码成了两个账号');
  });

  test('手机号注册同样不发任何邮件', async () => {
    const calls = [];
    const { SB, store } = loadModule(async (url, opts) => {
      calls.push({ url, body: JSON.parse(opts.body || '{}') });
      return makeRes(200, sessionBody('uid-phone2'));
    });
    await SB.signUpPassword('13800138000', 'satmath123');
    assert.ok(calls[0].url.includes('/auth/v1/signup'));
    assert.ok(!calls.some(c => c.url.includes('/auth/v1/otp')), '手机注册不该发邮件');
    assert.ok(store[SESSION_KEY], '注册后应立即有本地会话');
  });

  test('位数不对的号码（如 6 位）→ 400，不发请求', async () => {
    const calls = [];
    const { SB } = loadModule(async (url) => { calls.push(url); return makeRes(200, sessionBody('x')); });
    await assert.rejects(() => SB.signUpPassword('123456', 'satmath123'), e => e.status === 400);
    assert.equal(calls.length, 0);
  });
});

describe('邮件链接不能发到手机号', () => {
  test('手机号走 sendOtp → 400，一个请求都不发', async () => {
    const calls = [];
    const { SB } = loadModule(async (url) => { calls.push(url); return makeRes(200, {}); });
    await assert.rejects(() => (SB.sendMagicLink || SB.sendOtp)('13800138000'),
      e => e.status === 400 && /手机号/.test(e.message || ''));
    assert.equal(calls.length, 0, '不能对着收不到信的假域名发信');
  });
});

describe('面板上的账号打码', () => {
  const { SB } = loadModule(async () => makeRes(200, sessionBody('x')));
  test('手机号：8613800138000 → 138****8000', () => {
    assert.equal(SB.maskAccount('p8613800138000@p.satmath.app'), '138****8000');
  });
  test('邮箱：tim@example.com → ti***@example.com', () => {
    assert.equal(SB.maskAccount('tim@example.com'), 'ti***@example.com');
  });
  test('空值不炸', () => {
    assert.equal(SB.maskAccount(''), '');
    assert.equal(SB.maskAccount(null), '');
  });
});
