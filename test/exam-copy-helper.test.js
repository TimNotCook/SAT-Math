/* test/exam-copy-helper.test.js — 守住 exam.js 的文案选择器 T(zh,en) 不被局部同名遮蔽
 *
 * 2026-11-26 真事：renderQuestion 里写过 `const T = (window.TD_TEXT||{})[q.id] || {}`，
 * 把模块级 T(zh,en) 顶掉，后面 `T('查看图形答案…','Show graph answer')` 变成
 * “对象不可调用”，模考里凡是带 linear-graph 开关的题（题库 27 道）一渲染就抛
 * TypeError: T is not a function，答案区与题号条半截不刷。
 * 这里做静态守卫：T 只允许声明一次，且必须仍是函数。
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'exam.js'), 'utf8');

test('exam.js：T 只声明一次，且是 (zh,en) 文案选择器', () => {
  const decls = SRC.match(/const\s+T\s*=/g) || [];
  assert.equal(decls.length, 1, 'const T 应只有模块级那一处，发现 ' + decls.length + ' 处');
  assert.match(SRC, /const T = \(zh, en\) => \(OFFICIAL \? en : zh\);/, 'T 必须是文案选择器');
});

test('exam.js：文本层变量叫 TXT，且没有把 T 当对象取字段', () => {
  assert.match(SRC, /const TXT = \(window\.TD_TEXT \|\| \{\}\)\[q\.id\] \|\| \{\};/);
  assert.ok(!/(?<![A-Za-z])T\.choices/.test(SRC), '不能再出现 T.choices（T 是函数，不是文本对象）');
  assert.ok(!/(?<![A-Za-z])\(T\.stem/.test(SRC), '不能再出现 T.stem');
});
