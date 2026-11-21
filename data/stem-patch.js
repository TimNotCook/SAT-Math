/* 题干/表格订正补丁：
   1) SP1-049 / SP1-091 题干内残留原始表格行，与 figures.js 的矢量表格重复 → 覆盖题干；
   2) SR-156、SP1-048/050/053/054/089/090/092/099/101 原本只有裸表格行 →
      覆盖题干并注册矢量表格规格，由 tableFig 渲染干净表格。
   正式数据订正随下一次完整推送同步，本文件届时移除。
   注意：必须在 data/figures.js（TD_FIG_SPECS 注册表）之后加载。 */
(function () {
  var STEM = {
    'SP1-049': 'The table shows some values of x and their corresponding values f(x) for the linear function f. What is the x-intercept of the graph of y = f(x) in the xy-plane?',
    'SP1-091': 'The table shows the coordinates of three points on a line in the xy-plane, where k and n are constants. If the slope of the line is 2, what is the value of k + n?',
    'SR-156': 'The table shows three values of x and their corresponding values of y, where y = f(x) + 3. The function f can be written in the form f(x) = x^{3} + bx^{2} + cx + d, where b, c, and d are constants. What is the y-intercept of the graph of y = f(x) in the xy-plane?',
    'SP1-048': 'For the linear function f, the table shows three values of x and their corresponding values of f(x). Function f is defined by f(x) = ax + b, where a and b are constants. What is the value of a - b?',
    'SP1-050': 'For the linear function g, the table shows four values of x and their corresponding values of g(x). The function g can be written as g(x) = mx + b, where m and b are constants. What is the value of b?',
    'SP1-053': 'The table shows two values of x and their corresponding values of y. The graph of the linear equation representing this relationship passes through the point (1/4, a). What is the value of a?',
    'SP1-054': 'The table shows two values of x and their corresponding values of y. The graph of the linear equation representing this relationship passes through the point (1/7, a). What is the value of a?',
    'SP1-089': 'The table gives coordinates of two points on a line in the xy-plane. The y-intercept of the line is (k \u2212 5, b), where k and b are constants. What is the value of b?',
    'SP1-090': 'The table shows three values of x and their corresponding values of f(x). For the linear function f, if h(x) = f(x) \u2212 13, which equation defines h?',
    'SP1-092': 'There is a linear relationship between x and y. The table shows three values of x and their corresponding value of y in terms of a constant n. What is the slope of the line that represents this relationship in the xy-plane?',
    'SP1-099': 'The table shows three values of x and their corresponding values of g(x), where g(x) = f(x)/(x + 3) and f is a linear function. What is the y-intercept of the graph of y = f(x) in the xy-plane?',
    'SP1-101': 'The table shows three values of x and their corresponding values of y, where s is a constant. There is a linear relationship between x and y. Which of the following equations represents this relationship?'
  };
  (window.TD_BANK && window.TD_BANK.questions || []).forEach(function (q) {
    if (q && STEM[q.id]) q.stem = STEM[q.id];
  });
  if (window.TD_TEXT) {
    Object.keys(window.TD_TEXT).forEach(function (k) {
      if (STEM[k] && window.TD_TEXT[k]) window.TD_TEXT[k].stem = STEM[k];
    });
  }
  var TABLES = {
    'SR-156': { type: 'table', head: ['x', 'y'], rows: [['-5', '0'], ['8', '0'], ['9', '0']] },
    'SP1-048': { type: 'table', head: ['x', 'f(x)'], rows: [['1', '-64'], ['2', '0'], ['3', '64']] },
    'SP1-050': { type: 'table', head: ['x', 'g(x)'], rows: [['1', '58'], ['2', '54'], ['3', '50'], ['4', '46']] },
    'SP1-053': { type: 'table', head: ['x', 'y'], rows: [['\u221212', '\u221245'], ['6', '45']] },
    'SP1-054': { type: 'table', head: ['x', 'y'], rows: [['\u221218', '\u221248'], ['7', '52']] },
    'SP1-089': { type: 'table', head: ['x', 'y'], rows: [['k', '13'], ['k + 7', '\u221215']] },
    'SP1-090': { type: 'table', head: ['x', 'f(x)'], rows: [['\u22124', '0'], ['\u221219/5', '1'], ['\u221218/5', '2']] },
    'SP1-092': { type: 'table', head: ['x', 'y'], rows: [['0', 'n'], ['4', 'n + 19'], ['8', 'n + 38']] },
    'SP1-099': { type: 'table', head: ['x', 'g(x)'], rows: [['\u221227', '3'], ['\u22129', '0'], ['21', '5']] },
    'SP1-101': { type: 'table', head: ['x', 'y'], rows: [['\u22122s', '24'], ['\u2212s', '21'], ['s', '15']] }
  };
  /* 图形规格订正：逐题对照 images/fig 原题扫描后覆盖。
     - U4-05 / TD-41-06：原题两条平行线是竖直的（r、s 竖线，t 斜线），
       模板只能画水平平行线 → 改 rawSvg 手绘。
     - TD-42-18：原题为普通锐角三角形（无直角标记），模板默认形状像直角三角形 → 改顶点。
     - TD-43-01：半圆在矩形顶边“上方”（外凸），原规格画成向内凹 → 改 rawSvg。
     - TD-15-01 / TD-15-03：原题无阴影区域，删掉多余 region；线段端点按原图订正。
     - TD-11-03：原题线段继续延伸到 (4.5,-3)，原规格只画到 x 轴交点。
     - TD-22-09 / TD-22-17：原题是平滑曲线，原规格只画孤立点 → 补折线串联。
     - SP1-025 / U1-12 / U1-13：直线斜率、截距与原图不符 → 重定端点。
     - TD-25-15 / TD-25-16 / TD-25-05：柱高、箱线分位数按原图微调。 */
  var FIGFIX = {
    'U4-05': {
      type: 'rawSvg',
      svg: "<svg viewBox='0 0 360 240' xmlns='http://www.w3.org/2000/svg'>\n  <line x1='120' y1='30' x2='120' y2='210' stroke='#162c46' stroke-width='2.2'/>\n  <line x1='240' y1='30' x2='240' y2='210' stroke='#162c46' stroke-width='2.2'/>\n  <line x1='70' y1='215' x2='295' y2='25' stroke='#162c46' stroke-width='2.2'/>\n  <text x='120' y='22' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>r</text>\n  <text x='240' y='22' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>s</text>\n  <text x='303' y='24' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='start'>t</text>\n  <text x='92' y='196' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46'>x°</text>\n  <text x='258' y='60' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46'>y°</text>\n</svg>"
    },
    'TD-41-06': {
      type: 'rawSvg',
      svg: "<svg viewBox='0 0 360 240' xmlns='http://www.w3.org/2000/svg'>\n  <line x1='120' y1='30' x2='120' y2='210' stroke='#162c46' stroke-width='2.2'/>\n  <line x1='240' y1='30' x2='240' y2='210' stroke='#162c46' stroke-width='2.2'/>\n  <line x1='70' y1='215' x2='295' y2='25' stroke='#162c46' stroke-width='2.2'/>\n  <text x='120' y='22' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>r</text>\n  <text x='240' y='22' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>s</text>\n  <text x='303' y='24' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='start'>t</text>\n  <text x='92' y='196' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46'>x°</text>\n  <text x='258' y='60' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46'>y°</text>\n</svg>"
    },
    'TD-42-18': {
      type: 'triangle',
      pts: [[70, 200], [290, 200], [180, 55]],
      labels: ['A', 'C', 'B']
    },
    'TD-43-01': {
      type: 'rawSvg',
      svg: "<svg viewBox='0 0 440 300' xmlns='http://www.w3.org/2000/svg'>\n  <rect x='60' y='140' width='320' height='120' fill='none' stroke='#162c46' stroke-width='2'/>\n  <path d='M 60 140 A 90 90 0 0 1 240 140' fill='none' stroke='#162c46' stroke-width='2'/>\n  <circle cx='150' cy='140' r='3' fill='#0f2a47'/>\n  <text x='52' y='132' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>N</text>\n  <text x='240' y='132' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>P</text>\n  <text x='388' y='132' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>Q</text>\n  <text x='150' y='162' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>O</text>\n  <text x='52' y='282' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>S</text>\n  <text x='388' y='282' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>R</text>\n</svg>"
    },
    'TD-15-01': {
      type: 'chart', x: { min: -6, max: 6, step: 2, label: 'x' }, y: { min: -50, max: 10, step: 10, label: 'y' },
      grid: true, origin: 'O',
      series: [{ kind: 'line', dash: '6 4', points: [[-2, -50], [2, 10]] }]
    },
    'TD-15-03': {
      type: 'chart', x: { min: -8, max: 8, step: 2, label: 'x' }, y: { min: -8, max: 8, step: 2, label: 'y' },
      grid: true, origin: 'O',
      series: [{ kind: 'line', points: [[3, 8], [7, -3]] }]
    },
    'TD-11-03': {
      type: 'chart', x: { min: 0, max: 10, step: 2, label: 'x' }, y: { min: -10, max: 10, step: 2, label: 'y' },
      grid: true, origin: 'O',
      series: [{ kind: 'line', points: [[0, 2], [4.5, -3]] }]
    },
    'TD-22-09': {
      type: 'chart', x: { min: 0, max: 9, step: 1, label: 'Time (seconds)' }, y: { min: 0, max: 11, step: 1, label: 'Momentum (newton-seconds)' },
      grid: true,
      series: [
        { kind: 'line', points: [[0, 1], [1, 1.6], [2, 2], [3, 2.9], [4, 4], [5, 5.6], [6, 8], [7, 9.5], [7.5, 9.7], [8, 9]] },
        { kind: 'points', points: [[0, 1], [2, 2], [4, 4], [6, 8], [8, 9]] }
      ]
    },
    'TD-22-17': {
      type: 'chart', x: { min: 0, max: 6, step: 1, label: 'x' }, y: { min: 0, max: 13, step: 1, label: 'y' },
      grid: true,
      series: [{ kind: 'line', points: [[0, 7], [1, 8.8], [2, 10], [3, 10.6], [4, 11], [5, 10.7], [6, 10]] }]
    },
    'SP1-025': {
      type: 'chart', x: { min: -10, max: 10, step: 2, label: 'x' }, y: { min: -10, max: 10, step: 2, label: 'y' },
      grid: true,
      series: [
        { kind: 'line', points: [[-10, 6], [10, 1.5]] },
        { kind: 'line', points: [[-10, 2], [10, 2]] }
      ],
      marks: [{ x: -5, y: 5 }, { x: 8, y: 2 }]
    },
    'U1-12': {
      type: 'chart', x: { min: -8, max: 8, step: 2, label: 'x' }, y: { min: -8, max: 8, step: 2, label: 'y' },
      grid: true, origin: 'O',
      series: [{ kind: 'line', dash: '6 4', points: [[-1.5, 8], [2.5, -8]] }]
    },
    'U1-13': {
      type: 'chart', x: { min: -6, max: 6, step: 2, label: 'x' }, y: { min: -50, max: 10, step: 10, label: 'y' },
      grid: true, origin: 'O',
      series: [{ kind: 'line', dash: '6 4', points: [[-1, -50], [1.33, 10]] }]
    },
    'TD-25-15': {
      type: 'chart', x: { min: 0, max: 5, step: 1, cats: [['Plot 1', 1.4], ['Plot 2', 2.4], ['Plot 3', 3.4], ['Plot 4', 4.4]] },
      y: { min: 0, max: 90, step: 10, label: 'Trees planted', showZero: true }, grid: true,
      series: [{ kind: 'bar', bars: [{ x0: 1, x1: 1.8, h: 65 }, { x0: 2, x1: 2.8, h: 78 }, { x0: 3, x1: 3.8, h: 82 }, { x0: 4, x1: 4.8, h: 60 }] }]
    },
    'TD-25-16': {
      type: 'chart', x: { min: 0, max: 6, step: 1, cats: [['daisy', 1.4], ['orchid', 2.4], ['tulip', 3.4], ['lily', 4.4], ['sunflower', 5.4]] },
      y: { min: 0, max: 200, step: 20, label: 'Number of flowers', showZero: true }, grid: true,
      series: [{ kind: 'bar', bars: [{ x0: 1, x1: 1.8, h: 60 }, { x0: 2, x1: 2.8, h: 100 }, { x0: 3, x1: 3.8, h: 195 }, { x0: 4, x1: 4.8, h: 185 }, { x0: 5, x1: 5.8, h: 175 }] }]
    },
    'TD-25-05': {
      type: 'chart', x: { min: 80, max: 140, step: 10 }, y: { min: 0, max: 10, step: 10 }, yAxis: false, grid: false,
      series: [{ kind: 'box', lo: 85, q1: 95, med: 112, q3: 122, hi: 138 }]
    }
  };
  var CHOICEFIX = {
    'TD-22-14': { D: { kind: 'line', xInt: 30, yInt: 40, xmax: 40, ymax: 40 } }
  };
  // data/figures.js 会在解析时重置 TD_FIG_SPECS，故表格/图形规格延迟到 DOMContentLoaded 再注册，
  // 避免被后加载的注册表覆盖。题干覆盖（TD_BANK/TD_TEXT）立即生效。
  function registerTables() {
    window.TD_FIG_SPECS = window.TD_FIG_SPECS || {};
    Object.assign(window.TD_FIG_SPECS, TABLES);
    Object.assign(window.TD_FIG_SPECS, FIGFIX);
    window.TD_CHOICE_GRAPHS = window.TD_CHOICE_GRAPHS || {};
    Object.keys(CHOICEFIX).forEach(function (k) {
      window.TD_CHOICE_GRAPHS[k] = window.TD_CHOICE_GRAPHS[k] || {};
      Object.assign(window.TD_CHOICE_GRAPHS[k], CHOICEFIX[k]);
    });
  }
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', registerTables);
  } else {
    registerTables();
  }
})();
