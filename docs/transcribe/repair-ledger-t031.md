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
| R04-088 | 04 册 · p09 · #28 | `[0.280,0.115,0.449,0.235]` | pass，maxErr 0.0087；4 边 / 4 顶点 / 4 标签 / 2 直角块 | `d987b5e762ba77ef6255b136b161b80b707a124d` |
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

## 七、答案补丁 76 条（CI ingest 落库）

- 补丁包：`answer-fix-pack-t031.json`，顶层 `corrections` 79 条；逐条与 live diff 后实况：**实写 76**（订正 1：`SR-163` D→A；SP1 空答案回填 75）；**NOOP 3**（`SP1-104`=D、`R04-072`=D、`R04-077`=`121`，live 已一致，未入补丁文件）；**复核覆盖 1**（`SP1-019`，见下）。
- **CI 契约**：workflow `ingest-transcribe-fragments.yml`。触发：push main 命中 `docs/transcribe/**`、`tools/patch_answers.py`、`tools/apply_bank_rulings.py`、workflow 自身；另支持 `workflow_dispatch`（无 inputs）。步骤：声明分组 → 合并片段 → `apply_bank_rulings.py` → `patch_answers.py` → `rollup_declarations.py --write` → `bump_assets.py`（**自动 bump `?v=`**）→ `node --test test/*.test.js` → 有改动由 `github-actions[bot]` 提交并推送。
- **落库通道**：补丁清单 `docs/transcribe/answer-patches-t031.json`（schema `{note, patches:[{id,answer,value,note}]}`，兼容既有数组形状）；`tools/patch_answers.py` 扩展为读取 `answer-patches*.json` 全部清单，answer 兼容 `null` 与带引号字符串，幂等。守门测试 `test/answer-fix-t031.test.js`：79 条 id 断言 answer 等于落库/复核值，另设六条抽查独立断言。
- **SP1-019 复核覆盖**：补丁 `new=3/2` 系邻题 SP1-018（求 a）对位错位；题干 `(2/5)x+(7/5)y=2/7`、`gx+ky=5/2` 无穷多解 ⇒ g/k=(2/5)/(7/5)=**2/7**，按 2/7 落库，未写补丁值，待原页复核。
- **SR-163 选项系数疑点（source_doubt）**：题干问 `x+2b` 因子；常数项 `18b=(2b)·9` ⇒ 另一因子 `3x+9`，x 系数疑应为 `6b+9`，库内线性系数疑漏录「6b+」前缀。02 册 p71 原页两环境均未取到，**未凭推断改选项**；答案按题面与代数落 A。拿到原页图后按原页修选项并单独一条 commit 说明。
- **幂等验证**：基线 questions.js 沙箱首跑改 76 条、既有 3 条 NOOP；二次运行 0 改、79 NOOP。
- **校验**：`rollup_declarations.py` 问题项 0；`verify_assets.mjs` PASS；`verify-final-t031.py` PASS；新测试本地 2/2 pass；vm 全量 `node --test` 203 tests / 202 pass / 1 fail（`test/visual/capture.mjs` 无 Chrome 报 ENOENT，环境性失败，非数据 bug）。CI ingest run 在 `node --test` 步骤通过后才产生 bot 入库提交。
- **待页图复核 11 条**（先按补丁值落库，不拦写）：
  - 图/表依赖回填 9 条：SP1-048、SP1-050、SP1-053、SP1-054、SP1-057、SP1-085、SP1-089、SP1-091、SP1-092。
  - 复核覆盖 1 条：SP1-019。
  - 选项疑点 1 条：SR-163。
- **commits**：
  - `9e773064623e3d8b915636c6c6116aab38fbefb3`：patch_answers 兼容 null 答案并读取 t031 清单。
  - `ffe86d8cdb8ad92b9d0ebc9291a128c558bdcf4e`：patch_answers value 分支写法清理（无行为变化）。
  - `64283ba274653df055a98d562e350d38e130a74b`：answer-patches-t031.json 清单 76 条。
  - `254cce49f667dde36a8aef4f78263be411c08835`：CI bot 自动入库（questions.js 76 行 + 六页 / sw.js bump）。
  - `a9f082a5d2fb7a167b106cca77030fa970695bb7`：守门测试 answer-fix-t031.test.js。
  - `3325c913fefab9e71135e02f3c92ea7818df20b4`：v3 终局台账 md（json/py 副本见交付链接，未随本批上仓库）。
- **线上 `?v=`**：codeload main 六页 + `sw.js` 同值 `855f2c68f97e`；题库 1307 条，76 条补丁值全部命中，剩余 37 条 null 为 SP2 等本批之外退役题。
