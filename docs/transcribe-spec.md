# 扫描件逐字录入规范（03 Problem Solving / 04 Geometry）

> 适用：把两本无文本层扫描册逐题录进 `TimNotCook/SAT-Math` 题库。
> 本规范所有机制结论均在当前 HEAD 上实测过（`node --test test/*.test.js` = 123 pass / 0 fail）。
> 配套脚本：`tools/transcribe_reconcile.py`（只读，不改仓库）。

## 0. 铁律（先读这节，违反即返工）

1. **不动 `data/questions.js` / `data/text.js` / `data/figures.js` 里已有的题目段**，只在数组末尾追加新题；不动 `data/jiangyi.js`、`data/jiangyi_figures.js`、`data/figure_crops.js`、`data/choice_crops.js`、`data/text_crop.js`。
2. **新录题禁止位图**：不得写 `image` 字段、不得登记 `figure_crops.js` / `choice_crops.js`、不得引用 `images/` 下任何文件。表格、散点、坐标轴、阴影、几何全部矢量重画（见 §5）。
3. **逐字一致**：题干、选项、括号、单位、上下标、分数线、变量符号、问号空格照抄原页；不许意译、不许补词、不许把写法换成"等价但不同形"的写法（详见 §3）。
4. **答案独立复算**：不许抄答案页；mcq 自己推，grid 自己算，再与答案页核对。
5. **每批录完必须回读**：用脚本导出清单反向比对原页，循环到 100%（§7）。
6. 推送只走 `bash safe_push.sh "消息"`，禁 force push；`data/questions.json` / `data/text.json` 是历史快照，**不维护、不同步、手改无意义**（§1）。

---

## 1. 页面实际加载什么（先搞清文件关系，别改错地方）

三个页面（`drill.html` / `exam.html` / `wrong.html`）运行时只加载 `data/` 下三份：

| 文件 | 挂到全局 | 装什么 |
|---|---|---|
| `data/questions.js` | `window.TD_BANK`（`questions[]` + `units[]` 声明） | 题元数据：id/unit/section/no/topic/answer/value/type/level/source/paper/origin/hint/stem（兜底） |
| `data/text.js` | `window.TD_TEXT`（按 id 索引） | 题干 `stem`、`choices`、`figure`（图形选项登记）、`type`；**题干以这份为准** |
| `data/figures.js` | `TD_FIG_SPECS` + `TD_CHOICE_GRAPHS` | 每题一张矢量图 spec；选项图字典 |

**stem 优先级（`drill.js:668`）**：`text.stem || q.stem`。两边都有时以 `text.js` 为准；历史题两边有 131 条纯排版差异（f(x) 空格、分数括号、问号空格），新录题必须两边逐字一致。

**两个"看着像数据、其实不用碰"的文件（实测）**：
- `data/questions.json` / `data/text.json`：全仓 grep 无任何代码/HTML/脚本引用，是旧手工同步的快照，注入乱码后测试仍全绿。**录入代理不维护。**
- 根目录 `questions.js`（1009 题）：只被 `test/aliases.test.js` 消费，页面不加载；新录题不需要往里面加。

`data/aliases.js`（`TD_ALIAS`）只用于错题本重名归一（错题页 `wrong-page.js`），新题不是旧题的重复时不需要登记 alias。

---

## 2. 题对象字段全表

### 2.1 `data/questions.js` 里的每道题（`TD_BANK.questions[]`）

