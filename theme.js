/* theme.js — 奶白/暗黑主题切换
   默认跟随系统 prefers-color-scheme；用户点按钮切换后 localStorage 记住选择。
   右下角浮动圆形按钮，文字标示（明/夜），无 emoji。 */
(function(){
  var root=document.documentElement,KEY='tdsat_theme';
  function stored(){return localStorage.getItem(KEY)}
  function sysDark(){return matchMedia('(prefers-color-scheme:dark)').matches}
  function curTheme(){var s=stored();return s||(sysDark()?'dark':'light')}
  function apply(t){root.setAttribute('data-theme',t)}
  apply(curTheme());  // 首屏尽早设定，避免闪屏
  // 系统主题变化时，若用户未手动选过，跟随系统
  matchMedia('(prefers-color-scheme:dark)').addEventListener('change',function(){
    if(!stored())apply(sysDark()?'dark':'light');
  });
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
