/* 小型答案键订正补丁（独立注入，避免改动大文件 stem-patch.js）。
   TD-21-26：原题扫描 images/fig/TD-21-26.png 为「35 米 = ? 厘米」，
   正确 3500；原键 0.74 误抄自密度题。grading 同时读 q.value 与 q.answer，
   两者都覆盖。必须在 questions.js 之后、stem-patch.js 之后加载。 */
(function () {
  function apply() {
    (window.TD_BANK && window.TD_BANK.questions || []).forEach(function (q) {
      if (q && q.id === 'TD-21-26') { q.answer = '3500'; q.value = 3500; }
    });
  }
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
