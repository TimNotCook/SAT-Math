/* test/history-empty-copy.test.js
 *
 * 2026-11-28 巡检（真机跑线上英文界面）：成绩记录页「错题」区在整份答对时显示
 * 「本次全部答对。」——history-page.js 里写死的单句，没走 isEn() 分支，
 * 英文界面下直接漏中文。这条是历史记录里最容易撞到的空态，锁一下。
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'history-page.js'), 'utf8');

test('成绩记录：全对空态按界面语言出', () => {
  assert.ok(/isEn\(\)\s*\?\s*'All correct this time\.'\s*:\s*'本次全部答对。'/.test(SRC),
    'history-page.js 的全对空态缺少英文分支（英文界面会显示「本次全部答对。」）');
});

test('成绩记录页不再有裸中文空态', () => {
  const bare = SRC.match(/hist-empty">[^<']*[\u4e00-\u9fff][^<']*'/g) || [];
  assert.deepEqual(bare, [], '发现未包语言的 hist-empty 文案：' + bare.join(' / '));
});
