/* app-ui.js 弱网/首屏截断没加载时，drill 页不能整页初始化中断；
   另一个旧 bug 是关闭计算器时查 window.U，而 app-ui 暴露的是 window.TD_UI，
   导致切到不允许计算器的单元练习后，已打开的计算器留在屏幕上。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const JS = fs.readFileSync(path.join(__dirname, '..', 'drill.js'), 'utf8');

test('练习页 bindTools 前检查 TD_UI 是否存在', () => {
  assert.match(JS, /if \(U && typeof U\.bindTools === 'function'\) \{[\s\S]*?U\.bindTools\(/,
    'app-ui 缺失时 drill 初始化会在 U.bindTools 处抛错');
});

test('关闭计算器走 TD_UI 的 closeCalculator，不再查不存在的 window.U', () => {
  assert.doesNotMatch(JS, /window\.U\s*&&/, '还在用 window.U 作判断；app-ui 只暴露 window.TD_UI');
  assert.match(JS, /!allow && U && typeof U\.closeCalculator === 'function'/,
    '没有用 TD_UI.closeCalculator 关闭已打开的计算器');
});
