# UI-COPY.md — 界面语言规范（老板 2026-11-24 裁决）

## 一句话

照 **Bluebook**：**题目与考试操作用英文（Bluebook 原词），练习与站点功能层用中文。** 不做全中文，也不做中英并列。

## 分层规则

| 层 | 语言 | 示例 |
|---|---|---|
| 题干 / 选项 / 图表标签 / 单位 | 英文，原样不动 | `Which inequality is represented by the shaded region?` |
| 模考页（`exam.html`、`exam.js`、`bluebook-shell.js`） | **纯 Bluebook 英文术语** | `Reference`、`Directions`、`Calculator`、`Mark for Review`、`Next`、`Back`、`Section 1, Module 1: Math`、`Question 7 of 22`、`Time Remaining`、`Exit` |
| 练习页（`drill`） | 题干英文 + 中文导语与板块名 | 顶栏「1.1 线性方程与函数图像」、单元练习、单元抽查 |
| 站点功能层（首页 / 设置 / 账户 / 错题本 / 同步 / 报错 / toast） | 中文 | 设置、账户、错题回顾、进度同步 |

## 判定口诀

- Bluebook 上**有**的控件 → 用它的英文原词，不翻译。
- Bluebook 上**没有**的功能（错题本、云同步、归因报告、存档过期提示）→ 中文。
- 品牌名 `SAT Math Prep` 保持英文。

## 现状量化（`main` `f188964` 实测，仅统计字符串字面量，不含注释）

| 文件 | 含中文文案 | 处理 |
|---|---|---|
| `exam.js` | 41 | 改 Bluebook 英文 |
| `exam.html` | 5 | 改 Bluebook 英文 |
| `bluebook-shell.js` | 6 | 改 Bluebook 英文 |
| `drill.js` | 82 | 保留中文 |
| `drill.html` | 6 | 保留中文 |
| `index.html` | 1 | 保留中文 |

结论：**码农 β 只需处理模考层约 52 条**，练习层的 88 条不动。全中文方案会多出 88 条翻译量，还会丢掉 Bluebook 的考试真实感，不采用。

## 边界

1. 不新增 i18n 框架、不做语言切换开关；直接替换文案即可。
2. `aria-label` 等无障碍文本与可见文案同语言（模考英文、练习中文）。
3. 错误提示（如「存档已过期，请重新开始」）保留中文——属于站点功能层，Bluebook 无对应控件。
4. 练习页顶栏板块名（编程者 P1-4）用中文，与第 3 行规则一致。
