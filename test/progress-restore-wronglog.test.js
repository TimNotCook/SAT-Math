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

test('存档 answers 条目是裸字符串时，摘要按已作答统计', () => {
  const archive = mkArchive({});
  const { A } = boot({ sections: {}, last: null }, archive);
  const q = (A.CATALOG[T.sec] || []).find(x => x.type === 'mcq');
  assert.ok(q, '1.1 必须有 mcq');
  archive.sections[T.sec].answers = { [q.id]: String(q.answer) };
  // 重新 boot，让存档里带上真实 catalog 题号
  const { SAVE: SAVE2 } = boot({ sections: {}, last: null }, archive);
  const st = SAVE2.inspect();
  assert.equal(st.status, 'ok');
  assert.equal(st.summary.answered, 1, '裸字符串答案被摘要算成未作答');
});

test('存档 answers 条目是 null / 裸值时，本机已有作答也不会恢复崩溃', () => {
  const { A } = boot({ sections: {}, last: null }, mkArchive({}));
  const other = A.CATALOG[T.sec][1] && A.CATALOG[T.sec][1].id;
  if (!other) return;
  const archive = mkArchive({});
  archive.sections[T.sec].answers = { [T.qid]: null, [other]: 'A' };
  const { SAVE, store } = boot(
    { sections: { [T.sec]: { answers: { [T.qid]: { v: 'C', ts: 1700000600000 } }, marks: {}, cursor: 0 } }, last: null },
    archive);
  let res;
  assert.doesNotThrow(() => { res = SAVE.restore(); }, 'null 答案在本机已有作答时把恢复打崩');
  assert.ok(res && res.ok, '恢复应成功：' + JSON.stringify(res));
  const live = JSON.parse(store[LIVE_KEY]);
  assert.equal(live.sections[T.sec].answers[T.qid].v, 'C', '本机已有作答被 null 存档覆盖');
  assert.equal(live.sections[T.sec].answers[other].v, 'A', '裸字符串答案没有恢复成 {v}');
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


test('存档答案条目的 v 是对象时恢复成空串，不写 [object Object]', () => {
  const archive = Object.assign(mkArchive({}), {
    sections: { [T.sec]: { answers: { [T.qid]: { v: { x: 1 }, ts: 1 } }, marks: {}, wrongLog: {} } },
  });
  const { SAVE, store } = boot({ sections: {}, last: null }, archive);
  assert.ok(SAVE.restore().ok);
  const live = JSON.parse(store[LIVE_KEY]);
  assert.equal(live.sections[T.sec].answers[T.qid], undefined, '坏 v 不能写回空答案');
});


test('存档 wrongLog 的 v 是对象/空值时不再写回幽灵错题', () => {
  const archive = Object.assign(mkArchive({}), {
    sections: { [T.sec]: { answers: {}, marks: {},
      wrongLog: { [T.qid]: { v: { x: 1 }, ts: 1 }, 'TD-11-99': { v: '', ts: 1 } } } },
  });
  const { SAVE, store } = boot({ sections: {}, last: null }, archive);
  assert.ok(SAVE.restore().ok);
  const live = JSON.parse(store[LIVE_KEY]);
  assert.equal(live.sections[T.sec].wrongLog[T.qid], undefined);
  assert.equal(live.sections[T.sec].wrongLog['TD-11-99'], undefined);
});


test('存档坏 v 不能把本机有效旧答案覆盖成空', () => {
  const liveSeed = { sections: { [T.sec]: { answers: { [T.qid]: { v: 'A', ts: 1 } }, marks: {}, wrongLog: {} } }, last: null };
  const archive = Object.assign(mkArchive({}), {
    sections: { [T.sec]: { answers: { [T.qid]: { v: { x: 1 }, ts: 9 } }, marks: {}, wrongLog: {} } },
  });
  const { SAVE, store } = boot(liveSeed, archive);
  assert.ok(SAVE.restore().ok);
  const live = JSON.parse(store[LIVE_KEY]);
  assert.equal(live.sections[T.sec].answers[T.qid].v, 'A');
});


test('存档位置跟随旧板块别名归一，不再错落到第一个板块', () => {
  const liveSeed = { sections: { '2.6.T17': { answers: {}, marks: {}, wrongLog: {}, cursor: 1 } },
    last: { sec: '2.6.T17', qid: null, ts: 1700000000000 } };
  const { SAVE } = boot(liveSeed, null);
  const res = SAVE.snapshot();
  assert.equal(res.status, 'ok', '存档应该能写出来：' + JSON.stringify(res));
  assert.equal(res.position.sec, '2.7.T17', '旧板块别名没有归一，存档位置错了');
});


test('旧板块别名的存档能通过 inspect 并恢复到新板块', () => {
  const { A } = boot({ sections: {}, last: null }, null);
  const alias = '2.6.T17', canonical = '2.7.T17';
  const qid = (A.CATALOG[canonical] || [])[0] && A.CATALOG[canonical][0].id;
  assert.ok(qid, '题库里 2.7.T17 必须有题');
  const archive = {
    producer: 'tdsat-bluebook', version: 1, savedAt: 1700000000000,
    position: { sec: alias, n: 1 },
    sections: { [alias]: { answers: { [qid]: { v: 'A', ts: 9 } }, marks: {}, wrongLog: {} } },
  };
  const { SAVE } = boot({ sections: {}, last: null }, archive);
  const ins = SAVE.inspect();
  assert.equal(ins.status, 'ok', '旧板块别名的存档被判 corrupt：' + JSON.stringify(ins));
  assert.equal(ins.position.sec, canonical);
  const { SAVE: S2, store } = boot({ sections: {}, last: null }, archive);
  assert.ok(S2.restore().ok);
  const live = JSON.parse(store[LIVE_KEY]);
  assert.equal(live.sections[canonical].answers[qid].v, 'A', '旧板块 key 的作答没有搬进新板块');
});
