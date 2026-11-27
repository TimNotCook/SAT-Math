/* TD SAT Math · Exam Suite core (pure logic, no DOM)
   Official Digital SAT Math parameters are frozen in OFFICIAL below.
   Loaded by exam.html; also require()-able by node for boundary verification. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TD_EXAM_CORE = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  /* 存档/云端合并可能把布尔写成字符串：'false' 是 truthy，不能直接当答对。 */
  const isRightFlag = v => v === true || v === 1 || v === 'true' || v === '1';
  const isRec = v => !!v && typeof v === 'object' && !Array.isArray(v);

  /* =====================================================================
     OFFICIAL PARAMETERS — College Board, Digital SAT Suite Test Specifications
     (digital SAT Math section). Do not alter these values.
     ===================================================================== */
  const OFFICIAL = Object.freeze({
    modules: 2,
    questionsPerModule: 22,
    totalQuestions: 44,
    minutesPerModule: 35,
    totalMinutes: 70,
    secondsPerModule: 35 * 60,
    totalSeconds: 70 * 60,
    mcqRatio: 0.75,          // four-option multiple choice ≈75%
    sprRatio: 0.25,          // student-produced response ≈25%
    mcqCount: 33,            // 44 × 75%
    sprCount: 11,            // 44 × 25%
    choices: ['A', 'B', 'C', 'D'],
    // Content domains (approx. share of Math questions)
    domains: Object.freeze({ 1: 0.35, 2: 0.15, 3: 0.35, 4: 0.15 }),
    // 44 × share, kept inside the official 13–15 / 5–7 ranges
    domainQuota: Object.freeze({ 1: 15, 2: 7, 3: 15, 4: 7 }),
    // split over the two 22-question modules
    module1: Object.freeze({ domain: { 1: 8, 2: 3, 3: 8, 4: 3 }, type: { mcq: 17, grid: 5 } }),
    module2: Object.freeze({ domain: { 1: 7, 2: 4, 3: 7, 4: 4 }, type: { mcq: 16, grid: 6 } }),
    rawMin: 0, rawMax: 44, scaledMin: 200, scaledMax: 800,
    wrongPenalty: 0,         // rights-only scoring: wrong == blank == 0
    // Adaptive routing. College Board does not publish the routing cut score;
    // 12/22 is the value observed on official Bluebook practice tests.
    routingCut: 12,
    easyPathCeiling: 670,
    scaleNote: 'College Board 不发布自适应考试的固定换算表；此处采用官方 Bluebook 练习卷公开参考曲线（hard / easy 两条路径）线性插值，分数为预估值，10 分一档。'
  });

  /* ---------- reference raw→scaled curves, linearly interpolated ---------- */
  function buildScale(anchors) {
    const out = new Array(45);
    for (let r = 0; r <= 44; r++) {
      let a = anchors[0], b = anchors[anchors.length - 1];
      for (let i = 0; i < anchors.length - 1; i++) {
        if (r >= anchors[i][0] && r <= anchors[i + 1][0]) { a = anchors[i]; b = anchors[i + 1]; break; }
      }
      const span = b[0] - a[0];
      const v = span ? a[1] + (b[1] - a[1]) * (r - a[0]) / span : a[1];
      out[r] = Math.max(200, Math.min(800, Math.round(v / 10) * 10));
    }
    return out;
  }
  const SCALE = Object.freeze({
    hard: buildScale([[0, 200], [10, 460], [14, 510], [18, 550], [22, 590], [26, 620], [29, 640],
                      [32, 670], [34, 690], [36, 710], [38, 730], [40, 750], [42, 770], [44, 800]]),
    easy: buildScale([[0, 200], [10, 400], [14, 450], [18, 490], [22, 530], [26, 560], [29, 580],
                      [32, 600], [34, 615], [36, 630], [38, 640], [40, 650], [42, 660], [44, 670]])
  });
  const scaledScore = (raw, path) => SCALE[path === 'easy' ? 'easy' : 'hard'][Math.max(0, Math.min(44, Math.round(raw)))];

  /* =====================================================================
     Shared helpers (identical grading rules to the existing practice app)
     ===================================================================== */
  /* Student-produced response — College Board / Bluebook official rules:
       · only digits, optional leading -, one decimal point OR one fraction slash
       · NO percent sign, dollar sign, comma, letter, space or other symbol
         (a 25% answer is entered as "25", never "25%")
       · at most 5 characters positive, 6 negative (sign counts; so does . or /)
       · fractions need not be reduced (2/4 == 1/2); mixed numbers must be
         improper (3 1/2 -> 7/2, typed "31/2" means 31 halves)
       · a repeating decimal must FILL the box: 2/3 accepts .6666/.6667/
         0.666/0.667 but NOT .66/.67. Exact short decimals (3.5, .0625)
         are fine as-is. If more than one answer works, enter any one. */
  /* ---------- grading：唯一实现在 grade-core.js（window.TDGrade），本 core 与 app-core.js 共用 ----------
     历史上这里是手工同步的拷贝（"Keep in sync"），容差分母基准曾分叉（2026-11 合一）。 */
  /* 2026-11-26：这里原本在解析期就取 window.TDGrade.gridEntry 等五个函数。
     只要 grade-core.js 因网络抖动没跑起来，本文件立刻抛 TypeError，
     exam.js 拿不到 TD_EXAM_CORE 也跟着挂，整页变成「Start 点不动」的死页。
     改成调用时再取：延迟到达的 grade-core 仍能用，判分前 TDGrade 缺席则明确抛错。 */
  function grade(q, given) {
    var G = window.TDGrade;
    if (!G || typeof G.isCorrect !== 'function') {
      throw new Error('grade-core.js 未加载完成，无法判分');
    }
    return G.isCorrect(q, given);
  }

  function shuffle(a, rnd) {
    a = (a || []).slice(); const R = rnd || Math.random;
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  const byId = (bank, id) => bank.find(q => q.id === id);
  const unitName = (units, u) => { const x = (units || []).find(v => v.id === u); return x ? 'U' + u + ' ' + x.cn : 'U' + u; };

  /* =====================================================================
     Diagnostic paper design — College-Board-inspired, deliberately fair
     ---------------------------------------------------------------------
     What College Board actually does (Digital SAT Assessment Framework):
       · each Math module runs easiest -> hardest; hard items cluster late;
       · distractors are the results of predictable slips, so a student who
         only recognises a surface form is caught;
       · wording load ("no solution", "must be true", "NOT", "least") causes
         more misses than the algebra itself;
       · attention dips right after a demanding item, so a short, easy-looking
         item placed there catches readers still thinking about the last one;
       · domains and question types are interleaved, breaking autopilot.

     We imitate the DIAGNOSTIC value of those patterns, never the cruelty.
     GUARDRAILS (enforced below — do not remove):
       G1  never alter a stem, choice, answer, timer, score rule or UI;
       G2  no duplicate question inside one paper (unless the bank is too
           small to fill the official quota);
       G3  the easy -> hard ramp is preserved: at most one hard item in the
           first four, and the last third is never easier than the first;
       G4  the cold-start item is SHORT and low-step, never a long multi-part
           problem, so nobody is blocked at the door;
       G5  no hidden/obscured information, no deliberately confusing layout,
           no trick answer keys, no extra time pressure;
       G6  every device is recorded in `diagnostic` metadata and the purpose
           is disclosed on the start page.
     ===================================================================== */
  const SPECIAL_RE = /\.\d*T\d+$/;
  function isSpecialQuestion(q) {
    return SPECIAL_RE.test(String((q && q.section) || '')) || /专项/.test(String((q && q.paper) || ''));
  }
  /* Per-unit opt-in for the "专项练习 / 专项复习" blocks. Default: excluded,
     so enabling them is an explicit choice on the exam start page. */
  function examBank(bank, includeSpecial) {
    const flags = includeSpecial || {};
    return (bank || []).filter(q => !isSpecialQuestion(q) || !!flags[q.unit]);
  }
  /* `section` is the app's knowledge-point grouping (35 distinct values).
     q.topic is per-question for imported drills, so it is NOT used here. */
  function coverageKey(q) { return String((q && q.section) || ('u' + (q && q.unit)) || '?'); }

  /* Round-robin over knowledge-point buckets: maximises the number of distinct
     sections in a paper and stops any single section from clustering. */
  function spreadBySection(list, rnd, withinSort) {
    const R = rnd || Math.random;
    const buckets = {};
    (list || []).forEach(q => { const k = coverageKey(q); (buckets[k] = buckets[k] || []).push(q); });
    const keys = shuffle(Object.keys(buckets), R);
    keys.forEach(k => {
      buckets[k] = shuffle(buckets[k], R);
      if (withinSort) buckets[k] = buckets[k].slice().sort(withinSort);
    });
    const out = [];
    let moved = true;
    while (moved) {
      moved = false;
      for (const k of keys) if (buckets[k] && buckets[k].length) { out.push(buckets[k].shift()); moved = true; }
    }
    return out;
  }

  /* Surface features read from the stem. `stemOf` is injected by the caller so
     this core stays DOM-free and require()-able by node. */
  function questionFeatures(q, stemOf) {
    let stem = '';
    try { stem = String((stemOf && stemOf(q)) || (q && q.stem) || ''); } catch (e) { stem = String((q && q.stem) || ''); }
    const low = stem.toLowerCase();
    return {
      precision: /does not|doesn't|not contain|\bexcept\b|must be true|could be|least possible|greatest possible|at least|at most|no more than|no solution|no solutions|infinitely many|exactly one|which of the following/i.test(low),
      longStep: stem.length > 260 || (stem.match(/\n/g) || []).length >= 2,
      hard: !!(q && q.level === 'hard'),
      grid: !!(q && q.type === 'grid'),
      unit: q && q.unit,
      section: coverageKey(q),
      type: q && q.type,
      stem: stem
    };
  }
  function difficulty(f) {
    return (f.hard ? 3 : 0) + (f.longStep ? 1.2 : 0) + (f.precision ? 0.5 : 0) + (f.grid ? 0.3 : 0);
  }
  /* 综合难度分：hard 标记 > 长步骤 > 阅读精度 > 填空；
     练习册 / 教材来源额外加分（讲义样题偏简单，练习册题更接近实测强度）。 */
  function qDifficulty(q, stemOf) {
    const f = questionFeatures(q, stemOf);
    let s = difficulty(f);
    if (q && q.origin === 'textbook') s += 0.6;
    if (q && /练习册|^[Pp]\s?\d/.test(String(q.source || ''))) s += 0.4;
    return s;
  }
  /* 按小节配额分配题数：先给保底（≥4 题的小节 2 题，其余 1 题），
     剩余槽位按题量比例、用最小余数法分配，保证每个知识点都被抽到。 */
  function sectionQuota(sections, need) {
    const keys = Object.keys(sections || {});
    const quota = {}; let rest = need;
    keys.forEach(k => {
      const f = (sections[k].length >= 4) ? 2 : 1;
      quota[k] = Math.min(f, sections[k].length); rest -= quota[k];
    });
    while (rest > 0) {
      let best = null, bestRatio = Infinity;
      keys.forEach(k => {
        if (quota[k] >= sections[k].length) return;
        const ratio = (quota[k] + 1) / sections[k].length;
        if (ratio < bestRatio) { bestRatio = ratio; best = k; }
      });
      if (!best) break;
      quota[best]++; rest--;
    }
    return quota;
  }

  /* Guarantee at least one SHORT wording-sensitive item in the paper, so the
     cold-start / carryover devices can always be placed fairly (G4). Any
     replacement stays inside the same (unit, type) slot, so the official
     domain and MCQ/SPR quotas are unchanged. */
  function ensurePrecisionCandidate(picked, pool, stemOf, used) {
    if (!stemOf || !picked || !picked.length) return false;
    const shortP = q => {
      const f = questionFeatures(q, stemOf);
      return f.precision && !f.longStep && !f.hard;
    };
    if (picked.some(shortP)) return false;
    const cand = (pool || []).find(q => !used[q.id] && shortP(q));
    if (!cand) return false;
    let at = picked.findIndex(q => q.unit === cand.unit && q.type === cand.type);
    if (at < 0) at = picked.findIndex(q => q.type === cand.type);
    if (at < 0) return false;
    delete used[picked[at].id];
    picked[at] = cand;
    used[cand.id] = 1;
    return true;
  }

  /* Order one paper/module. `opts.qOf` maps an item to its question object,
     `opts.keyOf` gives a unique key (quiz instances use uid, not question id). */
  function diagnosticSequence(list, rnd, opts) {
    const R = rnd || Math.random, o = opts || {};
    const qOf = o.qOf || (x => x), keyOf = o.keyOf || (x => x.id), stemOf = o.stemOf || null;
    const items = (list || []).slice();
    const feats = {};
    items.forEach(x => { feats[keyOf(x)] = questionFeatures(qOf(x), stemOf); });
    const F = x => feats[keyOf(x)] || {};
    const d = x => difficulty(F(x));
    const empty = { questions: items, diagnostic: { devices: [], distinctSections: 0, precisionItems: 0, guardrails: [] } };
    if (items.length < 4) return empty;

    // 1) Baseline ramp (CB official): easy -> hard with a random tiebreak.
    const ranked = shuffle(items, R).slice().sort((a, b) => d(a) - d(b));

    // 2) Coverage spread: round-robin over sections, consuming each section's
    //    bucket in ramp order. Rotating the bucket order every pass keeps the
    //    same section from always opening the paper.
    const buckets = {};
    ranked.forEach(x => { const k = F(x).section || '?'; (buckets[k] = buckets[k] || []).push(x); });
    const keys = shuffle(Object.keys(buckets), R);
    let seq = [];
    let pass = 0;
    while (seq.length < items.length) {
      const order = pass % 2 ? keys.slice().reverse() : keys;
      let moved = false;
      for (const k of order) if (buckets[k] && buckets[k].length) { seq.push(buckets[k].shift()); moved = true; }
      if (!moved) break;
      pass++;
    }

    // 3) G2: no duplicate keys.
    const seen = {}, dedup = [];
    seq.forEach(x => { const k = keyOf(x); if (!seen[k]) { seen[k] = 1; dedup.push(x); } });
    seq = dedup;
    const n = seq.length;
    const third = Math.max(1, Math.floor(n / 3));
    const tailStart = Math.max(0, n - third);
    const dens = s => s.filter(x => F(x).hard || F(x).longStep).length / Math.max(1, s.length);
    const swap = (i, j) => { const t = seq[i]; seq[i] = seq[j]; seq[j] = t; };

    // 4) G3: at most one hard item in the first four (move extras to the tail
    //    by swapping with the easiest tail item).
    for (let i = 3; i >= 0; i--) {
      const hardOnes = seq.slice(0, 4).filter(x => F(x).hard);
      if (hardOnes.length <= 1) break;
      let li = -1, lv = Infinity;
      for (let j = tailStart; j < n; j++) if (!F(seq[j]).hard && d(seq[j]) < lv) { lv = d(seq[j]); li = j; }
      const extra = hardOnes[hardOnes.length - 1];
      if (li >= 0) swap(seq.indexOf(extra), li); else break;
    }
    // 5) G3: the last third must not be easier than the first. Swap the hardest
    //    head item with the easiest tail item; never re-sort (re-sorting would
    //    re-cluster question types).
    let guard = 0;
    while (dens(seq.slice(tailStart)) < dens(seq.slice(0, third)) && guard++ < 10) {
      let hi = -1, hv = -1, li = -1, lv = Infinity;
      for (let i = 0; i < tailStart; i++) if (d(seq[i]) > hv) { hv = d(seq[i]); hi = i; }
      for (let i = tailStart; i < n; i++) if (d(seq[i]) < lv) { lv = d(seq[i]); li = i; }
      if (hi < 0 || li < 0 || d(seq[hi]) <= d(seq[li])) break;
      swap(hi, li);
    }

    // 6) ANTI-AUTOPILOT: spread the minority question type evenly. With the
    //    official 17 MCQ / 5 SPR split this yields a maximum MCQ run of 3,
    //    which is the mathematical minimum. Relative order inside each type
    //    (hence the difficulty ramp) is preserved.
    function balanceTypes(arr) {
      const mcq = arr.filter(x => F(x).type !== 'grid');
      const grid = arr.filter(x => F(x).type === 'grid');
      let A = mcq, B = grid;
      if (B.length > A.length) { const t = A; A = B; B = t; }
      const k = B.length;
      if (!k || !A.length) return arr;
      const per = Math.ceil(A.length / (k + 1)), out = [];
      let i = 0, j = 0;
      for (let s = 0; s < k; s++) {
        for (let c = 0; c < per && i < A.length; c++) out.push(A[i++]);
        out.push(B[j++]);
      }
      while (i < A.length) out.push(A[i++]);
      return out;
    }
    seq = balanceTypes(seq);

    // 7) Break 3+ same-section runs with SAME-TYPE swaps, so the type pattern
    //    produced above is never disturbed.
    for (let p = 0; p < 3; p++) {
      let changed = false;
      for (let i = 2; i < n; i++) {
        const c = F(seq[i]);
        if (!(F(seq[i - 1]).section === c.section && F(seq[i - 2]).section === c.section)) continue;
        let j = -1;
        for (let t = 0; t < n; t++) {
          if (t >= i - 2 && t <= i) continue;
          const f = F(seq[t]);
          if (f.type === c.type && f.section !== c.section) { j = t; break; }
        }
        if (j >= 0) { swap(i, j); changed = true; }
      }
      if (!changed) break;
    }

    /* Same-type swap helper: moving two items of the same type leaves the
       type pattern untouched, so diagnostic placement cannot create clustering. */
    function placeAt(target, predicate, excluded) {
      if (target < 0 || target >= n) return null;
      const blocked = excluded || {};
      const t = F(seq[target]).type;
      if (!blocked[keyOf(seq[target])] && predicate(seq[target], target)) return seq[target];
      const cand = seq.find((x, i) => i !== target && !blocked[keyOf(x)] &&
        F(x).type === t && predicate(x, i));
      if (!cand) return null;
      swap(target, seq.indexOf(cand));
      return cand;
    }
    const shortPrecision = (x) => F(x).precision && !F(x).longStep && !F(x).hard;
    const devices = [];

    // 8a) COLD START — a short, wording-sensitive item in the first four (G4).
    //     Prefer position 2; fall back to a neighbouring early slot when no
    //     same-type candidate exists there (keeps the type pattern intact).
    let cold = null, coldPos = -1;
    for (const target of [1, 2, 0, 3]) {
      cold = placeAt(target, shortPrecision, {});
      if (cold) { coldPos = target; break; }
    }
    const coldBlock = {};
    if (cold) {
      coldBlock[keyOf(cold)] = 1;
      devices.push({ device: 'cold-start-precision', id: keyOf(cold), pos: coldPos + 1 });
    }

    // 8b) ATTENTION CARRYOVER — a short limiting-word item directly after the
    //     hardest item in the first 60%. Never reuse the cold-start item.
    let hardPos = -1, hardVal = -1;
    for (let i = 0; i < Math.floor(n * 0.6); i++) if (d(seq[i]) > hardVal) { hardVal = d(seq[i]); hardPos = i; }
    if (hardPos >= 0 && hardPos + 1 < n && !coldBlock[keyOf(seq[hardPos + 1])]) {
      const trap = placeAt(hardPos + 1, shortPrecision, coldBlock);
      if (trap) devices.push({ device: 'post-hard-precision', id: keyOf(trap), pos: hardPos + 2 });
    }

    // 8c) NEAR-TWIN — two items from one knowledge point with different
    //     surface forms, kept far apart by the round-robin (transfer check).
    const bySec = {};
    seq.forEach((x, i) => { const k = F(x).section; (bySec[k] = bySec[k] || []).push(i); });
    Object.keys(bySec).some(k => {
      const p = bySec[k];
      if (p.length < 2) return false;
      const a = seq[p[0]], b = seq[p[p.length - 1]];
      if (keyOf(a) !== keyOf(b) && (F(a).type !== F(b).type || F(a).stem !== F(b).stem)) {
        devices.push({ device: 'near-twin-section', section: k, ids: [keyOf(a), keyOf(b)] });
        return true;
      }
      return false;
    });

    return {
      questions: seq,
      diagnostic: {
        devices: devices,
        distinctSections: Array.from(new Set(seq.map(x => F(x).section))).size,
        precisionItems: seq.filter(x => F(x).precision).length,
        guardrails: ['no stem/answer/timer changes', 'no duplicate ids', 'easy-to-hard ramp kept',
                     'cold-start item is short', 'no UI changes']
      }
    };
  }

  /* =====================================================================
     Official 44-question paper assembly, module by module (adaptive)
     ===================================================================== */
  function distributeTypes(domainQuota, typeQuota, capacity, units) {
    const grid = {}; let forced = 0;
    units.forEach(u => {
      grid[u] = Math.max(0, domainQuota[u] - (capacity[u] ? capacity[u].mcq : 0));
      forced += grid[u];
    });
    let left = typeQuota.grid - forced;
    // allocate remaining SPR slots to domains with the largest available grid pool
    const order = units.slice().sort((a, b) => {
      const ca = (capacity[b] ? capacity[b].grid : 0) - (capacity[a] ? capacity[a].grid : 0);
      return ca || a - b;
    });
    for (let pass = 0; pass < 3 && left > 0; pass++) {
      for (const u of order) {
        if (left <= 0) break;
        const room = Math.min((capacity[u] ? capacity[u].grid : 0) - grid[u], domainQuota[u] - grid[u]);
        const take = Math.min(left, Math.max(0, room));
        grid[u] += take; left -= take;
      }
    }
    const mcq = {};
    units.forEach(u => { mcq[u] = domainQuota[u] - grid[u]; });
    return { grid, mcq, shortfall: Math.max(0, left) };
  }

  /* Pick one official module (22 questions). `prefer` = 'mixed' | 'hard' | 'easy'.
     `opts.stemOf` supplies the rendered stem for diagnostic feature detection. */
  function buildModule(bank, moduleNo, prefer, exclude, rnd, opts) {
    const cfg = moduleNo === 1 ? OFFICIAL.module1 : OFFICIAL.module2;
    const units = [1, 2, 3, 4];
    const pool = bank.filter(q => !exclude[q.id]);
    const capacity = {};
    units.forEach(u => {
      const g = pool.filter(q => q.unit === u);
      capacity[u] = { mcq: g.filter(q => q.type === 'mcq').length, grid: g.filter(q => q.type === 'grid').length };
    });
    const split = distributeTypes(cfg.domain, cfg.type, capacity, units);

    // Difficulty routing: the harder path draws from the high-difficulty paper
    // and later question numbers; the easier path draws from standard items.
    const rank = q => {
      if (prefer === 'hard') return (q.level === 'hard' ? 0 : 1) * 1000 - q.no;
      if (prefer === 'easy') return (q.level === 'hard' ? 1 : 0) * 1000 + q.no;
      return 0; // mixed
    };
    const groups = {};
    units.forEach(u => {
      groups[u] = {};
      ['grid', 'mcq'].forEach(t => {
        const list = pool.filter(q => q.unit === u && q.type === t);
        /* Coverage first: consume one item from every knowledge point before
           taking a second from any of them. Difficulty routing still applies
           INSIDE each bucket, so adaptive hard/easy paths are preserved. */
        groups[u][t] = spreadBySection(list, rnd, (a, b) => rank(a) - rank(b));
      });
    });

    const picked = [], used = {}, deviations = [];
    function take(u, t, wantedType) {
      let q = (groups[u][t] || []).find(x => !used[x.id]);
      if (q) { used[q.id] = 1; picked.push(q); return true; }
      // fallback 1: other question type inside the same domain
      const other = t === 'grid' ? 'mcq' : 'grid';
      q = (groups[u][other] || []).find(x => !used[x.id]);
      if (q) { used[q.id] = 1; picked.push(q); deviations.push({ unit: u, wanted: t, got: other, id: q.id }); return true; }
      return false;
    }
    // SPR slots first (scarcer), then MCQ slots
    const slots = [];
    units.forEach(u => { for (let i = 0; i < split.grid[u]; i++) slots.push({ u, t: 'grid' }); });
    units.forEach(u => { for (let i = 0; i < split.mcq[u]; i++) slots.push({ u, t: 'mcq' }); });
    slots.forEach(s => take(s.u, s.t));
    // fallback 2: fill from any remaining question, preferring the required domain count
    if (picked.length < 22) {
      const rest = shuffle(pool.filter(q => !used[q.id]), rnd);
      for (const q of rest) { if (picked.length >= 22) break; used[q.id] = 1; picked.push(q); deviations.push({ unit: q.unit, wanted: 'slot', got: 'fill', id: q.id }); }
    }
    // Make sure the paper can host a fair cold-start precision item; the
    // replacement never changes any official quota.
    ensurePrecisionCandidate(picked, pool, (opts && opts.stemOf) || null, used);
    // Within a module, official papers run easy -> hard and mix domains.
    // diagnosticSequence adds broad knowledge-point spread plus the bounded,
    // disclosed diagnostic rhythm (see GUARDRAILS above).
    const seq = diagnosticSequence(picked.slice(0, 22), rnd,
      { stemOf: (opts && opts.stemOf) || null });
    const ordered = seq.questions;
    return {
      questions: ordered,
      diagnostic: seq.diagnostic,
      planned: { domain: cfg.domain, type: cfg.type },
      actual: {
        domain: units.reduce((o, u) => (o[u] = ordered.filter(q => q.unit === u).length, o), {}),
        type: { mcq: ordered.filter(q => q.type === 'mcq').length, grid: ordered.filter(q => q.type === 'grid').length },
        hard: ordered.filter(q => q.level === 'hard').length
      },
      deviations
    };
  }
  function interleave(list, units, rnd) {
    // keep domain mix spread out (round-robin over domain buckets), difficulty ascending inside bucket
    const buckets = {};
    units.forEach(u => { buckets[u] = shuffle(list.filter(q => q.unit === u), rnd).sort((a, b) => (a.level === 'hard' ? 1 : 0) - (b.level === 'hard' ? 1 : 0)); });
    const out = [];
    while (out.length < list.length) {
      let moved = false;
      for (const u of units) if (buckets[u] && buckets[u].length) { out.push(buckets[u].shift()); moved = true; }
      if (!moved) break;
    }
    return out;
  }
  const routeModule2 = m1Correct => m1Correct >= OFFICIAL.routingCut ? 'hard' : 'easy';

  function buildFullPaper(bank, rnd, opts) {
    const R = rnd || Math.random, o = opts || {};
    /* Freshness: keep the previous paper's questions out of this one when the
       bank is large enough, so every sitting really is a new paper. 66 covers
       m1 (22) + both m2 paths (22 + 22) with headroom for domain quotas. */
    let source = bank;
    const avoid = o.avoidIds || [];
    if (avoid.length) {
      const used = {}; avoid.forEach(id => { used[id] = 1; });
      const fresh = bank.filter(q => !used[q.id]);
      if (fresh.length >= 66) source = fresh;
    }
    const m1 = buildModule(source, 1, 'mixed', {}, R, o);
    const exclude = {}; m1.questions.forEach(q => exclude[q.id] = 1);
    const m2hard = buildModule(source, 2, 'hard', exclude, R, o);
    // m2easy 除了排除 m1，还要排除 m2hard 已抽的题，否则难/易两条自适应分支
    // 会抽到同一道题（学生虽只走一条分支，但两条难度分流卷的成色会被稀释）。
    const excludeEasy = Object.assign({}, exclude);
    m2hard.questions.forEach(q => excludeEasy[q.id] = 1);
    const m2easy = buildModule(source, 2, 'easy', excludeEasy, R, o);
    return {
      module1: m1.questions,
      module2: { hard: m2hard.questions, easy: m2easy.questions },
      diagnostic: { module1: m1.diagnostic, module2Hard: m2hard.diagnostic, module2Easy: m2easy.diagnostic }
    };
  }

  /* =====================================================================
     Practice pool — identical selection logic to the existing app
     ===================================================================== */
  function buildPracticePool(bank, settings, state, mode, unitId, rnd) {
    const R = rnd || Math.random;
    if (mode === 'wrong') {
      const rank = Object.keys(state.wrong || {}).filter(id => byId(bank, id));
      let pool = bank.filter(q => rank.indexOf(q.id) >= 0);
      pool.sort((a, b) => ((state.wrong[b.id] || {}).count || 0) - ((state.wrong[a.id] || {}).count || 0));
      return pool;
    }
    if (mode === 'unit') {
      const pool = bank.filter(q => q.unit === unitId);
      return settings.order === 'random' ? shuffle(pool, R) : pool.slice().sort((a, b) => a.no - b.no);
    }
    // exam: official domain proportions, interleaved
    const w = { 1: 34, 2: 15, 3: 36, 4: 15 };
    const queues = {}; [1, 2, 3, 4].forEach(u => queues[u] = shuffle(bank.filter(q => q.unit === u), R));
    const seq = [], pos = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (let k = 0; k < 100; k++) {
      let best = null, bestScore = -1;
      for (const u of [1, 2, 3, 4]) {
        if (pos[u] >= w[u]) continue;
        const score = (pos[u] + 1) / w[u];
        if (score < bestScore || best === null) { bestScore = score; best = u; }
      }
      if (best === null) break;
      seq.push(best); pos[best]++;
    }
    let pool = [];
    for (const u of seq) if (queues[u].length) pool.push(queues[u].pop());
    const used = {}; pool.forEach(q => used[q.id] = 1);
    const rest = settings.order === 'unit'
      ? bank.filter(q => !used[q.id]).sort((a, b) => a.unit - b.unit || a.no - b.no)
      : shuffle(bank.filter(q => !used[q.id]), R);
    pool = pool.concat(rest);
    if (settings.order === 'unit') return pool.sort((a, b) => a.unit - b.unit || a.no - b.no);
    if (settings.order === 'random') return shuffle(pool, R);
    return pool;
  }
  /* Duration of a practice / quiz session, from the existing practice settings. */
  function practiceDurationSec(settings, n) {
    const tmode = settings.tmode || 'official';
    const count = Number(n);
    const qn = Number.isFinite(count) && count > 0 ? count : 1;
    /* 旧版本/云端合并的 settings 可能是字符串：Math.round('x') 会得到 NaN，
       开场页显示 NaN、开考后 endsAt 也是 NaN，倒计时永远不结束。 */
    if (tmode === 'total') {
      const minutes = Number(settings.total);
      if (Number.isFinite(minutes) && minutes > 0) return Math.max(60, Math.round(minutes * 60));
    }
    if (tmode === 'perq') {
      const perQ = Number(settings.perQ);
      if (Number.isFinite(perQ) && perQ > 0) return Math.max(60, Math.round(qn * perQ));
    }
    // 'official' and invalid legacy settings: 95s/question pacing, always finite
    return Math.max(60, Math.round(qn * 95));
  }

  /* =====================================================================
     UNIT QUIZ — 4-tier rules, strict boundaries
     ===================================================================== */
  const QUIZ_TIERS = Object.freeze([
    { id: 'T1', max: 20, total: 20, must: 'min(W,10)', label: '错题数 ≤ 20（含 0～20）', rule: '抽 20 题；历史错题数 = min(全部错题, 10)，不足 10 道全部纳入、不强行凑数' },
    { id: 'T2', max: 25, total: 25, must: 10, label: '20 < 错题数 ≤ 25', rule: '抽 25 题；其中 10 道为历史错题' },
    { id: 'T3', max: 30, total: 30, must: 15, label: '25 < 错题数 ≤ 30', rule: '抽 30 题；其中 15 道为历史错题' },
    { id: 'T4', max: Infinity, total: 30, must: 15, label: '错题数 > 30', rule: '按 30 题上限抽题；其中 15 道为历史错题' }
  ]);
  function quizTier(w) {
    if (w <= 20) return QUIZ_TIERS[0];
    if (w <= 25) return QUIZ_TIERS[1];
    if (w <= 30) return QUIZ_TIERS[2];
    return QUIZ_TIERS[3];
  }
  /* wrongIds: unique question ids from the unit's usual mistake notebook.
     卷长按 QUIZ_TIERS 的错题数分档（这是产品定下的规律，别再用「覆盖率」改它）：
       错题 0–20  →  20 题，历史错题最多 10 道复测（不足 10 道全纳入，不凑数）
       错题 21–25 →  25 题，其中 10 道历史错题
       错题 26–30 →  30 题，其中 15 道历史错题
       错题 > 30  →  30 题，其中 15 道历史错题
     其余题位仍按小节配额铺开，保证覆盖本单元全部知识点（这是下面 secCount 的用途）。
     卷长不超过本单元题库实际题数。 */
  function quizPlan(wrongIds, unitQuestions) {
    const ids = Array.from(new Set(wrongIds || []));
    const W = ids.length;
    const uq = unitQuestions || [];
    const tier = quizTier(W);
    const total = Math.max(1, Math.min(tier.total, uq.length || tier.total));
    const mustCapRaw = tier.must === 'min(W,10)' ? Math.min(W, 10) : tier.must;
    const mustWrong = Math.max(0, Math.min(mustCapRaw, W, total));
    const otherCount = Math.max(0, total - mustWrong);
    const sections = {};
    uq.forEach(q => { const k = coverageKey(q); (sections[k] = sections[k] || []).push(q); });
    const secCount = Object.keys(sections).length;
    return {
      wrongCount: W, tierId: tier.id, tierLabel: tier.label,
      tierRule: tier.rule + '；其余题位按小节配额覆盖本单元全部知识点，节内优先高难度题',
      total, mustWrong, otherCount,
      wrongIds: ids.slice(0, mustWrong),
      allWrongIds: ids,                 // ALL historical mistakes drive weakness detection
      bankSize: uq.length, sectionCount: secCount
    };
  }
  /* Weak knowledge points, ranked by mistake frequency (then recency count). */
  function weakTopicsOf(wrongIds, bank, state) {
    const freq = {};
    (wrongIds || []).forEach(id => {
      const q = byId(bank, id); if (!q) return;
      const key = q.section + '|' + q.topic;
      const w = (state && state.wrong && state.wrong[id]) || {};
      const g = freq[key] || { key, section: q.section, topic: q.topic, unit: q.unit, hits: 0, count: 0, ids: [] };
      g.hits++; g.count += (w.count || 1); g.ids.push(id); freq[key] = g;
    });
    return Object.values(freq).sort((a, b) => b.count - a.count || b.hits - a.hits || a.key.localeCompare(b.key));
  }
  /* Build the quiz paper. Guarantees EXACTLY plan.total instances, and EXACTLY
     plan.mustWrong of them are historical mistakes. When the unit bank is
     smaller than the required count, questions are cycled (repeat) — the
     count rule always wins. */
  function buildQuizPaper(bank, unitQuestions, plan, state, rnd, opts) {
    const R = rnd || Math.random, o = opts || {};
    const weak = weakTopicsOf(plan.allWrongIds || plan.wrongIds, bank, state);
    const weakSections = {};
    weak.forEach(w => { weakSections[coverageKey({ section: w.section })] = 1; });
    const isWeak = q => !!weakSections[coverageKey(q)];

    // 1) 历史错题复测：至多 plan.mustWrong 道，按错误次数排序，不占满卷面
    const wmap = (state && state.wrong) || {};
    const chosenWrong = plan.wrongIds.slice().sort((a, b) =>
      ((wmap[b] || {}).count || 0) - ((wmap[a] || {}).count || 0)).slice(0, plan.mustWrong);

    // 2) 其余槽位按小节配额分配：每个知识点都抽到；节内从高难度档随机，
    //    不再只围着错题小节转。
    let pool = unitQuestions.filter(q => chosenWrong.indexOf(q.id) < 0);
    const avoid = o.avoidIds || [];
    if (avoid.length) {
      const used = {}; avoid.forEach(id => { used[id] = 1; });
      const fresh = pool.filter(q => !used[q.id]);
      // Only prefer fresh questions when enough remain to fill the paper.
      if (fresh.length >= plan.otherCount) pool = fresh;
    }
    const sections = {};
    pool.forEach(q => { const k = coverageKey(q); (sections[k] = sections[k] || []).push(q); });
    const quota = sectionQuota(sections, plan.otherCount);
    const pickedOthers = [], seenId = {};
    chosenWrong.forEach(id => { seenId[id] = 1; });
    Object.keys(quota).forEach(k => {
      const bucket = sections[k] || [];
      // 先随机打乱再按难度降序（稳定排序）：同分随机，高难度优先
      const sorted = shuffle(bucket, R).sort((a, b) =>
        qDifficulty(b, o.stemOf) - qDifficulty(a, o.stemOf));
      const take = Math.min(quota[k], sorted.length);
      // 高难度档（前 60%）内随机抽取，避免每卷固定抽同一道最难题
      const band = sorted.slice(0, Math.max(take, Math.ceil(sorted.length * 0.6)));
      const rolled = shuffle(band, R);
      for (let i = 0; i < take; i++) {
        const q = rolled[i];
        if (!q || seenId[q.id]) continue;
        seenId[q.id] = 1;
        pickedOthers.push({ id: q.id, from: isWeak(q) ? 'weak' : 'bank', repeat: 1 });
      }
    });
    // Fallback: 题库太小或配额不足时循环补齐。plan.total / plan.mustWrong 计数始终成立。
    const filler = shuffle(pool, R);
    let fi = 0;
    while (pickedOthers.length < plan.otherCount && filler.length) {
      const q = filler[fi++ % filler.length];
      const rep = (seenId[q.id] || 1) + 1;
      seenId[q.id] = rep;
      pickedOthers.push({ id: q.id, from: 'bank', repeat: rep });
    }

    const instances = chosenWrong.map((id, i) => ({ uid: 'QZ-' + (i + 1), id, from: 'wrong', repeat: 1 }))
      .concat(pickedOthers.map((p, i) => ({ uid: 'QZ-' + (chosenWrong.length + i + 1), id: p.id, from: p.from, repeat: p.repeat })));
    /* Same fairness guarantee as the mock: one short wording-sensitive item in
       the paper. Historical-mistake instances are never replaced, so the exact
       plan.mustWrong count is preserved. */
    if (o.stemOf) {
      const shortP = q => { const f = questionFeatures(q, o.stemOf); return f.precision && !f.longStep && !f.hard; };
      const has = instances.some(inst => shortP(byId(bank, inst.id) || {}));
      if (!has) {
        const cand = unitQuestions.find(q => shortP(q) && !instances.some(inst => inst.id === q.id));
        if (cand) {
          const at = instances.findIndex(inst => inst.from !== 'wrong' &&
            (byId(bank, inst.id) || {}).type === cand.type);
          if (at >= 0) instances[at] = { uid: instances[at].uid, id: cand.id,
            from: instances[at].from, repeat: instances[at].repeat };
        }
      }
    }
    // Diagnostic sequencing: broad section spread + the bounded, disclosed
    // rhythm. Provenance (`from`) travels with each instance untouched.
    const seq = diagnosticSequence(instances, R, {
      qOf: x => byId(bank, x.id) || {},
      keyOf: x => x.uid,
      stemOf: o.stemOf || null
    });
    const ordered = seq.questions;
    return {
      instances: ordered,
      diagnostic: seq.diagnostic,
      weakTopics: weak,
      summary: {
        total: ordered.length,
        wrongIncluded: ordered.filter(x => x.from === 'wrong').length,
        weakMatched: ordered.filter(x => x.from === 'weak').length,
        bankMatched: ordered.filter(x => x.from === 'bank').length,
        repeats: ordered.filter(x => x.repeat > 1).length
      }
    };
  }
  /* Mistake notebook for a unit: unique ids from wrong{} plus history detail. */
  function unitWrongIds(bank, state, unitId) {
    const ids = [];
    Object.keys((state && state.wrong) || {}).forEach(id => {
      const q = byId(bank, id); if (q && q.unit === unitId) ids.push(id);
    });
    (Array.isArray(state && state.history) ? state.history : []).forEach(h => (Array.isArray(h && h.detail) ? h.detail : []).forEach(d => {
      if (!isRec(d) || isRightFlag(d.correct)) return;
      const q = byId(bank, d.id); if (q && q.unit === unitId) ids.push(d.id);
    }));
    return Array.from(new Set(ids));
  }

  /* =====================================================================
     Unified result: per-question detail, mistakes, weakness report
     ===================================================================== */
  function scoreSession(questions, answers) {
    return questions.map((q, i) => {
      const a = answers[q.id] || {};
      const given = a.v == null ? '' : String(a.v);
      const ok = grade(q, given);
      return {
        pos: i + 1, id: q.id, unit: q.unit, section: q.section, topic: q.topic,
        source: q.source, image: q.image, hint: q.hint, type: q.type, level: q.level,
        correct: ok, given,
        /* 填空只有 value（37 题）时把 value 落进 answer，否则记录页/错题本无法显示正确答案 */
        answer: q.answer != null ? q.answer
          : (q.value != null ? q.value : (Array.isArray(q.values) && q.values.length ? q.values.join(', ') : q.answer)),
        points: ok ? 1 : 0,
        seconds: Math.round((a.spent || 0) / 1000), marked: isRightFlag(a.marked)
      };
    });
  }
  /* Estimated section score for any mode. */
  function estimateScore(mode, correct, total, path) {
    if (mode === 'mock') {
      const raw = Math.max(0, Math.min(44, correct));
      return { raw, rawMax: 44, scaled: scaledScore(raw, path), path: path || 'hard', basis: '官方 44 题原始分 → 200–800 参考换算' };
    }
    const raw = Math.max(0, Math.min(44, Math.round(correct / Math.max(1, total) * 44)));
    return { raw, rawMax: 44, scaled: scaledScore(raw, 'hard'), path: 'hard',
             basis: '按本次正确率折算到 44 题后的参考估分（练习估算，非官方换算）' };
  }
  /* Weakness report grouped by unit AND knowledge point, with an explicit
     priority ranking and the concrete wrong questions attached. */
  function weaknessReport(detail, units, state) {
    /* detail 是旧记录/云端合并来的数组时，可能混进 null、数组、字符串：
       直接 d.unit 会 TypeError，整份成绩报告打不开。先过滤成真实对象。 */
    detail = Array.isArray(detail) ? detail.filter(d => d && typeof d === 'object' && !Array.isArray(d)) : [];
    const ug = {}, tg = {};
    detail.forEach(d => {
      /* unit/section 可能是对象：直接当键会聚成 "[object Object]"，报告标题
         还会显示成「U[object Object] ...」。先统一成字符串。 */
      const unitKey = d.unit == null || typeof d.unit === 'object' ? '' : String(d.unit);
      const sectionKey = d.section == null || typeof d.section === 'object' ? '' : String(d.section);
      const u = ug[unitKey] || (ug[unitKey] = { unit: unitKey, n: 0, wrong: 0, ids: [] });
      u.n++; if (!isRightFlag(d.correct)) { u.wrong++; u.ids.push(d.id); }
      /* topic 在云端/旧记录里可能是数字或对象：直接 .replace 会把成绩页打崩，
         对象字符串化还会让报告标题变成 [object Object]。 */
      const topic = d.topic == null || typeof d.topic === 'object' ? '' : String(d.topic);
      const key = sectionKey + '|' + topic;
      const t = tg[key] || (tg[key] = { key, unit: unitKey, section: sectionKey, topic, n: 0, wrong: 0, ids: [], seconds: 0 });
      t.n++; t.seconds += Number(d.seconds) || 0; if (!isRightFlag(d.correct)) { t.wrong++; t.ids.push(d.id); }
    });
    const historic = (state && state.wrong) || {};
    const hScore = ids => ids.reduce((s, id) => s + ((historic[id] || {}).count || 0), 0);
    const unitRows = Object.values(ug).map(g => {
      const rate = g.n ? g.wrong / g.n : 0;
      return Object.assign({}, g, {
        name: unitName(units, g.unit), rate,
        score: g.wrong * 4 + rate * 12 + hScore(g.ids) * 2
      });
    }).sort((a, b) => b.score - a.score || b.wrong - a.wrong);
    const topicRows = Object.values(tg).map(g => {
      const rate = g.n ? g.wrong / g.n : 0;
      return Object.assign({}, g, {
        name: g.section + ' ' + g.topic.replace(/^\d+\.\d+\s*/, ''), rate,
        avgSeconds: g.n ? Math.round(g.seconds / g.n) : 0,
        score: g.wrong * 5 + rate * 14 + hScore(g.ids) * 2.5 + ((g.n ? g.seconds / g.n : 0) > 95 ? 2 : 0)
      });
    }).sort((a, b) => b.score - a.score || b.wrong - a.wrong);
    const wrongOnlyTopics = topicRows.filter(t => t.wrong > 0);
    const priority = [];
    unitRows.filter(u => u.wrong > 0).slice(0, 3).forEach((u, i) => priority.push({
      level: 'P' + i, type: 'unit', key: u.name, name: u.name,
      wrong: u.wrong, total: u.n, rate: u.rate, wrongIds: u.ids,
      reason: '本单元错 ' + u.wrong + '/' + u.n + ' 题，错误率 ' + Math.round(u.rate * 100) + '%',
      action: '优先补强单元：先重做对应错题，再按下列知识点顺序复习'
    }));
    wrongOnlyTopics.slice(0, 8).forEach((t, i) => priority.push({
      level: 'P' + Math.min(2, Math.floor(i / 3)), type: 'topic', key: t.key, name: t.name,
      wrong: t.wrong, total: t.n, rate: t.rate, wrongIds: t.ids,
      reason: '知识点错 ' + t.wrong + '/' + t.n + ' 题，平均用时 ' + t.avgSeconds + ' 秒',
      action: '按知识点专项练习，对应错题：' + t.ids.join('、')
    }));
    priority.sort((a, b) => (a.level.localeCompare(b.level)) || (b.wrong - a.wrong));
    return {
      units: unitRows, topics: topicRows, weakTopics: wrongOnlyTopics, priority,
      wrongDetail: detail.filter(d => isRec(d) && !isRightFlag(d.correct)),
      correct: detail.filter(d => d.correct).length, total: detail.length
    };
  }

  /* =====================================================================
     SESSION REPAIR（存档兼容层，纯函数，无 DOM）
     规则只有两条：能按官方 22/22 结构确定性重建 → ok；否则 → expired。
     绝不「猜一个看起来对的区间」：区间错了，题号和判分就是两套口径。
     ===================================================================== */
  /* 两个时间戳是否指同一次开考：旧版/云端合并会把 startedAt 写成字符串，
    严格 === 会把同一条未做完记录再看成新记录，历史页出现两条「未做完」，
    交卷后清存档也只清掉其中一条。 */
  function sameTime(a, b) {
    if (a == null || b == null || typeof a === 'boolean' || typeof b === 'boolean') return false;
    const x = Number(a), y = Number(b);
    return isFinite(x) && isFinite(y) && x === y;
  }

  function parseSession(saved, opts) {
    opts = opts || {};
    const per = opts.perModule || OFFICIAL.questionsPerModule;
    const total = per * 2;
    const isBank = typeof opts.isQuestionId === 'function' ? opts.isQuestionId : function () { return true; };
    const fail = reason => ({ status: 'expired', reason, session: null });
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return fail('missing');
    const mode = opts.mode || saved.mode;
    if (!mode || saved.mode !== mode) return fail('mode');
    /* 单元抽查的存档只属于一个 unit：在 Unit 2 页面恢复 Unit 1 的卷面，
       会让页头写 Unit 2、题目却全是 Unit 1，提交后成绩也记到错单元。 */
    if (opts.unitId != null && Number(saved.unitId) !== Number(opts.unitId)) return fail('unit');
    const paper = saved.paper;
    if (!Array.isArray(paper) || !paper.length) return fail('paper-empty');
    const n = paper.length;
    const seenPaperUid = {};
    for (let i = 0; i < n; i++) {
      const x = paper[i];
      if (!x || typeof x !== 'object') return fail('paper-shape');
      if (typeof x.uid !== 'string' || !x.uid) return fail('paper-uid');
      /* 同一份卷面里 uid 重复：两个位置写同一格答案，判分和导航都会串题。
         旧版/云端合并可能把同一道题拼两次；这种卷面不可重建，直接作废。 */
      if (seenPaperUid[x.uid]) return fail('paper-uid-dup');
      seenPaperUid[x.uid] = 1;
      if (!isBank(x.id)) return fail('bank');
    }
    /* 布尔时间不是合法时间：true 的 Number 是 1，搭配一个 0.5 的 startedAt
       就能骗过校验，恢复后 Date.now() >= S.endsAt 立即自动交卷。只认有限数字。 */
    const startN = Number(saved.startedAt), endN = Number(saved.endsAt);
    if (typeof saved.startedAt === 'boolean' || typeof saved.endsAt === 'boolean' ||
        !isFinite(startN) || !isFinite(endN) ||
        !(startN > 0) || !(endN > startN)) return fail('clock');
    const s = JSON.parse(JSON.stringify(saved));
    s.startedAt = startN; s.endsAt = endN;
    /* 存档里的 unitId 可能是字符串 '2'（旧版/云端合并）。校验用 Number 通过后，
       归一到调用方的数字，否则后面 UI 的严格 !== 仍会把可恢复的卷拒掉。 */
    if (opts.unitId != null) s.unitId = opts.unitId;
    let m1;
    if (mode === 'mock') {
      /* 官方卷只有两种合法形态：22 题（只在 Module 1）/ 44 题（两模块） */
      if (n !== per && n !== total) return fail('shape');
      if (s.m1Size != null && Number(s.m1Size) !== per) return fail('m1');
      /* 22 题只能停在模块一，44 题只能是已进模块二；反过来都是无法重建的形态。
         旧存档/云端合并里的 module 可能是字符串 "2"，先归一化再判，否则 44 题
         会被当成模块一，只显示前 22 题。 */
      const mod = Number(s.module) === 2 ? 2 : 1;
      if (n === per && mod !== 1) return fail('shape');   // 模块二却没有模块一的卷：不可重建
      if (n === total && mod !== 2) return fail('shape');  // 44 题却标模块一：再进模块二会重复拼卷
      s.module = mod;
      m1 = per;
      /* 22 题且仍在模块一：m2Options 既要存在，也要每个候选题都是合法实例。
         只查 Array.isArray 不够——云端合并/旧版本可能塞进 null 或字符串，进入
         模块二 concat 后 renderQuestion 会在 cur().id 上崩，提前判存档过期更安全。 */
      const instOk = x => !!x && typeof x === 'object' &&
        typeof x.uid === 'string' && !!x.uid && isBank(x.id);
      /* 两条自适应分支都必须正好凑满一个模块（22 题）。只查 every 会把
         `{hard:[],easy:[]}` 或只有 4 题的半截候选当成合法：进入 Module 2 后
         paper 只有 26/32 题，题目导航空白、成绩按不足 44 题计算。 */
      const uniqUid = list => {
        const seen = {};
        return list.every(x => {
          if (seen[x.uid]) return false;
          seen[x.uid] = 1; return true;
        });
      };
      /* 候选 uid 还必须和 Module 1 的卷面不重名：进 Module 2 时 paper 直接
         concat，重名会让 `answers[uid]` 把 Module 1 的作答覆盖成空，22 题
         的答案在内存里蒸发（刷新后更没法找回）。 */
      const noPaperClash = list => list.every(x => !seenPaperUid[x.uid]);
      const optsOk = !!s.m2Options && Array.isArray(s.m2Options.hard) && Array.isArray(s.m2Options.easy) &&
        s.m2Options.hard.length === per && s.m2Options.easy.length === per &&
        s.m2Options.hard.every(instOk) && s.m2Options.easy.every(instOk) &&
        uniqUid(s.m2Options.hard) && uniqUid(s.m2Options.easy) &&
        noPaperClash(s.m2Options.hard) && noPaperClash(s.m2Options.easy);
      if (n === per && !optsOk) return fail('m2-options');
    } else {
      m1 = n;
    }
    s.m1Size = m1;
    /* durationSec 可能是布尔/Infinity/对象：true 会被 Number 成 1，恢复后
       页面只给 1 秒就自动交卷。只接受有限正数，否则按 endsAt-startedAt 重算。 */
    var dur = typeof s.durationSec === 'boolean' ? NaN : Number(s.durationSec);
    if (!isFinite(dur) || dur <= 0) s.durationSec = Math.round((s.endsAt - s.startedAt) / 1000);
    else s.durationSec = dur;
    var modEnd = typeof s.moduleEndsAt === 'boolean' ? NaN : Number(s.moduleEndsAt);
    s.moduleEndsAt = isFinite(modEnd) && modEnd > 0 ? modEnd : s.endsAt;
    const inModule2 = mode === 'mock' && s.module === 2;
    s.module = inModule2 ? 2 : 1;
    /* 数组的 typeof 也是 'object'：answers 是 [] 时会被放行，随后按 uid 写成
       数组的自定义属性，可 JSON.stringify 会把这些属性全部丢掉——刷新一次
       整卷作答归零。和 sections/板块同一口径，数组一律重建为普通对象。 */
    if (!s.answers || typeof s.answers !== 'object' || Array.isArray(s.answers)) s.answers = {};
    paper.forEach(function (x) {
      const a = s.answers[x.uid];
      if (!a || typeof a !== 'object' || Array.isArray(a)) {
        /* 作答被云端合并/旧版写成裸字符串或数字时，旧实现一律清空，刷新后整题
           答案消失。字符串/有限数字按旧值恢复成可判分对象；对象/数组仍清空，
           避免 [object Object] 进输入框。 */
        var rawV = typeof a === 'string' || (typeof a === 'number' && Number.isFinite(a)) ? String(a) : '';
        s.answers[x.uid] = { v: rawV, marked: false, spent: 0, locked: false };
      } else {
        /* 云端合并/旧版本可能把作答写成对象或数组。直接留给 DOM 会在 grid 输入框
           里显示 [object Object]，导航还会算成「已作答」，判分却按空答案算。 */
        if (typeof a.v === 'string') { /* already fine */ }
        else if (typeof a.v === 'number' && Number.isFinite(a.v)) a.v = String(a.v);
        else a.v = '';
        a.marked = isRightFlag(a.marked); a.locked = isRightFlag(a.locked);
        a.spent = Number(a.spent) > 0 ? Number(a.spent) : 0;
      }
    });
    const lo = inModule2 ? m1 : 0;
    const hi = (inModule2 ? n : m1) - 1;
    const idx = Number(s.idx);
    s.idx = Math.min(Math.max(Number.isFinite(idx) ? idx : lo, lo), Math.max(lo, hi));
    /* 云端/旧版可能把布尔存成字符串：'false' 是 truthy，会把未交的卷锁死。 */
    s.finished = isRightFlag(s.finished);
    s.locked = isRightFlag(s.locked);
    /* finished 必须有真正的 result 对象：数组、字符串、{detail:null} 都是
       truthy，旧实现会放行，随后成绩页拿 r.detail 渲染出一张空白假成绩。
       形状不对就回到可继续的答题态，而不是显示一张 0/0 的成绩单。 */
    /* detail 光「是数组」还不够：空数组或一排 null 同样会渲染出 0/0 假成绩。
       合法 result 必须逐题一条对象，长度与 paper 对齐。 */
    const resultOk = s.result && typeof s.result === 'object' && !Array.isArray(s.result) &&
      Array.isArray(s.result.detail) && s.result.detail.length === paper.length &&
      s.result.detail.every(d => d && typeof d === 'object' && !Array.isArray(d));
    if (s.finished && !resultOk) {
      s.finished = false; s.locked = false; s.result = null;
      if (s.stage === 'result') s.stage = 'answer';
    }
    return { status: 'ok', reason: '', session: s };
  }

  /* 当前会话可作答的区间。非法会话返回 null —— 调用方必须走「作废」而不是凑一个区间。 */
  function sessionRange(s) {
    if (!s || !Array.isArray(s.paper) || !s.paper.length) return null;
    const n = s.paper.length;
    if (s.mode !== 'mock') return { lo: 0, hi: n - 1 };
    const m1 = Number(s.m1Size);
    if (!(m1 > 0) || m1 > n) return null;
    if (s.module === 2 && m1 >= n) return null;
    return s.module === 2 ? { lo: m1, hi: n - 1 } : { lo: 0, hi: m1 - 1 };
  }

  /* 刷新回到开始页时，这段会话是否已经「时间到」。
     total  = 70 分钟走完（必须直接出分，不能等你点 Start）
     module1 = 模块一 35 分钟走完（应自动进模块二，并明确告知） */
  function sessionTimeout(s, now) {
    if (!s || !(Number(s.startedAt) > 0) || s.finished) return '';
    if (now >= s.endsAt) return 'total';
    if (s.mode === 'mock' && s.module === 1 && now >= s.moduleEndsAt) return 'module1';
    return '';
  }

  return {
    OFFICIAL, SCALE, QUIZ_TIERS, scaledScore, grade, shuffle, byId, unitName,
    parseNum: function (s) { return window.TDGrade ? window.TDGrade.parseNum(s) : null; },
    parseSession, sessionRange, sessionTimeout, sameTime,
    distributeTypes, buildModule, interleave, routeModule2, buildFullPaper,
    buildPracticePool, practiceDurationSec,
    quizTier, quizPlan, weakTopicsOf, buildQuizPaper, unitWrongIds,
    scoreSession, estimateScore, weaknessReport,
    /* diagnostic / coverage layer */
    isSpecialQuestion, examBank, coverageKey, spreadBySection,
    questionFeatures, diagnosticSequence
  };
});
