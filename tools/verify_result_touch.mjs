#!/usr/bin/env node
/**
 * 模考成绩页触屏验收：
 * 1) 两个 CTA（Review Missed Questions / Take Another Test）在触屏上必须 ≥44px 高；
 * 2) 它们不能被 toast 或别的浮层挡住（elementFromPoint 命中的必须是按钮自己）；
 * 3) 320 窄屏不出横向滚动、按钮不越界；
 * 4) 成绩页题单 tab（All Questions / Incorrect Only）触屏也要 ≥44px；
 * 5) 桌面鼠标端保持原高度（不因为触屏规则变高）。
 * 用法：node tools/verify_result_touch.mjs --base http://127.0.0.1:PORT
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { CHROME, HEADLESS_ARGS, tempProfile } from './lib/chrome.mjs';

const args = process.argv.slice(2);
const flag = n => { const i = args.indexOf(n); return i < 0 ? null : args[i + 1]; };
const BASE = flag('--base') || process.env.BASE || 'http://127.0.0.1:8080';
const OUT = flag('--out') || 'docs/ui-shots';
const SK = 'tdsat_exam_suite_session_v1';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const failures = [];
const ok = m => console.log('  ✓ ' + m);
const bad = m => { failures.push(m); console.log('  ✗ ' + m); };

async function withPage(port, fn) {
  const dir = tempProfile('vrt-');
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
      if (d && d.subtype === 'error') throw new Error(d.description ? d.description.slice(0, 300) : 'eval error');
      return d ? d.value : undefined;
    };
    await send('Page.enable'); await send('Runtime.enable');
    await fn({ send, ev });
    ws.close();
  } finally { proc.kill('SIGKILL'); }
}

const goto = async (ctx, url, wait = 700) => { await ctx.send('Page.navigate', { url }); await sleep(wait); };

async function toResult(ctx, w, h, dark) {
  await ctx.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: w < 760 });
  await ctx.send('Emulation.setTouchEmulationEnabled', { enabled: w < 760, maxTouchPoints: 5 });
  await goto(ctx, `${BASE}/exam.html?mode=mock`);
  if (dark) await ctx.ev(`try{localStorage.setItem('tdsat_theme','dark')}catch(e){};document.documentElement.setAttribute('data-theme','dark');1`);
  await ctx.ev(`localStorage.removeItem('${SK}')`);
  await goto(ctx, `${BASE}/exam.html?mode=mock`);
  for (let i = 0; i < 60; i++) { if (await ctx.ev(`!!document.getElementById('btnStart')&&!!window.__TD_EXAM__`)) break; await sleep(150); }
  await ctx.ev(`document.getElementById('btnStart')&&document.getElementById('btnStart').click()`);
  await sleep(800);
  await ctx.ev(`(()=>{const k='${SK}';const s=JSON.parse(localStorage.getItem(k)||'null');if(!s)return false;
    s.startedAt=Date.now()-3600000;s.endsAt=Date.now()-1000;s.moduleEndsAt=Date.now()-1000;s.stage='answer';
    localStorage.setItem(k,JSON.stringify(s));return true})()`);
  await goto(ctx, `${BASE}/exam.html?mode=mock`);
  await ctx.ev(`document.getElementById('btnStart')&&document.getElementById('btnStart').click()`);
  let arrived = false;
  for (let i = 0; i < 120; i++) {
    arrived = await ctx.ev(`!!(document.getElementById('stage-result')&&!document.getElementById('stage-result').hidden)`);
    if (arrived) break;
    await sleep(200);
  }
  await sleep(600);
  return arrived;
}

const READ = `(()=>{
  const ids=['btnResHome','btnResAgain'];
  const out=ids.map(id=>{ const b=document.getElementById(id); if(!b) return {id,missing:true};
    const r=b.getBoundingClientRect(); const k=getComputedStyle(b);
    const fg=k.color.match(/[0-9.]+/g).map(Number); let bg=[255,255,255]; let n=b;
    while(n){const c=getComputedStyle(n).backgroundColor; if(c&&c!=='rgba(0, 0, 0, 0)'){const m=c.match(/[0-9.]+/g).map(Number);if(!m[3]||m[3]>0.5){bg=m;break}} n=n.parentElement}
    const lum=c=>{const v=c.slice(0,3).map(x=>{const s=x/255;return s<=0.03928?s/12.92:Math.pow((s+0.055)/1.055,2.4)});return .2126*v[0]+.7152*v[1]+.0722*v[2]};
    const L1=lum(fg),L2=lum(bg);
    const ratio=+(((Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05))).toFixed(2);
    const cx=Math.round(r.left+r.width/2), cy=Math.round(r.top+r.height/2);
    const hit=document.elementFromPoint(cx,cy);
    return {id, h:Math.round(r.height), w:Math.round(r.width), x:Math.round(r.left), right:Math.round(r.right),
      top:Math.round(r.top), bottom:Math.round(r.bottom), ratio,
      hitSelf: !!(hit && (hit.id===id || b.contains(hit))), hit: hit?hit.id||hit.tagName:null};
  });
  const tabs=[...document.querySelectorAll('#stage-result .exam-tabs .tab')].map(t=>{const r=t.getBoundingClientRect();
    return {t:(t.textContent||'').trim().slice(0,14), h:Math.round(r.height), w:Math.round(r.width), l:Math.round(r.left), right:Math.round(r.right)}});
  return {vw:innerWidth, vh:innerHeight, ovfX: document.documentElement.scrollWidth>innerWidth+1, btns:out, tabs}})()`;

const DESK_FEATURES = [
  { name: 'hover', value: 'hover' }, { name: 'any-hover', value: 'hover' },
  { name: 'pointer', value: 'fine' }, { name: 'any-pointer', value: 'fine' },
];
async function emulatePointer(ctx, desktop) {
  /* 无头 Linux 恒报 hover:none，CDP 媒体特性覆盖也不生效（实测 v146）；桌面专用断言据此跳过。 */
  try { await ctx.send('Emulation.setEmulatedMedia', { features: desktop ? DESK_FEATURES : [] }); } catch (e) {}
}

