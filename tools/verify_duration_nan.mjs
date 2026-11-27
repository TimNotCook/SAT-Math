/* tools/verify_duration_nan.mjs — 旧 settings 里的非数字 total/perQ 不能产出 NaN 时长（第 33 条）。
   开场页以前会显示 NaN:NaN，开考后 endsAt 也是 NaN，倒计时永远不结束。 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url'; import { dirname, resolve } from 'path';
import { CHROME, tempProfile } from './lib/chrome.mjs'; import { startStaticServer } from './lib/serve.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)), '..'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const server=await startStaticServer(ROOT,{mark:'.verify-duration-marker'}); const CDP=9600+Math.floor(Math.random()*100);
const proc=spawn(CHROME,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',`--remote-debugging-port=${CDP}`,'--user-data-dir='+tempProfile('dur-'),'--no-first-run','about:blank'],{stdio:'ignore'});
for(let i=0;i<60;i++){try{if((await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok)break;}catch(e){}await sleep(250);}
const tabs=await(await fetch(`http://127.0.0.1:${CDP}/json/list`)).json();const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r));
let mid=0;const pend=new Map();let errs=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id);return;}if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails||{};errs.push(`${d.text||''} ${d.exception?(d.exception.description||d.exception.value):''}`.trim().slice(0,250));}});
const send=(method,params={})=>new Promise(r=>{const i=++mid;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params}));setTimeout(()=>{if(pend.has(i)){pend.delete(i);r({});}},15000);});
const ev=async x=>(await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true})).result?.value;
await send('Runtime.enable');await send('Page.enable');
async function goto(u){await send('Page.navigate',{url:u});for(let i=0;i<80;i++){await sleep(120);if((await ev('document.readyState'))==='complete')break;}await sleep(1200);}
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
await goto(`${server.base}/index.html`); await ev('localStorage.clear()');
await ev(`localStorage.setItem('tdsat_state_v1',${JSON.stringify(JSON.stringify({settings:{tmode:'total',total:'x'}}))})`);
await goto(`${server.base}/exam.html?mode=quiz&unit=1.1`); errs=[];
const intro=await ev(`String(document.body.innerText||'').replace(/\\s+/g,' ').trim()`);
await ev(`(function(){var b=document.getElementById('btnStart');if(b&&!b.disabled&&b.offsetParent!==null)b.click();})()`); await sleep(1600);
const after=await ev(`(function(){var s=null;try{s=JSON.parse(localStorage.getItem('tdsat_exam_suite_session_v1')||'null');}catch(e){}
 return {duration:s&&s.durationSec, started:s&&s.startedAt, ends:s&&s.endsAt, moduleEnds:s&&s.moduleEndsAt, n:s&&s.paper&&s.paper.length,
  body:String(document.body.innerText||'').replace(/\\s+/g,' ').trim().slice(0,100)};})()`);
const bad=errs.filter(x=>!/ResizeObserver|favicon/i.test(x));
const nanIntro=/NaN/.test(intro);
const finite=Number.isFinite(after.duration)&&after.duration>0&&Number.isFinite(after.ends)&&after.ends>after.started;
console.log(`开场含 NaN=${nanIntro} · 开考后 duration=${after.duration}s ends-started=${after.ends-after.started}ms 卷面 ${after.n} 题`);
if (bad.length) { console.log('❌ 异常：'); bad.slice(0,3).forEach(x=>console.log('  '+x)); }
else if (nanIntro || !finite) console.log('❌ 旧设置的非数字 total 仍产出 NaN 时长/结束时间');
else console.log('✅ 非数字设置回落到有限时长，开场与倒计时均无 NaN');
proc.kill('SIGKILL');server.stop();
process.exit((bad.length || nanIntro || !finite) ? 1 : 0);
