'use strict';
/* 阴影题图形校验（零外部依赖）
 *
 * 规则（2026-11-24 定稿）：题干里出现 "shaded"（阴影区域）的题，图上必须真的
 * 有阴影，否则题目无法作答。两条合法路径，二选一：
 *   A. figure spec 带 region 多边形（矢量重画，阴影由 region 填出）；
 *   B. 该题在 data/figure_crops.js 注册了「原书图形 1:1 裁剪」且文件真实存在。
 *
 * 五道线性不等式阴影题（U1-12 / U1-13 / TD-15-01 / TD-15-02 / TD-15-03）现已
 * 统一走 A：矢量重画，位图裁剪已从仓库删除。这里额外锁三件事，防止再退化：
 *   1. 五题都必须有 region spec（不能又退回位图 / 空白）；
 *   2. region 内、外取样点要与答案口径一致（图 ↔ 答案 ↔ hint 三者自洽）；
 *   3. hint 非空且点到关键表达式。
 *
 * 本测试直接加载源数据 data/text.js、data/figures.js、data/figure_crops.js、
 * data/questions.js。新增/导入题目若漏了阴影，`npm test` 会在这里失败并指名题号。
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');

function loadWindow(file) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  return ctx.window;
}

const TEXT = loadWindow(path.join(ROOT, 'data/text.js')).TD_TEXT;
const SPECS = loadWindow(path.join(ROOT, 'data/figures.js')).TD_FIG_SPECS;
const CROPS = loadWindow(path.join(ROOT, 'data/figure_crops.js')).TD_FIG_CROPS;
const BANK = loadWindow(path.join(ROOT, 'data/questions.js')).TD_BANK;
const QUESTIONS = BANK.questions || BANK;
const BY_ID = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));

const FIVE = ['U1-12', 'U1-13', 'TD-15-01', 'TD-15-02', 'TD-15-03'];

function stemOf(id) {
  const t = TEXT[id] || {};
  return String(t.stem || '');
}

function hasRegion(spec) {
  return !!(spec && Array.isArray(spec.series) && spec.series.some(
    (s) => s && s.kind === 'region' && Array.isArray(s.points) && s.points.length >= 3
  ));
}

function regionOf(id) {
  const spec = SPECS[id];
  return spec && spec.series && spec.series.find((s) => s.kind === 'region');
}

function hasCrop(id) {
  const rel = CROPS[id];
  if (!rel) return false;
  return fs.existsSync(path.join(ROOT, rel));
}

/* 射线法：点在多边形内（样例点都远离边界，不存在边界歧义） */
function pointInPolygon(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

test('题干含 shaded 的题必须自带阴影：region 多边形 或 已注册的原图裁剪', () => {
  const ids = Object.keys(TEXT).filter((id) => /shaded/i.test(stemOf(id)));
  assert.ok(ids.length > 0, '题库里应当存在阴影题，否则这条规则无从校验');

  const missing = ids.filter((id) => !hasRegion(SPECS[id]) && !hasCrop(id));
  assert.deepEqual(
    missing,
    [],
    `以下题目写了 shaded，但既没有 region 也没有注册的原图裁剪：${missing.join(', ')}`
  );
});

test('五道线性不等式阴影题已改为矢量 region，且不再挂位图裁剪', () => {
  for (const id of FIVE) {
    assert.ok(SPECS[id], `${id} 缺少 figure spec`);
    assert.ok(hasRegion(SPECS[id]), `${id} 的 spec 里没有 region 多边形（矢量阴影）`);
    assert.equal(CROPS[id], undefined, `${id} 仍注册了位图裁剪，应已改为矢量重画`);
    assert.ok(!fs.existsSync(path.join(ROOT, 'images/fig', `${id}.png`)),
      `${id} 的位图裁剪仍在仓库里，应已删除（只留矢量 spec）`);
  }
});

test('region 多边形必须是合法坐标点（数字对，且不退化）', () => {
  const ids = Object.keys(SPECS).filter((id) => hasRegion(SPECS[id]));
  for (const id of ids) {
    const region = regionOf(id);
    for (const pt of region.points) {
      assert.equal(pt.length, 2, `${id} 的 region 存在非坐标点：${JSON.stringify(pt)}`);
      assert.ok(Number.isFinite(pt[0]) && Number.isFinite(pt[1]),
        `${id} 的 region 坐标不是有限数字：${JSON.stringify(pt)}`);
    }
    const uniq = new Set(region.points.map((p) => p.join(',')));
    assert.ok(uniq.size >= 3, `${id} 的 region 少于 3 个不同顶点，无法围成面积`);
  }
});

/* 图 ↔ 答案 ↔ hint 自洽：阴影内取样点必须落在 region 里，阴影外取样点必须落在
   外面，并与题库存的答案键对得上。 */
const SAMPLES = {
  'U1-12': { answer: 'D', inside: [0, 8], outside: [-8, 0], hintToken: '1-4x' },
  'U1-13': { answer: 'C', inside: [-6, 0], outside: [6, 0], hintToken: '15x-20' },
  'TD-15-01': { answer: 'C', inside: [-6, 0], outside: [6, 0], hintToken: '15x-20' },
  'TD-15-02': { answer: 'D', inside: [0, 45], outside: [0, 10], hintToken: '33' },
  'TD-15-03': { answer: 'D', inside: [8, 0], outside: [0, 8], hintToken: '-2x+13' },
};

test('阴影区域与答案键、hint 三者自洽', () => {
  for (const id of FIVE) {
    const s = SAMPLES[id];
    const q = BY_ID[id];
    assert.ok(q, `${id} 不在题库里`);
    assert.equal(q.answer, s.answer, `${id} 的答案键与核对口径不一致`);

    const pts = regionOf(id).points;
    assert.ok(pointInPolygon(s.inside[0], s.inside[1], pts),
      `${id}：解点 ${JSON.stringify(s.inside)} 落在 region 外，图与答案键不自洽`);
    assert.ok(!pointInPolygon(s.outside[0], s.outside[1], pts),
      `${id}：非解点 ${JSON.stringify(s.outside)} 落在 region 内，图与答案键不自洽`);

    assert.ok(q.hint && q.hint.trim(), `${id} 的 hint 为空`);
    assert.ok(q.hint.includes(s.hintToken),
      `${id} 的 hint 没提到关键表达式 ${s.hintToken}：${q.hint}`);
  }
});

test('坐标轴按原书样式画在原点交叉（axesAt:zero），标签落在网格上', () => {
  for (const id of FIVE) {
    const spec = SPECS[id];
    assert.equal(spec.axesAt, 'zero', `${id} 未声明 axesAt:'zero'，轴会贴边框而不是过原点`);
    for (const axis of ['x', 'y']) {
      const a = spec[axis];
      if (!a || !a.labels) continue;
      for (const v of a.labels) {
        assert.ok(Math.abs(v / a.step - Math.round(v / a.step)) < 1e-9,
          `${id} 的 ${axis} 标签 ${v} 不在网格步长 ${a.step} 上`);
      }
    }
  }
});
