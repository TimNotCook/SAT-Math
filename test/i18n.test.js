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
    '完成本板块并查看结果': 'Finish section and view results',
    '语言': 'Language',
    '主题': 'Theme',
    '账户': 'Account',
    '外观': 'Appearance',
    '错题数': 'Wrong answers',
    '正确率': 'Accuracy',
  };
  for (const zh of Object.keys(must)) assert.strictEqual(i18n.t(zh), must[zh], zh);
});


test('小节名 / 单元名 / 状态词在整句里也能翻（词块替换）', () => {
  assert.strictEqual(i18n.t('1.1 线性方程与函数图像'), '1.1 Linear Equations and Graphs');
  assert.strictEqual(i18n.t('Unit 1 · 代数核心'), 'Unit 1 · Heart of Algebra');
  assert.strictEqual(i18n.t('Topic 20 · 模型与散点图'), 'Topic 20 · Models and Scatterplots');
  assert.strictEqual(i18n.t('未开始'), 'Not started');
  assert.strictEqual(i18n.t('进行中'), 'In progress');
  assert.strictEqual(i18n.t('继续上次练习 · 2.7.T20 Topic 20 · 模型与散点图 第 3 题'),
    'Resume · 2.7.T20 Topic 20 · Models and Scatterplots Question 3');
  // 认不出来的中文保持原样，不乱翻
  assert.strictEqual(i18n.t('期末复习'), '期末复习');
  // 纯英文/数学串不经过词块替换
  assert.strictEqual(i18n.t('What is the value of x?'), 'What is the value of x?');
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

test('i18n 支持「只这一页强制英文」，且不写用户偏好', () => {
  const src = fs.readFileSync(path.join(ROOT, 'i18n.js'), 'utf8');
  assert.match(src, /function force\(lang\)/, '缺 force');
  assert.match(src, /force: force/, 'force 没导出');
  const seg = src.slice(src.indexOf('function force(lang)'), src.indexOf('var api ='));
  assert.ok(seg.indexOf('localStorage.setItem') < 0, 'force 不能写 localStorage，否则会把全站语言改掉');
});

test('模考页把设置面板拉成英文，不再「Settings 配一屏中文」', () => {
  const acct = fs.readFileSync(path.join(ROOT, 'cloud-account.js'), 'utf8');
  const seg = acct.slice(acct.indexOf('function boot()'));
  assert.match(seg, /is-mock/, 'boot 里没判断模考页');
  assert.match(seg, /TDI18n\.force\('en'\)/, '模考页没强制英文');
});

test('「关于」页不印题库题量，且整句按语言出', () => {
  const acct = fs.readFileSync(path.join(ROOT, 'cloud-account.js'), 'utf8');
  const seg = acct.slice(acct.indexOf('function renderAboutTab'), acct.indexOf('function renderBody'));
  assert.ok(seg.indexOf('题库') < 0, '关于页又出现了题库题量');
  assert.match(seg, /langEn\(\)/, '关于页没按语言分支');
});


test('英文模式下没设昵称时显示 Student，不是中文「同学」', () => {
  const acc = fs.readFileSync(path.join(__dirname, '..', 'cloud-account.js'), 'utf8');
  assert.ok(/function defaultNick\(\)/.test(acc), '缺 defaultNick');
  const seg = acc.slice(acc.indexOf('function defaultNick'));
  assert.ok(/TDI18n\.get\(\) === 'en'/.test(seg.slice(0, 300)), '没按界面语言切换默认昵称');
  assert.ok(seg.slice(0, 300).indexOf("return 'Student'") >= 0, '英文默认昵称还不是 Student');
  assert.ok(/function displayName\(\) { return nickname \|\| defaultNick\(\); }/.test(acc), 'displayName 还在用固定的「同学」');
});

test('「第 N / M 题」这类拼接计数在英文模式下要翻（讲义题号/页脚/结果分数）', () => {
  const i18n = require(path.join(ROOT, 'i18n.js'));
  /* 这三处都不是整句字典能覆盖的，靠 PATS 模式翻；漏掉就整条留在中文。 */
  assert.strictEqual(i18n.t('第 1 / 9 题'), 'Question 1 of 9');
  assert.strictEqual(i18n.t('第 3 / 5 空'), 'Blank 3 of 5');
  assert.strictEqual(i18n.t('答对 3 / 5 题'), '3 of 5 correct');
  assert.strictEqual(i18n.t('5 / 9 题答对'), '5 of 9 correct');
  assert.strictEqual(i18n.t('答对 3 / 5 题 · 正确率 60%'), '3 of 5 correct · 60% accuracy');
  /* 讲义面包屑是一整串，' › ' 不参与 ' · ' 拆分，也要单独覆盖 */
  assert.strictEqual(i18n.t('讲义复习 › U1'), 'Lecture Review › U1');
  /* 旧的单题号仍走原来的规则，不能被新规则抢走 */
  assert.strictEqual(i18n.t('第 1 题'), 'Question 1');
  assert.strictEqual(i18n.t('第 3 空'), 'Blank 3');
});
