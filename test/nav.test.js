/* 全站导航回归：四个入口（真题练习 / 讲义复习 / 模考 / 错题本）
   必须在首页、讲义页、练习页、错题页都能点到。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FOUR = ['drill.html', 'jiangyi.html', 'exam.html?mode=mock', 'wrong.html'];
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('空首页已删：站点根只剩一跳，所有访问（含 OAuth 回调）直接进真题练习', () => {
  const s = read('index.html');
  assert.ok(s.includes("location.replace('drill.html' + location.search + location.hash)"),
    '根地址必须无条件跳到 drill.html，并把查询串/hash 带过去');
  assert.ok(!s.includes('home-hero'), '空首页 hero 文案已删除');
  assert.ok(s.includes('href="drill.html"'), '无脚本时也要能手动进真题练习');
});

test('讲义页 jiangyi.html 有四个入口 + 返回真题练习', () => {
  const s = read('jiangyi.html');
  FOUR.forEach(href => assert.ok(s.includes('href="' + href + '"'), 'jiangyi 缺少 ' + href));
  assert.ok(s.includes('rail-back') && s.includes('返回真题练习'), 'jiangyi 缺少返回导航');
  assert.ok(!s.includes('id="appnav"'), '讲义页不要同时挂顶部导航，避免同一组链接重复两遍');
});

test('app-core 顶部导航含讲义复习，drill / wrong / exam 因此都能看到四入口', () => {
  const core = read('app-core.js');
  FOUR.forEach(href => assert.ok(core.includes("href: '" + href + "'"), 'app-core nav 缺少 ' + href));
  ['drill.html', 'wrong.html'].forEach(f => {
    assert.ok(read(f).includes('app-core.js'), f + ' 未加载 app-core（导航不会出现）');
  });
  const exam = read('exam.html');
  FOUR.forEach(href => assert.ok(exam.includes('href="' + href + '"'), 'exam.html 缺少 ' + href));
});

test('验收脚本 tools/verify_nav.mjs 存在并覆盖四页', () => {
  const src = read('tools/verify_nav.mjs');
  ['jiangyi.html', 'drill.html', 'wrong.html'].forEach(p => assert.ok(src.includes(p), 'verify_nav 未覆盖 ' + p));
  assert.ok(src.includes('nav/root·跳转'), 'verify_nav 未断言站点根跳转');
  FOUR.forEach(href => assert.ok(src.includes(href), 'verify_nav 未断言 ' + href));
});
