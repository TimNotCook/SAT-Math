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
