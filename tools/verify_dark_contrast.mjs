#!/usr/bin/env node
/* tools/verify_dark_contrast.mjs — 暗黑主题可读性体检（light 基线差分口径）
 *
 * 事故：glass.css 的 dark 覆盖层是按「深色页面」写的（白膜 rgba(255,255,255,.08)
 * + 浅银字 #e8e8ea），但 exam 页刻意保持 Bluebook 白纸、history 页的 body 背景
 * 又被 app.css 的 !important 钉成浅色 —— 于是出现白底浅银字：
 *   · 成绩页标题「Score Report」、Review/Take Another Test 两个 CTA
 *   · exam 侧栏导航、设置按钮
 *   · 抽查开场「U1 专项练习」胶囊
 *   · 错题回顾 / 模考记录的空态白卡
 * 对比度只有 1.0–1.4:1，等于看不见。
 *
 * 判定口径：不只比 WCAG AA，而是拿 **light 主题做基线差分** —— 只有
 * 「dark 下低对比、light 下同一项正常」才算 dark 回归。这样既不会把 Bluebook
 * 冻结基线里既有的一批灰阶小字判红，也不会因为放宽阈值漏掉真回归。
 * 渐变背景（浅银渐变主按钮）没有 backgroundColor，跳过，避免误报。
 *
 * 用法：node tools/verify_dark_contrast.mjs [--base URL]
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { CHROME, tempProfile } from './lib/chrome.mjs';
import { startStaticServer } from './lib/serve.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);
const argVal = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : ''; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let BASE = argVal('--base');
let server = null;
if (!BASE) { server = await startStaticServer(ROOT, { mark: '.verify-dark-contrast' }); BASE = server.base; }

const CDP = 9700 + Math.floor(Math.random() * 120);
const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${tempProfile('vdc-')}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
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
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }).then((r) => r)).result?.value;
await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });

async function nav(p) {
  await send('Page.navigate', { url: BASE + p });
  for (let i = 0; i < 80; i++) { await sleep(120); if ((await ev('document.readyState')) === 'complete') break; }
  await sleep(1100);
}

/* 扫描首屏可见文本的对比度：忽略渐变/图片背景（无 backgroundColor）、半透明遮罩按祖先链取实底。 */
const SCAN = `(()=>{
 function rgb(c){const m=String(c).match(/rgba?\\(([\\d.]+),\\s*([\\d.]+),\\s*([\\d.]+)(?:,\\s*([\\d.]+))?/);return m?{r:+m[1],g:+m[2],b:+m[3],a:m[4]===undefined?1:+m[4]}:null}
 function lum(x){if(!x)return null;const f=v=>{v=v/255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(x.r)+.7152*f(x.g)+.0722*f(x.b)}
 function bgOf(el){let e=el;while(e&&e!==document.documentElement){const c=getComputedStyle(e);const bg=rgb(c.backgroundColor);if(bg&&bg.a>0.85)return bg;e=e.parentElement}
  const bb=rgb(getComputedStyle(document.body).backgroundColor);return bb&&bb.a>0.85?bb:{r:255,g:255,b:255,a:1}}
 const out=[];
 document.querySelectorAll('body *').forEach(el=>{
  if(['SCRIPT','STYLE','LINK','META','SVG','PATH','IMG','CANVAS','INPUT','SELECT','TEXTAREA','OPTION'].includes(el.tagName))return;
  let own='';for(const n of el.childNodes){if(n.nodeType===3)own+=n.nodeValue}
  own=own.replace(/\\s+/g,' ').trim();if(own.length<2)return;
  const cs=getComputedStyle(el);
  if(cs.visibility==='hidden'||cs.display==='none'||parseFloat(cs.opacity)<0.55)return;
  let hasImg=false;{let e=el;while(e&&e!==document.body){if(getComputedStyle(e).backgroundImage!=='none'){hasImg=true;break}e=e.parentElement}}
  if(hasImg)return;   // 渐变/图片底无法用 backgroundColor 判对比度（浅银渐变主按钮就是这类），跳过
  const r=el.getBoundingClientRect();if(r.width<4||r.height<4)return;
  if(r.top>innerHeight+200||r.bottom<-20)return;
  const fg=rgb(cs.color);if(!fg||fg.a<0.55)return;
  const bg=bgOf(el);const L=lum(fg),B=lum(bg);if(L==null||B==null)return;
  const hi=Math.max(L,B),lo=Math.min(L,B);const ratio=(hi+.05)/(lo+.05);
  const size=parseFloat(cs.fontSize)||12,bold=parseInt(cs.fontWeight)>=600;
  const need=(size>=18.66||(size>=14&&bold))?3:4.5;
  if(ratio<need) out.push({t:own.slice(0,26),cls:(el.className||'').toString().slice(0,28),cr:+ratio.toFixed(2)});
 });
 return JSON.stringify(out);
})()`;

