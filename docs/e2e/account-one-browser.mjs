import fs from 'node:fs';
import {boot,sleep,goto,openAcc,state,setInput,waitFor,BASE,OUT_BTN,ARCH} from './seq_lib.mjs';
const TS=Date.now().toString().slice(-6);
const U1='qa.one'+TS, U2='qa.on'+TS, PW='one-pass-'+TS;
const t0=Date.now(), out=[];
const mark=(step,data)=>{const r={t:((Date.now()-t0)/1000).toFixed(1)+'s',step,data};out.push(r);console.log(JSON.stringify(r));fs.writeFileSync('/tmp/e2e-one-log.json',JSON.stringify({U1,U2,PW,out},null,2));};
const click=(B,text)=>B.ev(`(()=>{const p=document.querySelector('.td-acct-panel');if(!p)return 'no-panel';
 const bs=[...p.querySelectorAll('button')].filter(x=>x.textContent.trim()===${JSON.stringify(text)}&&!x.disabled&&x.offsetParent!==null);
 if(!bs.length)return 'none'; bs[0].click(); return 'hit'})()`);
const LOGIN_FORM=`!![...document.querySelectorAll('.td-acct-panel input')].find(i=>i.placeholder&&i.placeholder.startsWith('你的用户名'))`;
async function signOut(B){for(let i=0;i<4;i++){const r=await click(B,'退出登录');await sleep(700);if(await B.ev(LOGIN_FORM))return 'ok';if(r==='none')await openAcc(B);}return 'stuck';}
const C=await boot(9657,'C');
try{
  await goto(C,BASE+'drill.html'); await openAcc(C);
  await click(C,'没有账号？用用户名注册'); await sleep(400);
  await setInput(C,'3–20',U1); await setInput(C,'至少 6 位',PW); await click(C,'注册并登录');
  mark('S1 同一浏览器注册 '+U1,{loggedIn:await waitFor(C,OUT_BTN,30000)});
  await signOut(C); mark('S2 登出',{st:await state(C)});
  await setInput(C,'你的用户名',U1); await setInput(C,'输入密码',PW); await click(C,'登录');
  mark('S3 用旧名重新登录（应成功）',{loggedIn:await waitFor(C,OUT_BTN,25000),st:await state(C)});
  await setInput(C,'3–20',U2); await click(C,'改用户名');
  mark('S4 改名 → '+U2,{ok:await waitFor(C,`document.querySelector('.td-acct-status')&&document.querySelector('.td-acct-status').textContent.includes('用户名已改为')`,25000),st:await state(C),shot:await C.shot('/tmp/one-rename.png')});
  await signOut(C); await sleep(500);
  await setInput(C,'你的用户名',U1); await setInput(C,'输入密码',PW); await click(C,'登录');
  await waitFor(C,`(()=>{const e=document.querySelector('.td-acct-err');return !!(e&&!e.hidden&&e.textContent.trim())})()`,20000);
  mark('S5 旧名登录（应失败）',{st:await state(C),shot:await C.shot('/tmp/one-oldfail.png')});
  await setInput(C,'你的用户名',U2); await setInput(C,'输入密码',PW); await click(C,'登录');
  mark('S6 新名登录（应成功）',{loggedIn:await waitFor(C,OUT_BTN,25000),st:await state(C),shot:await C.shot('/tmp/one-newok.png')});
} finally { await C.close(); }
