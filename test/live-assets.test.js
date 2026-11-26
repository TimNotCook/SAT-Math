/* 2026-11-26：全仓「引用了但文件不存在」排查。
   只查页面真正加载的东西：html 里 script/link 的本地 src/href，以及 css 的 url()。
   根目录旧版 questions.js、data/text_crop.js 这类没被任何页面引用的死文件不在此列。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

test('页面加载的本地脚本/样式/CSS 资源都存在', () => {
  const missing = [];
  for (const h of fs.readdirSync(ROOT).filter(f => f.endsWith('.html'))) {
    const s = fs.readFileSync(path.join(ROOT, h), 'utf8');
    for (const m of s.matchAll(/<(?:script|link)[^>]*(?:src|href)="([^"]+)"/g)) {
      const p = m[1].split('?')[0];
      if (/^(http|data:|#|\/\/)/.test(p) || !p) continue;
      if (!fs.existsSync(path.join(ROOT, p))) missing.push(h + ' -> ' + p);
    }
  }
  for (const f of fs.readdirSync(ROOT).filter(x => x.endsWith('.css'))) {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of s.matchAll(/url\((['"]?)([^)'"]+)\1\)/g)) {
      const p = m[2];
      if (/^(data:|http|\/\/|#)/.test(p)) continue;
      if (!fs.existsSync(path.join(ROOT, p))) missing.push(f + ' -> ' + p);
    }
  }
  assert.equal(missing.length, 0, '缺失资源：\n' + missing.join('\n'));
});
