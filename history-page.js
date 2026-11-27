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
  function byId(id) { return BANK.find(function (q) { return q.id === id; }) || null; }

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
  function txt(v) { return v == null || typeof v === 'object' || typeof v === 'function' ? '' : String(v); }
  /* detail.correct 可能是布尔、1/0、'true'/'false'（云端旧结构）。只认明确的
     真值，否则 'false' 会被当成答对，整条错题行从记录里消失。 */
  function isRight(v) { return v === true || v === 1 || v === 'true' || v === '1'; }
  function num(v) { if (v == null || typeof v === 'object' || typeof v === 'function') return null; var n = Number(v); return isFinite(n) ? n : null; }
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
    var n = num(t), d = n != null && n > 0 ? new Date(n) : new Date(t);
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
    if (rec.finished === false) return 'void';
    var est = asObj(rec.estimate), scaled = num(est.scaled);
    if (txt(rec.mode) === 'mock' && scaled != null) {
      return scaled >= 700 ? 'good' : scaled >= 550 ? 'mid' : 'bad';
    }
    var total = num(rec.total), correct = num(rec.correct);
    var pct = total ? (correct || 0) / total : 0;
    return pct >= 0.85 ? 'good' : pct >= 0.6 ? 'mid' : 'bad';
  }
  function scoreLabel(rec) {
    if (rec.finished === false) return '未做完';
    var est = asObj(rec.estimate), scaled = num(est.scaled), total = num(rec.total), correct = num(rec.correct);
    if (txt(rec.mode) === 'mock' && scaled != null) return scaled + ' / 800';
    return Math.round(total ? (correct || 0) / total * 100 : 0) + '%';
  }
  function titleOf(rec) {
    var mode = txt(rec.mode), board = txt(rec.board), section = txt(rec.section), unit = txt(rec.unit), total = num(rec.total);
    if (mode === 'jiangyi') return '讲义复习' + (board ? ' · ' + board : '') + (section ? ' · ' + section : '');
    if (mode === 'quiz') return '单元抽查' + (unit ? ' · U' + unit : '');
    /* 未交卷的模考只发到第一模块（22 题），写「全卷 22 题」会误导成整卷只有 22 题。 */
    if (rec.finished === false) return '官方模考 · 未交卷';
    return '官方模考 · 全卷 ' + (total == null ? 44 : total) + ' 题';
  }

  function wrongRows(detail) {
    var wrong = asArr(detail).filter(function (d) { return d && !isRight(d.correct); });
    if (!wrong.length) return '<div class="hist-empty">本次全部答对。</div>';
    return '<div class="hist-wrong">' + wrong.map(function (d) {
      var did = txt(d.id) || '—', q = byId(did) || {};
      var stem = (txt(q.stem) || txt(d.topic) || did).replace(/\s+/g, ' ').trim().slice(0, 90);
      var ans = '你的答案 <b>' + esc(txt(d.given) || '—') + '</b> · 正确 <i>' + esc(txt(d.answer) || '—') + '</i>';
      return '<div class="hist-wrong-row"><span class="hist-wrong-id">' + esc(did) + '</span>' +
        '<span class="hist-wrong-stem" title="' + esc(stem) + '">' + esc(stem) + '</span>' +
        '<span class="hist-wrong-ans">' + ans + '</span></div>';
    }).join('') + '</div>';
  }
  function prioRows(report) {
    var prio = asArr(asObj(report).priority).filter(function (p) { return p && typeof p === 'object'; });
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
  function abandonedBody(rec) {
    var sess = readSession();
    /* startedAt 在旧版/云端合并里可能是字符串；严格 === 会把同一张还能做的卷
       误报成「存档已失效」。按有限数字比较，类型不一致也认。 */
    var resumable = !!(sess && sameStamp(rec.startedAt, sess.startedAt) && !sess.finished);
    var html = '<div class="hist-kv"><span>状态 <b>未做完</b></span>' +
      '<span>已答 <b>' + numTxt(rec.answered == null ? 0 : rec.answered) + ' / ' + numTxt(rec.total) + '</b></span>' +
      '<span>中断时间 <b>' + fmtDate(rec.date) + '</b></span></div>';
    if (resumable) {
      html += '<div class="hist-continue"><a class="btn primary" href="exam.html?mode=' + esc(txt(rec.mode)) + '">继续这卷</a></div>';
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
    html += '<div class="hist-sec">错题（' + (asArr(rec.detail).filter(function (d) { return d && !isRight(d.correct); })).length + '）</div>' + wrongRows(rec.detail);
    html += '<div class="hist-sec">应该补哪块</div>' + prioRows(rec.report);
    return html;
  }

  function rowHtml(rec, idx) {
    var g = grade(rec);
    var unfinished = rec.finished === false;
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
    var results = (load(RESULTS) || []).filter(function (r) { return isRec(r) && !r.void; }).sort(byDateDesc);
    var abandoned = (load(ABANDONED) || []).filter(function (r) { return isRec(r) && r.finished === false; }).sort(byDateDesc);
    if (!results.length && !abandoned.length) {
      box.innerHTML = '<div class="hist-empty">还没有模考或抽查记录。去<a href="exam.html?mode=mock" style="color:var(--blue-strong)">做一次模考</a>，交卷后这里会出现成绩、错题与补强报告。</div>';
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
