/* test/storage-failure-copy.test.js
 *
 * 2026-11-28 巡检：本地存储不可写（无痕模式、配额满）时，各页会弹存档/进度/成绩失败提示。
 * 这几句是写死在脚本里的整句，英文界面下整段中文——尤其 exam.html 是官方模考页，
 * 默认英文，最不该出现中文。
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'i18n.js'), 'utf8');

const doc = {
  addEventListener() {}, querySelectorAll() { return []; }, querySelector() { return null; },
  createElement() { return { style: {}, setAttribute() {}, appendChild() {} }; },
  createTextNode(t) { return { nodeValue: t }; },
  documentElement: { setAttribute() {}, lang: 'zh' }, head: { appendChild() {} },
  body: { appendChild() {} }, readyState: 'loading', title: '',
};
const localStorage = { getItem() { return null; }, setItem() {} };
class MO { observe() {} disconnect() {} }
const win = { localStorage, MutationObserver: MO, setTimeout() {}, document: doc, location: { href: 'http://x/' }, navigator: { language: 'zh' } };
new Function('window', 'document', 'localStorage', 'MutationObserver', 'navigator', 'setTimeout', SRC)(win, doc, localStorage, MO, win.navigator, () => {});
const t = win.__i18nT;
assert.strictEqual(typeof t, 'function', 'i18n.js 没有挂出 __i18nT');

const CASES = [
  '保存失败：本地存储不可写',
  '旧卷留档写入失败：本地存储不可写，原会话已保留；清出空间后刷新可重试',
  '答题进度保存失败：本地存储不可写，刷新后可能丢失',
  '成绩保存失败：本地存储不可写，刷新后这次成绩可能丢失',
  '昵称未能保存：',
  '昵称未能保存：QuotaExceededError',
];

test('存储写入失败的提示在英文模式下不留中文', () => {
  const bad = [];
  for (const s of CASES) {
    const out = t(s);
    if (/[\u4e00-\u9fff]/.test(out)) bad.push(s + '  =>  ' + out);
  }
  assert.deepEqual(bad, []);
});

test('这些提示仍写在原来的脚本里（改文案要同步词典）', () => {
  const src = ['exam.js', 'drill.js', 'cloud-account.js']
    .map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  for (const s of CASES.slice(0, 4)) {
    assert.ok(src.includes(s), '脚本里已找不到这条文案，词典词条应同步删除：' + s);
  }
});
