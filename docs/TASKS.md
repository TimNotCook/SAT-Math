# TASKS.md — 当前任务单

> 最后核实：2026-11-24 13:5x（HK）｜核对人：主会话（当前工作进度）

## 铁律（权威定义：`AGENTS.md` →「🚨 铁律：一切成果只认线上仓库」）

**所有东西只放线上仓库 `TimNotCook/SAT-Math`，不放线下。** 细则（完成的定义、禁止留本地、跨会话交接）以 `AGENTS.md` 为准，这里只记本项目落地动作：

- 唯一权威版本 = `origin/main`；交付前用 `git ls-remote origin refs/heads/main` 核对哈希。
- 本项目现存本地工作区（均为草稿区，不承载独有内容）：Mac `~/Work/SAT-Math`、`~/Work/SAT-Math-live`、云主机 `~/SAT-Math-vm`。
- 任务单、复盘、审计结论写进 `docs/`；截图类证据随任务回帖，不长期堆在本机。
- 推送走 `safe_push.sh`，禁止 `git push --force`。

## 基线快照（已实测）

| 项 | 值 |
|---|---|
| `origin/main` | `54535f9` feat: 设置新增「练习」页签——单元练习计算器开关(默认关闭) |
| 线上页面 | `index` / `drill` / `exam` / `wrong` 全部 HTTP 200 |
| 题库 | 1009 题：easy 281 / medium 564 / hard 164；mcq 641 / grid 368 |
| 单元分布 | 1–268 / 2–204 / 3–452 / 4–85 |
| 登录后端（线上实况） | Firebase + WorkBuddy（**不是死代码，仍在跑**） |
| Supabase 迁移 | 仅存在于分支 `backup/supabase-auth-5a0c22b`，未合并 |

## 任务

### P0-1 仓库归位（负责：主会话）

现状：云主机 `~/SAT-Math-vm` 在 `ca36aa8`，比 `origin/main` 多 1 个提交，内容与 `54535f9` **同一份改动、仅提交信息不同**，已构成分叉。

做法：`git reset --hard origin/main`（该提交无独有内容，丢弃无损），此后只从 Mac 工作区推送。
验收：`git log --oneline -1` 与 `origin/main` 一致；`git status` 无 ahead/behind。

### P0-2 模考 / 单元抽查计算器实测（负责：码农 α、码农 β）

代码层已写明「抽查与模考计算器恒开」（`exam.js`），但没跑过真实流程。
验收：真机分别走「全真模考」「单元抽查」各一题，记录计算器是否出现、是否可输入、退出答题阶段是否收起；截图 + 结论回帖。
禁改：`exam.js` 的 `reference/directions/calculator` 按钮映射（除非先复现出 bug）。

### P1-1 登录收尾（负责：开发者）

1. 用户名登录缺映射表 → 补映射（username → email）。
2. 无 `profiles` 表 → 云同步只有一半，明确是补表还是砍掉该功能。
3. 顺带清 CSP 白名单 + 确认 Firebase/WorkBuddy 哪些调用真正在用（决定 Supabase 分支是合并还是废）。
验收：三通道（邮箱验证码 / 邮箱+密码 / Google）各登录一次成功；`docs/` 内更新登录说明与 CSP 清单。
禁改：`data/*.js`、`*.html` 结构（版本号交给 `bump_assets.py`）。

### P1-2 1.7.T2 的 22 题（等待输入）

内部验算全对，但用户认为有问题。**需要题号**才能定位，暂不派工。

### P2-1 死副本清理（负责：总监确认后执行）

`~/Work/SAT-Math-Prep` 对应仓库与 Pages 均已 404，唯一作用是让人改错地方。确认无独有内容后移除。

## 交付协议

1. 改完 → `bash safe_push.sh "type(scope): 说明"`。
2. 回帖必须带：commit hash、改动文件清单、验收结论（通过/不通过 + 证据）。
3. 只报"已推送"不算完成，要报 Pages 生效后的线上验证结果。

## 待用户输入

- `https://www.doubao.com/thread/xovpnBYWLN7JTDVFL` 打开为空白（`shareInfo` 为空 / `web_fetch` 404），正文需用户直接贴出。
- 1.7.T2 那 22 题的题号。
