# 线上可靠性：2 分钟发现，5 分钟恢复

目标不是“永远没有 Bug”，而是** Bug 不静默到达用户；到了也能在 5 分钟内切回 last-green**。根因修复单独计时，不混进 MTTR。

## 已经落地的三道闸

1. **发布清单**：`pages-deploy` 在打包前跑 `tools/release-manifest.mjs`，线上生成 `release.json`（commit、version、builtAt、runId）。以后判断“线上是哪一版”不再靠猜缓存。
2. **金丝雀**：`tools/canary.mjs` + `.github/workflows/canary.yml`。每 2 分钟检查六页、`release.json`、`version.json`、Supabase `/auth/v1/settings`；Pages 部署完成后也会立刻跑一次，并核对部署提交。失败会发飞书（配了 `FEISHU_WEBHOOK` 时），退出码 1。
3. **一键回滚**：`.github/workflows/rollback.yml`，在 Actions 里填目标完整 SHA，把工作树恢复成该提交、重刷资源版本、跑全量测试后再推回 `main`，由 Pages 重新发布。

## 2 分钟怎么发现

- 页面检查不是只看 200：要有非空 `<title>`、完整 `</html>`、无冲突标记；失败自动重试一次，避免 CDN 瞬时 000 造成误报。
- `release.json` 检查 commit 是 40 位 SHA、`builtAt` 合法；部署后那一次会带 `EXPECTED_SHA`，线上版本不对直接红。
- 认证检查读 `cloud-config.js` 的 Supabase URL/anon key，请求 `/auth/v1/settings`。服务不可用是硬失败；`mailer_autoconfirm=true`、`external.phone=true`、匿名登录开着是安全漂移，默认警告，控制台修好后把 `SECURITY_STRICT` 改成 `1` 变硬门禁。
- 飞书告警只带检查项和错误摘要，不带邮箱、密码、token。

GitHub Actions 的 `schedule` 不保证准点，实际可能延迟到 3–10 分钟。**要硬保证 2 分钟，必须接一个 60 秒级外部探针**（Better Stack / Checkly / 自建 Worker Cron），请求同一个 `tools/canary.mjs` 的等价检查。当前仓库先把 2 分钟排班和告警通道跑起来；外部探针只需要一个能每 60 秒执行 HTTP 检查的服务，接好后把 `CANARY_BASE` 指过来即可。

## 5 分钟怎么恢复

时间线（从告警开始）：

1. **0:00** 告警进飞书，卡片里有站点、失败项、预期 SHA。
2. **0:30** 确认是“整站/认证不可用”还是“单条功能坏”。整站不可用不查日志，直接回滚。
3. **1:00** 打开 Actions → rollback，填上一个已知正常提交的完整 SHA；工作流恢复文件树、`bump_assets.py`、`npm test`、推送。
4. **3:00** Pages 重新发布后，canary 自动跑 `workflow_run`，核对新 `release.json` 的 SHA；绿了才算恢复。
5. **5:00** 发恢复通知，事故单只记录“现象、影响、回滚到哪个 SHA”；根因和回归测试另开任务。

注意：**GitHub Pages 的构建/发布排队本身可能超过 5 分钟**，所以“5 分钟恢复”在当前托管上不是硬保证。要变成硬保证，需要把生产切到支持秒级 promote/rollback 的托管（Cloudflare Pages / Vercel / Netlify），或者加一层可切换版本指针的 Worker。仓库里的 canary 和 rollback 不依赖托管，迁移后可以直接复用。

## 功能开关（下一层）

认证链路建议再加远程开关（`signup` / `password` / `magicLink` / `reset` / `code`），出问题时先关入口、引导到备用链路，不必等回滚。开关不要放 localStorage，放只读远程配置，前端缓存 60 秒。

## 验收

- 线上 `release.json` 的 commit 必须等于本次部署提交。
- 六页 canary 全绿，认证 settings 200。
- 回滚演练：每月一次，从 dispatch 到 canary 绿计时，目标 ≤ 5 分钟；超过就说明托管或流程需要改。
- 每次线上 Bug 必须补一条能复现它的测试；没有回归测试不算修完。

> 本次先跑通 2 分钟排班与告警；60 秒外部探针只差一个常驻执行器，检查逻辑已复用。
