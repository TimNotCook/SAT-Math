/* 讲义独立状态（tdsat_jiangyi_v1）被云端合并/旧版写成字符串、数组时的回归：
   旧代码 `var S = read(KEY) || {...}` 会把字符串当状态，严格模式赋值直接 TypeError；
   answers 是字符串时答一题就崩；成绩仓库不是数组时点交卷 .push 也崩。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
function boot(store, opts) {
  const sandbox = {
    console,
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { if (opts && opts.throwWriteKey === k) throw new Error('storage denied'); store[k] = String(v); },
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

test('讲义交卷 detail 带正确答案，记录页不再显示「正确 —」', () => {
  const store = { tdsat_jiangyi_v1: JSON.stringify({ answers: {}, submitted: {}, cursor: 0 }), tdsat_exam_suite_results_v1: JSON.stringify([]) };
  const J = boot(store).TD_JY;
  const { b, s } = firstBoardSection(J);
  const q = J.questionsOf(b, s).find(x => stripText(x.answer));
  function stripText(v) { return String(v == null ? '' : v).trim(); }
  assert.ok(q, '该小节没有带答案的题');
  const rec = J.submitSection(b, s);
  const d = rec.detail.find(x => x.id === q.id);
  assert.ok(d, '交卷记录缺少题目');
  assert.ok(stripText(d.answer), 'detail.answer 为空，记录页会显示「正确 —」');
});

test('讲义交卷成绩仓库写失败时不标完成、不假装交卷成功', () => {
  const store = { tdsat_jiangyi_v1: JSON.stringify({ answers: {}, submitted: {}, cursor: 0 }) };
  const J = boot(store, { throwWriteKey: 'tdsat_exam_suite_results_v1' }).TD_JY;
  const { b, s } = firstBoardSection(J);
  let threw = null, rec = 'sentinel';
  try { rec = J.submitSection(b, s); } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '成绩写失败时交卷抛异常：' + (threw && threw.message));
  assert.strictEqual(rec, null, '成绩仓库没写成却返回了交卷记录');
  const state = JSON.parse(store.tdsat_jiangyi_v1);
  assert.deepStrictEqual(state.submitted, {}, '成绩没写成却把本节标成已完成');
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


test('讲义 submitted 是字符串 "false" 时不当作已交卷', () => {
  const store = { tdsat_jiangyi_v1: JSON.stringify({ answers: {}, submitted: { '1.1': 'false' }, cursor: 0 }) };
  const J = boot(store).TD_JY;
  assert.equal(J.submittedOf('1.1'), null);
});

test('讲义答题写盘失败时向外报失败，页面不假装已保存', () => {
  const store = { tdsat_jiangyi_v1: JSON.stringify({ answers: {}, submitted: {}, cursor: 0 }) };
  const J = boot(store, { throwWriteKey: 'tdsat_jiangyi_v1' }).TD_JY;
  const { q } = firstBoardSection(J);
  let threw = null;
  try { J.answerQ(q, 'A'); } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '写盘失败时答题直接抛异常：' + (threw && threw.message));
  assert.equal(J.saveFailed(), true, '写盘失败后核心状态仍报成功');
  const page = fs.readFileSync(path.join(ROOT, 'jiangyi-page.js'), 'utf8');
  assert.match(page, /J\.saveFailed\(\)/, '页面从未检查 saveFailed，用户会以为答案已保存');
  assert.match(page, /答案保存失败[^']*刷新后本题会丢失/, '页面没有写盘失败的用户提示');
});

test('讲义成绩写成功但完成标记写失败，刷新后仍从成绩记录认出已交', () => {
  const store = { tdsat_jiangyi_v1: JSON.stringify({ answers: {}, submitted: {}, cursor: 0 }), tdsat_exam_suite_results_v1: JSON.stringify([]) };
  const J = boot(store, { throwWriteKey: 'tdsat_jiangyi_v1' }).TD_JY;
  const { b, s } = firstBoardSection(J);
  const rec = J.submitSection(b, s);
  assert.ok(rec, '成绩已写成功却没返回交卷记录');
  assert.equal(rec.submittedWriteFailed, true, '完成标记写失败没有报到记录里');
  const J2 = boot(store).TD_JY;
  const sub = J2.submittedOf(s);
  assert.ok(sub && sub.total != null, '刷新后没从成绩记录认出本节已交');
});
