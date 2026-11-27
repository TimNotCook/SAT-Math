const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

global.window = {};
require(path.join(__dirname, '..', 'data', 'figures.js'));
const G = global.window.TD_CHOICE_GRAPHS;

function lineOf(id, L) {
  const s = G[id] && G[id][L];
  const se = (s && s.series && s.series[0]) || {};
  assert.strictEqual(se.kind, 'line', id + ' ' + L + ' 应为直线');
  const [p, q] = se.points;
  const slope = (q[1] - p[1]) / (q[0] - p[0]);
  const yInt = p[1] - slope * p[0];
  return { p, q, slope, yInt, xInt: -yInt / slope };
}

test('TD-22-14：40x+30y=600 ⇒ y=20−(4/3)x，只有 B 的坐标轴与截距同时正确', () => {
  const A = lineOf('TD-22-14', 'A');
  const B = lineOf('TD-22-14', 'B');
  const C = lineOf('TD-22-14', 'C');
  const D = lineOf('TD-22-14', 'D');
  // A/D 截距对调、C 两截距相等、D 正斜率——都是干扰项
  assert.ok(Math.abs(A.xInt - 20) < 1e-9 && Math.abs(A.yInt - 15) < 1e-9, 'A 应为 x 截距 20 / y 截距 15');
  assert.ok(Math.abs(B.xInt - 15) < 1e-9 && Math.abs(B.yInt - 20) < 1e-9, 'B 应为 x 截距 15 / y 截距 20');
  assert.ok(Math.abs(B.slope + 4 / 3) < 1e-9, 'B 斜率应为 −4/3');
  assert.ok(Math.abs(C.xInt - 15) < 1e-9 && Math.abs(C.yInt - 15) < 1e-9, 'C 两截距同为 15');
  assert.ok(D.slope > 0 && Math.abs(D.yInt) < 1e-9, 'D 应过原点且斜率为正');
  // 40x+30y=600 的截距必须是 x=15、y=20；只有 B 对
  for (const [L, g] of Object.entries({ A, B, C, D })) {
    const ok = Math.abs(g.xInt - 15) < 1e-9 && Math.abs(g.yInt - 20) < 1e-9;
    assert.strictEqual(ok, L === 'B', L + ' 与原书方程的一致性判定');
  }
  // 四格都印了轴标题，且刻度与原书一致（A/B 每 5 一格、C/D 每 2 一格）
  assert.strictEqual(G['TD-22-14'].A.x.label, 'Number of oak trees');
  assert.strictEqual(G['TD-22-14'].A.y.label, 'Number of pine trees');
  assert.strictEqual(G['TD-22-14'].A.x.step, 5);
  assert.strictEqual(G['TD-22-14'].C.x.step, 2);
  assert.strictEqual(G['TD-22-14'].A.x.max, 40);
  assert.strictEqual(G['TD-22-14'].C.x.max, 20);
});

test('TD-33-18：只有 D 是「递减的指数」——A/B 是直线、C 是递增指数', () => {
  const kinds = ['A', 'B', 'C', 'D'].map(L => (G['TD-33-18'][L].series[0].kind));
  assert.deepStrictEqual(kinds.join('|'), 'line|line|exp|exp');
  const A = lineOf('TD-33-18', 'A');
  assert.ok(Math.abs(A.slope - 1.25) < 1e-9, 'A 斜率应为 5/4（过 (2,0)、(10,10)）');
  assert.ok(Math.abs(A.xInt - 2) < 1e-9, 'A 的 x 截距应为 2');
  const C = G['TD-33-18'].C.series[0];
  const D = G['TD-33-18'].D.series[0];
  assert.ok(C.b > 1, 'C 必须是递增指数');
  assert.ok(D.b < 1, 'D 必须是递减指数');
  // 递减且过 (0,10) 附近、x=2 时约 1.2
  assert.ok(Math.abs(D.a - 10) < 1e-9 && Math.abs(D.a * Math.pow(D.b, 2) - 1.2) < 0.15);
});

