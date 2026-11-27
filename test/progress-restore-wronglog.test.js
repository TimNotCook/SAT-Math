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

test('本机 sections 是数组时，恢复结果仍写回普通对象', () => {
  const archive = mkArchive({});
  archive.sections[T.sec].answers = { [T.qid]: { v: T.answer, ts: 1700000000000 } };
  const { SAVE, store } = boot({ sections: [], last: null }, archive);
  assert.ok(SAVE.restore().ok);
  const live = JSON.parse(store[LIVE_KEY]);
  assert.equal(Array.isArray(live.sections), false, '数组 sections 被原样写回，JSON 会吞掉所有板块');
  assert.equal(live.sections[T.sec].answers[T.qid].v, T.answer);
});

test('本机 sections 是数组且没有 last 时，snapshot 不崩且不把数组写进存档', () => {
  const { SAVE, store } = boot({ sections: [], last: null }, mkArchive({}));
  assert.doesNotThrow(() => SAVE.snapshot());
  const archive = JSON.parse(store[SAVE_KEY]);
  assert.equal(Array.isArray(archive.sections), false, '数组 sections 被原样写进存档');
  assert.equal(archive.producer, 'tdsat-bluebook');
});

test('本机 cursor 是对象/NaN 时，snapshot 仍写出可恢复的合法存档', () => {
  const { SAVE, store } = boot({ sections: { [T.sec]: { answers: {}, marks: {}, cursor: { x: 1 } } }, last: null }, mkArchive({}));
  const st = SAVE.snapshot();
  assert.equal(st.status, 'ok', 'cursor 对象把存档位置写成 NaN/null：' + JSON.stringify(st));
  const archive = JSON.parse(store[SAVE_KEY]);
  assert.equal(archive.position.n, 1, 'cursor 对象没有被归一成 0，位置 n 不是 1');
  assert.equal(SAVE.inspect().status, 'ok');
});

test('存档 sections 是数组时判 corrupt，不给出可恢复的假成功', () => {
  const archive = mkArchive({});
  archive.sections = [];
  const { SAVE } = boot({ sections: {}, last: null }, archive);
  const st = SAVE.inspect();
  assert.equal(st.status, 'corrupt', '数组 sections 被当成合法存档');
  assert.equal(SAVE.restore().ok, false);
});

test('本机某个板块记录是数组时，不被当成普通对象挂属性', () => {
  const archive = mkArchive({});
  archive.sections[T.sec].answers = { [T.qid]: { v: T.answer, ts: 1700000000000 } };
  const { SAVE, store } = boot({ sections: { [T.sec]: [] }, last: null }, archive);
  assert.ok(SAVE.restore().ok);
  const live = JSON.parse(store[LIVE_KEY]);
  assert.equal(Array.isArray(live.sections[T.sec]), false, '板块记录仍是数组，answers 会被 JSON 丢掉');
  assert.equal(live.sections[T.sec].answers[T.qid].v, T.answer);
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

test('进度存档 inspect：v 是对象时不算已答（恢复后实际是空白）', () => {
  const { A, SAVE, store } = boot({ sections: { '1.1': { answers: {}, marks: {}, cursor: 0 } }, last: null }, null);
  const qid = A.CATALOG['1.1'][0].id;
  store[SAVE_KEY] = JSON.stringify({
    producer: 'tdsat-bluebook', version: SAVE.VERSION, savedAt: Date.now(),
    position: { sec: '1.1', n: 1 },
    sections: { '1.1': { answers: { [qid]: { v: { x: 1 }, correct: true } }, marks: {}, cursor: 0 } },
  });
  const st = SAVE.inspect();
  assert.equal(st.status, 'ok');
  assert.equal(st.summary.answered, 0, '对象答案被算成已答，恢复后实际空白');
  assert.equal(st.summary.correct, 0);
});

test('进度存档 inspect：correct 是字符串 "false" 时不算答对', () => {
  const { A, SAVE, store } = boot({ sections: { '1.1': { answers: {}, marks: {}, cursor: 0 } }, last: null }, null);
  const qid = A.CATALOG['1.1'][0].id;
  store[SAVE_KEY] = JSON.stringify({
    producer: 'tdsat-bluebook', version: SAVE.VERSION, savedAt: Date.now(),
    position: { sec: '1.1', n: 1 },
    sections: { '1.1': { answers: { [qid]: { v: 'B', correct: 'false' } }, marks: {}, cursor: 0 } },
  });
  const st = SAVE.inspect();
  assert.equal(st.status, 'ok', '存档应被识别为可恢复：' + (st.reason || ''));
  assert.equal(st.summary.answered, 1, '作答数应算 1');
  assert.equal(st.summary.correct, 0, '字符串 false 被算成了答对');
});


test('存档 savedAt / position.n 是数字字符串时仍可识别并恢复', () => {
  const archive = mkArchive({});
  archive.savedAt = '1700000000000';
  archive.position.n = '2';
  const { SAVE, store } = boot({ sections: {}, last: null }, archive);
  const st = SAVE.inspect();
  assert.equal(st.status, 'ok', '数字字符串把可恢复存档判成 corrupt：' + (st.reason || ''));
  assert.equal(st.savedAt, 1700000000000, 'savedAt 没归一成数字');
  assert.equal(st.position.n, 2, 'position.n 没归一成数字');
  assert.ok(SAVE.restore().ok, '可恢复存档被 inspect 拒绝');
  const live = JSON.parse(store[LIVE_KEY]);
  assert.equal(live.last.sec, T.sec);
});

test('存档 submitted 是字符串 "false" 时恢复后不能变成已交卷', () => {
  const archive = Object.assign(mkArchive({}), {
    sections: { [T.sec]: { answers: {}, marks: {}, wrongLog: {}, submitted: 'false' } },
  });
  const { SAVE, store } = boot({ sections: {}, last: null }, archive);
  const res = SAVE.restore();
  assert.ok(res && res.ok, '恢复应当成功：' + JSON.stringify(res));
  const live = JSON.parse(store[LIVE_KEY]);
  assert.notStrictEqual(live.sections[T.sec].submitted, true, '字符串 false 不能恢复成 true');
});


test('本机 answers 是字符串时恢复不丢答案也不 TypeError', () => {
  const archive = Object.assign(mkArchive({}), {
    sections: { [T.sec]: { answers: { [T.qid]: { v: T.answer, correct: true, ts: 1700000000000 } }, marks: {}, wrongLog: {} } },
  });
  const { SAVE, store } = boot({ sections: { [T.sec]: { answers: 'junk', marks: {}, cursor: 0 } }, last: null }, archive);
  let threw = null;
  try { SAVE.restore(); } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '本机 answers 是字符串时恢复崩了：' + (threw && threw.message));
  const live = JSON.parse(store[LIVE_KEY]);
  assert.equal(typeof live.sections[T.sec].answers, 'object');
  assert.equal(live.sections[T.sec].answers[T.qid].v, T.answer);
});
