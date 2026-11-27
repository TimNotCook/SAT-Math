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
