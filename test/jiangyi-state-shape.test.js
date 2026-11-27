/* 讲义独立状态（tdsat_jiangyi_v1）被云端合并/旧版写成字符串、数组时的回归：
   旧代码 `var S = read(KEY) || {...}` 会把字符串当状态，严格模式赋值直接 TypeError；
   answers 是字符串时答一题就崩；成绩仓库不是数组时点交卷 .push 也崩。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
function boot(store) {
  const sandbox = {
    console,
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; },
    },
    setTimeout: () => 1, clearTimeout() {},
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  ['data/jiangyi.js', 'grade-core.js', 'jiangyi-core.js'].forEach(f =>
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox));
  return sandbox;
}
function firstBoardSection(J) {
  const b = J.boards()[0].id, s = J.sectionsOf(b)[0];
  return { b, s, q: J.questionsOf(b, s)[0] };
}

test('讲义状态本身是字符串时不崩页', () => {
  let threw = null;
  try { boot({ tdsat_jiangyi_v1: JSON.stringify('junk') }); } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '讲义状态是字符串时初始化把页面打崩：' + (threw && threw.message));
});

test('讲义 answers 是字符串时仍能答题并落库', () => {
  const store = { tdsat_jiangyi_v1: JSON.stringify({ answers: 'junk', submitted: {}, cursor: 0 }) };
  let threw = null, J = null;
  try {
    J = boot(store).TD_JY;
    const { b, s, q } = firstBoardSection(J);
    assert.doesNotThrow(() => J.answerQ(q, 'A'));
    const saved = JSON.parse(store.tdsat_jiangyi_v1);
    assert.ok(saved.answers && typeof saved.answers === 'object' && !Array.isArray(saved.answers), '答案容器没修成对象');
    assert.equal(saved.answers[q.id].v, 'A');
  } catch (e) { threw = e; }
  assert.strictEqual(threw, null, 'answers 是字符串时答题失败：' + (threw && threw.message));
});

test('讲义成绩仓库不是数组时交卷不崩，记录仍写入数组', () => {
  const store = { tdsat_jiangyi_v1: JSON.stringify({ answers: {}, submitted: {}, cursor: 0 }), tdsat_exam_suite_results_v1: JSON.stringify({ bad: true }) };
  let threw = null, J = null, rec = null;
  try {
    J = boot(store).TD_JY;
    const { b, s } = firstBoardSection(J);
    rec = J.submitSection(b, s);
    const saved = JSON.parse(store.tdsat_exam_suite_results_v1);
    assert.ok(Array.isArray(saved), '成绩仓库没被修成数组');
    assert.ok(saved.some(x => x && x.mode === 'jiangyi'), '讲义交卷记录没落库');
  } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '成绩仓库是对象时交卷失败：' + (threw && threw.message));
});
