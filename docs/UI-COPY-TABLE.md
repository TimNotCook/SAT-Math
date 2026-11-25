# UI-COPY-TABLE.md — 模考屏中文文案逐条对照（v1.2 · 2026-11-25 全站复查｜**模考五屏已落地，以 tools/mock_cjk.mjs 实测 5/5 为 0 为准**）

## 一、全站导航与标题（2026-11-25 复查，含修正）

Singular source of truth：顶部导航由 `app-core.js` 的 `APP.nav()` 生成；四页侧栏 `.site-rail` 必须是同一份五项、同字面。首页已删（`index.html` 只做一跳进 drill），**任何导航/品牌入口都不许再指向 `index.html` 当落地页**。

| 页 | `<title>` | 侧栏品牌链接 | 导航项（顺序固定） |
|---|---|---|---|
| `index.html`（一跳页，非落地页） | SAT Math Prep · 真题练习 | —（无侧栏） | —（3 秒内经 `location.replace` 进 drill） |
| `drill.html` | SAT Math Prep · 真题练习 | `drill.html`（自己） | 真题练习 / 讲义复习 / 单元抽查 / 错题回顾 / 模考 |
| `jiangyi.html` | SAT Math Prep · 讲义复习 | `drill.html` | 同上（自身高亮） |
| `exam.html?mode=quiz` | SAT Math Prep · 抽查与模考 | `drill.html` | 同上（高亮「单元抽查」，脚本按 mode 切） |
| `exam.html?mode=mock` | SAT Math Prep · 抽查与模考 | `drill.html` | 同上（mock 下整条导航隐藏，只留 `Exit`） |
| `wrong.html` | SAT Math Prep · 错题回顾 | `drill.html` | 同上（自身高亮） |

### 复查发现的四处不一致（已修，2026-11-25）

| # | 哪页 | 原来是什么 | 应该是 | 修法 |
|---|---|---|---|---|
| N1 | `drill` / `exam` / `wrong` / `jiangyi` 侧栏 | 只有 4 项：真题练习 / 讲义复习 / 模考 / **错题本**，缺「单元抽查」，顺序与顶部 5 项不同 | 与顶部同一份 5 项：真题练习 / 讲义复习 / **单元抽查** / **错题回顾** / 模考 | 四页 `.site-rail` 统一重写 |
| N2 | `wrong.html` 正文 + `exam.html` 导航 | 叫「错题本」；页面 `<title>` 和 `<h1>` 却叫「错题回顾」，同一样东西两个名 | 统一「错题回顾」 | 导航与导入说明一并改字 |
| N3 | 四页侧栏品牌 `SAT Math Prep` | `href="index.html"`，点一下先进一跳页再跳 drill（首页删除后的历史残留） | `href="drill.html"` | 四页 brand 直指 drill |
| N4 | `drill.html` 侧栏「← 返回真题练习」 | 在本页指向本页（自己返回自己），等于死入口 | 练习页不显示这一条；其余三页保留 | 从 drill 侧栏移除 |
| N5 | `exam.html` 侧栏高亮 | 无论 quiz 还是 mock 都高亮「模考」，抽查页假高亮 | 按 `?mode=` 决定：quiz→单元抽查、mock→模考 | 页内脚本切换 `aria-current` |

### 页面标题：无待改项

五页 `<title>` 已统一 `SAT Math Prep · <模块名>` 前缀（`tools/title_check.mjs` 断言前缀），模块名与导航字面一致（抽查页标题为「抽查与模考」，因为同一页承载两种模式，属唯一例外，已在表中登记）。

## 二、模考屏中文文案逐条对照（v1.1 明细保留）

口径：**只算模考模式下屏幕上真会出现的字**。来源两块——(a) 线上 `exam.html?mode=mock` 实跑，用 `getComputedStyle` 过滤不可见节点后取文本；(b) 源码里无 `OFFICIAL ?` 英文分支、且只在模考路径可达的字符串。

实测时间 2026-11-24 14:5x（HK），站点 `https://timnotcook.github.io/SAT-Math/exam.html?mode=mock`，`main@6ab8485`。

- 模考开场屏可见中文 **10 项**（导航 5 + 题库胶囊 2 片段 + 退出 + 清空 + 完成）
- 模考答题屏可见中文 **2 项**（清空、完成）
- 另有 **4 条**在模考路径可达但需触发（交卷/拦截/退出/格式校验）
- 合计 **15 条**（导航 6 项若按「模考隐藏导航」处理则不计入改写）

