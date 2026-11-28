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
    /* Safari 无痕/禁用站点数据时，localStorage.getItem 本身会抛 SecurityError。
       这里没包 try 的话，render() 第一行就崩，记录页永远停在占位；
       load() 已有降级，指纹读不到就返回稳定空指纹，让页面照常画空态。 */
    try {
      var raw = String(localStorage.getItem(RESULTS) || '') + '\u0001' +
                String(localStorage.getItem(ABANDONED) || '');
      var h = 0;
      for (var i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) | 0;
      return raw.length + ':' + h;
    } catch (e) { return '0:0'; }
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
  /* 旧版/云端/手工导入可能把模式写成 'MOCK'/'Mock'/'QUIZ'：所有标题、44/30
     封顶、补强报告分支都按小写比较，大小写不一致会让整卷重新印成 999 题。 */
  function modeOf(rec) { return txt(rec && rec.mode).trim().toLowerCase(); }

  /* 英文界面：题库里的出处前缀是硬编码中文（「讲义 p7 #1」），
     记录页回放时不能原样摆出来；只换前缀名词，题号照旧。 */
  function isEn() { try { return !!(window.TDI18n && window.TDI18n.get && window.TDI18n.get() === 'en'); } catch (e) { return false; } }
  function enSource(v) {
    return String(v == null ? '' : v)
      .replace(/^讲义\s*/, 'Lecture ').replace(/^练习册\s*/, 'Book ')
      .replace(/^真题练习\s*/, 'Practice ').replace(/^真题\s*/, 'Real test ')
      .replace(/^模考\s*/, 'Mock ').replace(/\s*第\s*(\d+)\s*题/g, ' #$1');
  }
  /* detail.correct 可能是布尔、1/0、'true'/'false'（云端旧结构）。只认明确的
     真值，否则 'false' 会被当成答对，整条错题行从记录里消失。 */
  /* 云端/手工导入有时把布尔写成 'True'/'FALSE'（Python 风格）：严格小写比较会把
     答对的题当成错题、把未交卷当成已出分。字符串标志先去空白再小写。 */
  function flagKey(v) { return typeof v === 'string' ? v.trim().toLowerCase() : v; }
  function isRight(v) { v = flagKey(v); return v === true || v === 1 || v === 'true' || v === '1'; }
  function num(v) {
    /* 布尔不是数字：true 会被 Number 成 1，旧记录里 total/correct/elapsed 是布尔时
       会算出假的 100% 或 1 分钟。日期除外，fmtDate 已单独挡 true/false。 */
    if (v == null || typeof v === 'object' || typeof v === 'function' || typeof v === 'boolean') return null;
    /* '' 不是 0：旧记录 total/correct='' 时会被算成 0 分，逐题明细明明有作答。 */
    if (typeof v === 'string' && !v.trim()) return null;
    var n = Number(v); return isFinite(n) ? n : null;
  }
  /* 题数/答对数只能是整数：云端/旧版写成 22.5 时，记录页会印出
     「10 / 22.5 题」。小数当坏值，交给逐题明细兜底，不硬取整。 */
  function countNum(v) { var n = num(v); return n != null && n >= 0 && Math.floor(n) === n ? n : null; }
  /* 原始分/换算分也是整数：旧记录写 3.7 时不能印「原始分 3.7 / 44」。 */
  function intNum(v) { var n = num(v); return n != null && Math.floor(n) === n ? n : null; }
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
    /* 数组的 toString 是空串，new Date([]) 会变成 1970-01-01；云端合并/旧版
       把日期写成 []/对象时，记录页会出现「1970 年交卷」的假时间。 */
    if (typeof t === 'object' && !(t instanceof Date)) return '—';
    var n = num(t);
    if (n != null) return n > 0 ? new Date(n).toLocaleString('zh-CN', { hour12: false }) : '—';
    var d = new Date(t);
    return isNaN(d.getTime()) ? '—' : d.toLocaleString('zh-CN', { hour12: false });
  }
  function fmtDur(sec) {
    var n = num(sec);
    if (n == null || n < 0) return '—';
    /* 不到一分钟要按秒显示：整分钟取整会把 17 秒写成「0 min」，
       看起来像没计时。 */
    if (n < 60) return Math.round(n) + ' 秒';
    var m = Math.floor(n / 60);
    return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min';
  }
  var MODE_NAME = { mock: '模考', quiz: '单元抽查', jiangyi: '讲义' };

  /* 旧版/云端合并的记录可能只存 detail，没写 total/correct（或写成 null）：
     旧实现一律按 0 算，成绩条显示 0%，但展开的错题行却是对的。
     能从 detail 数出来就现算，缺字段不再把真实正确率吞成 0。 */
  function scoreParts(rec) {
    var detail = asArr(rec && rec.detail).filter(isDetail);
    var total = countNum(rec && rec.total);
    /* detail 是逐题证据：记录写 total 比 detail 还少，说明 total 被旧版/云端写坏了，
       以 detail 条数为准，别显示「答对 20 / 2」这种不可能的分数。 */
    if (detail.length && (total == null || total <= 0 || total < detail.length)) total = detail.length;
    if (total == null || total <= 0) total = detail.length;
    /* 官方模考整卷只有 44 题：旧版/云端把 total 写成 999 时，记录条会印
       「官方模考 · 全卷 999 题」，正确率也被 999 的分母稀释成个位数。
       有逐题明细时已按明细兜底；没有明细也不能信任超过 44 的题数。 */
    var mode = modeOf(rec);
    if (mode === 'mock' && total > 44) total = 44;
    /* 单元抽查的卷长上限是 30（QUIZ_TIERS T3/T4）。云端/旧版把 total 写成 999 时，
       记录页会印「答对 0 / 999」；有逐题明细就按明细条数，没明细按 30 封顶。 */
    if (mode === 'quiz' && total > 30) total = detail.length ? Math.min(30, detail.length) : 30;
    var counted = detail.length ? detail.filter(function (d) { return isRight(d.correct); }).length : null;
    var correct = countNum(rec && rec.correct);
    /* correct 缺失、负数或大于 total 都是坏值：有逐题明细就按明细数，没有就夹到 0..total。
       否则记录页会显示 150% 这种不可能的成绩，还把它标成绿色。 */
    if (correct == null || correct < 0 || correct > total) {
      correct = counted != null ? counted : (correct == null ? 0 : Math.max(0, Math.min(total, correct)));
    }
    return { total: total, correct: correct };
  }

  /* 分数越高越绿、越低越红、中间橙；未做完灰。
     模考用 200–800 分：≥700 绿、≥550 橙、其余红。
     抽查 / 讲义没有换算分，用正确率同阈值（≥85% / ≥60%）。 */
  /* 官方模考换算分只有 200–800。云端/旧版写进 0、999、字符串时照单全收会
     显示「999 / 800」还标绿；超出范围就当没有 estimate，退回正确率。 */
  function scaledOf(rec) {
    var n = intNum(asObj(rec && rec.estimate).scaled);
    return n != null && n >= 200 && n <= 800 ? n : null;
  }
  function grade(rec) {
    if (abandonedRecord(rec)) return 'void';
    var scaled = scaledOf(rec);
    if (modeOf(rec) === 'mock' && scaled != null) {
      return scaled >= 700 ? 'good' : scaled >= 550 ? 'mid' : 'bad';
    }
    var sc = scoreParts(rec), total = sc.total, correct = sc.correct;
    var pct = total ? correct / total : 0;
    return pct >= 0.85 ? 'good' : pct >= 0.6 ? 'mid' : 'bad';
  }
  function scoreLabel(rec) {
    if (abandonedRecord(rec)) return '未做完';
    var scaled = scaledOf(rec);
    if (modeOf(rec) === 'mock' && scaled != null) return scaled + ' / 800';
    var sc = scoreParts(rec);
    return Math.round(sc.total ? sc.correct / sc.total * 100 : 0) + '%';
  }
  function titleOf(rec) {
    var mode = modeOf(rec), board = txt(rec.board), section = txt(rec.section), total = scoreParts(rec).total;
    /* 抽查未做完档案只写 unitId（archiveAbandoned），旧记录写 unit：
       只读 unit 会让标题永远只剩「单元抽查」，看不出是哪个单元。 */
    var unit = txt(rec.unit) || txt(rec.unitId);
    if (mode === 'jiangyi') return '讲义复习' + (board ? ' · ' + board : '') + (section ? ' · ' + section : '');
    if (mode === 'quiz') return '单元抽查' + (unit ? ' · U' + unit : '');
    /* 未交卷的模考只发到第一模块（22 题），写「全卷 22 题」会误导成整卷只有 22 题。 */
    if (abandonedRecord(rec)) return '官方模考 · 未交卷';
    /* scoreParts 永远返回数字，原来的 `total == null` 兜底是死代码：云端只存
       estimate/report、没有 total/detail 的模考记录会写成「全卷 0 题」。
       官方模考整卷固定 44 题，缺证据时按 44 显示。 */
    return '官方模考 · 全卷 ' + (total > 0 ? total : 44) + ' 题';
  }

  /* 副标题只补标题没说的信息：标题里已经有「单元抽查」「官方模考」「讲义」，
     再拼一遍模式名就成了「单元抽查 · 单元抽查」「官方模考 · 模考」。
     日期始终保留；模式名只在标题没提到时才追加。 */
  function subtitleOf(rec) {
    var date = fmtDate(rec.date);
    var modeTxt = MODE_NAME[modeOf(rec)] || txt(rec.mode) || '记录';
    return titleOf(rec).indexOf(modeTxt) >= 0 ? date : date + ' · ' + modeTxt;
  }

  function isDetail(d) { return !!d && typeof d === 'object' && !Array.isArray(d); }
  function wrongRows(detail) {
    /* detail 条目也可能是 5 / 'junk'（云端合并、半截导入）：truthy 但不是对象，
       只判 `d && !isRight` 会把它渲染成一条 id/答案全是「—」的幽灵错题行。 */
    var wrong = asArr(detail).filter(function (d) { return isDetail(d) && !isRight(d.correct); });
    if (!wrong.length) return '<div class="hist-empty">本次全部答对。</div>';
    return '<div class="hist-wrong">' + wrong.map(function (d) {
      var did = txt(d.id) || '—', q = byId(did) || {};
      var stemRaw = (txt(q.stem) || txt(d.topic) || did).replace(/\s+/g, ' ').trim();
      var stem = (isEn() ? enSource(stemRaw) : stemRaw).slice(0, 90);
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
        (ids.length ? (isEn() ? ' (missed: ' + esc(ids.join(', ')) + ')' : '（错题：' + esc(ids.join('、')) + '）') : '') + '</small></div>';
    }).join('') + '</div>';
  }

  function sameStamp(a, b) {
    var x = num(a), y = num(b);
    return x != null && y != null && x === y;
  }
  /* 旧存档/云端合并可能把布尔写成字符串：'false' 是 truthy，会把未交卷的卷
     误判成已出分；'true' 又会让还能继续的卷显示「存档已失效」。 */
  function finishedFlag(v) { v = flagKey(v); return v === true || v === 'true' || v === 1 || v === '1'; }
  function unfinishedFlag(v) { v = flagKey(v); return v === false || v === 'false' || v === 0 || v === '0'; }
  /* 作废/中断档案用 void:true 标记，且旧版 salvage 记录根本没写 finished。
     只判 finished===false 会把它当正式成绩：答对 0/22、整卷 22 题全进错题，
     还把「继续这卷」藏掉。void 一律按未做完处理。 */
  function voidFlag(rec) {
    if (!rec) return false;
    var v = flagKey(rec.void);
    return v === true || v === 'true' || v === 1 || v === '1';
  }
  function abandonedRecord(rec) { return voidFlag(rec) || unfinishedFlag(rec && rec.finished); }
  function abandonedBody(rec) {
    var sess = readSession();
    /* startedAt 在旧版/云端合并里可能是字符串；严格 === 会把同一张还能做的卷
       误报成「存档已失效」。按有限数字比较，类型不一致也认。 */
    var resumable = !!(sess && sameStamp(rec.startedAt, sess.startedAt) && !finishedFlag(sess.finished) &&
      modeOf(rec) === modeOf(sess));
    /* 抽查存档按 unit 隔离：链接不带 unit 会落到默认 U1，exam.js 再把
       原 Unit 的存档判成「unit 不匹配」并作废。优先用当前会话的 unit，
       老档案没有 unitId 时退回记录里的。 */
    var resumeUnit = num(sess && sess.unitId);
    if (resumeUnit == null) resumeUnit = num(rec.unitId);
    var resumeHref = 'exam.html?mode=' + esc(modeOf(rec));
    if (modeOf(rec) === 'quiz' && resumeUnit != null) resumeHref += '&unit=' + resumeUnit;
    /* 未做完档案的题数也可能被云端写成 22.5 / 999：走 scoreParts 的整数与
       模考封顶口径，已答数夹在 0..总题数，别印「5 / 22.5」。 */
    var sc = scoreParts(rec);
    var answeredRaw = num(rec.answered);
    var answeredN = answeredRaw == null ? 0 : Math.max(0, Math.floor(answeredRaw));
    if (sc.total > 0) answeredN = Math.min(answeredN, sc.total);
    var html = '<div class="hist-kv"><span>状态 <b>未做完</b></span>' +
      '<span>已答 <b>' + numTxt(answeredN) + ' / ' + numTxt(sc.total) + '</b></span>' +
      '<span>中断时间 <b>' + fmtDate(rec.date) + '</b></span></div>';
    if (resumable) {
      html += '<div class="hist-continue"><a class="btn primary" href="' + resumeHref + '">继续这卷</a></div>';
    } else {
      html += '<div class="hist-continue" style="color:var(--sub);font-size:12.5px">存档已失效（会话已被覆盖），仅供查看。</div>';
    }
    return html;
  }

  /* 原始分只可能是 0–44（SCALE/estimateScore 都按 44 题折算）。旧记录
     乱写 999 时，记录页会显示「原始分 999 / 44」这种不可能的分。 */
  function rawParts(rec) {
    var n = intNum(asObj(rec && rec.estimate).raw);
    return { raw: n == null ? null : Math.max(0, Math.min(44, n)), max: 44 };
  }

  function resultBody(rec) {
    var html = '<div class="hist-kv">' +
      '<span>交卷时间 <b>' + fmtDate(rec.date) + '</b></span>' +
      '<span>答对 <b>' + numTxt(scoreParts(rec).correct) + ' / ' + numTxt(scoreParts(rec).total) + '</b></span>' +
      /* 讲义复习没有计时（elapsed 恒为 0），印「用时 0 秒」像没跑起来。 */
      (modeOf(rec) === 'jiangyi' ? '' : '<span>用时 <b>' + fmtDur(rec.elapsed) + '</b></span>') +
      (modeOf(rec) === 'mock' && Object.keys(asObj(rec.estimate)).length ? (function(){var rp=rawParts(rec);return '<span>原始分 <b>' + esc(numTxt(rp.raw)) + ' / ' + rp.max + '</b></span>';})() +
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
      '<small>' + esc(subtitleOf(rec)) + '</small></span>' +
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
    var sess = readSession();
    /* 交卷时 clearAbandoned 写盘失败，或旧版留下大写 mode 的档案：当前会话
       已经 finished 且 startedAt 对得上，这条「未做完」其实是刚交的卷。
       不隐藏就会同时出现成绩条和「继续这卷」，看起来像整卷被重复记录。 */
    var finishedNow = sess && finishedFlag(sess.finished);
    var abandonedRaw = (load(ABANDONED) || []).filter(function (r) { return isRec(r) && unfinishedFlag(r.finished); });
    var abandoned = abandonedRaw.filter(function (r) {
      return !(finishedNow && sameStamp(r.startedAt, sess.startedAt) && modeOf(r) === modeOf(sess));
    });
    /* 只隐藏不删，等下次开新卷把这卷顶掉后它还会冒出来。能写盘就当场补删；
       写盘失败也先隐藏本次渲染，不让同一卷重复出现在眼前。 */
    if (abandoned.length !== abandonedRaw.length) {
      try { save(ABANDONED, abandoned); } catch (e) { console.warn('清理未做完档案失败', e); }
    }
    abandoned = abandoned.concat(salvaged).sort(byDateDesc);
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
