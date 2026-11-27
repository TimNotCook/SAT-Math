#!/usr/bin/env node
/* tools/verify_junk.mjs — 脏存档体检（只读：只在临时 profile 里种脏数据）
 *
 * 干的事：先把 localStorage 写成各种「合法 JSON 但类型/字段不对」的脏值，
 * 再逐页导航，断言
 *   ① 没有未捕获异常 / console error（页面不能打崩）
 *   ② 关键容器真的画出了东西（错题本 #wrongList、记录页 #histList 不能空）
 *   ③ 脏 session 不会把 exam.html 卡成白页
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
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok) break; } catch (e) {}
  await sleep(250);
}
const tabs = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json();
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

/* 每页都先种同一套脏数据（用 index 先落地同一 origin 拿到 localStorage 权限） */
const JUNK = [
  ['tdsat_app_v1', JSON.stringify({ sections: { '1.1': { answers: { 'U1-01': { v: 1, correct: 'yes', ts: 'x' }, 'U1-02': null }, wrongLog: [{ v: 'A' }] }, 'nope': { answers: [] } }, last: { sec: 'nope', qid: 1 } })],
  ['tdsat_exam_suite_results_v1', JSON.stringify({ items: [{ date: 'yesterday', detail: {} }], n: 2 })],
  ['tdsat_exam_suite_abandoned_v1', JSON.stringify({})],
  ['tdsat_exam_suite_session_v1', JSON.stringify({ startedAt: 'x', stage: 'answer', moduleEndsAt: 'soon', paper: null })],
  ['tdsat_progress_save_v1', '{"producer":"tdsat-bluebook","version":1'],
  ['tdsat_prefs_v1', '[]'],
  ['tdsat_jy_state_v1', JSON.stringify({ answers: { 'nope-q': { v: '', correct: false }, 'U1-01': 5 }, board: 'x' })],
  ['tdsat_state_v1', JSON.stringify({ wrong: [{ id: 'U1-01', given: 'B' }, 'x'], last: 'q1' })],
  ['tdsat_wrong_import_v1', JSON.stringify({ items: 'no', n: 3 })],
];
await goto(`${BASE}/index.html`);
for (const [k, v] of JUNK) await ev(`localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)})`);

const PAGES = ['index.html', 'wrong.html', 'history.html', 'drill.html', 'exam.html?mode=mock', 'jiangyi.html'];
const summary = [];
const offenders = [];
for (const p of PAGES) {
  current = p;
  events = [];
  await goto(`${BASE}/${p}`);
  const probe = await ev(`(function(){
    var ids=['wrongList','histList','questionView','introView'];
    var out={};
    ids.forEach(function(id){ var el=document.getElementById(id); if(el) out[id]=String(el.textContent||'').trim().length; });
    out.errs = 0;
    return out; })()`);
  const errs = events.filter((e) => e.kind === 'exception' || (e.kind === 'console' && !IGNORE_URL.test(e.text)) && !/Failed to load resource/i.test(e.text));
  summary.push(`${p}: 异常/错误 ${errs.length} 项 · 容器字数 ${JSON.stringify(probe)}`);
  for (const e of errs.slice(0, 5)) summary.push(`  [${e.kind}] ${e.text}`);
  if (errs.length) offenders.push({ page: p, errs });
  if (p === 'exam.html?mode=mock') {
    /* 脏 session + 脏成绩仓库：至少要落到开始页（有 Start）或恢复提示，不能白屏 */
    const stage = await ev(`(function(){
      var b=document.getElementById('btnStart');
      var t=String(document.body.textContent||'').replace(/\s+/g,' ').trim();
      return { start: !!(b && b.offsetParent !== null), chars: t.length }; })()`);
    summary.push(`  exam 落点：Start 可见=${stage.start} · 正文 ${stage.chars} 字`);
    if (!stage.start && stage.chars < 200) offenders.push({ page: p, errs: [{ text: 'exam 白屏（无 Start、正文过短）' }] });
  }
  if (p === 'wrong.html' && probe && probe.wrongList === 0) offenders.push({ page: p, errs: [{ text: '#wrongList 空白' }] });
  if (p === 'history.html' && probe && probe.histList === 0) offenders.push({ page: p, errs: [{ text: '#histList 空白' }] });
}

console.log(summary.join('\n'));
writeFileSync(join(OUT, 'junk.json'), JSON.stringify({ offenders, events }, null, 1));
console.log(offenders.length ? `\n❌ ${offenders.length} 项不合格` : '\n✅ 脏存档下六页均不崩、容器非空');
console.log(`截图/明细：${OUT}`);
cleanup();
process.exit(offenders.length ? 1 : 0);
