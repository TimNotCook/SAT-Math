'use strict';
/* 阴影题图形校验（零外部依赖）
 *
 * 规则：题干里出现 "shaded"（阴影区域）的题，figure spec 必须带 region 系列，
 * 否则图上没有阴影、题目无法作答（2026-11-24 修复过 4 道：U1-12 / U1-13 /
 * TD-15-01 / TD-15-03，之前只有 TD-15-02 具备 region）。
 *
 * 本测试直接加载线上源数据 data/text.js 与 data/figures.js，
 * 新增/导入题目若漏了 region，`npm test` 会在这里失败并指名题号。
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

function stemOf(id) {
  const t = TEXT[id] || {};
  return String(t.stem || '');
}

function hasRegion(spec) {
  return !!(spec && Array.isArray(spec.series) && spec.series.some(
    (s) => s && s.kind === 'region' && Array.isArray(s.points) && s.points.length >= 3
  ));
}

test('题干含 shaded 的题必须有 region 阴影多边形', () => {
  const ids = Object.keys(TEXT).filter((id) => /shaded/i.test(stemOf(id)));
  assert.ok(ids.length > 0, '题库里应当存在阴影题，否则这条规则无从校验');

  const missing = ids.filter((id) => !hasRegion(SPECS[id]));
  assert.deepEqual(
    missing,
    [],
    `以下题目标题写了 shaded，但 figure spec 缺 region：${missing.join(', ')}`
  );
});

test('region 多边形必须是合法坐标点（数字对，且不退化）', () => {
  const ids = Object.keys(SPECS).filter((id) => hasRegion(SPECS[id]));
  assert.ok(ids.length > 0, '至少应有一条 region spec');

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
