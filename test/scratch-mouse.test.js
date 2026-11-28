/* 草稿板：鼠标也能写 + 文案跟随界面语言
   2026-11-28 巡检发现两个问题：
   1) 桌面端没有触控笔就用不了草稿板——pointerdown 只认 pointerType === 'pen'，
      Mac / Windows 用鼠标拖动一点反应都没有，入口等于假按钮。
   2) 练习页的 Clear / Done 被硬编码成英文（TOOL 里 PRACTICE 直接返回英文），
      和中文工具条「公式参考 / 退出 / 作答自动保存」并排就是中英混排。
   模考与抽查的作答屏仍保持 Bluebook 英文，不在本次改动范围内。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'scratch-pad.js'), 'utf8');

test('鼠标左键拖动可以书写', () => {
  assert.match(SRC, /function isDraw\(e\)\s*\{[\s\S]{0,220}pointerType === 'mouse'[\s\S]{0,80}(button === 0|buttons === 1)/,
    'isDraw 没把鼠标左键算作书写输入');
  assert.match(SRC, /function isDraw\(e\)\s*\{\s*if \(isPen\(e\)\) return true;/, 'isDraw 没保留触控笔路径');
});

test('三个指针事件都改用 isDraw 门控', () => {
  const seg = SRC.slice(SRC.indexOf("canvas.addEventListener('pointerdown'"), SRC.indexOf("canvas.addEventListener('pointercancel'"));
  const guards = seg.match(/!isDraw\(e\)/g) || [];
  assert.equal(guards.length, 3, 'pointerdown/move/up 里没有全部改用 isDraw（鼠标仍画不上）');
  assert.doesNotMatch(seg, /!isPen\(e\)/, '指针事件还留着只认 pen 的门控');
});

test('草稿板文案跟随界面语言，模考/抽查屏仍英文', () => {
  assert.match(SRC, /var EN = MOCK \|\| EXAM_SCREEN \|\| langEn;/, 'EN 判定没把界面语言算进去');
  assert.match(SRC, /var TOOL = function \(zh, en\) \{ return EN \? en : zh; \}/, 'TOOL 仍按旧口径硬编码英文');
  assert.doesNotMatch(SRC, /PRACTICE\) \? en : zh/, '练习页还在无条件输出英文');
  assert.match(SRC, /var T = function \(zh, en\) \{ return EN \? en : zh; \}/, 'title 文案没跟语言统一');
});
