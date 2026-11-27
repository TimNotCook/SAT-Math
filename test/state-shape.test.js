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
