#!/usr/bin/env node
/* tools/verify_cloud_branches.mjs — 云档案链路的五条分支验收（可复跑，零外部依赖）
 *
 * 为什么需要它：magic link 登录要靠真实邮箱点链接，人工/CI 都没法自动完成，
 * 于是「已登录 → 拉云端档案 → 落地本机 → 记录页重渲染」这一段长期只能靠口头保证。
 * 这里用**替身后端**（只在临时页生效，绝不改产品代码、绝不写生产 Supabase、不发一封信）
 * 把这段拆成可断言的分支：
 *
 *   ok      首次登录，云端有档案（680）           → 档案落地、记录页出条、本机无主进度进草稿
 *   reject  云端不可达                            → 本机 640 原样保留 + 明确提示，不清数据
 *   switch  A 的机器上登录 B（云端只有 B 的 680）  → owner 换成 B、A 的进度进草稿、不串档
 *   anon    完全不登录（真实 supa-cloud）          → 记录页照常出本机记录，面板「未登录」
 *   hash    伪造 magic link 回跳 hash             → 会话落 tdsat_auth_v1 + 地址栏 hash 清空
 *
 * 用法：
 *   node tools/verify_cloud_branches.mjs                 # 本地随机端口静态服务
 *   VC_OUT=/tmp/xx node tools/verify_cloud_branches.mjs  # 指定产物目录
 * 退出码非 0 即不合格。
 */
import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, unlinkSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { randomBytes } from 'crypto';
import { CHROME, HEADLESS_ARGS } from './lib/chrome.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TOKEN = randomBytes(6).toString('hex');
const MARK = `.vc-marker-${TOKEN}`;
const OUT = resolve(process.env.VC_OUT || '/tmp/sat-cloud-branches');
const SUPA_HOST = 'ofsnrzfmjqyrmkvdwnbo.supabase.co';
mkdirSync(OUT, { recursive: true });

/* 临时文件统一前缀，跑完必删；绝不放进仓库跟踪范围 */
const TAG = `vc-${TOKEN}`;
const tmpFiles = [];

/* ---------- 本地静态服务：脚本内自带异步服务 ----------
 * 不用 python3 -m http.server：它是单线程的，5 个 defer 脚本（含几 MB 题库）
 * 会排队下载，最后一个（history-page.js）常常没跑完就断言，表现为「偶发不渲染」。
 * 这里用 node:http 异步服务，天然并发；端口随机 + 写标记回读，防止测到别的 worktree。 */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const http = await import('http');
const readFile = (await import('fs')).readFileSync;
let PORT = 0;
const server = http.createServer((req, res) => {
  const u = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0]);
  if (u === '/' + MARK) { res.setHeader('Content-Type', 'text/plain'); return res.end(TOKEN); }  /* 自证是本仓库的服务 */
  const f = join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
  try {
    const body = readFile(f);
    res.setHeader('Content-Type', MIME[f.slice(f.lastIndexOf('.'))] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(body);
  } catch (e) { res.statusCode = 404; res.end('not found'); }
});
for (let i = 0; i < 8 && !PORT; i++) {
  const cand = 8300 + Math.floor(Math.random() * 600);
  try {
    await new Promise((ok, no) => {
      server.once('error', no);
      server.listen(cand, '127.0.0.1', ok);
    });
    const r = await fetch(`http://127.0.0.1:${cand}/${MARK}`, { cache: 'no-store' });
    if (r.ok && (await r.text()).trim() === TOKEN) PORT = cand; else server.close();
  } catch (e) { try { server.close(); } catch (e2) {} }
}
if (!PORT) { console.error('无法在 8300-8899 起本地静态服务'); process.exit(2); }
const SITE = `http://127.0.0.1:${PORT}`;

