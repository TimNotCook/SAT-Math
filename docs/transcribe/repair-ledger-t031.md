# repair-ledger-t031.md — 批7（t031）落库台账

> 承接 `repair-ledger-r4.md` §9.1–9.3 的待办清零记录。r4 顶层台账文件受远端规则保护不可直接改写，本批次条目迁入本文件记账。

## 一、批次概览

| 批次 | 内容 | 数量 | feat commit | bump commit | 测试 | 线上版本 |
|---|---|---|---|---|---|---|
| 批7 t031 图/表 | 缺图矢量重画 + 缺表补录 + 锚点记账 | 10 图 + 1 表 + 1 anchor | `d987b5e762ba77ef6255b136b161b80b707a124d` | `bba53e762724420148d0c6be894e4496a472c693` | 179 pass / 0 fail | 落地时 `48800d33ac2a`（后随并发提交轮换，见 §六） |

计数复核（codeload main + GitHub Pages 实抓，`Cache-Control: no-cache`）：本批落库时线上题库总数 **1307**（任务基线 1292，期间远端并发补录 4.5 板块 15 题）；`retired` **61**，`mergedInto` **1**，`hidden` **2**（section 级：2.6.T17 / 2.6.T18），`variant` **0**，分类计数与基线一致，本批未改动任何计数。

## 二、缺图已重画落库（redraw_figure）

矢量等比重画 + `pageRegion` 取景框；取样点自洽校验见 `docs/transcribe/figure-verify-t031.json`（≥6 取样点，相对位置误差 ≤2% 页宽、拓扑一致即 pass）。

| id | 原页坐标 | region（归一化） | 校验结论 | commit |
|---|---|---|---|---|
| R04-080 | 04 册 · p08 · #20 | `[0.271,0.112,0.455,0.239]` | pass，maxErr 0.0115；4 边 / 4 顶点 / 4 标签 / 0 直角块 | `d987b5e762ba77ef6255b136b161b80b707a124d` |
| R04-081 | 04 册 · p08 · #21 | `[0.270,0.530,0.423,0.677]` | pass，maxErr 0.0042；4 边 / 5 顶点 / 5 标签 / 1 直角块 | `d987b5e762ba77ef6255b136b161b80b707a124d` |
| R04-082 | 04 册 · p08 · #22 | `[0.556,0.122,0.684,0.235]` | pass，maxErr 0.0002；4 边 / 5 顶点 / 7 标签 / 2 直角块 | `d987b5e762ba77ef6255b136b161b80b707a124d` |
| R04-083 | 04 册 · p08 · #23 | `[0.570,0.508,0.682,0.640]` | pass，maxErr 0.0068；4 边 / 5 顶点 / 8 标签 / 1 直角块 | `d987b5e762ba77ef6255b136b161b80b707a124d` |
| R04-084 | 04 册 · p08 · #24 | `[0.780,0.133,0.934,0.235]` | pass，maxErr 0.0067；4 边 / 5 顶点 / 5 标签 / 2 直角块 | `d987b5e762ba77ef6255b136b161b80b707a124d` |
| R04-087 | 04 册 · p09 · #27 | `[0.060,0.427,0.215,0.550]` | pass，maxErr 0.0087；4 边 / 4 顶点 / 6 标签 / 2 直角块 | `d987b5e762ba77ef6255b136b161b80b707a124d` |
| R04-088 | 04 册 · p09 · #28 | `[0.280,0.115,0.449,0.235]` | pass，maxErr 0.0068；4 边 / 4 顶点 / 4 标签 / 2 直角块 | `d987b5e762ba77ef6255b136b161b80b707a124d` |
| R04-089 | 04 册 · p09 · #29 | `[0.280,0.409,0.447,0.560]` | pass，maxErr 0.0134；4 边 / 4 顶点 / 4 标签 / 2 直角块 | `d987b5e762ba77ef6255b136b161b80b707a124d` |
| TD-25-06 | 练习册 p121 · #6 | `[0.253,0.450,0.737,0.542]` | pass，maxErr 0.006；13 散点 / 7 刻度标签 / 1 图题；图题 `Orbital period (days)` 由题干搬回图区 | `d987b5e762ba77ef6255b136b161b80b707a124d` |
| TD-33-18 | 练习册 p174 · #18 | `[0.177,0.225,0.743,0.625]` | pass，maxErr 0.008；A 升线 / B 降线 / C 升指数 / D 降指数，四图拓扑一致 | `d987b5e762ba77ef6255b136b161b80b707a124d` |

## 三、缺表已补（add_table_spec）

| id | 原页坐标 | region（归一化） | 校验结论 | commit |
|---|---|---|---|---|
| U2-12 | 练习册 p118 · #1 | `[0.374,0.250,0.651,0.433]` | pass；5 行 × 2 列 / 10 格逐格一致（UV index 1→9、2→15、3→12、4→13），无表题、无合计行 | `d987b5e762ba77ef6255b136b161b80b707a124d` |

## 四、锚点订正（anchor，不动数据）

| id | 原页坐标 | region | 校验结论 | commit |
|---|---|---|---|---|
| TD-41-02 | 归属 **p200 · #2**（原台账误记 p201#2） | — | `anchor_confirmed`：n 截 r∥s、164°/x°，题干与答案 164 同 p200#2；p201 仅 #3。数据侧未改 | — |

## 五、校验与落地

- 校验产物：`docs/transcribe/figure-verify-t031.json`，12 条记录全部 `pass`（10 图 + 1 表 + 1 anchor）。
- 本地管线：`python3 tools/rollup_declarations.py` 问题项 0；`node tools/verify_assets.mjs` PASS；`node --test` 179 pass / 0 fail。
- 图/表 spec 落 `data/figures.js`；TD-25-06 图题前缀自 `data/questions.js` 题干移除并归入图区。

## 六、后续订正与版本说明

- 并发提交一度把 `Orbital period (days) ` 前缀带回 TD-25-06 题干；已二次订正：fix `d72fb77a1d752c63d798749e811c3795d3f4fa0d`，bump `d8f6f74fdd7911d2fbe3aa88e33ccae17fee52ce`（图区图题保留，题干不再重复）。
- `?v=` 内容哈希随每次并发提交轮换；本批数据/spec 落库后，最新线上版本以 main 六页与 `sw.js` 实际值为准（验真时为 `1c97481fdbe4`，六页同值）。
- 验真快照：codeload main 与 Pages 实抓 `data/figures.js`、`data/questions.js` md5 一致；11 条 spec 在位；计数 1307 / retired 61 / mergedInto 1 / hidden 2 / variant 0；`figure-verify-t031.json` 12 条全 pass。
