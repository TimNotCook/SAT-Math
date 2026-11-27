#!/usr/bin/env node
/* tools/verify_session.mjs — 存档兼容 / 超时恢复的可复现验收器
 *
 * 零 npm 依赖，复用系统 Chrome 的 CDP 通道（与 test/visual/capture.mjs 同款）。
 * 每次跑都给出 6 个场景的「检查项 → 期望 → 实测」和截图，退出码非 0 即不合格。
 *
 * 用法：
 *   node tools/verify_session.mjs                         # 本地 8481 静态服务
 *   node tools/verify_session.mjs --base https://timnotcook.github.io/SAT-Math
 *   node tools/verify_session.mjs --out /tmp/proof         # 截图目录
 *
 * 场景对照（验收表）：
 *   new            新版完整存档          → Question 1 of 22，无 of 0
 *   old            旧存档（缺 m1Size）    → 补齐 22 并恢复，Question 1 of 22
 *   broken         残缺（paper 为空）     → 明示过期 + 留档可导出 + 新卷 1 of 22
 *   m2-refresh     模块二中途刷新         → 仍是模块二第 1 of 22，模块一答案锁定
 *   timeout-total  总时间已走完后刷新     → 直接出分，不显示题目
 *   timeout-m1     模块一到期后刷新       → 开始页明示已进 Module 2，点开后 1 of 22
 */
import { spawn } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { startStaticServer } from './lib/serve.mjs';
import { CHROME, tempProfile } from './lib/chrome.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);
const argVal = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const HAS_BASE = args.includes('--base');
let BASE = argVal('--base', 'http://127.0.0.1:8481').replace(/\/+$/, '');
const OUT = resolve(argVal('--out', '/tmp/sat-session-proof'));
const PORT = 8481;
const CDP = 9600 + Math.floor(Math.random() * 120);
const SK = 'tdsat_exam_suite_session_v1';
const RK = 'tdsat_exam_suite_results_v1';
const sleep = ms => new Promise(r => setTimeout(r, ms));

mkdirSync(OUT, { recursive: true });
let server = null;
if (!HAS_BASE) {
  try { server = await startStaticServer(ROOT, { mark: '.verify-session-marker' }); BASE = server.base; }
  catch (e) { console.error('起不了本仓库静态服务器，请用 --base：' + e.message); process.exit(2); }
}
const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${tempProfile('vs-')}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { proc.kill('SIGKILL'); } catch (e) {} if (server) { try { server.stop(); } catch (e) {} } };
process.on('exit', cleanup);

for (let i = 0; i < 60; i++) {
  try { if ((await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok) break; } catch (e) {}
  await sleep(250);
}
const tabs = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json();
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let mid = 0; const pending = new Map(); const consoleErrs = [];
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  else if (m.method === 'Runtime.exceptionThrown') consoleErrs.push(m.params.exceptionDetails?.exception?.description || 'exception');
  else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') consoleErrs.push(m.params.entry.text);
});
const send = (method, params = {}) => new Promise(r => {
  const i = ++mid; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params }));
  setTimeout(() => { if (pending.has(i)) { pending.delete(i); r({}); } }, 25000);
});
const ev = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
const goto = async url => {
  await send('Page.navigate', { url });
  for (let i = 0; i < 60; i++) { await sleep(120); if ((await ev('document.readyState')) === 'complete') break; }
  await sleep(900);
};

await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

const shot = async name => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  if (r && r.data) writeFileSync(join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
};
const strip = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const results = [];
function check(scenario, label, ok, got) { results.push({ scenario, label, ok: !!ok, got: strip(got) }); }

/* 取一份真实模考存档（保证 paper/answers/m2Options 的形状与线上一致） */
async function freshSave() {
  await goto(`${BASE}/exam.html?mode=mock`);
  await ev(`localStorage.removeItem(${JSON.stringify(SK)});localStorage.removeItem(${JSON.stringify(RK)});`);
  await goto(`${BASE}/exam.html?mode=mock`);
  await ev(`document.getElementById('btnStart').click()`);
  await sleep(700);
  return JSON.parse(await ev(`localStorage.getItem(${JSON.stringify(SK)})`));
}
async function secondSave() {
  await goto(`${BASE}/exam.html?mode=mock`);
  await ev(`localStorage.removeItem(${JSON.stringify(SK)})`);
  await goto(`${BASE}/exam.html?mode=mock`);
  await ev(`document.getElementById('btnStart').click()`);
  await sleep(700);
  return JSON.parse(await ev(`localStorage.getItem(${JSON.stringify(SK)})`));
}
async function loadSave(obj) {
  await goto(`${BASE}/exam.html?mode=mock`);
  await ev(`localStorage.setItem(${JSON.stringify(SK)}, ${JSON.stringify(JSON.stringify(obj))})`);
  await goto(`${BASE}/exam.html?mode=mock`);
  await sleep(400);
}
const stages = () => ev(`(()=>{const on=n=>{const s=document.getElementById('stage-'+n);return !!(s&&!s.hidden)};
  return {intro:on('intro'),answer:on('answer'),result:on('result'),
    pos:(document.getElementById('questionPosition')||{}).textContent,
    notice:((document.getElementById('introNotice')||{}).textContent||''),
    noticeShown:!!(document.getElementById('introNotice')&&!document.getElementById('introNotice').hidden),
    salvageShown:!!(document.getElementById('introSalvage')&&!document.getElementById('introSalvage').hidden),
    module:(document.getElementById('tbTotal')||{}).textContent,
    params:(document.getElementById('introParams')||{}).textContent,
    eyebrow:(document.getElementById('introEyebrow')||{}).textContent}})()`);

