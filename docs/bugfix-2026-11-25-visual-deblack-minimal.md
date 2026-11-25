# 修复记录：去黑 + 极简化 + 排版统一（2026-11-25）

## 背景与结论

总监三条原话：

1. "黑色条子不能有，每次点一下就冒出黑色的东西，全给我改没"
2. "整体页面丑得要死，排版可以改，但整体太丑"
3. "越简洁越好，题库有几题、系统怎么操作我都不需要知道，我只想知道我能不能用"

本次只动 CSS / 页面骨架 / 文案，未改题目内容、答案、专项分组元数据，未碰
`data/`、`cloud-account.js`、`supa-cloud.js`、`jiangyi.html` 结构、
`AGENTS.md`、`docs/TASKS.md`、`tools/verify_*.mjs`。

**结论**：浅色主题回归既有蓝图蓝 / 墨蓝令牌体系；非文本元素近黑实心背景
本地 CDP 探针三档（1280 / 655 / 390）× 八页 × default/hover/focus/弹层展开
共 **75 个组合，dark-fill = 0，dark-gradient = 0**。首页三张卡只留标题 + 动作，
题库总量 / 板块数 / 已录应有 / 操作说明等内部口径不再外露。

## 一、纯黑清零（改法 + 位置 + 证据）

### 1.1 做题页底栏位置药丸 `.drill-position-button`

- `bluebook.css:525`：由纯黑底（`--bb-official-chip` 实值黑）+ 白字，改为
  **白底 + 1px `--line-strong` 细边 + `--ink` 深灰字**；保留分钟级宽度自适应、
  26px 高药丸与 `::after` ▲ 提示（`bluebook.css:526`）；窄屏 `min-width:118px`
  保留（`bluebook.css:621`）。hover 走浅 wash 底（`bluebook.css:64`）。
- 题号弹层主 CTA `.drill-nav-finish` 走蓝图蓝实心 + 白字
  （`bluebook.css:197`，hover 加深一档 `198`），不再是黑块。

### 1.2 左上题号方块 `.drill-qnumber`

- `bluebook.css:507`：`background:#000!important` + 白字 → **白底 + 1px
  `--line-strong` 边框 + `--blue-strong` 深色数字**；26×26 尺寸与
  `tabular-nums` 保留。

### 1.3 `glass.css` 两处深黑渐变按钮/块

根因：早期 `glass.css` 把 `--blue` 令牌覆盖成炭墨 `#1d1d1f`，连带账户按钮 /
已选态 / 主 CTA 一起变黑。本次把令牌层恢复为蓝图蓝体系：

- `glass.css:7-16`：`--ink/--sub/--line/--navy/--blue/--blue-strong/--blue-soft/
  --blue-line` 全部从炭墨改为墨蓝 / 蓝图蓝 / 淡蓝底。
- `glass.css:40-49`：body 背景去掉三档径向 + 线性渐变，纯白 `#fff`，
  `::selection` 改淡蓝。
- `glass.css:127-144`：hover / 已选态去掉悬浮抬升与投影，改浅蓝底 + 蓝细边；
  小节行 hover 去掉左侧 2px 蓝竖条。
- `glass.css:204-207`：结果页正确率块 `.drill-result-score` 由
  `linear-gradient(155deg,#2c2c2e,#1d1d1f)` 白字 → **白底 + 1px 细线 + 深字**，
  大数字用 `--blue-strong`。
- `glass.css:227-248`：主 CTA `.btn.primary` / `.exam-submit-button` /
  入口页开始按钮由深炭墨渐变 + 黑 hover → **蓝图蓝实心 + 白字**，hover 加深
  `--blue-strong`，无渐变、无悬浮投影。
- `glass.css:267`：键盘 focus ring 由炭墨半透明改为 `--blue-strong` 深蓝描边，
  可访问性保留。

### 1.4 令牌与其余残留

- `docs/design-tokens.css:89`：`--bb-official-chip` 由 `#1f2022` 近黑改 `#ffffff`。
- `bluebook.css:559`：`:root` 同步把 `--bb-official-chip` 置白。
- `scratch-pad.js:32`：草稿板工具条 hover 字色 `#1f2328` → `#12233f`；
  `scratch-pad.js:43-44`：`.mist-done` 按钮由炭墨 / `#000` hover → 蓝图蓝 /
  `--blue-strong`。
- `bluebook.css:335-336`、`571`：做题页上下文条 `.drill-context` 由深蓝渐变 /
  半透明深底 → 白底 + 细底边 + 深字。
