# 2026-11-26 导航重构：讲义并入 landing、新增模考记录页

## 改了什么

1. **讲义复习退出全局导航**：五页侧栏（drill/exam/wrong/jiangyi 的 `.site-rail`）与
   app-core.js 顶部导航均删除「讲义复习」项；jiangyi.html 页面本身保留，
   作为讲义做题承载页（landing 长条行直达 `jiangyi.html?b=…&s=…`）。
2. **侧栏 / 顶部导航新增「模考记录」→ history.html**，排在「模考」之后。
3. **真题练习 landing（drill.html selectView）改长条 accordion**：
   - 标题改为 hero：∑ 徽章 + h1「真题练习」，删除 eyebrow 小字「PRACTICE」；
   - 单元练习 / 专项训练 tab 内容改为四条 Unit 长条，展开为该单元板块列表，
     长条头部显示「已答/总题 · 完成板块数/总板块 + 百分比 + 进度条」；
   - 新增第三个 tab「讲义复习」：JY1–JY4 长条，展开为讲义小节（含 JY4 教材原题组）。
4. **新增 history.html + history-page.js（模考记录）**：只读渲染
   `tdsat_exam_suite_results_v1` 与新 key `tdsat_exam_suite_abandoned_v1`；
   长条列表按时间倒序，未做完排最前；分数着色：模考 ≥700 绿 / ≥550 橙 / 否则红，
   抽查与讲义按正确率 ≥85% / ≥60% 同阈值；未做完灰点。展开显示错题明细
   （题干兜底取 TD_BANK，讲义题不在银行时显示 topic/id）与「应该补哪块」报告
   （report.priority）。未做完且有匹配 session 时给「继续这卷」按钮跳回 exam.html。
5. **exam.js 加未做完自动存档（UI 零改动）**：pagehide 时若已开考未交卷，
   upsert `tdsat_exam_suite_abandoned_v1`（按 startedAt+mode 对齐）；
   finalize() 交卷与 restoreOrIntro() 成功恢复会话时清除对应记录。

## 明确不动

- exam.html 答题 / 复习 / 结果视图（Bluebook 1:1）UI 一律未动，仅 exam.js 加存储钩子；
- 单元抽查、错题回顾两页布局未动（仅侧栏导航项同步）。

## 验收

- `python3 bump_assets.py && --check`：六页（含 history.html）?v= 同值；
- `node --test test/*.test.js` 142 pass / 0 fail（nav.test.js 已更新为五项新真相：
  真题练习 / 单元抽查 / 错题回顾 / 模考 / 模考记录）；
- `node tools/verify_nav.mjs` 38/38（ENTRIES 同步去掉 jiangyi.html、加入 history.html；
  jy4 用户路径改为 landing 长条行直达 + jiangyi.html 板块页）。
