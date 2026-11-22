/* theme.js — 淡奶白/暗黑主题
   默认永远是 light（淡奶白），不跟随系统暗黑。
   主题入口收进「设置 → 外观」面板，本文件只负责：
   1) 首屏尽早应用已保存主题（避免闪屏）
   2) 暴露 window.TDGetTheme / TDSetTheme 供设置面板读写 */
(function(){
  var root=document.documentElement,KEY='tdsat_theme';
  function stored(){try{return localStorage.getItem(KEY)}catch(e){return null}}
  function curTheme(){var s=stored();return (s==='dark'||s==='light')?s:'light'}  // 默认 light，不跟随系统
  function apply(t){root.setAttribute('data-theme',t)}
  apply(curTheme());  // 首屏尽早设定，避免闪屏

  // 供「设置 → 外观」面板调用（单一数据源，避免 key 名散落多处）
  window.TDGetTheme=function(){return curTheme()};
  window.TDSetTheme=function(t){
    t=(t==='dark')?'dark':'light';
    try{localStorage.setItem(KEY,t)}catch(e){console.warn('保存主题失败',e)}
    if(window.TDSync)try{window.TDSync.notify(KEY)}catch(e){console.warn('同步通知未生效',e)}
    apply(t);
  };

  /* 离线/首屏优化：注册 Service Worker（sw.js）。仅在 https 或 localhost 下注册，
     避免 file:// 或非标准环境下报错；注册失败静默忽略，不影响正常浏览。 */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', function () {
      try { navigator.serviceWorker.register('sw.js', { scope: './' }); } catch (e) {}
    });
  }
})();
