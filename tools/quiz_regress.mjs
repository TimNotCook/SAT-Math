#!/usr/bin/env node
/* 抽查页回归：unit 1..4 各进一次，确认「模考纯英文」没有波及抽查页。
 * 检查：仍是 stage-intro、导航/题库胶囊/退出按钮为中文、body 无 is-mock、无 JS 报错。
 * 用法：node tools/quiz_regress.mjs [baseUrl] [outDir]
 * 退出码：0 全通过；1 有不通过项。
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'https://timnotcook.github.io/SAT-Math';
const OUT = process.argv[3] || 'docs/ui-shots';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9600 + Math.floor(Math.random() * 80);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/quiz-regress-${Date.now()}`, '--no-first-run',
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

const PROBE = `(() => {
  const vis = el => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && !el.hidden; };
  const nav = Array.from(document.querySelectorAll('.mainnav a')).filter(vis).map(a => a.textContent.trim());
  const pill = document.getElementById('bankPill');
  const exit = document.getElementById('btnExamExit');
  const body = document.body.innerText || '';
  return JSON.stringify({
    stage: (document.querySelector('.stage:not([hidden])') || {}).id || '',
    isMock: document.body.classList.contains('is-mock'),
    nav, navCount: nav.length,
    pill: pill && vis(pill) ? pill.textContent.trim() : '',
    pillVisible: !!(pill && vis(pill)),
    exit: exit ? exit.textContent.trim() : '',
    startBtn: (document.getElementById('btnStart') || {}).textContent || '',
    title: document.title,
    hasQuizWord: body.includes('单元抽查'),
  });
})()`;

const c = await cdp();
await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
fs.mkdirSync(OUT, { recursive: true });

const rows = [];
for (const u of [1, 2, 3, 4]) {
  c.logs.length = 0;
  await c.send('Page.navigate', { url: `${BASE}/exam.html?mode=quiz&unit=${u}` });
  await sleep(3500);
  const r = await c.send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
  let d = {}; try { d = JSON.parse(r.result.value || '{}'); } catch (e) {}
  const shot = await c.send('Page.captureScreenshot', { format: 'png' });
  const file = `quiz-unit${u}.png`;
  if (shot && shot.data) fs.writeFileSync(path.join(OUT, file), Buffer.from(shot.data, 'base64'));
  const checks = {
    stage: d.stage === 'stage-intro',
    notMock: d.isMock === false,
    nav: d.navCount >= 4,
    pillZh: /本单元\s+\d+\s+题/.test(d.pill || ''),
    exitZh: d.exit === '退出',
    startZh: (d.startBtn || '').includes('开始抽测'),
    title: (d.title || '').startsWith('SAT Math Prep'),
    noErrors: c.logs.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  rows.push({ unit: u, file, pass, checks, detail: d, errors: [...c.logs].slice(0, 3) });
  console.log(`[unit=${u}] ${pass ? 'PASS' : 'FAIL'} ${JSON.stringify(checks)}  nav=${JSON.stringify(d.nav)} pill=${d.pill}`);
}

const bad = rows.filter(r => !r.pass).length;
console.log('\n=== 抽查页回归（unit 1..4）===');
for (const r of rows) console.log(`  unit ${r.unit}  ${r.file}  ${r.pass ? '通过' : '不通过'}`);
console.log(bad === 0 ? '\n=== 4/4 通过 ===' : `\n=== FAIL：${bad} 个单元不通过 ===`);
fs.writeFileSync(path.join(OUT, 'quiz-regress.json'), JSON.stringify({ base: BASE, time: new Date().toISOString(), rows }, null, 2));
process.exit(bad === 0 ? 0 : 1);
