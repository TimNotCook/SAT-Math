#!/usr/bin/env node
/* tools/verify_acct_entry.mjs — 设置入口（.td-acct-btn）四视图只读回归
 *
 * 只读：只 goto / click / 读 DOM 尺寸，不写库、不改文件、不登录。
 * 断言每个视图里 .td-acct-btn 存在、getBoundingClientRect().width > 0，
 * 点击能打开面板（.td-acct-layer[data-open="1"]），窄屏 390 仍 width > 0。
 *
 * 例外（口径见 app.css:786 模考开场页 v2）：#stage-intro.active 时按设计不显示悬浮设置，
 * 免得和页头 Back 抢同一个角。所以模考开场页断言「确实隐藏」，模考作答/检查/交卷/成绩
 * 四阶段仍断言 width > 0；切阶段必须同时切 hidden 与 active，否则 :has() 规则不生效。
 *
 * 用法：
 *   node tools/verify_acct_entry.mjs
 *   node tools/verify_acct_entry.mjs --base https://timnotcook.github.io/SAT-Math --out /tmp/proof-acct
 */
import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { randomBytes } from 'crypto';
import { startStaticServer } from './lib/serve.mjs';
import { CHROME, tempProfile } from './lib/chrome.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);
const argVal = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const HAS_BASE = args.includes('--base');
const OUT = resolve(argVal('--out', '/tmp/sat-acct-proof'));
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* 端口必须自证是「本仓库」的服务器：固定端口曾被别的 worktree 的 http.server 占住，
   测到的全是旧代码（2026-11-26 踩过）。所以随机端口 + 写标记文件 + 回读校验。 */
let PORT = 0;
let BASE = argVal('--base', '');
let server = null;
if (!HAS_BASE) {
  /* 端口必须自证是「本仓库」：固定端口曾被别的 worktree 的 http.server 占住，
     测到的全是旧代码（2026-11-26 踩过）。node 静态服务器随机端口 + marker 回读，
     顺便干掉 python 并发 reset 的毛病。 */
  try {
    server = await startStaticServer(ROOT, { mark: '.verify-acct-marker' });
    PORT = server.port;
    BASE = server.base;
  } catch (e) {
    console.error('无法起本仓库的静态服务器，请用 --base 指向本地/线上站点：' + e.message);
    process.exit(2);
  }
}
const CDP = 9800 + Math.floor(Math.random() * 150);

mkdirSync(OUT, { recursive: true });
const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${tempProfile('vae-')}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { proc.kill('SIGKILL'); } catch (e) {} if (server) { try { server.stop(); } catch (e) {} } };
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });

