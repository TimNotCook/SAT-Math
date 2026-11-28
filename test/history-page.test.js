/* 记录页（history.html / history-page.js）的两条硬契约。
   2026-11-26 踩过：脚本先于云模块加载、或渲染只挂一条启动路径，
   都会让页面停在「正在读取记录…」。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('记录页的云模块必须先于 history-page.js 加载', () => {
  const h = read('history.html');
  const at = m => h.indexOf(m);
  const page = at('history-page.js');
  assert.ok(page > 0, 'history.html 未引用 history-page.js');
  ['cloud-config.js', 'supa-cloud.js', 'cloud-account.js'].forEach(m => {
    assert.ok(at(m) > 0, '缺 ' + m);
    assert.ok(at(m) < page, m + ' 必须在 history-page.js 之前，否则合并结果拿不到就渲染完了');
  });
});

test('记录页渲染有多路兜底，且不会因容器缺失抛错', () => {
  const s = read('history-page.js');
  assert.match(s, /if \(!box\) return/, 'render 必须容忍 histList 还不存在');
  assert.ok(s.includes("document.addEventListener('DOMContentLoaded', render)"), '缺 DOMContentLoaded 启动');
  assert.ok(s.includes("window.addEventListener('load', render)"), '缺 load 兜底启动');
});

test('记录页：finished 是字符串 "false"/"true" 时仍按布尔处理', () => {
  const s = read('history-page.js');
  assert.ok(s.includes('function finishedFlag(v)'), '缺 finished 真值归一');
  assert.ok(s.includes('function unfinishedFlag(v)'), '缺 unfinished 假值归一');
  assert.ok(s.includes('abandonedRecord(rec)'), '状态/标题/分组必须用归一后的 false/void');
  assert.ok(s.includes('!finishedFlag(sess.finished)'), '续做判定不能把字符串 false 当已交卷');
  assert.ok(!/rec\.finished === false/.test(s), '直接 === false 会漏掉字符串 false');
});


test('记录页 num 不把布尔当数字（true 不能变 1 题/100%）', () => {
  const s = read('history-page.js');
  assert.match(s, /typeof v === 'boolean'/, 'num 缺少布尔排除');
});


test('记录页 txt 不把布尔写成 true/false 文案', () => {
  const s = read('history-page.js');
  assert.match(s, /typeof v === 'boolean' \? '' : String\(v\)/, 'txt 缺少布尔排除');
});


test('记录页日期是数组/对象时不显示 1970', () => {
  const s = read('history-page.js');
  assert.match(s, /typeof t === 'object' && !\(t instanceof Date\)/, 'fmtDate 缺少非 Date 对象排除');
});


test('记录页原始分越界（999）夹到 0–44', () => {
  const s = read('history-page.js');
  assert.match(s, /function rawParts\(rec\)/, '缺 rawParts');
  assert.match(s, /Math\.max\(0, Math\.min\(44, n\)\)/, 'raw 没有夹到 0–44');
});


test('记录页 num 不把空字符串当 0', () => {
  const s = read('history-page.js');
  assert.match(s, /typeof v === 'string' && !v\.trim\(\)/, 'num 未排除空字符串');
});


test('记录页副标题不把标题里的模式名再拼一遍', () => {
  const s = read('history-page.js');
  assert.ok(s.includes('function subtitleOf(rec)'), '缺 subtitleOf');
  assert.ok(s.includes('titleOf(rec).indexOf(modeTxt) >= 0 ? date : date'),
    '副标题必须在标题已含模式名时只留日期');
  assert.ok(s.includes('esc(subtitleOf(rec))'), 'rowHtml 未使用 subtitleOf');
  assert.ok(!s.includes("fmtDate(rec.date) + ' · ' + (MODE_NAME[modeOf(rec)]"),
    'rowHtml 又无条件拼模式名，会出现「单元抽查 · 单元抽查」');
});

test('记录展开后的空状态左对齐，不横跨卡片居中', () => {
  const css = read('app.css');
  assert.ok(css.includes('body.shell-history .hist-body .hist-empty'), '缺 hist-body 作用域');
  assert.ok(css.includes('text-align:left!important'), '展开空状态仍会居中');
});
