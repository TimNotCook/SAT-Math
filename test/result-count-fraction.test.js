/* test/result-count-fraction.test.js — 成绩页题数/答对数必须是整数 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(ROOT, 'exam.js'), 'utf8');

test('成绩页 total/correct 走 countNum，小数不直接进「correct / total」', () => {
  const seg = js.slice(js.indexOf('function renderResult()'), js.indexOf('function renderResultList'));
  assert.match(seg, /const rTotal = countNum\(r\.total\)/, 'total 仍裸用 safeNum，22.5 会印成「10 / 22.5」');
  assert.match(seg, /const rCorrect = countNum\(r\.correct\)/, 'correct 仍裸用 safeNum，10.9 会印成「10.9 / 22」');
  assert.match(js, /Math\.floor\(n\) === n/, 'countNum 没有只收整数');
  assert.match(seg, /const scaledRaw = countNum\(est\.scaled\)/, '换算分裸用 safeNum，555.5 会印成 555.5 / 800');
  assert.match(seg, /const rawN = countNum\(est\.raw\)/, '原始分裸用 safeNum，3.7 会印成 3.7 / 44');
  assert.match(seg, /if \(MODE === 'mock' && total > 44\) total = 44;/, '模考 total 999 没有封顶，成绩页会印 30 / 999');
});