const base = await freshSave();

/* ---------- 1. 新版完整存档 ---------- */
{
  await loadSave(base);
  const s1 = await stages();
  check('new', '恢复后停在开始页', s1.intro, s1.intro ? 'intro' : 'not intro');
  /* 开机兜底之后，开始页会主动显示「已恢复存档、计时没停、点 Start 继续」的提示，
     那是正常引导而不是「存档已过期」。这里只排除过期文案。 */
  check('new', '开始页不是「存档已过期」提示', !/expired|已过期|重新开始/i.test(s1.notice || ''), s1.notice);
  await ev(`document.getElementById('btnStart').click()`); await sleep(800);
  const a1 = await stages();
  check('new', '题号是 1 of 22', /Question 1 of 22/.test(strip(a1.pos)), a1.pos);
  check('new', '没有 of 0', !/of 0/.test(strip(a1.pos)), a1.pos);
  await shot('new-resume');
}

/* ---------- 2. 旧存档：缺 m1Size / moduleEndsAt ---------- */
{
  const old = JSON.parse(JSON.stringify(base));
  delete old.m1Size; delete old.moduleEndsAt;
  old.module = 1; old.idx = 0; old.stage = 'answer';
  await loadSave(old);
  const written = JSON.parse(await ev(`localStorage.getItem(${JSON.stringify(SK)})`));
  check('old', '回写 m1Size=22', written.m1Size === 22, 'm1Size=' + written.m1Size);
  const s2 = await stages();
  check('old', '开始页不是「存档已过期」提示', !/expired|已过期|重新开始/i.test(s2.notice || ''), s2.notice);
  await ev(`document.getElementById('btnStart').click()`); await sleep(800);
  const a2 = await stages();
  check('old', '题号是 1 of 22', /Question 1 of 22/.test(strip(a2.pos)), a2.pos);
  await shot('old-resume');
}

/* ---------- 3. 残缺存档：卷面还在但模块切分对不上 → 明示 + 留档 ---------- */
{
  const broken = JSON.parse(JSON.stringify(base));
  broken.module = 2;                       // 只有 22 题却声称在模块二：无法按官方 22/22 重建
  const firstUid = broken.paper[0].uid;
  broken.answers[firstUid] = Object.assign({}, broken.answers[firstUid] || {}, { v: 'B', marked: true });
  await loadSave(broken);
  const s3 = await stages();
  check('broken', '明示存档无法恢复', s3.noticeShown && /could not be restored|存档已过期/.test(strip(s3.notice)), s3.notice);
  check('broken', '开始页出现留档面板', s3.salvageShown, s3.salvageShown ? 'shown' : 'hidden');
  const recs = JSON.parse((await ev(`localStorage.getItem(${JSON.stringify(RK)})`)) || '[]');
  const voidRec = recs.filter(r => r && r.void).pop();
  check('broken', 'results 里有 void 记录', !!voidRec, voidRec ? '已答 ' + voidRec.answered + '/' + voidRec.total + ' · ' + voidRec.reason : 'none');
  check('broken', '留档带卷面明细', !!(voidRec && Array.isArray(voidRec.detail) && voidRec.detail.length), voidRec ? voidRec.detail.length + ' 条' : '-');
  await shot('broken-intro');
  await ev(`document.getElementById('btnStart').click()`); await sleep(800);
  const a3 = await stages();
  check('broken', '新卷仍能开考 1 of 22', /Question 1 of 22/.test(strip(a3.pos)), a3.pos);
}

