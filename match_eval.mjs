#!/usr/bin/env node
/* 匹配器精度评测（防止"识别对了、却对上另一道题"悄悄回归）
 *
 * 做法：在真实页面上取题库题干，按 OCR 常见错误（数字被读成同形字母 S/l/O/g/B、
 *      m 被读成 rn、随机掉字）造出噪声题干，然后调页面里的匹配器，看 top1 / top3
 *     能不能指回原题。同一批题跑两轮：干净题干 + 噪声题干。
 *
 * 门槛：干净 top1 >= 0.85 且 top3 >= 0.95；噪声 top1 >= 0.80 且 top3 >= 0.90。
 * 题库里存在大量"同一道题的多份拷贝"（U1-04 / SR-194 之类），被指到孪生题不算错，
 * 所以门槛按"允许少量孪生歧义"定，而不是要求 100%。
 *
 * 用法：node match_eval.mjs [baseUrl]
 * 退出码：0 达标；1 低于门槛。
 */
import { spawn } from 'child_process';
const BASE = process.argv[2] || 'https://timnotcook.github.io/SAT-Math';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9400 + Math.floor(Math.random() * 80);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const proc = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/match-eval-${Date.now()}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
process.on('exit', () => { try { proc.kill('SIGKILL'); } catch (e) {} });

const EVAL = `(function(){
  var Q=(window.TD_BANK.questions||[]).filter(function(q){return q.stem&&q.stem.length>25});
  var seed=11;function rnd(){seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;}
  function noise(s){var out='';for(var i=0;i<s.length;i++){var ch=s[i],x=rnd();
    if(/[0-9]/.test(ch)&&x<0.25){out+=({'0':'O','1':'l','5':'S','8':'B','9':'g'})[ch]||ch;}
    else if(ch==='m'&&x<0.2){out+='rn';}
    else if(/[a-zA-Z]/.test(ch)&&x<0.05){continue;}
    else out+=ch;}return out;}
  function run(mode){
    var sample=[];for(var k=0;k<100;k++){sample.push(Q[Math.floor(rnd()*Q.length)]);}
    var t0=Date.now(),top1=0,top3=0,miss=[];
    sample.forEach(function(q){
      var s0=q.stem, s=s0;
      if(mode==='cut50')s=s0.slice(0,Math.ceil(s0.length*0.5));
      if(mode==='noisy')s=noise(s0);
      if(mode==='noisyCut')s=noise(s0.slice(0,Math.ceil(s0.length*0.5)));
      var res=window.TD_IMG_IMPORT.matchStem(s,3);
      if(res[0]&&res[0].id===q.id)top1++; else miss.push([q.id,res[0]?res[0].id:'-']);
      if(res.some(function(c){return c.id===q.id}))top3++;
    });
    return {n:sample.length,top1:top1,top3:top3,ms:Date.now()-t0,miss:miss.slice(0,5)};
  }
  function runGate(){
    var n=0,pass=0,realWrong=0,bad=[];
    var byId={};Q.forEach(function(q){byId[q.id]=q;});
    for(var k=0;k<120;k++){
      var q=Q[Math.floor(rnd()*Q.length)], s=noise(q.stem);
      var c=window.TD_IMG_IMPORT.matchStem(s,5), g=window.TD_IMG_IMPORT._gate(c,s);
      n++; if(!g||!g.pass) continue;
      pass++;
      var top=c[0]&&byId[c[0].id];
      if(!top || c[0].id===q.id) continue;
      var twin=String(top.stem||'').slice(0,60)===String(q.stem||'').slice(0,60);
      if(!twin){realWrong++;bad.push([q.id,c[0].id]);}
    }
    return {n:n,pass:pass,wrong:realWrong,bad:bad.slice(0,5)};
  }
  return JSON.stringify({bank:Q.length,clean:run('clean'),noisy:run('noisy'),cut50:run('cut50'),noisyCut:run('noisyCut'),gate:runGate()});
})()`;

async function main() {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break; } catch (e) {} await sleep(250); }
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const ws = new WebSocket(list.find(x => x.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const waiters = new Map();
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && waiters.has(m.id)) { waiters.get(m.id)(m.result); waiters.delete(m.id); } });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; waiters.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); setTimeout(() => { if (waiters.has(i)) { waiters.delete(i); r({}); } }, 60000); });
  const evalJS = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r?.result?.value; };

  await send('Page.navigate', { url: BASE + '/wrong.html' });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    await sleep(1000);
    if (await evalJS("typeof window.TD_IMG_IMPORT!=='undefined' && typeof window.TD_BANK!=='undefined'")) { ready = true; break; }
  }
  if (!ready) { console.log('[FAIL] 页面没加载出匹配器（TD_IMG_IMPORT / TD_BANK 缺失）'); process.exit(1); }

  const out = JSON.parse(await evalJS(EVAL) || '{}');
  const rows = [
    ['干净题干', out.clean, 0.88, 0.96],
    ['OCR 噪声', out.noisy, 0.86, 0.93],
    ['截断一半', out.cut50, 0.80, 0.90],
    ['噪声+截断', out.noisyCut, 0.72, 0.86],
  ];
  console.log('\n=== 匹配精度评测 ===');
  console.log('base:', BASE, '题库:', out.bank, '题');
  let fail = 0;
  for (const [name, r, min1, min3] of rows) {
    const a1 = r.top1 / r.n, a3 = r.top3 / r.n;
    const ok = a1 >= min1 && a3 >= min3;
    if (!ok) fail++;
    console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}: top1 ${(a1 * 100).toFixed(1)}% (门槛 ${min1 * 100}%) · top3 ${(a3 * 100).toFixed(1)}% (门槛 ${min3 * 100}%) · 100 题耗时 ${r.ms}ms`);
    if (r.miss?.length) console.log('    失配样例:', JSON.stringify(r.miss));
  }
  /* 门禁：自动导入必须"要么不导，要么导对"。允许 1 例（题库重复题造成孪生歧义）。 */
  {
    const g = out.gate || { n: 0, pass: 0, wrong: 0 };
    const ok = g.wrong <= 1;
    if (!ok) fail++;
    console.log(`[${ok ? 'PASS' : 'FAIL'}] 自动导入门禁: 120 题里自动导入 ${g.pass} 道，导错 ${g.wrong} 道（允许 ≤1）`);
    if (g.bad?.length) console.log('    导错样例:', JSON.stringify(g.bad));
  }
  console.log(`\n=== ${fail ? 'FAIL' : 'PASS'}（${rows.length + 1 - fail} / ${rows.length + 1}） ===`);
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.log('[FAIL] 评测脚本异常:', e.message); process.exit(1); });
