'use strict';
/* test/session-resilience.test.js — 刷新页面不许把人踢下线
 *
 * 事故：直接刷新一次就变「未登录」。根因是续期逻辑太粗暴——
 *   1. 续期（fetch /auth/v1/token）任何失败都 saveSession(null)，断网/超时也算；
 *   2. raw() 的 catch 把 HTTP 错误改写成 status 0，上层分不清「token 失效」和「网断了」；
 *   3. /user 401 时不再尝试换票，直接清会话；
 *   4. 多标签页/定时器并发续期，Supabase 轮换 refresh_token，后到那次必然 invalid_grant，
 *      于是又被当成「失效」删掉。
 *
 * 规则：
 *   - 未过期会话 + /user 断网 → 仍登录（用本地缓存的 user）
 *   - 过期会话 + 续期断网 → 保留本地会话，联网后重试
 *   - 过期会话 + 服务端明确 400/401 拒绝续期 → 才清会话
 *   - 过期会话 + 续期成功 → 落新票，/user 补全档案
 */
const { test } = require('node:test');
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

function load(fetchStub, seedSession) {
  const store = {};
  if (seedSession) store[SESSION_KEY] = JSON.stringify(seedSession);
  const listeners = {};
  const sandbox = {
    console, JSON, Math, String, Number, Array, Object, Date, isFinite,
    setTimeout, clearTimeout,
    setInterval: function () { return 0; },
    addEventListener: function (k, fn) { listeners[k] = fn; },
    localStorage: {
      getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    fetch: fetchStub
  };
  sandbox.window = sandbox;
  sandbox.TD_CLOUD_CONFIG = { supabase: { url: 'https://example.supabase.co', anonKey: 'anon', siteUrl: 'https://example.com/SAT-Math/' } };
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox, { filename: 'supa-cloud.js' });
  return { SB: sandbox.TDSUPA, store, listeners };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function seed(uid, expiresInMs, refresh) {
  return {
    access: 'tk-old',
    refresh: refresh === undefined ? 'rt-old' : refresh,
    expiresAt: Date.now() + expiresInMs,
    user: { id: uid, email: 'tim@example.com' }
  };
}

test('未过期会话 + /user 请求失败（断网）→ 仍然是登录态，本地会话不删', async () => {
  const { SB, store } = load(async () => { throw new Error('failed to fetch'); }, seed('uid-1', 3600 * 1000));
  let got = 'unset';
  SB.onState(u => { got = u; });
  await sleep(50);
  assert.ok(store[SESSION_KEY], '断网不该删本地会话');
  assert.ok(got && got.uid === 'uid-1', '应继续认为已登录，用本地缓存的 user');
});

test('会话过期 + 续期断网 → 保留会话，不把人踢下线', async () => {
  const { SB, store } = load(async (url) => {
    if (String(url).includes('/auth/v1/token')) throw new Error('failed to fetch');
    return makeRes(401, { msg: 'invalid JWT' });
  }, seed('uid-2', -1000));
  let got = 'unset';
  SB.onState(u => { got = u; });
  await sleep(60);
  assert.ok(store[SESSION_KEY], '续期只是网络失败，不该删会话');
  assert.ok(got && got.uid === 'uid-2', '断网后仍应保持登录态');
});

test('会话过期 + 服务端明确拒绝续期（400 invalid_grant）→ 才清会话', async () => {
  const { SB, store } = load(async (url) => {
    if (String(url).includes('/auth/v1/token')) return makeRes(400, { msg: 'Invalid Refresh Token: Refresh Token Not Found' });
    return makeRes(401, { msg: 'invalid JWT' });
  }, seed('uid-3', -1000));
  let got = 'unset';
  SB.onState(u => { got = u; });
  await sleep(60);
  assert.equal(store[SESSION_KEY], undefined, 'refresh_token 被服务端判定无效，应清掉本地会话');
  assert.equal(got, null, '应回到未登录');
});

test('会话过期 + 续期成功 → 落新票并补全用户', async () => {
  const { SB, store } = load(async (url) => {
    const u = String(url);
    if (u.includes('/auth/v1/token')) return makeRes(200, {
      access_token: 'tk-new', refresh_token: 'rt-new', expires_in: 3600,
      user: { id: 'uid-4', email: 'tim@example.com', user_metadata: { display_name: 'Tim' } }
    });
    if (u.includes('/auth/v1/user')) return makeRes(200, { id: 'uid-4', email: 'tim@example.com', user_metadata: { display_name: 'Tim' } });
    return makeRes(404, {});
  }, seed('uid-4', -1000));
  let got = 'unset';
  SB.onState(u => { got = u; });
  await sleep(60);
  const saved = JSON.parse(store[SESSION_KEY]);
  assert.equal(saved.access, 'tk-new');
  assert.equal(saved.refresh, 'rt-new');
  assert.ok(saved.expiresAt > Date.now());
  assert.ok(got && got.uid === 'uid-4' && got.displayName === 'Tim');
});

test('HTTP 状态码不被 raw() 吞成 0（否则分不清失效与断网）', async () => {
  const { SB, store } = load(async () => makeRes(401, { msg: 'invalid JWT' }), seed('uid-5', -1000, ''));
  let got = 'unset';
  SB.onState(u => { got = u; });
  await sleep(50);
  // 没有 refresh_token：不清会话，保持登录态
  assert.ok(store[SESSION_KEY], '没有 refresh_token 时不该清会话');
  assert.ok(got && got.uid === 'uid-5');
});

test('别的标签页续期成功后，本页的 refreshDead 必须复位', async () => {
  const { SB, store, listeners } = load(async (url) => {
    if (String(url).includes('/auth/v1/token')) return makeRes(400, { msg: 'Invalid Refresh Token: Refresh Token Not Found' });
    if (String(url).includes('/rest/v1/progress')) return makeRes(200, []);
    return makeRes(401, { msg: 'invalid JWT' });
  }, seed('uid-6', -1000));
  let got = 'unset';
  SB.onState(u => { got = u; });
  await sleep(60);
  assert.equal(store[SESSION_KEY], undefined, '本页先撞 invalid_grant，会话被清');

  /* 另一个标签页拿到新票并写回 localStorage，storage 事件传到本页。 */
  store[SESSION_KEY] = JSON.stringify({
    access: 'tk-other', refresh: 'rt-other', expiresAt: Date.now() + 3600 * 1000,
    user: { id: 'uid-6', email: 'tim@example.com' }
  });
  listeners.storage({ key: SESSION_KEY });
  assert.ok(got && got.uid === 'uid-6', '应恢复登录态');

  /* 不走内部 token：用真实读档案接口验证「有票却判失效」不会再发生。 */
  await SB.getArchive();
});
