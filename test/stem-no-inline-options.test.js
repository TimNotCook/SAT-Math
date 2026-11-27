'use strict';
/* 题干里不许夹带选项（原书题干的「A) …B) …」整块被抄进 stem 会造成：
 *   页面上先出现四张文字表，再出现四张真正的选项表 —— 与原书 1:1 版面不符。
 * 这里锁：任何题干都不得含 "\n\nA)" 这类选项块标记；SP1-130/131 题干只到问句为止，
 * 选项仍由 fmtChoice 渲染成三行两列表格。
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
const FIG = loadWindow(path.join(ROOT, 'figures.js')).TD_FIG;
const BANK = loadWindow(path.join(ROOT, 'data/questions.js')).TD_BANK;
const QUESTIONS = BANK.questions || BANK;

test('题干不含夹带的选项块标记', () => {
  const bad = [];
  for (const id of Object.keys(TEXT)) {
    const s = String(TEXT[id].stem || '');
    if (/\n{2,}[ABCD]\)/.test(s) || /\n{2,}[ABCD]\)\s*\n/.test(s)) bad.push(id);
  }
  assert.equal(bad.join('|'), '', `这些题干夹带了选项块：${bad.join(', ')}`);
});

test('题库侧 questions.js 也不夹带选项块', () => {
  const bad = QUESTIONS.filter((q) => /\n{2,}[ABCD]\)/.test(String(q.stem || ''))).map((q) => q.id);
  assert.equal(bad.join('|'), '');
});

test('SP1-130 / SP1-131 题干只到问句，选项仍是两列表格', () => {
  for (const id of ['SP1-130', 'SP1-131']) {
    const s = TEXT[id].stem;
    assert.match(s, /which of the following tables are all the values of x/i, `${id} 题干问句缺失`);
    assert.ok(!/A\)/.test(s), `${id} 题干仍含 A) 选项块`);
    assert.ok(s.endsWith('?'), `${id} 题干应以问号收尾`);
    for (const L of ['A', 'B', 'C', 'D']) {
      const html = FIG.fmtChoice(TEXT[id].choices[L]);
      assert.match(html, /class="td-choice-table"/, `${id} ${L} 应是表格`);
      assert.equal((html.match(/<tr>/g) || []).length, 4, `${id} ${L} 应是 1 表头 + 3 数据行`);
    }
  }
});

test('这些题干的选项值与原书一致', () => {
  assert.equal(TEXT['SP1-130'].choices.D, 'x=3,y=26; x=5,y=52; x=8,y=91');
  assert.equal(TEXT['SP1-131'].choices.D, 'x=3,y=22; x=5,y=38; x=8,y=62');
});
