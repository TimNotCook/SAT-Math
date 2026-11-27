// 双向表/频数表的条件概率：答案完全等于「某格 ÷ 某行(列)合计」，
// 表格数字一改这里就红。
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
const n = (v) => Number(String(v).replace(/,/g, ''));
const cell = (id, r, c) => n(SPECS[id].rows[r][c]);

test('TD-24-14：P(站点 A | red maple) = 35/50 = 0.7', () => {
  assert.strictEqual(cell('TD-24-14', 0, 1) / cell('TD-24-14', 0, 3), 0.7);
  assert.strictEqual(String(ansOf('TD-24-14')), '0.7');
});

test('TD-24-16：P(medium | Flames) = 24/48 = 1/2', () => {
  assert.strictEqual(cell('TD-24-16', 1, 1) / cell('TD-24-16', 3, 1), 0.5);
  assert.strictEqual(String(ansOf('TD-24-16')), '1/2');
});

test('R03-243：email 是 phone 的两倍，野餐里 email 0.05×2N、phone 0.20×N → 1/3', () => {
  const email = 0.05 * 2;
  const phone = 0.20 * 1;
  assert.strictEqual(email / (email + phone), 1 / 3);
  assert.strictEqual(String(ansOf('R03-243')), '1/3');
});

test('R03-245：至少 10 岁共 60 人，其中 Group A 14+9=23 → 23/60', () => {
  const atLeast10 = cell('R03-245', 3, 2) + cell('R03-245', 3, 3);
  const groupA = cell('R03-245', 0, 2) + cell('R03-245', 0, 3);
  assert.strictEqual(atLeast10, 60);
  assert.strictEqual(groupA / atLeast10, 23 / 60);
  assert.strictEqual(String(ansOf('R03-245')), '23/60');
});

test('R03-246：数学 20 人 / 总 80 人 = 1/4', () => {
  assert.strictEqual(cell('R03-246', 1, 4) / cell('R03-246', 4, 4), 0.25);
  assert.strictEqual(String(ansOf('R03-246')), '1/4');
});

test('R03-248：满分 5 共 7 人，Day2+Day3 是 2+3 → 5/7', () => {
  const five = cell('R03-248', 3, 1);
  const d2d3 = cell('R03-248', 1, 1) + cell('R03-248', 2, 1);
  assert.strictEqual(five, 7);
  assert.strictEqual(d2d3, 5);
  assert.strictEqual(d2d3 / five, 5 / 7);
  assert.strictEqual(String(ansOf('R03-248')), '5/7');
});

test('TD-24-04：至少 10 岁 80 人，Group A 18+7=25 → 5/16（选 B）', () => {
  const atLeast10 = cell('TD-24-04', 3, 2) + cell('TD-24-04', 3, 3);
  const groupA = cell('TD-24-04', 0, 2) + cell('TD-24-04', 0, 3);
  assert.strictEqual(atLeast10, 80);
  assert.strictEqual(groupA / atLeast10, 5 / 16);
  assert.strictEqual(ansOf('TD-24-04'), 'B');
});

test('TD-24-13：灰狼黄眼 16 + 郊狼棕眼 5 = 21，占 30 → 21/30（选 C）', () => {
  const target = cell('TD-24-13', 0, 1) + cell('TD-24-13', 1, 2);
  assert.strictEqual(target, 21);
  assert.strictEqual(target / cell('TD-24-13', 2, 3), 21 / 30);
  assert.strictEqual(ansOf('TD-24-13'), 'C');
});
