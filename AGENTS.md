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

### 页面（HTML）

| 文件 | 作用 |
|---|---|
| `index.html` | 首页（单元选择入口，实际会跳到 drill.html） |
| `drill.html` | 单元练习答题页 |
| `exam.html` | 单元抽查 + 全真模考（URL 参数 `?mode=quiz&unit=1` 或 `?mode=mock`） |
| `wrong.html` | 错题回顾 |
| `auth-relay.html` | OAuth 鉴权回调中转页 |

### 核心逻辑（JS）

| 文件 | 作用 |
|---|---|
| `grade-core.js` | **判分唯一实现**（`window.TDGrade`）。`app-core.js` / `exam-core.js` 仅委托，不再各持拷贝 |
| `exam-core.js` | 组卷算法（CommonJS 可 require：`diagnosticSequence` / `buildFullPaper`） |
| `app-core.js` / `app-ui.js` | 题库读取、分组、UI 状态 |
| `drill.js` / `exam.js` | 练习页 / 模考页交互逻辑 |
| `progress-save.js` | 进度本机保存（700ms 防抖 + 损坏/版本不兼容保护） |
| `cloud-account.js` | 云账号 + 云同步（`deepMerge` 按时间戳最后写入者赢，数组取并集） |
| `github-auth.js` | GitHub 令牌登录 |
| `firebase-cloud.js` | Firebase 同步（SDK 本地化到 `vendor/firebase/`） |
| `image-import.js` | PDF 导入 + OCR（tesseract 本地化到 `vendor/tesseract/`） |
| `figures.js` | **公式与图表渲染核心**。`fmtMath()` 负责分数竖排、上下标、根号；`showFigure()` / `choiceGraph()` 负责题干图与选项图（SVG） |
| `scratch-pad.js` | 草稿板（压感笔锋 / 荧光笔 / 撤销重做；**纯内存，暂未落盘**） |
| `theme.js` | 明暗主题切换 |
| `analysis.js` | 成绩 / 数据分析 |
| `bluebook-shell.js` | Bluebook 风格外壳 |
| `cloud-config.js` | 云配置（endpoint / applicationId） |

### 样式（CSS）

| 文件 | 作用 |
|---|---|
| `app.css` | 顶栏、通用 UI、数学公式排版（分数 `.td-frac`、上下标、根号） |
| `bluebook.css` | Bluebook 风格主题、答题页/模考页布局、横幅 |
| `glass.css` | 玻璃质感、明暗主题变量 |

### 数据（data/）

| 文件 | 作用 |
|---|---|
| `data/questions.js` | 题库元数据（`window.TD_BANK`）：1012 道题（含 SP2 专项 60 题）、单元/板块分组与题量 |
| `data/text.js` | 题干与选项文本（`window.TD_TEXT`），key 是题号，如 `SR-254` |
| `data/figures.js` | 图表 spec（`window.TD_FIG_SPECS` / `TD_CHOICE_GRAPHS`），题号→图表定义 |
| `data/figure_crops.js` / `choice_crops.js` | 图片裁剪映射（**纯数据**，题号 → 图片路径） |

### 资源 / 依赖 / 工具

| 目录 / 文件 | 作用 |
|---|---|
| `images/` | 图片资源（约 14M：`fig/` 题干图 + `choice/` 选项图） |
| `vendor/` | 本地化依赖（约 8.7M：pdf.js、tesseract、firebase SDK、云 SDK） |
| `fonts/` | 本地字体 Inter / Roboto（woff2，`font-display:swap`）。数字字体 Space Grotesk 走 Google Fonts CDN |
| `test/grading.test.js` | 判分回归测试（node:vm 加载 grade-core 真实源码，26 用例） |
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

## 技术债台账（六轮审计结论，接手前必读）

### 已根修（勿回退，改前先读对应代码）

