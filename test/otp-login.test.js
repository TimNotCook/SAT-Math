'use strict';
/* 邮箱验证码 OTP 通道单测（纯函数 + 可定制 fetch，node --test test/otp-login.test.js）
 *
 * 被测：supa-cloud.js 的 sendOtp / verifyOtp / 会话持久化。规则而不是实现细节：
 *   1. 发码：合法邮箱 → POST /auth/v1/otp，body { email, create_user: true }，带 apikey 头；
 *      邮箱格式错 → 400，不发任何网络请求。
 *   2. 收码：合法 6 位码 → POST /auth/v1/verify，body { type: 'email', token, email }；
 *      拿到 access/refresh/expires_in 后按 packSession 落 localStorage。
 *   3. 码不是 6 位数字 / 邮箱格式错 → 400，不发请求。
 *   4. 频率上限 / 过期 / 无效码等后端报错原样翻成可读 code，不串别的通道文案。
 *   5. 本地已有会话快照 → onState 静默恢复出当前用户。
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
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body == null ? '' : body))
  };
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

function verifyOkBody(uid) {
  return {
    access_token: 'tk-' + uid,
    refresh_token: 'rt-' + uid,
    expires_in: 3600,
    user: { id: uid, email: 'newbie@example.com', user_metadata: { display_name: '同学' } }
  };
}

describe('sendOtp：发码请求形状', () => {
  test('合法邮箱 → POST /auth/v1/otp，body 带 create_user:true，请求头带 apikey', async () => {
    const calls = [];
    const { SB } = loadModule(async (url, opts) => {
      calls.push({ url, method: opts.method, headers: opts.headers, body: JSON.parse(opts.body) });
      return makeRes(200, {});
    });

    await SB.sendOtp('Newbie@Example.com');
    const otp = calls.find(c => c.url.includes('/auth/v1/otp'));
    assert.ok(otp, '必须发出 otp 请求');
    assert.equal(otp.method, 'POST');
    assert.equal(otp.body.email, 'Newbie@Example.com');
    assert.equal(otp.body.create_user, true);
    assert.equal(otp.headers.apikey, 'test-anon-key');
    /* redirect_to 必须同时进 body 与 query string：实测后端只认 query。 */
    assert.equal(otp.body.redirect_to, 'https://example.com/SAT-Math/');
    assert.match(otp.url, /redirect_to=https%3A%2F%2Fexample\.com%2FSAT-Math%2F/);
  });

  test('邮箱格式不合法 → 400，不发网络请求', async () => {
    const calls = [];
    const { SB } = loadModule(async (url) => { calls.push(url); return makeRes(200, {}); });
    await assert.rejects(() => SB.sendOtp('not-an-email'), e => e.status === 400);
    await assert.rejects(() => SB.sendOtp(''), e => e.status === 400);
    assert.equal(calls.length, 0);
  });
});

describe('verifyOtp：收码换会话', () => {
  test('6 位数字码 → POST /auth/v1/verify { type:email, token, email }，会话落 localStorage', async () => {
    const calls = [];
    const { SB, store } = loadModule(async (url, opts) => {
      calls.push({ url, method: opts.method, body: JSON.parse(opts.body) });
      if (url.endsWith('/auth/v1/verify')) return makeRes(200, verifyOkBody('uid-1'));
      return makeRes(404, {});
    });

    const u = await SB.verifyOtp('newbie@example.com', '123456');
    assert.equal(u.uid, 'uid-1');
    assert.equal(u.email, 'newbie@example.com');

    const v = calls.find(c => c.url.endsWith('/auth/v1/verify'));
    assert.ok(v, '必须发出 verify 请求');
    assert.equal(v.body.type, 'email');
    assert.equal(v.body.token, '123456');
    assert.equal(v.body.email, 'newbie@example.com');

    const saved = JSON.parse(store[SESSION_KEY]);
    assert.equal(saved.access, 'tk-uid-1');
    assert.equal(saved.refresh, 'rt-uid-1');
    assert.ok(saved.expiresAt > Date.now(), 'expiresAt 应在未来');
    assert.equal(saved.user.id, 'uid-1');
  });

  test('码不是 6 位数字 → 400，不发请求', async () => {
    const calls = [];
    const { SB } = loadModule(async (url) => { calls.push(url); return makeRes(200, {}); });
    await assert.rejects(() => SB.verifyOtp('newbie@example.com', '12345'), e => e.status === 400);
    await assert.rejects(() => SB.verifyOtp('newbie@example.com', 'abcdef'), e => e.status === 400);
    await assert.rejects(() => SB.verifyOtp('newbie@example.com', ''), e => e.status === 400);
    assert.equal(calls.length, 0);
  });

  test('邮箱格式错 → 400，不发请求', async () => {
    const calls = [];
    const { SB } = loadModule(async (url) => { calls.push(url); return makeRes(200, {}); });
    await assert.rejects(() => SB.verifyOtp('nope', '123456'), e => e.status === 400);
    assert.equal(calls.length, 0);
  });
});

