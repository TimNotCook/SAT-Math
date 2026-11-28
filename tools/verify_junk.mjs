#!/usr/bin/env node
/* tools/verify_junk.mjs — 脏存档体检（只读：只在临时 profile 里种脏数据）
 *
 * 干的事：先把 localStorage 写成各种「合法 JSON 但类型/字段不对」的脏值，
 * 再逐页导航，断言
 *   ① 没有未捕获异常 / console error（页面不能打崩）
 *   ② 关键容器真的画出了东西（错题本 #wrongList、记录页 #histList 不能空）
 *   ③ 脏 session 不会把 exam.html（模考 + 单元抽查）卡成白页
 * 用临时 profile，只写本机浏览器；线上/线下两用。
 *
 * 用法：
 *   node tools/verify_junk.mjs
 *   node tools/verify_junk.mjs --base https://timnotcook.github.io/SAT-Math
 */
import { spawn } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { CHROME, tempProfile } from './lib/chrome.mjs';
import { startStaticServer } from './lib/serve.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);
const argVal = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const OUT = resolve(argVal('--out', '/tmp/junk-proof'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IGNORE_URL = /(google-analytics|gstatic|fonts\.googleapis|favicon)/;

let BASE = argVal('--base', '');
let server = null;
if (!args.includes('--base')) {
  server = await startStaticServer(ROOT, { mark: '.verify-junk-marker' });
  BASE = server.base;
}
const CDP = 9600 + Math.floor(Math.random() * 150);
mkdirSync(OUT, { recursive: true });

const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${tempProfile('vjk-')}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { proc.kill('SIGKILL'); } catch (e) {} if (server) { try { server.stop(); } catch (e) {} } };
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });
/* 起浏览器这件事本身会失败：端口撞上残留实例、负载高时 15 秒不够。
   原来固定 15 秒后直接 fetch 一次，失败了抛 ECONNREFUSED，看起来像"页面坏了"。
   现在改成轮询到真拿到 page target 为止，拿不到就明确报"浏览器没起来"并退出。 */
let tabs = null;
for (let i = 0; i < 120; i++) {
  try {
    const t = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json();
    if (Array.isArray(t) && t.some((x) => x.type === 'page' && x.webSocketDebuggerUrl)) { tabs = t; break; }
  } catch (e) {}
  await sleep(250);
}
if (!tabs) {
  console.error(`❌ Chromium 30 秒内没在 ${CDP} 端口起来（换端口或设 CHROME_BIN）。浏览器：${CHROME}`);
  cleanup(); process.exit(2);
}
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let mid = 0; const pending = new Map(); let events = [];
let current = '(none)';
ws.addEventListener('message', (evm) => {
  const m = JSON.parse(evm.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); return; }
  if (!m.method) return;
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails || {};
    events.push({ page: current, kind: 'exception', text: `${d.text || ''} ${d.exception ? (d.exception.description || d.exception.value) : ''}`.trim().slice(0, 400) });
  } else if (m.method === 'Log.entryAdded') {
    const e = m.params.entry || {};
    if (e.level === 'error' && !/net::ERR_(SOCKET_NOT_CONNECTED|CONNECTION_RESET)/i.test(e.text))
      events.push({ page: current, kind: 'console', text: `${e.source || ''}: ${e.text}`.slice(0, 400) });
  } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    events.push({ page: current, kind: 'console', text: (m.params.args || []).map((x) => x.value ?? x.description ?? '').join(' ').slice(0, 400) });
  }
});
const send = (method, params = {}) => new Promise((r) => {
  const i = ++mid; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params }));
  setTimeout(() => { if (pending.has(i)) { pending.delete(i); r({}); } }, 25000);
});
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
async function goto(url) {
  await send('Page.navigate', { url });
  for (let i = 0; i < 80; i++) { await sleep(120); if ((await ev('document.readyState')) === 'complete') break; }
  await sleep(1500);
}
await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');

/* 三套脏值档案：每套先清空 localStorage 再种，然后逐页导航。
   A 混型（对象/数组/字符串互串）；B 半截会话 + 坏导入；C 极端数值 + 版本漂移。 */
