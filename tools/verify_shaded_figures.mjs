#!/usr/bin/env node
/* tools/verify_shaded_figures.mjs — 阴影题矢量图渲染回归（只读）
 *
 * 判据（P0-2 验收口径，5 道 / 6 条记录）：
 *   打开 drill 对应题位，页面里必须出现 `.td-figure svg`（矢量），
 *   且不得出现 `.td-figure--missing`（“图形暂缺”）或 <img> 位图。
 *
 * 用法：
 *   node tools/verify_shaded_figures.mjs
 *   node tools/verify_shaded_figures.mjs --base https://timnotcook.github.io/SAT-Math --out /tmp/shaded-proof
 */
import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { randomBytes } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);
const argVal = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const HAS_BASE = args.includes('--base');
const OUT = resolve(argVal('--out', '/tmp/shaded-proof'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* id -> drill 题位（sec / i，i 为 1 基） */
const CASES = [
  { id: 'U1-12', sec: 'L1', i: 12 },
  { id: 'U1-13', sec: 'L1', i: 13 },
  { id: 'TD-15-01', sec: '1.5', i: 1 },
  { id: 'TD-15-02', sec: '1.5', i: 2 },
  { id: 'TD-15-03', sec: '1.5', i: 3 },
  { id: 'R04-104', sec: '4.5.T26', i: 4 },
];

let BASE = argVal('--base', '');
let server = null;
if (!HAS_BASE) {
  const MARK = '.verify-shaded-marker';
  const TOKEN = randomBytes(6).toString('hex');
  for (let k = 0; k < 8 && !BASE; k++) {
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
  `--remote-debugging-port=${CDP}`, `--user-data-dir=/tmp/vsf-${Date.now()}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
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
let mid = 0; const pending = new Map();
ws.addEventListener('message', (evm) => { const m = JSON.parse(evm.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => {
  const i = ++mid; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params }));
  setTimeout(() => { if (pending.has(i)) { pending.delete(i); r({}); } }, 25000);
});
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 2, mobile: false });

let pass = 0; const fails = [];
for (const c of CASES) {
  await send('Page.navigate', { url: `${BASE}/drill.html?sec=${encodeURIComponent(c.sec)}&i=${c.i}` });
  for (let i = 0; i < 80; i++) { await sleep(120); if ((await ev('document.readyState')) === 'complete') break; }
  await sleep(1200);
  const info = await ev(`(function(){
    var q = document.getElementById('qNumber');
    var f = document.querySelector('.td-figure');
    var svg = document.querySelector('.td-figure svg');
    var miss = document.querySelector('.td-figure--missing');
    var img = document.querySelector('.td-figure img');
    var path = svg ? (svg.querySelectorAll('path,polygon,line,rect').length) : 0;
    return { q: q ? q.textContent.trim() : '', hasFig: !!f, hasSvg: !!svg, missing: !!miss, img: !!img, prims: path,
             rect: f ? (function(r){return Math.round(r.width)+'x'+Math.round(r.height);})(f.getBoundingClientRect()) : '0x0' };
  })()`);
  const ok = info && info.hasSvg && !info.missing && !info.img;
  const line = `${c.id} (${c.sec}#${c.i}) 题号=${info?.q} 图=${info?.hasFig} svg=${info?.hasSvg} 图元=${info?.prims} 缺失=${info?.missing} 位图=${info?.img} 尺寸=${info?.rect}`;
  if (ok) pass++; else fails.push(line);
  console.log((ok ? 'PASS ' : 'FAIL ') + line);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot?.data) writeFileSync(join(OUT, `shaded-${c.id}.png`), Buffer.from(shot.data, 'base64'));
}
console.log(`\n${pass}/${CASES.length} 通过，截图在 ${OUT}`);
cleanup();
process.exit(fails.length ? 1 : 0);
