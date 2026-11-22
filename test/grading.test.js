'use strict';
/* SAT-Math 判分回归测试（零外部依赖）
 *
 * 边界与参数顺序依据（读源码得出，不是猜）：
 *   app-core.js:211-213  acceptedValues(q).some(a => sameExact(a,x) || sameTol(a,x))
 *     - a = acceptedValues(q) 里的值 = 题库标准答案
 *     - x = parseNum(gridEntry(v)) = 学生填入的答案
 *   => sameTol(a, b) 的第一个参数是【标准答案】，第二个是【学生答案】。
 *   exam-core.js:120-121 的调用顺序与此处完全一致。
 * 所以 1% 容差的基准必须是第一个参数 a。若改成以 b（学生答案）为基准，
 * 「标准答案 100 / 学生 99」会被误判为错、「学生 101.01」会被误判为对。
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'app-core.js'), 'utf8');
const GRADE_SRC = fs.readFileSync(path.join(ROOT, 'grade-core.js'), 'utf8');

/* 判分唯一实现已抽到 grade-core.js（window.TDGrade）；本测试直接加载它，
   测到的就是线上真实的源码实现。app-core/exam-core 仅委托，不再各持拷贝。 */
function loadGradingHelpers() {
  const context = { Math, String, Number, Array, RegExp, isFinite, Object, window: {} };
  vm.createContext(context);
  vm.runInContext(GRADE_SRC, context, { filename: 'grade-core.js' });
  const G = context.window.TDGrade;
  assert.ok(G && G.isCorrect, 'grade-core.js 未能暴露 window.TDGrade');
  return G;
}
const G = loadGradingHelpers();

/* 完整加载 app-core.js 的冒烟沙箱：验证修复后的判分函数在真实装配路径里可用。 */
function loadFullApp() {
  const sandbox = {
    window: {
      TD_BANK: { questions: [], units: [] },
      addEventListener() {}
    },
    location: { search: '' },
    localStorage: {
      _v: {},
      getItem(k) { return Object.prototype.hasOwnProperty.call(this._v, k) ? this._v[k] : null; },
      setItem(k, v) { this._v[k] = String(v); }
    },
    URLSearchParams,
    URL,
    console
  };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  /* app-core.js 的判分块已委托到 window.TDGrade：先装载 grade-core.js 再跑全量装配。 */
  vm.runInContext(GRADE_SRC, sandbox, { filename: 'grade-core.js' });
  vm.runInContext(SRC, sandbox, { filename: 'app-core.js' });
  return sandbox.window.TD_APP;
}

/* ---------------- gridEntry ---------------- */
describe('gridEntry：答题卡 5/6 字符格规则', () => {
  const cases = [
    ['普通整数', '3500', '3500'],
    ['负分数', '-14/15', '-14/15'],
    ['小数', '12.5', '12.5'],
    ['空串拒绝', '', null],
    ['逗号拒绝', '3,500', null],
    ['美元符号拒绝', '$5', null],
    ['字母拒绝', '12a', null],
    ['5 位超限（6 位数字）', '123456', null],
    ['含负号 6 位超限（-123456）', '-123456', null],
    ['null 输入', null, null],
    ['首尾空白被裁剪', '  3500  ', '3500']
  ];
  for (const [label, input, expected] of cases) {
    test(label, () => assert.equal(G.gridEntry(input), expected));
  }
});

/* ---------------- parseNum ---------------- */
describe('parseNum：字符串 → 数值', () => {
  const cases = [
    ['整数 3500', '3500', 3500],
    ['负真分数 -14/15', '-14/15', -14 / 15],
    ['正分数 1/2', '1/2', 0.5],
    ['小数 .5', '.5', 0.5],
    ['Unicode 负号 −3', '−3', -3],
    ['En dash 负号 –3', '–3', -3],
    ['首尾空白', '  42  ', 42],
    ['空串 → null', '', null],
    ['非法文本 → null', 'abc', null],
    ['分母为 0 → null', '1/0', null],
    ['null 输入 → null', null, null]
  ];
  for (const [label, input, expected] of cases) {
    test(label, () => assert.equal(G.parseNum(input), expected));
  }
});

