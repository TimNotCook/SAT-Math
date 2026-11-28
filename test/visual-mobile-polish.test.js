/* test/visual-mobile-polish.test.js — 窄屏/桌面小屏排版守门
 * 1) 1440 讲义四列里「问题解决与数据分析」被 nowrap+ellipsis 切成「问题解决与数…」；
 * 2) 320 做题页「Mark for Review」被 flex 压成两行，把工具条撑高一倍；
 * 3) 390/320 模考卡三块 104px 定宽数字排不下，「1」孤零零掉到第二行。
 * 这些只在真实视口截图里看得到，用静态 CSS 断言锁住修复条件。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(resolve(ROOT, 'app.css'), 'utf8');
const examjs = readFileSync(resolve(ROOT, 'exam.js'), 'utf8');
const bluebook = readFileSync(resolve(ROOT, 'bluebook.css'), 'utf8');

test('讲义四列收紧内边距/字号，长板块名不再省略', () => {
  assert.match(app, /@media\(min-width:1000px\)\{/);
  assert.match(app, /body\.jy-page #jyBoardCards \.entry-tile\{padding:0 14px;gap:8px\}/);
  assert.match(app, /body\.jy-page #jyBoardCards \.entry-tile b\{font-size:14px\}/);
  assert.match(app, /body\.jy-page #jyBoardCards \.entry-tile \.entry-arrow\{width:16px;height:16px\}/);
});

test('320 做题页只留旗帜图标，Mark 文案视觉隐藏但仍在无障碍树', () => {
  assert.match(bluebook, /@media \(max-width:360px\) \{/);
  assert.match(bluebook, /\.drill-mark-button #markLabel\{position:absolute!important/);
  assert.match(bluebook, /clip:rect\(0 0 0 0\)!important/);
  assert.match(bluebook, /\.drill-mark-button\{padding:0 8px!important;min-width:36px!important\}/);
});

test('手机模考卡三个数字等分成一行，320 不再把「of 2 modules」拆两行', () => {
  assert.match(app, /html body\.exam-page\.is-mock \.quiz-card-facts \.quiz-fact\{flex:1 1 0!important;width:auto!important;white-space:nowrap!important/);
  assert.match(app, /html body\.exam-page\.is-mock \.quiz-card-facts \.quiz-fact\{font-size:10px!important\}/);
});

test('320 模考卡标题 21px 单行，不在 Practice 后断开', () => {
  assert.match(app, /html body\.exam-page\.is-mock #mockCardTitle\{font-size:21px!important;line-height:1\.25!important\}/);
});

test('320 讲义一列卡的长板块名允许两行，不再截成省略号', () => {
  assert.match(app, /html body\.jy-page #jyBoardCards \.entry-tile b\{white-space:normal!important;overflow:visible!important;/);
  assert.match(app, /text-overflow:clip!important;line-height:1\.25!important;word-break:normal!important;text-wrap:balance!important/);
});

test('320 空态卡收窄左右内边距，记录页标题不再拆成「…抽查 / 记录」', () => {
  assert.match(app, /html body\.shell-history \.hist-list>\.hist-empty\{padding-left:12px!important;padding-right:12px!important\}/);
  assert.match(app, /html body \.empty-panel\{padding-left:12px!important;padding-right:12px!important\}/);
  assert.match(app, /html body \.empty-panel p,html body \.hist-empty \.he-d\{text-wrap:pretty\}/);
});
test('320/390 首页板块行标题两行均分，不把「方程」拆开、不留单字「题」', () => {
  assert.match(app, /html body \.tile-grid>\.tile-section\.drill-section-row \.tile-name\{text-wrap:balance!important;padding-right:0!important\}/);
  assert.match(app, /html body \.tile-grid>\.tile-section\.drill-section-row\.drill-section-row\{grid-template-columns:44px minmax\(0,1fr\) auto!important\}/);
});

test('320 首页状态列收成三态圆点，标题列回到 122px', () => {
  assert.match(app, /html body \.tile-grid>\.tile-section\.drill-section-row \.tile-state\.tile-state\{/);
  assert.match(app, /width:8px!important;min-width:8px!important;height:8px!important/);
  assert.match(app, /\.tile-state\.tile-state\.is-active::after\{background:#2563eb\}/);
  assert.match(app, /\.tile-state\.tile-state\.is-done::after\{background:#16a34a\}/);
});

test('320「继续上次练习」允许折行，不再截断小节名', () => {
  assert.match(app, /html body \.drill-resume\.drill-resume\{/);
  assert.match(app, /white-space:normal!important/);
  assert.match(app, /text-overflow:clip!important/);
});

test('320 成绩报告题号不被拆成「第」与「1 题」两截', () => {
  assert.match(app, /html body \.rev-topic \.rev-qno\{white-space:nowrap!important\}/);
});

test('320 成绩报告标题缩到 14px、题号独立成行', () => {
  assert.match(app, /@media\(max-width:360px\)\{\s*html body \.rev-topic\{font-size:14px!important/);
  assert.match(app, /html body \.rev-topic \.rev-qno\{display:block!important/);
});

test('320 题号换行后不把「·」孤零零留在第二行行首', () => {
  assert.match(examjs, /<span class="rev-qno"><span class="rev-sep"> · <\/span>/);
  assert.match(app, /html body \.rev-topic \.rev-qno \.rev-sep\{display:none!important\}/);
  assert.match(app, /html body \.rev-line1 \.rev-q\{display:none!important\}/);
});