- **判分统一**：`grade-core.js` 是唯一实现；1% 容差频带以**标准答案**为基准（曾误用学生答案作分母，标准答案为 0 时判错）。
- **补丁栈清除**：`stem-patch.js` / `grid-fix.js` 已删；错题已写回 `questions.js` / `text.js` 源文件（源文件是唯一事实）。
- **727 图片死链清零**：图片统一走 `images/fig/` + `TD_FIG_CROPS` 映射，`image` 字段不再指向不存在路径。
- **令牌存储**：GitHub 令牌改会话级存储，关闭标签页即失效。
- **依赖本地化**：Firebase / 云 SDK / tesseract 均本地化到 `vendor/`，不依赖 gstatic / jsDelivr 主链。
- **云同步冲突**：`deepMerge` 改按时间戳「最后写入者赢」，数组取并集去重；`merged` 判定由引用比较改为内容指纹，消除恒真误判。
- **组卷去重**：`m2` 难/易分支互斥不撞题；题目不再在 meta 中重复存两份。

### 遗留（按优先级排序，未获授权不要擅动）

1. **草稿板落盘**（备考体验）— `scratch-pad.js` 草稿纯内存，刷新/切后台即丢。建议加按题持久化。
2. **云 SDK 兜底仍 `@dev`**（供应链）— `image-import.js` 的 CDN 兜底指向 `workbuddy-cloud-sdk@dev`，应锁具体版本号。
3. **安全响应头**（安全纵深）— 线上无 CSP / SRI / X-Frame-Options / Referrer-Policy / X-Content-Type-Options。
4. **首屏阻塞**（性能）— 所有 `<script>` 无 async/defer 串行阻塞首屏；约 15MB 无构建压缩、无懒加载。
5. **测试覆盖窄**（质量）— 仅 `grade-core.js` 有测试；组卷 / 云同步 / 进度保存 / 草稿板 / 公式渲染零测试。
6. **全局命名空间**（工程）— 24 个全局对象挂 `window`，JS 无 IIFE / 无 `use strict`。
7. **监听器泄漏**（工程）— `exam.js` 计时器监听只加不删；全仓库 add/remove 约 109:2。
8. **空 catch 吞异常**（健壮性）— 89 处 try/catch 中 44 处空 catch，存储满 / 隐私模式下静默失败。
9. **`!important` 洁癖**（已冻结）— 约 1084 处，开工三前提见上节，未满足前冻结。

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

账号后端是 **WorkBuddy / 腾讯云开发**（`workbuddy-cloud.js` + `auth-relay.html`），国内网络可直连，不依赖 Google。
`auth-relay.html` 在沙箱 iframe 里跑 SDK，父页面通过 postMessage 调它，所以 `script-src` 不用放行 SDK 域名，
但 `connect-src` 必须放行 `https://wbapp-*.app.workbuddy.host` 与 `https://www.workbuddy.cn`。

| 场景 | 接口 | 说明 |
|---|---|---|
| 注册（验证码 + 自设密码） | `TDWB.registerWithPassword(email, code, password)` | `sendOtp` 拿 `verification_id` → `verifyOtp` 带 `isExistingUser:false` + `password` → `signUp`，成功即登录 |
| 登录（邮箱 + 密码） | `TDWB.signInPassword(email, password)` | 密码在服务端校验，错密码返回 `invalid_username_or_password` |
| 登录（只用验证码） | `TDWB.verifyOtp(email, code)` | 老账号 / 没设密码的账号走这条 |
| 忘记密码 | `TDWB.sendResetCode` + `TDWB.resetPassword` | 发 `PASSWORD_RESET` 码 → `updateUser({nonce, password})` 重设并直接登录 |

改这块代码时两条硬规则：

1. `sendOtp` 返回的 `verification_id` 只在发码那一步出现，**校验时必须带上**（`auth-relay.html` 里按邮箱缓存了一份）。
   漏传会报 `verification code does not match the id`。
2. `resetPasswordForEmail` 返回的是函数式 `updateUser` 句柄，不能跨 `postMessage`，只能留在沙箱里等验证码。

同一个邮箱发码有**每分钟 1 封**的服务端限流（`RESOURCE_EXHAUSTED`），所以面板有 60s 冷却。

后端只认**邮箱**当登录名，自定义用户名需要一张公开可读的 `用户名 → 邮箱` 映射表（目前没有），面板因此只做「邮箱 + 密码」。

Firebase（`firebase-cloud.js`）只作历史通道保留：国内不翻墙连不上 `identitytoolkit.googleapis.com`，
面板只在 WorkBuddy 通道不可用时才回退显示它。

刷题、题库、图表、错题本等**核心功能完全不受影响**（纯前端 + localStorage），登录是可选附加。

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
