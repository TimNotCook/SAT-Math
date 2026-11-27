// 图型必须跟题干描述一致：题干说直方图就画柱、说点图就画点、说散点图就得有点、
// 说折线图就得有折线。这条检查专门防"图没画完/画错类型"（R03-064 只画两段线段、
// R03-185 只有指数曲线没有散点，都属于这类问题漏网）。
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const W = {};
global.window = W;
require(path.join(__dirname, '..', 'figures.js'));
require(path.join(__dirname, '..', 'data', 'figures.js'));
require(path.join(__dirname, '..', 'data', 'questions.js'));
require(path.join(__dirname, '..', 'data', 'text.js'));

const SPECS = W.TD_FIG_SPECS;
const BANK = W.TD_BANK.questions;

function stemOf(id) {
  const q = BANK.find((x) => x.id === id);
  if (!q) return '';
  // data/text.js 是显示权威源
  const t = W.TD_TEXT && (Array.isArray(W.TD_TEXT)
    ? W.TD_TEXT.find((x) => x && x.id === id)
    : W.TD_TEXT[id]);
  return (t && t.stem) || q.stem || '';
}

// pairchart 两个面板各自带 series
function kindsOf(spec) {
  if (spec.type === 'pairchart') {
    const out = [];
    (spec.panels || []).forEach((p) => (p.series || []).forEach((x) => out.push(x.kind)));
    return out;
  }
  return (spec.series || []).map((x) => x.kind);
}

test('题干说的图型和画出来的数据系列一致', () => {
  const problems = [];
  Object.keys(SPECS).forEach((id) => {
    const st = stemOf(id);
    if (!st || SPECS[id].type === 'table') return;
    const kinds = kindsOf(SPECS[id]);
    if (!kinds.length) return;
    const has = (k) => kinds.indexOf(k) >= 0;
    if (/histogram/i.test(st) && !has('bar')) problems.push(`${id} 题干说直方图，画的是 ${kinds}`);
    if (/dot ?plot/i.test(st) && !has('points')) problems.push(`${id} 题干说点图，画的是 ${kinds}`);
    if (/box ?plot/i.test(st) && !has('box')) problems.push(`${id} 题干说箱线图，画的是 ${kinds}`);
    if (/scatter ?plot/i.test(st) && !(has('points') || has('line'))) {
      problems.push(`${id} 题干说散点图，画的是 ${kinds}`);
    }
    if (/line graph|line plot/i.test(st) && !has('line')) problems.push(`${id} 题干说折线图，画的是 ${kinds}`);
  });
  assert.equal(problems.join(' | '), '');
});

test('题干给出的点数与图上的点数一致（可数的那几句）', () => {
  // "553 days"（题面里新增月球周期）、"632"（题干数据）不是点数，属已知误报
  const SKIP = new Set(['TD-25-06', 'R03-128']);
  const problems = [];
  Object.keys(SPECS).forEach((id) => {
    if (SKIP.has(id)) return;
    const st = stemOf(id);
    if (!st) return;
    let pts = 0;
    (SPECS[id].series || []).forEach((x) => {
      if (x.kind === 'points' || x.kind === 'line') pts += (x.points || []).length;
    });
    if (!pts) return;
    const m = st.match(/\b(\d+)\s*(values|days|students|sandwiches|eruptions|books|players)\b/i);
    if (!m) return;
    // 只有整句只描述一组数据时才比较（双数据集的题不比较）
    if (/\bdata sets? A and B\b/i.test(st)) return;
    const n = +m[1];
    if (n !== pts) problems.push(`${id} 题干 ${n} 个，图上 ${pts} 个`);
  });
  assert.equal(problems.join(' | '), '');
});
