'use strict';
/* 抽查起始页「涵盖考点」会把 topic 里的「（填空）」剥掉再显示；剥掉后的名字
   若没有英文词条，英文界面就会漏出中文（线上 320 实测到「表格求百分比」）。 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const i18n = fs.readFileSync(path.join(__dirname, '..', 'i18n.js'), 'utf8');

const pairs = [
  ['三角形内角与图形求角', 'Triangle angles'],
  ['平行线被截线所截求角', 'Angles from parallel lines'],
  ['直线方程与夹角参数', 'Line equation and angle parameters'],
  ['表格求百分比', 'Percent from a table'],
  ['频数表求中位数', 'Median from a frequency table'],
];
for (const [zh, en] of pairs) {
  test(`剥掉（填空）后仍有英文：${zh}`, () => {
    const re = new RegExp("'" + zh + "': '([^']*)'");
    const m = i18n.match(re);
    assert.ok(m, `缺少「${zh}」词条`);
    assert.match(m[1], new RegExp(en), '英文词条内容不对');
  });
}
