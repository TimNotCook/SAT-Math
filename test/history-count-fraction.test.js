/* test/history-count-fraction.test.js — 云端/旧版把题数写成小数时记录页不能印出「10 / 22.5」 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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

function boot(store) {
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
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'history-page.js'), 'utf8'), sandbox);
  return els;
}

const detail = (n, right) => Array.from({ length: n }, (_, i) => ({ id: 'U1-01', correct: i < right }));

test('记录页：total/correct 是小数时按逐题明细兜底，不印小数', () => {
  const store = { tdsat_exam_suite_results_v1: JSON.stringify([
    { date: 1700000000000, mode: 'quiz', unit: '1.1', total: 22.5, correct: 10.9, elapsed: 60, detail: detail(22, 11), report: {} },
    { date: 1700000000001, mode: 'quiz', unit: '1.1', total: 1.5, correct: 1.5, elapsed: 60, detail: detail(1, 1), report: {} },
  ]) };
  const els = boot(store);
  const html = els.histList.innerHTML;
  assert.ok(!/22\.5|10\.9|1\.5/.test(html), '记录页把小数题数印出来了：' + html.slice(0, 300));
  assert.ok(/11 \/ 22/.test(html), '有逐题明细时没有按明细算出 11 / 22');
});

test('记录页：未做完档案的 total/answered 是小数时不印「5 / 22.5」', () => {
  const store = { tdsat_exam_suite_results_v1: JSON.stringify([{
    void: true, date: 1700000000000, mode: 'mock', total: 22.5, answered: 5.5,
    detail: detail(22, 5), report: {}
  }]) };
  const html = boot(store).histList.innerHTML;
  assert.ok(!/22\.5|5\.5/.test(html), '未做完档案把小数题数印出来了');
  assert.ok(/已答 <b>5 \/ 22/.test(html), '未做完档案没有按明细兜底成 5 / 22：' + html.slice(Math.max(0, html.indexOf('已答')-80), html.indexOf('已答')+120));
});
