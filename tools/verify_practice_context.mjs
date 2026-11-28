#!/usr/bin/env node
/**
 * 练习页（drill）答题态上下文条验收：
 * 1) 320/375/390 窄屏：板块名必须完整可读（不能被挤成「1.1 …」），工具组不溢出；
 * 2) 「作答自动保存」是 aria-live 的可见状态，白底上必须 ≥4.5:1（浅色与暗色主题都测）；
 * 3) 1024 桌面保持单行 46px 高度，不许因为窄屏修复而变高。
 * 用法：node tools/verify_practice_context.mjs --base http://127.0.0.1:PORT
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
let failures = [];
const ok = m => console.log('  ✓ ' + m);
const bad = m => { failures.push(m); console.log('  ✗ ' + m); };

function chromeArgs(port, dir) {
  return [...HEADLESS_ARGS, '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, '--hide-scrollbars', 'about:blank'];
}

async function withPage(port, fn) {
  const dir = tempProfile('vpc-');
  const proc = spawn(CHROME, chromeArgs(port, dir), { stdio: 'ignore' });
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) { ready = true; break; } } catch {}
      await sleep(150);
    }
    if (!ready) throw new Error('Chrome CDP 未就绪');
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = list.find(t => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0; const pend = new Map();
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
    const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async expr => {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300));
      return r.result && r.result.result ? r.result.result.value : undefined;
    };
    await send('Page.enable'); await send('Runtime.enable');
    await fn({ send, ev });
    ws.close();
  } finally { proc.kill('SIGKILL'); }
}

/* 320 下第一行落在视口底缘（top 654 / 视口 700），直接 click 偶发不跳转；
   scrollIntoView 居中后再点，并回读 #questionView 是否真的打开了。 */
const OPEN_SECTION = `(()=>{const r=document.querySelector('.drill-section-row');if(!r)return false;
  r.scrollIntoView({block:'center'});const b=r.querySelector('button,a')||r;b.click();return true})()`;
const IN_TEST = `(()=>{const v=document.getElementById('questionView');return !!v && !v.hidden})()`;
const SECTION_HREF = `(()=>{const r=document.querySelector('.drill-section-row');return r?(r.getAttribute('href')||''):''})()`;
/* 点的是 <a href="drill.html?unit=…&sec=…&i=1">：点击即整页导航。原来固定睡
   1.4s 再查 #questionView，机器一慢就判「没进答题态」。这里点完轮询，点不动
   就按 href 直达——验收的是答题态布局，不是浏览器导航时序。 */
async function openSection(ctx) {
  const href = await ctx.ev(SECTION_HREF);
  await ctx.ev(OPEN_SECTION);
  for (let i = 0; i < 20; i++) { await sleep(300); if (await ctx.ev(IN_TEST)) return true; }
  if (href) {
    try { await ctx.send('Page.navigate', { url: new URL(href, BASE + '/drill.html').href }); } catch (e) { /* href 坏了就走原路径 */ }
    for (let i = 0; i < 20; i++) { await sleep(300); if (await ctx.ev(IN_TEST)) return true; }
  }
  /* 兜底：某些尺寸下点击/导航在 CDP 里就是不落地，直接进第一个小节。 */
  try { await ctx.send('Page.navigate', { url: `${BASE}/drill.html?unit=1&sec=1.1&i=1` }); } catch (e) { /* 再失败就真红 */ }
  for (let i = 0; i < 20; i++) { await sleep(300); if (await ctx.ev(IN_TEST)) return true; }
  return false;
}

const READ = `(()=>{
  const hd=document.querySelector('.drill-context');
  const title=document.getElementById('currentSection');
  const right=document.querySelector('.drill-context-right');
  const st=document.getElementById('saveStatus');
  const q=document.getElementById('question');
  if(!hd||!title||!right||!q)return {missing:true};
  const rt=title.getBoundingClientRect();
  const cs=getComputedStyle(title);
  const rr=right.getBoundingClientRect();
  const lum=c=>{const v=c.map(x=>{const s=x/255;return s<=0.03928?s/12.92:Math.pow((s+0.055)/1.055,2.4)});return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2]};
  const fg=(st?getComputedStyle(st).color:'rgb(0,0,0)').match(/[0-9.]+/g).map(Number);
  let bg=[255,255,255]; if(st){let n=st;while(n){const b=getComputedStyle(n).backgroundColor;if(b&&b!=='rgba(0, 0, 0, 0)'){bg=b.match(/[0-9.]+/g).map(Number);break}
    n=n.parentElement}}
  const mix=(fg2,bg2,al)=>[0,1,2].map(i=>Math.round(fg2[i]*al+bg2[i]*(1-al)));
  const fgA=fg[3]===undefined?1:fg[3];
  const fgMix=mix(fg,bg.slice(0,3),fgA);
  const L1=lum(fgMix),L2=lum(bg.slice(0,3));
  const ratio=+((Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05)).toFixed(2);
  return {
    vw:innerWidth, hdH:Math.round(hd.getBoundingClientRect().height),
    title:{t:(title.textContent||'').trim(), w:Math.round(rt.width), sw:title.scrollWidth, cw:title.clientWidth,
      ws:cs.whiteSpace, ovf:cs.overflow, to:cs.textOverflow},
    right:{x:Math.round(rr.x), right:Math.round(rr.right), w:Math.round(rr.width), top:Math.round(rr.top)},
    titleBottom:Math.round(rt.bottom),
    status:{color:fg.slice(0,3).join(','), alpha:fgA, bg:bg.slice(0,3).join(','), ratio},
    barBottom:Math.round(document.querySelector('.drill-questionbar').getBoundingClientRect().bottom),
    qTop:Math.round(q.getBoundingClientRect().top),
    ovfX: document.documentElement.scrollWidth > innerWidth + 1
  }})()`;

