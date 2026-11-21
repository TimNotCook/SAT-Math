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
  window.TD_FIG_SPECS = window.TD_FIG_SPECS || {};
  Object.assign(window.TD_FIG_SPECS, TABLES);
})();
