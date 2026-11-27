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
  assert.ok(s.includes('unfinishedFlag(rec.finished)'), '状态/标题/分组必须用归一后的 false');
  assert.ok(s.includes('!finishedFlag(sess.finished)'), '续做判定不能把字符串 false 当已交卷');
  assert.ok(!/rec\.finished === false/.test(s), '直接 === false 会漏掉字符串 false');
});
