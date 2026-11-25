# 回执：JY1-042 note 口径改为「教材漏印」

窗口：2026-11-25 · 执行：开发者（数据侧）

## 一、改了什么

| 文件 | 改动 | 边界 |
| --- | --- | --- |
| `data/jiangyi.js` | `JY1-042.note` 整句替换：旧「第一条被页眉压掉、全页无痕迹」→ 新「教材原页只印出一条 y > 7x - 4，题干写作 system of inequalities 与页面不符，属教材漏印；按原页录入可见内容，不自行补写。」 | 只此 1 行 |
| `jiangyi.html` / `index.html` / `exam.html` / `drill.html` / `wrong.html` | 仅 `?v=27bac4fad34b` 机械版本串（`bump_assets.py` 产出，五页同值） | 无内容变更 |

**未动**（逐项复核）：`stem`（首行 `y > 7x - 4` + 第二行 `For which … system of inequalities?`）、`choiceTables` 四张两列表、`answer:"D"`、`section:"1.5"`/`no:3`/`page:32`/`source:"讲义 p32 #3"`/`type:"mcq"`。

**冲突处理**：同一件事的文档侧（缺口台账 `data/content-gaps.json`、`docs/jiangyi-entry.md`、`docs/jiangyi-reconcile.md`）由队友先推（`2d3ac12` / `70ece27` / `e53ff31`），已含「教材漏印 · 已定案、不补」口径与 p34/p32 行距证据，冲突处一律取上游版本，本提交只保留 `data/jiangyi.js` 的 note 与版本串。

## 二、怎么验

1. **字段本体**：`node -e` parse `JY_BANK` → `JY1-042.note` 输出即上文定稿句；`answer:"D"`、`choiceTables` 长度 4 未变；全库 58 题、`group:'textbook'` 仍 9 题（`JY4-047…055`，p200–207）。
2. **note 只在内部用**：`grep -rn "note" jiangyi-page.js jiangyi-core.js choice-figures.js drill.js exam.js analysis.js *.html` → 零命中（唯一 `note` 命中是 `cloud-account.js` 的 `.td-acct-note` 样式类，无关）。线上 `body.innerText` 不含「教材漏印」「不自行补写」。
3. **线上页面**（`?v=27bac4fad34b`，`jiangyi.html?b=JY1&s=1.5&i=3`）：题干只显示一条 `y > 7x - 4` + `system of inequalities` 追问句，四张 A/B/C/D 表格齐全且可点选，`noteVisible=false`。
4. **五页版本**：`python3 bump_assets.py .` → `PASS 五页资源版本一致：27bac4fad34b`。
5. **测试**：`node --test test/*.test.js` → **122 tests / 122 pass / 0 fail**。
6. 顺带复核上一轮产物在线：`JY1-040` 已由编程者 `6cc86cd` 接入 `choiceFigures`，线上四张选项坐标图各渲染 1 个 `<svg>`，不再是四个字母。

## 三、commit

- `19746e1` data(jiangyi): JY1-042 note 口径改为「教材漏印」…（`data/jiangyi.js` 2 行 + `jiangyi.html` 版本行）
- `bc2c535` chore(assets): 五页 ?v= 对齐到 27bac4fad34b（机械改动，无内容变更）
- 远端 `origin/main` HEAD = `bc2c535`（GitHub API 已核）

## 四、线上 v=

`?v=27bac4fad34b`（index / exam / drill / wrong / jiangyi 五页一致）
