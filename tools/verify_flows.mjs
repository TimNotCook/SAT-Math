#!/usr/bin/env node
/* tools/verify_flows.mjs — 用户动作回归（只读：不写库、不改仓库文件，只动浏览器 localStorage）
 *
 * 补的是别的脚本没覆盖的“人手会做的动作”：
 *   drill  ：起练 → 选项选中 → 存档 → 刷新后仍选中 → 标记/划除刷新后仍在
 *            → 题号面板格数=题数、点号跳题
 *   wrong  ：预置一条答错 → 卡片出现 → 单元筛选切换后列表收敛
 *   history：预置已交卷 + 未做完 → 两条 bar、展开/收起生效、续做入口存在
 *   jiangyi：板块 → 小节 → 题目渲染（题干非空）
 *
 * 用法：
 *   node tools/verify_flows.mjs
 *   node tools/verify_flows.mjs --base https://timnotcook.github.io/SAT-Math --out /tmp/flows-proof
 *   CHROME_BIN=/usr/bin/chromium node tools/verify_flows.mjs     # Linux
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
const OUT = resolve(argVal('--out', '/tmp/flows-proof'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let BASE = argVal('--base', '');
let server = null;
if (!HAS_BASE) {
  const MARK = '.verify-flows-marker';
  const TOKEN = randomBytes(6).toString('hex');
  for (let i = 0; i < 8 && !BASE; i++) {
    const cand = 8400 + Math.floor(Math.random() * 600);
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

const CDP = 9900 + Math.floor(Math.random() * 90);
mkdirSync(OUT, { recursive: true });
const proc = spawn(CHROME, [...HEADLESS_ARGS, `--remote-debugging-port=${CDP}`, `--user-data-dir=/tmp/vfl-${Date.now()}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { proc.kill('SIGKILL'); } catch (e) {} if (server) { try { server.kill('SIGKILL'); } catch (e) {} } };
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });
for (let i = 0; i < 80; i++) {
  try { if ((await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok) break; } catch (e) {}
  await sleep(250);
}
const tabs = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json();
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let mid = 0; const pending = new Map();
ws.addEventListener('message', (evm) => {
  const m = JSON.parse(evm.data);
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
async function goto(url) {
  await send('Page.navigate', { url });
  for (let i = 0; i < 90; i++) { await sleep(120); if ((await ev('document.readyState')) === 'complete') break; }
  await sleep(1300);
}
await send('Runtime.enable');
await send('Page.enable');

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail: String(detail) });
const cap = async (slug) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  if (r?.data) writeFileSync(join(OUT, slug + '.png'), Buffer.from(r.data, 'base64'));
};

/* ---------- 1. drill：作答 → 存档 → 刷新恢复 ---------- */
const DRILL = `${BASE}/drill.html?sec=1.1`;
await goto(DRILL);
check('drill 起练进入做题视图且有选项', await ev(`(function(){var q=document.getElementById('questionView');return !!(q&&!q.hidden&&document.querySelector('#answerArea .drill-choice'));})()`));
await cap('drill-1-question');

const pick = await ev(`(function(){var b=document.querySelector('#answerArea .drill-choice');if(!b)return null;var l=b.dataset.choice;b.click();return l;})()`);
await sleep(600);
const stored = await ev(`(function(){
  var s=JSON.parse(localStorage.getItem('tdsat_app_v1')||'{}'); var last=s.last;
  var sec=last&&s.sections&&s.sections[last.sec]; var a=sec&&sec.answers&&sec.answers[last.qid];
  return { qid:last?last.qid:null, v:a?a.v:null }; })()`);
check('drill 点选项后作答落盘', pick && stored && stored.v === pick, JSON.stringify({ pick, stored }));
const pressed = await ev(`document.querySelectorAll('#answerArea .drill-choice[aria-pressed="true"]').length`);
check('drill 选中态用 aria-pressed 表达（视觉/读屏同一真相）', pressed === 1, `pressed=${pressed}`);
const saveTxt = await ev(`(function(){var e=document.querySelector('.drill-save-status');return e?e.textContent.trim():'(missing)';})()`);
check('drill 存档状态条存在且非空', saveTxt && saveTxt !== '(missing)', saveTxt);

