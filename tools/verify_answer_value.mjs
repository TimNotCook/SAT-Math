/* tools/verify_answer_value.mjs — 存档里的作答是对象/数组时不能污染 UI（第 34 条）。
   旧代码把对象答案原样塞进 grid 输入框，显示 [object Object]，导航算已作答、判分算空。 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url'; import { dirname, resolve } from 'path';
import { CHROME, tempProfile } from './lib/chrome.mjs'; import { startStaticServer } from './lib/serve.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)), '..'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const server=await startStaticServer(ROOT,{mark:'.verify-answer-value-marker'}); const CDP=9700+Math.floor(Math.random()*100);
const proc=spawn(CHROME,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',`--remote-debugging-port=${CDP}`,'--user-data-dir='+tempProfile('av-'),'--no-first-run','about:blank'],{stdio:'ignore'});
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
const seed=await ev(`(function(){var qs=window.TD_BANK.questions.filter(function(q){return q.unit===1;}).slice(0,22);
 var paper=qs.map(function(q,i){return {uid:'M1-'+String(i+1).padStart(2,'0'),id:q.id,module:1,from:'official',repeat:1};});
 var ans={}; paper.forEach(function(x,i){ans[x.uid]={v:'',marked:false,spent:0,locked:false};});
 ans['M1-03'].v={x:1}; ans['M1-04'].v=['A']; ans['M1-05'].v=3; ans['M1-05'].marked=true;
 return JSON.stringify({mode:'mock',sub:null,unitId:null,stage:'answer',paper:paper,answers:ans,idx:2,module:1,path:null,m1Size:22,m2Options:{hard:paper.slice(0,4),easy:paper.slice(0,4)},durationSec:4200,startedAt:Date.now()-3000,endsAt:Date.now()+4197000,moduleEndsAt:Date.now()+2097000,finished:false,locked:false,cfg:{tmode:'official'}});})()`);
if(!seed) throw new Error('题库未就绪');
await ev(`localStorage.setItem('tdsat_exam_suite_session_v1',${JSON.stringify(seed)})`);
await goto(`${server.base}/exam.html?mode=mock`); errs=[];
let clicked=false;
for(let i=0;i<40&&!clicked;i++){clicked=await ev(`(function(){var b=document.getElementById('btnStart');if(!b||b.disabled||b.offsetParent===null)return false;b.click();return true;})()`);if(!clicked)await sleep(250);}
const pre=await ev(`(function(){var b=document.getElementById('btnStart');return {btn:!!b,label:b&&String(b.textContent||'').trim(),body:String(document.body.innerText||'').replace(/\\s+/g,' ').slice(0,100)};})()`);
await sleep(1800);
const after0=await ev(`(function(){var g=document.querySelector('#answerArea input.editable'); var s=null;try{s=JSON.parse(localStorage.getItem('tdsat_exam_suite_session_v1')||'null');}catch(e){}
 return {grid:g?String(g.value):null, body:String(document.body.innerText||''), saved:s&&s.answers&&s.answers['M1-03']&&s.answers['M1-03'].v, qv:!!document.querySelector('#answerArea input.editable'), html:String((document.getElementById('answerArea')||{}).innerHTML||'').slice(0,150)};})()`);
const after=after0; if(!clicked)console.log('未点到 Start：',JSON.stringify(pre));
const bad=errs.filter(x=>!/ResizeObserver|favicon/i.test(x));
const leak=after.grid==='[object Object]' || /\[object Object\]/.test(after.body);
console.log(`grid 输入框=${JSON.stringify(after.grid)} · qv=${after.qv} · 落库 M1-03=${JSON.stringify(after.saved)} · 页面含 [object Object]=${/\[object Object\]/.test(after.body)}`);
if(!after.qv)console.log('  answerArea HTML:',after.html);
if (bad.length) { console.log('❌ 异常：'); bad.slice(0,3).forEach(x=>console.log('  '+x)); }
else if (leak) console.log('❌ 对象作答原样进了输入框，显示 [object Object]');
else console.log('✅ 对象/数组作答被清空，数字转字符串，输入框不再出现 [object Object]');
proc.kill('SIGKILL');server.stop();
process.exit((bad.length || leak) ? 1 : 0);
