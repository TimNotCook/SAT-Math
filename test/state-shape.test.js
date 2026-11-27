'use strict';
/* 板块状态形状回归：云端合并/旧版本把 answers / marks / wrongLog 写成字符串或数组时，
   练习页写答案不能 TypeError。这里跑真实 app-core 的磁盘读写路径。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

function boot(seed) {
  const store = { tdsat_app_v1: JSON.stringify(seed) };
  const sandbox = {
    console,
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; },
    },
    location: { search: '', hash: '', pathname: '/drill.html' },
    document: {
      getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
      addEventListener() {}, createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {}, setAttribute() {} }),
    },
    window: {}, URLSearchParams, navigator: { language: 'zh' }, setTimeout, addEventListener() {},
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of ['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox);
  }
  return { A: sandbox.window.TD_APP, store };
}

test('answers.correct 是字符串 false 时统计不误算答对', () => {
  const { A } = boot({ sections: { '1.1': { answers: { 'TD-11-01': { v: 'B', correct: 'false' } }, cursor: 0, marks: {}, completed: false } } });
  const st = A.stats('1.1');
  assert.equal(st.answered, 1);
  assert.equal(st.correct, 0);
});

test('cursor 是字符串时归一成数字，练习页续做链接不再拼错题号', () => {
  const { A } = boot({ sections: { '1.1': { answers: {}, cursor: '3', marks: {}, completed: false } } });
  const st = A.secState('1.1', true);
  assert.equal(st.cursor, 3);
});

test('marks 值是字符串 false 时归一成布尔 false，不显示成已标记', () => {
  const { A } = boot({ sections: { '1.1': { answers: {}, cursor: 0, marks: { 'TD-11-01': 'false', 'TD-11-02': 'true' }, completed: false } } });
  const st = A.secState('1.1', false);
  assert.strictEqual(st.marks['TD-11-01'], false, '字符串 false 被当成了已标记');
  assert.strictEqual(st.marks['TD-11-02'], true, '字符串 true 没被归一成 true');
  assert.strictEqual(A.toggleMark('1.1', 'TD-11-01'), true, 'false 标记再点一次应该变成已标记');
});

test('cursor 是对象/NaN/负数时归一成 0，不把练习页带进空题', () => {
  for (const cursor of [{ x: 1 }, NaN, -5, 'junk', null]) {
    const { A } = boot({ sections: { '1.1': { answers: {}, cursor, marks: {}, completed: false } } });
    const st = A.secState('1.1', true);
    assert.equal(st.cursor, 0, `cursor=${String(cursor)}`);
  }
});

test('sections 本身是数组时归一成对象，作答能真正落库', () => {
  const { A, store } = boot({ sections: [] });
  const st = A.secState('1.1', true);
  assert.equal(typeof st, 'object');
  assert.doesNotThrow(() => A.setAnswer('1.1', 'TD-11-01', 'A'));
  const disk = JSON.parse(store.tdsat_app_v1);
  assert.equal(Array.isArray(disk.sections), false);
  assert.equal(disk.sections['1.1'].answers['TD-11-01'].v, 'A');
});

test('板块记录本身是字符串时，secState 不崩并换成空对象', () => {
  const { A, store } = boot({ sections: { '1.1': 'junk' } });
  const st = A.secState('1.1', true);
  assert.equal(typeof st, 'object');
  assert.equal(st.answers && typeof st.answers, 'object');
  assert.doesNotThrow(() => A.setAnswer('1.1', 'TD-11-01', 'A'));
  assert.equal(JSON.parse(store.tdsat_app_v1).sections['1.1'].answers['TD-11-01'].v, 'A');
});

test('作答记录的值是对象/数组时归一成空串，练习页不再显示 [object Object]', () => {
  const { A } = boot({ sections: { '1.1': { answers: { 'TD-11-01': { v: { x: 1 } }, 'TD-11-02': ['A'], 'TD-11-03': 3 }, marks: {}, wrongLog: {} } } });
  const st = A.secState('1.1', true);
  assert.equal(st.answers['TD-11-01'].v, '');
  assert.equal(st.answers['TD-11-02'].v, '');
  assert.equal(st.answers['TD-11-03'].v, '3');
});

test('迁移旧板块时目标 wrongLog 是字符串/数组，历史错题也不丢', () => {
  const probe = boot({ sections: {} });
  const old = '2.6', to = probe.A.sectionAliases[old];
  assert.ok(to && probe.A.CATALOG[to], '2.6 的别名目标必须存在');
  const qid = probe.A.CATALOG[to][0].id;
  let threw = null;
  try {
    const seedy = { sections: {
      [to]: { answers: {}, marks: {}, wrongLog: 'junk' },
      [old]: { answers: {}, marks: {}, wrongLog: { [qid]: { v: 'A', ts: 1 } } },
    } };
    const { A, store } = boot(seedy);
    assert.doesNotThrow(() => A.setAnswer(to, qid, 'A'));
    const disk = JSON.parse(store.tdsat_app_v1);
    assert.ok(disk.sections[to].wrongLog[qid], '迁移后的 wrongLog 没落库');
    assert.equal(A.secState(to, false).wrongLog[qid].v, 'A');
  } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '目标 wrongLog 是字符串时迁移把页面打崩：' + (threw && threw.message));
});

test('answers 是字符串时仍能写入作答，并修复成对象', () => {
  const { A, store } = boot({ sections: { '1.1': { answers: 'junk', marks: [], wrongLog: 'x' } } });
  const st = A.secState('1.1', true);
  assert.equal(typeof st.answers, 'object');
  assert.equal(Array.isArray(st.answers), false);
  assert.equal(Array.isArray(st.marks), false);
  assert.equal(typeof st.wrongLog, 'object');
  assert.doesNotThrow(() => A.setAnswer('1.1', 'TD-11-01', 'A'));
  const disk = JSON.parse(store.tdsat_app_v1);
  assert.equal(disk.sections['1.1'].answers['TD-11-01'].v, 'A');
});


test('板块 submitted 是字符串 "false" 时归一成布尔 false', () => {
  const { A } = boot({ sections: { '1.1': { answers: {}, cursor: 0, marks: {}, submitted: 'false' } } });
  const st = A.secState('1.1', true);
  assert.equal(st.submitted, false);
});


test('板块 marks 的值是字符串 "false" 时归一成布尔 false', () => {
  const { A } = boot({ sections: { '1.1': { answers: {}, cursor: 0, marks: { 'TD-11-01': 'false' } } } });
  const st = A.secState('1.1', true);
  assert.equal(st.marks['TD-11-01'], false);
});


test('wrongLog 裸字符串保留，对象 v/空值是坏记录直接删掉', () => {
  const { A, store } = boot({ sections: { '1.1': { answers: {}, marks: {},
    wrongLog: { 'TD-11-01': 'A', 'TD-11-02': { v: { x: 1 }, ts: 1 }, 'TD-11-03': null } } } });
  const st = A.secState('1.1', true);
  assert.deepEqual(st.wrongLog['TD-11-01'], { v: 'A', ts: 0 });
  assert.equal(st.wrongLog['TD-11-02'], undefined);
  assert.equal(st.wrongLog['TD-11-03'], undefined);
  assert.equal(Object.keys(st.wrongLog).length, 1);
});
