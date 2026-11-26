'use strict';
/* 三角形矢量图的几何/标注保真（2026-11-27）
 *
 * 1) spec 里标了 right:[i] 的顶点，画出来的角度必须真是 90°。
 *    抓到过 R04-116：pts 把 S 放在 T 正上方，S 处实测 61.2°，方框印在 61° 角上。
 * 2) 直角顶点只画方框，不再印一个 "90°"（原书没有，12 个 spec 都重复给了）。
 * 3) 边上长度标注只在书里印了才给（TD-44-03 的 √157、R04-119 的 108 都是题干给的）。
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const ctx = { window: {}, document: undefined, Math, console };
vm.createContext(ctx);
for (const f of ['data/figures.js', 'figures.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
}
const SPECS = ctx.window.TD_FIG_SPECS;
const FIG = ctx.window.TD_FIG;

const angleAt = (p, a, b) => {
  const u = [a[0] - p[0], a[1] - p[1]], v = [b[0] - p[0], b[1] - p[1]];
  const c = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v));
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
};

const triangleIds = Object.keys(SPECS).filter((id) => SPECS[id].type === 'triangle');

test('直角顶点实测必须是 90°（±2°）', () => {
  assert.ok(triangleIds.length >= 13);
  for (const id of triangleIds) {
    const s = SPECS[id];
    const pts = s.pts || [[70, 200], [230, 200], [70, 40]];
    for (const i of s.right || []) {
      const a = angleAt(pts[i], pts[(i + 2) % 3], pts[(i + 1) % 3]);
      assert.ok(Math.abs(a - 90) <= 2, `${id} 顶点 ${i} 实测 ${a.toFixed(1)}°，不是直角`);
    }
  }
});

test('直角顶点不重复印 "90°"（方框已足够）', () => {
  for (const id of triangleIds) {
    const svg = String(FIG.showFigure({ id }));
    assert.ok(!svg.includes('90°'), `${id} 仍画出 "90°" 文字`);
  }
});

test('书里没印的边长不画在图上', () => {
  assert.equal(Object.keys(SPECS['TD-44-03'].sides).join(','), '2'); // 只有 79
  assert.equal(Object.keys(SPECS['R04-119'].sides).length, 0); // 原书只在题干给 108
});

test('原书无顶点字母的题不擅自加 A/B/C', () => {
  for (const id of ['U4-09', 'TD-42-10', 'TD-42-11', 'TD-44-01', 'TD-44-05']) {
    // 跨 vm realm 的数组原型不同，deepEqual 会误判，这里比字符串
    assert.equal(SPECS[id].labels.join('|'), '||', `${id} 仍有顶点字母`);
  }
});

test('R04-116 的直角在 S，且 SR / ST 两条边都有长度标注', () => {
  const s = SPECS['R04-116'];
  const pts = s.pts;
  assert.ok(Math.abs(angleAt(pts[1], pts[0], pts[2]) - 90) < 1.5);
  assert.equal(s.sides['0'], '12'); // R-S
  assert.equal(s.sides['1'], '5'); // S-T
});
