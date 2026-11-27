/* tools/verify_paper_shape.mjs — 模考卷面长度/模块不一致时不得恢复（第 32 条）。
   44 题却标 module=1 的存档：旧代码只显示前 22 题，模块一计时到点后
   enterModule2() 拿 null 的 m2Options 去 concat，整页崩。 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url'; import { dirname, resolve } from 'path';
import { CHROME, tempProfile } from './lib/chrome.mjs'; import { startStaticServer } from './lib/serve.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)), '..'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const server=await startStaticServer(ROOT,{mark:'.verify-paper-shape-marker'}); const CDP=9500+Math.floor(Math.random()*100);
const proc=spawn(CHROME,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',`--remote-debugging-port=${CDP}`,'--user-data-dir='+tempProfile('ps-'),'--no-first-run','about:blank'],{stdio:'ignore'});
for(let i=0;i<60;i++){try{if((await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok)break;}catch(e){}await sleep(250);}
const tabs=await(await fetch(`http://127.0.0.1:${CDP}/json/list`)).json();const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r));
let mid=0;const pend=new Map();let errs=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id);return;}if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails||{};errs.push(`${d.text||''} ${d.exception?(d.exception.description||d.exception.value):''}`.trim().slice(0,250));}});
const send=(method,params={})=>new Promise(r=>{const i=++mid;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params}));setTimeout(()=>{if(pend.has(i)){pend.delete(i);r({});}},15000);});
const ev=async x=>(await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true})).result?.value;
await send('Runtime.enable');await send('Page.enable');
async function goto(u){await send('Page.navigate',{url:u});for(let i=0;i<80;i++){await sleep(120);if((await ev('document.readyState'))==='complete')break;}await sleep(1200);}
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
await goto(`${server.base}/index.html`); await ev('localStorage.clear()');
for(let i=0;i<40;i++){if(await ev('!!(window.TD_BANK&&TD_BANK.questions&&TD_BANK.questions.length)'))break;await sleep(250);}
const seed0=await ev(`(function(){var qs=window.TD_BANK.questions, a=qs.filter(function(q){return q.unit===1;}).slice(0,22), b=qs.filter(function(q){return q.unit===2;}).slice(0,22);
 var paper=a.concat(b).map(function(q,i){return {uid:(i<22?'M1-':'M2-')+String(i%22+1).padStart(2,'0'),id:q.id,module:i<22?1:2,from:'practice',repeat:1};});
 var ans={}; paper.forEach(function(x){ans[x.uid]={v:'',marked:false,spent:0,locked:x.module===1};});
 return JSON.stringify({mode:'mock',sub:null,unitId:null,stage:'answer',paper:paper,answers:ans,idx:0,module:1,path:null,m1Size:22,m2Options:null,durationSec:4200,
   startedAt:Date.now()-3000,endsAt:Date.now()+4197000,moduleEndsAt:Date.now()-1000,finished:false,locked:false,auto:false,endReason:'',result:null,plan:null,quizMeta:null,cfg:{tmode:'official',perQ:95,total:35,count:22,order:'mixed'}});})()`);
if(!seed0)throw new Error('题库未就绪，无法种存档');
await ev(`localStorage.setItem('tdsat_exam_suite_session_v1',${JSON.stringify(seed0)})`);
await goto(`${server.base}/exam.html?mode=mock`); errs=[];
await ev(`(function(){var b=document.getElementById('btnStart');if(b&&!b.disabled)b.click();})()`); await sleep(2600);
const after=await ev(`(function(){var s=null;try{s=JSON.parse(localStorage.getItem('tdsat_exam_suite_session_v1')||'null');}catch(e){}
 var n=(s&&s.paper)||[]; var bad=n.filter(function(x){return !x||x.module!==1;}).length;
 var t=String(document.body.innerText||'').replace(/\\s+/g,' ').trim();
 return {module:s&&s.module, n:n.length, bad:bad, chars:t.length};})()`);
const bad=errs.filter(x=>!/ResizeObserver|favicon/i.test(x));
console.log(`点 Start 后：module=${after.module} 卷面 ${after.n} 题 · 非模块一 ${after.bad} 题 · ${after.chars} 字`);
if (bad.length) { console.log('❌ 异常：'); bad.slice(0,4).forEach(x=>console.log('  '+x)); }
else if (after.module !== 1 || after.n !== 22 || after.bad > 0) console.log('❌ 44 题 module=1 的存档被恢复，模块二 timed out 时崩/重复拼卷');
else console.log('✅ 44 题 module=1 的脏存档判过期，重开一份 22 题模块一卷，0 异常');
proc.kill('SIGKILL');server.stop();
process.exit((bad.length || after.module !== 1 || after.n !== 22 || after.bad > 0) ? 1 : 0);
