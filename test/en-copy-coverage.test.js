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

test('错题导入面板：没有失败项时不预先宣告失败，也不再摆技术术语', () => {
  const html = read('wrong.html');
  assert.ok(/id="imgimpFailHint" hidden/.test(html), '失败提示又变成常显');
  assert.ok(/id="btnImgRetry"[^>]*hidden/.test(html), '重试按钮又变成常显');
  const js = read('image-import.js');
  assert.ok(js.includes('function syncFailBar'), '缺 syncFailBar：失败区块显隐不受控');
  assert.ok(js.includes('把截图拖进来，认得出就自动进错题本。'), '导入空态又被写回长篇说明');
  assert.ok(!js.includes("' · 双模型一致'"), '又把「双模型一致」摆给用户看');
  assert.ok(!js.includes("' · 数字校验 '"), '行内又印「数字校验」');
  assert.ok(js.includes('离线识别'), '云端账号状态行被写回了推销文案');
});

test('导入面板不再摆系统说明书与内核诊断行', () => {
  const html = read('wrong.html');
  assert.ok(/id="imgimpDiag"[^>]*hidden/.test(html), '内核诊断行又显示出来了');
  assert.ok(!html.includes('两种用法：'), '「两种用法」说明段又写回来了');
  assert.ok(!html.includes('首次要下载约 7MB'), '7MB 下载说明又写回来了');
  assert.ok(!/错题记录只增不改/.test(html), '工具条上的「只增不改」说明又回来了');
});

test('记录页：错题不印内部题号、只列前 4 条、建议不带长串 id 与「每题 N 秒」', () => {
  const js = read('history-page.js');
  assert.ok(!js.includes('class="hist-wrong-id"'), '记录页又把内部题号（TD-xx）印出来了');
  assert.ok(js.includes('wrong.slice(0, 4)'), '错题列表又全量铺开');
  assert.ok(js.includes('hist-more'), '缺「还有 N 条」的出口');
  assert.ok(!js.includes('txt(p.action)'), '补强建议又拼回 Drill this skill 长句');
  assert.ok(!js.includes("ids.join(', ')"), '又拼回「(missed: TD-…）」题号串');
  assert.ok(js.includes('function trimReason'), '缺时间噪音剥离');
  assert.ok(js.includes('function fmtStamp'), '卡头日期没走短格式');
  assert.ok(/Question\\s\*\\d\+/.test(js) || js.includes('Question\\\\s'), '知识点名里的「· Question N」没剥掉');
});

test('板块标题永不出 undefined：旧编号 2.6 也报得出名字', () => {
  const core = read('app-core.js');
  assert.ok(/function sectionLabel\(s\)/.test(core), '找不到 sectionLabel');
  assert.ok(core.includes("'Section ' + s"), '缺中性兜底，缺名字时会拼出 undefined');
  assert.ok(/list\[0\]\[?.*section/.test(core) || core.includes('list[0] && list[0].section'), '缺按首题 section 找回真名的逻辑');
  assert.ok(core.includes("\\d\\.\\d\\.T"), '专项板块 id（2.7.T23）没去编号');
});

test('成绩页/做题页 body 不能因为 :has() 变成 flex 横排（会整页横向溢出）', () => {
  const css = read('app.css');
  assert.ok(!/body\.site-shell:has\(#(questionView|resultView)[^)]*\)\s*\{/.test(css),
    'body 又被 :has() 挂上 {display:flex}，做题/成绩页在手机上会横向铺开');
  assert.ok(!/body\.site-shell:has\(#resultView[^\n]*\) #appnav\{display:block/.test(css),
    '成绩页又把顶部导航拉回来，和侧栏重复一遍同样的链接');
});

test('「改进方向：」前缀不能写死中文：英文界面要换成 How to improve', () => {
  const css = read('app.css');
  assert.ok(css.includes('html[data-lang=\"en\"] .cause-box .fix::before'), '缺英文前缀');
  const wp = read('wrong-page.js');
  assert.ok(!wp.includes("' 改进方向：'"), '错题页又自己拼了一遍中文前缀');
});

test('记录页剥时间噪音的正则要吃下「平均用时 N 秒」', () => {
  const js = read('history-page.js');
  assert.ok(/平均\(每题\|每道\|用时\)/.test(js), '正则只认「平均每 N 秒」，认不出「平均用时」');
});
