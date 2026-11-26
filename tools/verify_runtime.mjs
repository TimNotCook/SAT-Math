#!/usr/bin/env node
/* tools/verify_runtime.mjs — 线上/本地运行时体检（只读）
 *
 * 干的事：逐页导航，收集
 *   ① JS 未捕获异常（Runtime.exceptionThrown）
 *   ② console.error / 日志错误（Log.entryAdded, level=error）
 *   ③ 本地资源 4xx/5xx（Network.responseReceived）
 *   ④ 加载失败（Network.loadingFailed）
 * 全程只 goto / click / 读事件，不写库、不改文件。
 *
 * 用法：
 *   node tools/verify_runtime.mjs
 *   node tools/verify_runtime.mjs --base https://timnotcook.github.io/SAT-Math --out /tmp/runtime-proof
 */
import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { randomBytes } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);
const argVal = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const HAS_BASE = args.includes('--base');
const OUT = resolve(argVal('--out', '/tmp/runtime-proof'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PAGES = ['index.html', 'drill.html', 'exam.html', 'wrong.html', 'jiangyi.html', 'history.html'];
const IGNORE_URL = /(google-analytics|gstatic|fonts\.googleapis|favicon)/;

let BASE = argVal('--base', '');
let server = null;
if (!HAS_BASE) {
  const MARK = '.verify-runtime-marker';
  const TOKEN = randomBytes(6).toString('hex');
  for (let i = 0; i < 8 && !BASE; i++) {
    const cand = 8300 + Math.floor(Math.random() * 600);
    const srv = spawn('python3', ['-m', 'http.server', String(cand), '--directory', ROOT], { stdio: 'ignore' });
    await sleep(600);
    try {
      writeFileSync(join(ROOT, MARK), TOKEN);
      const r = await fetch(`http://127.0.0.1:${cand}/${MARK}`, { cache: 'no-store' });
      if (r.ok && (await r.text()).trim() === TOKEN) { server = srv; BASE = `http://127.0.0.1:${cand}`; }
      else srv.kill('SIGKILL');
    } catch (e) { try { srv.kill('SIGKILL'); } catch (e2) {} }
  }
  try { unlinkSync(join(ROOT, MARK)); } catch (e) {}
  if (!BASE) { console.error('无法起本仓库静态服务器，请用 --base'); process.exit(2); }
}
const CDP = 9800 + Math.floor(Math.random() * 150);
mkdirSync(OUT, { recursive: true });

const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=/tmp/vrt-${Date.now()}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { proc.kill('SIGKILL'); } catch (e) {} if (server) { try { server.kill('SIGKILL'); } catch (e) {} } };
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok) break; } catch (e) {}
  await sleep(250);
}
const tabs = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json();
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let mid = 0; const pending = new Map(); const events = new Map(); // page -> []
let current = '(none)';
ws.addEventListener('message', (evm) => {
  const m = JSON.parse(evm.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); return; }
  if (!m.method) return;
  const bucket = events.get(current) || [];
  const add = (kind, text) => bucket.push({ kind, text });
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails || {};
    add('exception', `${d.text || ''} ${d.exception ? (d.exception.description || d.exception.value) : ''}`.trim().slice(0, 400));
  } else if (m.method === 'Log.entryAdded') {
    const e = m.params.entry || {};
    if (e.level === 'error') {
      /* 同上：headless 自己把连接掐了，Log 里会以 console 形式再报一遍“Failed to load resource”。
         只有连接级 reset/not-connected 才算噪声；404/500 真错会走 http 桶，不会被吞。 */
      if (/Failed to load resource: net::ERR_(SOCKET_NOT_CONNECTED|CONNECTION_RESET)/i.test(e.text)) add('noise', e.text.slice(0, 200));
      else add('console', `${e.source || ''}: ${e.text}`.slice(0, 400));
    }
  } else if (m.method === 'Runtime.consoleAPICalled') {
    const a = (m.params.args || []).map((x) => x.value ?? x.description ?? '').join(' ');
    if (m.params.type === 'error') add('console', a.slice(0, 400));
  } else if (m.method === 'Network.responseReceived') {
    const r = m.params.response || {};
    if (r.status >= 400) add('http', `${r.status} ${r.url}`.slice(0, 400));
  } else if (m.method === 'Network.loadingFailed') {
    const u = (m.params.errorText || '') + ' ' + (m.params.blockedReason || '');
    /* headless 在 location.replace 期间会主动断 socket，报 ERR_SOCKET_NOT_CONNECTED /
       ERR_CONNECTION_RESET 且没有 URL；这类噪声单独记 INFO，不算站点缺陷。 */
    if (/^net::ERR_(SOCKET_NOT_CONNECTED|CONNECTION_RESET)\s*$/i.test(u.trim())) add('noise', u.trim());
    else add('netfail', u.slice(0, 200));
  }
  events.set(current, bucket);
});
const send = (method, params = {}) => new Promise((r) => {
  const i = ++mid; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params }));
  setTimeout(() => { if (pending.has(i)) { pending.delete(i); r({}); } }, 25000);
});
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
async function goto(url) {
  await send('Page.navigate', { url });
  for (let i = 0; i < 80; i++) { await sleep(120); if ((await ev('document.readyState')) === 'complete') break; }
  await sleep(1200);
}
await send('Runtime.enable');
await send('Log.enable');
await send('Network.enable');
await send('Page.enable');