const PROFILES = [
  ['A-mixed', [
    ['tdsat_app_v1', JSON.stringify({ sections: { '1.1': { answers: { 'U1-01': { v: 1, correct: 'yes', ts: 'x' }, 'U1-02': null }, wrongLog: [{ v: 'A' }] }, 'nope': { answers: [] } }, last: { sec: 'nope', qid: 1 } })],
    ['tdsat_exam_suite_results_v1', JSON.stringify({ items: [{ date: 'yesterday', detail: {} }], n: 2 })],
    ['tdsat_exam_suite_abandoned_v1', JSON.stringify({})],
    ['tdsat_exam_suite_session_v1', JSON.stringify({ startedAt: 'x', stage: 'answer', moduleEndsAt: 'soon', paper: null })],
    ['tdsat_progress_save_v1', '{"producer":"tdsat-bluebook","version":1'],
    ['tdsat_prefs_v1', '[]'],
    ['tdsat_jy_state_v1', JSON.stringify({ answers: { 'nope-q': { v: '', correct: false }, 'U1-01': 5 }, board: 'x' })],
    ['tdsat_state_v1', JSON.stringify({ wrong: [{ id: 'U1-01', given: 'B' }, 'x'], last: 'q1' })],
    ['tdsat_wrong_import_v1', JSON.stringify({ items: 'no', n: 3 })],
  ]],
  ['B-halfsession', [
    ['tdsat_exam_suite_session_v1', JSON.stringify({ startedAt: 1700000000000, stage: 'answer', module: 'x', paper: [{ id: 'U1-01' }, 'junk'], answers: [], moduleEndsAt: null, endsAt: 'x' })],
    ['tdsat_exam_suite_results_v1', JSON.stringify([{ date: 1, detail: 'nope', total: 'x', correct: null, estimate: [], report: 'x' }, null, 5])],
    ['tdsat_exam_suite_abandoned_v1', JSON.stringify([{ startedAt: 'x', date: {} }, 7])],
    ['tdsat_prefs_v1', JSON.stringify({ tmode: 5, perQ: 'x' })],
    ['tdsat_wrong_import_v1', JSON.stringify({ items: [{ stem: {}, options: 'x', given: [] }, null], n: -1 })],
    ['tdsat_jy_state_v1', JSON.stringify([{ answers: [] }])],
    ['tdsat_app_v1', JSON.stringify({ sections: [], last: [] })],
  ]],
  ['D-auxkeys', [
    ['tdsat_crossout_v1', JSON.stringify({ 'U1-01': 'x', list: [] })],
    ['tdsat_scratch_U1-01', JSON.stringify({ strokes: 'x', w: 'wide' })],
    ['tdsat_scratch_v1', JSON.stringify([])],
    ['tdsat_exam_last_paper_v1', JSON.stringify('U1-01')],
    ['tdsat_exam_special_v1', JSON.stringify([{ id: 1, q: 'x' }, 'nope'])],
    ['tdsat_jiangyi_v1', JSON.stringify({ answers: [], board: 5 })],
    ['tdsat_theme', JSON.stringify({ mode: 'x' })],
    ['tdsat_auth_v1', JSON.stringify({ token: { nested: 1 }, uid: [] })],
    ['tdsat_imported_wrong_v1', JSON.stringify({ items: 5, n: {} })],
    ['tdsat_boot_retry_v1', 'NaN'],
  ]],
  ['C-extremes', [
    ['tdsat_app_v1', JSON.stringify({ sections: { '1.1': { answers: { 'U1-01': { v: '', correct: false, ts: -1 } }, marks: [], cursor: -5, submitted: 'yes' }, '2.1': null }, last: { sec: '1.1' } })],
    ['tdsat_exam_suite_results_v1', JSON.stringify([{ date: -1, detail: [{ id: null, correct: 'no', given: 1234567890123 }], total: -3, correct: 1e9, elapsed: -1 }])],
    ['tdsat_exam_suite_session_v1', JSON.stringify({ startedAt: 1e15, stage: 'result', finished: true, result: { detail: 3 } })],
    ['tdsat_progress_save_v1', JSON.stringify({ producer: 'tdsat-bluebook', version: 999, savedAt: 1e15, position: { sec: '1.1', n: 999 }, sections: [] })],
    ['tdsat_state_v1', 'null'],
  ]],
  /* E：作答被清空、只剩 wrongLog 台账（第 23 条）。answers 为空时错题本仍必须留住
     「曾经错过」的题；顺便给一条正常成绩记录，保证记录页不空。 */
  ['E-wronglog-only', [
    ['tdsat_app_v1', JSON.stringify({ sections: { L1: { answers: {}, wrongLog: { 'U1-01': { v: 'A', ts: 1700000000000 } } } }, last: null })],
    ['tdsat_exam_suite_results_v1', JSON.stringify([{ date: 1700000000000, mode: 'quiz', unit: '1.1', total: 10, correct: 7, elapsed: 600, detail: [] }])],
  ]],
  /* H：成绩记录的 report / estimate 是错类型（第 25 条）。记录页必须照常渲染，
     不能因为 priority 是字符串或条目是 null 就在 prioRows 里 TypeError。 */
  ['H-bad-report', [
    ['tdsat_exam_suite_results_v1', JSON.stringify([
      { date: 1700000000000, mode: 'mock', total: 22, correct: 5, elapsed: 60, detail: [], report: { priority: 'x' }, estimate: { raw: 'x', rawMax: null, path: 5 } },
      { date: 1700000000001, mode: 'mock', total: 22, correct: 4, elapsed: 60, detail: [null, 5], report: { priority: [{ name: '换元', reason: 5 }, null] }, estimate: 'nope' }
    ])],
    ['tdsat_app_v1', JSON.stringify({ sections: { L1: { answers: { 'U1-01': { v: 'A', correct: false, ts: 1 } } } }, last: null })],
  ]],
  /* J：导入错题 stem 是对象/数组（第 27 条）。渲染环节不能 .trim() 崩页。 */
  ['J-import-stem', [
    ['tdsat_imported_wrong_v1', JSON.stringify({ items: [
      { key: 'st:o', stem: { x: 1 }, type: 'mcq', answer: 'A', given: 'A', choices: { A: '1' } },
      { key: 'st:a', stem: ['1+1=?'], type: 'mcq', answer: 'A', given: 'A', choices: { A: '2' } }
    ] })],
    ['tdsat_exam_suite_results_v1', JSON.stringify([{ date: 1700000000000, mode: 'quiz', unit: '1.1', total: 10, correct: 7, elapsed: 600, detail: [] }])],
  ]],
  /* K：导入错题的展示字段全是对象（第 28 条）。不能把 [object Object] 端给用户。 */
  ['K-import-objects', [
    ['tdsat_imported_wrong_v1', JSON.stringify({ items: [
      { key: 'ob:1', stem: 'Test', choices: { A: { x: 1 } }, type: 'mcq', answer: { x: 1 }, given: { y: 2 }, topic: { x: 1 }, source: { x: 1 }, importedAt: { x: 1 }, readOnly: true, matchId: { x: 1 } }
    ] })],
  ]],
  /* L：成绩记录所有展示字段都是对象（第 29 条）。不能把 [object Object]/NaN 端给用户。 */
  ['L-history-objects', [
    ['tdsat_exam_suite_results_v1', JSON.stringify([{
      date: { x: 1 }, mode: { x: 1 }, unit: { x: 1 }, board: { x: 1 }, section: { x: 1 },
      total: { x: 1 }, correct: { x: 1 }, elapsed: { x: 1 },
      detail: [{ id: { x: 1 }, given: { x: 1 }, answer: { x: 1 }, topic: { x: 1 }, correct: false }],
      report: { priority: [{ name: { x: 1 }, reason: { x: 1 }, action: { x: 1 }, wrongIds: [{ x: 1 }] }] }
    }])],
  ]],
  /* M：未交卷留档的字段是对象（旧版/云端合并）。开场恢复条不能出现
     Invalid Date / [object Object] / NaN。 */
  ['M-void-objects', [
    ['tdsat_exam_suite_results_v1', JSON.stringify([{
      void: true, date: { x: 1 }, answered: { x: 1 }, total: [1], reason: { x: 1 }, mode: { x: 1 }
    }])],
  ]],
  /* I：导入错题历史记录里 given 是对象/数字（第 26 条）。分析环节不能 .trim() 崩页。 */
  ['I-import-given', [
    ['tdsat_imported_wrong_v1', JSON.stringify({ items: [
      { key: 's:x', stem: '1+1=?', type: 'mcq', answer: 'A', given: { x: 1 }, choices: { A: '2', B: '3' } },
      { key: 's:y', stem: '2+2=?', type: 'mcq', answer: 'B', given: 123, choices: { A: '3', B: '4' }, matchId: 'U1-01', readOnly: true }
    ] })],
    ['tdsat_exam_suite_results_v1', JSON.stringify([{ date: 1700000000000, mode: 'quiz', unit: '1.1', total: 10, correct: 7, elapsed: 600, detail: [] }])],
  ]],
];

