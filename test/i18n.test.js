// 中英切换的基本契约：字典能翻、数字句能按模式翻、偏好能存取，
// 并且五个页面都在 theme.js 之后加载 i18n.js。
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const i18n = require(path.join(ROOT, 'i18n.js'));

test('核心界面词都有英文：导航、按钮、设置、模考', () => {
  const must = {
    '真题练习': 'Practice',
    '单元抽查': 'Unit Quiz',
    '错题回顾': 'Wrong Answers',
    '模考': 'Mock Test',
    '设置': 'Settings',
    '上一题': 'Previous',
    '下一题': 'Next',
    '已标记': 'Marked',
    '未作答': 'Unanswered',
    '交卷': 'Submit',
    '语言': 'Language',
    '主题': 'Theme',
    '账户': 'Account',
    '外观': 'Appearance',
    '错题数': 'Wrong answers',
    '正确率': 'Accuracy',
  };
  for (const zh of Object.keys(must)) assert.strictEqual(i18n.t(zh), must[zh], zh);
});

test('带数字的句子按模式翻，不依赖每个调用点改代码', () => {
  assert.strictEqual(i18n.t('第 3 题'), 'Question 3');
  assert.strictEqual(i18n.t('还有 5 题未作答，交卷后按错误计入成绩。'),
    '5 unanswered; they count as wrong after you submit.');
  assert.strictEqual(i18n.t('剩余 5 分钟。'), '5 minutes left.');
  assert.strictEqual(i18n.t('答对 18 题'), '18 correct');
  assert.strictEqual(i18n.t('5 道'), '5 questions');
});

test('翻不出来的中文原样返回，不会把英文再翻一遍', () => {
  const unknown = '某个还没录进字典的句子';
  assert.strictEqual(i18n.t(unknown), unknown);
  assert.strictEqual(i18n.t('Settings'), 'Settings');
});

test('语言偏好存 tdsat_lang，默认中文', () => {
  const store = {};
  global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
  };
  assert.strictEqual(i18n.get(), 'zh');
  assert.strictEqual(i18n.set('en'), 'en');
  assert.strictEqual(store.tdsat_lang, 'en');
  assert.strictEqual(i18n.get(), 'en');
  assert.strictEqual(i18n.set('zh'), 'zh');
  assert.strictEqual(i18n.get(), 'zh');
  delete global.localStorage;
});

test('五个页面都在 theme.js 之后加载 i18n.js', () => {
  for (const f of ['drill.html', 'exam.html', 'wrong.html', 'jiangyi.html', 'history.html']) {
    const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const theme = html.indexOf('theme.js?v=');
    const i18nAt = html.indexOf('i18n.js?v=');
    assert.ok(theme >= 0, `${f} 缺 theme.js`);
    assert.ok(i18nAt > theme, `${f} 的 i18n.js 应在 theme.js 之后`);
  }
});

test('设置里有「语言」页签，并接到 TDI18n.set', () => {
  const src = fs.readFileSync(path.join(ROOT, 'cloud-account.js'), 'utf8');
  assert.match(src, /\['language', '语言'\]/);
  assert.match(src, /TDI18n\.set/);
  assert.match(src, /function renderLanguageTab/);
});
