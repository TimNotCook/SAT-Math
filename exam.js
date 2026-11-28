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
  const KEY_ABANDONED = 'tdsat_exam_suite_abandoned_v1';
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

  /* 抽查层一律中文：成绩页/交卷页的静态英文按钮就地换掉，模考层保持英文 */
  const QUIZ_COPY = {
    'Review Missed Questions': '查看错题',
    'Take Another Test': '再测一次',
    'Weakness Report': '薄弱点报告',
    'Question-by-Question Results': '逐题结果',
    'Units to Prioritize': '优先补强',
    'All Questions': '全部题目',
    'Incorrect Only': '只看错题',
    'SCORE REPORT': '成绩报告',
    'Keep Reviewing': '返回继续答题',
    'Submit and Lock Answers': '交卷并锁定答案',
    'Directions': '考试说明',
    'Check Answers': '检查答题',
    'CHECK YOUR WORK': '检查答题',
    'Select a question number to jump back to it, or edit answers directly in the table below. Answers are locked after you submit.':
      '点题号可直接跳回修改；也可以在下表里直接改答案。交卷后答案锁定。',
    'Question Menu': '题目导航',
    'Question': '题号',
    'Topic / Source': '题目 / 出处',
    'Status': '状态',
    'Your Answer': '你的答案',
    'Go': '跳转',
    'Back to Test': '返回答题'
  };
  function applyQuizCopy() {
    if (OFFICIAL) return;
    document.querySelectorAll('#stage-result *, #stage-submit *, #stage-review *').forEach(function (el) {
      if (el.children.length) return;
      const t = (el.textContent || '').trim();
      if (QUIZ_COPY[t]) el.textContent = QUIZ_COPY[t];
    });
  }

  const UNIT_BLURB = {
    1: '线性方程与函数图像 · 一元一次方程 · 线性不等式 · 绝对值方程',
    2: '比例与百分比 · 单位换算 · 统计图表 · 数据推理',
    3: '二次函数与方程 · 指数与根式 · 多项式与因式分解',
    4: '平行线与角度 · 相交直线与对顶角 · 直线方程与夹角 · 相似三角形'
  };
  const UNIT_ART = {
    1: '<svg viewBox="0 0 176 132" width="176" height="132" fill="none" aria-hidden="true"><path d="M18 104H152" stroke="#dbe7f8" stroke-width="1.6" stroke-linecap="round"/><path d="M160 104l-6-3.2V107.2z" stroke="#dbe7f8" stroke-width="1.4" stroke-linejoin="round"/><path d="M46 104V30" stroke="#dbe7f8" stroke-width="1.6" stroke-linecap="round"/><path d="M46 22l-3.2 6H49.2z" stroke="#dbe7f8" stroke-width="1.4" stroke-linejoin="round"/><path d="M46 40H156" stroke="#edf4fc" stroke-width="1"/><path d="M46 64H156" stroke="#edf4fc" stroke-width="1"/><path d="M46 88H156" stroke="#edf4fc" stroke-width="1"/><path d="M76 104V40" stroke="#edf4fc" stroke-width="1"/><path d="M106 104V40" stroke="#edf4fc" stroke-width="1"/><path d="M136 104V40" stroke="#edf4fc" stroke-width="1"/><path d="M52 86L144 34" stroke="#8fb3ee" stroke-width="1.8" stroke-linecap="round"/><path d="M74 73.6V104" stroke="#c4d7f3" stroke-width="1" stroke-dasharray="3 4"/><circle cx="74" cy="73.6" r="4" fill="#fff" stroke="#8fb3ee" stroke-width="1.8"/><circle cx="74" cy="73.6" r="1.3" fill="#8fb3ee"/><path d="M126 44.2V104" stroke="#c4d7f3" stroke-width="1" stroke-dasharray="3 4"/><circle cx="126" cy="44.2" r="4" fill="#fff" stroke="#8fb3ee" stroke-width="1.8"/><circle cx="126" cy="44.2" r="1.3" fill="#8fb3ee"/></svg>',
    2: '<svg viewBox="0 0 176 132" width="176" height="132" fill="none" aria-hidden="true"><path d="M18 104H152" stroke="#dbe7f8" stroke-width="1.6" stroke-linecap="round"/><path d="M160 104l-6-3.2V107.2z" stroke="#dbe7f8" stroke-width="1.4" stroke-linejoin="round"/><path d="M46 104V30" stroke="#dbe7f8" stroke-width="1.6" stroke-linecap="round"/><path d="M46 22l-3.2 6H49.2z" stroke="#dbe7f8" stroke-width="1.4" stroke-linejoin="round"/><path d="M46 40H156" stroke="#edf4fc" stroke-width="1"/><path d="M46 64H156" stroke="#edf4fc" stroke-width="1"/><path d="M46 88H156" stroke="#edf4fc" stroke-width="1"/><path d="M76 104V40" stroke="#edf4fc" stroke-width="1"/><path d="M106 104V40" stroke="#edf4fc" stroke-width="1"/><path d="M136 104V40" stroke="#edf4fc" stroke-width="1"/><rect x="48" y="78" width="16" height="26" rx="2" fill="#f5faff" stroke="#c4d7f3" stroke-width="1.5"/><rect x="76" y="64" width="16" height="40" rx="2" fill="#f5faff" stroke="#c4d7f3" stroke-width="1.5"/><rect x="104" y="50" width="16" height="54" rx="2" fill="#f5faff" stroke="#c4d7f3" stroke-width="1.5"/><rect x="132" y="34" width="16" height="70" rx="2" fill="#eaf3ff" stroke="#8fb3ee" stroke-width="1.5"/><path d="M44 84.3L158 24.6" stroke="#8fb3ee" stroke-width="1.5" stroke-dasharray="5 5" stroke-linecap="round"/><circle cx="56" cy="78" r="2.4" fill="#8fb3ee"/><circle cx="84" cy="64" r="2.4" fill="#8fb3ee"/><circle cx="112" cy="50" r="2.4" fill="#8fb3ee"/><circle cx="140" cy="34" r="2.4" fill="#8fb3ee"/></svg>',
    3: '<svg viewBox="0 0 176 132" width="176" height="132" fill="none" aria-hidden="true"><path d="M18 104H152" stroke="#dbe7f8" stroke-width="1.6" stroke-linecap="round"/><path d="M160 104l-6-3.2V107.2z" stroke="#dbe7f8" stroke-width="1.4" stroke-linejoin="round"/><path d="M46 104V30" stroke="#dbe7f8" stroke-width="1.6" stroke-linecap="round"/><path d="M46 22l-3.2 6H49.2z" stroke="#dbe7f8" stroke-width="1.4" stroke-linejoin="round"/><path d="M46 40H156" stroke="#edf4fc" stroke-width="1"/><path d="M46 64H156" stroke="#edf4fc" stroke-width="1"/><path d="M46 88H156" stroke="#edf4fc" stroke-width="1"/><path d="M76 104V40" stroke="#edf4fc" stroke-width="1"/><path d="M106 104V40" stroke="#edf4fc" stroke-width="1"/><path d="M136 104V40" stroke="#edf4fc" stroke-width="1"/><path d="M32 44.8 L36 51.0 L40 56.8 L44 62.2 L48 67.2 L52 71.8 L56 76.0 L60 79.8 L64 83.2 L68 86.2 L72 88.8 L76 91.0 L80 92.8 L84 94.2 L88 95.2 L92 95.8 L96 96.0 L100 95.8 L104 95.2 L108 94.2 L112 92.8 L116 91.0 L120 88.8 L124 86.2 L128 83.2 L132 79.8 L136 76.0 L140 71.8 L144 67.2 L148 62.2 L152 56.8 L156 51.0 L160 44.8" stroke="#8fb3ee" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><path d="M96 104V36" stroke="#c4d7f3" stroke-width="1" stroke-dasharray="3 4"/><circle cx="96" cy="96" r="3" fill="#8fb3ee"/><circle cx="45" cy="64" r="3.2" fill="#fff" stroke="#8fb3ee" stroke-width="1.6"/><circle cx="147" cy="64" r="3.2" fill="#fff" stroke="#8fb3ee" stroke-width="1.6"/></svg>',
    4: '<svg viewBox="0 0 176 132" width="176" height="132" fill="none" aria-hidden="true"><path d="M18 104H152" stroke="#dbe7f8" stroke-width="1.6" stroke-linecap="round"/><path d="M160 104l-6-3.2V107.2z" stroke="#dbe7f8" stroke-width="1.4" stroke-linejoin="round"/><path d="M46 104V30" stroke="#dbe7f8" stroke-width="1.6" stroke-linecap="round"/><path d="M46 22l-3.2 6H49.2z" stroke="#dbe7f8" stroke-width="1.4" stroke-linejoin="round"/><path d="M34 104L82 30L140 104Z" stroke="#c4d7f3" stroke-width="1.8" stroke-linejoin="round" fill="#f5faff"/><path d="M82 30V104" stroke="#c4d7f3" stroke-width="1" stroke-dasharray="4 4"/><path d="M74 104V96H82" stroke="#8fb3ee" stroke-width="1.5" stroke-linejoin="round" fill="none"/><path d="M53.0 104.0 L53.0 102.7 L52.8 101.5 L52.6 100.2 L52.3 99.0 L52.0 97.8 L51.5 96.6 L51.0 95.5 L50.4 94.4 L49.7 93.3 L49.0 92.3 L48.2 91.3 L47.3 90.4 L46.4 89.6 L45.4 88.8 L44.3 88.1" stroke="#8fb3ee" stroke-width="1.4" stroke-linecap="round" fill="none"/><path d="M121.0 104.0 L121.0 102.9 L121.1 101.7 L121.3 100.6 L121.6 99.5 L121.9 98.3 L122.2 97.3 L122.7 96.2 L123.2 95.2 L123.7 94.2 L124.4 93.2 L125.0 92.3 L125.8 91.4 L126.6 90.6 L127.4 89.8 L128.3 89.0" stroke="#8fb3ee" stroke-width="1.4" stroke-linecap="round" fill="none"/><circle cx="34" cy="104" r="2.8" fill="#8fb3ee"/><circle cx="82" cy="30" r="2.8" fill="#8fb3ee"/><circle cx="140" cy="104" r="2.8" fill="#8fb3ee"/></svg>'
  };
  const T = (zh, en) => (OFFICIAL ? en : zh);     // 模考层纯英文：docs/UI-COPY.md v1.1
  const UNIT_EN = { 1: 'Heart of Algebra', 2: 'Problem Solving & Data Analysis', 3: 'Advanced Math', 4: 'Geometry & Trigonometry' };
  document.querySelectorAll('.exam-modules a').forEach(a => {
    const on = a.dataset.module === MODE;
    a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page');
  });
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); if (window.TDSync) try { window.TDSync.notify(k); } catch (e2) { console.warn('同步通知未生效', e2); } } catch (e) { console.warn('保存会话失败', e); } };
  const load = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  /* 仓库被写成对象/数组以外的东西时，别让 .forEach 把整页打崩：
     两个存取器把「形状不对」的存档一律降级成空列表/空对象。 */
  const asArr = v => (Array.isArray(v) ? v : []);
  const asObj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  /* 报告/明细数组里可能混进数组（云端合并把 [..] 写成一项）：数组也是 object，
     只判 typeof 会画出一行空字段的幽灵记录。 */
  const isRec = v => !!v && typeof v === 'object' && !Array.isArray(v);
  /* void 标记可能是字符串 'false'：truthy 会把有效成绩整条藏掉。 */
  /* 布尔标志可能是字符串 'True'/'FALSE'（旧版/手工导入）：先 trim+小写再判。 */
  const flagKey = v => (typeof v === 'string' ? v.trim().toLowerCase() : v);
  const isTrueFlag = v => (v = flagKey(v), v === true || v === 1 || v === 'true' || v === '1');
  /* 存档来自旧版本/云端合并：对象字段不能直接拼进模板或当数字算。 */
  const safeText = v => (v == null || typeof v === 'object' || typeof v === 'function' || typeof v === 'boolean' ? '' : String(v));
  /* 布尔不是数字：true 会被 Number 成 1，旧 detail 的 seconds/points 是布尔时
     成绩页会显示假的 1 秒 / 1 分。 */
  /* 空字符串不是数字 0：云端合并/旧版把 total/correct 写成 '' 时，
     Number('')=0 会让成绩页显示「答对 0 / 0」并丢掉逐题明细里的真实结果。 */
  const safeNum = v => (v == null || typeof v === 'object' || typeof v === 'function' || typeof v === 'boolean' || (typeof v === 'string' && !v.trim()) ? null : (isFinite(Number(v)) ? Number(v) : null));
  /* 题数/答对数是计数：小数（22.5）会让成绩页印「10 / 22.5」；当坏值，走明细兜底。 */
  const countNum = v => { const n = safeNum(v); return n != null && n >= 0 && Math.floor(n) === n ? n : null; };
  const isRightFlag = v => (v = flagKey(v), v === true || v === 1 || v === 'true' || v === '1');
  const isWrongFlag = v => (v = flagKey(v), v === false || v === 0 || v === 'false' || v === '0');
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
    (Array.isArray(d.items) ? d.items : []).forEach(it => {
      const id = it && (it.matchId || it.id);
      const q = id && byId(String(id));
      if (q && q.unit === unitId && ids.indexOf(q.id) < 0) ids.push(q.id);
    });
    return ids;
  }
  function oldState() {
    const s = asObj(load(KEY_OLD));
    return { settings: Object.assign({ tmode: 'official', perQ: 95, total: 35, count: 22, order: 'mixed' }, asObj(s.settings)),
             wrong: asObj(s.wrong), done: asObj(s.done), history: asArr(s.history) };
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
        if (isRightFlag(a.correct) && !seenCorrected[id]) { seenCorrected[id] = true; correctedIds.push(id); }
        if (isWrongFlag(a.correct)) {
          if (!seenWrong[id]) { seenWrong[id] = true; wrongIds.push(id); }
          if (!meta[id] || (a.ts || 0) > (meta[id].ts || 0)) meta[id] = { v: safeText(a.v), ts: safeNum(a.ts) || 0 };
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
    asArr(load(KEY_RESULTS)).forEach(r => { if (!r || isTrueFlag(r.void)) return; asArr(r.detail).forEach(d => {
      if (!d || typeof d !== 'object' || isRightFlag(d.correct)) return;   // 旧/云端合并来的 detail 里可能有 null、数字
      const did = safeText(d.id); if (!did) return;             // 对象 id 会变成 "[object Object]" 这个假题号
      const x = w[did] || (w[did] = { count: 0 });
      x.count = (x.count || 0) + 1; x.last = r.date || x.last;
    }); });
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

  let S = null, ticker = null, tickerBound = false, resultTab = 'all', lastQTs = Date.now(), navOpener = null;
  /* The stage a saved session is allowed to reveal. It stays null until the
     Start/测试 button is clicked, so a page load, refresh or module switch can
     never show answer / review / submit / result content on the main screen. */
  let resumeStage = null, startClicked = false;
  /* 开场页不放任何提示条：存档作废、模块切换、恢复进度一律静默处理。 */
  let sessionExpired = false;
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
    sessionExpired = false;
    /* 已交卷的会话不能再被 Start 拉回答题视图：答题区是锁定态，进去只会看到
       「题都在、全灰、不能答」的残影，而成绩页才是唯一正确落点。 */
    if (S && S.finished && S.result) {
      resumeStage = null;
      S.stage = 'result';
      setStage('result'); renderResult(); window.scrollTo(0, 0);
      return;
    }
    if (resumeStage) {
      /* 开始页停着的这段时间里计时也在走（ticker 不起）。点 Start 前再判一次，
         避免「刚点开始就被判进模块二 / 直接出分」的黑箱。 */
      const late = C.sessionTimeout(S, Date.now());
      if (late === 'total') {
        finalize(true, 'time');
        toast(OFFICIAL ? 'Time is up. Your answers have been scored.' : '计时已结束，已按已作答内容出分');
        return;
      }
      if (late === 'module1') {
        enterModule2();
        toast(OFFICIAL ? 'Module 1 time is up. You are now in Module 2.' : 'Module 1 时间已到，已自动进入 Module 2');
      }
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
  /* ---------------------------------------------------------------------
     存档兼容层
     规则见 exam-core.js 的 parseSession（纯函数，有单测）：
     能按官方 22/22 结构确定性重建就恢复，不能就作废并留档。
     绝不再「猜一个区间」——区间错了，题号和判分就是两套口径。
     --------------------------------------------------------------------- */
  const REASON_CN = {
    'missing': '没有可读的存档', 'mode': '存档属于另一种模式', 'paper-empty': '卷面为空',
    'paper-shape': '卷面格式损坏', 'paper-uid': '卷面题号缺失', 'bank': '题目已不在题库',
    'clock': '计时字段损坏', 'shape': '卷形不是 22/44 题', 'm1': '模块切分异常',
    'm2-options': '缺少模块二备用卷', 'runtime': '运行中会话结构异常'
  };
  const REASON_EN = {
    'missing': 'no readable saved test', 'mode': 'saved under another mode', 'paper-empty': 'empty paper',
    'paper-shape': 'malformed paper', 'paper-uid': 'missing question ids', 'bank': 'questions no longer in the bank',
    'clock': 'broken timing fields', 'shape': 'paper is not 22/44 questions', 'm1': 'module split is inconsistent',
    'm2-options': 'Module 2 backup paper missing', 'runtime': 'in-memory session is inconsistent'
  };
  /* 模考层纯英文（docs/UI-COPY.md）；练习/抽查层中文。 */
  const reasonText = r => { const key = safeText(r); return OFFICIAL ? (REASON_EN[key] || ('unknown reason ' + key)) : (REASON_CN[key] || ('未知原因 ' + key)); };

  function repairSaved(saved) {
    return C.parseSession(saved, {
      mode: MODE, unitId: MODE === 'quiz' ? QUIZ_UNIT : null,
      isQuestionId: id => { const q = byId(id); return !!q && (MODE !== 'quiz' || q.unit === QUIZ_UNIT); }
    });
  }

  /* 作废前留档：卷面 + 作答写进 results（void:true，不进错题统计），可导出。
     宁可多一条「未交卷」记录，也不静默清零 35 分钟。 */
  function salvageSession(session, reason) {
    if (!session || !Array.isArray(session.paper)) return null;   // 卷面为空也要留一条「这卷作废」记录
    const answers = session.answers || {};
    const detail = session.paper.map((inst, i) => {
      const inst0 = inst || {};
      const q = byId(inst0.id) || {};
      const a = answers[inst0.uid] || {};
      return {
        pos: i + 1, uid: inst0.uid, id: inst0.id, unit: q.unit || null,
        section: q.section || null, topic: q.topic || null, type: q.type || null,
        image: q.image || null, given: safeText(a.v),
        marked: isRightFlag(a.marked), spent: Math.round((safeNum(a.spent) || 0) / 1000)
      };
    });
    const now = Date.now();
    /* 作废记录要跟着卷面归属走：Unit 2 页面捡到 Unit 1 的旧卷时，
       留档不能把这张卷记成 Unit 2，否则云端档案里的单元归属是错的。 */
    const savedUnit = session.mode === 'quiz' && Number(session.unitId) > 0 ? Number(session.unitId) : QUIZ_UNIT;
    const rec = {
      date: now, mode: session.mode || MODE, unit: savedUnit, sub: null,
      module: session.module || 1, path: session.path || null, auto: false,
      void: true, reason: reason || 'invalid', total: detail.length,
      answered: detail.filter(d => d.given).length,
      durationSec: session.durationSec || 0,
      elapsed: session.startedAt ? Math.max(0, Math.round((Math.min(now, session.endsAt || now) - session.startedAt) / 1000)) : 0,
      startedAt: session.startedAt || null, endsAt: session.endsAt || null,
      plan: session.plan || null, detail
    };
    const all = asArr(load(KEY_RESULTS)); all.push(rec); if (all.length > 40) all.shift();
    save(KEY_RESULTS, all);
    return rec;
  }

  function voidRecords() { return asArr(load(KEY_RESULTS)).filter(r => r && isTrueFlag(r.void)); }

  /* 运行中结构异常（理论上不可达）：同样走留档 + 重置，不给错数。 */
  function runtimeVoid() {
    salvageSession(S, 'runtime');
    try { localStorage.removeItem(KEY_SESSION); } catch (e) { console.warn('清除失效会话失败', e); }
    sessionExpired = true;
    resumeStage = null;
    adopt(newSession()); renderIntro(); setStage('intro');
  }

  /* ------------------------------------------------------------------
     UNFINISHED ARCHIVE — 模考 / 抽查中途退出时自动留档。
     只写 tdsat_exam_suite_abandoned_v1，不动答题视图与判分：
     pagehide 时若已开考且未交卷，upsert 一条未做完记录（按 startedAt
     对齐）；交卷或恢复正常会话时清除对应记录，模考记录页据此显示
     「未做完」灰条与「继续这卷」入口。
     ------------------------------------------------------------------ */
  function answeredCount() {
    let n = 0;
    for (const k in S.answers) { const a = S.answers[k]; if (a && a.v != null && String(a.v).trim() !== '') n++; }
    return n;
  }
  function archiveAbandoned() {
    if (!S || S.finished) return;
    if (!S.startedAt || S.stage === 'intro') return;   // 没开考不算未做完
    try {
      const all = asArr(load(KEY_ABANDONED));
      const rec = {
        date: Date.now(), startedAt: S.startedAt, mode: MODE, finished: false,
        /* 抽查的「继续这卷」必须知道是哪个 unit：缺 unit 会落到默认 U1，
         parseSession 再把 U3 的存档判成 unit 不匹配并作废。 */
        unitId: MODE === 'quiz' ? QUIZ_UNIT : null,
        module: S.module || 1, answered: answeredCount(), total: S.paper ? S.paper.length : 0,
      };
      const i = all.findIndex(x => x && C.sameTime(x.startedAt, rec.startedAt) && x.mode === rec.mode);
      if (i >= 0) all[i] = rec;
      else { all.push(rec); if (all.length > 40) all.shift(); }
      save(KEY_ABANDONED, all);
    } catch (e) { console.warn('未做完存档失败', e); }
  }
  function clearAbandoned(startedAt) {
    if (startedAt == null) return;
    try {
      const all = asArr(load(KEY_ABANDONED));
      const next = all.filter(x => !(x && C.sameTime(x.startedAt, startedAt) && x.mode === MODE));
      if (next.length !== all.length) save(KEY_ABANDONED, next);
    } catch (e) {}
  }
  window.addEventListener('pagehide', () => { try { archiveAbandoned(); } catch (e) {} });

  function restoreOrIntro() {
    const saved = load(KEY_SESSION);
    const fixed = repairSaved(saved);
    if (fixed.status === 'ok') {
      const s = fixed.session;
      /* 补齐后的字段写回磁盘，下一次刷新不用再修一遍 */
      save(KEY_SESSION, s);
      adopt(s);
      clearAbandoned(s.startedAt);
      lastQTs = Date.now();
      resumeStage = s.finished && s.result ? 'result'
        : (s.stage && s.stage !== 'intro' ? s.stage : 'answer');
      /* 时间已经走完的情况必须在开始页就说清楚：不能等用户点 Start 才突然
         进模块二或直接出分（那是「看起来正常」的假象）。 */
      const timeout = C.sessionTimeout(S, Date.now());
      if (timeout === 'total') {
        /* 已出分：resumeStage 必须先改成 result，否则落点仍写着 answer，
           任何一次 Start（含回退/自动化点击）都会把锁定态答题区翻出来。 */
        resumeStage = 'result';
        finalize(true, 'time');
        toast(OFFICIAL ? 'Time is up. Your answers have been scored.' : '计时已结束，已按已作答内容出分');
        return true;
      }
      if (timeout === 'module1') {
        enterModule2();
        resumeStage = 'answer';
      }
      /* 刷新/重进静默恢复：点 Start 直接接着上次继续，不在开场页塞说明文字。 */
      showStage('intro');           // also hides the timer group
      renderIntro();
      /* Do not write the stored remaining time while on the start page:
         the countdown is revealed only by the Start click. */
      return true;
    }
    /* 存档存在但无法按官方结构重建：静默作废，直接给新卷。
       开场页预生成、还没开考的存档（没有 startedAt / 还停在 intro）不入留档。 */
    if (saved && saved.mode === MODE) {
      const started = Number(saved.startedAt) > 0 && saved.stage && saved.stage !== 'intro';
      if (started) salvageSession(saved, fixed.reason);
      try { localStorage.removeItem(KEY_SESSION); } catch (e) { console.warn('清除失效会话失败', e); }
    }
    resumeStage = null;
    adopt(newSession()); renderIntro(); setStage('intro'); return false;
  }
  function startTicker() {
    clearInterval(ticker); ticker = setInterval(tick, 250);
    if (!tickerBound) {                       // 幂等：反复进出考试不堆叠监听器
      document.addEventListener('visibilitychange', tick);
      window.addEventListener('focus', tick);
      tickerBound = true;
    }
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
      $('clockLabel').textContent = T('剩余时间', 'Time Remaining');
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
    /* 390 窄屏实测：「Section 2, Module 1: Math」被省略号裁到 142px，
       Module 号看不见。窄屏换短写法，宽屏保留 Bluebook 原句。 */
    var narrowTop = !!(window.matchMedia && window.matchMedia('(max-width:520px)').matches);
    $('tbSection').textContent = MODE === 'mock'
      ? (narrowTop ? 'Sec 2 · M' + S.module + ': Math' : 'Section 2, Module ' + S.module + ': Math')
      : '第 ' + QUIZ_UNIT + ' 单元';
  }
  function setStage(name) {
    S.stage = name;
    showStage(name);
    applyQuizCopy();
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
        '<span>U' + u.id + ' 专项练习</span></label>';
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
    /* introNotice 只留启动失败那条兜底（见 exam.html 的 load 体检），正常流程不写。 */
    const introMod = official && S && S.module === 2 ? 2 : 1;
    $('introTitle').textContent = official ? 'Practice Test' : '单元抽查';
    const quizTitle = $('introQuizTitle');
    if (quizTitle) quizTitle.hidden = official;
    $('btnStart').textContent = resumeStage === 'result'
      ? (official ? 'View Score Report' : '查看成绩报告')
      : (official ? 'Start' : '开始抽测');

    if (official) {
      $('introUnitPick').innerHTML = '';
      const k0 = $('introKicker'); if (k0) k0.hidden = false;
      const f0 = $('quizCardFacts'); if (f0) { f0.hidden = true; f0.innerHTML = ''; }
      /* 参数并进主卡左侧；右侧换成「考试结构」，别再空着 */
      $('introParams').classList.remove('mock-stats', 'exam-start-meta');
      $('introParams').innerHTML = '<span class="quiz-scope-h">TEST STRUCTURE</span>' +
        '<div class="ms-row"><span>Module 1</span><b>' + O.questionsPerModule + ' questions · ' + (O.secondsPerModule / 60) + ' min</b></div>' +
        '<div class="ms-row"><span>Module 2</span><b>' + O.questionsPerModule + ' questions · ' + (O.secondsPerModule / 60) + ' min</b></div>' +
        '<div class="ms-total"><span>Total</span><b>' + (O.questionsPerModule * 2) + ' questions · ' + (O.secondsPerModule * 2 / 60) + ' min</b></div>' +
        '<ul class="ms-included">' +
        '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m20 6-11 11-5-5"/></svg>Calculator on every question</li>' +
        '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m20 6-11 11-5-5"/></svg>Reference sheet always available</li>' +
        '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m20 6-11 11-5-5"/></svg>Answers lock after Module 2</li>' +
        '</ul>';
      let mt = document.getElementById('mockCardTitle');
      const copy0 = document.querySelector('#introStartCard .mock-card-copy');
      if (copy0 && !mt) {
        mt = document.createElement('strong');
        mt.id = 'mockCardTitle'; mt.className = 'quiz-unit-name';
        mt.textContent = 'Math · Practice Test';
        const k = document.getElementById('introKicker');
        copy0.insertBefore(mt, k ? k.nextSibling : copy0.firstChild);
        const md = document.createElement('p');
        md.id = 'mockCardDesc'; md.className = 'quiz-unit-desc';
        md.textContent = 'Two modules, ' + O.questionsPerModule + ' questions each. Module 2 adapts to how you did on Module 1.';
        mt.parentNode.insertBefore(md, mt.nextSibling);
      }
      const mf = $('quizCardFacts');
      if (mf) {
        mf.hidden = false;
        mf.innerHTML = '<span class="quiz-fact"><b>' + O.questionsPerModule + '</b>Questions</span>' +
          '<span class="quiz-fact"><b>' + (O.secondsPerModule / 60) + '</b>Minutes</span>' +
          /* 恢复 Module 2 时开场页要标当前模块：以前固定写「2 Modules」，
             模块一已到期、刷新后回到开始页的人看不出自己已在模块二（点 Start
             才发现），11-24 修过一次同类问题，渲染迁到 facts 行时又丢了。 */
          '<span class="quiz-fact"><b>' + ((S && Number(S.module) === 2) ? 2 : 1) + '</b>of 2 modules</span>';
      }
      /* Directions 收成 details 可展开条；完整 Bluebook 原文仍在答题页左上角 Directions 弹窗里。 */
    } else {
      $('introDirections').hidden = true;
      /* 单元选择做成一条分段控件（洋葱学园那类学习站的做法），
         不再用四张占满半屏的卡：一行就能扫完，也少一层大盒子 */
      $('introUnitPick').innerHTML = '<div class="quiz-tabs" role="tablist" aria-label="选择单元">' +
        UNITS.map(u => `<button type="button" role="tab" class="quiz-tab${u.id === QUIZ_UNIT ? ' on' : ''}" data-unit="${u.id}" aria-selected="${u.id === QUIZ_UNIT}">` +
          `<span class="qt-dot" aria-hidden="true"></span><span class="qt-code">U${u.id}</span><span class="qt-name">${esc(u.cn)}</span></button>`).join('') + '</div>';
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
      /* 题量与时限不再单列一排（会从卡片里漏出去）：并进主卡左侧的 facts 行。
         total 是错题总量（与错题本同数），不是必抽配额。 */
      $('introParams').innerHTML = '';
      const facts = $('quizCardFacts');
      if (facts) {
        facts.hidden = false;
        facts.innerHTML = '<span class="quiz-fact"><b>' + t.total + '</b>道题</span>' +
          '<span class="quiz-fact"><b>' + fmt(S.durationSec * 1000) + '</b>限时</span>';
      }
      const kicker = $('introKicker');
      if (kicker) { kicker.hidden = false; kicker.textContent = '第 ' + QUIZ_UNIT + ' 单元'; }
      if (quizTitle) quizTitle.hidden = true;
      const uu = UNITS.find(u => u.id === QUIZ_UNIT) || { cn: '' };
      if (kicker && kicker.parentNode) {
        let name = document.getElementById('quizUnitName');
        if (!name) {
          name = document.createElement('strong');
          name.id = 'quizUnitName'; name.className = 'quiz-unit-name';
          kicker.parentNode.insertBefore(name, kicker.nextSibling);
        }
        name.textContent = uu.cn;
        let desc = document.getElementById('quizUnitDesc');
        if (!desc) {
          desc = document.createElement('p');
          desc.id = 'quizUnitDesc'; desc.className = 'quiz-unit-desc';
          if (facts && facts.parentNode) facts.parentNode.insertBefore(desc, facts);
          else name.parentNode.insertBefore(desc, name.nextSibling);
        }
        /* 范围说明和下面「涵盖考点」是同一批名字，重复一遍只会显得啰嗦：这行收掉 */
        desc.remove();
        /* 右侧「涵盖考点」：只列考点名，不显示题量 */
        let scope = document.getElementById('quizScope');
        const card = document.getElementById('introStartCard');
        const copy = card && card.querySelector('.mock-card-copy');
        if (copy && !scope) {
          scope = document.createElement('aside');
          scope.id = 'quizScope'; scope.className = 'quiz-scope';
          copy.parentNode.insertBefore(scope, copy.nextSibling);
        }
        if (scope) {
          /* 题库里的 topic 常带「· 第 3 题」这类逐题尾巴，直接列会变成六条重复；
             先洗掉尾巴再去重，不够四条用本单元的范围名补齐（只列名字，不列题量）。 */
          const seen = [];
          const push = t => {
            t = String(t || '').trim();
            if (!t) return;
            /* 同一考点在题库里常写成「平行线与垂直」「平行线被截线所截求角」这类近义变体，
               按前三个字收口，省得列出一堆读起来一样的条目 */
            const key = t.slice(0, 3);
            if (seen.some(x => x.slice(0, 3) === key) || seen.indexOf(t) >= 0) return;
            seen.push(t);
          };
          BANK.filter(q => q.unit === QUIZ_UNIT && q.topic).forEach(q => {
            push(String(q.topic).replace(/^[0-9.]+\s*/, '').replace(/\s*·\s*第\s*\d+\s*题.*$/, '')
              .replace(/（填空）/g, '').replace(/[：:]\s*[^·]*$/, ''));
          });
          String(UNIT_BLURB[QUIZ_UNIT] || '').split('·').forEach(push);
          scope.innerHTML = '<span class="quiz-scope-h">涵盖考点</span><ul>' +
            seen.slice(0, 4).map(t => '<li><i></i>' + esc(t) + '</li>').join('') + '</ul>';
        }
        /* 主按钮收进左栏，标题/说明/数字/按钮一条竖线下来 */
        const btn = document.getElementById('btnStart');
        if (copy && btn && btn.parentNode !== copy) copy.appendChild(btn);
        /* 左栏右侧留白那一大片，用一张本单元的线稿图填住（不做标签、不写字） */
        if (copy) {
          /* 线稿图必须跟着当前单元换：以前只在第一次渲染时插一次，
             从 U1 切到 U2 还留着 U1 的直线图，四个单元看起来一模一样。 */
          let art = copy.querySelector('.unit-art');
          if (!art) {
            art = document.createElement('div');
            art.className = 'unit-art';
            art.setAttribute('aria-hidden', 'true');
            copy.appendChild(art);
          }
          art.innerHTML = UNIT_ART[QUIZ_UNIT] || '';
        }
      }
    }
    renderSpecialOptions();
    $('clockText').textContent = fmt((official ? O.secondsPerModule : S.durationSec) * 1000);
    $('clockLabel').textContent = T('剩余时间', 'Time Remaining');
    $('tbTotal').textContent = official ? 'Section 2 of 2 · Math' : 'Unit ' + QUIZ_UNIT;
    $('bankCount').textContent = String(OFFICIAL ? 0 : ((UNITS.find(u => u.id === QUIZ_UNIT) || {}).total || BANK.length));
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
    const rg = C.sessionRange(S);
    /* 恢复时已校验过；真出现 null 说明内存里的会话被写坏了，宁可作废也不凑区间 */
    if (!rg) throw new Error('session-invalid');
    return [rg.lo, rg.hi];
  }
  const cur = () => S.paper[S.idx];
  const curQ = () => byId(cur().id);
  const curA = () => S.answers[cur().uid];
  const isLocked = uid => S.locked || S.answers[uid].locked;
  function editableRange() { return range(); }

  const CHECK_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  function renderAll() {
    try { renderQuestion(); renderNavigator(); tick(); }
    catch (e) {
      if (e && e.message === 'session-invalid') { runtimeVoid(); return; }
      throw e;
    }
  }
  function renderQuestion() {
    const inst = cur(), q = curQ(), a = curA(), [lo, hi] = range();
    const pos = S.idx - lo + 1, total = hi - lo + 1;   // 合法会话的区间由 sessionRange 保证非空
    /* 注意：这里不能叫 T —— 模块级 T(zh,en) 是文案选择器，同名会把 776 行的
       T(...) 调用变成「对象不可调用」，模考里凡是带 line-answer 开关的题直接崩。 */
    const TXT = (window.TD_TEXT || {})[q.id] || {};
    const CH = TXT.choices || {};
    $('qStem').innerHTML = window.TD_FIG ? window.TD_FIG.fmtMath((TXT.stem || q.stem || '题干文字暂缺。').trim() || '题干文字暂缺。') : esc((TXT.stem || q.stem || '题干文字暂缺。').trim() || '题干文字暂缺。');
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
    /* progress-rail: 顶栏底部 2px 进度线（样式在 glass.css 的 question-theme 块） */
    (function(){const bar=document.querySelector('.drill-questionbar-inner');if(bar&&total>0)bar.style.setProperty('--q-progress',(pos/total*100).toFixed(2)+'%');})();
    $('footerSection').textContent = MODE === 'mock' ? 'Section 2, Module ' + S.module + ' of 2' : MODE_NAME[MODE] + ' · 第 ' + QUIZ_UNIT + ' 单元';
    $('questionPosition').textContent = OFFICIAL ? 'Question ' + pos + ' of ' + total : '第 ' + pos + ' / ' + total + ' 题';

    const locked = isLocked(inst.uid), area = $('answerArea');
    area.innerHTML = '';
    if (q.type === 'mcq') {
      const figList = TXT.figure || [];
      const resolver = window.TD_CHOICE_FIGURES;
      const opt = L => {
        const raw = (CH[L] || '').trim();
        let hit = resolver ? resolver.resolve(q, L, { text: TXT }) : null;
        if (hit && hit.source === 'legacy' && raw) hit = null; /* 旧通路保持「有文字先用文字」 */
        const isFig = figList.indexOf(L) >= 0;
        const visual = !!(hit && (hit.kind === 'image' || hit.kind === 'vector'));
        return { L, raw, isFig, hit, visual };
      };
      if (!optLetters(q.id).some(L => { const it = opt(L); return it.raw || it.visual; })) {
        area.innerHTML = '<div class="drill-choices" role="radiogroup" aria-label="答案选项" data-choices="missing">' +
          '<p class="drill-choice-missing" style="padding:14px 16px;border:1px dashed var(--line);border-radius:10px;color:var(--sub);margin:0">' +
          '选项缺失：这道题的选项在原书里无法识别，本题暂不可作答。</p></div>';
        return;
      }
      var choiceHtml = '<div class="drill-choices" role="radiogroup" aria-label="答案选项">' + optLetters(q.id).map(L => {
        const it = opt(L), selected = a.v === L;
        let disp, cls;
        if (it.raw && !(it.hit && it.hit.source === 'field')) {
          disp = window.TD_FIG ? (window.TD_FIG.fmtChoice || window.TD_FIG.fmtMath)(it.raw, q.id) : esc(it.raw);
          cls = '';
        } else if (it.hit && it.visual) {
          disp = it.hit.html;
          cls = it.hit.cls;
        } else if (it.hit && it.hit.kind === 'missing') {
          disp = it.hit.html;
          cls = it.hit.cls;
        } else {
          disp = '<span class="drill-choice-placeholder">图形或公式选项</span>';
          cls = it.isFig ? ' is-figure is-missing' : '';
        }
        const image = it.visual ? ' is-image-option' : '';
        return `<div class="drill-choice-row" data-choice="${L}">` +
          `<button type="button" class="drill-choice${cls}${image}${selected ? ' is-selected' : ''}" data-choice="${L}" role="radio" aria-checked="${selected}" ${locked ? 'disabled' : ''}>` +
          `<span class="drill-choice-letter">${L}</span><span class="drill-choice-text">${disp}</span>` +
          `<span class="drill-choice-check" aria-hidden="true">${CHECK_ICON}</span></button>` +
          (window.TD_CROSSOUT ? window.TD_CROSSOUT.buttonHtml(L, window.TD_CROSSOUT.has(q.id, L), locked) : '') +
          `</div>`;
      }).join('') + '</div>';
      /* 四个选项都是小表格时按原书摆成两列（A/C 上排、B/D 下排） */
      if ((choiceHtml.match(/td-choice-table/g) || []).length >= 4) {
        const stackTbl = (window.TD_CHOICE_TABLE_STACK || {})[q.id];
        choiceHtml = choiceHtml.replace('<div class="drill-choices"', '<div class="drill-choices is-table-choices' +
          (stackTbl ? ' is-table-choices-stacked' : '') + '"');
      }
      area.innerHTML = choiceHtml;
      area.querySelectorAll('.drill-choice').forEach(button => button.addEventListener('click', () => {
        if (isLocked(cur().uid)) return;
        curA().v = button.dataset.choice;
        persist(); renderQuestion(); renderNavigator();
      }));
      if (window.TD_CROSSOUT) window.TD_CROSSOUT.bind(area, q.id, locked);
    } else if (q.values && q.values.length > 1) {
      /* 两空 grid-in：判分（TDGrade.dualCorrect）按 "第一空, 第二空" 解析，
         模考页原来只画一个框，一旦卷面出现双空题就永远填不全。这里与讲义页对齐。 */
      const parts0 = String(a.v || '').split(/[,;]/);
      area.innerHTML = '<div class="drill-gridin drill-grid-multi">' + q.values.map((_, i) => {
        const lbl = OFFICIAL ? (i === 0 ? 'First answer' : i === 1 ? 'Second answer' : 'Answer ' + (i + 1))
                             : (i === 0 ? '第一空' : i === 1 ? '第二空' : '第 ' + (i + 1) + ' 空');
        return `<label for="gridAnswer${i}">${lbl}</label>` +
          `<input id="gridAnswer${i}" data-box="${i}" class="editable" type="text" value="${esc((parts0[i] || '').trim())}"` +
          ` autocomplete="off" spellcheck="false" inputmode="decimal" maxlength="6" ${locked ? 'disabled' : ''}>`;
      }).join('') +
        (OFFICIAL
          ? '<p class="drill-input-note"><button type="button" class="exam-spr-link">Student-produced response directions</button></p>'
          : '<p class="drill-input-note">每空可输入整数、小数或分数，例如 12、4.5 或 3/4。</p>') +
        '<p class="drill-input-warn" id="gridWarn" hidden></p></div>';
      const boxes = Array.from(area.querySelectorAll('.drill-grid-multi input'));
      const gridWarnM = $('gridWarn');
      const capBox = v => {
        const neg = v.charAt(0) === '-' ? '-' : '';
        const body = (neg ? v.slice(1) : v).replace(/[^0-9./]/g, '').slice(0, 5);
        return neg + body;
      };
      const commitMulti = () => {
        const v = boxes.map(n => n.value.trim()).filter(x => x !== '').join(', ');
        curA().v = v; persist(); renderNavigator();
        const bad = boxes.some(n => { const t = n.value.trim(); return t && !/^-?(?:\d+(?:\.\d+)?|\.\d+|\d+\/\d+)$/.test(t); });
        gridWarnM.hidden = !bad;
        gridWarnM.textContent = bad
          ? (OFFICIAL ? 'Each box accepts digits, a decimal point, a slash, or a minus sign only.' : '每一空只能写数字、小数点、斜杠和负号，不要带 %、$、逗号、字母或单位')
          : '';
        boxes.forEach(n => n.classList.toggle('is-invalid', bad && !!n.value.trim()));
      };
      boxes.forEach(n => n.addEventListener('input', event => {
        if (isLocked(cur().uid)) return;
        const v = capBox(event.target.value);
        if (v !== event.target.value) event.target.value = v;
        commitMulti();
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
        if (s && /[^0-9./\-]/.test(s)) warn = OFFICIAL ? 'Use digits, a decimal point, a slash, or a minus sign only. No %, $, commas, letters, or units.' : '只能输入数字、小数点、斜杠和负号，不要带 %、$、逗号、字母或单位';
        else if (s && !/^-?(?:\d+(?:\.\d+)?|\.\d+|\d+\/\d+)$/.test(s)) warn = OFFICIAL ? 'Invalid format. Enter a decimal (e.g., 0.75) or a fraction (e.g., 3/4).' : '格式无效：可写小数（如 0.75）或分数（如 3/4）';
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
      btn.textContent = T('查看图形答案 · Show graph answer', 'Show graph answer');
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
    /* 开场页还没开考：不落盘。否则每次打开模考都会在本地写一条 startedAt=0 的
       「坏存档」，下次刷新就触发一次无谓的作废流程（以前还会在页面上弹提示）。 */
    if (S && S.stage === 'intro' && !S.startedAt) return;
    const disk = load(KEY_SESSION);
    let base = null;
    try { base = JSON.parse(BASE); } catch (e) { console.warn('解析会话快照失败', e); }
    const hasPaper = x => x && typeof x === 'object' && !Array.isArray(x) && Array.isArray(x.paper);
    /* Only a LIVE session (started or finished) on disk carries another tab's
       real answers worth preserving. An unstarted intro session is disposable:
       seeding from it would silently replace our freshly built plan/paper with
       a stale one from a different unit/mode sharing the same key. */
    /* 只认「同一份卷」的活会话：mode/单元/卷面必须一致。否则上一页的模考
       （或另一个单元的抽查）会被当成同一场，把旧 paper 拼到新卷上——uid 对不上
       就直接 isLocked 崩页，uid 对上则把旧答案悄悄记到新题上。 */
    const samePaper = !!S && hasPaper(disk) && disk.mode === S.mode &&
      (S.mode !== 'quiz' || String(disk.unitId || '') === String(S.unitId || '')) &&
      snap(disk.paper) === snap(S.paper);
    const diskIsLive = samePaper && (!!disk.startedAt || !!disk.finished);
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
      const crossed = window.TD_CROSSOUT ? window.TD_CROSSOUT.list(q.id) : [];
      const ctl = locked ? `<b>${esc(a.v || '—')}</b> <span class="tiny muted">${OFFICIAL ? 'Locked' : '已锁定'}</span>`
        : q.type === 'mcq'
          ? `<div class="miniopts">${optLetters(q.id).map(L => `<button class="${a.v === L ? 'on' : ''}" data-uid="${esc(inst.uid)}" data-l="${L}">${L}</button>`).join('')}</div>`
          : `<input class="gridmini editable" data-uid="${esc(inst.uid)}" value="${esc(a.v)}" placeholder="${OFFICIAL ? 'Enter answer' : '输入答案'}">`;
      rows.push(`<tr><td><b>Q${i - lo + 1}</b></td>
        <td>${OFFICIAL ? '' : esc(q.topic)}<div class="tiny muted">U${q.unit} ${OFFICIAL ? '' : '· ' + esc(q.source)} ${inst.from === 'wrong' ? (OFFICIAL ? '· Previously missed' : '· 历史错题') : ''}${a.marked ? (OFFICIAL ? ' · Marked' : ' · 已标记') : ''}${crossed.length ? (OFFICIAL ? ' · Crossed out: ' : ' · 已划掉：') + crossed.join(', ') : ''}</div></td>
        <td><span class="pill ${a.v ? 'wait' : 'no'}">${OFFICIAL ? (a.v ? 'Answered' : 'Not answered') : (a.v ? '已作答' : '未作答')}</span></td>
        <td>${ctl}</td><td><button class="btn slim" data-go="${i}">${OFFICIAL ? 'Go' : '前往'}</button></td></tr>`);
    }
    $('revBody').innerHTML = rows.join('');
    const answered = rows.length && Array.from({ length: hi - lo + 1 }, (_, k) => S.answers[S.paper[lo + k].uid].v).filter(Boolean).length;
    const marked = Array.from({ length: hi - lo + 1 }, (_, k) => S.answers[S.paper[lo + k].uid].marked).filter(Boolean).length;
    const RS = OFFICIAL ? ['Answered', 'Not answered', 'Marked', 'Current range'] : ['已作答', '未作答', '已标记', '当前范围'];
    $('revSummary').innerHTML = `<div class="rev-meta"><span>${RS[0]} <b>${answered}</b></span><i></i><span>${RS[1]} <b>${hi - lo + 1 - answered}</b></span><i></i><span>${RS[2]} <b>${marked}</b></span><i></i><span>${RS[3]} <b>${MODE === 'mock' ? 'Module ' + S.module : MODE_NAME[MODE]}</b></span></div>`;
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
      : (MODE === 'mock' ? 'Math · Module 2 of 2' : '单元抽查 · 第 ' + QUIZ_UNIT + ' 单元 · ' + (hi - lo + 1) + ' 题');
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
    clearAbandoned(S.startedAt);
    const detail = S.paper.map((inst, i) => {
      const inst0 = inst || {}, q = byId(inst0.id), a = (S.answers && S.answers[inst0.uid]) || {}, given = safeText(a.v);
      const ok = C.grade(q, given);
      return { pos: i + 1, uid: inst.uid, id: q.id, unit: q.unit, section: q.section, topic: q.topic,
               source: q.source, image: q.image, hint: q.hint, type: q.type, level: q.level,
               from: inst.from, correct: ok, given,
               answer: q.type === 'grid' && q.answer == null ? q.value : q.answer,
               points: ok ? 1 : 0,
               seconds: Math.round((safeNum(a.spent) || 0) / 1000), marked: isRightFlag(a.marked) };
    });
    const correct = detail.filter(d => isRightFlag(d.correct)).length;
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
    const all = asArr(load(KEY_RESULTS)); all.push(result); if (all.length > 40) all.shift();
    save(KEY_RESULTS, all);                       // independent store; original state untouched
    persist();
    renderResult(); setStage('result'); window.scrollTo(0, 0);
    if (auto) toast(OFFICIAL ? 'Time is up. Your test was submitted automatically and answers are locked.' : '时间归零 · 已自动交卷并锁定答案');
  }

  function renderResult() {
    const r = S.result; if (!r) return;
    /* 存档里的成绩报告可能是旧版本/半截写入/云端合并产物：缺 estimate、report
       或 total/correct 不是数字时，整页不能因为一个字段就白屏。能算的从 detail
       现算，算不出的显示「—」。 */
    const detail0 = asArr(r.detail).filter(isRec);
    /* total/correct/elapsed 是布尔时 Number(true) 会变成 1：旧记录会显示
       假的 100% / 1 分钟。safeNum 已排除布尔，这里统一走它。 */
    const rTotal = countNum(r.total);
    /* total 与 detail 不一致时（旧版/云端只写了一半卷面）：detail 是逐题证据，
       不能因为 total=22 就把 44 题的整卷印成 22 题，更不能把 correct 夹成 100%。 */
    let total = Math.max(detail0.length, rTotal != null && rTotal > 0 ? rTotal : 0);
    /* 官方模考整卷只有 44 题：旧版/云端把 total 写成 999 时，成绩页会印
       「30 / 999」并把正确率稀释成个位数。记录页已封顶，结果页同一口径。 */
    if (MODE === 'mock' && total > 44) total = 44;
    /* 单元抽查卷长上限 30（QUIZ_TIERS T3/T4）；total 999 的旧记录同样按明细/30 封顶。 */
    if (MODE === 'quiz' && total > 30) total = detail0.length ? Math.min(30, detail0.length) : 30;
    const rCorrect = countNum(r.correct);
    const correct = rCorrect != null ? Math.max(0, Math.min(total, rCorrect)) : detail0.filter(d => isRightFlag(d.correct)).length;
    const rElapsed = safeNum(r.elapsed);
    const elapsed = rElapsed != null && rElapsed > 0 ? rElapsed : 0;
    const rDuration = safeNum(r.durationSec);
    const durationSec = rDuration != null && rDuration > 0 ? rDuration : 0;
    const est = asObj(r.estimate), rep = asObj(r.report);
    const units = asArr(rep.units).filter(isRec);
    const topics = asArr(rep.topics).filter(isRec);
    const priority = asArr(rep.priority).filter(isRec);
    /* 估分可能被旧版/云端写成 999/0/负数：结果页直接印成「999 / 800」。
       只接受官方 200–800 区间，越界的当「—」，与记录页同一口径。 */
    const scaledRaw = countNum(est.scaled);
    const scaled = scaledRaw != null && scaledRaw >= 200 && scaledRaw <= 800 ? scaledRaw : null;
    const pct = total ? Math.round(correct / total * 100) : 0;
    /* 旧存档/云端合并可能把 mode 写成大写或漏掉：按当前页面的 MODE 兜底，
       否则单元抽查的成绩页会印成「模考」，大写记录会印成「QUIZ」。 */
    const modeRaw = safeText(r.mode).trim();
    const modeKey = modeRaw.toLowerCase();
    const modeTxt = MODE_NAME[modeKey] || (modeRaw ? modeRaw : MODE_NAME[MODE]) || '模考';
    /* 云端/旧版可能把 Date.now() 存成字符串；new Date('1700...') 是 Invalid，
       成绩页日期会变成 —。数字字符串先转时间戳，其他交给 Date 解析。 */
    /* date 可能是 null/0（旧存档/云端合并）：new Date(null) 会显示 1970 年。
       数字字符串先按时间戳；ISO 字符串才交给 Date 解析；空/0 一律显示「—」。 */
    /* true/false 的 Number() 是 1/0：旧记录日期是布尔时也会落进 1970。 */
    const dateNum = typeof r.date === 'boolean' || (typeof r.date === 'object' && !(r.date instanceof Date)) ? NaN : Number(r.date);
    const dateRaw = typeof r.date === 'string' ? r.date.trim() : '';
    const dateObj = Number.isFinite(dateNum) && dateNum > 0
      ? new Date(dateNum)
      : (dateRaw && !Number.isFinite(dateNum) ? new Date(dateRaw) : null);
    const dateTxt = !dateObj || isNaN(dateObj.getTime()) ? '—' : dateObj.toLocaleString(OFFICIAL ? 'en-US' : 'zh-CN');
    $('resTitle').textContent = OFFICIAL ? 'Score Report' : modeTxt + ' · 成绩报告';
    $('resSub').textContent = dateTxt + ' · ' +
      (OFFICIAL
        ? ((isTrueFlag(r.auto) ? 'Auto-submitted when time expired' : 'Submitted manually') + ' · Answers locked' +
           (MODE === 'mock' ? ' · Module 2 path: ' + (r.path === 'hard' ? 'harder' : r.path === 'easy' ? 'easier' : 'not reached') : ''))
        : ((isTrueFlag(r.auto) ? '计时归零自动交卷' : '手动交卷') + ' · 答案已锁定' +
           (MODE === 'mock' ? ' · Module 2 路径：' + (r.path === 'hard' ? 'harder' : r.path === 'easy' ? 'easier' : '未进入') : '')));
    /* 只有模考换算 200–800 分；单元抽测只展示正确率，不出分、不折成 44 题。 */
    const isMock = MODE === 'mock';
    /* 原始分上限固定 44（模考和非模考都折算到 44 题）。旧记录/云端乱写
       raw=999 时，成绩页会印出「999 / 44」这种不可能的分。 */
    const rawN = countNum(est.raw);
    const rawVal = rawN == null ? null : Math.max(0, Math.min(44, rawN));
    const rawTxt = (rawVal == null ? '—' : rawVal) + ' / 44';
    applyQuizCopy();
    $('resScoreLabel').textContent = isMock ? T('预估 SAT 数学分数 · 200–800', 'Estimated SAT Math Score · 200–800') : '本次练习正确率';
    $('resScore').innerHTML = isMock
      ? (scaled == null ? '—' : scaled) + '<small> / 800</small>'
      : pct + '<small>%</small>';
    $('resPath').textContent = isMock
      ? (OFFICIAL
          ? 'Raw score ' + rawTxt + ' · Adaptive path: ' + (est.path === 'easy' ? 'easier' : 'harder')
          : '原始分 raw ' + rawTxt + ' · 参考路径 ' + (est.path === 'easy' ? 'easier' : 'harder'))
      : '答对 ' + correct + ' / ' + total + ' 题 · 正确率 ' + pct + '%';
    const avg = total ? Math.round(elapsed / total) : 0;
    /* seconds 可能是布尔/Infinity/对象：Number(true) 会变成 1 秒，
       Infinity 会把「最长单题」算成 Infinity。统一走 safeNum。 */
    const slow = Math.max(0, ...detail0.map(d => safeNum(d.seconds) || 0));
    const KV = OFFICIAL
      ? ['Correct / Total', 'Accuracy', 'Raw score (1 pt each)', 'Total time', 'Average per question', 'Longest question', 'Incorrect', 'Time limit / Used']
      : ['答对 / 总题', '正确率', '原始分（每题 1 分）', '总用时', '平均每题', '最长单题', '错题数', '限时 / 实耗'];
    $('resKV').innerHTML = `<div><span>${KV[0]}</span><b>${correct} / ${total}</b></div>
      <div><span>${KV[1]}</span><b>${pct}%</b></div>
      <div><span>${KV[2]}</span><b>${correct}${OFFICIAL ? ' pts' : ' 分'}</b></div>
      <div><span>${KV[3]}</span><b>${fmt(elapsed * 1000)}</b></div>
      <div><span>${KV[4]}</span><b>${fmt(avg * 1000)}</b></div>
      <div><span>${KV[5]}</span><b>${fmt(slow * 1000)}</b></div>
      <div><span>${KV[6]}</span><b>${total - correct}</b></div>
      <div><span>${KV[7]}</span><b>${fmt(durationSec * 1000)} / ${fmt(elapsed * 1000)}</b></div>`;
    $('resBasis').textContent = isMock
      ? (OFFICIAL
          ? 'Estimate converts raw points to the 200–800 scale. It is a practice estimate, not an official score.'
          : (typeof est.basis === 'string' && est.basis ? est.basis + '。' : '') + O.scaleNote)
      : '单元练习只统计本次正确率与错题分布，不换算 SAT 分数。';

    $('resUnits').innerHTML = units.map(u => {
      const unitKey = safeText(u.unit), nm = OFFICIAL ? (UNIT_EN[unitKey] || safeText(u.name)) : safeText(u.name).replace(/\s*·\s*第\s*\d+\s*题\s*$/, '');
      const rate = safeNum(u.rate) || 0, wrong = safeNum(u.wrong) || 0, n = safeNum(u.n) || 0;
      return `<div class="kp-row"><span class="nm" title="${esc(nm)}">${esc(nm || '—')}</span>
      <span class="bar"><i style="width:${Math.round((1 - rate) * 100)}%;background:${rate > .5 ? 'var(--bad)' : rate > 0 ? 'var(--warn)' : 'var(--ok)'}"></i></span>
      <span class="pct">${OFFICIAL ? 'Wrong ' : '错 '}${wrong}/${n}</span></div>`;
    }).join('') || `<div class="small muted">${OFFICIAL ? 'All correct — nothing to prioritize' : '本次全部答对，无需补强'}</div>`;
    /* 同一个知识点的多道错题要合并成一行，别一行一个「· 第 N 题」 */
    const cleanTopic = v => safeText(v).replace(/\s*·\s*第\s*\d+\s*题\s*$/, '').trim();
    const topicAgg = [];
    topics.forEach(t => {
      const nm = cleanTopic(t.name) || '—';
      let row = topicAgg.find(x => x.name === nm);
      if (!row) { row = { name: nm, wrong: 0, n: 0 }; topicAgg.push(row); }
      row.wrong += safeNum(t.wrong) || 0;
      row.n += safeNum(t.n) || 0;
    });
    topicAgg.sort((a, b) => b.wrong - a.wrong);
    $('resTopics').innerHTML = topicAgg.slice(0, 12).map(t => {
      const nm = t.name, rate = t.n ? 1 - t.wrong / t.n : 0, wrong = t.wrong, n = t.n;
      return `<div class="kp-row"><span class="nm" title="${esc(nm)}">${esc(nm || '—')}</span>
      <span class="bar"><i style="width:${Math.round((1 - rate) * 100)}%;background:${rate > .5 ? 'var(--bad)' : rate > 0 ? 'var(--warn)' : 'var(--ok)'}"></i></span>
      <span class="pct">错 ${wrong}/${n}</span></div>`;
    }).join('');
    $('resPriority').innerHTML = priority.map(p => {
      const level = safeText(p.level).toLowerCase();
      return `<div class="prio-item">
      <span class="prio-lv${level ? ' ' + esc(level) : ''}">${esc(safeText(p.level) || '—')}</span>
      <div style="flex:1"><b>${esc(safeText(p.name) || '—')}</b> <span class="tiny muted">${p.type === 'unit' ? '单元' : '知识点'}</span>
        <div class="small muted" style="margin-top:2px">${esc(safeText(p.reason))}</div>
        <div class="tiny" style="margin-top:3px;color:var(--blue-strong)">${esc(safeText(p.action))}</div>
        <div class="tiny muted" style="margin-top:3px">对应错题：${esc(asArr(p.wrongIds).map(safeText).filter(Boolean).join('、')) || '—'}</div></div></div>`;
    }).join('') || '<div class="small muted">本次无错题</div>';
    /* result-priority: 把「复习优先级」移到分数之前——先给下一步，再给数字。DOM 层移动，阅读顺序一致 */
    (function(){var st=document.getElementById('stage-result');if(!st)return;var sc=st.querySelector('.exam-score-panel'),pr=st.querySelector('.exam-priority-panel');if(sc&&pr&&sc.parentNode&&pr.parentNode===sc.parentNode&&pr.nextElementSibling!==sc){sc.parentNode.insertBefore(pr,sc);}})();
    renderTypeSummary();
    renderResultList();
  }
  function renderResultList() {
    const r = S.result, allD = asArr(r.detail).filter(isRec), list = resultTab === 'wrong' ? allD.filter(d => !isRightFlag(d.correct)) : allD;
    const AN = window.TD_ANALYSIS;
    $('resList').innerHTML = list.map(d => {
      const did = safeText(d.id) || '—';
      const crossed = window.TD_CROSSOUT ? window.TD_CROSSOUT.list(did) : [];
      const dUnit = safeText(d.unit) || '—', dType = safeText(d.type), dPoints = safeNum(d.points), dSeconds = safeNum(d.seconds) || 0;
      const dTopic = safeText(d.topic), dSource = safeText(d.source), dGiven = safeText(d.given), dHint = safeText(d.hint), dPos = safeText(d.pos) || '?';
      const bankQ = BANK.find(x => x.id === did) || {};
      /* 旧存档的 detail 可能是 answer:null（37 道填空只有 value，scoreSession 修复前直接透传）：
         逐题回顾的「正确答案」会印成「—」。按 answer → value → 题库 answer/value/values 兜底，
         让已经交卷的历史记录也能显示答案，而不是只有记录页能补。 */
      let dAnswer = safeText(d.answer) || safeText(d.value);
      if (!dAnswer) {
        dAnswer = safeText(bankQ.answer);
        if (!dAnswer && bankQ.type === 'grid')
          dAnswer = safeText(bankQ.value) || (Array.isArray(bankQ.values) ? bankQ.values.join(', ') : '');
      }
      const okFlag = isRightFlag(d.correct);
      const meta = (OFFICIAL ? 'U' + dUnit + ' · ' + (dType === 'grid' ? 'Grid-in' : 'Multiple choice') : 'U' + dUnit + ' · ' + (dType === 'grid' ? '填空' : '选择'));
      const ptsTxt = dPoints == null ? '—' : (OFFICIAL ? dPoints + ' pt' : dPoints + ' 分');
      let causeHtml = '';
      if (!okFlag && AN && !OFFICIAL) causeHtml = `<div class="rev-cause">错因 · ${esc(AN.analyze(bankQ, dGiven, (window.TD_TEXT || {})[did]).title)}`;
      if (!okFlag && dHint && !OFFICIAL) causeHtml += (causeHtml ? '<br>' : '<div class="rev-cause">') + '提示 · ' + esc(dHint);
      if (causeHtml) causeHtml += '</div>';
      return `<div class="rev-item ${okFlag ? 'ok' : 'no'}">
      <span class="rev-flag">${okFlag ? '✓' : '✗'}</span>
      <div class="rev-main">
        <div class="rev-line1">
          <b class="rev-q">Q${esc(dPos)}</b>
          <span class="rev-topic">${OFFICIAL ? '' : esc(dTopic || '—')}</span>
          <span class="rev-meta">${meta} · ${ptsTxt}${isRightFlag(d.marked) ? (OFFICIAL ? ' · Marked' : ' · 曾标记') : ''}${d.from === 'wrong' ? (OFFICIAL ? ' · Previously missed' : ' · 历史错题') : ''}</span>
        </div>
        <div class="rev-line2">${OFFICIAL ? '' : esc(dSource) + ' · '}${OFFICIAL ? 'Time ' : '用时 '}${fmt(dSeconds * 1000)}${crossed.length ? (OFFICIAL ? ' · Crossed out ' : ' · 已划掉 ') + crossed.join(', ') : ''}</div>
        <div class="rev-ans">
          <span class="rev-chip no">${OFFICIAL ? 'Your answer' : '你的答案'}<i>${esc(dGiven || '—')}</i></span>
          <span class="rev-chip ok">${OFFICIAL ? 'Correct answer' : '正确答案'}<i>${esc(dAnswer || '—')}</i></span>
        </div>
        ${causeHtml}</div></div>`;
    }).join('') || `<div class="small muted">${OFFICIAL ? 'No incorrect answers' : '无错题'}</div>`;
  }

  /* 本次错题按错因类型聚合：仅依据作答内容归类，给出共性改进方向 */
  function renderTypeSummary() {
    const box = $('resTypes'); if (!box) return;
    const r = S.result, AN = window.TD_ANALYSIS;
    if (!r || !AN) return;
    const groups = AN.aggregate(asArr(r.detail).filter(isRec), BANK, window.TD_TEXT || {});
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
        if (evt === 'paste' || evt === 'copy' || evt === 'cut') toast(OFFICIAL ? 'Copying or pasting test content is not allowed during the test.' : '考试期间禁止复制 / 粘贴题目与选项内容');
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

  $('bankCount').textContent = String(OFFICIAL ? 0 : ((UNITS.find(u => u.id === QUIZ_UNIT) || {}).total || BANK.length));
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
    if (event.repeat || S.stage !== 'answer') return;
    const letter = window.TD_CROSSOUT && window.TD_CROSSOUT.keyLetter(event);
    if (!letter || window.TD_CROSSOUT.isEditableTarget(event.target)) return;
    if (window.ScratchPad && ScratchPad.isOpen()) return;
    const q = curQ();
    if (!q || q.type !== 'mcq' || isLocked(cur().uid)) return;
    const row = $('answerArea').querySelector('.drill-choice-row[data-choice="' + letter + '"]');
    if (!row) return;
    event.preventDefault();
    window.TD_CROSSOUT.toggleRow(row, q.id, letter);
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
    $('btnCalculator').textContent = '计算器';
    $('btnHideTimer').textContent = '隐藏';
    $('clockLabel').textContent = '剩余时间';
    $('btnDirections').hidden = true;
    $('btnReference').textContent = '公式参考';
    $('navLegend').innerHTML = OFFICIAL
      ? '<span><i class="is-answered"></i>Answered</span><span><i></i>Not answered</span>' +
        '<span><i class="is-marked"></i>Marked for review</span><span><i class="is-current"></i>Current</span>'
      : '<span><i class="is-answered"></i>已答</span><span><i></i>未答</span>' +
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
      if (!window.confirm(OFFICIAL ? 'The timer will not pause. Your answers and progress are saved. Exit the test?' : '退出后计时不会暂停，但作答与进度已自动保存。确定退出吗？')) {
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

  /* 草稿薄雾板：除模考外的练习/抽查都可涂画写草稿，答案区保持可直接填写。
     模考层不开草稿：按钮连同工具条一起从 DOM 移除，不留「禁用但还在」的半死控件。 */
  if (MODE === 'mock') {
    const deadBtn = $('btnScratch');
    if (deadBtn) deadBtn.remove();
  } else if (window.ScratchPad) {
    const scratchBtn = $('btnScratch');
    if (scratchBtn) {
      /* HTML 默认是英文（模考层纯英文）；练习/抽查是中文功能层，这里换回中文 */
      scratchBtn.title = '草稿板：在题目上涂画标记、写草稿，答案可直接填写';
      const lbl = scratchBtn.querySelector('span');
      if (lbl) lbl.textContent = '草稿';
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
  /* 初始化的最后一步才解禁：click 绑好、工具行 bindTools 完成、会话已建好，
     这时点 Start 不会落在半初始化状态。脚本中途挂了就保持禁用，由兜底改 Reload。 */
  $('btnStart').disabled = false;

  window.__TD_EXAM__ = {
    get state() { return S; }, core: C, finalize, enterModule2,
    get remaining() { return S && S.endsAt ? S.endsAt - Date.now() : 0; }
  };
})();
