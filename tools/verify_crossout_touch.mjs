#!/usr/bin/env node
/* tools/verify_crossout_touch.mjs — 模考页「划掉选项 ✕」在触屏设备上是否真的看得见
 *
 * 为什么单独一个验收器：app.css 里模考答题页的 .crossout-toggle 常态是 opacity:0，
 * 只有 `.drill-choice-row:hover` / `.is-on` / `:focus-visible` 三个条件才显形——
 * 这是桌面鼠标端的刻意克制（Bluebook 桌面版选项行要干净，鼠标扫过才露 ✕）。
 * 但 iPad / 手机是 (hover:none),(pointer:coarse)，hover 永远不会触发：
 *   · 用户根本发现不了「划掉选项」这个功能
 *   · ✕ 虽然看不见，却仍然占着选项右缘 24px 的点击区，误触就会把选项划掉
 * 2026-11-27 实测：390×760 触屏模拟下四个 ✕ 全是 opacity:0。
 *
 * 判定分两套，两边都过才算绿：
 *   A) 触屏（390×760 + touch emulation）：模考答题页所有 .crossout-toggle
 *      opacity ≥ 0.85，且颜色对卡片底色对比 ≥ 3:1（不能只是「能看见一点」）。
 *   B) 桌面（1280×900，无 touch）：常态 opacity < 0.15（守护原来的克制），
 *      鼠标移到 ✕ 上之后 opacity ≥ 0.85（守护 hover 仍然有效）。
 *
 * 用法：node tools/verify_crossout_touch.mjs [--base URL]
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { CHROME, tempProfile } from './lib/chrome.mjs';
import { startStaticServer } from './lib/serve.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);
const argVal = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let BASE = argVal('--base', '');
let server = null;
if (!BASE) { server = await startStaticServer(ROOT, { mark: '.verify-crossout-touch' }); BASE = server.base; }

const CDP = 9500 + Math.floor(Math.random() * 100);
const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${tempProfile('vct-')}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { proc.kill('SIGKILL'); } catch (e) {} if (server) { try { server.stop(); } catch (e) {} } };
process.on('exit', cleanup);
for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok) break; } catch (e) {} await sleep(250); }
const tabs = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json();
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let mid = 0; const pending = new Map();
ws.addEventListener('message', (evm) => { const m = JSON.parse(evm.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => {
  const i = ++mid; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params }));
  setTimeout(() => { if (pending.has(i)) { pending.delete(i); r({}); } }, 25000);
});
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
await send('Page.enable');
await send('Runtime.enable');

async function nav(p) {
  await send('Page.navigate', { url: BASE + p });
  for (let i = 0; i < 80; i++) { await sleep(120); if ((await ev('document.readyState')) === 'complete') break; }
  await sleep(900);
}

/* 进入模考答题页：点 Start，等 stage 切到 answer */
async function enterMock() {
  await nav('/exam.html?mode=mock');
  await ev(`document.getElementById('btnStart') && document.getElementById('btnStart').click()`);
  for (let i = 0; i < 30; i++) {
    await sleep(200);
    if (await ev(`(()=>{const s=document.getElementById('stage-answer');return !!(s&&!s.hidden)})()`)) break;
  }
  await sleep(400);
}

/* 读每个 ✕ 的可视状态 */
const SAMPLE = `(()=>{
 function lum(c){const m=String(c).match(/[\\d.]+/g);if(!m||m.length<3)return null;
   const f=v=>{v=v/255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};
   const r=+m[0],g=+m[1],b=+m[2];return .2126*f(r)+.7152*f(g)+.0722*f(b)}
 const togs=[...document.querySelectorAll('.crossout-toggle')];
 return togs.map((t,i)=>{
   const cs=getComputedStyle(t);
   const card=t.closest('.drill-choice-row') || t.parentElement;
   const ch=card&&card.querySelector('.drill-choice');
   const bg=ch?getComputedStyle(ch).backgroundColor:getComputedStyle(document.body).backgroundColor;
   const fg=cs.color;
   const l1=lum(fg), l2=lum(bg);
   let ratio=null;
   if(l1!=null&&l2!=null){const a=Math.max(l1,l2),b=Math.min(l1,l2);ratio=(a+.05)/(b+.05)}
   const r=t.getBoundingClientRect();
   return {i, opacity:+cs.opacity, color:fg, bg, ratio:ratio==null?null:+ratio.toFixed(2),
     w:Math.round(r.width), h:Math.round(r.height), cx:Math.round(r.x+r.width/2), cy:Math.round(r.y+r.height/2),
     pressed:t.getAttribute('aria-pressed')};
 });
})()`;

const fails = [];
const notes = [];

/* A) 触屏 */
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 760, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await nav('/index.html');
await ev(`localStorage.setItem('tdsat_theme','light')`);
await enterMock();
const touchEnv = await ev(`({hoverNone:matchMedia('(hover:none)').matches, coarse:matchMedia('(pointer:coarse)').matches})`);
notes.push(`触屏环境 hover:none=${touchEnv?.hoverNone} pointer:coarse=${touchEnv?.coarse}`);
const touch = await ev(SAMPLE);
notes.push(`触屏下检出 ${touch?.length ?? 0} 个 ✕`);
let touchChecked = 0;
for (const t of touch || []) {
  touchChecked++;
  const label = `触屏 ✕#${t.i + 1}（${t.w}×${t.h}）`;
  if (!(t.opacity >= 0.85)) fails.push(`${label} → opacity ${t.opacity}，触屏上等于看不见`);
  else if (t.ratio != null && t.ratio < 3) fails.push(`${label} → 文字色 ${t.color} 对卡片 ${t.bg} 只有 ${t.ratio}:1（要求 ≥3:1）`);
  if (t.w < 20 || t.h < 20) fails.push(`${label} → 命中区只有 ${t.w}×${t.h}，太小`);
}
if (!touch || !touch.length) fails.push('触屏 ✕ → 一个 .crossout-toggle 都没渲染出来');

