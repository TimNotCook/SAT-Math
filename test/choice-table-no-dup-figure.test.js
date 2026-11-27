'use strict';
/* 选项本身就是四张小表格的题，不许再挂一张「图形」——否则页面上会先浮出两张表、
   再列 A–D 四张表（TD-33-13 就这样重复过一次：data/figures.js 里留了一份把 A、C
   两张表画进同一张 rawSvg 的过期 spec）。这里锁死：这些题在 TD_FIG_SPECS 里必须没有条目。
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');

function loadWindow(files) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  return ctx.window;
}

const W = loadWindow(['figures.js', 'data/figures.js']);
const SPECS = W.TD_FIG_SPECS || {};
const TEXT = loadWindow(['data/text.js']).TD_TEXT;
const BANK = loadWindow(['data/questions.js']).TD_BANK;
const QUESTIONS = BANK.questions || BANK;

const TABLE_OPTION_IDS = ['TD-11-22', 'TD-15-06', 'TD-33-13', 'SP1-047', 'SP1-130', 'SP1-131', 'U1-09'];

test('表格选项题不再挂图形 spec', () => {
  const bad = TABLE_OPTION_IDS.filter((id) => SPECS[id]);
  assert.equal(bad.join('|'), '', `这些题多挂了一张图（会与选项表重复）：${bad.join(', ')}`);
});

test('TD-33-13 只有 4 张选项表、页面上不再有额外表格', () => {
  const html = ['A', 'B', 'C', 'D'].map((L) => W.TD_FIG.fmtChoice(TEXT['TD-33-13'].choices[L], 'TD-33-13')).join('');
  assert.equal((html.match(/<table /g) || []).length, 4);
  assert.equal(W.TD_FIG.showFigure({ id: 'TD-33-13' }), '');
});

test('其余图题仍能渲染（删 spec 没误伤邻居）', () => {
  for (const id of ['TD-33-14', 'TD-42-12', 'TD-25-02', 'TD-11-21']) {
    if (!SPECS[id]) continue;
    assert.ok((W.TD_FIG.showFigure({ id }) || '').trim().length > 0, `${id} 渲染为空`);
  }
});

test('四个选项都是表格时，题库里这类题都能凑齐四张表', () => {
  const bad = [];
  for (const q of QUESTIONS) {
    const t = TEXT[q.id] || {};
    if (/which (of the following )?tables?/i.test(t.stem || '')) {
      const ch = t.choices || {};
      for (const L of ['A', 'B', 'C', 'D']) {
        if (!/td-choice-table/.test(W.TD_FIG.fmtChoice(ch[L], q.id))) bad.push(`${q.id}${L}`);
      }
    }
  }
  assert.equal(bad.join('|'), '');
});