/* ---------------- acceptedValues ---------------- */
describe('acceptedValues：标准答案多解解析', () => {
  test('value 与 answer 的分隔多解全部纳入', () => {
    assert.deepEqual(Array.from(G.acceptedValues({ value: '0.5', answer: '1/2, .5 or 3/6' })), [0.5]);
  });
  test('无效答案被过滤，不留 null', () => {
    assert.deepEqual(Array.from(G.acceptedValues({ value: '', answer: 'abc; 1/0' })), []);
  });
});

/* ---------------- sameExact ---------------- */
describe('sameExact：精确比较的 1e-9 相对边界', () => {
  test('完全相同 → true', () => assert.equal(G.sameExact(1, 1), true));
  test('差值 5e-10（<= 1e-9）→ true', () => assert.equal(G.sameExact(1, 1 + 5e-10), true));
  test('差值 2e-9（> 1e-9）→ false', () => assert.equal(G.sameExact(1, 1 + 2e-9), false));
  test('大数 1000：容差按 1e-9*1000 放大，5e-7 → true', () =>
    assert.equal(G.sameExact(1000, 1000 + 5e-7), true));
  test('大数 1000：2e-6 超容差 → false', () =>
    assert.equal(G.sameExact(1000, 1000 + 2e-6), false));
  test('任一为空 → false', () => {
    assert.equal(G.sameExact(null, 1), false);
    assert.equal(G.sameExact(1, null), false);
  });
});

/* ---------------- sameTol（本次修复重点）----------------
   统一调用约定：sameTol(标准答案, 学生答案)。 */
const TOL_CASES = [
  ['标准为 0 / 学生答 0 → 正确', 0, 0, true],
  ['标准为 0 / 学生答 0.0001 → 错误（1% of 0 = 0，仅留极小绝对容差）', 0, 0.0001, false],
  ['标准为 0 / 学生答 -0.0001 → 错误', 0, -0.0001, false],
  ['标准为 0 / 学生答 1e-10 → 正确（绝对容差地板）', 0, 1e-10, true],
  ['标准为 100 / 学生答 101（+1%）→ 正确', 100, 101, true],
  ['标准为 100 / 学生答 101.01（+1.01%）→ 错误', 100, 101.01, false],
  ['标准为 100 / 学生答 99（-1%）→ 正确（学生答案做基准必挂，杀手用例）', 100, 99, true],
  ['标准为 100 / 学生答 98.99（-1.01%）→ 错误', 100, 98.99, false],
  ['标准为 0.5 / 学生答 0.505（+1%，浮点毛刺）→ 正确', 0.5, 0.505, true],
  ['标准为 0.5 / 学生答 0.506（>1%）→ 错误', 0.5, 0.506, false],
  ['标准为 200 / 学生答 198（-1%，学生接近 0 的塌缩陷阱变体）→ 正确', 200, 198, true],
  ['负标准 -100 / 学生 -101 → 正确', -100, -101, true],
  ['标准为 null → false', null, 5, false],
  ['学生答案为 null → false', 5, null, false],
  ['标准为 0 / 学生答案为 null → false（空值不得当成 0 放行）', 0, null, false],
  ['标准为 null / 学生答案为 0 → false（空值不得当成 0 放行）', null, 0, false]
];

describe('sameTol：SAT 1% 判分容差（以标准答案为基准）', () => {
  for (const [label, key, entry, expected] of TOL_CASES) {
    test(label, () => assert.equal(G.sameTol(key, entry), expected));
  }
});

