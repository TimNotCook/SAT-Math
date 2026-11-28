/* A.save() 现在会返回写盘成败。图片导入不能继续“调完就当写成功”，
   否则配额满/只读时用户看到“已导入”，刷新记录却没了。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const JS = fs.readFileSync(path.join(__dirname, '..', 'image-import.js'), 'utf8');

test('自动导入检查 A.save() 返回值，并把失败写进结果与提示', () => {
  assert.match(JS, /var localWriteFailed = !A\.save\(\);[\s\S]*?本机进度写入失败/,
    'importChecked 仍把 A.save() 当永远成功');
  assert.match(JS, /res && res\.localWriteFailed[\s\S]*?本机进度写入失败/,
    '识别结束的汇总消息没有带上写盘失败提示');
});

test('撤销导入和手动单题导入也会提示写盘失败', () => {
  assert.match(JS, /savedUndo[\s\S]*?刷新后这次撤销可能回滚/, '撤销成功后写盘失败仍显示已撤销');
  assert.match(JS, /savedOne[\s\S]*?刷新后这道题可能丢失/, '手动导入写盘失败仍只显示已导入');
});

test('三个镜像并发时首个成功立刻返回，不再等慢镜像全部 settle', () => {
  assert.doesNotMatch(JS, /Promise\.all\(tries/, '还在用 Promise.all 等三个镜像全部完成');
  assert.match(JS, /settled = true;[\s\S]*?resolve\(w\);/, '首个成功没有立刻 resolve');
});
