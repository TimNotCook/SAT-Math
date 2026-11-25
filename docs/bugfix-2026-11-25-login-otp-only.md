# 修复记录：登录通道收敛为 Supabase 邮箱验证码 OTP（2026-11-25）

## 目标形态
设置 → 账户页只保留一条流程：**填邮箱 → 点「获取验证码」→ 填邮件里的 6 位码 → 登录**；
首次登录自动建档。没有密码、没有用户名、没有 GitHub 令牌、没有 Firebase、没有 WorkBuddy
登录；面板里不再出现「或改用下方 XX 登录」这类分流文案。账户 / 进度同步的数据通道
只保留 Supabase 一条。

## 删除项（逐项；删前已全仓 grep 核对调用链）

### 1. GitHub 令牌通道
- **删文件** `github-auth.js`（`sat-math-data` / `progress.json` 本地令牌那套）；
  `drill.html` / `exam.html` / `wrong.html` 里对应的 `<script>` 标签一并摘除。
- `cloud-account.js` 删除：`TDGH` 变量、GitHub 令牌按钮渲染、令牌校验 / 保存 / 退出、
  以及把错误往 GitHub 令牌登录引导的映射分支。

### 2. 用户名 + 密码区
- `supa-cloud.js` 删除：`loginEmail` / `bindUsername` / `renameUsername` / `register` /
  `signInEmail` / `startRegister` / `signUpEmail` / `confirmRegister` / `resendCode` /
  `sendReset` / `usernameTaken` 类探测、`resolve_login` RPC 调用、`usernames` 表读写，
  以及配套的 `emailDomain` / `internalEmail` / `validUser` / `userMetaPayload` 旧逻辑。
- `cloud-account.js` 删除：注册 / 登录表单、用户名展示行、改名行、注册查重提示与
  「需先注册」那套状态机。删干净后不再保留任何「读不到计数」的哑探测。

### 3. Firebase 登录入口
- `cloud-config.js` 删除 firebase 配置段；`cloud-account.js` 删除 FB 分支
  （`TDFB` 状态订阅与错误映射）。

### 4. WorkBuddy / WB 验证码通道
- **删文件** `workbuddy-cloud.js`（`TDWB` 登录适配器）、`auth-relay.html`（relay iframe）。
- `tools/probe_cloud_db.mjs`、`tools/probe_cloud_storage.mjs` 是旧 WB 后端（profiles /
  usernames 表、runtime 桶）的考古探针，仅服务已删通道，一并下线。
- `cloud-account.js` 删除 WB 的 `sendOtp` / `verifyOtp` / `signInPassword` /
  `registerWithPassword` / `resetPassword` 全部分支与对应 UI。

### 5. 兜底分流文案
错误映射里所有「改用 Firebase / GitHub 令牌登录」的引导文案全部清除；新错误映射只覆盖
OTP 场景（邮箱格式、验证码无效 / 过期、频率上限、网络异常、服务端异常）。

### 6. 数据通道与 CSP
- 账户 / 进度同步只保留 Supabase；五页 CSP `connect-src` 摘掉 `https://api.github.com`。
- **保留项（不属于登录通道，勿再删）**：`image-import.js` 的云端视觉模型（VLM）会话是
  独立功能；其 Cloud SDK、`endpoint` / `oauthRelayBaseUrl` / `publishableKey` 以及
  `wbapp-*.app.workbuddy.host`、`www.workbuddy.cn` 两个 CSP 源保留。

## 新流程（前端实现）
- **发码**：`TDSUPA.sendOtp(email)` → `POST /auth/v1/otp`，body `{ email, create_user: true }`，
  带 `apikey` 头；前端 60 秒重发冷却。
- **收码**：`TDSUPA.verifyOtp(email, code)` → `POST /auth/v1/verify`，body
  `{ type: 'email', token: '<6 位码>', email }`；成功后按既有 `packSession` 结构落
  localStorage（key `tdsat_auth_v1`：`access` / `refresh` / `expiresAt` / `user`）。
- **会话持久**：启动 `boot()` 本地恢复 → `refresh_token` 续期 → `/auth/v1/user` 校正；
  `storage` 事件跨标签页同步；20 分钟兜底续期。刷新页面、关标签页再开、跨标签页不丢。
- **面板**：未登录只渲染邮箱框 +「获取验证码」+ 验证码框 +「登录」；登录态渲染档案卡 +
  昵称编辑 +「退出登录」，界面不展示邮箱。

## 验收证据（本地 CDP 无头 Chrome，工作副本快照）

### ① 面板 DOM 命中数（面板 `innerText` 逐项计数）
| 页面 | 面板存在 | GitHub 令牌 | 用户名 | Firebase | 密码 | 获取验证码 |
|---|---|---|---|---|---|---|
| index.html（跳转 drill） | 是 | 0 | 0 | 0 | 0 | 1 |
| drill.html | 是 | 0 | 0 | 0 | 0 | 1 |
| exam.html?mode=mock | 是 | 0 | 0 | 0 | 0 | 1 |
| wrong.html | 是 | 0 | 0 | 0 | 0 | 1 |
| jiangyi.html | 否（设计上不加载 `cloud-account.js`，与 `verify_acct_entry` 既有核对一致） | 0 | 0 | 0 | 0 | 0 |

