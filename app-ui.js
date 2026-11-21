/* TD SAT Math · official Bluebook tool layer
   Verbatim College Board copy: "Bluebook Test Directions" (Fall 2026),
   Math Module DIRECTIONS + Reference Sheet. No invented formulas, no
   translated hints. Desmos is mounted only when a caller asks for it. */
(function () {
  'use strict';
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* ------------------------------------------------------------------
     DIRECTIONS — exact English copy displayed in Bluebook Math modules
     ------------------------------------------------------------------ */
  var DIRECTIONS = [
    'The questions in this section address a number of important math skills.',
    'Use of a calculator is permitted for all questions. A reference sheet, calculator, and these directions can be accessed throughout the test.',
    'Unless otherwise indicated:',
    'All variables and expressions represent real numbers.',
    'Figures provided are drawn to scale.',
    'All figures lie in a plane.',
    'The domain of a given function f is the set of all real numbers x for which f(x) is a real number.',
    'For multiple-choice questions, solve each problem and choose the correct answer from the choices provided. Each multiple-choice question has a single correct answer.',
    'For student-produced response questions, solve each problem and enter your answer as described below.',
    'If you find more than one correct answer, enter only one answer.',
    'You can enter up to 5 characters for a positive answer and up to 6 characters (including the negative sign) for a negative answer.',
    'If your answer is a fraction that doesn’t fit in the provided space, enter the decimal equivalent.',
    'If your answer is a decimal that doesn’t fit in the provided space, enter it by truncating or rounding at the fourth digit.',
    'If your answer is a mixed number (such as 3½), enter it as an improper fraction (7/2) or its decimal equivalent (3.5).',
    'Don’t enter symbols such as a percent sign, comma, or dollar sign.'
  ];

  function directionsHTML() {
    var bullets = [3, 4, 5, 6, 9, 10, 11, 12, 13, 14];
    var body = '<div class="bb-directions">' +
      '<p>' + esc(DIRECTIONS[0]) + '</p>' +
      '<p>' + esc(DIRECTIONS[1]) + '</p>' +
      '<p>' + esc(DIRECTIONS[2]) + '</p>' +
      '<ul>' + bullets.slice(0, 4).map(function (i) { return '<li>' + esc(DIRECTIONS[i]) + '</li>'; }).join('') + '</ul>' +
      '<p>' + esc(DIRECTIONS[7]) + '</p>' +
      '<p>' + esc(DIRECTIONS[8]) + '</p>' +
      '<ul>' + bullets.slice(4).map(function (i) { return '<li>' + esc(DIRECTIONS[i]) + '</li>'; }).join('') + '</ul>' +
      '<h4>EXAMPLES</h4>' +
      '<table class="bb-examples"><thead><tr><th>Answer</th><th>Acceptable ways to enter answer</th>' +
      '<th>Unacceptable: will NOT receive credit</th></tr></thead><tbody>' +
      '<tr><td>3.5</td><td>3.5&nbsp;&nbsp;3.50&nbsp;&nbsp;7/2</td><td>31/2&nbsp;&nbsp;3 1/2</td></tr>' +
      '<tr><td>⅔</td><td>2/3&nbsp;&nbsp;.6666&nbsp;&nbsp;.6667<br>0.666&nbsp;&nbsp;0.667</td><td>.66&nbsp;&nbsp;0.66&nbsp;&nbsp;0.67&nbsp;&nbsp;.67</td></tr>' +
      '<tr><td>–⅓</td><td>–1/3&nbsp;&nbsp;–.3333&nbsp;&nbsp;–0.333</td><td>–.33&nbsp;&nbsp;–0.33</td></tr>' +
      '</tbody></table></div>';
    return body;
  }

  /* ------------------------------------------------------------------
     REFERENCE SHEET — exact formulas and stated facts from Bluebook
     ------------------------------------------------------------------ */
  var TRI30 = '<svg viewBox="0 0 110 84" class="bb-fig" aria-label="30-60-90 triangle"><path d="M6 76 L6 8 L104 76 Z" fill="none" stroke="#1f2937" stroke-width="1.4"/>' +
    '<text x="12" y="62" font-size="11" fill="#1f2937">60°</text><text x="62" y="16" font-size="11" fill="#1f2937">30°</text>' +
    '<text x="48" y="84" font-size="12" fill="#1f2937">x√3</text><text x="0" y="46" font-size="12" fill="#1f2937">x</text>' +
    '<text x="55" y="30" font-size="12" fill="#1f2937" transform="rotate(36 55 30)">2x</text>' +
    '<path d="M6 68 L14 76 L6 76 Z" fill="none" stroke="#1f2937" stroke-width="1"/></svg>';
  var TRI45 = '<svg viewBox="0 0 110 84" class="bb-fig" aria-label="45-45-90 triangle"><path d="M6 76 L6 8 L74 76 Z" fill="none" stroke="#1f2937" stroke-width="1.4"/>' +
    '<text x="10" y="62" font-size="11" fill="#1f2937">45°</text><text x="40" y="18" font-size="11" fill="#1f2937">45°</text>' +
    '<text x="30" y="84" font-size="12" fill="#1f2937">s</text><text x="0" y="46" font-size="12" fill="#1f2937">s</text>' +
    '<text x="42" y="32" font-size="12" fill="#1f2937" transform="rotate(43 42 32)">s√2</text>' +
    '<path d="M6 68 L14 76 L6 76 Z" fill="none" stroke="#1f2937" stroke-width="1"/></svg>';

  function formula(label, expr) {
    return '<div class="bb-formula"><span class="bb-formula-label">' + esc(label) + '</span>' +
      '<span class="bb-formula-expr">' + expr + '</span></div>';
  }
  function referenceHTML() {
    return '<div class="bb-refsheet">' +
      '<div class="bb-ref-grid">' +
      formula('Circle', 'A = πr<sup>2</sup>&nbsp;&nbsp;&nbsp;C = 2πr') +
      formula('Rectangle', 'A = ℓw') +
      formula('Triangle', 'A = ½bh') +
      formula('Right triangle', 'c<sup>2</sup> = a<sup>2</sup> + b<sup>2</sup>') +
      formula('Rectangular prism', 'V = ℓwh') +
      formula('Cylinder', 'V = πr<sup>2</sup>h') +
      formula('Sphere', 'V = <sup>4</sup>⁄<sub>3</sub>πr<sup>3</sup>') +
      formula('Cone', 'V = <sup>1</sup>⁄<sub>3</sub>πr<sup>2</sup>h') +
      formula('Pyramid', 'V = <sup>1</sup>⁄<sub>3</sub>ℓwh') +
      '</div>' +
      '<h4 class="bb-ref-title">Special Right Triangles</h4>' +
      '<div class="bb-ref-triangles"><div>' + TRI30 + '</div><div>' + TRI45 + '</div></div>' +
      '<div class="bb-ref-facts">' +
      '<p>The number of degrees of arc in a circle is 360.</p>' +
      '<p>The number of radians of arc in a circle is 2π.</p>' +
      '<p>The sum of the measures in degrees of the angles of a triangle is 180.</p>' +
      '</div></div>';
  }

  /* ------------------------------------------------------------------
     Bluebook-style modal (Directions / Reference)
     ------------------------------------------------------------------ */
  var modal = null;
  function ensureModal() {
    if (modal) return modal;
    var layer = document.createElement('div');
    layer.className = 'bb-modal-layer';
    layer.id = 'bbModalLayer';
    layer.hidden = true;
    layer.innerHTML = '<div class="bb-modal-backdrop" data-bb-close></div>' +
      '<section class="bb-modal" role="dialog" aria-modal="true" aria-labelledby="bbModalTitle">' +
      '<header class="bb-modal-head"><h2 id="bbModalTitle">Directions</h2>' +
      '<button type="button" class="bb-modal-close" data-bb-close aria-label="Close">Close</button></header>' +
      '<div class="bb-modal-body" id="bbModalBody"></div></section>';
    document.body.appendChild(layer);
    layer.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-bb-close') || e.target.closest('[data-bb-close]')) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !layer.hidden) closeModal();
    });
    modal = layer;
    return layer;
  }
  function openModal(kind) {
    var layer = ensureModal(), body = layer.querySelector('#bbModalBody');
    layer.querySelector('#bbModalTitle').textContent = kind === 'ref' ? 'Reference Sheet' : 'DIRECTIONS';
    body.innerHTML = kind === 'ref' ? referenceHTML() : directionsHTML();
    body.scrollTop = 0;
    layer.hidden = false;
    document.body.classList.add('bb-modal-open');
    var btn = layer.querySelector('.bb-modal-close');
    if (btn) btn.focus();
  }
  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('bb-modal-open');
  }

  /* ------------------------------------------------------------------
     Embedded Desmos — the College Board testing build, floating panel.
     Only mounted for the caller that opts in (mock exam).
     ------------------------------------------------------------------ */
  var DESMOS = {
    graphing: 'https://www.desmos.com/testing/collegeboard/graphing?lang=en',
    scientific: 'https://www.desmos.com/testing/collegeboard/scientific?lang=en'
  };
  var calcPanel = null;
  function ensureCalculator() {
    if (calcPanel) return calcPanel;
    var p = document.createElement('section');
    p.className = 'bb-calc-panel';
    p.id = 'bbCalcPanel';
    p.hidden = true;
    p.setAttribute('aria-label', 'Calculator');
    p.innerHTML = '<header class="bb-calc-head"><b>Calculator</b>' +
      '<div class="bb-calc-tabs"><button type="button" data-calc="graphing" class="on">Graphing</button>' +
      '<button type="button" data-calc="scientific">Scientific</button></div>' +
      '<button type="button" class="bb-calc-close" data-calc-close aria-label="Close calculator">Close</button></header>' +
      '<div class="bb-calc-body"><iframe id="bbDesmosFrame" title="Desmos Calculator" allowfullscreen></iframe></div>' +
      '<div class="bb-calc-grip" aria-hidden="true"></div>';
    document.body.appendChild(p);
    p.querySelector('[data-calc-close]').addEventListener('click', function () {
      p.hidden = true;
      document.body.classList.remove('bb-calc-open');
    });
    p.querySelectorAll('[data-calc]').forEach(function (b) {
      b.addEventListener('click', function () {
        p.querySelectorAll('[data-calc]').forEach(function (x) { x.classList.toggle('on', x === b); });
        p.querySelector('#bbDesmosFrame').src = DESMOS[b.dataset.calc];
      });
    });
    // Bluebook lets the calculator be dragged anywhere on the screen.
    var head = p.querySelector('.bb-calc-head'), drag = null;
    head.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      var r = p.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      head.setPointerCapture(e.pointerId);
    });
    head.addEventListener('pointermove', function (e) {
      if (!drag) return;
      p.style.left = Math.max(0, Math.min(window.innerWidth - 120, e.clientX - drag.dx)) + 'px';
      p.style.top = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - drag.dy)) + 'px';
      p.style.right = 'auto';
    });
    head.addEventListener('pointerup', function () { drag = null; });
    // Bluebook 允许拖拽右下角手柄调整计算器窗口大小。
    var grip = p.querySelector('.bb-calc-grip');
    grip.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var r = p.getBoundingClientRect();
      var startW = r.width, startH = r.height;
      var sx = e.clientX, sy = e.clientY;
      grip.setPointerCapture(e.pointerId);
      function onMove(ev) {
        var w = Math.max(280, Math.min(window.innerWidth - 8, startW + ev.clientX - sx));
        var h = Math.max(220, Math.min(window.innerHeight - 8, startH + ev.clientY - sy));
        p.style.width = w + 'px';
        p.style.height = h + 'px';
      }
      function onUp() {
        grip.removeEventListener('pointermove', onMove);
        grip.removeEventListener('pointerup', onUp);
      }
      grip.addEventListener('pointermove', onMove);
      grip.addEventListener('pointerup', onUp);
    });
    calcPanel = p;
    return p;
  }
  function closeCalculator() {
    var p = calcPanel;
    if (!p) return;
    p.hidden = true;
    document.body.classList.remove('bb-calc-open');
  }
  function openCalculator() {
    var p = ensureCalculator();
    /* 工具栏按钮再次点击即关闭（切换），避免打开后只能找看不见的 Close。 */
    if (!p.hidden) { closeCalculator(); return; }
    p.hidden = false;
    document.body.classList.add('bb-calc-open');
    var frame = p.querySelector('#bbDesmosFrame');
    var active = p.querySelector('[data-calc].on').dataset.calc;
    if (!frame.src || frame.src === 'about:blank') frame.src = DESMOS[active];
  }

  /* Bind the official toolbar buttons. `allowCalculator` is strictly per mode. */
  function bindTools(cfg) {
    var ref = document.getElementById(cfg.reference || 'btnReference');
    var dir = document.getElementById(cfg.directions || 'btnDirections');
    var calc = document.getElementById(cfg.calculator || 'btnCalculator');
    if (ref) ref.addEventListener('click', function () { openModal('ref'); });
    if (dir) dir.addEventListener('click', function () { openModal('dir'); });
    if (calc) {
      if (cfg.allowCalculator) calc.addEventListener('click', openCalculator);
      else calc.hidden = true;
    }
  }

  window.TD_UI = {
    esc: esc,
    directionsHTML: directionsHTML,
    referenceHTML: referenceHTML,
    openModal: openModal,
    closeModal: closeModal,
    openCalculator: openCalculator,
    bindTools: bindTools
  };
})();
