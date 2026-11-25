# 修复记录：登录过渡为 Supabase 邮件链接（magic link）单通道（2026-11-25）

## 目标形态（本轮过渡版）
设置 → 账户页只保留一条流程：**填邮箱 → 点「发送登录邮件」→ 收信 → 点邮件里的登录按钮 →
回站自动登录**；首次登录自动建档。没有密码、没有用户名、没有 GitHub 令牌、没有 Firebase、
没有第三方登录；面板里不再出现「或改用下方 XX 登录」这类分流文案。账户 / 进度同步的数据通道
只保留 Supabase 一条。

> 文档文件名沿用第一轮的 `bugfix-2026-11-25-login-otp-only.md`；形态已从「6 位邮箱验证码」
> 过渡为「邮件链接登录」。

## 第一轮已落地的删除项（仍有效，未回退）
- **GitHub 令牌通道**：删 `github-auth.js` 与各页 `<script>` 标签；面板删除令牌按钮 / 校验 / 保存 / 退出。
- **用户名 + 密码区**：`supa-cloud.js` 删除注册 / 登录 / 改名 / 查重 / RPC 调用与 `usernames` 表读写；
  `cloud-account.js` 删除整套注册登录状态机。
- **Firebase 入口**：删 firebase 配置段与 `TDFB` 分支。
- **WorkBuddy / WB 验证码通道**：删 `workbuddy-cloud.js`、`auth-relay.html` 与两个旧后端考古探针。
- **兜底分流文案**：错误映射里所有引导到其他通道的文案清除。
- **保留项（不属于登录通道，勿再删）**：`image-import.js` 云端视觉模型（VLM）会话是独立功能；
  其 Cloud SDK、`endpoint` / `oauthRelayBaseUrl` / `publishableKey` 以及
  `wbapp-*.app.workbuddy.host`、`www.workbuddy.cn` 两个 CSP 源保留。

## 本轮改动（链接登录过渡形态）

### 1. 前端接住邮件链接回调（核心新增，`supa-cloud.js`）
- 页面 `boot()` 启动时先调 `consumeHashSession()`：解析 `location.hash` 里的
  `access_token` / `refresh_token` / `expires_at` / `expires_in`（`type=magiclink`），
  按 `packSession` 等价结构落 localStorage（key `tdsat_auth_v1`），再用
  `history.replaceState(null, '', location.pathname + location.search)` 清掉 hash，
  避免 token 留在地址栏。
- hash 里不带 `user` 对象；落盘后由 `boot()` 后续的 `/auth/v1/user` 请求补全档案。
- `index.html` 是跳转壳，第 8 行 `location.replace('drill.html' + location.search + location.hash)`
  原样带 hash，链路具备，未在 index 丢 hash。

### 2. 面板去掉 6 位码输入框（`cloud-account.js`）
- 删除验证码输入框（原 `ui.otpCode`）、`doVerifyOtp()` 动作与「登录」宽按钮；未登录面板只留
  邮箱框 +「发送登录邮件」按钮（60 秒冷却后变「重新发送」）。
- 按钮文案：「发送登录邮件」；发送后提示：
  > 已发送到 X@Y，点邮件里的登录按钮即可完成登录。链接只能用一次，请尽快点击（也可以在垃圾箱里找一下）。
- **不写「5 分钟内有效」**：真实链接有效期尚未实测，未测出前界面不标注时长。
- `sendOtp` / `verifyOtp` 后端接口在 `supa-cloud.js` **保留未删**，加阻塞注释；
  另导出 `sendMagicLink` 作为 `sendOtp` 的语义别名供面板调用。

### 3. 讲义页挂上账户面板（`jiangyi.html`）
- CSP `connect-src` 补 `https://*.supabase.co https://*.supabase.in`。
- `jiangyi-page.js` 之后按 drill 同序补 `cloud-config.js` → `supa-cloud.js` → `cloud-account.js`；
  最小集判断：`app-ui.js` 渲染顶部导航（讲义是静态侧栏，不需要）、`progress-save.js` 是
  手动存档面板（cloud-account 自带 10s 兜底轮询 + pagehide 自动保存），均不挂。
