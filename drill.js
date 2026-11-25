/* TD SAT Math · Unit practice
   First screen is a short selection page. Questions only appear after a section
   is chosen. Practice mode never mounts Desmos. */
(function () {
  'use strict';
  var A = window.TD_APP, U = window.TD_UI;
  /* 加载失败兜底：题库或核心脚本缺失时给出明确的"刷新重试"横幅，
     绝不让页面停留在静默空白（所有视图保持 hidden）。 */
  function fatalLoadError() {
    try {
      ['selectView', 'unitView', 'specialView', 'questionView', 'resultView'].forEach(function (id) {
        var e = document.getElementById(id); if (e) e.hidden = true;
      });
      var b = document.createElement('div');
      b.setAttribute('style', 'max-width:640px;margin:56px auto 0;padding:18px 22px;border:1px solid #e2e2e4;' +
        'border-radius:12px;font:14px/1.8 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;color:#1d1d1f;background:#fff');
      b.innerHTML = '<b style="font-size:15px">题目数据没有加载成功</b><br>' +
        '通常是网络中断或浏览器缓存了旧资源导致的。请先' +
        '<a href="drill.html" style="color:#1d4ed8;font-weight:700">刷新页面</a>重试；' +
        '若仍失败，请强制刷新（Mac：Cmd+Shift+R）清掉旧缓存后再试。';
      document.body.insertBefore(b, document.body.firstChild);
    } catch (e) {}
  }
  if (!A || !U) { fatalLoadError(); return; }
  var esc = A.esc;
  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(location.search);
  var resultSec = params.get('result') === '1' ? params.get('sec') : null;
  var inResultView = !!(resultSec && A.CATALOG[resultSec]);
  var inQuestionView = !inResultView && !!(params.get('sec') && A.CATALOG[params.get('sec')]);
  var PAGE_TITLE = 'SAT Math Prep · 真题练习';

  var els = {
    selectView: $('selectView'), unitView: $('unitView'), specialView: $('specialView'),
    questionView: $('questionView'), resultView: $('resultView'),
    boardNav: $('boardNav'), boardPanel: $('boardPanel'),
    specialUnitPicker: $('specialUnitPicker'),
    specialList: $('specialList'), specialResumeSlot: $('specialResumeSlot'),
    resultTitle: $('resultTitle'), resultLead: $('resultLead'),
    resultAccuracy: $('resultAccuracy'), resultFraction: $('resultFraction'),
    resultRight: $('resultRight'), resultWrong: $('resultWrong'),
    resultBlank: $('resultBlank'), resultTotal: $('resultTotal'),
    resultNotice: $('resultNotice'), resultNoticeText: $('resultNoticeText'),
    resultList: $('resultList'), resultPracticeLink: $('resultPracticeLink'),
    finish: $('btnFinish'),
    unitPicker: $('unitPicker'), sectionList: $('sectionList'), resumeSlot: $('resumeSlot'),
    currentSection: $('currentSection'), save: $('saveStatus'),
    number: $('qNumber'), mark: $('btnMark'), markLabel: $('markLabel'), scratch: $('btnScratch'),
    question: $('question'), stem: $('qStem'), answers: $('answerArea'),
    footerSection: $('footerSection'), position: $('questionPosition'),
    positionButton: $('btnQuestionNav'), previous: $('btnPrevious'), next: $('btnNext'),
    nav: $('questionNav'), navTitle: $('questionNavTitle'), grid: $('questionGrid')
  };
  var CHECK_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  var RIGHT_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  var WRONG_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  var BLANK_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>';
  var section = null, questions = [], index = 0, navOpener = null, selectedUnit = 1;

  function resultUrl(sec) {
    return 'drill.html?unit=' + A.UNIT_OF(sec) + '&sec=' + encodeURIComponent(sec) + '&result=1';
  }
  function boardUrl(sec) {
    if (sec && (A.isTopicSection(sec) || (A.isSpecialSection && A.isSpecialSection(sec)))) {
      return 'drill.html?board=special&unit=' + A.UNIT_OF(sec);
    }
    return 'drill.html?board=unit&unit=' + A.UNIT_OF(sec);
  }
  /* Shared "退出" control in the top bar. Hidden on the module landing page
     (there is nothing to exit to), visible everywhere deeper inside. */
  function setExit(href, show) {
    var b = document.getElementById('btnAppExit');
    if (!b) return;
    b.hidden = !show;
    if (href) b.href = href;
  }
  function showView(which) {
    els.selectView.hidden = which !== 'select';
    els.unitView.hidden = which !== 'unit';
    els.specialView.hidden = which !== 'special';
    els.questionView.hidden = which !== 'question';
    els.resultView.hidden = which !== 'result';
  }
  function fmt(s) { return window.TD_FIG ? window.TD_FIG.fmtMath(s) : esc(s); }
  function answerLabel(q, v) {
    if (q.type === 'grid' && (v == null || String(v).trim() === '')) v = q.value;
    if (v == null || String(v).trim() === '') return '—';
    var t = textFor(q), ch = (t.choices || {})[String(v).trim().toUpperCase()];
    if (q.type === 'mcq') return String(v).trim().toUpperCase() + (ch ? ' · ' + ch : '');
    return String(v).trim();
  }

  /* ---------------- selection page ---------------- */
  function allRegularSections() {
    var out = [];
    A.UNITS.forEach(function (u) { out = out.concat(A.unitSections(u.id)); });
    return out;
  }
  function allSpecialSections() {
    return (A.specialSections() || []).concat(A.topicSections() || []);
  }
  function specialUnits() {
    var have = {}, list = [];
    allSpecialSections().forEach(function (s) { var u = A.UNIT_OF(s); if (!have[u]) { have[u] = 1; list.push(u); } });
    return list.sort(function (x, y) { return x - y; });
  }
  function groupStats(secs) {
    var t = 0, a = 0, done = 0;
    secs.forEach(function (s) { var x = A.stats(s); t += x.total; a += x.answered; if (x.completed) done++; });
    return { total: t, answered: a, sections: secs.length, completedSections: done };
  }
  function renderPicker(container, units, active, onPick, statFn) {
    container.innerHTML = units.map(function (u) {
      var st = statFn ? statFn(u) : A.unitStats(u);
      return '<button type="button" class="drill-unit-button' + (u === active ? ' on' : '') +
        '" data-unit="' + u + '"><b>Unit ' + u + '</b><span>' + esc(A.unit(u).cn || '') + '</span>' +
        '<small>' + st.answered + ' / ' + st.total + ' 题</small></button>';
    }).join('');
    container.querySelectorAll('[data-unit]').forEach(function (b) {
      b.addEventListener('click', function () { onPick(+b.dataset.unit); });
    });
  }
  function sectionRow(s, label, meta, go, href, done, sub) {
    return '<a class="drill-section-row" href="' + href + '"' + (done ? ' data-result="1"' : '') + '>' +
      '<span class="drill-section-code">' + esc(s) + '</span>' +
      '<span class="drill-section-name">' + esc(label) +
      (sub ? '<em class="drill-section-sub">' + esc(sub) + '</em>' : '') + '</span>' +
      '<span class="drill-section-meta">' + esc(meta) + '</span>' +
      '<span class="drill-section-go">' + esc(go) + '</span></a>';
  }
  function rowsHtml(ids) {
    return ids.map(function (s) {
      var st = A.stats(s), cur = st.cursor + 1;
      var saved = A.secState(s, false) || {};
      var done = !!saved.submitted;
      var href = done ? resultUrl(s) : A.secUrl(s, cur);
      var go = done ? '查看结果' : (st.answered ? '继续' : '开始');
      return sectionRow(s, A.SECTION_CN[s] || s,
        st.answered + ' / ' + st.total + ' 题' + (done ? ' · 已公布结果' : (st.completed ? ' · 已完成' : '')),
        go, href, done, A.SECTION_SUB ? A.SECTION_SUB[s] : '');
    }).join('');
  }
  var activeBoard = 'unit';
  function boardNavItem(key, title, desc, st, topicMode) {
    return '<button type="button" class="drill-board-nav-item' + (activeBoard === key ? ' on' : '') +
      '" data-board="' + key + '">' +
      '<b>' + esc(title) + '</b><span>' + esc(desc) + '</span>' +
      '<small>' + st.answered + ' / ' + st.total + ' 题 · ' + st.sections + ' 个' +
      (topicMode ? ' Topic ' : '') + '板块</small></button>';
  }
  /* 第三组「讲义复习」：只放一个入口，不占 CATALOG / SECS，进度在
     jiangyi.html 与独立存储 tdsat_jiangyi_v1 里，和上面两组互不影响。 */
  function jiangyiNavItem() {
    return '<button type="button" class="drill-board-nav-item" data-board="jiangyi">' +
      '<b>讲义复习</b><span>讲义题按小节顺序，题卡标注 p{页} #{题号}，与上面两组完全分开</span>' +
      '<small>4 个子板块 · 独立进度</small></button>';
  }
  function groupedHtml(secs, units, topicMode) {
    var html = '';
    units.forEach(function (u) {
      var members = secs.filter(function (s) {
        return A.UNIT_OF(s) === u && !A.isLegacy(s);
      });
      if (!members.length) return;
      var head = 'Unit ' + u + ' · ' + esc(A.unit(u).cn || ''), sub = '';
      if (topicMode) {
        /* 专项训练按册分组：主标题「Unit N · 专项练习」，副标题「XX 册」（取自群组节点 cn/sub） */
        var gn = A.specialGroupNode ? A.specialGroupNode(u) : null;
        head = gn && /^Unit\s*\d/.test(gn.cn || '') ? esc(gn.cn)
          : ('Unit ' + u + ' · ' + esc((gn && gn.cn) || '专项练习'));
        sub = (gn && gn.sub) ? '<p class="drill-group-sub">' + esc(gn.sub) + '</p>' : '';
      }
      html += '<h2 class="drill-group-h">' + head + '</h2>' + sub + rowsHtml(members);
    });
    var legacy = secs.filter(function (s) { return A.isLegacy(s); });
    if (legacy.length) {
      html += '<h2 class="drill-group-h">精编原题组</h2>' + rowsHtml(legacy);
    }
    return html;
  }
  function renderLanding(active) {
    activeBoard = active || 'unit';
    var reg = allRegularSections(), sp = allSpecialSections();
    var rg = groupStats(reg), sg = groupStats(sp);
    els.boardNav.innerHTML =
      boardNavItem('unit', '单元练习', '教材常规板块，按单元分组', rg, false) +
      boardNavItem('special', '专项训练', '按 Topic 分组的专项板块', sg, true) +
      jiangyiNavItem();
    var panelHtml = activeBoard === 'special'
      ? groupedHtml(sp, specialUnits(), true)
      : groupedHtml(reg, A.UNITS.map(function (u) { return u.id; }), false);
    els.boardPanel.innerHTML = panelHtml || emptyNotice('题库暂未加载板块列表，请刷新页面重试。');
    els.boardNav.querySelectorAll('[data-board]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.board === 'jiangyi') { location.href = 'jiangyi.html'; return; }
        activeBoard = b.dataset.board;
        var url = new URL(location.href);
        url.searchParams.set('board', activeBoard);
        history.replaceState(null, '', url.href);
        renderLanding(activeBoard);
      });
    });
    renderResume();
    setExit(null, false);
    /* 标题要跟着当前分组走：停在「单元练习」就写单元练习，不再永远是真题练习。 */
    document.title = PAGE_TITLE + (activeBoard === 'special' ? ' · 专项训练' : ' · 单元练习');
    showView('select');
  }
  function renderUnitView() {
    renderPicker(els.unitPicker, A.UNITS.map(function (u) { return u.id; }), selectedUnit,
      function (u) { selectedUnit = u; renderUnitView(); },
      function (u) { return groupStats(A.unitSections(u)); });
    var regularRows = A.unitSections(selectedUnit);
    els.sectionList.innerHTML = regularRows.length
      ? rowsHtml(regularRows)
      : emptyNotice('该单元暂无可选的常规板块，请刷新页面重试。');
    setExit('drill.html', true);
    document.title = PAGE_TITLE + ' · 单元练习 · U' + selectedUnit + ' ' + (A.unit(selectedUnit).cn || '');
    showView('unit');
    window.scrollTo(0, 0);
  }
  function emptyNotice(msg) {
    return '<div class="empty">' + esc(msg) + '</div>';
  }
  function renderSpecialView() {
    var units = specialUnits();
    if (units.indexOf(selectedUnit) < 0) selectedUnit = units[0] || 1;
    renderPicker(els.specialUnitPicker, units, selectedUnit,
      function (u) { selectedUnit = u; renderSpecialView(); },
      function (u) { return groupStats(allSpecialSections().filter(function (s) { return A.UNIT_OF(s) === u; })); });
    var specialRows = allSpecialSections().filter(function (s) { return A.UNIT_OF(s) === selectedUnit; });
    els.specialList.innerHTML = specialRows.length
      ? rowsHtml(specialRows)
      : emptyNotice(units.length
        ? '该单元暂无可选的专项板块。'
        : '题库暂未加载专项板块，请刷新页面重试。');
    var last = A.state.last && A.CATALOG[A.state.last.sec] &&
      (A.isTopicSection(A.state.last.sec) || A.isSpecialSection(A.state.last.sec)) ? A.state.last.sec : null;
    els.specialResumeSlot.innerHTML = last
      ? '<a class="drill-resume" href="' + A.secUrl(last, (A.secState(last, false) || {}).cursor + 1 || 1) + '">' +
        '继续上次练习 · ' + esc(A.sectionLabel(last)) + '</a>'
      : '';
    setExit('drill.html', true);
    document.title = PAGE_TITLE + ' · 专项训练 · U' + selectedUnit + ' ' + (A.unit(selectedUnit).cn || '');
    showView('special');
    window.scrollTo(0, 0);
  }

  /* ---------------- section result ---------------- */
  /* Grade with the CURRENT bank, never with a cached verdict: the answer key
     was rebuilt from the workbook, so old localStorage `correct` flags can be
     stale. wrong.html already collects answers with correct === false, so the
     mistakes are in the wrong-answer book automatically once graded here. */
  function gradeSection(sec) {
    /* Grade from the CURRENT disk value, not the in-memory snapshot.
       A stale snapshot (background tab / throttled storage event / fast
       navigation) used to show a fully answered board as all-unanswered. */
    var diskSt = A.secStateDisk(sec);
    var st = diskSt || A.secState(sec, true), list = A.CATALOG[sec] || [];
    // Rebuild the in-memory section from disk so a later save() cannot replay
    // a stale empty copy back over the real answers.
    if (diskSt && A.state && A.state.sections) A.state.sections[sec] = diskSt;
    var rows = list.map(function (q, n) {
      var a = st.answers[q.id], given = a ? a.v : '';
      var answered = !!a && String(given).trim() !== '';
      var correct = answered ? A.isCorrect(q, given) : false;
      if (answered) A.refreshVerdict(sec, q.id, given);
      return { n: n + 1, q: q, given: given, answered: answered, correct: correct };
    });
    return rows;
  }
  function renderResult(sec) {
    var rows = gradeSection(sec), total = rows.length;
    var right = rows.filter(function (r) { return r.correct; }).length;
    var wrong = rows.filter(function (r) { return r.answered && !r.correct; }).length;
    var blank = total - right - wrong;
    var pct = total ? Math.round(right / total * 100) : 0;

    els.resultTitle.textContent = A.sectionLabel(sec) + ' · 板块结果';
    els.resultLead.textContent = '本板块已交卷。下面逐题公布作答与正确答案，答错的题已自动加入错题回顾。';
    els.resultAccuracy.textContent = pct + '%';
    els.resultFraction.textContent = '答对 ' + right + ' / ' + total + ' 题';
    els.resultRight.textContent = String(right);
    els.resultWrong.textContent = String(wrong);
    els.resultBlank.textContent = String(blank);
    els.resultTotal.textContent = String(total);
    els.resultNotice.hidden = wrong === 0;
    els.resultNoticeText.textContent = wrong
      ? '本板块 ' + wrong + ' 道错题已自动加入错题回顾，可在那里查看错因与重练入口。'
      : '本板块没有错题。';

    els.resultList.innerHTML = rows.map(function (r) {
      var state = !r.answered ? 'blank' : (r.correct ? 'right' : 'wrong');
      var icon = state === 'right' ? RIGHT_ICON : (state === 'wrong' ? WRONG_ICON : BLANK_ICON);
      var label = state === 'right' ? '正确' : (state === 'wrong' ? '错误' : '未作答');
      var stem = ((window.TD_TEXT || {})[r.q.id] || {}).stem || r.q.stem || '';
      stem = String(stem).replace(/\s+/g, ' ').trim();
      var crossed = window.TD_CROSSOUT ? window.TD_CROSSOUT.list(r.q.id) : [];
      var causeHtml = '';
      if (state === 'wrong' && window.TD_ANALYSIS) {
        var a = window.TD_ANALYSIS.analyze(r.q, r.given, textFor(r.q));
        causeHtml = '<div class="cause-box"><b>错因 · ' + esc(a.title) + '</b><p>' + esc(a.cause) +
          '</p><p class="fix">' + esc(a.fix) + '</p></div>';
      }
      return '<article class="drill-result-row is-' + state + '">' +
        '<div class="drill-result-row-head"><span class="drill-result-num">第 ' + r.n + ' 题</span>' +
        '<span class="drill-result-state">' + icon + label + '</span>' +
        '<a class="drill-result-jump" href="' + A.secUrl(sec, r.n) + '">查看本题</a></div>' +
        '<p class="drill-result-stem" title="' + esc(stem) + '">' + fmt(stem) + '</p>' +
        '<div class="drill-result-answers"><div><span>你的答案</span><b>' +
        fmt(answerLabel(r.q, r.given)) + '</b></div><div><span>正确答案</span><b>' +
        fmt(answerLabel(r.q, r.q.answer)) + '</b></div></div>' +
        (crossed.length ? '<div class="tiny muted crossout-note">划掉：' + crossed.join('、') + '</div>' : '') +
        causeHtml + '</article>';
    }).join('');
    els.resultPracticeLink.href = A.secUrl(sec, 1);
    var back = document.querySelector('#resultView .drill-result-actions .btn.primary');
    if (back) back.href = boardUrl(sec);
    setExit(boardUrl(sec), true);
    document.title = PAGE_TITLE + ' · 成绩 · ' + A.sectionLabel(sec);
    showView('result');
    window.scrollTo(0, 0);
  }
  function finishSection() {
    if (!section) return;
    var st = A.secState(section, true);
    st.submitted = true;
    st.submittedAt = Date.now();
    A.save();
    if (window.TD_SAVE) window.TD_SAVE.manualSave();
    location.href = resultUrl(section);
  }
  function renderResume() {
    var last = A.state.last && A.CATALOG[A.state.last.sec] ? A.state.last.sec : null;
    if (!last) { els.resumeSlot.innerHTML = ''; return; }
    var st = A.secState(last, false) || { cursor: 0 };
    els.resumeSlot.innerHTML = '<a class="drill-resume" href="' + A.secUrl(last, (st.cursor || 0) + 1) + '">' +
      '继续上次练习 · ' + esc(A.sectionLabel(last)) + ' 第 ' + ((st.cursor || 0) + 1) + ' 题</a>';
  }
  /* ---------------- question view ---------------- */
  function currentQuestion() { return questions[index] || null; }
  function textFor(q) { return (window.TD_TEXT || {})[q.id] || {}; }
  function stateFor(sec, create) { return A.secState(sec, create) || { answers: {}, marks: {}, cursor: 0 }; }
  function readLocation() {
    var p = new URLSearchParams(location.search);
    var requested = p.get('sec');
    var sec = A.CATALOG[requested] ? requested : A.SECS[0];
    var list = A.CATALOG[sec], raw = p.get('i'), i;
    if (raw == null) {
      var saved = stateFor(sec, false);
      i = Math.max(0, Math.min(list.length - 1, saved.cursor || 0));
    } else {
      i = parseInt(raw, 10);
      i = isFinite(i) ? Math.max(1, Math.min(list.length, i)) - 1 : 0;
    }
    return { sec: sec, index: i };
  }
  function canonicalUrl() {
    var url = new URL(location.href);
    url.searchParams.set('unit', A.UNIT_OF(section));
    url.searchParams.set('sec', section);
    url.searchParams.set('i', String(index + 1));
    return url.href;
  }
  function syncHistory(replace) {
    var href = canonicalUrl();
    try {
      history[replace ? 'replaceState' : 'pushState']({ sec: section, index: index }, '', href);
      return true;
    } catch (e) {
      if (!replace) { location.href = href; return false; }
      return true;
    }
  }

  /* 计算器可见性：专项训练/单元抽查/模考固定可用；单元练习由设置里的开关控制。 */
  function calcUnitAllowed() {
    try {
      var raw = localStorage.getItem('tdsat_prefs_v1');
      var p = raw ? JSON.parse(raw) : null;
      return !!(p && p.calcUnit);
    } catch (e) { return false; }
  }
  function applyCalcVisibility() {
    if (!section) return;
    var calcBtn = $('btnCalculator');
    if (!calcBtn) return;
    var allow = A.isSpecialSection(section) || A.isTopicSection(section) || calcUnitAllowed();
    if (calcBtn.hidden !== !allow) {
      if (!allow && window.U && U.closeCalculator) { try { U.closeCalculator(); } catch (e) { console.warn('关闭计算器失败', e); } }
      calcBtn.hidden = !allow;
    }
  }

  function applyQuestion(nextSection, nextIndex, replace, focusQuestion) {
    if (!A.CATALOG[nextSection] || !A.CATALOG[nextSection].length) return;
    section = nextSection;
    applyCalcVisibility();
    questions = A.CATALOG[section];
    index = Math.max(0, Math.min(questions.length - 1, nextIndex));
    if (!syncHistory(replace)) return;
    A.setCursor(section, index);
    A.state.last = { sec: section, qid: currentQuestion().id, ts: Date.now() };
    A.save();
    if (window.TD_SAVE) window.TD_SAVE.autosave();
    render();
    if (focusQuestion) {
      window.scrollTo(0, 0);
      els.question.focus({ preventScroll: true });
    }
  }
  /* 渲染闸门：四个选项都没有文字 / 矢量图 / 裁图时，不再画四个空按钮，
     直接给一条显式「选项缺失」，避免学生对着空壳乱点（数据侧必须进白名单）。 */
  function choiceMarkup(q, choices, current) {
    var text = textFor(q);
    var figList = text.figure || [];
    var resolver = window.TD_CHOICE_FIGURES;
    var items = ['A', 'B', 'C', 'D'].map(function (letter) {
      var txt = (choices[letter] || '').trim();
      var hit = resolver ? resolver.resolve(q, letter, { text: text }) : null;
      if (hit && hit.source === 'legacy' && txt) hit = null; /* 旧通路保持「有文字先用文字」 */
      var isFig = figList.indexOf(letter) >= 0;
      return {
        letter: letter, txt: txt, isFig: isFig, hit: hit,
        visual: !!(hit && (hit.kind === 'image' || hit.kind === 'vector'))
      };
    });
    if (!items.some(function (it) { return it.txt || it.visual; })) {
      return '<div class="drill-choices" role="group" aria-label="答案选项" data-choices="missing">' +
        '<p class="drill-choice-missing" style="padding:14px 16px;border:1px dashed var(--line);border-radius:10px;color:var(--sub);margin:0">' +
        '选项缺失：这道题的选项在原书里无法识别，本题暂不可作答。</p></div>';
    }
    var html = '<div class="drill-choices" role="group" aria-label="答案选项">';
    items.forEach(function (it) {
      var letter = it.letter, selected = current === letter;
      var inner, cls;
      if (it.txt && !(it.hit && it.hit.source === 'field')) {
        inner = window.TD_FIG ? window.TD_FIG.fmtMath(it.txt) : esc(it.txt);
        cls = '';
      } else if (it.hit && it.visual) {
        inner = it.hit.html;
        cls = it.hit.cls;
      } else if (it.hit && it.hit.kind === 'missing') {
        inner = it.hit.html;
        cls = it.hit.cls;
      } else {
        inner = '<span class="drill-choice-placeholder">图形或公式选项</span>';
        cls = it.isFig ? ' is-figure is-missing' : '';
      }
      html += '<div class="drill-choice-row" data-choice="' + letter + '">' +
        '<button type="button" class="drill-choice' + cls + (it.visual ? ' is-image-option' : '') +
        '" data-choice="' + letter + '" aria-pressed="' + selected +
        '"><span class="drill-choice-letter">' + letter + '</span>' +
        '<span class="drill-choice-text">' + inner + '</span>' +
        '<span class="drill-choice-check" aria-hidden="true">' + CHECK_ICON + '</span></button>' +
        (window.TD_CROSSOUT ? window.TD_CROSSOUT.buttonHtml(letter, window.TD_CROSSOUT.has(q.id, letter), false) : '') +
        '</div>';
    });
    return html + '</div>';
  }

  /* ---- 草稿板：薄雾层上自由涂画，答案区保持可直接填写（仅练习页，不含模考） ---- */
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
        '</div>' +
        '<canvas class="mist-canvas"></canvas>';
      document.body.appendChild(layer);
      canvas = layer.querySelector('.mist-canvas');
      ctx = canvas.getContext('2d');
      toolbar = layer.querySelector('.mist-toolbar');
      toolbar.addEventListener('click', function (e) {
        var b = e.target.closest('[data-tool]');
        if (!b) return;
        var tool = b.dataset.tool;
        if (tool === 'done') { close(); return; }
        if (tool === 'clear') { clear(); return; }
        mode = tool;
        toolbar.querySelectorAll('[data-tool]').forEach(function (x) {
          x.classList.toggle('on', x.dataset.tool === mode);
        });
      });
      canvas.addEventListener('pointerdown', function (e) {
        drawing = true; last = pos(e);
        canvas.setPointerCapture(e.pointerId);
        dot(last);
      });
      canvas.addEventListener('pointermove', function (e) {
        if (!drawing) return;
        var p = pos(e); line(last, p); last = p;
      });
      canvas.addEventListener('pointerup', function () { drawing = false; last = null; });
      canvas.addEventListener('pointercancel', function () { drawing = false; last = null; });
      window.addEventListener('resize', sizeCanvas);
      document.addEventListener('keydown', function (e) {
        if (open && e.key === 'Escape') close();
      });
    }
    function pos(e) {
      var r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function radius() { return mode === 'eraser' ? 18 : 3.5; }
    function applyStyle() {
      if (mode === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = mode === 'red' ? '#d63333' : '#1a1a1a';
      }
      ctx.lineWidth = radius();
    }
    function dot(p) {
      applyStyle();
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius() / 2, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    }
    function line(a, b) {
      applyStyle();
      ctx.beginPath();
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    function sizeCanvas() {
      if (!canvas) return;
      var dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    }
    function clear() {
      if (!ctx) return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    function openPad() {
      build(); sizeCanvas();
      layer.classList.add('show');
      document.body.classList.add('scratch-on');
      open = true;
    }
    function close() {
      if (!layer) return;
      layer.classList.remove('show');
      document.body.classList.remove('scratch-on');
      clear();
      open = false;
    }
    return {
      toggle: function () { open ? close() : openPad(); },
      clear: clear,
      isOpen: function () { return open; }
    };
  })();

  function renderAnswers() {
    var q = currentQuestion(), text = textFor(q), st = stateFor(section, false);
    var answer = st.answers[q.id], current = answer ? answer.v : '';
    els.answers.innerHTML = '';
    if (q.type === 'mcq') {
      els.answers.innerHTML = choiceMarkup(q, text.choices || {}, current);
      Array.prototype.forEach.call(els.answers.querySelectorAll('.drill-choice'), function (button) {
        button.addEventListener('click', function () { toggleChoice(button.dataset.choice); });
      });
      if (window.TD_CROSSOUT) window.TD_CROSSOUT.bind(els.answers, q.id, false);
      appendLineToggle(els.answers, q);
      return;
    }
    els.answers.innerHTML = '<div class="drill-gridin"><label for="gridAnswer">输入答案</label>' +
      '<input id="gridAnswer" type="text" value="' + esc(current) + '" autocomplete="off" spellcheck="false" inputmode="decimal" maxlength="6">' +
      '<p class="drill-input-warn" id="gridWarn" hidden></p></div>';
    var gridInput = $('gridAnswer'), gridWarn = $('gridWarn');
    /* 直接限制：负号不计入长度，正文最多 5 个字符；非法字符当场剔除 */
    function capGrid(v) {
      var neg = v.charAt(0) === '-' ? '-' : '';
      var body = neg ? v.slice(1) : v;
      body = body.replace(/[^0-9./]/g, '').slice(0, 5);
      return neg + body;
    }
    function refreshGridFeedback() {
      var s = gridInput.value.trim();
      var warn = '';
      if (s && /[^0-9.\/\-]/.test(s)) warn = '只能输入数字、小数点、斜杠和负号，不要带 %、$、逗号、字母或单位';
      else if (s && !/^-?(?:\d+(?:\.\d+)?|\.\d+|\d+\/\d+)$/.test(s)) warn = '格式无效：可写小数（如 0.75）或分数（如 3/4）';
      gridWarn.hidden = !warn;
      gridWarn.textContent = warn;
      gridInput.classList.toggle('is-invalid', !!warn);
    }
    gridInput.addEventListener('input', function (event) {
      var v = capGrid(event.target.value);
      if (v !== event.target.value) event.target.value = v;
      A.setAnswer(section, q.id, v.trim());
      refreshGridFeedback();
      setSaved();
    });
    refreshGridFeedback();
    appendLineToggle(els.answers, q);
  }
  function toggleChoice(letter) {
    var q = currentQuestion(), st = stateFor(section, false);
    var answer = st.answers[q.id], current = answer ? answer.v : '';
    A.setAnswer(section, q.id, current === letter ? '' : letter);
    setSaved();
    Array.prototype.forEach.call(els.answers.querySelectorAll('.drill-choice'), function (button) {
      var selected = button.dataset.choice === (current === letter ? '' : letter);
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    if (!els.nav.hidden) renderNavigator();
  }
  function setSaved() {
    els.save.textContent = '已保存到此设备';
    if (window.TD_SAVE) window.TD_SAVE.autosave();
  }
  function refreshSaveStatus() {
    if (!window.TD_SAVE) return;
    var st = window.TD_SAVE.inspect();
    if (st.status === 'ok') els.save.textContent = '作答自动保存';
    else if (st.status === 'corrupt' || st.status === 'version-mismatch')
      els.save.textContent = '存档异常 · 自动备份已接管';
    else els.save.textContent = '作答自动保存';
  }
  function updateMark() {
    var marked = !!stateFor(section, false).marks[currentQuestion().id];
    els.mark.setAttribute('aria-pressed', String(marked));
    els.mark.title = marked ? '取消标记' : '标记本题';
    els.markLabel.textContent = marked ? '已标记' : '标记';
  }
  /* A section is one self-contained block: navigation stays inside it and the
     last question leads to the result page instead of bleeding into the next
     section. No correctness is shown while answering. */
  function relativeTarget(direction) {
    if (direction < 0) {
      if (index > 0) return { sec: section, index: index - 1, label: '上一题' };
      return null;
    }
    if (index < questions.length - 1) return { sec: section, index: index + 1, label: '下一题' };
    return { finish: true, label: '完成本板块' };
  }
  function updateFooter() {
    var previous = relativeTarget(-1), next = relativeTarget(1);
    var boardLink = document.querySelector('#questionView .drill-context-link');
    if (boardLink) boardLink.href = boardUrl(section);
    setExit(boardUrl(section), true);
    els.footerSection.textContent = A.sectionLabel(section);
    els.currentSection.textContent = A.sectionLabel(section);
    els.position.textContent = '第 ' + (index + 1) + ' / ' + questions.length + ' 题';
    els.number.textContent = String(index + 1);
    /* 板块内标题带板块名（页签/分享卡能看出在哪一板块）；题号不进标题，
       逐题改标题会让标题栏闪。 */
    var curQ = questions[index];
    var unitCn = curQ && A.unit ? (A.unit(curQ.unit) || {}).cn : '';
    document.title = PAGE_TITLE + (unitCn ? ' · U' + curQ.unit + ' ' + unitCn : '') + ' · ' + A.sectionLabel(section);
    [els.previous, els.next].forEach(function (button, n) {
      var target = n ? next : previous;
      button.disabled = !target;
      button.dataset.sec = target && !target.finish ? target.sec : '';
      button.dataset.index = target && !target.finish ? String(target.index) : '';
      button.dataset.finish = target && target.finish ? '1' : '';
      button.querySelector('.drill-nav-label').textContent = target ? target.label : (n ? '下一题' : '上一题');
    });
  }
  function render() {
    var q = currentQuestion(), text = textFor(q);
    els.stem.innerHTML = window.TD_FIG ? window.TD_FIG.fmtMath((text.stem || q.stem || '题干文字暂缺。').trim() || '题干文字暂缺。') : esc((text.stem || q.stem || '题干文字暂缺。').trim() || '题干文字暂缺。');
    scratchPad.clear();
    updateFooter(); renderAnswers(); updateMark(); refreshSaveStatus();
    insertFigure(q); // geometry figure block (inserted before #answerArea)
  }
  function insertFigure(q) {
    var old = els.question.querySelector('.td-figure');
    if (old) old.remove();
    if (!window.TD_FIG) return;
    var fig = window.TD_FIG.showFigure(q);
    if (!fig) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = fig;
    els.question.insertBefore(wrap.firstChild, els.answers);
  }
  function appendLineToggle(area, q) {
    if (!window.TD_FIG || !window.TD_FIG.hasLine(q)) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'td-line-toggle';
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = '查看图形答案 · Show graph answer';
    var box = document.createElement('div');
    box.className = 'td-lineanswer';
    box.hidden = true;
    area.appendChild(btn);
    area.appendChild(box);
    btn.addEventListener('click', function () {
      var open = box.hidden;
      box.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      if (open && !box.dataset.filled) {
        box.innerHTML = window.TD_FIG.lineAnswer(q);
        box.dataset.filled = '1';
      }
    });
  }
  function renderNavigator() {
    var st = stateFor(section, false);
    els.navTitle.textContent = A.sectionLabel(section);
    els.grid.innerHTML = questions.map(function (item, n) {
      var answered = st.answers[item.id] && String(st.answers[item.id].v).trim() !== '';
      var marked = !!st.marks[item.id], current = n === index;
      var label = '第 ' + (n + 1) + ' 题，' + (answered ? '已答' : '未答') + (marked ? '，已标记' : '') + (current ? '，当前题' : '');
      return '<button type="button" class="' + (answered ? 'is-answered' : '') + (marked ? ' is-marked' : '') +
        (current ? ' is-current' : '') + '" data-index="' + n + '" aria-label="' + esc(label) + '"' +
        (current ? ' aria-current="step"' : '') + '>' + (n + 1) + '</button>';
    }).join('');
  }
  function openNavigator() {
    navOpener = document.activeElement;
    renderNavigator();
    els.nav.hidden = false;
    document.body.classList.add('drill-nav-open');
    var current = els.grid.querySelector('.is-current') || els.grid.querySelector('button');
    if (current) current.focus();
  }
  function closeNavigator(restoreFocus) {
    els.nav.hidden = true;
    document.body.classList.remove('drill-nav-open');
    if (restoreFocus && navOpener) navOpener.focus();
  }

  /* ---------------- wiring ---------------- */
  els.previous.addEventListener('click', function () {
    if (!els.previous.disabled) applyQuestion(els.previous.dataset.sec, parseInt(els.previous.dataset.index, 10), false, true);
  });
  els.next.addEventListener('click', function () {
    if (els.next.disabled) return;
    if (els.next.dataset.finish === '1') { finishSection(); return; }
    applyQuestion(els.next.dataset.sec, parseInt(els.next.dataset.index, 10), false, true);
  });
  els.finish.addEventListener('click', function () { closeNavigator(false); finishSection(); });
  els.positionButton.addEventListener('click', openNavigator);
  els.nav.addEventListener('click', function (event) {
    if (event.target === els.nav || event.target.hasAttribute('data-nav-close')) closeNavigator(true);
  });
  els.grid.addEventListener('click', function (event) {
    var button = event.target.closest('button[data-index]');
    if (!button) return;
    closeNavigator(false);
    applyQuestion(section, parseInt(button.dataset.index, 10), false, true);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !els.nav.hidden) closeNavigator(true);
    if (event.repeat || els.questionView.hidden || !section || !questions.length) return;
    var letter = window.TD_CROSSOUT && window.TD_CROSSOUT.keyLetter(event);
    if (!letter || window.TD_CROSSOUT.isEditableTarget(event.target) || scratchPad.isOpen()) return;
    var q = currentQuestion();
    if (!q || q.type !== 'mcq') return;
    var row = els.answers.querySelector('.drill-choice-row[data-choice="' + letter + '"]');
    if (!row) return;
    event.preventDefault();
    window.TD_CROSSOUT.toggleRow(row, q.id, letter);
  });
  els.mark.addEventListener('click', function () {
    A.toggleMark(section, currentQuestion().id);
    setSaved(); updateMark();
    if (!els.nav.hidden) renderNavigator();
  });
  function routeFromUrl() {
    var p = new URLSearchParams(location.search);
    if (p.get('result') === '1' && A.CATALOG[p.get('sec')]) { renderResult(p.get('sec')); return; }
    if (p.get('board') === 'special') { renderLanding('special'); return; }
    if (p.get('topic') === '1' || p.get('special') === '1') {
      selectedUnit = parseInt(p.get('unit'), 10) ||
        (p.get('topic') === '1' ? 3 : (p.get('special') === '1' ? 1 : 0));
      renderSpecialView(); return;
    }
    if (p.get('board') === 'unit' || (p.get('unit') && !p.get('sec'))) {
      renderLanding('unit'); return;
    }
    if (!p.get('sec') || !A.CATALOG[p.get('sec')]) { renderLanding(); return; }
    var target = readLocation();
    showView('question');
    applyQuestion(target.sec, target.index, true, true);
  }
  window.addEventListener('popstate', function () {
    try { routeFromUrl(); } catch (e) { fatalLoadError(); }
  });

  /* Back/forward cache must not leave a stale view on the main page.
     注意：board=special / board=unit 的 URL 实际渲染的是落地页(selectView)，
     bfcache 恢复时必须回到落地页并重新渲染（刷新板块统计）；
     旧映射把 board=special 指到从未渲染过的 specialView，导致返回键后出现
     "专项训练空列表"的空骨架页（2026-11-23 修复）。 */
  window.addEventListener('pageshow', function (event) {
    if (!event.persisted) return;
    var p = new URLSearchParams(location.search);
    if (p.get('result') === '1' && A.CATALOG[p.get('sec')]) { showView('result'); return; }
    if (p.get('topic') === '1' || p.get('special') === '1') { showView('special'); return; }
    if (p.get('board') === 'special' || p.get('board') === 'unit' || (p.get('unit') && !p.get('sec'))) {
      renderLanding(p.get('board') === 'special' ? 'special' : 'unit');
      return;
    }
    if (p.get('sec') && A.CATALOG[p.get('sec')]) { showView('question'); return; }
    showView('select');
  });

  els.scratch.addEventListener('click', scratchPad.toggle);
  U.bindTools({ reference: 'btnReference', calculator: 'btnCalculator', allowCalculator: true });
  // 计算器默认隐藏，进入题目后按板块与设置决定（单元练习可由设置开关打开）
  (function () { var c = $('btnCalculator'); if (c) c.hidden = true; })();
  applyCalcVisibility();
  try {
    window.addEventListener('td:prefs', function () { applyCalcVisibility(); });
  } catch (e) { console.warn('监听计算器偏好失败', e); }
  /* Manual "save / restore" buttons were removed: every answer is auto-saved
     to disk (and the desktop shell mirrors it every 5s). No user action needed. */
  A.nav('drill');

  try {
    if (inResultView) {
      renderResult(resultSec);
    } else if (inQuestionView) {
      showView('question');
      var initial = readLocation();
      applyQuestion(initial.sec, initial.index, true, false);
    } else {
      routeFromUrl();
    }
  } catch (e) { fatalLoadError(); }
})();