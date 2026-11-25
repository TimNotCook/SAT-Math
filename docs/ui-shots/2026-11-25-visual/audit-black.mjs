#!/usr/bin/env node
/* audit-black.mjs — 纯黑/近黑背景 DOM 探针 + 三档前后对比截图。
 *
 * 零 npm 依赖，复用系统 Chrome CDP。遍历页面所有元素（排除纯文本节点），
 * 断言非文本元素的近黑实心背景计数；hover / focus / 展开弹层后再扫一遍。
 *
 * 判定阈值：background-color 不透明度 ≥0.5 且相对亮度 ≤0.14 记为 dark-fill；
 * background-image 渐变/图案里命中近黑 hex 记为 dark-gradient。
 * 半透明遮罩（alpha<0.5）不算实心黑面；SVG 内部填充不走 CSS background。
 *
 * 用法：
 *   node docs/ui-shots/2026-11-25-visual/audit-black.mjs --tag after
 *   node ... --tag before --base http://127.0.0.1:8491
 *
 * 产出（默认目录 docs/ui-shots/2026-11-25-visual/）：
 *   black-audit[-before].json   逐档/逐页/逐状态计数与命中元素
 *   <tag>-<page>-<viewport>.png  对比截图
 */
import { spawn } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const args = process.argv.slice(2);
const argVal = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const TAG = argVal('--tag', 'after');
const HAS_BASE = args.includes('--base');
const BASE = argVal('--base', 'http://127.0.0.1:8491').replace(/\/+$/, '');
const OUT = resolve(ROOT, 'docs/ui-shots/2026-11-25-visual');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CDP_PORT = 9620 + Math.floor(Math.random() * 100);
const VIEWPORTS = [1280, 655, 390];
const VH = 900;
const sleep = ms => new Promise(r => setTimeout(r, ms));

let server = null;
if (!HAS_BASE) {
  server = spawn('python3', ['-m', 'http.server', '8491', '--directory', ROOT], { stdio: 'ignore' });
  await sleep(700);
}
const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=/tmp/audit-black-${Date.now()}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
process.on('exit', () => { try { proc.kill('SIGKILL'); } catch (e) {} if (server) try { server.kill('SIGKILL'); } catch (e) {} });

async function connect() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).ok) break; } catch (e) {}
    await sleep(250);
  }
  const tabs = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
  const page = tabs.find(x => x.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  });
  const send = (method, params = {}) => new Promise(r => {
    const i = ++id; pending.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
    setTimeout(() => { if (pending.has(i)) { pending.delete(i); r({}); } }, 30000);
  });
  return { send, ws };
}

/* 探针：返回命中近黑背景的元素清单 */
const PROBE = `(() => {
  const out = [];
  const darkStop = (r, g, b, a) => {
    if (a < 0.5) return false;
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return lum <= 0.14;
  };
  const all = document.querySelectorAll('*');
  for (const el of all) {
    if (el === document.documentElement || el === document.body) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const bg = cs.backgroundColor, img = cs.backgroundImage;
    let flag = null;
    const m = bg.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
    if (m) {
      const r = +m[1], g = +m[2], b = +m[3], a = m[4] == null ? 1 : +m[4];
      if (darkStop(r, g, b, a)) flag = { kind: 'dark-fill', color: bg, lum: +((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255).toFixed(3) };
    }
    if (!flag && img && img !== 'none') {
      const stops = [...img.matchAll(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/g)];
      for (const s of stops) {
        if (darkStop(+s[1], +s[2], +s[3], s[4] == null ? 1 : +s[4])) { flag = { kind: 'dark-gradient', bgImage: img.slice(0, 160) }; break; }
      }
    }
    if (flag) {
      const raw = el.className && el.className.baseVal != null ? el.className.baseVal : (el.className || '');
      out.push(Object.assign({ tag: el.tagName.toLowerCase(), id: el.id || '', cls: String(raw).slice(0, 80) }, flag));
    }
  }
  return out;
})()`;

const FREEZE = `(() => {
  const st = document.createElement('style');
  st.id = 'audit-freeze';
  st.textContent = '*{transition:none!important;animation:none!important}';
  document.head.appendChild(st);
  return document.fonts ? document.fonts.ready.then(() => true) : true;
})()`;

