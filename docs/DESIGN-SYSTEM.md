# TD SAT Math — 设计系统规范（契约快照）

> 版本 1.0.0 · 提取日期 2026-11-21
> 来源：线上实际生效的 `app.css`（`:root`）与 `bluebook.css`（`--bb-*`），非设计稿臆造。
> Token 机器可读契约见 `design-tokens.json` / `design-tokens.css`。

## 0. 本规范的目的

历史上设计变量只散落在 CSS 里，没有独立契约文件，导致每次改动都靠"翻源码找色值"。本文件把**线上正在用的**值固化成规范，供后续改动对照。它不参与页面加载，不改任何线上行为。

## 1. 品牌与基调

- 产品：SAT 数学四模块练习应用（单元练习 / 单元抽查 / 错题回顾 / 模考）。
- 基调：Bluebook 官方做题面 + 克制蓝图纸（Delta Force light blue-white tactical）。
- 对标：College Board Bluebook（做题视图）+ Linear（信息密度与克制）。
- 主题：浅色。做题视图必须保持干净白纸面，不得出现装饰性网格 / 发光 / 大标题。

## 2. 颜色 Token（节选，完整见 JSON）

| 语义 | Token | 值 |
|---|---|---|
| 主文字 | `--ink` | `#12233f` |
| 次级文字 | `--sub` | `#51648a` |
| 弱文字 | `--faint` | `#8294b4` |
| 纸面 | `--paper` | `#ffffff` |
| 底色 | `--bg` | `#eaf0f6` |
| 静默填充 | `--wash` | `#eef4fd` |
| 主蓝 | `--blue` | `#2563eb` |
| 强蓝 | `--blue-strong` | `#1d4ed8` |
| 深蓝导航 | `--navy` | `#12233f` |
| 正确 | `--ok` | `#157a52` |
| 警告 | `--warn` | `#b07a12` |
| 错误 | `--bad` | `#c0392b` |

Bluebook 做题面通过 `--bb-*` 别名复用上述 token（如 `--bb-ink:var(--ink)`），不引入第二套色板。

## 3. 字体

- 正文 sans：`--sans`（Inter → 系统字体栈 → PingFang SC / Microsoft YaHei）。
- 官方衬线：`--bb-official-serif`（Times New Roman / Iowan Old Style）。
- 等宽：`--mono`（ui-monospace / Menlo / Consolas）。
- 字号阶梯：11 / 12 / 12.5 / 13 / 13.5 / 14 / 15 / 16 / 17 / 18 / 28–34（标题 clamp）。
- 做题面题干 16–18px，选项 15–17px，状态文字 12–13px。

## 4. 几何与间距

- 圆角：`--radius-sm` 6px / `--radius` 8px / `--radius-lg` 14px / `--radius-pill` 999px。
- 间距：`--sp1` 8 / `--sp2` 12 / `--sp3` 16 / `--sp4` 24 / `--sp5` 32 / `--sp6` 48。
- 阴影：`--shadow-1`（细边框卡）/ `--shadow-2`（浮层）/ `--shadow-3`（模态）。
- 缓动：`--ease: cubic-bezier(.2,.7,.3,1)`。**禁止**弹性/弹跳缓动。

## 5. 四模块布局契约（实测值）

| 模块 | 关键容器 | 实测尺寸 |
|---|---|---|
| 单元练习 | `.drill-questionbar` | 高 64px，白底，下边框 `--bb-line` |
| 单元练习 | `.drill-footer` | 高 66px，sticky bottom，上边框 + 轻阴影 |
| 单元练习 | `.drill-choice` | 图选项最大高 150px，`object-fit:contain` |
| 单元练习 | 内容区最大宽 | 1240px（`max-width:1240px`）|
| 单元抽查 / 模考 | `.exam-panel` | padding 28px，圆角 `--radius-lg`，`--shadow-1` |
| 单元抽查 / 模考 | 标题 | clamp(28px,3vw,34px)，letter-spacing -.02em |
| 错题回顾 | `.rev-summary .s` | padding 18px，分隔线 `--bb-line-soft` |
| 账号设置 | `.td-acct-panel` | width min(430px,100%)，max-height 88vh，圆角 12px |

## 6. 组件四态（选项 / 按钮）

- 选项默认：白底 `--paper`，边框 `--line`，文字 `--bb-ink`。
- 选项 hover：边框 `--blue`，背景 `--bb-choice-hover`（即 `--blue-soft`）。
- 选项选中：蓝底蓝框，文字 `--paper`；标记态用 `--warn` / `--warn-soft`。
- 选项禁用：`--bb-disabled`，不响应 hover。
- 按钮：min-height 42px，padding 9px 16px，圆角 `--radius-sm`，字号 13.5px / 600。
- 输入框（grid-in）：高 54px，padding 0 14px，边框 `--line-strong`，字号 17px。

## 7. 图标系统（P0 硬规则）

- **禁止 emoji 作为功能图标**（已用正则扫描全站 HTML/JS，当前 0 命中）。
- 图标统一为**内联 SVG**，描边风格，`stroke-width` 1.6–1.8，尺寸 16px（行内）/ 18px（小按钮）/ 20px（按钮）。
- 当前在用的图标：设置齿轮、关闭 ×、退出、草稿笔、撤销/重做。新增图标必须沿用同一描边风格，不得引入第二套图标库。

## 8. 明确不做（Out-of-Scope）

| 不做 | 原因 |
|---|---|
| 紫→粉渐变主视觉 / 发光边框 / 毛玻璃三件套 | 违反 P0-2，且和 Bluebook 官方风格冲突 |
| 弹性缓动 / 装饰性动效 | 违反 P0-3；做题面需要稳定克制 |
| 做题视图内的网格纸 / 四角 crop marks / 大号 eyebrow 标题 | 曾用 `:has()` 抑制；装饰噪音盖过题目 |
| 新增与考试无关的模块（聊天/社区/积分等） | 全站仅四模块 |
| 硬编码颜色（除 `#fff` `#000`） | 一律走 token |

## 9. 变更纪律

1. 改 token 值 → 同时改 `app.css :root` / `bluebook.css`，再重新导出 `design-tokens.json|css`，并更新本文档表格。
2. 新增组件 → 先在此文档登记四态与尺寸，再写 CSS。
3. 本文档是**快照**，不是运行时依赖；不要 `@import design-tokens.css` 到页面（会覆盖线上值）。