await goto(DRILL);
const restore = await ev(`(function(){
  var on=Array.from(document.querySelectorAll('#answerArea .drill-choice[aria-pressed="true"]'));
  var s=JSON.parse(localStorage.getItem('tdsat_app_v1')||'{}'); var last=s.last;
  var sec=last&&s.sections&&s.sections[last.sec]; var a=sec&&sec.answers&&sec.answers[last.qid];
  return { pressed:on.map(function(b){return b.dataset.choice;}).join(''), v:a?a.v:null, qid:last?last.qid:null }; })()`);
check('drill 刷新后已答选项仍高亮（aria-pressed=true 且与存档一致）',
  restore && restore.pressed === restore.v && !!restore.v, JSON.stringify(restore));

/* ---------- 2. drill：标记 / 划除 的持久化 ---------- */
await ev(`(function(){var b=document.getElementById('btnMark');if(b)b.click();})()`);
await sleep(500);
await goto(DRILL);
const markAfter = await ev(`(function(){var b=document.getElementById('btnMark');return b?b.getAttribute('aria-pressed'):'(missing)';})()`);
check('drill 标记刷新后保持', markAfter === 'true', `aria-pressed=${markAfter}`);

await ev(`document.getElementById('btnMark').focus()`);
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: '1', code: 'Digit1', modifiers: 8, windowsVirtualKeyCode: 49 });
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: '1', code: 'Digit1', modifiers: 8, windowsVirtualKeyCode: 49 });
await sleep(600);
const crossedLive = await ev(`document.querySelectorAll('#answerArea .drill-choice.is-crossed').length`);
await goto(DRILL);
const crossedAfter = await ev(`document.querySelectorAll('#answerArea .drill-choice.is-crossed').length`);
check('drill Shift+1 划除刷新后仍在', crossedLive === 1 && crossedAfter === 1, `live=${crossedLive} after=${crossedAfter}`);

/* ---------- 3. drill：题号面板 ---------- */
const openNav = await ev(`(function(){var b=document.getElementById('btnQuestionNav');if(!b)return 'no-btn';b.click();var g=document.getElementById('questionNav');return g&&!g.hidden;})()`);
await sleep(500);
const gridN = await ev(`document.querySelectorAll('#questionGrid button').length`);
const posTxt = await ev(`(function(){var p=document.getElementById('questionPosition');return p?p.textContent.trim():'';})()`);
const digits = posTxt.match(/(\d+)/g) || [];
const total = Number(digits.length ? digits[digits.length - 1] : 0);
check('drill 题号面板可开、格数=题数', openNav === true && gridN > 0 && gridN === total, `open=${openNav} grid=${gridN} total=${total} pos="${posTxt}"`);
const jumped = await ev(`(function(){var bs=document.querySelectorAll('#questionGrid button');if(!bs.length)return 'no-btn';bs[bs.length-1].click();return 'ok';})()`);
await sleep(900);
const posAfter = await ev(`(function(){var p=document.getElementById('questionPosition');return p?p.textContent.trim():'';})()`);
check('drill 点最后一个题号能跳过去', jumped === 'ok' && posAfter !== posTxt, `"${posTxt}" → "${posAfter}"`);
await cap('drill-2-navigator');

/* ---------- 4. wrong：预置答错 → 卡片 → 筛选 ---------- */
await goto(`${BASE}/wrong.html`);
const seeded = await ev(`(function(){
  var q=(window.TD_APP.CATALOG['1.1']||[]).filter(function(x){return x.type==='mcq';})[0];
  if(!q) return null;
  var letters=['A','B','C','D']; var wrong=letters.filter(function(l){return l!==String(q.answer||'').trim().toUpperCase();})[0];
  var t=Date.now();
  var state={sections:{'1.1':{answers:{},wrongLog:{},cursor:0,completed:false,marks:{}}},last:{sec:'1.1',qid:q.id,ts:t}};
  state.sections['1.1'].answers[q.id]={v:wrong,correct:false,ts:t};
  state.sections['1.1'].wrongLog[q.id]={v:wrong,ts:t};
  localStorage.setItem('tdsat_app_v1', JSON.stringify(state));
  localStorage.removeItem('tdsat_exam_suite_results_v1');
  localStorage.removeItem('tdsat_exam_suite_abandoned_v1');
  return { qid:q.id, wrong:wrong }; })()`);
