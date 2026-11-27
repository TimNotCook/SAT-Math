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
  assert.match(js, /salvageSession\(saved, fixed\.reason\)/, '存档作废仍要写 void 记录');
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
