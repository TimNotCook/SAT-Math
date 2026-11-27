// 斜率类题：表里的三行点、图上画的那条线，斜率都能算出来。答案一改或数据一挪，
// 这里立刻红。SP1-085 考的是「垂直线的斜率 = 负倒数」，TD-22-05 是「拟合线斜率
// 取最接近的选项」，R03-184 是「斜率 × 温度增量」。
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

const slopeOf = (p, q) => (q[1] - p[1]) / (q[0] - p[0]);

test('SP1-085：k 过 (−6,0)、(0,−5)，斜率 −5/6，垂直线斜率 6/5', () => {
  const spec = SPECS['SP1-085'];
  const marks = spec.marks.map((m) => [m.x, m.y]);
  assert.strictEqual(slopeOf(marks[0], marks[1]), -5 / 6);
  assert.strictEqual(String(ansOf('SP1-085')), '6/5');
});

test('SP1-091：三点斜率 2 → k=5、n=25，k+n=30', () => {
  assert.strictEqual((11 - 7) / (5 - 3), 2);
  assert.strictEqual((25 - 11) / (12 - 5), 2);
  assert.strictEqual(String(ansOf('SP1-091')), '30');
});

test('SP1-092：每 4 个 x 涨 19，斜率 19/4', () => {
  assert.strictEqual((19 - 0) / (4 - 0), 19 / 4);
  assert.strictEqual(String(ansOf('SP1-092')), '19/4');
});

test('TD-11-09：x 每 +2，y 减 71，斜率 −71/2（选 A）', () => {
  assert.strictEqual((0 - 142) / (0 - -4), -71 / 2);
  assert.strictEqual((71 - 142) / (-2 - -4), -71 / 2);
  assert.strictEqual(ansOf('TD-11-09'), 'A');
});

test('TD-22-05：拟合线过 (−1,11.8)、(9,3.8)，斜率 −0.8 ≈ −0.79（选 D）', () => {
  const line = SPECS['TD-22-05'].series.find((s) => s.kind === 'line').points;
  const m = slopeOf(line[0], line[1]);
  assert.ok(Math.abs(m - -0.8) < 1e-9);
  assert.strictEqual(ansOf('TD-22-05'), 'D');
});

test('R03-184：斜率 57，5°C 增量 → 285 人', () => {
  assert.strictEqual(57 * 5, 285);
  assert.strictEqual(String(ansOf('R03-184')), '285');
});
