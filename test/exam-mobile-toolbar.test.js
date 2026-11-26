/* test/exam-mobile-toolbar.test.js — 模考窄屏工具行不许横溢
 *
 * 390 档实测：Reference / Calculator / Review / Submit 一行排不下，
 * Submit 被挤出屏幕（scrollWidth 405 > clientWidth 390），学生点不到交卷。
 * 修法是窄屏允许工具组换行；这里做静态守卫，防止样式回退。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(resolve(ROOT, 'bluebook.css'), 'utf8');

test('窄屏模考题头工具组允许换行，Submit 不许被挤出屏幕', () => {
  assert.match(css, /\.exam-questionbar\s+\.exam-toolbar-actions\s*\{[^}]*flex-wrap\s*:\s*wrap/,
    '缺窄屏换行规则：Submit 会在 390 档被裁到屏幕外');
  assert.match(css, /\.exam-questionbar\s+\.exam-toolbar-actions\s*\{[^}]*max-width\s*:\s*100%/,
    '工具组必须限制在容器宽度内，否则仍会撑出横向滚动');
});
