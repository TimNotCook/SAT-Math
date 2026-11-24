/* TD SAT Math · Bluebook 1:1 shell
   Presentation-only layer: reshapes the existing DOM into the College Board
   Bluebook question screen (header + tool labels). No answer/grading logic.
   Runs on drill.html and exam.html; only touches the active answering state. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  /* 题号导航必须高于答案区（答案区 z-index:65），否则选项卡片会盖住弹层；
     仍低于草稿画布(70)与草稿工具栏(71)，不会挡住书写工具。 */
  function injectNavLayer() {
    var ID = 'td-nav-layer-fix';
    if (document.getElementById(ID)) return;
    var st = document.createElement('style');
    st.id = ID;
    st.textContent = '#questionNav{z-index:68!important}';
    document.head.appendChild(st);
  }

  function isDrillQuestion() {
    var q = $('questionView'), p = new URLSearchParams(location.search);
    return q && !q.hidden && !!(p.get('sec'));
  }
  function isExamQuestion() {
    var s = $('stage-answer');
    return !!(s && !s.hidden);
  }

  var REF_ICON = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>';
  var EXIT_ICON = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>';

  function setText(el, txt) { if (el) el.textContent = txt; }

  /* 板块名统一排版：「1.1 · 线性方程与函数图像」→「1.1 线性方程与函数图像」。
     官方页签（Section 2, Module 1: Math 之类）保持原样。 */
  function sectionText(raw) {
    var s = String(raw || '').trim();
    if (!s || /^Section\s/i.test(s) || /^UNIT\s/i.test(s)) return s;
    return s.replace(/\s*·\s*/g, ' ').replace(/\s+/g, ' ');
  }

  function dressDrill() {
    var bar = document.querySelector('#questionView .drill-context-inner');
    if (!bar || bar.dataset.bb) return;
    bar.dataset.bb = '1';

    var left = bar.querySelector('.drill-context-left');
    if (left) {
      var title = left.querySelector('.drill-context-title');
      setText(title, 'Math');
      var sec = left.querySelector('#currentSection');
      if (sec) {
        /* 真实板块名由 drill.js 写入，这里只统一排版；不再覆写成通用的
           "Section 2, Module 1: Math"（那是外壳硬编码，丢掉了板块。 */
        setText(sec, sectionText(sec.textContent));
        if (sec.classList) sec.classList.add('exam-context-meta');
      }
    }

    // Practice is untimed — no timer capsule, no PRACTICE TEST band.

    var right = bar.querySelector('.drill-context-right');
    if (right) {
      /* 复用题库页原有的 Reference 按钮，直接搬进工具簇。不能再新建一个：
         旧逻辑把原按钮改名 btnReferenceOld 留在一旁，CSS 的隐藏规则
         只认 #btnReference，于是题面上出现两个 Reference。 */
      var oldRef = $('btnReference');
      var tools = document.createElement('div');
      tools.className = 'bb-toolcluster';
      var exitBtn = document.createElement('button');
      exitBtn.type = 'button';
      exitBtn.className = 'bb-tool';
      exitBtn.id = 'btnBbExit';
      exitBtn.innerHTML = EXIT_ICON + '<span>退出</span>';
      if (oldRef) {
        oldRef.classList.add('bb-tool');
        var icon = oldRef.querySelector('svg');
        if (icon) { icon.setAttribute('width', '15'); icon.setAttribute('height', '15'); }
        tools.appendChild(oldRef);
      }
      tools.appendChild(exitBtn);
      right.className = 'drill-context-right bb-tools';
      right.innerHTML = '';
      right.appendChild(tools);
      // 退出 = back to the section list (no site nav in test mode)
      exitBtn.addEventListener('click', function () {
        var p = new URLSearchParams(location.search);
        location.href = 'drill.html' + (p.get('unit') ? '?unit=' + encodeURIComponent(p.get('unit')) : '');
      });
    }

    setText($('markLabel'), 'Mark for Review');
    dressFooter();
  }

  function dressFooter() {
    // drill.js rewrites the mark label to Chinese on each render; keep official wording.
    var ml = $('markLabel');
    if (ml && (ml.textContent === '标记' || ml.textContent === '已标记')) {
      var btn = $('btnMark');
      ml.textContent = (btn && btn.getAttribute('aria-pressed') === 'true') ? 'Marked for Review' : 'Mark for Review';
    }
    var pos = $('questionPosition');
    if (pos && /^\s*第\s/.test(pos.textContent)) {
      var m = pos.textContent.match(/(\d+)\s*\/\s*(\d+)/);
      if (m) pos.textContent = 'Question ' + m[1] + ' of ' + m[2];
    }
    Array.prototype.forEach.call(document.querySelectorAll('.drill-page-button .drill-nav-label'), function (n) {
      if (n.textContent === '上一题') n.textContent = 'Back';
      if (n.textContent === '下一题') n.textContent = 'Next';
      if (n.textContent === '完成本板块') n.textContent = 'Submit';
    });
  }

  function dressExam() { dressFooter(); }

  // Keep English labels after the app re-renders them on every question change.
  function watchPosition() {
    var pos = $('questionPosition');
    if (!pos || pos.dataset.bbWatch) return;
    pos.dataset.bbWatch = '1';
    var last = pos.textContent;
    var ob = new MutationObserver(function () {
      if (pos.textContent !== last) { last = pos.textContent; dressFooter(); }
    });
    ob.observe(pos, { childList: true, subtree: true, characterData: true });
  }

  /* 板块名由 drill.js 每次渲染写入，外壳先跑一次可能还读不到；
     这里做一次性观察，写入后立刻把中间的「·」统一掉。只改自己那一格文本。 */
  function watchSection() {
    var sec = $('currentSection');
    if (!sec || sec.dataset.bbWatch) return;
    sec.dataset.bbWatch = '1';
    var last = sec.textContent;
    var ob = new MutationObserver(function () {
      var now = sec.textContent;
      if (now === last) return;
      var fixed = sectionText(now);
      last = fixed;
      if (fixed !== now) sec.textContent = fixed;
    });
    ob.observe(sec, { childList: true, subtree: true, characterData: true });
  }

  function init() {
    injectNavLayer();
    if (isDrillQuestion()) { dressDrill(); watchPosition(); watchSection(); }
    else if (isExamQuestion()) { dressExam(); watchPosition(); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.TD_BB_SHELL = { init: init };
})();
