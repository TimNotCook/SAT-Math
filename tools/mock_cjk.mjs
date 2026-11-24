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

const BASE = process.argv[2] || 'https://timnotcook.github.io/SAT-Math';
const OUT = process.argv[3] || 'docs/ui-shots';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9500 + Math.floor(Math.random() * 80);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/mock-cjk-${Date.now()}`, '--no-first-run',
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
async function snap(name, label) {
  const r = await c.send('Runtime.evaluate', { expression: VIS, returnByValue: true });
  let d = {}; try { d = JSON.parse(r.result.value || '{}'); } catch (e) {}
  const shot = await c.send('Page.captureScreenshot', { format: 'png' });
  if (shot && shot.data) fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(shot.data, 'base64'));
  rows.push({ screen: label, file: name + '.png', chars: d.chars || 0, words: d.words || [], stage: d.stage || '', text: d.text || '' });
  console.log(`[${name}] stage=${d.stage} 中文字符=${d.chars} 词=${JSON.stringify(d.words || [])}`);
}

async function click(id, wait = 2500) {
  await c.send('Runtime.evaluate', { expression: `(function(){var e=document.getElementById(${JSON.stringify(id)});if(!e)return 'missing';e.click();return 'ok';})()`, returnByValue: true });
  await sleep(wait);
}

await c.send('Page.navigate', { url: BASE + '/exam.html?mode=mock' });
await sleep(3500);
await snap('01-intro', 'Intro 开考页');

await click('btnStart', 3000);
await snap('02-answer', 'Answer 答题页');

await click('btnReview', 2500);
await snap('03-review', 'Review 检查答案');

await click('btnGoSubmit', 2500);
await snap('04-submit', 'Submit 确认交卷');

// Module 1 确认 → 进 Module 2；再走一次 Review/Submit 才到 Result
await click('btnSubConfirm', 3000);
await click('btnReview', 2500);
await click('btnGoSubmit', 2500);
await click('btnSubConfirm', 3500);
await snap('05-result', 'Result 成绩报告');

const errs = [...c.logs];
let bad = rows.filter(r => r.chars > 0).length;
console.log('\n=== 模考五屏中文审计 ===');
console.log('base:', BASE, '| 控制台错误:', errs.length);
for (const r of rows) console.log(`  ${r.screen.padEnd(16)} ${r.file.padEnd(14)} 中文字符=${r.chars}${r.chars ? '  ← ' + JSON.stringify(r.words) : ''}`);
console.log(bad === 0 && errs.length === 0 ? '\n=== 5/5 纯净，中文 0 ===' : `\n=== FAIL：${bad} 屏仍有中文 ===`);
fs.writeFileSync(path.join(OUT, 'mock-cjk.json'), JSON.stringify({ base: BASE, time: new Date().toISOString(), rows, errors: errs }, null, 2));
process.exit(bad === 0 && errs.length === 0 ? 0 : 1);
