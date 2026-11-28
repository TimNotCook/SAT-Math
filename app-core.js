/* TD SAT Math · multi-page app shared layer
   Independent per-section state: each 1.1 / 1.2 ... own question set,
   answers, cursor and completion flag. No cross-section state sharing. */
(function () {
  'use strict';
  var BANK = window.TD_BANK;
  /* 题库脚本没加载出来（弱网 / 旧缓存 / 首屏被截断）时直接退出，别注册半个 TD_APP：
     后面的 BANK.all / BANK.questions 会连锁抛 TypeError，把真正的降级文案淹没在控制台里。
     各页都按「window.TD_APP 缺失」走自己的提示（index/drill 的 fatalLoadError、
     wrong 页的题库失败提示），所以这里干净退出即可。 */
  if (!BANK) return;
  var KEY = 'tdsat_app_v1';
  var URL = new URLSearchParams(location.search);
  /* 同名记录归并表（data/aliases.js）：retired / mergedInto 的题的旧 id 指向 canonical。
     旧板块 URL 与旧保存进度都靠它解析（裁定见 docs/transcribe/bank-rulings.json）。 */
  var ALIAS = window.TD_ALIAS || {};
  /* 生效池（BANK.questions）已由 data/bank-active.js 摘掉 retired / mergedInto；
     别名与旧节反推必须看全量 BANK.all，否则推不出旧板块 → 新板块的映射。 */
  var ALLQ = BANK.all || BANK.questions || [];
  var BY_ID = {};
  ALLQ.forEach(function (q) { BY_ID[q.id] = q; });

  /* ---------- catalog: EVERY question is filed into exactly one independent group.
     Textbook 474 questions -> 20 groups 1.1 ... 4.4 (one section = one independent set).
     Legacy 64 curated questions -> L1 ... L3 in the drill side; L4 is gone:
     Unit 4 那 9 道已迁入讲义复习 JY4「教材原题」子组（练习册 P200–207）。 ---------- */
  var CATALOG = {};
  (BANK.questions || []).forEach(function (q) {
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
    if (!st.sections || typeof st.sections !== 'object' || Array.isArray(st.sections)) st.sections = {};
    if (!('last' in st)) st.last = null;
    /* 旧板块进度迁移：旧节（2.6.T17/2.6.T18/2.6/2.7）的作答按别名并进新节，
       参数（cursor/marks）只搬一份，绝不覆盖新节已有的作答。一次迁完即删旧键。 */
    Object.keys(SECTION_ALIAS).forEach(function (old) {
      var to = SECTION_ALIAS[old], src = st.sections[old];
      if (!src || !CATALOG[to]) return;
      var dst = st.sections[to];
      if (!isPlainObject(dst)) dst = st.sections[to] = { answers: {}, cursor: 0, completed: false, marks: {} };
      if (!isPlainObject(dst.answers)) dst.answers = {};
      if (!isPlainObject(dst.marks)) dst.marks = {};
      if (!isPlainObject(dst.answers)) dst.answers = {};
      if (!isPlainObject(dst.marks)) dst.marks = {};
      /* wrongLog 也可能是字符串/数组：直接给字符串挂属性在 strict mode 会
         TypeError，给数组挂属性 JSON.stringify 时会丢，旧错题台账整批蒸发。 */
      if (!isPlainObject(dst.wrongLog)) dst.wrongLog = {};
      Object.keys(src.answers || {}).forEach(function (qid) {
        var nid = ALIAS[qid] || qid;
        if (src.answers[qid] && !dst.answers[nid]) dst.answers[nid] = src.answers[qid];
      });
      Object.keys(src.marks || {}).forEach(function (qid) {
        var nid = ALIAS[qid] || qid;
        if (src.marks[qid] && !dst.marks[nid]) dst.marks[nid] = src.marks[qid];
      });
      /* wrongLog 必须跟答案一起搬：旧板块键删掉时它不在 answers/marks 里，
         不搬就等于「以前错过的题从没输过」——错题蒸发。 */
      /* dst.wrongLog 可能是字符串/数组（云端合并/旧版）：直接往原始值上挂属性
         在严格模式会 TypeError，整次写盘失败。先归一成普通对象。 */
      if (!isPlainObject(dst.wrongLog)) dst.wrongLog = {};
      Object.keys(isPlainObject(src.wrongLog) ? src.wrongLog : {}).forEach(function (qid) {
        var nid = ALIAS[qid] || qid;
        if (!dst.wrongLog[nid]) dst.wrongLog[nid] = src.wrongLog[qid];
      });
      if ((src.cursor || 0) > (dst.cursor || 0)) dst.cursor = src.cursor;
      delete st.sections[old];
    });
    if (st.last && st.last.sec && SECTION_ALIAS[st.last.sec]) {
      st.last = { sec: SECTION_ALIAS[st.last.sec], qid: ALIAS[st.last.qid] || st.last.qid, ts: st.last.ts };
    }
    /* 同一板块内也可能存着别名 id 的 wrongLog（如 TD-15-01 vs U1-12）：
       键不重映射，wrong-page 按 canonical q.id 查就永远查不到「已订正」。 */
    Object.keys(st.sections).forEach(function (sec) {
      /* sections 的值可能是 null/字符串/数组（云端合并半截数据）：直接读
         .wrongLog 会在 null 上 TypeError，整页在启动阶段白屏。非普通对象
         留给 secIn 访问时重建。 */
      if (!isPlainObject(st.sections[sec])) return;
      var wl = st.sections[sec].wrongLog;
      if (!wl) return;
      var out = {};
      Object.keys(wl).forEach(function (qid) {
        var nid = ALIAS[qid] || qid;
        if (!out[nid]) out[nid] = wl[qid];
      });
      st.sections[sec].wrongLog = out;
    });
    return st;
  }
  function diskState() { return normalize(load()); }
  var S = {};
  var BASE = '{}';            // last state known to be on disk (serialized)

  function adoptState(src) {
    Object.keys(S).forEach(function (k) { delete S[k]; });
    Object.keys(src).forEach(function (k) { S[k] = src[k]; });
  }
  function syncFromDisk(src) {
    adoptState(src);
    BASE = JSON.stringify(S);
  }
  function writeDisk(st) {
    var prevBase = BASE, ok = true;
    try { localStorage.setItem(KEY, JSON.stringify(st)); }
    catch (e) { ok = false; console.warn('保存做题进度失败', e); }
    if (ok) {
      if (window.TDSync) try { window.TDSync.notify(KEY); } catch (e) { console.warn('同步通知未生效', e); }
      syncFromDisk(st);
    } else {
      /* 写盘失败时不能把 S 重置回旧盘：当前作答只活在内存里，重置等于
         把刚才那题静默抹掉。采用新状态但 BASE 保留上次真正落盘的样子，
         下一次 save() 的差异比较仍会把这批未落盘改动重试写出去。 */
      adoptState(st);
      BASE = prevBase;
    }
    return ok;
  }

  function isPlainObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function secIn(st, id, create) {
    if (!st.sections[id]) {
      if (create === false) return null;
      st.sections[id] = { answers: {}, cursor: 0, completed: false, marks: {}, wrongLog: {} };
    }
    var s = st.sections[id];
    /* 板块记录本身也可能是字符串/数组（旧版或云端合并）：给原始值挂
       .answers 会在严格模式下直接 TypeError，先把整条记录换成空对象。 */
    if (!isPlainObject(s)) s = st.sections[id] = { answers: {}, cursor: 0, completed: false, marks: {}, wrongLog: {} };
    /* 云端合并/旧版本可能把 answers / marks / wrongLog 写成字符串、数组：
       它们是真值但不是对象，setAnswer 往 answers[qid] 上写会直接 TypeError。
       读路径也统一修成普通对象，宁可丢这一段坏记录，也不能让练习页写不进答案。 */
    if (!isPlainObject(s.answers)) s.answers = {};
    if (!isPlainObject(s.marks)) s.marks = {};
    if (!isPlainObject(s.wrongLog)) s.wrongLog = {};
    /* wrongLog 的值也可能是裸字符串（旧版），或 {v:{x:1}}、null：
       wrong-page 只认对象且 v 是字符串/数字，其它值会被静默忽略，
       旧版「曾经错过」的题就从错题本消失。统一归一，坏值直接删掉。 */
    Object.keys(s.wrongLog).forEach(function (qid) {
      var w = s.wrongLog[qid];
      if (typeof w === 'string' || (typeof w === 'number' && isFinite(w))) {
        w = { v: String(w), ts: 0 };
      } else if (!isPlainObject(w)) {
        delete s.wrongLog[qid]; return;
      }
      if (typeof w.v === 'string') { /* ok */ }
      else if (typeof w.v === 'number' && isFinite(w.v)) w.v = String(w.v);
      else { delete s.wrongLog[qid]; return; }
      if (!String(w.v).trim()) { delete s.wrongLog[qid]; return; }
      w.ts = Number.isFinite(Number(w.ts)) ? Number(w.ts) : 0;
      s.wrongLog[qid] = w;
    });
    /* marks 的值也可能是字符串 'false'：!! 会把它当已标记，题号旁出现星标。 */
    Object.keys(s.marks).forEach(function (qid) { s.marks[qid] = isRightFlag(s.marks[qid]); });
    /* submitted 也可能是字符串 'false'：练习页 !!
       会把它当已交卷，点小节直接跳成绩页。 */
    s.submitted = isRightFlag(s.submitted);
    /* 作答记录本身也可能是字符串/数组，或 {v:{x:1}} 这类对象值：drill 把对象
       直接塞进 input.value 会显示 [object Object]，统计又按「非空」算已作答。
       与 exam parseSession 同一口径：容器坏值重建，v 只留字符串/有限数字。 */
    Object.keys(s.answers).forEach(function (qid) {
      var a = s.answers[qid];
      if (!isPlainObject(a)) {
        s.answers[qid] = { v: typeof a === 'string' || (typeof a === 'number' && isFinite(a)) ? String(a) : '' };
        return;
      }
      if (typeof a.v === 'string') { /* ok */ }
      else if (typeof a.v === 'number' && isFinite(a.v)) a.v = String(a.v);
      else a.v = '';
    });
    /* cursor 是「上次停在第几题」：旧版/云端合并可能是字符串 '3' 或对象。
       drill 直接做 cursor + 1 拼 URL，'3'+1 会变成 31，对象则变成
       [object Object]1——把用户带到不存在的题。这里归一到非负整数。 */
    var cur = Number(s.cursor);
    /* 只挡住 NaN/对象还不够：旧版/云端合并可能留下 cursor=999，练习页的
       「继续上次练习 · 第 1000 题」和 ?i=1000 都会指向不存在的位置，
       真实页面却夹在最后一题，文案与落点对不上。夹到本板块最后一题。 */
    var curMax = Math.max(0, (CATALOG[id] || []).length - 1);
    s.cursor = Number.isFinite(cur) && cur >= 0 ? Math.min(Math.floor(cur), curMax) : 0;
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
    return writeDisk(disk);
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
  /* 旧档案/云端合并可能把 correct 存成字符串或 1/0；只认明确真值，避免
     'false' 被 truthy 当成答对。 */
  /* 云端/手工导入可能把布尔写成 Python 风格 'True'/'FALSE'：先 trim+小写。 */
  function flagKey(v) { return typeof v === 'string' ? v.trim().toLowerCase() : v; }
  function isRightFlag(v) { v = flagKey(v); return v === true || v === 1 || v === 'true' || v === '1'; }
  function isWrongFlag(v) { v = flagKey(v); return v === false || v === 0 || v === 'false' || v === '0'; }
  function computeStats(id, src) {
    id = resolveSec(id);
    var qs = CATALOG[id] || [], st = secIn(src, id, false) || { answers: {}, cursor: 0 };
    var answered = 0, correct = 0;
    qs.forEach(function (q) {
      var a = st.answers[q.id];
      if (a && a.v != null && String(a.v).trim() !== '') {
        answered++;
        if (isRightFlag(a.correct)) correct++;
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
      else {
        var correctNow = isCorrect(q, v);
        /* 错题台账：答错的那一刻落到 st.wrongLog（只增不删），
           之后订正/清空作答都不会把「曾经错过」抹掉，错题回顾据此保留已订正记录。 */
        if (!correctNow) {
          st.wrongLog = st.wrongLog || {};
          st.wrongLog[qid] = { v: String(v), ts: Date.now() };
        }
        st.answers[qid] = { v: String(v), correct: correctNow, ts: Date.now() };
      }
      st.completed = computeStats(id, D).completed;
      D.last = { sec: id, qid: qid, ts: Date.now() };
      return st.answers[qid] || null;
    });
  }
  /* Re-grade a stored answer and persist it via the disk-first mutation path.
     Used by the result page so a verdict refresh never round-trips a stale
     whole-state snapshot. */
  function refreshVerdict(id, qid, given) {
    /* 原条件少一层括号：`!q || !a || 有答案` 一旦 a 不存在就会去写 a.correct，
       TypeError 直接把成绩页打崩。而且空作答时反而跳过了清零，旧的 correct
       会留在记录里。这里拆成显式两步：缺题/缺记录只返回 false，有作答才判分，
       没作答一律记为 false。 */
    return mutateSection(id, function (st) {
      var q = (CATALOG[id] || []).find(function (x) { return x.id === qid; });
      var a = st.answers[qid];
      if (!q || !a) return false;
      var answered = a.v != null && String(a.v).trim() !== '';
      a.correct = answered ? isCorrect(q, a.v) : false;
      return a.correct;
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
      accuracy: a ? Math.round(c / a * 100) : 0, bank: (BANK.questions || []).length };
  }
  function wrongList() {
    var out = [];
    SECS.forEach(function (s) {
      var st = secState(s, false);
      if (!st) return;
      CATALOG[s].forEach(function (q) {
        if (q.dup) return;   /* 与教材重复的精编题不进错题本 */
        var a = st.answers[q.id];
        if (a && isWrongFlag(a.correct)) out.push({ sec: s, unit: UNIT_OF(s), q: q, given: a.v });
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
      { id: 'quiz', label: '单元抽查', href: 'exam.html?mode=quiz&unit=1' },
      { id: 'wrong', label: '错题回顾', href: 'wrong.html' },
      { id: 'mock', label: '模考', href: 'exam.html?mode=mock' },
      { id: 'history', label: '模考记录', href: 'history.html' }
    ];
    host.innerHTML = '<header class="appbar"><div class="appbar-inner">' +
      '<a class="brand" href="drill.html"><b>SAT Math Prep</b></a>' +
      '<nav class="mainnav" aria-label="主要功能">' + items.map(function (n) {
        return '<a href="' + n.href + '" class="' + (n.id === active ? 'on' : '') + '"' +
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
  /* 旧链接（drill.html?sec=2.6）落到的板块可能已被并/改号，SECTION_CN 里没有它的名字，
     以前直接拼成「2.6 undefined」。这里顺着首题的 section 找回真名，找不到就退回中性叫法，
     绝不把 undefined 印到标题上。 */
  function secNameOf(s) {
    var nm = SECTION_CN[s];
    if (nm && nm !== s) return nm;
    var list = CATALOG[s] || [];
    var sid = (list.length && list[0] && list[0].section) || '';
    if (sid && sid !== s && SECTION_CN[sid]) return SECTION_CN[sid];
    return '';
  }
  function sectionLabel(s) {
    var own = SECTION_CN[s];
    var withId = function (id, name) {
      /* 名字自己已经带编号（「Topic 23 · …」「4.5 圆（练习册）」）时不再重复拼 id。 */
      if (/^\d\.\d\.T[\dA-Z]+$/.test(id)) return name;
      if (/^\d[\d.]*\s/.test(name)) return name;
      return id + ' ' + name;
    };
    if (own && own !== s) return withId(s, own);
    /* 旧链接（drill.html?sec=2.6）落到的板块已被并号/改名，SECTION_CN 里查不到名字，
       原来会直接拼成「2.6 undefined」。顺着首题的 section 找回真名，
       再不行就报「Section 2.6」这种中性叫法，绝不让 undefined 露出来。 */
    var list = CATALOG[s] || [];
    var sid = (list.length && list[0] && list[0].section) || '';
    if (sid && sid !== s && SECTION_CN[sid]) return withId(sid, SECTION_CN[sid]);
    return withId(s, 'Section ' + s);
  }

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
    secUrl: secUrl, sectionLabel: sectionLabel, secNameOf: secNameOf, isLegacy: isLegacy,
    unitSections: unitSections, groupTag: groupTag, secHref: secHref, unitHref: unitHref,
    isTopicSection: isTopicSection, topicSections: topicSections, topicGroup: topicGroup,
    isSpecialSection: isSpecialSection, specialSections: specialSections, specialGroup: specialGroup,
    specialGroupNode: specialGroupNode,
    resolveSec: resolveSec, sectionAliases: SECTION_ALIAS, aliasMap: ALIAS,
    secStateDisk: secStateDisk
  };
})();
