/* 云同步合并的「坏存档不许覆盖好存档」不变量。
   事故面：mergeLocalWithCloud 里 JSON.parse 失败时一律 `out[k] = local[k]`。
   本机存了半截 JSON（写盘中断 / 手工改动）而云端完好时，这段代码会把
   坏值塞回合并结果，随后 silentPush 又把它推上云 —— 账号里唯一的好数据
   被本机的坏数据冲掉，换设备也救不回来。
   这里直接跑真实 cloud-account.js（只取诊断钩子里的纯函数，不碰账号/UI）。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function boot(seed) {
  const store = Object.assign({}, seed);
  const sandbox = {
    console,
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; },
      key: i => Object.keys(store)[i] || null,
      get length() { return Object.keys(store).length; },
    },
    location: { pathname: '/', href: '', reload() {} },
    document: {
      readyState: 'loading',   // boot 挂到 DOMContentLoaded，别真去建 UI
      addEventListener() {}, removeEventListener() {},
      getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
      createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {}, querySelector: () => null, setAttribute() {} }),
      body: { style: {}, classList: { add() {}, remove() {} }, appendChild() {} },
      documentElement: { style: {}, classList: { add() {}, remove() {} }, setAttribute() {} },
    },
    window: {}, navigator: { language: 'zh' }, setTimeout: () => 1, clearTimeout() {},
    addEventListener() {}, URLSearchParams, JSON,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'cloud-account.js'), 'utf8'), sandbox);
  return { M: sandbox.window.TD_CLOUD_MERGE, store };
}

test('本机是半截 JSON、云端完好 → 保留云端，不把坏值推回去', () => {
  const cloud = { tdsat_app_v1: JSON.stringify({ sections: { '1.1': { answers: {} } } }) };
  const { M } = boot({ tdsat_app_v1: '{"sections":{"1.1":' });
  const out = M.mergeLocalWithCloud(cloud);
  assert.strictEqual(out.tdsat_app_v1, cloud.tdsat_app_v1, '坏的本机存档覆盖了云端好数据');
  assert.deepStrictEqual(JSON.parse(out.tdsat_app_v1), { sections: { '1.1': { answers: {} } } });
});

test('本机完好、云端是半截 JSON → 保留本机', () => {
  const local = JSON.stringify({ sections: { '1.1': { answers: { 'U1-01': { v: 'A', correct: false, ts: 1 } } } } });
  const { M } = boot({ tdsat_app_v1: local });
  const out = M.mergeLocalWithCloud({ tdsat_app_v1: '{"sections":' });
  assert.strictEqual(out.tdsat_app_v1, local, '云端坏数据顶掉了本机好数据');
});

test('云端 sections 是数组时不顶掉本机的对象 sections', () => {
  const local = JSON.stringify({ sections: { '1.1': { answers: { 'U1-01': { v: 'B', correct: true, ts: 200 } } } } });
  const { M } = boot({ tdsat_app_v1: local });
  const out = M.mergeLocalWithCloud({ tdsat_app_v1: JSON.stringify({ sections: [] }) });
  const parsed = JSON.parse(out.tdsat_app_v1);
  assert.equal(Array.isArray(parsed.sections), false, '云端坏数组顶掉了本机 sections');
  assert.deepStrictEqual(parsed.sections['1.1'].answers['U1-01'], { v: 'B', correct: true, ts: 200 });
});

test('两边都完好 → 深合并：新 ts 的作答胜出，旧的仍在', () => {
  const local = JSON.stringify({ sections: { '1.1': { answers: { 'U1-01': { v: 'B', correct: true, ts: 200 } } } } });
  const cloud = JSON.stringify({ sections: { '1.1': { answers: { 'U1-01': { v: 'A', correct: false, ts: 100 }, 'U1-02': { v: 'C', correct: false, ts: 50 } } } } });
  const { M } = boot({ tdsat_app_v1: local });
  const out = JSON.parse(M.mergeLocalWithCloud({ tdsat_app_v1: cloud }).tdsat_app_v1);
  assert.deepStrictEqual(out.sections['1.1'].answers['U1-01'], { v: 'B', correct: true, ts: 200 });
  assert.deepStrictEqual(out.sections['1.1'].answers['U1-02'], { v: 'C', correct: false, ts: 50 });
});

test('字符串 ts 的作答仍按时间取新，旧本机答案不压云端新答案', () => {
  const local = JSON.stringify({ sections: { '1.1': { answers: { 'U1-01': { v: 'A', correct: false, ts: '100' } } } } });
  const cloud = JSON.stringify({ sections: { '1.1': { answers: { 'U1-01': { v: 'B', correct: true, ts: '200' } } } } });
  const { M } = boot({ tdsat_app_v1: local });
  const out = JSON.parse(M.mergeLocalWithCloud({ tdsat_app_v1: cloud }).tdsat_app_v1);
  assert.deepStrictEqual(out.sections['1.1'].answers['U1-01'], { v: 'B', correct: true, ts: '200' },
    '字符串 ts 让较旧的本地答案压住了云端新答案');
});

test('两台设备的模考会话绝不拼接：整份取 startedAt 较新者', () => {
  const localSess = { startedAt: 1000, stage: 'answer', module: 1, paper: [{ id: 'A' }, { id: 'B' }],
    answers: { A: { v: 'x' } }, moduleEndsAt: 5000 };
  const cloudSess = { startedAt: 2000, stage: 'result', module: 2, paper: [{ id: 'C' }, { id: 'D' }, { id: 'E' }],
    answers: { C: { v: 'y' }, D: { v: 'z' } }, finished: true, result: { score: 1 } };
  const { M } = boot({ tdsat_exam_suite_session_v1: JSON.stringify(localSess) });
  const out = M.mergeLocalWithCloud({ tdsat_exam_suite_session_v1: JSON.stringify(cloudSess) });
  assert.deepStrictEqual(JSON.parse(out.tdsat_exam_suite_session_v1), cloudSess,
    '会话被逐字段拼成了半张卷子');
});

test('本机会话更新时保留本机整份（不被旧云端会话覆盖）', () => {
  const localSess = { startedAt: 3000, stage: 'answer', module: 1, paper: [{ id: 'Z' }], answers: {} };
  const cloudSess = { startedAt: 1000, stage: 'result', paper: [{ id: 'A' }, { id: 'B' }], finished: true, result: {} };
  const { M } = boot({ tdsat_exam_suite_session_v1: JSON.stringify(localSess) });
  const out = M.mergeLocalWithCloud({ tdsat_exam_suite_session_v1: JSON.stringify(cloudSess) });
  assert.deepStrictEqual(JSON.parse(out.tdsat_exam_suite_session_v1), localSess);
});

test('显式存档按 savedAt 整份取新，不被逐字段合并', () => {
  const localSave = { producer: 'tdsat-bluebook', version: 1, savedAt: 900, position: { sec: '1.1', n: 1 }, sections: { '1.1': { answers: { q1: { v: 'L', ts: 900 } } } } };
  const cloudSave = { producer: 'tdsat-bluebook', version: 1, savedAt: 1500, position: { sec: '2.1', n: 3 }, sections: { '2.1': { answers: { q2: { v: 'C', ts: 1500 } } } } };
  const { M } = boot({ tdsat_progress_save_v1: JSON.stringify(localSave) });
  const out = M.mergeLocalWithCloud({ tdsat_progress_save_v1: JSON.stringify(cloudSave) });
  assert.deepStrictEqual(JSON.parse(out.tdsat_progress_save_v1), cloudSave);
});

test('档案载荷是数组/字符串时不执行整份替换，不误清本机进度', () => {
  const local = JSON.stringify({ sections: { '1.1': { answers: { 'U1-01': { v: 'A', correct: false, ts: 1 } } } } });
  for (const bad of [[], ['tdsat_app_v1', 'x'], 'x', 1, true]) {
    const { M, store } = boot({ tdsat_app_v1: local });
    const ok = M.applyPayload(bad);
    assert.strictEqual(ok, false, '坏载荷被当成有效档案：' + JSON.stringify(bad));
    assert.strictEqual(store.tdsat_app_v1, local, '坏载荷清掉了本机进度：' + JSON.stringify(bad));
  }
});

test('档案载荷是普通对象时仍能整份替换并写入快照键', () => {
  const { M, store } = boot({ tdsat_app_v1: JSON.stringify({ old: 1 }), tdsat_prefs_v1: 'keep' });
  const ok = M.applyPayload({ tdsat_app_v1: JSON.stringify({ sections: {} }) });
  assert.strictEqual(ok, true, '普通对象载荷被拒绝');
  assert.deepStrictEqual(JSON.parse(store.tdsat_app_v1), { sections: {} });
  assert.strictEqual(store.tdsat_prefs_v1, 'keep', '外观偏好被档案替换误删');
});
