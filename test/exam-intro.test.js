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