- 设置入口沿用已落地的 `.rail-tail` 结论：在 `.rail-back` 之后成组，≤999 整组靠右；
  做题视图 `.drill-context-right` 兜底宿主已存在。

### 4. 会话持久（沿用，未另造格式）
启动 `boot()` 本地恢复 → `refresh_token` 续期 → `/auth/v1/user` 校正；`storage` 事件跨标签页
同步；20 分钟兜底续期。刷新页面、关标签页再开、跨标签页不丢。

### 5. `redirect_to` 改走 query string（本轮定位到的回跳根因，`supa-cloud.js`）
- **现象**：浏览器发出的 `/auth/v1/otp` 请求体已带 `redirect_to=https://timnotcook.github.io/SAT-Math/`，
  但收到的邮件链接仍回落站点根 `https://timnotcook.github.io/`，丢掉 `/SAT-Math/` 路径段；
  而不带 Origin 的直连 curl 复测后端认 `redirect_to`。
- **定位**：在页面 origin 内手动 `fetch`（绕过前端封装）复测，邮件链接同样回落根；再把
  `redirect_to` 拼到 **URL query string**（`/auth/v1/otp?redirect_to=...`）后，邮件链接正确指向
  SAT-Math。结论：**本项目 GoTrue 版本从 query string 读 `redirect_to`，JSON body 里的同名字段被忽略**；
  body 字段保留以兼容其他版本，两处都带。
- 实现：`sendOtp` 内 `SITE_URL` 存在时，`body.redirect_to` 与 query `?redirect_to=`（`encodeURIComponent`）
  同时带上；单测断言两处形状。

## 验收证据

### ① 自动化验收（本地 CDP 无头 Chrome，工作副本快照）
- `node --test test/*.test.js`：**142 通过 / 0 失败**（含 magic link hash 接住、`redirect_to` 进 body 与 query 的形状用例）。
- `python3 bump_assets.py --check`：**PASS**，五页同值 `4e757a6431a8`。
- `verify_nav.mjs`：本地 **38/38**，线上 `https://timnotcook.github.io/SAT-Math` **38/38**。
- `verify_a11y.mjs`：本地 **20/20**，线上 **20/20**。
- `verify_session.mjs`：本地 **22/22**，线上 **22/22**。
- `verify_acct_entry.mjs`：本地 **15/18 通过**。其中 2 条 `drill-result` 视图入口宽度为既有基线缺口
  （侧栏被冻结规则整块 `display:none`、该视图无 `.drill-context-right` 宿主），基线 `origin/main`
  同样存在；1 条 `jiangyi.html` 断言本轮按新需求预期变红（工具冻结未改，见下方阻塞说明）。

### ② 真机端到端（mail.tm 一次性信箱 + CDP 线上站，2026-11-25 晚 HKT）
- **测试信箱**：`timlink7184908455@euploading.com`（一次性，留 `progress` 残留行，见阻塞项 4）。
- **发信**：线上 `drill.html` 填邮箱 → 点「发送登录邮件」；面板提示
  「已发送到 timlink7184908455@euploading.com，点邮件里的登录按钮即可完成登录。链接只能用一次，请尽快点击（也可以在垃圾箱里找一下）。」
  按钮冷却变「重新发送 (60s)」。
- **邮件链接**：`/auth/v1/verify?token=c7ca2e86…&type=magiclink&redirect_to=https://timnotcook.github.io/SAT-Math/`
  （回跳地址正确，未丢 `/SAT-Math/` 段）。邮件原文与原始 JSON 存证：
  `email-link-body.txt`、`email-link-raw.json`。
