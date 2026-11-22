# AGENTS.md — 给接手这个项目的 AI 编程助手

这是一个 **SAT 数学刷题网站**，纯静态原生 JS 站点，无构建步骤、无 npm 依赖。
托管在 GitHub Pages（classic 构建）：push 到 `main` 分支后 Pages 自动发布，**不需要任何人工发布**。

## ⚠️ 多 AI 并行协作（改代码前先看，两位助手共用此仓库）

同一时间可能有**两位 AI 助手**在改这个项目（主会话 + 隔壁编程喵），
共用同一个仓库 `TimNotCook/SAT-Math`、同一个 `main` 分支。

真实冲突风险：
- 两人各自改完都跑 `bump_assets.py`，都会重写 3 个 HTML 的 `?v=` 哈希行 → push 冲突，
  或后推的人版本号基于旧快照 → 先推的人的改动被浏览器缓存挡住。
- 直接 `git push` 常遇到 non-fast-forward / `commit_refs_rules` / 502 被拒。

### 统一推送入口（两位都建议用这个）

```bash
bash safe_push.sh "fix(ui): 这次改了什么"
```

它按安全顺序做完：先 `commit`（工作区干净才能 rebase）→ `pull --rebase`（吸收对方提交）
→ **rebase 后重新跑 `bump_assets.py`**（关键：版本号基于双方最新代码重算，谁的改动都不会被缓存挡住）
→ `commit --amend` → `push`（网络抖动自动重试 3 次）。遇到真冲突会停在冲突态等人工处理，**绝不自动强推**。

### 如果不用脚本，手动流程必须遵守

1. 改完先 `git add -A && git commit -m "说明"`（先提交，工作区干净才能 rebase）。
2. `git pull --rebase origin main` 吸收同事改动；有冲突就人工解决后 `git rebase --continue`。
3. rebase 后**再跑一次** `python3 bump_assets.py`，然后 `git add -A && git commit --amend --no-edit`，
   让版本号基于双方最新代码。
4. push 被拒**不要强推**：先 `git fetch origin` 看线上 HEAD，确认提交链线性后重试。
5. **绝不** `git push --force`。

### 分工建议（减少同文件冲突）

- 视觉主题 / 玻璃质感 / 明暗主题：`glass.css`、`theme.js`
- 答题逻辑 / 抽题 / 判分：`exam.js`、`drill.js`、`app-*.js`
- 题库 / 题干：`data/*.js`
- `*.html` 主要由 `bump_assets.py` 自动改版本号，尽量不手改结构。

### 查线上真实状态

git 网络通道常报 `502` / `Empty reply`，但 push 可能其实已成功。
线上真实 HEAD 用 GitHub 接口查最可靠：`list_commits(owner=TimNotCook, repo=SAT-Math, sha=main)`，
确认后再下结论，别急着重推。

## 你的工作方式（重要）

