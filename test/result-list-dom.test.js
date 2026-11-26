/* test/result-list-dom.test.js — 成绩页逐题回顾不许嵌套
 *
 * 模板里一旦少一个 </div>，44 条 rev-item 会互相嵌套，390 档实测
 * scrollWidth 4236 / clientWidth 390，整页横向飞出屏幕。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const js = readFileSync(resolve(ROOT, 'exam.js'), 'utf8');

test('成绩页 rev-item 模板必须同时闭合 body 与 rev-item', () => {
  const seg = js.slice(js.indexOf('function renderResultList'), js.indexOf('/* 本次错题按错因类型聚合'));
  assert.match(seg, /\$\{causeHtml\}\s*<\/div><\/div>`/,
    'rev-item 模板少一个闭合 div，会把后面每一条都嵌进上一条');
});