- **落点**：同上下文打开链接 → `https://timnotcook.github.io/SAT-Math/drill.html`，`location.hash` 已清空；
  面板 `data-on=1`、档案卡在、`tdsat_auth_v1` 已落盘，状态「已登录 · 进度自动保存」。
- **持久化**：刷新 `drill.html` 仍登录（同 `uid 6eb83327-757d-4cf3-b107-67fd75d8e46b` / 邮箱）；
  新开标签 `wrong.html` 仍登录。
- **档案表只读查询**：
  - `/auth/v1/user`（会话 token）：**200**，返回该用户档案。
  - `/rest/v1/progress`（anon key）：**401**，`code 42501 permission denied`（RLS 生效，匿名读不到）。
  - `/rest/v1/progress`（会话 token）：**200**，返回一行
    `user_id=6eb83327…, nickname=同学, updated_at=2026-11-25T16:26:21.18+00:00`。
- **截图**：`link-loggedin-drill-1280.png`（登录态练习页）、`link-loggedin-wrong-1280.png`（新标签错题页）、
  `e2e-jiangyi-settings-1280.png`（讲义页登录态设置面板）；三档宽度面板
  `link-panel-drill-{1280,655,390}.png`、`link-panel-jiangyi-{1280,655,390}.png`。
- 结构化结果：`e2e-link-result.json`；控制台无未捕获异常。

## Blocked-by-external（外部阻塞，不在前端糊过）
1. **邮件模板门禁：6 位数字码版本当前无解**。Supabase Dashboard 明写
   "Set up custom SMTP to edit templates"，默认 SMTP 下 `{{ .Token }}` 加不进模板；
   `verifyOtp(email, code)` 的 6 位码 `verify` 链路未在真实邮件上跑通。等总监提供自定义
   SMTP 凭据、模板挂上 `{{ .Token }}` 后，再把面板切回数字码版本。
2. **SMTP 额度 / 发码频率上限**：当前走 Supabase 默认邮件通道，发码频率上限需在后台确认 / 调高；
   自定义发件域待配 SMTP。
3. **真实链接有效期未实测**：界面未标注时长；待真机测出过期时间后再决定是否写文案。
4. **测试档案残留**：测试信箱在 `progress` / 档案表留下的行无 `service_role` 删不掉。
5. **`verify_acct_entry.mjs` 的 jiangyi「无入口」断言与新需求冲突**：工具在冻结红线内不能改，
   本轮该断言变红属预期；待后续解冻工具时同步更新断言为「讲义页应加载 cloud-account、有设置入口」。

## 既有遗留问题（非本次引入，未改动）
- `drill-result` 结果视图设置入口 `width=0`（验收器注释已标红，宿主缺口待后续决定挂结果页头部
  或固定角标）。
- 控制台偶见 `exam.js` `bindTools` TypeError、`ERR_CONNECTION_RESET` 网络噪音。

## 保留项
- 侧栏「设置」入口的位置结论（`.rail-tail` 组内锚点、`mountButton` 挂载逻辑）沿用之前的修复，
  未回退成贴底 / 吊最右。

## 证据路径
- 截图与邮件留证：`docs/ui-shots/bugfix-2026-11-25/`
- 单测：`test/otp-login.test.js`（发码请求形状、收码纯函数形状、hash 会话接住、报错映射、本地恢复）

## 提交与版本
- 认证相关提交（main，祖先链）：
  - `8ed6345` / `3991b28`：magic link 首版显式带 `redirect_to`（body 字段；后证实被该 GoTrue 版本忽略）。
  - `aad8ce8`：**最终修复**——`redirect_to` 改走 query string，body 字段保留兼容；五页资源版本号随之重算。
- 线上实测：`https://timnotcook.github.io/SAT-Math/`，五页 `?v=4e757a6431a8`，2026-11-25 晚 HKT 部署后复测一致。
- 单测 142/0；线上 nav 38/38、a11y 20/20、session 22/22；真机 E2E 闭环见上节 ②。
