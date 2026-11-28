/* 模考作废留档写盘失败时，旧实现仍把 session 删了：void 记录没进 results，
   35 分钟卷面也一起没了。这里锁住“写失败 -> 标记 -> 不删会话”的链路。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'exam.js'), 'utf8');

test('模考留档写失败会标记记录，不再静默丢掉', () => {
  assert.match(SRC, /if \(!save\(KEY_RESULTS, all\)\) rec\.storageWriteFailed = true;/, '留档 save 失败没有标记');
  assert.match(SRC, /function salvageThenClear\(/, '缺少留档后决定能否清会话的收口');
  assert.match(SRC, /原会话已保留；清出空间后刷新可重试/, '写失败没有告诉用户会话还留着');
});

test('运行中异常与存档恢复都经 salvageThenClear 再决定删会话', () => {
  assert.match(SRC, /function runtimeVoid\(\) \{\s*if \(salvageThenClear\(S, 'runtime'\)\)/, 'runtimeVoid 仍无条件删会话');
  assert.match(SRC, /const canClear = started \? salvageThenClear\(saved, fixed\.reason\) : true;/, '恢复失效存档没有检查留档是否写成功');
  assert.match(SRC, /if \(canClear\) \{\s*try \{ localStorage\.removeItem\(KEY_SESSION\)/, '留档失败仍删了原会话');
});
