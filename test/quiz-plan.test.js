// 单元抽查卷长规律（产品定死，别再被「覆盖率」改动悄悄替换）：
//   错题 0–20  → 20 题，历史错题最多 10 道复测（不足 10 道全纳入，不凑数）
//   错题 21–25 → 25 题，其中 10 道历史错题
//   错题 26–30 → 30 题，其中 15 道历史错题
//   错题 > 30  → 30 题，其中 15 道历史错题
// 卷长不超过本单元题库实际题数；total 恒等于 mustWrong + otherCount。
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

global.window = {};
require(path.join(__dirname, '..', 'data', 'questions.js'));
const C = require(path.join(__dirname, '..', 'exam-core.js'));

function unitBank(n, unit) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ id: 'X' + unit + '-' + i, unit, section: (unit + '.' + (i % 5 + 1)), topic: 't' + (i % 5), no: i + 1 });
  }
  return out;
}
function wrongIds(n) {
  return Array.from({ length: n }, (_, i) => 'W' + i);
}
const CASES = [
  [0, 20, 0], [3, 20, 3], [5, 20, 5], [20, 20, 10],
  [21, 25, 10], [25, 25, 10],
  [26, 30, 15], [30, 30, 15], [35, 30, 15], [80, 30, 15]
];

test('错题数分档决定卷长与历史错题槽位', () => {
  const bank = unitBank(60, 2);
  for (const [w, total, must] of CASES) {
    const plan = C.quizPlan(wrongIds(w), bank);
    assert.strictEqual(plan.total, total, `错题 ${w} 应抽 ${total} 题`);
    assert.strictEqual(plan.mustWrong, must, `错题 ${w} 应含 ${must} 道历史错题`);
    assert.strictEqual(plan.total, plan.mustWrong + plan.otherCount, 'total 必须等于两个槽位之和');
cameFrom(plan, w);
  }
});

function cameFrom(plan, w) {
  assert.ok(plan.mustWrong <= w, '历史错题槽位不得超过实际错题数');
  assert.ok(plan.wrongIds.length <= plan.mustWrong, '选取的历史错题不得超过槽位');
}

test('没有错题时基础抽测恰好 20 道，不塞历史错题', () => {
  const plan = C.quizPlan([], unitBank(40, 1));
  assert.strictEqual(plan.total, 20);
  assert.strictEqual(plan.mustWrong, 0);
  assert.strictEqual(plan.wrongIds.length, 0);
});

test('本单元题库不足时分档题数被题库上限截断', () => {
  const bank = unitBank(12, 4);
  const plan = C.quizPlan(wrongIds(30), bank);
  assert.strictEqual(plan.total, 12);
  assert.strictEqual(plan.total, plan.mustWrong + plan.otherCount);
});
