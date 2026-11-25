# U4-01…U4-09 迁入 JY4「教材原题」· 数据层回执（2026-11-25）

> 执行人：开发者（数据） ｜ 仓库 TimNotCook/SAT-Math ｜ 分支 main
> 提交：`da66f7b`（九题 + 裁图 + 题干图）→ `594262b`（SP2-001 表头修正）
> 线上资源版本：`?v=078f8ba38ffb`

## 一、改了什么

### 1) 九题迁进 `data/jiangyi.js`，挂 JY4「教材原题」子组

| id | section | no（原书页内题号） | page | type | answer | figure |
|---|---|---|---|---|---|---|
| JY4-047 | 4.1 | 1 | 200 | mcq | D | images/fig/U4-01.png |
| JY4-048 | 4.1 | 2 | 200 | grid | 164 | images/fig/U4-02.png |
| JY4-049 | 4.1 | 3 | 201 | mcq | D | images/fig/U4-03.png |
| JY4-050 | 4.1 | 5 | 202 | mcq | D | images/fig/U4-04.png |
| JY4-051 | 4.1 | 6 | 203 | grid | 127 | images/fig/U4-05.png |
| JY4-052 | 4.2 | 3 | 205 | mcq | A | （原书无图） |
| JY4-053 | 4.2 | 4 | 205 | grid | 65 | images/fig/U4-07.png |
| JY4-054 | 4.2 | 9 | 207 | mcq | C | images/fig/U4-08.png |
| JY4-055 | 4.2 | 10 | 207 | mcq | A（13√2） | images/fig/U4-09.png |

- 全部 `group:'textbook'`；`section` 4.1 五题 / 4.2 四题；`page` 200–207。
- `source` 数据层为 `练习册 P{页} #{原书题号}`（`tools/verify_jiangyi.mjs` 与 `jiangyi-core.audit()` 要求 page/no/source 三者自洽）；
  **题卡显示层走 `sourceLabel()`，只显示「练习册 P200」，不带题号**（`test/jiangyi-textbook.test.js` 断言 `'练习册 P200'`）。
- 不写讲义页码；`no` 用原书页内题号（U4-04 原书是 P202 #5、U4-05 是 P203 #6，与原 `no` 不同，已按原页改）。
- 答案照抄练习册答案页 **P246**，落进 `data/jiangyi_textbook_answers.json`；九题**不计入** 4.1/4.2 官方 declared 题数（JY4 官方题数仍为 0）。
- 子组标签 `Unit 4・教材原题（练习册 P200–207）`，可独立作答、独立交卷（`mode=jiangyi, section=TB4, total=9`）。

### 2) 九题原页对照图 `docs/jiangyi-proof/JY4-047…055.png`
练习册 P200–P207 原页整页渲染（120dpi）+ 红线框圈出该题，9 张（P204/P206 无入选题目故不出图）。

### 3) 三题空选项兜底：`TD_CHOICE_CROPS`
`TD-22-14` / `TD-33-19` / `SR-232` 各 A–D 共 12 张裁图（`images/choice/{id}_{A..D}.png`，≤640 宽，阈值去水印）。
**如实说明**：线上这三题现在由码农 α 的矢量方案 `TD_CHOICE_GRAPHS`（`c178e7f`）渲染，优先级高于裁图；本次登记的是矢量失败时的兜底，不是「空按钮」的修复者。

### 4) SP2-001 题干图
`data/figure_crops.js` / `.json` 补 `SP2-001: images/fig/SP2-001.png`（生长因子表，900×915）。
**如实说明**：SP2-001 自 `961a468` 起已有矢量表 spec，线上一直能显示；本次按字面补齐 `TD_FIG_CROPS` 兜底登记，并顺手修正表头缺空格（`Growthfactor` → `Growth factor`，`594262b`）。

## 二、怎么验

```bash
node --test test/*.test.js                     # 111 pass / 0 fail
node tools/verify_nav.mjs                      # 本地 26/26
node tools/verify_nav.mjs --base https://timnotcook.github.io/SAT-Math --out /tmp/sat-nav-live
                                                # 线上 26/26（含 jy4/子组入口、jy4/九题可达）
```

线上人工/自动核验（headless Chrome，1280 宽）：
- `jiangyi.html` → Unit 4 板块 → 教材原子组 → 第 1/9 题，页脚「练习册 P200」；九题逐题作答可录入，交卷出「正确率 / 错题（n）」，每行带「练习册 P20x」来源。
- `drill.html?sec=2.2&i=14`（TD-22-14）、`?sec=3.3&i=19`（TD-33-19）、`?sec=3.6.T14&i=5`（SR-232）：各 4 个 `.drill-choice[data-choice]`，全部带图形（矢量）。
- `drill.html?sec=2.6.T17&i=1`（SP2-001）：`.td-figure--table` 420×356，表头「Species of tree / Growth factor」。

## 三、留给下游

- 编程者：`verify_nav` 已 26/26，可重跑并出两档截图。
- 图形线（α）：`docs/verify/td-choice-original-pages.md` 指出 TD-33-19 的 B（第三根≈0.7）、C（−2 处重根）与原页不符，TD-22-14 的 C 截距应为 (0,15)/(15,0)，需按原页重画；证据图 `docs/verify/workbook-p89/p175-*.png`。
- 位图 vs 矢量：JY4 九题的 `figure` 目前指向原页裁图（`images/fig/U4-0x.png`），是否改矢量版待拍板。
