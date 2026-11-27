/* tools/verify_state_shape.mjs — 板块 answers 被写成字符串时，练习页仍要能写答案（第 36 条）。
   旧代码只判断 !s.answers，字符串是真值就放过；点击选项往字符串上写属性直接 TypeError。 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url'; import { dirname, resolve } from 'path';
import { CHROME, tempProfile } from './lib/chrome.mjs'; import { startStaticServer } from './lib/serve.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)), '..'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const server=await startStaticServer(ROOT,{mark:'.verify-state-shape-marker'}); const CDP=9900+Math.floor(Math.random()*100);
const proc=spawn(CHROME,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',`--remote-debugging-port=${CDP}`,'--user-data-dir='+tempProfile('ss-'),'--no-first-run','about:blank'],{stdio:'ignore'});
for(let i=0;i<60;i++){try{if((await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok)break;}catch(e){}await sleep(250);}
const tabs=await(await fetch(`http://127.0.0.1:${CDP}/json/list`)).json();const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r));
let mid=0;const pend=new Map();let errs=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id);return;}if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails||{};errs.push(`${d.text||''} ${d.exception?(d.exception.description||d.exception.value):''}`.trim().slice(0,250));}});
const send=(method,params={})=>new Promise(r=>{const i=++mid;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params}));setTimeout(()=>{if(pend.has(i)){pend.delete(i);r({});}},15000);});
const ev=async x=>(await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true})).result?.value;
await send('Runtime.enable');await send('Page.enable');
async function goto(u){await send('Page.navigate',{url:u});for(let i=0;i<80;i++){await sleep(120);if((await ev('document.readyState'))==='complete')break;}await sleep(1200);}
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
await goto(`${server.base}/index.html`); await ev('localStorage.clear()');
await ev(`localStorage.setItem('tdsat_app_v1',${JSON.stringify(JSON.stringify({sections:{'1.1':{answers:'junk',marks:[],wrongLog:'x',cursor:0,completed:false}},last:null}))})`);
await goto(`${server.base}/drill.html?sec=1.1&i=1`); errs=[];
for(let i=0;i<40;i++){if(await ev(`!!document.querySelector('#answerArea .drill-choice')`))break;await sleep(250);}
const pick=await ev(`(function(){var b=document.querySelector('#answerArea .drill-choice');if(!b)return null;var l=b.dataset.choice;b.click();return l;})()`);
await sleep(900);
const after=await ev(`(function(){var s=null;try{s=JSON.parse(localStorage.getItem('tdsat_app_v1')||'null');}catch(e){}var a=s&&s.sections&&s.sections['1.1']&&s.sections['1.1'].answers;
 return {type:typeof a, isArray:Array.isArray(a), saved:a&&a['TD-11-01']&&a['TD-11-01'].v};})()`);
const bad=errs.filter(x=>!/ResizeObserver|favicon/i.test(x));
console.log(`点击 ${pick} 后 answers 类型=${after.type} 数组=${after.isArray} 落库=${JSON.stringify(after.saved)}`);
if (bad.length) { console.log('❌ 异常：'); bad.slice(0,3).forEach(x=>console.log('  '+x)); }
else if (after.type!=='object' || after.isArray || after.saved!==pick) console.log('❌ 作答没有写进对象，字符串 answers 把写入打崩');
else console.log('✅ 字符串 answers 被修复成对象，选项点击正常落库');
proc.kill('SIGKILL');server.stop();
process.exit((bad.length || after.type!=='object' || after.isArray || after.saved!==pick) ? 1 : 0);