const FULL_TITLE_MIN = 200;

async function audit(ctx, label, width, height, dark) {
  await ctx.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: width < 760 });
  await ctx.send('Emulation.setTouchEmulationEnabled', { enabled: width < 760, maxTouchPoints: 5 });
  await ctx.send('Page.navigate', { url: `${BASE}/drill.html?unit=1` });
  await sleep(800);
  for (let i = 0; i < 12; i++) {
    if (await ctx.ev(`document.querySelectorAll('.drill-section-row').length > 0`)) break;
    await sleep(400);
  }
  if (dark) { await ctx.ev(`try{localStorage.setItem('tdsat_theme','dark')}catch(e){};document.documentElement.setAttribute('data-theme','dark');1`); await sleep(400); }
  const opened = await openSection(ctx);
  if (!opened) { bad(`${label} 点开板块后没进答题态（#questionView 仍隐藏），本条跳过`); return; }
  const d = await ctx.ev(READ);
  if (!d || d.missing) { bad(`${label} 取不到答题态上下文条`); return; }
  const tag = `${label}${dark ? '（暗色）' : ''}`;
  const truncated = d.title.sw > d.title.cw + 1;
  if (width < 760) {
    if (truncated) bad(`${tag} 板块名被截断：宽 ${d.title.w}px / scrollWidth ${d.title.sw}，「${d.title.t}」读不全`);
    else ok(`${tag} 板块名完整（${d.title.w}px 宽，${d.title.t}）`);
    if (d.title.w < FULL_TITLE_MIN) bad(`${tag} 板块名列宽只有 ${d.title.w}px，低于 ${FULL_TITLE_MIN}`);
    if (d.right.right > d.vw - 8) bad(`${tag} 工具组右边界 ${d.right.right} 超出可用宽 ${d.vw - 8}`);
    if (d.hdH > 90) bad(`${tag} 上下文条涨到 ${d.hdH}px，吃掉题目区`);
  } else {
    if (d.hdH > 50) bad(`${tag} 桌面应保持 46px 单行，实测 ${d.hdH}px`);
    else ok(`${tag} 桌面保持单行 ${d.hdH}px`);
    if (truncated) bad(`${tag} 桌面板块名被截断（scrollWidth ${d.title.sw} > clientWidth ${d.title.cw}）`);
  }
  if (d.status.ratio < 4.5) bad(`${tag}「作答自动保存」对比只有 ${d.status.ratio}:1（${d.status.color} on ${d.status.bg}）`);
  else ok(`${tag}「作答自动保存」对比 ${d.status.ratio}:1`);
  if (d.barBottom > d.qTop) bad(`${tag} 工具条压到题干（barBottom ${d.barBottom} > qTop ${d.qTop}）`);
  if (d.ovfX) bad(`${tag} 出现横向滚动`);
}

async function shot(ctx, name) {
  const r = await ctx.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, name), Buffer.from(r.result.data, 'base64'));
}

const port = 9400 + Math.floor(Math.random() * 90);
console.log(`练习页上下文条验收 → ${BASE}`);
await withPage(port, async ctx => {
  await audit(ctx, '320×700', 320, 700, false);
  await audit(ctx, '375×760', 375, 760, false);
  await audit(ctx, '390×760', 390, 760, false);
  await audit(ctx, '320×700', 320, 700, true);
  await audit(ctx, '1024×800', 1024, 800, false);
  await ctx.send('Emulation.setDeviceMetricsOverride', { width: 320, height: 700, deviceScaleFactor: 2, mobile: true });
  await ctx.ev(`document.documentElement.removeAttribute('data-theme');try{localStorage.setItem('tdsat_theme','light')}catch(e){};1`);
  await ctx.send('Page.navigate', { url: `${BASE}/drill.html?unit=1` }); await sleep(1200);
  await openSection(ctx);
  await shot(ctx, 'practice-context-320.png');
});

console.log('');
if (failures.length) { console.log(`❌ 不合格 ${failures.length} 项：`); failures.forEach((f, i) => console.log(`   ${i + 1}. ${f}`)); process.exit(1); }
console.log('✅ 320/375/390 板块名完整、「作答自动保存」≥4.5:1、桌面保持单行 46px');
