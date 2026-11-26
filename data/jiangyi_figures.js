/* 讲义复习 — 矢量图 spec + 自带渲染器。
   为什么不复用 figures.js：本板块要的轴样式（轴在原点交叉、箭头尖端落在框边、
   x/y 印在箭头旁、原点写 O）和 chart() 的默认形态不同，且 figures.js 正被其他人改，
   这里保持独立，避免打架。所有图形由本文件从几何参数现算，无任何扫描裁图。

   全局：window.JY_FIG.specs[id]、window.JY_FIG.render(id) -> '<svg …>'。
   spec 形态：
     {type:'plane', w, h, x:{min,max,step,labels}, y:{...}, lines:[{m,b,x0,x1}],
      curves:[{kind:'poly',coef:[…]}|{kind:'rat',a,h,c}|{kind:'exp',a,b,c}], noGrid:true}
     {type:'quad',  w, h, panels:{A:{…plane}, B:…, C:…, D:…}, cols:2}
   线的画法统一用 y = m*x + b，x 只画在 [x0, x1]，这样和原书「线穿出网格」一致。 */

(function () {
  var UID = 0, INK = '#26313F', GRID = '#D7DEE7', LAB = '#4A5563', LINE = '#1C2634';

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  // 用半平面裁多边形：保留 y-mx-b <= 0（below）或 >= 0（above）的部分
  function clipHalf(poly, m, b, side) {
    var keep = [], i, p, q, f0, f1, t;
    function f(p) { return p[1] - (m * p[0] + b); }
    for (i = 0; i < poly.length; i++) {
      p = poly[i]; q = poly[(i + 1) % poly.length];
      f0 = side === 'above' ? -f(p) : f(p);
      f1 = side === 'above' ? -f(q) : f(q);
      if (f0 <= 1e-9) keep.push(p);
      if ((f0 < -1e-9 && f1 > 1e-9) || (f0 > 1e-9 && f1 < -1e-9)) {
        t = f0 / (f0 - f1);
        keep.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
    return keep;
  }

  function plane(o) {
    var W = o.w, H = o.h, ml = 46, mr = 38, mt = 24, mb = 40;
    var x0 = o.x.min, x1 = o.x.max, y0 = o.y.min, y1 = o.y.max;
    var pw = W - ml - mr, ph = H - mt - mb;
    function X(v) { return ml + (v - x0) / (x1 - x0) * pw; }
    function Y(v) { return mt + (y1 - v) / (y1 - y0) * ph; }
    var g = [], i;
    // noGrid：原书有些「形状题」只画十字轴、不带网格（p142 #21 的四张选项图就是），
    // 网格是底纹不是信息，缺了就少画，别拿网格凑版式。
    if (!o.noGrid) {
      var xs = o.x.step || 1, ys = o.y.step || 1;
      for (i = Math.ceil(x0 / xs) * xs; i <= x1 + 1e-9; i += xs)
        g.push('<line x1="' + X(i).toFixed(1) + '" y1="' + Y(y0) + '" x2="' + X(i).toFixed(1) + '" y2="' + Y(y1) + '" stroke="' + GRID + '"/>');
      for (i = Math.ceil(y0 / ys) * ys; i <= y1 + 1e-9; i += ys)
        g.push('<line x1="' + X(x0) + '" y1="' + Y(i).toFixed(1) + '" x2="' + X(x1) + '" y2="' + Y(i).toFixed(1) + '" stroke="' + GRID + '"/>');
    }

    // 轴（x=0 / y=0），尖端落在框边
    var axY = (x0 <= 0 && 0 <= x1), axX = (y0 <= 0 && 0 <= y1);
    var ax = [];
    if (axX) ax.push('<line x1="' + X(x0) + '" y1="' + Y(0) + '" x2="' + (X(x1) - 6) + '" y2="' + Y(0) + '" stroke="' + INK + '" stroke-width="1.7"/>',
                     '<path d="M ' + X(x1) + ' ' + Y(0) + ' L ' + (X(x1) - 9) + ' ' + (Y(0) - 3.2) + ' L ' + (X(x1) - 9) + ' ' + (Y(0) + 3.2) + ' Z" fill="' + INK + '"/>');
    if (axY) ax.push('<line x1="' + X(0) + '" y1="' + Y(y0) + '" x2="' + X(0) + '" y2="' + (Y(y1) + 6) + '" stroke="' + INK + '" stroke-width="1.7"/>',
                     '<path d="M ' + X(0) + ' ' + Y(y1) + ' L ' + (X(0) - 3.2) + ' ' + (Y(y1) + 9) + ' L ' + (X(0) + 3.2) + ' ' + (Y(y1) + 9) + ' Z" fill="' + INK + '"/>');
    // x / y 字母：印在箭头外侧，别和刻度抢位置
    var lbl = [];
    if (axX) lbl.push('<text x="' + (X(x1) + 9) + '" y="' + (Y(0) + 5) + '" font-size="13" font-style="italic" fill="' + INK + '">x</text>');
    if (axY) lbl.push('<text x="' + (X(0) + 6) + '" y="' + (Y(y1) - 8) + '" font-size="13" font-style="italic" fill="' + INK + '">y</text>');
    if (o.originO) lbl.push('<text x="' + (X(0) - 4) + '" y="' + (Y(0) + 15) + '" font-size="12" fill="' + LAB + '" text-anchor="end">' + (o.originText || 'O') + '</text>');

    // 刻度标签（只标 o.x.labels / o.y.labels 给的数）
    var tl = [];
    (o.x.labels || []).forEach(function (v) {
      if (v === 0 && o.originO) return;
      var dx = (v === 0) ? -13 : 0;
      tl.push('<text x="' + (X(v) + dx) + '" y="' + (Y(0) + 16) + '" font-size="12" fill="' + LAB + '" text-anchor="middle" stroke="#fff" stroke-width="2.5" paint-order="stroke fill">' + esc(v) + '</text>');
    });
    (o.y.labels || []).forEach(function (v) {
      tl.push('<text x="' + (X(0) - 9) + '" y="' + (Y(v) + 4.5) + '" font-size="12" fill="' + LAB + '" text-anchor="end" stroke="#fff" stroke-width="2.5" paint-order="stroke fill">' + esc(v) + '</text>');
    });

    // 线段
    var ln = [];
    (o.lines || []).forEach(function (s) {
      var p = [[s.x0, s.m * s.x0 + s.b], [s.x1, s.m * s.x1 + s.b]];
      ln.push('<line x1="' + X(p[0][0]).toFixed(1) + '" y1="' + Y(p[0][1]).toFixed(1) + '" x2="' + X(p[1][0]).toFixed(1) + '" y2="' + Y(p[1][1]).toFixed(1) + '" stroke="' + LINE + '" stroke-width="2.3" stroke-linecap="round"' + (s.dash ? ' stroke-dasharray="7 5"' : '') + '/>');
    });

    // 不等式阴影：把画框多边形按半平面裁掉，得到 y <= mx+b / y >= mx+b 的区域
    var shd = [];
    if (o.shade && o.shade.length) {
      var poly = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      o.shade.forEach(function (sp) { poly = clipHalf(poly, sp.m, sp.b, sp.side); });
      if (poly.length >= 3) {
        shd.push('<polygon points="' + poly.map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' ') + '" fill="#DCE1E8"/>');
      }
    }

    // 函数曲线（3.4 起用）：本节整节都是「图形长什么样」，平面里必须能画曲线。
    // kind:'poly' 给系数（从高次到常数，Horner 求值）；kind:'rat' 是 a/(x-h)+c；
    // kind:'exp' 是 a*b^x+c。采样点全交给 clipPath 裁，跑出画框不会污染别处。
    (o.curves || []).forEach(function (c) {
      var n = c.n || 320, xa = (c.x0 === undefined ? x0 : c.x0), xb = (c.x1 === undefined ? x1 : c.x1);
      var pts = [], k, xx, yy, j;
      for (k = 0; k <= n; k++) {
        xx = xa + (xb - xa) * k / n;
        if (c.kind === 'poly') { yy = 0; for (j = 0; j < c.coef.length; j++) yy = yy * xx + c.coef[j]; }
        else if (c.kind === 'rat') yy = c.a / (xx - c.h) + (c.c || 0);
        else if (c.kind === 'exp') yy = c.a * Math.pow(c.b, xx) + (c.c || 0);
        if (isFinite(yy)) pts.push(X(xx).toFixed(1) + ',' + Y(yy).toFixed(1));
      }
      if (pts.length > 1) ln.push('<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + LINE + '" stroke-width="' + (c.width || 2.1) + '" stroke-linecap="round"/>');
    });

    // 标点：原书用实心圆点把「关键点」钉出来（p18 #11 的两个点）
    (o.dots || []).forEach(function (d) {
      ln.push('<circle cx="' + X(d[0]).toFixed(1) + '" cy="' + Y(d[1]).toFixed(1) + '" r="3.4" fill="' + LINE + '"/>');
    });

    // 线一律裁到画框内，防止穿出网格（原书里线也是被框住的）
    UID++;
    var clip = '<clipPath id="jcp' + UID + '"><rect x="' + (X(x0) - 2) + '" y="' + (Y(y1) - 2) + '" width="' + (pw + 4) + '" height="' + (ph + 4) + '"/></clipPath>';
    var body = clip + '<g clip-path="url(#jcp' + UID + ')">' + shd.join('') + g.join('') + ln.join('') + ax.join('') + '</g>' + lbl.join('') + tl.join('');
    return { w: W, h: H, body: body };
  }

  // 纯几何图（4.1 起用）：坐标直接用画布像素，只画线段、起点圆点、文字标注。
  // 平行线截角、三角形、圆这类图没有 x-y 轴，套 plane 会白送一堆无关网格；
  // 线段取 [x1,y1],[x2,y2]，第三个元素给 'dash' 就画虚线。
  // labels 里 x/y 是文字的锚点，anchor 默认 start，t 里的 ° 原样吃。
  function geo(o) {
    var W = o.w, H = o.h, g = [];
    (o.segs || []).forEach(function (s) {
      g.push('<line x1="' + s[0][0] + '" y1="' + s[0][1] + '" x2="' + s[1][0] + '" y2="' + s[1][1] + '" stroke="' + LINE + '" stroke-width="' + (o.sw || 1.8) + '"' + (s[2] === 'dash' ? ' stroke-dasharray="7 5"' : '') + '/>');
    });
    (o.dots || []).forEach(function (d) {
      g.push('<circle cx="' + d[0] + '" cy="' + d[1] + '" r="' + (o.dotR || 3) + '" fill="' + LINE + '"/>');
    });
    // 直角符号：给两条边的单位方向 a / b，在顶点处画一个小方框（原书 p161 #12 的 ⊥ 标）
    (o.rights || []).forEach(function (r) {
      var L = r.len || 12, ax = r.a[0] * L, ay = r.a[1] * L, bx = r.b[0] * L, by = r.b[1] * L;
      g.push('<polyline points="' + [r.x + ax, r.y + ay, r.x + ax + bx, r.y + ay + by, r.x + bx, r.y + by].map(function (v, k) { return k % 2 ? v.toFixed(1) : v.toFixed(1); }).join(' ').replace(/ /g, ' ') + '" fill="none" stroke="' + LAB + '" stroke-width="1.2"/>');
    });
    // 圆弧：单位圆这种图只有线画不了。角度按数学约定（0° 指 +x，逆时针为正），
    // 屏幕 y 向下所以 sin 取负号。a0/a1 给度数，dash 可选。
    (o.arcs || []).forEach(function (a) {
      var cx = a.cx, cy = a.cy, r = a.r;
      var t0 = a.a0 * Math.PI / 180, t1 = a.a1 * Math.PI / 180;
      var x0 = cx + r * Math.cos(t0), y0 = cy - r * Math.sin(t0);
      var x1 = cx + r * Math.cos(t1), y1 = cy - r * Math.sin(t1);
      var large = Math.abs(a.a1 - a.a0) > 180 ? 1 : 0;
      var sweep = a.a1 >= a.a0 ? 0 : 1;
      g.push('<path d="M ' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' A ' + r + ' ' + r + ' 0 ' + large + ' ' + sweep + ' ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + '" fill="none" stroke="' + LINE + '" stroke-width="' + (a.sw || o.sw || 1.6) + '"' + (a.dash ? ' stroke-dasharray="7 5"' : '') + '/>');
    });
    // 弧与弦围成的「月牙」：先沿线画弧再回原点的闭合路径，用来给 4.5 #6 那块阴影上色
    (o.arcFills || []).forEach(function (a) {
      var cx = a.cx, cy = a.cy, r = a.r;
      var t0 = a.a0 * Math.PI / 180, t1 = a.a1 * Math.PI / 180;
      var x0 = (cx + r * Math.cos(t0)).toFixed(1), y0 = (cy - r * Math.sin(t0)).toFixed(1);
      var x1 = (cx + r * Math.cos(t1)).toFixed(1), y1 = (cy - r * Math.sin(t1)).toFixed(1);
      var large = Math.abs(a.a1 - a.a0) > 180 ? 1 : 0;
      var sweep = a.a1 >= a.a0 ? 0 : 1;
      g.push('<path d="M ' + x0 + ' ' + y0 + ' A ' + r + ' ' + r + ' 0 ' + large + ' ' + sweep + ' ' + x1 + ' ' + y1 + ' Z" fill="' + (a.fill || '#C9D2DC') + '" fill-opacity="0.45" stroke="' + LINE + '" stroke-width="' + (a.sw || 1.2) + '"/>');
    });
    (o.labels || []).forEach(function (t) {
      g.push('<text x="' + t.x + '" y="' + t.y + '" font-size="' + (t.size || 14) + '" fill="' + (t.fill || INK) + '"' +
        (t.italic ? ' font-style="italic"' : '') + ' text-anchor="' + (t.anchor || 'start') + '">' + esc(t.t) + '</text>');
    });
    return { w: W, h: H, body: g.join('') };
  }

  // 只画十字轴 + 四个象限标号（原书 p34 #5 的图就是这样）
  function quadrants(o) {
    var W = o.w, H = o.h, cx = W / 2, cy = H / 2, m = 26;
    var g = ['<line x1="' + m + '" y1="' + cy + '" x2="' + (W - m) + '" y2="' + cy + '" stroke="' + INK + '" stroke-width="1.4"/>',
             '<line x1="' + cx + '" y1="' + (H - m) + '" x2="' + cx + '" y2="' + m + '" stroke="' + INK + '" stroke-width="1.4"/>',
             '<path d="M ' + (W - m) + ' ' + cy + ' L ' + (W - m - 8) + ' ' + (cy - 3) + ' L ' + (W - m - 8) + ' ' + (cy + 3) + ' Z" fill="' + INK + '"/>',
             '<path d="M ' + cx + ' ' + m + ' L ' + (cx - 3) + ' ' + (m + 8) + ' L ' + (cx + 3) + ' ' + (m + 8) + ' Z" fill="' + INK + '"/>',
             '<text x="' + (W - m + 6) + '" y="' + (cy + 14) + '" font-size="13" font-style="italic" fill="' + INK + '">x</text>',
             '<text x="' + (cx + 7) + '" y="' + (m + 2) + '" font-size="13" font-style="italic" fill="' + INK + '">y</text>',
             '<text x="' + (cx + 34) + '" y="' + (cy - 16) + '" font-size="14" fill="' + INK + '">I</text>',
             '<text x="' + (cx - 54) + '" y="' + (cy - 16) + '" font-size="14" fill="' + INK + '">II</text>',
             '<text x="' + (cx - 58) + '" y="' + (cy + 30) + '" font-size="14" fill="' + INK + '">III</text>',
             '<text x="' + (cx + 40) + '" y="' + (cy + 30) + '" font-size="14" fill="' + INK + '">IV</text>'];
    return { w: W, h: H, body: g.join('') };
  }


  // 散点图 / 统计图表（2.2 起用）：网格可只画横线（原书 p47/p51 就是这种），
  // 刻度可给成「数值 + 显示串」（千分位 5,000）并可斜排，支持图表标题、轴标题、
  // 拟合直线 y = m*x + b、二次模型曲线、以及任意折线路径（p52 的曲线）。
  function scatter(o) {
    var W = o.w, H = o.h;
    var ml = o.ml || 68, mr = o.mr || 34;
    var mb = o.mb || (o.xTitle ? 52 : 36), mt = o.mt || (o.title ? 40 : 26);
    var xmin = o.x.min, xmax = o.x.max, ymin = o.y.min, ymax = o.y.max;
    var pw = W - ml - mr, ph = H - mt - mb;
    function X(v) { return ml + (v - xmin) / (xmax - xmin) * pw; }
    function Y(v) { return mt + (ymax - v) / (ymax - ymin) * ph; }
    function txt(v) {
      if (o.xText && o.xText[String(v)] !== undefined) return o.xText[String(v)];
      return String(v);
    }
    function lt(prefix, v) {
      var d = (prefix === 'x' ? o.xText : o.yText) || {};
      return d[String(v)] !== undefined ? d[String(v)] : String(v);
    }
    var g = [], i, xs = o.x.step || 1, ys = o.y.step || 1;
    var grid = o.grid || 'both';
    if (grid !== 'y') {
      for (i = Math.ceil(xmin / xs) * xs; i <= xmax + 1e-9; i += xs)
        g.push('<line x1="' + X(i).toFixed(1) + '" y1="' + Y(ymin) + '" x2="' + X(i).toFixed(1) + '" y2="' + Y(ymax) + '" stroke="' + GRID + '"/>');
    }
    if (grid !== 'x') {
      for (i = Math.ceil(ymin / ys) * ys; i <= ymax + 1e-9; i += ys)
        g.push('<line x1="' + X(xmin) + '" y1="' + Y(i).toFixed(1) + '" x2="' + X(xmax) + '" y2="' + Y(i).toFixed(1) + '" stroke="' + GRID + '"/>');
    }
    // 框线：原书统计图四边都有细框
    var fr = '<rect x="' + X(xmin).toFixed(1) + '" y="' + Y(ymax).toFixed(1) + '" width="' + pw + '" height="' + ph + '" fill="none" stroke="' + INK + '" stroke-width="1.1"/>';
    // 轴箭头：x 向右、y 向上，都落在框边
    var ax = '';
    ax += '<path d="M ' + (X(xmax) + 9) + ' ' + Y(ymin) + ' L ' + (X(xmax) + 1) + ' ' + (Y(ymin) - 3.4) + ' L ' + (X(xmax) + 1) + ' ' + (Y(ymin) + 3.4) + ' Z" fill="' + INK + '"/>';
    ax += '<path d="M ' + X(xmin) + ' ' + (Y(ymax) - 9) + ' L ' + (X(xmin) - 3.4) + ' ' + (Y(ymax) - 1) + ' L ' + (X(xmin) + 3.4) + ' ' + (Y(ymax) - 1) + ' Z" fill="' + INK + '"/>';
    ax += '<text x="' + (X(xmax) + 12) + '" y="' + (Y(ymin) + 9) + '" font-size="13" font-style="italic" fill="' + INK + '">x</text>';
    ax += '<text x="' + (X(xmin) - 1) + '" y="' + (Y(ymax) - 13) + '" font-size="13" font-style="italic" fill="' + INK + '">y</text>';
    if (o.originO) ax += '<text x="' + (X(xmin) - 4) + '" y="' + (Y(ymin) - 6) + '" font-size="12" fill="' + LAB + '" text-anchor="end">O</text>';
    // 刻度：x 在轴下、y 在轴左；o.xRotate 时斜排
    var tl = [];
    (o.x.labels || []).forEach(function (v) {
      var xx = X(v).toFixed(1), yy = (Y(ymin) + 16);
      var t = '<text x="' + xx + '" y="' + yy + '" font-size="11.5" fill="' + LAB + '" text-anchor="' + (o.xRotate ? 'end' : 'middle') + '"' +
        (o.xRotate ? ' transform="rotate(-42 ' + xx + ' ' + yy + ')"' : '') + '>' + esc(lt('x', v)) + '</text>';
      tl.push(t);
    });
    (o.y.labels || []).forEach(function (v) {
      tl.push('<text x="' + (X(xmin) - 6) + '" y="' + (Y(v) + 4) + '" font-size="11.5" fill="' + LAB + '" text-anchor="end">' + esc(lt('y', v)) + '</text>');
    });
    // 标题与轴标题
    var tt = '';
    if (o.title) {
      var ti = Array.isArray(o.title) ? o.title : [o.title];
      ti.forEach(function (line, k) {
        tt += '<text x="' + (W / 2) + '" y="' + (16 + k * 15) + '" font-size="12.5" fill="' + INK + '" text-anchor="middle">' + esc(line) + '</text>';
      });
    }
    if (o.xTitle) {
      var xi = Array.isArray(o.xTitle) ? o.xTitle : [o.xTitle];
      xi.forEach(function (line, k) {
        tt += '<text x="' + (ml + pw / 2) + '" y="' + (H - 8 - (xi.length - 1 - k) * 14) + '" font-size="12" fill="' + INK + '" text-anchor="middle">' + esc(line) + '</text>';
      });
    }
    if (o.yTitle) {
      var yl = Array.isArray(o.yTitle) ? o.yTitle : [o.yTitle];
      yl.forEach(function (line, k) {
        var tx = 14 + (k - (yl.length - 1) / 2) * 13;
        var ty = mt + ph / 2;
        tt += '<text x="' + tx + '" y="' + ty + '" font-size="11.5" fill="' + INK + '" text-anchor="middle" transform="rotate(-90 ' + tx + ' ' + ty + ')">' + esc(line) + '</text>';
      });
    }
    // 点
    var dots = (o.dots || []).map(function (d) {
      return '<circle cx="' + X(d[0]).toFixed(1) + '" cy="' + Y(d[1]).toFixed(1) + '" r="' + (o.dotR || 3.5) + '" fill="' + LINE + '"/>';
    }).join('');
    // 直线
    var line = '';
    if (o.line) {
      var s0 = o.line.x0 === undefined ? xmin : o.line.x0, s1 = o.line.x1 === undefined ? xmax : o.line.x1;
      line = '<line x1="' + X(s0).toFixed(1) + '" y1="' + Y(o.line.m * s0 + o.line.b).toFixed(1) + '" x2="' + X(s1).toFixed(1) + '" y2="' + Y(o.line.m * s1 + o.line.b).toFixed(1) + '" stroke="' + LINE + '" stroke-width="1.9" stroke-linecap="round"/>';
    }
    // 二次模型曲线 / 折线路径
    var cv = '';
    if (o.curve && o.curve.a !== undefined) {
      var pts = [], n = 90;
      for (i = 0; i <= n; i++) {
        var xx2 = xmin + (xmax - xmin) * i / n, yy2 = o.curve.a * xx2 * xx2 + o.curve.b * xx2 + (o.curve.c || 0);
        if (yy2 >= ymin - 0.2 && yy2 <= ymax + 0.2) pts.push(X(xx2).toFixed(1) + ',' + Y(yy2).toFixed(1));
      }
      if (pts.length > 1) cv = '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + LINE + '" stroke-width="1.9"/>';
    } else if (o.curve && o.curve.pts) {
      var p2 = o.curve.pts.map(function (q) { return X(q[0]).toFixed(1) + ',' + Y(q[1]).toFixed(1); });
      cv = '<polyline points="' + p2.join(' ') + '" fill="none" stroke="' + LINE + '" stroke-width="1.9"/>';
    }
    UID++;
    var clip = '<clipPath id="jsc' + UID + '"><rect x="' + X(xmin) + '" y="' + Y(ymax) + '" width="' + pw + '" height="' + ph + '"/></clipPath>';
    var body = fr + clip + '<g clip-path="url(#jsc' + UID + ')">' + g.join('') + cv + line + dots + '</g>' + ax + tl.join('') + tt;
    return { w: W, h: H, body: body };
  }

  // ---------------- 2.5 起的统计图形：直方图 / 点图 / 箱线图 ----------------
  // 三种都只吃几何参数，坐标全部现算：直方图给每根柱的 [lo,hi,n]，点图给
  // [{x, n}]（n = 该值上有几个点），箱线图给 min/Q1/中位/Q3/max。
  // 多块面板（原书 p73 #5 左右两张直方图、p78 #9 上下两行点图）用 cols / rows 排。

  function statFrame(X, Y, y0, labels, labelY, tickH) {
    var out = [];
    labels.forEach(function (v) {
      out.push('<line x1="' + X(v).toFixed(1) + '" y1="' + Y(y0) + '" x2="' + X(v).toFixed(1) + '" y2="' + (Y(y0) + (tickH || 5)) + '" stroke="' + INK + '"/>',
               '<text x="' + X(v).toFixed(1) + '" y="' + (Y(y0) + labelY) + '" font-size="11.5" fill="' + LAB + '" text-anchor="middle">' + esc(v) + '</text>');
    });
    return out.join('');
  }

  function hist(o) {
    var W = o.w, H = o.h, cols = o.cols || 1, gap = o.gap || 26;
    var pw = (W - gap * (cols - 1)) / cols, ph = H - (o.xTitle ? 44 : 28) - 18;
    var out = [];
    (o.panels || []).forEach(function (p, i) {
      var ox = i * (pw + gap), oy = 16;
      var yMax = p.yMax || o.yMax || 10, yStep = p.yStep || o.yStep || 2;
      var xmin = p.xMin !== undefined ? p.xMin : o.xMin, xmax = p.xMax !== undefined ? p.xMax : o.xMax;
      function X(v) { return ox + 34 + (v - xmin) / (xmax - xmin) * (pw - 44); }
      function Y(v) { return oy + ph - v / yMax * ph; }
      var g = [];
      for (var t = 0; t <= yMax + 1e-9; t += yStep) {
        g.push('<line x1="' + (ox + 34) + '" y1="' + Y(t).toFixed(1) + '" x2="' + (ox + pw - 10) + '" y2="' + Y(t).toFixed(1) + '" stroke="' + GRID + '"/>',
               '<text x="' + (ox + 28) + '" y="' + (Y(t) + 4) + '" font-size="11.5" fill="' + LAB + '" text-anchor="end">' + t + '</text>');
      }
      (p.bars || []).forEach(function (b) {
        var x1 = X(b.lo), x2 = X(b.hi), y = Y(b.n);
        if (b.n > 0) g.push('<rect x="' + x1.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (x2 - x1).toFixed(1) + '" height="' + (Y(0) - y).toFixed(1) + '" fill="#B9BDC4" stroke="' + INK + '" stroke-width="1"/>');
        else g.push('<line x1="' + x1.toFixed(1) + '" y1="' + Y(0) + '" x2="' + x2.toFixed(1) + '" y2="' + Y(0) + '" stroke="' + INK + '" stroke-width="1"/>');
      });
      // 轴
      g.push('<line x1="' + (ox + 34) + '" y1="' + Y(0) + '" x2="' + (ox + pw - 6) + '" y2="' + Y(0) + '" stroke="' + INK + '" stroke-width="1.5"/>',
             '<line x1="' + (ox + 34) + '" y1="' + Y(0) + '" x2="' + (ox + 34) + '" y2="' + (oy + 6) + '" stroke="' + INK + '" stroke-width="1.5"/>');
      var ticks = p.ticks || o.ticks || [];
      ticks.forEach(function (v) {
        g.push('<line x1="' + X(v).toFixed(1) + '" y1="' + Y(0) + '" x2="' + X(v).toFixed(1) + '" y2="' + (Y(0) + 5) + '" stroke="' + INK + '"/>',
               '<text x="' + X(v).toFixed(1) + '" y="' + (Y(0) + 17) + '" font-size="11.5" fill="' + LAB + '" text-anchor="middle">' + esc(v) + '</text>');
      });
      if (p.title || o.title) g.push('<text x="' + (ox + pw / 2) + '" y="' + (oy - 3) + '" font-size="13" fill="' + INK + '" text-anchor="middle">' + esc(p.title || o.title) + '</text>');
      out.push(g.join(''));
    });
    var extra = '';
    if (o.yTitle) extra += '<text x="10" y="' + (H / 2) + '" font-size="12.5" fill="' + LAB + '" text-anchor="middle" transform="rotate(-90 10 ' + (H / 2) + ')">' + esc(o.yTitle) + '</text>';
    if (o.xTitle) extra += '<text x="' + (W / 2) + '" y="' + (H - 8) + '" font-size="12.5" fill="' + LAB + '" text-anchor="middle">' + esc(o.xTitle) + '</text>';
    return { w: W, h: H, body: out.join('') + extra };
  }

  function dotplot(o) {
    var W = o.w, H = o.h, title = o.title ? 26 : 8;
    var rows = o.rows || [], rowH = o.rowH || 58, labW = o.labW || 62, pitch = o.pitch || 11;
    var xmin = o.x.min, xmax = o.x.max;
    function X(v) { return labW + 8 + (v - xmin) / (xmax - xmin) * (W - labW - 26); }
    var out = [];
    if (o.title) out.push('<text x="' + (W / 2) + '" y="16" font-size="13" fill="' + INK + '" text-anchor="middle">' + esc(o.title) + '</text>');
    rows.forEach(function (r, i) {
      var base = title + i * rowH + rowH - 18;
      (r.dots || []).forEach(function (d) {
        for (var k = 0; k < (d.n || 1); k++)
          out.push('<circle cx="' + X(d.x).toFixed(1) + '" cy="' + (base - 6 - k * pitch) + '" r="3" fill="' + LINE + '"/>');
      });
      out.push('<line x1="' + (labW + 2) + '" y1="' + base + '" x2="' + (W - 10) + '" y2="' + base + '" stroke="' + INK + '" stroke-width="1.5"/>');
      if (r.label) out.push('<text x="' + (labW - 6) + '" y="' + (base + 4) + '" font-size="12" fill="' + LAB + '" text-anchor="end">' + esc(r.label) + '</text>');
    });
    // 只在最后一条基线上画刻度
    var base = title + rows.length * rowH - 18;
    (o.ticks || []).forEach(function (v) {
      out.push('<line x1="' + X(v).toFixed(1) + '" y1="' + base + '" x2="' + X(v).toFixed(1) + '" y2="' + (base + 5) + '" stroke="' + INK + '"/>',
               '<text x="' + X(v).toFixed(1) + '" y="' + (base + 17) + '" font-size="11.5" fill="' + LAB + '" text-anchor="middle">' + esc(v) + '</text>');
    });
    if (o.xTitle) out.push('<text x="' + (W / 2) + '" y="' + (base + 34) + '" font-size="12.5" fill="' + LAB + '" text-anchor="middle">' + esc(o.xTitle) + '</text>');
    return { w: W, h: H, body: out.join('') };
  }

  function boxplot(o) {
    var W = o.w, H = o.h, title = o.title ? 26 : 10;
    var rows = o.rows || [], labW = o.labW || 58;
    var xmin = o.x.min, xmax = o.x.max;
    function X(v) { return labW + 6 + (v - xmin) / (xmax - xmin) * (W - labW - 24); }
    var axisY = H - (o.xTitle ? 42 : 26);
    var out = [];
    if (o.title) out.push('<text x="' + (W / 2) + '" y="15" font-size="13" fill="' + INK + '" text-anchor="middle">' + esc(o.title) + '</text>');
    var bh = 11, top = title + 6, gap = (axisY - 12 - top) / rows.length;
    rows.forEach(function (r, i) {
      var base = top + gap * (i + 0.5);
      out.push('<line x1="' + X(r.min).toFixed(1) + '" y1="' + base + '" x2="' + X(r.q1).toFixed(1) + '" y2="' + base + '" stroke="' + LINE + '" stroke-width="1.7"/>',
               '<line x1="' + X(r.q3).toFixed(1) + '" y1="' + base + '" x2="' + X(r.max).toFixed(1) + '" y2="' + base + '" stroke="' + LINE + '" stroke-width="1.7"/>',
               '<line x1="' + X(r.min).toFixed(1) + '" y1="' + (base - 4) + '" x2="' + X(r.min).toFixed(1) + '" y2="' + (base + 4) + '" stroke="' + LINE + '" stroke-width="1.7"/>',
               '<line x1="' + X(r.max).toFixed(1) + '" y1="' + (base - 4) + '" x2="' + X(r.max).toFixed(1) + '" y2="' + (base + 4) + '" stroke="' + LINE + '" stroke-width="1.7"/>',
               '<rect x="' + X(r.q1).toFixed(1) + '" y="' + (base - bh / 2) + '" width="' + (X(r.q3) - X(r.q1)).toFixed(1) + '" height="' + bh + '" fill="none" stroke="' + LINE + '" stroke-width="1.7"/>',
               '<line x1="' + X(r.med).toFixed(1) + '" y1="' + (base - bh / 2) + '" x2="' + X(r.med).toFixed(1) + '" y2="' + (base + bh / 2) + '" stroke="' + LINE + '" stroke-width="1.7"/>');
      if (r.label) out.push('<text x="' + (labW - 6) + '" y="' + (base + 4) + '" font-size="12" fill="' + LAB + '" text-anchor="end">' + esc(r.label) + '</text>');
      (r.letters || []).forEach(function (L) {
        out.push('<text x="' + X(L.v).toFixed(1) + '" y="' + (base + bh / 2 + 16) + '" font-size="12.5" font-style="italic" fill="' + INK + '" text-anchor="middle">' + esc(L.t) + '</text>');
      });
    });
    out.push('<line x1="' + labW + '" y1="' + axisY + '" x2="' + (W - 12) + '" y2="' + axisY + '" stroke="' + INK + '" stroke-width="1.5"/>');
    (o.ticks || []).forEach(function (v) {
      out.push('<line x1="' + X(v).toFixed(1) + '" y1="' + axisY + '" x2="' + X(v).toFixed(1) + '" y2="' + (axisY + 5) + '" stroke="' + INK + '"/>',
               '<text x="' + X(v).toFixed(1) + '" y="' + (axisY + 17) + '" font-size="11.5" fill="' + LAB + '" text-anchor="middle">' + esc(v) + '</text>');
    });
    if (o.xTitle) out.push('<text x="' + (W / 2) + '" y="' + (H - 6) + '" font-size="12.5" fill="' + LAB + '" text-anchor="middle">' + esc(o.xTitle) + '</text>');
    return { w: W, h: H, body: out.join('') };
  }

  function wrap(body) {
    return '<svg viewBox="0 0 ' + body.w + ' ' + body.h + '" width="100%" preserveAspectRatio="xMidYMid meet" role="img" style="max-width:' + body.w + 'px">' + body.body + '</svg>';
  }

  function quad(o) {
    var keys = o.order || ['A', 'B', 'C', 'D'], cols = o.cols || 2, gaps = 26, labH = 18;
    var pw = o.panels.A.w, ph = o.panels.A.h;
    var W = cols * pw + (cols - 1) * gaps, rows = Math.ceil(keys.length / cols);
    var H = rows * (ph + labH) + (rows - 1) * 18;
    var out = [];
    keys.forEach(function (k, n) {
      var c = n % cols, r = Math.floor(n / cols), ox = c * (pw + gaps), oy = r * (ph + labH + 18);
      var b = plane(o.panels[k]);
      out.push('<g transform="translate(' + ox + ',' + (oy + labH) + ')">' + b.body + '</g>');
      out.push('<text x="' + ox + '" y="' + (oy + labH - 5) + '" font-size="13" fill="' + INK + '">' + k + ')</text>');
    });
    return { w: W, h: H, body: out.join('') };
  }

  var specs = {
    // p7 #1：直线过 (0,8) 与 (12,0)，x 16、y 16，网格 1，每 4 标一次
    'JY1-001': { type: 'plane', w: 470, h: 400,
      x: { min: -0.6, max: 16.4, step: 1, labels: [0, 4, 8, 12, 16] },
      y: { min: -0.6, max: 16.4, step: 1, labels: [4, 8, 12, 16] },
      lines: [{ m: -2 / 3, b: 8, x0: -0.6, x1: 13.4 }] },

    // p7 #2：6x + By = 42，B=14 -> 过 (0,3) 与 (7,0)，线穿出网格
    'JY1-002': { type: 'plane', w: 470, h: 400,
      x: { min: -0.8, max: 10.6, step: 1, labels: [0, 2, 4, 6, 8, 10] },
      y: { min: -1.4, max: 10.6, step: 1, labels: [2, 4, 6, 8, 10] },
      lines: [{ m: -3 / 7, b: 3, x0: -0.8, x1: 10.6 }] },

    // p12 #9：line k 过 (0,5) 与 (2,0)，即 y = -5/2 x + 5
    'JY1-009': { type: 'plane', w: 430, h: 420,
      x: { min: -6.6, max: 6.6, step: 1, labels: [-6, -4, -2, 2, 4, 6] },
      y: { min: -6.6, max: 7.4, step: 1, labels: [6, 4, 2, -2, -4, -6] },
      lines: [{ m: -5 / 2, b: 5, x0: -0.9, x1: 4.6 }], originO: true },

    // p18 #11：网格 -10..10，两条线：y = -(1/4)x + 4（过 (-4,5)、(8,2) 两个实心点）与 y = 2（水平线），
    // 交点正是 (8,2)。新加入的 x + 4y = -16 即 y = -(1/4)x - 4，与第一条线斜率相同、截距不同 → 无解。
    'JY1-011': { type: 'plane', w: 440, h: 430,
      x: { min: -10.2, max: 10.9, step: 1, labels: [-10, -8, -6, -4, -2, 2, 4, 6, 8, 10] },
      y: { min: -10.6, max: 10.9, step: 1, labels: [10, 8, 6, 4, 2, -2, -4, -6, -8, -10] },
      lines: [{ m: -0.25, b: 4, x0: -10.2, x1: 10.9 }, { m: 0, b: 2, x0: -10.2, x1: 10.9 }],
      dots: [[-4, 5], [8, 2]], originO: true },


    // p30 #1：5y + 3x <= 15 的四选图。原书排法是 A 左上 / C 右上 / B 左下 / D 右下。
    // 量原页 p30 四张嵌入图（xref A=3463 / B=3466 / C=3467 / D=3470）：四个图的线都是 y 截距 3、
    // |斜率| 0.60、格距 1，差别只在「升/降」和「影在哪一侧」：
    // A 降 + 影在下 = 正确图 y <= 3 - 0.6x；B 同一条线、影在上；C 升 + 影在下；D 升 + 影在上。
    'JY1-040': { type: 'quad', cols: 2, order: ['A', 'C', 'B', 'D'], panels: {
      A: { w: 320, h: 250, x: { min: -1.4, max: 5.9, step: 1, labels: [-1, 1, 2, 3, 4, 5] },
           y: { min: -1.15, max: 4.6, step: 1, labels: [1, 2, 3, 4] },
           lines: [{ m: -0.6, b: 3, x0: -1.4, x1: 5.9 }], shade: [{ m: -0.6, b: 3, side: 'below' }],
           originO: true, originText: '0' },
      B: { w: 320, h: 250, x: { min: -1.4, max: 5.9, step: 1, labels: [-1, 1, 2, 3, 4, 5] },
           y: { min: -1.15, max: 4.6, step: 1, labels: [1, 2, 3, 4] },
           lines: [{ m: -0.6, b: 3, x0: -1.4, x1: 5.9 }], shade: [{ m: -0.6, b: 3, side: 'above' }],
           originO: true, originText: '0' },
      C: { w: 320, h: 250, x: { min: -6.4, max: 1.3, step: 1, labels: [-5, -4, -3, -2, -1, 1] },
           y: { min: -1.2, max: 4.85, step: 1, labels: [1, 2, 3, 4] },
           lines: [{ m: 0.6, b: 3, x0: -6.4, x1: 1.3 }], shade: [{ m: 0.6, b: 3, side: 'below' }],
           originO: true, originText: '0' },
      D: { w: 320, h: 250, x: { min: -6.4, max: 1.3, step: 1, labels: [-5, -4, -3, -2, -1, 1] },
           y: { min: -1.2, max: 4.85, step: 1, labels: [1, 2, 3, 4] },
           lines: [{ m: 0.6, b: 3, x0: -6.4, x1: 1.3 }], shade: [{ m: 0.6, b: 3, side: 'above' }],
           originO: true, originText: '0' }
    } },

    // p31 #2：虚线 y = 1 - 4x（严格不等号所以虚线），阴影在线右上方，即 y > 1 - 4x
    'JY1-041': { type: 'plane', w: 420, h: 400,
      x: { min: -8.4, max: 8.4, step: 1, labels: [-8, -6, -4, -2, 2, 4, 6, 8] },
      y: { min: -8.4, max: 8.4, step: 1, labels: [8, 6, 4, 2, -2, -4, -6, -8] },
      lines: [{ m: -4, b: 1, x0: -8.4, x1: 8.4, dash: true }],
      shade: [{ m: -4, b: 1, side: 'above' }], originO: true },

    // p34 #5：只有十字轴 + 四个象限标号的图
    'JY1-044': { type: 'quadrants', w: 380, h: 330 },

    // p35 #6：网格 -10..10，虚线 y = x、实线 y = 4，阴影是 {y < x} 且 {y >= 4} 的那块三角形
    'JY1-045': { type: 'plane', w: 430, h: 430,
      x: { min: -10.5, max: 10.5, step: 1, labels: [-10, -8, -6, -4, -2, 2, 4, 6, 8, 10] },
      y: { min: -10.5, max: 10.5, step: 1, labels: [10, 8, 6, 4, 2, -2, -4, -6, -8, -10] },
      lines: [{ m: 1, b: 0, x0: -10.5, x1: 10.5, dash: true }, { m: 0, b: 4, x0: -10.5, x1: 10.5 }],
      shade: [{ m: 1, b: 0, side: 'below' }, { m: 0, b: 4, side: 'above' }] },

    // p9 #5：四选图，四格都是 8×8 格（格距 0.5，每 2 格 1 个单位），原点居中，只标 1。
    // 原页像素复核（400dpi 渲染逐格量）：A 斜率 -1 / y 截距 1 / x 截距 1（a=b，非法）；B 斜率 -1 /
    // y 截距 -1；D 斜率 -2 / x 截距 0.5。C 是正确图：y 截距恰为 1、x 截距 2（a=b/2），答案页 p191 亦写 C。
    'JY1-005': { type: 'quad', cols: 2, panels: {
      A: { w: 272, h: 252, x: { min: -2, max: 2, step: 0.5, labels: [1] },
           y: { min: -2, max: 2, step: 0.5, labels: [1] }, lines: [{ m: -1, b: 1, x0: -2, x1: 2 }] },
      B: { w: 272, h: 252, x: { min: -2, max: 2, step: 0.5, labels: [1] },
           y: { min: -2, max: 2, step: 0.5, labels: [1] }, lines: [{ m: -1, b: -1, x0: -2, x1: 2 }] },
      C: { w: 272, h: 252, x: { min: -2, max: 2, step: 0.5, labels: [1] },
           y: { min: -2, max: 2, step: 0.5, labels: [1] }, lines: [{ m: -0.5, b: 1, x0: -2, x1: 2 }] },
      D: { w: 272, h: 252, x: { min: -2, max: 2, step: 0.5, labels: [1] },
           y: { min: -2, max: 2, step: 0.5, labels: [1] }, lines: [{ m: -2, b: 1, x0: -2, x1: 2 }] }
    } },

    // ===== 2.2 散点图（p45–p53）：点坐标按原页 240dpi 花样量取，误差 <1 个刻度；
    // 只有原书给的方程/拟合线按印刷坐标重画，曲线按原页逐点采样。
    // p45 #1：relative housing cost vs population density，line y = 0.0125x + 61
    'JY2-014': { type: 'scatter', w: 540, h: 420,
      x: { min: 0, max: 26000, step: 5000, labels: [0, 5000, 10000, 15000, 20000, 25000] },
      xText: { '5000': '5,000', '10000': '10,000', '15000': '15,000', '20000': '20,000', '25000': '25,000' },
      y: { min: 0, max: 400, step: 50, labels: [0, 50, 100, 150, 200, 250, 300, 350, 400] },
      xTitle: ['Population density', '(people per square mile land area)'],
      yTitle: ['Relative housing cost', '(percent of national average cost)'],
      dots: [[800, 86], [2350, 78], [3000, 80], [3300, 86], [3800, 95], [3300, 211],
             [6110, 121], [7620, 245], [10540, 125], [11200, 179], [12100, 168], [15140, 308], [25000, 398]],
      line: { m: 0.0125, b: 61, x0: 0, x1: 25800 }, dotR: 3.4 },

    // p46 #2：x 0–10 每 2、y 0–20 每 4；线 y = 0.786x + 6.07（原页量线），x=5 时预测 10.0、实点 14
    'JY2-015': { type: 'scatter', w: 430, h: 400,
      x: { min: 0, max: 10, step: 2, labels: [0, 2, 4, 6, 8, 10] },
      y: { min: 0, max: 20, step: 4, labels: [0, 4, 8, 12, 16, 20] },
      dots: [[1, 4.8], [2, 8.8], [5, 14], [7, 7.5], [8, 11.3], [9, 15.3]],
      line: { m: 0.786, b: 6.07, x0: 0, x1: 9.7 } },

    // p47 #3：十家慈善机构，只有横网格；x 0–7,000 每 1,000 斜排，y 70–95 每 5
    'JY2-016': { type: 'scatter', w: 540, h: 440,
      title: ['Income and Percent of Total Expenses Spent', 'on Programs for Ten Charities in 2011'],
      x: { min: 0, max: 7000, step: 1000, labels: [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000] },
      xText: { '1000': '1,000', '2000': '2,000', '3000': '3,000', '4000': '4,000', '5000': '5,000', '6000': '6,000', '7000': '7,000' },
      xRotate: true, grid: 'y',
      y: { min: 70, max: 95, step: 5, labels: [70, 75, 80, 85, 90, 95] },
      yTitle: ['Percent of total expenses', 'spent on programs'],
      xTitle: 'Total income (millions of dollars)',
      dots: [[1200, 74], [1400, 81], [1400, 84], [1500, 85], [3500, 84],
             [3700, 92], [4400, 91], [4600, 89], [4700, 80], [6200, 87]],
      line: { m: 0.001856, b: 78.55, x0: 1250, x1: 6200 }, dotR: 3.2 },

    // p48 #4：下降拟合线；y 轴从 2 起标（0 不标），x 0–8
    'JY2-017': { type: 'scatter', w: 470, h: 410,
      x: { min: 0, max: 8, step: 1, labels: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
      y: { min: 0, max: 16, step: 2, labels: [2, 4, 6, 8, 10, 12, 14, 16] },
      dots: [[1, 15.5], [2, 10], [3, 8], [4, 8], [5, 4], [6, 3.2], [7, 1]],
      line: { m: -2.08, b: 15.2, x0: 0, x1: 7.3 } },

    // p49 #5：12 个速度 + 二次模型；曲线按原页采样点走折线（不用 a/b/c 硬拟合）
    'JY2-018': { type: 'scatter', w: 540, h: 400,
      x: { min: 0, max: 80, step: 5, labels: [0, 10, 20, 30, 40, 50, 60, 70, 80] },
      y: { min: 21, max: 31, step: 1, labels: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31] },
      xTitle: 'Speed (miles per hour)', yTitle: 'Average fuel economy (miles per gallon)',
      dots: [[10, 23.6], [15, 25.4], [20, 27.3], [25, 29.1], [30, 28.9], [35, 30.3],
             [40, 30.0], [45, 30.3], [50, 30.4], [55, 29.0], [60, 27.2], [65, 24.0]],
      curve: { pts: [[3, 20.6], [5, 21.2], [10, 23.4], [15, 25.3], [20, 27.2], [25, 28.8],
                     [30, 29.4], [35, 30.05], [40, 30.2], [45, 30.15], [50, 29.9], [55, 29.3],
                     [60, 27.0], [65, 24.0], [70, 21.5], [73, 19.5]] },
      dotR: 3.2 },

    // p50 #6：Ice Cream Sales；x 10–26 每 2、y 300–1,000 每 100；线 d = 33t + 84
    'JY2-019': { type: 'scatter', w: 540, h: 420,
      title: 'Ice Cream Sales',
      x: { min: 10, max: 26, step: 2, labels: [10, 12, 14, 16, 18, 20, 22, 24, 26] },
      y: { min: 300, max: 1000, step: 100, labels: [300, 400, 500, 600, 700, 800, 900, 1000] },
      yText: { '1000': '1,000' },
      xTitle: 'Temperature (°C)', yTitle: 'Sales (dollars)',
      dots: [[11.4, 480], [14.1, 520], [15.2, 630], [17.0, 700], [17.5, 710], [18.0, 715],
             [18.6, 705], [19.1, 700], [22.1, 820], [22.6, 740], [23.3, 830], [24.0, 700]],
      line: { m: 33, b: 84, x0: 11, x1: 25 }, dotR: 3.2 },

    // p51 #7：Minimum Wage；只有横网格；x 0–80（标到 70）、y 0–8；线 y = 0.096x - 0.488
    'JY2-020': { type: 'scatter', w: 540, h: 420,
      title: 'Minimum Wage',
      x: { min: 0, max: 80, step: 10, labels: [0, 10, 20, 30, 40, 50, 60, 70] },
      grid: 'y',
      y: { min: 0, max: 8, step: 1, labels: [1, 2, 3, 4, 5, 6, 7, 8] },
      xTitle: 'Years since 1940', yTitle: 'Minimum wage (dollars per hour)',
      dots: [[0, 0.25], [10, 0.75], [20, 0.95], [30, 1.6], [40, 3.05], [50, 3.75], [60, 5.1], [70, 7.2]],
      line: { m: 0.096, b: -0.488, x0: 5, x1: 70 }, dotR: 3.2 },

    // p52 #8：动量随时间，曲线 + 三个实心点 (4,7)(6,7.8)(8,10)；x=2 时 y=5.8
    'JY2-021': { type: 'scatter', w: 430, h: 410,
      x: { min: 0, max: 8, step: 1, labels: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
      y: { min: 0, max: 11, step: 1, labels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
      xTitle: 'Time (seconds)', yTitle: 'Momentum (newton-seconds)',
      curve: { pts: [[0, 0.2], [0.5, 1.7], [1, 3.2], [1.5, 4.8], [2, 5.8], [2.5, 6.25], [3, 6.55],
                     [4, 7], [5, 7.35], [6, 7.8], [7, 8.8], [8, 10]] },
      dots: [[4, 7], [6, 7.8], [8, 10]], dotR: 3.4 },

    // p53 #9：纯散点；x 0–10 每 2、y 0–16（横网格每 1、标每 2）
    'JY2-022': { type: 'scatter', w: 450, h: 430,
      x: { min: 0, max: 10, step: 2, labels: [0, 2, 4, 6, 8, 10] },
      y: { min: 0, max: 16, step: 1, labels: [0, 2, 4, 6, 8, 10, 12, 14, 16] },
      xTitle: 'Days after January 11', yTitle: 'Length of time (hours)',
      dots: [[1, 14], [2, 6], [3, 10], [4, 15], [5, 14], [6, 7], [7, 11], [8, 14], [9, 13.5]],
      dotR: 3.4 },

    // p73 #5：两组直方图，横轴 10–60 每 10 一格，纵轴 0–12 每 2 一格
    'JY2-049': { type: 'hist', w: 470, h: 250, cols: 2, xMin: 10, xMax: 60,
      ticks: [10, 20, 30, 40, 50, 60], yMax: 12, yStep: 2,
      xTitle: 'Integer', yTitle: 'Frequency',
      panels: [
        { title: 'Data Set A', bars: [{ lo: 10, hi: 20, n: 0 }, { lo: 20, hi: 30, n: 3 }, { lo: 30, hi: 40, n: 4 }, { lo: 40, hi: 50, n: 7 }, { lo: 50, hi: 60, n: 9 }] },
        { title: 'Data Set B', bars: [{ lo: 10, hi: 20, n: 3 }, { lo: 20, hi: 30, n: 4 }, { lo: 30, hi: 40, n: 7 }, { lo: 40, hi: 50, n: 9 }, { lo: 50, hi: 60, n: 0 }] }
      ] },
    // p78 #9：两行点图，0–5 分（Class A 原页可见 22 点，题干写 24 人，按原页可见点渲染）
    'JY2-053': { type: 'dotplot', w: 470, h: 242, rowH: 104, pitch: 10, x: { min: -0.55, max: 5.55 },
      ticks: [0, 1, 2, 3, 4, 5], xTitle: 'Quiz score',
      rows: [
        { label: 'Class A', dots: [{ x: 0, n: 1 }, { x: 1, n: 1 }, { x: 2, n: 3 }, { x: 3, n: 7 }, { x: 4, n: 7 }, { x: 5, n: 3 }] },
        { label: 'Class B', dots: [{ x: 0, n: 4 }, { x: 1, n: 4 }, { x: 2, n: 4 }, { x: 3, n: 4 }, { x: 4, n: 4 }, { x: 5, n: 4 }] }
      ] },
    // p81 #12：15 个值 22–26
    'JY2-056': { type: 'dotplot', w: 430, h: 104, rowH: 68, pitch: 10, title: 'Data Set A', x: { min: 21.45, max: 26.55 },
      ticks: [22, 23, 24, 25, 26],
      rows: [{ dots: [{ x: 22, n: 5 }, { x: 23, n: 4 }, { x: 24, n: 3 }, { x: 25, n: 2 }, { x: 26, n: 1 }] }] },
    // p85 #15：25 名婴儿开始走路的月龄（原页可见 23 点）
    'JY2-059': { type: 'dotplot', w: 470, h: 142, rowH: 88, pitch: 10, title: 'Age of 25 Babies When They Began Walking',
      x: { min: 8, max: 16 }, ticks: [8, 9, 10, 11, 12, 13, 14, 15, 16], xTitle: 'Age(months)',
      rows: [{ dots: [{ x: 9, n: 1 }, { x: 10, n: 1 }, { x: 11, n: 1 }, { x: 12, n: 3 }, { x: 13, n: 5 }, { x: 14, n: 6 }, { x: 15, n: 6 }] }] },
    // p86 #16：13 颗木星卫星的公转周期
    'JY2-060': { type: 'dotplot', w: 470, h: 104, rowH: 60, pitch: 10, x: { min: 719.6, max: 732.4 },
      ticks: [720, 722, 724, 726, 728, 730, 732], xTitle: 'Orbital period (days)',
      rows: [{ dots: [{ x: 721, n: 2 }, { x: 723, n: 3 }, { x: 724, n: 2 }, { x: 726, n: 1 }, { x: 727, n: 1 }, { x: 728, n: 1 }, { x: 730, n: 2 }, { x: 732, n: 1 }] }] },
    // p89 #18：min 37 / Q1 51 / 中位 61 / Q3 84 / max 87
    'JY2-062': { type: 'boxplot', w: 470, h: 140, x: { min: 34, max: 90 },
      ticks: [37, 51, 61, 84, 87],
      rows: [{ min: 37, q1: 51, med: 61, q3: 84, max: 87 }] },
    // p89 #19：100 个互异值的箱线图，Q1 70 / 中位 80 / Q3 90，轴 10–100
    'JY2-063': { type: 'boxplot', w: 470, h: 145, x: { min: 8, max: 101 },
      ticks: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
      rows: [{ min: 38, q1: 70, med: 80, q3: 90, max: 96 }] },
    // p90 #20：两组瞪羚体重的箱线图
    'JY2-064': { type: 'boxplot', w: 470, h: 205, x: { min: 19.3, max: 32.6 },
      ticks: [20, 22, 24, 26, 28, 30, 32], xTitle: 'Mass (kilograms)',
      rows: [
        { label: 'Group 1', min: 21.5, q1: 22.5, med: 24.8, q3: 26.2, max: 28.3 },
        { label: 'Group 2', min: 22.1, q1: 23.3, med: 24.3, q3: 25.2, max: 28.4 }
      ] },

    // ---- 3.4 图像（p128–p143）----
    // p134 #13：y = a^x + b，渐近线 y = -4，标点 (0,-3)、(1,1) → y = 5^x - 4
    'JY3-085': { type: 'plane', w: 430, h: 330,
      x: { min: -4, max: 4, step: 1, labels: [-4, -2, 2, 4] },
      y: { min: -6, max: 10, step: 1, labels: [-6, -4, -2, 2, 4, 6, 8, 10] },
      lines: [{ m: 0, b: -4, x0: -4, x1: 4, dash: true }],
      curves: [{ kind: 'exp', a: 1, b: 5, c: -4 }],
      dots: [[0, -3], [1, 1]] },
    // p138 #17：三次曲线，三个 x 截距（-1.2 / 3.4 / 7.0），左谷右峰
    'JY3-099': { type: 'plane', w: 460, h: 340,
      x: { min: -8, max: 8, step: 1, labels: [-8, -6, -4, -2, 2, 4, 6, 8] },
      y: { min: -16, max: 16, step: 2, labels: [-16, -12, -8, -4, 4, 8, 12, 16] },
      curves: [{ kind: 'poly', coef: [-0.35, 3.22, -3.962, -9.996] }] },
    // p139 #18：x^2(x-2)(x+3) —— 0 处是切点（双根），-3 与 2 处穿越
    'JY3-100': { type: 'plane', w: 420, h: 300,
      x: { min: -3.5, max: 3.5, step: 1, labels: [-3, -2, -1, 1, 2, 3] },
      y: { min: -20, max: 20, step: 5, labels: [-20, -10, 10, 20] },
      curves: [{ kind: 'poly', coef: [1, 1, -6, 0, 0] }] },
    // p139 #19：W 形四次，(x+3)(x+1)^2(x-2)^2 —— -1 与 2 处切、-3 处穿越
    'JY3-101': { type: 'plane', w: 460, h: 320,
      x: { min: -4, max: 4, step: 1, labels: [-4, -3, -2, -1, 1, 2, 3, 4] },
      y: { min: -10, max: 32, step: 5, labels: [10, 20, 30] },
      curves: [{ kind: 'poly', coef: [1, 1, -9, -5, 16, 12] }] },
    // p140 #20：-(1/10)x(x-4)(x+5)^2 —— -5 处切、0 与 4 处穿越
    'JY3-102': { type: 'plane', w: 470, h: 340,
      x: { min: -8, max: 8, step: 1, labels: [-8, -6, -4, -2, 2, 4, 6, 8] },
      y: { min: -100, max: 100, step: 20, labels: [-100, -80, -60, -40, -20, 20, 40, 60, 80, 100] },
      curves: [{ kind: 'poly', coef: [-0.1, -0.6, 1.5, 10, 0] }] },
    // p142 #21：四张纯形状图（无网格）——A 是真图 (k-x)/(1+x)，k 取 2：
    // y = -1 + 3/(x+1)；B/C/D 是错图，改渐近线位置和符号就行
    'JY3-103': { type: 'quad', cols: 2, order: ['A', 'C', 'B', 'D'], panels: {
      A: { w: 240, h: 170, noGrid: true, x: { min: -3.6, max: 3.6, step: 1 }, y: { min: -5, max: 6, step: 1 },
        curves: [{ kind: 'rat', a: 3, h: -1, c: -1 }] },
      C: { w: 240, h: 170, noGrid: true, x: { min: -3.6, max: 3.6, step: 1 }, y: { min: -5, max: 6, step: 1 },
        curves: [{ kind: 'rat', a: -1, h: 0, c: -1 }] },
      B: { w: 240, h: 170, noGrid: true, x: { min: -3.6, max: 3.6, step: 1 }, y: { min: -5, max: 6, step: 1 },
        curves: [{ kind: 'rat', a: 1, h: 0, c: 1 }] },
      D: { w: 240, h: 170, noGrid: true, x: { min: -3.6, max: 3.6, step: 1 }, y: { min: -5, max: 6, step: 1 },
        curves: [{ kind: 'rat', a: 1, h: 0, c: 0 }] } } },
    // ---- 4.1 直线与角（p151/p152）----
    // #1：m∥n，截线 t；x 在 m 上方右侧、y 在 m 下方左侧（对顶），z 在 n 上方左侧（同旁内角）
    'JY4-056': { type: 'geo', w: 430, h: 300, sw: 1.8,
      segs: [[[40, 110], [380, 110]], [[40, 240], [380, 240]], [[110, 15], [300, 285]]],
      labels: [
        { t: 't', x: 92, y: 14, italic: true, size: 15 },
        { t: 'm', x: 392, y: 116, italic: true, size: 15 },
        { t: 'n', x: 392, y: 246, italic: true, size: 15 },
        { t: 'x\u00b0', x: 196, y: 100, size: 13 },
        { t: 'y\u00b0', x: 162, y: 136, size: 13 },
        { t: 'z\u00b0', x: 248, y: 232, size: 13 } ] },
    // #2：q∥r，截线 s；77° 在 q 上方右侧，y° 在 r 上方左侧（同旁内角 → 103°）
    'JY4-057': { type: 'geo', w: 430, h: 300, sw: 1.8,
      segs: [[[50, 90], [360, 90]], [[30, 190], [360, 190]], [[100, 250], [280, 20]]],
      labels: [
        { t: 'q', x: 375, y: 96, italic: true, size: 15 },
        { t: 'r', x: 375, y: 196, italic: true, size: 15 },
        { t: '77\u00b0', x: 232, y: 80, size: 13 },
        { t: 'y\u00b0', x: 152, y: 180, size: 13 } ] },
    // p143 #22：只画左半支，竖直渐近线 x = -4（原页标题写 f(x)=a/(x+b)，由图得 6/(x+4)）
    'JY3-104': { type: 'plane', w: 440, h: 330,
      x: { min: -10, max: 0, step: 1, labels: [-10, -8, -6, -4, -2] },
      y: { min: -10, max: 0, step: 1, labels: [0, -2, -4, -6, -8, -10] },
      curves: [{ kind: 'rat', a: 6, h: -4, c: 0, x0: -10, x1: -4.06 }] },
    // p154 #1：A-E-D 共线底边，D–B 长斜线（C 在 DB 上），C–A，B–E 交底边于 E
    'JY4-060': { type: 'geo', w: 430, h: 330, sw: 1.6,
      segs: [[[50, 280], [370, 80]], [[50, 280], [330, 280]], [[194, 190], [330, 280]], [[370, 80], [225, 280]]],
      labels: [
        { t: 'A', x: 336, y: 296, italic: true, size: 15 },
        { t: 'B', x: 376, y: 74, italic: true, size: 15 },
        { t: 'C', x: 184, y: 184, italic: true, size: 15 },
        { t: 'D', x: 38, y: 300, italic: true, size: 15 },
        { t: 'E', x: 222, y: 300, italic: true, size: 15 },
        { t: 'x\u00b0', x: 243, y: 262, size: 13 },
        { t: '104\u00b0', x: 204, y: 222, size: 13 },
        { t: '45\u00b0', x: 344, y: 116, size: 13 } ] },
    // p158 #8：AE 与 BD 交于 C，AB 与 DE 各标 10（AAS：∠A = ∠E 即可）
    'JY4-067': { type: 'geo', w: 400, h: 220, sw: 1.6,
      segs: [[[70, 62], [300, 112]], [[112, 132], [232, 42]]],
      labels: [
        { t: 'A', x: 56, y: 56, italic: true, size: 15 },
        { t: 'B', x: 100, y: 148, italic: true, size: 15 },
        { t: 'C', x: 176, y: 104, italic: true, size: 15 },
        { t: 'D', x: 236, y: 30, italic: true, size: 15 },
        { t: 'E', x: 306, y: 118, italic: true, size: 15 },
        { t: '10', x: 76, y: 110, size: 13 },
        { t: '10', x: 274, y: 62, size: 13 } ] },
    // p161 #12：△ABC 以 AC 为底、BD⊥AC，D 在 AC 上（直角符号两处）
    'JY4-071': { type: 'geo', w: 430, h: 300, sw: 1.6,
      segs: [[[60, 240], [210, 70]], [[210, 70], [340, 240]], [[60, 240], [340, 240]], [[210, 70], [210, 240]]],
      rights: [
        { x: 210, y: 240, a: [-1, 0], b: [0, -1], len: 14 },
        { x: 210, y: 70, a: [-0.66, 0.75], b: [0.66, 0.75], len: 15 } ],
      labels: [
        { t: 'A', x: 44, y: 246, italic: true, size: 15 },
        { t: 'B', x: 208, y: 52, italic: true, size: 15 },
        { t: 'C', x: 346, y: 246, italic: true, size: 15 },
        { t: 'D', x: 214, y: 262, italic: true, size: 15 } ] },
    // p163 #13：正九边形，九个顶点连到中心，右下那个等腰三角形底角标 x°
    'JY4-072': { type: 'geo', w: 430, h: 310, sw: 1.5,
      segs: [[[210, 150], [175.8, 244]], [[210, 150], [123.4, 200]], [[210, 150], [111.5, 132.6]], [[210, 150], [145.7, 73.4]], [[210, 150], [210, 50]], [[210, 150], [274.3, 73.4]], [[210, 150], [308.5, 132.6]], [[210, 150], [296.6, 200]], [[210, 150], [244.2, 244]], [[175.8, 244], [123.4, 200]], [[123.4, 200], [111.5, 132.6]], [[111.5, 132.6], [145.7, 73.4]], [[145.7, 73.4], [210, 50]], [[210, 50], [274.3, 73.4]], [[274.3, 73.4], [308.5, 132.6]], [[308.5, 132.6], [296.6, 200]], [[296.6, 200], [244.2, 244]], [[244.2, 244], [175.8, 244]]],
      labels: [{ t: 'x\u00b0', x: 263, y: 210, size: 13 }] },
    // p172 #4：直角三角形，直角在 C，斜边 AB 标 26
    'JY4-107': { type: 'geo', w: 430, h: 300, sw: 1.6,
      segs: [[[90, 260], [300, 260]], [[300, 260], [300, 70]], [[90, 260], [300, 70]]],
      rights: [{ x: 300, y: 260, a: [-1, 0], b: [0, -1], len: 13 }],
      labels: [
        { t: 'A', x: 76, y: 276, italic: true, size: 15 },
        { t: 'B', x: 306, y: 58, italic: true, size: 15 },
        { t: 'C', x: 306, y: 276, italic: true, size: 15 },
        { t: '26', x: 178, y: 152, size: 13 } ] },
    // p176 #9：△ABC，B 到 AC 的垂足带直角符号（题干靠 sin A = cos C，图只描形）
    'JY4-112': { type: 'geo', w: 430, h: 300, sw: 1.6,
      segs: [[[60, 240], [200, 55]], [[200, 55], [340, 240]], [[60, 240], [340, 240]], [[200, 55], [200, 240]]],
      rights: [{ x: 200, y: 240, a: [-1, 0], b: [0, -1], len: 13 }],
      labels: [
        { t: 'A', x: 44, y: 246, italic: true, size: 15 },
        { t: 'B', x: 196, y: 44, italic: true, size: 15 },
        { t: 'C', x: 346, y: 246, italic: true, size: 15 } ] },
    // p178 #11：单位圆，θ 从 +x 轴逆时针转到第二象限的动点（图中只有形，不给点坐标值）
    'JY4-114': { type: 'geo', w: 430, h: 340, sw: 1.5,
      segs: [[[40, 170], [380, 170]], [[210, 25], [210, 315]], [[210, 170], [160, 83.4]]],
      arcs: [{ cx: 210, cy: 170, r: 100, a0: 0, a1: 180 },
             { cx: 210, cy: 170, r: 100, a0: 180, a1: 360 },
             { cx: 210, cy: 170, r: 34, a0: 0, a1: 120, sw: 1.2 }],
      dots: [[210, 170]],
      labels: [
        { t: 'O', x: 192, y: 192, italic: true, size: 14 },
        { t: '(1, 0)', x: 216, y: 166, size: 12 },
        { t: '(0, 1)', x: 214, y: 52, size: 12 },
        { t: 'y', x: 218, y: 30, italic: true, size: 13 },
        { t: 'x', x: 378, y: 166, italic: true, size: 13 },
        { t: '\u03b8', x: 244, y: 152, italic: true, size: 14 } ] },
    // p181 #2：圆上 A/B/C 三点，B 处内接角 55°（弧 AC = 110°）
    'JY4-129': { type: 'geo', w: 430, h: 330, sw: 1.5,
      segs: [[[200, 80], [100.1, 217.4]], [[200, 80], [297.4, 224.3]]],
      arcs: [{ cx: 200, cy: 185, r: 105, a0: 0, a1: 180 }, { cx: 200, cy: 185, r: 105, a0: 180, a1: 360 }],
      labels: [
        { t: 'B', x: 194, y: 68, italic: true, size: 15 },
        { t: 'A', x: 84, y: 232, italic: true, size: 15 },
        { t: 'C', x: 300, y: 240, italic: true, size: 15 },
        { t: '55\u00b0', x: 196, y: 108, size: 13 } ] },
    // p182 #3：圆心 P，A 在左侧，B/C 在右侧，B、C 处各 20°，P 处 x°（弧 BC = 280° → x = 80）
    'JY4-130': { type: 'geo', w: 430, h: 330, sw: 1.5,
      segs: [[[100, 180], [276.6, 115.7]], [[100, 180], [276.6, 244.3]], [[276.6, 115.7], [276.6, 244.3]],
             [[200, 180], [276.6, 115.7]], [[200, 180], [276.6, 244.3]]],
      arcs: [{ cx: 200, cy: 180, r: 100, a0: 0, a1: 180 }, { cx: 200, cy: 180, r: 100, a0: 180, a1: 360 }],
      dots: [[200, 180]],
      labels: [
        { t: 'A', x: 82, y: 178, italic: true, size: 15 },
        { t: 'B', x: 280, y: 108, italic: true, size: 15 },
        { t: 'C', x: 280, y: 258, italic: true, size: 15 },
        { t: 'P', x: 204, y: 174, italic: true, size: 15 },
        { t: '20\u00b0', x: 228, y: 122, size: 13 },
        { t: '20\u00b0', x: 228, y: 232, size: 13 },
        { t: 'x\u00b0', x: 248, y: 188, size: 13 } ] },
    // p184 #4：圆心 O，C 顶、D 右、A 右下、B 左下；弧 ADC 对应圆心角 x = 100°
    'JY4-131': { type: 'geo', w: 430, h: 340, sw: 1.5,
      segs: [[[200, 180], [200, 80]], [[200, 180], [298.5, 197.4]]],
      arcs: [{ cx: 200, cy: 180, r: 100, a0: 0, a1: 180 }, { cx: 200, cy: 180, r: 100, a0: 180, a1: 360 }],
      dots: [[200, 180], [286.6, 130], [106, 214.2]],
      labels: [
        { t: 'C', x: 194, y: 66, italic: true, size: 15 },
        { t: 'D', x: 294, y: 126, italic: true, size: 15 },
        { t: 'A', x: 306, y: 208, italic: true, size: 15 },
        { t: 'B', x: 88, y: 226, italic: true, size: 15 },
        { t: 'O', x: 180, y: 200, italic: true, size: 15 },
        { t: 'x\u00b0', x: 224, y: 138, size: 13 } ] },
    // p184 #5：半圆，OA/OB 为半径，圆心 O 在底边中点，x° 在 O 处
    'JY4-132': { type: 'geo', w: 430, h: 340, sw: 1.5,
      segs: [[[90, 245], [310, 245]], [[200, 245], [100.3, 198.5]], [[200, 245], [209.6, 135.4]]],
      arcs: [{ cx: 200, cy: 245, r: 110, a0: 0, a1: 180 }],
      dots: [[200, 245]],
      labels: [
        { t: 'A', x: 88, y: 196, italic: true, size: 15 },
        { t: 'B', x: 214, y: 126, italic: true, size: 15 },
        { t: 'O', x: 190, y: 268, italic: true, size: 15 },
        { t: 'x\u00b0', x: 208, y: 226, size: 13 } ] },
    // p185 #6：OB⊥BC（切于 B），A 在 OC 上，OB = AC = 6；阴影 = 弦 AB 与弧 AB 之间那块
    'JY4-133': { type: 'geo', w: 430, h: 330, sw: 1.6,
      segs: [[[150, 195], [167.4, 96.5]], [[167.4, 96.5], [337.9, 126.6]], [[150, 195], [337.9, 126.6]], [[167.4, 96.5], [244.0, 160.8]]],
      arcs: [{ cx: 150, cy: 195, r: 100, a0: 0, a1: 180 }, { cx: 150, cy: 195, r: 100, a0: 180, a1: 360 }],
      arcFills: [{ cx: 150, cy: 195, r: 100, a0: 20, a1: 80 }],
      rights: [{ x: 167.4, y: 96.5, a: [0.9397, -0.342], b: [0.342, 0.9397], len: 13 }],
      dots: [[150, 195]],
      labels: [
        { t: 'O', x: 124, y: 218, italic: true, size: 15 },
        { t: 'B', x: 160, y: 82, italic: true, size: 15 },
        { t: 'A', x: 246, y: 176, italic: true, size: 15 },
        { t: 'C', x: 344, y: 132, italic: true, size: 15 } ] },
    // p79 #10：四个选项各是一张点图（标准差最大那个）。每格走 dotplot 面板，靠 renderPanel 单选渲染
    'JY2-054': { type: 'dotplot', w: 400, h: 130, x: { min: 0, max: 9 }, ticks: [], rows: [],
      panels: {
        A: { type: 'dotplot', w: 400, h: 130, x: { min: 0, max: 9 }, ticks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], rowH: 96,
             rows: [{ dots: [{ x: 4, n: 1 }, { x: 5, n: 1 }, { x: 6, n: 2 }, { x: 7, n: 2 }, { x: 8, n: 3 }] }] },
        B: { type: 'dotplot', w: 400, h: 130, x: { min: 0, max: 9 }, ticks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], rowH: 96,
             rows: [{ dots: [{ x: 3, n: 1 }, { x: 4, n: 4 }, { x: 5, n: 4 }] }] },
        C: { type: 'dotplot', w: 400, h: 130, x: { min: 0, max: 9 }, ticks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], rowH: 96,
             rows: [{ dots: [{ x: 2, n: 2 }, { x: 3, n: 2 }, { x: 4, n: 2 }, { x: 5, n: 3 }] }] },
        D: { type: 'dotplot', w: 400, h: 130, x: { min: 0, max: 9 }, ticks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], rowH: 96,
             rows: [{ dots: [{ x: 1, n: 2 }, { x: 3, n: 2 }, { x: 4, n: 1 }, { x: 5, n: 2 }, { x: 8, n: 2 }] }] }
      } }
  };

  window.JY_FIG = {
    specs: specs,
    render: function (id) {
      var s = specs[id];
      if (!s) return '';
      if (s.type === 'quadrants') return wrap(quadrants(s));
      if (s.type === 'geo') return wrap(geo(s));
      if (s.type === 'scatter') return wrap(scatter(s));
      if (s.type === 'hist') return wrap(hist(s));
      if (s.type === 'dotplot') return wrap(dotplot(s));
      if (s.type === 'boxplot') return wrap(boxplot(s));
      return wrap(s.type === 'quad' ? quad(s) : plane(s));
    },
    // 单格渲染：把 spec 里的某一个面板单独画出来（renderPanel('JY1-040','A')）。
    // 选项图要「一个选项一张图」时走这里——不用另造字段，也不用再往 specs 里塞第二套 id；
    // 面板按自己的 type 分派（quad 面板历来不带 type，沿用 plane），点图/散点/直方图都能单独出；
    // 面板不存在时返回空串，调用方据此回退成纯文字选项。
    renderPanel: function (id, letter) {
      var s = specs[id];
      if (!s || !s.panels || !s.panels[letter]) return '';
      var p = s.panels[letter];
      if (p.type === 'dotplot') return wrap(dotplot(p));
      if (p.type === 'scatter') return wrap(scatter(p));
      if (p.type === 'hist') return wrap(hist(p));
      if (p.type === 'boxplot') return wrap(boxplot(p));
      if (p.type === 'geo') return wrap(geo(p));
      return wrap(plane(p));
    }
  };
})();
