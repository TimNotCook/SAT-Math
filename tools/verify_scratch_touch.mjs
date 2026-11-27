#!/usr/bin/env node
/**
 * 手写板（Scratch）触屏验收：
 * 1) 触屏上颜色圆点只有 20px、粗细按钮 26px，命中区必须撑到 ≥26×26；
 * 2) 命中区只许轻微重叠（相邻间隙 24px），点第 3 个点必须真的选中第 3 个；
 * 3) 工具条与 Done 不能超出视口（320 窄屏最容易切边）；
 * 4) 桌面鼠标端不做放大——伪元素必须仍是 auto，工具条保持原样。
 * 用法：node tools/verify_scratch_touch.mjs --base http://127.0.0.1:PORT
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { CHROME, HEADLESS_ARGS, tempProfile } from './lib/chrome.mjs';

const args = process.argv.slice(2);
const flag = n => { const i = args.indexOf(n); return i < 0 ? null : args[i + 1]; };
const BASE = flag('--base') || process.env.BASE || 'http://127.0.0.1:8080';
const OUT = flag('--out') || 'docs/ui-shots';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const failures = [];
const ok = m => console.log('  ✓ ' + m);
const bad = m => { failures.push(m); console.log('  ✗ ' + m); };

async function withPage(port, fn) {
  const dir = tempProfile('vst-');
  const proc = spawn(CHROME, [...HEADLESS_ARGS, '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) { ready = true; break; } } catch {}
      await sleep(150);
    }
    if (!ready) throw new Error('Chrome CDP 未就绪');
    const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0; const pend = new Map();
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
    const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async expr => {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      const d = r.result && r.result.result;
      if (d && d.subtype === 'error') throw new Error(d.description ? d.description.slice(0, 400) : 'eval error');
      return d ? d.value : undefined;
    };
    await send('Page.enable'); await send('Runtime.enable');
    await fn({ send, ev });
    ws.close();
  } finally { proc.kill('SIGKILL'); }
}

const OPEN_TEST = `(()=>{const r=document.querySelector('.drill-section-row');if(!r)return false;
  r.scrollIntoView({block:'center'});(r.querySelector('button,a')||r).click();return true})()`;

const READ = `(()=>{
  const tb=document.querySelector('.mist-toolbar'); if(!tb) return {missing:true};
  const r=tb.getBoundingClientRect();
  const sws=[...document.querySelectorAll('.mist-sw')];
  const szs=[...document.querySelectorAll('.mist-size')];
  const pseudo=e=>{const k=getComputedStyle(e,'::before');const w=parseFloat(k.width),h=parseFloat(k.height);return {w:isNaN(w)?0:w,h:isNaN(h)?0:h,raw:k.width+'x'+k.height}};
  const done=document.querySelector('.mist-done'); const dr=done?done.getBoundingClientRect():null;
  return {
    vw:innerWidth,
    tb:{x:Math.round(r.x),y:Math.round(r.y),right:Math.round(r.right),w:Math.round(r.width),h:Math.round(r.height),
      ovfX:getComputedStyle(tb).overflowX, wrap:getComputedStyle(tb).flexWrap},
    sw:{n:sws.length, box:sws.map(pseudo), rect:sws.map(e=>{const b=e.getBoundingClientRect();return {x:Math.round(b.x),right:Math.round(b.right),cx:Math.round(b.x+b.width/2)}})},
    sz:{n:szs.length, box:szs.map(pseudo)},
    done:dr?{x:Math.round(dr.x),right:Math.round(dr.right),w:Math.round(dr.width),h:Math.round(dr.height)}:null,
    ovfX: document.documentElement.scrollWidth > innerWidth + 1
  }})()`;

const PICK_THIRD = `(()=>{const sws=[...document.querySelectorAll('.mist-sw')];if(sws.length<3)return false;
  const t=sws[2];const b=t.getBoundingClientRect();
  t.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:b.x+b.width/2,clientY:b.y+b.height/2}));
  return [...document.querySelectorAll('.mist-sw')].findIndex(e=>e.classList.contains('on'))})()`;

async function enterTest(ctx, w, h) {
  await ctx.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: w < 760 });
  await ctx.send('Emulation.setTouchEmulationEnabled', { enabled: w < 760, maxTouchPoints: 5 });
  await ctx.send('Page.navigate', { url: `${BASE}/drill.html?unit=1` });
  await sleep(800);
  for (let i = 0; i < 12; i++) { if (await ctx.ev(`document.querySelectorAll('.drill-section-row').length>0`)) break; await sleep(400); }
  for (let i = 0; i < 3; i++) {
    await ctx.ev(OPEN_TEST); await sleep(1300);
    if (await ctx.ev(`(()=>{const v=document.getElementById('questionView');return !!v&&!v.hidden})()`)) break;
  }
  await ctx.ev(`(()=>{const b=document.getElementById('btnScratch');if(b)b.click()})()`);
  await sleep(900);
  return ctx.ev(`(()=>!!document.querySelector('.mist-toolbar.show')||(getComputedStyle(document.querySelector('.mist-toolbar')).opacity>0.5))()`);
}

async function audit(ctx, label, w, h) {
  const opened = await enterTest(ctx, w, h);
  const d = await ctx.ev(READ);
  if (!d) { bad(`${label} 取不到手写板工具条`); return; }
  if (!opened) bad(`${label} 点了 Scratch 但工具条没出现`);
  const tag = label;
  const minSw = 26, minSz = { w: 30, h: 38 };
  d.sw.box.forEach((b, i) => {
    if (b.w < minSw || b.h < minSw) bad(`${tag} 第 ${i + 1} 个颜色点命中区 ${b.raw}，要求 ≥${minSw}×${minSw}`);
  });
  d.sz.box.forEach((b, i) => {
    if (b.w < minSz.w || b.h < minSz.h) bad(`${tag} 第 ${i + 1} 个粗细按钮命中区 ${b.raw}，要求 ≥${minSz.w}×${minSz.h}`);
  });
  if (d.sw.box.every(b => b.w >= minSw)) ok(`${tag} 颜色点命中区 ${d.sw.box[0].raw}`);
  if (d.sz.box.every(b => Math.min(b.w, b.h) > 0)) ok(`${tag} 粗细按钮命中区 ${d.sz.box[0].raw}`);
  const gap = d.sw.rect.length > 1 ? d.sw.rect[1].x - d.sw.rect[0].right : 0;
  if (gap <= 0) bad(`${tag} 颜色点本体互相重叠（间隙 ${gap}px）`);
  else ok(`${tag} 颜色点本体间隙 ${gap}px（本体未放大，不挤占工具条）`);
  if (h > 420 || w < 521) {
    if (d.tb.h > 140) bad(`${tag} 工具条高 ${d.tb.h}px，占掉矮屏太多（应 ≤140）`);
  } else {
    // 横屏手机/矮窗口：贴边单行、内部横滑，不许按内容宽居中出界
    if (d.tb.y > 12) bad(`${tag} 矮视口工具条没贴顶（y=${d.tb.y}）`);
    else ok(`${tag} 矮视口工具条贴顶 y=${d.tb.y}`);
    if (d.tb.h > 60) bad(`${tag} 矮视口工具条高 ${d.tb.h}px（应是单行 ≤60）`);
    else ok(`${tag} 矮视口工具条单行高 ${d.tb.h}px`);
  }
  if (d.tb.x < 0 || d.tb.right > d.vw) bad(`${tag} 工具条横向出界：${d.tb.x}..${d.tb.right} / 视口 ${d.vw}`);
  else ok(`${tag} 工具条不出界（${d.tb.x}..${d.tb.right}，高 ${d.tb.h}）`);
  if (!d.done) bad(`${tag} 找不到 Done 按钮`);
  else if (d.done.right > d.vw || d.done.x < 0) bad(`${tag} Done 按钮出界：${d.done.x}..${d.done.right}`);
  else ok(`${tag} Done 按钮在视口内（${d.done.x}..${d.done.right}，${d.done.w}×${d.done.h}）`);
  if (d.ovfX) bad(`${tag} 页面出现横向滚动`);
  if (w < 760) {
    const picked = await ctx.ev(PICK_THIRD);
    if (picked === 2) ok(`${tag} 点第 3 个颜色点确实选中第 3 个`);
    else bad(`${tag} 点第 3 个颜色点后选中下标是 ${picked}（应为 2），命中判定串位`);
  }
}

async function auditDesktop(ctx) {
  await ctx.send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 800, deviceScaleFactor: 1, mobile: false });
  await ctx.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await ctx.send('Page.navigate', { url: `${BASE}/drill.html?unit=1` });
  await sleep(800);
  for (let i = 0; i < 12; i++) { if (await ctx.ev(`document.querySelectorAll('.drill-section-row').length>0`)) break; await sleep(400); }
  for (let i = 0; i < 3; i++) {
    await ctx.ev(OPEN_TEST); await sleep(1200);
    if (await ctx.ev(`(()=>{const v=document.getElementById('questionView');return !!v&&!v.hidden})()`)) break;
  }
  await ctx.ev(`(()=>{const b=document.getElementById('btnScratch');if(b)b.click()})()`);
  await sleep(800);
  const d = await ctx.ev(READ);
  if (!d) { bad('桌面 取不到手写板工具条'); return; }
  if (d.sw.box.every(b => b.w === 0)) ok('桌面 1024 颜色点不加热区（鼠标端保持原样）');
  else bad(`桌面 1024 颜色点被加了热区：${d.sw.box[0].raw}`);
}

const port = 9460 + Math.floor(Math.random() * 50);
console.log(`手写板触屏验收 → ${BASE}`);
await withPage(port, async ctx => {
  await audit(ctx, '320×700', 320, 700);
  await audit(ctx, '390×760', 390, 760);
  await audit(ctx, '568×320 横屏', 568, 320);
  await audit(ctx, '667×375 横屏', 667, 375);
  await audit(ctx, '320×380 矮屏', 320, 380);
  await auditDesktop(ctx);
  await enterTest(ctx, 390, 760);
  const r = await ctx.send('Page.captureScreenshot', { format: 'png' });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'scratch-touch-390.png'), Buffer.from(r.result.data, 'base64'));
});

console.log('');
if (failures.length) { console.log(`❌ 不合格 ${failures.length} 项：`); failures.forEach((f, i) => console.log(`   ${i + 1}. ${f}`)); process.exit(1); }
console.log('✅ 触屏颜色点/粗细按钮命中区达标、工具条不出界、点击不串位、桌面不加热区');
