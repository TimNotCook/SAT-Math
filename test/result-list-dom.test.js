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
