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
const scratch = readFileSync(resolve(ROOT, 'scratch-pad.js'), 'utf8');
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
  /* 44px 三列已撤，交回文件末尾的两行式区域。 */
  assert.match(app, /html body \.tile-grid>\.tile-section\.drill-section-row\{/);
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

test('320 成绩报告 Q1 与知识点名同排，不被挤成孤儿行', () => {
  /* 8c6ca1d 之后知识点名不再拖「· 第 N 题」：题号只在 Q${dPos} 上出现一次，
     拼进知识点名的 rev-qno/rev-sep 结构已删除，这里反向守住别又被拼回去。 */
  assert.ok(!/<span class="rev-qno"><span class="rev-sep">[^<]*<\/span>/.test(examjs), '知识点名后面不要重复拼题号');
  assert.match(app, /html body \.rev-line1\{gap:4px!important\}/);
  assert.match(app, /html body \.rev-topic\{font-size:12.3px!important/);
  assert.match(app, /html body \.rev-q\{font-size:10.5px!important\}/);
  assert.ok(!/html body \.rev-line1 \.rev-q\{display:none!important\}/.test(app), '320 不能藏掉 Q1，否则同知识点题分不清');
});

test('首页窄屏板块卡改成两行式：编号与状态一行、标题独占一行', () => {
  /* 390 下三段（编号｜标题｜状态）挤一起，英文长标题被压成 4–5 行、卡片高低不齐。
     改成 "code state" / "name name" 两行，标题拿到整行宽度。 */
  assert.match(app, /grid-template-areas:"code state" "name name"!important/);
  assert.match(app, /grid-template-columns:auto minmax\(0,1fr\)!important/);
});

test('窄屏标题限两行、英文预留两行高度，卡片高度不再一高一矮', () => {
  assert.match(app, /-webkit-line-clamp:2/);
  assert.match(app, /html\[data-lang="en"\] \.site-shell \.tile-grid>\.tile-section\.drill-section-row \.tile-name\{\s*min-height:2\.7em/);
});

test('别再用三列 columns 抢两行式区域：area 被 grid-column:auto 顶掉会掉回三行', () => {
  assert.ok(!/\.drill-section-row\.drill-section-row\{grid-template-columns:44px/.test(app), '320 的三列定义已删，交回两行式');
  assert.ok(!/grid-area:state!important;grid-column:auto!important/.test(app), 'grid-area 后面不能再跟 grid-column:auto');
});

test('草稿纸关着的时候不留隐形按钮噪音', () => {
  /* 只压 opacity 的话画布和工具条还在版面里，读屏会念「清空 / 完成」，
     innerText 也会在每页页尾捡到这两颗按钮。 */
  assert.match(scratch, /\.mist-layer\{position:fixed;inset:0;z-index:70;pointer-events:none;opacity:0;visibility:hidden;/);
  assert.match(scratch, /\.mist-layer\.show\{opacity:1;visibility:visible\}/);
});

test('逐题回顾不再印仓库单元号 U1/U2，改印单元名', () => {
  /* 学生看不懂 U2；英文用 UNIT_EN、中文用 UNIT_CN 的单元名。 */
  assert.match(examjs, /const UNIT_CN = \{ 1: '代数核心', 2: '问题解决与数据分析', 3: '高等数学', 4: '几何与三角' \}/);
  assert.ok(!/'U' \+ dUnit/.test(examjs), '逐题回顾 meta 不要再拼 U 号');
  assert.ok(!/qt-code">U\$\{u\.id\}/.test(examjs), '单元折叠条不要 U 号前缀');
});

test('错题空态不留下空统计格的整块空白', () => {
  assert.match(app, /body\.shell-wrong #wrongHero:empty\{display:none!important\}/);
});

test('320 错题四个单元统计卡排成两列，不竖着占两屏', () => {
  assert.match(app, /body\.shell-wrong \.wrong-overview\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important\}/);
});
