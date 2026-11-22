/* theme.js — 淡奶白/暗黑主题切换
   默认永远是 light（淡奶白），不跟随系统暗黑。
   用户点右下角按钮主动选 dark 后 localStorage 记住选择。
   右下角浮动圆形按钮，文字标示（明/夜），无 emoji。 */
(function(){
  var root=document.documentElement,KEY='tdsat_theme';
  function stored(){return localStorage.getItem(KEY)}
  function curTheme(){var s=stored();return s||'light'}  // 默认 light，不跟随系统
  function apply(t){root.setAttribute('data-theme',t)}
  apply(curTheme());  // 首屏尽早设定，避免闪屏
  function ready(fn){document.readyState!=='loading'?fn():document.addEventListener('DOMContentLoaded',fn)}
  ready(function(){
    var b=document.createElement('button');
    b.id='theme-toggle';
    b.setAttribute('aria-label','切换明暗主题');
    b.style.cssText='position:fixed;right:22px;bottom:22px;z-index:9999;width:46px;height:46px;' +
      'border-radius:50%;border:1px solid rgba(60,50,40,.12);background:rgba(255,255,255,.72);' +
      '-webkit-backdrop-filter:blur(14px) saturate(140%);backdrop-filter:blur(14px) saturate(140%);' +
      'cursor:pointer;font:600 15px/1 "Space Grotesk","Inter",system-ui,sans-serif;' +
      'color:#1d1d1f;box-shadow:0 4px 14px rgba(60,50,40,.18);transition:transform .2s,box-shadow .2s;' +
      'display:grid;place-items:center;user-select:none';
    function label(){return root.getAttribute('data-theme')==='dark'?'明':'夜'}
    // 显示"将要切到的目标"：当前暗→显示"明"(点切到明)；当前明→显示"夜"(点切到夜)
    b.textContent=label();
    b.onclick=function(){
      var cur=root.getAttribute('data-theme');
      var next=cur==='dark'?'light':'dark';
      localStorage.setItem(KEY,next);apply(next);b.textContent=label();
    };
    b.onmouseenter=function(){b.style.transform='translateY(-2px)';b.style.boxShadow='0 8px 20px rgba(60,50,40,.22)'}
    b.onmouseleave=function(){b.style.transform='translateY(0)';b.style.boxShadow='0 4px 14px rgba(60,50,40,.18)'}
    document.body.appendChild(b);
  });
})();
