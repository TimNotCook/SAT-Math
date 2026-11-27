/* test/mobile-target.test.js — 窄屏点击热区的守门断言
 *
 * 背景：Bluebook 桌面版按钮 36px 高，在 375 宽下 Next 只有 36px、Start 41px，
 * 手指点偏一点就落空（低于 iOS HIG 44pt）。bluebook.css 末尾有窄屏/触屏媒体查询把它抬到 44px；
 * 这个测试防止以后有人「为了还原截图」把这段删掉。
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'bluebook.css'), 'utf8');

test('窄屏/触屏媒体查询把做题页按钮抬到 44px', () => {
  assert.match(css, /@media\s*\(max-width:820px\)\s*,\s*\(pointer:coarse\)/, '缺窄屏/触屏媒体查询');
  const block = css.slice(css.search(/@media\s*\(max-width:820px\)\s*,\s*\(pointer:coarse\)/));
  assert.match(block, /\.drill-page-button\{height:44px!important\}/, '上一题/下一题高度没抬到 44px');
  assert.match(block, /\.exam-start-actions \.btn\{min-height:44px!important\}/,
    '开始页主按钮没抬到 44px（注意本文件 742 行的 min-height:0!important，这里必须 !important）');
  assert.match(block, /\.btn\.primary\{min-height:44px!important\}/, '讲义页主按钮（下一题）没抬到 44px');
});

test('窄屏记录页错题题干允许两行（不再单行截成半句）', () => {
  const appCss = fs.readFileSync(path.join(ROOT, 'app.css'), 'utf8');
  const block = appCss.slice(appCss.search(/@media\(max-width:640px\)\{\s*\n\s*\.hist-wrong-row/));
  assert.ok(block && block.length > 0, '缺窄屏 hist-wrong-row 媒体查询（注意要放在 .hist-wrong-stem 原定义之后）');
  assert.match(block, /\.hist-wrong-stem\{white-space:normal;display:-webkit-box;-webkit-line-clamp:2/, '题干没有改成两行截断');
});

test('verify_mobile 验收器存在且用统一 Chrome/profile/静态服务', () => {
  const p = path.join(ROOT, 'tools', 'verify_mobile.mjs');
  assert.ok(fs.existsSync(p), '缺 tools/verify_mobile.mjs');
  const s = fs.readFileSync(p, 'utf8');
  assert.match(s, /from '\.\/lib\/chrome\.mjs'/, '必须复用 lib/chrome.mjs');
  assert.match(s, /from '\.\/lib\/serve\.mjs'/, '必须复用 lib/serve.mjs');
  assert.match(s, /tempProfile\('vm-'\)/, 'profile 必须走 tempProfile 自清理');
  assert.ok(!/python3[^\n]*http\.server/.test(s), '禁止用 python3 -m http.server');
});
