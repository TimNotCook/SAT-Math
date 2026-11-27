const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

global.window = {};
require(path.join(__dirname, '..', 'data', 'figures.js'));
const SPECS = global.window.TD_FIG_SPECS;

function segDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1);
  t = Math.max(0, Math.min(1, t));
  const c = [a[0] + t * dx, a[1] + t * dy];
  return Math.hypot(p[0] - c[0], p[1] - c[1]);
}

const charts = Object.keys(SPECS).filter(id => SPECS[id].type === 'chart');

test('每张图的标注点都落在画出的折线／曲线／指数曲线上', () => {
  const bad = [];
  for (const id of charts) {
    const s = SPECS[id];
    const series = (s.series || []).filter(x => x.points && x.kind !== 'region' && x.kind !== 'bar');
    const exp = (s.series || []).find(x => x.kind === 'exp');
    if (!series.length && !exp) continue;
    (s.marks || []).forEach((m, k) => {
      let d = Infinity;
      if (exp) d = Math.abs(exp.a * Math.pow(exp.b, m.x) + (exp.c || 0) - m.y);
      for (const se of series) {
        for (let i = 0; i + 1 < se.points.length; i++) {
          d = Math.min(d, segDist([m.x, m.y], se.points[i], se.points[i + 1]));
        }
      }
      if (!(d <= 0.6)) bad.push(`${id} mark${k}(${m.x},${m.y}) 离曲线 ${d.toFixed(2)}`);
    });
  }
  assert.deepStrictEqual(bad, []);
});

test('“(x, y)” 形式的标注文字与点的真实坐标一致', () => {
  const bad = [];
  for (const id of charts) {
    const s = SPECS[id];
    (s.marks || []).forEach((m, k) => {
      const p = /\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/.exec(String(m.label || ''));
      if (!p) return;
      const lx = parseFloat(p[1]), ly = parseFloat(p[2]);
      const shownX = s.x.cats
        ? ((s.x.cats.find(c => Math.abs(c[1] - m.x) < 1e-9) || [m.x])[0])
        : m.x;
      if (Math.abs(ly - m.y) > 1e-9 || Math.abs(lx - shownX) > 1e-9) {
        bad.push(`${id} mark${k} 文字"${m.label}" 但点是 (${shownX},${m.y})`);
      }
    });
  }
  assert.deepStrictEqual(bad, []);
});

test('数值角标签的钝／锐位置与截线方向一致（平行线图）', () => {
  const cls = dir => dir === 'SE'
    ? { UL: 'acute', UR: 'obtuse', LL: 'obtuse', LR: 'acute' }
    : { UL: 'obtuse', UR: 'acute', LL: 'acute', LR: 'obtuse' };
  const bad = [];
  for (const id of Object.keys(SPECS)) {
    const s = SPECS[id];
    if (s.type !== 'parallelLines') continue;
    const c = cls(s.direction);
    for (const side of ['top', 'bot']) {
      for (const k of ['UL', 'UR', 'LL', 'LR']) {
        const v = s[side + k];
        const m = /^(\d+(?:\.\d+)?)\s*°/.exec(String(v || ''));
        if (!m) continue;
        const obtuse = parseFloat(m[1]) > 90;
        if ((c[k] === 'obtuse') !== obtuse) bad.push(`${id} ${side}${k}=${v} 应在${c[k]}角位`);
      }
    }
  }
  assert.deepStrictEqual(bad, []);
});

test('R04-061：两条截线必须在 q 上方相交，且一右倾一左倾（原书如此）', () => {
  const svg = SPECS['R04-061'].svg;
  const lines = [...svg.matchAll(/<line x1='([-\d.]+)' y1='([-\d.]+)' x2='([-\d.]+)' y2='([-\d.]+)'/g)]
    .map(m => [+m[1], +m[2], +m[3], +m[4]]);
  const q = lines.find(l => Math.abs(l[1] - l[3]) < 1e-9 && Math.abs(l[1] - 150) < 0.5);
  const oblique = lines.filter(l => Math.abs(l[1] - l[3]) > 1e-9);
  assert.strictEqual(oblique.length, 2, '应有两条斜截线');
  const slopes = oblique.map(l => (l[2] - l[0]) / (l[3] - l[1]));
  assert.ok(slopes[0] > 0 && slopes[1] < 0, `截线方向应为右倾+左倾，实际 ${slopes}`);
  const [a, b] = oblique;
  const k1 = (a[2] - a[0]) / (a[3] - a[1]), k2 = (b[2] - b[0]) / (b[3] - b[1]);
  const yc = (b[0] - a[0] + k1 * a[1] - k2 * b[1]) / (k1 - k2);
  const xc = a[0] + k1 * (yc - a[1]);
  assert.ok(yc < 150 && yc > 0, `交点应在 q(y=150) 之上且在框内，实际 y=${yc.toFixed(1)}`);
  assert.ok(xc > 0 && xc < 440, `交点 x 应在框内，实际 x=${xc.toFixed(1)}`);
});

