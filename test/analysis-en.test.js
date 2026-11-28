'use strict';
/* 英文模式下错因说明（cause / fix 两段正文）必须是英文。
   错题回顾页是冻结区，中文路径一个字都不能动，所以这里两条都要断言。 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

const store = { lang: 'zh' };
global.window = {
  TD_TEXT: {},
  localStorage: { getItem: (k) => (k === 'tdsat_lang' ? store.lang : null) }
};
window.window = window;
require('../analysis.js');
const AN = window.TD_ANALYSIS;

const CJK = /[\u4e00-\u9fa5]/;

test('英文模式：各类错因的 cause/fix 都是英文', () => {
  store.lang = 'en';
  const cases = [
    ['未作答', AN.analyze({ type: 'grid' }, '')],
    ['格式', AN.analyze({ type: 'grid' }, 'abc')],
    ['符号', AN.analyze({ type: 'grid', value: 5 }, '-5')],
    ['倍数', AN.analyze({ type: 'grid', value: 5 }, '10')],
    ['精度', AN.analyze({ type: 'grid', value: 5 }, '5.2')],
    ['数值概念', AN.analyze({ type: 'grid', value: 5 }, '7')],
    ['选择题概念', AN.analyze({ type: 'mcq', answer: 'C', choices: { A: '-7', C: '2/7' } }, 'A')]
  ];
  cases.forEach(([name, r]) => {
    assert.ok(!CJK.test(r.cause), name + ' 的 cause 还留中文：' + r.cause);
    assert.ok(!CJK.test(r.fix), name + ' 的 fix 还留中文：' + r.fix);
  });
});

test('中文模式：说明保持原文，冻结区不动', () => {
  store.lang = 'zh';
  const blank = AN.analyze({ type: 'grid' }, '');
  assert.equal(blank.cause, '本次没有留下答案。可能是耗时过长被跳过，或前面题占用了时间。');
  const fmt = AN.analyze({ type: 'grid' }, 'abc');
  assert.ok(fmt.cause.indexOf('填空题只接受数值或分数') >= 0, '中文格式提示被改掉了：' + fmt.cause);
});
