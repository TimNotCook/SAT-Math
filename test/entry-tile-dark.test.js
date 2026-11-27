/* test/entry-tile-dark.test.js — 三入口「当前板块」暗色可读性守门
 * app.css 给选中磁贴写死了浅色态 #1d4ed8 蓝字；dark 下磁贴底是深玻璃，
 * 实测只有 2.95:1。glass.css 必须保留一组 dark 覆盖：品牌蓝块 + 浅银字。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(resolve(ROOT, 'glass.css'), 'utf8');

test('dark 三入口当前板块：深蓝字不再叠深玻璃', () => {
  assert.match(
    css,
    /html\[data-theme="dark"\] body \.entry-tile-grid \.entry-tile\.on\{[^}]*background:rgba\(37,99,235,\.22\)!important/
  );
  assert.match(
    css,
    /html\[data-theme="dark"\] body \.entry-tile-grid \.entry-tile\.on b,[\s\S]*?\.entry-tile\.on \.entry-arrow\{color:#f5f5f7!important\}/
  );
  assert.match(
    css,
    /html\[data-theme="dark"\] body \.entry-tile-grid \.entry-tile\.on:hover\{background:rgba\(37,99,235,\.30\)!important\}/
  );
});
