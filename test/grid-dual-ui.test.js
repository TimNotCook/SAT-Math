/* test/grid-dual-ui.test.js — 两空 grid-in 的页面能力守卫
 *
 * 判分层早就支持 "第一空, 第二空"（grade-core.dualCorrect），讲义页也有双框；
 * 但练习页 / 模考页原来只有单框：一旦题库真的加进两空题，学生在 drill / exam
 * 上根本填不全第二空，必然判错，而且没有任何提示——属于「数据一来就爆」的缺口。
 *
 * 这里做静态守卫：两个页面都必须有 q.values 的多框分支，且都用同一个类名，
 * 防止以后重构时又退回单框。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(ROOT, p), 'utf8');

test('练习页 drill.js 有两空 grid-in 分支', () => {
  const src = read('drill.js');
  assert.match(src, /q\.values\s*&&\s*q\.values\.length\s*>\s*1/, '缺少多空分支');
  assert.match(src, /drill-grid-multi/, '多空容器类名缺失');
  assert.match(src, /join\(', '\)/, '答案必须拼成「a, b」交给 dualCorrect');
});

test('模考页 exam.js 有两空 grid-in 分支', () => {
  const src = read('exam.js');
  assert.match(src, /q\.values\s*&&\s*q\.values\.length\s*>\s*1/, '缺少多空分支');
  assert.match(src, /drill-grid-multi/, '多空容器类名缺失');
  assert.match(src, /join\(', '\)/, '答案必须拼成「a, b」交给 dualCorrect');
});

test('多空输入框有样式（不与单框挤成一行）', () => {
  assert.match(read('bluebook.css'), /drill-grid-multi/, 'bluebook.css 缺多空样式');
});