const PAGES = ['index.html', 'wrong.html', 'history.html', 'drill.html', 'exam.html?mode=mock', 'exam.html?mode=quiz&unit=1.1', 'jiangyi.html'];
const summary = [];
const offenders = [];
for (const [pname, junk] of PROFILES) {
  summary.push(`\n=== ${pname} ===`);
  await goto(`${BASE}/index.html`);
  await ev('localStorage.clear()');
  for (const [k, v] of junk) await ev(`localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)})`);
  for (const p of PAGES) {
    current = pname + ' ' + p;
    events = [];
    await goto(`${BASE}/${p}`);
    const probe = await ev(`(function(){
      var ids=['wrongList','histList','questionView','introView'];
      var out={};
      ids.forEach(function(id){ var el=document.getElementById(id); if(el) out[id]=String(el.textContent||'').trim().length; });
      var body=String(document.body.innerText||'');
      out.objLeak=body.indexOf('[object Object]')>=0;
      out.badText=out.objLeak || body.indexOf('Invalid Date')>=0 || body.indexOf('NaN')>=0 || body.indexOf('undefined')>=0 || body.indexOf('Infinity')>=0;
      return out; })()`);
    /* 单元抽查：Start 之前 newSession() 会先读题库/导入仓库/历史，脏字段正是在这炸。
       真点一下 Start，确认不是「首页能画、一开考就白」。 */
    if (p === 'exam.html?mode=quiz&unit=1.1') {
      let start = false;
      for (let i = 0; i < 80 && !start; i++) {   /* 别点成兜底 Reload，也别在脚本还没绑定时抢跑 */
        start = await ev(`(function(){var b=document.getElementById('btnStart');if(!b)return false;
          var label=String(b.textContent||'').trim();
          return !!(b.offsetParent!==null && !b.disabled && label!=='Reload' && label!=='重新加载');})()`);
        if (!start) await sleep(250);
      }
      if (start) { await ev(`document.getElementById('btnStart').click()`); await sleep(600); }
      let stage = { chars: 0 };
      for (let i = 0; i < 60; i++) {              /* 等首题真正画出来，别拿加载中的空页判红 */
        stage = await ev(`(function(){var t=String(document.body.innerText||'').replace(/\s+/g,' ').trim();
          return { chars: t.length, head: t.slice(0, 60) }; })()`);
        if (stage && stage.chars >= 200) break;
        await sleep(250);
      }
      const paper = await ev(`(function(){
        var s=null; try { s=JSON.parse(localStorage.getItem('tdsat_exam_suite_session_v1')||'null'); } catch(e) {}
        if(!s||!Array.isArray(s.paper)) return {ok:false,why:'no-session'};
        var bank=(window.TD_BANK&&window.TD_BANK.questions)||[]; var ids={};
        bank.forEach(function(q){ if(q&&q.unit===1)ids[q.id]=1; });
        var bad=s.paper.filter(function(x){return !x||!ids[x.id];}).length;
        var ans=Object.keys(s.answers||{}).length;
        return {ok:s&&s.mode==='quiz'&&bad===0&&ans>=s.paper.length, mode:s&&s.mode, bad:bad, ans:ans, n:s.paper.length, sample:(s.paper[0]||{}).id};
      })()`);
      summary.push(`  quiz 落点：Start 可点=${start} · 正文 ${stage.chars} 字 · 卷面 ${JSON.stringify(paper)}`);
      if (stage.chars < 80) offenders.push({ profile: pname, page: p, errs: [{ text: '单元抽查点击 Start 后白屏（正文几乎为空）' }] });
      if (!paper || !paper.ok) offenders.push({ profile: pname, page: p, errs: [{ text: '单元抽查卷面不属于当前单元/答案未覆盖：' + JSON.stringify(paper) }] });
    }
    const errs = events.filter((e) => e.kind === 'exception' || (e.kind === 'console' && !IGNORE_URL.test(e.text) && !/Failed to load resource/i.test(e.text)));
    summary.push(`${p}: 异常/错误 ${errs.length} 项 · 容器字数 ${JSON.stringify(probe)}`);
    for (const e of errs.slice(0, 5)) summary.push(`  [${e.kind}] ${e.text}`);
    if (errs.length) offenders.push({ profile: pname, page: p, errs });
    if (p === 'exam.html?mode=mock') {
      const stage = await ev(`(function(){
        var b=document.getElementById('btnStart');
        var t=String(document.body.textContent||'').replace(/\s+/g,' ').trim();
        return { start: !!(b && b.offsetParent !== null), chars: t.length }; })()`);
      summary.push(`  exam 落点：Start 可见=${stage.start} · 正文 ${stage.chars} 字`);
      if (!stage.start && stage.chars < 200) offenders.push({ profile: pname, page: p, errs: [{ text: 'exam 白屏（无 Start、正文过短）' }] });
    }
    if (p === 'wrong.html' && probe && probe.wrongList === 0) offenders.push({ profile: pname, page: p, errs: [{ text: '#wrongList 空白' }] });
    if (p === 'history.html' && probe && probe.histList === 0) offenders.push({ profile: pname, page: p, errs: [{ text: '#histList 空白' }] });
    if (probe && probe.badText) offenders.push({ profile: pname, page: p, errs: [{ text: '页面正文出现 [object Object]/Invalid Date' }] });
  }
}

console.log(summary.join('\n'));
writeFileSync(join(OUT, 'junk.json'), JSON.stringify({ offenders }, null, 1));
console.log(offenders.length ? `\n❌ ${offenders.length} 项不合格` : `\n✅ ${PROFILES.length} 套脏值 × 七页（含单元抽查开考）均不崩、容器非空`);
console.log(`截图/明细：${OUT}`);
cleanup();
process.exit(offenders.length ? 1 : 0);
