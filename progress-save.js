/* TD SAT Math · explicit progress archive (save / restore)
   ------------------------------------------------------------------
   The app already auto-persists answers in `tdsat_app_v1`. This module adds a
   SEPARATE, user-visible archive slot with three properties the live state
   does not have:

   1. VERSION    – every snapshot carries a schema version + producer id.
   2. INSPECTION – a snapshot is validated before it is ever restored.
   3. NO-CLOBBER – a corrupt / foreign / version-mismatched archive is NEVER
                   overwritten by autosave or manual save, so an existing
                   progress record cannot be silently destroyed.

   Restore merges the snapshot back into the live state newest-answer-wins;
   it never replaces the whole state blob. After a successful restore the
   caller navigates to the archived section/question, so all in-memory state
   is rebuilt from disk on the next page load.
*/
(function () {
  'use strict';
  var A = window.TD_APP;
  if (!A) return;
  var esc = A.esc;

  var KEY = 'tdsat_progress_save_v1';
  var LIVE = 'tdsat_app_v1';
  var VERSION = 1;
  var PRODUCER = 'tdsat-bluebook';
  /* 旧存档可能把 correct 写成字符串：'false' 是 truthy，不能算答对。 */
  function isRightFlag(v) { return v === true || v === 1 || v === 'true' || v === '1'; }
  /* 存档摘要只统计真实可恢复的作答：v 是对象/数组时 String() 会得到
     "[object Object]"，旧实现把这种坏记录算成「已答」，恢复后却是空白。 */
  function hasAnswer(a) {
    /* 存档/live 里的 answers[qid] 可能是旧版写下的裸字符串或数字；只读 a.v
       会把它们全算成未作答，摘要显示 0/…，但恢复时又能恢复出来。 */
    if (typeof a === 'string' || (typeof a === 'number' && isFinite(a))) return String(a).trim() !== '';
    if (!a || a.v == null || typeof a.v === 'object' || typeof a.v === 'function') return false;
    return String(a.v).trim() !== '';
  }

  function readRaw() {
    try { var s = localStorage.getItem(KEY); return s == null ? null : s; }
    catch (e) { return null; }
  }
  function readLive() {
    try {
      var d = JSON.parse(localStorage.getItem(LIVE) || '{}');
      return d && typeof d === 'object' && !Array.isArray(d) ? d : {};
    } catch (e) { return {}; }
  }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  /* cursor 可能被云端合并/旧版写成对象/数组/NaN：直接 +1 会得到
     "[object Object]1"/NaN，位置写进存档后 inspect 判 corrupt，手动存档从此
     被永久锁死。统一归一成非负整数。 */
  function cursorNum(v) {
    var n = Number(v);
    return isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }

  function fmtTime(ts) {
    var d = new Date(ts);
    if (isNaN(d.getTime())) return '时间未知';
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  /* ---------- inspect: classify the archive into one of four states ------- */
  function inspect() {
    var raw = readRaw();
    if (raw == null) return { status: 'absent' };
    var d;
    try { d = JSON.parse(raw); }
    catch (e) { return { status: 'corrupt', reason: '存档内容不是有效的 JSON' }; }
    if (!d || typeof d !== 'object' || Array.isArray(d))
      return { status: 'corrupt', reason: '存档结构无效' };
    if (d.producer !== PRODUCER)
      return { status: 'corrupt', reason: '存档来自其他应用' };
    /* version / savedAt / position.n 可能被云端合并或旧版写成数字字符串
       （"1"、"1700…"、"3"）。严格 typeof 会把其实可恢复的存档判 corrupt，
       手动恢复被永久锁死；这里统一转数字并校验，返回值也用归一后的数字。 */
    var version = Number(d.version), savedAt = Number(d.savedAt);
    if (!isFinite(version) || !d.savedAt || !isFinite(savedAt) || savedAt <= 0 ||
        !d.position || typeof d.position !== 'object' ||
        !d.sections || typeof d.sections !== 'object' || Array.isArray(d.sections))
      return { status: 'corrupt', reason: '存档缺少必要字段' };
    if (version !== VERSION)
      return { status: 'version-mismatch', found: version, expected: VERSION, savedAt: savedAt };
    var p = d.position;
    if (!p.sec || !A.CATALOG[p.sec])
      return { status: 'corrupt', reason: '存档指向的板块已不存在' };
    var pn = Number(p.n);
    if (!isFinite(pn) || Math.floor(pn) !== pn || pn < 1 || pn > (A.CATALOG[p.sec].length || 1))
      return { status: 'corrupt', reason: '存档的题目位置超出范围' };

    // summary from the archive itself, not from live state
    var total = 0, answered = 0, correct = 0;
    A.SECS.forEach(function (s) {
      var list = A.CATALOG[s] || [], ans = (d.sections[s] || {}).answers || {};
      total += list.length;
      list.forEach(function (q) {
        var a = ans[q.id];
        if (hasAnswer(a)) {
          answered++; if (isRightFlag(a.correct)) correct++;
        }
      });
    });
    return {
      status: 'ok', version: version, savedAt: savedAt,
      position: { sec: p.sec, n: pn },
      summary: {
        total: total, answered: answered, unanswered: total - answered, correct: correct,
        percent: total ? Math.round(answered / total * 100) : 0
      }
    };
  }

  /* ---------- snapshot: copy live progress into the archive -------------- */
  function snapshot() {
    var live = readLive();
    /* 数组的 typeof 也是 object：sections 是 [] 时会被当成正常容器，
       没有 last 的存档会因为 secs[fallback] 是 undefined 直接 TypeError；
       有 last 时又会把 [] 原样写进存档，JSON 里所有板块全丢。 */
    var secs = live.sections && typeof live.sections === 'object' && !Array.isArray(live.sections) ? live.sections : {};
    Object.keys(secs).forEach(function (sid) {
      var st = secs[sid];
      if (!st || typeof st !== 'object' || Array.isArray(st)) secs[sid] = { answers: {}, marks: {}, cursor: 0 };
      else {
        st.cursor = cursorNum(st.cursor);
        st.submitted = isRightFlag(st.submitted);
        if (!st.answers || typeof st.answers !== 'object' || Array.isArray(st.answers)) st.answers = {};
        if (!st.marks || typeof st.marks !== 'object' || Array.isArray(st.marks)) st.marks = {};
      }
    });
    var last = live.last && A.CATALOG[live.last.sec] ? live.last : null;
    var pos;
    if (last) {
      var n = cursorNum((A.secState(last.sec, false) || {}).cursor);
      var len = (A.CATALOG[last.sec] || []).length || 1;
      pos = { sec: last.sec, n: Math.max(1, Math.min(len, n + 1)) };
    } else {
      /* No `last` yet (never navigated, or only imported answers). Fall back
         to the first section holding an answer, then the first section at all.
         NEVER write position:null — inspect() would mark the new archive as
         corrupt and every subsequent autosave/manual save would be blocked. */
      var fallback = null;
      for (var sid in secs) {
        if (!Object.prototype.hasOwnProperty.call(secs, sid) || !A.CATALOG[sid]) continue;
        var ans = secs[sid].answers || {};
        if (Object.keys(ans).length) { fallback = sid; break; }
        if (!fallback) fallback = sid;
      }
      if (!fallback) fallback = A.SECS && A.SECS.length ? A.SECS[0] : null;
      if (!fallback) return { status: 'no-progress', reason: '题库尚未就绪，无法创建存档' };
      pos = { sec: fallback, n: Math.max(1, Math.min((A.CATALOG[fallback] || []).length || 1, cursorNum((secs[fallback] || {}).cursor) + 1)) };
    }

    var total = 0, answered = 0, correct = 0;
    A.SECS.forEach(function (s) {
      var list = A.CATALOG[s] || [], ans = (secs[s] || {}).answers || {};
      total += list.length;
      list.forEach(function (q) {
        var a = ans[q.id];
        if (hasAnswer(a)) {
          answered++; if (isRightFlag(a.correct)) correct++;
        }
      });
    });
    var d = {
      producer: PRODUCER,
      version: VERSION,
      savedAt: Date.now(),
      position: pos,
      sections: secs,
      summary: { total: total, answered: answered, unanswered: total - answered, correct: correct,
        percent: total ? Math.round(answered / total * 100) : 0 }
    };
    localStorage.setItem(KEY, JSON.stringify(d));
    if (window.TDSync) try { window.TDSync.notify(KEY); } catch (e) { console.warn('同步通知未生效', e); }
    return inspect();
  }

  /* ---------- save guards: never clobber a bad archive ------------------- */
  function canWrite() {
    var st = inspect();
    return st.status === 'absent' || st.status === 'ok';
  }
  function lastError() { return lastErr; }
  var lastErr = '';
  function reasonFor(st) {
    return ({
      'corrupt': '现有存档已损坏，为保护进度未被覆盖；请先处理该存档',
      'version-mismatch': '存档版本不兼容，为保护进度未被覆盖',
      'no-progress': '暂无可保存的进度',
      'write-failed': '浏览器存储写入失败'
    })[st] || '未知原因（' + st + '）';
  }
  var timer = null;
  function autosave() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () {
      timer = null;
      if (!canWrite()) return;           // corrupt / mismatched archive is protected
      try { snapshot(); } catch (e) { console.warn('自动存档失败', e); }
    }, 700);
  }
  function manualSave() {
    if (!canWrite()) {
      return { ok: false, status: inspect().status };
    }
    try {
      var st = snapshot();
      if (st && st.status === 'no-progress') {
        lastErr = st.reason || '暂无可保存的进度';
        return { ok: false, status: 'no-progress', reason: lastErr };
      }
      if (!st || st.status !== 'ok') {
        lastErr = '存档写入后校验未通过：' + ((st && st.status) || '未知');
        return { ok: false, status: st ? st.status : 'write-failed', reason: lastErr };
      }
      lastErr = '';
      return { ok: true, state: st };
    }
    catch (e) {
      lastErr = String(e);
      return { ok: false, status: 'write-failed', reason: lastErr };
    }
  }

  /* ---------- restore: merge newest answers back into live state --------- */
  function restore() {
    var st = inspect();
    if (st.status !== 'ok') return { ok: false, status: st.status };
    var d;
    try { d = JSON.parse(readRaw()); }
    catch (e) { return { ok: false, status: 'corrupt' }; }
    var live = readLive();
    /* typeof [] 也是 object：本机 sections 是数组时，合并结果全挂成数组的自定义属性，
       JSON.stringify 一写就只剩 []，恢复看起来成功、实际整份作答被吞。 */
    if (!live.sections || typeof live.sections !== 'object' || Array.isArray(live.sections)) live.sections = {};

    Object.keys(d.sections).forEach(function (sid) {
      var snap = d.sections[sid] || {};
      if (!A.CATALOG[sid]) return;        // unknown section: ignore, never inject
      var cur = live.sections[sid];
      if (!cur || typeof cur !== 'object' || Array.isArray(cur)) cur = { answers: {}, marks: {}, cursor: 0 };
      /* 本机 answers/marks 也可能是字符串（旧版/云端覆盖）：只判 undefined/数组
         会漏掉字符串，恢复合并时 cur.answers[qid]= 直接 TypeError 或静默丢答案。 */
      if (!cur.answers || typeof cur.answers !== 'object' || Array.isArray(cur.answers)) cur.answers = {};
      if (!cur.marks || typeof cur.marks !== 'object' || Array.isArray(cur.marks)) cur.marks = {};

      var sa = snap.answers && typeof snap.answers === 'object' && !Array.isArray(snap.answers) ? snap.answers : {};
      Object.keys(sa).forEach(function (qid) {
        var incoming = sa[qid], existing = cur.answers[qid];
        /* 存档里的 answers[qid] 可能是 null、裸字符串或数字（云端合并/旧版）：
           本机已有作答时 `incoming.ts` 会对 null 直接 TypeError，整次恢复崩掉；
           裸值也按 app-core 的口径恢复成 {v,ts}，别把原始值写进 live。 */
        if (incoming == null || (typeof incoming === 'object' && Array.isArray(incoming))) return;
        if (typeof incoming !== 'object') {
          if (typeof incoming !== 'string' && !(typeof incoming === 'number' && isFinite(incoming))) return;
          incoming = { v: String(incoming), ts: 0 };
        }
        /* 对象条目的 v 也可能是对象/数组：恢复后不重新加载页面时，输入框会直接
           显示 [object Object]。按 app-core/parseSession 的口径归一成字符串。 */
        if (typeof incoming.v === 'string') { /* ok */ }
        else if (typeof incoming.v === 'number' && isFinite(incoming.v)) incoming.v = String(incoming.v);
        else incoming.v = '';
        incoming.ts = Number.isFinite(Number(incoming.ts)) ? Number(incoming.ts) : 0;
        // newest timestamp wins; equal timestamps are the same record
        if (!existing || (Number(incoming.ts) || 0) >= (Number(existing.ts) || 0))
          cur.answers[qid] = incoming;
      });
      /* 错题台账也要跟着搬：存档里 wrongLog 记着「当初答错的那个答案」，
         恢复只合并 answers 的话，已订正的题会变成「从没错过」——错题本上凭空消失。
         与板块迁移（app-core normalize）同一口径：按 ts 新者优先，只加不删。 */
      var sw = snap.wrongLog && typeof snap.wrongLog === 'object' && !Array.isArray(snap.wrongLog) ? snap.wrongLog : {};
      if (!cur.wrongLog || typeof cur.wrongLog !== 'object' || Array.isArray(cur.wrongLog)) cur.wrongLog = {};
      Object.keys(sw).forEach(function (qid) {
        var wIn = sw[qid], wCur = cur.wrongLog[qid];
        /* wrongLog 条目同样可能是 null/裸值/对象 v：原样写回 live 会让
           错题本把 String({}) 变成「[object Object]」幽灵卡。只收字符串/数字。 */
        var wv = wIn && typeof wIn === 'object' && !Array.isArray(wIn) ? wIn.v : wIn;
        if (typeof wv !== 'string' && !(typeof wv === 'number' && isFinite(wv))) return;
        if (!String(wv).trim()) return;
        wIn = { v: typeof wv === 'number' ? String(wv) : wv,
          ts: Number.isFinite(Number(wIn && wIn.ts)) ? Number(wIn.ts) : 0 };
        if (!wCur || wIn.ts >= (Number(wCur && wCur.ts) || 0)) cur.wrongLog[qid] = wIn;
      });
      var sm = snap.marks && typeof snap.marks === 'object' && !Array.isArray(snap.marks) ? snap.marks : {};
      Object.keys(sm).forEach(function (qid) {
        if (!(qid in cur.marks)) cur.marks[qid] = sm[qid];
      });
      if ((Number(snap.cursor) || 0) > (Number(cur.cursor) || 0)) cur.cursor = Number(snap.cursor) || 0;
      if (isRightFlag(snap.submitted) && !isRightFlag(cur.submitted)) {
        cur.submitted = true;
        if (snap.submittedAt) cur.submittedAt = snap.submittedAt;
      }
      live.sections[sid] = cur;
    });
    live.last = { sec: st.position.sec, qid: null, ts: Date.now() };
    localStorage.setItem(LIVE, JSON.stringify(live));
    if (window.TDSync) try { window.TDSync.notify(LIVE); } catch (e) { console.warn('同步通知未生效', e); }
    return { ok: true, position: st.position };
  }

  function discard() {
    try { localStorage.removeItem(KEY); return true; }
    catch (e) { return false; }
  }

  /* ---------- panel UI --------------------------------------------------- */
  var layer = null, confirmDiscard = false;
  function ensureLayer() {
    if (layer) return layer;
    layer = document.createElement('div');
    layer.className = 'td-save-layer';
    layer.id = 'tdSaveLayer';
    layer.hidden = true;
    layer.innerHTML =
      '<div class="td-save-backdrop" data-save-close></div>' +
      '<section class="td-save-panel" role="dialog" aria-modal="true" aria-labelledby="tdSaveTitle">' +
      '<header class="td-save-head"><h2 id="tdSaveTitle">答题存档</h2>' +
      '<button type="button" class="td-save-close" data-save-close aria-label="关闭存档面板">关闭</button></header>' +
      '<div class="td-save-body" id="tdSaveBody"></div>' +
      '<div class="td-save-actions" id="tdSaveActions"></div></section>';
    document.body.appendChild(layer);
    layer.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-save-close') || e.target.closest('[data-save-close]')) closePanel();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && layer && !layer.hidden) closePanel();
    });
    return layer;
  }
  function closePanel() {
    if (!layer) return;
    layer.hidden = true;
    document.body.classList.remove('td-save-open');
  }
  function btn(id, label, cls) {
    return '<button type="button" class="td-save-btn ' + (cls || '') + '" data-save-act="' + id + '">' + esc(label) + '</button>';
  }
  function renderPanel() {
    var L = ensureLayer();
    var st = inspect();
    var body = L.querySelector('#tdSaveBody');
    var actions = L.querySelector('#tdSaveActions');
    confirmDiscard = false;
    var html = '';

    if (st.status === 'absent') {
      html = '<div class="td-save-state is-absent"><b>暂无存档</b>' +
        '<p>答题时会自动保存进度到这里。你也可以点击下方按钮立即创建一份存档，' +
        '记录当前板块、题号、所有作答与未作答状态。</p></div>';
      actions.innerHTML = btn('save', '立即创建存档', 'is-primary');
    } else if (st.status === 'corrupt') {
      html = '<div class="td-save-state is-error"><b>存档已损坏，无法读取</b>' +
        '<p>原因：' + esc(st.reason || '未知') + '。</p>' +
        '<p>为保护你已有的进度，系统<strong>不会自动清除或覆盖</strong>这份存档。' +
        '你可以继续使用本机的实时进度；确认不需要该存档后，再手动删除它。</p></div>';
      actions.innerHTML = btn('discard', '删除损坏存档', 'is-danger') + btn('close', '暂不处理');
    } else if (st.status === 'version-mismatch') {
      html = '<div class="td-save-state is-error"><b>存档版本不兼容</b>' +
        '<p>存档版本 v' + esc(st.found) + '，当前应用版本 v' + esc(st.expected) +
        '（保存于 ' + esc(fmtTime(st.savedAt)) + '）。</p>' +
        '<p>为避免数据丢失，系统<strong>不会恢复也不会覆盖</strong>这份存档。' +
        '请确认是否需要删除它并重新创建。</p></div>';
      actions.innerHTML = btn('discard', '删除旧版本存档', 'is-danger') + btn('close', '暂不处理');
    } else {
      var s = st.summary;
      var pos = st.position;
      html = '<div class="td-save-state is-ok"><b>存档正常</b>' +
        '<p>最后保存：' + esc(fmtTime(st.savedAt)) + '</p></div>' +
        '<div class="td-save-stats">' +
        '<div><span>中断位置</span><b>' + esc(A.sectionLabel(pos.sec)) + ' · 第 ' + pos.n + ' 题</b></div>' +
        '<div><span>已作答</span><b>' + s.answered + ' / ' + s.total + ' 题</b></div>' +
        '<div><span>未作答</span><b>' + s.unanswered + ' 题</b></div>' +
        '<div><span>完成进度</span><b>' + s.percent + '%</b></div></div>' +
        '<p class="td-save-note">恢复时会把存档中的作答按保存时间合并回当前进度，' +
        '不会覆盖比存档更新的答案；恢复后自动跳到上面的中断位置。</p>';
      actions.innerHTML = btn('save', '保存此刻', 'is-primary') +
        btn('restore', '恢复到此位置') + btn('discard', '删除存档', 'is-danger');
    }
    body.innerHTML = html;
    actions.querySelectorAll('[data-save-act]').forEach(function (b) {
      b.addEventListener('click', function () { handleAction(b.getAttribute('data-save-act')); });
    });
  }
  function handleAction(act) {
    if (act === 'close') { closePanel(); return; }
    if (act === 'save') {
      var r = manualSave();
      renderPanel();
      if (!r.ok) {
        flash('存档失败：' + (r.reason || reasonFor(r.status)), true);
        return;
      }
      flash('存档已更新 · ' + fmtTime(r.state.savedAt));
      return;
    }
    if (act === 'restore') {
      var res = restore();
      if (!res.ok) { renderPanel(); flash('恢复失败：存档状态异常'); return; }
      closePanel();
      var url = A.secUrl(res.position.sec, res.position.n);
      location.href = url;
      return;
    }
    if (act === 'discard') {
      var st = inspect();
      if ((st.status === 'corrupt' || st.status === 'version-mismatch') && !confirmDiscard) {
        confirmDiscard = true;
        var first = document.querySelector('[data-save-act="discard"]');
        if (first) first.textContent = '再次点击以确认删除';
        return;
      }
      if (discard()) { renderPanel(); flash('存档已删除'); }
      else flash('删除失败，请检查浏览器存储权限');
    }
  }
  var flashTimer = null;
  function flash(msg, isError) {
    var L = ensureLayer();
    var el = L.querySelector('.td-save-flash');
    if (!el) { el = document.createElement('p'); el.className = 'td-save-flash'; L.querySelector('.td-save-panel').appendChild(el); }
    el.classList.toggle('is-error', !!isError);
    el.textContent = msg;
    el.hidden = false;
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { el.hidden = true; }, 4000);
  }
  function openPanel() { renderPanel(); var L = ensureLayer(); L.hidden = false; document.body.classList.add('td-save-open'); }

  window.TD_SAVE = {
    inspect: inspect, snapshot: snapshot, autosave: autosave, manualSave: manualSave,
    restore: restore, discard: discard, openPanel: openPanel, closePanel: closePanel,
    VERSION: VERSION, KEY: KEY, fmtTime: fmtTime
  };
})();
