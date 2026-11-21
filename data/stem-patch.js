/* 题干订正补丁：SP1-049 / SP1-091 的题干里残留了原始表格文本行，
   与 figures.js 中同一题的矢量表格重复显示。此处在运行时覆盖两条题干，
   正式数据文件订正随下一次完整推送同步。 */
(function () {
  var FIX = {
    'SP1-049': 'The table shows some values of x and their corresponding values f(x) for the linear function f. What is the x-intercept of the graph of y = f(x) in the xy-plane?',
    'SP1-091': 'The table shows the coordinates of three points on a line in the xy-plane, where k and n are constants. If the slope of the line is 2, what is the value of k + n?'
  };
  (window.TD_BANK && window.TD_BANK.questions || []).forEach(function (q) {
    if (q && FIX[q.id]) q.stem = FIX[q.id];
  });
  if (window.TD_TEXT) {
    Object.keys(window.TD_TEXT).forEach(function (k) {
      if (FIX[k] && window.TD_TEXT[k]) window.TD_TEXT[k].stem = FIX[k];
    });
  }
})();
