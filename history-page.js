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

  function load(k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } }
  function readSession() { try { return JSON.parse(localStorage.getItem(SESSION)) || null; } catch (e) { return null; } }
  function fmtDate(t) { return new Date(t).toLocaleString('zh-CN', { hour12: false }); }
  function fmtDur(sec) {
    if (!sec || sec < 0) return '—';
    var m = Math.floor(sec / 60);
    return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min';
  }
  var MODE_NAME = { mock: '模考', quiz: '单元抽查', jiangyi: '讲义' };

  /* 分数越高越绿、越低越红、中间橙；未做完灰。
     模考用 200–800 分：≥700 绿、≥550 橙、其余红。
     抽查 / 讲义没有换算分，用正确率同阈值（≥85% / ≥60%）。 */
  function grade(rec) {
    if (rec.finished === false) return 'void';
    if (rec.mode === 'mock' && rec.estimate && rec.estimate.scaled) {
      var s = rec.estimate.scaled;
      return s >= 700 ? 'good' : s >= 550 ? 'mid' : 'bad';
    }
    var pct = rec.total ? (rec.correct || 0) / rec.total : 0;
    return pct >= 0.85 ? 'good' : pct >= 0.6 ? 'mid' : 'bad';
  }
  function scoreLabel(rec) {
    if (rec.finished === false) return '未做完';
    if (rec.mode === 'mock' && rec.estimate && rec.estimate.scaled) return rec.estimate.scaled + ' / 800';
    return Math.round(rec.total ? (rec.correct || 0) / rec.total * 100 : 0) + '%';
  }
  function titleOf(rec) {
    if (rec.mode === 'jiangyi') return '讲义复习' + (rec.board ? ' · ' + rec.board : '') + (rec.section ? ' · ' + rec.section : '');
    if (rec.mode === 'quiz') return '单元抽查' + (rec.unit ? ' · U' + rec.unit : '');
    /* 未交卷的模考只发到第一模块（22 题），写「全卷 22 题」会误导成整卷只有 22 题。 */
    if (rec.finished === false) return '官方模考 · 未交卷';
    return '官方模考 · 全卷 ' + (rec.total || 44) + ' 题';
  }

  function wrongRows(detail) {
    var wrong = (detail || []).filter(function (d) { return !d.correct; });
    if (!wrong.length) return '<div class="hist-empty">本次全部答对。</div>';
    return '<div class="hist-wrong">' + wrong.map(function (d) {
      var q = byId(d.id) || {};
      var stem = String(q.stem || d.topic || d.id).replace(/\s+/g, ' ').trim().slice(0, 90);
      var ans = '你的答案 <b>' + esc(d.given || '—') + '</b> · 正确 <i>' + esc(d.answer == null ? '' : d.answer) + '</i>';
      return '<div class="hist-wrong-row"><span class="hist-wrong-id">' + esc(d.id) + '</span>' +
        '<span class="hist-wrong-stem" title="' + esc(stem) + '">' + esc(stem) + '</span>' +
        '<span class="hist-wrong-ans">' + ans + '</span></div>';
    }).join('') + '</div>';
  }
  function prioRows(report) {
    var prio = (report && report.priority) || [];
    if (!prio.length) return '<div class="hist-empty">暂无补强建议。</div>';
    return '<div class="hist-prio">' + prio.slice(0, 5).map(function (p) {
      return '<div class="hist-prio-row"><b>' + esc(p.name) + '</b>' +
        '<small>' + esc(p.reason || '') + (p.action ? ' → ' + esc(p.action) : '') +
        (p.wrongIds && p.wrongIds.length ? '（错题：' + esc(p.wrongIds.join('、')) + '）' : '') + '</small></div>';
    }).join('') + '</div>';
  }

  function abandonedBody(rec) {
    var sess = readSession();
    var resumable = !!(sess && rec.startedAt && sess.startedAt === rec.startedAt && !sess.finished);
    var html = '<div class="hist-kv"><span>状态 <b>未做完</b></span>' +
      '<span>已答 <b>' + (rec.answered || 0) + ' / ' + (rec.total || '—') + '</b></span>' +
      '<span>中断时间 <b>' + fmtDate(rec.date) + '</b></span></div>';
    if (resumable) {
      html += '<div class="hist-continue"><a class="btn primary" href="exam.html?mode=' + esc(rec.mode) + '">继续这卷</a></div>';
    } else {
      html += '<div class="hist-continue" style="color:var(--sub);font-size:12.5px">存档已失效（会话已被覆盖），仅供查看。</div>';
    }
    return html;
  }

  function resultBody(rec) {
    var html = '<div class="hist-kv">' +
      '<span>交卷时间 <b>' + fmtDate(rec.date) + '</b></span>' +
      '<span>答对 <b>' + (rec.correct || 0) + ' / ' + (rec.total || 0) + '</b></span>' +
      '<span>用时 <b>' + fmtDur(rec.elapsed) + '</b></span>' +
      (rec.mode === 'mock' && rec.estimate ? '<span>原始分 <b>' + rec.estimate.raw + ' / ' + rec.estimate.rawMax + '</b></span>' +
        '<span>自适应路径 <b>' + (rec.estimate.path === 'easy' ? 'easier' : 'harder') + '</b></span>' : '') +
      '</div>';
    html += '<div class="hist-sec">错题（' + ((rec.detail || []).filter(function (d) { return !d.correct; })).length + '）</div>' + wrongRows(rec.detail);
    html += '<div class="hist-sec">应该补哪块</div>' + prioRows(rec.report);
    return html;
  }

  function rowHtml(rec, idx) {
    var g = grade(rec);
    var unfinished = rec.finished === false;
    var head = '<button type="button" class="hist-bar-head" aria-expanded="false" data-idx="' + idx + '">' +
      '<span class="hist-dot ' + g + '" aria-hidden="true"></span>' +
      '<span class="hist-title">' + esc(titleOf(rec)) +
      '<small>' + fmtDate(rec.date) + ' · ' + (MODE_NAME[rec.mode] || rec.mode || '记录') + '</small></span>' +
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
    var byDateDesc = function (a, b) { return (b.date || 0) - (a.date || 0); };
    var results = (load(RESULTS) || []).filter(function (r) { return r && !r.void; }).sort(byDateDesc);
    var abandoned = (load(ABANDONED) || []).filter(function (r) { return r && r.finished === false; }).sort(byDateDesc);
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
     但那发生在本次脚本之后；轮询比对数据长度，一旦落地就重渲染一次，
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
