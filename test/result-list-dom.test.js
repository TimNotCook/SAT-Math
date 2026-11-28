/* test/result-list-dom.test.js — 成绩页逐题回顾不许嵌套
 *
 * 模板里一旦少一个 </div>，44 条 rev-item 会互相嵌套，390 档实测
 * scrollWidth 4236 / clientWidth 390，整页横向飞出屏幕。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const js = readFileSync(resolve(ROOT, 'exam.js'), 'utf8');

test('成绩页 rev-item 模板必须同时闭合 body 与 rev-item', () => {
  const seg = js.slice(js.indexOf('function renderResultList'), js.indexOf('/* 本次错题按错因类型聚合'));
  assert.match(seg, /\$\{causeHtml\}\s*<\/div><\/div>`/,
    'rev-item 模板少一个闭合 div，会把后面每一条都嵌进上一条');
});


test('成绩页 priority 缺 level / 报告字段是对象时不裸调 toLowerCase', () => {
  const seg = js.slice(js.indexOf('function renderResult()'), js.indexOf('function renderResultList'));
  assert.match(seg, /const level = safeText\(p\.level\)\.toLowerCase\(\)/,
    'priority.level 缺少/非字符串时仍会 toLowerCase 打崩成绩页');
  assert.ok(!/p\.level\.toLowerCase\(\)/.test(seg), 'priority.level 还有裸 toLowerCase');
  assert.match(seg, /asArr\(rep\.units\)\.filter/, 'report.units 没过滤 null/非对象条目');
  assert.match(seg, /asArr\(rep\.topics\)\.filter/, 'report.topics 没过滤 null/非对象条目');
  assert.match(seg, /asArr\(rep\.priority\)\.filter/, 'report.priority 没过滤 null/非对象条目');
});

test('成绩页逐题列表对对象字段用 safeText/safeNum 降级', () => {
  const seg = js.slice(js.indexOf('function renderResultList'), js.indexOf('/* 本次错题按错因类型聚合'));
  assert.match(seg, /const did = safeText\(d\.id\)/, '逐题列表还在裸用 d.id');
  assert.match(seg, /const dUnit = safeText\(d\.unit\)/, '逐题列表还在裸用 d.unit');
  assert.match(seg, /dSeconds = safeNum\(d\.seconds\)/, '逐题列表还在裸算 d.seconds');
});

test('成绩合并跳过对象题号，不制造假错题', () => {
  const seg = js.slice(js.indexOf('function mergedState()'), js.indexOf('function newSession'));
  assert.match(seg, /const did = safeText\(d\.id\); if \(!did\) return/,
    'mergedState 仍在拿对象 id 当错题键');
});


test('未交卷导出面板已整体移除，开场页不再有 salvage 区块', () => {
  const html = readFileSync(resolve(ROOT, 'exam.html'), 'utf8');
  assert.ok(!/introSalvage/.test(html), 'exam.html 不得再有 introSalvage 面板');
  assert.ok(!/btnExportSalvage/.test(js), 'exam.js 不得再有导出按钮');
  /* 静默作废仍然要留档：results 里的 void 记录这条账不能删。 */
  assert.match(js, /salvageThenClear\(saved, fixed\.reason\)/, '存档作废仍要写 void 记录');
});

test('成绩页：明细/units/topics/priority 里的数组条目按幽灵记录过滤', () => {
  assert.match(js, /const isRec = v => !!v && typeof v === 'object' && !Array\.isArray\(v\)/,
    '缺少排除数组的 isRec 判定');
  const seg = js.slice(js.indexOf('function renderResult()'), js.indexOf('function renderResultList'));
  assert.match(seg, /const detail0 = asArr\(r\.detail\)\.filter\(isRec\)/, 'detail 还只判 typeof');
  assert.match(seg, /const units = asArr\(rep\.units\)\.filter\(isRec\)/, 'units 还只判 typeof');
  assert.match(seg, /const topics = asArr\(rep\.topics\)\.filter\(isRec\)/, 'topics 还只判 typeof');
  assert.match(seg, /const priority = asArr\(rep\.priority\)\.filter\(isRec\)/, 'priority 还只判 typeof');
});

