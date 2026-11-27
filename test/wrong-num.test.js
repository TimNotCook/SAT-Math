/* wrong-page 的错因分析用 num() 解析 grid-in 数值；分数必须按 3/4 这种正常写法解析，
   不能因为正则把行尾锚点写成字面量 \$ 而把合法分数判成“格式错误”。 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, '..', 'wrong-page.js'), 'utf8');
const decl = src.match(/function num\(s\)\{[^}]*\}/);
assert.ok(decl, 'wrong-page.js 应保留 num()');
const num = new Function('return (' + decl[0] + ')')();

test('3/4 这类分数能解析成 0.75', () => {
  assert.equal(num('3/4'), 0.75);
  assert.equal(num(' 3 / 4 '), 0.75);
  assert.equal(num('-3/4'), -0.75);
});

test('小数、整数和坏值仍按原规则处理', () => {
  assert.equal(num('0.75'), 0.75);
  assert.equal(num('12'), 12);
  assert.equal(num('abc'), null);
  assert.equal(num('3/0'), null);
});
