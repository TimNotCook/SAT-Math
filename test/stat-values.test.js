// 统计题（均值/中位数/标准差）的答案可以纯算出来，不该只靠目视比对。
// 这 7 道题的原始数据都写在题干里，测试里重算一遍，和题库答案对上。
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const W = {};
global.window = W;
require(path.join(__dirname, '..', 'data', 'questions.js'));
require(path.join(__dirname, '..', 'data', 'text.js'));

const BANK = W.TD_BANK.questions;
const TEXT = W.TD_TEXT;
const ansOf = (id) => BANK.find((x) => x.id === id).answer;

const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const median = (a) => {
  const s = a.slice().sort((p, q) => p - q);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};
const sd = (a) => {
  const m = mean(a);
  return Math.sqrt(mean(a.map((v) => (v - m) ** 2)));
};

test('TD-25-09 十个数均值 = 7（选 C）', () => {
  const a = [4, 6, 12, 2, 13, 18, 6, 3, 3, 3];
  assert.strictEqual(a.length, 10);
  assert.strictEqual(mean(a), 7);
  assert.strictEqual(ansOf('TD-25-09'), 'C');
});

test('TD-25-19 加一个 41 后中位数不变（选 C）', () => {
  const a = [5, 8, 11, 11, 14, 20];
  const b = a.concat([41]);
  assert.strictEqual(median(a), 11);
  assert.strictEqual(median(b), 11);
  assert.strictEqual(ansOf('TD-25-19'), 'C');
});

test('TD-25-20 中位数 = 18', () => {
  assert.strictEqual(median([12, 12, 18, 24, 29]), 18);
  assert.strictEqual(String(ansOf('TD-25-20')), '18');
});

test('R03-140 均值比较：A(3.8) < B(4.75)（选 A）', () => {
  assert.ok(mean([2, 3, 4, 5, 5]) < mean([2, 3, 4, 10]));
  assert.strictEqual(ansOf('R03-140'), 'A');
});

test('R03-141 缺的那个整数只能是 52', () => {
  const nine = [43, 45, 44, 43, 38, 39, 40, 46, 40];
  const sum9 = nine.reduce((s, v) => s + v, 0);
  assert.strictEqual(sum9, 378);
  assert.strictEqual(sum9 / 9, 42);
  // 10 个正整数、均值是大于 42 的整数 → 总和最小 430；且每个数 < 60
  const x = 430 - sum9;
  assert.ok(x < 60);
  assert.strictEqual(String(ansOf('R03-141')), String(x));
});

test('R03-142 去掉 14 前后中位数都是 6（选 B）', () => {
  const a = [4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 14];
  const b = a.filter((v) => v !== 14);
  assert.strictEqual(median(a), 6);
  assert.strictEqual(median(b), 6);
  assert.strictEqual(ansOf('R03-142'), 'B');
});

test('TD-25-17 加 49 才让标准差变小（选 B）', () => {
  const a = [24, 34, 44, 54, 64];
  const base = sd(a);
  // 题干印的是 "approximately 14.10"，总体标准差算出来 14.142，四舍五入到两位是 14.14，
  // 原书这个 14.10 本身是近似值，容差放到 0.05
  assert.ok(Math.abs(base - 14.10) < 0.05);
  assert.ok(sd(a.concat([49])) < base);
  assert.ok(sd(a.concat([14])) > base);
  assert.ok(sd(a.concat([74])) > base);
  assert.strictEqual(ansOf('TD-25-17'), 'B');
});
