#!/usr/bin/env node
/* 四页标题品牌核对：<title> 必须统一以 SAT Math Prep 开头，并各存一张截图。
 * 用法：node tools/title_check.mjs [baseUrl] [outDir]
 * 退出码：0 通过；1 有不符。
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { CHROME, tempProfile } from './lib/chrome.mjs';

const BASE = process.argv[2] || 'https://timnotcook.github.io/SAT-Math';
const OUT = process.argv[3] || 'docs/ui-shots';
const PORT = 9700 + Math.floor(Math.random() * 80);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${tempProfile('title-')}`, '--no-first-run',
  '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
process.on('exit', () => { try { proc.kill('SIGKILL'); } catch (e) {} });

async function cdp() {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break; } catch (e) {} await sleep(250); }
  const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const ws = new WebSocket(t.find(x => x.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const w = new Map();
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && w.has(m.id)) { w.get(m.id)(m.result); w.delete(m.id); } });
  const send = (method, params = {}) => new Promise(r => {
    const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params }));
    setTimeout(() => { if (w.has(i)) { w.delete(i); r({}); } }, 30000);
  });
  return { send };
}

const PAGES = [
  ['index', '/index.html'],
  ['drill', '/drill.html'],
  ['exam', '/exam.html?mode=quiz&unit=1'],
  ['wrong', '/wrong.html'],
];

const c = await cdp();
await c.send('Page.enable'); await c.send('Runtime.enable');
fs.mkdirSync(OUT, { recursive: true });

const rows = [];
for (const [name, url] of PAGES) {
  await c.send('Page.navigate', { url: BASE + url });
  await sleep(3500);
  const r = await c.send('Runtime.evaluate', { expression: 'document.title', returnByValue: true });
  const title = (r.result && r.result.value) || '';
  const shot = await c.send('Page.captureScreenshot', { format: 'png' });
  const file = `title-${name}.png`;
  if (shot && shot.data) fs.writeFileSync(path.join(OUT, file), Buffer.from(shot.data, 'base64'));
  const ok = title.startsWith('SAT Math Prep');
  rows.push({ page: name, url, title, file, ok });
  console.log(`[${name}] ${ok ? 'PASS' : 'FAIL'} ${title}`);
}

const bad = rows.filter(r => !r.ok).length;
console.log('\n=== 四页标题 ===');
for (const r of rows) console.log(`  ${r.page.padEnd(6)} ${r.title.padEnd(28)} ${r.ok ? '通过' : '不通过'}`);
console.log(bad === 0 ? '\n=== 4/4 通过 ===' : `\n=== FAIL：${bad} 页不符 ===`);
fs.writeFileSync(path.join(OUT, 'title-check.json'), JSON.stringify({ base: BASE, time: new Date().toISOString(), rows }, null, 2));
process.exit(bad === 0 ? 0 : 1);
