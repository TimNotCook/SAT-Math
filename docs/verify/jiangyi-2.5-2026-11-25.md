# 讲义 2.5 录入回执（2026-11-25）

## 改了什么

| 项 | 内容 |
|---|---|
| 小节 | 2.5 数据分析：集中趋势与离散程度（p70–p90，答案页 p193） |
| 新录 | **19 题**：`JY2-045`…`JY2-064`（题号 1–9、11–20）；题号 10 单列受阻，见下 |
| 表格 | 6 题走 `table`：`JY2-045/050/051/052/055/057`；`#11`、`#13` 原页是左右两张表，单表通路下合并为四列表（列名标明 City A / City B、P / Q），数值未改 |
| 矢量图 | 8 题走 `JY_FIG.specs`：`JY2-049`(hist 双直方图)、`053`(双行点图)、`056`(点图)、`059`(婴儿点图)、`060`(木星卫星点图)、`062/063/064`(箱线图) |
| 渲染器 | `data/jiangyi_figures.js` 新增 `hist` / `dotplot` / `boxplot` 三个渲染器；`boxplot` 只在最底一条画轴，`dotplot` 支持 `rowH`/`pitch` 控高 |
| proof | `docs/jiangyi-proof/JY2-045…064`（除 054）共 19 张，200dpi 原页 → 宽 820px |
| 口径 | 题干逐字对原页；`f (x)` 类残渣清零；`#4` 的数字列表 `42 ,` 的排版空格收成 `42,`；`#19` 选项保留原 `≤` |

## 怎么验

1. `python3 tools/gen_jiangyi_backlog.py` → `need=243 have=112 miss=131`，2.5 行 `20 / 19 / 1`（1 = 题号 10）。
2. `python3 bump_assets.py .` → `PASS 五页资源版本一致：030641a9305c`。
3. `node --test test/*.test.js` → **131 项全绿**。
4. 数据面自查：`window.JY_BANK` 2.5 段 19 条、`no` 递增不重、`answer` 与 `data/jiangyi_answers.json['2.5']` 逐条一致（1A 2C 3-44 4C 5B 6B 7-1 8A 9A 11B 12C 13B 14A 15B 16D 17A 18D 19C 20C）。

## 缺号变化

2.5：**20 → 1**（全节只差题号 10）。全书：`have 93 → 112`，`miss 150 → 131`。

## 线上

`?v=030641a9305c`（本地 bump 值）。提交待推送，推送后整仓 Pages 自动发布（`max-age=600`，核对带 `?v=` 破缓存）。

## 受阻项：2.5 #10（p79，`JY2-054`）

题干：`Which of the following dot plots represents the data set with the greatest standard deviation?` 答案 **D**。
四个选项本身是点图，已按原页逐点量出（轴 0–9）：

| 选项 | 点分布 | 点数 |
|---|---|---|
| A | 4:1, 5:1, 6:2, 7:2, 8:3 | 9 |
| B | 3:1, 4:4, 5:4 | 9 |
| C | 2:2, 3:3, 4:2, 5:3 | 10 |
| D（答案） | 1:2, 3:2, 4:1, 5:2, 8:2 | 9 |

四张图已按 `dotplot` 规格出好：`docs/jiangyi-proof/JY2-054-A/B/C/D.png`，点分布见上表。
**没入库的原因**：字段名沿用编程者 `6cc86cd` 定的 `choiceFigures` 这一套，但 `JY_FIG.renderPanel()` 目前只吃 `type:'quad'` 的面板（返回 `plane()`），点图面板会返回空串、选项退化成纯文字。需要编程者把 `renderPanel` 扩到 `dotplot` 面板后，再写 `"choiceFigures":{"A":{"vector":"JY2-054#A"},…}` —— 数据与图均已备好，不动字段命名。