/* exam 页必须始终是 Bluebook 白纸：暗黑主题下卷面若被深底规则吃掉，
   差分对比度反而会「全绿」（深底浅字），所以单独断言背景亮度。 */
const BG_LUM = `(()=>{const m=getComputedStyle(document.body).backgroundColor.match(/[\\d.]+/g)||[];const r=+m[0],g=+m[1],b=+m[2];
 const f=v=>{v=v/255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};
 return +((.2126*f(r)+.7152*f(g)+.0722*f(b)).toFixed(3))})()`;

const PAGES = ['/index.html', '/drill.html', '/wrong.html', '/history.html', '/jiangyi.html', '/exam.html?mode=quiz&unit=1', '/exam.html?mode=mock'];
// key 里不能带日期时间这类每次渲染都变的文本，否则 light/dark 对不上，差分失效
const norm = (t) => String(t).replace(/[0-9][0-9/.:,\- ]*/g, '#').replace(/\s+/g, ' ').trim();
const KEY = (page, x) => `${page}|${norm(x.t)}|${x.cls}`;

async function collect(theme) {
  await nav('/index.html');
  await ev(`localStorage.setItem('tdsat_theme','${theme}')`);
  const map = new Map(); const white = {};
  for (const p of PAGES) {
    await nav(p);
    if (p.startsWith('/exam.html')) white[p] = await ev(BG_LUM);
    const list = JSON.parse((await ev(SCAN)) || '[]');
    for (const x of list) map.set(KEY(p, x), x);
  }
  // 模考答题页与成绩页各扫一次
  await nav('/exam.html?mode=mock');
  await ev(`document.getElementById('btnStart')&&document.getElementById('btnStart').click()`);
  await sleep(1500);
  white.answer = await ev(BG_LUM);
  let list = JSON.parse((await ev(SCAN)) || '[]');
  for (const x of list) map.set(KEY('answer', x), x);
  await ev(`(()=>{const k='tdsat_exam_suite_session_v1';const s=JSON.parse(localStorage.getItem(k)||'null');if(!s)return false;
    s.startedAt=Date.now()-3600000;s.endsAt=Date.now()-1000;s.moduleEndsAt=Date.now()-1000;s.stage='answer';
    localStorage.setItem(k,JSON.stringify(s));return true;})()`);
  await nav('/exam.html?mode=mock');
  await ev(`document.getElementById('btnStart')&&document.getElementById('btnStart').click()`);
  for (let i = 0; i < 80; i++) { if (await ev(`!!(document.getElementById('stage-result')&&!document.getElementById('stage-result').hidden)`)) break; await sleep(200); }
  await sleep(800);
  white.result = await ev(BG_LUM);
  list = JSON.parse((await ev(SCAN)) || '[]');
  for (const x of list) map.set(KEY('result', x), x);
  return { map, white };
}

const light = await collect('light');
const dark = await collect('dark');
const whiteFails = Object.entries(dark.white).filter(([, l]) => !(typeof l === 'number' && l >= 0.70));
const map = dark.map;
const regressions = [];
for (const [k, x] of map) if (!light.map.has(k)) regressions.push({ key: k, cr: x.cr });
void light.white;

const totalDarkLow = map.size;
console.log('=== 暗黑可读性（差分口径）===');
console.log(`light 下低于 AA 的可见文本：${light.map.size} 项（既有灰阶设计，作为基线放行）`);
console.log(`dark  下低于 AA 的可见文本：${totalDarkLow} 项`);
const wv = Object.entries(dark.white).map(([k, l]) => `${k.replace('/exam.html','')}=${l}`).join(' ');
console.log(`dark  exam 页卷面亮度：${wv}`);
if (whiteFails.length) {
  console.log('❌ 暗黑下 exam 页卷面不再是白纸：');
  for (const [k, l] of whiteFails) console.log('   ', k, 'bodyBg亮度=', l);
}
if (!Object.keys(dark.white).length) { console.log('❌ 白纸断言没采到样本'); process.exitCode = 1; }
if (regressions.length) {
  console.log(`❌ dark 独有回归：${regressions.length} 项`);
  for (const r of regressions) console.log('   ', r.cr, '|', r.key);
} else {
  console.log('✅ dark 独有回归：0 项 —— 暗黑下没有「light 正常、dark 看不见」的文本');
}

cleanup();
process.exit((regressions.length || whiteFails.length) ? 1 : 0);
