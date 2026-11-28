'use strict';
/* 云端/旧版把练习进度 cursor 写成 1.5 时，旧 readLocation 直接拿 1.5 当数组下标，
   currentQuestion() 得到 undefined，练习页打开就是空白。所有 cursor→URL/显示都必须
   先 Number + floor。 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'drill.js'), 'utf8');

test('练习页游标先取整再夹区间', () => {
  assert.match(SRC, /function cursorIndex\(st\)[\s\S]*?Math\.floor/, '缺少 cursor 取整函数');
  assert.match(SRC, /var saved = stateFor\(sec, false\);\s*\n\s*i = Math\.min\(list\.length - 1, cursorIndex\(saved\)\);/,
    'readLocation 没有走 cursorIndex，1.5 仍会指向空题');
});

test('单元卡片 / 继续练习链接不再直接拼 st.cursor + 1', () => {
  assert.doesNotMatch(SRC, /(?:st|saved)\.cursor\s*\+\s*1/, '仍有裸 cursor 拼接，链接会带出 2.5 题');
});
