/* 模考首页文案回归：题数/时长必须来自官方配置（exam-core.OFFICIAL），
   不许再手写「22 题 · 35 分钟」这类只描述单个模块的硬编码。
   2026-11-26 实测：FULL MOCK 实为 2 模块 × 22 题 / 70 分钟，首页卡片却写 22 题 35 分钟。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('模考首页不再硬编码单一模块的题数/时长', () => {
  const html = read('exam.html');
  assert.ok(!html.includes('22 题 · 35 分钟'), 'exam.html 不得再出现「22 题 · 35 分钟」');
  assert.ok(!html.includes('exam-card-sub'), '重复的卡片小字已删除');
});

test('模考说明与参数行从 OFFICIAL 配置取值', () => {
  const js = read('exam.js');
  assert.ok(/O\.questionsPerModule/.test(js), '题数必须读 O.questionsPerModule');
  assert.ok(/O\.secondsPerModule\s*\/\s*60/.test(js), '分钟数必须由 O.secondsPerModule 换算');
  assert.ok(!/'<span>22 Questions<\/span>/.test(js), '不得写死 22 Questions');
});

test('记录页：未交卷模考不得标成「全卷 22 题」', () => {
  const js = read('history-page.js');
  assert.ok(js.includes("if (rec.finished === false) return '官方模考 · 未交卷';"),
    '未交卷的模考只到第一模块，标题必须写未交卷而不是全卷题数');
});

test('模考页：核心脚本没加载完时要有可见兜底，而不是死页', () => {
  const html = read('exam.html');
  assert.ok(html.includes('tdsat_boot_retry_v1'), 'load 后必须检查核心脚本是否就绪，并只自动重载一次');
  assert.ok(html.includes('The grader did not load'), '判分脚本缺失时也要给出可见提示');
  assert.ok(html.includes('This page could not finish loading'), '必须给出可见提示');
  assert.ok(html.includes("btn.textContent = 'Reload'"), '按钮必须变成 Reload');
});

test('模考开场页：标题下不放任何说明小字（存档作废 / 恢复进度 / 模块切换都静默）', () => {
  const js = read('exam.js');
  assert.ok(!/The clock kept running while you were away/.test(js), '不得再往开场页塞「计时没停」说明');
  assert.ok(!/已恢复上次进度/.test(js), '单元抽查恢复也不许写说明条');
  assert.ok(!/could not be restored/.test(js), '存档作废不得在页面上提示原因');
  assert.ok(!/function renderSalvage/.test(js), '不得再有未交卷导出面板');
});

test('模考页：Start 在脚本绑好前必须禁用，绑好后与兜底 Reload 都要解禁', () => {
  const html = read('exam.html');
  const js = read('exam.js');
  assert.match(html, /id="btnStart"[^>]*disabled/, '静态 Start 必须先禁用，避免第一下点空');
  assert.match(js, /\$\('btnStart'\)\.disabled\s*=\s*false/, '绑定 click 后必须解禁');
  assert.match(html, /btn\.textContent = 'Reload'; btn\.disabled = false/, '兜底变 Reload 时必须解禁');
});

/* 模考屏语言：侧栏在开场页可见（模考开场页 v2）后，五屏里不许再露中文导航。
   2026-11-27 两次踩坑：4267128 打开侧栏 → 24 字中文；2d9fa4b 重写答题台时把 enNav 整段覆盖回退。 */
test('模考屏：is-mock 分支必须有 enNav，且覆盖侧栏五条中文', () => {
  const html = read('exam.html');
  assert.ok(/function enNav\(\)/.test(html), 'exam.html 的 is-mock 分支必须保留 enNav()');
  assert.ok(/MutationObserver\(function\(\)\{enChoices\(\);enNav\(\);\}\)/.test(html),
    'enNav 必须挂进 MutationObserver，侧栏异步渲染也能改到');
  const rail = ['真题练习', '单元抽查', '错题回顾', '模考记录', '模考'];
  for (const zh of rail) assert.ok(html.includes(`'${zh}':'`), `侧栏文案 ${zh} 必须在映射表里`);
  assert.ok(html.includes("'← 返回真题练习':'← Back to Practice'"), 'rail-back 也要英文化');
  assert.ok(html.includes("rail.setAttribute('aria-label','Site navigation')"), '侧栏 aria-label 也要英文');
});

/* 模考屏 100% 英文（docs/UI-COPY.md v1.2）不只管页内文案：浏览器标签标题会出现在
   任务切换器、分享卡片上，html lang 决定屏幕阅读器用哪种音读。两者原本都留在中文。 */
test('模考屏：is-mock 分支要把标题和 lang 一起切成英文', () => {
  const html = read('exam.html');
  assert.ok(html.includes('document.title="SAT Math Prep · Practice Test"'),
    '模考模式必须改英文标题，别让「抽查与模考」露出标签页');
  assert.ok(/document\.documentElement\.lang="en"/.test(html), '模考模式必须把 html lang 切成 en');
  // 抽查模式（mode=quiz）走同一页但不进 is-mock，标题应仍是中文
  assert.ok(/<title>SAT Math Prep · 抽查与模考<\/title>/.test(html), '抽查模式的中文标题要保留');
});
