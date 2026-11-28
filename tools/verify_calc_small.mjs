#!/usr/bin/env node
/**
 * 计算器面板「矮窗口」验收：
 * .bb-calc-panel 的高度原本写死 min(520px, 100vh - 260px)，
 * 视口一矮（320×380 / 568×320 横屏 / 1024×600 小窗），面板只剩 60~120px —— 只有标题栏，
 * Desmos 一个键都看不见，等于打不开。此脚本守住：
 *  1) 高度 ≤640 的视口里，面板高度必须吃满视口（≥ vh - 32）；
 *  2) 面板整体不越界（top ≥ 0、bottom ≤ vh、宽 ≤ vw）；
 *  3) 面板内部 body 有可用高度（≥180）且 iframe 渲染出了尺寸；
 *  4) 关闭按钮在视口内且点得到；
 *  5) 视口够高时（700 / 800）不能被矮窗规则影响，仍按原公式 min(520, vh-260)，top 180/188。
 * 用法：node tools/verify_calc_small.mjs --base http://127.0.0.1:PORT
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
  const dir = tempProfile('vcs-');
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

const READ = `(()=>{
  const p=document.querySelector('.bb-calc-panel');
  if(!p) return {missing:true};
  const r=p.getBoundingClientRect();
  const body=p.querySelector('.bb-calc-body');
  const frame=p.querySelector('iframe');
  const close=p.querySelector('.bb-calc-close');
  const br=body?body.getBoundingClientRect():null;
  const fr=frame?frame.getBoundingClientRect():null;
  const cr=close?close.getBoundingClientRect():null;
  const cx=cr?Math.round(cr.left+cr.width/2):0, cy=cr?Math.round(cr.top+cr.height/2):0;
  const hit=cr?document.elementFromPoint(cx,cy):null;
  return {vw:innerWidth, vh:innerHeight,
    w:Math.round(r.width), h:Math.round(r.height), top:Math.round(r.top), bottom:Math.round(r.bottom),
    left:Math.round(r.left), right:Math.round(r.right),
    bodyH: br?Math.round(br.height):null, frameW: fr?Math.round(fr.width):null, frameH: fr?Math.round(fr.height):null,
    closeH: cr?Math.round(cr.height):null, closeInView: cr?(cr.top>=0&&cr.bottom<=innerHeight):false,
    closeHit: !!(hit&&(close.contains(hit))), hitTag: hit?(hit.className||hit.tagName):null,
    ovfX: document.documentElement.scrollWidth>innerWidth+1}})()`;

async function toAnswer(ctx, w, h) {
  await ctx.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: w < 760 });
  await ctx.send('Emulation.setTouchEmulationEnabled', { enabled: w < 760, maxTouchPoints: 5 });
  await ctx.ev(`try{localStorage.removeItem('tdsat_exam_suite_session_v1')}catch(e){};1`);
  await ctx.send('Page.navigate', { url: `${BASE}/exam.html?mode=mock` });
  await sleep(900);
  for (let i = 0; i < 60; i++) { if (await ctx.ev(`!!document.getElementById('btnStart')&&!!window.__TD_EXAM__`)) break; await sleep(150); }
  await ctx.ev(`document.getElementById('btnStart')&&document.getElementById('btnStart').click()`);
  for (let i = 0; i < 60; i++) {
    if (await ctx.ev(`!!(document.getElementById('stage-answer')&&!document.getElementById('stage-answer').hidden)`)) break;
    await sleep(200);
  }
  await sleep(400);
  const opened = await ctx.ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/Calculator/i.test(x.textContent||''));if(!b)return false;b.click();return true})()`);
  /* 面板是 Desmos 异步注入的：固定 700ms 在 320×380 偶发读不到 .bb-calc-panel，
     看起来像「点不开」。轮询到面板出现（最多 10 秒）再返回。 */
  for (let i = 0; i < 25; i++) {
    if (await ctx.ev(`!!document.querySelector('.bb-calc-panel')`)) break;
    await sleep(400);
  }
  return opened;
}