1. 直接修改本仓库里的文件（HTML / CSS / JS / data/*.js）。
2. **每次改完 JS 或 CSS 后，必须在仓库根目录运行一次：**
   ```
   python3 bump_assets.py
   ```
   它会给 3 个 HTML 里的 `<script src>` / `<link href>` 加上内容哈希版本号，
   防止浏览器缓存旧代码导致修改不生效。改完即跑，避免缓存旧代码。
3. 提交并推送：
   ```
   git add -A && git commit -m "说明这次改了什么" && git push origin main
   ```
   push 后约 1–2 分钟，GitHub Pages 自动更新，**不用通知任何人、不用手动发布**。

## 项目结构

| 文件 / 目录 | 作用 |
|---|---|
| `index.html` | 首页（单元选择入口，实际会跳到 drill.html） |
| `drill.html` / `drill.js` | 单元练习答题页 |
| `exam.html` / `exam.js` | 单元抽查 + 全真模考（URL 参数 `?mode=quiz&unit=1` 或 `?mode=mock`） |
| `wrong.html` | 错题回顾 |
| `app.css` | 顶栏、通用 UI、数学公式排版（分数 `.td-frac`、上下标、根号） |
| `bluebook.css` | Bluebook 风格主题、答题页/模考页布局、横幅 |
| `figures.js` | **公式与图表渲染核心**。`fmtMath()` 负责分数竖排、上下标、根号；`showFigure()` / `choiceGraph()` 负责题干图与选项图（SVG） |
| `app-core.js` / `app-ui.js` | 题库读取、分组、UI 状态 |
| `data/questions.js` | 题库元数据（`window.TD_BANK`）：1012 道题（含 SP2 专项 60 题）、单元/板块分组与题量 |
| `data/text.js` | 题干与选项文本（`window.TD_TEXT`），key 是题号，如 `SR-254` |
| `data/figures.js` | 图表 spec（`window.TD_FIG_SPECS` / `TD_CHOICE_GRAPHS` / `TD_FIG_SPECS`），题号→图表定义 |
| `data/figure_crops.js` / `choice_crops.js` | 图片裁剪引用 |
| `images/` | 图片资源（约 20M） |
| `vendor/` | 本地依赖：pdf.js、tesseract.js（PDF 导入 / OCR），约 8M |
| `bump_assets.py` | 版本号刷新脚本（见上） |

## ⛔ 红线：样式重构冻结（!important 一个字都不许动）

**负责人已拍板：CSS 样式重构这场战役「现在立项、缓期执行」。在视觉回归基线（尺子）落地之前，
`!important` 一律冻结，谁都不许删、不许改、不许收敛。** 这是纪律，不是建议。

背景：项目约 1084 处 `!important`，是历史「补丁叠补丁」的工程债。但它是**洁癖债**——
不影响题对、分准、进度不丢（备考工具三个核心价值）。动 CSS 层叠优先级会同时暴露
明暗主题 / 玻璃质感 / Bluebook 1:1 还原三个需求，而项目只有判分单测 + JS 冒烟，**没有视觉回归测试**，
崩了看不见。12 月考试在前，拿「工具稳定」赌「代码洁癖」不划算。

### 开工三前提（全部满足才允许动第一行 CSS）

1. **先建视觉回归基线**：明暗双主题 × `drill`/`exam`/`wrong` 三页 × 关键交互态，逐像素截图存档。
   这把尺子没造出来，谁都不许碰 CSS 层叠。
2. **只清安全子集**：硬编码色值 + `!important` 收敛成 `var(--xx)` 变量。
   `[hidden]{display:none!important}` 这类 HTML 规范要求的正当用法**一律保留**，谁删谁背锅。
3. **先立 @layer 规则**：把 `app.css` / `bluebook.css` / `glass.css` 三个文件的层叠顺序用 `@layer`
   显式化，让「谁压谁」变成明规则，再谈移除靠 `!important` 硬压的部分。

### 当前优先级（12 月考场上的人，按这个排序用力）

1. **题库准确率** — 最高，唯一能直接改变分数。
2. **判分正确** — 已根修（`grade-core.js` 唯一实现 + 64 项回归），守住不回潮。
3. **进度不丢** — 已根修（localStorage 方案），守住。
4. **!important 洁癖** — 最低，**冻结**。

### 分工

- 负责人：定方向、定优先级、定验收标准、最后把关。
- 执行者（AI）：动手。**开工前提未满足时，不擅动样式。**

## 数据口径与约定（改动时务必遵守）

- **判分规则不要随意改**：选择题大写字母比对；填空题（grid-in）有正则校验和 1% 容差；多答案用特定分隔符。
- **题号是全局唯一 key**，在 `questions.js` / `text.js` / `figures.js` 三处用同一个 id 关联。
- **题目内容 / 答案 / 来源字段**与**交互逻辑**分离：改题干只动 `data/text.js`，改题库结构只动 `data/questions.js`。
- **公式排版**：`figures.js` 的 `fmtMath()` 已支持：
  - 竖排分数（分子/横线/分母，横线自动取分子分母较宽者）
  - 下标 `_{...}` 与 `_X`（如 `v_f`）、上标 `^{...}`
  - 根号 `√(...)`
  如果新增公式写法，优先扩展 `fmtMath()`，别在文本里塞 HTML。
- **图表**：新增题目配图时，在 `data/figures.js` 加 spec（`type:"chart" / "table"`），选项图用 `TD_CHOICE_GRAPHS`。渲染逻辑在 `figures.js`，显示由题号触发。
- **localStorage**：进度与答案存本机，key 前缀 `tdsat`。不要随意改 key，否则用户进度丢失。

## 关于云登录 / 云备份

`cloud-config.js` 里写的是**原 WorkBuddy 平台**的域名与 applicationId（endpoint 指向 `*.app.workbuddy.host`）。
迁移到 GitHub Pages 后：
- 刷题、题库、图表、错题本等**核心功能完全不受影响**（纯前端 + localStorage）。
- 云账号登录 / 云备份会指向旧平台而不可用。若要恢复，需要换成你自己的后端或去掉登录入口。
  这不是 bug，是脱离原平台托管的正常结果。

## 本地预览

```
python3 -m http.server 8000
# 浏览器打开 http://127.0.0.1:8000/drill.html
```

## 部署检查清单（每次改动后）

1. `python3 bump_assets.py` 已运行。
2. 4 个页面能打开：`index.html` / `drill.html` / `exam.html?mode=mock` / `wrong.html`。
3. 浏览器控制台无报错。
4. `git push origin main` 后等 1–2 分钟，用线上链接验证页面与控制台无报错。