await goto(`${BASE}/wrong.html`);
await sleep(600);
const cards = await ev(`document.querySelectorAll('.wrong-card').length`);
check('wrong 预置错题后出现卡片', seeded && cards >= 1, JSON.stringify({ seeded, cards }));
await cap('wrong-1-list');
const filt = await ev(`(function(){
  var f=Array.from(document.querySelectorAll('#unitFilter .filter-btn'));
  if(!f.length) return {err:'no-filter'};
  var before=document.querySelectorAll('.wrong-card').length;
  f[f.length-1].click();
  var on=f.filter(function(b){return b.classList.contains('on');}).length;
  return {before:before,on:on,n:f.length}; })()`);
await sleep(600);
const afterFilt = await ev(`document.querySelectorAll('.wrong-card').length`);
check('wrong 单元筛选切换生效（有且仅一个 on，列表不增）', filt && filt.on === 1 && afterFilt <= filt.before, JSON.stringify({ ...filt, after: afterFilt }));

/* ---------- 5. history：两条记录、展开、续做 ---------- */
await goto(`${BASE}/history.html`);
await ev(`(function(){
  var now=Date.now();
  localStorage.setItem('tdsat_exam_suite_results_v1', JSON.stringify([{id:'r1',mode:'mock',date:now,total:22,correct:15,elapsed:3300000,finished:true,detail:[],report:{priority:[]}}]));
  localStorage.setItem('tdsat_exam_suite_abandoned_v1', JSON.stringify([{id:'a1',mode:'quiz',date:now-60000,total:22,answered:7,finished:false,startedAt:now-60000}]));
  return 'ok'; })()`);
await goto(`${BASE}/history.html`);
await sleep(700);
const bars = await ev(`document.querySelectorAll('.hist-bar').length`);
check('history 两条记录渲染成两条 bar', bars === 2, `bars=${bars}`);
const expBefore = await ev(`document.querySelector('.hist-bar').classList.contains('open')`);
await ev(`document.querySelector('.hist-bar-head').click()`);
await sleep(500);
const expAfter = await ev(`document.querySelector('.hist-bar').classList.contains('open')`);
check('history 首条默认展开、点击后收起', expBefore === true && expAfter === false, `${expBefore} → ${expAfter}`);
const contN = await ev(`document.querySelectorAll('.hist-continue a, .hist-continue').length`);
check('history 未做完条目有“继续这卷/已失效”入口', contN >= 1, `nodes=${contN}`);
await cap('history-1-list');

/* ---------- 6. jiangyi：板块 → 小节 → 题目 ---------- */
await goto(`${BASE}/jiangyi.html`);
const boards = await ev(`document.querySelectorAll('.jy-board-card').length`);
await ev(`(function(){var b=document.querySelector('.jy-board-card');if(b)b.click();})()`);
await sleep(1000);
const secRows = await ev(`document.querySelectorAll('.drill-section-row[data-sec]').length`);
const secOpen = await ev(`(function(){var r=document.querySelector('.drill-section-row[data-sec]');if(!r)return 'no-row';r.click();return 'ok';})()`);
await sleep(1500);
const stemLen = await ev(`(function(){var s=document.getElementById('jyStem')||document.getElementById('qStem');return s?(s.textContent||'').trim().length:0;})()`);
check('jiangyi 板块与小节可点开', boards >= 1 && secRows >= 1 && secOpen === 'ok', `boards=${boards} secs=${secRows} click=${secOpen}`);
check('jiangyi 题目题干渲染非空', stemLen > 20, `stemLen=${stemLen}`);
await cap('jiangyi-1-question');

const passed = results.filter((r) => r.ok).length;
writeFileSync(join(OUT, 'flows.json'), JSON.stringify(results, null, 1));
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  [' + r.detail + ']' : ''}`);
console.log(`\n${passed}/${results.length} 通过，截图与明细在 ${OUT}`);
cleanup();
process.exit(passed === results.length ? 0 : 1);
