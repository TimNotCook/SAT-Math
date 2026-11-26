#!/usr/bin/env node
/* 模考五屏中文审计（mock 模式专用）
 * 依次进入 Intro / Answer / Review / Submit / Result，统计**可见文本**里的中文字符数，
 * 每屏存一张截图。全为 0 退出码 0，否则 1。
 * 用法：node tools/mock_cjk.mjs [baseUrl] [outDir]
 * 依据：docs/UI-COPY.md v1.1（老板批 B：模考纯英文；成绩报告也在模考屏内）
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { CHROME, tempProfile } from './lib/chrome.mjs';

const BASE = process.argv[2] || 'https://timnotcook.github.io/SAT-Math';
const OUT = process.argv[3] || 'docs/ui-shots';
const PORT = 9500 + Math.floor(Math.random() * 80);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${tempProfile('mock-')}`, '--no-first-run',
  '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
process.on('exit', () => { try { proc.kill('SIGKILL'); } catch (e) {} });

async function cdp() {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break; } catch (e) {} await sleep(250); }
  const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const ws = new WebSocket(t.find(x => x.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const w = new Map(); const logs = [];
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && w.has(m.id)) { w.get(m.id)(m.result); w.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') logs.push(m.params.exceptionDetails.text || 'exception');
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') logs.push(m.params.entry.text);
  });
  const send = (method, params = {}) => new Promise(r => {
    const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params }));
    setTimeout(() => { if (w.has(i)) { w.delete(i); r({}); } }, 30000);
  });
  return { send, logs };
}

/* 取「真的会显示」的文本：跳过 display:none / hidden / SCRIPT / STYLE，也跳过被遮挡的父级 */
const VIS = `(() => {
  const out = [];
  const walk = el => {
    for (const n of el.childNodes) {
      if (n.nodeType === 3) { const t = n.textContent.replace(/\\s+/g, ' ').trim(); if (t) out.push(t); }
      else if (n.nodeType === 1) {
        if (n.tagName === 'SCRIPT' || n.tagName === 'STYLE') continue;
        const cs = getComputedStyle(n);
        if (cs.display === 'none' || cs.visibility === 'hidden' || n.hidden) continue;
        walk(n);
      }
    }
  };
  walk(document.body);
  const joined = out.join(' | ');
  const words = Array.from(new Set(joined.match(/[\\u4e00-\\u9fa5]+/g) || []));
  const chars = (joined.match(/[\\u4e00-\\u9fa5]/g) || []).length;
  return JSON.stringify({ chars, words, stage: (document.querySelector('.stage:not([hidden])') || {}).id || '', text: joined.slice(0, 3000) });
})()`;

const c = await cdp();
await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
fs.mkdirSync(OUT, { recursive: true });

const rows = [];
async function snap(width, name, label) {
  const r = await c.send('Runtime.evaluate', { expression: VIS, returnByValue: true });
  let d = {}; try { d = JSON.parse(r.result.value || '{}'); } catch (e) {}
  const shot = await c.send('Page.captureScreenshot', { format: 'png' });
  const file = `mock-${width}-${name}.png`;
  if (shot && shot.data) fs.writeFileSync(path.join(OUT, file), Buffer.from(shot.data, 'base64'));
  rows.push({ width, screen: label, file, chars: d.chars || 0, words: d.words || [], stage: d.stage || '', text: d.text || '' });
  console.log(`[${width}px ${name}] stage=${d.stage} 中文字符=${d.chars} 词=${JSON.stringify(d.words || [])}`);
}

async function click(id, wait = 2500) {
  await c.send('Runtime.evaluate', { expression: `(function(){var e=document.getElementById(${JSON.stringify(id)});if(!e)return 'missing';e.click();return 'ok';})()`, returnByValue: true });
  await sleep(wait);
}

await c.send('Page.navigate', { url: BASE + '/exam.html?mode=mock' });
await sleep(3500);
const WIDTHS = [1280, 655, 515, 390];
const errsAll = [];

for (const w of WIDTHS) {
  await c.send('Emulation.setDeviceMetricsOverride', {
    width: w, height: w <= 480 ? 844 : 900, deviceScaleFactor: 2, mobile: w <= 480 });
  c.logs.length = 0;
  /* 每一档都从干净状态起跑：上一档走完会产生「已交卷」存档，
     不清掉的话下一档直接落在成绩页，五屏审计就变成假的 0。 */
  await c.send('Page.navigate', { url: BASE + '/drill.html' });
  await sleep(1500);
  await c.send('Runtime.evaluate', { expression: 'try{localStorage.clear();sessionStorage.clear();}catch(e){}', returnByValue: true });
  await c.send('Page.navigate', { url: BASE + '/exam.html?mode=mock&w=' + w });
  await sleep(3500);

  await snap(w, '01-intro', 'Intro 开考页');
  await click('btnStart', 3000);
  await snap(w, '02-answer', 'Answer 答题页');
  await click('btnReview', 2500);
  await snap(w, '03-review', 'Review 检查答案');
  await click('btnGoSubmit', 2500);
  await snap(w, '04-submit', 'Submit 确认交卷');
  // Module 1 确认 → 进 Module 2；再走一次 Review/Submit 才到 Result
  await click('btnSubConfirm', 3000);
  await click('btnReview', 2500);
  await click('btnGoSubmit', 2500);
  await click('btnSubConfirm', 3500);
  await snap(w, '05-result', 'Result 成绩报告');

  errsAll.push({ width: w, errors: [...c.logs] });
}

/* 屏名与 stage 必须对上：窄屏点不到按钮时，最容易出现「看着 0 其实停在同一屏」 */
const EXPECT = { 'Intro 开考页': 'stage-intro', 'Answer 答题页': 'stage-answer', 'Review 检查答案': 'stage-review',
  'Submit 确认交卷': 'stage-submit', 'Result 成绩报告': 'stage-result' };
const stageBad = rows.filter(r => EXPECT[r.screen] && r.stage !== EXPECT[r.screen]);
const bad = rows.filter(r => r.chars > 0);
const errTotal = errsAll.reduce((n, e) => n + e.errors.length, 0);
console.log('\n=== 模考五屏中文审计（4 档宽度） ===');
console.log('base:', BASE, '| 屏次:', rows.length, '| 控制台错误:', errTotal);
for (const w of WIDTHS) {
  const rs = rows.filter(r => r.width === w);
  console.log(`  ${w}px  —  ` + rs.map(r => `${r.screen}=${r.chars}`).join(' '));
}
for (const r of rows) if (r.chars) console.log(`  ← ${r.width}px ${r.screen} ${r.file} 中文字符=${r.chars} ${JSON.stringify(r.words)}`);
for (const r of stageBad) console.log(`  ← ${r.width}px ${r.screen} 实际停在 ${r.stage || '(无 stage)'}`);
console.log(bad.length === 0 && errTotal === 0 && stageBad.length === 0
  ? `\n=== ${rows.length}/${rows.length} 屏纯净，中文 0，stage 全对（1280/655/515/390）===`
  : `\n=== FAIL：${bad.length} 屏仍有中文 / ${stageBad.length} 屏 stage 不对 / ${errTotal} 条控制台错误 ===`);
fs.writeFileSync(path.join(OUT, 'mock-cjk.json'), JSON.stringify({ base: BASE, time: new Date().toISOString(), widths: WIDTHS, rows, errors: errsAll }, null, 2));
process.exit(bad.length === 0 && errTotal === 0 && stageBad.length === 0 ? 0 : 1);
