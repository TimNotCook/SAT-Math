'use strict';
/* 320 宽下「2 missed」会被 flex 挤成两行（2 / missed），像坏掉了。
   锁定单元头右侧计数：不换行、不参与收缩。 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const css = fs.readFileSync(require('node:path').join(__dirname, '..', 'app.css'), 'utf8');

test('错题页单元头计数不换行', () => {
  const m = css.match(/\.wrong-unit>h2 span\{([^}]*)\}/);
  assert.ok(m, '缺少 .wrong-unit>h2 span 规则');
  assert.match(m[1], /white-space:nowrap/, '计数仍可能被拆成两行');
  assert.match(m[1], /flex:none/, '计数仍会被标题挤压');
});
