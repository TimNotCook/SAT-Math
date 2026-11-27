'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '..', 'cloud-account.js'), 'utf8');

test('外观偏好 compact/calcUnit 是字符串 "false" 时不能当开启', () => {
  assert.match(src, /function isTrueFlag/, '缺偏好布尔归一');
  assert.match(src, /prefs\.compact = isTrueFlag\(p\.compact\)/);
  assert.match(src, /prefs\.calcUnit = isTrueFlag\(p\.calcUnit\)/);
  assert.ok(!/prefs\.(compact|calcUnit) = !!p\./.test(src), '!! 会把字符串 false 当开启');
});