test('成绩页：detail.correct 是字符串 "false" 时不能按 truthy 当答对', () => {
  const resSeg = js.slice(js.indexOf('function renderResult()'), js.indexOf('function renderResultList'));
  assert.match(resSeg, /detail0\.filter\(d => isRightFlag\(d\.correct\)\)/, '成绩统计还在按 truthy 数答对');
  const listSeg = js.slice(js.indexOf('function renderResultList'), js.indexOf('/* 本次错题按错因类型聚合'));
  assert.match(listSeg, /const okFlag = isRightFlag\(d\.correct\)/, '逐题列表没有把 correct 归一成 okFlag');
  assert.ok(!/d\.correct \?/.test(listSeg), '逐题列表还在按 truthy 渲染对勾/颜色');
  assert.ok(!/filter\(d => !d\.correct\)/.test(listSeg), '错题 tab 还在按 truthy 过滤');
});

test('成绩页：date 为 null/0 时不显示 1970 年假时间', () => {
  const seg = js.slice(js.indexOf('function renderResult()'), js.indexOf('function renderResultList'));
  assert.match(seg, /const dateObj = Number\.isFinite\(dateNum\) && dateNum > 0/, '日期没有先排除 null/0');
  assert.ok(!/new Date\(Number\.isFinite\(dateNum\) && dateNum > 0 \? dateNum : r\.date\)/.test(seg),
    '仍在 new Date(null) 兜底，会显示 1970');
  assert.match(seg, /typeof r\.date === 'boolean'/, '布尔日期仍会被 Number 成 1970');
  assert.match(seg, /const dateTxt = !dateObj || isNaN/, '空日期应显示 —');
});


test('成绩页 safeNum 不把布尔当数字（true 不能变 1 秒/1 分）', () => {
  assert.match(js, /const safeNum = v => \(.*typeof v === 'boolean'/, 'safeNum 缺少布尔排除');
});


test('成绩页 total 小于 detail 条数时按明细题数显示，不印成半张卷', () => {
  const seg = js.slice(js.indexOf('function renderResult()'), js.indexOf('function renderResultList'));
  assert.ok(seg.includes('let total = Math.max(detail0.length, rTotal != null && rTotal > 0 ? rTotal : 0);'),
    'total 没有以 detail 条数为下限，22/44 会被印成 22 题');
  assert.ok(!/const total = rTotal != null && rTotal > 0 ? rTotal : detail0\.length/.test(seg),
    '仍直接用 r.total，detail 更多时整卷题数偏小');
});

test('成绩页 total/correct/elapsed 不再把布尔 Number 成 1', () => {
  const seg = js.slice(js.indexOf('function renderResult()'), js.indexOf('function renderResultList'));
  assert.match(seg, /const rTotal = countNum\(r\.total\)/);
  assert.match(seg, /const rCorrect = countNum\(r\.correct\)/);
  assert.match(seg, /const rElapsed = safeNum\(r\.elapsed\)/);
  assert.ok(!/Number\.isFinite\(Number\(r\.total\)\)/.test(seg), '总题数还在裸 Number，布尔会变 1');
});


test('成绩页最长单题用 safeNum，布尔/Infinity 不能污染统计', () => {
  const seg = js.slice(js.indexOf('function renderResult()'), js.indexOf('function renderResultList'));
  assert.match(seg, /Math\.max\(0, \.\.\.detail0\.map\(d => safeNum\(d\.seconds\)/, '最长单题仍在裸 Number');
});


test('成绩页 safeText 不把布尔写成 true/false 文案', () => {
  assert.match(js, /const safeText = v => \(.*typeof v === 'boolean'/, 'safeText 缺少布尔排除');
});


test('成绩页 scaled 越界（999/0/负数）不显示 999 / 800', () => {
  const seg = js.slice(js.indexOf('function renderResult()'), js.indexOf('function renderResultList'));
  assert.match(seg, /scaledRaw >= 200 && scaledRaw <= 800/, 'scaled 没有夹到 200–800');
});


test('成绩页原始分越界（999）夹到 0–44', () => {
  const seg = js.slice(js.indexOf('function renderResult()'), js.indexOf('function renderResultList'));
  assert.match(seg, /Math\.max\(0, Math\.min\(44, rawN\)\)/, 'raw 没有夹到 0–44');
});


test('成绩页 safeNum 不把空字符串当 0', () => {
  const seg = js.slice(js.indexOf('const safeNum'), js.indexOf('const isRightFlag'));
  assert.match(seg, /typeof v === 'string' && !v\.trim\(\)/, 'safeNum 未排除空字符串');
});
