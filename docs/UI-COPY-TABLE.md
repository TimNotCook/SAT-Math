# UI-COPY-TABLE.md — 模考屏中文文案逐条对照（v1.1 附表（已批：B + 隐藏导航 + 报告中文））

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
| 6 | 开场 | `题库 1009 题` | 隐藏（考试中不显示题库规模） | `exam.html:27` |
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
