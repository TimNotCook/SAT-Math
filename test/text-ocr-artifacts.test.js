/* 2026-11-27：U4-09（练习册 P207 #10，与 TD-42-10 同题）文本层是 OCR 直录：
   stem 少了空格「value ofx?」，选项把根号记成字母「13V2」「26v2」。
   原页印的是 13、13√2、26、26√2。这类 OCR 残渣在页面上肉眼极易漏，
   加一条字符级守卫，再钉住 U4-09 本身。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const load = () => {
  const w = {};
  const run = (f) => new Function('window', fs.readFileSync(path.join(ROOT, f), 'utf8'))(w);
  run('data/questions.js'); run('data/text.js');
  return w;
};

test('全库没有把根号记成字母 V/v 的残渣', () => {
  const w = load();
  const bad = [];
  for (const q of w.TD_BANK.questions) {
    const t = w.TD_TEXT[q.id] || {};
    const strings = [String(t.stem || q.stem || ''), ...Object.values(t.choices || {})];
    strings.forEach((s) => { if (/\d[Vv]\d/.test(s)) bad.push(q.id + ' :: ' + s.slice(0, 60)); });
  }
  assert.deepStrictEqual(bad, [], '疑似 V/v 代替根号：' + bad.join(' / '));
});

test('U4-09 与 TD-42-10 的选项逐字一致', () => {
  const w = load();
  const a = w.TD_TEXT['U4-09'], b = w.TD_TEXT['TD-42-10'];
  assert.deepStrictEqual(Object.values(a.choices), ['13', '13√2', '26', '26√2']);
  assert.deepStrictEqual(Object.values(a.choices), Object.values(b.choices), '同题两份选项必须一致');
});