| # | 屏 | 原文（现状） | 建议文案 | 位置 |
|---|---|---|---|---|
| 1 | 开场 | `真题练习` | 隐藏（Bluebook 无站点导航） | `exam.html:22` |
| 2 | 开场 | `单元抽查` | 隐藏 | `exam.html:23` |
| 3 | 开场 | `错题回顾` | 隐藏 | `exam.html:24` |
| 4 | 开场 | `模考` | 隐藏 | `exam.html:25` |
| 5 | 开场 | `设置` | 隐藏 | 导航项（同 appbar） |
| 6 | 开场 | `题库 1009 题`（旧数；实计 **1010**，`questions.js` 唯一 id） | 隐藏（考试中不显示题库规模；首页删除后该胶囊已不在 drill 出现） | `exam.html:27` |
| 7 | 开场+答题 | `退出` | `Exit` | `exam.html:28` |
| 8 | 答题 | `清空`（草稿板按钮） | `Clear` | `scratch-pad.js:115` |
| 9 | 答题 | `完成`（草稿板按钮） | `Done` | `scratch-pad.js:116` |
| 10 | 开场 | `存档已过期，请重新开始` | `This saved test has expired. Start a new test.` | `exam.js:407`；`exam.html:52` |
| 11 | 答题 | `只能输入数字、小数点、斜杠和负号，不要带 %、$、逗号、字母或单位` | `Use digits, a decimal point, a slash, or a minus sign only. No %, $, commas, letters, or units.` | `exam.js:565` |
| 12 | 答题 | `格式无效：可写小数（如 0.75）或分数（如 3/4）` | `Invalid format. Enter a decimal (e.g., 0.75) or a fraction (e.g., 3/4).` | `exam.js:566` |
| 13 | 交卷 | `时间归零 · 已自动交卷并锁定答案` | `Time is up. Your test was submitted automatically and answers are locked.` | `exam.js:806` |
| 14 | 答题 | `考试期间禁止复制 / 粘贴题目与选项内容` | `Copying or pasting test content is not allowed during the test.` | `exam.js:906` |
| 15 | 退出 | `退出后计时不会暂停，但作答与进度已自动保存。确定退出吗？` | `The timer will not pause. Your answers and progress are saved. Exit the test?` | `exam.js:992` |

## 已就位、不用改的（避免重复劳动）

模考流程多数文案**代码里已有 `OFFICIAL ?` 英文分支**，线上模考显示的就是 Bluebook 原词，别再翻一遍：

`Directions`（exam.js:421 区）、`Answer`（548）、`Student-produced response directions`（551）、`Question Menu`（607）、`Finish Module 1?`（721）、`Submit your answers?`（722）、`Proceed to Module 2`（727）、`Submit`（728），以及 `Mark for Review / Reference / Calculator / Review / Submit / Back / Next / Time Remaining / Hide / Start / Section 2, Module 1 / Question n of m`（页面原件与 `bluebook-shell.js`）。

## 顺手报一个不一致（不是我改的范围）

开场页写 `22 Questions`（`exam.js:421` 硬编码），答题页实显示 `Question 1 of 24`。两个数打架，请开发者核哪个对——属 P1-6 文案与题量对齐。

## 练习页工具栏语言归属（**口径已定（2026-11-24）：练习页工具栏全英文、站点导航与解释文案中文｜状态：已执行（仅 P1 三词，P2/P3 未动）**）

模考五屏已按方案 B 走 `OFFICIAL ? 英文 : 中文`；练习页与抽查页仍是中文。工具栏（草稿板 `清空` / `完成`、`#btnScratch`、答题区工具条）属练习层的同一套按钮，是否跟着英文化需老板定口径：

| # | 位置 | 现状 | 候选口径 | 状态 |
|---|---|---|---|---|
| P1 | 练习页草稿板按钮 | 已按口径改：`草稿`→`Scratch`（`drill.html` 按钮标签）、`清空`→`Clear`、`完成`→`Done`（`scratch-pad.js` 新增 `TOOL()`，仅 `/drill.html` 走英文）；按钮 `title` 属解释文案，保留中文 | 口径=**B（全英文）** | **已执行（2026-11-24）** |
| P2 | 练习页答题工具条其余项（笔/荧光笔/橡皮等图标按钮） | 仍为中文 `title`（图标按钮无可见文字） | 口径未点名，本批未动 | **未动（等下一句指令）** |
| P3 | 抽查页（`mode=quiz`）工具栏 | 中文（`TOOL()` 只在 `/drill.html` 生效，抽查页实测仍是 `清空`/`完成`） | — | **未动（口径只批练习页）** |

> 口径定了之后在本节补「执行状态 + 验收数字」；在此之前任何回执不得把这节写成“已完成”。
