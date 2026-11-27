/* test/result-date-spent.test.js — 成绩页日期与逐题用时的脏数据降级 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const js = readFileSync(resolve(ROOT, 'exam.js'), 'utf8');

test('成绩页 date 是数组/普通对象时不落进 1970', () => {
  const seg = js.slice(js.indexOf('function renderResult()'), js.indexOf('function renderResultList'));
  assert.match(seg, /typeof r\.date === 'object' && !\(r\.date instanceof Date\)/,
    'date 是数组/对象时仍被 Number 成时间戳，出现 1970 假时间');
});

test('交卷写逐题秒数也走 safeNum，脏 spent 不落进成绩', () => {
  const fin = js.slice(js.indexOf('function finalize'), js.indexOf('function renderResult'));
  assert.match(fin, /seconds: Math\.round\(\(safeNum\(a\.spent\) \|\| 0\) \/ 1000\)/,
    'finalize 还在裸算 a.spent，对象 spent 会写出 NaN 秒');
});
