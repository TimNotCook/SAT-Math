/* 讲义复习 · 页面控制器（只读 window.TD_JY，数据/状态全在 jiangyi-core.js） */
(function () {
  'use strict';
  var J = window.TD_JY, A = window.TD_APP;
  var els = {};
  ['jyBoards', 'jyBoardCards', 'jyDataNotice', 'jySections', 'jyCrumb', 'jyBoardTitle', 'jyBoardLead',
    'jySectionList', 'jyQuiz', 'jyCurrent', 'jyBackList', 'jyNumber', 'jyPosition',
    'jyStem', 'jyFigure', 'jyAnswerArea', 'jyFooterSection', 'jyPrev', 'jyNext', 'jySubmit',
    'jyResult', 'jyResultTitle', 'jyResultAccuracy', 'jyResultFraction', 'jyResultWrong', 'jyResultBack']
    .forEach(function (id) { els[id] = document.getElementById(id); });

  var boardId = null, section = null, index = 0;
  /* 选项表格：data/jiangyi.js 里的 choiceTables（每题最多四张）目前 core 归一化时会丢掉，
     这里直接按 id 去读原始 JY_BANK 拿回来。等编程者把这一行挪进 core 的 normalize，
     块可直接删掉，不影响渲染。（「表是选项」的题：JY1-042 p32 #3） */
  var RAW = {};
  (window.JY_BANK || []).forEach(function (r) { if (r && r.id) RAW[r.id] = r; });
  function choiceTablesOf(q) {
    var raw = q && RAW[q.id];
    return raw && Array.isArray(raw.choiceTables) ? raw.choiceTables : null;
  }
  var VIEWS = ['jyBoards', 'jySections', 'jyQuiz', 'jyResult'];
  function esc(s) { return A && A.esc ? A.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  }); }
  function show(id) {
    VIEWS.forEach(function (v) { els[v].hidden = v !== id; });
    if (id !== 'jyQuiz') window.scrollTo(0, 0);
  }
  function title(t) { document.title = 'SAT Math Prep · ' + t; }

  /* ---------- 四个子板块 ---------- */
  function renderBoards() {
    var list = J.allStats();
    els.jyBoardCards.innerHTML = list.map(function (st) {
      return '<button type="button" class="jy-board-card" data-board="' + st.board + '">' +
        '<b>U' + st.unit + ' ' + esc(st.en) + '</b>' +
        '<span>' + esc(st.cn) + '</span>' +
        (st.dataReady
          ? '<small>已录 ' + st.total + ' 题 · ' + st.sections + ' 个小节</small>' +
            '<small>完成 ' + st.answered + ' / ' + st.total + ' · ' + st.percent + '%</small>' +
            '<span class="jy-bar"><i style="width:' + (st.percent || 0) + '%"></i></span>'
          : '<small>待题库录入</small>') +
        '</button>';
    }).join('');
    els.jyBoardCards.querySelectorAll('[data-board]').forEach(function (b) {
      b.addEventListener('click', function () { openBoard(b.dataset.board); });
    });
    els.jyDataNotice.hidden = list.some(function (s) { return s.dataReady; }) || false;
    title('讲义复习');
    show('jyBoards');
  }

  function openBoard(id) {
    boardId = id; section = null;
    var b = J.board(id), st = J.boardStats(id);
    els.jyCrumb.textContent = '讲义复习 › U' + b.unit;
    els.jyBoardTitle.textContent = 'U' + b.unit + ' ' + b.en;
    els.jyBoardLead.textContent = b.cn + (st.dataReady
      ? '：' + st.sections + ' 个小节，已录 ' + st.total + ' 题；完成 ' + st.answered + ' / ' + st.total + '。'
      : '：题目尚未录入，等题库侧数据。');
    var secs = J.sectionsOf(id);
    els.jySectionList.innerHTML = secs.length ? secs.map(function (s) {
      var x = J.stats(id, s);
      if (!x.total) {
        return '<div class="drill-section-row" style="opacity:.55;cursor:default">' +
          '<span class="drill-section-code">' + esc(s) + '</span>' +
          '<span class="drill-section-name">' + esc(x.cn || '未命名小节') + '</span>' +
          '<span class="drill-section-meta">已录 0 / 应有 ' + x.expect + ' · 待录入</span>' +
          '<span class="drill-section-go">—</span></div>';
      }
      var sub = J.submittedOf(s);
      return '<a class="drill-section-row" href="#" data-sec="' + esc(s) + '"' + (sub ? ' data-result="1"' : '') + '>' +
        '<span class="drill-section-code">' + esc(s) + '</span>' +
        '<span class="drill-section-name">' + esc(x.cn || '未命名小节') + '</span>' +
        '<span class="drill-section-meta">已录 ' + x.total + ' / 应有 ' + x.expect +
        ' · 作答 ' + x.answered + ' / ' + x.total + (x.complete ? ' · 已完成' : '') +
        (x.reconciled ? '' : ' · 对账未平') + '</span>' +
        '<span class="drill-section-go">' + (sub ? '查看结果' : (x.answered ? '继续' : '开始')) + '</span></a>';
    }).join('') : '<p class="jy-empty">该板块暂无小节数据。</p>';
    els.jySectionList.querySelectorAll('[data-sec]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); openSection(id, a.dataset.sec); });
    });
    title('讲义复习 · U' + b.unit + ' ' + b.en);
    show('jySections');
  }

  /* ---------- 做题 ---------- */
  var qs = [];
  function openSection(id, sec, at) {
    boardId = id; section = sec; qs = J.questionsOf(id, sec);
    var i = Math.min(Math.max(0, at || 0), Math.max(0, qs.length - 1));
    index = i;
    title('讲义复习 · ' + sec + ' ' + ((J.declared(J.board(id).unit, sec) || {}).cn || ''));
    show('jyQuiz');
    renderQ();
  }

  function renderQ() {
    var q = qs[index]; if (!q) return;
    var b = J.board(boardId);
    els.jyCurrent.textContent = 'U' + b.unit + ' ' + b.en + ' · ' + section;
    /* 来源只留页脚这一条（做题栏不再挂胶囊，避免同一信息出现两次） */
    els.jyFooterSection.textContent = section + ' ' + ((J.declared(b.unit, section) || {}).cn || '') + ' · p' + q.page + ' #' + q.no;
    els.jyBackList.href = '#';
    els.jyNumber.textContent = String(index + 1);
    els.jyPosition.textContent = '第 ' + (index + 1) + ' / ' + qs.length + ' 题';
    els.jyStem.innerHTML = fmt(q.stem) + (q.table ? tableHtml(q.table) : '');
    if (q.fig && window.JY_FIG && window.JY_FIG.render) {
      els.jyFigure.hidden = false;
      try { els.jyFigure.innerHTML = window.JY_FIG.render(q.fig); }
      catch (e) { els.jyFigure.innerHTML = '<span class="drill-choice-placeholder">图形暂缺</span>'; }
    } else if (q.figure) {
      els.jyFigure.hidden = false;
      els.jyFigure.innerHTML = '<img src="' + esc(q.figure) + '" alt="题目配图（矢量重画）" loading="lazy" ' +
        'onerror="this.outerHTML=\'<span class=&quot;drill-choice-placeholder&quot;>图形暂缺</span>\'">';
    } else { els.jyFigure.hidden = true; els.jyFigure.innerHTML = ''; }
    var saved = J.answerOf(q.id), val = saved ? String(saved.v || '') : '';
    if (q.type === 'mcq') {
      var cts = choiceTablesOf(q);
      els.jyAnswerArea.innerHTML = '<div class="drill-choices" role="group" aria-label="答案选项">' +
        q.choices.map(function (text, i) {
          var L = String.fromCharCode(65 + i);
          /* 选项本身是一张表（原书四张两列表）：渲染真表格，不用扫描裁图 */
          var body = (cts && cts[i])
            ? '<span class="drill-choice-text drill-choice-table">' + tableHtml(cts[i]) + '</span>'
            : '<span class="drill-choice-text">' + fmt(text) + '</span>';
          return '<button type="button" class="drill-choice' + (val.toUpperCase() === L ? ' on' : '') +
            '" data-choice="' + L + '" aria-pressed="' + (val.toUpperCase() === L) + '">' +
            '<span class="drill-choice-letter">' + L + '</span>' +
            body + '</button>';
        }).join('') + '</div>';
      els.jyAnswerArea.querySelectorAll('[data-choice]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          J.answerQ(q, btn.dataset.choice); J.setCursor(boardId, section, index);
          renderQ();
        });
      });
    } else {
      els.jyAnswerArea.innerHTML = '<div class="jy-grid"><input id="jyGridInput" type="text" inputmode="decimal" ' +
        'aria-label="填写答案" placeholder="填写答案" value="' + esc(val) + '">' +
        '<button class="btn primary" type="button" id="jyGridSet">确定</button></div>';
      var input = document.getElementById('jyGridInput');
      function commit() { J.answerQ(q, input.value); J.setCursor(boardId, section, index); }
      document.getElementById('jyGridSet').addEventListener('click', function () { commit(); renderQ(); });
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { commit(); renderQ(); } });
    }
    els.jyPrev.disabled = index <= 0;
    els.jyNext.disabled = index >= qs.length - 1;
    J.setCursor(boardId, section, index);
  }
  /* 讲义里的表格题用真表格，不裁扫描页 */
  function tableHtml(rows) {
    return '<table class="jy-table">' + rows.map(function (row, i) {
      return '<tr>' + row.map(function (cell) {
        return '<' + (i ? 'td' : 'th') + '>' + esc(cell) + '</' + (i ? 'td' : 'th') + '>';
      }).join('') + '</tr>';
    }).join('') + '</table>';
  }
  function fmt(t) {
    return esc(t).replace(/\n/g, '<br>');
  }

  els.jyPrev.addEventListener('click', function () { if (index > 0) { index--; renderQ(); } });
  els.jyNext.addEventListener('click', function () { if (index < qs.length - 1) { index++; renderQ(); } });
  els.jyBackList.addEventListener('click', function (e) { e.preventDefault(); openBoard(boardId); });
  els.jySubmit.addEventListener('click', function () {
    var rec = J.submitSection(boardId, section);
    if (rec) renderResult(rec); else openBoard(boardId);
  });

  /* ---------- 结果 ---------- */
  function renderResult(rec) {
    var b = J.board(rec.board);
    els.jyResultTitle.textContent = section + ' ' + ((J.declared(b.unit, section) || {}).cn || '') + ' · 结果';
    els.jyResultAccuracy.textContent = (rec.total ? Math.round(rec.correct / rec.total * 100) : 0) + '%';
    els.jyResultFraction.textContent = rec.correct + ' / ' + rec.total + ' 题答对';
    var wrong = rec.detail.filter(function (d) { return !d.correct; });
    els.jyResultWrong.innerHTML = wrong.length
      ? '<h2 class="drill-group-h">错题（' + wrong.length + '）</h2>' + wrong.map(function (d) {
          var q = J.BY_ID[d.id];
          return '<div class="jy-result-row"><span class="s">' + esc(J.sourceLabel(q)) + '</span>' +
            '<span>你的答案 <b>' + esc(d.given || '未答') + '</b> · 正确答案 <b>' + esc(q.answer) + '</b></span></div>';
        }).join('')
      : '<p class="jy-empty">本节全对。</p>';
    els.jyResultBack.href = '#';
    els.jyResultBack.onclick = function (e) { e.preventDefault(); openBoard(boardId); };
    title('讲义复习 · ' + section + ' 结果');
    show('jyResult');
  }

  /* ---------- 启动：URL 恢复 ---------- */
  function boot() {
    if (!J) return;
    if (A && A.nav) A.nav('drill');
    var p = new URLSearchParams(location.search);
    var wantBoard = p.get('b'), wantSec = p.get('s'), wantI = parseInt(p.get('i'), 10);
    if (wantBoard && J.board(wantBoard)) {
      var secs = J.sectionsOf(wantBoard);
      var sec = wantSec && secs.indexOf(wantSec) >= 0 ? wantSec
        : (J.state.last && J.state.last.board === wantBoard ? J.state.last.section : secs[0]);
      if (sec) return openSection(wantBoard, sec, isNaN(wantI) ? (J.state.last && J.state.last.i) || 0 : wantI - 1);
      return openBoard(wantBoard);
    }
    renderBoards();
  }
  boot();
})();