| 字段 | 类型 | 必填 | 取值 / 写法 | 备注 |
|---|---|---|---|---|
| `id` | string | 是 | 全局唯一，前缀+编号，如 `R03-001` | 新批次另起前缀，不复用退役 id；格式见 §2.4 |
| `unit` | int | 是 | `1`/`2`/`3`/`4`，必须等于 `section` 首段 | 实测 0 条不一致 |
| `section` | string | 是 | 板块号；**新专项题填 Topic 子节 id（如 `2.7.T1`），不填父组**（§6） | |
| `no` | int | 是 | 来源册内顺序号，从 1 起；跨 origin 同 section 可重复，全局只要求 id 唯一 | CATALOG 按它排序 |
| `topic` | string | 是 | 该题知识点名；专项式：`专项练习 · Topic N · 第 k 题`（照 §6 模板） | |
| `type` | string | 是 | `mcq` / `grid` | 无其他值 |
| `answer` | string | 是 | mcq：单字母 `"A"–"E"`；grid：答案串（`"3/4"`、`".0625, 1/16"`、`"2 or 8"`） | grid 多答案逗号分隔，判分两端都认 |
| `value` | number\|null | grid 必填 | grid 必须是有限数字（`176`、`0.0625`、`2`）；mcq 填 `null` | 判分基准，不能省 |
| `level` | string | 是 | `easy` / `medium` / `hard` | |
| `origin` | string | 是 | 新录扫描册用 `pdf`；勿用 `legacy`（l4-merge 会拦 legacy+unit4），`textbook` 留给教材 | |
| `source` | string | 是 | 来源定位，照既有格式：`03 Problem Solving · Topic 1 #1` | 见 §2.3 |
| `paper` | string | 是 | 卷名；**T 子节题必须含「专项」二字**（exam-core 靠它识别专项题），如 `03 Problem Solving and Data Analysis 专项练习（重录）` | |
| `hint` | string | 可空 | 一行关键步骤缩写；942 条历史题为空，允许留空但建议留 | 不是解析全文 |
| `stem` | string | 兜底 | 与 `text.js` 一致；`\n` 分段 | |
| `image` | — | **新题禁出现** | 历史 legacy 位图路径，禁止照抄这个字段 | |

### 2.2 `data/text.js` 里的条目（`TD_TEXT[id]`）

```js
"R03-001": {
  "stem": "The stem, verbatim, line 2 broken by \\n.",
  "choices": { "A": "...", "B": "...", "C": "...", "D": "..." },
  "figure": [],
  "type": "mcq"
}
```

| 字段 | 说明 |
|---|---|
| `stem` | **题干唯一权威来源**，逐字；多行用 `\n` |
| `choices` | mcq：`A`–`D` 四个非空文字选项（E 只在五道图形选项题出现）；grid：`{}` 空对象 |
| `figure` | 图形选项登记列表（如 `["A","B","C","D"]`），仅选项图题用；普通题 `[]` |
| `type` | `mcq` / `grid`，与元数据一致 |

**图形选项例外（现有 5 道：`U1-01`、`TD-22-14`、`TD-33-18`、`TD-33-19`、`SR-232`）**：`choices` 为空，靠 `text.figure=[A-D]` + `TD_CHOICE_GRAPHS`（选项矢量图，§5.6）。新录遇到"四个选项各是一张图"才走这条路。

### 2.3 `source` / `topic` / `paper` 写法对照（照抄格式，别自创）

| origin | source 样例 | topic 样例 | paper 样例 |
|---|---|---|---|
| textbook (TD) | `练习册 P60 · 2.1 #1` | `2.1 比率、百分比与单位换算 · 第 1 题` | `TD 教材 · 2.1 比率、百分比与单位换算` |
| pdf 专项 (SP2) | `03 Problem Solving · Topic 17 #1` | `专项练习 · Topic 17 · 第 1 题` | `03 Problem Solving and Data Analysis 专项练习` |
| legacy | `讲义 p9 #5` / `练习册 P200 #1` | `1.1 由参数判断直线图像` | `Unit 1 · 15 题卷` |

新录两册照 SP2 行格式：source = `03 Problem Solving · Topic N #k` / `04 Geometry · Topic N #k`。

### 2.4 id 编号现状（防撞号，新批次另起前缀）

- `U1-01`…`U4-09`（legacy 64）；`TD-11-01`…`TD-45-xx`（474）；`SR-001`…`SR-283`（282）；`SP1-001`…`SP1-131`（131）；`SP2-001`…（59 条，编号到 060 有缺口）。
- 建议新前缀：**03 册 `R03-`、04 册 `R04-`**（序号从 001 连续；派单可改，但先全量扫一遍确认无冲突）。

---

## 3. 逐字录入口径（题干/选项怎么抄）

