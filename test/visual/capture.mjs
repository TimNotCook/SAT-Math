#!/usr/bin/env node
/* visual 截图器：headless Chrome + CDP 逐像素截图存档，是样式回归的「尺子」。
 *
 * 零 npm 依赖，复用系统 Chrome 与 verify_site.mjs 同款 CDP 通道。
 * 目标矩阵（AGENTS.md 红线「开工三前提」第一条）：
 *   明暗双主题 × drill/exam/wrong 三页 × 关键交互态，逐像素截图。
 *
 * 用法：
 *   node test/visual/capture.mjs [--out <dir>] [--base <url>]
 *   --out   截图输出目录，默认 test/visual/baseline
 *   --base  站点地址，默认 http://127.0.0.1:8477（本脚本会自动起本地静态服务）
 *
 * 确定性保证：
 *   - 固定视口 1280×900、deviceScaleFactor=1
 *   - 主题在文档脚本执行前写入 localStorage（不闪屏、不依赖交互）
 *   - 导航/点击后等待字体 ready + 固定沉降时长，等 CSS 过渡收尾
 *   - 截图前强制停掉 transition/animation，排除中间态抖动
 * 产出：<out>/<id>.png 每张截图 + <out>/manifest.json（含 url/theme/视口/sha256）
 */
import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

// ---------- 参数 ----------
const args = process.argv.slice(2);
function argVal(name, def) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
}
const OUT = resolve(ROOT, argVal('--out', 'test/visual/baseline'));
const HAS_BASE = args.includes('--base');
const BASE = argVal('--base', 'http://127.0.0.1:8477');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CDP_PORT = 9600 + Math.floor(Math.random() * 100);
const WIDTH = 1280, HEIGHT = 900, DSF = 1;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- 本地静态服务（未显式给 --base 时自动起） ----------
let server = null;
if (!HAS_BASE) {
  server = spawn('python3', ['-m', 'http.server', '8477', '--directory', ROOT], { stdio: 'ignore' });
  await sleep(700); // 等端口就绪
}

const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=/tmp/vr-${Date.now()}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });

function cleanup() { try { proc.kill('SIGKILL'); } catch (e) {} if (server) { try { server.kill('SIGKILL'); } catch (e) {} } }
process.on('exit', cleanup);

// ---------- CDP 通道 ----------
async function connect() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).ok) break; } catch (e) {}
    await sleep(250);
  }
  const tabs = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
  const page = tabs.find(x => x.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pending = new Map(); const errors = [];
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
    else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.text || 'exception');
    else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(m.params.entry.text);
  });
  const send = (method, params = {}) => new Promise(r => {
    const i = ++id; pending.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
    setTimeout(() => { if (pending.has(i)) { pending.delete(i); r({}); } }, 30000);
  });
  return { send, errors, ws };
}

// 禁用过渡/动画 + 等待字体，返回稳定的页面
const FREEZE = `(() => {
  try {
    const st = document.createElement('style');
    st.id = 'vr-freeze';
    st.textContent = '*{transition:none!important;animation:none!important;caret-color:transparent!important}';
    document.head.appendChild(st);
  } catch (e) {}
  return document.fonts ? document.fonts.ready.then(()=>true) : Promise.resolve(true);
})()`;

// ---------- 截图矩阵 ----------
// 每题：id、url、theme、可选 preActions（导航后执行的点击序列）
const SHOTS = [
  { id: 'light-drill-landing',   url: '/drill.html', theme: 'light' },
  { id: 'light-drill-question',  url: '/drill.html?sec=1.1&i=1', theme: 'light' },
  { id: 'light-exam-mock-intro', url: '/exam.html?mode=mock', theme: 'light' },
  { id: 'light-exam-quiz-answer', url: '/exam.html?mode=quiz&unit=1', theme: 'light', clicks: ['#btnStart'] },
  { id: 'light-wrong',           url: '/wrong.html', theme: 'light' },
  { id: 'dark-drill-landing',    url: '/drill.html', theme: 'dark' },
  { id: 'dark-drill-question',   url: '/drill.html?sec=1.1&i=1', theme: 'dark' },
  { id: 'dark-exam-mock-intro',  url: '/exam.html?mode=mock', theme: 'dark' },
  { id: 'dark-exam-quiz-answer', url: '/exam.html?mode=quiz&unit=1', theme: 'dark', clicks: ['#btnStart'] },
  { id: 'dark-wrong',            url: '/wrong.html', theme: 'dark' },
];

mkdirSync(OUT, { recursive: true });
const c = await connect();
await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
await c.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: DSF, mobile: false });
await c.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 255, g: 255, b: 255, a: 1 } });

let injectedScriptId = null;
const manifest = [];

for (const shot of SHOTS) {
  c.errors.length = 0;
  // 主题在页面脚本前落库，避免闪屏与交互依赖
  if (injectedScriptId) { await c.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: injectedScriptId }); injectedScriptId = null; }
  const r = await c.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('tdsat_theme','${shot.theme}');` });
  injectedScriptId = r.identifier;

  await c.send('Page.navigate', { url: BASE + shot.url });
  await sleep(1400); // 等首屏渲染 + 数据加载

  // 交互态：依次点击
  for (const sel of (shot.clicks || [])) {
    const clicked = await c.send('Runtime.evaluate', { expression: `(function(){var b=document.querySelector(${JSON.stringify(sel)});if(b){b.click();return true}return false})()`, returnByValue: true });
    await sleep(1200); // 等点击后的视图切换与过渡收尾
    if (!clicked.result?.value) c.errors.push(`selector not found: ${sel}`);
  }

  await c.send('Runtime.evaluate', { expression: FREEZE, awaitPromise: true, returnByValue: true });
  await sleep(250);

  const shotRes = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
  const buf = Buffer.from(shotRes.data, 'base64');
  const file = shot.id + '.png';
  writeFileSync(join(OUT, file), buf);
  manifest.push({
    id: shot.id, file, url: BASE + shot.url, theme: shot.theme,
    viewport: [WIDTH, HEIGHT], dsf: DSF,
    clicks: shot.clicks || [],
    consoleErrors: c.errors.slice(0, 8),
    sha256: createHash('sha256').update(buf).digest('hex'),
    bytes: buf.length
  });
  console.log(`[shot] ${shot.id}  ${(buf.length / 1024).toFixed(0)} KB  err=${c.errors.length}`);
}

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({ base: BASE, generatedAt: new Date().toISOString(), shots: manifest }, null, 2));

console.log(`\n=== 截图完成：${manifest.length} 张 → ${OUT} ===`);
try { c.ws.close(); } catch (e) {}
cleanup();
