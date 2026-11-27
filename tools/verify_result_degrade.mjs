#!/usr/bin/env node
/* tools/verify_result_degrade.mjs — 老存档的成绩页降级体检
 *
 * 事故：`tdsat_exam_suite_session_v1` 里 finished:true、卷面合法，但 result 缺
 * estimate/report（旧版本写出、云端合并、半截写入）时，点「查看成绩报告」
 * 会在 `renderResult` 的 r.estimate.scaled 处 TypeError，成绩页白屏。
 * 这里在临时 profile 里种一份合法 22 题卷 + 残缺 result，点 Start 后断言：
 *   ① 没有未捕获异常  ② result 阶段真的可见  ③ 分数区有降级占位「—」
 * 用法：node tools/verify_result_degrade.mjs [--base URL]
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { CHROME, tempProfile } from './lib/chrome.mjs';
import { startStaticServer } from './lib/serve.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);
const argVal = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : ''; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let BASE = argVal('--base');
let server = null;
if (!BASE) { server = await startStaticServer(ROOT, { mark: '.verify-result-degrade' }); BASE = server.base; }

const CDP = 9600 + Math.floor(Math.random() * 150);
const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${tempProfile('vrd-')}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { proc.kill('SIGKILL'); } catch (e) {} if (server) { try { server.stop(); } catch (e) {} } };
process.on('exit', cleanup);
for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok) break; } catch (e) {} await sleep(250); }
const tabs = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json();
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let mid = 0; const pending = new Map(); const exceptions = [];
ws.addEventListener('message', (evm) => {
  const m = JSON.parse(evm.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails || {};
    exceptions.push(`${d.text || ''} ${d.exception ? (d.exception.description || '') : ''}`.trim().slice(0, 300));
  }
});
const send = (method, params = {}) => new Promise((r) => {
  const i = ++mid; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params }));
  setTimeout(() => { if (pending.has(i)) { pending.delete(i); r({}); } }, 25000);
});
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
async function nav(path) {
  await send('Page.navigate', { url: BASE + path });
  for (let i = 0; i < 80; i++) { await sleep(120); if ((await ev('document.readyState')) === 'complete') break; }
  await sleep(1200);
}
await send('Runtime.enable');
await send('Page.enable');

await nav('/wrong.html');
await ev('localStorage.clear()');
await nav('/wrong.html');
const seeded = await ev(`(function(){
  var ids = TD_APP.CATALOG['1.1'].slice(0, 22).map(function(q){ return q.id; });
  var paper = ids.map(function(id,i){ return { uid:'u'+i, id:id, from:'bank' }; });
  var ans = {}; paper.forEach(function(p){ ans[p.uid] = { v:'', marked:false, spent:0, locked:true }; });
  var now = Date.now();
  var s = { mode:'mock', paper:paper, answers:ans, m1Size:22, module:1,
    m2Options:{ hard:[], easy:[] }, startedAt:now-60000, endsAt:now+600000,
    durationSec:4200, moduleEndsAt:now+600000, finished:true, stage:'result',
    result:{ total:22, correct:5, elapsed:60, durationSec:4200, estimate:null, report:null, detail:[] } };
  localStorage.setItem('tdsat_exam_suite_session_v1', JSON.stringify(s));
  return paper.length;
})()`);
await nav('/exam.html?mode=mock');
const startLabel = await ev(`document.getElementById('btnStart').textContent`);
await ev(`document.getElementById('btnStart').click()`);
await sleep(1500);
const probe = await ev(`(function(){
  var st = document.getElementById('stage-result');
  var score = document.getElementById('resScore');
  var kv = document.getElementById('resKV');
  return { resultShown: !!(st && !st.hidden), score: score ? score.textContent.trim() : '', kv: kv ? kv.textContent.replace(/\\s+/g,' ').trim().slice(0,60) : '' };
})()`);
const bad = exceptions.filter((x) => !/favicon/i.test(x));
console.log(JSON.stringify({ seeded, startLabel, ...probe, exceptions: bad }, null, 1));
const ok = probe.resultShown && bad.length === 0 && /—/.test(probe.score);
console.log(ok ? '✅ 残缺 result 降级：成绩页可见、无异常、分数为「—」' : '❌ 残缺 result 仍然打崩/白屏');
cleanup();
process.exit(ok ? 0 : 1);
