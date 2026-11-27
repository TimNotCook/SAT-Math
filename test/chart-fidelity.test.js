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
