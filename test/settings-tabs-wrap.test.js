'use strict';
/* 320 宽设置弹层五个 tab 等分 234px（每个约 47px），「Appearance」「Language」
   会互相压字。窄屏必须允许换行、按内容取宽。 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '..', 'cloud-account.js'), 'utf8');

test('设置弹层窄屏 tab 允许换行且不强行等分', () => {
  const m = src.match(/@media\(max-width:400px\)\{\.td-set-tabs\{([^}]*)\}/);
  assert.ok(m, '缺少 ≤400px 的 tab 规则');
  assert.match(m[1], /flex-wrap:wrap/, 'tab 仍会挤在一行互相压字');
  const t = src.match(/@media\(max-width:400px\)\{[^\n]*\.td-set-tab\{([^}]*)\}/);
  assert.ok(t && /flex:0 1 auto/.test(t[1]), 'tab 仍被 flex:1 等分到装不下文字');
});