- **原样保留排版符号**，不许"美化"：
  - 上标 `^{2}`、`^{3}`、`2^{x}`；下标 `_{...}`、`_X`。
  - 根号 `√(...)`（括号平衡，如 `√(x+1)`）与裸 `√5` 两种历史写法都存在，照原页哪种就哪种。
  - 比较符用 unicode：`≤` `≥` `≠` `×` `÷`；减号用 `−`（U+2212），不是 ASCII `-`；度数 `°`、`π` 照抄。
  - 平分数照抄 `2/3`；括号分数照抄 `(k+7m)/4`；**不要**把 `2/3` 改成 `(2)/(3)` 或反过来。
  - 问号前无空格（历史 1010 题 0 例带空格），照抄。
- **不意译、不补词、不换序**：原题 "The table above shows..." 里的 above/below 位置词保留（图就真的在对应位置）。
- 英文题干、选项标点（逗号、引号、连字符）逐字；数字千分位 `6,020` 照抄。
- 单位写进选项/题干原文（`feet`、`cm`、`pounds`），不另造单位行。

---

## 4. mcq / grid 答案规则

- **mcq**：`answer` = 单字母；`text.choices` 必须含该字母；普通题四个文字选项齐全。
- **grid**：`answer` 为标准答案串（分数 `29/3, 9.666, 9.667`、小数 `.0625, 1/16`、整数 `176`、多答案 `2 or 8`），`value` 为程序判分用的有限数字；`choices` 留空 `{}`。
- 答案必须自己独立复算一遍，再对答案页；复算过程可写进 `hint`。

---

## 5. 矢量图 spec 写法（`data/figures.js` → `TD_FIG_SPECS[题id]`）

渲染器在 `figures.js`，现有数据覆盖：chart 75 / table 59 / rawSvg 14 / triangle 11 / parallelLines 7 / crossingLines 2。**先找同类现有题照抄骨架，只换数据。**

### 5.1 chart（坐标系/散点/折线/柱状/箱线/阴影）

```js
'R03-001': {
  type: 'chart',
  x: { min: 0, max: 5, step: 1, label: 'x', labels: [0,1,2,3,4,5] },
  y: { min: 0, max: 90, step: 10, label: 'Trees planted', showZero: true },
  grid: true,
  origin: 'O',
  axesAt: 'zero',
  axisLabelsEnd: true,
  w: 430, h: 400,
  series: [ { kind: 'line', points: [[0,0],[5,100]] } ],
  marks: [ { x: 34, y: 20, label: '20', dy: -9 } ]
}
```

- `x`/`y`：`min/max/step/label`；`labels[]` 自定义刻度（跳过默认步长时用）；`cats` 给柱状图类别锚点；`showZero` y 轴强制过 0。
- `series[].kind`（数据里实际出现的）：`line`（`points:[[x,y]...]`，可加 `dash:'7 4'`）、`points`（散点）、`exp`（`a,b,c` 指数）、`bar`（`bars:[{x0,x1,h}]`）、`box`（`lo,q1,med,q3,hi` 箱线）、`region`（阴影多边形，§5.5）。渲染器另支持 `hist`/`poly`，数据未用，新题别先碰。
- `marks[]`：`{x,y,label,dx,dy,arrow,bend,ring}`，数据点标注。
- `grid/origin/axesAt/axisLabelsEnd/w/h` 照同类样例。

### 5.2 table（表格，一律结构化重绘，禁止截图）

```js
'R03-001': {
  type: 'table',
  head: ['Year', 'Subscription sold'],
  rows: [ ['2012', '5,600'], ['2013', '5,880'] ],
  headGroups: [ { label: 'Power capacity', span: 4 } ]   // 可选，仅 SP2-002 用过
}
```

- 单元格纯文本；含 `Total` 的行渲染器自动加粗；**不支持斜体/公式混排**，长句就写完整字符串。
- `caption` 渲染器支持、数据未用；别依赖。

### 5.3 parallelLines（平行线+截线，7 个现有样例）

**四象限硬约束（figures.js 顶部注释 + 渲染器双重检查），别凭标签纸上位置猜：**

