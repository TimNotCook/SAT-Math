'use strict';
/* 阴影题图形校验（零外部依赖）
 *
 * 规则（2026-11-24 定稿）：题干里出现 "shaded"（阴影区域）的题，图上必须真的
 * 有阴影，否则题目无法作答。两条合法路径，二选一：
 *   A. figure spec 带 region 多边形（矢量重画，阴影由 region 填出）；
 *   B. 该题在 data/figure_crops.js 注册了「原书图形 1:1 裁剪」且文件真实存在
 *      （U1-12 / U1-13 / TD-15-01 / TD-15-02 / TD-15-03 走这条，因为老板要求
 *      与原题 100% 一致，重画版哪怕一字不差也总有抗锯齿/步长差）。
 *
 * 本测试直接加载源数据 data/text.js、data/figures.js、data/figure_crops.js。
 * 新增/导入题目若漏了阴影（既没有 region 也没有裁剪图），`npm test` 会在这里
 * 失败并指名题号 —— 这就是拦下一次同类错误的那道闸。
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

function stemOf(id) {
  const t = TEXT[id] || {};
  return String(t.stem || '');
}

function hasRegion(spec) {
  return !!(spec && Array.isArray(spec.series) && spec.series.some(
    (s) => s && s.kind === 'region' && Array.isArray(s.points) && s.points.length >= 3
  ));
}

function hasCrop(id) {
  const rel = CROPS[id];
  if (!rel) return false;
  return fs.existsSync(path.join(ROOT, rel));
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

test('五道阴影不等式题的裁剪图存在且不是空文件', () => {
  const five = ['U1-12', 'U1-13', 'TD-15-01', 'TD-15-02', 'TD-15-03'];
  for (const id of five) {
    const rel = CROPS[id];
    assert.ok(rel, `${id} 未在 data/figure_crops.js 注册裁剪图`);
    const abs = path.join(ROOT, rel);
    assert.ok(fs.existsSync(abs), `${id} 的裁剪图文件缺失：${rel}`);
    assert.ok(fs.statSync(abs).size > 10240,
      `${id} 的裁剪图过小（${fs.statSync(abs).size} 字节），可能是空白/占位图：${rel}`);
  }
});

test('裁剪图必须是一张真正的图（PNG 尺寸可解析、宽高比合理）', () => {
  const five = ['U1-12', 'U1-13', 'TD-15-01', 'TD-15-02', 'TD-15-03'];
  for (const id of five) {
    const buf = fs.readFileSync(path.join(ROOT, CROPS[id]));
    assert.equal(buf.slice(1, 4).toString('latin1'), 'PNG', `${id} 的裁剪图不是 PNG`);
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    assert.ok(w >= 300 && h >= 300, `${id} 裁剪图分辨率过低：${w}x${h}`);
    const ratio = w / h;
    assert.ok(ratio > 0.6 && ratio < 2.2, `${id} 裁剪图宽高比异常（${w}x${h}），可能混进了题干或选项`);
  }
});

test('region 多边形必须是合法坐标点（数字对，且不退化）', () => {
  const ids = Object.keys(SPECS).filter((id) => hasRegion(SPECS[id]));

  for (const id of ids) {
    const spec = SPECS[id];
    const region = spec.series.find((s) => s.kind === 'region');
    for (const pt of region.points) {
      assert.equal(pt.length, 2, `${id} 的 region 存在非坐标点：${JSON.stringify(pt)}`);
      assert.ok(Number.isFinite(pt[0]) && Number.isFinite(pt[1]),
        `${id} 的 region 坐标不是有限数字：${JSON.stringify(pt)}`);
    }
    const uniq = new Set(region.points.map((p) => p.join(',')));
    assert.ok(uniq.size >= 3, `${id} 的 region 少于 3 个不同顶点，无法围成面积`);
  }
});
