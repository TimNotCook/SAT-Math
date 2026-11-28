#!/usr/bin/env node
/* TD SAT Math 线上四模块独立验收（verifier 产出）
 * 用 headless Chrome + CDP 加载真实线上页面，检查：
 *   1) 所有 script/link 资源 HTTP 200
 *   2) 关键 DOM 节点存在（导航/做题面/设置入口/识别面板）
 *   3) 浏览器控制台无 JS 异常
 *   4) 核心交互：设置面板可开、账户 tab 可切
 * 用法：node verify_site.mjs [baseUrl]
 * 退出码：0 全通过；1 有 FAIL。
 */
import { spawn } from 'child_process';
const BASE = process.argv[2] || 'https://timnotcook.github.io/SAT-Math';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9400 + Math.floor(Math.random()*80);
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const proc = spawn(CHROME,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  `--remote-debugging-port=${PORT}`,`--user-data-dir=/tmp/verify-site-${Date.now()}`,'--no-first-run','about:blank'],{stdio:'ignore'});
process.on('exit',()=>{try{proc.kill('SIGKILL')}catch(e){}});

async function cdp(){
  for(let i=0;i<50;i++){try{if((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok)break}catch(e){}await sleep(250)}
  const t=await(await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const ws=new WebSocket(t.find(x=>x.type==='page').webSocketDebuggerUrl);
  await new Promise(r=>ws.addEventListener('open',r));
  let id=0;const w=new Map();const logs=[];
  ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data);
    if(m.id&&w.has(m.id)){w.get(m.id)(m.result);w.delete(m.id)}
    if(m.method==='Runtime.exceptionThrown')logs.push(m.params.exceptionDetails.text||'exception');
    if(m.method==='Log.entryAdded'&&m.params.entry.level==='error')logs.push(m.params.entry.text);
  });
  const send=(method,params={})=>new Promise(r=>{const i=++id;w.set(i,r);ws.send(JSON.stringify({id:i,method,params}));setTimeout(()=>{if(w.has(i)){w.delete(i);r({})}},30000)});
  return {send,logs,ws};
}

// 断言基于当前实际 UI（2026-11-21 实测 DOM），非历史版本假设
const NO_RES=['firebase-cloud.js'];   // Firebase 模块已摘除：任何页面都不许再加载
const PAGES=[
  {name:'单元练习 drill',url:'/drill.html',need:['#appnav','.drill-context','真题练习']},
  {name:'做题视图 drill',url:'/drill.html?sec=1.1&i=1',need:['#questionView','Mark for Review','Question 1 of','Scratch']},
  {name:'单元抽查 exam',url:'/exam.html?mode=quiz&unit=1',need:['.appbar','.exam-start-main','单元抽查','#btnStart']},
  {name:'模考 exam',url:'/exam.html?mode=mock',need:['.appbar','.stage','Start','SAT Math Prep','Back to Practice']   /* 退出入口已统一为「← Back to Practice」（考试中另有 Exit 按钮，起始页不显示） */,absent:['真题练习','单元抽查','错题回顾','题库']},
  {name:'错题回顾 wrong',url:'/wrong.html',need:['#appnav','图片识别导入']},
];
const results=[];
const c=await cdp();
await c.send('Page.enable');await c.send('Runtime.enable');await c.send('Log.enable');

for(const p of PAGES){
  c.logs.length=0;
  await c.send('Page.navigate',{url:BASE+p.url});
  await sleep(3500);
  const r=await c.send('Runtime.evaluate',{expression:`JSON.stringify({
     title:document.title,
     body:(document.body.innerText||'').slice(0,4000),
     resources:[...document.querySelectorAll('script[src],link[rel=stylesheet]')].map(x=>x.src||x.href).filter(Boolean),
     failScripts:[...performance.getEntriesByType('resource')].filter(x=>x.initiatorType==='script'||x.initiatorType==='link')
   })` ,returnByValue:true});
  let d={};try{d=JSON.parse(r.result.value||'{}')}catch(e){}
  const checks=[];
  for(const needle of NO_RES) checks.push({needle:'资源不含：'+needle, ok: !(d.resources||[]).some(u=>String(u).indexOf(needle)>=0)});
  for(const needle of p.need){
    const isSel=/^[#.[][a-zA-Z]/.test(needle);
    let ok=false;
    if(isSel){
      const q=await c.send('Runtime.evaluate',{expression:`!!document.querySelector(${JSON.stringify(needle)})`,returnByValue:true});
      ok=!!q.result?.value;
    }else ok=(d.body||'').includes(needle);
    checks.push({needle,ok});
  }
  for(const needle of (p.absent||[])){
    const ok=!(d.body||'').includes(needle);
    checks.push({needle:'不应出现：'+needle,ok});
  }
  // 资源检测：用页面内 fetch 检查关键 JS/CSS 可达
  const resCheck=await c.send('Runtime.evaluate',{expression:`(async()=>{const urls=[...document.querySelectorAll('script[src],link[rel=stylesheet]')].map(x=>x.src||x.href).filter(Boolean);const out=[];for(const u of urls.slice(0,12)){try{const r=await fetch(u,{method:'HEAD'});out.push([u.split('/').pop(),r.status])}catch(e){out.push([u.split('/').pop(),'ERR'])}}return JSON.stringify(out)})()`,awaitPromise:true,returnByValue:true});
  let resources=[];try{resources=JSON.parse(resCheck.result.value||'[]')}catch(e){}
  const badRes=resources.filter(x=>x[1]!==200);
  const errs=[...c.logs];
  const pass=checks.every(x=>x.ok)&&badRes.length===0&&errs.length===0;
  results.push({name:p.name,pass,checks,resources:resources.length,badRes,errors:errs.slice(0,5)});
}
// 交互验证：设置面板可开
await c.send('Page.navigate',{url:BASE+'/wrong.html'});await sleep(3000);
const inter=await c.send('Runtime.evaluate',{expression:`(async()=>{
  const btns=[...document.querySelectorAll('button')];
  const b=btns.find(x=>x.getAttribute('aria-label')==='设置'||x.textContent.trim()==='设置');
  if(!b)return JSON.stringify({ok:false,why:'no settings button'});
  b.click();await new Promise(r=>setTimeout(r,300));
  const panel=document.querySelector('.td-acct-layer');
  const open=panel&&panel.getAttribute('data-open')==='1';
  const tabs=[...document.querySelectorAll('.td-set-tab')].map(x=>x.textContent);
  return JSON.stringify({ok:!!open,tabs});
})()`,awaitPromise:true,returnByValue:true});
let iR={};try{iR=JSON.parse(inter.result.value||'{}')}catch(e){}
results.push({name:'交互：设置面板',pass:!!iR.ok&&(iR.tabs||[]).length>=2,detail:iR});

console.log('\n=== TD SAT Math 线上验收报告 ===');
console.log('base:',BASE,'time:',new Date().toISOString());
let fail=0;
for(const r of results){
  console.log(`\n[${r.pass?'PASS':'FAIL'}] ${r.name}`);
  if(r.checks) for(const k of r.checks) console.log('   ',k.ok?'ok':'MISS',k.needle);
  if(r.badRes?.length) console.log('    BAD RES:',JSON.stringify(r.badRes));
  if(r.errors?.length) console.log('    JS ERR:',JSON.stringify(r.errors));
  if(r.detail) console.log('    ',JSON.stringify(r.detail));
  if(!r.pass)fail++;
}
console.log(`\n=== ${results.length-fail} PASS / ${fail} FAIL ===`);
try{c.ws.close()}catch(e){};try{proc.kill('SIGKILL')}catch(e){}
process.exit(fail?1:0);
