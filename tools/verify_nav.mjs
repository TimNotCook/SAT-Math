#!/usr/bin/env node
/* tools/verify_nav.mjs — 全站导航 + 选项闸门 + L4 归并 的可复现验收器
 *
 * 零 npm 依赖，复用系统 Chrome 的 CDP 通道（与 verify_a11y.mjs 同款）。
 * 每项输出「检查项 → 期望 → 实测」，任一 FAIL 退出码为 1。
 * 纪律：任何资源改动后必须跑本脚本；末尾「资源版本/五页同值」会硬校验
 * index/exam/drill/wrong/jiangyi 的 ?v=，不再靠人记。
 *
 * 用法：
 *   node tools/verify_nav.mjs
 *   node tools/verify_nav.mjs --base https://timnotcook.github.io/SAT-Math --out /tmp/proof-nav
 */
import { spawn } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { checkBase } from './versions.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);
const argVal = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const HAS_BASE = args.includes('--base');
const BASE = argVal('--base', 'http://127.0.0.1:8491').replace(/\/+$/, '');
const OUT = resolve(argVal('--out', '/tmp/sat-nav-proof'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8491;
const CDP = 9720 + Math.floor(Math.random() * 120);
const sleep = ms => new Promise(r => setTimeout(r, ms));

mkdirSync(OUT, { recursive: true });
const server = HAS_BASE ? null : spawn('python3', ['-m', 'http.server', String(PORT), '--directory', ROOT], { stdio: 'ignore' });
if (server) await sleep(700);
const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=/tmp/vn-${Date.now()}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { proc.kill('SIGKILL'); } catch (e) {} if (server) { try { server.kill('SIGKILL'); } catch (e) {} } };
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
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise(r => {
  const i = ++mid; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params }));
  setTimeout(() => { if (pending.has(i)) { pending.delete(i); r({}); } }, 25000);
});
const ev = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
async function goto(url) {
  await send('Page.navigate', { url });
  for (let i = 0; i < 80; i++) { await sleep(120); if ((await ev('document.readyState')) === 'complete') break; }
  await sleep(1000);
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

/* 页面里「可见」的链接：跳过 display:none / 0 尺寸 / 被 hidden 的容器 */
const VISIBLE_LINKS = `(() => Array.from(document.querySelectorAll('a[href]')).filter(a => {
  if (!a.offsetWidth && !a.offsetHeight) return false;
  const cs = getComputedStyle(a);
  return cs.visibility !== 'hidden' && cs.display !== 'none';
}).map(a => ({ href: a.getAttribute('href'), text: (a.textContent || '').trim() })) )()`;

const normHref = h => String(h || '').replace(/^\.\//, '').replace(/\?.*$/, '').replace(/^.*\/SAT-Math\//, '');
const hasEntry = (links, target) => links.some(l => {
  const base = normHref(l.href), want = normHref(target);
  if (base !== want) return false;
  if (target.includes('mode=mock')) return String(l.href).includes('mode=mock');
  if (target.includes('mode=quiz')) return String(l.href).includes('mode=quiz');
  return true;
});

const PAGES = [
  { file: 'jiangyi.html', label: '讲义页' },
  { file: 'drill.html', label: '练习页' },
  { file: 'wrong.html', label: '错题页' }
];
const ENTRIES = ['drill.html', 'jiangyi.html', 'exam.html?mode=quiz&unit=1', 'wrong.html', 'exam.html?mode=mock'];

for (const pg of PAGES) {
  await goto(`${BASE}/${pg.file}`);
  const page = await ev('location.pathname');
  check(`nav/${pg.file}·落点`, `停在 ${pg.file}`, `实际 ${page}`, page.endsWith(pg.file));
  const links = (await ev(VISIBLE_LINKS)) || [];
  ENTRIES.forEach(href => {
    check(`nav/${pg.file}·${href}`, `可见入口 ${href}`, hasEntry(links, href) ? '有' : `缺失（共 ${links.length} 个可见链接）`,
      hasEntry(links, href));
  });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await sleep(300);
  await shot(`nav-${pg.file.replace(/\..*/, '')}-1280.png`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await sleep(300);
  await shot(`nav-${pg.file.replace(/\..*/, '')}-390.png`);
  await send('Emulation.clearDeviceMetricsOverride');
}

/* 站点根：空首页已删，根地址必须直接落到 drill */
await goto(`${BASE}/`);
await sleep(600);
const rootPage = await ev('location.pathname');
check('nav/root·跳转', '根地址跳到 drill.html', `实际 ${rootPage}`, /\/drill\.html$/.test(rootPage || ''));
const rootEntries = (await ev(VISIBLE_LINKS)) || [];
ENTRIES.forEach(href => {
  check(`nav/root·${href}`, `跳转后可见入口 ${href}`, hasEntry(rootEntries, href) ? '有' : `缺失（共 ${rootEntries.length} 个可见链接）`,
    hasEntry(rootEntries, href));
});

/* 抽查页：五项导航必须齐、且侧栏高亮落在「单元抽查」而不是「模考」 */
await goto(`${BASE}/exam.html?mode=quiz&unit=1`);
const quizLinks = (await ev(VISIBLE_LINKS)) || [];
ENTRIES.forEach(href => {
  check(`nav/exam-quiz·${href}`, `可见入口 ${href}`, hasEntry(quizLinks, href) ? '有' : `缺失（共 ${quizLinks.length} 个可见链接）`,
    hasEntry(quizLinks, href));
});
const quizCur = await ev(`(() => { const a = document.querySelector('.site-rail a[aria-current="page"]'); return a ? a.textContent.trim() : ''; })()`);
check('nav/exam-quiz·高亮', '侧栏高亮「单元抽查」', `实际 ${quizCur || '无'}`, quizCur === '单元抽查');
const brandHref = await ev(`(() => { const a = document.querySelector('.site-rail .rail-brand'); return a ? a.getAttribute('href') : ''; })()`);
check('nav/brand·直指 drill', '侧栏品牌 href=drill.html', `实际 ${brandHref || '无'}`, brandHref === 'drill.html');

/* 讲义页返回导航 */
await goto(`${BASE}/jiangyi.html`);
const back = await ev(`(() => { const a = document.querySelector('a.rail-back'); return a ? { href: a.getAttribute('href'), text: a.textContent.trim(), w: a.offsetWidth } : null; })()`);
check('nav/jiangyi·返回导航', '返回真题练习链接可见', back ? `${back.text} → ${back.href} (w=${back.w})` : '缺失',
  !!back && back.href === 'drill.html' && back.w > 0);

/* 选项闸门：全量数据缺选项数必须为 0（四个来源：文字 / 裁图 / 矢量图 / 图题）。
   TD-22-14 曾报「四个空按钮」，现在应渲染 4 个矢量图选项而不是空壳。 */
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await goto(`${BASE}/drill.html?sec=2.2&i=14`);
const gate = await ev(`(() => {
  const Q = window.TD_BANK.questions, T = window.TD_TEXT || {}, C = window.TD_CHOICE_CROPS || {}, G = window.TD_CHOICE_GRAPHS || {};
  const missing = Q.filter(q => q.type === 'mcq').filter(q => {
    const t = T[q.id] || {}, ch = t.choices || {};
    const hasText = ['A','B','C','D'].some(L => String(ch[L] || '').trim());
    const hasCrop = C[q.id] && ['A','B','C','D'].some(L => C[q.id][L]);
    const hasVec = G[q.id] && ['A','B','C','D'].some(L => G[q.id][L]);
    return !hasText && !hasCrop && !hasVec;
  }).map(q => q.id);
  return { missing, buttons: document.querySelectorAll('.drill-choice').length,
    svgs: Array.from(document.querySelectorAll('.drill-choice')).filter(b => b.querySelector('svg')).length,
    prompt: Array.from(document.querySelectorAll('.drill-choice-missing')).map(p => p.textContent.trim()).join('|') };
})()`);
check('gate/全量缺选项', '缺选项题数 = 0（白名单为空）', gate ? `${gate.missing.length} 道 ${gate.missing.join(',')}` : '读不到数据',
  !!gate && gate.missing.length === 0);
check('gate/2.2#14 渲染', '4 个按钮都含矢量图、0 个提示挡板', gate ? `buttons=${gate.buttons} svg=${gate.svgs} prompt=${gate.prompt || '无'}` : '读不到页面',
  !!gate && gate.buttons === 4 && gate.svgs === 4 && gate.prompt === '');
await shot('gate-2.2-14-1280.png');

/* 真题侧：L4 不再注册，Unit 4 精编九题整体不可见 */
await goto(`${BASE}/drill.html?sec=4.1&i=1`);
const l4 = await ev(`(() => {
  const A = window.TD_APP; if (!A) return null;
  const legacyU4 = Object.keys(A.CATALOG).reduce((n, k) => n + A.CATALOG[k].filter(q => q.origin === 'legacy' && q.unit === 4).length, 0);
  return { L4: !!A.CATALOG.L4, legacyU4, s41: (A.CATALOG['4.1'] || []).length, unit4Has41: A.unitSections(4).includes('4.1') };
})()`);
check('l4/真题侧移除', 'L4 不存在；legacy U4 = 0；4.1 仍可见',
  l4 ? `L4=${l4.L4} legacyU4=${l4.legacyU4} 4.1=${l4.s41} unit4=${l4.unit4Has41}` : '读不到 TD_APP',
  !!l4 && !l4.L4 && l4.legacyU4 === 0 && l4.unit4Has41);

/* 真·用户路径：首页 → 讲义复习 → Unit 4 板块 → 教材原子组 → 9 题 */
await goto(`${BASE}/index.html`);
await ev(`(() => { const a = document.querySelector('a[href="jiangyi.html"]'); if (a) a.click(); })()`);
await sleep(1200);
const boardU4 = await ev(`(() => { const b = document.querySelector('[data-board="JY4"]'); if (!b) return false; b.click(); return true; })()`);
await sleep(600);
const groupCard = await ev(`(() => {
  const g = document.querySelector('[data-group]');
  return g ? { text: g.innerText.replace(/\s+/g, ' ').trim(), label: window.TD_JY.TB_GROUP.label } : null;
})()`);
check('jy4/子组入口', 'JY4 板块里出现「Unit 4・教材原题（练习册 P200–207）」',
  boardU4 === false ? 'JY4 板块卡缺失' : (groupCard ? groupCard.text.slice(0, 60) : '子组卡缺失'),
  !!groupCard && groupCard.text.includes('练习册 P200–207'));
if (groupCard) {
  await ev(`document.querySelector('[data-group]').click()`);
  await sleep(800);
}
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await sleep(300);
const groupQuiz = await ev(`(() => ({
  position: document.getElementById('jyPosition') ? document.getElementById('jyPosition').textContent : '',
  footer: document.getElementById('jyFooterSection') ? document.getElementById('jyFooterSection').textContent : '',
  id: window.TD_JY.groupQuestions('JY4')[0] ? window.TD_JY.groupQuestions('JY4')[0].id : ''
}))()`);
check('jy4/九题可达', '第 1 / 9 题，页脚「练习册 P200」',
  groupQuiz ? `${groupQuiz.position} · ${groupQuiz.footer} · ${groupQuiz.id}` : '读不到做题页',
  !!groupQuiz && /第 1 \/ 9 题/.test(groupQuiz.position) && /^练习册 P2\d\d$/.test(groupQuiz.footer));
await shot('jy4-textbook-1280.png');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await sleep(400);
await shot('jy4-textbook-390.png');
await send('Emulation.clearDeviceMetricsOverride');
await send('Emulation.clearDeviceMetricsOverride');

let versionReport;
try { versionReport = await checkBase(BASE); }
catch (e) { versionReport = { ok: false, detail: e.message, errors: [e.message] }; }
check('资源版本/五页同值', '五页均至少 1 个 ?v=；每页唯一；跨页同值',
  versionReport.detail + (versionReport.errors.length ? ' · ' + versionReport.errors.join('；') : ''),
  versionReport.ok);

const failed = results.filter(r => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} 通过，截图在 ${OUT}`);
writeFileSync(join(OUT, 'result.json'), JSON.stringify({ base: BASE, passed: results.length - failed.length, total: results.length, failed }, null, 2));
ws.close();
cleanup();
process.exit(failed.length ? 1 : 0);
