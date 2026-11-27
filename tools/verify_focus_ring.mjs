#!/usr/bin/env node
/* tools/verify_focus_ring.mjs — 键盘焦点环体检（light / dark 各跑一遍）
 *
 * 为什么单独一个验收器：glass.css 为了去掉鼠标点击时浏览器默认深灰 outline，
 * 对一批元素写了 `outline:none!important`，再用 `:focus-visible` 白名单还回去。
 * 白名单一旦漏项（或者被后来更高特异性的规则盖掉），键盘 Tab 到那个控件就
 * 完全没有视觉反馈 —— 鼠标用户永远看不见，截图验收也永远发现不了。
 *
 * 实测踩到的：
 *   · 侧栏「设置」（.td-acct-btn）：白名单漏了它，outline-style = none
 *   · 开场页 Start（#btnStart）：app.css 里 `#btnStart:focus-visible` 用 id 选择器
 *     写了 #9dc0ff，白底上对比 1.9:1，等于没有
 *   · 暗黑下 exam 页是白纸，但 ring 被暗色规则换成浅银 rgba(232,232,234,.55)
 *     / rgb(127,168,255)，在白底上同样看不见
 *
 * 判定：Tab 遍历每页前 N 个可聚焦控件，A/BUTTON/INPUT/SELECT/TEXTAREA 必须有
 * 非 none 的 outline 或非 none 的 box-shadow；另外 exam 白纸页上 ring 的亮度
 * 必须低于 0.7（浅色 ring 在白纸上等于没有）。
 *
 * 用法：node tools/verify_focus_ring.mjs [--base URL] [--tabs 10]
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
const TABS = Number(argVal('--tabs', '10')) || 10;
let server = null;
if (!BASE) { server = await startStaticServer(ROOT, { mark: '.verify-focus-ring' }); BASE = server.base; }

const CDP = 9400 + Math.floor(Math.random() * 100);
const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${tempProfile('vfr-')}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
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
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

async function nav(p) {
  await send('Page.navigate', { url: BASE + p });
  for (let i = 0; i < 80; i++) { await sleep(120); if ((await ev('document.readyState')) === 'complete') break; }
  await sleep(900);
}
async function tabOnce() {
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  await sleep(140);
}

/* 取当前焦点元素的 ring 状态：outline 是否可见、ring 颜色的亮度 */
const FOCUS = `(()=>{
 const a=document.activeElement; if(!a||a===document.body) return null;
 if(!['A','BUTTON','INPUT','SELECT','TEXTAREA','SUMMARY'].includes(a.tagName)) return null;
 const cs=getComputedStyle(a);
 const oW=parseFloat(cs.outlineWidth)||0;
 const oStyle=cs.outlineStyle;
 const shadow=cs.boxShadow;
 const hasShadow=shadow && shadow!=='none';
 const hasOutline=oStyle!=='none' && oW>0;
 function lum(c){const m=String(c).match(/[\\d.]+/g);if(!m||m.length<3)return null;
   const f=v=>{v=v/255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};
   const r=+m[0],g=+m[1],b=+m[2];return .2126*f(r)+.7152*f(g)+.0722*f(b)}
 return {tag:a.tagName, id:a.id||'', cls:(a.className||'').toString().slice(0,36),
   txt:(a.textContent||'').trim().slice(0,24),
   outline:oStyle+' '+cs.outlineWidth+' '+cs.outlineColor,
   hasOutline, hasShadow, ringLum: hasOutline ? lum(cs.outlineColor) : null,
   whitePaper: document.body.classList.contains('exam-page')
   && lum(getComputedStyle(document.body).backgroundColor) > 0.7};
})()`;

const PAGES = ['/index.html', '/drill.html', '/wrong.html', '/history.html', '/jiangyi.html', '/exam.html?mode=quiz&unit=1', '/exam.html?mode=mock'];
const fails = [];
let checked = 0;

async function sweep(theme) {
  await nav('/index.html');
  await ev(`localStorage.setItem('tdsat_theme','${theme}')`);
  for (const p of PAGES) {
    await nav(p);
    await ev(`document.body.focus&&document.body.focus()`);
    for (let k = 0; k < TABS; k++) {
      await tabOnce();
      const st = await ev(FOCUS);
      if (!st) continue;
      checked++;
      const label = `${theme} ${p} ${st.tag}${st.id ? '#' + st.id : ''}.${st.cls} 「${st.txt}」`;
      if (!st.hasOutline && !st.hasShadow) {
        fails.push(`${label} → 无焦点环（outline=${st.outline}，box-shadow=none）`);
      } else if (st.whitePaper && st.hasOutline && st.ringLum != null && st.ringLum > 0.7) {
        fails.push(`${label} → 白纸页上 ring 太浅（${st.outline}，亮度 ${st.ringLum}）`);
      }
    }
  }
}

await sweep('light');
await sweep('dark');

console.log('=== 键盘焦点环 ===');
console.log(`共检查 ${checked} 个焦点态（light + dark，7 页 × ${TABS} 次 Tab）`);
if (fails.length) {
  console.log(`❌ 不合格 ${fails.length} 项：`);
  for (const f of fails) console.log('   ', f);
} else {
  console.log('✅ 所有聚焦控件都有可见 ring，白纸页上的 ring 亮度都 ≤ 0.7');
}
cleanup();
process.exit(fails.length ? 1 : 0);
