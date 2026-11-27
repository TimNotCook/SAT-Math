#!/usr/bin/env node
/* tools/verify_mobile.mjs — 窄屏（375 / 320）横向溢出与点击热区验收器
 *
 * 为什么要有它：a11y 脚本只验了「可访问名」，runtime 只验「有没有报错」，
 * 谁都没量过「页面在 375 宽下有没有横向滚动条」「选项热区够不够手指点」。
 * 这两件事在手机上就是真事故：横向溢出会把右侧按钮顶出屏幕，热区不足会点不中。
 *
 * 零 npm 依赖，复用系统 Chrome 的 CDP 通道（与 verify_a11y.mjs 同款）。
 * 用法：
 *   node tools/verify_mobile.mjs
 *   node tools/verify_mobile.mjs --base https://timnotcook.github.io/SAT-Math
 *   node tools/verify_mobile.mjs --out /tmp/mobile-proof
 */
import { spawn } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { startStaticServer } from './lib/serve.mjs';
import { CHROME, tempProfile } from './lib/chrome.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);
const argVal = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const HAS_BASE = args.includes('--base');
let BASE = argVal('--base', 'http://127.0.0.1:8481').replace(/\/+$/, '');
const OUT = resolve(argVal('--out', '/tmp/mobile-proof'));
const PORT = 8481;
const CDP = 9700 + Math.floor(Math.random() * 120);
const sleep = ms => new Promise(r => setTimeout(r, ms));

mkdirSync(OUT, { recursive: true });
let server = null;
if (!HAS_BASE) {
  try { server = await startStaticServer(ROOT, { mark: '.verify-mobile-marker' }); BASE = server.base; }
  catch (e) { console.error('起不了本仓库静态服务器，请用 --base：' + e.message); process.exit(2); }
}
const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${tempProfile('vm-')}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { proc.kill('SIGKILL'); } catch (e) {} if (server) { try { server.stop(); } catch (e) {} } };
process.on('exit', cleanup);

for (let i = 0; i < 60; i++) {
  try { if ((await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok) break; } catch (e) {}
  await sleep(250);
}
const tabs = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json();
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let mid = 0; const pending = new Map();
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise(r => {
  const i = ++mid; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params }));
  setTimeout(() => { if (pending.has(i)) { pending.delete(i); r({}); } }, 25000);
});
const ev = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
const viewport = (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: true });
const shot = async name => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  if (r && r.data) writeFileSync(join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
};
const strip = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const results = [];
function check(tag, label, ok, got) { results.push({ tag, label, ok: !!ok, got: strip(got) }); }

/* 导航：先等地址栏落到目标前缀，再等 readyState（线上首屏慢时旧文档会让 localStorage 抛 SecurityError） */
async function goto(url) {
  const wantBase = url.replace(/[^/]*$/, '');
  await send('Page.navigate', { url });
  for (let i = 0; i < 120; i++) {
    await sleep(100);
    const href = await ev('location.href');
    if (typeof href === 'string' && href.startsWith(wantBase) && (await ev('document.readyState')) === 'complete') break;
  }
}
const overflow = () => ev(`(()=>{const d=document.documentElement;
  return {vw:innerWidth,sw:Math.max(d.scrollWidth, document.body?document.body.scrollWidth:0),docH:d.clientHeight}})()`);
/* 找横向溢出的真凶：右边界超出视口的元素（取最右的三个，便于定位） */
const offenders = () => ev(`(()=>{const vw=innerWidth;const bad=[];
  document.querySelectorAll('body *').forEach(el=>{const r=el.getBoundingClientRect();
    if(r.width>2&&r.right>vw+1&&getComputedStyle(el).position!=='fixed'&&el.offsetParent!==null){
      bad.push({sel:(el.id?'#'+el.id:el.tagName.toLowerCase()+(el.className&&typeof el.className==='string'?'.'+el.className.trim().split(/\s+/).slice(0,2).join('.'):'')),right:Math.round(r.right),w:Math.round(r.width)});}});
  return bad.sort((a,b)=>b.right-a.right).slice(0,3);})()`);
const tapHeights = () => ev(`(()=>{const q=s=>document.querySelector(s);
  const h=e=>e?Math.round(e.getBoundingClientRect().height):0;
  return {start:h(q('#btnStart')),next:h(q('#btnNext')),prev:h(q('#btnPrev')),
    choiceMin:(()=>{const rows=Array.prototype.slice.call(document.querySelectorAll('#answerArea .drill-choice-row, #answerArea .drill-choice'));
      return rows.length?Math.min.apply(null, rows.map(h)):0;})(),
    choiceN:document.querySelectorAll('#answerArea .drill-choice-row, #answerArea .drill-choice').length}})()`);

await send('Page.enable'); await send('Runtime.enable');

