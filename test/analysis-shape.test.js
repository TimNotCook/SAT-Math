'use strict';
/* analysis 的作答归一化：成绩记录里的 given 可能是对象/数组（云端合并/旧版本）。
   这类值必须按「未作答」处理，不能 String 成 [object Object] 后被判成概念错。 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
global.window = { TD_TEXT: {} };
window.window = window;
require('../analysis.js');
const AN = window.TD_ANALYSIS;

test('对象/数组作答 → 未作答，不误判为知识点概念错', () => {
  assert.equal(AN.analyze({ type: 'grid' }, { x: 1 }).type, 'blank');
  assert.equal(AN.analyze({ type: 'grid' }, ['A']).type, 'blank');
});

test('真正的字符串答案仍走正常分析', () => {
  assert.notEqual(AN.analyze({ type: 'grid', value: 5 }, '6').type, 'blank');
});

test('aggregate 不把 correct:"false" 的题目当成已答对而跳过', () => {
  const groups = AN.aggregate([{ id: 'q-a', correct: 'false', given: 'B' }], [{ id: 'q-a', type: 'mcq', answer: 'A' }], {});
  assert.ok(groups.length >= 1, '字符串 false 的错题被漏掉');
});

test('aggregate 把 correct:"True" 当已答对跳过，不误算成错题', () => {
  const groups = AN.aggregate(
    [{ id: 'q-b', correct: 'True', given: 'A' }],
    [{ id: 'q-b', type: 'mcq', answer: 'A' }], {}
  );
  assert.equal(groups.length, 0, '大写 True 的答对题被算成错题');
});