/* ---------- 替身后端（只存在于临时页） ---------- */
const STUB = `/* 临时替身后端：verify_cloud_branches 生成，跑完即删，不进仓库 */
(function () {
  var q = new URLSearchParams(location.search), MODE = q.get('vc') || 'ok';
  var UID = MODE === 'switch' ? 'uid-B' : 'e2e-uid';
  function rec(score, correct) {
    return { date: 1750000000000, mode: 'mock', finished: true, correct: correct, total: 44, elapsed: 5400,
      estimate: { scaled: score, raw: correct, rawMax: 44, path: 'harder' },
      detail: [{ id: 'TD-11-17', given: 'B', answer: 'B', correct: true }],
      report: { priority: [{ name: '线性方程', reason: '错 1 题', action: '重做 1.1', wrongIds: ['TD-14-13'] }] } };
  }
  var ARCH = { 'tdsat_exam_suite_results_v1': JSON.stringify([rec(680, 30)]) };
  window.TDSUPA = {
    available: function () { return true; }, backend: 'stub',
    onState: function (cb) { setTimeout(function () { cb({ uid: UID, email: 'e2e@local', displayName: '' }); }, 0); },
    user: function () { return { uid: UID, email: 'e2e@local', displayName: '' }; },
    getArchive: function () {
      if (MODE === 'reject') return Promise.reject(new Error('network down'));
      return Promise.resolve({ payload: ARCH, nickname: '', updated_at: '2026-11-26T00:00:00Z' });
    },
    pushProgress: function () { return Promise.resolve(true); },
    updateNickname: function () { return Promise.resolve(true); },
    signOut: function () { return Promise.resolve(true); },
    sendOtp: function () { return Promise.resolve(true); },
    verifyOtp: function () { return Promise.resolve(true); }
  };
})();`;

const stubFile = `${TAG}-stub.js`;
writeFileSync(join(ROOT, stubFile), STUB);
tmpFiles.push(stubFile);

/* ---------- 生成各场景页面：只动临时副本，产品文件一行不改 ---------- */
const SRC = (await import('fs')).readFileSync(join(ROOT, 'history.html'), 'utf8');

function preseed(score, correct, owner, lastSynced) {
  const rec = [{ date: 1740000000000, mode: 'mock', finished: true, correct, total: 44, elapsed: 5000,
    estimate: { scaled: score, raw: correct, rawMax: 44, path: 'base' }, detail: [], report: { priority: [] } }];
  return '<script>try{localStorage.setItem("tdsat_exam_suite_results_v1",' + JSON.stringify(JSON.stringify(rec)) + ');'
    + (owner ? 'localStorage.setItem("tdprofile_v1",' + JSON.stringify(JSON.stringify({ owner, lastSynced })) + ');' : '')
    + '}catch(e){}</script>';
}

function buildPage(name, { stub, pre }) {
  let h = SRC;
  if (pre) h = h.replace('<body', pre + '<body');          /* 普通脚本：解析即执行，早于所有 defer */
  if (stub) {
    const i = h.indexOf('<script src="cloud-account.js');
    if (i < 0) throw new Error('history.html 里找不到 cloud-account.js 的 script 标签');
    /* defer 保证顺序：supa-cloud → 替身 → cloud-account（替身晚于 supa-cloud 才能覆盖它） */
    h = h.slice(0, i) + `<script src="${stubFile}" defer></script>\n` + h.slice(i);
  }
  const file = `${TAG}-${name}.html`;
  writeFileSync(join(ROOT, file), h);
  tmpFiles.push(file);
  return file;
}

const PAGES = {
  ok: buildPage('ok', { stub: true, pre: preseed(640, 26, 'local-guest', 'x') }),
  reject: buildPage('reject', { stub: true, pre: preseed(640, 26, 'local-guest', 'x') }),
  switch: buildPage('switch', { stub: true, pre: preseed(640, 26, 'uid-A', 'stale') }),
  anon: buildPage('anon', { stub: false, pre: preseed(640, 26, '', '') }),
  hash: buildPage('hash', { stub: false, pre: '' })
};

/* ---------- 每个场景一个全新 profile，避免 localStorage 串场景 ---------- */
const SNAP = `(() => {
  var L = {};
  try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); L[k] = localStorage.getItem(k); } } catch (e) {}
  var prof = {}, res = [], dr = null, au = null;
  try { prof = JSON.parse(L['tdprofile_v1'] || '{}'); } catch (e) {}
  try { res = JSON.parse(L['tdsat_exam_suite_results_v1'] || '[]'); } catch (e) {}
  try { dr = JSON.parse(L['tdprofile_draft_v1'] || 'null'); } catch (e) {}
  try { au = JSON.parse(L['tdsat_auth_v1'] || 'null'); } catch (e) {}
  return JSON.stringify({
    owner: prof.owner || '',
    score: (res[0] && res[0].estimate) ? res[0].estimate.scaled : null,
    bars: document.querySelectorAll('.hist-bar').length,
    status: ((document.querySelector('.td-acct-status') || {}).textContent || '').trim(),
    draft: dr ? dr.uid : '',
    auth: au && au.access ? String(au.access).slice(0, 10) : '',
    hash: location.hash || '',
    err: (window.__vcErr || []).join(';').slice(0, 160),
    rows: document.querySelectorAll('#histList > *').length,
    ready: document.readyState
  });
})()`;

