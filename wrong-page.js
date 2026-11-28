(function(){
 'use strict';
 var A=window.TD_APP,esc=A.esc,T=window.TD_TEXT||{};
 /* Render ^{...} superscripts as real <sup> (same typography as the exam pages). */
 function mathfmt(s){var e=String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
   return e.replace(/\^\{([^{}]*)\}/g,'<sup>$1</sup>');}
 /* 导入错题来自历史 JSON / 云端合并：stem 可能是对象、数组或数字，不能直接
    .trim()。只把字符串/数字当正文，数组拼成一行，其余当缺省。 */
 function plainText(v){
   if(v==null)return'';
   if(Array.isArray(v))return v.filter(function(x){return typeof x==='string'||typeof x==='number';}).join(' ');
   if(typeof v==='object'||typeof v==='boolean')return'';
   return String(v);
 }
 /* 成绩档案里的 correct 可能是布尔、1/0 或字符串；只把明确真值当答对。 */
 function flagKey(v){return typeof v==='string'?v.trim().toLowerCase():v;}
 function isRight(v){v=flagKey(v);return v===true||v===1||v==='true'||v==='1';}
 function isWrong(v){return v===false||v===0||v==='false'||v==='0';}
 function isTrueFlag(v){v=flagKey(v);return v===true||v===1||v==='true'||v==='1';}

 function plainChoices(v){
   var out={};
   if(Array.isArray(v)){v.forEach(function(x,i){out[String.fromCharCode(65+i)]=plainText(x);});return out;}
   if(v&&typeof v==='object'){Object.keys(v).forEach(function(k){out[k]=plainText(v[k]);});}
   return out;
 }
 /* Render the question's figure (graph/table/diagram) when one is registered,
    so 错题回顾 shows the same visual as 单元练习 / 单元抽查 / 模考.
    Uses the shared window.TD_FIG.showFigure — never throws if absent. */
 function figHtml(q){
   if(!q||!window.TD_FIG)return '';
   try{var f=window.TD_FIG.showFigure(q);return f||'';}catch(e){return '';}
 }
 A.nav('wrong');
 var activeUnit=parseInt(A.URL.get('unit')||'0',10); if(activeUnit<1||activeUnit>4)activeUnit=0;
 function load(k){try{return JSON.parse(localStorage.getItem(k))||[];}catch(e){return[];}}
 /* 只认数组：成绩仓库被云端/旧版写成对象时，直接 .forEach 会抛错→整页空白 */
 function loadArr(k){var v=load(k);return Array.isArray(v)?v:[];}
 /* 成绩记录内部的 detail 也可能被写成对象/字符串：这里同样只认数组。 */
 function asArr(v){return Array.isArray(v)?v:[];}
 /* ===== 错题 JSON 导入 =====
    AI 转录的错题先尝试与题库中的同一道题对齐（按 id，其次按题干归一化）；
    命中时写入该题所在 section 的 secState.answers，的身份与题库题目完全一致，
    未命中时作为独立「导入错题」记录保存在 IMPORT_KEY，仅在本页展示。 */
 var IMPORT_KEY='tdsat_imported_wrong_v1',IMPORT_MARK='imported_wrong_json_v1';
 function feedback(msg){var el=document.getElementById('importFeedback');if(el)el.textContent=msg||'';}
 function readImport(){
  try{
    var d=JSON.parse(localStorage.getItem(IMPORT_KEY));
    /* 旧版导入仓库可能直接存成数组；统一包成 {items:[...]}，否则下一次导入
       会把旧数组当空仓库，整批旧错题被覆盖丢失。 */
    if(Array.isArray(d))return{items:d};
    return d&&typeof d==='object'?d:{items:[]};
  }catch(e){return{items:[]};}
}
 function writeImport(d){try{localStorage.setItem(IMPORT_KEY,JSON.stringify(d));if(window.TDSync)try{window.TDSync.notify(IMPORT_KEY)}catch(e2){}return true;}catch(e){return false;}}
 function normStem(s){return String(s==null?'':s).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g,'');}
 function pick(){
   /* 对象/函数字段不能当成「有内容」：否则 {stem:{...}, question:'真实题干'}
      会先取到对象，把后面合法的 question 丢掉。数组仍保留（plainText 会拼行）。 */
   for(var i=0;i<arguments.length;i++){
     var v=arguments[i];
     if(v==null||typeof v==='function')continue;
     if(typeof v==='object'&&!Array.isArray(v))continue;
     if(String(v).trim()!=='')return v;
   }
   return '';
 }
 function bankIndex(){
   var byId={},byStem={};
   A.SECS.forEach(function(s){(A.CATALOG[s]||[]).forEach(function(q){
     if(!q||!q.id)return;
     byId[String(q.id).toLowerCase()]={q:q,sec:s};
     var k=normStem((T[q.id]||{}).stem||q.stem||'');
     if(k&&!byStem[k])byStem[k]={q:q,sec:s};
   });});
   return{byId:byId,byStem:byStem};
 }
 function matchItem(it,idx){
   var raw=String(pick(it.id,it.qid,it.questionId)||'').trim().toLowerCase();
   if(raw&&idx.byId[raw])return idx.byId[raw];
   var k=normStem(pick(it.stem,it.question,it.text,it.prompt));
   return(k&&idx.byStem[k])||null;
 }
 function normalizeItem(raw){
   var it=raw||{},ch=it.choices||it.options||{};
   if(typeof ch==='string'){try{ch=JSON.parse(ch);}catch(e){ch={};}}
   /* choices 被写成字符串 "null"/"true"/"123" 时，JSON.parse 后不是对象，
      Object.keys(null) 会直接 TypeError，整次导入失败。 */
   if(!ch||typeof ch!=='object')ch={};
   var type=plainText(pick(it.type,Object.keys(ch).length?'mcq':'grid')).toLowerCase();
   if(type!=='grid')type='mcq';
   var ans=pick(it.answer,it.correct,it.answerKey,it.correctAnswer);
   return{
     id:plainText(pick(it.id,it.qid,it.questionId)),
     stem:plainText(pick(it.stem,it.question,it.text,it.prompt)),
     choices:plainChoices(ch),type:type,answer:plainText(ans),
     value:it.value!=null?plainText(it.value):(type==='grid'?num(ans):null),
     source:plainText(pick(it.source,it.from,it.page)),
     topic:plainText(pick(it.topic)),
     given:plainText(pick(it.given,it.userAnswer,it.yourAnswer,it.chosen,it.selected))
   };
 }
function importData(data){
  if(!data)throw new Error('JSON 内容为空');
  var items=Array.isArray(data)?data:asArr(data.items||data.questions||data.records||data.wrong);
  if(!Array.isArray(items)||!items.length)throw new Error('JSON 中没有 items 数组');
  var store=readImport();if(!Array.isArray(store.items))store.items=[];
  var idx=bankIndex(),seen={},now=Date.now(),added=0,written=0,readOnly=0,created=0;
  /* 旧存档/云端合并可能把 items 写成 [null, ...]：先剔掉非对象条目，
     否则下一次导入在 x.key 处直接 TypeError，整次导入失败。 */
  store.items=store.items.filter(function(x){return x&&typeof x==='object';});
  store.items.forEach(function(x){var k=x.key||(x.matchId?'i:'+x.matchId:'s:'+normStem(x.stem));if(k)seen[k]=true;});
  items.forEach(function(raw){
    var it=normalizeItem(raw),m=matchItem(it,idx);
    var key=m?'i:'+m.q.id:(normStem(it.stem)?'s:'+normStem(it.stem):(it.id?'i:'+it.id.toLowerCase():''));
    if(!key||seen[key])return;
    seen[key]=true;
    var rec={key:key,id:it.id,stem:it.stem,choices:it.choices,type:it.type,answer:it.answer,
      value:it.value,source:it.source,topic:it.topic,given:it.given,
      matchId:m?m.q.id:null,matchSec:m?m.sec:null,importedAt:now};
    if(m){
      var st0=A.secState(m.sec,false),cur=st0?st0.answers[m.q.id]:null;
      if(cur){
        /* 错题记录只增不改：该题已有任何作答记录（真实作答或此前导入），一律不覆盖，
           仅作为只读记录追加展示，原作答数据原封不动。 */
        rec.readOnly=true;readOnly++;
      }else{
        /* 该题此前没有任何作答记录：新增一条导入错题（纯追加）。 */
        var st=A.secState(m.sec,true);
        st.answers[m.q.id]={v:it.given,correct:false,ts:now,importSrc:IMPORT_MARK};
        st.completed=A.stats(m.sec).completed;
        A.save();written++;
      }
    }
    if(!rec.matchId)created++;
    store.items.push(rec);added++;
  });
  store.title=plainText(pick(data.title,store.title))||'导入错题';
  store.importedAt=now;
  if(!writeImport(store))throw new Error('localStorage 写入失败');
  var msg='已导入 '+added+' 道：新增错题 '+written+' 道 · 已有作答仅只读展示 '+readOnly+' 道（未改动）· 未匹配 '+created+' 道';
  all=collect();render();feedback(msg);
  return{added:added,written:written,readOnly:readOnly,created:created,message:msg};
}
/* 讲义复习（JY1-001 这类题）不在 TD_BANK 里：只有 jiangyi-core.js 载入时才查得到。
   这样错题回顾能收讲义的错，又不会把 JY 混进 CATALOG / 现有 20 个板块。 */
function questionById(id){
  /* 重复题干归并（口径见 docs/bank-duplicates.md）：副本 id 先换成 canonical，
     同一道题只在错题本里记一笔。data/aliases.js 由 tools/dup_groups.mjs --alias 生成。 */
  var alias = window.TD_ALIAS || {};
  var cid = alias[String(id)] || String(id);
  var q=A.BANK.questions.find(function(x){return x.id===cid;});
  if(!q&&window.TD_JY&&window.TD_JY.BY_ID)q=window.TD_JY.BY_ID[cid];
  return q;
}
function topic(q){return String(q.topic||'').replace(/\s*·\s*第\s*\d+\s*题\s*$/,'').trim()||A.SECTION_CN[q.section]||'综合';}
 function add(map,q,given,source,date){
   /* dup = 与教材板块同题干的精编重题（如 U4-02 ↔ TD-41-02），只留在板块里练习，
      不重复进错题本。 */
   if(q&&q.dup)return;
   if(!q||map[q.id]&&map[q.id].corrected&&source!=='单元练习')return;
   /* 存档里的作答/来源可能是对象：直接 String() 会把 [object Object] 印到
      「你的答案」和来源行，统一先过 plainText 降级。 */
   var gv=plainText(given),sv=plainText(source);
   var x=map[q.id]||{q:q,attempts:0,sources:[],date:0,given:'',corrected:false};
   x.attempts++; if(x.sources.indexOf(sv)<0)x.sources.push(sv);
   if((date||0)>=x.date){x.date=date||0;x.given=gv;x.source=sv;}
   if(sv==='单元练习'){x.corrected=false;x.practiceWrong=true;}
   map[q.id]=x;
 }
 /* 2026-11-16: 历史作答记录里的 correct 是「作答当时」按当时的答案判定的。
    若题库答案后来被修正（如 T13 的 11 处错答案），旧记录会出现
    「你的答案 A / 正确答案 A」却仍算错的矛盾。这里统一用当前题库答案
    + 权威判分函数 A.isCorrect 复核：现在判为正确的记录不再算错题。 */
 function stillWrong(q, given){
   if(A.stillWrong)return A.stillWrong(q,given);
   if(!q)return true;
   if(A.isCorrect)return !A.isCorrect(q,given);
   var g=String(given==null?'':given).trim();
   if(!g)return true;
   if(q.type==='mcq'){var av=q.answer==null?q.value:q.answer;return g.toUpperCase()!==String(av==null?'':av).trim().toUpperCase();}
   var a=num(g),b=num(q.value);
   return !(a!==null&&b!==null&&Math.abs(a-b)<=Math.max(Math.abs(b)*.01,1e-9));
 }
 function collect(){
   var map={};
   A.SECS.forEach(function(s){var st=A.secState(s,false);if(!st)return;
     A.CATALOG[s].forEach(function(q){var a=st.answers[q.id],wl=(st.wrongLog||{})[q.id];
       var src=a&&a.importSrc===IMPORT_MARK?'导入错题':'单元练习';
       if(a&&isWrong(a.correct)&&stillWrong(q,a.v)) add(map,q,a.v,src,a.ts||0);
       /* wrongLog 是「只增不删」的台账：最新作答是对的 → 记「已订正」；
          最新作答被清掉（再点一次已选项 = 清空作答）或这道题只有迁移来的过错题键
          → 也要凭台账记一笔「曾经错过」，不能因为 answers 里没记录就整条消失。 */
       /* wrongLog 条目本身也可能是对象（云端合并把 v 写成 {x:1}）：String()
          会得到 "[object Object]"，stillWrong 判错后 add 再降级成空值，凭空
          多一张「你的答案 未作答」的幽灵错题卡。只接收字符串/数字 v。 */
       else if(wl&&typeof wl==='object'&&!Array.isArray(wl)&&
         (typeof wl.v==='string'||typeof wl.v==='number')&&String(wl.v).trim()&&stillWrong(q,wl.v))
         add(map,q,wl.v,src,wl.ts||0);});});
   loadArr('tdsat_exam_suite_results_v1').forEach(function(r){if(!r||typeof r!=='object')return;var name=r.mode==='quiz'?'单元抽查':r.mode==='mock'?'模考':r.mode==='jiangyi'?'讲义复习':'考试练习';
     /* void = 存档作废前留的「未交卷」档案：卷面/作答已保存，但从未判分，不能算错题 */if(isTrueFlag(r.void))return;
     if(r.mode==='jiangyi'&&!window.TD_JY)return;
     asArr(r.detail).forEach(function(d){if(!d||typeof d!=='object'||Array.isArray(d))return;var q=questionById(d.id);
       var dGiven=plainText(d.given);
       /* 空作答不是错题；对象 given 会被 String() 变成 [object Object] 后再
          降级成空值，凭空多一张「你的答案 未作答」的幽灵卡。 */
       if(!dGiven)return;
       if(!isRight(d.correct)&&stillWrong(q,dGiven))add(map,q,dGiven,name,r.date||0);});});
   var legacy=load('tdsat_state_v1')||{},legacyWrong=legacy.wrong||{},legacySeen={};
   Object.keys(legacyWrong).forEach(function(id){
     var key=id+'|历史错题';
     if(Object.prototype.hasOwnProperty.call(legacyWrong,id)&&!legacySeen[key]){
       var old=legacyWrong[id]||{},q=questionById(id);
       legacySeen[key]=true;
       var lg=plainText(old.given)||plainText(old.v)||plainText(old.answer)||'';
       if(stillWrong(q,lg))add(map,q,lg,'历史错题',old.last||old.ts||old.date||0);
     }
   });
   /* 讲义复习的作答存在自己的 key：只补错题，不参与上面 20 个板块的订正判定。 */
   if(window.TD_JY&&window.TD_JY.state){
     var jy=window.TD_JY.state.answers||{};
     Object.keys(jy).forEach(function(id){var a=jy[id],q=questionById(id); /* 用 questionById 走别名归一，JY4-047 这类教材题会并到 TD-41-01，不重复记账 */
       if(q&&a&&isWrong(a.correct)&&String(a.v==null?'':a.v).trim())add(map,q,a.v,'讲义复习',a.ts||0);});
   }
   /* A later correct practice answer marks the historical mistake as corrected. */
   Object.keys(map).forEach(function(id){var x=map[id];A.SECS.some(function(s){var st=A.secState(s,false),a=st&&st.answers[id];
     if(a&&isRight(a.correct)){x.corrected=true;x.current=a.v;return true;}return false;});});
   return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return a.q.unit-b.q.unit||b.date-a.date;});
 }
 function num(s){if(typeof s==='boolean')return null;s=String(s==null?'':s).trim().replace(/[−–]/g,'-').replace(/,/g,'');
   /* 这里必须是行尾锚点，不是字面量 \$；旧写法把 3/4 当格式错误。 */
   var m=/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/.exec(s);if(m&&+m[2])return +m[1]/+m[2];
   return /^-?\d+(?:\.\d+)?$/.test(s)?+s:null;}
 function choiceText(q,L){var e=T[q.id]||{},v=(e.choices&&e.choices[L])||(q.choices&&q.choices[L]);return v?String(v):'';}
 function analysis(x){
   /* 导入错题是历史 JSON / 云端合并来的：given 可能是对象/数字（旧导入器逐字
      存了原始字段），不能直接 .trim()，否则整页错题本在分析阶段就崩。 */
   var q=x.q,g=String(x.given==null?'':x.given).trim(),
       correct=String(q.answer!=null?q.answer:(q.value!=null?q.value:'')).trim(),tp=topic(q);
   if(window.TD_ANALYSIS){
     var a=window.TD_ANALYSIS.analyze(q,g,(window.TD_TEXT||{})[q.id]);
     return{title:a.title,detail:a.cause+' 改进方向：'+a.fix};
   }
   if(!g)return{title:'未作答 / 时间分配',detail:'本次没有留下答案。先识别题型与已知条件，再检查是否因耗时过长而跳过。'};
   if(q.type==='grid'){
     var a=num(g),b=num(q.value),c=correct;
     if(a===null||b===null)return{title:'作答格式或数值转换',detail:'你的填写是「'+g+'」。填空题应输入数值或分数，例如 12、3/4；检查是否混入文字或多余符号。'};
     if(Math.abs(a+b)<=Math.max(.0001,Math.abs(b)*.0001)&&Math.abs(a-b)>Math.max(.001,Math.abs(b)*.001))return{title:'符号判断错误',detail:'数值绝对值接近，但正负号相反。逐行检查移项、去括号和斜率方向。'};
     if(a&&b&&Math.abs(a-1/b)<=Math.max(.001,Math.abs(1/b)*.001))return{title:'倒数或比例关系混淆',detail:'你的数值接近正确答案的倒数。检查比例式交叉相乘、斜率公式或单位换算方向。'};
     if(b&&Math.abs(Math.abs(a/b)-2)<.02||a&&Math.abs(Math.abs(b/a)-2)<.02)return{title:'倍数关系错误',detail:'你的答案与正确答案约相差 2 倍。检查缩放、面积与边长、百分比或单位换算。'};
     if(b&&Math.abs(a-b)/Math.abs(b)<.08)return{title:'计算精度不足',detail:'数值接近但不满足判分精度。检查中间步骤舍入，最后一次再按题目要求处理小数。'};
     return{title:'计算或公式应用错误',detail:'你的数值与正确答案不一致。围绕「'+tp+'」重列公式，代入后逐步核算。'};
   }
   var gt=choiceText(q,g),ct=choiceText(q,correct),gn=num(gt),cn=num(ct);
   if(gn!==null&&cn!==null){
     if(Math.abs(gn+cn)<1e-8&&gn!==cn)return{title:'符号或方向判断错误',detail:'你选择的数值与正确选项符号相反。检查直线方向、移项和正负号。'};
     if(gn&&cn&&Math.abs(gn-1/cn)<1e-6)return{title:'倒数关系混淆',detail:'你选择的数值是正确选项的倒数。检查斜率、比率或单位换算的分子与分母。'};
   }
   return{title:'选项判断错误 · '+tp,detail:'你选择了 '+g+'，正确答案是 '+correct+'。错因集中在该知识点的条件转换或公式应用；重练时请写出每个条件对应的数学关系。'};
 }
 var REVIEW={1:'回顾等式变形、斜率截距与函数代入。',2:'回顾部分与总体、百分比、比例及单位。',3:'回顾函数结构、方程等价变形与图像关系。',4:'回顾几何公式、三角比、角度弧度和单位。'};
 function answerLabel(x,right){var q=x.q,v;
   /* 0 是合法 grid 答案：q.answer||'' 会把数字 0 吞成空串，正确答案变成「未作答」。 */
   if(right){var raw=q.answer==null?q.value:q.answer;v=raw==null?'':String(raw);}else v=x.given;
   if(!v)return'未作答';if(q.type==='mcq'){var t=choiceText(q,v);return v+(t?' · '+t:'');}return v;}
 function drillLink(q){
   if(window.TD_JY&&q&&q.origin==='jiangyi'){
     var i=window.TD_JY.questionsOf(q.board,q.section).findIndex(function(x){return x.id===q.id;});
     return 'jiangyi.html?b='+q.board+'&s='+encodeURIComponent(q.section)+'&i='+(i>=0?i+1:1);
   }
   for(var i=0;i<A.SECS.length;i++){var s=A.SECS[i],k=A.CATALOG[s].findIndex(function(x){return x.id===q.id;});
   if(k>=0)return A.secUrl(s,k+1);}return'drill.html';}
 var all=collect();
 document.getElementById('backPractice').href='drill.html';
 /* Unmatched imported items have no bank identity, so they can only live here
    (they are deliberately excluded from the quiz drawing pool). */