const PAGES = [
  { id: 'drill',    url: '/drill.html' },
  { id: 'question',  url: '/drill.html?sec=1.1&i=1' },
  { id: 'panel',     url: '/drill.html?sec=1.1&i=1', openPanel: true },
  { id: 'result',    url: '/drill.html?sec=1.1&result=1' },
  { id: 'wrong',     url: '/wrong.html' },
  { id: 'jiangyi',   url: '/jiangyi.html' },
  { id: 'quiz',      url: '/exam.html?mode=quiz&unit=1' },
  { id: 'mock',      url: '/exam.html?mode=mock' },
];

mkdirSync(OUT, { recursive: true });
const c = await connect();
await c.send('Page.enable'); await c.send('Runtime.enable');

const results = [];
for (const vp of VIEWPORTS) {
  await c.send('Emulation.setDeviceMetricsOverride', { width: vp, height: VH, deviceScaleFactor: 1, mobile: false });
  for (const page of PAGES) {
    await c.send('Page.navigate', { url: BASE + page.url });
    /* 等待题库装配完成（大文件冷启动可能 >1.5s），最多 2.8s */
    await c.send('Runtime.evaluate', { expression: `new Promise(res => { const t0=Date.now(); const iv=setInterval(()=>{ if(window.TD_APP||document.querySelectorAll('.drill-section-row,.drill-board-nav-item').length||document.getElementById('fatalLoadError')||Date.now()-t0>9000){clearInterval(iv);res(true);} },120); })`, awaitPromise: true, returnByValue: true });
    await sleep(300);
    await c.send('Runtime.evaluate', { expression: FREEZE, awaitPromise: true, returnByValue: true });
    await sleep(200);

    const states = [];
    // 1) 默认态
    let scan = await c.send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
    states.push({ state: 'default', flags: scan.result?.value || [] });

    // 2) hover 首个可交互元素
    const hoverRect = await c.send('Runtime.evaluate', { expression: `(() => {
      const el = document.querySelector('button, a.drill-section-row, .drill-choice, .drill-board-nav-item, .btn');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, tag: el.tagName.toLowerCase(), cls: String(el.className||'').slice(0,60) };
    })()`, returnByValue: true });
    if (hoverRect.result?.value) {
      const h = hoverRect.result.value;
      await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: h.x, y: h.y });
      await sleep(150);
      scan = await c.send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
      states.push({ state: 'hover', hovered: h, flags: scan.result?.value || [] });
    }

    // 3) focus 首个可聚焦元素
    await c.send('Runtime.evaluate', { expression: `(() => { const el = document.querySelector('button, a, input, select, [tabindex]'); if (el) el.focus(); })()` });
    await sleep(120);
    scan = await c.send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
    states.push({ state: 'focus', flags: scan.result?.value || [] });

    // 4) 展开题号弹层
    if (page.openPanel) {
      await c.send('Runtime.evaluate', { expression: `(() => { const b = document.getElementById('btnQuestionNav'); if (b) b.click(); })()` });
      await sleep(400);
      scan = await c.send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
      states.push({ state: 'panel-open', flags: scan.result?.value || [] });
    }

    // 截图（panel 页取弹层展开后）
    const shotRes = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
    const buf = Buffer.from(shotRes.data, 'base64');
    const file = `${TAG}-${page.id}-${vp}.png`;
    writeFileSync(join(OUT, file), buf);

    for (const s of states) {
      results.push({ viewport: vp, page: page.id, state: s.state, hovered: s.hovered || null,
        count: s.flags.length, flags: s.flags });
    }
    console.log(`[${TAG}] ${page.id} @${vp}  states=${states.map(s => s.state + ':' + s.flags.length).join(' ')}  ${(buf.length/1024).toFixed(0)}KB`);
  }
}

const summary = {
  generatedAt: new Date().toISOString(), base: BASE, tag: TAG,
  threshold: { backgroundAlpha: 0.5, relativeLuminance: 0.14, note: '近黑实心背景计数；半透明遮罩与 SVG 填充不计' },
  viewports: VIEWPORTS,
  totalDarkFill: results.reduce((n, r) => n + r.flags.filter(f => f.kind === 'dark-fill').length, 0),
  totalDarkGradient: results.reduce((n, r) => n + r.flags.filter(f => f.kind === 'dark-gradient').length, 0),
  results,
};
const jsonName = TAG === 'before' ? 'black-audit-before.json' : 'black-audit.json';
writeFileSync(join(OUT, jsonName), JSON.stringify(summary, null, 2));
console.log(`\n=== ${TAG}: dark-fill=${summary.totalDarkFill} dark-gradient=${summary.totalDarkGradient} → ${jsonName} ===`);
try { c.ws.close(); } catch (e) {}
process.exit(0);
