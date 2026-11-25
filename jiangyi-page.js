/* 讲义复习 · 页面控制器（只读 window.TD_JY，数据/状态全在 jiangyi-core.js） */
(function () {
  'use strict';
  var J = window.TD_JY, A = window.TD_APP;
  var els = {};
  ['jyBoards', 'jyBoardCards', 'jyDataNotice', 'jySections', 'jyCrumb', 'jyBoardTitle', 'jyBoardLead',
    'jySectionList', 'jyGroupList', 'jyQuiz', 'jyCurrent', 'jyBackList', 'jyNumber', 'jyPosition',
    'jyPositionButton', 'jyMark', 'jyMarkLabel', 'btnScratch',
    'jyStem', 'jyFigure', 'jyAnswerArea', 'jyFooterSection', 'jyPrev', 'jyNext', 'jySubmitTop',
    'jyResult', 'jyResultTitle', 'jyResultAccuracy', 'jyResultFraction', 'jyResultWrong', 'jyResultBack']
    .forEach(function (id) { els[id] = document.getElementById(id === 'jyQuiz' ? 'questionView' : id); });

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
  var markedQ = {};
  var scratchPad = (function () {
    var layer, canvas, ctx, toolbar, open = false, mode = 'pen', drawing = false, last = null;
    function build() {
      if (layer) return;
      layer = document.createElement('div');
      layer.className = 'mist-layer';
      layer.innerHTML =
        '<div class="mist-toolbar">' +
          '<button type="button" data-tool="pen" class="on">黑笔</button>' +
          '<button type="button" data-tool="red">红笔</button>' +
          '<button type="button" data-tool="eraser">橡皮</button>' +
          '<span class="mist-tool-sep"></span>' +
          '<button type="button" data-tool="clear">清空</button>' +
          '<button type="button" data-tool="done" class="mist-done">完成</button>' +
        '</div><canvas class="mist-canvas"></canvas>';
      document.body.appendChild(layer);
      canvas = layer.querySelector('.mist-canvas');
      ctx = canvas.getContext('2d');
      toolbar = layer.querySelector('.mist-toolbar');
      toolbar.addEventListener('click', function (e) {
        var b = e.target.closest('[data-tool]'); if (!b) return;
        var tool = b.dataset.tool;
        if (tool === 'done') { close(); return; }
        if (tool === 'clear') { clear(); return; }
        mode = tool;
        toolbar.querySelectorAll('[data-tool]').forEach(function (x) {
          x.classList.toggle('on', x.dataset.tool === mode);
        });
      });
      canvas.addEventListener('pointerdown', function (e) {
        drawing = true; last = pos(e); canvas.setPointerCapture(e.pointerId); dot(last);
      });
      canvas.addEventListener('pointermove', function (e) {
        if (!drawing) return; var p = pos(e); line(last, p); last = p;
      });
      canvas.addEventListener('pointerup', function () { drawing = false; last = null; });
      canvas.addEventListener('pointercancel', function () { drawing = false; last = null; });
      window.addEventListener('resize', sizeCanvas);
      document.addEventListener('keydown', function (e) { if (open && e.key === 'Escape') close(); });
    }
    function pos(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function radius() { return mode === 'eraser' ? 18 : 3.5; }
    function applyStyle() {
      if (mode === 'eraser') { ctx.globalCompositeOperation = 'destination-out'; ctx.strokeStyle = 'rgba(0,0,0,1)'; }
      else { ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = mode === 'red' ? '#d63333' : '#1a1a1a'; }
      ctx.lineWidth = radius();
    }
    function dot(p) {
      applyStyle(); ctx.beginPath(); ctx.arc(p.x, p.y, radius() / 2, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle; ctx.fill();
    }
    function line(a, b) {
      applyStyle(); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    function sizeCanvas() {
      if (!canvas) return;
      var dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px'; canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    }
    function clear() {
      if (!ctx) return; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.restore();
    }
    function openPad() { build(); sizeCanvas(); layer.classList.add('show'); document.body.classList.add('scratch-on'); open = true; }
    function close() {
      if (!layer) return; layer.classList.remove('show'); document.body.classList.remove('scratch-on'); clear(); open = false;
    }
    return { toggle: function () { open ? close() : openPad(); }, clear: clear, isOpen: function () { return open; } };
  })();
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
      : '：题目尚未录入，等题库侧数据。') +
      (g && g.total ? ' 另有教材原题 ' + g.total + ' 题（练习册 P200–207），单独成组，不计入官方小节。' : '');
    var secs = J.sectionsOf(id);
    var g = J.groupStats(id);
    if (g && g.total) {
      els.jyGroupList.hidden = false;
      els.jyGroupList.innerHTML = '<div class="jy-subgroup">' +
        '<button type="button" class="jy-subgroup-card" data-group="' + g.key + '">' +
        '<span class="jy-subgroup-kicker">教材原题 · 单独成组</span>' +
        '<span class="go">' + g.answered + ' / ' + g.total + ' 题 · 进入 ›</span>' +
        '<b>' + esc(g.label) + '</b>' +
        '<small>来自练习册原页，来源标注「练习册 P… #…」；不计入 4.1 / 4.2 的官方题数</small>' +
        '</button></div>';
      els.jyGroupList.querySelector('[data-group]').addEventListener('click', function () {
        openSection(id, this.dataset.group);
      });
    } else { els.jyGroupList.hidden = true; els.jyGroupList.innerHTML = ''; }
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
    var secLabel = section === J.TB_GROUP.key ? J.TB_GROUP.label : section + ' ' + ((J.declared(b.unit, section) || {}).cn || '');
    els.jyCurrent.textContent = 'U' + b.unit + ' ' + b.en + ' · ' + (section === J.TB_GROUP.key ? '教材原题' : section);
    /* 来源只留页脚这一条：官方讲义写「1.1 · p7 #1」，教材原题写「练习册 P200 #2」 */
    els.jyFooterSection.textContent = q.group === 'textbook' ? J.sourceLabel(q) : secLabel + ' · p' + q.page + ' #' + q.no;
    els.jyBackList.href = '#';
    els.jyNumber.textContent = String(index + 1);
    els.jyPosition.textContent = '第 ' + (index + 1) + ' / ' + qs.length + ' 题';
    els.jyPositionButton.textContent = 'Question ' + (index + 1) + ' of ' + qs.length;
    var marked = !!markedQ[q.id];
    els.jyMark.setAttribute('aria-pressed', marked ? 'true' : 'false');
    els.jyMarkLabel.textContent = marked ? 'Marked for Review' : 'Mark for Review';
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
  els.jyMark.addEventListener('click', function () {
    var q = qs[index]; if (!q) return;
    markedQ[q.id] = !markedQ[q.id]; renderQ();
  });
  els.btnScratch.addEventListener('click', scratchPad.toggle);
  els.jySubmitTop.addEventListener('click', function () {
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
    if (!J) return;
    /* 侧栏已在 HTML 里静态渲染，四入口 + 返回导航不依赖 JS */
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
