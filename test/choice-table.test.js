'use strict';
/* 选项表格 / 联立方程组渲染（零外部依赖）
 *
 * 原书有 8 道题的选择项不是一行文字，而是四张小表格或带大括号的方程组：
 *   表格类：TD-11-22、TD-15-06、TD-33-13、SP1-047、SP1-130、SP1-131
 *   方程组类：U1-09（四个选项各是两条方程）
 * 题库只能把它们存成一行串，drill/exam 必须还原成表格/联立式，否则不像原题。
 * 这里锁：这 8 题必须走 `TD_FIG.fmtChoice` 的表格/联立分支，且其余题目的普通
 * 选项不被误判（例如纯分数、纯文字、带 ";" 的句子）。
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
const BY_ID = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));

const TABLES = ['TD-11-22', 'TD-15-06', 'TD-33-13', 'SP1-047', 'SP1-130', 'SP1-131'];
const SYSTEMS = ['U1-09'];

test('表格选项渲染成 <table>，表头与行数与题干一致', () => {
  for (const id of TABLES) {
    const ch = TEXT[id].choices;
    for (const L of ['A', 'B', 'C', 'D']) {
      const html = FIG.fmtChoice(ch[L], id);
      assert.match(html, /class="td-choice-table(?!--h)/, `${id} ${L} 应是表格`);
      const rows = (html.match(/<tr>/g) || []).length;
      // 横排（TD-11-22 / TD-33-13，原书印成两行）是 2 行；其余是表头 1 行 + 数据 3 行
      const transposed = /td-choice-table--h/.test(html);
      assert.equal(rows, transposed ? 2 : 4, `${id} ${L} 行数不对（实际 ${rows}）`);
      if (transposed) assert.match(html, /<thead><tr><th>x<\/th><th>/, `${id} ${L} 横排表头应以 x 开头`);
      else assert.match(html, /<thead><tr><th>(x)<\/th><th>(y|q\(x\))/, `${id} ${L} 表头不对`);
    }
  }
});

test('TD-33-13 的表头用 q(x) 而不是 y', () => {
  const html = FIG.fmtChoice(TEXT['TD-33-13'].choices.A);
  assert.match(html, /<th>q\(x\)<\/th>/);
});

test('联立方程组选项渲染成两条方程的竖排', () => {
  for (const L of ['A', 'B', 'C', 'D']) {
    const html = FIG.fmtChoice(TEXT['U1-09'].choices[L]);
    assert.match(html, /td-choice-system/, `U1-09 ${L} 应是联立式`);
    assert.equal((html.match(/td-choice-eq/g) || []).length, 2, `U1-09 ${L} 应是两条方程`);
  }
});

test('普通选项不被误判成表格或联立式', () => {
  const samples = [
    ['U1-04', 'A'], ['U1-14', 'D'], ['U2-01', 'A'], ['U2-06', 'C'],
    ['SP1-096', 'B'], ['SR-262', 'A'],
  ];
  for (const [id, L] of samples) {
    const raw = (TEXT[id].choices || {})[L];
    if (raw == null) continue;
    const html = FIG.fmtChoice(raw);
    assert.ok(!/td-choice-table|td-choice-system/.test(html), `${id} ${L} 被误判：${raw}`);
    assert.equal(html, FIG.fmtMath(raw), `${id} ${L} 应退回 fmtMath`);
  }
});

test('每一道题干里问 "which table / which of the following tables" 的题都必须渲染成表格', () => {
  for (const q of QUESTIONS) {
    const t = TEXT[q.id] || {};
    if (!/which (of the following )?tables?/i.test(t.stem || q.stem || '')) continue;
    const ch = t.choices || {};
    const opts = ['A', 'B', 'C', 'D'].filter((L) => (ch[L] || '').trim());
    if (!opts.length) continue;
    const rendered = opts.filter((L) => /td-choice-table/.test(FIG.fmtChoice(ch[L])));
    assert.ok(rendered.length >= 2, `${q.id} 问 table，但选项没渲染成表格（${opts.join('/')}）`);
  }
});

test('原书横排的选项表按横排还原（TD-11-22 / TD-33-13）', () => {
  const h1 = FIG.fmtChoice(TEXT['TD-11-22'].choices.A, 'TD-11-22');
  assert.match(h1, /td-choice-table--h/);
  const cells1 = [...h1.matchAll(/<t[hd][^>]*>([^<]*)<\/t[hd]>/g)].map((m) => m[1]);
  assert.equal(cells1.join('|'), 'x|0|5|10|y|14|21|28', 'TD-11-22 A 应排成 x 0 5 10 上 / y 14 21 28 下');

  const h2 = FIG.fmtChoice(TEXT['TD-33-13'].choices.D, 'TD-33-13');
  const cells2 = [...h2.matchAll(/<t[hd][^>]*>([^<]*)<\/t[hd]>/g)].map((m) => m[1]);
  assert.equal(cells2.join('|'), 'x|-1|0|1|q(x)|-63|3|63');
});

test('原书竖排的选项表保持竖排（TD-15-06 不能被白名单带走）', () => {
  const html = FIG.fmtChoice(TEXT['TD-15-06'].choices.A, 'TD-15-06');
  assert.ok(!/td-choice-table--h/.test(html));
  const cells = [...html.matchAll(/<t[hd][^>]*>([^<]*)<\/t[hd]>/g)].map((m) => m[1]);
  assert.equal(cells.join('|'), 'x|y|-9|27|-10|51|-12|-4');
});

test('同一道选择题里不许出现两个一模一样的选项', () => {
  // SR-127（02 册 p62 · Topic 10 #43）C/D 目前重复，原书 p62 扫描件不在手边，
  // 已登记为待核项；除它以外全库不得再有重复选项。
  const KNOWN = ['SR-127'];
  const norm = (x) => String(x == null ? '' : x).toLowerCase().replace(/\s+/g, '').replace(/[−–—]/g, '-').replace(/×/g, '*');
  const bad = [];
  for (const q of QUESTIONS) {
    const t = TEXT[q.id] || {};
    if (q.type !== 'mcq' || (t.figure || []).length === 4) continue;
    const ch = t.choices || {};
    const seen = {};
    for (const L of ['A', 'B', 'C', 'D']) {
      const k = norm(ch[L]);
      if (!k) continue;
      if (seen[k]) bad.push(`${q.id} ${seen[k]}=${L}`);
      else seen[k] = L;
    }
  }
  const unexpected = bad.filter((b) => !KNOWN.some((id) => b.startsWith(id + ' ')));
  assert.equal(unexpected.join('|'), '', `重复选项：${unexpected.join(', ')}`);
});
