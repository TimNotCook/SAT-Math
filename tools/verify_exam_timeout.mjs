#!/usr/bin/env node
/* tools/verify_exam_timeout.mjs — 模考计时到点的用户路径（只读，只动浏览器 localStorage）
 *
 * 为什么单独一条：35 分钟的真实计时谁也不会坐着等，于是「到点会发生什么」
 * 长期只能靠读代码相信。本脚本把比时字段改到过去，用真实页面跑完整条路径：
 *   ① 起卷 → 答题视图，22 题、Module 1
 *   ② Module 1 到点 + 重载 → 开始页明示「现在在 Module 2」，点 Start 后卷面补齐 44 题
 *   ③ 总时间到点 + 重载 → 点 Start 直接出分：finished/auto/endReason=time，
 *      results 里多一条 total=44 的记录，结果页文案是 Auto-submitted
 * 判据全在页面真实状态与 localStorage 上，不 mock 任何东西。
 *
 * 用法：
 *   node tools/verify_exam_timeout.mjs
 *   node tools/verify_exam_timeout.mjs --base https://timnotcook.github.io/SAT-Math --out /tmp/timeout-proof
 *   CHROME_BIN=/usr/bin/chromium node tools/verify_exam_timeout.mjs     # Linux
 */
import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { randomBytes } from 'crypto';
import { CHROME, HEADLESS_ARGS } from './lib/chrome.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);
const argVal = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const HAS_BASE = args.includes('--base');
const OUT = resolve(argVal('--out', '/tmp/timeout-proof'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const KEY_SESSION = 'tdsat_exam_suite_session_v1';
const KEY_RESULTS = 'tdsat_exam_suite_results_v1';

let BASE = argVal('--base', '');
let server = null;
if (!HAS_BASE) {
  const MARK = '.verify-timeout-marker';
  const TOKEN = randomBytes(6).toString('hex');
  for (let k = 0; k < 8 && !BASE; k++) {
    const cand = 8700 + Math.floor(Math.random() * 400);
    const srv = spawn('python3', ['-m', 'http.server', String(cand), '--directory', ROOT], { stdio: 'ignore' });
    await sleep(700);
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

const CDP = 9700 + Math.floor(Math.random() * 90);
mkdirSync(OUT, { recursive: true });
const proc = spawn(CHROME, [...HEADLESS_ARGS, `--remote-debugging-port=${CDP}`, `--user-data-dir=/tmp/vet-${Date.now()}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
cleanupGuards();
function cleanupGuards() {
  const kill = () => { try { proc.kill('SIGKILL'); } catch (e) {} if (server) { try { server.kill('SIGKILL'); } catch (e) {} } };
  process.on('exit', kill);
  process.on('SIGINT', () => { kill(); process.exit(130); });
}
for (let i = 0; i < 80; i++) {
  try { if ((await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok) break; } catch (e) {}
  await sleep(250);
}
const tabs = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json();
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let mid = 0; const pending = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise((r) => {
  const i = ++mid; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params }));
  setTimeout(() => { if (pending.has(i)) { pending.delete(i); r({}); } }, 25000);
});
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) return '__ERR__' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text || '');
  return r.result?.value;
};
await send('Runtime.enable'); await send('Page.enable');

/* 本地 python http.server 冷启动或并发拉十几个大文件时偶尔会 reset 掉某个
   defer 脚本（exam-core.js 掉线 → exam.js 第 6 行 C 未定义 → 整页点不动）。
   这是跑批环境的毛病，不是站点行为：失败时整页重载一次（最多 3 次），
   期间把失败原因打在日志里，绝不静默。线上 CDN 不复现。 */
async function goto(url, label = '') {
  for (let attempt = 0; attempt < 3; attempt++) {
    const u = attempt === 0 ? url : url + (url.includes('?') ? '&' : '?') + 'retry=' + attempt;
    await send('Page.navigate', { url: u });
    for (let i = 0; i < 90; i++) { await sleep(120); if ((await ev('document.readyState')) === 'complete') break; }
    let booted = false;
    for (let i = 0; i < 60; i++) {
      booted = !!(await ev(`(function(){var b=document.getElementById('btnStart');return !!(b&&window.__TD_EXAM__);})()`));
      if (booted) break;
      await sleep(150);
    }
    if (booted) { await sleep(300); return; }
    console.log(`WARN ${label} 第 ${attempt + 1} 次加载未完成（exam-core/exam.js 未就绪），整页重载`);
  }
  throw new Error(`${label} 连续 3 次加载不完整：exam-core.js 或 exam.js 没起来`);
}
async function startExam() {
  /* 监听未挂上时第一次点击可能落空，按状态重试而不是赌一次成功。 */
  for (let k = 0; k < 4; k++) {
    await ev(`(function(){var b=document.getElementById('btnStart');if(b)b.click();})()`);
    for (let i = 0; i < 14; i++) {
      await sleep(200);
      const st = await ev(`(function(){var s=document.querySelector('.stage.active');return s?s.id:'none';})()`);
      if (st !== 'stage-intro') return st;
    }
  }
  return await ev(`(function(){var s=document.querySelector('.stage.active');return s?s.id:'none';})()`);
}

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail: String(detail) }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  [' + detail + ']' : '')); };
const cap = async (slug) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  if (r?.data) writeFileSync(join(OUT, slug + '.png'), Buffer.from(r.data, 'base64'));
};

/* ---------- ① 起卷 ---------- */
await goto(`${BASE}/exam.html?mode=mock`, '起卷');
const stage1 = await startExam();
const s1 = await ev(`(function(){var s=JSON.parse(localStorage.getItem('${KEY_SESSION}')||'null');return s?{paper:s.paper.length,module:s.module,finished:s.finished}:null;})()`);
check('起卷进入答题视图', stage1 === 'stage-answer', `stage=${stage1}`);
check('起卷卷面为 Module 1 的 22 题', s1 && s1.paper === 22 && s1.module === 1, JSON.stringify(s1));
await cap('timeout-1-start');

/* ---------- ② Module 1 到点 ---------- */
await ev(`(function(){var k='${KEY_SESSION}';var s=JSON.parse(localStorage.getItem(k));var now=Date.now();
  s.moduleEndsAt=now-1000; s.endsAt=now+4000; localStorage.setItem(k,JSON.stringify(s)); })()`);
await goto(`${BASE}/exam.html?mode=mock`, 'Module1 到点');
const introNote = await ev(`(function(){var n=document.getElementById('introNotice');return n&&!n.hidden?n.textContent.trim():'';})()`);
check('Module 1 到点后开始页明示已进入 Module 2', /Module 2/i.test(introNote), introNote.slice(0, 90));
const stage2 = await startExam();
const s2 = await ev(`(function(){var s=JSON.parse(localStorage.getItem('${KEY_SESSION}')||'null');return s?{paper:s.paper.length,module:s.module,finished:s.finished,endsIn:Math.round((s.endsAt-Date.now())/1000)}:null;})()`);
check('点 Start 后进答题视图且卷面补齐 44 题（Module 2）', stage2 === 'stage-answer' && s2 && s2.paper === 44 && s2.module === 2, JSON.stringify({ stage2, s2 }));
await cap('timeout-2-module2');

/* ---------- ③ 总时间到点 → 自动交卷 ---------- */
const before = await ev(`(function(){var r=JSON.parse(localStorage.getItem('${KEY_RESULTS}')||'[]');return Array.isArray(r)?r.length:-1;})()`);
await ev(`(function(){var k='${KEY_SESSION}';var s=JSON.parse(localStorage.getItem(k));var now=Date.now();
  s.moduleEndsAt=now-1000; s.endsAt=now-500; localStorage.setItem(k,JSON.stringify(s)); })()`);
await goto(`${BASE}/exam.html?mode=mock`, '总时间到点');
const stage3 = await startExam();
for (let i = 0; i < 20; i++) {
  const st = await ev(`(function(){var s=document.querySelector('.stage.active');return s?s.id:'none';})()`);
  if (st === 'stage-result') break;
  await sleep(250);
}
const fin = await ev(`(function(){
  var k='${KEY_SESSION}', rk='${KEY_RESULTS}';
  var s=JSON.parse(localStorage.getItem(k)||'null'); var all=JSON.parse(localStorage.getItem(rk)||'[]');
  var st=document.querySelector('.stage.active'); var res=document.getElementById('stage-result');
  var last=Array.isArray(all)&&all.length?all[all.length-1]:null;
  var vis = Array.prototype.map.call(document.querySelectorAll('.stage'), function(v){ return v.id + (v.hidden ? ':hidden' : ':shown'); });
  return { stage: st?st.id:'none', stages: vis.join(' '), finished: s&&s.finished, auto: s&&s.auto, endReason: s&&s.endReason,
           nBefore: ${before}, nAfter: Array.isArray(all)?all.length:-1,
           rec: last?{total:last.total,auto:!!last.auto,reason:last.reason,correct:last.correct,path:last.path}:null,
           text: ((res&&res.innerText)||'').replace(/\\s+/g,' ').slice(0,200) };
})()`);
await cap('timeout-3-result');
console.log('STAGES:', fin && fin.stages);
check('计时归零后停在成绩页', fin && fin.stage === 'stage-result', JSON.stringify(fin && fin.stage));
check('会话标记 finished / auto / endReason=time', fin && fin.finished === true && fin.auto === true && fin.endReason === 'time', JSON.stringify(fin && { f: fin.finished, a: fin.auto, r: fin.endReason }));
check('自动交卷落一条 44 题成绩记录（不重复写）', fin && fin.rec && fin.rec.total === 44 && fin.rec.auto === true && fin.rec.reason === 'time' && fin.nAfter === fin.nBefore + 1, JSON.stringify(fin && { rec: fin.rec, before: fin.nBefore, after: fin.nAfter }));
check('成绩页文案标明 Auto-submitted 与模块二路径', fin && /Auto-submitted/i.test(fin.text) && /Module 2 path/i.test(fin.text), fin && fin.text);

const pass = results.filter((r) => r.ok).length;
console.log(`\n${pass}/${results.length} 通过，截图在 ${OUT}`);
process.exit(results.some((r) => !r.ok) ? 1 : 0);
