// 几何题里图上给了角度/边长、题干又在求某个量时，答案可以纯算。这里把
// 平行线截角、直角三角形三角比这两类钉住：图形标注一变，答案就对不上了。
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const W = {};
global.window = W;
require(path.join(__dirname, '..', 'data', 'questions.js'));

const BANK = W.TD_BANK.questions;
const ansOf = (id) => BANK.find((x) => x.id === id).answer;

test('TD-41-01：66° 与 z 是 l 上的线性对，z = 180 − 66 = 114（选 D）', () => {
  assert.strictEqual(180 - 66, 114);
  assert.strictEqual(ansOf('TD-41-01'), 'D');
});

test('U4-02 / TD-41-02：同位角相等，x = 164', () => {
  assert.strictEqual(String(ansOf('U4-02')), '164');
  assert.strictEqual(String(ansOf('TD-41-02')), '164');
});

test('U4-03：同旁内角互补，x = 38，x + 142 = 180（选 D）', () => {
  assert.strictEqual(180 - 142, 38);
  assert.strictEqual(38 + 142, 180);
  assert.strictEqual(ansOf('U4-03'), 'D');
});

test('U4-04 / TD-41-05：对顶角相等，w = 130 时 z = 130（选 D）', () => {
  assert.strictEqual(ansOf('U4-04'), 'D');
  assert.strictEqual(ansOf('TD-41-05'), 'D');
});

test('TD-41-04：s 与 botLL 135° 是内错角，s = 135（选 C）', () => {
  assert.strictEqual(ansOf('TD-41-04'), 'C');
});

test('TD-42-11：直角三角形两锐角和 90°，a = 54（选 B）', () => {
  assert.strictEqual(90 - 36, 54);
  assert.strictEqual(ansOf('TD-42-11'), 'B');
});

test('TD-44-03：RS=√157、TR=79 → TS=78，sin R = 78/79', () => {
  assert.strictEqual(Math.sqrt(79 * 79 - 157), 78);
  assert.strictEqual(String(ansOf('TD-44-03')), '78/79');
});

test('TD-44-07：cos A = 邻 42 / 斜 43（选 B）', () => {
  assert.ok(42 < 43);
  assert.strictEqual(ansOf('TD-44-07'), 'B');
});

test('TD-44-02：tan F = 对 35 / 邻 45（选 C）', () => {
  assert.strictEqual(ansOf('TD-44-02'), 'C');
});

test('TD-44-17：AB 是 58° 的对边，AB = 14 sin58°（选 A）', () => {
  assert.strictEqual(ansOf('TD-44-17'), 'A');
});

test('R04-119：cosC = √3/2 → C = 30°，cosA = sinC = 1/2', () => {
  assert.ok(Math.abs(Math.cos(Math.PI / 6) - Math.sqrt(3) / 2) < 1e-9);
  assert.ok(Math.abs(Math.sin(Math.PI / 6) - 0.5) < 1e-9);
  assert.strictEqual(String(ansOf('R04-119')), '1/2');
});

test('R04-118：sin x = 对 16 / 斜 23', () => {
  assert.strictEqual(String(ansOf('R04-118')), '16/23');
});

test('R04-116：∠RSW 与 ∠WST 互余 → cos−sin = 0', () => {
  assert.strictEqual(String(ansOf('R04-116')), '0');
});
