/* 站点云端配置：
   1) 账号登录 / 进度同步：Supabase（window.TD_CLOUD_CONFIG.supabase），
      邮箱账号通道：主路径是「邮箱 + 密码」（mailer_autoconfirm=true，注册当场返回会话，
      不依赖邮件投递）；备用「邮件链接」；6 位数字码仍被 Supabase 的自定义 SMTP 模板门禁卡住，
      手机号登录需要项目开启 Phone provider + 短信服务商凭据，代码已留接口、UI 未接。填了 Project URL 与 anon public key 即启用。
   2) 图片识别导入（image-import.js）走应用已开通的云端视觉模型（WorkBuddy Cloud SDK，
      publishableKey 无权限，服务端按 Origin 授权，仅 timnotcook.github.io 可用，
      无需用户登录、不落地密钥）。endpoint / oauthRelayBaseUrl / publishableKey
      这三个字段只服务图片识别，与账号登录互不影响。 */
window.TD_CLOUD_CONFIG = {
  supabase: {
    url: 'https://ofsnrzfmjqyrmkvdwnbo.supabase.co',
    anonKey: 'sb_publishable_lUmLQYeK0WBOh3BfTb9OXA_pxX_wjbp',
    /* magic link 回跳地址：/otp 请求显式带上 redirect_to，避免后端回退到后台
       Site URL（站点根 timnotcook.github.io）把 /SAT-Math/ 路径段丢掉。 */
    siteUrl: 'https://timnotcook.github.io/SAT-Math/'
  },
  /* 以下三项仅用于图片识别 VLM（image-import.js），不是登录通道。 */
  endpoint: 'https://wbapp-ppcowwierzgpcol1drmipc.app.workbuddy.host',
  oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth',
  publishableKey: 'wbpk_pPcOWwIERzGpCOL1DrMIpc_LE340Pmct6RC6isIn87fzbeYBy6JP1XJ'
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
