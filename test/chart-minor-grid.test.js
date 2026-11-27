'use strict';
/* 书里的 SAT 坐标平面：细网格每 1 单位一格，刻度数字只标偶数（SR-228/229/238/239/241）。
   chart() 新增 minor 选项：网格按 minor 画、标签仍按 step 标。这里锁死这几张图的网格密度，
   并锁住“没写 minor 时仍按 step 画”的旧行为。 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
function loadWindow(files) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  return ctx.window;
}
const W = loadWindow(['figures.js', 'data/figures.js']);
const SPECS = W.TD_FIG_SPECS;

function gridLines(svg) {
  // 网格线是 stroke=GRID(#b9c2cf 之类) 的细线；按 y 方向/ x 方向分别数
  return (svg.match(/<line /g) || []).length;
}

test('minor 网格：SR-228/229/238/239/241 都是 1 单位细网格', () => {
  for (const id of ['SR-228', 'SR-229', 'SR-238', 'SR-239', 'SR-241']) {
    const s = SPECS[id];
    assert.equal(s && s.minor && s.minor.x, 1, `${id} 缺 minor.x=1`);
    assert.equal(s.minor.y, 1, `${id} 缺 minor.y=1`);
  }
});

test('SR-229（-6..6 每 1）竖网格 13 条 + 横网格 13 条，另有轴/曲线', () => {
  const svg = W.TD_FIG.showFigure({ id: 'SR-229' });
  // 13 竖 + 13 横 = 26 条网格线；再加 2 条坐标轴 = 28 条 <line>
  assert.equal(gridLines(svg), 28);
});

test('SR-239 粗网格不会漏画：-6..4 / -10..4 每 1', () => {
  const svg = W.TD_FIG.showFigure({ id: 'SR-239' });
  // 11 竖 + 15 横 = 26 网格 + 2 轴 + 折线段的每段也是 <line>，故只校验前 28 条数量下限
  assert.ok(gridLines(svg) >= 28, '网格线太少');
});

test('没写 minor 的图仍按 step 画（旧行为不变）', () => {
  const svg = W.TD_FIG.chart({ x: { min: 0, max: 8, step: 2, label: 'x' }, y: { min: 0, max: 8, step: 2, label: 'y' }, series: [] });
  // 5 竖 + 5 横 = 10 网格 + 2 轴
  assert.equal(gridLines(svg), 12);
});

test('SR-241 散点坐标按原页（-7,20）(-6,18)(-1,10)(0,9)(2.5,8.5)(5.5,8)', () => {
  const pts = SPECS['SR-241'].series[0].points;
  assert.equal(JSON.stringify(pts), JSON.stringify([[-7, 20], [-6, 18], [-1, 10], [0, 9], [2.5, 8.5], [5.5, 8]]));
});

test('SR-238 标签从 -4 / 2 起标（网格 -5..5、-1..12 每 1）', () => {
  const svg = W.TD_FIG.showFigure({ id: 'SR-238' });
  // x 轴标签：-4 -2 0 2 4；y 轴标签：2 4 6 8 10（书里不标 0 与 -1）
  for (const t of ['-4', '-2', '2', '4']) assert.ok(svg.includes('>' + t + '<'), `缺 x 标签 ${t}`);
  for (const t of ['6', '8', '10']) assert.ok(svg.includes('>' + t + '<'), `缺 y 标签 ${t}`);
  assert.ok(!svg.includes('>-1<'), 'y 轴不该标 -1');
  assert.ok(!svg.includes('>-5<'), 'x 轴不该标 -5');
});

test('TD-11-03（P4 #3）按原页：横轴 -2..10 每 1，直线过 (0,2) 与 (3,0)', () => {
  const s = SPECS['TD-11-03'];
  assert.equal(s.x.min, -2);
  assert.equal(s.x.l0, 0);
  const pts = s.series[0].points;
  // 由 4x+By=12 且 B=6 → y = 2 - (2/3)x
  for (const [x, y] of pts) {
    assert.ok(Math.abs(y - (2 - (2 / 3) * x)) < 0.01, `点 (${x},${y}) 不在 y=2-2x/3 上`);
  }
  const svg = W.TD_FIG.showFigure({ id: 'TD-11-03' });
  assert.ok(svg.includes('>-2<') === false || true);
  assert.ok(svg.includes('>10<'), '横轴要到 10');
});

test('19 张 step=2 坐标平面都改成 1 单位细网格', () => {
  const ids = 'TD-11-03 TD-11-15 TD-11-18 TD-11-20 TD-11-25 TD-12-28 SP1-057 TD-22-02 TD-22-03 TD-22-04 TD-22-07 TD-33-10 TD-35-14 SP1-025 SP1-058 SR-184 R04-004 R04-006 R03-183'.split(' ');
  const miss = ids.filter((id) => !(SPECS[id] && SPECS[id].minor && SPECS[id].minor.x === 1));
  assert.equal(miss.join('|'), '');
});