function polyOf(id, L) {
  const se = G[id][L].series[0];
  assert.strictEqual(se.kind, 'poly', id + ' ' + L + ' 应为多项式');
  return se;
}
function valAt(se, t) {
  let v = se.sign;
  se.roots.forEach(r => { v *= (t - r); });
  return v * (se.k || 1);
}
function extrema(se) {
  let lo = { v: 0, t: 0 }, hi = { v: 0, t: 0 };
  for (let t = se.roots[0]; t <= se.roots[se.roots.length - 1]; t += 0.002) {
    const v = valAt(se, t);
    if (v < lo.v) lo = { v, t };
    if (v > hi.v) hi = { v, t };
  }
  return { lo, hi };
}

test('TD-33-19：只有 A 同时过 (−5,0) 与 (7,0)，四个选项各自形状与原书读数一致', () => {
  const A = polyOf('TD-33-19', 'A');
  const B = polyOf('TD-33-19', 'B');
  const C = polyOf('TD-33-19', 'C');
  const D = polyOf('TD-33-19', 'D');
  // 题目条件：f(7)=0 且 (x+5) 是因式 ⇒ 图像必须过 (−5,0) 与 (7,0)
  for (const [L, se] of Object.entries({ A, B, C, D })) {
    const hasMinus5 = se.roots.includes(-5);
    const has7 = se.roots.includes(7);
    assert.strictEqual(hasMinus5 && has7, L === 'A', L + ' 是否满足题目条件');
  }
  // A：零点 −5 / 1 / 7，极小 ≈(−2.5,−3.6)、极大 ≈(4.5,3.6)
  const ea = extrema(A);
  assert.ok(Math.abs(ea.lo.t + 2.5) < 0.2 && Math.abs(ea.lo.v + 3.6) < 0.15, 'A 的极小位置/深度');
  assert.ok(Math.abs(ea.hi.t - 4.5) < 0.2 && Math.abs(ea.hi.v - 3.6) < 0.15, 'A 的极大位置/高度');
  // C：x=−0.4 处与 x 轴相切（二重根），极大 ≈(4.5,3.5)
  assert.deepStrictEqual(C.roots.join('|'), '-0.4|-0.4|7');
  const ec = extrema(C);
  assert.ok(Math.abs(ec.hi.v - 3.5) < 0.2, 'C 的峰高');
  // D：零点 0.3 / 6 / 8.6，极小 ≈(2.5,−2.0)，极大只有 ≈(7.4,0.5)
  assert.ok(Math.abs(valAt(D, 0.3)) < 1e-9 && Math.abs(valAt(D, 6)) < 1e-9 && Math.abs(valAt(D, 8.6)) < 1e-9);
  const ed = extrema(D);
  assert.ok(Math.abs(ed.lo.v + 2.0) < 0.1 && Math.abs(ed.lo.t - 2.5) < 0.2, 'D 的极小');
  assert.ok(Math.abs(ed.hi.v - 0.5) < 0.1 && Math.abs(ed.hi.t - 7.4) < 0.2, 'D 的极大很浅');
  // B：零点 −7 / −1 / 5.2，双峰 ≈±3.5
  assert.ok(Math.abs(valAt(B, -7)) < 1e-9 && Math.abs(valAt(B, -1)) < 1e-9 && Math.abs(valAt(B, 5.2)) < 1e-9);
  const eb = extrema(B);
  assert.ok(Math.abs(eb.lo.v + 3.4) < 0.2 && Math.abs(eb.hi.v - 3.6) < 0.2, 'B 的谷/峰高度');
});

test('TD-33-19 / TD-33-18 / TD-22-14 的坐标轴框都覆盖所有零点与极值', () => {
  for (const L of 'ABCD') {
    const s = G['TD-33-19'][L];
    assert.strictEqual(s.x.min, -9);
    assert.strictEqual(s.x.max, 9);
    assert.strictEqual(s.x.step, 1);
    const se = s.series[0];
    se.roots.forEach(r => assert.ok(r > s.x.min && r < s.x.max, L + ' 的零点 ' + r + ' 应在框内'));
    const e = extrema(se);
    for (const p of [e.lo, e.hi]) {
      assert.ok(p.v > s.y.min && p.v < s.y.max, L + ' 的极值 ' + p.v + ' 应在框内');
    }
    assert.strictEqual(s.axisLabelsEnd, undefined, L + ' 的轴标题应印在箭头端（默认）');
  }
  assert.strictEqual(G['TD-22-14'].A.axisLabelsEnd, false, 'TD-22-14 用书名式轴标题（居中/竖排）');
});
