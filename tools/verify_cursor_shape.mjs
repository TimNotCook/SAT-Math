/* tools/verify_cursor_shape.mjs — 板块 cursor 是对象/NaN 时，练习页不能空题或拼出怪 URL（第 37 条）。 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url'; import { dirname, resolve } from 'path';
import { CHROME, tempProfile } from './lib/chrome.mjs'; import { startStaticServer } from './lib/serve.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)), '..'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const server=await startStaticServer(ROOT,{mark:'.verify-cursor-marker'}); const CDP=9950+Math.floor(Math.random()*40);
const proc=spawn(CHROME,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',`--remote-debugging-port=${CDP}`,'--user-data-dir='+tempProfile('cs-'),'--no-first-run','about:blank'],{stdio:'ignore'});
for(let i=0;i<60;i++){try{if((await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok)break;}catch(e){}await sleep(250);}
const tabs=await(await fetch(`http://127.0.0.1:${CDP}/json/list`)).json();const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r));
let mid=0;const pend=new Map();let errs=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id);return;}if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails||{};errs.push(`${d.text||''} ${d.exception?(d.exception.description||d.exception.value):''}`.trim().slice(0,250));}});
const send=(method,params={})=>new Promise(r=>{const i=++mid;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params}));setTimeout(()=>{if(pend.has(i)){pend.delete(i);r({});}},15000);});
const ev=async x=>(await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true})).result?.value;
await send('Runtime.enable');await send('Page.enable');
async function goto(u){await send('Page.navigate',{url:u});for(let i=0;i<80;i++){await sleep(120);if((await ev('document.readyState'))==='complete')break;}await sleep(1200);}
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
await goto(`${server.base}/index.html`); await ev('localStorage.clear()');
await ev(`localStorage.setItem('tdsat_app_v1',${JSON.stringify(JSON.stringify({sections:{'1.1':{answers:{},marks:{},wrongLog:{},cursor:{x:1},completed:false}},last:null}))})`);
await goto(`${server.base}/drill.html?sec=1.1`); errs=[];
for(let i=0;i<30;i++){if(await ev(`!!document.querySelector('#answerArea .drill-choice')`))break;await sleep(250);}
const after=await ev(`(function(){var a=document.querySelector('#answerArea');var t=String(document.body.innerText||'').replace(/\\s+/g,' ').trim();
 return {choices:document.querySelectorAll('#answerArea .drill-choice').length, chars:t.length, q:!!(a&&a.children.length), url:location.search};})()`);
const bad=errs.filter(x=>!/ResizeObserver|favicon/i.test(x));
console.log(`drill?sec=1.1：选项 ${after.choices} 个 · 正文 ${after.chars} 字 · URL ${after.url}`);
if (bad.length) { console.log('❌ 异常：'); bad.slice(0,3).forEach(x=>console.log('  '+x)); }
else if (!after.choices || after.chars < 80) console.log('❌ 非法 cursor 让练习页停在空题');
else console.log('✅ 非法 cursor 被归一化，练习页正常显示第一题');
proc.kill('SIGKILL');server.stop();
process.exit((bad.length || !after.choices || after.chars < 80) ? 1 : 0);
