# 账号模型 UI 级实测脚本

> **状态：已过期，当前跑不出通过结果（2026-11-26 核对）**
> 这两个脚本按「用户名注册 / 用户名+密码登录」的旧面板写死（点击「没有账号？用用户名注册」、往 `3–20` 输入框填用户名）。
> `d410776` 之后登录已收敛为**邮件 magic link 单通道**，线上根本没有这些表单，所以第 1 步注册就会停在「未登录」。
> 另外它们原先 `import './seq_lib.mjs'`，而仓库里只有 `lib.mjs`，会直接 `ERR_MODULE_NOT_FOUND`（已改成 `./lib.mjs`，语法可解析，但流程仍不成立）。
> 保留是为了留档后端验收序列（`docs/account-model.md` 第六、七节）的复现路径。**当前登录链路的自动验收请用 `tools/verify_cloud_branches.mjs`**（替身后端、不需要邮箱，覆盖档案落地 / 云端不可达 / 换账号不串档 / 未登录 / magic link 回跳五条分支）。

两个脚本都用**真实浏览器 GUI 路径**（设置 → 账户 → 表单 → 按钮），不直接调 Auth/PostgREST 接口，
所以测的是用户实际会走的那条链路。

## 依赖
- macOS + Google Chrome（脚本按 `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` 启动）
- Node ≥ 18（用内置 `WebSocket`，不需要 `ws` 包）
- 出网可访问 `https://timnotcook.github.io/SAT-Math/`

## 跑法
```bash
node docs/e2e/account-two-browser.mjs   # 两台独立浏览器（两个全新 profile）
node docs/e2e/account-one-browser.mjs   # 同一台机器 / 同一浏览器
```
每个脚本往 stdout 打一行一行的 JSON 步骤日志（`t` 为相对秒数），同时落一份到
`/tmp/e2e-full-log.json` / `/tmp/e2e-one-log.json`，截图落 `/tmp/e2e-*.png`。

判定标准（脚本不会自己 exit 非零，按日志断言）：
1. 注册后 `loggedIn=true`；
2. 另一台用同一用户名登录后 `arch` 与 A 机一致；
3. 改名后 `status` 含「用户名已改为 …，旧名已失效。」；
4. 旧名登录后 `.td-acct-err` 为「这个用户名已经改过名，请用新用户名登录。」；
5. 新名登录后 `loggedIn=true`，且打开同一题 `.drill-choice[aria-pressed="true"]` 仍是原来那个选项。

## 注意
- 脚本每次会新建 `qa.seq*` / `qa.sq*` / `qa.one*` / `qa.on*` 账号，跑完要按
  `docs/sql/account-model.sql` 里的清理语句删掉（否则 `usernames` 里留垃圾）。
- 全程只用 publishable key（前端现有配置），**没有 service role key**，也没有任何改
  `auth.users.email` 的动作。
