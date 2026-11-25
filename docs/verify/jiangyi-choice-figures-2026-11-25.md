# 回执 · 讲义选项图（JY1-040 矢量化 + 1.1–1.5 选项图清单）

日期：2026-11-25。执行：数据侧（开发者）。仓库 `TimNotCook/SAT-Math`，线上 `https://timnotcook.github.io/SAT-Math/`。

## 1. 改了什么

| 文件 | 改动 |
|---|---|
| `data/jiangyi_figures.js` | ① `JY1-040` 四面板 spec 按原页重校：四条线统一 y 截距 3、\|斜率\|0.60、格距 1（原 B=3.6 / C=4.0 / D=4.2 是错的）；影侧按原页定为 A 下 / B 上 / C 下 / D 上；面板 250×250 → 320×250（原书格子是正方格，旧画法纵向被拉长）。② 新增 `JY_FIG.renderPanel(id, letter)`：把 quad spec 的单格单独出 `<svg>`，供选项图按字母取图（不新增题目字段、不新增 spec id）。③ `JY1-005` 四图格距 1 → 0.5（原页每格 0.5）。④ `JY_FIG.render` 不变。 |
| `data/content-gaps.json` | `JY1-040` 缺口条改写（记录重校结论 + 数据侧就绪、页面侧待接线，状态仍 `待修`）；新增 `JY1-005` 同类缺口条。 |
| `docs/jiangyi-reconcile.md` | 由 `tools/gen_jiangyi_reconcile.py` 重生成（缺口表 +2 条）。 |
| `docs/jiangyi-entry.md` | `JY1-040` 几何口径改为「四线同过 y=3」的新口径。 |
| `docs/jiangyi-choice-figures.md` | 新建：1.1–1.5 共 45 题「选项是图」全量清单 + 判据 + JY1-040 逐图参数 + 4 道 `mcq-graph` 但选项是文字的排除名单 + `renderPanel` 接线说明。 |
| `jiangyi.html` | 仅资产版本号 `?v=` 统一刷新（`bump_assets.py` 生成，无内容改动；未碰 `exam.html`/`drill.html`/`wrong.html`、未碰 `*.css`、未碰 `jiangyi-page.js`）。 |

## 2. 怎么验

- `node --test test/*.test.js` → **111 pass / 0 fail**。
- `node tools/verify_nav.mjs`（线上）→ **26/26 通过**，JY4 九题可达（第 1/9 题、页脚「练习册 P200」）。
- 线上探针（CDP，`?v=5459def83734&b=JY1&s=1.5&i=1`）：
  `hasRenderPanel=function`、`renderPanel('JY1-040',A..D)` 四个面板各出 SVG（3600 / 3598 / 3686 / 3684 字节，无空图）、
  页面无 console error、题干合成图 `stemHasSvg=true`、选项按钮 4 个、`q.figure='JY1-040'`。
- 原页对照：p30 四张嵌入图按 xref 抽出（A=3463 / B=3466 / C=3467 / D=3470，按 bbox 定位：A 左上、C 右上、B 左下、D 右下），
  逐张拟合直线 + 网格间距得斜率/截距/影侧；渲染结果与四张原图并排比对一致（格子方正、线过 y=3）。
- 未上线部分（如实）：线上 JY1-040 的选项仍显示 A/B/C/D 四个字母——页面侧还没有「选项放图」的读取逻辑，
  本轮按 Tim 的边界没自造字段，等编程者定名后接 `JY_FIG.renderPanel(q.figure, letter)` 即可。

## 3. 提交

- `0e590e5`（`0e590e57563a513961412d3290d54bb4c92b2a56`），已推到 `origin/main`（`git ls-remote` 核过）。

## 4. 线上版本

- 数据/页面资源版本：**`?v=5459def83734`**（`jiangyi.html` 里 `data/jiangyi_figures.js?v=5459def83734`，线上原文已含 `renderPanel`）。

## 5. 留给下游

- 编程者：`renderPanel` 已可用；字段名以他为准，`choices` 仍可保留 `["A","B","C","D"]`。
- 若把合成图从题干挪到选项区，删 `data/jiangyi.js` 里 JY1-040 的 `figure:'JY1-040'` 一行即可，spec 不用动。
- `JY1-005` 与 JY1-040 同类（四图选项），同一通路接一次即可覆盖两题。
