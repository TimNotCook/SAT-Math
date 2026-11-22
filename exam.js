/* TD SAT Math · Exam Suite engine
   Independent page / independent storage. The original index.html + app.js +
   question bank are READ ONLY. Nothing in this file writes tdsat_state_v1. */
(function () {
  'use strict';
  const BANK = window.TD_BANK.questions, UNITS = window.TD_BANK.units, C = window.TD_EXAM_CORE, O = C.OFFICIAL;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const byId = id => BANK.find(q => q.id === id);
  /* Choice letters for a question. Source is the text-layer choices object
     (its keys, e.g. A/B/C/D). Falls back to the standard four letters so a
     question with an empty/incomplete text layer still renders clickable
     options instead of throwing (the old `O.choices` reference was undefined). */
  const optLetters = id => {
    const c = (window.TD_TEXT || {})[id], ch = (c && c.choices) || {};
    const ks = Object.keys(ch);
    return ks.length ? ks : ['A', 'B', 'C', 'D'];
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // Bluebook-style MM:SS clock — minutes are never wrapped into hours (70 min => "70:00").
  const fmt = ms => { const s = Math.max(0, Math.round(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  const KEY_SESSION = 'tdsat_exam_suite_session_v1', KEY_RESULTS = 'tdsat_exam_suite_results_v1', KEY_OLD = 'tdsat_state_v1';
  /* Per-unit opt-in for the 专项练习 / 专项复习 blocks, and the previous
     paper's ids so a fresh sitting never repeats the same questions. */
  const KEY_SPECIAL = 'tdsat_exam_special_v1';
  const KEY_LAST_PAPER = 'tdsat_exam_last_paper_v1';
  const QP = new URLSearchParams(location.search);
  const MODE_REQUESTED = QP.get('mode');
  if (MODE_REQUESTED !== 'mock' && MODE_REQUESTED !== 'quiz') { location.replace('drill.html'); return; }
  const MODE = MODE_REQUESTED;
  let QUIZ_UNIT = clamp(parseInt(QP.get('unit'), 10) || 1, 1, 4);

  const MODE_NAME = { mock: 'SAT 数学全真模考', quiz: '单元抽查' };
  const OFFICIAL = MODE === 'mock';               // only the official mock may use Desmos
  document.querySelectorAll('.exam-modules a').forEach(a => {
    const on = a.dataset.module === MODE;
    a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page');
  });
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); if (window.TDSync) try { window.TDSync.notify(k); } catch (e2) { console.warn('同步通知未生效', e2); } } catch (e) { console.warn('保存会话失败', e); } };
  const load = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  /* Rendered stem, used only for diagnostic feature detection. The exam core
     stays DOM-free; it never changes the text shown to the student. */
  const stemOf = q => {
    const t = (window.TD_TEXT || {})[q && q.id];
    return (t && t.stem) || (q && q.stem) || '';
  };
  function specialFlags() {
    let d = {};
    try { d = JSON.parse(localStorage.getItem(KEY_SPECIAL)) || {}; } catch (e) { d = {}; }
    const out = {};
    UNITS.forEach(u => { out[u.id] = !!d[u.id]; });
    return out;
  }
  function writeSpecialFlags(flags) { save(KEY_SPECIAL, flags); }
  function lastPaperIds() {
    const d = load(KEY_LAST_PAPER);
    return (d && Array.isArray(d.ids)) ? d.ids : [];
  }
  function rememberPaper(paper) {
    save(KEY_LAST_PAPER, { mode: MODE, ids: (paper || []).map(x => x.id), ts: Date.now() });
  }
  /* The paper pool: all textbook questions plus the special-practice blocks of
     units the learner explicitly opted into. */
  function paperBank() { return C.examBank(BANK, specialFlags()); }
  function paperOpts() { return { stemOf: stemOf, avoidIds: lastPaperIds() }; }
  /* Imported wrong questions that matched the bank join the quiz's priority
     pool. Unmatched imports are not part of any unit bank, so they can only
     live in the wrong notebook and never enter quiz drawing. */
  const IMPORT_KEY = 'tdsat_imported_wrong_v1';
  function importedWrongIds(unitId) {
    let d;
    try { d = JSON.parse(localStorage.getItem(IMPORT_KEY)) || {}; } catch (e) { return []; }
    const ids = [];
    (d.items || []).forEach(it => {
      const id = it && (it.matchId || it.id);
      const q = id && byId(String(id));
      if (q && q.unit === unitId && ids.indexOf(q.id) < 0) ids.push(q.id);
    });
    return ids;
  }
  function oldState() {
    const s = load(KEY_OLD) || {};
    return { settings: Object.assign({ tmode: 'official', perQ: 95, total: 35, count: 22, order: 'mixed' }, s.settings || {}),
             wrong: s.wrong || {}, done: s.done || {}, history: s.history || [] };
  }
  /* Practice answers live in tdsat_app_v1, one independent section each.
     wrong.html counts a question as a mistake when ANY section holds an answer
     with correct===false, and treats it as corrected as soon as ANY section
     holds a correct===true answer for the same id. Mirror that exact rule here
     so the quiz intro and the wrong notebook can never disagree. Imported
     (JSON / PDF) mistakes are stored in those same section answers and are
     therefore included too. */
  const KEY_APP = 'tdsat_app_v1';
  function practiceMistakes() {
    const wrongIds = [], correctedIds = [], meta = {}, seenWrong = {}, seenCorrected = {};
    const app = load(KEY_APP);
    const sections = (app && app.sections && typeof app.sections === 'object') ? app.sections : {};
    Object.keys(sections).forEach(sec => {
      const answers = sections[sec] && sections[sec].answers;
      if (!answers || typeof answers !== 'object') return;
      Object.keys(answers).forEach(id => {
        const a = answers[id];
        if (!a || !byId(id)) return;                 // only bank questions can enter the quiz pool
        if (a.correct === true && !seenCorrected[id]) { seenCorrected[id] = true; correctedIds.push(id); }
        if (a.correct === false) {
          if (!seenWrong[id]) { seenWrong[id] = true; wrongIds.push(id); }
          if (!meta[id] || (a.ts || 0) > (meta[id].ts || 0)) meta[id] = { v: a.v == null ? '' : String(a.v), ts: a.ts || 0 };
        }
      });
    });
    return { wrongIds, correctedIds, meta };
  }
  /* Historical mistakes = original practice notebook + mistakes produced by this
     suite + current practice answers (tdsat_app_v1). Original state is never
     mutated; a later correct practice answer removes the mistake. */
  function mergedState() {
    const base = oldState(), w = {};
    Object.keys(base.wrong).forEach(id => { w[id] = Object.assign({}, base.wrong[id]); });
    (load(KEY_RESULTS) || []).forEach(r => (r.detail || []).forEach(d => {
      if (d.correct) return;
      const x = w[d.id] || (w[d.id] = { count: 0 });
      x.count = (x.count || 0) + 1; x.last = r.date || x.last;
    }));
    const pm = practiceMistakes();
    pm.wrongIds.forEach(id => {
      const x = w[id] || (w[id] = { count: 0 });
      x.count = (x.count || 0) + 1;                 // never overwrite an existing field
      const m = pm.meta[id] || {};
      if (x.given == null && m.v) x.given = m.v;
      if (x.last == null && m.ts) x.last = m.ts;
    });
    pm.correctedIds.forEach(id => { delete w[id]; });  // same correction rule as wrong.html
    base.wrong = w;
    base.correctedIds = pm.correctedIds;
    return base;
  }

  let S = null, ticker = null, resultTab = 'all', lastQTs = Date.now(), navOpener = null;
  /* The stage a saved session is allowed to reveal. It stays null until the
     Start/测试 button is clicked, so a page load, refresh or module switch can
     never show answer / review / submit / result content on the main screen. */
  let resumeStage = null, startClicked = false;
  /* Snapshot of the session as last observed on disk. Writes re-read the disk
     and replay only locally changed fields on top of it, so a stale tab can
     never erase answers/results another tab just saved under the same key. */
  let BASE = 'null';
  const snap = x => { try { return String(JSON.stringify(x)); } catch (e) { return 'null'; } };
  function adopt(next) { S = next; BASE = snap(S); }

  /* =====================================================================
     Session construction
     ===================================================================== */
  function newSession() {
    const st = mergedState(), cfg = st.settings;
    const s = {
      mode: MODE, sub: null, unitId: QUIZ_UNIT, stage: 'intro',
      paper: [], answers: {}, idx: 0, module: 1, path: null,
      m1Size: 0, m2Options: null, durationSec: 0, startedAt: 0, endsAt: 0, moduleEndsAt: 0,
      finished: false, locked: false, auto: false, endReason: '', result: null,
      plan: null, quizMeta: null, cfg: { tmode: cfg.tmode, perQ: cfg.perQ, total: cfg.total, count: cfg.count, order: cfg.order }
    };
    const pb = paperBank(), opts = paperOpts();
    if (MODE === 'mock') {
      const p = C.buildFullPaper(pb, Math.random, opts);
      const mk = (list, m) => list.map((q, i) => ({ uid: 'M' + m + '-' + String(i + 1).padStart(2, '0'), id: q.id, module: m, from: 'official', repeat: 1 }));
      s.paper = mk(p.module1, 1);
      s.m1Size = 22;
      s.m2Options = { hard: mk(p.module2.hard, 2), easy: mk(p.module2.easy, 2) };
      s.durationSec = O.totalSeconds;
      s.diagnostic = p.diagnostic;
    } else {
      const uq = pb.filter(q => q.unit === QUIZ_UNIT);
      /* Imported mistakes are placed first. Every existing tier already
         reserves at least ceil(total/3) wrong slots, so imported items are
         always prioritised and are all included while their count is below
         that share. Tier quantities themselves stay unchanged. */
      const imported = importedWrongIds(QUIZ_UNIT).filter(id => (st.correctedIds || []).indexOf(id) < 0);
      const historic = C.unitWrongIds(BANK, st, QUIZ_UNIT).filter(id => imported.indexOf(id) < 0);
      const wrongIds = imported.concat(historic);
      const plan = C.quizPlan(wrongIds, uq);
      const built = C.buildQuizPaper(pb, uq, plan, st, Math.random, opts);
      s.paper = built.instances.map(x => ({ uid: x.uid, id: x.id, module: 1, from: x.from, repeat: x.repeat }));
      s.plan = plan;
      s.quizMeta = { summary: built.summary, weakTopics: built.weakTopics.map(w => ({ key: w.key, topic: w.topic, count: w.count, ids: w.ids })), bankSize: plan.bankSize };
      s.durationSec = C.practiceDurationSec(s.cfg, plan.total);
      s.diagnostic = built.diagnostic;
    }
    s.paper.forEach(x => { s.answers[x.uid] = { v: '', marked: false, spent: 0, locked: false }; });
    return s;
  }
  function startSession() {
    /* Explicit Start click: this is the ONLY trigger that reveals test content. */
    startClicked = true;
    if (resumeStage) {
      const target = resumeStage;
      resumeStage = null;
      S.stage = target;
      setStage(target);
      if (target === 'result') { renderResult(); }
      else if (target === 'review') { renderReview(); startTicker(); }
      else if (target === 'submit') { renderSubmit(); startTicker(); }
      else { renderAll(); startTicker(); }
      lastQTs = Date.now();
      if (!OFFICIAL && !S.finished) toast('计时继续，不可暂停或重置');
      return;
    }
    S.startedAt = Date.now();
    S.endsAt = S.startedAt + S.durationSec * 1000;                 // absolute, never reset
    S.moduleEndsAt = S.startedAt + Math.min(O.secondsPerModule, S.durationSec) * 1000;
    S.stage = 'answer'; S.idx = 0;
    persist();
    /* Record this sitting's ids so the NEXT fresh paper is guaranteed to be a
       different set of questions (the engine excludes them when possible). */
    rememberPaper(S.paper);
    lastQTs = Date.now();
    setStage('answer'); renderAll(); startTicker();
    if (!OFFICIAL) toast('计时开始，不可暂停或重置');
  }
  function restoreOrIntro() {
    const saved = load(KEY_SESSION);
    if (saved && saved.mode === MODE && saved.paper && saved.paper.length && saved.endsAt) {
      adopt(saved);
      lastQTs = Date.now();
      resumeStage = saved.finished && saved.result ? 'result'
        : (saved.stage && saved.stage !== 'intro' ? saved.stage : 'answer');
      /* Always land on the short main page. Answers, marks and the absolute
         endsAt stay stored; the wall-clock timer keeps running in the
         background without any test content being rendered. */
      showStage('intro');           // also hides the timer group
      renderIntro();
      /* Do not write the stored remaining time while on the start page:
         the countdown is revealed only by the Start click. */
      return true;
    }
    resumeStage = null;
    adopt(newSession()); renderIntro(); setStage('intro'); return false;
  }
  function startTicker() {
    clearInterval(ticker); ticker = setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    tick();
  }
  function tick() {
    if (!S || !S.startedAt || S.finished) return;   // main page keeps its preset clock
    const now = Date.now();
    const left = S.endsAt - now;
    // Official: every module has its own hard 35-minute limit. When it expires,
    // Module 1 auto-advances (answers locked) and Module 2 auto-submits.
    if (MODE === 'mock' && now >= S.moduleEndsAt) {
      if (S.module === 1) enterModule2(); else finalize(true, 'time');
      return;
    }
    const modLeft = Math.max(0, Math.min(left, S.moduleEndsAt - now));
    const main = $('clockText');
    if (main) {
      // Bluebook counts down the current module, not the whole section.
      main.textContent = document.body.classList.contains('clock-hidden') && modLeft > 5 * 60 * 1000
        ? '••:••' : fmt(MODE === 'mock' ? modLeft : left);
      $('clockLabel').textContent = 'Time Remaining';
      $('clockBox').classList.toggle('warn', modLeft <= 5 * 60 * 1000);
      $('tbTotal').textContent = MODE === 'mock'
        ? 'Section 2 of 2 · Math · Module ' + S.module + ' of 2'
        : 'Unit ' + QUIZ_UNIT + ' · ' + fmt(Math.max(0, now - S.startedAt)) + ' elapsed';
      const warn = modLeft <= 5 * 60 * 1000 && modLeft > 0;
      $('btnHideTimer').disabled = warn;              // official: timer cannot be hidden in the last 5 minutes
      if (warn && !tick.warned) {
        tick.warned = true;
        toast(MODE === 'mock' ? 'You have 5 minutes remaining in Module ' + S.module + '.' : '剩余 5 分钟。');
      }
      if (!warn) tick.warned = false;
    }
    if (left <= 0) finalize(true, 'time');
  }

  /* =====================================================================
     Stage machine
     ===================================================================== */
  const STAGE_LABEL = { intro: 'START', answer: 'ANSWER', review: 'REVIEW', submit: 'SUBMIT', result: 'RESULT' };
  /* Single source of truth for visibility: the `hidden` attribute is a hard
     guarantee, so even if a stylesheet is missing the other stages cannot leak. */
  function showStage(name) {
    document.querySelectorAll('.stage').forEach(v => {
      const on = v.id === 'stage-' + name;
      v.classList.toggle('active', on);
      v.hidden = !on;
    });
    /* The timer belongs to the test, not the start page. Same hard `hidden`
       guarantee as the stages, so a page load, refresh, module switch or
       bfcache restore can never leak the remaining time on the main screen. */
    const clockGroup = document.querySelector('.exam-clock-group');
    if (clockGroup) clockGroup.hidden = name === 'intro';
    /* 计算器只在答题阶段出现；抽查与模考均可用，其它阶段收起。 */
    const calcBtn = $('btnCalculator');
    if (calcBtn) calcBtn.hidden = name !== 'answer';
    $('tbStage').textContent = STAGE_LABEL[name] || name.toUpperCase();
    $('contextTitle').textContent = MODE === 'mock' ? 'Math' : MODE_NAME[MODE];
    $('tbSection').textContent = MODE === 'mock'
      ? 'Section 2, Module ' + S.module + ': Math'
      : 'Unit ' + QUIZ_UNIT + ' · 单元抽查';
  }
  function setStage(name) {
    S.stage = name;
    showStage(name);
    persist();
  }

  /* =====================================================================
     INTRO — per-unit special-practice opt-in
     ===================================================================== */
  function renderSpecialOptions() {
    const host = $('introOptions');
    if (!host) return;
    /* 官方模考 (official) 使用完整官方卷，不设专项练习开关；
       清空抽查模式才有的“组卷范围”面板，避免泄漏到模考开场页。 */
    if (OFFICIAL) { host.innerHTML = ''; return; }
    const flags = specialFlags();
    const rows = UNITS.map(u => {
      const n = BANK.filter(q => q.unit === u.id && C.isSpecialQuestion(q)).length;
      if (!n) return '';
      return '<label class="exam-special-chip' + (flags[u.id] ? ' on' : '') + '">' +
        '<input type="checkbox" data-special-unit="' + u.id + '"' + (flags[u.id] ? ' checked' : '') + '>' +
        '<span>U' + u.id + ' 专项练习</span><small>' + n + ' 题</small></label>';
    }).filter(Boolean).join('');
    host.innerHTML = '<section class="exam-special-panel">' +
      '<div class="exam-special-head">组卷范围</div>' +
      '<div class="exam-special-chips">' + rows + '</div>' +
      '</section>';
    host.querySelectorAll('[data-special-unit]').forEach(cb => cb.addEventListener('change', () => {
      const f = specialFlags();
      f[cb.dataset.specialUnit] = cb.checked;
      writeSpecialFlags(f);
      /* Only an unstarted paper may be rebuilt; a live/finished session keeps
         its paper so answers and timing are never invalidated mid-test. */
      if (startClicked || resumeStage || (S && S.startedAt)) { renderSpecialOptions(); return; }
      resumeStage = null;
      try { localStorage.removeItem(KEY_SESSION); } catch (e) { console.warn('清除本地会话失败', e); }
      adopt(newSession());
      renderIntro();
    }));
  }

  function renderIntro() {
    const official = MODE === 'mock';
    $('introEyebrow').textContent = official ? 'SECTION 2, MODULE 1: MATH' : 'UNIT MASTERY CHECK';
    $('introTitle').textContent = official ? 'Math' : '单元抽查';
    /* 单元抽查说明小字做减法：整段删除；官方模考保留 Bluebook 原文 */
    $('introDesc').hidden = !official;
    if (!official) $('introDesc').textContent = '';
    else $('introDesc').textContent =
      'The digital SAT Math section has two modules. Each module has 22 questions and is timed separately.';
    $('btnStart').textContent = resumeStage === 'result'
      ? (official ? 'View Score Report' : '查看成绩报告')
      : (official ? 'Start' : '开始抽测');

    if (official) {
      $('introUnitPick').innerHTML = '';
      $('introParams').innerHTML = '<span>22 Questions</span><span>35 minutes</span><span>Module 1 of 2</span>';
      /* Start screen stays short; the verbatim DIRECTIONS live in the
         top-left Directions button of every question screen, as in Bluebook. */
      $('introDirections').innerHTML = '<div class="exam-start-directions">' +
        '<button type="button" id="btnIntroDirections">Directions</button>' +
        '<span>The questions in this section address a number of important math skills.</span></div>';
    } else {
      $('introDirections').innerHTML = '';
      $('introUnitPick').innerHTML = '<div class="exam-pick-label">选择单元</div><div class="unit-pick">' +
        UNITS.map(u => `<button data-unit="${u.id}" class="${u.id === QUIZ_UNIT ? 'on' : ''}">U${u.id}<br>${esc(u.cn)}</button>`).join('') + '</div>';
      $('introUnitPick').querySelectorAll('[data-unit]').forEach(b => b.addEventListener('click', () => {
        QUIZ_UNIT = +b.dataset.unit;
        /* Choosing another unit starts a clean paper; drop any saved session so
           the next Start click cannot reveal a stale stage. */
        resumeStage = null;
        try { localStorage.removeItem(KEY_SESSION); } catch (e) { console.warn('清除本地会话失败', e); }
        adopt(newSession()); renderIntro();
        const url = new URL(location.href); url.searchParams.set('unit', QUIZ_UNIT);
        try { history.replaceState({}, '', url.href); } catch (e) { console.warn('更新地址栏失败', e); }
      }));
      const t = S.plan;
      /* Show the TOTAL historical mistake count (same number the wrong
         notebook shows), not the "must draw" quota. When the quota is smaller
         explain it in a tooltip instead of adding a fourth span. */
      const histTitle = t.mustWrong < t.wrongCount
        ? ' title="本卷优先抽测其中 ' + t.mustWrong + ' 道"' : '';
      $('introParams').innerHTML = '<span>' + t.total + ' 题</span><span>' + fmt(S.durationSec * 1000) +
        '</span><span' + histTitle + '>历史错题 ' + t.wrongCount + ' 道</span>';
    }
    renderSpecialOptions();
    $('clockText').textContent = fmt((official ? O.secondsPerModule : S.durationSec) * 1000);
    $('clockLabel').textContent = 'Time Remaining';
    $('tbTotal').textContent = official ? 'Section 2 of 2 · Math' : 'Unit ' + QUIZ_UNIT;
    $('bankCount').textContent = String(BANK.length);
  }

  /* =====================================================================
     INTRO live sync with the practice / mistake stores
     ===================================================================== */
  const MISTAKE_KEYS = [KEY_APP, KEY_OLD, KEY_RESULTS];
  function syncIntroPlan() {
    /* Only a fresh, never-started quiz intro may be recomputed. Started,
       finished, resumed or official-mock sessions must stay untouched. */
    if (OFFICIAL || startClicked || resumeStage || !S) return;
    if (S.stage !== 'intro' || S.startedAt) return;
    const fresh = newSession();
    if (snap(fresh.plan) === snap(S.plan)) return;   // plan really unchanged
    const disk = load(KEY_SESSION);
    adopt(fresh);
    renderIntro();
    /* Keep the shared session in step with the refreshed plan/paper, but never
       overwrite a session another tab has already started or finished. */
    if (!disk || (!disk.startedAt && !disk.finished)) {
      BASE = (disk && Array.isArray(disk.paper)) ? snap(disk) : 'null';
      persist();
    }
  }

  /* =====================================================================
     ANSWER
     ===================================================================== */
  function range() {
    if (MODE !== 'mock') return [0, S.paper.length - 1];
    return S.module === 1 ? [0, S.m1Size - 1] : [S.m1Size, S.paper.length - 1];
  }
  const cur = () => S.paper[S.idx];
  const curQ = () => byId(cur().id);
  const curA = () => S.answers[cur().uid];
  const isLocked = uid => S.locked || S.answers[uid].locked;
  function editableRange() { return range(); }

  const CHECK_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  function renderAll() { renderQuestion(); renderNavigator(); tick(); }
  function renderQuestion() {
    const inst = cur(), q = curQ(), a = curA(), [lo, hi] = range();
    const pos = S.idx - lo + 1, total = hi - lo + 1;
    const T = (window.TD_TEXT || {})[q.id] || {};
    const CH = T.choices || {};
    $('qStem').innerHTML = window.TD_FIG ? window.TD_FIG.fmtMath((T.stem || q.stem || '题干文字暂缺。').trim() || '题干文字暂缺。') : esc((T.stem || q.stem || '题干文字暂缺。').trim() || '题干文字暂缺。');
    // geometry figure block — inserted as a sibling before #answerArea.
    // renderQuestion runs on every choice click, so clear any prior figure first.
    (function () {
      const qEl = document.getElementById('question');
      const old = qEl.querySelector('.td-figure');
      if (old) old.remove();
      if (window.TD_FIG) {
        const fig = window.TD_FIG.showFigure(q);
        if (fig) {
          const w = document.createElement('div');
          w.innerHTML = fig;
          qEl.insertBefore(w.firstChild, document.getElementById('answerArea'));
        }
      }
    })();
    $('qNum').textContent = String(pos);
    $('footerSection').textContent = MODE === 'mock' ? 'Section 2, Module ' + S.module + ' of 2' : MODE_NAME[MODE] + ' · Unit ' + QUIZ_UNIT;
    $('questionPosition').textContent = OFFICIAL ? 'Question ' + pos + ' of ' + total : '第 ' + pos + ' / ' + total + ' 题';

    const locked = isLocked(inst.uid), area = $('answerArea');
    area.innerHTML = '';
    if (q.type === 'mcq') {
      const figList = T.figure || [];
      const crops = (window.TD_CHOICE_CROPS && window.TD_CHOICE_CROPS[q.id]) || null;
      area.innerHTML = '<div class="drill-choices" role="radiogroup" aria-label="答案选项">' + optLetters(q.id).map(L => {
        const raw = (CH[L] || '').trim(), selected = a.v === L;
        const isFig = figList.indexOf(L) >= 0;
        const figSrc = (isFig && crops) ? crops[L] : null;
        const vecFig = (isFig && window.TD_FIG && window.TD_FIG.choiceGraph) ? window.TD_FIG.choiceGraph(q, L) : '';
        let disp, cls;
        if (raw) { disp = window.TD_FIG ? window.TD_FIG.fmtMath(raw) : esc(raw); cls = ''; }
        else if (vecFig) { disp = vecFig; cls = ' is-figure'; }
        else if (figSrc) { disp = '<img class="drill-choice-fig" src="' + figSrc + '" alt="选项 ' + L + '" onerror="var p=document.createElement(\'span\');p.className=\'drill-choice-placeholder\';p.textContent=\'图形暂缺\';this.replaceWith(p);">'; cls = ' is-figure'; }
        else { disp = '<span class="drill-choice-placeholder">图形或公式选项</span>'; cls = isFig ? ' is-figure is-missing' : ''; }
        return `<button type="button" class="drill-choice${cls}${selected ? ' is-selected' : ''}" data-choice="${L}" role="radio" aria-checked="${selected}" ${locked ? 'disabled' : ''}>` +
          `<span class="drill-choice-letter">${L}</span><span class="drill-choice-text">${disp}</span>` +
          `<span class="drill-choice-check" aria-hidden="true">${CHECK_ICON}</span></button>`;
      }).join('') + '</div>';
      area.querySelectorAll('.drill-choice').forEach(button => button.addEventListener('click', () => {
        if (isLocked(cur().uid)) return;
        curA().v = button.dataset.choice;
        persist(); renderQuestion(); renderNavigator();
      }));
    } else {
      area.innerHTML = '<div class="drill-gridin"><label for="gridAnswer">' +
        (OFFICIAL ? 'Answer' : '输入答案') + '</label>' +
        `<input id="gridAnswer" class="editable" type="text" value="${esc(a.v || '')}" autocomplete="off" spellcheck="false" inputmode="decimal" maxlength="6" ${locked ? 'disabled' : ''}>` +
        (OFFICIAL
          ? '<p class="drill-input-note"><button type="button" class="exam-spr-link">Student-produced response directions</button></p>'
          : '<p class="drill-input-note">可输入整数、小数或分数，例如 12、4.5 或 3/4。</p>') +
        '<p class="drill-input-warn" id="gridWarn" hidden></p></div>';
      const gridInput = $('gridAnswer'), gridWarn = $('gridWarn');
      /* 直接限制：负号不计入长度，正文最多 5 个字符；非法字符当场剔除 */
      const capGrid = v => {
        const neg = v.charAt(0) === '-' ? '-' : '';
        let body = neg ? v.slice(1) : v;
        body = body.replace(/[^0-9./]/g, '').slice(0, 5);
        return neg + body;
      };
      const refreshGridFeedback = () => {
        if (isLocked(cur().uid)) { gridWarn.hidden = true; gridInput.classList.remove('is-invalid'); return; }
        const s = gridInput.value.trim(); let warn = '';
        if (s && /[^0-9./\-]/.test(s)) warn = '只能输入数字、小数点、斜杠和负号，不要带 %、$、逗号、字母或单位';
        else if (s && !/^-?(?:\d+(?:\.\d+)?|\.\d+|\d+\/\d+)$/.test(s)) warn = '格式无效：可写小数（如 0.75）或分数（如 3/4）';
        gridWarn.hidden = !warn; gridWarn.textContent = warn;
        gridInput.classList.toggle('is-invalid', !!warn);
      };
      gridInput.addEventListener('input', event => {
        if (isLocked(cur().uid)) return;
        const v = capGrid(event.target.value);
        if (v !== event.target.value) event.target.value = v;
        curA().v = v; persist(); renderNavigator(); refreshGridFeedback();
      });
      refreshGridFeedback();
    }
    // line-graph answer toggle (collapsed by default; does not spoil the answer)
    if (window.TD_FIG && window.TD_FIG.hasLine(q)) {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'td-line-toggle';
      btn.setAttribute('aria-expanded', 'false');
      btn.textContent = '查看图形答案 · Show graph answer';
      const box = document.createElement('div');
      box.className = 'td-lineanswer'; box.hidden = true;
      area.appendChild(btn); area.appendChild(box);
      btn.addEventListener('click', () => {
        const open = box.hidden; box.hidden = !open;
        btn.setAttribute('aria-expanded', String(open));
        if (open && !box.dataset.filled) { box.innerHTML = window.TD_FIG.lineAnswer(q); box.dataset.filled = '1'; }
      });
    }
    $('btnMark').setAttribute('aria-pressed', String(!!a.marked));
    $('btnMark').disabled = locked;
    $('markLabel').textContent = OFFICIAL
      ? (a.marked ? 'Marked for Review' : 'Mark for Review')
      : (a.marked ? '已标记' : '标记');
    $('btnSubmit').textContent = OFFICIAL ? 'Submit' : '交卷';
    $('btnReview').textContent = OFFICIAL ? 'Review' : '检查';
    $('btnPrev').disabled = S.idx <= lo;
    $('btnNext').disabled = S.idx >= hi;
    $('btnPrev').querySelector('.drill-nav-label').textContent = OFFICIAL ? 'Back' : '上一题';
    $('btnNext').querySelector('.drill-nav-label').textContent = OFFICIAL ? 'Next' : '下一题';
  }
  function renderNavigator() {
    const [lo, hi] = range();
    $('questionNavTitle').textContent = OFFICIAL ? 'Question Menu' : '题目导航';
    let html = '';
    for (let i = lo; i <= hi; i++) {
      const inst = S.paper[i], a = S.answers[inst.uid];
      const answered = !!String(a.v || '').trim(), marked = !!a.marked, current = i === S.idx;
      const label = OFFICIAL
        ? 'Question ' + (i - lo + 1) + ', ' + (answered ? 'answered' : 'not answered') + (marked ? ', marked for review' : '') + (current ? ', current' : '')
        : '第 ' + (i - lo + 1) + ' 题，' + (answered ? '已答' : '未答') + (marked ? '，已标记' : '') + (current ? '，当前题' : '');
      html += `<button type="button" class="${answered ? 'is-answered' : ''}${marked ? ' is-marked' : ''}${current ? ' is-current' : ''}" data-i="${i}" aria-label="${esc(label)}"${current ? ' aria-current="step"' : ''}>${i - lo + 1}</button>`;
    }
    $('questionGrid').innerHTML = html;
  }
  function openNavigator() {
    navOpener = document.activeElement;
    renderNavigator();
    $('questionNav').hidden = false;
    document.body.classList.add('drill-nav-open');
    const current = $('questionGrid').querySelector('.is-current') || $('questionGrid').querySelector('button');
    if (current) current.focus();
  }
  function closeNavigator(restoreFocus) {
    $('questionNav').hidden = true;
    document.body.classList.remove('drill-nav-open');
    if (restoreFocus && navOpener) navOpener.focus();
  }
  function accumulateTime() {
    if (!S || !S.paper[S.idx]) return;
    const a = S.answers[S.paper[S.idx].uid];
    if (a && !S.finished) a.spent = (a.spent || 0) + Math.max(0, Date.now() - lastQTs);
    lastQTs = Date.now();
  }
  function goTo(i) {
    const [lo, hi] = range(); i = clamp(i, lo, hi);
    if (i === S.idx) return;
    accumulateTime(); S.idx = i; persist(); renderQuestion(); renderNavigator();
    window.scrollTo(0, 0);
  }
  /* Re-read the shared session before every write and replay only the fields
     this tab actually changed on top of it. A stale tab clicking Start can no
     longer erase the answers / score report another tab just persisted. */
  const persist = () => {
    const disk = load(KEY_SESSION);
    let base = null;
    try { base = JSON.parse(BASE); } catch (e) { console.warn('解析会话快照失败', e); }
    const hasPaper = x => x && typeof x === 'object' && !Array.isArray(x) && Array.isArray(x.paper);
    /* Only a LIVE session (started or finished) on disk carries another tab's
       real answers worth preserving. An unstarted intro session is disposable:
       seeding from it would silently replace our freshly built plan/paper with
       a stale one from a different unit/mode sharing the same key. */
    const diskIsLive = hasPaper(disk) && (!!disk.startedAt || !!disk.finished);
    const out = diskIsLive ? disk
      : (hasPaper(base) ? JSON.parse(JSON.stringify(base)) : {});
    if (S) {
      const changed = k => snap(S[k]) !== snap(base ? base[k] : undefined);
      const answersChanged = !!S.answers && changed('answers');
      Object.keys(S).forEach(k => {
        if (k === 'answers' && answersChanged) return;   // merged per uid below
        if (changed(k)) out[k] = S[k];
      });
      if (answersChanged) {
        const merged = Object.assign({}, out.answers || {});
        Object.keys(S.answers).forEach(uid => {
          const was = base && base.answers ? base.answers[uid] : undefined;
          if (snap(S.answers[uid]) !== snap(was)) merged[uid] = S.answers[uid];
        });
        out.answers = merged;
      }
    }
    save(KEY_SESSION, out);
    adopt(out);   // memory mirrors the disk value that is now current
  };

  /* =====================================================================
     REVIEW (answers can be changed here)
     ===================================================================== */
  function renderReview() {
    const [lo, hi] = range();
    const rows = [];
    for (let i = lo; i <= hi; i++) {
      const inst = S.paper[i], q = byId(inst.id), a = S.answers[inst.uid], locked = isLocked(inst.uid);
      const ctl = locked ? `<b>${esc(a.v || '—')}</b> <span class="tiny muted">已锁定</span>`
        : q.type === 'mcq'
          ? `<div class="miniopts">${optLetters(q.id).map(L => `<button class="${a.v === L ? 'on' : ''}" data-uid="${esc(inst.uid)}" data-l="${L}">${L}</button>`).join('')}</div>`
          : `<input class="gridmini editable" data-uid="${esc(inst.uid)}" value="${esc(a.v)}" placeholder="输入答案">`;
      rows.push(`<tr><td><b>Q${i - lo + 1}</b></td>
        <td>${esc(q.topic)}<div class="tiny muted">U${q.unit} · ${esc(q.source)} ${inst.from === 'wrong' ? '· 历史错题' : ''}${a.marked ? ' · 已标记' : ''}</div></td>
        <td><span class="pill ${a.v ? 'wait' : 'no'}">${a.v ? '已作答' : '未作答'}</span></td>
        <td>${ctl}</td><td><button class="btn slim" data-go="${i}">前往</button></td></tr>`);
    }
    $('revBody').innerHTML = rows.join('');
    const answered = rows.length && Array.from({ length: hi - lo + 1 }, (_, k) => S.answers[S.paper[lo + k].uid].v).filter(Boolean).length;
    const marked = Array.from({ length: hi - lo + 1 }, (_, k) => S.answers[S.paper[lo + k].uid].marked).filter(Boolean).length;
    $('revSummary').innerHTML = `<div class="s"><b>${answered}</b><span>已作答</span></div><div class="s"><b>${hi - lo + 1 - answered}</b><span>未作答</span></div>
      <div class="s"><b>${marked}</b><span>已标记</span></div><div class="s"><b>${MODE === 'mock' ? 'Module ' + S.module : MODE_NAME[MODE]}</b><span>当前范围</span></div>`;
    $('revBody').querySelectorAll('.miniopts button').forEach(b => b.addEventListener('click', () => {
      S.answers[b.dataset.uid].v = b.dataset.l || b.getAttribute('data-l'); persist(); renderReview();
    }));
    $('revBody').querySelectorAll('.gridmini').forEach(inp => inp.addEventListener('input', () => {
      S.answers[inp.dataset.uid].v = inp.value; persist();
    }));
    $('revBody').querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => {
      setStage('answer'); S.idx = +b.dataset.go; renderAll(); window.scrollTo(0, 0);
    }));
  }
  function renderSubmit() {
    const [lo, hi] = range();
    let answered = 0;
    for (let i = lo; i <= hi; i++) if (S.answers[S.paper[i].uid].v) answered++;
    $('subCount').textContent = answered + ' / ' + (hi - lo + 1);
    /* Official Bluebook: finishing Module 1 advances to Module 2 (it does NOT
       end the test); only Module 2 submission finalizes. No score or adaptive
       path is ever revealed mid-test. */
    const m1 = MODE === 'mock' && S.module === 1;
    $('subTitle').textContent = m1
      ? (OFFICIAL ? 'Finish Module 1?' : 'Module 1 已完成？')
      : (OFFICIAL ? 'Submit your answers?' : '确认交卷？');
    $('subDesc').textContent = m1
      ? 'Math · Module 1 of 2'
      : (MODE === 'mock' ? 'Math · Module 2 of 2' : MODE_NAME[MODE]);
    $('btnSubConfirm').textContent = m1
      ? (OFFICIAL ? 'Proceed to Module 2' : '进入 Module 2')
      : (OFFICIAL ? 'Submit' : '确认交卷并锁定答案');
    $('subWarn').innerHTML = m1
      ? (OFFICIAL
        ? 'After you move on to Module 2, you will not be able to return to Module 1 or change its answers.'
        : '进入 Module 2 后将不能返回 Module 1，也不能修改 Module 1 的答案。')
      : (answered < hi - lo + 1
        ? (OFFICIAL
          ? (hi - lo + 1 - answered) + ' questions are unanswered. They will be scored as incorrect.'
          : '还有 ' + (hi - lo + 1 - answered) + ' 题未作答，交卷后按错误计入成绩。')
        : (OFFICIAL
          ? 'All questions are answered. Submitting stops the clock and locks your answers.'
          : '所有题目均已作答。交卷后计时停止、答案锁定且不可修改。'));
  }

  /* =====================================================================
     MODULE 2 ROUTING
     ===================================================================== */
  function enterModule2() {
    if (MODE !== 'mock' || S.module !== 1) return;
    let correct = 0;
    for (let i = 0; i < S.m1Size; i++) { const inst = S.paper[i]; if (C.grade(byId(inst.id), S.answers[inst.uid].v)) correct++; }
    const path = C.routeModule2(correct);
    S.path = path;
    S.paper = S.paper.concat(S.m2Options[path]);
    S.m2Options[path].forEach(x => { S.answers[x.uid] = { v: '', marked: false, spent: 0, locked: false }; });
    for (let i = 0; i < S.m1Size; i++) S.answers[S.paper[i].uid].locked = true;  // official: cannot return to Module 1
    S.module = 2; S.idx = S.m1Size; S.m2Options = null;
    S.moduleEndsAt = Math.min(S.endsAt, Date.now() + O.secondsPerModule * 1000); // never extends the 70-min clock
    persist(); setStage('answer'); renderAll(); window.scrollTo(0, 0);
    /* Official: no score, no correct count, no harder/easier reveal during the test. */
  }

  /* =====================================================================
     FINALIZE — stop clock, lock answers, build unified result
     ===================================================================== */
  function finalize(auto, reason) {
    if (!S || S.finished) return;
    clearInterval(ticker); ticker = null;
    document.removeEventListener('visibilitychange', tick);
    window.removeEventListener('focus', tick);
    accumulateTime();
    // An early submit while still in Module 1 must still produce the official
    // 44-question paper: the unopened Module 2 counts as unanswered (0 points).
    if (MODE === 'mock' && S.module === 1 && S.m2Options) {
      let m1c = 0;
      for (let i = 0; i < S.m1Size; i++) if (C.grade(byId(S.paper[i].id), S.answers[S.paper[i].uid].v)) m1c++;
      const path = C.routeModule2(m1c);
      S.path = path;
      const rest = S.m2Options[path];
      S.paper = S.paper.concat(rest);
      rest.forEach(x => { S.answers[x.uid] = { v: '', marked: false, spent: 0, locked: true, notOpened: true }; });
    }
    S.finished = true; S.locked = true; S.auto = !!auto; S.endReason = reason || 'manual';
    const detail = S.paper.map((inst, i) => {
      const q = byId(inst.id), a = S.answers[inst.uid], given = a.v == null ? '' : String(a.v);
      const ok = C.grade(q, given);
      return { pos: i + 1, uid: inst.uid, id: q.id, unit: q.unit, section: q.section, topic: q.topic,
               source: q.source, image: q.image, hint: q.hint, type: q.type, level: q.level,
               from: inst.from, correct: ok, given,
               answer: q.type === 'grid' && q.answer == null ? q.value : q.answer,
               points: ok ? 1 : 0,
               seconds: Math.round((a.spent || 0) / 1000), marked: !!a.marked };
    });
    const correct = detail.filter(d => d.correct).length;
    const est = C.estimateScore(MODE, correct, detail.length, S.path);
    const rep = C.weaknessReport(detail, UNITS, mergedState());
    const elapsed = Math.round((Math.min(Date.now(), S.endsAt) - S.startedAt) / 1000);
    const result = {
      date: Date.now(), mode: MODE, unit: QUIZ_UNIT, sub: null,
      module: S.module, path: S.path, auto: !!auto, reason: S.endReason,
      total: detail.length, correct, elapsed, durationSec: S.durationSec,
      estimate: est, detail, report: rep, plan: S.plan, quizMeta: S.quizMeta ? { summary: S.quizMeta.summary } : null
    };
    S.result = result;
    const all = load(KEY_RESULTS) || []; all.push(result); if (all.length > 40) all.shift();
    save(KEY_RESULTS, all);                       // independent store; original state untouched
    persist();
    renderResult(); setStage('result'); window.scrollTo(0, 0);
    if (auto) toast('时间归零 · 已自动交卷并锁定答案');
  }

  function renderResult() {
    const r = S.result; if (!r) return;
    $('resTitle').textContent = MODE_NAME[r.mode] + ' · 成绩报告';
    $('resSub').textContent = new Date(r.date).toLocaleString('zh-CN') + ' · ' +
      (r.auto ? '计时归零自动交卷' : '手动交卷') + ' · 答案已锁定' +
      (MODE === 'mock' ? ' · Module 2 路径：' + (r.path === 'hard' ? 'harder' : r.path === 'easy' ? 'easier' : '未进入') : '');
    const pct = Math.round(r.correct / r.total * 100);
    /* 只有模考换算 200–800 分；单元抽测只展示正确率，不出分、不折成 44 题。 */
    const isMock = MODE === 'mock';
    $('resScoreLabel').textContent = isMock ? '预估 SAT 数学分数 · 200–800' : '本次练习正确率';
    $('resScore').innerHTML = isMock
      ? r.estimate.scaled + '<small> / 800</small>'
      : pct + '<small>%</small>';
    $('resPath').textContent = isMock
      ? '原始分 raw ' + r.estimate.raw + ' / ' + r.estimate.rawMax + ' · 参考路径 ' + (r.estimate.path === 'easy' ? 'easier' : 'harder')
      : '答对 ' + r.correct + ' / ' + r.total + ' 题 · 正确率 ' + pct + '%';
    const avg = Math.round(r.elapsed / r.total);
    const slow = Math.max(0, ...r.detail.map(d => d.seconds));
    $('resKV').innerHTML = `<div><span>答对 / 总题</span><b>${r.correct} / ${r.total}</b></div>
      <div><span>正确率</span><b>${pct}%</b></div>
      <div><span>原始分（每题 1 分）</span><b>${r.correct} 分</b></div>
      <div><span>总用时</span><b>${fmt(r.elapsed * 1000)}</b></div>
      <div><span>平均每题</span><b>${fmt(avg * 1000)}</b></div>
      <div><span>最长单题</span><b>${fmt(slow * 1000)}</b></div>
      <div><span>错题数</span><b>${r.total - r.correct}</b></div>
      <div><span>限时 / 实耗</span><b>${fmt(r.durationSec * 1000)} / ${fmt(r.elapsed * 1000)}</b></div>`;
    $('resBasis').textContent = isMock
      ? r.estimate.basis + '。' + O.scaleNote
      : '单元练习只统计本次正确率与错题分布，不换算 SAT 分数。';

    const rep = r.report;
    $('resUnits').innerHTML = rep.units.map(u => `<div class="kp-row"><span class="nm" title="${esc(u.name)}">${esc(u.name)}</span>
      <span class="bar"><i style="width:${Math.round((1 - u.rate) * 100)}%;background:${u.rate > .5 ? 'var(--bad)' : u.rate > 0 ? 'var(--warn)' : 'var(--ok)'}"></i></span>
      <span class="pct">错 ${u.wrong}/${u.n}</span></div>`).join('') || '<div class="small muted">本次全部答对，无需补强</div>';
    $('resTopics').innerHTML = rep.topics.slice(0, 12).map(t => `<div class="kp-row"><span class="nm" title="${esc(t.name)}">${esc(t.name)}</span>
      <span class="bar"><i style="width:${Math.round((1 - t.rate) * 100)}%;background:${t.rate > .5 ? 'var(--bad)' : t.rate > 0 ? 'var(--warn)' : 'var(--ok)'}"></i></span>
      <span class="pct">错 ${t.wrong}/${t.n}</span></div>`).join('');
    $('resPriority').innerHTML = rep.priority.map(p => `<div class="prio-item">
      <span class="prio-lv ${p.level.toLowerCase()}">${p.level}</span>
      <div style="flex:1"><b>${esc(p.name)}</b> <span class="tiny muted">${p.type === 'unit' ? '单元' : '知识点'}</span>
        <div class="small muted" style="margin-top:2px">${esc(p.reason)}</div>
        <div class="tiny" style="margin-top:3px;color:var(--blue-strong)">${esc(p.action)}</div>
        <div class="tiny muted" style="margin-top:3px">对应错题：${esc(p.wrongIds.join('、')) || '—'}</div></div></div>`).join('') || '<div class="small muted">本次无错题</div>';
    renderTypeSummary();
    renderResultList();
  }
  function renderResultList() {
    const r = S.result, list = resultTab === 'wrong' ? r.detail.filter(d => !d.correct) : r.detail;
    const AN = window.TD_ANALYSIS;
    $('resList').innerHTML = list.map(d => {
      let causeHtml = '';
      if (!d.correct && AN) {
        const q = BANK.find(x => x.id === d.id) || {};
        const a = AN.analyze(q, d.given, (window.TD_TEXT || {})[d.id]);
        causeHtml = `<div class="cause-box"><b>错因 · ${esc(a.title)}</b><p>${esc(a.cause)}</p><p class="fix">${esc(a.fix)}</p></div>`;
      }
      return `<div class="rev-item ${d.correct ? 'ok' : 'no'}">
      <div class="badge">${d.correct ? '对' : '错'}</div>
      <div class="body"><div class="ttl">Q${d.pos} · ${esc(d.topic)}
        <span class="tiny muted">U${d.unit} · ${d.type === 'grid' ? '填空' : '选择'} · 得 ${d.points} 分${d.from === 'wrong' ? ' · 历史错题' : ''}${d.marked ? ' · 曾标记' : ''}</span></div>
        <div class="sub">${esc(d.source)} · 用时 ${fmt(d.seconds * 1000)}</div>
        <div class="ans"><span>你的答案 <b style="color:${d.correct ? 'var(--ok)' : 'var(--bad)'}">${esc(d.given || '—')}</b></span>
          <span>正确答案 <b>${esc(d.answer)}</b></span></div>
        ${!d.correct && d.hint ? `<div class="sub" style="margin-top:6px;color:var(--blue-strong)">提示：${esc(d.hint)}</div>` : ''}
        ${causeHtml}</div>
      </div>`;
    }).join('') || '<div class="small muted">无错题</div>';
  }

  /* 本次错题按错因类型聚合：仅依据作答内容归类，给出共性改进方向 */
  function renderTypeSummary() {
    const box = $('resTypes'); if (!box) return;
    const r = S.result, AN = window.TD_ANALYSIS;
    if (!r || !AN) return;
    const groups = AN.aggregate(r.detail, BANK, window.TD_TEXT || {});
    if (!groups.length) { box.innerHTML = '<div class="small muted">本次全部答对，无需补强。</div>'; return; }
    box.innerHTML = groups.map(g => `<div class="prio-item"><span class="prio-lv ${'c' + g.count}">${g.count}</span>
      <div style="flex:1"><b>${esc(g.label)}</b> <span class="tiny muted">${g.ids.length} 题</span>
        <div class="tiny" style="margin-top:3px;color:var(--blue-strong)">${esc(g.fix)}</div></div></div>`).join('');
  }

  /* =====================================================================
     TOOLS — verbatim Bluebook Directions / Reference; embedded Desmos
     is available in the official mock only, never in practice or quiz.
     ===================================================================== */

  /* =====================================================================
     Anti copy / paste / drag — answer page & review page
     ===================================================================== */
  function installProtection() {
    ['copy', 'cut', 'paste', 'contextmenu', 'selectstart', 'dragstart'].forEach(evt =>
      document.addEventListener(evt, e => {
        const inTool = e.target.closest && e.target.closest('#bbModalLayer, #bbCalcPanel');
        const editable = e.target.classList && e.target.classList.contains('editable');
        if (inTool) return; // official reference sheet / Desmos must stay usable
        if (editable && evt === 'selectstart') return;                    // allow caret selection in answer fields
        e.preventDefault(); e.stopPropagation();
        if (evt === 'paste' || evt === 'copy' || evt === 'cut') toast('考试期间禁止复制 / 粘贴题目与选项内容');
      }, true));
    document.addEventListener('keydown', e => {
      const mod = e.metaKey || e.ctrlKey, k = (e.key || '').toLowerCase();
      if (mod && ['c', 'v', 'x'].indexOf(k) >= 0) { e.preventDefault(); e.stopPropagation(); return; }
      if (mod && k === 'a' && !(e.target.classList && e.target.classList.contains('editable'))) { e.preventDefault(); }
      if (mod && k === 'p') e.preventDefault();
    }, true);
    // block programmatic clipboard reads too
    try { if (navigator.clipboard) navigator.clipboard.readText = () => Promise.reject(new Error('blocked')); } catch (e) { console.warn('禁用剪贴板读取未生效', e); }
  }

  /* =====================================================================
     Events
     ===================================================================== */
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600); }

  $('bankCount').textContent = String(BANK.length);
  $('btnStart').addEventListener('click', startSession);
  $('btnPrev').addEventListener('click', () => goTo(S.idx - 1));
  $('btnNext').addEventListener('click', () => goTo(S.idx + 1));
  $('btnQuestionNav').addEventListener('click', openNavigator);
  $('btnReviewNav').addEventListener('click', openNavigator);
  $('questionNav').addEventListener('click', event => {
    if (event.target === $('questionNav') || event.target.closest('[data-nav-close]')) closeNavigator(true);
  });
  $('questionGrid').addEventListener('click', event => {
    const button = event.target.closest('button[data-i]');
    if (!button) return;
    const target = +button.dataset.i;
    closeNavigator(false);
    if (S.stage !== 'answer') setStage('answer');
    goTo(target);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('questionNav').hidden) closeNavigator(true);
  });
    $('btnMark').addEventListener('click', () => { const a = curA(); if (!isLocked(cur().uid)) { a.marked = !a.marked; persist(); renderQuestion(); renderNavigator(); } });
  $('btnReview').addEventListener('click', () => { accumulateTime(); renderReview(); setStage('review'); window.scrollTo(0, 0); });
  $('btnBackAnswer').addEventListener('click', () => { setStage('answer'); renderAll(); window.scrollTo(0, 0); });
  $('btnSubmit').addEventListener('click', () => { accumulateTime(); renderSubmit(); setStage('submit'); });
  $('btnGoSubmit').addEventListener('click', () => { renderSubmit(); setStage('submit'); });
  $('btnSubBack').addEventListener('click', () => { renderReview(); setStage('review'); });
  $('btnSubConfirm').addEventListener('click', () => {
    if (MODE === 'mock' && S.module === 1) { enterModule2(); return; }
    finalize(false, 'manual');
  });
  /* Directions 仅官方模考可见；计算器在抽查与模考都可用。 */
  if (!OFFICIAL) {
    $('btnDirections').hidden = true;
    $('btnReference').textContent = '公式参考';
    $('navLegend').innerHTML = '<span><i class="is-answered"></i>已答</span><span><i></i>未答</span>' +
      '<span><i class="is-marked"></i>已标记</span><span><i class="is-current"></i>当前</span>';
    $('btnReviewNav').textContent = '打开题目导航';
  }
  window.TD_UI.bindTools({
    reference: 'btnReference', directions: 'btnDirections', calculator: 'btnCalculator',
    allowCalculator: true
  });
  $('answerArea').addEventListener('click', event => {
    if (event.target.closest('.exam-spr-link')) window.TD_UI.openModal('dir');
  });
  $('introDirections').addEventListener('click', event => {
    if (event.target.closest('#btnIntroDirections')) window.TD_UI.openModal('dir');
  });
  $('btnHideTimer').addEventListener('click', () => {
    const b = $('btnHideTimer');
    if (b.disabled) return;
    const hidden = document.body.classList.toggle('clock-hidden');
    b.textContent = hidden ? 'Show' : 'Hide';
    tick();
  });
  document.querySelectorAll('[data-rtab]').forEach(t => t.addEventListener('click', () => {
    resultTab = t.dataset.rtab;
    document.querySelectorAll('[data-rtab]').forEach(x => x.classList.toggle('on', x === t));
    renderResultList();
  }));
  $('btnResHome').addEventListener('click', () => { location.href = 'wrong.html'; });
  $('btnResAgain').addEventListener('click', () => { try { localStorage.removeItem(KEY_SESSION); } catch (e) { console.warn('清除本地会话失败', e); } location.reload(); });

  /* Exit to the previous page. Answers are auto-saved on every edit, so no
     manual save is needed; a live timed session keeps its absolute deadline,
     which we disclose rather than silently pretending it was paused. */
  const exitBtn = $('btnExamExit');
  if (exitBtn) exitBtn.addEventListener('click', e => {
    if (S && S.startedAt && !S.finished && S.stage !== 'intro') {
      if (!window.confirm('退出后计时不会暂停，但作答与进度已自动保存。确定退出吗？')) {
        e.preventDefault(); return;
      }
    }
  });

  /* Another tab changed the shared session: adopt the newest value so our
     next write is based on it instead of a stale snapshot. The stage is only
     revealed after an explicit Start click, so this cannot leak test content
     onto the main screen. */
  window.addEventListener('storage', event => {
    if (event && event.key && event.key !== KEY_SESSION) return;
    const cur = load(KEY_SESSION);
    if (!cur || !cur.paper || !cur.paper.length || !S) return;
    /* Never adopt a session of another mode / another quiz unit (shared key). */
    if (cur.mode !== MODE) return;
    if (MODE === 'quiz' && cur.unitId !== QUIZ_UNIT) return;
    Object.keys(S).forEach(k => { delete S[k]; });
    Object.keys(cur).forEach(k => { S[k] = cur[k]; });
    BASE = snap(cur);
    resumeStage = cur.finished && cur.result ? 'result'
      : (cur.stage && cur.stage !== 'intro' ? cur.stage : null);
  });

  /* Practice mistakes live in other keys written by other tabs; rebuild the
     intro plan/paper so the displayed count and the actual paper stay in sync
     without a manual refresh. */
  window.addEventListener('storage', event => {
    if (!event || !event.key || MISTAKE_KEYS.indexOf(event.key) < 0) return;
    syncIntroPlan();
  });
  window.addEventListener('focus', syncIntroPlan);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') syncIntroPlan();
  });

  /* Back/forward cache restores must not reveal a half-rendered test screen. */
  window.addEventListener('pageshow', event => {
    if (event.persisted && !startClicked && S) { showStage('intro'); renderIntro(); }
  });

  /* 草稿薄雾板：除模考外的练习/抽查都可涂画写草稿，答案区保持可直接填写 */
  if (MODE !== 'mock' && window.ScratchPad) {
    const scratchBtn = $('btnScratch');
    if (scratchBtn) {
      scratchBtn.hidden = false;
      ScratchPad.attach(scratchBtn);
      const answerStage = $('stage-answer');
      if (answerStage) {
        new MutationObserver(() => {
          if (answerStage.hidden) ScratchPad.close();
        }).observe(answerStage, { attributes: true, attributeFilter: ['hidden'] });
      }
    }
  }

  installProtection();
  restoreOrIntro();
  // expose a tiny read-only probe for automated verification
  window.__TD_EXAM__ = {
    get state() { return S; }, core: C, finalize, enterModule2,
    get remaining() { return S && S.endsAt ? S.endsAt - Date.now() : 0; }
  };
})();
