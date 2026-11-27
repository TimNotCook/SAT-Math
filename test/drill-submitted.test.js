'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '..', 'drill.js'), 'utf8');

test('练习页：submitted 是字符串 "false" 时不能直接跳成绩页', () => {
  assert.match(src, /function isTrueFlag/, '缺 submitted 真值归一');
  assert.match(src, /var done = isTrueFlag\(saved\.submitted\)/, '小节磁贴仍用 truthy 判已交卷');
  assert.ok(!/var done = !!saved\.submitted/.test(src), '!! 会把字符串 false 当已交卷');
});
