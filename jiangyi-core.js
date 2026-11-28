/* TD SAT Math · 讲义复习（JIANGYI）core
   ------------------------------------------------------------------
   一个完全独立的板块组：与现有 20 个教材板块（1.1 … 4.4、L1 … L3、
   专项 T 系列）不共享 CATALOG / SECS / 状态 key，互不影响进度与统计。

   数据文件 data/jiangyi.js 由题库侧产出，schema 固定（改字段前必须同步本
   文件顶部与 tools/verify_jiangyi.mjs 的校验规则）：

   window.TD_JIANGYI = {
     source: '讲义（TESTDAILY）',
     units: [
       { id: 1, en: 'Algebra', cn: '代数',
         sections: [ { id: '1.1', cn: '线性方程与函数图像', expect: 14, pages: [131,132] } ] },
       …4 个单元
     ],
     questions: [
       { id: 'JY1-001',            // 新前缀，绝不与 U1-01 / TD-xx 混号
         unit: 1, section: '1.1',   // section 填真实小节号，供筛选/完成度
         page: 131, no: 12,         // 原书页码 + 页内题号
         source: '讲义 p131 #12',   // 三段齐全：讲义 + p{页} + #{页内题号}
         stem: '…', choices: ['-7','-2','2/7','7/2'],
         answer: 'A',               // 只抄答案页 p191–196，不许自己算
         figure: 'fig/jy/1-1-12.svg', // 矢量重画；无图则不填
         proof: 'docs/jiangyi-proof/JY1-001.png' // 原页对照截图（验收用）
       } ]
   }

   规则（写死在这里，不靠人记）：
   1. 例题（Example）不录：答案页没有对应答案的一律不录 —— 由 expect 与
      id 连续性 + 验收脚本兜住；录入侧不得夹带「看着像题」的段落。
   2. 对账口径：每节应有数 = 答案页该节最大题号（units[].sections[].expect），
      已录数必须等于它，差一道不算完成。
   3. 图形一律矢量，禁止裁扫描页（原书带 TESTDAILY / SAT教研组 水印）。
*/
(function () {
  'use strict';
  /* 旧存档/云端可能把 correct 写成字符串 'false'：truthy 会被算成答对。 */
  function flagKey(v){ return typeof v === 'string' ? v.trim().toLowerCase() : v; }
  function isRightFlag(v){ v = flagKey(v); return v === true || v === 1 || v === 'true' || v === '1'; }
  /* 题库侧实际结构（be7b955 起）：window.JY_SECTIONS + window.JY_BANK；
     早期文档里的 TD_JIANGYI{units,questions} 保留兼容，两种都能吃。 */
  var DATA = window.JY_BANK
    ? { source: '讲义（TESTDAILY）', sections: window.JY_SECTIONS || [], questions: window.JY_BANK }
    : (window.TD_JIANGYI || { source: '', units: [], questions: [] });
  /* JY4 下的「教材原题」子组：整组来自练习册 P200–207，不是讲义页码，
     不计入 JY4 官方小节（4.1 / 4.2 …）的题数。 */
  var TB_GROUP = {
    key: 'TB4', board: 'JY4', unit: 4,
    label: 'Unit 4・教材原题（练习册 P200–207）',
    cn: '教材原题（练习册 P200–207）'
  };
  var KEY = 'tdsat_jiangyi_v1';
  var RESULTS_KEY = 'tdsat_exam_suite_results_v1';
  var CJK = /[\u4e00-\u9fff]/;

  function read(key) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function write(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch (e) { return false; }
  }
  function strip(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function secKey(s) {
    var p = String(s).split('.');
    return (+p[0] || 0) * 100 + (+p[1] || 0);
  }

  /* ---------- 归一化：把数据文件里的题变成判分/渲染都能吃的形状 ---------- */
  function normalize(raw, i) {
    if (!raw || !raw.id) return null;
    var id = strip(raw.id);
    var m = id.match(/^JY(\d)-(\d{3,})$/);
    if (!m) return null;                                  // 只认 JY1-001 这类新前缀
    var unit = Number(raw.unit) || Number(m[1]);
    var section = strip(raw.section);
    var sourceRaw = strip(raw.source);
    var group = strip(raw.group) || (/^练习册/i.test(sourceRaw) ? 'textbook' : '');
    /* 官方小节必须是真实小节号；教材原子组来自练习册，section 仍保留原书小节但单独成组。 */
    if (!/^[1-4]\.\d/.test(section) && group !== 'textbook') return null;
    var page = Number(raw.page), no = Number(raw.no);
    if (!(page > 0) || !(no > 0)) return null;
    var source = strip(raw.source) || ('讲义 p' + page + ' #' + no);
    var stem = strip(raw.stem);
    if (!stem) return null;
    var choices = Array.isArray(raw.choices) ? raw.choices.map(strip) : [];
    var type = choices.length >= 2 ? 'mcq' : 'grid';
    var answer = strip(raw.answer);
    /* grid 的数值键：优先 raw.value；answer 是纯数字时兜底。
       answer 若是中文说明（如双空「第一空 250，第二空 123.5」），Number() 会得到
       NaN，旧写法会让这类题永远判错——所以必须显式回退，不能直接 Number(answer)。 */
    var keyNum = Number(raw.value);
    if (!isFinite(keyNum)) keyNum = Number(answer);
    /* 官方双空题：一空一键，values 必须原样带过来，否则渲染层拿不到第二空。 */
    var vals = Array.isArray(raw.values)
      ? raw.values.map(Number).filter(function (v) { return isFinite(v); }) : null;
    return {
      id: id, unit: unit, section: section, page: page, no: no, source: source,
      stem: raw.stem, text: stem, choices: choices, type: type,
      answer: answer, value: type === 'grid' && isFinite(keyNum) ? keyNum : undefined,
      values: type === 'grid' && vals && vals.length > 1 ? vals : undefined,
      figure: raw.figure || null, figures: raw.figure ? [raw.figure] : [],
      choiceFigures: raw.choiceFigures || null,
      fig: raw.fig || null, table: Array.isArray(raw.table) ? raw.table : null,
      proof: raw.proof || ('docs/jiangyi-proof/' + id + '.png'),
      unitName: raw.unitName || null, hint: raw.hint || '',
      area: raw.area || 'problem-solving', origin: 'jiangyi', board: 'JY' + unit,
      group: group || null, no_: no
    };
  }

  var ALL = (DATA.questions || []).map(normalize).filter(Boolean);
  var BY_ID = {};
  ALL.forEach(function (q) { BY_ID[q.id] = q; });

  /* 板块内顺序：小节号 → 页码 → 页内题号（严格，不掺 id 字典序） */
  ALL.sort(function (a, b) {
    return secKey(a.section) - secKey(b.section) || a.page - b.page || a.no - b.no ||
      a.id.localeCompare(b.id);
  });

  /* ---------- 四个子板块（与现有 20 个板块分开，编号固定 JY1…JY4） ---------- */
  var BOARD_META = [
    { id: 'JY1', unit: 1, en: 'Algebra', cn: '代数' },
    { id: 'JY2', unit: 2, en: 'Problem Solving and Data Analysis', cn: '问题解决与数据分析' },
    { id: 'JY3', unit: 3, en: 'Advanced Math', cn: '高等数学' },
    { id: 'JY4', unit: 4, en: 'Geometry and Trigonometry', cn: '几何与三角' }
  ];
  var DECLARED = {};
  if (Array.isArray(DATA.sections)) {
    DATA.sections.forEach(function (s) {
      DECLARED[s.unit + '|' + s.section] = { cn: s.cn || '', expect: Number(s.declared) || 0, pages: s.pages || [] };
    });
  } else {
    (DATA.units || []).forEach(function (u) {
      (u.sections || []).forEach(function (s) {
        DECLARED[u.id + '|' + s.id] = { cn: s.cn || '', expect: Number(s.expect) || 0, pages: s.pages || [] };
      });
    });
  }

  function board(id) {
    return BOARD_META.find(function (b) { return b.id === id; }) || null;
  }
  function boards() { return BOARD_META.slice(); }

  /* 该板块下的小节：以数据里真实出现的小节为准，按小节号排序 */
  function sectionsOf(boardId) {
    var b = board(boardId); if (!b) return [];
    var seen = {}, out = [];
    ALL.forEach(function (q) {
      if (q.unit !== b.unit || q.group) return;   // 教材原子组不进官方小节列表
      if (seen[q.section]) return;
      seen[q.section] = 1; out.push(q.section);
    });
    Object.keys(DECLARED).forEach(function (k) {
      var unit = Number(k.split('|')[0]), sec = k.split('|')[1];
      if (unit === b.unit && !seen[sec]) { seen[sec] = 1; out.push(sec); }
    });
    return out.sort(function (x, y) { return secKey(x) - secKey(y); });
  }
  function questionsOf(boardId, section) {
    var b = board(boardId); if (!b) return [];
    if (section === TB_GROUP.key) return groupQuestions(boardId);
    return ALL.filter(function (q) {
      if (q.unit !== b.unit || q.group) return false;
      return !section || q.section === section;
    });
  }
  function groupQuestions(boardId) {
    var b = board(boardId); if (!b) return [];
    return ALL.filter(function (q) { return q.unit === b.unit && q.group === 'textbook'; });
  }
  function groupStats(boardId) {
    var qs = groupQuestions(boardId), answered = 0, correct = 0;
    qs.forEach(function (q) {
      var a = S.answers[q.id];
      if (a && strip(a.v)) { answered++; if (isRightFlag(a.correct)) correct++; }
    });
    return { board: boardId, key: TB_GROUP.key, label: TB_GROUP.label, total: qs.length,
      answered: answered, correct: correct, percent: qs.length ? Math.round(answered / qs.length * 100) : 0 };
  }
  function declared(unit, section) { return DECLARED[unit + '|' + section] || null; }

  /* ---------- 状态：独立 key，答案按题 id 存 ---------- */
  /* 讲义状态也会被云端合并/旧版写成字符串、数组，或 answers 是字符串。
     直接 S.answers[q.id]=… 在严格模式下会 TypeError，讲义页答一题就崩。
     先把容器归成普通对象，再把答案条目归一成 {v,correct,ts}。 */
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  var S = read(KEY);
  if (!isObj(S)) S = {};
  if (!isObj(S.answers)) S.answers = {};
  if (!isObj(S.submitted)) S.submitted = {};
  if (!isObj(S.last)) S.last = null;
  var curNum = Number(S.cursor); S.cursor = isFinite(curNum) && curNum >= 0 ? Math.floor(curNum) : 0;
  Object.keys(S.answers).forEach(function (qid) {
    var a = S.answers[qid];
    if (!isObj(a)) {
      S.answers[qid] = { v: typeof a === 'string' || (typeof a === 'number' && isFinite(a)) ? String(a) : '', correct: false, ts: 0 };
      return;
    }
    if (typeof a.v === 'string') { /* ok */ }
    else if (typeof a.v === 'number' && isFinite(a.v)) a.v = String(a.v);
    else a.v = '';
    if (typeof a.ts !== 'number' || !isFinite(a.ts)) a.ts = 0;
  });
  var lastSaveFailed = false;
  function save() { var ok = write(KEY, S); lastSaveFailed = !ok; return ok; }
  function answerOf(qid) { return S.answers[qid] || null; }
  function answerQ(q, v) {
    var correct = window.TDGrade ? window.TDGrade.isCorrect(q, v) : false;
    S.answers[q.id] = { v: v == null ? '' : String(v), correct: correct, ts: Date.now() };
    save();
    return correct;
  }
  function saveFailed() { return lastSaveFailed; }
  function clearQ(qid) { delete S.answers[qid]; save(); }
  function setCursor(boardId, section, i) {
    S.last = { board: boardId, section: section, i: i }; S.cursor = i; save();
  }

  function sectionStats(boardId, section) {
    var qs = questionsOf(boardId, section);
    var answered = 0, correct = 0;
    qs.forEach(function (q) {
      var a = S.answers[q.id];
      if (a && strip(a.v)) { answered++; if (isRightFlag(a.correct)) correct++; }
    });
    var d = declared(board(boardId).unit, section);
    return {
      board: boardId, section: section, total: qs.length, answered: answered, correct: correct,
      expect: d ? d.expect : qs.length, cn: d ? d.cn : '',
      complete: qs.length > 0 && answered === qs.length,
      reconciled: !!(d && d.expect === qs.length)
    };
  }
  function boardStats(boardId) {
    var b = board(boardId); if (!b) return null;
    var qs = questionsOf(boardId);
    var answered = 0, correct = 0, done = 0, secs = sectionsOf(boardId);
    qs.forEach(function (q) {
      var a = S.answers[q.id];
      if (a && strip(a.v)) { answered++; if (isRightFlag(a.correct)) correct++; }
    });
    secs.forEach(function (s) { if (sectionStats(boardId, s).complete) done++; });
    return {
      board: boardId, unit: b.unit, en: b.en, cn: b.cn,
      total: qs.length, answered: answered, correct: correct, sections: secs.length,
      completeSections: done, percent: qs.length ? Math.round(answered / qs.length * 100) : 0,
      accuracy: answered ? Math.round(correct / answered * 100) : 0,
      dataReady: qs.length > 0
    };
  }
  function allStats() { return boards().map(function (b) { return boardStats(b.id); }); }

  /* ---------- 交卷：写进统一 results 仓库（mode='jiangyi'），错题页能读到；不计入模考/抽查 ---------- */
  function submitSection(boardId, section) {
    var b = board(boardId), qs = questionsOf(boardId, section);
    if (!b || !qs.length) return null;
    var answered = 0, correct = 0;
    var detail = qs.map(function (q, i) {
      var a = S.answers[q.id] || {};
      if (strip(a.v)) { answered++; if (isRightFlag(a.correct)) correct++; }
      /* 记录页靠 detail.answer 显示「正确答案」；讲义 detail 原来漏了它，
         交卷后在记录页错题行只能印「正确 —」。按题库 answer → value → values 落一份。 */
      var corr = q.answer != null && strip(q.answer) ? q.answer
        : (q.value != null ? q.value : (Array.isArray(q.values) && q.values.length ? q.values.join(', ') : ''));
      return { pos: i + 1, uid: q.id, id: q.id, unit: q.unit, section: q.section,
        topic: q.source, type: q.type, given: a.v == null ? '' : a.v, answer: corr, correct: isRightFlag(a.correct) };
    });
    var rec = {
      date: Date.now(), mode: 'jiangyi', board: boardId, section: section,
      unit: b.unit, path: null, auto: false, total: qs.length, correct: correct,
      answered: answered, elapsed: 0, detail: detail
    };
    var all = read(RESULTS_KEY);
    if (!Array.isArray(all)) all = [];
    all.push(rec); if (all.length > 40) all.shift();
    /* 成绩仓库写失败就别把本节标完成：旧实现先写 results 不看返回值，再
       把 submitted 落盘。结果页能显示这次成绩，记录页却因为 results 没写而
       永远缺这一条，用户以为成绩保存了。失败直接返回 null，让页面留在原处
       提示重试；submitted 和答案都不动。 */
    if (!write(RESULTS_KEY, all)) return null;
    S.submitted[section] = { at: rec.date, correct: correct, total: qs.length };
    /* 成绩已经落盘；完成标记写失败不能让页面以为没交，刷新后由 submittedOf
       从成绩记录反查回来，避免再次交卷写出重复成绩。 */
    if (!save()) { lastSaveFailed = true; rec.submittedWriteFailed = true; }
    return rec;
  }
  /* 交卷状态也可能是字符串 'false'：直接返回会被当成交过卷，小节磁贴标完成。 */
  function submittedOf(section) {
    var v = S.submitted[section];
    if (isRightFlag(v)) return { at: 0, correct: 0, total: 0 };
    if (isObj(v)) return v;
    /* 成绩仓库写成功、但状态键写失败时，submitted 里没有本节标记；刷新后会
       被当成没交过，重新交卷会再写一条重复成绩。按成绩记录反查最近一条本
       节讲义成绩，把完成状态认回来。 */
    var all = read(RESULTS_KEY);
    if (Array.isArray(all)) {
      for (var i = all.length - 1; i >= 0; i--) {
        var r = all[i];
        if (r && String(r.mode == null ? '' : r.mode).trim().toLowerCase() === 'jiangyi' && String(r.section) === String(section)) {
          return { at: r.date, correct: r.correct, total: r.total };
        }
      }
    }
    return null;
  }

  /* ---------- 来源标签：3.4 · p131 #12（学生一眼能回到原书那一页） ---------- */
  function sourceLabel(q) {
    var page = q.page, no = q.no;
    if (q && q.group === 'textbook') return '练习册 P' + page;
    return q.section + ' · p' + page + ' #' + no;
  }

  /* ---------- 数据自检（页面与 tools/verify_jiangyi.mjs 共用同一套规则） ---------- */
  function audit() {
    var issues = [];
    var counts = {};
    ALL.forEach(function (q) {
      if (q.group === 'textbook') {
        var okBook = /^练习册\s*P?\d+\s*#\d+\s*$/i.test(q.source);
        if (!okBook) issues.push({ id: q.id, rule: 'source-textbook' });
        if (!strip(q.stem)) issues.push({ id: q.id, rule: 'stem' });
        if (q.type === 'mcq' && !/^[A-D]$/.test(q.answer)) issues.push({ id: q.id, rule: 'answer-letter' });
        return;
      }
      if (!q.source || !/^讲义\s*p\d+\s*#\d+\s*$/.test(q.source)) issues.push({ id: q.id, rule: 'source' });
      if (!strip(q.stem)) issues.push({ id: q.id, rule: 'stem' });
      if (q.type === 'mcq') {
        if (!q.choices.length) issues.push({ id: q.id, rule: 'choices' });
        if (!/^[A-D]$/.test(q.answer)) issues.push({ id: q.id, rule: 'answer-letter' });
      }
      counts[q.unit + '|' + q.section] = (counts[q.unit + '|' + q.section] || 0) + 1;
    });
    Object.keys(DECLARED).forEach(function (k) {
      var d = DECLARED[k], got = counts[k] || 0;
      if (d.expect && got !== d.expect) issues.push({ key: k, rule: 'count', expect: d.expect, got: got });
    });
    return issues;
  }

  window.TD_JY = {
    saveFailed: saveFailed,
    ALL: ALL, BY_ID: BY_ID, boards: boards, board: board, sectionsOf: sectionsOf,
    TB_GROUP: TB_GROUP, groupQuestions: groupQuestions, groupStats: groupStats,
    questionsOf: questionsOf, sourceLabel: sourceLabel, declared: declared,
    stats: sectionStats, boardStats: boardStats, allStats: allStats,
    answerOf: answerOf, answerQ: answerQ, clearQ: clearQ, setCursor: setCursor,
    submitSection: submitSection, submittedOf: submittedOf, audit: audit,
    state: S, save: save, KEY: KEY, RESULTS_KEY: RESULTS_KEY,
    grade: function (q, v) { return window.TDGrade ? window.TDGrade.isCorrect(q, v) : null; }
  };
})();