const summary = [];
for (const p of PAGES) {
  current = p;
  events.set(current, []);
  /* exam.html 无 mode 参数会 replace 到 drill.html，必须带 mode 才有 intro 阶段 */
  await goto(p === 'exam.html' ? `${BASE}/exam.html?mode=mock` : `${BASE}/${p}`);
  /* drill：进第一套练习 → 答一题 → 连点下一题 → 交卷 → 结果页 */
  if (p === 'drill.html') {
    const started = await ev(`(function(){
      var r = document.querySelector('.drill-section-row');
      if (!r) return 'no-row';
      r.click(); return 'ok'; })()`);
    await sleep(1500);
    const answered = await ev(`(function(){
      var b = document.querySelector('#answerArea .drill-choice');
      if (!b) return 'no-choice';
      b.click(); return 'ok'; })()`);
    await sleep(600);
    let steps = 0;
    for (let k = 0; k < 2; k++) {
      const n = await ev(`(function(){ var b=document.getElementById('btnNext'); if(!b||b.disabled) return false; b.click(); return true; })()`);
      if (!n) break;
      steps++; await sleep(700);
      const a2 = await ev(`(function(){ var b=document.querySelector('#answerArea .drill-choice'); if(!b) return false; b.click(); return true; })()`);
      await sleep(400);
    }
    const fin = await ev(`(function(){ var b=document.getElementById('btnFinish'); if(!b) return false; b.click(); return true; })()`);
    await sleep(1600);
    const view = await ev(`(function(){
      var rv=document.getElementById('resultView'), qv=document.getElementById('questionView');
      return { result: !!(rv && !rv.hidden), question: !!(qv && !qv.hidden) }; })()`);
    summary.push(`drill 交互：起练=${started} 答题=${answered} 翻页=${steps} 交卷=${fin} 结果视图=${view && view.result}`);
  }
  /* exam：开始 → 答题 → 连点 next；若这份卷子里有 line-answer 题（linear-graph），
     从题号面板跳过去点开开关 —— 这条专治 exam.js 里 T 被同名遮蔽导致 renderQuestion 抛 TypeError。 */
  if (p === 'exam.html') {
    const started = await ev(`(function(){ var b=document.getElementById('btnStart'); if(!b) return false; b.click(); return true; })()`);
    await sleep(1700);
    let answered = 0, nexts = 0;
    for (let k = 0; k < 4; k++) {
      const a = await ev(`(function(){ var b=document.querySelector('#answerArea .drill-choice:not(:disabled)'); if(!b) return false; b.click(); return true; })()`);
      if (a) answered++;
      await sleep(350);
      const n = await ev(`(function(){ var b=document.getElementById('btnNext'); if(!b||b.disabled) return false; b.click(); return true; })()`);
      if (n) nexts++;
      await sleep(500);
    }
    const stage = await ev(`(function(){ var t=document.getElementById('tbStage'); return t ? t.textContent.trim() : ''; })()`);
    const plan = await ev(`(function(){
      var S=JSON.parse(localStorage.getItem('tdsat_exam_suite_session_v1')||'{}');
      var m=S.mock||S.quiz||S, arr=(m&&m.paper||[]).map(function(x){return x.id;});
      var line=[];(window.TD_BANK?TD_BANK.questions:[]).forEach(function(q){ if(window.TD_FIG&&TD_FIG.hasLine(q)) line.push(q.id); });
      var idx=arr.findIndex(function(id){ return line.indexOf(id)>=0; });
      return { paperLen: arr.length, idx: idx }; })()`);
    let jumped = 'skipped', opened = false;
    if (plan && plan.idx >= 0) {
      await ev(`(function(){ var b=document.getElementById('btnQuestionNav'); if(b) b.click(); })()`);
      await sleep(450);
      jumped = await ev(`(function(){ var bs=document.querySelectorAll('#questionGrid button'); var b=bs[${plan.idx}]; if(!b) return 'no-btn'; b.click(); return 'ok'; })()`);
      await sleep(900);
      const has = await ev(`!!document.querySelector('.td-line-toggle')`);
      if (has) opened = await ev(`(function(){ var b=document.querySelector('.td-line-toggle'); b.click(); var box=document.querySelector('.td-lineanswer'); return !!(box && box.innerHTML.trim()); })()`);
      jumped = jumped + '/' + (has ? 'toggle-ok' : 'toggle-missing');
    }
    summary.push(`exam 交互：开始=${started} 答题=${answered} 下一个=${nexts} 阶段=${stage} 卷内 line 题位=${plan ? plan.idx : '?'} 跳转=${jumped} 点开=${opened}`);
  }

  const bucket = (events.get(current) || []).filter((it) => it.kind !== 'noise');
  const noise = (events.get(current) || []).filter((it) => it.kind === 'noise');
  if (noise.length) summary.push(`${p}: 断连噪声 ${noise.length} 条（headless location.replace，已忽略）`);
  const seen = new Set(); const list = [];
  for (const it of bucket) {
    if (IGNORE_URL.test(it.text)) continue;
    const key = it.kind + '|' + it.text;
    if (seen.has(key)) continue;
    seen.add(key); list.push(it);
  }
  summary.push(`${p}: 异常/错误 ${list.length} 项`);
  for (const it of list.slice(0, 8)) summary.push(`  [${it.kind}] ${it.text}`);
}

console.log(summary.join('\n'));
writeFileSync(join(OUT, 'runtime.json'), JSON.stringify(Object.fromEntries(events), null, 1));
console.log(`\n明细：${join(OUT, 'runtime.json')}`);
cleanup();
process.exit(0);
