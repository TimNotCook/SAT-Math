/* 账号配置：
   图片识别导入（image-import.js）走应用已开通的云端视觉模型（publishableKey 无权限，
   服务端按 Origin 授权，仅 timnotcook.github.io 可用，无需用户登录、不落地密钥）。
   账号登录/进度同步走下面的 Firebase 配置，两者互不影响。 */
window.TD_CLOUD_CONFIG = {
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

/* 题库订正（对照 01 Algebra.pdf 原题与 答案 2.pdf）：
   SP1-001 题干漏负号、答案键应为 C；SP1-005 系数与值漏负号。
   待 questions.js / text.js 源文件同步后移除本段。 */
(function () {
  var B = window.TD_BANK || {}, T = window.TD_TEXT || {};
  (B.questions || []).forEach(function (q) {
    if (q.id === 'SP1-001') {
      q.answer = 'C';
      q.stem = 'How many solutions does the equation 10(15x - 9) = -15(6 - 10x) have?';
    }
    if (q.id === 'SP1-005') {
      q.value = '-14/15';
      q.stem = '2(kx - n) = -(28/15)x - 36/19\nIn the given equation, k and n are constants and n > 1. The equation has no solution. What is the value of k?';
    }
  });
  if (T['SP1-001']) T['SP1-001'].stem = 'How many solutions does the equation 10(15x - 9) = -15(6 - 10x) have?';
  if (T['SP1-005']) T['SP1-005'].stem = '2(kx - n) = -(28/15)x - 36/19\nIn the given equation, k and n are constants and n > 1. The equation has no solution. What is the value of k?';
})();

/* fmtMath 热修：在原始分数规则之前保护小数(0.11, 1.06)与千分位整数(90,000)，
   否则 \d+/\d+ 会把 2/0.11 拆成假分数 2/0、把 90,000/12 拆成 000/12。
   幂等：drill.html 内联已装则不再二次包裹（双层包裹会让外层占位符被内层消费）。
   正式修复已写入 figures.js（待 git 推送通道恢复后同步），正式版上线后移除本段。 */
(function () {
  if (!window.TD_FIG || !window.TD_FIG.fmtMath || window.TD_FIG.__fmtGuarded) return;
  window.TD_FIG.__fmtGuarded = true;
  var orig = window.TD_FIG.fmtMath;
  window.TD_FIG.fmtMath = function (raw) {
    var stash = [];
    var guarded = String(raw == null ? '' : raw).replace(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.\d+/g, function (d) {
      stash.push(d);
      return '\uE000' + (stash.length - 1) + '\uE000';
    });
    var out = orig(guarded);
    return out.replace(/\uE000(\d+)\uE000/g, function (_, i) { return stash[+i] || ''; });
  };
})();

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
