/* test/scratch-pointer.test.js — 手写板触屏热区的媒体查询契约 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const js = readFileSync(resolve(ROOT, 'scratch-pad.js'), 'utf8');

test('手写板触屏热区只跟 any-pointer:coarse，桌面 hover:none 不放大', () => {
  assert.match(js, /@media \(any-pointer: coarse\)/, '触屏热区没有跟 any-pointer:coarse');
  assert.ok(!/hover:none/.test(js), 'hover:none 会让无悬停能力的桌面也触发 26px 热区');
});