test('R04-081：DE∥BC、DE/BC=1/3，直角符号画在 B 且两边正交', () => {
  const svg = SPECS['R04-081'].svg;
  const L = [...svg.matchAll(/<line x1='([-\d.]+)' y1='([-\d.]+)' x2='([-\d.]+)' y2='([-\d.]+)'/g)]
    .map(m => [+m[1], +m[2], +m[3], +m[4]]);
  const bc = L.find(l => Math.abs(l[1] - 195) < 0.01 && Math.abs(l[3] - 195) < 0.01);
  const de = L.find(l => Math.abs(l[1] - 95) < 0.01 && Math.abs(l[3] - 95) < 0.01);
  assert.ok(bc && de, 'BC 与 DE 都应是水平线（互相平行）');
  const bcLen = Math.abs(bc[2] - bc[0]), deLen = Math.abs(de[2] - de[0]);
  assert.ok(Math.abs(deLen / bcLen - 1 / 3) < 0.02, `DE/BC 应为 1/3，实际 ${(deLen / bcLen).toFixed(3)}`);
  const ab = L.find(l => Math.abs(l[0] - 120) < 0.01 && Math.abs(l[2] - 120) < 0.01);
  assert.ok(ab && ab[0] === 120 && ab[2] === 120 && Math.abs(ab[3] - 195) < 0.01,
    'AB 应竖直且下端在 B(120,195)');
  const sq = /<path d='M ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+)'/.exec(svg);
  assert.ok(sq, '应有直角方框');
  assert.ok(Math.abs((+sq[4]) - (+sq[2])) < 0.01 && Math.abs((+sq[5]) - (+sq[3])) < 0.01,
    '直角方框的两边应分别水平、竖直（真正画出 90°）');
});

test('R04-104：三块等边三角形的边长必须相等（每个 ≈120）', () => {
  const svg = SPECS['R04-104'].svg;
  const pts = [...svg.matchAll(/<polygon points='([^']+)'/g)]
    .map(m => m[1].split(' ').map(p => p.split(',').map(Number)))
    .filter(p => p.length === 4)[0];
  const v = [pts[0], pts[1], pts[2], pts[3]];
  const mid = [v[2][0] / 2 + v[1][0] / 2, v[3][1]];
  const tris = [[v[0], v[1], [mid[0], v[3][1]]], [v[1], [mid[0], v[3][1]], v[2]]];
  const len = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  for (const t of tris) {
    const s = [len(t[0], t[1]), len(t[1], t[2]), len(t[2], t[0])];
    assert.ok(Math.max(...s) - Math.min(...s) < 1.5, `等边三角形三边不等：${s.map(v => v.toFixed(1))}`);
  }
});

// 原书这三张图印着 "Figure not drawn to scale"，顶点那个直角符号是贴着两条斜边
// 画的，几何上并不等于 90°（书上也一样）。符号本身照印，但不参与"必须真 90°"的校验。
const SKEWED_RIGHT_MARKS = new Set(['R04-087', 'R04-088', 'R04-089']);

test('R04-087/088/089：顶点与底边垂足各有一个直角符号（原书两个都印了）', () => {
  for (const id of SKEWED_RIGHT_MARKS) {
    const svg = SPECS[id].svg;
    const marks = svg.match(/<path d='M [\d.]+ [\d.]+ L [\d.]+ [\d.]+ L [\d.]+ [\d.]+'/g) || [];
    assert.strictEqual(marks.length, 2, `${id} 应有两个直角符号，实际 ${marks.length}`);
  }
});

test('rawSvg 里每个直角方框都必须真的画成 90°', () => {
  const bad = [];
  for (const id of Object.keys(SPECS)) {
    const s = SPECS[id];
    if (s.type !== 'rawSvg') continue;
    if (SKEWED_RIGHT_MARKS.has(id)) continue;
    const re = /<path d='M ([-\d.]+) ([-\d.]+) L ([-\d.]+) ([-\d.]+) L ([-\d.]+) ([-\d.]+)'/g;
    let m;
    while ((m = re.exec(s.svg))) {
      const [x1, y1, x2, y2, x3, y3] = m.slice(1).map(Number);
      const ax = x2 - x1, ay = y2 - y1, bx = x3 - x2, by = y3 - y2;
      const cos = (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by));
      if (Math.abs(cos) > 0.05) bad.push(`${id} 直角方框 cos=${cos.toFixed(3)}`);
    }
  }
  assert.deepStrictEqual(bad, []);
});
