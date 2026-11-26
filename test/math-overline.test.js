const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

function load(files) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  files.forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx));
  return ctx.window;
}

test('fmtMath 把 \\overline{AB} 渲染成上划线，而不是漏反斜杠命令', () => {
  const w = load(['figures.js']);
  const html = w.TD_FIG.fmtMath('The circle has center O, and \\\\overline{FG} is a diameter.');
  assert.ok(!html.includes('\\overline'), '不应残留 \\overline 原文：' + html);
  assert.ok(html.includes('td-overline'), '应输出上划线容器：' + html);
  assert.ok(html.includes('FG'), '上划线内容应保留：' + html);
});

test('题库题干不再出现未渲染的 \\overline 命令', () => {
  const w = load(['figures.js', 'data/text.js']);
  const bad = [];
  Object.keys(w.TD_TEXT).forEach((id) => {
    const stem = String((w.TD_TEXT[id] || {}).stem || '');
    if (/\\overline/.test(stem)) {
      const rendered = w.TD_FIG.fmtMath(stem);
      if (rendered.includes('\\overline')) bad.push(id);
    }
  });
  assert.deepStrictEqual(bad, [], '这些题干的上划线命令没被渲染：' + bad.join(','));
});
