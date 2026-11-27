/* 选项里带换行（原书把两条方程分两行印）不能被压成一行：
   出现过 SR-214 渲染成 "x + y = 1600.25x + 0.41y = 0.32(160)" 的事故，
   修法是在 .drill-choice-text 上保留换行（white-space: pre-wrap）。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function load(file, key) {
  const sandbox = { window: {} };
  new Function('window', fs.readFileSync(path.join(ROOT, file), 'utf8'))(sandbox.window);
  return sandbox.window[key];
}

const TXT = load('data/text.js', 'TD_TEXT');
const CSS = fs.readFileSync(path.join(ROOT, 'bluebook.css'), 'utf8');

test('多行选项：SR-214 四个选项都是两条方程分两行', () => {
  const ch = TXT['SR-214'].choices;
  for (const L of ['A', 'B', 'C', 'D']) {
    assert.ok(ch[L].includes('\n'), `${L} 应保留换行`);
    assert.ok(!/\d0\.\d/.test(ch[L].replace(/\n/g, ' ').replace(/\s+/g, ' ')), `${L} 不该把数字与下一行粘连`);
  }
});

test('多行选项：TD-12-27 按练习册 P26 #27 两行印', () => {
  const ch = TXT['TD-12-27'].choices;
  for (const L of ['A', 'B', 'C', 'D']) assert.ok(ch[L].includes('\n'), `${L} 应保留换行`);
});

test('CSS：.drill-choice-text 保留换行', () => {
  const m = CSS.match(/\.drill-choice-text\{[^}]*\}/g) || [];
  assert.ok(m.some(r => /white-space:\s*pre-wrap/.test(r)), '缺少 .drill-choice-text 的 white-space:pre-wrap');
});
