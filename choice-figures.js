/* TD SAT Math · 选项图统一通路（题库 / 讲义共用）
   ------------------------------------------------------------------
   data/jiangyi.js（以及未来真题题库）里可写：

     "choiceFigures": {
       "A": { "vector": "JY1-040#A" },                 // 矢量 spec + 可选面板
       "B": { "vector": "JY1-040#B" },
       "C": { "image": "images/choice/U1-01_C.png" },  // 只接受已登记的裁图目录
       "D": "images/choice/U1-01_D.png"                // 字符串简写：图片路径 / spec id
     }

   也接受按 A–D 顺序的数组。矢量来源优先 JY_FIG（讲义矢量图），其次 TD_FIG；
   图片只认 images/choice/ 下已登记的选择题裁图，避免把带水印的扫描页塞进选项。

   旧数据仍走 TD_CHOICE_CROPS + text.figure 的原通路，输出 HTML 与本通路引入前
   逐字节一致，保证做题页模板的像素基线不被这次改动碰动。 */
(function () {
  'use strict';
  var LETTERS = ['A', 'B', 'C', 'D'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function rawField(q, letter) {
    var cf = q && q.choiceFigures;
    if (!cf) return null;
    if (Array.isArray(cf)) return cf[LETTERS.indexOf(letter)] || null;
    return cf[letter] || cf[String(letter).toLowerCase()] || null;
  }

  function imageHtml(src, letter) {
    return '<img class="drill-choice-fig" src="' + esc(src) + '" alt="选项 ' + letter +
      '" loading="lazy" decoding="async" onerror="var p=document.createElement(\'span\');' +
      'p.className=\'drill-choice-placeholder\';p.textContent=\'图形暂缺\';this.replaceWith(p);">';
  }

  function isRegisteredCrop(src) {
    return typeof src === 'string' && (/^images\/choice\/[^/]+\.[a-z0-9]+$/i.test(src) ||
      /^data:image\//i.test(src));
  }

  function vectorHtml(value, letter) {
    var spec = value, panel = '';
    if (value && typeof value === 'object') {
      spec = value.vector || value.spec || '';
      panel = value.panel || '';
    }
    if (typeof spec !== 'string' || !spec) return '';
    if (!panel) {
      var m = spec.match(/^(.+?)[#:]([A-D])$/i);
      if (m) { spec = m[1]; panel = m[2].toUpperCase(); }
    }
    var svg = '';
    if (window.JY_FIG && typeof window.JY_FIG.renderPanel === 'function' &&
        panel && window.JY_FIG.specs && window.JY_FIG.specs[spec]) {
      svg = window.JY_FIG.renderPanel(spec, panel);
    }
    if (!svg && window.JY_FIG && typeof window.JY_FIG.render === 'function' &&
        window.JY_FIG.specs && window.JY_FIG.specs[spec]) {
      svg = window.JY_FIG.render(spec);
    }
    if (!svg) return '';
    return /^\s*<(?:div|svg)/i.test(svg) && !/^\s*<svg/i.test(svg)
      ? svg
      : '<div class="td-choicegraph td-choicegraph--field">' + svg + '</div>';
  }

  function resolve(q, letter, opts) {
    var value = rawField(q, letter);
    if (value != null) {
      var image = (value && typeof value === 'object') ? value.image : '';
      if (!image && typeof value === 'string' && isRegisteredCrop(value)) image = value;
      if (image) {
        if (!isRegisteredCrop(image)) return { source: 'field', kind: 'missing', html: '<span class="drill-choice-placeholder">图形暂缺</span>', cls: ' is-figure is-missing' };
        return { source: 'field', kind: 'image', html: imageHtml(image, letter), cls: ' is-figure' };
      }
      var vector = vectorHtml(value, letter);
      if (vector) return { source: 'field', kind: 'vector', html: vector, cls: ' is-figure' };
      return { source: 'field', kind: 'missing', html: '<span class="drill-choice-placeholder">图形暂缺</span>', cls: ' is-figure is-missing' };
    }

    /* 旧通路：只有显式传 text.figure 的真题页面才回退，讲义不会被 q.figure 误判成选项图。 */
    if (!opts || !opts.text) return null;
    var figs = opts.text.figure || [];
    if (figs.indexOf(letter) < 0) return null;
    var crops = (window.TD_CHOICE_CROPS && window.TD_CHOICE_CROPS[q.id]) || null;
    if (window.TD_FIG && typeof window.TD_FIG.choiceGraph === 'function') {
      var svg = window.TD_FIG.choiceGraph(q, letter);
      if (svg) return { source: 'legacy', kind: 'vector', html: svg, cls: ' is-figure' };
    }
    if (crops && crops[letter]) return { source: 'legacy', kind: 'image', html: imageHtml(crops[letter], letter), cls: ' is-figure' };
    return { source: 'legacy', kind: 'missing', html: '<span class="drill-choice-placeholder">图形或公式选项</span>', cls: ' is-figure is-missing' };
  }

  window.TD_CHOICE_FIGURES = { resolve: resolve };
})();
