/* 全站导航回归：五项（真题练习 / 讲义复习 / 单元抽查 / 错题回顾 / 模考）
   必须在讲义页、练习页、错题页、抽查页都能点到，且侧栏与顶部导航同字面、同顺序。
   首页已删，品牌与入口一律直指 drill，不许再拿 index.html 当落地页。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FIVE = ['drill.html', 'jiangyi.html', 'exam.html?mode=quiz&unit=1', 'wrong.html', 'exam.html?mode=mock'];
const LABELS = ['真题练习', '讲义复习', '单元抽查', '错题回顾', '模考'];
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('空首页已删：站点根只剩一跳，所有访问（含 OAuth 回调）直接进真题练习', () => {
  const s = read('index.html');
  assert.ok(s.includes("location.replace('drill.html' + location.search + location.hash)"),
    '根地址必须无条件跳到 drill.html，并把查询串/hash 带过去');
  assert.ok(!s.includes('home-hero'), '空首页 hero 文案已删除');
  assert.ok(s.includes('href="drill.html"'), '无脚本时也要能手动进真题练习');
});

test('讲义页 jiangyi.html 有五个入口 + 返回真题练习', () => {
  const s = read('jiangyi.html');
  FIVE.forEach(href => assert.ok(s.includes('href="' + href + '"'), 'jiangyi 缺少 ' + href));
  LABELS.forEach(l => assert.ok(s.includes('>' + l + '</a>'), 'jiangyi 缺少导航项 ' + l));
  assert.ok(s.includes('rail-back') && s.includes('返回真题练习'), 'jiangyi 缺少返回导航');
  assert.ok(!s.includes('id="appnav"'), '讲义页不要同时挂顶部导航，避免同一组链接重复两遍');
});

test('app-core 顶部导航含五项（唯一真相），drill / wrong / exam 因此都能看到同一组入口', () => {
  const core = read('app-core.js');
  FIVE.forEach(href => assert.ok(core.includes("href: '" + href + "'"), 'app-core nav 缺少 ' + href));
  ['drill.html', 'wrong.html'].forEach(f => {
    assert.ok(read(f).includes('app-core.js'), f + ' 未加载 app-core（导航不会出现）');
  });
  const exam = read('exam.html');
  FIVE.forEach(href => assert.ok(exam.includes('href="' + href + '"'), 'exam.html 缺少 ' + href));
});

test('四页侧栏与顶部同字面、同顺序；不再有「错题本」和 index 落地链接', () => {
  ['drill.html', 'exam.html', 'wrong.html', 'jiangyi.html'].forEach(f => {
    const s = read(f);
    const aside = s.slice(s.indexOf('class="site-rail"'), s.indexOf('</aside>', s.indexOf('class="site-rail"')));
    assert.ok(aside, f + ' 缺少 site-rail');
    let at = -1;
    LABELS.forEach(l => {
      const i = aside.indexOf('>' + l + '</a>');
      assert.ok(i > at, f + ' 侧栏导航项缺失或顺序不对：' + l);
      at = i;
    });
    assert.ok(!/错题本/.test(aside), f + ' 侧栏仍在用旧名「错题本」');
    assert.ok(!aside.includes('href="index.html"'), f + ' 侧栏仍拿 index.html 当落地页');
    assert.ok(aside.includes('class="rail-brand" href="drill.html"'), f + ' 品牌必须直指 drill.html');
  });
  assert.ok(!read('drill.html').includes('rail-back'), '练习页是真题练习本身，不该有「返回真题练习」死入口');
});

test('验收脚本 tools/verify_nav.mjs 存在并覆盖四页', () => {
  const src = read('tools/verify_nav.mjs');
  ['jiangyi.html', 'drill.html', 'wrong.html'].forEach(p => assert.ok(src.includes(p), 'verify_nav 未覆盖 ' + p));
  assert.ok(src.includes('nav/root·跳转'), 'verify_nav 未断言站点根跳转');
  FIVE.forEach(href => assert.ok(src.includes(href), 'verify_nav 未断言 ' + href));
});
