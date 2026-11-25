/* 草稿板 · GoodNotes 风（v4 · 书写引擎升级）
   - 只接受电子笔（Apple Pencil/触控笔），手指/鼠标不画
   - 无白雾、无模糊；书写模式全屏可画（含选项区），「移动」让开画布
   - 丝滑书写：getCoalescedEvents 高频采样 + 一笔画中间点平滑 + rAF 节流
   - 钢笔可调 3 档粗细（细/中/粗），压感笔锋（支持压力的设备自动生效，轻写细、重写粗）
   - 荧光笔 3 档粗细、整笔橡皮、撤销重做、按题保存
   - 关闭时画布不拦截页面事件；WebKit 手掌在屏时 stylus TouchEvent 兜底
   用法：ScratchPad.attach(按钮元素)；页面无需其他改动。 */
(function (global) {
  var PAD = null;
  var STYLE_ID = 'td-scratch-style';

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = [
      '.mist-layer{position:fixed;inset:0;z-index:70;pointer-events:none;opacity:0;transition:opacity .14s ease;',
      '  background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
      '.mist-layer.show{opacity:1}',
      /* 关闭状态下画布/工具条一律不接事件，避免隐形画布拦截页面、吞掉首笔 */
      '.mist-layer:not(.show) .mist-canvas,.mist-layer:not(.show) .mist-toolbar,.mist-layer:not(.show) .mist-hint{pointer-events:none!important}',
      '.mist-canvas{position:fixed;inset:0;pointer-events:auto;touch-action:none;cursor:crosshair}',
      '.mist-canvas.hand{cursor:grab;pointer-events:none}',
      '.mist-toolbar{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:71;pointer-events:auto;',
      '  display:flex;gap:4px;align-items:center;padding:6px;border-radius:14px;background:rgba(255,255,255,.96);',
      '  box-shadow:0 8px 28px rgba(15,23,42,.14),0 1px 3px rgba(15,23,42,.08);border:1px solid #e7eaf1;',
      '  backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}',
      '.mist-toolbar button{width:36px;height:36px;min-width:36px;padding:0;display:inline-flex;align-items:center;justify-content:center;',
      '  border:1px solid transparent;border-radius:10px;background:transparent;color:#5a6475;cursor:pointer;transition:background .12s ease,color .12s ease}',
      '.mist-toolbar button svg{width:19px;height:19px;display:block}',
      '.mist-toolbar button:hover{background:#f2f5fa;color:#12233f}',
      '.mist-toolbar button.on{background:#e9f0ff;color:#1d4ed8}',
      '.mist-toolbar button:disabled{opacity:.3;cursor:default}',
      '.mist-toolbar .mist-sw{width:20px;height:20px;min-width:20px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #d6dbe5}',
      '.mist-toolbar .mist-sw.on{box-shadow:0 0 0 2px #1d4ed8}',
      '.mist-toolbar .mist-size{width:26px;min-width:26px}',
      '.mist-toolbar .mist-size::after{content:"";display:block;background:currentColor;border-radius:50%;width:var(--d,6px);height:var(--d,6px)}',
      '.mist-toolbar .mist-sep{width:1px;height:22px;background:#e7eaf1;margin:0 4px}',
      '.mist-toolbar .mist-text{width:auto;padding:0 12px;font:600 13px/1 -apple-system,system-ui,"PingFang SC",sans-serif}',
      /* 窄屏（≤520）工具条换两行：390 宽下原来单行溢出，Clear/Done 被切掉一半 */
      '@media (max-width:520px){.mist-toolbar{top:auto;bottom:96px;flex-wrap:wrap;width:calc(100vw - 16px);justify-content:center;row-gap:4px;max-height:calc(100vh - 24px);overflow-y:auto}.mist-hint{display:none}}',
      '.mist-toolbar .mist-done{background:#2563eb;color:#fff}',
      '.mist-toolbar .mist-done:hover{background:#1d4ed8;color:#fff}',
      '.mist-hint{position:fixed;top:62px;left:50%;transform:translateX(-50%);z-index:71;pointer-events:none;',
      '  font:12px/1.5 -apple-system,system-ui,"PingFang SC",sans-serif;color:#5b6472;background:rgba(255,255,255,.95);',
      '  border:1px solid #e7eaf1;border-radius:9px;padding:5px 12px;opacity:0;transition:opacity .14s ease}',
      '.mist-hint.show{opacity:1}'
    ].join('');
    document.head.appendChild(st);
  }

  var PENS = ['#1f2328', '#2f5bd7', '#d43d3d'];
  var MARKERS = ['#ffe14d', '#ff9ec4', '#8fe08f'];
  /* 钢笔三档粗细（CSS 像素）；荧光笔三档 */
  var PEN_WIDTHS = [2, 4, 6];
  var MARKER_WIDTHS = [12, 20, 30];
  var SIZE_DOTS = [4, 7, 10];

  function svg(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  }
  var ICONS = {
    pen: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
    marker: svg('<path d="M10 10l7-7 4 4-7 7"/><path d="M9 11l-4.5 4.5V19h3.5L13 14"/><path d="M5 18h13"/>'),
    eraser: svg('<path d="M4 15l7-7 7 7-4 4H8z"/><path d="M9 21h11"/><path d="M11 12l4 4"/>'),
    undo: svg('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-4"/>'),
    redo: svg('<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h4"/>'),
    hand: svg('<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M11 11V4.5a1.5 1.5 0 0 1 3 0V11"/><path d="M14 11V6.5a1.5 1.5 0 0 1 3 0v7.5a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-2.2-3.4a1.5 1.5 0 0 1 2.4-1.8L8 14"/>')
  };

  function currentKey() {
    var n = document.getElementById('qNumber') || document.getElementById('qNum');
    var sec = document.getElementById('footerSection') || document.getElementById('currentSection');
    var stem = document.getElementById('qStem');
    var num = n ? n.textContent.replace(/\s+/g, '').trim() : '';
    if (!num && stem) num = stem.textContent.replace(/\s+/g, ' ').trim().slice(0, 40);
    if (!num) return '';
    return (sec ? sec.textContent.replace(/\s+/g, ' ').trim() : '') + '#' + num;
  }

  function create() {
    var layer, canvas, ctx, toolbar, hint;
    var open = false, hand = false, active = null;
    var tool = 'pen';
    var ink = { pen: PENS[0], marker: MARKERS[0] };
    var MOCK = /[?&]mode=mock/.test(location.search);   // 模考屏一律英文，练习屏维持中文
    var T = function (zh, en) { return MOCK ? en : zh; };
    /* 练习页工具栏按「全英文」口径：只有 drill 页的三个控件词走英文；抽查页与提示文案不动。 */
    var PRACTICE = /\/drill\.html/.test(location.pathname);
    var TOOL = function (zh, en) { return (MOCK || PRACTICE) ? en : zh; };
    var widthIdx = { pen: 1, marker: 1 };      // 默认中档
    var store = {}, key = '', undoStack = [], redoStack = [];
    var self, timer = null;
    var penPointerAt = 0;          // 最近一次电子笔 PointerEvent 时间戳
    var touchSessions = {};        // 兜底：touch.identifier -> 会话
    var lastSmoothed = null;       // 一笔画平滑滤波状态
    var rafQueued = false;         // rAF 节流标记
    var dpr = 1;

    injectStyle();
    layer = document.createElement('div');
    layer.className = 'mist-layer';
    layer.innerHTML =
      '<div class="mist-toolbar">' +
        '<button type="button" data-tool="pen" class="on" title="' + T('钢笔', 'Pen') + '">' + ICONS.pen + '</button>' +
        '<button type="button" data-tool="marker" title="' + T('荧光笔', 'Highlighter') + '">' + ICONS.marker + '</button>' +
        '<button type="button" data-tool="eraser" title="' + T('橡皮（整笔擦除）', 'Eraser') + '">' + ICONS.eraser + '</button>' +
        '<span class="mist-sep"></span>' +
        '<button type="button" class="mist-sw" data-color="0" title="颜色 1"></button>' +
        '<button type="button" class="mist-sw" data-color="1" title="颜色 2"></button>' +
        '<button type="button" class="mist-sw" data-color="2" title="颜色 3"></button>' +
        '<span class="mist-sep"></span>' +
        '<button type="button" class="mist-size" data-size="0" title="细"></button>' +
        '<button type="button" class="mist-size" data-size="1" title="中"></button>' +
        '<button type="button" class="mist-size" data-size="2" title="粗"></button>' +
        '<span class="mist-sep"></span>' +
        '<button type="button" data-undo="1" title="' + T('撤销', 'Undo') + '">' + ICONS.undo + '</button>' +
        '<button type="button" data-redo="1" title="' + T('重做', 'Redo') + '">' + ICONS.redo + '</button>' +
        '<button type="button" data-hand="1" title="' + T('移动：让开画布，可点选项与翻页', 'Move: get the canvas out of the way') + '">' + ICONS.hand + '</button>' +
        '<span class="mist-sep"></span>' +
        '<button type="button" data-clear="1" class="mist-text" title="' + T('清空本题', 'Clear this question') + '">' + TOOL('清空', 'Clear') + '</button>' +
        '<button type="button" data-done="1" class="mist-text mist-done">' + TOOL('完成', 'Done') + '</button>' +
      '</div>' +
      '<div class="mist-hint"></div>' +
      '<canvas class="mist-canvas"></canvas>';
    document.body.appendChild(layer);
    canvas = layer.querySelector('.mist-canvas');
    ctx = canvas.getContext('2d');
    toolbar = layer.querySelector('.mist-toolbar');
    hint = layer.querySelector('.mist-hint');

    function isPen(e) { return e.pointerType === 'pen'; }

    /* ---------- 两条输入路径共用的笔画操作 ---------- */
    function baseWidth(t, sizeIdx) {
      var arr = t === 'marker' ? MARKER_WIDTHS : PEN_WIDTHS;
      return arr[sizeIdx != null ? sizeIdx : 1];
    }
    function penPressure(e) {
      var p = (e && typeof e.pressure === 'number' && e.pressure > 0) ? e.pressure : 0.5;
      return 0.4 + p * 1.2;   // 0.5 -> 1.0；轻写细、重写粗
    }
    function beginStroke(x, y, p) {
      active = { tool: tool, color: tool === 'marker' ? ink.marker : ink.pen,
                 sizeIdx: widthIdx[tool === 'marker' ? 'marker' : 'pen'], pts: [[x, y, p]] };
      lastSmoothed = { x: x, y: y };
    }
    function extendStroke(x, y, p) {
      if (!active) return;
      // 一阶低通滤波：笔迹跟手但抖动被抹掉
      var fx = lastSmoothed ? lastSmoothed.x + (x - lastSmoothed.x) * 0.5 : x;
      var fy = lastSmoothed ? lastSmoothed.y + (y - lastSmoothed.y) * 0.5 : y;
      lastSmoothed = { x: fx, y: fy };   // 必须先更新，否则慢速笔画会被"饿死"
      var last = active.pts[active.pts.length - 1];
      var dx = (fx - last[0]) * window.innerWidth, dy = (fy - last[1]) * window.innerHeight;
      if (dx * dx + dy * dy < 1.6) return;   // <1.3px 的抖动点丢掉
      active.pts.push([fx, fy, p]);
      scheduleRender();
    }
    function finishStroke() {
      if (active) {
        strokes().push(active);
        undoStack.push({ type: 'add', stroke: active });
        redoStack.length = 0;
        active = null;
        lastSmoothed = null;
      }
      syncUI();
      scheduleRender();
      persist();
    }
    function scheduleRender() {
      if (rafQueued) return;
      rafQueued = true;
      requestAnimationFrame(function () {
        rafQueued = false;
        render();
      });
    }

    /* ---------- 主路径：Pointer Events（电子笔） ---------- */
    canvas.addEventListener('pointerdown', function (e) {
      if (!open || hand || !isPen(e)) return;
      e.preventDefault();
      penPointerAt = Date.now();
      try { if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId); } catch (ex) { console.warn('指针捕获未生效', ex); }
      if (tool === 'eraser') { eraseAt(e.clientX, e.clientY); return; }
      beginStroke((e.clientX) / window.innerWidth, (e.clientY) / window.innerHeight, penPressure(e));
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!open || hand || !isPen(e)) return;
      e.preventDefault();
      penPointerAt = Date.now();
      if (tool === 'eraser') { eraseAt(e.clientX, e.clientY); return; }
      if (!active) return;
      var evs = (e.getCoalescedEvents && e.getCoalescedEvents().length) ? e.getCoalescedEvents() : [e];
      for (var i = 0; i < evs.length; i++) {
        var ev = evs[i];
        extendStroke(ev.clientX / window.innerWidth, ev.clientY / window.innerHeight, penPressure(ev));
      }
    });
    canvas.addEventListener('pointerup', function (e) {
      if (!open || hand || !isPen(e)) return;
      e.preventDefault();
      penPointerAt = Date.now();
      finishStroke();
    });
    canvas.addEventListener('pointercancel', function () { active = null; lastSmoothed = null; });

    /* ---------- 兜底路径：WebKit 手掌在屏时电子笔 PointerEvent 被吞
       （WebKit bug 269535），改用 stylus TouchEvent 补画；
       PointerEvent 正常时通过 penPointerAt 去重，绝不重复画 ---------- */
    function stylusTouches(list) {
      var out = [];
      for (var i = 0; i < list.length; i++) {
        if (list[i].touchType === 'stylus') out.push(list[i]);
      }
      return out;
    }
    function touchPressure(t) {
      var p = (t && typeof t.force === 'number' && t.force > 0) ? t.force : 0.5;
      return 0.4 + p * 1.2;
    }
    canvas.addEventListener('touchstart', function (e) {
      if (!open || hand) return;
      var sts = stylusTouches(e.changedTouches);
      if (!sts.length) return;
      e.preventDefault();
      for (var i = 0; i < sts.length; i++) {
        touchSessions[sts[i].identifier] = { fallback: false, started: Date.now() };
      }
    }, { passive: false });
    canvas.addEventListener('touchmove', function (e) {
      if (!open || hand) return;
      var sts = stylusTouches(e.changedTouches);
      if (!sts.length) return;
      e.preventDefault();
      for (var i = 0; i < sts.length; i++) {
        var t = sts[i], s = touchSessions[t.identifier];
        if (!s) { s = { fallback: false, started: Date.now() }; touchSessions[t.identifier] = s; }
        if (Date.now() - penPointerAt < 500) continue;   // PointerEvent 正常，交给主路径
        s.fallback = true;
        if (tool === 'eraser') { eraseAt(t.clientX, t.clientY); continue; }
        if (!active) beginStroke(t.clientX / window.innerWidth, t.clientY / window.innerHeight, touchPressure(t));
        else extendStroke(t.clientX / window.innerWidth, t.clientY / window.innerHeight, touchPressure(t));
      }
    }, { passive: false });
    function handleTouchEnd(e) {
      if (!open || hand) return;
      var sts = stylusTouches(e.changedTouches);
      if (!sts.length) return;
      e.preventDefault();
      for (var i = 0; i < sts.length; i++) {
        var t = sts[i], s = touchSessions[t.identifier];
        var pointerWorking = Date.now() - penPointerAt < 500;
        if (s) delete touchSessions[t.identifier];
        if (pointerWorking) continue;
        if (s && !s.fallback) {
          // 轻点（无 move）且 PointerEvent 被吞：补一个单点笔画
          if (tool !== 'eraser') {
            beginStroke(t.clientX / window.innerWidth, t.clientY / window.innerHeight, touchPressure(t));
          }
        }
        if (active) finishStroke();
      }
    }
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', function (e) {
      handleTouchEnd(e);
      active = null; lastSmoothed = null;
    }, { passive: false });

    toolbar.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.done) { close(); return; }
      if (b.dataset.clear) { clear(); return; }
      if (b.dataset.undo) { undo(); return; }
      if (b.dataset.redo) { redo(); return; }
      if (b.dataset.hand) { setHand(!hand); return; }
      if (b.dataset.size != null) {
        if (tool === 'eraser') setTool('pen');
        widthIdx[tool === 'marker' ? 'marker' : 'pen'] = +b.dataset.size;
        syncUI();
        return;
      }
      if (b.dataset.color != null) {
        if (tool === 'marker') ink.marker = MARKERS[+b.dataset.color];
        else ink.pen = PENS[+b.dataset.color];
        if (tool === 'eraser') setTool('pen');
        syncUI();
        return;
      }
      if (b.dataset.tool) { setTool(b.dataset.tool); return; }
    });

    window.addEventListener('resize', function () { sizeCanvas(); scheduleRender(); });
    document.addEventListener('keydown', function (e) {
      if (!open) return;
      if (e.key === 'Escape') { close(); return; }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
    });

    function strokes() {
      if (!key) return [];
      if (!store[key]) store[key] = [];
      return store[key];
    }

    /* ---------- 持久化：按题落盘 localStorage，刷新/切后台不丢草稿 ----------
       store 仍是内存主存（渲染直接读它），这里只做「落盘」与「载入」。
       key 前缀 tdsat_scratch_<页面>_<题key>，与进度/主题的 tdsat_ 前缀同族，
       且带页面标识，避免 drill 与 exam 同名题号互相覆盖。 */
    var LS_OK = (function () {
      try { var t = '__td_scratch_probe__'; localStorage.setItem(t, '1'); localStorage.removeItem(t); return true; }
      catch (e) { return false; }   // 隐私模式 / 禁用 localStorage：降级为纯内存，不报错
    })();
    function pageTag() {
      var m = location.pathname.match(/([^/]+)\.html/);
      return m ? m[1] : 'page';
    }
    function lsKeyFor(k) {
      return 'tdsat_scratch_' + pageTag() + '_' + (k || key);
    }
    function persist(k) {
      if (!LS_OK) return;
      var kk = k || key;
      if (!kk) return;
      var list = store[kk] || [];
      try {
        if (list.length) localStorage.setItem(lsKeyFor(kk), JSON.stringify(list));
        else localStorage.removeItem(lsKeyFor(kk));
      } catch (e) {
        // 不静默吞：配额满/写失败时给可见提示（草稿板开着）或至少留日志
        console.warn('[scratch-pad] 草稿保存失败:', e);
        if (open) showHint('草稿未能保存：本地存储空间不足');
      }
    }
    function loadInto(k) {
      if (!LS_OK) return;
      var kk = k || key;
      if (!kk) return;
      try {
        var raw = localStorage.getItem(lsKeyFor(kk));
        if (raw) { var arr = JSON.parse(raw); if (Array.isArray(arr)) store[kk] = arr; }
      } catch (e) { /* 数据损坏：忽略，按无历史草稿重新开始，不清空用户内存里的新笔画 */ }
    }

    function setTool(t) {
      tool = t;
      if (t === 'eraser') setHand(false);
      syncUI();
    }
    function setHand(v) {
      hand = v;
      canvas.classList.toggle('hand', v);
      showHint(v ? '移动模式：画布已让开，可直接点选项、翻页、开题号导航；点手型图标回到书写' : '');
      syncUI();
    }
    function showHint(text) {
      if (!text) { hint.classList.remove('show'); return; }
      hint.textContent = text;
      hint.classList.add('show');
    }
    function syncUI() {
      if (!toolbar) return;
      Array.prototype.forEach.call(toolbar.querySelectorAll('[data-tool]'), function (x) {
        x.classList.toggle('on', !hand && x.dataset.tool === tool);
      });
      Array.prototype.forEach.call(toolbar.querySelectorAll('[data-hand]'), function (x) {
        x.classList.toggle('on', hand);
      });
      var palette = tool === 'marker' ? MARKERS : PENS;
      Array.prototype.forEach.call(toolbar.querySelectorAll('[data-color]'), function (x) {
        var i = +x.dataset.color;
        x.style.background = palette[i];
        x.classList.toggle('on', !hand && i === palette.indexOf(tool === 'marker' ? ink.marker : ink.pen));
      });
      Array.prototype.forEach.call(toolbar.querySelectorAll('[data-size]'), function (x) {
        var i = +x.dataset.size;
        x.style.setProperty('--d', SIZE_DOTS[i] + 'px');
        x.classList.toggle('on', !hand && tool !== 'eraser' && i === widthIdx[tool === 'marker' ? 'marker' : 'pen']);
      });
      Array.prototype.forEach.call(toolbar.querySelectorAll('[data-undo]'), function (x) { x.disabled = !undoStack.length; });
      Array.prototype.forEach.call(toolbar.querySelectorAll('[data-redo]'), function (x) { x.disabled = !redoStack.length; });
    }

    /* ---------- 渲染：一笔画（midpoint 平滑）+ 压感笔锋 ---------- */
    var canvasRect = { left: 0, top: 0, width: 1, height: 1 };   // 缓存画布位置，避免渲染时反复强制布局
    function widthCss(st, pt) {
      var w = baseWidth(st.tool, st.sizeIdx != null ? st.sizeIdx : 1);
      if (st.tool === 'marker') return w;
      return w * (pt && pt[2] ? pt[2] : 1);
    }
    function strokeOutline(st) {
      var pts = st.pts;
      var sx = canvas.width / canvasRect.width, sy = canvas.height / canvasRect.height;
      if (!sx || !sy) return;
      var left = [], right = [];
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i], hw = widthCss(st, p) * sx / 2;
        var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
        var dx = (b[0] - a[0]) * canvas.width, dy = (b[1] - a[1]) * canvas.height;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        var nx = -dy / len * hw, ny = dx / len * hw;
        left.push([p[0] * canvas.width + nx, p[1] * canvas.height + ny]);
        right.push([p[0] * canvas.width - nx, p[1] * canvas.height - ny]);
      }
      ctx.beginPath();
      ctx.moveTo(left[0][0], left[0][1]);
      for (var j = 1; j < left.length; j++) ctx.lineTo(left[j][0], left[j][1]);
      for (var k = right.length - 1; k >= 0; k--) ctx.lineTo(right[k][0], right[k][1]);
      ctx.closePath();
      ctx.fillStyle = st.color;
      ctx.globalAlpha = st.tool === 'marker' ? 0.28 : 1;
      ctx.fill();
      // 端头圆点，保证轻点也出墨、端点圆润
      ctx.beginPath();
      var r = widthCss(st, pts[0]) * sx / 2;
      ctx.arc(pts[0][0] * canvas.width, pts[0][1] * canvas.height, Math.max(r, 0.6), 0, Math.PI * 2);
      ctx.fill();
      var pe = pts[pts.length - 1];
      ctx.beginPath();
      ctx.arc(pe[0] * canvas.width, pe[1] * canvas.height, Math.max(widthCss(st, pe) * sx / 2, 0.6), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    function strokeSmoothPath(st) {
      var pts = st.pts;
      var sx = canvas.width / canvasRect.width, sy = canvas.height / canvasRect.height;
      if (!sx || !sy) return;
      ctx.beginPath();
      ctx.strokeStyle = st.color;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = baseWidth(st.tool, st.sizeIdx != null ? st.sizeIdx : 1) * sx;
      if (pts.length === 1) {
        ctx.fillStyle = st.color;
        ctx.globalAlpha = st.tool === 'marker' ? 0.28 : 1;
        ctx.arc(pts[0][0] * canvas.width, pts[0][1] * canvas.height, baseWidth(st.tool, st.sizeIdx != null ? st.sizeIdx : 1) * sx / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        return;
      }
      ctx.globalAlpha = st.tool === 'marker' ? 0.28 : 1;
      ctx.moveTo(pts[0][0] * canvas.width, pts[0][1] * canvas.height);
      for (var i = 1; i < pts.length - 1; i++) {
        var mx = (pts[i][0] + pts[i + 1][0]) / 2 * canvas.width, my = (pts[i][1] + pts[i + 1][1]) / 2 * canvas.height;
        ctx.quadraticCurveTo(pts[i][0] * canvas.width, pts[i][1] * canvas.height, mx, my);
      }
      var last = pts[pts.length - 1];
      ctx.lineTo(last[0] * canvas.width, last[1] * canvas.height);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    function paint(st) {
      ctx.globalCompositeOperation = 'source-over';
      if (st.tool === 'marker') strokeSmoothPath(st);   // 荧光笔用平滑笔画，保持透明高亮
      else strokeOutline(st);                            // 钢笔用可变宽度轮廓，带笔锋
    }
    function render() {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var list = strokes();
      for (var i = 0; i < list.length; i++) paint(list[i]);
      if (active) paint(active);
    }
    function sizeCanvas() {
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      var r = canvas.getBoundingClientRect();
      canvasRect = { left: r.left, top: r.top, width: r.width || window.innerWidth, height: r.height || window.innerHeight };
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    function eraseAt(clientX, clientY) {
      var px = clientX / window.innerWidth, py = clientY / window.innerHeight;
      var list = strokes(), removed = [];
      for (var i = list.length - 1; i >= 0; i--) {
        var st = list[i];
        var tol = Math.max(0.012, baseWidth(st.tool, st.sizeIdx != null ? st.sizeIdx : 1) / Math.min(window.innerWidth, window.innerHeight) * 0.8);
        for (var j = 0; j < st.pts.length; j++) {
          var dx = st.pts[j][0] - px, dy = st.pts[j][1] - py;
          if (Math.sqrt(dx * dx + dy * dy) < tol) { removed.push({ stroke: st, index: i }); list.splice(i, 1); break; }
        }
      }
      if (removed.length) {
        undoStack.push({ type: 'erase', items: removed });
        redoStack.length = 0;
        scheduleRender(); syncUI();
      }
    }
    function undo() {
      var op = undoStack.pop();
      if (!op) return;
      if (op.type === 'add') {
        var i = strokes().indexOf(op.stroke);
        if (i >= 0) strokes().splice(i, 1);
      } else {
        op.items.slice().reverse().forEach(function (it) { strokes().splice(it.index, 0, it.stroke); });
      }
      redoStack.push(op);
      scheduleRender(); syncUI();
      persist();
    }
    function redo() {
      var op = redoStack.pop();
      if (!op) return;
      if (op.type === 'add') {
        strokes().push(op.stroke);
      } else {
        op.items.forEach(function (it) {
          var i = strokes().indexOf(it.stroke);
          if (i >= 0) strokes().splice(i, 1);
        });
      }
      undoStack.push(op);
      scheduleRender(); syncUI();
      persist();
    }
    function clear() {
      if (!key) return;
      store[key] = [];
      undoStack.length = 0; redoStack.length = 0;
      scheduleRender(); syncUI();
      persist();
    }
    function watchQuestion() {
      if (timer) return;
      timer = setInterval(function () {
        if (!open) return;
        var k = currentKey();
        if (!k || k === key) return;
        persist();                       // 切题前先落盘旧题草稿
        key = k;
        loadInto();                      // 载入新题已存的历史草稿（若有）
        undoStack.length = 0; redoStack.length = 0;
        scheduleRender(); syncUI();
      }, 300);
    }
    function openPad() {
      key = currentKey();
      loadInto();                       // 载入该题已保存的草稿（刷新/换设备后恢复）
      sizeCanvas(); render(); syncUI();
      layer.classList.add('show');
      document.body.classList.add('scratch-on');
      open = true;
      watchQuestion();
      showHint('电子笔直接写；圆点调粗细；手型图标让开画布，可点选项和翻页');
      setTimeout(function () { if (open && !hand) showHint(''); }, 4000);
      if (self.onChange) self.onChange(true);
    }
    function close() {
      layer.classList.remove('show');
      document.body.classList.remove('scratch-on');
      open = false;
      setHand(false);
      active = null;
      lastSmoothed = null;
      touchSessions = {};
      showHint('');
      persist();                        // 关闭时兜底落盘，保证最后一笔不丢
      if (self.onChange) self.onChange(false);
    }

    self = {
      toggle: function () { open ? close() : openPad(); },
      open: openPad,
      close: close,
      clear: clear,
      isOpen: function () { return open; },
      debug: function () {
        return { key: key, keys: Object.keys(store), n: strokes().length, open: open,
                 lastStroke: strokes().length ? strokes()[strokes().length - 1] : null };
      },
      onChange: null
    };
    return self;
  }

  var ScratchPad = {
    _dbg: function () { return PAD && PAD.debug ? PAD.debug() : null; },
    attach: function (button) {
      if (!button) return null;
      if (!PAD) PAD = create();
      if (button.dataset.scratchBound === '1') return PAD;
      /* 页面自带的旧草稿板会给同一颗按钮绑监听：克隆一份替换，只保留本模块的监听 */
      if (button.dataset.scratchLegacy !== 'off' && button.parentNode) {
        var fresh = button.cloneNode(true);
        fresh.dataset.scratchLegacy = 'off';
        button.parentNode.replaceChild(fresh, button);
        button = fresh;
      }
      button.dataset.scratchBound = '1';
      button.addEventListener('click', function () { PAD.toggle(); });
      button.setAttribute('aria-pressed', 'false');
      PAD.onChange = function (isOpen) { button.setAttribute('aria-pressed', isOpen ? 'true' : 'false'); };
      return PAD;
    },
    get instance() { return PAD; },
    close: function () { if (PAD) PAD.close(); },
    isOpen: function () { return !!(PAD && PAD.isOpen()); }
  };
  global.ScratchPad = ScratchPad;

  /* 页面里已有「草稿」按钮时自动接管（会克隆按钮，丢掉页面旧草稿板的监听） */
  function autoAttach() {
    /* 模考层（？mode=mock）不开草稿：直接不渲染，避免「禁用但留在 DOM」的半死按钮 */
    if (/[?&]mode=mock/.test(location.search)) return;
    var b = document.getElementById('btnScratch');
    if (b && !ScratchPad.instance) ScratchPad.attach(b);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(autoAttach, 0); });
  } else {
    setTimeout(autoAttach, 0);
  }
})(window);