- `bluebook.css:576`：弹层头 `.bb-modal-head` 由墨蓝底白字 → 白底深字。
- `bluebook.css:740-745`：主按钮渐变 + 蓝投影 → 纯色蓝图蓝 / 深蓝 hover。
- `bluebook.css:789-793`：大数字多彩青蓝渐变描字 → 纯色 `--blue-strong`。
- `bluebook.css:815-819`：选项已选字母圆标由宝蓝渐变 → 纯色蓝图蓝。
- `bluebook.css:603`：草稿板 done 按钮兜底值 `--bb-navy` → 蓝图蓝系。

### 1.5 不在本次改动范围（已核实）

- 附件截图里那个黑色下拉（"编程者 / 码农 β / 码农 α" + 笔记本图标）是 Chrome
  自带"其他设备标签页"菜单的深色渲染，不是站点 CSS，改不了也不需要改。
- `glass.css` 内 `[data-theme="dark"]` 主题块全部保留未动（深色主题组件）。
- 半透明遮罩（`.bb-modal-backdrop` / `.drill-nav-backdrop` / `--veil`，
  alpha < 0.5）按探针阈值不计为实心黑面，保留。

## 二、极简化（文案删减，只改文案不碰逻辑）

### 2.1 首页三张卡：只留标题 + 动作

- `drill.js:143-148`：`boardNavItem()` 去掉副标题 `<span>` 与
  `已答 X / Y 题 · N 个板块` `<small>`，卡片只剩 `<b>标题</b>`。
- `drill.js:151-153`：讲义复习入口卡片同步只留标题。
- 被删除的旧文案（不再显示）：
  - "教材常规板块，按单元分组" / "按 Topic 分组的专项板块"
  - "1 / 529 题 · 23 个板块" / "0 / 754 题 · 29 个 Topic 板块"
  - "讲义题按小节顺序，题卡标注 p{页} #{题号}，与上面两组完全分开"
  - "4 个子板块 · 独立进度"

### 2.2 页面 lead 句与操作说明

- `drill.html:72`（列表）、`:86`（单元）、`:99`（专项）：三处
  `.drill-select-lead` 引导句删除。
- `drill.html:189`：题号弹层底部"交卷前不会显示对错；完成后统一公布每题结果"
  说明句删除。
- `drill.js:270`：结果页 lead 置空；`drill.js:279` 错题提示收敛为
  "N 道错题已加入错题回顾。"
- `exam.html:81`：模考卡副标题去掉"计时开始后中途可退出"从句，留
  "22 题 · 35 分钟"。
- `exam.js:571-572`：抽查开考参数条去掉"历史错题 N 道"第三 span（含优先抽测
  tooltip）。
- `jiangyi-page.js:46-52`：讲义板块卡去掉"已录 X 题 · N 小节"与
  "完成 X / Y · N%" 两行；空板块保留「待题库录入」灰胶囊。
- `jiangyi-page.js:68`：板块 lead 去掉小节数 / 题量 / 完成度 / 教材原题成组
  说明；`jiangyi-page.js:75-77`：教材原题子组卡去掉来源路径说明；
  `jiangyi-page.js:91`、`96`：小节行 meta 去掉"已录 0 / 应有 Y""已录 X / 应有
  Y · 已完成 · 对账未平"，只留"作答 X / Y"（有作答时）。

### 2.3 保留项（按既定口径未删）

- 小节行内 `作答 X / Y`、错题页头部统计、官方模考英文 intro 原文。
- 做题页上下文条的小节名、底栏 `Question 1 of 25 ▲` 位置提示。

## 三、排版统一（token 表）

间距 / 圆角 / 字号统一到既有令牌体系，留白加大，字体只留三级：

| 类别 | 令牌 / 值 | 用途 |
|---|---|---|
| 墨蓝主字 | `--ink #12233f` | 标题、正文主字 |
| 辅助字 | `--sub #51648a` | 辅助说明、次级文字 |
| 细描边 | `--line #d2e0f1` / `--line-soft #eef3fb` / `--line-strong #bcd0e8` | 卡片、按钮、分隔 |
| 淡蓝底 | `--wash #eef4fd` / `--blue-soft #e8f0fe` | hover 底、已选态底 |
| 蓝图蓝主 CTA | `--blue #2563eb` | 主按钮实心、强调 |
| 深蓝 hover | `--blue-strong #1d4ed8` | 主按钮 hover / active |
| 蓝细边 | `--blue-line #c2d4ea` | 蓝系描边 |
| 间距 | sp1 8 / sp2 12 / sp3 16 / sp4 24 / sp5 32 / sp6 48 px | 节奏统一 |
| 圆角 | sm 6 / 默认 8 / lg 14 / pill 999 px | 卡片 / 按钮 / 胶囊 |
| 卡片内边距 | 18px；按钮 9–14px | 留白加大 |
| 行高 | 标题 1.2 / 正文 1.5 / 大数字 1 | — |
| 字体三级 | 标题 700 16–20px ink；正文 400 14px ink/sub；辅助 12–12.5px sub/faint | 去掉多余层级 |

