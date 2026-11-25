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

## 验收证据

### ① 自动化验收（本地 CDP 无头 Chrome，工作副本快照）
- `node --test test/*.test.js`：**142 通过 / 0 失败**（含本轮新增的 magic link hash 接住两条用例）。
- `python3 bump_assets.py --check`：**PASS**，五页同值 `b85a0a3210c2`。
- `verify_nav.mjs`：**38/38 通过**。
- `verify_a11y.mjs`：**20/20 通过**。
- `verify_session.mjs`：**22/22 通过**。
- `verify_acct_entry.mjs`：**15/18 通过**。其中 2 条 `drill-result` 视图入口宽度为既有基线缺口
  （侧栏被冻结规则整块 `display:none`、该视图无 `.drill-context-right` 宿主），基线 `origin/main`
  同样存在；1 条 `jiangyi.html` 断言本轮按新需求预期变红（工具冻结未改，见下方阻塞说明）。

### ② 真机端到端（mail.tm 一次性信箱 + CDP 线上站）
> 本节在推送上线后补齐：发信留证、同上下文打开邮件链接落点、登录态持久（刷新 / 新标签页）、
> 档案表只读查询返回体。

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
- （推送后回填：commit hash、线上 `?v=` 实测值与时刻）
