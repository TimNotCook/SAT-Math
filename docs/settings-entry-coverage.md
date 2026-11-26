# 设置入口（`.td-acct-btn`）覆盖矩阵

> 量于 2026-11-26（HK），基线 `origin/main dee8483`。复跑：`node tools/verify_acct_entry.mjs`。
> 只读：脚本只做导航、切显隐、量 `getBoundingClientRect`，不写库、不改文件。

## 结论先行

| 页面 | 视图 | 入口宽度 | 宿主 | 判定 |
|---|---|---|---|---|
| `drill.html` | 列表（select） | 187 | `.site-rail` | ✅ |
| `drill.html` | 单元（unit） | 187 | `.site-rail` | ✅ |
| `drill.html` | 专项（special） | 187 | `.site-rail` | ✅ |
| `drill.html` | 做题（question） | 42×33 | `.drill-context-right` | ✅（2269ce4 修的） |
| `drill.html` | **结果（result）** | **0×0** | 留在已隐藏的 `.site-rail` | ❌ |
| `exam.html` | 开始页（intro） | 187 | `.site-rail` | ✅ |
| `exam.html` | **作答（answer）** | **0×0** | 同上 | ❌ |
| `exam.html` | **检查（review）** | **0×0** | 同上 | ❌ |
| `exam.html` | **交卷（submit）** | **0×0** | 同上 | ❌ |
| `exam.html` | **成绩（result）** | **0×0** | 同上 | ❌ |
| `wrong.html` | 列表 / 详情 / 空态 | 187 | `.site-rail` | ✅ |
| `jiangyi.html` | 章节列表 / 做题 / 板块 | 187 | `.site-rail` | ✅（`dee8483` 起才加载 `cloud-account.js`） |
| `index.html` | —（根跳转桩） | 跳转后 187 | drill 的 `.site-rail` | ✅ |

脚本口径：**19/21 通过**，两条红都在 `drill` 结果视图；模考四阶段作为 `INFO` 行打印（同一根因，未计入通过数，避免把已知缺口算成两套失败）。

## 根因（一处，不是五个 bug）

`app.css:532-537` 的冻结规则：

```css
body.site-shell:has(#questionView:not([hidden])) .site-rail,
body.site-shell:has(#resultView:not([hidden])) .site-rail,
body.exam-page:has(#stage-answer:not([hidden])) .site-rail,
body.exam-page:has(#stage-review:not([hidden])) .site-rail,
body.exam-page:has(#stage-submit:not([hidden])) .site-rail,
body.exam-page:has(#stage-result:not([hidden])) .site-rail { display:none!important }
```

`cloud-account.js:1245-1253` 的 `mountButton` 只认两个宿主：可见的 `.site-rail`、或可见的 `.drill-context-right`。
做题视图两者之一可用（改挂工具条）；**结果视图与模考四阶段两个都没有** → 按钮留在 `display:none` 的侧栏里，宽度 0。
点击仍能打开面板（DOM 在、事件在），但用户看不见、点不到 —— 属于“能用但不可发现”的缺口。

## 三个候选修法（交编程者，本线未改）

1. **加第三宿主（推荐）**：在 `mountButton.host()` 里补一个选择器，如结果页/模考阶段的顶栏容器（`.drill-result-inner > header`、`.exam-toolbar` 之类），与 `ctx-settings` 同款幽灵按钮。只改 `cloud-account.js` 一个函数，不碰 html/css。
2. **启用固定角标兜底**：`cloud-account.js:1296-1301` 已有 `position:fixed; right:14px; bottom:14px` 的兜底，但触发条件是「按钮未挂载」；改成「宿主不可见超过 900ms 也启用」即可覆盖所有无宿主视图。同样只动 `cloud-account.js`。
3. **放行侧栏**：在 `app.css` 的冻结规则里给这两个视图留底部一行。这条要动冻结 CSS，需要你批。

修好后把 `verify_acct_entry.mjs` 里 `drill-result` 两条与 `INFO` 的模考四阶段，一并从信息项升级为断言项（脚本已留好位置）。

## 顺带修正的旧口径

- `docs/TASKS.md` 早前写「讲义页不加载 `cloud-account.js`」——**已过期**，`dee8483` 起该页也挂了模块，脚本已改成同标准四项校验。
- 旧脚本断言「讲义页无入口才是预期」，在新 main 上会假红；已改。
