/* 37 道填空题（SP2 系列）题库里只有 value、没有 answer。
   2026-11-27 踩过：记录页「正确 —」把正确答案吞掉，因为存档写的是 answer(null)，
   而 scoreSession 直接透传 q.answer。两条路径都要兜底。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
/* exam-core 判分走 window.TDGrade，grade-core 直接挂 window，必须先搭壳再加载 */
global.window = {};
require(path.join(ROOT, 'grade-core.js'));
const core = require(path.join(ROOT, 'exam-core.js'));

test('scoreSession 把 grid 的 value 落进 answer', () => {
  const out = core.scoreSession(
    [{ id: 'SP2-003', type: 'grid', unit: 3, section: '3.x', topic: 't', source: 's', value: 588, answer: null, level: 2 }],
    { 'SP2-003': { v: '588' } }
  );
  assert.strictEqual(out[0].answer, 588, 'answer 为 null 时必须回填 value');
  assert.strictEqual(out[0].correct, true);
});

test('scoreSession 不动已有 answer，多空 values 用逗号连接', () => {
  const out = core.scoreSession(
    [
      { id: 'A', type: 'grid', value: 12, answer: '12 or 13' },
      { id: 'B', type: 'grid', value: null, answer: null, values: ['12', '34'] }
    ],
    {}
  );
  assert.strictEqual(out[0].answer, '12 or 13');
  assert.strictEqual(out[1].answer, '12, 34');
});

test('成绩页逐题回顾对旧存档也能补出正确答案', () => {
  const s = fs.readFileSync(path.join(ROOT, 'exam.js'), 'utf8');
  assert.match(s, /let dAnswer = safeText\(d\.answer\) \|\| safeText\(d\.value\)/, '成绩页缺 d.answer/d.value 兜底');
  assert.match(s, /dAnswer = safeText\(bankQ\.answer\)/, '成绩页缺按题号回查题库 answer 的兜底');
  assert.match(s, /bankQ\.type === 'grid'[\s\S]{0,100}bankQ\.value/, '成绩页缺填空 value 兜底');
  assert.ok(s.includes("esc(dAnswer || '—')"), '渲染必须用兜底后的 dAnswer');
});

test('记录页对旧存档也能补出正确答案', () => {
  const s = fs.readFileSync(path.join(ROOT, 'history-page.js'), 'utf8');
  assert.match(s, /txt\(d\.answer\) \|\| txt\(d\.value\)/, '缺 d.value 兜底');
  assert.match(s, /q\.type === 'grid'[\s\S]{0,80}q\.value/, '缺按题号回查题库 value 的兜底');
  assert.ok(s.includes("esc(corr || '—')"), '渲染必须用兜底后的 corr');
});
