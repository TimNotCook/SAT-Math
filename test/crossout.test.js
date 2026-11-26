'use strict';
/* 选项划掉状态：按 qid 持久化、只作用于单个选项、与作答题无关。
 * 直接加载线上 crossout.js，不复制实现。 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'crossout.js'), 'utf8');
function sameList(actual, expected) { assert.equal(JSON.stringify(actual), JSON.stringify(expected)); }

function load(initial) {
  const store = Object.assign({}, initial || {});
  const localStorage = {
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); }
  };
  const window = { localStorage };
  const context = { window, JSON, Object, Array, String, parseInt, console };
  vm.createContext(context);
  vm.runInContext(SRC, context, { filename: 'crossout.js' });
  return { C: window.TD_CROSSOUT, store };
}

describe('cross-out：按 qid 持久化', () => {
  test('toggle 一次划掉、再点取消，清空后不残留空数组', () => {
    const { C, store } = load();
    assert.equal(C.toggle('q1', 'A'), true);
    sameList(C.list('q1'), ['A']);
    assert.equal(C.has('q1', 'A'), true);
    assert.match(store.tdsat_crossout_v1, /"q1":\["A"\]/);
    assert.equal(C.toggle('q1', 'A'), false);
    sameList(C.list('q1'), []);
    assert.equal(store.tdsat_crossout_v1, '{}');
  });

  test('不同题互不影响', () => {
    const { C } = load();
    C.set('q1', 'B', true);
    C.set('q2', 'D', true);
    sameList(C.list('q1'), ['B']);
    sameList(C.list('q2'), ['D']);
    C.clear('q1');
    sameList(C.list('q1'), []);
    sameList(C.list('q2'), ['D']);
  });

  test('读取时过滤非法字母并去重、按 A-D 排序', () => {
    const store = { tdsat_crossout_v1: JSON.stringify({ q1: ['D', 'Z', 'A', 'D'] }) };
    const { C } = load(store);
    sameList(C.list('q1'), ['A', 'D']);
  });

  test('坏 JSON / 非对象不抛错，按空状态处理', () => {
    for (const raw of ['{oops', '[]', 'null']) {
      const { C, store } = load({ tdsat_crossout_v1: raw });
      sameList(C.list('q1'), []);
      C.set('q1', 'C', true);
      sameList(C.list('q1'), ['C']);
      assert.match(store.tdsat_crossout_v1, /"q1":\["C"\]/);
    }
  });
});

describe('cross-out：按钮与快捷键契约', () => {
  test('按钮带独立 aria-pressed，锁定态禁用', () => {
    const { C } = load();
    C.set('q1', 'B', true);
    const open = C.buttonHtml('B', true, false);
    assert.match(open, /class="crossout-toggle is-on"/);
    assert.match(open, /aria-pressed="true"/);
    assert.doesNotMatch(open, /disabled/);
    const locked = C.buttonHtml('B', true, true);
    assert.match(locked, /disabled/);
    assert.match(locked, /tabindex="-1"/);
  });

  test('Shift + Digit1..4 映射 A-D，其它组合不触发', () => {
    const { C } = load();
    assert.equal(C.keyLetter({ shiftKey: true, code: 'Digit1' }), 'A');
    assert.equal(C.keyLetter({ shiftKey: true, code: 'Digit4' }), 'D');
    assert.equal(C.keyLetter({ shiftKey: false, code: 'Digit2' }), '');
    assert.equal(C.keyLetter({ shiftKey: true, code: 'Digit2', ctrlKey: true }), '');
    assert.equal(C.keyLetter({ shiftKey: true, code: 'KeyA' }), '');
  });

  test('输入框里不抢数字键', () => {
    const { C } = load();
    assert.equal(C.isEditableTarget({ tagName: 'INPUT' }), true);
    assert.equal(C.isEditableTarget({ tagName: 'TEXTAREA' }), true);
    assert.equal(C.isEditableTarget({ tagName: 'DIV' }), false);
  });
});

/* 2026-11-26：390 宽模考页 #question 仅 326px，right:-28px 的 ✕ 把正文撑到 405，
   整页可横向滚 15px。窄屏必须把按钮收回行内，否则每次答题都能左右晃。 */
test('窄屏下划掉按钮不得溢出选项行', () => {
  const fs = require('fs');
  const path = require('path');
  const css = fs.readFileSync(path.join(__dirname, '..', 'bluebook.css'), 'utf8');
  assert.match(css, /@media \(max-width:640px\)[\s\S]*?\.crossout-toggle\{right:6px\}/,
    '640 以下必须把 .crossout-toggle 的 right 从 -28px 收回行内');
});
