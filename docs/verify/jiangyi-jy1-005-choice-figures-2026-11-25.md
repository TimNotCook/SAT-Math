# 回执：JY1-005 四张选项坐标图接入（1.1–1.5 选项缺口清零）

窗口：2026-11-25 · 执行：开发者（数据侧）· 上游基线 `3b1d7fb`

## 一、改了什么

| 文件 | 改动 |
| --- | --- |
| `data/jiangyi.js` | `JY1-005` 删 `figure:"JY1-005"`，改挂 `choiceFigures:{"A":{"vector":"JY1-005#A"},…,"D":{…}}`（字段名沿用编程者 `6cc86cd` 定的唯一一套，不自造命名）；`stem` / `choices` / `answer:"C"` / `section:"1.1"` / `page:9` / `source:"讲义 p9 #5"` 未动 |
| `data/jiangyi_figures.js` | `JY_FIG.specs['JY1-005']` 四个面板按 p9 原页重校（见下表） |
| `docs/jiangyi-choice-figures.md` | 两题「页面现状」由「四个字母」改为「四张图」；新增 JY1-005 逐图参数节；统计改为「三处选项缺口均已修完」 |
| 五个页面 | 仅 `?v=0c008daedc7c` 机械版本串（`bump_assets.py` 产出，五页同值） |

### 重校依据（p9 原页，400dpi 渲染 + 逐格拟合）

四张选项图是**页面矢量线条**（`get_drawings` 只吐出公式字形，图在线段操作里），因此不走裁图路线，
改在 400dpi 整页渲染上定位：四格各 **8×8 格、格距 0.5**（每 2 格 = 1 单位，`1` 刻度落第 2 格），原点居中，x、y 均 −2…2。
先按格心把像素坐标换成单位，再对直线做半径 4px 的迭代内点拟合（避开轴带 ±6px，网格线亮度 75 vs 线 20–40 已天然分离）。

| 选项 | 斜率 | y 截距 | x 截距 | 判定 |
|---|---|---|---|---|
| A | −1 | 1 | 1 | ✗ a = b，违反 0 < a < b |
| B | −1 | −1 | −1 | ✗ 截距在负半轴 |
| C（答案，答案页 p191 亦写 C） | −0.5 | 1 | 2 | ✓ a : b = 1 : 2 |
| D | −2 | 1 | 0.5 | ✗ x 截距 < 1，a > b |

对应 `ax + by = b` ⇒ y 截距恒为 1、x 截距 = b/a > 1：只有 C 同时满足，与答案键吻合。

> 旧 spec 的三处偏差：B 用 `b = 1.5`、D 用 `b = 2`、四格坐标框取 −3.2…3.4（比原页多 5 列且原点不居中）。
> 本轮统一 −2…2 / step 0.5、四格同尺寸 272×252（内区 188×188 → 方格 23.5px 正方）。
> 网格底色沿用全册统一 `GRID = #D7DEE7`（原页扫描是中灰 ~#8E8B89，为与其余讲义矢量图同一观感不另造第二套线色）。

## 二、怎么验

1. **数据面**：`node -e` 解 `JY_BANK` → `JY1-005.choiceFigures` 四键、`figure` 为 `null`、`answer:"C"`；
   `renderPanel('JY1-005', L)` 四格都返回非空 `<svg>`（2167–2170 字节）。
2. **解析面**：`TD_CHOICE_FIGURES.resolve(q, L)` 四个字母全部返回 `kind:"vector"`，html 以 `td-choicegraph` 开头（无 `missing` 兜底）。
3. **线上页面**（`?v=0c008daedc7c`，`jiangyi.html?b=JY1&s=1.1&i=5`）：4 个 `svg`、`choiceFigures` 四键、`figure` 空；
   截图 A/B/C/D 四格各一张坐标图，题干不再重复挂 2×2 合成图。
4. **可做题**：点 C 卡片 → `.drill-choice` 加 `on`，`localStorage.tdsat_jiangyi_v1` 写入
   `{"JY1-005":{"v":"C","correct":true}}`，一题闭环（上一题/下一题/交本节按钮在）。
5. **不回归**：JY1-040 线上仍是四张图（`6cc86cd` 通路）；JY1-042 四张表未动。
6. `python3 bump_assets.py .` → `PASS 五页资源版本一致：0c008daedc7c`。
7. `node --test test/*.test.js` → **122 tests / 122 pass / 0 fail**。

## 三、commit

- `523506c` data(jiangyi): JY1-005 四张选项图接入 choiceFigures，spec 按 p9 原页重校（数据 + 五页版本）
- 其后上游又进了 `2269ce4`（设置入口）与 `0000434`（assets bump），bump 后的版本串为 `0c008daedc7c`，
  本回执随之 rebase 到该基线；本回执提交即 `origin/main` 顶部（`docs(verify): JY1-005 …`）

## 四、线上 v=

`?v=0c008daedc7c`（index / exam / drill / wrong / jiangyi 五页一致）
