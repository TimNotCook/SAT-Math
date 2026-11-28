#!/usr/bin/env node
/* tools/verify_grading_ui.mjs — 判分 UI 端到端（只读，本地或线上均可）
 *
 * 目的：grade-core 的单测只证明“函数对”，这里证明“页面把对的判成对、把错的判成错”。
 * 做法：每个用例清空 localStorage → 打开 drill 指定题位 → 作答 → 交卷 → 读结果页计数。
 *
 * 用法：
 *   node tools/verify_grading_ui.mjs
 *   node tools/verify_grading_ui.mjs --base https://timnotcook.github.io/SAT-Math
 */
import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { randomBytes } from 'crypto';
import { CHROME, tempProfile } from './lib/chrome.mjs';
import { startStaticServer } from './lib/serve.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);
const argVal = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const HAS_BASE = args.includes('--base');
const OUT = resolve(argVal('--out', '/tmp/grading-proof'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let BASE = argVal('--base', '');
let server = null;
if (!HAS_BASE) {
  let srvLocal = null;
try {
  srvLocal = await startStaticServer(ROOT, { mark: '.verify-grading-marker' });
  BASE = srvLocal.base;
  server = srvLocal;
} catch (e) {
  console.error('无法起本仓库静态服务器，请用 --base：' + e.message);
  process.exit(2);
}
}
const CDP = 9800 + Math.floor(Math.random() * 150);
mkdirSync(OUT, { recursive: true });
const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${tempProfile('vgr-')}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { proc.kill('SIGKILL'); } catch (e) {} if (server) { try { server.stop(); } catch (e) {} } };
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok) break; } catch (e) {}
  await sleep(250);
}
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

/* 等页面真的画出答案区再动手：固定 sleep 在大题库 + 并发加载时会把「还没渲染」
   读成「没有选项」（本轮真踩到一次：mcq 答对报 操作=missing）。 */
async function waitFor(expr, ms = 7000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    /* 交卷会整页跳到结果页：轮询期间执行上下文被销毁是正常现象，
       以前这里直接抛出去，用例被记成"读不到结果"，看起来像产品坏了。 */
    try { if (await ev(expr)) return true; } catch (e) { /* 导航中，继续等 */ }
    await sleep(150);
  }
  return false;
}

/* 题库现在没有两空 grid-in（values.length>1 命中 0），双空输入框就永远没机会被真跑。
   这里在「TD_APP 被 app-core 赋值」的瞬间往 CATALOG['1.1'] 尾部挂一道合成题，
   drill.js 随后按 CATALOG 建题单，就真的会渲染两个框——不是 mock 渲染函数，
   走的是与用户同一条路径（输入 → 落盘 → 交卷 → 判分）。 */
await send('Page.addScriptToEvaluateOnNewDocument', { source: `(function(){
  var real = null;
  Object.defineProperty(window, 'TD_APP', { configurable: true,
    get: function(){ return real; },
    set: function(v){
      real = v;
      try {
        var fake = { id:'ZZ-DUAL', type:'grid', values:[250,123.5], value:250, section:'1.1', unit:1,
                     origin:'official', no:99999, stem:'Two blanks', topic:'Linear', level:'easy', source:'synthetic' };
        var arr = v.CATALOG && v.CATALOG['1.1'];
        if (arr && !arr.some(function(q){ return q.id === 'ZZ-DUAL'; })) arr.push(fake);
      } catch (e) {}
    } });
})();` });

/* 用例：题位 / 作答方式 / 期望 */
const CASES = [
  { name: 'mcq 答对', sec: 'L1', i: 12, act: 'choice:D', expect: { right: 1, wrong: 0 } },
  { name: 'mcq 答错', sec: 'L1', i: 12, act: 'choice:A', expect: { right: 0, wrong: 1 } },
  { name: 'grid 分数答对', sec: '1.7.T1', i: 4, act: 'grid:16/17', expect: { right: 1, wrong: 0 } },
  { name: 'grid 明显错值', sec: '1.7.T1', i: 4, act: 'grid:1', expect: { right: 0, wrong: 1 } },
  /* 跨页契约：答错 → 交卷 → 错题回顾必须出现这道题 */
  { name: '错题进错题本', sec: 'L1', i: 12, act: 'choice:A', expect: { wrongbook: true } },
  /* 跨页契约：同一题订正后，错题卡必须标「已在练习中订正」 */
  { name: '订正后错题本标记', sec: 'L1', i: 12, act: 'choice:D', expect: { corrected: true }, seedWrong: true },
  /* 两空 grid-in（合成题，见上方注入）：两个框都填对 → 判对；顺序颠倒 → 判错 */
  { name: 'grid 两空都填对', sec: '1.1', synth: 'ZZ-DUAL', act: 'dual:250|123.5', expect: { right: 1, wrong: 0 } },
  { name: 'grid 两空顺序颠倒', sec: '1.1', synth: 'ZZ-DUAL', act: 'dual:123.5|250', expect: { right: 0, wrong: 1 } },
];

