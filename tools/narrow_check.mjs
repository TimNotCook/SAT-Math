#!/usr/bin/env node
/* 窄屏溢出走查：655 / 390 两档，逐页测横向滚动 + 出框元素 + 「继续上次练习」胶囊
 * 用法：node tools/narrow_check.mjs [baseUrl] [outDir]
 * 退出码：横向滚动 0 且无出框文字 → 0；否则 1
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'https://timnotcook.github.io/SAT-Math';
const OUT = process.argv[3] || 'docs/ui-shots';
const WIDTHS = (process.env.WIDTHS || '655,390').split(',').map(Number).filter(Boolean);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9580 + Math.floor(Math.random() * 80);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/narrow-${Date.now()}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
process.on('exit', () => { try { proc.kill('SIGKILL'); } catch (e) {} });

async function cdp() {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break; } catch (e) {} await sleep(250); }
  const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const ws = new WebSocket(t.find(x => x.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const w = new Map();
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && w.has(m.id)) { w.get(m.id)(m.result); w.delete(m.id); } });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); setTimeout(() => { if (w.has(i)) { w.delete(i); r({}); } }, 30000); });
  return { send, ws };
}

const PROBE = `(() => {
  const vw = window.innerWidth;
  const docW = document.scrollingElement.scrollWidth;
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
    if (el.closest('[class*="mist-"]')) continue; /* 草稿板抽屉：常态在画布外，展开才进来 */
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const id = (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '');
    // 出框：右侧越界 / 左侧越界 / 底部越界（只在有文字或被裁内容时报）
    const clippedX = el.scrollWidth > el.clientWidth + 2 && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll';
    const outside = r.right > vw + 1 || r.left < -1;
    if (outside || clippedX) {
      const t = (el.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 40);
      out.push({ el: el.tagName.toLowerCase() + id, right: Math.round(r.right), left: Math.round(r.left),
        w: Math.round(r.width), scrollW: el.scrollWidth, clientW: el.clientWidth,
        overflowX: cs.overflowX, ws: cs.whiteSpace, outside, clippedX, text: t });
    }
  }
  let pill = document.querySelector('.drill-resume');
  if (!pill) pill = [...document.querySelectorAll('div,a')].filter(e => /^继续上次练习/.test((e.textContent || '').trim()) && (e.textContent || '').trim().length < 90)[0] || null;
  const pillInfo = pill ? (() => { const r = pill.getBoundingClientRect(); const cs = getComputedStyle(pill);
    return { el: pill.tagName.toLowerCase() + (pill.id ? '#' + pill.id : '') + (pill.className ? '.' + String(pill.className).split(' ')[0] : ''),
      right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height),
      scrollW: pill.scrollWidth, clientW: pill.clientWidth, ws: cs.whiteSpace, overflowX: cs.overflowX,
      heightOverflow: pill.scrollHeight > pill.clientHeight + 1, text: (pill.innerText||'').replace(/\\s+/g,' ').slice(0,60) }; })() : null;
  return JSON.stringify({ vw, docW, hscroll: docW > vw + 1, over: out.slice(0, 25), overCount: out.length, pill: pillInfo,
    stage: (document.querySelector('.stage:not([hidden])') || {}).id || '' });
})()`;

const PAGES = [
  { name: 'drill-practice', url: '/drill.html?sec=1.1&i=1', label: '做题视图 1.1' },
  { name: 'drill-list', url: '/drill.html', label: '真题练习 列表' },
  { name: 'quiz-intro', url: '/exam.html?mode=quiz&unit=1', label: '抽查 开考' },
  { name: 'mock-intro', url: '/exam.html?mode=mock', label: '模考 开场' },
  { name: 'wrong', url: '/wrong.html', label: '错题回顾' },
  { name: 'jiangyi-list', url: '/jiangyi.html', label: '讲义复习 列表' },
  { name: 'jiangyi-sec', url: '/jiangyi.html?b=JY1&s=1.1&i=1', label: '讲义复习 做题' },
];

const c = await cdp();
await c.send('Page.enable'); await c.send('Runtime.enable');
fs.mkdirSync(OUT, { recursive: true });
const rows = [];
for (const wd of WIDTHS) {
  await c.send('Emulation.setDeviceMetricsOverride', { width: wd, height: 844, deviceScaleFactor: 2, mobile: wd <= 480 });
  for (const p of PAGES) {
    await c.send('Page.navigate', { url: BASE + p.url });
    await sleep(3200);
    // 模考再加一屏：进答题页（答题页最容易横向撑破）
    if (p.name === 'mock-intro') {
      await c.send('Runtime.evaluate', { expression: `document.getElementById('btnStart') && document.getElementById('btnStart').click()`, returnByValue: true });
      await sleep(3000);
    }
    const r = await c.send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
    let d = {}; try { d = JSON.parse(r.result.value || '{}'); } catch (e) {}
    const tag = `${p.name}-${wd}`;
    const shot = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    if (shot && shot.data) fs.writeFileSync(path.join(OUT, 'narrow-' + tag + '.png'), Buffer.from(shot.data, 'base64'));
    rows.push({ page: p.label, url: p.url, width: wd, file: 'narrow-' + tag + '.png', ...d });
    console.log(`${wd}px ${p.label.padEnd(12)} docW=${d.docW} vw=${d.vw} 横滚=${d.hscroll ? 'YES' : 'no'} 出框=${d.overCount} stage=${d.stage}`);
    for (const o of (d.over || []).slice(0, 6)) console.log('    -', o.el, `right=${o.right} w=${o.w} sw=${o.scrollW}/${o.clientW} ws=${o.ws}`, JSON.stringify(o.text));
    if (d.pill) console.log('    pill', JSON.stringify(d.pill));
  }
}
fs.writeFileSync(path.join(OUT, 'narrow-check.json'), JSON.stringify({ base: BASE, time: new Date().toISOString(), rows }, null, 1));
const bad = rows.filter(r => r.hscroll || (r.over || []).some(o => o.outside && o.text));
console.log(`\n=== ${rows.length} 屏次 / 横向滚动或出框 ${bad.length} ===`);
for (const b of bad) console.log(`  ${b.width}px ${b.page} 横滚=${b.hscroll} 出框文字=${(b.over || []).filter(o => o.outside && o.text).length}`);
try { c.ws.close(); } catch (e) {}
try { proc.kill('SIGKILL'); } catch (e) {}
process.exit(bad.length ? 1 : 0);
