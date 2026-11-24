#!/usr/bin/env node
/* tools/verify_a11y.mjs — 窄屏前后按钮可访问名 + 模考层草稿按钮无中文残留 的可复现验收器
 *
 * 零 npm 依赖，复用系统 Chrome 的 CDP 通道（与 tools/verify_session.mjs 同款）。
 * 每次跑给出「检查项 → 期望 → 实测」和截图，退出码非 0 即不合格。
 *
 * 用法：
 *   node tools/verify_a11y.mjs                                # 本地 8481 静态服务
 *   node tools/verify_a11y.mjs --base https://timnotcook.github.io/SAT-Math
 *   node tools/verify_a11y.mjs --out /tmp/proof-a11y          # 截图目录
 *
 * 检查项：
 *   nav-390   390px 视口下 Back/Next 的可视文字被 CSS 隐藏 → 必须有 aria-label 兜底
 *   nav-655   655px 视口下同样成立（β 的 P2-8 三档之一）
 *   scratch   ？mode=mock 的答题页里 #btnScratch 的 title/文案不含中文（模考层纯英文）
 *   quiz      ？mode=quiz 仍保留中文 title/文案（练习层中文功能层，防回归）
 * 产出：<out>/nav-390.png、dom-scratch.png、dom-nav.png、quiz-scratch.png
 */
import { spawn } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);
const argVal = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const HAS_BASE = args.includes('--base');
const BASE = argVal('--base', 'http://127.0.0.1:8481').replace(/\/+$/, '');
const OUT = resolve(argVal('--out', '/tmp/sat-a11y-proof'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8481;
const CDP = 9600 + Math.floor(Math.random() * 120);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CJK = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]/;

mkdirSync(OUT, { recursive: true });
const server = HAS_BASE ? null : spawn('python3', ['-m', 'http.server', String(PORT), '--directory', ROOT], { stdio: 'ignore' });
if (server) await sleep(700);
const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=/tmp/va-${Date.now()}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { proc.kill('SIGKILL'); } catch (e) {} if (server) { try { server.kill('SIGKILL'); } catch (e) {} } };
process.on('exit', cleanup);

