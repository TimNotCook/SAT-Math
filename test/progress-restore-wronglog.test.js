/* 显式进度存档（progress-save.js）恢复时漏搬 wrongLog 的回归。
   事故面：restore() 只把存档里的 answers / marks 合并回本机，wrongLog 没动。
   于是「换设备恢复存档」后，所有已订正的题在本机的 wrongLog 是空的 →
   错题回顾页里它们直接消失（因为页面靠 wrongLog 记着「当初错的那个答案」，
   本机 answers 现在是对的，没有 wrongLog 就无从判断曾错过）。
   这里直接跑真实 progress-save.js：种一份带 wrongLog 的存档 → restore() → 断言合并结果。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SAVE_KEY = 'tdsat_progress_save_v1';
const LIVE_KEY = 'tdsat_app_v1';

function boot(liveSeed, archive) {
  const store = { [LIVE_KEY]: JSON.stringify(liveSeed), [SAVE_KEY]: JSON.stringify(archive) };
  const sandbox = {
    console,
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; },
    },
    location: { search: '', hash: '', pathname: '/drill.html', href: '' },
    document: {
      getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
      addEventListener() {},
      body: { classList: { add() {}, remove() {} }, appendChild() {} },
      createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {}, querySelector: () => null, setAttribute() {} }),
    },
    window: {}, URLSearchParams, navigator: { language: 'zh' }, setTimeout, clearTimeout, addEventListener() {},
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of ['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js', 'progress-save.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox);
  }
  return { A: sandbox.window.TD_APP, SAVE: sandbox.window.TD_SAVE, store };
}

/* 用真实题库拿一题的 id，别硬编码（题库会订正 id/答案） */
function pick() {
  const sandbox = { window: {}, console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'data/questions.js'), 'utf8'), sandbox);
  const Q = sandbox.window.TD_BANK.questions;
  const sec = '1.1';
  const q = Q.find(x => x.section === sec && x.type === 'mcq' && !x.dup && !x.retired && !x.mergedInto);
  assert.ok(q, '题库里 1.1 必须有一道可用的 mcq');
  return { sec, qid: q.id, answer: String(q.answer) };
}

const T = pick();
const mkArchive = (wrongLog) => ({
  producer: 'tdsat-bluebook', version: 1, savedAt: 1700000000000,
  position: { sec: T.sec, n: 1 },
  sections: { [T.sec]: { answers: {}, marks: {}, wrongLog } },
});

test('恢复存档会把 wrongLog 合并进本机（已订正题不再蒸发）', () => {
  const { SAVE, store } = boot({ sections: {}, last: null },
    mkArchive({ [T.qid]: { v: 'A', ts: 1700000000000 } }));
  const res = SAVE.restore();
  assert.ok(res && res.ok, '恢复应当成功：' + JSON.stringify(res));
  const live = JSON.parse(store[LIVE_KEY]);
  const wl = live.sections[T.sec].wrongLog || {};
  assert.deepStrictEqual(wl[T.qid], { v: 'A', ts: 1700000000000 }, 'wrongLog 没被搬进本机');
});

test('本机已有更新的 wrongLog 时不被旧存档覆盖', () => {
  const { SAVE, store } = boot(
    { sections: { [T.sec]: { answers: {}, marks: {}, wrongLog: { [T.qid]: { v: 'B', ts: 1700000600000 } } } }, last: null },
    mkArchive({ [T.qid]: { v: 'A', ts: 1700000000000 } }));
  assert.ok(SAVE.restore().ok);
  const live = JSON.parse(store[LIVE_KEY]);
  assert.deepStrictEqual(live.sections[T.sec].wrongLog[T.qid], { v: 'B', ts: 1700000600000 },
    '较新的本机记录被旧存档覆盖了');
});

test('本机没有 wrongLog 字段时恢复会自动建出来', () => {
  const { SAVE, store } = boot(
    { sections: { [T.sec]: { answers: {}, marks: {} } }, last: null },
    mkArchive({ [T.qid]: { v: 'C', ts: 1 } }));
  assert.ok(SAVE.restore().ok);
  const live = JSON.parse(store[LIVE_KEY]);
  assert.ok(live.sections[T.sec].wrongLog && live.sections[T.sec].wrongLog[T.qid],
    '缺 wrongLog 字段时没有自动创建');
});
