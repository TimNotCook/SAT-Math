/* TD SAT Math · 模考记录页（history.html）
   ------------------------------------------------------------------
   只读渲染 tdsat_exam_suite_results_v1（已交卷成绩，模考 / 单元抽查 /
   讲义共用一个仓库）与 tdsat_exam_suite_abandoned_v1（未做完存档）。
   不写任何考试状态；「继续这卷」只是跳回 exam.html 让其自身的
   restoreOrIntro 恢复会话。模考答题 / 结果页 UI 一律不动。 */
(function () {
  'use strict';
  var RESULTS = 'tdsat_exam_suite_results_v1';
  var ABANDONED = 'tdsat_exam_suite_abandoned_v1';
  var SESSION = 'tdsat_exam_suite_session_v1';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  var BANK = (window.TD_BANK && window.TD_BANK.questions) || [];
  /* 讲义成绩记录存的是 JY1-… 题号，不在 TD_BANK；记录页原来 byId 查不到，
     旧讲义错题行只能印「正确 —」。横向补一份讲义题库（history.html 已加载
     data/jiangyi.js），不动 TD_BANK 本身。 */
  var JY_BANK = window.JY_BANK || [];
  function byId(id) {
    return BANK.find(function (q) { return q.id === id; })
      || JY_BANK.find(function (q) { return q.id === id; }) || null;
  }

  /* 数据指纹：只比长度会漏掉「同条数但内容被云端覆盖」的情况（长度一样、分数变了）。
     整串滚 hash，O(n) 但返回定长，几 KB 的档案每 1.5s 算一次毫无压力。 */
  function fp() {
    var raw = String(localStorage.getItem(RESULTS) || '') + '\u0001' +
              String(localStorage.getItem(ABANDONED) || '');
    var h = 0;
    for (var i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) | 0;
    return raw.length + ':' + h;
  }

  /* 只认数组：这两条键被写成对象（旧版/云端覆盖）时，后面 .filter/.sort 会抛错，
     整个记录页停在占位、永不重画。宁可当空列表也不让页面炸。 */
  /* 成绩记录里的 detail 可能是对象/字符串（云端旧结构、手工导入）：只认数组。 */
  function asArr(v) { return Array.isArray(v) ? v : []; }
  /* 成绩记录是云端合并/旧版本/手工导入的产物：report、estimate 可能是字符串或
     缺字段，里面再嵌一个错误类型就能把整页打崩（第 25 条）。 */
  function asObj(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
  /* 记录也可能被云端旧结构/手工导入写成对象：对象直接当空，别把
     [object Object] 端到页面；数字字段统一过 num，坏值显示「—」。 */
  function txt(v) {
    /* 布尔不是文案：旧记录把 given/mode 写成 true/false 时，直接 String 会
       渲染成「你的答案 true」。布尔按空值处理。 */
    return v == null || typeof v === 'object' || typeof v === 'function' || typeof v === 'boolean' ? '' : String(v);
  }
  /* detail.correct 可能是布尔、1/0、'true'/'false'（云端旧结构）。只认明确的
     真值，否则 'false' 会被当成答对，整条错题行从记录里消失。 */
  function isRight(v) { return v === true || v === 1 || v === 'true' || v === '1'; }
  function num(v) {
    /* 布尔不是数字：true 会被 Number 成 1，旧记录里 total/correct/elapsed 是布尔时
       会算出假的 100% 或 1 分钟。日期除外，fmtDate 已单独挡 true/false。 */
    if (v == null || typeof v === 'object' || typeof v === 'function' || typeof v === 'boolean') return null;
    var n = Number(v); return isFinite(n) ? n : null;
  }
  function numTxt(v) { var n = num(v); return n == null ? '—' : n; }
  function load(k) {
    try { var v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function readSession() { try { return JSON.parse(localStorage.getItem(SESSION)) || null; } catch (e) { return null; } }
  function fmtDate(t) {
    /* 云端/旧版可能把 Date.now() 存成字符串 '1700...'：new Date('1700...')
       在浏览器里是 Invalid Date，整条记录的时间会显示成「—」。数字字符串
       先转时间戳，ISO 字符串仍交给 Date 自己解析。 */
    /* null / 0 / false 会被 new Date() 当成 1970-01-01，记录页就会出现
       「1970 年交卷」的假时间；缺时间一律显示「—」。 */
    if (t == null || t === '' || t === false || t === true) return '—';
    var n = num(t);
    if (n != null) return n > 0 ? new Date(n).toLocaleString('zh-CN', { hour12: false }) : '—';
    var d = new Date(t);
    return isNaN(d.getTime()) ? '—' : d.toLocaleString('zh-CN', { hour12: false });
  }
  function fmtDur(sec) {
    var n = num(sec);
    if (n == null || n < 0) return '—';
    var m = Math.floor(n / 60);
    return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min';
  }
  var MODE_NAME = { mock: '模考', quiz: '单元抽查', jiangyi: '讲义' };

  /* 分数越高越绿、越低越红、中间橙；未做完灰。
     模考用 200–800 分：≥700 绿、≥550 橙、其余红。
     抽查 / 讲义没有换算分，用正确率同阈值（≥85% / ≥60%）。 */
  function grade(rec) {
    if (abandonedRecord(rec)) return 'void';
    var est = asObj(rec.estimate), scaled = num(est.scaled);
    if (txt(rec.mode) === 'mock' && scaled != null) {
      return scaled >= 700 ? 'good' : scaled >= 550 ? 'mid' : 'bad';
    }
    var total = num(rec.total), correct = num(rec.correct);
    var pct = total ? (correct || 0) / total : 0;
    return pct >= 0.85 ? 'good' : pct >= 0.6 ? 'mid' : 'bad';
  }
  function scoreLabel(rec) {
    if (abandonedRecord(rec)) return '未做完';
    var est = asObj(rec.estimate), scaled = num(est.scaled), total = num(rec.total), correct = num(rec.correct);
    if (txt(rec.mode) === 'mock' && scaled != null) return scaled + ' / 800';
    return Math.round(total ? (correct || 0) / total * 100 : 0) + '%';
  }
  function titleOf(rec) {
    var mode = txt(rec.mode), board = txt(rec.board), section = txt(rec.section), total = num(rec.total);
    /* 抽查未做完档案只写 unitId（archiveAbandoned），旧记录写 unit：
       只读 unit 会让标题永远只剩「单元抽查」，看不出是哪个单元。 */
    var unit = txt(rec.unit) || txt(rec.unitId);
    if (mode === 'jiangyi') return '讲义复习' + (board ? ' · ' + board : '') + (section ? ' · ' + section : '');
    if (mode === 'quiz') return '单元抽查' + (unit ? ' · U' + unit : '');
    /* 未交卷的模考只发到第一模块（22 题），写「全卷 22 题」会误导成整卷只有 22 题。 */
    if (abandonedRecord(rec)) return '官方模考 · 未交卷';
    return '官方模考 · 全卷 ' + (total == null ? 44 : total) + ' 题';
  }

  function isDetail(d) { return !!d && typeof d === 'object' && !Array.isArray(d); }
  function wrongRows(detail) {
    /* detail 条目也可能是 5 / 'junk'（云端合并、半截导入）：truthy 但不是对象，
       只判 `d && !isRight` 会把它渲染成一条 id/答案全是「—」的幽灵错题行。 */
    var wrong = asArr(detail).filter(function (d) { return isDetail(d) && !isRight(d.correct); });
    if (!wrong.length) return '<div class="hist-empty">本次全部答对。</div>';
    return '<div class="hist-wrong">' + wrong.map(function (d) {
      var did = txt(d.id) || '—', q = byId(did) || {};
      var stem = (txt(q.stem) || txt(d.topic) || did).replace(/\s+/g, ' ').trim().slice(0, 90);
      /* 37 道填空（SP2 系列）只有 value 没有 answer：存档里 answer 为 null 时
         旧版记录页会印「正确 —」，等于把正确答案吞掉。按 answer → value →
         q.value → q.values 逐级兜底，历史记录也能补出正确答案。 */
      var corr = txt(d.answer) || txt(d.value);
      /* 旧讲义 detail 没有 answer，且讲义题不在 TD_BANK：按题号回查题库
         （含 JY_BANK）补正确答案，MCQ 和 grid 都要补。 */
      if (!corr && q) corr = txt(q.answer) ||
        (q.type === 'grid' ? (txt(q.value) || (Array.isArray(q.values) ? q.values.join(', ') : '')) : '');
      var ans = '你的答案 <b>' + esc(txt(d.given) || '—') + '</b> · 正确 <i>' + esc(corr || '—') + '</i>';
      return '<div class="hist-wrong-row"><span class="hist-wrong-id">' + esc(did) + '</span>' +
        '<span class="hist-wrong-stem" title="' + esc(stem) + '">' + esc(stem) + '</span>' +
        '<span class="hist-wrong-ans">' + ans + '</span></div>';
    }).join('') + '</div>';
  }
  function prioRows(report) {
    var prio = asArr(asObj(report).priority).filter(isDetail);
    if (!prio.length) return '<div class="hist-empty">暂无补强建议。</div>';
    return '<div class="hist-prio">' + prio.slice(0, 5).map(function (p) {
      var ids = asArr(p && p.wrongIds).map(txt).filter(Boolean);
      return '<div class="hist-prio-row"><b>' + esc(txt(p.name) || '—') + '</b>' +
        '<small>' + esc(txt(p.reason)) + (txt(p.action) ? ' → ' + esc(txt(p.action)) : '') +
        (ids.length ? '（错题：' + esc(ids.join('、')) + '）' : '') + '</small></div>';
    }).join('') + '</div>';
  }

  function sameStamp(a, b) {
    var x = num(a), y = num(b);
    return x != null && y != null && x === y;
  }
  /* 旧存档/云端合并可能把布尔写成字符串：'false' 是 truthy，会把未交卷的卷
     误判成已出分；'true' 又会让还能继续的卷显示「存档已失效」。 */
  function finishedFlag(v) { return v === true || v === 'true' || v === 1 || v === '1'; }
  function unfinishedFlag(v) { return v === false || v === 'false' || v === 0 || v === '0'; }
  /* 作废/中断档案用 void:true 标记，且旧版 salvage 记录根本没写 finished。
     只判 finished===false 会把它当正式成绩：答对 0/22、整卷 22 题全进错题，
     还把「继续这卷」藏掉。void 一律按未做完处理。 */
  function voidFlag(rec) { return !!rec && (rec.void === true || rec.void === 'true' || rec.void === 1 || rec.void === '1'); }
  function abandonedRecord(rec) { return voidFlag(rec) || unfinishedFlag(rec && rec.finished); }
  function abandonedBody(rec) {
    var sess = readSession();
    /* startedAt 在旧版/云端合并里可能是字符串；严格 === 会把同一张还能做的卷
       误报成「存档已失效」。按有限数字比较，类型不一致也认。 */
    var resumable = !!(sess && sameStamp(rec.startedAt, sess.startedAt) && !finishedFlag(sess.finished) &&
      txt(rec.mode) === txt(sess.mode));
    /* 抽查存档按 unit 隔离：链接不带 unit 会落到默认 U1，exam.js 再把
       原 Unit 的存档判成「unit 不匹配」并作废。优先用当前会话的 unit，
       老档案没有 unitId 时退回记录里的。 */
    var resumeUnit = num(sess && sess.unitId);
    if (resumeUnit == null) resumeUnit = num(rec.unitId);
    var resumeHref = 'exam.html?mode=' + esc(txt(rec.mode));
    if (txt(rec.mode) === 'quiz' && resumeUnit != null) resumeHref += '&unit=' + resumeUnit;
    var html = '<div class="hist-kv"><span>状态 <b>未做完</b></span>' +
      '<span>已答 <b>' + numTxt(rec.answered == null ? 0 : rec.answered) + ' / ' + numTxt(rec.total) + '</b></span>' +
      '<span>中断时间 <b>' + fmtDate(rec.date) + '</b></span></div>';
    if (resumable) {
      html += '<div class="hist-continue"><a class="btn primary" href="' + resumeHref + '">继续这卷</a></div>';
    } else {
      html += '<div class="hist-continue" style="color:var(--sub);font-size:12.5px">存档已失效（会话已被覆盖），仅供查看。</div>';
    }
    return html;
  }

  function resultBody(rec) {
    var html = '<div class="hist-kv">' +
      '<span>交卷时间 <b>' + fmtDate(rec.date) + '</b></span>' +
      '<span>答对 <b>' + numTxt(rec.correct == null ? 0 : rec.correct) + ' / ' + numTxt(rec.total == null ? 0 : rec.total) + '</b></span>' +
      '<span>用时 <b>' + fmtDur(rec.elapsed) + '</b></span>' +
      (txt(rec.mode) === 'mock' && Object.keys(asObj(rec.estimate)).length ? '<span>原始分 <b>' + esc(numTxt(asObj(rec.estimate).raw)) + ' / ' + esc(numTxt(asObj(rec.estimate).rawMax)) + '</b></span>' +
        '<span>自适应路径 <b>' + (txt(asObj(rec.estimate).path) === 'easy' ? 'easier' : 'harder') + '</b></span>' : '') +
      '</div>';
    html += '<div class="hist-sec">错题（' + (asArr(rec.detail).filter(function (d) { return isDetail(d) && !isRight(d.correct); })).length + '）</div>' + wrongRows(rec.detail);
    html += '<div class="hist-sec">应该补哪块</div>' + prioRows(rec.report);
    return html;
  }

  function rowHtml(rec, idx) {
    var g = grade(rec);
    var unfinished = abandonedRecord(rec);
    var head = '<button type="button" class="hist-bar-head" aria-expanded="false" data-idx="' + idx + '">' +
      '<span class="hist-dot ' + g + '" aria-hidden="true"></span>' +
      '<span class="hist-title">' + esc(titleOf(rec)) +
      '<small>' + fmtDate(rec.date) + ' · ' + (MODE_NAME[txt(rec.mode)] || txt(rec.mode) || '记录') + '</small></span>' +
      '<span class="hist-score ' + g + '">' + esc(scoreLabel(rec)) + '</span>' +
      '<svg class="hist-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>' +
      '</button>';
    var body = unfinished ? abandonedBody(rec) : resultBody(rec);
    return '<section class="hist-bar' + (idx === 0 ? ' open' : '') + '">' + head +
      '<div class="hist-body">' + body + '</div></section>';
  }

  function render() {
    var box = $('histList');
    if (!box) return;   /* 极端时序下 DOM 还没就绪，别抛错让页面停在占位 */
    var sig = fp();
    if (box.getAttribute('data-sig') === sig) return;   /* 数据没变就别重建，保住展开状态 */
    box.setAttribute('data-sig', sig);
    /* 两组各自按时间倒序：存档存进去的顺序不一定是时间序，别用 reverse 赌 */
    var byDateDesc = function (a, b) { return (num(b.date) || 0) - (num(a.date) || 0); };
    /* 数组里可能混进数字/字符串（云端合并、手工导入）：它们是 truthy，
       只判 `r && !r.void` 会被渲染成一条日期/分数全是「—」的幽灵记录。
       只认普通对象，数组记录也丢掉。 */
    var isRec = function (r) { return !!r && typeof r === 'object' && !Array.isArray(r); };
    var rawResults = (load(RESULTS) || []).filter(isRec);
    var results = rawResults.filter(function (r) { return !voidFlag(r); }).sort(byDateDesc);
    /* 作废前留档（exam.js salvageSession）写进 RESULTS 并打 void:true。
       只把它们从成绩列表过滤会变成「存了但永远看不到」；它们不是成绩，
       但应该按未做完记录显示，否则学生以为那一卷被静默清零。 */
    var salvaged = rawResults.filter(voidFlag);
    var abandoned = (load(ABANDONED) || []).filter(function (r) { return isRec(r) && unfinishedFlag(r.finished); })
      .concat(salvaged).sort(byDateDesc);
    if (!results.length && !abandoned.length) {
      box.innerHTML = '<div class="hist-empty"><svg class="empty-art" width="112" height="96" viewBox="0 0 112 96" fill="none" aria-hidden="true"><rect x="30" y="10" width="52" height="66" rx="11" fill="#f4f9ff" stroke="#cfe0f8" stroke-width="1.5"/><path d="M42 30h28M42 41h28M42 52h17" stroke="#dde9f9" stroke-width="1.6"/><circle cx="78" cy="68" r="17" fill="#eaf2ff" stroke="#cfe0f8" stroke-width="1.5"/><path d="m71 68 4.6 4.6L85 63" stroke="#4d84ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '<div class="he-t">还没有模考或抽查记录</div>' +
        '<p class="he-d">做完一次模考或抽查，交卷后成绩、错题和补强报告都会出现在这里。</p>' +
        '<a class="btn primary" href="exam.html?mode=mock">去做一次模考</a>' +
        '</div>';
      return;
    }
    /* 未做完的排在最上面，之后按时间倒序混排已交卷记录 */
    var items = abandoned.concat(results);
    box.innerHTML = items.map(rowHtml).join('');
    box.querySelectorAll('.hist-bar-head').forEach(function (head) {
      head.addEventListener('click', function () {
        var bar = head.parentElement;
        var open = bar.classList.toggle('open');
        head.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }
  /* 三路启动：defer 执行时 DOM 通常已就绪，直接渲染；万一 readyState 判断
     或时序意外，DOMContentLoaded / load 再各兜一次（render 自带指纹去重）。 */
  render();
  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('load', render);

  /* 云账号模块（cloud-account.js）登录后会把云端档案合并写回 localStorage，
     但那发生在本次脚本之后；轮询比对数据指纹（整串 hash，不是长度），一旦落地就重渲染一次，
     否则新设备打开本页会一直显示空白。60s 后停表，不长期占资源。 */
  (function watchCloudMerge() {
    var last = '';
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      var now = fp();
      if (now !== last) { last = now; render(); }
      if (tries >= 40) clearInterval(timer);
    }, 1500);
  })();
})();
