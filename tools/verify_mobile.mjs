#!/usr/bin/env node
/* tools/verify_mobile.mjs — 窄屏（375 / 320）横向溢出与点击热区验收器
 *
 * 为什么要有它：a11y 脚本只验了「可访问名」，runtime 只验「有没有报错」，
 * 谁都没量过「页面在 375 宽下有没有横向滚动条」「选项热区够不够手指点」。
 * 这两件事在手机上就是真事故：横向溢出会把右侧按钮顶出屏幕，热区不足会点不中。
 *
 * 零 npm 依赖，复用系统 Chrome 的 CDP 通道（与 verify_a11y.mjs 同款）。
 * 用法：
 *   node tools/verify_mobile.mjs
 *   node tools/verify_mobile.mjs --base https://timnotcook.github.io/SAT-Math
 *   node tools/verify_mobile.mjs --out /tmp/mobile-proof
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
const OUT = resolve(argVal('--out', '/tmp/mobile-proof'));
const PORT = 8481;
const CDP = 9700 + Math.floor(Math.random() * 120);
const sleep = ms => new Promise(r => setTimeout(r, ms));

mkdirSync(OUT, { recursive: true });
let server = null;
if (!HAS_BASE) {
  try { server = await startStaticServer(ROOT, { mark: '.verify-mobile-marker' }); BASE = server.base; }
  catch (e) { console.error('起不了本仓库静态服务器，请用 --base：' + e.message); process.exit(2); }
}
const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${tempProfile('vm-')}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { proc.kill('SIGKILL'); } catch (e) {} if (server) { try { server.stop(); } catch (e) {} } };
process.on('exit', cleanup);

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
  /* CDP 报错时回包只有 error 没有 result：这里必须归一成对象，
     否则 resolve(undefined) 会让下游 `r.result` 抛 TypeError（页面上下文
     还没建好时 Runtime.evaluate 就会这样回），整条验收线直接崩。 */
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.error ? { error: m.error } : (m.result || {})); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise(r => {
  const i = ++mid; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params }));
  setTimeout(() => { if (pending.has(i)) { pending.delete(i); r({}); } }, 25000);
});
const ev = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  return r && r.result ? r.result.value : undefined;
};
const viewport = (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: true });
const shot = async name => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  if (r && r.data) writeFileSync(join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
};
const strip = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const results = [];
function check(tag, label, ok, got) { results.push({ tag, label, ok: !!ok, got: strip(got) }); }

/* 导航：先等地址栏落到目标前缀，再等 readyState（线上首屏慢时旧文档会让 localStorage 抛 SecurityError） */
async function goto(url) {
  const wantBase = url.replace(/[^/]*$/, '');
  await send('Page.navigate', { url });
  for (let i = 0; i < 120; i++) {
    await sleep(100);
    const href = await ev('location.href');
    if (typeof href === 'string' && href.startsWith(wantBase) && (await ev('document.readyState')) === 'complete') break;
  }
}
const overflow = () => ev(`(()=>{const d=document.documentElement;
  return {vw:innerWidth,sw:Math.max(d.scrollWidth, document.body?document.body.scrollWidth:0),docH:d.clientHeight}})()`);
/* 找横向溢出的真凶：右边界超出视口的元素（取最右的三个，便于定位） */
const offenders = () => ev(`(()=>{const vw=innerWidth;const bad=[];
  document.querySelectorAll('body *').forEach(el=>{const r=el.getBoundingClientRect();
    if(r.width>2&&r.right>vw+1&&getComputedStyle(el).position!=='fixed'&&el.offsetParent!==null){
      bad.push({sel:(el.id?'#'+el.id:el.tagName.toLowerCase()+(el.className&&typeof el.className==='string'?'.'+el.className.trim().split(/\s+/).slice(0,2).join('.'):'')),right:Math.round(r.right),w:Math.round(r.width)});}});
  return bad.sort((a,b)=>b.right-a.right).slice(0,3);})()`);