/* ---------- 4. 模块二中途刷新 ---------- */
{
  const p2 = await secondSave();
  const m2 = JSON.parse(JSON.stringify(base));
  const seen = new Set(m2.paper.map(x => x.uid));
  p2.paper.forEach(x => {
    const u = 'M2-' + m2.paper.length;
    if (!seen.has(u)) { seen.add(u); m2.paper.push(Object.assign({}, x, { module: 2, uid: u })); }
  });
  m2.paper.forEach((x, i) => { x.module = i < 22 ? 1 : 2; });
  m2.answers['M1-0'] = Object.assign({}, m2.answers['M1-0'], { v: 'A', locked: true });
  m2.module = 2; m2.idx = 22; m2.stage = 'answer'; m2.path = 'hard';
  delete m2.m2Options;
  await loadSave(m2);
  const kept = JSON.parse(await ev(`localStorage.getItem(${JSON.stringify(SK)})`));
  check('m2-refresh', '模块一答案仍锁定', !!(kept.answers && kept.answers['M1-0'] && kept.answers['M1-0'].locked), kept.answers['M1-0'] ? 'locked=' + kept.answers['M1-0'].locked : 'missing');
  await ev(`document.getElementById('btnStart').click()`); await sleep(900);
  const s4 = await stages();
  check('m2-refresh', '题号是模块二 1 of 22', /Question 1 of 22/.test(strip(s4.pos)), s4.pos);
  check('m2-refresh', '显示 Module 2', /Module 2 of 2/.test(strip(s4.module)), s4.module);
  await shot('m2-refresh');
}

/* ---------- 5. 总时间走完 + 刷新 ---------- */
{
  const p2 = await secondSave();
  const dead = JSON.parse(JSON.stringify(base));
  const seen = new Set(dead.paper.map(x => x.uid));
  p2.paper.forEach(x => {
    const u = 'M2-' + dead.paper.length;
    if (!seen.has(u)) { seen.add(u); dead.paper.push(Object.assign({}, x, { module: 2, uid: u })); }
  });
  dead.paper.forEach((x, i) => { x.module = i < 22 ? 1 : 2; });
  dead.module = 2; dead.idx = 30; dead.stage = 'answer'; dead.path = 'hard';
  dead.answers['M1-0'] = Object.assign({}, dead.answers['M1-0'], { v: 'A' });
  delete dead.m2Options;
  dead.startedAt = Date.now() - 80 * 60 * 1000;
  dead.endsAt = Date.now() - 10 * 60 * 1000;
  dead.moduleEndsAt = dead.endsAt;
  await loadSave(dead);
  const s5 = await stages();
  check('timeout-total', '刷新后直接到成绩页', s5.result && !s5.answer, s5.result ? 'result' : 'answer/intro');
  const res = await ev(`(()=>{const t=document.getElementById('resSub');return t?t.textContent:''})()`);
  check('timeout-total', '成绩页标注自动交卷', /auto|automatic|自动/i.test(strip(res)), res);
  await shot('timeout-total-result');
}

/* ---------- 6. 模块一到期 + 刷新 ---------- */
{
  const m1 = JSON.parse(JSON.stringify(base));
  m1.module = 1; m1.idx = 10; m1.stage = 'answer';
  m1.startedAt = Date.now() - 40 * 60 * 1000;
  m1.moduleEndsAt = Date.now() - 5 * 60 * 1000;
  m1.endsAt = Date.now() + 30 * 60 * 1000;
  await loadSave(m1);
  const s6 = await stages();
  check('timeout-m1', '开始页明示已进 Module 2', s6.noticeShown && /Module 2/.test(strip(s6.notice)), s6.notice);
  check('timeout-m1', '没有把题目直接摊开', !s6.answer && s6.intro, s6.answer ? 'answer' : 'intro');
  check('timeout-m1', '开始页参数条也显示 Module 2', /Module 2 of 2/.test(strip(s6.params)), s6.params);
  await shot('timeout-m1-intro');
  await ev(`document.getElementById('btnStart').click()`); await sleep(900);
  const a6 = await stages();
  check('timeout-m1', '点开后是 Module 2 的 1 of 22', /Question 1 of 22/.test(strip(a6.pos)) && /Module 2/.test(strip(a6.module)), a6.pos + ' · ' + strip(a6.module));
  const locked = JSON.parse(await ev(`localStorage.getItem(${JSON.stringify(SK)})`));
  const lockedCount = Object.keys(locked.answers || {}).filter(u => locked.answers[u] && locked.answers[u].locked).length;
  check('timeout-m1', '模块一 22 题全部锁定', lockedCount >= 22, 'locked=' + lockedCount);
  await shot('timeout-m1-answer');
}

/* ---------- 汇总 ---------- */
console.log('\n=== SAT Math 存档/超时验收（' + BASE + '）===');
let fails = 0;
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.scenario.padEnd(14)} ${r.label}  → ${r.got}`);
  if (!r.ok) fails++;
}
console.log(`\n共 ${results.length} 项，通过 ${results.length - fails}，失败 ${fails}；截图 ${OUT}`);
if (consoleErrs.length) console.log('控制台报错:', consoleErrs.slice(0, 5));
ws.close(); cleanup();
process.exit(fails ? 1 : 0);
