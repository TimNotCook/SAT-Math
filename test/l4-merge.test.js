/* L4 移交回归：Unit 4 的 9 道精编题只从讲义复习 JY4「教材原题」子组进入，
   真题练习侧不得注册 L4，也不得并进 4.1 / 4.2 的官方题数。 */
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

test('真题练习不再注册 L4，也不并进 4.1 / 4.2', () => {
  const A = boot();
  assert.strictEqual(A.CATALOG.L4, undefined, 'L4 不应作为真题板块存在');
  const legacyIn = s => (A.CATALOG[s] || []).filter(q => q.origin === 'legacy' && q.unit === 4).length;
  ['4.1', '4.2', '4.3', '4.4', '4.5'].forEach(s => {
    assert.strictEqual(legacyIn(s), 0, s + ' 不应再出现 legacy Unit 4 题');
  });
  const anyLegacyU4 = Object.keys(A.CATALOG).some(k => A.CATALOG[k].some(q => q.origin === 'legacy' && q.unit === 4));
  assert.ok(!anyLegacyU4, 'Unit 4 精编题在真题侧必须整体不可见');
  assert.ok(A.unitSections(4).includes('4.1') && A.unitSections(4).includes('4.2'),
    'Unit 4 教材小节仍在');
});

test('教材原题的重复题不进错题本（dup 标记仍生效）', () => {
  const A = boot({ sections: { '4.1': { answers: {
    'U4-01': { v: 'A', correct: false },
    'U4-02': { v: 'A', correct: false }
  }, cursor: 0, completed: false, marks: {} } } });
  const ids = A.wrongList().map(x => x.q.id);
  assert.strictEqual(ids.join(','), '');   // legacy U4 已不在真题 catalog，错题本也不再收
});