async function run(cname, url, evaluate, tries = 40) {
  const CDP = 9800 + Math.floor(Math.random() * 150);
  const profile = `/tmp/${TAG}-${cname}`;
  const proc = spawn(CHROME, [...HEADLESS_ARGS,
    `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`, '--no-first-run',
    `--host-resolver-rules=MAP ${SUPA_HOST} 127.0.0.1:9`,   /* 外网打死：替身失败/真后端都走不通，结果可复现 */
    '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
  let state = '{}';
  try {
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok) break; } catch (e) {}
      await sleep(250);
    }
    const tabs = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json();
    const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
    await new Promise(r => ws.addEventListener('open', r));
    let mid = 0; const pending = new Map();
    ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
    });
    const send = (method, params = {}) => new Promise(r => {
      const i = ++mid; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params }));
      setTimeout(() => { if (pending.has(i)) { pending.delete(i); r({}); } }, 20000);
    });
    const ev = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
    await send('Page.addScriptToEvaluateOnNewDocument', { source:
      "window.__vcErr=[];window.addEventListener('error',function(e){window.__vcErr.push('E:'+(e.message||'')+'@'+((e.filename||'').split('/').pop())+':'+(e.lineno||0))});" +
      "window.addEventListener('unhandledrejection',function(e){window.__vcErr.push('R:'+((e.reason&&e.reason.message)||e.reason))});" });
    await send('Page.navigate', { url });
    /* reload 会重来一轮，所以不假设只读一次：轮询到满足断言或超时 */
    for (let i = 0; i < tries; i++) {
      await sleep(500);
      try { state = await ev(SNAP) || state; } catch (e) {}
      if (evaluate(JSON.parse(state || '{}'))) break;
    }
    ws.close();
  } finally {
    try { proc.kill('SIGKILL'); } catch (e) {}
    await sleep(300);
    try { rmSync(profile, { recursive: true, force: true }); } catch (e) {}
  }
  return JSON.parse(state || '{}');
}

/* ---------- 断言表 ---------- */
const CASES = [
  { id: 'ok', url: `${SITE}/${PAGES.ok}?vc=ok`, expect: '云端档案落地：owner 归户、记录页出 680、本机无主进度进草稿',
    pass: s => s.owner === 'e2e-uid' && s.score === 680 && s.bars >= 1 && s.draft === 'local-guest' },
  { id: 'reject', url: `${SITE}/${PAGES.reject}?vc=reject`, expect: '云端不可达：本机 640 保留 + 明确提示，不清数据',
    pass: s => s.score === 640 && s.bars >= 1 && /暂时无法读取/.test(s.status) },
  { id: 'switch', url: `${SITE}/${PAGES.switch}?vc=switch`, expect: '换账号不串档：owner→B、显示 B 的 680、A 的进度进草稿',
    pass: s => s.owner === 'uid-B' && s.score === 680 && s.draft === 'uid-A' && s.bars >= 1 },
  { id: 'anon', url: `${SITE}/${PAGES.anon}`, expect: '未登录：记录页照常出本机记录，面板写「未登录」',
    pass: s => s.bars >= 1 && s.score === 640 && /未登录/.test(s.status) },
  { id: 'hash', url: `${SITE}/${PAGES.hash}#access_token=FAKEACCESSTOKEN123&refresh_token=FAKEREFRESH&expires_in=3600&type=magiclink`,
    expect: '邮件回跳：会话落 tdsat_auth_v1、地址栏 hash 清空',
    pass: s => s.auth === 'FAKEACCESS' && s.hash === '' }
];

let bad = 0;
for (const c of CASES) {
  let s = {};
  try { s = await run(c.id, c.url, c.pass); } catch (e) { console.error(`ERROR ${c.id}: ${e.message}`); }
  const ok = c.pass(s);
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.id}\n      期望 ${c.expect}\n      实测 ${JSON.stringify(s)}`);
}

/* ---------- 收尾：临时文件一律删，不留本地副本 ---------- */
for (const f of tmpFiles) { try { unlinkSync(join(ROOT, f)); } catch (e) {} }
try { server.close(); } catch (e) {}

if (bad) { console.error(`\n${bad} 个场景不合格`); process.exit(1); }
console.log('\n全部 5 个场景通过');
