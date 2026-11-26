/* 答案对表订正的守门测试（2026-11-26 全量核答案页时发现并订正）。

   背景：题库里的答案字段大量是从答案页抄的，但抄错成「邻题答案」的情况存在
   （1.1 #16 抄成 1.1 #6 的 -5/9、2.1 #26 抄成 1.1 #16 的 0.74 等）。
   本测试把已核实的订正钉死：答案页（练习册 P240–P247）上的键 + 题面可解出的值。

   数据源：data/questions.js（唯一答案库）。
*/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function loadBank() {
  const sandbox = { window: {} };
  new Function('window', fs.readFileSync(path.join(ROOT, 'data/questions.js'), 'utf8'))(sandbox.window);
  return sandbox.window.TD_BANK;
}
const BANK = loadBank();
const byId = id => BANK.questions.find(q => q.id === id);

/* 已核实订正：id -> [答案, 数值, 依据] */
const FIXED = {
  /* 练习册 P11 1.1 #16：过 (1,7)、(6,0) → b = 42/5 = 8.4（原为 7） */
  'TD-11-16': ['42/5', 8.4],
  /* 练习册 P12 1.1 #18：垂直线的 y 截距，答案页 44/3（原为 -5/9，与 #6 撞值） */
  'TD-11-18': ['44/3', 44 / 3],
  /* 练习册 P35 1.3 #17：29.75 - 25.5 = 4.25 = 17/4（原为 4） */
  'TD-13-17': ['17/4', 4.25],
  /* 练习册 P69 2.1 #26：35 m = 3500 cm（原为 0.74） */
  'TD-21-26': ['3500', 3500],
  /* 练习册 P72 2.1 #33：19008 yd/h ÷ 1760 = 10.8 = 108/10（原为 108） */
  'TD-21-33': ['108/10', 10.8],
  /* 练习册 P169 3.3 #8：f(x)=3(x-2)(x-6)(x-9)，x 截距 2 / 6 / 9 都算对（原只收 2） */
  'TD-33-08': ['2 or 6 or 9', 2],
  /* 练习册 2.1 #15：240 g × 0.001% = 0.0024 g（答案页写 «0.002 or .0024»，
     0.002 是笔误；原库取 0.002，会把答对的 0.0024 判错） */
  'TD-21-15': ['0.0024', 0.0024],
};

test('已订正的答案与答案页 / 题面一致', () => {
  Object.keys(FIXED).forEach(id => {
    const q = byId(id);
    assert.ok(q, id + ' 不存在');
    const [ans, val] = FIXED[id];
    assert.strictEqual(q.answer, ans, id + ' 的 answer 又变回旧值了');
    assert.strictEqual(q.type, 'grid', id + ' 应为填空题');
    assert.ok(Math.abs(q.value - val) < 1e-9, id + ' 的 value 不对：' + q.value);
  });
});

/* 部分专项题（SP*）答案存在 value 字段且是字符串（"16/17"、"0.0024"），
   只要能被解析成有限数就算合格；真正的空缺（null / 空串 / 解析不了）才算坏。 */
function num(v) {
  if (typeof v === 'number') return v;
  if (v == null) return NaN;
  /* value 里可能并列多个等价写法：「59/9 | 6.555 | 6.556」 */
  for (const t of String(v).split(/[|,;]|\bor\b/i).map(x => x.trim())) {
    const f = /^(-?\d+)\/(\d+)$/.exec(t);
    if (f && +f[2] !== 0) return +f[1] / +f[2];
    if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(t)) return +t;
  }
  return NaN;
}

test('全库填空题：value 可解析成有限数，选择题答案落在 A–D', () => {
  BANK.questions.forEach(q => {
    if (q.type === 'grid') assert.ok(Number.isFinite(num(q.value)), q.id + ' 填空 value 解析不出数值：' + q.value);
    if (q.type === 'mcq') assert.ok('ABCD'.includes(String(q.answer)), q.id + ' 选择题答案不是 A–D');
  });
});
