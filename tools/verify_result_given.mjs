/* tools/verify_result_given.mjs — 成绩记录里的作答是对象时，结果页错因不能显示 [object Object]（第 35 条）。
   成绩是云端合并/旧版本产物，renderResult 自己做了 safeText，但 renderTypeSummary 把原始
   detail.given 交给 analysis.aggregate，String({}) 会变成 [object Object]。 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url'; import { dirname, resolve } from 'path';
import { CHROME, tempProfile } from './lib/chrome.mjs'; import { startStaticServer } from './lib/serve.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)), '..'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const server=await startStaticServer(ROOT,{mark:'.verify-result-given-marker'}); const CDP=9800+Math.floor(Math.random()*100);
const proc=spawn(CHROME,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',`--remote-debugging-port=${CDP}`,'--user-data-dir='+tempProfile('rg-'),'--no-first-run','about:blank'],{stdio:'ignore'});
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
const seed=await ev(`(function(){var qs=window.TD_BANK.questions, a=qs.filter(function(q){return q.unit===1;}).slice(0,22), b=qs.filter(function(q){return q.unit===2;}).slice(0,22);
 var paper=a.concat(b).map(function(q,i){return {uid:(i<22?'M1-':'M2-')+String(i%22+1).padStart(2,'0'),id:q.id,module:i<22?1:2,from:'official',repeat:1};});
 var ans={}; paper.forEach(function(x){ans[x.uid]={v:'',marked:false,spent:0,locked:true};});
 var q0=a[0];
 var res={date:Date.now(),mode:'mock',module:2,path:'hard',total:44,correct:0,elapsed:100,durationSec:4200,
   estimate:{raw:0,rawMax:44,scaled:200,path:'hard'},report:{units:[],topics:[],priority:[]},
   detail:paper.map(function(p,i){return {pos:i+1,uid:p.uid,id:p.id,unit:q0.unit,section:q0.section,topic:q0.topic,type:q0.type,correct:false,given:(i===0?{x:1}:''),answer:q0.answer,points:0,seconds:5};})};
 return JSON.stringify({mode:'mock',sub:null,unitId:null,stage:'result',paper:paper,answers:ans,idx:0,module:2,path:'hard',m1Size:22,m2Options:null,durationSec:4200,
   startedAt:Date.now()-10000,endsAt:Date.now()+4190000,moduleEndsAt:Date.now()+2090000,finished:true,locked:true,auto:false,endReason:'manual',result:res,plan:null,quizMeta:null,cfg:{tmode:'official'}});})()`);
if(!seed) throw new Error('题库未就绪');
await ev(`localStorage.setItem('tdsat_exam_suite_session_v1',${JSON.stringify(seed)})`);
await goto(`${server.base}/exam.html?mode=mock`); errs=[];
let clicked=false;
for(let i=0;i<40&&!clicked;i++){clicked=await ev(`(function(){var b=document.getElementById('btnStart');if(!b||b.disabled||b.offsetParent===null)return false;b.click();return true;})()`);if(!clicked)await sleep(250);}
await sleep(1200);
const after=await ev(`(function(){var t=String(document.body.innerText||'');var st=document.getElementById('stage-result');return {resultShown:!!(st&&!st.hidden),chars:t.replace(/\\s+/g,' ').trim().length, leak:/\\[object Object\\]/.test(t), types:String((document.getElementById('resTypes')||{}).textContent||'').slice(0,140)};})()`);
const bad=errs.filter(x=>!/ResizeObserver|favicon/i.test(x));
console.log(`点 Start 后结果页 ${after.chars} 字 · 含 [object Object]=${after.leak} · 类型汇总=${JSON.stringify(after.types)}`);
if (bad.length) { console.log('❌ 异常：'); bad.slice(0,3).forEach(x=>console.log('  '+x)); }
else if (!after.resultShown) console.log('❌ 合法 result 没有进入成绩页，体检假绿');
else if (after.leak) console.log('❌ 结果页错因把对象作答渲染成了 [object Object]');
else console.log('✅ 对象作答在错因汇总里按空答案处理，页面无 [object Object]');
process.exitCode = (bad.length || !after.resultShown || after.leak) ? 1 : 0;
proc.kill('SIGKILL');server.stop();
process.exit((bad.length || after.leak) ? 1 : 0);
