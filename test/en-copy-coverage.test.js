/* test/en-copy-coverage.test.js — 英文界面文案覆盖率守卫
 *
 * 2026-11-28 真事：英文界面本来「看起来干净」，是因为当时本地没有数据。
 * 一旦有错题 / 交过一次讲义，结果页与错题页整页中文（显示 12 道 · 含历史错题、
 * 第 5 题、你的答案、错题（6）、3 / 9 题答对…），因为这些串是 JS 里拼出来的，
 * i18n 只能逐节点翻译静态文本，拼串里的变量和中文混在一起永远匹配不到。
 *
 * 这些页面靠 TT(zh,en) / isEn() 就地分词。这里锁住那几处 keywords，
 * 免得后续补丁把硬编码中文又写回来。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(resolve(ROOT, f), 'utf8');

test('错题页：计数/卡片/答案标签按界面语言出', () => {
  const s = read('wrong-page.js');
  assert.ok(s.includes('function TT(zh,en){return isEn()?en:zh;}'), 'wrong-page.js 缺 TT 选择器');
  for (const frag of [
    "TT('全部错题','All mistakes')",
    "TT('你的答案','Your answer')",
    "TT('正确答案','Correct answer')",
    "TT('薄弱点：','Weak spot: ')",
    "TT('回到本题重练','Redo this question')",
    "TT(' 道',' missed')",
  ]) assert.ok(s.includes(frag), '错题页丢了英文分支：' + frag);
  assert.ok(!s.includes("textContent='显示 '+rows.length+' 道"), '计数文案又变回硬编码中文');
});

test('讲义结果页：结果/题答对/错题/答案标签按界面语言出', () => {
  const s = read('jiangyi-page.js');
  assert.ok(s.includes('function TT(zh, en) { return isEn() ? en : zh; }'), 'jiangyi-page.js 缺 TT');
  for (const frag of [
    "TT(' · 结果', ' · Results')",
    "TT(' 题答对', ' correct')",
    "'Missed (' + wrong.length + ')'",
    "TT('本节全对。', 'All correct in this section.')",
    "TT('先选一个小节再交', 'Pick a section before submitting')",
  ]) assert.ok(s.includes(frag), '讲义结果页丢了英文分支：' + frag);
});

test('题库胶囊：整条按语言重写，且不依赖 HTML 里的额外节点', () => {
  const s = read('exam.js');
  assert.ok(s.includes('function paintBankPill()'), 'exam.js 缺 paintBankPill');
  /* 补丁机制会把 exam.html 来回覆盖成旧结构，所以胶囊必须自建 innerHTML 才自愈；
     只要出现对 bankQW / bankPillUnit 的外部依赖，就说明又退回了「靠 HTML 结构」的写法。 */
  assert.ok(s.includes("pill.innerHTML = (en ? 'This unit ' : '本单元 ')"), '题库胶囊没按语言重建整条');
  assert.ok(!s.includes("$('bankQW')"), '题库胶囊又依赖 exam.html 里的 bankQW 节点');
  assert.ok(!s.includes("$('bankPillUnit')"), '题库胶囊又依赖 exam.html 里的 bankPillUnit 节点');
});

test('抽查成绩页：模式标题/日期/题号位置按界面语言出', () => {
  const s = read('exam.js');
  assert.match(s, /const MODE_NAME_EN = /, '缺英文模式名');
  assert.match(s, /const EN_LANG = \(\) => OFFICIAL \|\|/, 'EN_LANG 丢了「官方模考或英文界面」判定');
  assert.ok(s.includes("toLocaleString(EN ? 'en-US' : 'zh-CN')"), '成绩页日期又只认 OFFICIAL');
  assert.match(s, /EN_LANG\(\) \? \('Question ' \+ pos \+ ' of ' \+ total\)/, '做题页题号又变成只认 OFFICIAL');
});

test('记录页时间跟界面语言走，别在英文界面印中文日期格式', () => {
  const s = read('history-page.js');
  assert.ok(s.includes("isEn() ? 'en-US' : 'zh-CN'"), '记录页时间没跟界面语言走');
  assert.ok(!s.includes("toLocaleString('zh-CN'"), '记录页把 zh-CN 又写死了');
});

test('窄屏排版：成绩页 meta 可折行、320 主标题不折成两行', () => {
  const css = read('app.css');
  assert.ok(/@media \(max-width:430px\)\{[\s\S]{0,200}\.rev-meta\{white-space:normal/.test(css), '窄屏成绩页 meta 又被写回 nowrap');
  assert.ok(/@media \(max-width:360px\)\{[\s\S]{0,160}site-shell h1\{font-size:26px/.test(css), '320 主标题字号守卫丢了');
});
