'use strict';
/* test/profile-no-token.test.js — 登录会话绝不进云端档案
 *
 * cloud-account.js 用 'tdsat_' 前缀扫描本地键做档案同步，登录会话键 tdsat_auth_v1 恰好也在前缀里。
 * 于是：① access/refresh token 被当成档案上传；② applyPayload 先删所有 tdsat_* 再按服务端 payload
 * 写回，payload 里没有令牌 → 刚登录的会话被删掉，页面一刷新就成了未登录。
 * 会话键必须列入 NO_SYNC，永不同步。
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'cloud-account.js'), 'utf8');

test('tdsat_auth_v1 不在档案同步范围（NO_SYNC 白名单含它）', () => {
  const line = SRC.split('\n').find(l => l.includes('var NO_SYNC'));
  assert.ok(line, '应能找到 NO_SYNC 定义');
  assert.ok(/tdsat_auth_v1/.test(line), 'NO_SYNC 必须包含 tdsat_auth_v1，否则令牌会被同步/被清掉');
});

test('快照与回写只在 SNAP_PREFIX 内挑键，且统一排除 NO_SYNC', () => {
  assert.ok(/SNAP_PREFIX = 'tdsat_'/.test(SRC));
  assert.ok(SRC.includes('NO_SYNC[k]'), 'snapshot 应排除 NO_SYNC');
  assert.ok(SRC.includes('|| NO_SYNC[k]'), '监听写键时也应排除 NO_SYNC');
});
