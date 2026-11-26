'use strict';
/* 题面「线名」一致性（零外部依赖）
 *
 * 2026-11-27 发现两处线名串台：
 *   SP1-085 原题是「Line k shown；Line j (not shown) 与 k 垂直；问 j 的斜率」，
 *           却写成「问 line ℓ 的斜率」，而全题从没定义 ℓ。
 *   SP1-084 问的是「equation of line ℓ」，前半句却写成「Line j is perpendicular」，
 *           同一题里 j 与 ℓ 混用。
 * 这里锁死：全库任何题干都不同时出现 "line j" 与 "line ℓ"；这两题各自的问句与
 * 定义句必须指向同一个字母；且 data/questions.js 与 data/text.js 的题干已同步。
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
function loadWindow(file) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  return ctx.window;
}
const TEXT = loadWindow(path.join(ROOT, 'data/text.js')).TD_TEXT;
const BANK = loadWindow(path.join(ROOT, 'data/questions.js')).TD_BANK;
const QS = BANK.questions || BANK;
const BY_ID = Object.fromEntries(QS.map((q) => [q.id, q]));

test('全库没有题干同时使用 line j 和 line ℓ', () => {
  for (const id of Object.keys(TEXT)) {
    const s = TEXT[id].stem || '';
    assert.ok(!(/line j\b/.test(s) && /line ℓ/.test(s)), `${id} 同时出现 line j 与 line ℓ`);
  }
});

test('SP1-085 只谈 k 与 j，并问 j 的斜率', () => {
  const s = TEXT['SP1-085'].stem;
  assert.ok(!/ℓ/.test(s), 'SP1-085 不应出现 ℓ');
  assert.match(s, /Line j \(not shown\) is perpendicular to line k/);
  assert.match(s, /What is the slope of line j\?/);
});

test('SP1-084 的垂线与截距、问句都指向同一条线', () => {
  const s = TEXT['SP1-084'].stem;
  assert.ok(!/line j\b/i.test(s), 'SP1-084 不应出现 line j');
  assert.match(s, /Line ℓ is perpendicular to line k/);
  assert.match(s, /y-intercept of line ℓ is \(0, 3\)/);
  assert.match(s, /equation of line ℓ/);
});

test('这两题的题干在 questions.js 与 text.js 里已同步', () => {
  const norm = (x) => String(x || '').replace(/\s+/g, ' ').trim();
  for (const id of ['SP1-084', 'SP1-085']) {
    assert.equal(norm(TEXT[id].stem), norm(BY_ID[id].stem), `${id} 两个文件题干不一致`);
  }
});