const SEED_RESULT = {
  mode: 'mock', total: 1, auto: false, reason: 'manual', date: Date.now(), path: 'Module 1',
  detail: [{ id: 'U1-01', given: 'A', correct: false }],
};

for (const [w, h, tag] of [[375, 812, '375'], [320, 568, '320']]) {
  await viewport(w, h);

  /* ---------- 1. 首页：不该有横向滚动 ---------- */
  await goto(`${BASE}/index.html`);
  await sleep(700);
  const ov1 = await overflow();
  check(tag, `首页无横向溢出`, ov1 && ov1.sw <= ov1.vw + 1, `${ov1.sw} / ${ov1.vw}`);
  if (ov1 && ov1.sw > ov1.vw + 1) check(tag, '首页溢出元素', false, JSON.stringify(await offenders()));
  await shot(tag + '-index');

  /* ---------- 2. 练题页：选项热区 + 横向溢出 ---------- */
  await goto(`${BASE}/drill.html?sec=1.1&i=1`);
  for (let i = 0; i < 60; i++) {
    const ok = await ev(`!!document.querySelector('#answerArea .drill-choice')`);
    if (ok) break;
    await sleep(150);
  }
  const ov2 = await overflow();
  const tap = await tapHeights();
  check(tag, '练题页无横向溢出', ov2 && ov2.sw <= ov2.vw + 1, `${ov2.sw} / ${ov2.vw}`);
  if (ov2 && ov2.sw > ov2.vw + 1) check(tag, '练题页溢出元素', false, JSON.stringify(await offenders()));
  check(tag, '选项热区 ≥44px（手指点得中）', tap && tap.choiceMin >= 44, `最小 ${tap.choiceMin}px，共 ${tap.choiceN} 行`);
  check(tag, 'Next 热区 ≥44px', tap && tap.next >= 44, `${tap.next}px`);
  await shot(tag + '-drill');

  /* ---------- 3. 错题回顾页：卡片不被顶出屏幕 ---------- */
  await goto(`${BASE}/exam.html`);            /* 先落一个同源页面，才能写 localStorage */
  await sleep(400);
  await ev(`localStorage.setItem('tdsat_exam_suite_results_v1', ${JSON.stringify(JSON.stringify([SEED_RESULT]))})`);
  await goto(`${BASE}/wrong.html`);
  for (let i = 0; i < 80; i++) {
    const n = await ev(`document.querySelectorAll('#wrongList .wrong-card').length`);
    if (n >= 1) break;
    await sleep(150);
  }
  const ov3 = await overflow();
  const card = await ev(`(()=>{const c=document.querySelector('#wrongList .wrong-card');
    if(!c) return null;const r=c.getBoundingClientRect();
    return {right:Math.round(r.right),w:Math.round(r.width),vw:innerWidth,
      tailOverflow:(()=>{let over=[];c.querySelectorAll('*').forEach(el=>{const x=el.getBoundingClientRect();
        if(x.right>innerWidth+1&&x.width>2) over.push(el.className||el.tagName);});return over.slice(0,3);})()};})()`);
  check(tag, '错题卡片在视口内', !!(card && card.right <= card.vw + 1), card ? `右边界 ${card.right} / 视口 ${card.vw}` : '没有卡片');
  check(tag, '错题页无横向溢出', ov3 && ov3.sw <= ov3.vw + 1, `${ov3.sw} / ${ov3.vw}`);
  if (card && card.right > card.vw + 1) check(tag, '卡片内部溢出元素', false, JSON.stringify(card.tailOverflow));
  await shot(tag + '-wrong');

  /* ---------- 4. 模考开始页：Start 热区 ---------- */
  await goto(`${BASE}/exam.html?mode=mock`);
  for (let i = 0; i < 60; i++) {
    const ok = await ev(`!!document.getElementById('btnStart')`);
    if (ok) break;
    await sleep(150);
  }
  const ov4 = await overflow();
  const startH = await ev(`(()=>{const b=document.getElementById('btnStart');return b?Math.round(b.getBoundingClientRect().height):0;})()`);
  check(tag, '模考开始页无横向溢出', ov4 && ov4.sw <= ov4.vw + 1, `${ov4.sw} / ${ov4.vw}`);
  check(tag, 'Start 热区 ≥44px', startH >= 44, `${startH}px`);
  await shot(tag + '-exam-intro');

  await ev(`localStorage.removeItem('tdsat_exam_suite_results_v1')`);
}

const pass = results.filter(r => r.ok).length;
for (const r of results) if (!r.ok) console.log(`FAIL [${r.tag}] ${r.label}  → ${r.got}`);
console.log(`\n${pass}/${results.length} 通过，截图在 ${OUT}`);
process.exit(results.some(r => !r.ok) ? 1 : 0);
