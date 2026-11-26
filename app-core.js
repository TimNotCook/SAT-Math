/* TD SAT Math · multi-page app shared layer
   Independent per-section state: each 1.1 / 1.2 ... own question set,
   answers, cursor and completion flag. No cross-section state sharing. */
(function () {
  'use strict';
  var BANK = window.TD_BANK;
  var KEY = 'tdsat_app_v1';
  var URL = new URLSearchParams(location.search);
  /* 同名记录归并表（data/aliases.js）：retired / mergedInto 的题的旧 id 指向 canonical。
     旧板块 URL 与旧保存进度都靠它解析（裁定见 docs/transcribe/bank-rulings.json）。 */
  var ALIAS = window.TD_ALIAS || {};
  /* 生效池（BANK.questions）已由 data/bank-active.js 摘掉 retired / mergedInto；
     别名与旧节反推必须看全量 BANK.all，否则推不出旧板块 → 新板块的映射。 */
  var ALLQ = BANK.all || BANK.questions;
  var BY_ID = {};
  ALLQ.forEach(function (q) { BY_ID[q.id] = q; });

  /* ---------- catalog: EVERY question is filed into exactly one independent group.
     Textbook 474 questions -> 20 groups 1.1 ... 4.4 (one section = one independent set).
     Legacy 64 curated questions -> L1 ... L3 in the drill side; L4 is gone:
     Unit 4 那 9 道已迁入讲义复习 JY4「教材原题」子组（练习册 P200–207）。 ---------- */
  var CATALOG = {};
  BANK.questions.forEach(function (q) {
    /* retired / mergedInto：已被裁定去重（旧录副本 / 书内重复印），不进任何板块 */
    if (q.retired || q.mergedInto) return;
    /* Unit 4 的 9 道精编原题已移交讲义复习 JY4「教材原题」子组（练习册 P200–207），
       真题练习侧不再注册 L4，也不并进 4.1 / 4.2 的官方题数。其余 L1–L3 保留。 */
    if (q.origin === 'legacy' && q.unit === 4) return;
    var id = q.origin === 'legacy' ? 'L' + q.unit : q.section;
    if (!id) return;
    (CATALOG[id] = CATALOG[id] || []).push(q);
  });
  Object.keys(CATALOG).forEach(function (s) {
    CATALOG[s].sort(function (a, b) {
      return (a.no || 0) - (b.no || 0) || String(a.id).localeCompare(String(b.id));
    });
  });
  var isLegacy = function (s) { return /^L\d+$/.test(s); };
  /* 3.6.T6 ... 3.6.T16 are child sections of the "3.6 专项复习" group.
     They are real independent sections (own answers/cursor/result) but are
     hidden from the top-level board list and shown in a dedicated sub-view. */
  var isTopicSection = function (s) { return /^3\.6\.T\d+$/.test(s); };
  /* Any other X.Y.T<topic> child section lives on the special board:
     1.7.T1..T5 (U1 专项练习), 2.6.T17.. (U2 专项练习, PDF03 Topics),
     4.5.T24.. (U4 专项练习, PDF04 Topics). They are independent boards
     shown in the special-training sub-view, never in the unit board. */
  var isSpecialSection = function (s) { return /^\d+\.\d+\.T\d+$/.test(s) && !isTopicSection(s); };
  function secKey(s) {
    if (isLegacy(s)) return 1000 + parseInt(s.slice(1), 10);
    var p = s.split('.');
    var base = (+p[0]) * 100 + (+p[1] || 0);
    if (p[2]) return base + (parseInt(String(p[2]).replace(/\D/g, ''), 10) || 0) / 100;
    return base;
  }
  /* 声明层里标了 hidden 的节（旧 SP2 板块）：数据保留、入口隐藏，链接仍可由别名解析。 */
  var HIDDEN = {};
  BANK.units.forEach(function (u) {
    (u.sections || []).forEach(function (x) { if (x.hidden) HIDDEN[x.id] = true; });
  });
  /* 旧节 → 新节：由 retired 题的 alias 反推，仅当该旧节全部题都归到同一个新节时成立。 */
  var SECTION_ALIAS = {};
  ALLQ.forEach(function (q) {
    if (!q.retired || !q.alias || !q.section) return;
    var t = BY_ID[q.alias];
    if (!t || !t.section) return;
    if (SECTION_ALIAS[q.section] && SECTION_ALIAS[q.section] !== t.section) { SECTION_ALIAS[q.section] = null; return; }
    SECTION_ALIAS[q.section] = t.section;
  });
  Object.keys(SECTION_ALIAS).forEach(function (k) {
    if (!SECTION_ALIAS[k] || SECTION_ALIAS[k] === k) delete SECTION_ALIAS[k];
  });
  function resolveSec(id) {
    var t = SECTION_ALIAS[id];
    return (t && CATALOG[t]) ? t : id;
  }
  var SECS = Object.keys(CATALOG).sort(function (a, b) { return secKey(a) - secKey(b); })
    .filter(function (s) { return !HIDDEN[s]; });
  /* 老 URL（drill.html?sec=2.6.T17）仍能进门：给旧节挂同一份题目数组，但不进 SECS/板块列表。 */
  Object.keys(SECTION_ALIAS).forEach(function (old) {
    if (CATALOG[old]) return;
    var to = SECTION_ALIAS[old];
    if (CATALOG[to]) CATALOG[old] = CATALOG[to];
  });
  var UNIT_OF = function (s) { return isLegacy(s) ? parseInt(s.slice(1), 10) : parseInt(s, 10); };
  var SECTION_CN = {};
  var SECTION_SUB = {};
  BANK.units.forEach(function (u) {
    (u.sections || []).forEach(function (x) { SECTION_CN[x.id] = x.cn; if (x.sub) SECTION_SUB[x.id] = x.sub; });
    SECTION_CN['L' + u.id] = '单元精编原题组 · 讲义 / 自测卷';
  });
  SECS.forEach(function (s) {
    if (!SECTION_CN[s]) SECTION_CN[s] = isLegacy(s) ? '精编原题组' : s;
  });
  var UNITS = BANK.units.slice();
  /* L4 已整体移交讲义复习（JY4 教材原子组），真题练习不再有隐藏板块或重题标记：
     这里既没有 HIDDEN_SECS，也不再改写任何题的 dup 字段。 */
  function unitSections(u) {
    return SECS.filter(function (s) {
      return UNIT_OF(s) === u && !isTopicSection(s) && !isSpecialSection(s);
    });
  }
  function topicSections() { return SECS.filter(isTopicSection); }
  function specialSections() { return SECS.filter(isSpecialSection); }
  /* 专项训练某单元的群组节点（1.7 / 2.7 / 4.5）：只用来取板块主标题与副标题，不参与计数。 */
  function specialGroupNode(u) {
    var secs = specialSections().filter(function (s) { return UNIT_OF(s) === u; });
    if (!secs.length) return null;
    var helper = {};
    secs.forEach(function (s) { helper[s] = true; });
    var uu = unit(u) || {};
    var found = null;
    (uu.sections || []).forEach(function (x) {
      if (found || !x.isGroup) return;
      var has = (uu.sections || []).some(function (y) { return y.parent === x.id && helper[y.id]; });
      if (has) found = x;
    });
    return found;
  }
  function specialGroup() {
    var list = specialSections(), t = 0, a = 0, c = 0, done = 0;
    list.forEach(function (s) {
      var x = stats(s); t += x.total; a += x.answered; c += x.correct;
      if (x.completed) done++;
    });
    return { list: list, total: t, answered: a, correct: c, sections: list.length,
      completedSections: done, percent: t ? Math.round(a / t * 100) : 0 };
  }
  function topicGroup() {
    var list = topicSections(), t = 0, a = 0, c = 0, done = 0;
    list.forEach(function (s) {
      var x = stats(s); t += x.total; a += x.answered; c += x.correct;
      if (x.completed) done++;
    });
    return { list: list, total: t, answered: a, correct: c, sections: list.length,
      completedSections: done, percent: t ? Math.round(a / t * 100) : 0 };
  }

  /* ---------- persistent state ----------
     localStorage is shared by every open tab. Each tab used to take a
     one-time snapshot in S and overwrite the whole key on every write, which
     silently erased answers another tab had just saved. All writes now go
     through a read-modify-write primitive against the CURRENT disk value;
     S (public as TD_APP.state) is only ever synchronized in place, never
     reassigned, so external holders of A.state stay valid. */
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function normalize(st) {
    if (!st || typeof st !== 'object' || Array.isArray(st)) st = {};
    if (!st.sections || typeof st.sections !== 'object') st.sections = {};
    if (!('last' in st)) st.last = null;
    /* 旧板块进度迁移：旧节（2.6.T17/2.6.T18/2.6/2.7）的作答按别名并进新节，
       参数（cursor/marks）只搬一份，绝不覆盖新节已有的作答。一次迁完即删旧键。 */
    Object.keys(SECTION_ALIAS).forEach(function (old) {
      var to = SECTION_ALIAS[old], src = st.sections[old];
      if (!src || !CATALOG[to]) return;
      var dst = st.sections[to];
      if (!dst) dst = st.sections[to] = { answers: {}, cursor: 0, completed: false, marks: {} };
      if (!dst.answers) dst.answers = {};
      if (!dst.marks) dst.marks = {};
      Object.keys(src.answers || {}).forEach(function (qid) {
        var nid = ALIAS[qid] || qid;
        if (src.answers[qid] && !dst.answers[nid]) dst.answers[nid] = src.answers[qid];
      });
      Object.keys(src.marks || {}).forEach(function (qid) {
        var nid = ALIAS[qid] || qid;
        if (src.marks[qid] && !dst.marks[nid]) dst.marks[nid] = src.marks[qid];
      });
      if ((src.cursor || 0) > (dst.cursor || 0)) dst.cursor = src.cursor;
      delete st.sections[old];
    });
    if (st.last && st.last.sec && SECTION_ALIAS[st.last.sec]) {
      st.last = { sec: SECTION_ALIAS[st.last.sec], qid: ALIAS[st.last.qid] || st.last.qid, ts: st.last.ts };
    }
    return st;
  }
  function diskState() { return normalize(load()); }
  var S = {};
  var BASE = '{}';            // last state known to be on disk (serialized)

  function syncFromDisk(src) {
    Object.keys(S).forEach(function (k) { delete S[k]; });
    Object.keys(src).forEach(function (k) { S[k] = src[k]; });
    BASE = JSON.stringify(S);
  }
  function writeDisk(st) {
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { console.warn('保存做题进度失败', e); }
    if (window.TDSync) try { window.TDSync.notify(KEY); } catch (e) { console.warn('同步通知未生效', e); }
    syncFromDisk(st);
  }

  function secIn(st, id, create) {
    if (!st.sections[id]) {
      if (create === false) return null;
      st.sections[id] = { answers: {}, cursor: 0, completed: false, marks: {} };
    }
    var s = st.sections[id];
    if (!s.answers) s.answers = {};
    if (!s.marks) s.marks = {};
    return s;
  }
  function secState(id, create) {
    id = resolveSec(id);
    if (!CATALOG[id]) return null;
    return secIn(S, id, create);
  }
  /* Read a section straight from the CURRENT disk value, never from the
     in-memory snapshot S. Grading must use this: a stale S (background tab,
     throttled storage event, fast navigation right after answering) used to
     make a fully-answered board appear "all unanswered" on the result page
     even though the answers were safely on disk. */
  function secStateDisk(id) {
    id = resolveSec(id);
    if (!CATALOG[id]) return null;
    var D = diskState();
    return secIn(D, id, false);
  }

  /* Every mutation re-reads the disk, touches only its own section there and
     writes that fresh object back. Sections another tab added meanwhile
     survive; the callback runs on the disk object, not a stale snapshot. */
  function mutateSection(id, fn) {
    id = resolveSec(id);
    if (!CATALOG[id]) return null;
    var D = diskState();
    var st = secIn(D, id);
    var ret = fn(st, D);
    writeDisk(D);
    return ret;
  }

  /* External callers (grading, "submitted", "last") mutate objects reachable
     from S in place and then call save(). Replay only the parts that really
     changed locally onto a fresh disk read, so a whole stale snapshot can
     never erase another tab's sections. */
  function save() {
    var disk = diskState(), base;
    try { base = JSON.parse(BASE) || {}; } catch (e) { base = {}; }
    if (JSON.stringify(S.last) !== JSON.stringify(base.last)) disk.last = S.last;
    Object.keys(S.sections || {}).forEach(function (id) {
      var local = JSON.stringify(S.sections[id]);
      var was = base.sections ? JSON.stringify(base.sections[id]) : undefined;
      if (local !== was) disk.sections[id] = S.sections[id];
    });
    writeDisk(disk);
  }

  syncFromDisk(diskState());
  window.addEventListener('storage', function (e) {
    if (e && e.key && e.key !== KEY) return;
    syncFromDisk(diskState());
  });

  /* ---------- grading：唯一实现在 grade-core.js（window.TDGrade），本 core 与 exam-core.js 共用 ---------- */
  /* 历史上这里是与 exam-core.js 手工同步的拷贝，容差分母基准曾分叉（2026-11 合一）。 */
  var gridEntry = window.TDGrade.gridEntry,
      parseNum = window.TDGrade.parseNum,
      acceptedValues = window.TDGrade.acceptedValues,
      sameExact = window.TDGrade.sameExact,
      sameTol = window.TDGrade.sameTol,
      isCorrect = window.TDGrade.isCorrect;

  /* Re-grade a HISTORIC stored answer against the CURRENT bank answer.
     Verdicts saved at answer time go stale when the answer key is later
     corrected (e.g. T13's 11 fixed answers). The wrong-book must not show
     "your answer A / correct answer A" as a mistake. A record is still wrong
     only if it fails the authoritative grader under today's answer key. */
  function stillWrong(q, given) {
    if (!q) return true;
    var g = given == null ? '' : String(given).trim();
    if (!g) return true;
    return !isCorrect(q, g);
  }
  function computeStats(id, src) {
    id = resolveSec(id);
    var qs = CATALOG[id] || [], st = secIn(src, id, false) || { answers: {}, cursor: 0 };
    var answered = 0, correct = 0;
    qs.forEach(function (q) {
      var a = st.answers[q.id];
      if (a && a.v != null && String(a.v).trim() !== '') {
        answered++;
        if (a.correct) correct++;
      }
    });
    return {
      total: qs.length, answered: answered, correct: correct, wrong: answered - correct,
      percent: qs.length ? Math.round(answered / qs.length * 100) : 0,
      accuracy: answered ? Math.round(correct / answered * 100) : 0,
      completed: qs.length > 0 && answered === qs.length,
      cursor: st.cursor || 0
    };
  }
  function stats(id) { return computeStats(id, S); }
  function setAnswer(id, qid, v) {
    if (!CATALOG[id]) return null;
    var q = (CATALOG[id] || []).find(function (x) { return x.id === qid; });
    if (!q) return null;
    return mutateSection(id, function (st, D) {
      if (v == null || String(v).trim() === '') delete st.answers[qid];
      else st.answers[qid] = { v: String(v), correct: isCorrect(q, v), ts: Date.now() };
      st.completed = computeStats(id, D).completed;
      D.last = { sec: id, qid: qid, ts: Date.now() };
      return st.answers[qid] || null;
    });
  }
  /* Re-grade a stored answer and persist it via the disk-first mutation path.
     Used by the result page so a verdict refresh never round-trips a stale
     whole-state snapshot. */
  function refreshVerdict(id, qid, given) {
    return mutateSection(id, function (st, D) {
      var q = (CATALOG[id] || []).find(function (x) { return x.id === qid; });
      var a = st.answers[qid];
      if (!q || !a || a.v != null && String(a.v).trim() !== '') a.correct = isCorrect(q, a.v);
      return a ? a.correct : false;
    });
  }
  function setCursor(id, i) { mutateSection(id, function (st) { st.cursor = i; }); }
  function toggleMark(id, qid) {
    return mutateSection(id, function (st) { st.marks[qid] = !st.marks[qid]; return st.marks[qid]; });
  }
  function unitStats(u) {
    var ids = SECS.filter(function (s) { return UNIT_OF(s) === u; });
    var t = 0, a = 0, c = 0, done = 0;
    ids.forEach(function (s) {
      var x = stats(s); t += x.total; a += x.answered; c += x.correct;
      if (x.completed) done++;
    });
    return { total: t, answered: a, correct: c, sections: ids.length, completedSections: done,
      percent: t ? Math.round(a / t * 100) : 0 };
  }
  function globalStats() {
    var t = 0, a = 0, c = 0, done = 0;
    SECS.forEach(function (s) {
      var x = stats(s); t += x.total; a += x.answered; c += x.correct;
      if (x.completed) done++;
    });
    return { total: t, answered: a, correct: c, sections: SECS.length, completedSections: done,
      percent: t ? Math.round(a / t * 100) : 0,
      accuracy: a ? Math.round(c / a * 100) : 0, bank: BANK.questions.length };
  }
  function wrongList() {
    var out = [];
    SECS.forEach(function (s) {
      var st = secState(s, false);
      if (!st) return;
      CATALOG[s].forEach(function (q) {
        if (q.dup) return;   /* 与教材重复的精编题不进错题本 */
        var a = st.answers[q.id];
        if (a && a.correct === false) out.push({ sec: s, unit: UNIT_OF(s), q: q, given: a.v });
      });
    });
    return out;
  }

  /* ---------- the whole app has exactly four modules ---------- */
  function nav(active) {
    var host = document.getElementById('appnav');
    if (!host) return;
    var mode = new URLSearchParams(location.search).get('mode') || '';
    if (active === 'exam') active = mode === 'quiz' ? 'quiz' : 'mock';
    var items = [
      { id: 'drill', label: '真题练习', href: 'drill.html' },
      { id: 'jiangyi', label: '讲义复习', href: 'jiangyi.html' },
      { id: 'quiz', label: '单元抽查', href: 'exam.html?mode=quiz&unit=1' },
      { id: 'wrong', label: '错题回顾', href: 'wrong.html' },
      { id: 'mock', label: '模考', href: 'exam.html?mode=mock' }
    ];
    host.innerHTML = '<header class="appbar"><div class="appbar-inner">' +
      '<a class="brand" href="drill.html"><b>SAT Math Prep</b></a>' +
      '<nav class="mainnav" aria-label="主要功能">' + items.map(function (n) {
        return '<a href="' + n.href + '" class="' + (n.id === active ? 'on' : '') + '>' +
          (n.id === active ? ' aria-current="page"' : '') + '>' + n.label + '</a>';
      }).join('') +       '</nav>' +
      '<a class="appbar-exit" id="btnAppExit" href="drill.html" title="退出本模块，返回上一个页面">退出</a>' +
      '</div></header>';
  }

  function crumb(parts) {
    return '<div class="crumb">' + parts.map(function (p, i) {
      return (i ? '<span class="sep">›</span>' : '') +
        (p.href ? '<a href="' + p.href + '">' + p.text + '</a>' : '<b>' + p.text + '</b>');
    }).join('') + '</div>';
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function unit(u) { return UNITS.find(function (x) { return x.id === u; }) || {}; }
  function unitName(u) { var x = unit(u); return 'U' + u + ' · ' + (x.cn || ''); }
  function secUrl(s, i) {
    return 'drill.html?unit=' + UNIT_OF(s) + '&sec=' + encodeURIComponent(s) + (i ? '&i=' + i : '');
  }
  /* 板块名统一为「1.1 线性方程与函数图像」：代码与名称之间用空格，不再用「·」。
     做题页顶栏、页脚、导语、结果标题共用这一个来源，避免同一条板块名在不同位置
     一半带点一半不带。 */
  function sectionLabel(s) { return s + ' ' + SECTION_CN[s]; }

  function groupTag(s) { return isLegacy(s) ? '精编原题组' : '教材板块'; }
  function secHref(s) { return secUrl(s, 1); }
  function unitHref(u) {
    var list = unitSections(u); return list.length ? secUrl(list[0], 1) : 'drill.html';
  }

  window.TD_APP = {
    BANK: BANK, CATALOG: CATALOG, SECS: SECS, UNITS: UNITS, SECTION_CN: SECTION_CN, SECTION_SUB: SECTION_SUB,
    UNIT_OF: UNIT_OF, URL: URL, state: S, save: save, secState: secState, stats: stats,
    setAnswer: setAnswer, setCursor: setCursor, toggleMark: toggleMark, isCorrect: isCorrect,
    stillWrong: stillWrong, refreshVerdict: refreshVerdict,
    unitStats: unitStats, globalStats: globalStats, wrongList: wrongList,
    nav: nav, crumb: crumb, esc: esc, unit: unit, unitName: unitName,
    secUrl: secUrl, sectionLabel: sectionLabel, isLegacy: isLegacy,
    unitSections: unitSections, groupTag: groupTag, secHref: secHref, unitHref: unitHref,
    isTopicSection: isTopicSection, topicSections: topicSections, topicGroup: topicGroup,
    isSpecialSection: isSpecialSection, specialSections: specialSections, specialGroup: specialGroup,
    specialGroupNode: specialGroupNode,
    resolveSec: resolveSec, sectionAliases: SECTION_ALIAS, aliasMap: ALIAS,
    secStateDisk: secStateDisk
  };
})();
