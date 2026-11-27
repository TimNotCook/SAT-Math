#!/usr/bin/env node
/* tools/verify_exam_bar.mjs — 模考答题条在窄屏是否把 Submit 挤到题卡上
 *
 * 为什么单独一个验收器：app.css:931 用 !important 把模考答题条钉成 height:60px，
 * 而 .exam-toolbar-actions 在窄屏会换行 —— 换行后内容超过 60px，溢出的那个按钮
 * （永远是最右的 Submit）直接压在题卡第一行上。390 上一眼看不出（题卡上面的间距
 * 恰好接住），但 320 / 375 实测 Submit 底边 344 > 题卡顶边 308，真实遮住题干。
 *
 * 判定（320 / 375 / 390 / 768 四档，触屏模拟）：
 *   1) 答题条自身不能溢出（scrollHeight ≤ height+1）
 *   2) Submit 的底边必须落在题卡顶边之上（不压正文）
 *   3) 整页不能出现横向滚动
 *
 * 用法：node tools/verify_exam_bar.mjs [--base URL]
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { CHROME, tempProfile } from './lib/chrome.mjs';
import { startStaticServer } from './lib/serve.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);
const argVal = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let BASE = argVal('--base', '');
let server = null;
if (!BASE) { server = await startStaticServer(ROOT, { mark: '.verify-exam-bar' }); BASE = server.base; }

const CDP = 9600 + Math.floor(Math.random() * 100);
const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${tempProfile('veb-')}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { proc.kill('SIGKILL'); } catch (e) {} if (server) { try { server.stop(); } catch (e) {} } };
process.on('exit', cleanup);
for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok) break; } catch (e) {} await sleep(250); }
const tabs = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json();
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let mid = 0; const pending = new Map();
ws.addEventListener('message', (evm) => { const m = JSON.parse(evm.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => {
  const i = ++mid; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params }));
  setTimeout(() => { if (pending.has(i)) { pending.delete(i); r({}); } }, 25000);
});
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
await send('Page.enable');
await send('Runtime.enable');

const SIZES = [[320, 700], [375, 760], [390, 760], [768, 900]];
const fails = [];
const rows = [];

const MEASURE = `(()=>{
 const bar=document.querySelector('.exam-questionbar');
 const inner=bar&&bar.querySelector('.drill-questionbar-inner');
 const sub=document.getElementById('btnSubmit');
 const q=document.getElementById('question');
 if(!bar||!sub||!q) return null;
 const rb=bar.getBoundingClientRect(), rs=sub.getBoundingClientRect(), rq=q.getBoundingClientRect();
 return {
   vw:innerWidth,
   barH:Math.round(rb.height),
   innerSH:inner&&inner.scrollHeight,
   barSH:bar.scrollHeight,
   subBottom:Math.round(rs.bottom),
   qTop:Math.round(rq.top),
   gap:Math.round(rq.top-rs.bottom),
   ovfX:document.documentElement.scrollWidth>innerWidth+1
 };
})()`;

for (const [w, h] of SIZES) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: w < 900 });
  await send('Emulation.setTouchEmulationEnabled', { enabled: w < 900, maxTouchPoints: 5 });
  await send('Page.navigate', { url: BASE + '/exam.html?mode=mock' });
  for (let i = 0; i < 60; i++) { await sleep(120); if ((await ev('document.readyState')) === 'complete') break; }
  await sleep(1000);
  await ev(`document.getElementById('btnStart') && document.getElementById('btnStart').click()`);
  for (let i = 0; i < 30; i++) {
    await sleep(200);
    if (await ev(`(()=>{const s=document.getElementById('stage-answer');return !!(s&&!s.hidden)})()`)) break;
  }
  await sleep(600);
  const m = await ev(MEASURE);
  if (!m) { fails.push(`${w}px → 量不到答题条/Submit/题卡`); continue; }
  rows.push(`${w}×${h}  条高 ${m.barH}  Submit 底 ${m.subBottom} / 题卡顶 ${m.qTop}（间隙 ${m.gap}）`);
  if (m.barSH > m.barH + 1) fails.push(`${w}px → 答题条溢出：内容 ${m.barSH} > 条高 ${m.barH}`);
  if (m.gap < 0) fails.push(`${w}px → Submit 压到题卡上 ${-m.gap}px（Submit 底 ${m.subBottom} > 题卡顶 ${m.qTop}）`);
  if (m.ovfX) fails.push(`${w}px → 页面出现横向滚动`);
}

console.log('=== 模考答题条 / Submit 遮挡 ===');
for (const r of rows) console.log('   ', r);
if (fails.length) {
  console.log(`❌ 不合格 ${fails.length} 项：`);
  for (const f of fails) console.log('   ', f);
} else {
  console.log(`✅ ${SIZES.length} 档全部：答题条不溢出，Submit 完整落在题卡之上，无横向滚动`);
}
cleanup();
process.exit(fails.length ? 1 : 0);
