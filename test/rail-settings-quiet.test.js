'use strict';
/* 侧栏「设置」在已登录状态下不能变成实心蓝块。
 * glass.css / bluebook.css 对 .td-acct-btn[data-on="1"] 写了蓝底 + !important，
 * 其中 .drill-page / .exam-page 前缀那条是 (0,3,0)，普通覆盖压不住。
 * 这条用例盯住：cloud-account.js 里必须存在 (0,4,0) 级别的安静样式。
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'cloud-account.js'), 'utf8');

test('已登录侧栏「设置」保留安静样式（四段选择器）', () => {
  assert.match(SRC, /html:not\(\[data-theme="dark"\]\)\s+\.site-rail\s+\.td-acct-btn\.rail-settings\[data-on="1"\]/,
    '缺了这条，登录后侧栏会被刷成实心蓝');
  assert.match(SRC, /\.rail-settings\[data-on="1"\][\s\S]{0,160}?background:rgba\(255,255,255,\.5\)!important/,
    '背景要回到未登录时的半透明白');
});
