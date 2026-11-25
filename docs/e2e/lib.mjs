import { spawn } from 'node:child_process'; import fs from 'node:fs';
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export const BASE='https://timnotcook.github.io/SAT-Math/';
export async function boot(port, tag){
  const UD=`/tmp/seq-${tag}-${Date.now()}`;
  const proc=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ['--headless=new','--no-proxy-server','--disable-gpu','--hide-scrollbars',`--remote-debugging-port=${port}`,
     `--user-data-dir=${UD}`,'--window-size=1280,960','--no-first-run','about:blank'],{stdio:'ignore'});
  let t=null;
  for(let i=0;i<50&&!t;i++){ try{ const l=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); t=l.find(x=>x.type==='page'); }catch{} if(!t) await sleep(400); }
  if(!t) throw new Error('no page '+port);
  const ws=new WebSocket(t.webSocketDebuggerUrl);
  await Promise.race([new Promise(r=>ws.addEventListener('open',r,{once:true})), sleep(8000)]);
  let id=0; const pend=new Map();
  ws.addEventListener('message',e=>{ let m; try{m=JSON.parse(e.data)}catch{return} if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);} });
  const cmd=(method,params={})=>new Promise((res,rej)=>{ const n=++id; pend.set(n,res); ws.send(JSON.stringify({id:n,method,params}));
    setTimeout(()=>{ if(pend.has(n)){ pend.delete(n); rej(new Error('timeout '+method)); } },20000); });
  const ev=async x=>{ try{ const r=await cmd('Runtime.evaluate',{expression:x,awaitPromise:true,returnByValue:true});
      if(r.result&&r.result.exceptionDetails) return 'EX:'+JSON.stringify(r.result.exceptionDetails).slice(0,180);
      return r.result&&r.result.result?r.result.result.value:null; } catch(e){ return 'CMDERR '+e.message; } };
  await cmd('Page.enable'); await cmd('Runtime.enable');
  return {cmd,ev,proc,UD,
    shot:async path=>{ try{ const s=await cmd('Page.captureScreenshot',{format:'png'});
        if(s.result&&s.result.data){ fs.writeFileSync(path, Buffer.from(s.result.data,'base64')); return 'ok'; } return 'no-data'; }
      catch(e){ return 'ERR '+e.message; } },
    close:async()=>{ try{proc.kill('SIGKILL')}catch{} await sleep(300); try{fs.rmSync(UD,{recursive:true,force:true})}catch{} }};
}
export async function goto(B,url){ try{ await B.cmd('Page.navigate',{url:url+(url.includes('?')?'&':'?')+'r='+Date.now()}); }catch(e){}
  for(let k=0;k<40;k++){ if(await B.ev("document.readyState==='complete'")) break; await sleep(250); } await sleep(1200); }
export async function openAcc(B){
  return await B.ev(`(async()=>{const b=[...document.querySelectorAll('button,a')].find(e=>e.textContent.trim()==='设置');if(!b)return 'no-set';b.click();await new Promise(r=>setTimeout(r,500));
   const t=document.querySelector('[data-tab="account"]');if(!t)return 'no-tab';t.click();await new Promise(r=>setTimeout(r,400));return 'ok'})()`);
}
export const state = B=>B.ev(`(()=>{const q=s=>{const e=document.querySelector(s);return e?e.innerText.trim():''};
 return JSON.stringify({who:q('.td-acct-who'),err:q('.td-acct-err'),status:q('.td-acct-status'),
  out:!![...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='退出登录'),
  un:(document.querySelector('input[placeholder^="3–20"]')||{}).value||''})})()`);
export const setInput=(B,ph,val)=>B.ev(`(()=>{const i=[...document.querySelectorAll('input')].find(x=>x.placeholder&&x.placeholder.startsWith(${JSON.stringify(ph)}));
 if(!i)return 'no-input';i.focus();i.value=${JSON.stringify(val)};i.dispatchEvent(new Event('input',{bubbles:true}));return 'ok'})()`);
export const clickText=(B,t)=>B.ev(`(()=>{const b=[...document.querySelectorAll('button,a')].find(e=>e.textContent.trim()===${JSON.stringify(t)});if(!b)return 'no-btn';b.click();return 'ok'})()`);
export async function waitFor(B,expr,timeout=25000){ const end=Date.now()+timeout;
  while(Date.now()<end){ const v=await B.ev(expr); if(v===true)return true; await sleep(400); } return false; }
export const OUT_BTN=`!![...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='退出登录')`;
export const ARCH=`(async()=>{try{const a=await window.TDSUPA.getArchive();return JSON.stringify({n:a&&a.payload?Object.keys(a.payload).length:0})}catch(e){return 'ERR '+e.message}})()`;
