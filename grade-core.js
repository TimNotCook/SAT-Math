/* grade-core.js — 判分唯一实现（练习 app-core.js 与模考 exam-core.js 共用）。
 *
 * 历史：这两个 core 曾各持一份手工同步的拷贝（"Keep in sync" 注释形同虚设），
 * 容差分母基准一度分叉（1% 频带基于学生答案而非标准答案）。2026-11 合一到本文件，
 * 由 HTML 在两个 core 之前加载，经 window.TDGrade 暴露。
 *
 * 语义依据（与 test/grading.test.js 回归测试对齐）：
 *   acceptedValues(q).some(a => sameExact(a, x) || sameTol(a, x))
 *   a = acceptedValues(q) 里的值 = 题库标准答案；x = 学生填入并解析后的答案。
 *   => sameTol 第一个参数是标准答案，1% 容差频带必须以它为基准。
 */
(function () {
  'use strict';

  /* Grid-in entry & grading — College Board / Bluebook official rules.
     · rejects % $ , letters or spaces; box capacity 5 chars (6 with minus)
     · improper fractions allowed (3 1/2 must be typed 7/2, "31/2" = 31 halves)
     · a repeating decimal must FILL the box: 2/3 accepts .6666/.6667/
       0.666/0.667 but NOT .66/.67. Exact short decimals (3.5, .0625)
       are fine as-is. If more than one answer works, enter any one. */
  function gridEntry(raw) {
    if (raw == null) return null;
    var s = String(raw).trim();
    if (!/^-?(?:\d+(?:\.\d+)?|\.\d+|\d+\/\d+)$/.test(s)) return null; // no % $ , letters or spaces
    if (s.length > (s.charAt(0) === '-' ? 6 : 5)) return null;          // 5 / 6 char box
    return s;
  }

  function parseNum(s) {
    if (s == null) return null;
    var t = String(s).trim().replace(/[−–]/g, '-');
    var f = /^(-?\d+)\/(\d+)$/.exec(t);
    if (f && +f[2] !== 0) return +f[1] / +f[2];
    if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(t) && isFinite(+t)) return +t;
    return null;
  }

  /* Leniency for the ANSWER KEY only: it may list equivalent forms
     (".0625, 1/16") or alternatives ("2 or 8"); the value field is numeric. */
  function acceptedValues(q) {
    var out = [];
    function add(v) { if (v != null && isFinite(v) && out.indexOf(v) < 0) out.push(v); }
    var pv = parseNum(q.value);
    if (pv != null) add(pv);
    String(q.answer == null ? '' : q.answer).split(/[,;]|\bor\b/i)
      .forEach(function (p) { add(parseNum(String(p).trim())); });
    return out;
  }

  function sameExact(a, b) { return a != null && b != null && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a)); }

  /* SAT student-produced-response rule: an answer is correct if it is exact OR
     within 1% of the correct value (College Board scoring tolerance). The old
     0.01% tolerance wrongly failed answers like 96.53 when the key rounded to
     96.54. Tolerance applies to every grid-in entry (decimal or fraction). */
  function sameTol(a, b) {
    if (a == null || b == null) return false;
    /* a = authoritative key value, b = student's parsed entry (see isCorrect:
       acceptedValues(q).some(a => sameTol(a, x))). The 1% band must be based on
       the KEY, never on what the student typed. When the key is 0 the relative
       band collapses to 0, so only a tiny absolute tolerance remains. The extra
       1e-9 also absorbs IEEE-754 drift at exact 1% boundaries, e.g. 0.5 -> 0.505
       whose raw difference is 0.0050000000000000044. */
    var diff = Math.abs(a - b);
    return diff <= Math.abs(a) * 0.01 + 1e-9;
  }

  /* Multi-box grid-in (official SAT two-blank items). `values` holds one key per
     box; the student's entry travels as "第一空, 第二空" in the single v field.
     Both boxes must be right — College Board awards no partial credit here. */
  function dualCorrect(q, v) {
    var parts = String(v).split(/[,;]/).map(function (p) { return p.trim(); });
    if (parts.length !== q.values.length) return false;
    return q.values.every(function (key, i) {
      var entry = gridEntry(parts[i]);
      if (entry == null) return false;
      var x = parseNum(entry);
      if (x == null) return false;
      var c = acceptedValues({ value: key });
      return c.some(function (a) { return sameExact(a, x) || sameTol(a, x); });
    });
  }

  function isCorrect(q, v) {
    if (v == null || String(v).trim() === '') return false;
    if (q.type === 'mcq') return String(v).trim().toUpperCase() === String(q.answer).trim().toUpperCase();
    if (q.values && q.values.length > 1) return dualCorrect(q, v);
    var entry = gridEntry(v);
    if (entry == null) return false;
    var x = parseNum(entry);
    if (x == null) return false;
    return acceptedValues(q).some(function (a) {
      return sameExact(a, x) || sameTol(a, x);
    });
  }

  window.TDGrade = {
    gridEntry: gridEntry, parseNum: parseNum, acceptedValues: acceptedValues,
    sameExact: sameExact, sameTol: sameTol, isCorrect: isCorrect, dualCorrect: dualCorrect
  };
})();
