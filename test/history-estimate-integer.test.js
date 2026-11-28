/* test/history-estimate-integer.test.js — 原始分/换算分只认整数，小数不端给用户 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const fakeEl = () => ({
  innerHTML: '', hidden: false, dataset: {},
  classList: { add() {}, remove() {}, toggle() { return true; } },
  setAttribute() {}, getAttribute() { return null; }, appendChild() {},
  querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {},
});

function boot(store) {
  const els = {};
  const sb = {
    console,
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    location: { search: '', hash: '', pathname: '/', href: '', replaceState() {}, assign() {} },
    history: { replaceState() {} },
    document: { getElementById: id => (els[id] = els[id] || fakeEl()), querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, body: { classList: { add() {}, remove() {}, toggle() { return true; } }, appendChild() {} }, createElement: () => fakeEl() },
    window: {}, URLSearchParams, navigator: { language: 'zh' }, addEventListener() {}, setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
  };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'history-page.js'), 'utf8'), sb);
  return els;
}

test('记录页：estimate.raw/scaled 是小数时显示「—」，不印 3.7 / 555.5', () => {
  const store = { tdsat_exam_suite_results_v1: JSON.stringify([{
    date: 1700000000000, mode: 'mock', total: 44, correct: 30, elapsed: 3600, detail: [],
    estimate: { raw: 3.7, rawMax: 44, scaled: 555.5, path: 'hard' }, report: {},
  }]) };
  const html = boot(store).histList.innerHTML;
  assert.ok(!/3\.7|555\.5/.test(html), '记录页把小数原始分/换算分印出来了');
  assert.ok(/原始分 <b>— \/ 44/.test(html), '小数 raw 没有降级成「— / 44」');
});
