#!/usr/bin/env node
/* tools/verify_jiangyi_quiz.mjs — 讲义做题链路验收（页面层，只读，本地或线上均可）
 *
 * 目的：讲义页点选项必须真的记录答案、把选中态画出来、并在刷新后还在。
 * 背景：jiangyi-page.js 的 commitAnswer 曾经自己调自己（RangeError 栈溢出），
 *       点选项没有任何反应，刷新后进度还是空的；单测覆盖不到这一层，只能靠页面验收。
 *       tools/verify_jiangyi.mjs 管的是数据契约（不是这条链路），两者互补。
 * 做法：进板 → 找第一个有选择题的小节 → 点 A → 校验 aria-pressed / .on / 落盘 → 刷新复核。
 *
 * 用法：
 *   node tools/verify_jiangyi_quiz.mjs
 *   node tools/verify_jiangyi_quiz.mjs --base http://127.0.0.1:8812
 *   node tools/verify_jiangyi_quiz.mjs --base https://timnotcook.github.io/SAT-Math --w 320 --h 700
 */
import { spawn } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { CHROME, HEADLESS_ARGS, tempProfile } from './lib/chrome.mjs';
import { startStaticServer } from './lib/serve.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);
const argVal = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const HAS_BASE = args.includes('--base');
const W = Number(argVal('--w', '390'));
const H = Number(argVal('--h', '760'));
const OUT = resolve(argVal('--out', '/tmp/jiangyi-quiz-proof'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let BASE = argVal('--base', '');
let server = null;
if (!HAS_BASE) {
  server = await startStaticServer(ROOT);
  BASE = server.base;
} else BASE = BASE.replace(/\/$/, '');

mkdirSync(OUT, { recursive: true });
const PORT = 9960 + Math.floor(Math.random() * 30);
const chrome = spawn(CHROME, [
  ...HEADLESS_ARGS,
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${tempProfile('jyquiz-')}`,
  '--no-first-run',
  'about:blank',
], { stdio: 'ignore' });

let wsUrl = '';
for (let i = 0; i < 80; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const page = (list || []).find((x) => x.type === 'page' && x.webSocketDebuggerUrl);
    if (page) { wsUrl = page.webSocketDebuggerUrl; break; }
  } catch {}
  await sleep(250);
}
if (!wsUrl) {
  console.error('❌ Chrome 起不来（拿不到 DevTools 端点）');
  chrome.kill();
  if (server) server.stop();
  process.exit(2);
}

const ws = new WebSocket(wsUrl);
await new Promise((r) => { ws.onopen = r; });
let seq = 0;
const waiters = new Map();
const problems = [];
const consoleErrs = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && waiters.has(m.id)) { waiters.get(m.id)(m); waiters.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    consoleErrs.push(String((d.exception && d.exception.description) || d.text || 'exception').split('\n')[0]);
  }
};
const send = (method, params = {}) => new Promise((res) => {
  const id = ++seq; waiters.set(id, res);
  ws.send(JSON.stringify({ id, method, params }));
});
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result && r.result.exceptionDetails) {
    consoleErrs.push(String((r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description) || 'eval').split('\n')[0]);
  }
  return r.result && r.result.result ? r.result.result.value : undefined;
};
const shot = async (name) => {
  try {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    if (r.result && r.result.data) writeFileSync(join(OUT, name), Buffer.from(r.result.data, 'base64'));
  } catch {}
};
const check = (ok, msg) => { if (!ok) problems.push(msg); };

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true, touch: true });

/* 打开讲义页，等题库铺开 */
await send('Page.navigate', { url: `${BASE}/jiangyi.html` });
let ready = false;
for (let i = 0; i < 200; i++) {
  if (await ev(`!!(window.TD_JY && window.TD_JY.BY_ID && (function(){var e=document.getElementById('jyBoardCards'); return e && e.children.length > 0;})())`)) { ready = true; break; }
  await sleep(500);
}
check(ready, '讲义页 100 秒内没起来（板列表为空或 TD_JY 未就绪）');

const boards = (await ev(`(()=>[...document.querySelectorAll('#jyBoardCards [data-board]')].map(b=>b.dataset.board))()`)) || [];
const board = boards[0] || '';
check(!!board, '找不到任何讲义板入口');

/* 找一个真的有选择题的小节：先进板，再挨个点小节，直到 #jyQuiz 里出现 .drill-choice */
let secUsed = '';
if (board) {
  await ev(`(()=>{const b=document.querySelector('#jyBoardCards [data-board="${board}"]'); if(b)b.click();})()`);
  await sleep(1500);
  for (const s of (await ev(`(()=>[...document.querySelectorAll('#jySections [data-sec]')].map(a=>a.dataset.sec))()`)) || []) {
    await ev(`(()=>{const a=document.querySelector('#jySections [data-sec="${s}"]'); if(a)a.click();})()`);
    await sleep(1200);
    for (let step = 0; step < 6; step++) {
      const n = await ev(`document.querySelectorAll('#jyQuiz .drill-choice').length`) || 0;
      if (n > 0) { secUsed = s; break; }
      const canNext = await ev(`(()=>{const b=document.getElementById('jyNext'); return !!(b && !b.disabled);})()`);
      if (!canNext) break;
      await ev(`document.getElementById('jyNext').click()`);
      await sleep(600);
    }
    if (secUsed) break;
  }
}
check(!!secUsed, '所有小节里都没找到选择题，无法验证答题链路');

if (secUsed) {
  const key = await ev(`window.TD_JY.KEY`);
  check(!!key, '拿不到 TD_JY.KEY，无法核对落盘');

  const before = await ev(`(()=>{const c=document.querySelector('#jyQuiz .drill-choice'); return c?{pressed:c.getAttribute('aria-pressed'), cls:c.className}:null;})()`);
  check(!!before, '选项元素读不到');
  const clicked = await ev(`(()=>{const c=document.querySelector('#jyQuiz .drill-choice'); if(!c)return false; c.click(); return true;})()`);
  await sleep(900);

  const after = await ev(`(()=>{const c=document.querySelector('#jyQuiz .drill-choice'); return c?{pressed:c.getAttribute('aria-pressed'), cls:c.className}:null;})()`);
  check(clicked === true, '点不到第一个选项');
  check(!!after && after.pressed === 'true', '点选项后 aria-pressed 不是 true（实际 ' + (after && after.pressed) + '）');
  check(!!after && /\bon\b/.test(after.cls || ''), '点选项后没有 .on 选中态，界面没给反馈');

  const saved = await ev(`(()=>{try{const o=JSON.parse(localStorage.getItem('${key}')||'{}');const ids=Object.keys(o.answers||{});return {n:ids.length};}catch(e){return {n:-1};}})()`);
  check(saved && saved.n > 0, '点选项后本地进度里没有答案（等于没记下来）');

  await shot(`jiangyi-quiz-${W}x${H}.png`);

  /* 刷新后按 URL 回到同一小节，答案应该还在 */
  await send('Page.navigate', { url: `${BASE}/jiangyi.html?b=${encodeURIComponent(board)}&s=${encodeURIComponent(secUsed)}&i=1` });
  let back = false;
  for (let i = 0; i < 70; i++) {
    if (await ev(`document.querySelectorAll('#jyQuiz .drill-choice').length>0`)) { back = true; break; }
    await sleep(500);
  }
  check(back, '刷新后按 URL 回不到该小节（题目区没渲染出来）');
  if (back) {
    const persist = await ev(`(()=>{const c=document.querySelector('#jyQuiz .drill-choice'); return c?c.getAttribute('aria-pressed'):null;})()`);
    check(persist === 'true', '刷新后答案没恢复，aria-pressed=' + persist);
  }
}

check(consoleErrs.length === 0, '页面抛出异常：' + consoleErrs.slice(0, 2).join(' / '));

console.log(problems.length
  ? '❌ 不合格 ' + problems.length + ' 项：\n' + problems.map((p, i) => `   ${i + 1}. ${p}`).join('\n')
  : `✅ 讲义做题链路正常：点选项即高亮、答案落盘、刷新后恢复（${W}×${H}，小节 ${secUsed}）`);
console.log('   截图在 ' + OUT);

if (ws.readyState === 1) ws.close();
chrome.kill();
if (server) server.stop();
process.exit(problems.length ? 1 : 0);
