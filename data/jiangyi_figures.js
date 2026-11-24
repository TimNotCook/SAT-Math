/* 讲义复习 — 矢量图 spec + 自带渲染器。
   为什么不复用 figures.js：本板块要的轴样式（轴在原点交叉、箭头尖端落在框边、
   x/y 印在箭头旁、原点写 O）和 chart() 的默认形态不同，且 figures.js 正被其他人改，
   这里保持独立，避免打架。所有图形由本文件从几何参数现算，无任何扫描裁图。

   全局：window.JY_FIG.specs[id]、window.JY_FIG.render(id) -> '<svg …>'。
   spec 形态：
     {type:'plane', w, h, x:{min,max,step,labels}, y:{...}, lines:[{m,b,x0,x1}]}
     {type:'quad',  w, h, panels:{A:{…plane}, B:…, C:…, D:…}, cols:2}
   线的画法统一用 y = m*x + b，x 只画在 [x0, x1]，这样和原书「线穿出网格」一致。 */

(function () {
  var UID = 0, INK = '#26313F', GRID = '#D7DEE7', LAB = '#4A5563', LINE = '#1C2634';

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function plane(o) {
    var W = o.w, H = o.h, ml = 46, mr = 38, mt = 24, mb = 40;
    var x0 = o.x.min, x1 = o.x.max, y0 = o.y.min, y1 = o.y.max;
    var pw = W - ml - mr, ph = H - mt - mb;
    function X(v) { return ml + (v - x0) / (x1 - x0) * pw; }
    function Y(v) { return mt + (y1 - v) / (y1 - y0) * ph; }
    var g = [], i;
    var xs = o.x.step || 1, ys = o.y.step || 1;
    for (i = Math.ceil(x0 / xs) * xs; i <= x1 + 1e-9; i += xs)
      g.push('<line x1="' + X(i).toFixed(1) + '" y1="' + Y(y0) + '" x2="' + X(i).toFixed(1) + '" y2="' + Y(y1) + '" stroke="' + GRID + '"/>');
    for (i = Math.ceil(y0 / ys) * ys; i <= y1 + 1e-9; i += ys)
      g.push('<line x1="' + X(x0) + '" y1="' + Y(i).toFixed(1) + '" x2="' + X(x1) + '" y2="' + Y(i).toFixed(1) + '" stroke="' + GRID + '"/>');

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
    if (o.originO) lbl.push('<text x="' + (X(0) - 13) + '" y="' + (Y(0) + 15) + '" font-size="12" fill="' + LAB + '">O</text>');

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
      ln.push('<line x1="' + X(p[0][0]).toFixed(1) + '" y1="' + Y(p[0][1]).toFixed(1) + '" x2="' + X(p[1][0]).toFixed(1) + '" y2="' + Y(p[1][1]).toFixed(1) + '" stroke="' + LINE + '" stroke-width="2.3" stroke-linecap="round"/>');
    });

    // 线一律裁到画框内，防止穿出网格（原书里线也是被框住的）
    UID++;
    var clip = '<clipPath id="jcp' + UID + '"><rect x="' + (X(x0) - 2) + '" y="' + (Y(y1) - 2) + '" width="' + (pw + 4) + '" height="' + (ph + 4) + '"/></clipPath>';
    var body = clip + '<g clip-path="url(#jcp' + UID + ')">' + g.join('') + ln.join('') + ax.join('') + '</g>' + lbl.join('') + tl.join('');
    return { w: W, h: H, body: body };
  }

  function wrap(body) {
    return '<svg viewBox="0 0 ' + body.w + ' ' + body.h + '" width="100%" preserveAspectRatio="xMidYMid meet" role="img" style="max-width:' + body.w + 'px">' + body.body + '</svg>';
  }

  function quad(o) {
    var keys = ['A', 'B', 'C', 'D'], cols = o.cols || 2, gaps = 26, labH = 18;
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

    // p9 #5：四选图。答案页 p191 写 C，所以 C 是正确图：y 截距恰为 1、
    // 斜率 -a/b 落在 (-1,0)、x 截距 = b/a = 2；A/B/D 是三个错图（斜率 -1、截距 1.5、斜率 -2）。
    'JY1-005': { type: 'quad', cols: 2, panels: {
      A: { w: 232, h: 232, x: { min: -3.2, max: 3.4, step: 1, labels: [1] },
           y: { min: -2.2, max: 3.4, step: 1, labels: [1] }, lines: [{ m: -1, b: 1, x0: -3.2, x1: 3.4 }] },
      B: { w: 250, h: 250, x: { min: -3.2, max: 4.2, step: 1, labels: [1] },
           y: { min: -2.4, max: 4.2, step: 1, labels: [1] }, lines: [{ m: -1, b: 1.5, x0: -3.2, x1: 3.4 }] },
      C: { w: 232, h: 232, x: { min: -3.2, max: 3.4, step: 1, labels: [1] },
           y: { min: -2.2, max: 3.4, step: 1, labels: [1] }, lines: [{ m: -0.5, b: 1, x0: -3.2, x1: 3.4 }] },
      D: { w: 232, h: 232, x: { min: -3.2, max: 3.4, step: 1, labels: [1] },
           y: { min: -2.2, max: 3.4, step: 1, labels: [1] }, lines: [{ m: -2, b: 2, x0: -3.2, x1: 1.6 }] }
    } }
  };

  window.JY_FIG = {
    specs: specs,
    render: function (id) {
      var s = specs[id];
      if (!s) return '';
      return wrap(s.type === 'quad' ? quad(s) : plane(s));
    }
  };
})();
