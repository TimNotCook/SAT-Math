/* 2026-11-27 踩过：TD-43-06（"Rectangle ABCD is similar to rectangle EFGH"，练习册 P217 #6）
   挂着一张和 #5 完全相同的圆柱图（md5 一致的 rawSvg 副本），原书 #6 根本没有配图。
   这类「图上画的是曲面体、题干却在讲矩形/三角形」的错配，靠肉眼看 243 条 spec 很难兜住，
   用椭圆元素做结构性守卫：spec 里出现 <ellipse>，题干必须真的在讲曲面体。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
function load() {
  const vault = {};
  const ls = (f) => new Function('window', fs.readFileSync(path.join(ROOT, f), 'utf8'))(vault);
  ls('data/questions.js');
  ls('data/text.js');
  ls('data/figures.js');
  return vault;
}

test('画了椭圆的图，题干必须提曲面体', () => {
  const w = load();
  const F = w.TD_FIG_SPECS || {};
  const T = w.TD_TEXT || {};
  const bank = (w.TD_BANK && w.TD_BANK.questions) || [];
  const curved = /cylind|sphere|capsul|hemisph|globe|ball|pipe|tank|drum|can\b|container|circular/i;
  const bad = [];
  for (const q of bank) {
    const spec = F[q.id];
    if (!spec || !spec.svg || !/<ellipse/.test(spec.svg)) continue;
    const stem = String((T[q.id] || {}).stem || q.stem || '');
    if (!curved.test(stem)) bad.push(q.id + ' ' + (q.source || '') + ' → ' + stem.slice(0, 60));
  }
  assert.deepStrictEqual(bad, [], '这些题画了椭圆但题干没有曲面体：' + bad.join(' / '));
});

test('TD-43-06 不再挂 #5 的圆柱图，TD-43-05 保留', () => {
  const w = load();
  const F = w.TD_FIG_SPECS || {};
  assert.ok(!F['TD-43-06'], '#6 原书无配图，不应有 spec');
  assert.ok(F['TD-43-05'] && F['TD-43-05'].svg.includes('<ellipse'), '#5 的圆柱图必须保留');
  const a = F['TD-43-05'].svg;
  assert.ok(!Object.keys(F).some((id) => id !== 'TD-43-05' && F[id].svg === a && id.startsWith('TD-43-')),
    'TD-43 段不允许再出现与 #5 逐字节相同的副本');
});