const tapHeights = () => ev(`(()=>{const q=s=>document.querySelector(s);
  const h=e=>e?Math.round(e.getBoundingClientRect().height):0;
  return {start:h(q('#btnStart')),next:h(q('#btnNext')),prev:h(q('#btnPrev')),
    choiceMin:(()=>{const rows=Array.prototype.slice.call(document.querySelectorAll('#answerArea .drill-choice-row, #answerArea .drill-choice'));
      return rows.length?Math.min.apply(null, rows.map(h)):0;})(),
    choiceN:document.querySelectorAll('#answerArea .drill-choice-row, #answerArea .drill-choice').length}})()`);

await send('Page.enable'); await send('Runtime.enable');

const SEED_RESULT = {
  mode: 'mock', total: 1, auto: false, reason: 'manual', date: Date.now(), path: 'Module 1',
  detail: [{ id: 'U1-01', given: 'A', correct: false }],
};

for (const [w, h, tag] of [[375, 812, '375'], [320, 568, '320']]) {
  await viewport(w, h);

  /* ---------- 1. 首页：不该有横向滚动 ---------- */
  await goto(`${BASE}/index.html`);
  await sleep(700);
  const ov1 = await overflow();
  check(tag, `首页无横向溢出`, ov1 && ov1.sw <= ov1.vw + 1, `${ov1.sw} / ${ov1.vw}`);
  if (ov1 && ov1.sw > ov1.vw + 1) check(tag, '首页溢出元素', false, JSON.stringify(await offenders()));
  await shot(tag + '-index');

  /* ---------- 2. 练题页：选项热区 + 横向溢出 ---------- */
  await goto(`${BASE}/drill.html?sec=1.1&i=1`);
  for (let i = 0; i < 60; i++) {
    const ok = await ev(`!!document.querySelector('#answerArea .drill-choice')`);
    if (ok) break;
    await sleep(150);
  }
  const ov2 = await overflow();
  const tap = await tapHeights();
  check(tag, '练题页无横向溢出', ov2 && ov2.sw <= ov2.vw + 1, `${ov2.sw} / ${ov2.vw}`);
  if (ov2 && ov2.sw > ov2.vw + 1) check(tag, '练题页溢出元素', false, JSON.stringify(await offenders()));
  check(tag, '选项热区 ≥44px（手指点得中）', tap && tap.choiceMin >= 44, `最小 ${tap.choiceMin}px，共 ${tap.choiceN} 行`);
  check(tag, 'Next 热区 ≥44px', tap && tap.next >= 44, `${tap.next}px`);
  await shot(tag + '-drill');

  /* ---------- 3. 错题回顾页：卡片不被顶出屏幕 ---------- */
  await goto(`${BASE}/exam.html`);            /* 先落一个同源页面，才能写 localStorage */
  await sleep(400);
  await ev(`localStorage.setItem('tdsat_exam_suite_results_v1', ${JSON.stringify(JSON.stringify([SEED_RESULT]))})`);
  await goto(`${BASE}/wrong.html`);
  for (let i = 0; i < 80; i++) {
    const n = await ev(`document.querySelectorAll('#wrongList .wrong-card').length`);
    if (n >= 1) break;
    await sleep(150);
  }
  const ov3 = await overflow();
  const card = await ev(`(()=>{const c=document.querySelector('#wrongList .wrong-card');
    if(!c) return null;const r=c.getBoundingClientRect();
    return {right:Math.round(r.right),w:Math.round(r.width),vw:innerWidth,
      tailOverflow:(()=>{let over=[];c.querySelectorAll('*').forEach(el=>{const x=el.getBoundingClientRect();
        if(x.right>innerWidth+1&&x.width>2) over.push(el.className||el.tagName);});return over.slice(0,3);})()};})()`);
  check(tag, '错题卡片在视口内', !!(card && card.right <= card.vw + 1), card ? `右边界 ${card.right} / 视口 ${card.vw}` : '没有卡片');
  check(tag, '错题页无横向溢出', ov3 && ov3.sw <= ov3.vw + 1, `${ov3.sw} / ${ov3.vw}`);
  if (card && card.right > card.vw + 1) check(tag, '卡片内部溢出元素', false, JSON.stringify(card.tailOverflow));
  /* 你的答案 / 正确答案两栏：长小数、带逗号的千分位最容易被挤成竖排或截断 */
  const cmp = await ev(`(()=>{const rows=document.querySelectorAll('#wrongList .answer-compare');
    if(!rows.length) return {n:0, bad:[]};
    const bad=[]; rows.forEach(row=>{
      Array.prototype.forEach.call(row.children, cell=>{
        const r=cell.getBoundingClientRect();
        if(r.right>innerWidth+1) bad.push({why:'越界',txt:cell.innerText.slice(0,20)});
        Array.prototype.forEach.call(cell.querySelectorAll('b'), b=>{
          const cs=getComputedStyle(b);
          if(cs.overflow==='hidden'&&b.scrollWidth>b.clientWidth+2)
            bad.push({why:'截断',txt:b.innerText.slice(0,20),sw:b.scrollWidth,cw:b.clientWidth});
        });
      });
    });
    return {n:rows.length, bad:bad.slice(0,3), minW:Math.min.apply(null, Array.prototype.map.call(rows[0].children,c=>Math.round(c.getBoundingClientRect().width)))};})()`);
  check(tag, '答案对比两栏不被挤爆/截断', !!(cmp && cmp.bad.length === 0), cmp ? `${cmp.n} 组，窄栏 ${cmp.minW}px，问题 ${JSON.stringify(cmp.bad)}` : '没有答案对比');
  await shot(tag + '-wrong');

  /* ---------- 4. 模考开始页：Start 热区 ---------- */
  await goto(`${BASE}/exam.html?mode=mock`);
  for (let i = 0; i < 60; i++) {
    const ok = await ev(`!!document.getElementById('btnStart')`);
    if (ok) break;
    await sleep(150);
  }
  const ov4 = await overflow();
  const startH = await ev(`(()=>{const b=document.getElementById('btnStart');return b?Math.round(b.getBoundingClientRect().height):0;})()`);
  check(tag, '模考开始页无横向溢出', ov4 && ov4.sw <= ov4.vw + 1, `${ov4.sw} / ${ov4.vw}`);
  check(tag, 'Start 热区 ≥44px', startH >= 44, `${startH}px`);
  await shot(tag + '-exam-intro');

  /* ---------- 5. 带图的题：SVG 不能被固定宽度撑破 ---------- */
  /* 别手填题位：在 CATALOG 里找第一道真有图的题（TD_FIG.showFigure 返回非空），再按它的 sec/序号导航 */
  await goto(`${BASE}/drill.html`);
  for (let i = 0; i < 80; i++) {
    const ok = await ev(`!!(window.TD_FIG && window.TD_APP && Object.keys(TD_APP.CATALOG || {}).length)`);
    if (ok) break;
    await sleep(150);
  }
  const figPos = await ev(`(()=>{const C=(window.TD_APP||{}).CATALOG||{};
    for (const sec of Object.keys(C)) { const arr=C[sec]||[];
      for (let k=0;k<arr.length;k++){ try{ if (window.TD_FIG.showFigure(arr[k])) return {sec:sec, pos:k+1, id:arr[k].id}; }catch(e){} } }
    return null;})()`);
  check(tag, '题库里存在带图的题（前提）', !!figPos, figPos ? `${figPos.id} @ ${figPos.sec} #${figPos.pos}` : '一道带图的题都没有');
  if (figPos) await goto(`${BASE}/drill.html?sec=${encodeURIComponent(figPos.sec)}&i=${figPos.pos}`);
  for (let i = 0; i < 80; i++) {
    const ok = await ev(`!!document.querySelector('#questionView .td-figure, .td-figure, #answerArea .drill-figure')`);
    if (ok) break;
    await sleep(150);
  }
  const ov5 = await overflow();
  const figBox = await ev(`(()=>{const f=document.querySelector('#questionView .td-figure, .td-figure, #answerArea .drill-figure');
    if(!f) return null;const r=f.getBoundingClientRect();
    const svg=f.querySelector('svg');const sr=svg?svg.getBoundingClientRect():null;
    return {right:Math.round(r.right),w:Math.round(r.width),vw:innerWidth,svgW:sr?Math.round(sr.width):0,svgRight:sr?Math.round(sr.right):0}})()`);
  check(tag, '图表题无横向溢出', ov5 && ov5.sw <= ov5.vw + 1, `${ov5.sw} / ${ov5.vw}`);
  check(tag, '图表 SVG 在视口内', !!(figBox && figBox.svgW > 0 && figBox.svgRight <= figBox.vw + 1),
    figBox ? `svg ${figBox.svgW}px，右边界 ${figBox.svgRight} / ${figBox.vw}` : '没找到图');
  if (ov5 && ov5.sw > ov5.vw + 1) check(tag, '图表题溢出元素', false, JSON.stringify(await offenders()));
  await shot(tag + '-drill-figure');

  /* ---------- 6. 讲义复习页：卡片与题目不能被顶出屏幕 ---------- */
  await goto(`${BASE}/jiangyi.html`);
  for (let i = 0; i < 80; i++) {
    const ok = await ev(`!!(window.TD_JY && document.querySelector('#jyBoardCards .jy-board-card'))`);
    if (ok) break;
    await sleep(150);
  }
  await ev(`(()=>{const b=document.querySelector('#jyBoardCards .jy-board-card'); if(b) b.click();})()`);
  for (let i = 0; i < 60; i++) {
    const ok = await ev(`!!document.querySelector('#jySectionList .drill-section-row:not([data-empty])')`);
    if (ok) break;
    await sleep(150);
  }
  await ev(`(()=>{const r=document.querySelector('#jySectionList .drill-section-row:not([data-empty])'); if(r) r.click();})()`);
  for (let i = 0; i < 80; i++) {
    const ok = await ev(`(()=>{const q=document.getElementById('jyQuiz'); return !!(q && !q.hidden && document.querySelector('#jyQuiz .drill-choice, #jyQuiz .drill-grid input, #jyQuiz #jyStem');})()`);
    if (ok) break;
    await sleep(150);
  }
  const ov6 = await overflow();
  check(tag, '讲义复习页无横向溢出', ov6 && ov6.sw <= ov6.vw + 1, `${ov6.sw} / ${ov6.vw}`);
  if (ov6 && ov6.sw > ov6.vw + 1) check(tag, '讲义页溢出元素', false, JSON.stringify(await offenders()));
  const jyTap = await ev(`(()=>{const b=document.getElementById('jyNext');return b?Math.round(b.getBoundingClientRect().height):0;})()`);
  if (jyTap) check(tag, '讲义下一页热区 ≥44px', jyTap >= 44, `${jyTap}px`);
  await shot(tag + '-jiangyi');

  /* ---------- 7. 记录页：条目在视口内 ---------- */
  await goto(`${BASE}/exam.html`);
  await sleep(400);
  await ev(`localStorage.setItem('tdsat_exam_suite_results_v1', ${JSON.stringify(JSON.stringify([SEED_RESULT, Object.assign({}, SEED_RESULT, { total: 44, path: 'Module 1 · Module 2', date: Date.now() - 86400000 })]))})`);
  await goto(`${BASE}/history.html`);
  for (let i = 0; i < 60; i++) {
    const ok = await ev(`document.querySelectorAll('#histList > *, #historyList > *').length > 0`);
    if (ok) break;
    await sleep(150);
  }
  const ov7 = await overflow();
  check(tag, '记录页无横向溢出', ov7 && ov7.sw <= ov7.vw + 1, `${ov7.sw} / ${ov7.vw}`);
  /* 长文案不许被截成半截：行内元素若 scrollWidth 明显大于 clientWidth 且 overflow:hidden，就是真截断 */
  const clipped = await ev(`(()=>{const bad=[];
    document.querySelectorAll('#histList *, #historyList *').forEach(el=>{
      const cs=getComputedStyle(el);
      if(cs.overflow!=='hidden'&&cs.textOverflow!=='ellipsis') return;
      if(el.scrollWidth>el.clientWidth+2&&el.clientWidth>0&&el.textContent.trim().length>0)
        bad.push({cls:(el.className||el.tagName).toString().slice(0,40), sw:el.scrollWidth, cw:el.clientWidth, txt:el.textContent.trim().slice(0,30)});});
    return bad.slice(0,3);})()`);
  check(tag, '记录页文字没有被截断', Array.isArray(clipped) && clipped.length === 0, JSON.stringify(clipped));
  if (ov7 && ov7.sw > ov7.vw + 1) check(tag, '记录页溢出元素', false, JSON.stringify(await offenders()));
  await shot(tag + '-history');

  /* ---------- 7b. 键盘可达：热区改 44px 之后，Tab 键还得能走到选项和下一题 ---------- */
  await goto(`${BASE}/drill.html?sec=1.1&i=1`);
  for (let i = 0; i < 60; i++) {
    const ok = await ev(`!!document.querySelector('#answerArea .drill-choice')`);
    if (ok) break;
    await sleep(150);
  }
  await ev(`document.body.focus()`);
  const order = [];
  for (let k = 0; k < 24; k++) {
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, key: 'Tab', code: 'Tab' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, key: 'Tab', code: 'Tab' });
    await sleep(120);
    const cur = await ev(`(()=>{const a=document.activeElement; if(!a||a===document.body) return null;
      return (a.id?'#'+a.id:a.className&&typeof a.className==='string'?'.'+a.className.trim().split(/\s+/)[0]:a.tagName).slice(0,24);})()`);
    if (!cur) continue;
    if (order[order.length - 1] !== cur) order.push(cur);
  }
  const reach = order.join(' > ');
  check(tag, 'Tab 能走到选项（键盘用户可选答案）', order.some(x => x.includes('drill-choice')), reach.slice(0, 120));
  check(tag, 'Tab 能走到 Next（键盘用户可翻页）', order.some(x => x.includes('#btnNext') || x.includes('drill-next')), reach.slice(0, 120));
  const trapped = order.length >= 24 && new Set(order).size <= 2;
  check(tag, '没有把焦点困在同一个元素（Tab 死循环）', !trapped, `${order.length} 步 / ${new Set(order).size} 个不同元素`);

  /* ---------- 8. 模考成绩页：窄屏下结果表格不许横滑出屏 ---------- */
  const SK = 'tdsat_exam_suite_session_v1';
  await goto(`${BASE}/exam.html?mode=mock`);
  await ev(`localStorage.removeItem('${SK}')`);
  await goto(`${BASE}/exam.html?mode=mock`);
  for (let i = 0; i < 60; i++) {
    const ok = await ev(`!!document.getElementById('btnStart') && !!window.__TD_EXAM__`);
    if (ok) break;
    await sleep(150);
  }
  await ev(`document.getElementById('btnStart') && document.getElementById('btnStart').click()`);
  await sleep(800);
  /* 把会话改成「一小时前开始、限时已过」：点 Start 就会走真实交卷路径，落到成绩页 */
  await ev(`(()=>{const k='${SK}';const s=JSON.parse(localStorage.getItem(k)||'null');
    if(!s) return false; s.startedAt=Date.now()-3600000; s.endsAt=Date.now()-1000; s.moduleEndsAt=Date.now()-1000;
    s.stage='answer'; localStorage.setItem(k, JSON.stringify(s)); return true;})()`);
  await goto(`${BASE}/exam.html?mode=mock`);
  await ev(`document.getElementById('btnStart') && document.getElementById('btnStart').click()`);
  let resStage = false;
  for (let i = 0; i < 120; i++) {
    resStage = await ev(`!!(document.getElementById('stage-result') && !document.getElementById('stage-result').hidden)`);
    if (resStage) break;
    await sleep(200);
  }
  check(tag, '计时到点后落到成绩页（前提）', resStage, resStage ? 'stage-result' : '还停在别的阶段');
  if (resStage) {
    await sleep(600);
    const ov8 = await overflow();
    check(tag, '成绩页无横向溢出', ov8 && ov8.sw <= ov8.vw + 1, `${ov8.sw} / ${ov8.vw}`);
    if (ov8 && ov8.sw > ov8.vw + 1) check(tag, '成绩页溢出元素', false, JSON.stringify(await offenders()));
    /* 成绩卡里的 8 个指标（#resKV）与单元/知识点错题条（.kp-row）不许被挤到出屏 */
    const kv = await ev(`(()=>{const g=document.getElementById('resKV'); if(!g) return null;
      const gr=g.getBoundingClientRect();
      const cells=Array.prototype.map.call(g.children,c=>{const r=c.getBoundingClientRect();
        return {right:Math.round(r.right), w:Math.round(r.width), txt:c.innerText.replace(/\s+/g,' ').slice(0,16)};});
      return {right:Math.round(gr.right), vw:innerWidth, scrollW:g.scrollWidth, clientW:g.clientWidth,
        minCellW:cells.length?Math.min.apply(null,cells.map(c=>c.w)):0,
        worst:cells.filter(c=>c.right>innerWidth+1).slice(0,2)};})()`);
    check(tag, '成绩指标区不超出视口', !!(kv && kv.right <= kv.vw + 1), kv ? `右边界 ${kv.right} / ${kv.vw}` : '没有指标区');
    check(tag, '成绩指标没有被挤成 0 宽', !!(kv && kv.minCellW >= 40), kv ? `最窄 ${kv.minCellW}px` : '没有指标区');
    if (kv && kv.scrollW > kv.clientW + 2) check(tag, '成绩指标区溢出元素', false, JSON.stringify(kv.worst));
    const kp = await ev(`(()=>{const rows=document.querySelectorAll('#resUnits .kp-row, #resTopics .kp-row');
      if(!rows.length) return {n:0,over:[]}; const over=[];
      rows.forEach(r=>{if(r.getBoundingClientRect().right>innerWidth+1) over.push(r.innerText.slice(0,20));});
      return {n:rows.length, over:over.slice(0,2)};})()`);
    check(tag, '单元/知识点错题条在视口内', !!(kp && kp.over.length === 0), kp ? `${kp.n} 行，越界 ${kp.over.length}` : '没有错题条');
    await ev(`(()=>{const b=document.querySelector('#stage-result .res-tab, #stage-result [data-tab]'); if(b) b.click();})()`);
    await sleep(400);
    const ov8b = await overflow();
    check(tag, '成绩页切换题单后仍无横向溢出', ov8b && ov8b.sw <= ov8b.vw + 1, `${ov8b.sw} / ${ov8b.vw}`);
  }
  await shot(tag + '-result');
  await ev(`localStorage.removeItem('${SK}');localStorage.removeItem('tdsat_exam_suite_results_v1')`);
}

const pass = results.filter(r => r.ok).length;
for (const r of results) if (!r.ok) console.log(`FAIL [${r.tag}] ${r.label}  → ${r.got}`);
console.log(`\n${pass}/${results.length} 通过，截图在 ${OUT}`);
process.exit(results.some(r => !r.ok) ? 1 : 0);
