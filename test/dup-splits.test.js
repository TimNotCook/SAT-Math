/* 同题干 ≠ 同一道题：这几组在书上是不同位置、不同数据的两道题，
   alias 不许把它们并成一笔（否则错题本会把两题算作一题）。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
function load(file, key) {
  const sandbox = { window: {} };
  new Function('window', fs.readFileSync(path.join(ROOT, file), 'utf8'))(sandbox.window);
  return sandbox.window[key];
}
const ALIAS = load('data/aliases.js', 'TD_ALIAS');
const TXT = load('data/text.js', 'TD_TEXT');
const SPEC = load('data/figures.js', 'TD_FIG_SPECS');

const SPLIT = [
  ['TD-24-06', 'U2-10'],   /* 练习册 P109 #6 vs P110 #7 */
  ['TD-22-02', 'U2-04'],   /* 练习册 P77 #2 vs P76 #1 */
  ['TD-22-03', 'U2-04'],   /* 练习册 P78 #3 vs P76 #1 */
  ['R03-246', 'TD-24-08'], /* 03 册 T21 #6 vs 练习册 P111 #8 */
  ['R03-134', 'TD-25-14'], /* 03 册 p121 #14 vs 练习册 P126 #14 */
  ['TD-12-27', 'SP1-024'], /* 练习册 P26 #27 vs 01 册同题干 */
  ['U1-13', 'U1-12']       /* 练习册 P53 #1 vs 讲义 p31 #2 */
];

test('分家清单：各组内不许互为 alias', () => {
  for (const [a, b] of SPLIT) {
    const root = id => { let t = id, n = 0; while (ALIAS[t] && n++ < 5) t = ALIAS[t]; return t; };
    assert.notStrictEqual(root(a), root(b), `${a} 与 ${b} 被并成一笔`);
  }
});

test('分家清单：数据确实不同（不是格式差异）', () => {
  assert.notStrictEqual(JSON.stringify(SPEC['TD-24-06'].rows), JSON.stringify(SPEC['TD-24-07'].rows), 'P109 #6 与 P110 #7 表格应不同');
  assert.notStrictEqual(JSON.stringify(SPEC['R03-246'].rows), JSON.stringify(SPEC['TD-24-08'].rows), '03 册 T21 #6 与练习册 P111 #8 表格应不同');
  assert.notDeepStrictEqual(TXT['TD-12-27'].choices, TXT['SP1-024'].choices, '两版方程组应不同');
});