for (let i = 0; i < 60; i++) {
  try { if ((await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok) break; } catch (e) {}
  await sleep(250);
}
const tabs = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json();
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let mid = 0; const pending = new Map();
ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => {
  const i = ++mid; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params }));
  setTimeout(() => { if (pending.has(i)) { pending.delete(i); r({}); } }, 25000);
});
const ev = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
async function goto(url) {
  await send('Page.navigate', { url });
  for (let i = 0; i < 80; i++) { await sleep(120); if ((await ev('document.readyState')) === 'complete') break; }
  await sleep(1400); // 入口有 900ms 周期重挂宿主
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  if (r.data) writeFileSync(join(OUT, name), Buffer.from(r.data, 'base64'));
}
const results = [];
const check = (id, expect, actual, pass) => {
  results.push({ id, expect, actual, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id}\n      期望 ${expect}\n      实测 ${actual}`);
};

/* 结果视图：宿主缺口诊断（只读，不修）
 * 现象：drill.html?sec=1.1&result=1 下 .td-acct-btn 存在但 width=0。
 * 根因：app.css:532-537 的冻结规则在 resultView 可见时把 .site-rail 整块 display:none，
 *       而该视图又没有 .drill-context-right 可挂（ctx display:none），mountButton 找不到可见宿主。
 * 结论：交编程者决定宿主（结果页头部或固定角标），本脚本只负责把它标红。 */
const PROBE = `(() => {
  const btns = Array.from(document.querySelectorAll('.td-acct-btn'));
  const first = btns[0] || null;
  if (!first) return { n: 0 };
  const r = first.getBoundingClientRect();
  const host = first.parentElement ? (first.parentElement.className || first.parentElement.id) : '';
  const ph = first.parentElement ? first.parentElement.getBoundingClientRect() : { width: 0 };
  const rail = document.querySelector('.site-rail');
  const ctx = document.querySelector('.drill-context-right');
  return { n: btns.length, w: Math.round(r.width), h: Math.round(r.height),
           cls: first.className, host: String(host).slice(0, 60),
           pw: Math.round(ph.width),
           rail: rail ? (rail.getClientRects().length + '/' + getComputedStyle(rail).display + '/' + Math.round(rail.getBoundingClientRect().width)) : 'none',
           ctx: ctx ? (ctx.getClientRects().length + '/' + getComputedStyle(ctx).display) : 'none',
           layers: document.querySelectorAll('.td-acct-layer').length };
})()`;
async function probeWide(minW = 1, tries = 40) {
  let p = { n: 0, w: 0, h: 0 };
  for (let i = 0; i < tries; i++) {
    p = (await ev(PROBE)) || { n: 0, w: 0, h: 0 };
    if (p.n > 0 && p.w >= minW) return p;
    await sleep(200);
  }
  return p;
}

const CLICKS_OPEN = `(() => {
  const b = document.querySelector('.td-acct-btn'); if (!b) return { ok: false, why: 'no button' };
  b.click();
  const layer = document.querySelector('.td-acct-layer');
  const open = layer ? layer.getAttribute('data-open') : null;
  const panel = layer ? layer.querySelector('.td-acct-panel') : null;
  const pr = panel ? panel.getBoundingClientRect() : { width: 0, height: 0 };
  return { ok: open === '1' && pr.width > 0 && pr.height > 0, open: String(open),
           pw: Math.round(pr.width), ph: Math.round(pr.height) };
})()`;

const VIEWS = [
  { key: 'drill-list', page: 'drill.html', label: 'drill·列表视图', url: 'drill.html' },
  { key: 'drill-question', page: 'drill.html', label: 'drill·做题视图', url: 'drill.html?sec=1.1&i=1' },
  { key: 'drill-result', page: 'drill.html', label: 'drill·结果视图', url: 'drill.html?sec=1.1&result=1' },
  { key: 'exam-mock', page: 'exam.html', label: 'exam·模考作答视图', url: 'exam.html?mode=mock', stage: 'answer' }
];

const STAGE_SET = st => ev(`(() => { ['intro','answer','review','submit','result'].forEach(s => {
  const el = document.getElementById('stage-' + s); if (!el) return;
  el.hidden = (s !== '${st}'); el.classList.toggle('active', s === '${st}');
}); })()`);

for (const v of VIEWS) {
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await goto(`${BASE}/${v.url}`);
  if (v.stage) { await STAGE_SET(v.stage); await sleep(1200); }
  let p = await probeWide();
  if (p.n === 0) { // 首帧偶发未挂载：重载一次再测，避免把启动抖动记成失败
    await goto(`${BASE}/${v.url}`);
    if (v.stage) { await STAGE_SET(v.stage); await sleep(1200); }
    p = await probeWide();
  }
  check(`acct/${v.key}·存在`, '至少 1 个 .td-acct-btn', p.n > 0 ? `${p.n} 个（${p.cls} @ ${p.host}）` : '0 个', p.n > 0);
  check(`acct/${v.key}·宽度`, 'getBoundingClientRect().width > 0', `${p.w}×${p.h} parent=${p.pw} rail=${p.rail} ctx=${p.ctx}`, p.w > 0);
  const o = await ev(CLICKS_OPEN) || { ok: false };
  check(`acct/${v.key}·可点开`, '点击后 data-open=1 且面板有尺寸', `open=${o.open} panel=${o.pw}×${o.ph}`, !!o.ok);
  await ev(`(() => { const l = document.querySelector('.td-acct-layer'); if (l) l.setAttribute('data-open','0'); })()`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const pm = await probeWide();
  check(`acct/${v.key}·390 宽度`, '窄屏下 width > 0', `${pm.w}×${pm.h} parent=${pm.pw} rail=${pm.rail}`, pm.w > 0);
  await shot(`acct-${v.key}-390.png`);
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await sleep(400);
  await shot(`acct-${v.key}-1280.png`);
  await send('Emulation.clearDeviceMetricsOverride');
}

/* 首页与讲义页：首页已成根跳转桩（落在 drill），断言跳转后入口可见；
   讲义页自 dee8483 起也挂了 cloud-account.js，按同标准四项校验。 */
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await goto(`${BASE}/index.html`);
const idx = await ev(`(() => ({
  path: location.pathname,
  hasScript: Array.from(document.scripts).some(s => /cloud-account\\.js/.test(s.src)),
  btns: document.querySelectorAll('.td-acct-btn').length
}))()`) || {};
const idxProbe = await probeWide();
check('acct/index.html·跳转后入口', '根/首页跳到 drill.html，且该页入口 width > 0',
  `path=${idx.path} script=${idx.hasScript} btns=${idx.btns} w=${idxProbe.w}`,
  /\/drill\.html$/.test(idx.path || '') && idx.hasScript === true && idxProbe.w > 0);
await shot('acct-index-redirect-1280.png');
await send('Emulation.clearDeviceMetricsOverride');

await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await goto(`${BASE}/jiangyi.html`);
let jy = await probeWide();
if (jy.n === 0) { await goto(`${BASE}/jiangyi.html`); jy = await probeWide(); }
check('acct/jiangyi.html·存在', '至少 1 个 .td-acct-btn（该页已加载 cloud-account.js）',
  jy.n > 0 ? `${jy.n} 个（${jy.cls} @ ${jy.host}）` : '0 个', jy.n > 0);
check('acct/jiangyi.html·宽度', 'getBoundingClientRect().width > 0', `${jy.w}×${jy.h} rail=${jy.rail}`, jy.w > 0);
const jo = await ev(CLICKS_OPEN) || { ok: false };
check('acct/jiangyi.html·可点开', '点击后 data-open=1 且面板有尺寸', `open=${jo.open} panel=${jo.pw}×${jo.ph}`, !!jo.ok);
await ev(`(() => { const l = document.querySelector('.td-acct-layer'); if (l) l.setAttribute('data-open','0'); })()`);
await shot('acct-jiangyi-1280.png');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const jm = await probeWide();
check('acct/jiangyi.html·390 宽度', '窄屏下 width > 0', `${jm.w}×${jm.h}`, jm.w > 0);
await shot('acct-jiangyi-390.png');
await send('Emulation.clearDeviceMetricsOverride');

/* 模考各阶段：2026-11-26 已修（作答挂 .exam-toolbar-actions，检查/交卷/成绩走 fixed 兜底），
   这里从信息项升级为断言项，防止回退。手法：同时切 #stage-* 的 hidden 与 .active，
   让 app.css 的 :has(#stage-intro.active) 与 .stage 显示规则都真实生效。
   开场页（intro）按模考开场页 v2 口径断言「入口确实隐藏」，其余四阶段断言 width > 0。 */
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await goto(`${BASE}/exam.html?mode=mock`);
await probeWide();
const examStages = [];
for (const st of ['intro', 'answer', 'review', 'submit', 'result']) {
  await STAGE_SET(st);
  await sleep(1300);
  const m = await ev(PROBE) || { w: 0, cls: '', n: 0 };
  examStages.push(`${st}=${m.w}`);
  if (st === 'intro') {
    check('acct/exam·intro', '开场页按设计不显示悬浮设置入口（width === 0）',
      `${m.w}×${m.h} ${m.cls ? '[' + m.cls + ']' : ''}`, m.n > 0 && m.w === 0);
  } else {
    check(`acct/exam·${st}`, `${st} 阶段 .td-acct-btn width > 0`,
      `${m.w}×${m.h} ${m.cls ? '[' + m.cls + ']' : ''}`, m.w > 0);
  }
}
console.log(`INFO  模考阶段入口宽度：${examStages.join(' / ')}`);
await send('Emulation.clearDeviceMetricsOverride');

const failed = results.filter(r => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} 通过，截图在 ${OUT}`);
writeFileSync(join(OUT, 'result.json'), JSON.stringify({ base: BASE, passed: results.length - failed.length, total: results.length, failed }, null, 2));
ws.close(); cleanup();
process.exit(failed.length ? 1 : 0);
