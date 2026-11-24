/* L4 归并回归：Unit 4 的 9 道精编题不再整块隐藏，按 section 并回 4.1 / 4.2；
   与教材同题干的标 dup，且 dup 不进错题本。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function boot(seed) {
  const store = {};
  if (seed) store.tdsat_app_v1 = JSON.stringify(seed);
  const sandbox = {
    console,
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    location: { search: '', hash: '', pathname: '/drill.html' },
    document: {
      getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
      addEventListener() {}, createElement: () => ({
        style: {}, classList: { add() {}, remove() {} }, appendChild() {}, setAttribute() {}
      })
    },
    window: {}, URLSearchParams, navigator: { language: 'zh' }, setTimeout, addEventListener() {}
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'data/questions.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'grade-core.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'app-core.js'), 'utf8'), sandbox);
  return sandbox.window.TD_APP;
}

test('L4 不再作为独立板块存在，9 题并回 4.1 / 4.2', () => {
  const A = boot();
  assert.strictEqual(A.CATALOG.L4, undefined, 'L4 应已从 catalog 移除');
  const s41 = A.CATALOG['4.1'].filter(q => q.origin === 'legacy');
  const s42 = A.CATALOG['4.2'].filter(q => q.origin === 'legacy');
  assert.strictEqual(s41.map(q => q.id).join(','), 'U4-01,U4-02,U4-03,U4-04,U4-05');
  assert.strictEqual(s42.map(q => q.id).join(','), 'U4-06,U4-07,U4-08,U4-09');
  assert.ok(A.unitSections(4).includes('4.1') && A.unitSections(4).includes('4.2'),
    'Unit 4 板块列表必须仍能看到 4.1 / 4.2');
});

test('与教材同题干的精编题带 dup 标记，且指向教材题', () => {
  const A = boot();
  const dup = A.BANK.questions.filter(q => q.dup).map(q => q.id);
  assert.strictEqual(dup.join(','), 'U4-02,U4-03,U4-04,U4-05,U4-06,U4-07,U4-08,U4-09');
  const q = A.BANK.questions.find(x => x.id === 'U4-02');
  assert.strictEqual(q.dupOf, 'TD-41-02');
  assert.ok(!A.BANK.questions.find(x => x.id === 'U4-01').dup, 'U4-01 无教材重复题，不应标 dup');
});

test('dup 题不进错题本，非 dup 的精编题照常进', () => {
  const A = boot({ sections: { '4.1': { answers: {
    'U4-01': { v: 'A', correct: false },
    'U4-02': { v: 'A', correct: false }
  }, cursor: 0, completed: false, marks: {} } } });
  const ids = A.wrongList().map(x => x.q.id);
  assert.strictEqual(ids.join(','), 'U4-01');
});