- 字段：`topLabel`/`bottomLabel`/`transLabel`；`topUL/topUR/topLL/topLR`（上线两楔）、`botUL/botUR/botLL/botLR`（下线两楔）；`direction: 'NE'`（默认）/`'SE'`；`noArcs` 可选；`note` 是作者注释不渲染。
- NE：UL 钝、UR 锐、LL 锐、LR 钝；SE：UL 锐、UR 钝、LL 钝、LR 钝。
- **>90° 标签必须放钝角楔，<90° 放锐角楔**。旧别名 `topLeft=topUL`、`bottomLeft=botUL` 仅线上方兼容，新写用新名。

### 5.4 triangle / crossingLines / rawSvg

- `triangle`：`pts`、`labels:['A','B','C']`、`angles:{0,1,2}`、`sides:{0,1,2}`、`right:[顶点号]`。
- `crossingLines`：`topLabel/bottomLabel`（两线对顶角）。
- `rawSvg`：手写 `<svg viewBox=...>` 兜底；颜色统一 `#162c46`，字号 14–15，衬线字体（照 U4-05 样例）。
- `circle`/`rect` 渲染器存在但**数据零使用**，新题遇到圆/矩形优先 rawSvg，别发明字段。

### 5.5 region（阴影区域）

chart 里加一条 `series[].kind:'region'`，`points:[[x,y]...]` 围成多边形（≥3 点，按边界顺序）。**题干含 shaded 就必须有 region 多边形**（`test/shaded-region.test.js` 会拦）；旧题靠裁图，新题禁用裁图。配合边界线用一条 `line`（`dash` 虚线表示不等号边界）。

### 5.6 TD_CHOICE_GRAPHS（四个选项各一张图）

`TD_CHOICE_GRAPHS[题id] = { A:{x,y,series:[...]}, B:{...}, ... }`，每个选项是一份迷你 chart（结构同 §5.1 的 x/y/series）。仅"选项是四张小图"时用。

> 缺口：`choiceFigures.vector` 只解析讲义 `JY_FIG`（`data/jiangyi_figures.js`），真题 drill 不加载；真题选项图只走 `TD_CHOICE_GRAPHS`。

---

## 6. 新增分组板块 + Topic 子节施工说明（03 册 → Unit 2 板块，04 册 → Unit 4 板块）

目标：专项训练页里新建两个板块，分别承载 03 册、04 册全量重录题，板块内按册子 Topic 分组。机制全部实测，照下面模板抄。

### 6.1 三种现成分组模型（实测自当前 HEAD）

**模型 A — 1.7（声明父组 + 5 个子节）**，`data/questions.js` 的 `units[]` 声明里：

```js
{ "id": "1.7", "cn": "专项练习", "count": 131, "isGroup": true, "childCount": 5 },
{ "id": "1.7.T1", "cn": "Topic 1 · 线性方程组解的个数", "count": 25, "topic": 1, "parent": "1.7" },
{ "id": "1.7.T2", "cn": "Topic 2 · 一元线性方程求解", "count": 22, "topic": 2, "parent": "1.7" },
// …T3/T4/T5 同构
```

**模型 B — 2.6（父组不声明，只挂子节）**：群组本身不写 `isGroup` 节点，只声明 `2.6.T17`/`2.6.T18`，页面照样工作（CATALOG 由题目 section 自动建键，声明层只管中文名和计数）。

**模型 C — 3.6（专属 topic 子视图）**：`isTopicSection` 在 `app-core.js` 里**硬编码 `/^3\.6\.T\d+$/`**，只有 3.6.T 进专属 topic 视图；新板块不要指望这个待遇，所有 `X.Y.Tn`（非 3.6）都进**专项训练板**（`isSpecialSection = /^\d+\.\d+\.T\d+$/`），按 section 首段数字归到 U1–U4 分组，自动出现，**不用改任何 HTML/侧栏**。

### 6.2 新板块怎么落（推荐模型 A，父组声明 + Topic 子节）

- **03 册 → Unit 2**：建议父组 `2.7`，Topic 子节 `2.7.T1`…`2.7.Tn`（2.1–2.5 是 TD 教材节，2.6 已被 SP2 占用；`2.7` 的 legacy 孤儿题走 `L2` 键，不与新 section 冲突）。
- **04 册 → Unit 4**：父组 `4.5`，子节 `4.5.T24`…（`app-core.js` 注释已预留 `4.5.T24.. (U4 专项练习, PDF04 Topics)` 约定；4.1–4.4 为现有节）。
- 声明模板（照抄，改 id/cn/topic 号）：

