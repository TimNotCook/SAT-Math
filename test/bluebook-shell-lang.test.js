/* bluebook-shell：工具条语言门控
   2026-11-28 巡检发现：练习页（drill.html?sec=…）在中文界面被整片翻成 Bluebook 英文，
   结果是「Reference / 退出 / 作答自动保存」并排的中英混排。
   规则：只有官方模考（mode=mock）和英文界面才强制英文；中文练习页保持中文。
   练习页的静态标签（Scratch / Reference）也要跟着语言走。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'bluebook-shell.js'), 'utf8');

test('工具条英文只给官方模考和英文界面', () => {
  assert.match(SRC, /function forceEn\(\)\s*\{\s*return officialMock\(\)\s*\|\|\s*langEn\(\)\s*;\s*\}/,
    '缺少 forceEn() 语言门控：中文练习页会被强制成英文');
  assert.match(SRC, /function officialMock\(\)[^\n]*mode=mock/, 'officialMock 没按 mode=mock 判断');
});

test('Mark for Review 不再无条件覆写中文', () => {
  assert.doesNotMatch(SRC, /setText\(\$\('markLabel'\),\s*'Mark for Review'\)/,
    '标记按钮仍被无条件改成英文，中文界面会中英混排');
  assert.match(SRC, /setText\(\$\('markLabel'\),\s*forceEn\(\)\s*\?\s*'Mark for Review'\s*:\s*'标记'\)/,
    '标记按钮没有按语言分支');
});

test('草稿 / 公式参考静态标签按语言替换', () => {
  assert.match(SRC, /btnScratch[\s\S]{0,400}'草稿'/, '中文界面没把 Scratch 换成草稿');
  assert.match(SRC, /btnReference[\s\S]{0,400}'公式参考'/, '中文界面没把 Reference 换成公式参考');
});

test('dressFooter 在中文练习页直接返回，不再拉回 Back/Next/Submit', () => {
  const seg = SRC.slice(SRC.indexOf('function dressFooter('), SRC.indexOf('function dressFooter(') + 240);
  assert.match(seg, /if\s*\(!forceEn\(\)\)\s*return/, 'dressFooter 缺语言门控，中文页会被改成 Back/Next');
  assert.match(SRC, /forceEn\(\)\s*\?\s*'Exit'\s*:\s*'退出'/, '退出按钮没有按语言分支');
});
