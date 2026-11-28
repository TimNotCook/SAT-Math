/* 成绩页标题的 mode 来自存档，可能被旧版/云端合并写成大写或整个漏掉。
   记录页已经按 modeOf() 归一，但成绩页仍用 MODE_NAME[safeText(r.mode)] 精确查：
   QUIZ 查不到就原样印「QUIZ」，缺 mode 的单元抽查则印成「模考」。
   这里把 renderResult 的标题表达式单独取出来跑，锁住大写、混合大小写和缺失三种情况。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const JS = fs.readFileSync(path.join(__dirname, '..', 'exam.js'), 'utf8');
const SEG = JS.slice(JS.indexOf('function renderResult()'), JS.indexOf('function renderResultList'));
const START = SEG.indexOf('const modeRaw');
const END = SEG.indexOf("|| '模考';", START);
assert.ok(START > -1 && END > START, 'renderResult 的模式标题表达式改了，测试要同步');
const TITLE = SEG.slice(START, END + "|| '模考';".length);

const safeText = v => (v == null ? '' : String(v)).trim();
const MODE_NAME = { mock: 'SAT 数学全真模考', quiz: '单元抽查' };
function titleOf(r, MODE) {
  return new Function('safeText', 'MODE_NAME', 'MODE', 'r', TITLE + '\nreturn modeTxt;')(safeText, MODE_NAME, MODE, r);
}

test('大写 QUIZ 不再原样印成 QUIZ', () => {
  assert.equal(titleOf({ mode: 'QUIZ' }, 'quiz'), '单元抽查');
  assert.equal(titleOf({ mode: 'Mock' }, 'mock'), 'SAT 数学全真模考');
});

test('旧记录缺 mode 时按当前页面模式兜底，不把抽查印成模考', () => {
  assert.equal(titleOf({}, 'quiz'), '单元抽查');
  assert.equal(titleOf({ mode: '   ' }, 'quiz'), '单元抽查');
});

test('未知 mode 仍原样保留，不吞掉排查线索', () => {
  assert.equal(titleOf({ mode: 'FOO' }, 'quiz'), 'FOO');
});
