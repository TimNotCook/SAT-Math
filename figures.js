/* TD SAT Math · Geometry figures + line-graph answers
   Loaded AFTER app-ui.js and BEFORE drill.js / exam.js.
   Exposes window.TD_FIG = { showFigure, lineAnswer, hasLine }.

   showFigure(q): renders an official-style geometry figure for a question.
     Figures are drawn as HIGH-DEFINITION VECTOR SVG (not raster scans) from a
     per-question spec in window.TD_FIG_SPECS (see data/figures.js). When no
     spec exists for a question we fall back to the cleanly-framed source image
     so nothing disappears, but the goal is vector for every geometry figure.

   lineAnswer(q): an SVG coordinate grid for the correct line equation, or null
     when the question's correct choice is not a genuine line. Uses a strict
     linear validator so parabola/quadratic answer choices are rejected.
*/
(function () {
  'use strict';

  /* ---- palette (Bluebook-ish navy / clean) ---- */
  var INK = '#162c46', ACCENT = '#c2410c', GRID = '#e6ebf1',
      FAINT = '#5b6b7f', DOT = '#0f2a47';
  var FONT = "'Inter', 'Roboto', 'Helvetica Neue', Arial, sans-serif";

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* Render choice/stem text with real math typography.
     The text layer stores superscripts as ^{...} (e.g. "y = 20(x)^{4}");
     fractions as a/b; and roots as √(...) or √x. This turns them into genuine
     stacked fractions, a radical with a vinculum (bar over the radicand), and
     <sup>. Everything else is escaped first, so the result is safe to inject
     as HTML. Used by exam.js / drill.js / wrong.html.

     Processing uses placeholder tokens so nested constructs (e.g. a fraction
     inside a radical) render correctly without the passes clobbering each
     other. Order: superscripts -> innermost radicals -> fractions -> leftovers. */
  function fmtMath(raw) {
    /* Protect decimals (0.11, 1.06) and thousands-grouped integers (90,000)
       before any fraction rule runs: otherwise \d+/\d+ would turn 2/0.11 into
       a fake stacked 2/0 and split 90,000/12 into 000/12. The private-use
       placeholders survive every rule below and are restored at the very end,
       so this is safe/idempotent for fractions, sub/superscripts and roots.
       (Formerly applied twice at runtime by drill.html + cloud-config.js;
       now folded into the canonical implementation.) */
    var numStash = [];
    var guarded = String(raw == null ? '' : raw).replace(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.\d+/g, function (d) {
      numStash.push(d);
      return '\uE000' + (numStash.length - 1) + '\uE000';
    });
    var s = esc(guarded);
    var store = [], sid = 0;
    function keep(html) { var k = '\u0001' + (sid++) + '\u0001'; store.push(html); return k; }
    function restore() {
      var guard = 0;
      while (s.indexOf('\u0001') >= 0 && guard++ < 12) {
        s = s.replace(/\u0001(\d+)\u0001/g, function (_, i) { return store[+i] || ''; });
      }
      return s;
    }

    // 0) \overline{AB}：SAT 题干用上划线表示线段（如「\overline{FG} is a diameter」）。
    //    题库里已有 4 处；不转换就会把反斜杠命令原样印给考生。
    s = s.replace(/\\overline\{([^{}]*)\}/g, function (m, body) {
      return keep('<span class="td-overline">' + body + '</span>');
    });

    // 1) superscripts ^{...}
    s = s.replace(/\^\{([^{}]*)\}/g, function (m, body) { return keep('<sup>' + body + '</sup>'); });
    // 1c) 裸指数：题库里有 18 道题把上标写成 x^2 / 2^x / ^(t-12)（原书印的是上标），
    //     不转换就把 "^2" 原样印给考生。只认紧跟的 "(...)"、一串数字、单个字母，
    //     或一个被数字守卫换掉的十进制数，其它 ^ 一律不动。
    s = s.replace(/\^\(([^()]*)\)/g, function (m, body) { return keep('<sup>' + body + '</sup>'); });
    s = s.replace(/\^([0-9]{1,3}|[A-Za-z])/g, function (m, body) { return keep('<sup>' + body + '</sup>'); });
    s = s.replace(/\^(\uE000\d+\uE000)/g, function (m, body) { return keep('<sup>' + body + '</sup>'); });

    // 1b) subscripts: _{...} (multi-char) and _X (single char after a letter),
    // e.g. x_{1}, v_f, P_0. Kept as tokens so later fraction rules still match.
    s = s.replace(/_\{([^{}]*)\}/g, function (m, body) { return keep('<sub>' + body + '</sub>'); });
    s = s.replace(/([A-Za-z])_([A-Za-z0-9])(?![A-Za-z0-9])/g, function (m, base, sub) {
      return base + keep('<sub>' + sub + '</sub>');
    });

    // 2) radicals. Match √(...) with a BALANCED parenthesised radicand
    //    (e.g. √((x-2)^{2}) or √((5n-4z)/(20x²z²))), or a bare token √157 / √k.
    function radHTML(body) {
      return keep('<span class="td-sqrt"><span class="td-radical">√</span><span class="td-radicand">' + body + '</span></span>');
    }
    function wrapRadicals(text) {
      var out = '', i = 0;
      while (i < text.length) {
        if (text.charAt(i) !== '√' || text.charAt(i + 1) !== '(') { out += text.charAt(i++); continue; }
        var depth = 0, j = i + 1, end = -1;
        for (; j < text.length; j++) {
          if (text.charAt(j) === '(') depth++;
          else if (text.charAt(j) === ')') { depth--; if (depth === 0) { end = j; break; } }
        }
        if (end < 0) { out += text.charAt(i++); continue; }
        var body = text.slice(i + 2, end);
        /* 根号里套分数（⁴√(1/b³)、√((5x-4z)/(20x²z²))）：原页印的是「根号横线 + 上下叠分式」，
           直接在根号里留斜杠会把 1/b³ 印成一行 1/b³，与书不一致。这里先切成上下叠分式。 */
        var sl = topLevelSlash(body);
        if (sl > 0) {
          body = '<span class="td-frac"><span class="td-num">' + stripOuterParens(body.slice(0, sl)) +
            '</span><span class="td-den">' + stripOuterParens(body.slice(sl + 1)) + '</span></span>';
        }
        out += body.trim() ? radHTML(body) : text.slice(i, end + 1);
        i = end + 1;
      }
      return out;
    }
    function topLevelSlash(text) {
      var depth = 0;
      for (var k = 0; k < text.length; k++) {
        var c = text.charAt(k);
        if (c === '(') depth++;
        else if (c === ')') depth--;
        else if (c === '/' && depth === 0) return k;
      }
      return -1;
    }
    function stripOuterParens(t) {
      t = t.trim();
      if (t.charAt(0) !== '(' || t.charAt(t.length - 1) !== ')') return t;
      var depth = 0;
      for (var k = 0; k < t.length; k++) {
        var c = t.charAt(k);
        if (c === '(') depth++;
        else if (c === ')') { depth--; if (depth === 0 && k < t.length - 1) return t; }
      }
      return t.slice(1, -1);
    }
    s = wrapRadicals(s);
    // index roots like ³√(...) / ⁵√(...): the index digit sits before √
    s = s.replace(/(\d)\u0001(\d+)\u0001/g, function (m, idx, tok) {
      return idx + '\u0001' + tok + '\u0001';
    });
    // bare radical: √ followed by digits / a single letter / a placeholder,
    // but NOT one we already wrapped (those start with a token).
    s = s.replace(/√(\d+|[A-Za-z]|\u0001\d+\u0001)(?![\dA-Za-z])/g, function (m, body) {
      return keep('<span class="td-sqrt"><span class="td-radical">√</span><span class="td-radicand">' + body + '</span></span>');
    });

    // 3) stacked fractions. Numerator may be a plain number, or a radical
    //    token optionally preceded by a coefficient (√2/2, 4√17/51, √157/3).
    function frac(num, den) {
      return keep('<span class="td-frac"><span class="td-num">' + num + '</span><span class="td-den">' + den + '</span></span>');
    }
    // root term / denominator : [coefficient]\u0001n\u0001 / digits.
    // The coefficient must be a COMPLETE number (13√17/51 used to leave a
    // bare "1" and stack only 3√17/51); a single letter is allowed for e.g. a√2/3.
    s = s.replace(/(\d*|[A-Za-z])(\u0001\d+\u0001)\s*\/\s*(\d+)/g, function (m, coef, tok, den) {
      return frac(coef + tok, den);
    });
    // plain numeric fraction. BOTH sides must be complete multi-digit numbers:
    // a single-digit regex used to split 19/2 into a bare "1" plus a stacked
    // 9/2 (looks like a mixed number), and 1/10 into 1/1 followed by "0".
    // A real mixed number keeps its explicit space ("1 9/2"), so the digit run
    // stops there and the integer part is left alone.
    s = s.replace(/(\d+)\s*\/\s*(\d+)/g, function (m, a, b) { return frac(a, b); });
    // 4) parenthesised fractions like (5n-4z)/(20x²z²) or (-11 + √k)/2
    s = s.replace(/\(([^()]*)\)\s*\/\s*([A-Za-z0-9\u0001]+)/g, function (m, a, b) {
      return frac(a, b);
    });

    // 4b) fractions with parenthesised numerator or denominator, incl. nesting:
    //     (x^{2}-2x-5)/(x-3), 36/(x-2), 1/((x+1)(4x-5)),
    //     (20π-20)/((π-x²)(x+1)).
    function matchClose(str, openIdx) {
      var dep = 0;
      for (var k = openIdx; k < str.length; k++) {
        if (str.charAt(k) === '(') dep++;
        else if (str.charAt(k) === ')') { dep--; if (dep === 0) return k; }
      }
      return -1;
    }
    function matchOpenParen(str, closeIdx) {
      var dep = 0;
      for (var k = closeIdx; k >= 0; k--) {
        if (str.charAt(k) === ')') dep++;
        else if (str.charAt(k) === '(') { dep--; if (dep === 0) return k; }
      }
      return -1;
    }
    (function parenFractions() {
      var guard = 0;
      while (guard++ < 30) {
        var m = /\)\s*\/|(\d+|[A-Za-z])\s*\/\s*\(/.exec(s);
        if (!m) break;
        var num, den, start, end;
        if (m[0].charAt(0) === ')') {
          // numerator = balanced (...) ending at m.index
          var no = matchOpenParen(s, m.index);
          if (no < 0) break;
          var slash = s.indexOf('/', m.index);
          var ds = s.indexOf('(', slash);
          if (ds < 0) break;
          var de = matchClose(s, ds);
          if (de < 0) break;
          num = s.slice(no + 1, m.index);
          den = s.slice(ds + 1, de);
          start = no; end = de + 1;
        } else {
          // numerator = simple token before slash, denominator = balanced (...)
          var slash2 = s.indexOf('/', m.index);
          var ds2 = s.indexOf('(', slash2);
          var de2 = matchClose(s, ds2);
          if (de2 < 0) break;
          num = m[1];
          den = s.slice(ds2 + 1, de2);
          start = m.index; end = de2 + 1;
        }
        s = s.slice(0, start) + frac(num, den) + s.slice(end);
      }
    })();
    // 4c) variable/number, number/variable, variable/variable simple fractions:
    //     j/4, -x/5, 5r/7, b/k, 48/x, a/b, V/R. Prose slashes (and/or) never
    //     match because both sides must be a bare variable or number token.
    s = s.replace(/(^|[\s(=(])(-?\d*[A-Za-z][A-Za-z0-9\u0001]*|-?\d+)\s*\/\s*([A-Za-z]|\d+)(?=$|[\s,.).+;+\-\]])/g,
      function (m, pre, num, den) { return pre + frac(num, den); });


    var out = restore();
    // restore() may have embedded \uE000 tokens inside stacked-fraction HTML;
    // unwrap them last so the protected numbers come back verbatim.
    return out.replace(/\uE000(\d+)\uE000/g, function (_, i) { return numStash[+i] || ''; });
  }

  /* EXACT whitelist. The user's rule: only geometry-figure / table / chart
     questions may show the source image; every other question shows NO image
     at all. Broad keywords like "graph", "xy-plane", "coordinate" are NOT
     enough — 57 pure algebra questions say "in the xy-plane" and must not get
     a watermarked full-page scan. */
  var CHART_STEM = /(?:scatterplot|scatter plot|histogram|dot plot|box[- ]plot|bar graph|bar chart|the table (?:below|above|shows|gives)|the following table|the table shows|the table gives|frequency distribution|the graph (?:below|above|shows)|the graph of .{0,60} is shown)/i;
  var GEOM_STEM = /(?:figure|diagram|not drawn to scale|in the (?:triangle|circle|figure|diagram) shown|the (?:triangle|circle|figure|diagram) (?:shown|below|above))/i;
  function needsFigure(q) {
    var t = (window.TD_TEXT || {})[q.id] || {};
    if (t.figure && t.figure.length) return true;   // answer choices ARE figures
    /* A registered standalone crop is an explicit, unambiguous declaration
       that this question has a diagram (used by the imported Topic drills,
       whose stems say "line k is shown" rather than "the graph below shows"). */
    var crops = window.TD_FIG_CROPS || {};
    if (crops[q && q.id]) return true;
    var stem = String(t.stem || q.stem || '');
    return CHART_STEM.test(stem) || GEOM_STEM.test(stem);
  }
  // point on a circle, screen degrees (0=east, 90=south, 180=west, 270=north)
  function pt(cx, cy, r, deg) {
    var a = deg * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }
  // arc path from angle a0 to a1 clockwise (screen degrees, y-down)
  function arc(cx, cy, r, a0, a1) {
    var p0 = pt(cx, cy, r, a0), p1 = pt(cx, cy, r, a1);
    var sweep = ((a1 - a0) % 360 + 360) % 360;
    var large = sweep > 180 ? 1 : 0;
    return 'M ' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) +
           ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' +
           p1[0].toFixed(1) + ' ' + p1[1].toFixed(1);
  }
  function txt(x, y, s, opts) {
    opts = opts || {};
    var a = 'text-anchor="' + (opts.anchor || 'middle') + '"';
    var sz = opts.size || 13;
    var fill = opts.fill || INK;
    var dy = opts.dy != null ? opts.dy : 4;
    // data-angle-key pairs an angle label with the arc that belongs to it,
    // so verify_figures.mjs can assert the drawn span matches the value.
    var dk = opts.dataKey ? ' data-angle-key="' + opts.dataKey + '"' : '';
    // white halo keeps a tick label readable when a boundary line runs under it
    var halo = opts.halo ? ' stroke="#ffffff" stroke-width="2" paint-order="stroke fill"' : '';
    // rot: rotated tick labels (the book prints 13 year labels on a vertical
    // line graph vertically so they do not collide)
    var rot = (opts.rot != null) ? ' transform="rotate(' + opts.rot + ' ' + x.toFixed(1) + ' ' + (y + dy).toFixed(1) + ')"' : '';
    return '<text x="' + x.toFixed(1) + '" y="' + (y + dy).toFixed(1) +
      '" font-family="' + FONT + '" font-size="' + sz + '" fill="' + fill +
      '" ' + a + dk + halo + rot + '>' + esc(s) + '</text>';
  }
  function line(x1, y1, x2, y2, w, color) {
    return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) +
      '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) +
      '" stroke="' + (color || INK) + '" stroke-width="' + (w || 2) +
      '" stroke-linecap="round"/>';
  }
  function openSvg(vb, cls) {
    return '<svg class="' + (cls || 'td-figsvg') + '" viewBox="' + vb +
      '" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="geometry figure">';
  }

  /* =====================================================================
     TEMPLATE: parallel lines cut by a transversal
     opts: { topLabel, bottomLabel, transLabel, direction,
             topLeft, topRight, bottomLeft, bottomRight, note }
     direction: 'NE' (default, transversal lower-left -> upper-right) or
                'SE' (transversal upper-left -> lower-right).
     topLeft/topRight are the two ABOVE-line angles at the TOP intersection;
     bottomLeft/bottomRight the two ABOVE-line angles at the BOTTOM one.
     ===================================================================== */
  function parallelLines(o) {
    o = o || {};
    var cx0 = 40, cx1 = 320, yTop = 78, yBot = 168;
    var se = o.direction === 'SE';
    // SE: transversal runs from upper-left down to lower-right (as in U4-03).
    var n0 = se ? [70, 35]  : [70, 205];
    var n1 = se ? [305, 205] : [305, 35];
    function inter(y) {
      var t = (n0[1] - y) / (n0[1] - n1[1]);
      return [n0[0] + t * (n1[0] - n0[0]), y];
    }
    var P1 = inter(yTop), P2 = inter(yBot);
    var out = [];
    out.push(openSvg('0 0 360 240', 'td-figsvg'));
    out.push(line(cx0, yTop, cx1, yTop, 2.2));      // top parallel
    out.push(line(cx0, yBot, cx1, yBot, 2.2));      // bottom parallel
    out.push(line(n0[0], n0[1], n1[0], n1[1], 2.2)); // transversal
    // line labels; the transversal label sits at its upper end
    out.push(txt(cx1 + 10, yTop - 12, o.topLabel || 'r', { anchor: 'start', size: 13 }));
    out.push(txt(cx1 + 10, yBot - 14, o.bottomLabel || 's', { anchor: 'start', size: 13 }));
    var tEnd = se ? n0 : n1;
    out.push(txt(tEnd[0] - 4, tEnd[1] - 8, o.transLabel || 'n', { anchor: 'end', size: 13 }));

    /* The UPWARD ray of the transversal at an intersection. Screen degrees:
       0=east, 90=south, 180=west, 270=north. Normalised into [0,360). */
    function norm360(a) { return ((a % 360) + 360) % 360; }
    var upRef = se ? n0 : n1;
    var up = norm360(Math.atan2(upRef[1] - P1[1], upRef[0] - P1[0]) * 180 / Math.PI);
    if (up < 180) up += 360;                       // must lie in the upper half-plane
    // Above a horizontal line the two wedges are [180, up] (left) and [up, 360] (right).
    var down = norm360(up + 180);               // downward ray, in lower half-plane
    /* Four quadrants at an intersection, as [startAngle, endAngle]:
       UL/UR sit ABOVE the horizontal line, LL/LR BELOW it. 'Left'/'right'
       always mean screen-left/right of the transversal, NOT of the page.
       Measured spans (the actual arc sizes drawn by mark() below):
         NE (up~324°, down~144°): UL 180→324 = 144° OBTUSE,
                                  UR 324→360 =  36° acute,
                                  LL 144→180 =  36° acute,
                                  LR   0→144 = 144° OBTUSE.
         SE (up~216°, down~ 36°): UL 180→216 =  36° acute,
                                  UR 216→360 = 144° OBTUSE,
                                  LL  36→180 = 144° OBTUSE,
                                  LR   0→ 36 =  36° acute.
       A spec's numeric angle MUST agree with the span of the wedge it names;
       e.g. a 164° label belongs in an OBTUSE wedge, never in UR for NE. */
    var W_UL = [180, up], W_UR = [up, 360], W_LL = [down, 180], W_LR = [0, down];
    function mark(P, w, label, key) {
      if (!label) return;
      var a0 = w[0], a1 = w[1];
      var r = 30, span = a1 - a0;
      // The label sits at the angular midpoint of the very same wedge the
      // arc spans, so a wide arc can never end up labelled with a tiny angle.
      // Some official scans mark angles with labels only, no arc. Respect that
      // so the figure matches the original exactly (no extra glyphs).
      if (!o.noArcs) {
        out.push('<path d="' + arc(P[0], P[1], r, a0, a1) + '" data-angle-key="' + key +
          '" data-span="' + span.toFixed(1) + '" fill="none" stroke="' + INK + '" stroke-width="1.6"/>');
      }
      // Acute wedges are narrow: push the label further out so it neither
      // touches the horizontal line nor collides with the neighbouring label.
      var lr = span < 70 ? r + 30 : r + 16;
      var lp = pt(P[0], P[1], lr, (a0 + a1) / 2);
      out.push(txt(lp[0], lp[1], label, { size: 14, fill: INK, dataKey: key }));
    }
    // Explicit quadrant names are preferred in specs. Legacy names (topLeft
    // etc.) remain aliases for the two ABOVE-line quadrants only.
    mark(P1, W_UL, o.topUL || o.topLeft, 'top-UL');
    mark(P1, W_UR, o.topUR || o.topRight, 'top-UR');
    mark(P1, W_LL, o.topLL, 'top-LL');
    mark(P1, W_LR, o.topLR, 'top-LR');
    mark(P2, W_UL, o.botUL || o.bottomLeft, 'bot-UL');
    mark(P2, W_UR, o.botUR || o.bottomRight, 'bot-UR');
    mark(P2, W_LL, o.botLL, 'bot-LL');
    mark(P2, W_LR, o.botLR, 'bot-LR');
    out.push('</svg>');
    return wrap(out.join(''), o);
  }

  /* =====================================================================
     TEMPLATE: triangle (optionally right-angled)
     opts: { pts:[[x,y],[x,y],[x,y]], labels:['A','B','C'],
             angles:{0:'40°',1:'',2:'90°'}, sides:{0:'5',1:'',2:'13'},
             right:[i] (vertex index with right angle), note }
     ===================================================================== */
  function triangle(o) {
    o = o || {};
    // Default is a genuine right triangle: vertex 0 (bottom-left) = 90°,
    // vertices 1 and 2 = 45°. The old default [[70,180],[290,180],[180,50]]
    // measured ~50°/50°/80°, so a spec's "90°" label + right-angle square
    // were drawn on a 50° corner. Specs whose right angle is at vertex 1
    // must supply explicit pts with the vertical leg at that vertex.
    var pts = o.pts || [[70, 200], [230, 200], [70, 40]];
    var labels = o.labels || ['A', 'B', 'C'];
    var ang = o.angles || {};
    var sides = o.sides || {};
    var right = o.right;
    var out = [openSvg('0 0 360 240', 'td-figsvg')];
    // edges
    for (var i = 0; i < 3; i++) {
      var a = pts[i], b = pts[(i + 1) % 3];
      out.push(line(a[0], a[1], b[0], b[1], 2.2));
      // side label at midpoint, nudged OUTWARD (away from the centroid) so it
      // never sits on top of the hypotenuse stroke — the printed books always
      // put the length just outside the triangle.
      var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      var nx = -(b[1] - a[1]), ny = (b[0] - a[0]);
      var nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      var gx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3;
      var gy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;
      if ((mx - gx) * nx + (my - gy) * ny < 0) { nx = -nx; ny = -ny; }
      out.push(txt(mx + nx * 27, my + ny * 27, sides[i] || '', { size: 13 }));
    }
    // vertices
    for (var v = 0; v < 3; v++) {
      var p = pts[v];
      out.push('<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.6" fill="' + DOT + '"/>');
      // vertex label outward
      var c = [180, 120];
      var dx = p[0] - c[0], dy = p[1] - c[1], dl = Math.hypot(dx, dy) || 1;
      out.push(txt(p[0] + dx / dl * 18, p[1] + dy / dl * 18, labels[v] || '', { size: 14 }));
      // angle arc. 直角顶点只画方框标记，原书不会同时再印一个 "90°"（早前 12 个
      // 三角形 spec 都同时给了 angles[i]="90°" 和 right:[i]，会画出方框+"90°"两套）。
      var isRight = !!(right && right.indexOf(v) >= 0);
      if (ang[v] && !isRight) {
        var prev = pts[(v + 2) % 3], next = pts[(v + 1) % 3];
        var a0 = Math.atan2(prev[1] - p[1], prev[0] - p[0]) * 180 / Math.PI;
        var a1 = Math.atan2(next[1] - p[1], next[0] - p[0]) * 180 / Math.PI;
        if (a1 < a0) a1 += 360;
        if (a1 - a0 > 180) { var t = a0; a0 = a1; a1 = t + 360; }
        out.push('<path d="' + arc(p[0], p[1], 26, a0, a1) + '" fill="none" stroke="' + INK + '" stroke-width="1.4"/>');
        var mid = (a0 + a1) / 2, lp = pt(p[0], p[1], 40, mid);
        out.push(txt(lp[0], lp[1], ang[v], { size: 13 }));
      }
      // right-angle square
      if (right != null && right.indexOf(v) >= 0) {
        var prev2 = pts[(v + 2) % 3], next2 = pts[(v + 1) % 3];
        var ux = (prev2[0] - p[0]), uy = (prev2[1] - p[1]);
        var vx = (next2[0] - p[0]), vy = (next2[1] - p[1]);
        var ul = Math.hypot(ux, uy) || 1, vl = Math.hypot(vx, vy) || 1;
        ux = ux / ul * 16; uy = uy / ul * 16; vx = vx / vl * 16; vy = vy / vl * 16;
        out.push('<path d="M ' + (p[0] + ux) + ' ' + (p[1] + uy) +
          ' L ' + (p[0] + ux + vx) + ' ' + (p[1] + uy + vy) +
          ' L ' + (p[0] + vx) + ' ' + (p[1] + vy) + '" fill="none" stroke="' + INK + '" stroke-width="1.4"/>');
      }
    }
    out.push('</svg>');
    return wrap(out.join(''), o);
  }

  /* =====================================================================
     TEMPLATE: circle (center O, radius, optional central angle + chord)
     opts: { radius:'r', centerAngle:{deg:60,label:'60°'}, chord:'8',
             diameter:bool, point:'A', note }
     ===================================================================== */
  function circleFig(o) {
    o = o || {};
    var cx = 180, cy = 120, R = 78;
    var out = [openSvg('0 0 360 240', 'td-figsvg')];
    out.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="' + INK + '" stroke-width="2.2"/>');
    out.push('<circle cx="' + cx + '" cy="' + cy + '" r="2.8" fill="' + DOT + '"/>');
    out.push(txt(cx - 12, cy + 16, 'O', { size: 13 }));
    // radius to point A at angle -60° (up-right)
    var Aang = -55;
    var A = pt(cx, cy, R, Aang);
    out.push(line(cx, cy, A[0], A[1], 2));
    out.push('<circle cx="' + A[0] + '" cy="' + A[1] + '" r="2.6" fill="' + DOT + '"/>');
    out.push(txt(A[0] + 12, A[1] - 6, o.point || 'A', { size: 13 }));
    if (o.radius) out.push(txt((cx + A[0]) / 2 + 8, (cy + A[1]) / 2, o.radius, { size: 12 }));
    // central angle + chord
    if (o.centerAngle) {
      var B = pt(cx, cy, R, Aang + o.centerAngle.deg);
      // central-angle arc: small wedge at O between the two radii
      out.push('<path d="' + arc(cx, cy, 28, Aang, Aang + o.centerAngle.deg) + '" fill="none" stroke="' + ACCENT + '" stroke-width="1.6"/>');
      out.push(line(cx, cy, B[0], B[1], 2));
      out.push('<circle cx="' + B[0] + '" cy="' + B[1] + '" r="2.6" fill="' + DOT + '"/>');
      var lp = pt(cx, cy, 44, Aang + o.centerAngle.deg / 2);
      out.push(txt(lp[0], lp[1], o.centerAngle.label, { size: 13, fill: ACCENT }));
      if (o.chord) {
        out.push(line(A[0], A[1], B[0], B[1], 2, FAINT));
        out.push(txt((A[0] + B[0]) / 2 - 6, (A[1] + B[1]) / 2 + 16, o.chord, { size: 12, fill: FAINT }));
      }
    }
    out.push('</svg>');
    return wrap(out.join(''), o);
  }

  /* =====================================================================
     TEMPLATE: rectangle
     opts: { w:'', h:'', diagonal:bool, note }
     ===================================================================== */
  function rectFig(o) {
    o = o || {};
    var x = 70, y = 60, w = 220, h = 120;
    var out = [openSvg('0 0 360 240', 'td-figsvg')];
    out.push('<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
      '" fill="#fbfcfe" stroke="' + INK + '" stroke-width="2.2"/>');
    if (o.w) out.push(txt(x + w / 2, y + h + 18, o.w, { size: 13 }));
    if (o.h) out.push(txt(x - 14, y + h / 2, o.h, { size: 13 }));
    if (o.diagonal) out.push(line(x, y, x + w, y + h, 1.8, FAINT));
    out.push('</svg>');
    return wrap(out.join(''), o);
  }

  /* =====================================================================
     TEMPLATE: two straight lines crossing at one point (vertical angles).
     opts: { topLabel, bottomLabel, note }
     Used by printed question 4.1 #5 (w = 130, find z).
     ===================================================================== */
  function crossingLines(o) {
    o = o || {};
    var cx = 180, cy = 118;
    var out = [openSvg('0 0 360 240', 'td-figsvg')];
    out.push(line(58, 52, 302, 184, 2.2));   // upper-left -> lower-right
    out.push(line(58, 184, 302, 52, 2.2));   // lower-left -> upper-right
    out.push(txt(cx, cy - 40, o.topLabel || 'w°', { size: 14 }));
    out.push(txt(cx, cy + 48, o.bottomLabel || 'z°', { size: 14 }));
    out.push('</svg>');
    return wrap(out.join(''));
  }

  /* =====================================================================
     TEMPLATE: generic data chart (scatter / line / exponential / bar /
     histogram / boxplot). Driven by a spec in window.TD_FIG_SPECS:
       { type:'chart',
         x:{min,max,step,label, labels?, cats?:[[text,at]...]}, y:{min,max,step,label, labels?, showZero?},
         origin:'O'?, grid:true|false, yAxis:true|false,
         series:[ {kind:'region',points:[[x,y]...]} | {kind:'exp',a,b,c} | {kind:'line',points:[[x,y]...]} |
                  {kind:'points',points:[[x,y]...]} |
                  {kind:'bar',bars:[{x0,x1,h}]} | {kind:'hist',bars:[{x0,x1,n}]} |
                  {kind:'box',q1,med,q3,lo,hi} ],
         marks:[ {x,y,label,dx,dy} ] }          // optional point call-outs
     Style follows the original book scans: no "0" label on the y-axis (the
     origin label sits on the x-axis; set origin:"O" where the book prints O),
     explicit x/y label lists for figures that label only some gridlines, and
     category labels (x.cats) for bar charts. All charts are HIGH-DEFINITION
     VECTOR SVG (no raster scan, no watermark).
     The default geometry matches the Bluebook coordinate-graph style used by
     the existing choice/line graphs: light grid, navy axes, terracotta data.
     ===================================================================== */
  function pathFrom(pts, dash) {
    if (!pts || pts.length < 2) return '';
    var d = 'M ' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var k = 1; k < pts.length; k++) d += ' L ' + pts[k][0].toFixed(1) + ' ' + pts[k][1].toFixed(1);
    var dashAttr = dash ? ' stroke-dasharray="' + dash + '"' : '';
    return '<path d="' + d + '" fill="none" stroke="' + ACCENT + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"' + dashAttr + '/>';
  }
  function chart(o) {
    o = o || {};
    var x = o.x || { min: 0, max: 80, step: 10 }, y = o.y || { min: 0, max: 80, step: 10 };
    var W = o.w || 440, H = o.h || 360;
    var padL = o.padL != null ? o.padL : 60, padR = o.padR != null ? o.padR : 18;
    var padT = o.padT != null ? o.padT : 18, padB = o.padB != null ? o.padB : 48;
    var pw = W - padL - padR, ph = H - padT - padB;
    function PX(v) { return padL + (v - x.min) / (x.max - x.min) * pw; }
    function PY(v) { return padT + (y.max - v) / (y.max - y.min) * ph; }
    function tk(v) { return (v % 1) ? v.toFixed(1) : String(v); }
    // The book prints fractional-step axes with a consistent decimal count
    // (e.g. a 0.5-step axis labels 13.0 and 14.0, not 13 and 14).
    function ytk(v) { return (y.step % 1 !== 0) ? v.toFixed(1) : tk(v); }
    var out = [openSvg('0 0 ' + W + ' ' + H, 'td-figsvg')];
    // gridlines
    /* minor:'1' — the book prints SAT coordinate planes with a 1-unit grid but
       labels only every 2 units (e.g. SR-228 / SR-229). Draw the fine grid at
       x.minor / y.minor while the tick labels stay on x.step / y.step. */
    var gstepX = (o.minor && o.minor.x) ? o.minor.x : x.step;
    var gstepY = (o.minor && o.minor.y) ? o.minor.y : y.step;
    if (o.grid !== false) {
      for (var gx = (o.grid === 'y' ? x.max + 1 : x.min); gx <= x.max + 1e-9; gx += gstepX) {
        out.push('<line x1="' + PX(gx).toFixed(1) + '" y1="' + PY(y.min).toFixed(1) +
          '" x2="' + PX(gx).toFixed(1) + '" y2="' + PY(y.max).toFixed(1) + '" stroke="' + GRID + '" stroke-width="1"/>');
      }
      for (var gy = y.min; gy <= y.max + 1e-9; gy += gstepY) {
        out.push('<line x1="' + PX(x.min).toFixed(1) + '" y1="' + PY(gy).toFixed(1) +
          '" x2="' + PX(x.max).toFixed(1) + '" y2="' + PY(gy).toFixed(1) + '" stroke="' + GRID + '" stroke-width="1"/>');
      }
    }
    /* axes — default: the x-axis sits on y.min and the y-axis on x.min (data
       that starts at 0). axesAt:'zero' instead puts each axis on the real
       x=0 / y=0 line whenever 0 is inside that range, which is how the book
       prints a coordinate plane (axes cross at the origin, arrows at both
       ends). Used by the shaded-inequality figures. */
    /* 书里的坐标平面永远是两轴在原点相交：只要 0 落在范围内就把轴挪到 0，
       只有显式写 axesAt:'border' 的统计图（直方图/频数图那种底下贴边的）
       才把轴留在外框。 */
    var zy = (o.axesAt === 'border') ? null : ((y.min < 0 && y.max > 0) ? 0 : null);
    var zx = (o.axesAt === 'border') ? null : ((x.min < 0 && x.max > 0) ? 0 : null);
    var axYv = zy != null ? zy : y.min;   // data-y of the horizontal axis
    var axXv = zx != null ? zx : x.min;   // data-x of the vertical axis
    out.push('<line x1="' + PX(x.min).toFixed(1) + '" y1="' + PY(axYv).toFixed(1) +
      '" x2="' + PX(x.max).toFixed(1) + '" y2="' + PY(axYv).toFixed(1) + '" stroke="' + INK + '" stroke-width="1.8"/>');
    if (o.yAxis !== false) {
      out.push('<line x1="' + PX(axXv).toFixed(1) + '" y1="' + PY(y.min).toFixed(1) +
        '" x2="' + PX(axXv).toFixed(1) + '" y2="' + PY(y.max).toFixed(1) + '" stroke="' + INK + '" stroke-width="1.8"/>');
    }
    // tick labels — replicate the SAT/B bluebook conventions seen in the
    // original book scans: the y-axis never carries a "0" (the origin label
    // lives on the x-axis), and many originals print "O" at the origin.
    // Per-figure overrides: origin:"O", x.labels/y.labels:[values to label],
    // x.cats:[[text,at]...] for category axes, y.showZero:true for bar charts.
    var xHasTicks = !x.cats;
    var labOut = [];   // tick labels are painted AFTER the data, so a line never cuts through the text
    var yLabPad = (o.yLabelPad != null ? o.yLabelPad : (zx != null ? 14 : 9));   // wider gutter when a data line runs near the axis
    /* l0: 标签起点的偏移 —— 书里网格从 -5 起、数字却从 -4 起标（SR-238）。 */
    var gx0 = (x.l0 != null) ? x.l0 : x.min;
    for (var gx2 = gx0; gx2 <= x.max + 1e-9; gx2 += x.step) {
      if (!xHasTicks) continue;
      if (x.labels && !x.labels.some(function (v) { return Math.abs(v - gx2) < 1e-9; })) continue;
      if (o.origin === 'O' && Math.abs(gx2) < 1e-9) continue;   // "O" is drawn below, left of the origin
      labOut.push(txt(PX(gx2), PY(axYv) + 17, tk(gx2), { size: 11, fill: FAINT }));
    }
    /* x=0 不在范围内时不要画 O —— 那会跑到画框外面去（R03-182/R03-184）。 */
    if (o.origin === 'O' && zx == null && x.min <= 0 && x.max >= 0) labOut.push(txt(PX(0), PY(axYv) + 17, 'O', { size: 11, fill: FAINT }));
    if (o.origin === 'O' && zx != null) labOut.push(txt(PX(0) - yLabPad, PY(axYv) + 4, 'O', { anchor: 'end', size: 11, fill: FAINT, halo: o.axesAt === 'zero' }));
    (x.cats || []).forEach(function (c) {
      labOut.push(txt(PX(c[1]), PY(axYv) + (x.rot ? 12 : 17), c[0], { size: 11, fill: FAINT, rot: x.rot }));
    });
    if (o.yAxis !== false) {
      var gy0 = (y.l0 != null) ? y.l0 : y.min;
      for (var gy2 = gy0; gy2 <= y.max + 1e-9; gy2 += y.step) {
        if (y.labels && !y.labels.some(function (v) { return Math.abs(v - gy2) < 1e-9; })) continue;
        if (Math.abs(gy2) < 1e-9 && !y.showZero) continue;
        labOut.push(txt(PX(axXv) - yLabPad, PY(gy2) + 4, ytk(gy2), { anchor: 'end', size: 11, fill: FAINT, halo: o.axesAt === 'zero' }));
      }
    }
    // axis arrows — filled triangle with its TIP on the axis end
    var axX = PX(x.max), axY = PY(axYv), ayX = PX(axXv), ayY = PY(y.max);
    out.push('<polygon points="' + axX.toFixed(1) + ',' + axY.toFixed(1) + ' ' +
      (axX - 9).toFixed(1) + ',' + (axY - 5).toFixed(1) + ' ' +
      (axX - 9).toFixed(1) + ',' + (axY + 5).toFixed(1) + '" fill="' + INK + '"/>');
    if (o.yAxis !== false) {
      out.push('<polygon points="' + ayX.toFixed(1) + ',' + ayY.toFixed(1) + ' ' +
        (ayX - 5).toFixed(1) + ',' + (ayY + 9).toFixed(1) + ' ' +
        (ayX + 5).toFixed(1) + ',' + (ayY + 9).toFixed(1) + '" fill="' + INK + '"/>');
    }
    // axis titles. Default: "x" centred under the frame, "y" rotated at the
    // far left. axisLabelsEnd:true prints them at the arrow tips ("x" right of
    // the x-arrow, "y" above the y-arrow), the way the book does.
    if (o.axisLabelsEnd) {
      if (x.label) out.push(txt(PX(x.max) + 12, PY(axYv) + 2, x.label, { anchor: 'start', size: 12, fill: INK }));
      if (o.yAxis !== false && y.label) out.push(txt(PX(axXv) + 9, PY(y.max) - 6, y.label, { anchor: 'start', size: 12, fill: INK }));
    } else {
      if (x.label) out.push(txt(padL + pw / 2, H - 8, x.label, { size: 12, fill: INK }));
      if (o.yAxis !== false && y.label) {
        var ytx = (o.yTitleX != null ? o.yTitleX : 16);
        out.push('<text x="' + ytx + '" y="' + (padT + ph / 2) + '" font-family="' + FONT +
          '" font-size="12" fill="' + INK + '" text-anchor="middle" transform="rotate(-90 ' + ytx + ' ' + (padT + ph / 2) + ')">' + esc(y.label) + '</text>');
      }
    }
    // clip series/marks to the plot rectangle (real graphs cut curves at the frame)
    var __cid = 'tdclip' + ((chart.__seq = (chart.__seq || 0) + 1));
    out.push('<defs><clipPath id="' + __cid + '"><rect x="' + padL + '" y="' + padT + '" width="' + pw + '" height="' + ph + '"/></clipPath></defs>');
    out.push('<g clip-path="url(#' + __cid + ')">');
    // series
    (o.series || []).forEach(function (s) {
      if (s.kind === 'region') {
        /* Shaded inequality region: a filled polygon in data coordinates.
           Put it FIRST in the series list so boundary lines draw on top. */
        var rg = (s.points || []).map(function (p) { return [PX(p[0]), PY(p[1])]; });
        if (rg.length > 2) {
          out.push('<polygon points="' + rg.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') +
            '" fill="rgba(22,44,70,0.12)" stroke="none"/>');
        }
      } else if (s.kind === 'exp') {
        var pts = [], stepD = (x.step / 20) || 0.5;
        for (var t = x.min; t <= x.max + 1e-9; t += stepD) {
          /* optional c = horizontal asymptote offset (y = a·b^t + c).
             No Math.min(v, y.max) clamp here: clamping invents a fake flat
             segment at the top of the frame. The clip group below already
             cuts the curve at the plot boundary, so a real growth curve
             cleanly exits the frame the way textbook figures do. */
          var v = s.a * Math.pow(s.b, t) + (s.c || 0);
          if (v < y.min * 0.4) continue;
          pts.push([PX(t), PY(v)]);
        }
        out.push(pathFrom(pts));
      } else if (s.kind === 'poly') {
        /* 多项式：按根写成 sign·k·∏(t-r)，k 自动归一化到框内（不靠手调系数） */
        var proots = s.roots || [-1, 1], psign = s.sign || 1;
        var samples = [], tt, vv, mxv = 0;
        var fine = (x.max - x.min) / 240;
        for (tt = x.min; tt <= x.max + 1e-9; tt += fine) {
          vv = psign;
          proots.forEach(function (r) { vv *= (tt - r); });
          samples.push([tt, vv]);
          if (Math.abs(vv) > mxv) mxv = Math.abs(vv);
        }
        var fit = Math.min(Math.abs(y.max), Math.abs(y.min)) * 0.9;
        var pk = s.k || (mxv > 1e-9 ? fit / mxv : 1);
        out.push(pathFrom(samples.map(function (p2) { return [PX(p2[0]), PY(p2[1] * pk)]; })));
      } else if (s.kind === 'line') {
        out.push(pathFrom((s.points || []).map(function (p) { return [PX(p[0]), PY(p[1])]; }), s.dash));
      } else if (s.kind === 'points') {
        (s.points || []).forEach(function (p) {
          out.push('<circle cx="' + PX(p[0]).toFixed(1) + '" cy="' + PY(p[1]).toFixed(1) + '" r="3" fill="' + DOT + '"/>');
        });
      } else if (s.kind === 'bar' || s.kind === 'hist') {
        (s.bars || []).forEach(function (b) {
          var x0 = PX(b.x0), x1 = PX(b.x1), h = PY((s.kind === 'hist' ? (y.min + (b.n / s.maxN) * (y.max - y.min)) : b.h));
          out.push('<rect x="' + Math.min(x0, x1).toFixed(1) + '" y="' + h.toFixed(1) +
            '" width="' + Math.abs(x1 - x0).toFixed(1) + '" height="' + (PY(y.min) - h).toFixed(1) +
            '" fill="' + (s.kind === 'hist' ? 'rgba(194,65,12,0.18)' : ACCENT) + '" stroke="' + ACCENT + '" stroke-width="1.4"/>');
        });
      } else if (s.kind === 'box') {
        var lo = PX(s.lo), hi = PX(s.hi), q1x = PX(s.q1), q3x = PX(s.q3), medx = PX(s.med);
        var midY = padT + ph / 2, bw = 20;
        out.push('<line x1="' + lo.toFixed(1) + '" y1="' + midY.toFixed(1) + '" x2="' + hi.toFixed(1) + '" y2="' + midY.toFixed(1) + '" stroke="' + INK + '" stroke-width="1.6"/>');
        out.push('<rect x="' + Math.min(q1x, q3x).toFixed(1) + '" y="' + (midY - bw).toFixed(1) + '" width="' + Math.abs(q3x - q1x).toFixed(1) + '" height="' + (bw * 2).toFixed(1) + '" fill="rgba(194,65,12,0.12)" stroke="' + INK + '" stroke-width="1.6"/>');
        out.push('<line x1="' + lo.toFixed(1) + '" y1="' + (midY - 6).toFixed(1) + '" x2="' + lo.toFixed(1) + '" y2="' + (midY + 6).toFixed(1) + '" stroke="' + INK + '" stroke-width="1.4"/>');
        out.push('<line x1="' + hi.toFixed(1) + '" y1="' + (midY - 6).toFixed(1) + '" x2="' + hi.toFixed(1) + '" y2="' + (midY + 6).toFixed(1) + '" stroke="' + INK + '" stroke-width="1.4"/>');
        out.push('<line x1="' + medx.toFixed(1) + '" y1="' + (midY - bw).toFixed(1) + '" x2="' + medx.toFixed(1) + '" y2="' + (midY + bw).toFixed(1) + '" stroke="' + INK + '" stroke-width="1.8"/>');
      }
    });
    // point call-outs
    (o.marks || []).forEach(function (m) {
      var mx = PX(m.x), my = PY(m.y);
      var lx = mx + (m.dx != null ? m.dx : 7), ly = my + (m.dy != null ? m.dy : -9);
      if (m.ring !== false) {
        out.push('<circle cx="' + mx.toFixed(1) + '" cy="' + my.toFixed(1) + '" r="3.6" fill="none" stroke="' + ACCENT + '" stroke-width="1.8"/>');
      }
      if (m.arrow) {
        // curved call-out arrow from the label anchor toward the data point
        var qx = (lx + mx) / 2 + (m.bend != null ? m.bend : 0), qy = (ly + my) / 2 + (m.bendY != null ? m.bendY : 0);
        out.push('<path d="M ' + lx.toFixed(1) + ' ' + ly.toFixed(1) + ' Q ' + qx.toFixed(1) + ' ' + qy.toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1) +
          '" fill="none" stroke="' + ACCENT + '" stroke-width="1.6"/>');
        var ang = Math.atan2(my - qy, mx - qx);
        var h1x = mx - 7 * Math.cos(ang - 0.42), h1y = my - 7 * Math.sin(ang - 0.42);
        var h2x = mx - 7 * Math.cos(ang + 0.42), h2y = my - 7 * Math.sin(ang + 0.42);
        out.push('<polygon points="' + mx.toFixed(1) + ',' + my.toFixed(1) + ' ' + h1x.toFixed(1) + ',' + h1y.toFixed(1) + ' ' +
          h2x.toFixed(1) + ',' + h2y.toFixed(1) + '" fill="' + ACCENT + '"/>');
      }
      if (m.label) out.push(txt(lx, ly, m.label, { size: 11, fill: ACCENT, anchor: m.anchor || 'start' }));
    });
    out.push('</g>');
    // labels last: text stays legible even where a boundary line crosses the axis
    labOut.forEach(function (l) { out.push(l); });
    out.push('</svg>');
    return wrap(out.join(''));
  }

  /* =====================================================================
     TEMPLATE: clean HTML table (replaces fuzzy raster table scans).
     spec: { type:'table', head:[...], rows:[[...],...], caption?:'' }
     Renders a crisp, theme-matched table (not a screenshot). Used for the
     data tables that were previously shown as low-res crop images.
     ===================================================================== */
  function tableFig(o) {
    o = o || {};
    var thS = 'border:1px solid #c7d0db;padding:7px 11px;background:#f3f6fa;font-weight:600;color:#162c46;text-align:center;';
    var tdS = 'border:1px solid #c7d0db;padding:7px 11px;color:#162c46;text-align:center;';
    var head;
    if (o.headGroups && o.headGroups.length) {
      // two-row header: first head cell spans both rows, then grouped cells.
      var topRow = '<th style="' + thS + '" rowspan="2">' + esc(o.head[0]) + '</th>';
      o.headGroups.forEach(function (g) {
        topRow += '<th style="' + thS + '" colspan="' + g.span + '">' + esc(g.label) + '</th>';
      });
      var botRow = o.head.slice(1).map(function (h) {
        return '<th style="' + thS + '">' + esc(h) + '</th>';
      }).join('');
      head = '<thead><tr>' + topRow + '</tr><tr>' + botRow + '</tr></thead>';
    } else {
      head = (o.head || []).map(function (h) {
        return '<th style="' + thS + '">' + esc(h) + '</th>';
      }).join('');
      head = head ? '<thead><tr>' + head + '</tr></thead>' : '';
    }
    var rows = (o.rows || []).map(function (r, ri) {
      var cls = /total/i.test(r.join(' ')) ? ' style="font-weight:600;background:#fbfcfe;"' : '';
      var cells = r.map(function (c) {
        return '<td style="' + tdS + '">' + esc(c) + '</td>';
      }).join('');
      return '<tr' + cls + '>' + cells + '</tr>';
    }).join('');
    var table = '<table style="border-collapse:collapse;width:100%;max-width:440px;margin:6px auto;' +
      'font-family:inherit;font-size:14px;line-height:1.35;">' + head +
      '<tbody>' + rows + '</tbody></table>';
    var cap = o.caption ? '<div style="text-align:center;font-size:12px;color:#5b6b7f;margin-top:4px;">' + esc(o.caption) + '</div>' : '';
    return '<div class="td-figure td-figure--table">' + cap + table + '</div>';
  }

  /* Free-form hand-authored SVG for figures that do not fit a template
     (3D solids, composite/overlapping shapes, etc.). The spec supplies a
     complete <svg>…</svg> string; we just wrap it in the figure container. */
  function rawSvg(o) {
    o = o || {};
    return wrap(o.svg || '');
  }

  /* Two mini-charts side by side — the book often prints data set A and data
     set B as two separate panels (T19 #3 two histograms, T19 #7 two dot plots).
     Rendering them overlaid in one frame is a fidelity error. */
  function TEMPLATES_PAIR(o, chartFn) {
    var panels = o.panels || [];
    var cells = panels.map(function (p) {
      var c = {};
      for (var k in p) if (k !== 'title') c[k] = p[k];
      c.w = p.w || o.cellW || 180;
      if (c.padL == null) c.padL = 46;
      c.h = p.h || o.cellH || 260;
      var head = p.title
        ? '<div style="font:600 14px/1.4 system-ui,sans-serif;text-align:center;margin-bottom:2px">' + p.title + '</div>'
        : '';
      return '<div class="td-pair-cell" style="display:flex;flex-direction:column;align-items:center;width:' + c.w + 'px;flex:0 0 ' + c.w + 'px">' + head + chartFn(c) + '</div>';
    }).join('');
    return '<div class="td-figure-pair" style="display:flex;gap:10px;justify-content:center;align-items:flex-start;flex-wrap:nowrap">' + cells + '</div>';
  }
  var TEMPLATES = {
    pairchart: function (o) { return TEMPLATES_PAIR(o, chart); },
    parallelLines: parallelLines,
    crossingLines: crossingLines,
    triangle: triangle,
    rightTriangle: triangle,
    circle: circleFig,
    rect: rectFig,
    chart: chart,
    table: tableFig,
    rawSvg: rawSvg
  };

  /* The figure block contains ONLY the geometry. No FIGURE caption, no
     "Note: Figure not drawn to scale", no question text, no answer choices —
     the note already belongs to the stem and repeating it here is noise. */
  function wrap(inner) {
    return '<div class="td-figure td-figure--svg">' + inner + '</div>';
  }

  function genFigure(spec) {
    if (!spec || !spec.type) return null;
    var fn = TEMPLATES[spec.type];
    if (!fn) return null;
    return fn(spec);
  }

  /* ---------------- figure block entry ---------------- */
  function showFigure(q) {
    if (!q) return '';
    // 1) High-definition vector figure (never a scan, never a watermark).
    var spec = (window.TD_FIG_SPECS && window.TD_FIG_SPECS[q.id]) || null;
    if (spec) {
      var svg = genFigure(spec);
      if (svg) return svg;
    }
    // 2) Otherwise ONLY a pre-cropped, watermark-free standalone diagram may
    //    be shown. The full-page source scan is NEVER embedded: it contains
    //    the stem, the choices, the "Note:" caption and the watermark.
    if (!needsFigure(q)) return '';
    var crops = window.TD_FIG_CROPS || {};
    var src = crops[q.id];
    if (!src) return '';
    var figMissing = "var p=document.createElement('div');p.className='td-figure td-figure--missing';p.textContent='图形暂缺';this.replaceWith(p);";
    return '<div class="td-figure td-figure--crop"><img src="' + src +
      '" alt="diagram" loading="lazy" decoding="async" onerror="' + figMissing + '"></div>';
  }

  /* =====================================================================
     line-answer coordinate graph (kept from prior version)
     ===================================================================== */
  function norm(s) {
    return String(s).replace(/[–−—]/g, '-').replace(/\s+/g, ' ').trim();
  }
  var NONLINEAR = /[²^]|sqrt|abs|[|]|[×*]|f\s*\(|\b\w+\s*\(|≠|≤|≥|<|>/i;
  function isLinearPoly(p) {
    p = p.trim();
    if (p === '') return false;
    var toks = p.split(/(?=[+-])/).map(function (t) {
      return t.trim().replace(/\s+/g, '').replace(/^\+/, '');
    }).filter(Boolean);
    if (!toks.length) return false;
    return toks.every(function (t) {
      return /^-?(\d+\.?\d*|\.\d+|\d+\.?\d*\/\d+\.?\d*)?([xXyY])$/.test(t) ||
             /^-?(\d+\.?\d*|\.\d+)$/.test(t);
    });
  }
  function isLineEquation(s) {
    s = norm(s);
    if (NONLINEAR.test(s)) return false;
    if (/\(|\)/.test(s)) return false;
    var eq = (s.match(/=/g) || []).length;
    if (eq !== 1) return false;
    var parts = s.split('=');
    return isLinearPoly(parts[0]) && isLinearPoly(parts[1]);
  }
  function parseTerm(t) {
    t = t.replace(/\s/g, '');
    var v = /[xX]/.test(t) && !/[yY]/.test(t) ? 'x' : (/[yY]/.test(t) ? 'y' : null);
    var num = t.replace(/[xXyY]/g, '');
    if (num === '' || num === '-' || num === '+') return { v: v, c: num === '-' ? -1 : 1 };
    if (num.charAt(0) === '/') num = '1' + num;
    if (num.charAt(num.length - 1) === '/') num += '1';
    var coeff = num.indexOf('/') >= 0
      ? parseFloat(num.split('/')[0]) / parseFloat(num.split('/')[1])
      : parseFloat(num);
    if (isNaN(coeff)) coeff = 0;
    return { v: v, c: coeff };
  }
  function parseSide(expr) {
    var e = norm(expr);
    var toks = e.split(/(?=[+-])/).map(function (t) { return t.trim(); }).filter(Boolean);
    var X = 0, Y = 0, C = 0;
    toks.forEach(function (t) { var r = parseTerm(t); if (r.v === 'x') X += r.c; else if (r.v === 'y') Y += r.c; else C += r.c; });
    return { X: X, Y: Y, C: C };
  }
  function fmt(n) { if (!isFinite(n)) return '0'; return String(Math.round(n * 100) / 100); }
  function lineAnswer(q) {
    if (!q || q.type !== 'mcq') return null;
    var entry = (window.TD_TEXT || {})[q.id];
    var c = entry ? entry.choices : null;
    if (!c) return null;
    var txt = c[q.answer];
    if (!txt || !isLineEquation(txt)) return null;
    var parts = norm(txt).split('=');
    var L = parseSide(parts[0]), R = parseSide(parts[1]);
    var A = L.X - R.X, B = L.Y - R.Y, Cc = R.C - L.C;
    if (Math.abs(A) < 1e-9 && Math.abs(B) < 1e-9) return null;
    var m, b, vertical = false, xval = null;
    if (Math.abs(B) > 1e-9) { m = -A / B; b = Cc / B; }
    else { if (Math.abs(A) < 1e-9) return null; vertical = true; xval = Cc / A; }
    return buildSvg({ m: m, b: b, vertical: vertical, xval: xval });
  }
  function clip(p1, p2) {
    var xmin = -10, xmax = 10, ymin = -10, ymax = 10;
    var x1 = p1[0], y1 = p1[1], x2 = p2[0], y2 = p2[1];
    var dx = x2 - x1, dy = y2 - y1, t0 = 0, t1 = 1;
    function edge(pp, qq) {
      if (pp === 0) { if (qq < 0) return false; return true; }
      var r = qq / pp;
      if (pp < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
      else { if (r < t0) return false; if (r < t1) t1 = r; }
      return true;
    }
    if (!edge(-dx, x1 - xmin)) return null;
    if (!edge(dx, xmax - x1)) return null;
    if (!edge(-dy, y1 - ymin)) return null;
    if (!edge(dy, ymax - y1)) return null;
    return [[x1 + t0 * dx, y1 + t0 * dy], [x1 + t1 * dx, y1 + t1 * dy]];
  }
  function px(x) { return 160 + x * 16; }
  function py(y) { return 160 - y * 16; }
  function buildSvg(o) {
    var out = [];
    out.push('<svg class="td-linesvg" viewBox="0 0 320 320" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="graph of the line">');
    for (var i = -10; i <= 10; i++) {
      var gx = px(i), gy = py(i);
      out.push('<line x1="' + gx + '" y1="0" x2="' + gx + '" y2="320" stroke="' + GRID + '" stroke-width="1"/>');
      out.push('<line x1="0" y1="' + gy + '" x2="320" y2="' + gy + '" stroke="' + GRID + '" stroke-width="1"/>');
    }
    out.push('<line x1="0" y1="' + py(0) + '" x2="320" y2="' + py(0) + '" stroke="' + INK + '" stroke-width="1.5"/>');
    out.push('<line x1="' + px(0) + '" y1="0" x2="' + px(0) + '" y2="320" stroke="' + INK + '" stroke-width="1.5"/>');
    var seg = null;
    if (o.vertical) { if (o.xval >= -10 && o.xval <= 10) seg = [[o.xval, -10], [o.xval, 10]]; }
    else { seg = clip([-10, o.m * -10 + o.b], [10, o.m * 10 + o.b]); }
    if (seg) {
      out.push('<line x1="' + px(seg[0][0]).toFixed(2) + '" y1="' + py(seg[0][1]).toFixed(2) +
        '" x2="' + px(seg[1][0]).toFixed(2) + '" y2="' + py(seg[1][1]).toFixed(2) +
        '" stroke="' + ACCENT + '" stroke-width="2.5"/>');
    }
    function dot(x, y) { if (x < -10 || x > 10 || y < -10 || y > 10) return; out.push('<circle cx="' + px(x).toFixed(2) + '" cy="' + py(y).toFixed(2) + '" r="3.2" fill="' + ACCENT + '"/>'); }
    function label(x, y, s, dx, dy) { if (x < -10 || x > 10 || y < -10 || y > 10) return; out.push('<text x="' + (px(x) + dx) + '" y="' + (py(y) + dy) + '" font-size="10" fill="' + INK + '" font-family="' + FONT + '">' + esc(s) + '</text>'); }
    if (o.vertical) { if (o.xval >= -10 && o.xval <= 10) label(o.xval, 0, '(' + fmt(o.xval) + ', 0)', 6, -6); dot(o.xval, 0); }
    else {
      if (o.b >= -10 && o.b <= 10) { dot(0, o.b); label(0, o.b, '(0, ' + fmt(o.b) + ')', 6, -6); }
      if (Math.abs(o.m) > 1e-9) { var xi = -o.b / o.m; if (xi >= -10 && xi <= 10) { dot(xi, 0); label(xi, 0, '(' + fmt(xi) + ', 0)', 6, 14); } }
    }
    out.push('</svg>');
    return out.join('');
  }
  function hasLine(q) { return !!lineAnswer(q); }

  /* =====================================================================
     CHOICE GRAPHS — a coordinate plane drawn for an answer CHOICE.
     Used for graph-choice questions (e.g. "which graph represents ...").
     Driven by window.TD_CHOICE_GRAPHS[qid] = { A: {kind, ...}, ... }.
     kinds:
       line      {xInt, yInt}                    -> straight line
       expDecay  {yInt}                          -> decreasing exponential
       expGrowth {yInt}                          -> increasing exponential
       cubic     {roots:[...], sign:+1|-1}       -> cubic S-curve
     The grid is always a positive quadrant (axes 0..N) unless a spec sets
     xmin/xmax/ymin/ymax. Rendered as high-definition SVG, never a scan.
     ===================================================================== */
  function choiceGraph(q, letter) {
    var specs = window.TD_CHOICE_GRAPHS || {};
    var s = specs[q.id] && specs[q.id][letter];
    if (!s) return '';
    /* 新形态：选项图直接写成完整坐标平面 spec（x/y 轴定义 + series），
       交给正式图的 chart() 渲染器 —— 刻度、原点 O、轴箭头、越界裁切
       都和题目大图同一套几何，不再用早期那套 300×300 的简化画法。 */
    if (s.x && s.y) {
      var cspec = { w: s.w || 340, h: s.h || 320, padL: (s.padL != null ? s.padL : 38), padR: 26,
        padT: 22, padB: (s.padB != null ? s.padB : 34), yTitleX: s.yTitleX,
        x: s.x, y: s.y, grid: s.grid !== false, origin: 'O', axesAt: 'zero',
        axisLabelsEnd: (s.axisLabelsEnd != null ? s.axisLabelsEnd : true), yLabelPad: (s.yLabelPad != null ? s.yLabelPad : 13),
        series: s.series || [], marks: s.marks || [] };
      var svg = chart(cspec);
      svg = svg.replace(/^<div class="td-figure td-figure--svg">/, '').replace(/<\/div>$/, '')
        .replace('class="td-figsvg"', 'class="td-figsvg td-choicesvg"');
      return '<div class="td-choicegraph">' + svg + '</div>';
    }
    var G = 300, pad = 28;                      // canvas 300x300, pad for labels
    var xmin = s.xmin != null ? s.xmin : 0, xmax = s.xmax != null ? s.xmax : 10;
    var ymin = s.ymin != null ? s.ymin : 0, ymax = s.ymax != null ? s.ymax : 10;
    function X(x) { return pad + (x - xmin) / (xmax - xmin) * (G - pad * 2); }
    function Y(y) { return G - pad - (y - ymin) / (ymax - ymin) * (G - pad * 2); }
    var out = [];
    out.push('<svg class="td-choicesvg" viewBox="0 0 300 300" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="graph option ' + letter + '">');
    // grid + axes
    var i;
    for (i = 0; i <= (xmax - xmin); i++) {
      var gx = X(xmin + i);
      out.push('<line x1="' + gx + '" y1="' + Y(ymin) + '" x2="' + gx + '" y2="' + Y(ymax) + '" stroke="' + GRID + '" stroke-width="1"/>');
    }
    for (i = 0; i <= (ymax - ymin); i++) {
      var gy = Y(ymin + i);
      out.push('<line x1="' + X(xmin) + '" y1="' + gy + '" x2="' + X(xmax) + '" y2="' + gy + '" stroke="' + GRID + '" stroke-width="1"/>');
    }
    out.push('<line x1="' + X(xmin) + '" y1="' + Y(0) + '" x2="' + X(xmax) + '" y2="' + Y(0) + '" stroke="' + INK + '" stroke-width="1.6"/>');
    out.push('<line x1="' + X(0) + '" y1="' + Y(ymin) + '" x2="' + X(0) + '" y2="' + Y(ymax) + '" stroke="' + INK + '" stroke-width="1.6"/>');
    function curve(kind) {
      var pts = [], t;
      if (kind === 'line' && s.xInt != null && s.yInt != null) {
        pts = [[X(s.xInt), Y(0)], [X(0), Y(s.yInt)]];
      } else if (kind === 'expDecay') {
        for (t = 0; t <= xmax; t += 0.2) {
          var y = (s.yInt || 10) * Math.pow(0.5, t / 2.2);
          pts.push([X(t), Y(Math.max(y, 0.02))]);
        }
      } else if (kind === 'expGrowth') {
        for (t = 0; t <= xmax; t += 0.2) {
          pts.push([X(t), Y(Math.min((s.yInt || 1) * Math.pow(2, t / 2.2), ymax))]);
        }
      } else if (kind === 'cubic') {
        var roots = s.roots || [-5, 7], sign = s.sign || 1;
        var a = roots[0], c = roots[roots.length - 1];
        for (t = a - 1; t <= c + 1; t += 0.15) {
          var v = sign;
          roots.forEach(function (r) { v *= (t - r); });
          // normalize so it fits the view
          pts.push([X(t), Y(ymin + (ymax - ymin) / 2 + v / 800 * (ymax - ymin))]);
        }
      }
      if (pts.length < 2) return '';
      var d = 'M ' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
      for (var k = 1; k < pts.length; k++) d += ' L ' + pts[k][0].toFixed(1) + ' ' + pts[k][1].toFixed(1);
      out.push('<path d="' + d + '" fill="none" stroke="' + ACCENT + '" stroke-width="2.4" stroke-linecap="round"/>');
    }
    curve(s.kind);
    out.push('</svg>');
    return '<div class="td-choicegraph">' + out.join('') + '</div>';
  }

  /* 原书把选项表印成横排（第一行变量名 + 自变量值、第二行函数名 + 函数值）的题：
     TD-11-22（P14 · 1.1 #22）印 x｜0｜5｜10 / y｜14｜21｜28；
     TD-33-13（P171 · 3.3 #13）印 x｜−1｜0｜1 / q(x)｜7｜21｜63。
     其余表格选项题（如 TD-15-06）原书是 x｜y 竖排两列，不受影响。
     页面可覆盖 window.TD_CHOICE_TABLE_TRANSPOSED 来增加/撤销。 */
  var TRANSPOSED_TABLES = { 'TD-11-22': true, 'TD-33-13': true };

  /* 四个选项都是小表格时，默认 A/C 上排、B/D 下排（练习册 P126 #14 就是这样印的）；
     但 03 册 P121 #14（R03-134）同一道题原书是把 A/B/C/D 四张表**纵向堆叠**，
     这张走单列，故列入 STACK 白名单。 */
  window.TD_CHOICE_TABLE_STACK = window.TD_CHOICE_TABLE_STACK || { 'R03-134': true };

  /* 选择题里的「小表格 / 联立方程组」选项：
     原书这几个选项是排成表格（表头 x｜y 或 x｜q(x)）或带大括号的方程组，
     题库里只能存成一行串（"x: 0, 5, 10; y: 14, 21, 28"、"x=3,y=21; x=5,y=47; ..."、
     "c = 3m; c + m = 28"）。直接印成一行既不像原题，也不好读。这里按串的形状
     还原成真正的表格 / 联立式，做不到就原样退回 fmtMath。 */
  function fmtChoice(raw, id) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return fmtMath(raw);
    var t = s.replace(/\s*(?:→|->)\s*/g, '; ');
    var parts = t.split(';').map(function (x) { return x.trim(); }).filter(Boolean);
    if (parts.length < 2) return fmtMath(raw);

    /* 形状 1：成对的 "x=3,y=21" / "3, 21" 三段式 */
    var pairRe = /^([A-Za-z][A-Za-z0-9()\^\{\}\s]*?)\s*=\s*([^,;]+?)\s*,\s*([A-Za-z][A-Za-z0-9()\^\{\}\s]*?)\s*=\s*([^,;]+)$/;
    if (parts.every(function (p) { return pairRe.test(p); })) {
      var h1 = '', h2 = '', rowsB = [], okB = true;
      parts.forEach(function (p) {
        var m = pairRe.exec(p);
        if (!h1) { h1 = m[1].trim(); h2 = m[3].trim(); }
        if (m[1].trim() !== h1 || m[3].trim() !== h2) okB = false;
        rowsB.push([m[2].trim(), m[4].trim()]);
      });
      if (okB) return tableHtml(h1, h2, rowsB);
    }

    /* 形状 2：两段 "x: 0, 5, 10" / "y: 14, 21, 28" */
    var labRe = /^([A-Za-z][A-Za-z0-9()\^\{\}\s]*?)\s*[:：]\s*(.+)$/;
    if (parts.length === 2 && labRe.test(parts[0]) && labRe.test(parts[1])) {
      var m1 = labRe.exec(parts[0]), m2 = labRe.exec(parts[1]);
      var xs = m1[2].split(',').map(function (v) { return v.trim(); });
      var ys = m2[2].split(',').map(function (v) { return v.trim(); });
      if (xs.length === ys.length && xs.length >= 2) {
        /* 原书有几道题的表是「横排」：表头一行是变量名 + 各自变量值，第二行才是函数值
           （TD-11-22 印 x｜0｜5｜10 上、y｜14｜21｜28 下；TD-33-13 印 x｜−1｜0｜1 上、
           q(x)｜7｜21｜63 下）。这类题按 TD_CHOICE_TABLE_TRANSPOSED 白名单横排还原，
           其余题仍是 x｜y 竖排两列。 */
        var tset = window.TD_CHOICE_TABLE_TRANSPOSED || TRANSPOSED_TABLES;
        if (id && tset[id]) return tableHtmlH(m1[1].trim(), m2[1].trim(), xs, ys);
        var rowsA = xs.map(function (v, i) { return [v, ys[i]]; });
        return tableHtml(m1[1].trim(), m2[1].trim(), rowsA);
      }
    }

    /* 形状 3：两段方程（原书带大括号的联立式） */
    var eqRe = /^[^=]+=[^=]+$/;
    if (parts.length === 2 && parts.every(function (p) { return eqRe.test(p); })) {
      return '<span class="td-choice-system"><span class="td-choice-brace" aria-hidden="true"></span>' +
        '<span class="td-choice-system-lines">' +
        '<span class="td-choice-eq">' + fmtMath(parts[0]) + '</span>' +
        '<span class="td-choice-eq">' + fmtMath(parts[1]) + '</span>' +
        '</span></span>';
    }
    return fmtMath(raw);
  }

  /* 横排表：第一行 = 变量名 + 一排自变量值，第二行 = 函数名 + 一排函数值 */
  function tableHtmlH(h1, h2, xs, ys) {
    var html = '<table class="td-choice-table td-choice-table--h"><thead><tr><th>' + fmtMath(h1) + '</th>';
    xs.forEach(function (v) { html += '<th>' + fmtMath(v) + '</th>'; });
    html += '</tr></thead><tbody><tr><td class="td-choice-table-hlab">' + fmtMath(h2) + '</td>';
    ys.forEach(function (v) { html += '<td>' + fmtMath(v) + '</td>'; });
    return html + '</tr></tbody></table>';
  }

  function tableHtml(h1, h2, rows) {
    var html = '<table class="td-choice-table"><thead><tr><th>' + fmtMath(h1) + '</th><th>' + fmtMath(h2) +
      '</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr><td>' + fmtMath(r[0]) + '</td><td>' + fmtMath(r[1]) + '</td></tr>';
    });
    return html + '</tbody></table>';
  }

  window.TD_FIG = { showFigure: showFigure, lineAnswer: lineAnswer, hasLine: hasLine, fmtMath: fmtMath, fmtChoice: fmtChoice, choiceGraph: choiceGraph, chart: chart, get TD_CHOICE_TABLE_STACK() { return window.TD_CHOICE_TABLE_STACK; } };
})();