function bankFor(id){
  if(!id)return null;
  for(var s=0;s<A.SECS.length;s++){
    var hit=(A.CATALOG[A.SECS[s]]||[]).find(function(x){return x.id===id;});
    if(hit)return hit;
  }
  return null;
}
function importedGroupHtml(){
  if(activeUnit)return '';
  /* 导入仓库也是云端合并/旧版 JSON 的产物：items 里混进数字/字符串/数组时，
     只判 `it &&` 会把它们画成一张「题干暂缺」的幽灵导入卡，标题数量也会虚高。
     只认普通对象。 */
  var list=asArr(readImport().items).filter(function(it){return it&&typeof it==='object'&&!Array.isArray(it)&&(!it.matchId||isTrueFlag(it.readOnly));});
  if(!list.length)return '';
  var nRO=list.filter(function(it){return isTrueFlag(it.readOnly) && bankFor(plainText(it.matchId));}).length;
  return'<section class="wrong-unit" id="importedNewGroup"><h2>导入错题 · 独立记录<span>'+list.length+' 道 · 其中 '+nRO+' 道已匹配题库（只读）</span></h2>'+list.map(function(it,i){
    var impMatch=plainText(it.matchId),itemKey=plainText(it.key),bankQ=bankFor(impMatch),ro=isTrueFlag(it.readOnly)&&!!bankQ;
    var impStem=plainText(it.stem),impTopic=plainText(it.topic),impAnswer=plainText(it.answer),
        impValue=plainText(it.value),impType=plainText(it.type),impSource=plainText(it.source);
    var q=bankQ
      ?{id:bankQ.id,stem:plainText((T[bankQ.id]||{}).stem||bankQ.stem||it.stem),choices:plainChoices((T[bankQ.id]||{}).choices||bankQ.choices),
        type:bankQ.type,answer:bankQ.answer,value:bankQ.value,topic:plainText(bankQ.topic||it.topic),section:bankQ.section,unit:bankQ.unit,no:bankQ.no}
      :{id:'IMP-'+(itemKey||i),stem:impStem||'题干文字暂缺。',choices:plainChoices(it.choices),type:impType,answer:impAnswer,
        value:impValue,topic:impTopic,section:'导入',unit:0,no:'—'};
    var x={q:q,given:plainText(it.given),attempts:1,sources:['导入错题'],date:it.importedAt||0,corrected:false},a=analysis(x);
    return'<article class="wrong-card"><div class="wrong-card-head"><b>导入 · '+(impSource?esc(impSource):'第 '+(i+1)+' 道')+'</b><span>'+(ro?'已匹配题库 · 只读记录 · 未改动你的作答':'导入错题 · 仅错题本可见')+'</span></div>'+
      figHtml(q)+
      '<p class="wrong-stem">'+mathfmt(plainText(q.stem).trim()||'题干文字暂缺。')+'</p>'+
      '<div class="answer-compare"><div><span>你的答案</span><b class="your-answer">'+mathfmt(answerLabel(x,false))+'</b></div><div><span>正确答案</span><b>'+mathfmt(answerLabel(x,true))+'</b></div></div>'+
      '<div class="cause-box"><b>'+esc(a.title)+'</b><p>'+esc(a.detail)+'</p></div>'+
      '<div class="wrong-card-foot"><span>薄弱点：'+esc(topic(q))+'</span><span class="small muted">'+(ro?('该题已有作答记录（'+esc(impMatch)+'），按只增不改原则未写入'):'未在题库中找到对应题目，无法进入抽查抽题')+'</span></div></article>';
  }).join('')+'</section>';
}
 /* 统计卡（待订正 / 已订正 / 涉及单元 / 今日新增）按 Tim 的要求整块下线：
   错题本只保留清单本身，不要用四张数字卡凑版面。 */
 function renderHero(){
   /* 统计卡（待订正 / 已订正 / 涉及单元 / 今日新增）按 Tim 的要求整块下线：
      错题本只保留清单本身，不要用四张数字卡凑版面。 */
   var el=document.getElementById('wrongHero');
   if(el){ if(el.style) el.style.display='none'; el.innerHTML=''; }
 }
 function render(){
   renderHero();
   /* 全库 0 条错题：整页只留一句空状态，别拿四张 0 卡 + 筛选条 + 薄弱点凑版面 */
   var totallyEmpty=!all.length;
   ['overview','unitFilter','weakPanel','resultCount'].forEach(function(id){var e=document.getElementById(id);if(!e)return;
     /* hidden 属性会被 .wrong-overview{display:grid} 这类类规则压回可见，这里直接改 display */
     if(id==='unitFilter'){if(e.parentElement)e.parentElement.style.display=totallyEmpty?'none':'';}
     else if(e.style)e.style.display=totallyEmpty?'none':'';
   });
   var heroGrid=document.getElementById('wrongHero'); if(heroGrid&&heroGrid.style&&totallyEmpty)heroGrid.style.display='none';
   var rows=activeUnit?all.filter(function(x){return x.q.unit===activeUnit;}):all;
   var byTopic={};rows.forEach(function(x){if(x.corrected)return;var k=topic(x.q);byTopic[k]=(byTopic[k]||0)+1;});
   var weak=Object.keys(byTopic).map(function(k){return{k:k,n:byTopic[k]};}).sort(function(a,b){return b.n-a.n;});
   document.getElementById('overview').innerHTML=A.UNITS.map(function(u){var n=all.filter(function(x){return x.q.unit===u.id&&!x.corrected;}).length;
     return'<button class="unit-stat'+(activeUnit===u.id?' on':'')+'" data-unit="'+u.id+'"><span>UNIT '+u.id+'</span><b>'+n+'</b><small>'+esc(u.cn)+'</small></button>';}).join('');
   document.getElementById('unitFilter').innerHTML='<button class="filter-btn'+(!activeUnit?' on':'')+'" data-unit="0">全部错题</button>'+A.UNITS.map(function(u){return'<button class="filter-btn'+(activeUnit===u.id?' on':'')+'" data-unit="'+u.id+'">UNIT '+u.id+'</button>';}).join('');
   document.getElementById('resultCount').textContent='显示 '+rows.length+' 道 · 含历史错题与已订正记录';
   document.getElementById('weakPanel').innerHTML=weak.length?'<div><h2>优先补强</h2><p>'+weak.slice(0,3).map(function(w,i){return'<span class="weak-topic"><b>'+(i+1)+'</b> '+esc(w.k)+' · '+w.n+' 道错题</span>';}).join('')+'</p><small>'+esc(REVIEW[activeUnit||weak.length&&rows.find(function(x){return topic(x.q)===weak[0].k;}).q.unit]||REVIEW[1])+'</small></div>':'<div><h2>薄弱点</h2><p class="muted">当前范围没有待订正错题。</p></div>';
   var importedHtml=importedGroupHtml();
   if(!rows.length){document.getElementById('wrongList').innerHTML='<div class="empty-panel"><svg class="empty-art" width="112" height="96" viewBox="0 0 112 96" fill="none" aria-hidden="true"><rect x="30" y="10" width="52" height="66" rx="11" fill="#f4f9ff" stroke="#cfe0f8" stroke-width="1.5"/><path d="M42 30h28M42 41h28M42 52h17" stroke="#dde9f9" stroke-width="1.6"/><circle cx="78" cy="68" r="17" fill="#eaf2ff" stroke="#cfe0f8" stroke-width="1.5"/><path d="m71 68 4.6 4.6L85 63" stroke="#4d84ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><h2>'+(all.length?'该单元暂无错题记录':(importedHtml?'题库暂无错题，仅显示导入错题':'还没有错题记录'))+'</h2><p>完成真题练习、单元抽查或模考后，错题会自动汇总到这里。</p><a class="btn primary" href="drill.html">开始真题练习</a></div>'+importedHtml;return;}
   var html='';A.UNITS.forEach(function(u){var list=rows.filter(function(x){return x.q.unit===u.id;});if(!list.length)return;
     html+='<section class="wrong-unit"><h2>UNIT '+u.id+' · '+esc(u.cn)+'<span>'+list.length+' 道</span></h2>'+list.map(function(x){var q=x.q,a=analysis(x),sec=q.section||'L'+q.unit;
       return'<article class="wrong-card'+(x.corrected?' corrected':'')+'"><div class="wrong-card-head"><b>'+esc((q.origin==='jiangyi'&&window.TD_JY)?window.TD_JY.sourceLabel(q):(sec+' · 第 '+(q.no||'—')+' 题'))+'</b><span>'+esc(x.sources.join(' / '))+(x.attempts>1?' · '+x.attempts+' 次记录':'')+(x.corrected?' · 已在练习中订正':'')+'</span></div>'+
       figHtml(q)+
       '<p class="wrong-stem">'+mathfmt(plainText((T[q.id]||{}).stem||q.stem||'题干文字暂缺。').trim())+'</p>'+
       '<div class="answer-compare"><div><span>你的答案</span><b class="your-answer">'+mathfmt(answerLabel(x,false))+'</b></div><div><span>正确答案</span><b>'+mathfmt(answerLabel(x,true))+'</b></div></div>'+
       '<div class="cause-box"><b>'+esc(a.title)+'</b><p>'+esc(a.detail)+'</p></div>'+
       '<div class="wrong-card-foot"><span>薄弱点：'+esc(topic(q))+'</span><a class="btn sm" href="'+drillLink(q)+'">回到本题重练</a></div></article>';}).join('')+'</section>';});
   document.getElementById('wrongList').innerHTML=html+importedHtml;
 }
 window.TD_IMPORT_WRONG={importData:importData,importText:function(t){return importData(JSON.parse(t));},
  read:readImport,feedback:feedback,
  refresh:function(){all=collect();render();}};
 document.addEventListener('click',function(e){var b=e.target.closest('[data-unit]');if(!b)return;
   activeUnit=+b.dataset.unit;var p=activeUnit?'?unit='+activeUnit:'';history.replaceState(null,'','wrong.html'+p);render();});
 render();
 /* 慢网兜底：defer 链很长，首屏可能读完题库前就渲染，错题本会先呈现空白。
    load 之后再自检一次，空了就重算一遍，避免学生以为错题被清空。 */
 window.addEventListener('load',function(){
   setTimeout(function(){
     if(!all.length){ all=collect(); if(all.length) render(); }
   },600);
 });
})();