async function audit(ctx, label, w, h, dark) {
  await emulatePointer(ctx, w >= 760);
  const arrived = await toResult(ctx, w, h, dark);
  if (!arrived) { bad(`${label} 没落到成绩页（前提失败）`); return; }
  const d = await ctx.ev(READ);
  const desktopCapable = w < 760 || await ctx.ev(`matchMedia('(hover:hover)').matches`);
  const tag = label + (dark ? '（暗色）' : '');
  if (!d) { bad(`${tag} 读不到成绩页`); return; }
  for (const b of d.btns) {
    if (b.missing) { bad(`${tag} 缺少按钮 ${b.id}`); continue; }
    if (w < 760 && b.h < 44) bad(`${tag} ${b.id} 高 ${b.h}px < 44`);
    else if (w < 760) ok(`${tag} ${b.id} 热区 ${b.h}px`);
    if (b.right > d.vw || b.x < 0) bad(`${tag} ${b.id} 横向出界 ${b.x}..${b.right} / ${d.vw}`);
    if (!b.hitSelf) bad(`${tag} ${b.id} 中心点被 ${b.hit} 挡住（点不到）`);
    else ok(`${tag} ${b.id} 中心点命中自己`);
    if (b.ratio < 4.5) bad(`${tag} ${b.id} 文字对比 ${b.ratio}:1 < 4.5`);
  }
  if (d.ovfX) bad(`${tag} 成绩页出现横向滚动`);
  if (w < 760) {
    for (const t of d.tabs) {
      if (t.h < 44) bad(`${tag} 题单 tab「${t.t}」高 ${t.h}px < 44`);
      else ok(`${tag} 题单 tab「${t.t}」热区 ${t.h}px`);
      if (t.right > d.vw || t.l < 0) bad(`${tag} 题单 tab「${t.t}」横向出界 ${t.l}..${t.right}`);
    }
  } else if (!desktopCapable) {
    ok(`${tag} 桌面断言跳过（本环境无 hover 能力，需 Mac 真机复核）`);
  } else if (d.tabs.length && d.tabs[0].h > 36) {
    bad(`${tag} 桌面端题单 tab 被触屏规则抬到 ${d.tabs[0].h}px（应保持 34）`);
  }
  if (w >= 760 && desktopCapable) {
    const h1 = d.btns[0] && d.btns[0].h;
    if (h1 && h1 > 44) bad(`${tag} 桌面端 CTA 被触屏规则抬高到 ${h1}px（应保持 42）`);
    else ok(`${tag} 桌面端 CTA 保持 ${h1}px`);
  }
  await ctx.ev(`localStorage.removeItem('${SK}')`);
}

const port = 9560 + Math.floor(Math.random() * 40);
console.log(`成绩页触屏验收 → ${BASE}`);
await withPage(port, async ctx => {
  await audit(ctx, '320×568', 320, 568, false);
  await audit(ctx, '390×760', 390, 760, false);
  await audit(ctx, '320×568', 320, 568, true);
  await audit(ctx, '1024×800', 1024, 800, false);
  const r = await ctx.send('Page.captureScreenshot', { format: 'png' });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'result-touch-320.png'), Buffer.from(r.result.data, 'base64'));
});

console.log('');
if (failures.length) { console.log(`❌ 不合格 ${failures.length} 项：`); failures.forEach((f, i) => console.log(`   ${i + 1}. ${f}`)); process.exit(1); }
console.log('✅ 成绩页 CTA 触屏 ≥44、点击不被浮层挡；桌面保持原高度（无 hover 能力的平台仅跳过桌面高度断言，已在输出中标注）');
