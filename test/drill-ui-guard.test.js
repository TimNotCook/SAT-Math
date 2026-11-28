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

test('练习页保存失败时提示一次，不把 A.save() 当永远成功', () => {
  assert.match(JS, /function saveDrill\(\) \{[\s\S]*?var ok = A\.save\(\);[\s\S]*?进度保存失败/, 'A.save() 失败仍静默，刷新后作答丢失');
});

test('交卷标记写盘失败时不跳成绩页，留在本题等重试', () => {
  assert.match(JS, /if \(!saveDrill\(\)\) \{[\s\S]*?st\.submitted = false;[\s\S]*?return;[\s\S]*?location\.href = resultUrl\(section\);/, '交卷写盘失败仍跳到读旧盘的成绩页，页面会显示这一节没交');
});

test('练习页保存状态必须反映 saveDrill 真实结果', () => {
  assert.match(JS, /function setSaved\(\) \{[\s\S]*?var ok = saveDrill\(\);[\s\S]*?保存失败：本地存储不可写/, 'setSaved 仍无条件写「已保存到此设备」');
});
