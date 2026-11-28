/* 记录页的用时格式：不足一分钟必须按秒显示。
   2026-11-28 真机发现：17 秒的单元抽查在记录页写成「用时 0 min」，
   看起来像没有计时。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'history-page.js'), 'utf8');

const body = src.match(/function fmtDur\(sec\) \{[\s\S]*?\n  \}/);
assert.ok(body, 'history-page.js 里找不到 fmtDur');

const mk = isEn => new Function('num', 'isEn', body[0] + '\nreturn fmtDur;')(v => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
}, isEn);
const fmtDur = mk(() => false), fmtDurEn = mk(() => true);

test('不到一分钟按秒显示，不再写成 0 min', () => {
  assert.equal(fmtDur(17), '17 秒');
  assert.equal(fmtDur(59), '59 秒');
  assert.equal(fmtDur(0), '0 秒');
});

test('英文界面不足一分钟不夹中文「秒」', () => {
  assert.equal(fmtDurEn(17), '17 sec');
  assert.equal(fmtDurEn(59), '59 sec');
  assert.equal(fmtDurEn(0), '0 sec');
});

test('整分钟及以上仍按分钟/小时', () => {
  assert.equal(fmtDur(60), '1 min');
  assert.equal(fmtDur(125), '2 min');
  assert.equal(fmtDur(7200), '2 h 0 min');
});

test('缺失或不合法的时间仍是破折号', () => {
  assert.equal(fmtDur(null), '—');
  assert.equal(fmtDur(-3), '—');
  assert.equal(fmtDur('abc'), '—');
});

test('讲义复习记录不印「用时 0 秒」——它本来就没有计时', () => {
  assert.ok(/modeOf\(rec\) === 'jiangyi' \? '' : '<span>用时/.test(src), '讲义记录仍会印用时');
});