结构化结果：`docs/ui-shots/bugfix-2026-11-25/otp-probe-result.json`。

### ② 真实发码（mail.tm 一次性信箱）
- 信箱：`timotp1795609811@euploading.com`（mail.tm，非 mailinator）。
- `POST /auth/v1/otp` → **HTTP 200 `{}`**；邮件约 14 秒内到达。
- 发件人 `noreply@mail.app.supabase.io`，主题 `Your sign-in link`。
- 留证：`email-otp-send-response.txt`（发码响应）、`email-otp-body.txt`（正文原文 + 结论）、
  `email-otp-raw.json`（邮件原始 JSON）。
- **邮件当前为 Magic Link 形态**：正文只有一条 `/auth/v1/verify?token=<hash>&type=magiclink`
  链接，没有 6 位数字码（grep 到的 `333333` / `666666` 均为模板颜色值 `#333333` /
  `#666666` 的片段）。链接 `redirect_to=http://localhost:3000`，说明 Site URL 未设置。

### ③ 登录态持久
用 magic link 换得的真实会话（access / refresh / `expires_in=3600`）注入 localStorage 后：
- 刷新页面：`data-on=1`、档案卡存在、`tdsat_auth_v1` 仍在；
- 第二次刷新：仍 `data-on=1`、档案卡存在；
- 新开标签页（wrong.html）：仍 `data-on=1`、档案卡存在。
会话结构沿用 `packSession`，未另造存储格式。

### ④ 自动化验收
- `node --test test/*.test.js`：**140 通过 / 0 失败**。
- `python3 bump_assets.py --check`：**PASS**，五页同值。
- `verify_nav.mjs`：**38/38 通过**。
- `verify_a11y.mjs`：**20/20 通过**。
- `verify_session.mjs`：**22/22 通过**。
- `verify_acct_entry.mjs`：**16/18 通过**；2 条失败为 `drill-result` 视图入口宽度，
  属既有缺口（侧栏被冻结规则整块 `display:none`、该视图无 `.drill-context-right` 宿主），
  在基线 `origin/main` 上同样 16/18，非本次回归。

### ⑤ 面板尺寸（1280 / 655 / 390 三档）
| 视口 | 面板宽 × 高 | 上限 430×618 |
|---|---|---|
| 1280 | 430 × 330 | 通过 |
| 655 | 430 × 330 | 通过 |
| 390 | 350 × 349 | 通过（窄屏面板收窄，高度未超） |
| 登录态（wrong @1280） | 430 × 413 | 通过 |

截图：`otp-panel-drill-1280.png` / `otp-panel-drill-655.png` / `otp-panel-drill-390.png` /
`otp-panel-loggedin-wrong-1280.png`。

## 未通过 / 待外部动作（总监拍板或提供账号）
1. **验证码邮件模板待改，6 位码链路未实测通过**：当前 Magic Link 模板正文没有
   `{{ .Token }}`，按 `type:email` + 6 位码的 `verify` 无法在真实邮件上跑通。需在
   Supabase Dashboard → Authentication → Email Templates → Magic Link 里加 `{{ .Token }}`
   （或提供 service_role / 个人 access token 走 Management API 修改）。模板改好后需补一次
   真发真收 6 位码的端到端实测。
2. **Site URL 未设置**：邮件链接 `redirect_to=http://localhost:3000`。需在
   Authentication → URL Configuration 把 Site URL 改为
   `https://timnotcook.github.io/SAT-Math/`，否则登录回跳地址不对。
3. **自定义 SMTP 与发码频率上限**：当前走 Supabase 默认邮件通道，需在后台确认 / 调高
   OTP 发码频率上限，避免正常使用时收不到码；后续如需自定义发件域再配 SMTP。

## 既有遗留问题（非本次引入，未改动）
- `drill-result` 结果视图设置入口 `width=0`（验收器 `verify_acct_entry.mjs` 注释已标红，
  宿主缺口待后续决定挂结果页头部或固定角标）。
- 控制台偶见 `exam.js` `bindTools` TypeError、`ERR_CONNECTION_RESET` 网络噪音；
  `exam.js` / `app-core.js` / `grade-core.js` / 共享 CSS 本次均未改动。

## 保留项
- 侧栏「设置」入口的位置结论（`.rail-tail` 组内锚点、`mountButton` 挂载逻辑）沿用
  8722a0c / ea6482f 的修复，未回退成贴底 / 吊最右。

## 证据路径
- 截图与邮件留证：`docs/ui-shots/bugfix-2026-11-25/`
- 单测：`test/otp-login.test.js`（发码 / 收码请求形状、会话落盘、报错映射、本地恢复）

## 提交与版本
- commit：（推送后回填）
- 线上 `?v=`：（推送后回填）
