const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadBank() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'data', 'questions.js'), 'utf8'), ctx);
  return ctx.window.TD_BANK;
}

test('每个小节声明数 = 题库实际题数', () => {
  const bank = loadBank();
  const count = {};
  bank.questions.filter((q) => !q.retired && !q.mergedInto).forEach((q) => { count[q.section] = (count[q.section] || 0) + 1; });
  const bad = [];
  bank.units.forEach((u) => {
    u.sections.filter((s) => !s.isGroup && !s.hidden).forEach((s) => {
      const actual = count[s.id] || 0;
      if (actual !== s.count) bad.push(`${s.id} 声明 ${s.count} 实际 ${actual}`);
    });
  });
  assert.deepStrictEqual(bad, [], '小节声明数必须与 questions.js 实际条数一致');
});

test('单元 total = 非分组小节题数之和 = 实际题数', () => {
  const bank = loadBank();
  const count = {};
  bank.questions.filter((q) => !q.retired && !q.mergedInto).forEach((q) => { count[q.section] = (count[q.section] || 0) + 1; });
  const bad = [];
  bank.units.forEach((u) => {
    const secs = u.sections.filter((s) => !s.isGroup && !s.hidden);
    const sum = secs.reduce((a, s) => a + s.count, 0);
    const actual = secs.reduce((a, s) => a + (count[s.id] || 0), 0);
    if (u.total !== sum || sum !== actual) bad.push(`U${u.id} total ${u.total} / 声明和 ${sum} / 实际 ${actual}`);
  });
  assert.deepStrictEqual(bad, [], '单元 total 必须与各小节一致');
});

test('题号 id 唯一（含已归并副本）', () => {
  const bank = loadBank();
  const seen = new Set();
  const dup = [];
  bank.questions.forEach((q) => {
    if (seen.has(q.id)) dup.push(q.id);
    seen.add(q.id);
  });
  assert.deepStrictEqual(dup, [], '题库 id 不能重复：' + dup.join(','));
});
