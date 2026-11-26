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
    if (e.level === 'error') add('console', `${e.source || ''}: ${e.text}`.slice(0, 400));
  } else if (m.method === 'Runtime.consoleAPICalled') {
    const a = (m.params.args || []).map((x) => x.value ?? x.description ?? '').join(' ');
    if (m.params.type === 'error') add('console', a.slice(0, 400));
  } else if (m.method === 'Network.responseReceived') {
    const r = m.params.response || {};
    if (r.status >= 400) add('http', `${r.status} ${r.url}`.slice(0, 400));
  } else if (m.method === 'Network.loadingFailed') {
    const u = (m.params.errorText || '') + ' ' + (m.params.blockedReason || '');
    add('netfail', u.slice(0, 200));
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
  await goto(`${BASE}/${p}`);
  /* drill：顺手进第一套练习，让做题/结果链路也跑一遍 */
  if (p === 'drill.html') {
    const clicked = await ev(`(function(){
      var c = document.querySelector('.drill-card, .unit-card, .drill-start, [data-action="start"]');
      if (c) { c.click(); return true; } return false; })()`);
    await sleep(1600);
    const q = await ev(`(function(){
      var b = document.querySelector('.drill-choices button, .drill-option, [data-choice]');
      if (b) { b.click(); return true; } return false; })()`);
    await sleep(900);
    summary.push(`drill 交互：卡片=${clicked} 选项=${q}`);
  }
  if (p === 'exam.html') {
    const b = await ev(`(function(){ var x=document.querySelector('[data-action="start"], .exam-start'); if(x){x.click();return true;} return false; })()`);
    await sleep(1500);
    summary.push(`exam 交互：开始=${b}`);
  }
  const bucket = events.get(current) || [];
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