/* A1b) 真实命中区：本体 24×24 不够手指点，触屏靠不可见 ::before 撑开。
   这里不用 elementFromPoint —— 它要求元素此刻就在视口内，题目一长选项跑到屏幕外
   就会假报「取不到 ✕」；直接读宿主伪元素的解析后尺寸更稳（computed width/height
   是布局算出来的真实值，没有这条规则时返回 auto）。 */
const hit = await ev(`(()=>{
 const t=[...document.querySelectorAll('.crossout-toggle')].find(el=>{
   const rr=el.getBoundingClientRect();
   return rr.width>1 && rr.height>1 && getComputedStyle(el).display!=='none';
 });
 if(!t) return null;
 const body=t.getBoundingClientRect();
 const pb=getComputedStyle(t,'::before');
 const pw=parseFloat(pb.width), ph=parseFloat(pb.height);
 const pos=pb.position;
 return {body:[Math.round(body.width),Math.round(body.height)],
   pad:[Number.isFinite(pw)?Math.round(pw):null, Number.isFinite(ph)?Math.round(ph):null],
   pos, content:pb.content};
})()`);
if (!hit) fails.push('触屏 ✕ 命中区 → 一个可见的 ✕ 都找不到');
else {
  const [bw, bh] = hit.body;
  const [pw, ph] = hit.pad || [null, null];
  const effW = Math.max(bw, pw ?? 0), effH = Math.max(bh, ph ?? 0);
  if (effW < 36 || effH < 42) {
    fails.push(`触屏 ✕ 命中区 → 实测 ${effW}×${effH}（本体 ${bw}×${bh}，::before ${pw ?? 'auto'}×${ph ?? 'auto'}，要求 ≥36×42）`);
  }
}

/* A2) 320 窄屏触屏：✕ 不能挤出视口 */
await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 700, deviceScaleFactor: 2, mobile: true });
await enterMock();
const narrow = await ev(`(()=>{
 const all=[...document.querySelectorAll('.crossout-toggle')].filter(el=>{
   const cs=getComputedStyle(el), rr=el.getBoundingClientRect();
   return cs.display!=='none' && cs.visibility!=='hidden' && rr.width>1 && rr.height>1;
 });
 const t=all.find(el=>{const rr=el.getBoundingClientRect();return rr.y+rr.height/2>80 && rr.y+rr.height/2<600})||all[0];
 if(!t) return null;
 const r=t.getBoundingClientRect();
 return {right:Math.round(r.right), vw:innerWidth, opacity:+getComputedStyle(t).opacity,
   ovf:document.documentElement.scrollWidth>innerWidth+1};
})()`);
if (!narrow) fails.push('320 触屏 ✕ → 没渲染');
else {
  if (narrow.right > narrow.vw + 1) fails.push(`320 触屏 ✕ → 右缘 ${narrow.right} 超出视口 ${narrow.vw}`);
  if (!(narrow.opacity >= 0.85)) fails.push(`320 触屏 ✕ → opacity ${narrow.opacity}`);
  if (narrow.ovf) fails.push('320 触屏 ✕ → 页面出现横向滚动');
}

/* B) 桌面：克制 + hover */
await send('Emulation.setTouchEmulationEnabled', { enabled: false });
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await nav('/index.html');
await enterMock();
const deskBefore = await ev(SAMPLE);
if (!deskBefore || !deskBefore.length) fails.push('桌面 ✕ → 没渲染');
else {
  const t0 = deskBefore[0];
  if (!(t0.opacity < 0.15)) fails.push(`桌面 ✕ 常态 → opacity ${t0.opacity}（要求 <0.15，保持 Bluebook 的克制）`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: t0.cx, y: t0.cy, button: 'none' });
  await sleep(350);
  const hovered = await ev(`(()=>{const t=document.querySelector('.crossout-toggle');return t?+getComputedStyle(t).opacity:null})()`);
  if (hovered == null || hovered < 0.85) fails.push(`桌面 ✕ 悬停 → opacity ${hovered}（hover 应该显形）`);
}
notes.push(`桌面 ✕ 常态 opacity=${deskBefore && deskBefore[0] ? deskBefore[0].opacity : 'n/a'}`);

console.log('=== 模考页「划掉 ✕」触屏可见性 ===');
for (const n of notes) console.log('   ', n);
console.log(`触屏检查 ${touchChecked} 个 ✕（390 宽）+ 1 个（320 宽）+ 桌面克制/hover 各 1`);
if (fails.length) {
  console.log(`❌ 不合格 ${fails.length} 项：`);
  for (const f of fails) console.log('   ', f);
} else {
  console.log('✅ 触屏上 ✕ 常显且对比 ≥3:1；桌面仍保持隐性、hover 显形');
}
cleanup();
process.exit(fails.length ? 1 : 0);
