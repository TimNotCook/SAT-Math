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

test('两边都完好 → 深合并：新 ts 的作答胜出，旧的仍在', () => {
  const local = JSON.stringify({ sections: { '1.1': { answers: { 'U1-01': { v: 'B', correct: true, ts: 200 } } } } });
  const cloud = JSON.stringify({ sections: { '1.1': { answers: { 'U1-01': { v: 'A', correct: false, ts: 100 }, 'U1-02': { v: 'C', correct: false, ts: 50 } } } } });
  const { M } = boot({ tdsat_app_v1: local });
  const out = JSON.parse(M.mergeLocalWithCloud({ tdsat_app_v1: cloud }).tdsat_app_v1);
  assert.deepStrictEqual(out.sections['1.1'].answers['U1-01'], { v: 'B', correct: true, ts: 200 });
  assert.deepStrictEqual(out.sections['1.1'].answers['U1-02'], { v: 'C', correct: false, ts: 50 });
});
