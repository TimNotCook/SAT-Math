# 设置入口（`.td-acct-btn`）覆盖矩阵

> 量于 2026-11-26（HK），修复后基线 `origin/main`（`cloud-account.js` + `tools/verify_acct_entry.mjs`）。
> 复跑：`node tools/verify_acct_entry.mjs`（**26/26 全绿**）。只读：脚本只做导航、切显隐、量 `getBoundingClientRect`。

## 现状（修完，13 格全绿）

| 页面 | 视图 | 入口宽度 | 宿主 | 判定 |
|---|---|---|---|---|
| `drill.html` | 列表 / 单元 / 专项 | 187 | `.site-rail`（`.rail-tail`） | ✅ |
| `drill.html` | 做题 | 42×33 | `.drill-context-right` | ✅ |
| `drill.html` | 结果 | 44 | `.drill-result-actions`（**本次新增宿主**） | ✅ |
| `exam.html` | 开始页 | 187 | `.site-rail` | ✅ |
| `exam.html` | 作答 | 48 | `.exam-toolbar-actions`（**本次新增宿主**） | ✅ |
| `exam.html` | 检查 / 交卷 / 成绩 | 46 | **固定右下角兜底**（`floating-settings`） | ✅ |
| `wrong.html` | 列表 / 详情 / 空态 | 187 | `.site-rail` | ✅ |
| `jiangyi.html` | 章节列表 / 做题 / 板块 | 187 | `.site-rail` | ✅ |
| `index.html` | 根跳转桩 → drill | 187 | drill 的 `.site-rail` | ✅ |

## 之前的缺口与根因

`app.css:532-537` 的冻结规则：`#questionView` / `#resultView` / `#stage-answer|review|submit|result` 任一露出来，`.site-rail` 就 `display:none!important`。
而 `cloud-account.js` 的 `mountButton.host()` 原本只认两个宿主：可见的 `.site-rail`、可见的 `.drill-context-right`。
作业面一进结果页/模考中后段，两个宿主同时消失 → 按钮留在隐形侧栏里，`width=0`：看得见的地方没有它，它的存在又点不着。

## 修法（只改 `cloud-account.js`，未碰 `jiangyi.html` 与任何 css）

1. `host()` 增加两级宿主候选：`.exam-toolbar-actions`（模考题号条右侧那一排）、`.drill-result-actions`（真题结果页底部按钮排）。
2. 新增 `park()`：候选全不可见时，把按钮挂回 `body` 并固定右下角（`right/bottom:14px` + 白底 + 阴影 + `floating-settings` 类），不再是 0×0。
3. `place()` 增加回收：一旦重新找到可见宿主，清掉 `floating-settings` 与行内样式，回归侧栏/工具条原位。

行为链实测：模考 `intro`（侧栏 187）→ `answer`（题号条 48）→ `review/submit/result`（右下角 46）→ 切回 `intro` 自动收回侧栏 187。

## 回归口径

`tools/verify_acct_entry.mjs`：
- 4 个必测视图 × 4 项（存在 / width>0 / 可点开面板 / 390 宽仍可见）
- 模考五阶段各 1 项（`intro`/`answer`/`review`/`submit`/`result`）
- 首页跳转后入口、讲义页四项
合计 **26 项，全绿**；`tools/verify_nav.mjs` 38/38；`node --test` 142 pass / 0 fail。

## 踩过的坑（留给下一个人）

- 脚本早期固定用 8492 端口，被**别的 worktree 的 `http.server`** 占着，测到的是旧代码目录（表现为“改了没生效”“时好时坏”）。现在改为随机端口 + 写 `.verify-acct-marker` 回读校验，不是本仓库的服务器就换下一个。
- 讲义页自 `dee8483` 起也加载 `cloud-account.js`，旧断言「该页无入口才是预期」已作废。