let pass = 0; const fails = [];
for (const c of CASES) {
  await send('Page.navigate', { url: `${BASE}/drill.html` });
  await sleep(900);
  await ev('localStorage.clear()');
  let pos = c.i;
  if (c.synth) {
    /* 合成题的题位由数据决定，别手填 */
    for (let k = 0; k < 40; k++) {
      pos = await ev(`(function(){ var c2=(window.TD_APP||{}).CATALOG; var arr=c2&&c2['${c.sec}']; if(!arr) return null;
        for (var i=0;i<arr.length;i++) if(arr[i].id==='${c.synth}') return i+1; return null; })()`);
      if (typeof pos === 'number' && pos > 0) break;
      await sleep(300);
    }
    if (!pos) { fails.push(`${c.name} 合成题没进 CATALOG（注入失败）`); console.log('FAIL ' + fails[fails.length-1]); continue; }
  }
  await send('Page.navigate', { url: `${BASE}/drill.html?sec=${encodeURIComponent(c.sec)}&i=${pos}` });
  for (let k = 0; k < 80; k++) { await sleep(120); if ((await ev('document.readyState')) === 'complete') break; }
  await waitFor(`(function(){ return !!document.querySelector('#answerArea .drill-choice, #answerArea .drill-grid-multi input, #answerArea #gridAnswer'); })()`);

  if (c.seedWrong) {
    /* 先故意答错一次并交卷，制造「已入错题本」的前提 */
    await send('Page.navigate', { url: `${BASE}/drill.html?sec=${encodeURIComponent(c.sec)}&i=${c.i}` });
    await sleep(1400);
    await ev(`(function(){ var b=document.querySelector('#answerArea .drill-choice[data-choice="A"]'); if(b) b.click(); })()`);
    await sleep(500);
    await ev(`(function(){ var b=document.getElementById('btnFinish'); if(b) b.click(); })()`);
    await sleep(1500);
    await send('Page.navigate', { url: `${BASE}/drill.html?sec=${encodeURIComponent(c.sec)}&i=${c.i}` });
    await sleep(1400);
  }
  const act = c.act.startsWith('dual:')
    ? await ev(`(function(){
        var parts = '${c.act.slice(5)}'.split('|');
        var boxes = document.querySelectorAll('.drill-grid-multi input');
        if (boxes.length !== 2) return 'boxes=' + boxes.length;
        boxes[0].value = parts[0]; boxes[0].dispatchEvent(new Event('input',{bubbles:true}));
        boxes[1].value = parts[1]; boxes[1].dispatchEvent(new Event('input',{bubbles:true}));
        return 'ok'; })()`)
    : c.act.startsWith('choice:')
    ? await ev(`(function(){ var l='${c.act.slice(7)}'; var b=document.querySelector('#answerArea .drill-choice[data-choice="'+l+'"]'); if(!b) return 'missing'; b.click(); return 'ok'; })()`)
    : await ev(`(function(){
        var v='${c.act.slice(5)}'; var inp=document.getElementById('gridAnswer');
        if(!inp) return 'missing';
        inp.focus(); inp.value=v; inp.dispatchEvent(new Event('input',{bubbles:true}));
        inp.blur(); return 'ok'; })()`);
  await sleep(700);
  const fin = await ev(`(function(){ var b=document.getElementById('btnFinish'); if(!b) return 'no-finish'; b.click(); return 'ok'; })()`).catch(function () { return 'nav'; });
  /* 交卷后跳结果页，等结果计数真的画出来再读；固定 sleep 在题库大、
     首屏慢的时候会把"还没渲染"读成 right=null（历史红就是这个）。 */
  await sleep(400);
  await waitFor(`(function(){ return !!document.getElementById('resultRight'); })()`, 15000);
  await sleep(300);
  const got = await ev(`(function(){
    var r=(document.getElementById('resultRight')||{}).textContent||'?';
    var w=(document.getElementById('resultWrong')||{}).textContent||'?';
    var b=(document.getElementById('resultBlank')||{}).textContent||'?';
    var n=(document.getElementById('resultNoticeText')||{}).textContent||'';
    return { right:+r, wrong:+w, blank:+b, notice:n }; })()`);
  let ok, extra = '';
  if (c.expect.wrongbook || c.expect.corrected) {
    await send('Page.navigate', { url: `${BASE}/wrong.html` });
    for (let k = 0; k < 80; k++) { await sleep(120); if ((await ev('document.readyState')) === 'complete') break; }
    await sleep(1200);
    const wb = await ev(`(function(){
      var cards = Array.prototype.slice.call(document.querySelectorAll('.wrong-card'));
      var hit = cards.filter(function(c){ return /第 12 题/.test(c.textContent) || /L1/.test(c.textContent) && /12/.test(c.textContent); });
      var corrected = hit.filter(function(c){ return /已在练习中订正/.test(c.textContent) || c.classList.contains('corrected'); });
      return { cards: cards.length, hit: hit.length, corrected: corrected.length }; })()`);
    ok = c.expect.wrongbook ? (wb && wb.hit >= 1) : (wb && wb.corrected >= 1);
    extra = ` 错题卡=${wb?.cards} 命中=${wb?.hit} 已订正=${wb?.corrected}`;
  } else {
    ok = got && got.right === c.expect.right && got.wrong === c.expect.wrong;
  }
  const line = `${c.name} [${c.sec}#${pos}] 操作=${act} 交卷=${fin} → right=${got?.right} wrong=${got?.wrong} blank=${got?.blank}${extra}`;
  if (ok) pass++; else fails.push(line + `（期望 right=${c.expect.right} wrong=${c.expect.wrong}）`);
  console.log((ok ? 'PASS ' : 'FAIL ') + line);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot?.data) writeFileSync(join(OUT, `grading-${pass + fails.length}-${c.name.replace(/\s+/g, '')}.png`), Buffer.from(shot.data, 'base64'));
}
console.log(`\n${pass}/${CASES.length} 通过，截图在 ${OUT}`);
cleanup();
process.exit(fails.length ? 1 : 0);
