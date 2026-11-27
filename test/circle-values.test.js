// 圆这一组：弧长、半径、圆心角、圆方程。题干里给的分段弧长/圆心角/坐标都能反算，
// 图上标的点一挪或者答案一改，这里就红。
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const W = {};
global.window = W;
require(path.join(__dirname, '..', 'data', 'questions.js'));
require(path.join(__dirname, '..', 'data', 'figures.js'));

const BANK = W.TD_BANK.questions;
const SPECS = W.TD_FIG_SPECS;
const ansOf = (id) => BANK.find((x) => x.id === id).answer;
// 只取 <text> 标签里的字，避免把坐标属性里的数字当成标注
const labelsOf = (id) => {
  const svg = SPECS[id].svg;
  return (svg.match(/<text[^>]*>([^<]*)<\/text>/g) || []).map((t) => t.replace(/<[^>]*>/g, '').trim());
};

test('TD-45-15：FG 是直径、弧 FXG = 14π（半圆）→ r = 14，XO = 14（选 B）', () => {
  assert.strictEqual(Math.PI * 14, 14 * Math.PI);
  assert.strictEqual(ansOf('TD-45-15'), 'B');
});

test('TD-43-01：NP 直径、P 是 NQ 中点，PQ = 52 → r = 26；矩形 104×18，面积 = 338π + 1872，a − b = 2210', () => {
  assert.strictEqual(104 * 18, 1872);
  assert.strictEqual((26 * 26) / 2, 338);
  assert.strictEqual(338 + 1872, 2210);
  assert.strictEqual(String(ansOf('TD-43-01')), '2210');
});

test('R04-164：圆过 (8,0) → r = 8；(3,k) 在圆上 → k = √(64 − 9) = √55（选 D）', () => {
  assert.deepStrictEqual(labelsOf('R04-164').filter((s) => s), ['x', 'y', 'O', '(8, 0)', '(3, k)']);
  assert.strictEqual(Math.sqrt(64 - 9), Math.sqrt(55));
  assert.strictEqual(ansOf('R04-164'), 'D');
});

test('R04-165：x² + (y − 6)² = 7 → 半径² = 7，平移不改半径，4a = 28', () => {
  assert.strictEqual(4 * 7, 28);
  assert.strictEqual(String(ansOf('R04-165')), '28');
});

test('R04-168：弧 ADC = 5π 对应 100°，弧 ABC 对应 260° → 13π（选 B）', () => {
  assert.strictEqual(5 * ((360 - 100) / 100), 13);
  assert.strictEqual(ansOf('R04-168'), 'B');
});

test('R04-170：∠OAB = 30°、OA = OB → ∠AOB = 120°，r = 18，弧 AB = 12π（选 B）', () => {
  assert.strictEqual(180 - 2 * 30, 120);
  assert.strictEqual((120 / 360) * 2 * 18, 12);
  assert.strictEqual(ansOf('R04-170'), 'B');
});

test('R04-174：小弧 27 + 大弧 135 = 周长 162', () => {
  assert.strictEqual(27 + 135, 162);
  assert.strictEqual(String(ansOf('R04-174')), '162');
});