describe('报错映射', () => {
  test('发码频率上限 → auth/too-many-requests', async () => {
    const { SB } = loadModule(async () => makeRes(429, { msg: 'Email rate limit exceeded for security purposes' }));
    await assert.rejects(() => SB.sendOtp('newbie@example.com'), e => e.code === 'auth/too-many-requests');
  });

  test('验证码过期 / 无效 → auth/invalid-code', async () => {
    const { SB } = loadModule(async () => makeRes(400, { msg: 'Token has expired or is invalid' }));
    await assert.rejects(() => SB.verifyOtp('newbie@example.com', '123456'), e => e.code === 'auth/invalid-code');
  });

  test('网络失败 → auth/network-request-failed，不冒充别的通道', async () => {
    const { SB } = loadModule(async () => { throw new Error('failed to fetch'); });
    await assert.rejects(() => SB.sendOtp('newbie@example.com'), e => e.code === 'auth/network-request-failed');
  });
});

describe('magic link 回调：hash 会话接住', () => {
  function loadHashModule(hash, fetchStub, opts) {
    opts = opts || {};
    const store = {};
    const cleared = [];
    const loc = opts.location || { hash, pathname: '/SAT-Math/drill.html', search: '' };
    const sandbox = {
      console, JSON, Math, String, Number, Array, Object, Date, isFinite,
      setTimeout, clearTimeout,
      setInterval: function () { return 0; },
      addEventListener: function () {},
      URLSearchParams,
      localStorage: {
        getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: k => { delete store[k]; }
      },
      location: loc,
      history: opts.history || { replaceState: (_, __, url) => cleared.push(url) },
      fetch: fetchStub
    };
    sandbox.window = sandbox;
    sandbox.TD_CLOUD_CONFIG = {
      supabase: { url: 'https://example.supabase.co', anonKey: 'test-anon-key', siteUrl: 'https://example.com/SAT-Math/' }
    };
    vm.createContext(sandbox);
    vm.runInContext(SRC, sandbox, { filename: 'supa-cloud.js' });
    return { SB: sandbox.TDSUPA, store, cleared, location: loc };
  }

  test('hash 带 access_token/refresh_token/expires_at → 落 localStorage，清掉 hash，/user 补全档案', async () => {
    const hash = '#access_token=tk-hash&refresh_token=rt-hash&expires_at=1893456000&expires_in=3600&type=magiclink';
    const { SB, store, cleared } = loadHashModule(hash, async (url) => {
      if (url.endsWith('/auth/v1/user')) return makeRes(200, { id: 'uid-hash', email: 'hash@example.com', user_metadata: { display_name: '同学' } });
      return makeRes(404, {});
    });

    let got = null;
    SB.onState(u => { got = u; });
    await new Promise(r => setTimeout(r, 30));

    const saved = JSON.parse(store[SESSION_KEY]);
    assert.equal(saved.access, 'tk-hash');
    assert.equal(saved.refresh, 'rt-hash');
    assert.ok(saved.expiresAt > Date.now(), 'expiresAt 应在未来');
    assert.equal(cleared.length, 1);
    assert.equal(cleared[0], '/SAT-Math/drill.html');
    assert.equal(got.uid, 'uid-hash');
    assert.equal(got.email, 'hash@example.com');
  });

  test('replaceState 被浏览器拒绝时，仍要把 token 从地址栏的 hash 里擦掉', async () => {
    const hash = '#access_token=tk-secret&refresh_token=rt-secret&expires_in=3600&type=magiclink';
    const loc = { hash, pathname: '/SAT-Math/drill.html', search: '' };
    const { SB } = loadHashModule(hash, async (url) => {
      if (url.endsWith('/auth/v1/user')) return makeRes(200, { id: 'uid-hash', email: 'hash@example.com' });
      return makeRes(404, {});
    }, { location: loc, history: { replaceState() { throw new Error('SecurityError'); } } });
    SB.onState(() => {});
    await new Promise(r => setTimeout(r, 30));
    assert.equal(loc.hash, '', 'replaceState 失败后 token 还留在地址栏');
  });

  test('hash 里没有 access_token → 不写会话，也不清 hash', async () => {
    const { SB, store, cleared } = loadHashModule('#foo=bar', async () => makeRes(404, {}));
    await new Promise(r => setTimeout(r, 30));
    assert.equal(store[SESSION_KEY], undefined);
    assert.equal(cleared.length, 0);
  });
});

describe('会话本地恢复', () => {
  test('localStorage 已有未过期快照 → onState 静默恢复出当前用户', async () => {
    const seed = {
      access: 'tk-seed',
      refresh: 'rt-seed',
      expiresAt: Date.now() + 30 * 60 * 1000,
      user: { id: 'uid-seed', email: 'seed@example.com', user_metadata: { display_name: '同学' } }
    };
    const { SB } = loadModule(async (url) => {
      if (url.endsWith('/auth/v1/user')) return makeRes(200, seed.user);
      return makeRes(404, {});
    }, seed);

    let got = null;
    SB.onState(u => { got = u; });
    await new Promise(r => setTimeout(r, 30));
    assert.ok(got, 'onState 应回传恢复出的用户');
    assert.equal(got.uid, 'uid-seed');
    assert.equal(got.email, 'seed@example.com');
  });
});
