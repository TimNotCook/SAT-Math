#!/usr/bin/env node
/* tools/verify_exam_timeout.mjs — 模考计时到点的用户路径（只读，只动浏览器 localStorage）
 *
 * 为什么单独一条：35 分钟的真实计时谁也不会坐着等，于是「到点会发生什么」
 * 长期只能靠读代码相信。本脚本把比时字段改到过去，用真实页面跑完整条路径：
 *   ① 起卷 → 答题视图，22 题、Module 1
 *   ② Module 1 到点 + 重载 → 开始页明示「现在在 Module 2」，点 Start 后卷面补齐 44 题
 *   ③ 总时间到点 + 重载 → 点 Start 直接出分：finished/auto/endReason=time，
 *      results 里多一条 total=44 的记录，结果页文案是 Auto-submitted
 * 判据全在页面真实状态与 localStorage 上，不 mock 任何东西。
 *
 * 用法：
 *   node tools/verify_exam_timeout.mjs
 *   node tools/verify_exam_timeout.mjs --base https://timnotcook.github.io/SAT-Math --out /tmp/timeout-proof
 *   CHROME_BIN=/usr/bin/chromium node tools/verify_exam_timeout.mjs     # Linux
 */
import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { randomBytes } from 'crypto';
import { CHROME, HEADLESS_ARGS, tempProfile } from './lib/chrome.mjs';
import { startStaticServer } from './lib/serve.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);
const argVal = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const HAS_BASE = args.includes('--base');
const OUT = resolve(argVal('--out', '/tmp/timeout-proof'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const KEY_SESSION = 'tdsat_exam_suite_session_v1';
const KEY_RESULTS = 'tdsat_exam_suite_results_v1';

let BASE = argVal('--base', '');
let server = null;
if (!HAS_BASE) {
  let srvLocal = null;
try {
  srvLocal = await startStaticServer(ROOT, { mark: '.verify-timeout-marker' });
  BASE = srvLocal.base;
  server = srvLocal;
} catch (e) {
  console.error('无法起本仓库静态服务器，请用 --base：' + e.message);
  process.exit(2);
}
}

const CDP = 9700 + Math.floor(Math.random() * 90);
mkdirSync(OUT, { recursive: true });
const proc = spawn(CHROME, [...HEADLESS_ARGS, `--remote-debugging-port=${CDP}`, `--user-data-dir=${tempProfile('vet-')}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
cleanupGuards();
function cleanupGuards() {
  const kill = () => { try { proc.kill('SIGKILL'); } catch (e) {} if (server) { try { server.stop(); } catch (e) {} } };
  process.on('exit', kill);
  process.on('SIGINT', () => { kill(); process.exit(130); });
}
for (let i = 0; i < 80; i++) {
  try { if ((await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok) break; } catch (e) {}
  await sleep(250);
}
const tabs = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json();
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let mid = 0; const pending = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise((r) => {
  const i = ++mid; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params }));
  setTimeout(() => { if (pending.has(i)) { pending.delete(i); r({}); } }, 25000);
});
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) return '__ERR__' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text || '');
  return r.result?.value;
};
await send('Runtime.enable'); await send('Page.enable');

/* 本地 python http.server 冷启动或并发拉十几个大文件时偶尔会 reset 掉某个
   defer 脚本（exam-core.js 掉线 → exam.js 第 6 行 C 未定义 → 整页点不动）。
   这是跑批环境的毛病，不是站点行为：失败时整页重载一次（最多 3 次），
   期间把失败原因打在日志里，绝不静默。线上 CDN 不复现。 */
async function goto(url, label = '') {
  for (let attempt = 0; attempt < 3; attempt++) {
    const u = attempt === 0 ? url : url + (url.includes('?') ? '&' : '?') + 'retry=' + attempt;
    await send('Page.navigate', { url: u });
    for (let i = 0; i < 90; i++) { await sleep(120); if ((await ev('document.readyState')) === 'complete') break; }
    let booted = false;
    for (let i = 0; i < 60; i++) {
      booted = !!(await ev(`(function(){var b=document.getElementById('btnStart');return !!(b&&window.__TD_EXAM__);})()`));
      if (booted) break;
      await sleep(150);
    }
    if (booted) { await sleep(300); return; }
    console.log(`WARN ${label} 第 ${attempt + 1} 次加载未完成（exam-core/exam.js 未就绪），整页重载`);
  }
  throw new Error(`${label} 连续 3 次加载不完整：exam-core.js 或 exam.js 没起来`);
}
async function startExam() {
  /* 监听未挂上时第一次点击可能落空，按状态重试而不是赌一次成功。 */
  for (let k = 0; k < 4; k++) {
    await ev(`(function(){var b=document.getElementById('btnStart');if(b)b.click();})()`);
    for (let i = 0; i < 14; i++) {
      await sleep(200);
      const st = await ev(`(function(){var s=document.querySelector('.stage.active');return s?s.id:'none';})()`);
      if (st !== 'stage-intro') return st;
    }
  }
  return await ev(`(function(){var s=document.querySelector('.stage.active');return s?s.id:'none';})()`);
}

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail: String(detail) }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  [' + detail + ']' : '')); };
const cap = async (slug) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  if (r?.data) writeFileSync(join(OUT, slug + '.png'), Buffer.from(r.data, 'base64'));
};

/* ---------- ① 起卷 ---------- */
await goto(`${BASE}/exam.html?mode=mock`, '起卷');
const stage1 = await startExam();
const s1 = await ev(`(function(){var s=JSON.parse(localStorage.getItem('${KEY_SESSION}')||'null');return s?{paper:s.paper.length,module:s.module,finished:s.finished}:null;})()`);
check('起卷进入答题视图', stage1 === 'stage-answer', `stage=${stage1}`);
check('起卷卷面为 Module 1 的 22 题', s1 && s1.paper === 22 && s1.module === 1, JSON.stringify(s1));
await cap('timeout-1-start');

/* ---------- ② Module 1 到点 ---------- */
await ev(`(function(){var k='${KEY_SESSION}';var s=JSON.parse(localStorage.getItem(k));var now=Date.now();
  s.moduleEndsAt=now-1000; s.endsAt=now+4000; localStorage.setItem(k,JSON.stringify(s)); })()`);
await goto(`${BASE}/exam.html?mode=mock`, 'Module1 到点');
const introNote = await ev(`(function(){var n=document.getElementById('introNotice');return n&&!n.hidden?n.textContent.trim():'';})()`);
/* 开场页零提示：Module 1 到点后不该再往页面上写说明条（模块信息靠参数条与 toast）。 */
check('Module 1 到点后开始页不写说明条', introNote === '', introNote.slice(0, 90));
const stage2 = await startExam();
const s2 = await ev(`(function(){var s=JSON.parse(localStorage.getItem('${KEY_SESSION}')||'null');return s?{paper:s.paper.length,module:s.module,finished:s.finished,endsIn:Math.round((s.endsAt-Date.now())/1000)}:null;})()`);
check('点 Start 后进答题视图且卷面补齐 44 题（Module 2）', stage2 === 'stage-answer' && s2 && s2.paper === 44 && s2.module === 2, JSON.stringify({ stage2, s2 }));
await cap('timeout-2-module2');

/* ---------- ②b 在 Module 2 里故意答错一题：自动交卷后必须进错题本 ----------
   计时到点这条路径以前没人验过「错的那道到底有没有记下来」：最终成绩页有了、
   记录有了，但错题本可能是空的。这里真点错一个选项，交卷后两边都对。 */
/* 选一道「在 CATALOG 里真的存在」的 MCQ（卷面里可能混着不在生效池的题），
   再用 Next 跳到它，最后点一个与正确答案不同的选项。 */
const pickInfo = await ev(`(function(){
  var s = JSON.parse(localStorage.getItem('${KEY_SESSION}') || 'null');
  if (!s || !s.paper || !s.paper.length) return { err: 'no paper' };
  /* 模考页不加载 app-core.js，window.TD_APP.CATALOG 是空的（实测 catKeys=0），
     题库真相在 TD_BANK.all 里，按 id 直接查。 */
  var B = window.TD_BANK || {};
  var all = B.all || B.questions || [], map = {};
  all.forEach(function (x) { if (x && x.id && !map[x.id]) map[x.id] = x; });
  /* 进 Module 2 后页面停在 s.idx（= m1Size），从当前位置往后找，避免"算的是第 0 题、
     点的却是当前这题"的错位。 */
  for (var i = (s.idx || 0); i < s.paper.length; i++) {
    var q = map[s.paper[i].id];
    /* 错题本会跳过 dup（与教材同题干的精编重题）与 retired/merged，这里同样跳过，
       否则会出现"结果记录里有错题、错题本里被去重掉"的假红。 */
    if (q && q.type === 'mcq' && /^[A-D]$/.test(String(q.answer)) && !q.dup && !q.retired && !q.mergedInto) {
      return { idx: i, qid: q.id, right: String(q.answer), pos: s.idx, steps: i - (s.idx || 0) };
    }
  }
  return { err: 'no resolvable mcq in paper', bankSize: all.length, sampleIds: s.paper.slice(0, 5).map(function (x) { return x.id; }) };
})()`);
check('卷面里能找到一道可定位的 MCQ', pickInfo && !pickInfo.err, JSON.stringify(pickInfo));

let picked = pickInfo;
if (pickInfo && !pickInfo.err) {
  for (let k = 0; k < pickInfo.steps; k++) {
    await ev(`(function(){var b=document.getElementById('btnNext');if(b)b.click();})()`);
    await sleep(120);
  }
  picked = await ev(`(function(){
    var right = '${pickInfo && pickInfo.right}';
    var rows = document.querySelectorAll('#answerArea .drill-choice-row');
    if (!rows.length) return { err: 'no rows at target question', qid: '${pickInfo && pickInfo.qid}' };
    var wrongLetter = null;
    rows.forEach(function (r) { if (!wrongLetter && r.dataset.choice !== right) wrongLetter = r.dataset.choice; });
    var btn = document.querySelector('#answerArea .drill-choice-row[data-choice="' + wrongLetter + '"] .drill-choice');
    if (!btn) return { err: 'option missing: ' + wrongLetter, qid: '${pickInfo && pickInfo.qid}' };
    btn.click();
    var after = JSON.parse(localStorage.getItem('${KEY_SESSION}') || 'null');
    var sv = null;
    if (after) Object.keys(after.answers).forEach(function (u) { if (after.answers[u] && after.answers[u].v === wrongLetter) sv = after.answers[u].v; });
    return { qid: '${pickInfo && pickInfo.qid}', given: wrongLetter, right: right, stored: sv, pos: '${pickInfo && pickInfo.idx}' };
  })()`);
}
check('Module 2 里能点错一个选项', picked && picked.qid && picked.given && picked.given !== picked.right, JSON.stringify(picked));

/* ---------- ②c 刷新页面不能吃掉 Module 2 的作答 ----------
   考试中途刷新（换窗口、浏览器崩了重开）是真实高频动作。会话在 localStorage，
   作答必须还在，页面上也必须还是选中的那个。 */
await goto(`${BASE}/exam.html?mode=mock`, 'Module2 刷新恢复');
/* 刷新后落在开始页（设计如此：明确告诉学生「计时没停，点 Start 继续」），
   点 Start 才回到答题视图；不点就断言选中态等于测了个没渲染的页面。 */
const stageReload = await startExam();
const afterReload = await ev(`(function(){
  var s = JSON.parse(localStorage.getItem('${KEY_SESSION}') || 'null');
  if (!s) return { err: 'no session' };
  var hits = [];
  Object.keys(s.answers || {}).forEach(function (u) { var a = s.answers[u]; if (a && a.v === '${picked && picked.given}' && ${JSON.stringify(picked && picked.qid)}) hits.push(u); });
  var sel = document.querySelectorAll('#answerArea .drill-choice.is-selected').length;
  var cur = s.paper[s.idx] ? s.paper[s.idx].id : null;
  return { stored: hits.length, selected: sel, module: s.module, cur: cur, stage: '${stageReload}' };
})()`);
check('刷新后 Module 2 作答仍在（存档 + 点 Start 后选中态）', afterReload && afterReload.stored >= 1 && afterReload.selected === 1, JSON.stringify(afterReload));

/* ---------- ③ 总时间到点 → 自动交卷 ---------- */
const before = await ev(`(function(){var r=JSON.parse(localStorage.getItem('${KEY_RESULTS}')||'[]');return Array.isArray(r)?r.length:-1;})()`);
/* 不刷新页面，让真实倒计时自己走到零：这条路径才是用户遇到的自动交卷。
   （刷新再改 endsAt 会把 Module 2 的作答一起丢掉，那是另一条待验的路径。） */
const stage3 = await (async () => {
  for (let i = 0; i < 80; i++) {
    const st = await ev(`(function(){var s=document.querySelector('.stage.active');return s?s.id:'none';})()`);
    if (st === 'stage-result') return st;
    await sleep(250);
  }
  return 'timeout';
})();
for (let i = 0; i < 20; i++) {
  const st = await ev(`(function(){var s=document.querySelector('.stage.active');return s?s.id:'none';})()`);
  if (st === 'stage-result') break;
  await sleep(250);
}
const fin = await ev(`(function(){
  var k='${KEY_SESSION}', rk='${KEY_RESULTS}';
  var s=JSON.parse(localStorage.getItem(k)||'null'); var all=JSON.parse(localStorage.getItem(rk)||'[]');
  var st=document.querySelector('.stage.active'); var res=document.getElementById('stage-result');
  var last=Array.isArray(all)&&all.length?all[all.length-1]:null;
  var vis = Array.prototype.map.call(document.querySelectorAll('.stage'), function(v){ return v.id + (v.hidden ? ':hidden' : ':shown'); });
  return { stage: st?st.id:'none', stages: vis.join(' '), finished: s&&s.finished, auto: s&&s.auto, endReason: s&&s.endReason,
           nBefore: ${before}, nAfter: Array.isArray(all)?all.length:-1,
           rec: last?{total:last.total,auto:!!last.auto,reason:last.reason,correct:last.correct,path:last.path}:null,
           text: ((res&&res.innerText)||'').replace(/\\s+/g,' ').slice(0,200) };
})()`);
await cap('timeout-3-result');
console.log('STAGES:', fin && fin.stages);
check('计时归零后停在成绩页', fin && fin.stage === 'stage-result', JSON.stringify(fin && fin.stage));
check('会话标记 finished / auto / endReason=time', fin && fin.finished === true && fin.auto === true && fin.endReason === 'time', JSON.stringify(fin && { f: fin.finished, a: fin.auto, r: fin.endReason }));
check('自动交卷落一条 44 题成绩记录（不重复写）', fin && fin.rec && fin.rec.total === 44 && fin.rec.auto === true && fin.rec.reason === 'time' && fin.nAfter === fin.nBefore + 1, JSON.stringify(fin && { rec: fin.rec, before: fin.nBefore, after: fin.nAfter }));
check('成绩页文案标明 Auto-submitted 与模块二路径', fin && /Auto-submitted/i.test(fin.text) && /Module 2 path/i.test(fin.text), fin && fin.text);

/* ---------- ③b 自动交卷的错题必须进错题本（错题回顾页真出现卡片） ---------- */
const wantQid = picked && picked.qid;
const wantGiven = picked && picked.given;
const wrongDetail = await ev(`(function(){
  var all = JSON.parse(localStorage.getItem('${KEY_RESULTS}') || '[]');
  var last = all.length ? all[all.length - 1] : null;
  if (!last) return { err: 'no result' };
  var hits = (last.detail || []).filter(function (d) { return d.id === ${JSON.stringify(wantQid)}; });
  /* 同一道题可能在卷面里出现两次（Module 1 / Module 2 各一次），
     取「真答过的那一份」——没答的那份 given 是空串。 */
  var hit = hits.filter(function (d) { return d.given !== ''; })[0] || hits[0];
  return hit ? { id: hit.id, given: hit.given, correct: hit.correct, copies: hits.length } : { missing: ${JSON.stringify(wantQid)} };
})()`);
check('成绩记录里那道错题被标为 incorrect 且记下了原答案', wrongDetail && wrongDetail.correct === false && wrongDetail.given === wantGiven, JSON.stringify(wrongDetail));

await ev(`location.href = '${BASE}/wrong.html'`);
for (let i = 0; i < 60; i++) {
  await sleep(150);
  const ready = await ev(`(function(){return !!(window.TD_APP && document.getElementById('wrongList'));})()`);
  if (ready) break;
}
/* 线上题库几 MB，慢的时候 TD_BANK 还是空的：这时读到的 unit 是 0，
   点 data-unit="0" 必然点空 → 假红。先等到题库真有内容。 */
for (let i = 0; i < 80; i++) {
  const banked = await ev(`(function(){var B=window.TD_BANK||{};var a=B.all||B.questions||[];return Array.isArray(a)&&a.length>0;})()`);
  if (banked) break;
  await sleep(150);
}
/* 错题页默认只展示一个单元，先按题目所属 unit 切筛选，否则会误判"没进错题本" */
const wantUnit = await ev(`(function(){
  var want = ${JSON.stringify(wantQid)};
  var B = window.TD_BANK || {}, all = B.all || B.questions || [];
  var q = all.filter(function (x) { return x.id === want; })[0];
  return q ? q.unit : 0;
})()`);
/* 等筛选按钮真画出来再点：首屏慢时 render() 还没跑到 unitFilter，click 落空。 */
for (let i = 0; i < 60; i++) {
  const hasBtn = await ev(`!!document.querySelector('#unitFilter .filter-btn[data-unit="${wantUnit}"]')`);
  if (hasBtn) break;
  await sleep(150);
}
const applyFilter = `(function(){
  var u = ${JSON.stringify(wantUnit)};
  var b = document.querySelector('#unitFilter .filter-btn[data-unit="' + u + '"]');
  if (b) b.click();
})()`;
await ev(applyFilter);
await sleep(300);
/* 兜底：页面若在结果写完前就渲染成空列表，让页面重算一次错题集合。 */
let wrongCards = null;
for (let attempt = 0; attempt < 3; attempt++) {
  wrongCards = await ev(`(function(){
  var list = document.getElementById('wrongList');
  var cards = document.querySelectorAll('#wrongList > *').length;
  var txt = list ? list.innerText : '';
  /* 卷面里的 id 可能是别名（如 TD-15-01 → U1-12），错题本按 canonical 展示，
     标签要跟着 canonical 走，否则会误判「没进错题本」。 */
  var want = '${wantQid}';
  var alias = window.TD_ALIAS || {};
  var canon = alias[want] || want;
  var B = window.TD_BANK || {}, all = B.all || B.questions || [];
  var q = all.filter(function (x) { return x.id === canon; })[0] || all.filter(function (x) { return x.id === want; })[0];
  var label = q ? (q.section + ' · 第 ' + q.no + ' 题') : '';
  return { cards: cards, label: label, hasLabel: label ? txt.indexOf(label) >= 0 : false, text: txt.replace(/\s+/g, ' ').slice(0, 140) };
})()`);
  if (wrongCards && wrongCards.cards >= 1) break;
  await ev(`(function(){ var W=window.TD_IMPORT_WRONG; if(W&&W.refresh) W.refresh(); })()`);
  await ev(applyFilter);
  await sleep(400);
}
check('错题回顾页出现这道题（按 板块 · 第 N 题 定位）', wrongCards && wrongCards.cards >= 1 && wrongCards.hasLabel, JSON.stringify(wrongCards));
await cap('timeout-4-wrongbook');

const pass = results.filter((r) => r.ok).length;
console.log(`\n${pass}/${results.length} 通过，截图在 ${OUT}`);
process.exit(results.some((r) => !r.ok) ? 1 : 0);