for (let i = 0; i < 60; i++) {
  try { if ((await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok) break; } catch (e) {}
  await sleep(250);
}
const tabs = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json();
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let mid = 0; const pending = new Map(); const consoleErrs = [];
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  else if (m.method === 'Runtime.exceptionThrown') consoleErrs.push(m.params.exceptionDetails?.exception?.description || 'exception');
  else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') consoleErrs.push(m.params.entry.text);
});
const send = (method, params = {}) => new Promise(r => {
  const i = ++mid; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params }));
  setTimeout(() => { if (pending.has(i)) { pending.delete(i); r({}); } }, 25000);
});
const ev = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
const goto = async url => {
  await send('Page.navigate', { url });
  for (let i = 0; i < 60; i++) { await sleep(120); if ((await ev('document.readyState')) === 'complete') break; }
  await sleep(900);
};
/* 本地静态服务偶发 reset 会让 app-ui.js 没加载上，重试到脚本就绪为止 */
async function openExam(mode) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await goto(`${BASE}/exam.html?mode=${mode}`);
    const ready = await ev("typeof window.__TD_EXAM__ === 'object' && !!document.getElementById('btnStart')");
    if (ready) return true;
    await sleep(1200);
  }
  return false;
}
async function startMock() {
  for (let attempt = 0; attempt < 3; attempt++) {
    await ev(`document.getElementById('btnStart') && document.getElementById('btnStart').click()`);
    await sleep(800);
    const on = await ev(`!!(document.getElementById('stage-answer') && !document.getElementById('stage-answer').hidden)`);
    if (on) return true;
    await openExam('mock');
  }
  return false;
}
const viewport = (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
const shot = async name => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  if (r && r.data) writeFileSync(join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
};
const strip = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const results = [];
function check(scenario, label, ok, got) { results.push({ scenario, label, ok: !!ok, got: strip(got) }); }

/* 把 DOM 片段画成浮层再截图（给「两处 DOM」留证） */
async function domPanel(title, html) {
  await ev(`(()=>{const old=document.getElementById('__domproof');if(old)old.remove();
    const p=document.createElement('div');p.id='__domproof';
    p.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:2147483647;background:#0f1720;color:#e6edf3;padding:12px 14px;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-break:break-all;max-height:60vh;overflow:auto';
    p.textContent=${JSON.stringify(title)} + '\\n' + ${JSON.stringify(html)};
    document.body.appendChild(p);})()`);
  await sleep(300);
}

await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');

/* ---------- 1. 窄屏：Back/Next 的可访问名 ---------- */
for (const [w, tag] of [[390, 'nav-390'], [655, 'nav-655']]) {
  await viewport(w, 844);
  await openExam('mock');
  await startMock();
  const nav = await ev(`(()=>{const b=document.getElementById('btnPrev'),n=document.getElementById('btnNext');
    const lbl=e=>{const s=e&&e.querySelector('.drill-nav-label');return s?getComputedStyle(s).display:'missing'};
    const rect=e=>{const r=e.getBoundingClientRect();return Math.round(r.width)+'x'+Math.round(r.height)};
    return {prevLabel:b&&b.getAttribute('aria-label'),nextLabel:n&&n.getAttribute('aria-label'),
      prevText:lbl(b),nextText:lbl(n),prevBox:b&&rect(b),nextBox:n&&rect(n),
      prevVisible:!!b&&b.offsetParent!==null,nextVisible:!!n&&n.offsetParent!==null}})()`);
  check(tag, 'Back 有 aria-label', !!nav.prevLabel && nav.prevLabel.trim(), nav.prevLabel);
  check(tag, 'Next 有 aria-label', !!nav.nextLabel && nav.nextLabel.trim(), nav.nextLabel);
  check(tag, '窄屏可视文字确实被隐藏（aria-label 是唯一可访问名）', nav.prevText === 'none' && nav.nextText === 'none', nav.prevText + '/' + nav.nextText);
  check(tag, 'Back/Next 可点击区域没被压没', nav.prevVisible && nav.nextVisible, nav.prevBox + ' ' + nav.nextBox);
  if (tag === 'nav-390') {
    await domPanel('DOM：窄屏 Back / Next（可视文字 display:none，靠 aria-label 兜底）',
      await ev(`document.getElementById('btnPrev').outerHTML + '\\n' + document.getElementById('btnNext').outerHTML`));
    await shot('dom-nav');
    await ev(`(()=>{const p=document.getElementById('__domproof');if(p)p.remove()})()`);
    await shot('nav-390');
  }
}

/* ---------- 1b. 练习页窄屏同样成立 ---------- */
await viewport(390, 844);
await goto(`${BASE}/drill.html?sec=1.1&i=1`);
await sleep(600);
const drillNav = await ev(`(()=>{const b=document.getElementById('btnPrevious'),n=document.getElementById('btnNext');
  const hidden=e=>{const s=e&&e.querySelector('.drill-nav-label');return s?getComputedStyle(s).display:'missing'};
  return {prev:b&&b.getAttribute('aria-label'),next:n&&n.getAttribute('aria-label'),prevText:hidden(b),nextText:hidden(n)}})()`);
check('drill-390', '上一题有 aria-label', !!drillNav.prev && drillNav.prev.trim(), drillNav.prev);
check('drill-390', '下一题有 aria-label', !!drillNav.next && drillNav.next.trim(), drillNav.next);
check('drill-390', '练习页窄屏可视文字也被隐藏', drillNav.prevText === 'none' && drillNav.nextText === 'none', drillNav.prevText + '/' + drillNav.nextText);

/* ---------- 2. 模考层：草稿整块不存在（不开就删干净，不留半死按钮） ---------- */
await viewport(1280, 900);
await openExam('mock');
await startMock();
const mockScratch = await ev(`(()=>{
  const b=document.getElementById('btnScratch');
  const layer=document.querySelector('.mist-layer');
  const dead=[...document.querySelectorAll('#stage-answer [title]')].filter(el=>/^(Pen|Highlighter|Eraser|颜色|Undo|Redo|Clear|Done|钢笔|荧光笔)/.test(el.getAttribute('title')||''));
  return {button:!!b, layer:!!layer, toolbar:!!document.querySelector('.mist-toolbar'),
    deadCount:dead.length, deadTitles:dead.slice(0,3).map(e=>e.getAttribute('title').join=',')}})()`);
check('scratch', '模考 DOM 无 #btnScratch', !mockScratch.button, mockScratch.button ? 'still there' : 'removed');
check('scratch', '模考 DOM 无草稿层 .mist-layer', !mockScratch.layer, mockScratch.layer ? 'present' : 'absent');
check('scratch', '模考 DOM 无 Pen/Highlighter/颜色 半死按钮', mockScratch.deadCount === 0, mockScratch.deadCount + ' ' + mockScratch.deadTitles);
await domPanel('DOM：？mode=mock 答题页 —— #btnScratch / .mist-layer / .mist-toolbar 全为 null（草稿整块未渲染）',
  await ev(`JSON.stringify({btnScratch:document.getElementById('btnScratch'),
    mistLayer:document.querySelector('.mist-layer'),
    mistToolbar:document.querySelector('.mist-toolbar'),
    pen:document.querySelector('[title="Pen"]')||document.querySelector('[title="钢笔"]')},null,1)`));
await shot('dom-scratch');
await ev(`(()=>{const p=document.getElementById('__domproof');if(p)p.remove()})()`);

/* ---------- 3. 抽查层：草稿是「开」的，必须真能用（不是禁用壳） ---------- */
await openExam('quiz');
await sleep(600);
const quizBtn = await ev(`(()=>{const b=document.getElementById('btnScratch');
  return b?{title:b.getAttribute('title'),label:(b.querySelector('span')||{}).textContent,hidden:b.hidden}:{missing:true}})()`);
check('quiz', '抽查层草稿按钮存在且可见', !quizBtn.missing && !quizBtn.hidden, quizBtn.missing ? 'missing' : ('hidden=' + quizBtn.hidden));
check('quiz', '抽查层 title 保留中文', CJK.test(quizBtn.title || ''), quizBtn.title);
check('quiz', '抽查层文案保留中文', quizBtn.label === '草稿', quizBtn.label);
const quizPad = await ev(`(async()=>{const b=document.getElementById('btnScratch');b.click();
  await new Promise(r=>setTimeout(r,400));
  const layer=document.querySelector('.mist-layer');
  if(!layer)return{opened:false};
  const pen=layer.querySelector('[data-tool="pen"]'), hl=layer.querySelector('[data-tool="marker"]');
  const cs=getComputedStyle(layer);
  return {opened:true, display:cs.display, vis:cs.visibility, pe:getComputedStyle(layer.querySelector('.mist-toolbar')).pointerEvents,
    penTitle:pen&&pen.getAttribute('title'), penPe:pen&&getComputedStyle(pen).pointerEvents, penDisabled:pen&&pen.disabled,
    hlTitle:hl&&hl.getAttribute('title'), canvas:!!layer.querySelector('.mist-canvas'),
    btnPressed:b.getAttribute('aria-pressed')}})()`);
check('quiz', '点开草稿后工具条真的出现', quizPad.opened && quizPad.display !== 'none', quizPad.opened ? ('display=' + quizPad.display) : 'no layer');
check('quiz', '工具条可点（不是 pointer-events:none 的死壳）', quizPad.penPe === 'auto' && !quizPad.penDisabled, 'pe=' + quizPad.penPe + ' disabled=' + quizPad.penDisabled);
check('quiz', 'Pen / Highlighter 都在且带名字', !!quizPad.penTitle && !!quizPad.hlTitle, (quizPad.penTitle || '') + ' / ' + (quizPad.hlTitle || ''));
await domPanel('DOM：？mode=quiz 点开草稿后的 .mist-toolbar（Pen / Highlighter 可点，aria-pressed=true）',
  await ev(`document.querySelector('.mist-toolbar').outerHTML.slice(0,1400) + '\n[aria-pressed]=' + document.getElementById('btnScratch').getAttribute('aria-pressed')`));
await shot('quiz-scratch');
await ev(`(()=>{const p=document.getElementById('__domproof');if(p)p.remove()})()`);

/* ---------- 3. 练习/抽查层仍是中文（防回归） ---------- */
await openExam('quiz');
await sleep(600);
const quizScratch = await ev(`(()=>{const b=document.getElementById('btnScratch');
  return b?{title:b.getAttribute('title'),label:(b.querySelector('span')||{}).textContent,hidden:b.hidden}:{missing:true}})()`);
check('quiz', '抽查层草稿按钮仍显示', !quizScratch.missing && !quizScratch.hidden, quizScratch.missing ? 'missing' : ('hidden=' + quizScratch.hidden));
check('quiz', '抽查层 title 保留中文', CJK.test(quizScratch.title || ''), quizScratch.title);
check('quiz', '抽查层文案保留中文', quizScratch.label === '草稿', quizScratch.label);
await domPanel('DOM：？mode=quiz 的 #btnScratch（练习/抽查层中文，未被英文化）',
  await ev(`document.getElementById('btnScratch').outerHTML`));
await shot('quiz-scratch');

/* ---------- 汇总 ---------- */
let pass = 0;
for (const r of results) {
  console.log((r.ok ? 'PASS  ' : 'FAIL  ') + r.scenario.padEnd(9) + r.label.padEnd(34) + ' → ' + r.got);
  if (r.ok) pass++;
}
const bad = results.filter(r => !r.ok).length;
console.log(`\n共 ${results.length} 项，通过 ${pass}，失败 ${bad}；截图 ${OUT}`);
if (consoleErrs.length) console.log('控制台报错: ' + JSON.stringify(consoleErrs.slice(0, 5), null, 1));
process.exit(bad ? 1 : 0);