```js
// Unit 2 的 sections 数组内追加：
{ "id": "2.7", "cn": "03 Problem Solving 专项练习（重录）", "count": 0, "isGroup": true, "childCount": 0 },
{ "id": "2.7.T1", "cn": "Topic 1 · （该 Topic 中文名）", "count": 0, "topic": 1, "parent": "2.7" },
// Unit 4 的 sections 数组内追加：
{ "id": "4.5", "cn": "04 Geometry 专项练习（重录）", "count": 0, "isGroup": true, "childCount": 0 },
{ "id": "4.5.T24", "cn": "Topic 24 · （该 Topic 中文名）", "count": 0, "topic": 24, "parent": "4.5" },
```

### 6.3 新题对象的 `section` 填什么

**填 Topic 子节 id（如 `2.7.T1`），不填父组 `2.7`。** 父组 `isGroup:true` 自身不挂题，只是分组容器；`count`/`childCount` 由脚本重算，手填会被覆盖。`unit=2`/`4`，`topic` 写 `专项练习 · Topic N · 第 k 题`，`paper` 含「专项」。

### 6.4 新增板块要同步改的地方（清单，别漏）

| 位置 | 改什么 |
|---|---|
| `data/questions.js` 题目段 | 新题对象（§2.1），`section`=子节 id |
| `data/questions.js` `units[]` 声明 | 父组 + 子节声明（§6.2）；`count`/`childCount`/`total` 先写 0 |
| `data/text.js` | 每题 stem/choices/figure/type |
| `data/figures.js` | 矢量 spec / `TD_CHOICE_GRAPHS` |
| `tools/rollup_declarations.py --write` | 跑一遍重算子节 count、父组 childCount、unit.total（**必须跑，否则计数对不上**） |
| `bump_assets.py`（safe_push 自动带） | 五页 `?v=` 哈希对齐，不用手改 HTML |
| `data/questions.json`/`data/text.json` | **不动**（历史快照，§1） |
| 根 `questions.js`、`data/aliases.js` | 不动（新题不是旧题重复） |
| `exam.html` / 侧栏 / nav | **不用改**：模考开场页按 `BANK.units` 自动出 per-unit 专项开关（`exam.js renderSpecialOptions`），专项板由 `specialUnits()` 自动推导 |

### 6.5 哪些测试可能因此变红（实测结论）

- `test/nav.test.js`：只读 HTML 导航字面，新增板块**不红**。
- `test/l4-merge.test.js`：只拦 `origin=legacy && unit=4`；新题 `origin=pdf` **不红**。
- `test/choice-gate.test.js`：WHITELIST 为空，mcq 缺选项来源即红 → 新题选项必须有文字或矢量通路。
- `test/shaded-region.test.js`：shaded 必须有 region 或登记裁图（新题走 region）→ 漏图红。
- `test/version-sync.test.js`：五页 `?v=` 同值，由 bump 守 → 忘跑 bump 红。
- `test/grading`/`session`/`aliases`：与新增 section 无关，不红。
- 无任何测试硬编码总题数。

### 6.6 新增板块后自检命令清单（逐条跑，附预期）

```bash
# 1) 声明计数重算 + 报告孤儿 section
python3 tools/rollup_declarations.py --write
# 预期：2.7/4.5 及其子节 count 被回填；末尾不出现新板块名进"未声明"列表

# 2) 全量测试
node --test test/*.test.js
# 预期：123 pass 起步，新增题不引入 fail（基线以当次 HEAD 为准）

# 3) 新批次结构校验（圈定新前缀，strict 口径）
python3 tools/transcribe_reconcile.py --check --prefix R03
python3 tools/transcribe_reconcile.py --check --prefix R04
# 预期：FAIL 0（WARN 仅 hint 为空等提示），退出码 0

# 4) 回读清单人工对页（§7）
python3 tools/transcribe_reconcile.py --prefix R03 --out /tmp/r03.txt

# 5) 版本守卫
python3 bump_assets.py --check
# 预期：PASS 五页资源版本一致

# 6) 推送（自动 commit/rebase/bump/push）
bash safe_push.sh "新增 03/04 专项板块 + R03/R04 批次"
git ls-remote origin refs/heads/main
# 预期：远端 main 哈希 == 本地 HEAD 哈希
```