const SHORT = [[320, 380, '320×380'], [568, 320, '568×320 横屏'], [1024, 600, '1024×600 小窗']];
const TALL = [[320, 700, '320×700'], [1024, 800, '1024×800']];

async function auditShort(ctx, w, h, label) {
  if (!await toAnswer(ctx, w, h)) { bad(`${label} 点不开计算器`); return; }
  const d = await ctx.ev(READ);
  if (!d || d.missing) { bad(`${label} 没有 .bb-calc-panel`); return; }
  if (d.h < d.vh - 32) bad(`${label} 面板高 ${d.h}px < ${d.vh - 32}（矮窗里被写死的高度压扁）`);
  else ok(`${label} 面板高 ${d.h}px（吃满视口）`);
  if (d.top < 0 || d.bottom > d.vh) bad(`${label} 面板纵向出界 ${d.top}..${d.bottom} / ${d.vh}`);
  else ok(`${label} 面板纵向在视口内 ${d.top}..${d.bottom}`);
  if (d.left < 0 || d.right > d.vw) bad(`${label} 面板横向出界 ${d.left}..${d.right} / ${d.vw}`);
  else ok(`${label} 面板横向在视口内 ${d.left}..${d.right}`);
  if (!d.bodyH || d.bodyH < 180) bad(`${label} 计算器 body 只有 ${d.bodyH}px，Desmos 压没了`);
  else ok(`${label} body 可用高度 ${d.bodyH}px`);
  if (!d.frameW || !d.frameH) bad(`${label} iframe 没渲染出尺寸`);
  else ok(`${label} iframe ${d.frameW}×${d.frameH}`);
  if (!d.closeInView) bad(`${label} 关闭按钮不在视口内`);
  else if (!d.closeHit) bad(`${label} 关闭按钮中心点被 ${d.hitTag} 挡住`);
  else ok(`${label} 关闭按钮可点`);
  if (d.ovfX) bad(`${label} 页面出现横向滚动`);
}

async function auditTall(ctx, w, h, label, expH, expTop) {
  if (!await toAnswer(ctx, w, h)) { bad(`${label} 点不开计算器`); return; }
  const d = await ctx.ev(READ);
  if (!d || d.missing) { bad(`${label} 没有 .bb-calc-panel`); return; }
  if (Math.abs(d.h - expH) > 4) bad(`${label} 面板高 ${d.h}px（高视口下应保持 ${expH}px）`);
  else ok(`${label} 面板高 ${d.h}px（未受矮窗规则影响）`);
  if (Math.abs(d.top - expTop) > 4) bad(`${label} 面板 top ${d.top}（应保持 ${expTop}）`);
  else ok(`${label} 面板 top ${d.top}`);
}

const port = 9600 + Math.floor(Math.random() * 40);
console.log(`计算器矮窗验收 → ${BASE}`);
await withPage(port, async ctx => {
  for (const [w, h, label] of SHORT) await auditShort(ctx, w, h, label);
  for (const [w, h, label] of TALL) await auditTall(ctx, w, h, label, Math.min(520, h - 260), w < 760 ? 180 : 188);
  await ctx.send('Emulation.setDeviceMetricsOverride', { width: 568, height: 320, deviceScaleFactor: 2, mobile: true });
  if (await toAnswer(ctx, 568, 320)) {
    await sleep(3500);
    const r = await ctx.send('Page.captureScreenshot', { format: 'png' });
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, 'calc-small-568x320.png'), Buffer.from(r.result.data, 'base64'));
  }
});

console.log('');
if (failures.length) { console.log(`❌ 不合格 ${failures.length} 项：`); failures.forEach((f, i) => console.log(`   ${i + 1}. ${f}`)); process.exit(1); }
console.log('✅ 矮窗口里计算器吃满视口、body/iframe 有可用高度、关闭可点，高视口保持原尺寸');
