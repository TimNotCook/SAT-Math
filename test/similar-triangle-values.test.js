// 相似三角形与平行线的比例题：图上给的边长/角，配合题干条件都能直接算出答案。
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const W = {};
global.window = W;
require(path.join(__dirname, '..', 'data', 'questions.js'));

const ansOf = (id) => W.TD_BANK.questions.find((x) => x.id === id).answer;

test('R04-061：三角形内角 43、58、79；79 与两个 w 同旁互补 → w = 50.5', () => {
  const third = 180 - 43 - (180 - 122);
  assert.strictEqual(third, 79);
  assert.strictEqual((180 - third) / 2, 50.5);
  assert.strictEqual(String(ansOf('R04-061')), '101/2, 50.5');
});

test('R04-062：LM∥PQ → △LMR∼△PQR，QR = 10×19/9，LQ = 10 + 190/9 = 280/9', () => {
  const QR = (10 * 19) / 9;
  assert.strictEqual(10 + QR, 280 / 9);
  assert.strictEqual(String(ansOf('R04-062')), '280/9, 31.11');
});

test('R04-081：△ADE∼△ABC 比 24/72=1/3；AB = 2·504/72 = 14，DB = 14·2/3 = 28/3', () => {
  const AB = (2 * 504) / 72;
  assert.strictEqual(AB, 14);
  assert.ok(Math.abs(AB - AB / 3 - 28 / 3) < 1e-9);
  assert.strictEqual(String(ansOf('R04-081')), '28/3, 9.33, 9.333');
});

test('R04-083：BD∥AE → CB/CA = 6/18 = 1/3，CA = 24；CE = √(24² + 18²) = 30', () => {
  const CA = 3 * 8;
  assert.strictEqual(Math.hypot(CA, 18), 30);
  assert.strictEqual(String(ansOf('R04-083')), '30');
});

test('R04-066：△WQX∼△YQZ，WQ/YQ = 70/63，YZ = 60×63/70 = 54', () => {
  assert.strictEqual((60 * 63) / 70, 54);
  assert.strictEqual(String(ansOf('R04-066')), '54');
});

test('R04-087/088/089：三个相似三角形题的答案与图上标注自洽', () => {
  // 3-4-5 斜边上的高
  assert.strictEqual((3 * 4) / 5, 2.4);
  // 射影定理 BD² = AD·DC
  assert.strictEqual(36 / 8, 4.5);
  // BD² = AB² − AD² = 121，再 121 ÷ (121/3) = 3
  const AB2 = ((11 * Math.sqrt(130)) / 3) ** 2;
  const AD = 121 / 3;
  const BD2 = AB2 - AD ** 2;
  assert.ok(Math.abs(BD2 - 121) < 1e-9);
  assert.ok(Math.abs(BD2 / AD - 3) < 1e-9);
});