/* 变异定向加固：证明上面的断言真能在缺陷注入后变红，而不是空断言。 */
describe('变异加固：用例集必须杀死四类畏惧缺陷', () => {
  const mutants = {
    '① 容差基准错用学生答案 b': (a, b) =>
      a != null && b != null && (Math.abs(a - b) <= 1e-9 || Math.abs(a - b) <= Math.abs(b) * 0.01),
    '② 去掉浮点 epsilon，边界 0.5→0.505 误判': (a, b) =>
      a != null && b != null && Math.abs(a - b) <= Math.abs(a) * 0.01,
    '③ 零容忍写成绝对 1% 带状（标准为 0 也放行 0.0001）': (a, b) =>
      a != null && b != null && Math.abs(a - b) <= Math.max(Math.abs(a) * 0.01, 0.01),
    '④ 空值被当成 0 放行': (a, b) =>
      Math.abs((a == null ? 0 : a) - (b == null ? 0 : b)) <= Math.abs(a == null ? 0 : a) * 0.01 + 1e-9
  };
  for (const [name, mutant] of Object.entries(mutants)) {
    test(name, () => {
      const killed = TOL_CASES.filter(([, key, entry, expected]) => mutant(key, entry) !== expected);
      assert.ok(killed.length > 0, `变异体「${name}」未被任何用例杀死——断言无区分力`);
    });
  }
});

/* ---------------- isCorrect：端到端判分路径 ---------------- */
describe('isCorrect：从原始输入到判分结论', () => {
  const key100 = { type: 'grid', value: '100', answer: '' };
  test('标准 100 / 答 101 → 对', () => assert.equal(G.isCorrect(key100, '101'), true));
  test('标准 100 / 答 101.01 → 错', () => assert.equal(G.isCorrect(key100, '101.01'), false));
  test('标准 100 / 答 99 → 对', () => assert.equal(G.isCorrect(key100, '99'), true));

  const key0 = { type: 'grid', value: '0', answer: '' };
  test('标准 0 / 答 0 → 对', () => assert.equal(G.isCorrect(key0, '0'), true));
  test('标准 0 / 答 0.0001 → 错', () => assert.equal(G.isCorrect(key0, '0.0001'), false));

  const keyHalf = { type: 'grid', value: '1/2', answer: '' };
  test('标准 1/2 / 答 0.505 → 对（浮点边界回归）', () =>
    assert.equal(G.isCorrect(keyHalf, '0.505'), true));
  test('标准 1/2 / 答 0.506 → 错', () => assert.equal(G.isCorrect(keyHalf, '0.506'), false));

  const keyFrac = { type: 'grid', value: '-14/15', answer: '' };
  test('学生答分数形式 -14/15 → 对', () => assert.equal(G.isCorrect(keyFrac, '-14/15'), true));

  const mcq = { type: 'mcq', answer: 'B' };
  test('MCQ 大小写不敏感 → 对', () => assert.equal(G.isCorrect(mcq, ' b '), true));
  test('MCQ 选错 → 错', () => assert.equal(G.isCorrect(mcq, 'C'), false));
  test('非法答题卡输入 → 错', () => assert.equal(G.isCorrect(key100, '3,500'), false));
  test('空答案 → 错', () => assert.equal(G.isCorrect(key100, '   '), false));
});

/* ---------------- 完整装配冒烟 ---------------- */
describe('app-core.js 完整装配冒烟（vm 假 DOM 沙箱）', () => {
  const APP = loadFullApp();
  test('window.TD_APP 正常导出且 isCorrect 可用', () => {
    assert.equal(typeof APP.isCorrect, 'function');
    assert.equal(APP.isCorrect({ type: 'grid', value: '100', answer: '' }, '99'), true);
  });
  test('装配路径下零标准答案判分正确', () => {
    assert.equal(APP.isCorrect({ type: 'grid', value: '0', answer: '' }, '0'), true);
    assert.equal(APP.isCorrect({ type: 'grid', value: '0', answer: '' }, '0.0001'), false);
  });
});
