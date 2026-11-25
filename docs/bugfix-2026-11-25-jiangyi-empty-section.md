# P1-A：讲义页 0 题小节点击无反馈 —— 缺陷修复记录（2026-11-25）

## 现象 / 复现

1. 打开 `jiangyi.html` → 点 U2（Problem Solving and Data Analysis）板块卡。
2. 列表里「2.1 比率、比例、百分比与单位换算（已录 0 / 应有 13）」等 2.1–2.7 七行（U3 3.1–3.6、U4 4.3–4.5 同症状，共 20 个 0 题小节）。
3. 鼠标悬停：行有高亮/浮起/投影，右侧出现蓝色暗示；点击：页面完全不变，`#jyQuiz` 仍 `display:none`，无任何提示。
4. U1（有题小节）表现正常：悬停高亮、手型光标、点击进入做题页。

## 根因

旧分支把 0 题行渲染成 `<div class="drill-section-row" style="opacity:.55;cursor:default">`
（`jiangyi-page.js` 旧第 81–85 行），**以为换了 div + inline cursor 就不是链接了**，
但 `:hover` 是伪类，跟元素是不是 `<a>` 无关；而且共享 CSS 里这些 hover 声明全部带
`!important`，inline 非 `!important` 的 `cursor:default` 在层叠上压不住它们：

- `glass.css:140` `.drill-section-row:hover{background:rgba(29,29,31,.04)!important;box-shadow:inset 2px 0 0 var(--blue)!important;transform:translateY(-1px);}`
- `glass.css:536` `.drill-board-nav-item:hover,.drill-section-row:hover{transform:translateY(-1px)!important;box-shadow:0 3px 10px rgba(31,45,61,.09),var(--glass-hi)!important;}`
- `glass.css:274` `.drill-section-row:hover .drill-section-go{color:var(--blue)!important}`
- `bluebook.css:448` `.drill-section-row:hover{background:#f7faff!important;text-decoration:none}`
- `bluebook.css:776-780` 悬停组：`transform:translateY(-3px)!important;background:rgba(255,255,255,.88)!important;box-shadow:0 14px 28px rgba(31,45,61,.13)!important`
- `bluebook.css:785` `.drill-section-row:hover{background:rgba(255,255,255,.85)!important}`
- 常态底座 `bluebook.css:771-775` 还给每一行白色半透明卡底 + 边框 + 圆角 + 投影，
  让 0 题行**静止时就长得像按钮**。

所以"点了没反应"的本质不是缺事件，而是**这行看起来仍然可点**：悬停反馈在暗示可交互，
点击却没有任何路径响应。inline `cursor:default` 只管箭头形状，管不了背景/投影/浮起。

## 修法：A（禁用态）+ B（误点轻提示）叠加

选叠加的理由：A 从视觉上根除"可点暗示"（主修复）；B 只在用户误点时给一句解释，
不恢复任何可点外观，不违反"不能为了弹提示反而让行看起来可点"。

### 改动文件

**`jiangyi-page.js`**
- 0 题分支改渲染为 `<div class="drill-section-row jy-empty-row" data-empty="1" aria-disabled="true">`：
  - 去掉 inline `opacity/cursor`，改由页内样式统一控制；
  - meta 改为「已录 0 / 应有 N 题」；右侧 `—` 换成独立灰 pill「待录入」徽标
    （`.jy-empty-badge`），不再埋在 meta 长句里；
  - 空题行**不带 `data-sec`**，不进现有 `[data-sec]` 点击绑定。
- 新增独立绑定：`[data-empty="1"]` 行点击只调 `jyToast('本节题目尚未录入，先在题库里补题')`，
  绝不走 `openSection`。
- 新增 `jyToast()`：复用 `bluebook.css:483` 的 `#toast` 样式与 `bluebook.css:162` 的
  `#toast.show`（**未改动这两条**），2.6s 自动消失，`pointer-events:none` 不挡列表。

**`jiangyi.html`**（只动页内 `<style>` 与尾部，新增作用域规则，**未改任何共享 CSS 声明、未动一个 `!important`**）
- 新增 `.jy-page .drill-section-row[data-empty="1"]` 作用域块：
  - 常态：`cursor:default!important;opacity:.62!important;background:transparent!important;border:0!important;
    border-radius:0!important;box-shadow:none!important;transform:none!important;`（保留细分隔线）；
  - `:hover / :focus / :focus-visible`：背景透明、无投影、无浮起、无边框色、无 outline；
  - 题号胶囊与文字降饱和为灰；`.jy-empty-badge` 灰 pill 样式。
