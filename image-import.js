/* 临时引导：完整实现从仓库历史版本（1fa733e）经 jsDelivr 取回，避免页面空窗。
   本地克隆恢复后用真实文件覆盖这一份。 */
(function () {
  var GOOD = 'https://cdn.jsdelivr.net/gh/TimNotCook/SAT-Math@1fa733e347676662b6c63a41d94d2343da3f9516/image-import.js';
  var s = document.createElement('script');
  s.src = GOOD; s.async = false;
  s.onerror = function () {
    var d = document.getElementById('imgimpDiag');
    if (d) d.textContent = '导入模块加载失败（CDN 不可达），按 Ctrl+Shift+R 硬刷新再试。';
    var st = document.getElementById('imgimpStatus');
    if (st) st.textContent = '导入模块没加载成功；把题干文字贴进框里点「用文字导入」同样能配题。';
  };
  document.head.appendChild(s);
})();
