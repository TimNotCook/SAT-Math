/* 成绩仓库/错题键被写成「对象」而不是数组时的整页崩溃回归。
   事故面：wrong-page.js 与 history-page.js 的 load() 都写着
   `JSON.parse(...) || []` —— 只要值是真值对象（旧版结构、云端合并写错、
   手工导入），后面的 .forEach / .filter / .sort 立刻 TypeError，
   页面停在占位、永不重画（和第 12 条「错题本慢网空白」同一种用户体感）。
   修法：只认 Array.isArray，其余一律当空列表。这里直接跑两个真实页面脚本。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function fakeEl() {
  return {
    innerHTML: '', hidden: false, dataset: {},
    classList: { add() {}, remove() {}, toggle() { return true; } },
    setAttribute() {}, getAttribute() { return null; }, appendChild() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener() {},
  };
}

function boot(files, store) {
  const els = {};
  const sandbox = {
    console,
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; },
    },
    location: { search: '', hash: '', pathname: '/', href: '', replaceState() {}, assign() {} },
    history: { replaceState() {} },
    document: {
      getElementById: id => (els[id] = els[id] || fakeEl()),
      querySelector: () => null, querySelectorAll: () => [],
      addEventListener() {},
      body: { classList: { add() {}, remove() {}, toggle() { return true; } }, appendChild() {} },
      createElement: () => fakeEl(),
    },
    window: {}, URLSearchParams, navigator: { language: 'zh' }, addEventListener() {},
    setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox);
  return { els, sandbox };
}

test('错题本：成绩仓库是对象时不崩页，仍渲染出列表容器', () => {
  const store = { tdsat_exam_suite_results_v1: JSON.stringify({ items: [{ bad: true }] }) };
  let threw = null;
  try {
    boot(['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js', 'wrong-page.js'], store);
  } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '错题本被非数组成绩仓库打崩了：' + (threw && threw.message));
});

test('记录页：成绩仓库是对象时不崩页，落到「还没有记录」占位', () => {
  const store = {
    tdsat_exam_suite_results_v1: JSON.stringify({ items: [] }),
    tdsat_exam_suite_abandoned_v1: JSON.stringify({ nope: 1 }),
  };
  let threw = null, box = null;
  try { box = boot(['history-page.js'], store).els.histList; } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '记录页被非数组仓库打崩了：' + (threw && threw.message));
  assert.ok(box && /还没有模考或抽查记录/.test(box.innerHTML), '记录页没有落到空态占位');
});

test('exam.js 读仓库一律过 asArr/asObj，不再裸 `|| []` / `|| {}`', () => {
  const s = fs.readFileSync(path.join(ROOT, 'exam.js'), 'utf8');
  assert.ok(/const asArr = v =>/.test(s) && /const asObj = v =>/.test(s), 'exam.js 缺少 asArr/asObj 降级器');
  assert.ok(!/(load\((?:KEY_)[A-Z]+\)\s*\|\|\s*\[\])/.test(s),
    'exam.js 里还有 `load(KEY_x) || []` 的裸数组假设');
});

test('脏存档体检脚本存在、复用 lib/chrome 与 lib/serve', () => {
  const s = fs.readFileSync(path.join(ROOT, 'tools/verify_junk.mjs'), 'utf8');
  assert.ok(/from '\.\/lib\/chrome\.mjs'/.test(s) && /tempProfile\('vjk-'\)/.test(s), 'verify_junk 没复用 chrome 临时 profile');
  assert.ok(/from '\.\/lib\/serve\.mjs'/.test(s) && /startStaticServer/.test(s), 'verify_junk 没复用静态服务器');
  assert.ok(/tdsat_exam_suite_results_v1/.test(s) && /tdsat_progress_save_v1/.test(s), 'verify_junk 没种关键脏键');
  assert.ok(/PROFILES/.test(s) && /B-halfsession/.test(s) && /C-extremes/.test(s), 'verify_junk 的脏值档案少于三套');
});

test('成绩记录里 detail 是对象、条目是 null 时，错题本与记录页都不崩', () => {
  const store = {
    tdsat_exam_suite_results_v1: JSON.stringify([
      { date: 1, mode: 'mock', detail: 'nope', total: 'x' }, null, 5,
    ]),
  };
  let threw = null, els = null;
  try {
    els = boot(['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js', 'wrong-page.js'], store).els;
  } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '错题本被坏 detail 打崩：' + (threw && threw.message));
  assert.ok(els && els.wrongList && els.wrongList.innerHTML.length > 0, '错题本没画出东西');

  threw = null;
  try { boot(['history-page.js'], store); } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '记录页被坏 detail 打崩：' + (threw && threw.message));
});

test('bump_assets.py 拒绝在任何带冲突标记的文件上跑', () => {
  const s = fs.readFileSync(path.join(ROOT, 'bump_assets.py'), 'utf8');
  assert.ok(/def assert_no_conflict_markers\(\)/.test(s), 'bump_assets 缺冲突标记闸门');
  assert.ok(/assert_no_conflict_markers\(\)\n    v = digest\(\)/.test(s), '闸门没有在 main 里先于 digest 执行');
});

test('导入错题仓库 items 是字符串/数字时，错题本不崩且仍画出卡片', () => {
  const store = {
    tdsat_imported_wrong_v1: JSON.stringify({ items: 'no', n: {} }),
    tdsat_app_v1: JSON.stringify({ sections: { '1.1': { answers: { 'U1-01': { v: 'A', correct: false, ts: 1 } } } }, last: null }),
  };
  let threw = null, els = null;
  try {
    els = boot(['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js', 'wrong-page.js'], store).els;
  } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '错题本被坏导入仓库打崩：' + (threw && threw.message));
  assert.ok(els && els.wrongList && els.wrongList.innerHTML.length > 0, '错题本没画出东西');
});
