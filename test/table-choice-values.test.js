// 「选项是表格」的题，四个表必须只有一个满足题干（方程/不等式/函数）。
// 这类题没法用眼睛对答案：表里的 x/y 成对，得逐行代进去算。之前 TD-15-06 的
// 题干是两个不等式组成的 system（y < -6x - 22 且 y > -4x - 7），只看第一条会
// 误判 C 也对；这里两条都代。
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const W = {};
global.window = W;
require(path.join(__dirname, '..', 'data', 'questions.js'));
require(path.join(__dirname, '..', 'data', 'text.js'));

const BANK = W.TD_BANK.questions;
const TEXT = W.TD_TEXT;
const textOf = (id) => (Array.isArray(TEXT) ? TEXT.find((x) => x.id === id) : TEXT[id]);

function num(s) {
  s = s.trim();
  if (/^-?\d+\/\d+$/.test(s)) {
    const p = s.split('/');
    return Number(p[0]) / Number(p[1]);
  }
  return Number(s);
}

// 两种写法都吃：`x: 1, 2, 4; y: ...` 与 `x=3,y=26; x=5,y=52; ...`
function rowsOf(choice) {
  const s = choice.replace(/\u2192/g, ';');
  const m = s.match(/^([^:]+):\s*([^;]+);\s*([^:]+):\s*(.+)$/);
  if (m) {
    const xs = m[2].split(',').map(num);
    const ys = m[4].split(',').map(num);
    return xs.length === ys.length ? xs.map((x, i) => [x, ys[i]]) : null;
  }
  const pairs = s.split(';').map((p) => p.trim()).filter(Boolean);
  const out = [];
  for (const p of pairs) {
    const q = p.match(/x\s*=\s*([^,]+),\s*y\s*=\s*(.+)$/);
    if (!q) return null;
    out.push([num(q[1]), num(q[2])]);
  }
  return out.length ? out : null;
}

const CASES = [
  // 01 册（原页缺失，值按题干代数复核；答案 D）
  ['SP1-047', (p) => Math.abs(3 / 5 * p[0] + 3 / 4 * p[1] - 7) < 1e-9],
  ['SP1-130', (p) => p[1] > 13 * p[0] - 18],
  ['SP1-131', (p) => p[1] > 8 * p[0] - 7],
  // 练习册（P80 #6、P90 #6 等，已对过原页）
  ['TD-11-22', (p) => Math.abs(7 * p[0] - 5 * p[1] + 70) < 1e-9],
  ['TD-15-06', (p) => p[1] < -6 * p[0] - 22 && p[1] > -4 * p[0] - 7],
  ['TD-33-13', (p) => Math.abs(p[1] - 21 * Math.pow(3, p[0])) < 1e-6],
];

for (const [id, ok] of CASES) {
  test(`${id} 只有一个选项满足题干，且与答案一致`, () => {
    const q = BANK.find((x) => x.id === id);
    const choices = textOf(id).choices;
    const pass = [];
    for (const L of ['A', 'B', 'C', 'D']) {
      const rows = rowsOf(choices[L]);
      assert.ok(rows, `${id} ${L} 解析不出 x/y 成对值`);
      if (rows.every(ok)) pass.push(L);
    }
    assert.strictEqual(pass.join(','), q.answer, `${id} 应只有 ${q.answer} 成立，实测 ${pass.join(',')}`);
  });
}