- 选择器带 `.jy-page` 前缀（jiangyi.html body 独有类），特异性 (0,4,0) 压过共享文件里
  `.drill-section-row:hover` 的 (0,2,0) `!important`，**不需要改旧声明**。
- 尾部加 `<div id="toast" role="status" aria-live="polite"></div>`。

### 作用域安全

- `drill.html` 真题练习页的 `.drill-section-row` 是 `<a>`，body 为 `shell-drill`、无 `jy-page`，
  新规则一条都不命中，行样式与点击零影响。
- U1 等有题小节渲染分支一字未动。
- `app.css / bluebook.css / glass.css` 未改；`data/`、`tools/`、`cloud-account.js` 未碰。

## 验证

- `node --test test/*.test.js`：全绿；`python3 bump_assets.py` 五页版本一致。
- 三档（390 / 655 / 1280）headless CDP（本机 Google Chrome）截图与点击断言：

| 内容 | 路径 |
|---|---|
| U2 空题列表 · 390 | `docs/ui-shots/bugfix-2026-11-25/jiangyi-empty-390.png` |
| U2 空题列表 · 655 | `docs/ui-shots/bugfix-2026-11-25/jiangyi-empty-655.png` |
| U2 空题列表 · 1280 | `docs/ui-shots/bugfix-2026-11-25/jiangyi-empty-1280.png` |
| U1 有题正常态 · 390/655/1280 | `docs/ui-shots/bugfix-2026-11-25/jiangyi-u1-{390,655,1280}.png` |
| U1 进入做题页 · 390/655/1280 | `docs/ui-shots/bugfix-2026-11-25/jiangyi-u1-quiz-{390,655,1280}.png` |
| 点击断言 JSON | `docs/bugfix-2026-11-25/jiangyi-empty-click.json` |

断言结果（三档一致；复测时 2.1 已被题库线录入，U2 空题=6、有题=1，机制结论不变）：

- U2 空题行：悬停前后 `background/boxShadow/transform/cursor` 零变化（`hoverChanged=false`）；
  点击前后 `#jyQuiz` 均为 `none`（`enteredQuiz=false`）；toast 文案
  「本节题目尚未录入，先在题库里补题」出现并在 2.6s 后自动消失。
- 同板有题行（2.1）：白卡/「开始」/手型光标保持原样，与禁用行形成对比。
- U1 · 1.1：悬停 `hoverChanged=true`（高亮/浮起/投影照旧、`cursor:pointer`）；
  点击后 `#jyQuiz` 由 `none → block`，`#jyCurrent` = `U1 Algebra · 1.1`，题卡正常渲染。

## 线上验收（push 后，base `https://timnotcook.github.io/SAT-Math`，`?v=feb82233b1b5`）

- `node tools/verify_nav.mjs --base <线上>`：38/38 通过（五页同值 `feb82233b1b5`）。
- `node tools/verify_a11y.mjs --base <线上>`：20/20 通过。
- `node tools/verify_session.mjs --base <线上>`：22/22 通过。
- `node tools/quiz_regress.mjs <线上>`：4/4 通过。
- `node tools/narrow_check.mjs <线上> docs/ui-shots/bugfix-2026-11-25`：14 屏次，0 横滚、0 出框。

线上三档（390/655/1280）CDP 复测（与本地同断言）：

| 内容 | 路径 |
|---|---|
| U2 空题列表 · 线上 · 390/655/1280 | `docs/ui-shots/bugfix-2026-11-25/jiangyi-empty-live-{390,655,1280}.png` |
| U1 有题正常态 · 线上 · 390/655/1280 | `docs/ui-shots/bugfix-2026-11-25/jiangyi-u1-live-{390,655,1280}.png` |
| U1 进入做题页 · 线上 · 390/655/1280 | `docs/ui-shots/bugfix-2026-11-25/jiangyi-u1-quiz-live-{390,655,1280}.png` |
| 线上点击断言 JSON | `docs/bugfix-2026-11-25/jiangyi-empty-click-live.json` |

线上断言（三档一致）：U2 空题=6、有题=1，`hoverChanged=false`，点击 `#jyQuiz` 始终 `none`，
toast 出现并自动消失，`enteredQuiz=false`；U1·1.1 `hoverChanged=true`，点击进入做题页。
