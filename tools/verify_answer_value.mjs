/* tools/verify_answer_value.mjs — 存档里的作答是对象/数组时不能污染 UI（第 34 条）。
   旧版用例抽到的"第 3 题"其实是选择题，输入框根本不存在，于是用例常年"通过"却
   什么都没验证；exam.js 里 `esc(a.v || '')` 遇到对象仍会渲染出 [object Object]。
   现在改成真跑：进模考 → 翻到第一道填空题 → 往存档里塞对象答案 → 刷新续考 → 读输入框。 */
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
const ev=async x=>{const r=await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true});return r.result&&r.result.value;};
await send('Runtime.enable');await send('Page.enable');
async function goto(u){await send('Page.navigate',{url:u});for(let i=0;i<80;i++){await sleep(120);if((await ev('document.readyState'))==='complete')break;}await sleep(1000);}
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
await goto(`${server.base}/index.html`); await ev('localStorage.clear()');
await goto(`${server.base}/exam.html?mode=mock`);
for(let i=0;i<60;i++){if(await ev(`!!(document.getElementById('btnStart')&&!document.getElementById('btnStart').disabled)`))break;await sleep(250);}
let clicked=false;
for(let i=0;i<30&&!clicked;i++){clicked=await ev(`(function(){var b=document.getElementById('btnStart');if(!b||b.disabled||b.offsetParent===null)return false;b.click();return true;})()`);if(!clicked)await sleep(250);}
await sleep(1200);
/** 翻到下一道，返回是否找到填空输入框 */
const nextQ=async()=>await ev(`(function(){var b=document.getElementById('btnNext');if(!b||b.disabled)return false;b.click();return true;})()`);
const hasGrid=async()=>await ev(`!!document.querySelector('#answerArea input.editable')`);
let foundIdx=-1, uid=null;
for(let i=0;i<24;i++){
  if(await hasGrid()){const s=await ev(`(function(){var s=JSON.parse(localStorage.getItem('tdsat_exam_suite_session_v1')||'null');return s?{idx:s.idx,uid:s.paper&&s.paper[s.idx]&&s.paper[s.idx].uid}:null;})()`);foundIdx=s.idx;uid=s.uid;break;}
  if(!(await nextQ()))break;
  await sleep(600);
}
const bad=errs.filter(x=>!/ResizeObserver|favicon/i.test(x));
if(uid==null){console.log(`❌ 22 题里没翻到填空题（连点 Next 后仍未出现输入框）${clicked?'':' · Start 没点上'} · JS 异常 ${bad.length}`);proc.kill('SIGKILL');server.stop();process.exit(1);}
/* 往这道填空题的存档塞对象答案，然后刷新续考 */
const seeded=await ev(`(function(){var s=JSON.parse(localStorage.getItem('tdsat_exam_suite_session_v1')||'null');
 if(!s||!s.answers||!s.answers['${uid}'])return false;
 s.answers['${uid}'].v={x:1}; s.answers['${uid}'].marked=true;
 localStorage.setItem('tdsat_exam_suite_session_v1',JSON.stringify(s)); return true;})()`);
errs=[];
await goto(`${server.base}/exam.html?mode=mock`);
for(let i=0;i<60;i++){if(await ev(`!!(document.getElementById('btnStart')&&!document.getElementById('btnStart').disabled)`))break;await sleep(250);}
for(let i=0;i<30;i++){const ok=await ev(`(function(){var b=document.getElementById('btnStart');if(!b||b.disabled||b.offsetParent===null)return false;b.click();return true;})()`);if(ok)break;await sleep(250);}
await sleep(1200);
for(let i=0;i<28;i++){
  const at=await ev(`(function(){var s=JSON.parse(localStorage.getItem('tdsat_exam_suite_session_v1')||'null');return s?s.idx:-1;})()`);
  if(at===foundIdx)break;
  if(!(await nextQ()))break;
  await sleep(600);
}
let after=null;
for(let i=0;i<4&&!after;i++){await sleep(600);after=await ev(`(function(){var g=document.querySelector('#answerArea input.editable');
 return {grid:g?String(g.value):null, body:String(document.body.innerText||''), qv:!!g};})()`);}
if(!after)after={grid:null,body:'',qv:false};
const bad2=errs.filter(x=>!/ResizeObserver|favicon/i.test(x));
const leak=(after.grid&&after.grid.indexOf('[object Object]')>=0)||/\[object Object\]/.test(after.body);
console.log(`第 ${foundIdx+1} 题（填空题）· seeded=${seeded} · 输入框=${JSON.stringify(after.grid)} · 页面含 [object Object]=${/\[object Object\]/.test(after.body)}`);
if(!after.qv)console.log('❌ 续考后没回到填空题，用例没验证到');
else if(leak)console.log('❌ 对象作答原样进了输入框，显示 [object Object]');
else if(bad2.length){console.log('❌ JS 异常：');bad2.slice(0,3).forEach(x=>console.log('  '+x));}
else console.log('✅ 对象/数组作答被清空，输入框不再出现 [object Object]');
proc.kill('SIGKILL');server.stop();
process.exit((!after.qv||leak||bad2.length) ? 1 : 0);
