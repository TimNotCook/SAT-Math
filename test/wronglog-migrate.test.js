/* 错题台账的别名迁移回归。
   事故面：normalize() 只把 answers / marks 按 TD_ALIAS 重映射，wrongLog 没动。
   结果有两个静默后果：
     1) 旧板块键被 delete 时，wrongLog 跟着消失 → 「以前错过的题从没输过」（错题蒸发）；
     2) 同板块内的别名题（SP2-001 vs R03-001）键不重映射，wrong-page 按 canonical
        q.id 查不到 → 「已订正」永远显示不出来。
   这里直接跑真实 app-core：seed 一份带别名 wrongLog 的存档 → 触发一次 setAnswer
   （走磁盘读写路径）→ 断言磁盘上的 wrongLog 已被改写成 canonical 键且内容不丢。 */
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
      addEventListener() {},
      createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {}, setAttribute() {} }),
    },
    window: {}, URLSearchParams, navigator: { language: 'zh' }, setTimeout, addEventListener() {},
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of ['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox);
  }
  return { A: sandbox.window.TD_APP, store, sandbox };
}

const LEGACY_WRONG = { v: 'A', ts: 111 };

test('wrongLog 里的别名题 id 会被改写成 canonical id（且不丢内容）', () => {
  const seed = { sections: {
    '2.7.T17': {
      answers: { 'SP2-001': { v: 'A', correct: false, ts: 111 } },
      cursor: 0, completed: false, marks: {},
      wrongLog: { 'SP2-001': LEGACY_WRONG },
    },
  }, last: null };
  const { A, store } = boot(seed);
  assert.ok(A.CATALOG['2.7.T17'].some(q => q.id === 'R03-001'), '2.7.T17 里应该有 R03-001');
  A.setAnswer('2.7.T17', 'R03-002', 'A');           /* 换一道题触发写盘，免得覆盖被验的那条 */
  const st = JSON.parse(store.tdsat_app_v1);
  const wl = st.sections['2.7.T17'].wrongLog;
  assert.ok(wl['R03-001'], '别名键 SP2-001 应被重映射成 R03-001');
  assert.strictEqual(wl['R03-001'].v, LEGACY_WRONG.v, '原答案要保留');
  assert.strictEqual(wl['R03-001'].ts, LEGACY_WRONG.ts, '原时间要保留');
  assert.ok(!wl['SP2-001'], '旧别名键不应继续存在');
});

test('normalize 不会把已有 canonical wrongLog 覆盖掉', () => {
  const seed = { sections: {
    '2.7.T17': {
      answers: { 'R03-001': { v: 'C', correct: true, ts: 500 } },
      cursor: 0, completed: false, marks: {},
      wrongLog: { 'R03-001': { v: 'A', ts: 111 }, 'SP2-001': { v: 'D', ts: 999 } },
    },
  }, last: null };
  const { A, store } = boot(seed);
  A.setAnswer('2.7.T17', 'R03-002', 'D');      /* 答对触发写盘，别碰 R03-001，也别多一条错题 */
  const st = JSON.parse(store.tdsat_app_v1);
  const wl = st.sections['2.7.T17'].wrongLog;
  assert.strictEqual(wl['R03-001'].ts, 111, 'canonical 已有记录优先，不被别名覆盖');
  assert.strictEqual(Object.keys(wl).length, 1, '两个键应合并成一个');
});

test('订正之后旧错题记录不会被删（错题本才能标「已订正」）', () => {
  const seed = { sections: {
    '2.7.T17': {
      answers: { 'SP2-001': { v: 'A', correct: false, ts: 111 } },
      cursor: 0, completed: false, marks: {},
      wrongLog: { 'SP2-001': LEGACY_WRONG },
    },
  }, last: null };
  const { A, store } = boot(seed);
  A.setAnswer('2.7.T17', 'R03-001', 'C');           /* 订正：答对 */
  const st = JSON.parse(store.tdsat_app_v1);
  const wl = st.sections['2.7.T17'].wrongLog;
  assert.ok(wl['R03-001'], '订正后旧错题记录必须还在（否则错题蒸发）');
  assert.strictEqual(wl['R03-001'].ts, LEGACY_WRONG.ts, '保留当初答错的时间');
  const a = st.sections['2.7.T17'].answers['R03-001'];
  assert.strictEqual(a.correct, true, '最新作答应判对');
});
