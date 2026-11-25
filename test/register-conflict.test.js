'use strict';
/* 注册查重策略单测（2026-11-25：查重从「匿名读表枚举」改为「唯一约束兜底」）
 *
 * 被测：supa-cloud.js 的 register(username, pw)。规则而不是实现细节：
 *   1. 合法新用户名：本地格式/密码校验过后直接 signup，拿会话、写 usernames，注册成功；
 *      全程不读 usernames 表做预读查重。
 *   2. 已存在用户名：GoTrue 422 user_already_exists（线上探针实测形态）→ 409
 *      「这个用户名已被占用，换一个吧。」；bindUsername 撞唯一索引 23505 同样翻 409。
 *   3. 网络失败 / 42501 授权拒绝 / 5xx：一律原样上抛，不许冒充「用户名被占」，
 *      也不许串成「请管理员关闭邮箱确认」那条报错。
 *   4. 本地格式错、密码不足 6 位：400，且不发任何网络请求。
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'supa-cloud.js'), 'utf8');

const CONFLICT_MSG = '这个用户名已被占用，换一个吧。';

function makeRes(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body == null ? '' : body))
  };
}

/* loader：每次用全新沙箱 + 可定制 fetch，避免用例之间串会话。 */
function loadModule(fetchStub) {
  const store = {};
  const sandbox = {
    console, JSON, Math, String, Number, Array, Object, Date, isFinite,
    setTimeout, clearTimeout,
    setInterval: function () { return 0; },
    localStorage: {
      getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    fetch: fetchStub
  };
  sandbox.window = sandbox;
  sandbox.TD_CLOUD_CONFIG = {
    supabase: { url: 'https://example.supabase.co', anonKey: 'test-anon-key', emailDomain: 'satmath.local' }
  };
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox, { filename: 'supa-cloud.js' });
  return sandbox.TDSUPA;
}

function signupOkBody(uid) {
  return {
    access_token: 'tk-' + uid,
    refresh_token: 'rt-' + uid,
    user: { id: uid, email: 'newbie@satmath.local', user_metadata: { username: 'newbie' } }
  };
}

describe('register：合法新用户名直接走唯一约束路径', () => {
  test('格式合法 + 密码 ≥6 位 → 注册成功，伪邮箱按确定性规则拼出，不预读 usernames 表', async () => {
    const calls = [];
    const SB = loadModule(async (url, opts) => {
      calls.push({ url, method: opts.method, body: JSON.parse(opts.body) });
      if (url.endsWith('/auth/v1/signup')) return makeRes(200, signupOkBody('uid-new'));
      if (url.includes('/usernames')) return makeRes(201, []);
      return makeRes(404, {});
    });

    const r = await SB.register('Newbie_01', 'secret123');
    assert.equal(r.username, 'newbie_01');
    assert.equal(r.user.uid, 'uid-new');

    const signup = calls.find(c => c.url.endsWith('/auth/v1/signup'));
    assert.ok(signup, '必须发出 signup 请求');
    assert.equal(signup.body.email, 'newbie_01@satmath.local');
    // 注册路径里不允许出现匿名预读 usernames 查名（GET /usernames?username=eq.…）
    const precheck = calls.find(c => c.method === 'GET' && c.url.includes('/usernames'));
    assert.equal(precheck, undefined, '注册前不得匿名读表查重');
  });

  test('格式不合法 / 密码不足 6 位 → 400，不发网络请求', async () => {
    const calls = [];
    const SB = loadModule(async (url) => { calls.push(url); return makeRes(200, {}); });

    await assert.rejects(() => SB.register('ab', 'secret123'), e => e.status === 400);
    await assert.rejects(() => SB.register('validname', '12345'), e => e.status === 400);
    assert.equal(calls.length, 0);
  });
});

describe('register：已存在用户名 → 409 自己的占用文案', () => {
  test('GoTrue 422 user_already_exists（线上探针实测形态）→ 409，不再写 usernames', async () => {
    const calls = [];
    const SB = loadModule(async (url, opts) => {
      calls.push({ url, method: opts.method });
      if (url.endsWith('/auth/v1/signup')) {
        return makeRes(422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' });
      }
      return makeRes(201, []);
    });

    await assert.rejects(() => SB.register('timnotcook', 'whatever1'), e => {
      assert.equal(e.status, 409);
      assert.equal(e.message, CONFLICT_MSG);
      assert.equal(e.code, 'auth/username-already-in-use');
      return true;
    });
    assert.equal(calls.length, 1, '冲突后不应再请求 usernames 表');
  });

  test('bindUsername 唯一索引冲突 23505 → 同样翻 409 占用文案', async () => {
    const calls = [];
    const SB = loadModule(async (url, opts) => {
      calls.push({ url, method: opts.method });
      if (url.endsWith('/auth/v1/signup')) return makeRes(200, signupOkBody('uid-race'));
      if (url.includes('/usernames')) {
        return makeRes(409, {
          code: '23505',
          details: 'Key (username)=(newbie_01) already exists.',
          message: 'duplicate key value violates unique constraint "usernames_username_uq"'
        });
      }
      return makeRes(404, {});
    });

    await assert.rejects(() => SB.register('newbie_01', 'secret123'), e => {
      assert.equal(e.status, 409);
      assert.equal(e.message, CONFLICT_MSG);
      return true;
    });
  });
});

describe('register：非冲突失败不许被误判成「用户名被占」', () => {
  test('网络失败（fetch reject）→ 原样上抛，不是 409', async () => {
    const SB = loadModule(async () => { throw new Error('network down'); });
    await assert.rejects(() => SB.register('newbie_01', 'secret123'), e => {
      assert.notEqual(e.status, 409);
      assert.notEqual(e.message, CONFLICT_MSG);
      assert.notEqual(e.code, 'auth/username-already-in-use');
      return true;
    });
  });

  test('42501 授权拒绝 → 原样上抛，不是 409', async () => {
    const SB = loadModule(async () => makeRes(401, {
      code: '42501', message: 'permission denied for table usernames'
    }));
    await assert.rejects(() => SB.register('newbie_01', 'secret123'), e => {
      assert.equal(e.status, 401);
      assert.notEqual(e.message, CONFLICT_MSG);
      assert.notEqual(e.code, 'auth/username-already-in-use');
      return true;
    });
  });

  test('服务端 5xx → 原样上抛，不是 409，也不串成邮箱确认报错', async () => {
    const SB = loadModule(async () => makeRes(500, { msg: 'internal server error' }));
    await assert.rejects(() => SB.register('newbie_01', 'secret123'), e => {
      assert.notEqual(e.status, 409);
      assert.notEqual(e.message, CONFLICT_MSG);
      assert.notEqual(e.code, 'auth/email-not-confirm');
      return true;
    });
  });

  test('signup 回了 user 但无会话、且无冲突字段 → 走既有邮箱确认报错，不冒充占用', async () => {
    const SB = loadModule(async () => makeRes(200, { user: { id: 'uid-x', email: 'newbie_01@satmath.local' } }));
    await assert.rejects(() => SB.register('newbie_01', 'secret123'), e => {
      assert.equal(e.status, 400);
      assert.notEqual(e.message, CONFLICT_MSG);
      assert.match(e.message, /Confirm email|邮箱确认/);
      return true;
    });
  });
});
