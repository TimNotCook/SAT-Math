import fs from 'node:fs';
import {boot,sleep,goto,openAcc,state,setInput,waitFor,BASE,OUT_BTN,ARCH} from './seq_lib.mjs';
const TS=Date.now().toString().slice(-6);
const U1='qa.seq'+TS, U2='qa.sq'+TS, PW='seq-pass-'+TS;
const t0=Date.now(), out=[];
const mark=(step,data)=>{const r={t:((Date.now()-t0)/1000).toFixed(1)+'s',step,data};out.push(r);console.log(JSON.stringify(r));fs.writeFileSync('/tmp/e2e-full-log.json',JSON.stringify({U1,U2,PW,out},null,2));};
const click=(B,text)=>B.ev(`(()=>{const p=document.querySelector('.td-acct-panel');if(!p)return 'no-panel';
 const bs=[...p.querySelectorAll('button')].filter(x=>x.textContent.trim()===${JSON.stringify(text)}&&!x.disabled&&x.offsetParent!==null);
 if(!bs.length)return 'none'; bs[0].click(); return 'hit'})()`);
const LOGIN_FORM=`!![...document.querySelectorAll('.td-acct-panel input')].find(i=>i.placeholder&&i.placeholder.startsWith('你的用户名'))`;
async function signOut(B){ for(let i=0;i<4;i++){ const r=await click(B,'退出登录'); await sleep(700);
   if(await B.ev(LOGIN_FORM)) return 'ok('+r+')'; if(r==='none'){ await openAcc(B);} } return 'stuck:'+await state(B); }
async function loginAs(B,u,pw){ await waitFor(B,LOGIN_FORM,6000); await setInput(B,'你的用户名',u); await setInput(B,'输入密码',pw); await click(B,'登录'); }
const A=await boot(9651,'A'), B=await boot(9656,'B');
try{
  await goto(A,BASE+'drill.html'); await openAcc(A);
  await click(A,'没有账号？用用户名注册'); await sleep(400);
  await setInput(A,'3–20',U1); await setInput(A,'至少 6 位',PW); await click(A,'注册并登录');
  mark('1 A 注册 '+U1,{loggedIn:await waitFor(A,OUT_BTN,30000),st:await state(A),shot:await A.shot('/tmp/e2e-1-A-register.png')});
  await goto(A,BASE+'drill.html?unit=1&sec=1.1&i=1');
  await A.ev(`(()=>{const c=document.querySelector('.drill-choice[data-choice="A"]');if(c)c.click();return !!c})()`); await sleep(5000);
  const archA=await A.ev(ARCH);
  mark('2 A 答 1.1 Q1（云端已同步）',{arch:archA,shot:await A.shot('/tmp/e2e-2-A-answer.png')});
  await goto(A,BASE+'drill.html'); await openAcc(A);
  mark('3 A 登出',{r:await signOut(A),st:await state(A)});

  await goto(B,BASE+'drill.html'); await openAcc(B); mark('4 B 全新浏览器（未登录）',{st:await state(B)});
  await loginAs(B,U1,PW);
  mark('5 B 用旧名登录（改名前）',{loggedIn:await waitFor(B,OUT_BTN,25000),arch:await B.ev(ARCH),shot:await B.shot('/tmp/e2e-3-B-login.png')});
  await sleep(1500);
  mark('6 B 登出',{r:await signOut(B),st:await state(B)});

  await goto(A,BASE+'drill.html'); await openAcc(A);
  await loginAs(A,U1,PW); mark('7 A 重新登录',{ok:await waitFor(A,OUT_BTN,25000)});
  await setInput(A,'3–20',U2); await click(A,'改用户名');
  mark('8 A 改名 '+U1+' → '+U2,{ok:await waitFor(A,`document.querySelector('.td-acct-status')&&document.querySelector('.td-acct-status').textContent.includes('用户名已改为')`,25000),st:await state(A),shot:await A.shot('/tmp/e2e-4-A-rename.png')});
  await signOut(A);

  await goto(B,BASE+'drill.html'); await openAcc(B);
  await loginAs(B,U1,PW);
  await waitFor(B,`(()=>{const e=document.querySelector('.td-acct-err');return !!(e&&!e.hidden&&e.textContent.trim())})()`,20000);
  mark('9 B 旧名登录（应失败）',{st:await state(B),shot:await B.shot('/tmp/e2e-5-B-oldfail.png')});

  await setInput(B,'你的用户名',U2); await setInput(B,'输入密码',PW); await click(B,'登录');
  const b2=await waitFor(B,OUT_BTN,25000); const archB2=await B.ev(ARCH);
  mark('10 B 新名登录（应成功）',{loggedIn:b2,arch:archB2,st:await state(B),shot:await B.shot('/tmp/e2e-6-B-newname.png')});
  mark('11 快照对比 A / B改名前 / B改名后',{A:archA,B:await B.ev(ARCH),B2:archB2});
  await goto(B,BASE+'drill.html?unit=1&sec=1.1&i=1');
  mark('12 B 打开同一题，已答状态恢复',{choice:await B.ev(`(()=>{const c=document.querySelector('.drill-choice[aria-pressed="true"]');return c?c.getAttribute('data-choice'):'(none)'})()`),shot:await B.shot('/tmp/e2e-7-B-snapshot.png')});
} finally { await A.close(); await B.close(); }