---

## 7. 录入工作流与每批必跑命令

1. **分批**：按 Topic 分批（一个 Topic 一批，10–30 题），不要一次录整本。
2. **录题**：questions.js 追加元数据 → text.js 补条目 → figures.js 补 spec。
3. **回读对账（每批必做）**：
   ```bash
   python3 tools/transcribe_reconcile.py --section 2.7.T1 --out /tmp/rb.txt
   ```
   打开 `/tmp/rb.txt`，与扫描原页并排：题干逐句、选项 A–E、单位、上下标、图表数据点逐条打勾；不一致就改，改到清单 100% 对得上。
4. **结构校验（每批必做）**：
   ```bash
   python3 tools/transcribe_reconcile.py --check --section 2.7.T1
   ```
   退出码 0 才算过；FAIL 逐条修。
5. **整批收口**：`node --test test/*.test.js` 全绿 → `python3 tools/rollup_declarations.py --write` → `bash safe_push.sh "..."` → `git ls-remote origin refs/heads/main` 核对哈希。

### 脚本 `tools/transcribe_reconcile.py` 用法（只读仓库）

```bash
# 回读清单（默认 stdout；--out 写文件供 diff）
python3 tools/transcribe_reconcile.py --readback R03-001
python3 tools/transcribe_reconcile.py --section 2.7.T1
python3 tools/transcribe_reconcile.py --prefix R03
python3 tools/transcribe_reconcile.py --all --out /tmp/rb.txt

# 结构校验（--ids/--section/--prefix 圈定新题 = strict 口径；--all = 历史基线，软违规只 WARN）
python3 tools/transcribe_reconcile.py --check --ids R03-001,R03-002
python3 tools/transcribe_reconcile.py --check --section 2.7.T1
python3 tools/transcribe_reconcile.py --check --prefix R03

# 扫描页渲染（无 OCR，仅供人眼对页；pymupdf）
python3 tools/transcribe_reconcile.py --pdf "~/Desktop/04 Geometry.pdf" --pages 12,15-17 --outdir render/ --dpi 300
```

校验覆盖：必填字段、type/level/origin/unit 取值域、section↔unit 一致、text.js 条目存在、stem 双份一致、mcq 四选项/答案字母、grid value 数字、位图禁令、shaded→region、图表矢量通路、id 唯一、未声明 section。退出码 0=全过，1=有 FAIL。

---

## 8. 需扩模板缺口清单（机制不支持，遇到先报给派单，别硬塞）

| 缺口 | 现状 | 处置 |
|---|---|---|
| 选项矢量图走 `choiceFigures.vector` | 只解析讲义 `JY_FIG`，真题 drill 不加载 | 真题选项图只用 `TD_CHOICE_GRAPHS` |
| `circle`/`rect` spec | 渲染器存在、数据零样例 | 用 rawSvg 兜底 |
| 表格斜体/公式混排 | 单元格纯文本 | 文字写全，别用 markdown |
| `hist`/`poly` series | 渲染器支持、数据未用 | 新题先不用 |
| 概率转盘、数轴、Venn 图、饼图 | 无现成模板 | 报派单评估 rawSvg 或扩渲染器，不擅改渲染代码 |
| 图片内文字（选项截图式排版） | 位图禁令 | 一律转文字选项或矢量重画 |

---

## 9. 推送纪律

- 只走 `bash safe_push.sh "提交消息"`：commit → pull --rebase（自动解纯 HTML 哈希冲突）→ bump 资源哈希 → amend → push（失败重试，**禁 force**）。
- 推完必须 `git ls-remote origin refs/heads/main`，把远端哈希与本地 `git rev-parse HEAD` 对一遍，写进回执（改了哪些文件 / 命令+真实输出 / commit hash / 线上哈希）。
- `verify_site.mjs` 硬编码 Mac Chrome 路径，仅 macOS 可选跑，不是必跑项。
