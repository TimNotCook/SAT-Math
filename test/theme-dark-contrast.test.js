/* test/theme-dark-contrast.test.js — 暗黑主题可读性守门
 * 这些组合都曾在真机/截图里出现过「浅底浅字 / 黑底深字」：
 * 1) 设置面板分段控件选中态：--blue 在 dark 变成浅银，白字直接消失；
 * 2) 移动端 site-rail 顶栏/桌面左栏：app.css 写死白底 + navy 字，暗黑下留一条白栏；
 * 3) 做题页题内表格：--bb-figure-tint 在 :root 就被展开成暗色，只改 --wash 救不回来；
 * 4) 模考 Submit：dark 的浅银反色带到始终白纸的 exam 页，官方黑底被冲掉。
 * 这是一组静态 CSS 断言，防止后续改主题时又把这些行删掉。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(resolve(ROOT, 'glass.css'), 'utf8');
const acct = readFileSync(resolve(ROOT, 'cloud-account.js'), 'utf8');

test('dark 分段控件选中字跟随 --paper，而不是写死 #fff', () => {
  assert.match(acct, /\.td-set-seg button\[data-active="1"\]\{background:var\(--blue,#2563eb\);color:var\(--paper,#fff\)\}/);
  assert.match(acct, /\[data-theme="dark"\] \.td-set-switch\[data-on="1"\]::after\{background:#1c1c1e\}/);
});

test('dark 下 site-rail 顶栏/左栏有深色覆盖', () => {
  assert.match(css, /html\[data-theme="dark"\] \.site-rail\{/);
  assert.match(css, /background:#141416!important/);
  assert.match(css, /html\[data-theme="dark"\] \.site-rail a\[aria-current\]/);
});

test('dark 做题页把题内表格 tint 锁回浅色（含 :root 展开值）', () => {
  assert.match(css, /--bb-figure-tint:#f5f7fa; --bb-border:#e4eaf2;/);
  assert.match(css, /html\[data-theme="dark"\] body:has\(#questionView:not\(\[hidden\]\)\)/);
  assert.match(css, /html\[data-theme="dark"\] body.exam-page:has\(#stage-answer:not\(\[hidden\]\)\)/);
});

test('dark 模考 answer 页保持 Bluebook 白纸与官方按钮', () => {
  assert.match(css, /html\[data-theme="dark"\] body\.exam-page\{color-scheme:light\}/);
  assert.match(css, /html\[data-theme="dark"\] body\.exam-page \.exam-submit-button,/);
  assert.match(css, /background:#111!important;border-color:#111!important;color:#fff!important/);
});

test('dark 讲义页题卡白纸锁浅、上下工具条深底浅字', () => {
  assert.match(css, /html\[data-theme="dark"\] body\.jy-page \.drill-question\{/);
  assert.match(css, /html\[data-theme="dark"\] body\.jy-page \.drill-question \.drill-choice\{/);
  assert.match(css, /html\[data-theme="dark"\] body\.jy-page \.drill-footer\{\s*background:#141416!important/);
  assert.match(css, /html\[data-theme="dark"\] body\.jy-page \.drill-footer \.btn\.primary\{/);
});

test('dark 记录页 Σ 徽标保持品牌蓝白字、讲义板块标题不再深蓝叠深灰', () => {
  assert.match(css, /html\[data-theme="dark"\] \.drill-select-badge\{\s*background:#2563eb!important/);
  assert.match(css, /html\[data-theme="dark"\] \.drill-select-sigma\{color:#fff!important\}/);
  assert.match(css, /html\[data-theme="dark"\] \.jy-board-card b\{color:#f5f5f7!important\}/);
});

test('dark 账号面板主按钮保持品牌蓝白字，neutral 按钮透明浅字', () => {
  assert.match(css, /html\[data-theme="dark"\] \.td-acct-btn2\{\s*background:#2563eb!important/);
  assert.match(css, /html\[data-theme="dark"\] \.td-acct-btn2\[data-neutral="1"\]\{/);
});

test('dark 逐题结果行/答案框不再浅灰底叠浅银字', () => {
  assert.match(css, /html\[data-theme="dark"\] \.drill-result-row,\s*html\[data-theme="dark"\] \.rev-item\{/);
  assert.match(css, /html\[data-theme="dark"\] \.drill-result-row \.drill-result-answers>div\{/);
  assert.match(css, /background:rgba\(255,107,107,\.12\)!important/);
});

test('dark 错题卡片标题不再深蓝叠深玻璃', () => {
  assert.match(css, /html\[data-theme="dark"\] \.wrong-card-head b\{color:#f5f5f7!important\}/);
  assert.match(css, /html\[data-theme="dark"\] \.exam-panel h2\{color:var\(--ink\)!important\}/);
});

test('dark UNIT 筛选胶囊/错题小标签可读', () => {
  assert.match(css, /html\[data-theme="dark"\] \.filter-btn:not\(\.on\)\{[^}]*background:rgba\(255,255,255,\.06\)!important/);
  assert.match(css, /html\[data-theme="dark"\] \.filter-btn:not\(\.on\)\{[^}]*color:#b8b8bd!important/);
  assert.match(css, /html\[data-theme="dark"\] \.filter-btn:not\(\.on\):hover\{[^}]*background:rgba\(255,255,255,\.12\)!important/);
  assert.match(css, /html\[data-theme="dark"\] \.wrong-hero-label\{color:var\(--sub\)!important\}/);
});

test('dark 图片识别导入面板不再白膜灰字', () => {
  assert.match(css, /html\[data-theme="dark"\] \.imgimp-x\{[^}]*background:rgba\(255,255,255,\.06\)!important/);
  assert.match(css, /html\[data-theme="dark"\] \.imgimp-x\{[^}]*color:#f5f5f7!important/);
  assert.match(css, /html\[data-theme="dark"\] \.imgimp-drop\{[^}]*background:rgba\(255,255,255,\.06\)!important/);
  assert.match(css, /html\[data-theme="dark"\] \.imgimp-row select,[^}]*background:#2c2c2e!important/);
  assert.match(css, /html\[data-theme="dark"\] \.imgimp-ocr,[^}]*color:#e8e8ea!important/);
});

test('dark 草稿纸工具条清空按钮可读', () => {
  assert.match(css, /html\[data-theme="dark"\] \.mist-toolbar button\{color:#c8c8cc!important\}/);
  assert.match(css, /html\[data-theme="dark"\] \.mist-toolbar \.mist-done\{[^}]*background:#2563eb!important;color:#fff!important/);
  assert.match(css, /html\[data-theme="dark"\] \.mist-hint\{[^}]*color:#c8c8cc!important/);
});

test('dark 索引页 hero-sub / tile-code 辅助字可读', () => {
  assert.match(css, /html\[data-theme="dark"\] \.hero-sub,\nhtml\[data-theme="dark"\] \.tile-code\{color:#a8a8ad!important\}/);
});

test('dark 成绩页题目筛选标签悬停不再浅底浅字', () => {
  assert.match(css, /html\[data-theme="dark"\] \.exam-tabs \.tab,[^}]*background:rgba\(255,255,255,\.06\)!important/);
  assert.match(css, /html\[data-theme="dark"\] \.exam-tabs \.tab:hover,[^}]*background:rgba\(255,255,255,\.14\)!important/);
  assert.match(css, /html\[data-theme="dark"\] \.exam-tabs \.tab\.on,[^}]*background:rgba\(48,48,54,\.92\)!important/);
});

test('dark 全局 toast 不再白底白字', () => {
  assert.match(css, /html\[data-theme="dark"\] #toast\{[^}]*background:#2c2c2e!important/);
  assert.match(css, /html\[data-theme="dark"\] #toast\{[^}]*color:#f5f5f7!important/);
});

test('dark 顶栏账号按钮已登录/悬停不再浅银底白字', () => {
  assert.match(css, /html\[data-theme="dark"\] \.td-acct-btn\[data-on="1"\],[^}]*background:rgba\(37,99,235,\.22\)!important/);
  assert.match(css, /html\[data-theme="dark"\] \.td-acct-btn:hover,[^}]*background:rgba\(255,255,255,\.18\)!important/);
  assert.match(css, /html\[data-theme="dark"\] \.td-acct-btn\[data-on="1"\]:hover,[^}]*background:rgba\(37,99,235,\.32\)!important/);
});

test('dark 未做完成绩角标可读', () => {
  assert.match(css, /html\[data-theme="dark"\] \.hist-score\.void\{color:#a8a8ad!important\}/);
});

test('dark 图片导入关闭按钮文字不竖排', () => {
  assert.match(css, /html\[data-theme="dark"\] \.imgimp-x\{[^}]*white-space:nowrap/);
});

test('dark 普通次要按钮不再白膜浅字', () => {
  assert.match(css, /html\[data-theme="dark"\] \.btn:not\(\.primary\):not\(\.danger\):not\(\.ghost\)\{[^}]*background:rgba\(255,255,255,\.08\)!important/);
  assert.match(css, /html\[data-theme="dark"\] \.btn:not\(\.primary\):not\(\.danger\):not\(\.ghost\)\{[^}]*color:#e8e8ea!important/);
  assert.match(css, /html\[data-theme="dark"\] \.btn:not\(\.primary\):not\(\.danger\):not\(\.ghost\):hover\{[^}]*background:rgba\(255,255,255,\.14\)!important/);
});

test('dark danger 按钮不再白膜红字', () => {
  assert.match(css, /html\[data-theme="dark"\] \.btn\.danger\{[^}]*background:rgba\(220,38,38,\.14\)!important/);
  assert.match(css, /html\[data-theme="dark"\] \.btn\.danger\{[^}]*color:#ff9a9a!important/);
});
