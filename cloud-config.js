/* 账号配置：
   图片识别导入（image-import.js）走应用已开通的云端视觉模型（publishableKey 无权限，
   服务端按 Origin 授权，仅 timnotcook.github.io 可用，无需用户登录、不落地密钥）。
   账号登录/进度同步走下面的 Firebase 配置，两者互不影响。 */
window.TD_CLOUD_CONFIG = {
  /* Supabase：账号 + 进度同步后端。填 Project URL 与 anon public key 即启用；
     留空则完全不影响现有 WorkBuddy / Firebase / GitHub 三条通道。 */
  supabase: {
    url: 'https://ofsnrzfmjqyrmkvdwnbo.supabase.co',
    anonKey: 'sb_publishable_lUmLQYeK0WBOh3BfTb9OXA_pxX_wjbp',
    /* 用户名即身份：内部伪邮箱 = <用户名>@emailDomain，用户不填也不显示 */
    emailDomain: 'satmath.local'
  },
  endpoint: 'https://wbapp-ppcowwierzgpcol1drmipc.app.workbuddy.host',
  oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth',
  publishableKey: 'wbpk_pPcOWwIERzGpCOL1DrMIpc_LE340Pmct6RC6isIn87fzbeYBy6JP1XJ',
  firebase: {
    apiKey: 'AIzaSyCkY3Mdi3jCNRymVI2nBdP_wndDdaAGQRc',
    authDomain: 'sat-math-a07ae.firebaseapp.com',
    projectId: 'sat-math-a07ae',
    storageBucket: 'sat-math-a07ae.firebasestorage.app',
    messagingSenderId: '724328673777',
    appId: '1:724328673777:web:512514efc92ce22a1d9450'
  }
};

/* 登录态面板兜底：会话从本地恢复、云端档案尚未读完期间，启动时的「未登录」旧提示
   可能残留在已经渲染的档案块上方，造成「未登录 + 档案块/退出登录」同屏矛盾。
   按面板实际渲染内容校正状态文案（档案块存在时不再显示未登录）。 */
(function () {
  function reconcile() {
    var status = document.querySelector('.td-acct-panel .td-acct-status');
    if (!status) return;
    var prof = document.querySelector('.td-acct-panel .td-prof');
    if (prof && status.textContent.indexOf('未登录') === 0) {
      status.textContent = '已登录 · 进度自动保存';
      status.setAttribute('data-kind', 'ok');
    }
  }
  new MutationObserver(reconcile).observe(document.documentElement, {
    childList: true, subtree: true, characterData: true
  });
})();
