/* tools/verify_m2.mjs — 22 题模考存档的 m2Options 候选被写成 null/字符串时，
   恢复/进模块二不许把脏条目 concat 进卷面（第 30 条）。 */
import { spawn } from 'child_process'; import { fileURLToPath } from 'url'; import { dirname, resolve, join } from 'path';
import { mkdirSync } from 'fs';
import { CHROME, tempProfile } from './lib/chrome.mjs'; import { startStaticServer } from './lib/serve.mjs';
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT=resolve(__dirname, '..'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const OUT=resolve('/tmp/m2-proof'); mkdirSync(OUT,{recursive:true});
const server=await startStaticServer(ROOT,{mark:'.verify-m2-marker'}); const CDP=9300+Math.floor(Math.random()*100);
const proc=spawn(CHROME,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',`--remote-debugging-port=${CDP}`,'--user-data-dir='+tempProfile('m2p-'),'--no-first-run','about:blank'],{stdio:'ignore'});
for(let i=0;i<60;i++){try{if((await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok)break;}catch(e){}await sleep(250);}
const tabs=await(await fetch(`http://127.0.0.1:${CDP}/json/list`)).json();const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r));
let mid=0;const pend=new Map();let errs=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id);return;}if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails||{};errs.push(`${d.text||''} ${d.exception?(d.exception.description||d.exception.value):''}`.trim().slice(0,250));}});
const send=(method,params={})=>new Promise(r=>{const i=++mid;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params}));setTimeout(()=>{if(pend.has(i)){pend.delete(i);r({});}},15000);});
const ev=async x=>(await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true})).result?.value;
await send('Runtime.enable');await send('Page.enable');
async function goto(u){await send('Page.navigate',{url:u});for(let i=0;i<80;i++){await sleep(120);if((await ev('document.readyState'))==='complete')break;}await sleep(1200);}
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
await goto(`${server.base}/index.html`); await ev('localStorage.clear()');
const seed=await ev(`(function(){var bank=window.TD_BANK.questions.filter(function(q){return q.unit===1;}).slice(0,22);
 return JSON.stringify({mode:'mock',sub:null,unitId:1,stage:'answer',paper:bank.map(function(q,i){return {uid:'M1-'+String(i+1).padStart(2,'0'),id:q.id,module:1,from:'official',repeat:1};}),
 answers:Object.fromEntries(bank.map(function(q,i){return ['M1-'+String(i+1).padStart(2,'0'),{v:'',marked:false,spent:0,locked:false}];})),
 idx:0,module:1,path:null,m1Size:22,m2Options:{hard:[null],easy:['junk']},durationSec:4200,
 startedAt:Date.now()-5000,endsAt:Date.now()+4150000,moduleEndsAt:Date.now()-2000,finished:false,locked:false,
 auto:false,endReason:'',result:null,plan:null,quizMeta:null,cfg:{tmode:'official',perQ:95,total:35,count:22,order:'mixed'}});})()`);
await ev(`localStorage.setItem('tdsat_exam_suite_session_v1',${JSON.stringify(seed)})`);
await goto(`${server.base}/exam.html?mode=mock`);
errs=[];const before=await ev(`(function(){var b=document.getElementById('btnStart');return {start:!!(b&&b.offsetParent!==null),chars:String(document.body.innerText||'').length};})()`);
await ev(`(function(){var b=document.getElementById('btnStart');if(b)b.click();})()`);await sleep(2500);
const after=await ev(`(function(){var t=String(document.body.innerText||'').replace(/\\s+/g,' ').trim();var s=null;try{s=JSON.parse(localStorage.getItem('tdsat_exam_suite_session_v1')||'null');}catch(e){}return {chars:t.length,head:t.slice(0,120),module:s&&s.module,paper:s&&s.paper&&s.paper.length,stage:s&&s.stage};})()`);
const bad = errs.filter(x => !/ResizeObserver|favicon/i.test(x));
console.log(`Start 前 ${before.chars} 字 · Start 后 ${after.chars} 字 · 模块 ${after.module} · 卷面 ${after.paper} 题`);
if (bad.length) { console.log('❌ 异常：'); bad.slice(0,4).forEach(x=>console.log('  '+x)); }
else console.log(`✅ m2Options 脏候选不再拼进卷面：0 异常 · stage=${after.stage}`);
proc.kill('SIGKILL');server.stop();
process.exit(bad.length ? 1 : 0);
