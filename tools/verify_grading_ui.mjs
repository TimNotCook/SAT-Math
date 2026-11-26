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

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);
const argVal = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const HAS_BASE = args.includes('--base');
const OUT = resolve(argVal('--out', '/tmp/grading-proof'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let BASE = argVal('--base', '');
let server = null;
if (!HAS_BASE) {
  const MARK = '.verify-grading-marker';
  const TOKEN = randomBytes(6).toString('hex');
  for (let k = 0; k < 8 && !BASE; k++) {
    const cand = 8300 + Math.floor(Math.random() * 600);
    const srv = spawn('python3', ['-m', 'http.server', String(cand), '--directory', ROOT], { stdio: 'ignore' });
    await sleep(600);
    try {
      writeFileSync(join(ROOT, MARK), TOKEN);
      const r = await fetch(`http://127.0.0.1:${cand}/${MARK}`, { cache: 'no-store' });
      if (r.ok && (await r.text()).trim() === TOKEN) { server = srv; BASE = `http://127.0.0.1:${cand}`; }
      else srv.kill('SIGKILL');
    } catch (e) { try { srv.kill('SIGKILL'); } catch (e2) {} }
  }
  try { unlinkSync(join(ROOT, MARK)); } catch (e) {}
  if (!BASE) { console.error('无法起本仓库静态服务器，请用 --base'); process.exit(2); }
}
const CDP = 9800 + Math.floor(Math.random() * 150);
mkdirSync(OUT, { recursive: true });
const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=/tmp/vgr-${Date.now()}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { proc.kill('SIGKILL'); } catch (e) {} if (server) { try { server.kill('SIGKILL'); } catch (e) {} } };
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
];

let pass = 0; const fails = [];
for (const c of CASES) {
  await send('Page.navigate', { url: `${BASE}/drill.html` });
  await sleep(900);
  await ev('localStorage.clear()');
  await send('Page.navigate', { url: `${BASE}/drill.html?sec=${encodeURIComponent(c.sec)}&i=${c.i}` });
  for (let k = 0; k < 80; k++) { await sleep(120); if ((await ev('document.readyState')) === 'complete') break; }
  await sleep(1300);

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
  const act = c.act.startsWith('choice:')
    ? await ev(`(function(){ var l='${c.act.slice(7)}'; var b=document.querySelector('#answerArea .drill-choice[data-choice="'+l+'"]'); if(!b) return 'missing'; b.click(); return 'ok'; })()`)
    : await ev(`(function(){
        var v='${c.act.slice(5)}'; var inp=document.getElementById('gridAnswer');
        if(!inp) return 'missing';
        inp.focus(); inp.value=v; inp.dispatchEvent(new Event('input',{bubbles:true}));
        inp.blur(); return 'ok'; })()`);
  await sleep(700);
  const fin = await ev(`(function(){ var b=document.getElementById('btnFinish'); if(!b) return 'no-finish'; b.click(); return 'ok'; })()`);
  await sleep(1600);
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
  const line = `${c.name} [${c.sec}#${c.i}] 操作=${act} 交卷=${fin} → right=${got?.right} wrong=${got?.wrong} blank=${got?.blank}${extra}`;
  if (ok) pass++; else fails.push(line + `（期望 right=${c.expect.right} wrong=${c.expect.wrong}）`);
  console.log((ok ? 'PASS ' : 'FAIL ') + line);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot?.data) writeFileSync(join(OUT, `grading-${pass + fails.length}-${c.name.replace(/\s+/g, '')}.png`), Buffer.from(shot.data, 'base64'));
}
console.log(`\n${pass}/${CASES.length} 通过，截图在 ${OUT}`);
cleanup();
process.exit(fails.length ? 1 : 0);
