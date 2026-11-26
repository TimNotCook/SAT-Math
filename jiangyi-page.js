/* 讲义复习 · 页面控制器（只读 window.TD_JY，数据/状态全在 jiangyi-core.js） */
(function () {
  'use strict';
  var J = window.TD_JY, A = window.TD_APP;
  var els = {};
  ['jyBoards', 'jyBoardCards', 'jyDataNotice', 'jySections', 'jyCrumb', 'jyBoardTitle', 'jyBoardLead',
    'jySectionList', 'jyGroupList', 'jyQuiz', 'jyCurrent', 'jyBackList', 'jyNumber', 'jyPosition',
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

  /* P1-A：轻提示（复用 bluebook.css 的 #toast 样式，2.6s 自动消失，不挡列表） */
  function jyToast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(jyToast._t);
    jyToast._t = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  /* ---------- 四个子板块 ---------- */
  function renderBoards() {
    var list = J.allStats();
    els.jyBoardCards.innerHTML = list.map(function (st) {
      /* 极简卡片：只留标题 + 中文名；已录/应有/完成度等内部口径不再展示，空板块保留「待录入」胶囊 */
      return '<button type="button" class="jy-board-card" data-board="' + st.board + '">' +
        '<b>U' + st.unit + ' ' + esc(st.en) + '</b>' +
        '<span>' + esc(st.cn) + '</span>' +
        (st.dataReady
          ? '<span class="jy-bar"><i style="width:' + (st.percent || 0) + '%"></i></span>'
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
    els.jyBoardLead.textContent = st.dataReady ? b.cn : '题目尚未录入。';
    var secs = J.sectionsOf(id);
    var g = J.groupStats(id);
    if (g && g.total) {
      els.jyGroupList.hidden = false;
      els.jyGroupList.innerHTML = '<div class="jy-subgroup">' +
        '<button type="button" class="jy-subgroup-card" data-group="' + g.key + '">' +
        '<span class="go">进入 ›</span>' +
        '<b>' + esc(g.label) + '</b>' +
        '</button></div>';
      els.jyGroupList.querySelector('[data-group]').addEventListener('click', function () {
        openSection(id, this.dataset.group);
      });
    } else { els.jyGroupList.hidden = true; els.jyGroupList.innerHTML = ''; }
    els.jySectionList.innerHTML = secs.length ? secs.map(function (s) {
      var x = J.stats(id, s);
      if (!x.total) {
        /* P1-A：0 题小节是禁用态、不是链接。data-empty="1" 命中页内作用域样式：
           悬停无高亮/无浮起、无手型光标、整行降饱和；右侧是独立「待录入」徽标。
           误点只弹轻提示，绝不进做题页。 */
        return '<div class="drill-section-row jy-empty-row" data-empty="1" aria-disabled="true">' +
          '<span class="drill-section-code">' + esc(s) + '</span>' +
          '<span class="drill-section-name">' + esc(x.cn || '未命名小节') + '</span>' +
          '<span class="drill-section-meta"></span>' +
          '<span class="drill-section-go"><span class="jy-empty-badge">待录入</span></span></div>';
      }
      var sub = J.submittedOf(s);
      return '<a class="drill-section-row" href="#" data-sec="' + esc(s) + '"' + (sub ? ' data-result="1"' : '') + '>' +
        '<span class="drill-section-code">' + esc(s) + '</span>' +
        '<span class="drill-section-name">' + esc(x.cn || '未命名小节') + '</span>' +
        '<span class="drill-section-meta">' + (x.answered ? '作答 ' + x.answered + ' / ' + x.total : '') + '</span>' +
        '<span class="drill-section-go">' + (sub ? '查看结果' : (x.answered ? '继续' : '开始')) + '</span></a>';
    }).join('') : '<p class="jy-empty">该板块暂无小节数据。</p>';
    els.jySectionList.querySelectorAll('[data-sec]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); openSection(id, a.dataset.sec); });
    });
    /* 禁用行单独绑：只弹轻提示，不进 openSection */
    els.jySectionList.querySelectorAll('[data-empty="1"]').forEach(function (row) {
      row.addEventListener('click', function () { jyToast('本节题目尚未录入，先在题库里补题'); });
    });
    title('讲义复习 · U' + b.unit + ' ' + b.en);
    show('jySections');
  }

  /* ---------- 做题 ---------- */
  var qs = [];
  function openSection(id, sec, at) {
    if (!J) { J = window.TD_JY; if (!J) { jyToast('讲义数据还在加载，稍等一下'); return; } }
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
    var secLabel = section === J.TB_GROUP.key ? J.TB_GROUP.label : section + ' ' + ((J.declared(b.unit, section) || {}).cn || '');
    els.jyCurrent.textContent = 'U' + b.unit + ' ' + b.en + ' · ' + (section === J.TB_GROUP.key ? '教材原题' : section);
    /* 来源只留页脚这一条：官方讲义写「1.1 · p7 #1」，教材原题写「练习册 P200 #2」 */
    els.jyFooterSection.textContent = q.group === 'textbook' ? J.sourceLabel(q) : secLabel + ' · p' + q.page + ' #' + q.no;
    els.jyBackList.href = '#';
    els.jyNumber.textContent = String(index + 1);
    els.jyPosition.textContent = '第 ' + (index + 1) + ' / ' + qs.length + ' 题';
    /* 教材原题在题卡上保留一枚来源胶囊（练习册原页），窄屏页脚会隐藏来源，靠它兜住 */
    var bookChip = q.group === 'textbook' ? '<span class="jy-book-chip">' + esc(J.sourceLabel(q)) + '</span>' : '';
    els.jyStem.innerHTML = bookChip + fmt(q.stem) + (q.table ? tableHtml(q.table) : '');
    /* 单一字段名 figure：值是 JY_FIG 的 spec 键就走矢量重画，是图片路径才当 <img> */
    var fk = q.figure || null;
    if (fk && window.JY_FIG && window.JY_FIG.specs && window.JY_FIG.specs[fk]) {
      els.jyFigure.hidden = false;
      try { els.jyFigure.innerHTML = window.JY_FIG.render(fk); }
      catch (e) { els.jyFigure.innerHTML = '<span class="drill-choice-placeholder">图形暂缺</span>'; }
    } else if (fk) {
      els.jyFigure.hidden = false;
      els.jyFigure.innerHTML = '<img src="' + esc(fk) + '" alt="题目配图（矢量重画）" loading="lazy" ' +
        'onerror="this.outerHTML=\'<span class=&quot;drill-choice-placeholder&quot;>图形暂缺</span>\'">';
    } else { els.jyFigure.hidden = true; els.jyFigure.innerHTML = ''; }
    var saved = J.answerOf(q.id), val = saved ? String(saved.v || '') : '';
    if (q.type === 'mcq') {
      var cts = choiceTablesOf(q);
      els.jyAnswerArea.innerHTML = '<div class="drill-choices" role="group" aria-label="答案选项">' +
        q.choices.map(function (text, i) {
          var L = String.fromCharCode(65 + i);
          var fig = window.TD_CHOICE_FIGURES ? window.TD_CHOICE_FIGURES.resolve(q, L) : null;
          var extra = '', body;
          if (fig && (fig.kind === 'image' || fig.kind === 'vector')) {
            body = fig.html; extra = fig.cls;
          } else if (fig && fig.kind === 'missing') {
            body = fig.html; extra = fig.cls;
          } else {
            /* 选项本身是一张表（原书四张两列表）：渲染真表格，不用扫描裁图；出错退回文字，绝不空屏 */
            body = '<span class="drill-choice-text">' + fmt(text) + '</span>';
            if (cts && cts[i]) {
              try { body = '<span class="drill-choice-text drill-choice-table">' + tableHtml(cts[i]) + '</span>'; }
              catch (e) { body = '<span class="drill-choice-text">' + fmt(text) + '</span>'; }
            }
          }
          return '<button type="button" class="drill-choice' + extra + (val.toUpperCase() === L ? ' on' : '') +
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
    } else if (q.values && q.values.length > 1) {
      /* 官方两空 grid-in：原页就是两处下划线，必须两个框，答案串存成“第一空, 第二空” */
      var parts = String(val).split(/[,;]/).map(function (p) { return p.trim(); });
      els.jyAnswerArea.innerHTML = '<div class="jy-grid jy-grid-multi">' +
        q.values.map(function (_, i) {
          var lbl = i === 0 ? '第一空' : (i === 1 ? '第二空' : '第' + (i + 1) + '空');
          return '<span class="jy-grid-label">' + lbl + '</span>' +
            '<input class="jyGridInput" data-box="' + i + '" type="text" inputmode="decimal" ' +
            'aria-label="' + lbl + '" placeholder="填写答案" value="' + esc(parts[i] || '') + '">';
        }).join('') + '<button class="btn primary" type="button" id="jyGridSet">确定</button></div>';
      var boxes = els.jyAnswerArea.querySelectorAll('.jyGridInput');
      function commitMulti() {
        var v = [].slice.call(boxes).map(function (n) { return n.value.trim(); }).join(', ');
        J.answerQ(q, v); J.setCursor(boardId, section, index);
      }
      document.getElementById('jyGridSet').addEventListener('click', function () { commitMulti(); renderQ(); });
      boxes.forEach(function (n) {
        n.addEventListener('keydown', function (e) { if (e.key === 'Enter') { commitMulti(); renderQ(); } });
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
  /* 讲义里的表格题用真表格，不裁扫描页；两种写法都吃：
     [['x','y'],['3','13']…]（题干表 table）与 {head:[…],rows:[…]}（选项表 choiceTables） */
  function tableHtml(t) {
    var rows = Array.isArray(t) ? t : [t.head || []].concat(t.rows || []);
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
    if (!J) { J = window.TD_JY; if (!J) { jyToast('讲义数据还在加载，稍等一下'); return; } }
    var rec = J.submitSection(boardId, section);
    if (rec) renderResult(rec); else openBoard(boardId);
  });

  /* ---------- 结果 ---------- */
  function renderResult(rec) {
    var b = J.board(rec.board);
    els.jyResultTitle.textContent = (section === J.TB_GROUP.key
      ? J.TB_GROUP.label
      : section + ' ' + ((J.declared(b.unit, section) || {}).cn || '')) + ' · 结果';
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
    /* 冷启动兜底：数据/核心脚本偶发晚到（首屏见过 TD_JY 尚未挂载就执行本脚本），
       这时早期 return 会让整页停在“正在载入…”。轮询等它上线再渲染，最多约 10 秒。 */
    if (!window.TD_JY) {
      boot._wait = (boot._wait || 0) + 1;
      if (boot._wait <= 40) { setTimeout(boot, 250); return; }
      els.jyBoardCards.innerHTML = '<p class="jy-empty">讲义题目没有加载成功，刷新页面再试。</p>';
      return;
    }
    J = window.TD_JY; A = A || window.TD_APP;
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
