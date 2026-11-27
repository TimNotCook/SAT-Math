// 重复题（同一册原页的两份副本）必须画成同一张图。
// 之前 U2-04 与 TD-22-01 是练习册 P76 #1 的同一题，却一个末点 (3,7)、一个 (3,7.5)；
// U2-05 与 TD-22-07 是 P82 #7 的同一题，拟合线一条 (0,6)-(10,14)、一条
// (-1,4.65)-(11,14.85)，纵轴刻度 2 与 4 也对不上。这里钉死成对一致，
// 再改其中一份就会直接失败。
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const W = {};
global.window = W;
require(path.join(__dirname, '..', 'figures.js'));
require(path.join(__dirname, '..', 'data', 'figures.js'));

const SPECS = W.TD_FIG_SPECS;

function norm(spec) {
  if (!spec) return null;
  const copy = Object.assign({}, spec);
  delete copy.pageRegion; // 裁剪框只跟扫描页有关，不影响画出来的图
  return JSON.stringify(copy);
}

const PAIRS = [
  ['U2-04', 'TD-22-01'], // 练习册 P76 #1
  ['U2-05', 'TD-22-07'], // 练习册 P82 #7
];

for (const [a, b] of PAIRS) {
  test(`${a} 与 ${b} 的图形 spec 必须一致`, () => {
    assert.ok(SPECS[a], `${a} 缺 spec`);
    assert.ok(SPECS[b], `${b} 缺 spec`);
    assert.strictEqual(norm(SPECS[a]), norm(SPECS[b]));
  });
}

test('P76 #1 散点末点落在 (3,7)、P82 #7 拟合线穿过 (0,6)-(10,14)', () => {
  const pts = SPECS['TD-22-01'].series[0].points;
  assert.strictEqual(pts[pts.length - 2].join(','), '3,7');
  const line = SPECS['TD-22-07'].series[1].points;
  assert.strictEqual(line[0].join(','), '0,6');
  assert.strictEqual(line[1].join(','), '10,14');
});
