/* 五页资源版本守卫：不靠人记，bump 与验收都必须硬红。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

test('bump_assets.py --check：五页 ?v= 同值且对齐内容哈希', () => {
  const out = execFileSync('python3', ['bump_assets.py', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.match(out, /asset version: [0-9a-f]{12}/);
  assert.match(out, /PASS 五页资源版本一致：/);
});

test('版本守卫能抓住五页不同值', async () => {
  const { summarize, PAGES } = await import('../tools/versions.mjs');
  const html = Object.fromEntries(PAGES.map(n => [n, '<script src="app.js?v=aaa"></script>']));
  html['jiangyi.html'] = '<link rel="stylesheet" href="app.css?v=bbb">';
  const r = summarize(html);
  assert.strictEqual(r.ok, false);
  assert.match(r.errors.join('；'), /五页不同值/);
  assert.match(r.detail, /jiangyi\.html=bbb/);
});

test('版本守卫能抓住同页多值', async () => {
  const { summarize, PAGES } = await import('../tools/versions.mjs');
  const html = Object.fromEntries(PAGES.map(n => [n, '<script src="app.js?v=aaa"></script>']));
  html['drill.html'] = '<script src="a.js?v=aaa"></script><script src="b.js?v=bbb"></script>';
  const r = summarize(html);
  assert.strictEqual(r.ok, false);
  assert.match(r.errors.join('；'), /drill\.html 同页多值/);
});