动效收敛：去掉卡片悬浮抬升（translateY）、悬浮投影、多彩渐变背景；hover
只换底色 / 描边；focus 可见性用深蓝描边保留（a11y 不退化）。

## 四、本地验收（工作副本，提交前快照）

### 4.1 单元测试

- `node --test test/*.test.js`：**142 pass / 0 fail**（19 suites，2026-11-26 00:0x
  本地实测；任务书预估基线 140，实测 142）。

### 4.2 资源版本

- `python3 bump_assets.py` 重算后 `python3 bump_assets.py --check`：**PASS**，
  五页 `?v=` 同值 `5911ab9ec507`（合并上游 auth 提交后重算）。

### 4.3 四项 verify 脚本（本地静态服务）

| 脚本 | 结果 |
|---|---|
| `verify_a11y.mjs` | **20 / 20 通过，0 失败** |
| `verify_session.mjs` | **22 / 22 通过，0 失败** |
| `verify_nav.mjs` | **38 / 38 通过，0 失败**（五页同值校验通过） |
| `narrow_check.mjs` | **14 屏次**（655 / 390 × 7 页），横向滚动 **0**，出框 **0** |

### 4.4 CDP 纯黑探针（三档 × 八页 × 多状态）

探针：`docs/ui-shots/2026-11-25-visual/audit-black.mjs`。判定阈值：背景色
alpha ≥ 0.5 且相对亮度 ≤ 0.14 记 dark-fill；渐变同阈值停点记 dark-gradient；
半透明遮罩（alpha < 0.5）与 SVG 内部填充不计。

- 基线（origin/main `257d52f`）：**dark-fill = 402，dark-gradient = 168**，
  75 组合 → `black-audit-before.json`。
- 整改后：**dark-fill = 0，dark-gradient = 0**，75 组合 → `black-audit.json`。
- 覆盖页：drill 列表 / 做题页 / 题号弹层（展开态）/ 结果页 / 错题回顾 / 讲义
  列表 / 抽查开考 / 模考开场；视口 1280 / 655 / 390；状态 default / hover /
  focus / panel-open。

### 4.5 前后对比截图

目录 `docs/ui-shots/2026-11-25-visual/`，命名
`<before|after>-<page>-<viewport>.png`：

- `before-drill-1280/655/390.png`、`before-question-…`、`before-panel-…`、
  `before-result-…`（基线）；
- `after-drill/question/panel/result/wrong/jiangyi/quiz/mock-1280/655/390.png`；
- 窄屏走查：`narrow/narrow-check.json` + `narrow/narrow-*.png`；
- 四项脚本截图：`proof-a11y/`、`proof-session/`、`proof-nav/`。

## 五、线上核验

> 提交推送后回填：线上 `?v=` 实测值、时刻、回拉 CSS 黑值 grep 结果、
> 四项脚本线上复测数字。

（待回填）

## 六、待办上报（红线范围，本次未动）

以下三处属于另一代理持有文件 / 红线范围，本次未改，留待对应任务收口：

1. `jiangyi.html:18` 内联 `.jy-board-card:hover{box-shadow:inset 3px 0 0
   var(--blue)}` 左侧蓝竖条；
2. `jiangyi.html:84` 静态 lead 句"按原书小节顺序刷讲义题…进度互不影响。"；
3. `jiangyi.html:86` 空板块提示里 `data/jiangyi.js` 实现路径字样。

另：账户面板（设置按钮展开态）内按钮未纳入本次探针覆盖；其变色依赖
`--blue` 令牌恢复，CSS 层已覆盖，面板注入样式在 `cloud-account.js`（红线）。

## 七、变更文件清单

| 文件 | 改动性质 |
|---|---|
| `bluebook.css` | 去黑规则、按钮 / 上下文条 / 弹层头 / 选项 / 大数字去渐变，令牌置白 |
| `glass.css` | 令牌层恢复蓝图蓝；深黑渐变块 / 主 CTA / hover / focus 去黑 |
| `docs/design-tokens.css` | `--bb-official-chip` 置白 |
| `drill.html` | 删三处 lead 句、弹层说明句；版本号哈希 |
| `drill.js` | 卡片去副标题 / 统计；结果页 lead 与错题提示收敛 |
| `exam.html` | 模卡副标题去从句；版本号哈希 |
| `exam.js` | 抽查参数条去历史错题 span |
| `jiangyi-page.js` | 讲义卡 / 小节行去已录应有 / 完成度 / 对账字样 |
| `jiangyi.html` | 仅版本号哈希行（结构未动） |
| `scratch-pad.js` | 草稿板按钮去炭墨 / 黑 hover |
| `index.html` / `wrong.html` | 版本号哈希 |
