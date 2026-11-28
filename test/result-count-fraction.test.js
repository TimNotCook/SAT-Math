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
});
