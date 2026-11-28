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
  assert.match(JS, /removed\.push[\s\S]*?savedUndo = A\.save\(\)[\s\S]*?st2\.answers\[x\.q\] = x\.a/, '撤销写盘失败后没有把内存里的导入记录恢复');
  assert.match(JS, /撤销没有生效[\s\S]*?再点一次/, '撤销写盘失败仍显示已撤销');
  assert.match(JS, /savedOne[\s\S]*?刷新后这道题可能丢失/, '手动导入写盘失败仍只显示已导入');
});


test('引擎预取把四个真实文件都算进 6.8MB 进度，错误响应不冒充下载字节', () => {
  assert.match(JS, /'vendor\/tesseract\/tesseract\.min\.js'[\s\S]*'vendor\/tesseract\/worker\.min\.js'[\s\S]*tesseract-core-simd-lstm\.wasm\.js[\s\S]*eng\.traineddata\.gz/, '预取清单漏了 tesseract.min.js / worker.min.js，进度永远停在 6.6/6.8MB');
  assert.match(JS, /if \(!r\.ok\) return 0;/, '404/500 仍把错误页字节算成下载进度');
});
