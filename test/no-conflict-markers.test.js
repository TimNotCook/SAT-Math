/* 守卫：源码里绝不能出现 git 冲突标记。
   2026-11-26 曾把 <<<<<<< HEAD 提交进六个 HTML，纯文本直接渲染到线上页面顶部。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TARGETS = ['index.html', 'exam.html', 'drill.html', 'wrong.html', 'jiangyi.html', 'history.html'];
const MARK = /^(<{7}|={7}|>{7})(\s|$)/;

test('六个页面不含 git 冲突标记', () => {
  TARGETS.forEach(f => {
    const lines = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n');
    const bad = lines.map((l, i) => [i + 1, l]).filter(([, l]) => MARK.test(l));
    assert.strictEqual(bad.length, 0, f + ' 第 ' + bad.map(b => b[0]).join(',') + ' 行有冲突标记');
  });
});

test('顶层脚本 / 样式不含 git 冲突标记', () => {
  const js = fs.readdirSync(ROOT).filter(f => f.endsWith('.js') && !f.startsWith('sw'));
  js.forEach(f => {
    const lines = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n');
    const bad = lines.filter(l => MARK.test(l));
    assert.strictEqual(bad.length, 0, f + ' 含冲突标记');
  });
});
