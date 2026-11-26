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
import { CHROME, tempProfile } from './lib/chrome.mjs';
import { startStaticServer } from './lib/serve.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);
const argVal = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const HAS_BASE = args.includes('--base');
const OUT = resolve(argVal('--out', '/tmp/shaded-proof'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* 只写题 id，题位（sec / i，i 为 1 基）运行时从 app-core 的 CATALOG 反查。
   写死 L1#12 这种坐标，一旦题库重排 / 增删题就会静默错位：脚本照样打印 PASS 一批，
   但看的是别的题。反查口径与 app-core 一致（legacy → L<unit>、按 no 再按 id 排序）。 */
const CASES = [
  { id: 'U1-12' },
  { id: 'U1-13' },
  { id: 'TD-15-01' },
  { id: 'TD-15-02' },
  { id: 'TD-15-03' },
  { id: 'R04-104' },
];

let BASE = argVal('--base', '');
let server = null;
if (!HAS_BASE) {
  let srvLocal = null;
try {
  srvLocal = await startStaticServer(ROOT, { mark: '.verify-shaded-marker' });
  BASE = srvLocal.base;
  server = srvLocal;
} catch (e) {
  console.error('无法起本仓库静态服务器，请用 --base：' + e.message);
  process.exit(2);
}
}
const CDP = 9800 + Math.floor(Math.random() * 150);
mkdirSync(OUT, { recursive: true });
const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${tempProfile('vsf-')}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
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
/* 先开一次页面，把 app-core 的 CATALOG 拿进浏览器，再按 id 反查题位。 */
await send('Page.navigate', { url: `${BASE}/drill.html` });
for (let i = 0; i < 80; i++) { await sleep(120); if ((await ev('document.readyState')) === 'complete') break; }
for (let i = 0; i < 40 && !(await ev('!!(window.TD_APP && window.TD_APP.CATALOG)')); i++) await sleep(150);
for (const c of CASES) {
  const coord = await ev(`(function(id){
    var C = (window.TD_APP||{}).CATALOG || {}, Q = (window.TD_BANK||{}).questions || [];
    var q = null; for (var k = 0; k < Q.length; k++) if (Q[k].id === id) { q = Q[k]; break; }
    if (!q) return null;
    var sec = q.origin === 'legacy' ? 'L' + q.unit : q.section;
    var arr = C[sec] || null;
    if (!arr) return null;
    var idx = -1; for (var j = 0; j < arr.length; j++) if (arr[j].id === id) { idx = j; break; }
    return idx >= 0 ? { sec: sec, pos: idx + 1, n: arr.length } : null;
  })(${JSON.stringify(c.id)})`);
  if (!coord) {
    const why = `${c.id} 题位反查失败：id 不在 CATALOG（已 retired/merged、Unit4 迁移，或 id 拼错）`;
    fails.push(why); console.log('FAIL ' + why); continue;
  }
  const sec = coord.sec, pos = coord.pos, total = coord.n;
  await send('Page.navigate', { url: `${BASE}/drill.html?sec=${encodeURIComponent(sec)}&i=${pos}` });
  for (let i = 0; i < 80; i++) { await sleep(120); if ((await ev('document.readyState')) === 'complete') break; }
  /* 别用固定 sleep 赌渲染完成：drill.html 里 #qNumber 初值是「1」，
     渲染没跟上时读到的就是 1，会把「题位没跳过去」误判成「图没了」。
     轮询到题号等于期望值再取图，最多等 6 秒。 */
  for (let i = 0; i < 40; i++) {
    const got = parseInt(await ev(`(document.getElementById('qNumber')||{}).textContent || ''`), 10);
    if (got === pos) break;
    await sleep(150);
  }
  await sleep(400);
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
  const line = `${c.id} (${sec}#${pos}/${total}) 题号=${info?.q} 图=${info?.hasFig} svg=${info?.hasSvg} 图元=${info?.prims} 缺失=${info?.missing} 位图=${info?.img} 尺寸=${info?.rect}`;
  if (ok) pass++; else fails.push(line);
  console.log((ok ? 'PASS ' : 'FAIL ') + line);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot?.data) writeFileSync(join(OUT, `shaded-${c.id}.png`), Buffer.from(shot.data, 'base64'));
}
console.log(`\n${pass}/${CASES.length} 通过，截图在 ${OUT}`);
cleanup();
process.exit(fails.length ? 1 : 0);
