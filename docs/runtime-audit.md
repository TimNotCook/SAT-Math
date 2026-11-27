# 运行时体检（2026-11-26 自查轮）

> 口径：只读。三个脚本都只做导航/读 DOM/读文件，不写库、不改数据。
> 基线：`origin/main` 61244ad 之后的工作树。

## 这一轮揪出来的东西

| # | 问题 | 影响 | 处置 |
|---|---|---|---|
| 1 | `data/text.js` / `data/questions.js` 里 5 道阴影题（U1-12、U1-13、TD-15-01、TD-15-02、TD-15-03）仍指 `images/fig/*.png`，而这些文件线上 404 | 视觉上没坏（`figures.js` 先查 `TD_FIG_SPECS`，矢量图已覆盖），但留下会 404 的死指针，新人照它会生成位图 | 删掉 10 处死 `image` 字段；矢量 spec 未动 |
| 2 | `sw.js` 的 `var VERSION = 'satmath-v2'` 自 2026-11-23 起没再变过，注释却写「每次部署请 bump」 | 每次发版缓存桶不变，导航缓存里的旧 HTML / 旧 SW 逻辑不会自愈 | `bump_assets.py` 现在把 `VERSION` 写成 `satmath-<构建令牌>`，并把 `sw.js` 纳入哈希（VERSION 行先抹掉，避免自指）；`--check` 会验它跟令牌一致 |
| 3 | 根目录 `questions.js`（1009 题）头部仍自称「唯一答案源」 | 与 `data/questions.js`（1292）双源，谁改错都可能白干 | 头部改成「历史快照，唯一答案源 = data/questions.js」，并说明哪些旧脚本还在引用它 |
| 4 | 缺一条能拦住「引用不存在的图 / 题库与文本层掉队」的校验 | 这类坏数据只会在页面上表现为“图没了/选项空白”，没人报警 | 新增 `tools/verify_assets.mjs`（进 `test/assets.test.js`，随 `node --test` 跑） |

## 第二轮（2026-11-26 晚）新增两条真缺陷

| # | 问题 | 影响 | 处置 |
|---|---|---|---|
| 5 | `exam.js` 的 `renderQuestion` 里写了 `const T = (window.TD_TEXT||{})[q.id]`，把模块级文案选择器 `T(zh,en)` 顶掉 | 模考里凡是带 linear-graph 答案开关的题（题库 27 道，卷面随机抽中率约三成），一渲染就 `TypeError: T is not a function`：题干/选项渲染半截、`btnMark` 之后的收尾代码全部跳过 | 局部改名 `TXT`（5 处引用同步）；顺手把这段教训写进注释；新增 `test/exam-copy-helper.test.js` 静态守卫（`const T` 只许出现一次且必须是文案函数） |
| 6 | 练习错题答题 → 交卷 → 错题本出现卡片；再答对（订正）后，整条记录**消失**，`错题回顾` 里“含历史错题与已订正记录”“已订正”计数永远到不了 | 订正过的题从学习台账里蒸发，用户无法回顾“我错过、后来改了” | `app-core.js` 的 `setAnswer` 增加 `st.wrongLog[qid] = {v,ts}`（答错那一刻落账、只增不删，清空作答也不删）；`wrong-page.js` 的 `collect()` 对“最新作答已对 + wrongLog 留着他当时错的答案”的题补记一笔，由既有的复核标记成 `corrected`，卡片显示“已在练习中订正”、hero 的「已订正」开始计数 |

两条都由 `tools/verify_grading_ui.mjs` 覆盖（见下），当前 **6/6** 通过。

| 7 | **`sw.js` 里混进了 git 冲突标记，且被推上 main**（提交 `9bcf1bd`「history 记录页补装云账号模块」rebase 时带进来的；`6090e45` 只清了六个 html 页，没清 sw.js） | 线上每次打开都报 `Failed to register a ServiceWorker … evaluation failed`；后果比页面顶部露 `<<<<<<<` 更隐蔽——offline 缓存失效、v1→v2 之后的旧缓存清理链断掉，弱网回退到旧页面的老毛病会复燃 | 取冲突两侧语义（两边只差 VERSION 值），保留构建令牌 `satmath-e2a60f456daf`；`tools/verify_assets.mjs` 增加两道守卫：`new Function(sw.js 源码)` 语法解析 + 根目录所有 html/js/css 冲突标记扫描（已用“故意插标记”负向测试确认会红） |

线上这一条属于**已推上线但未被人发现**的缺陷，`verify_runtime` 是在本轮回跑时才把它从噪声堆里顶出来的。

| 8 | **Bluebook 外壳把「作答自动保存」指示器整格删掉**：`bluebook-shell.js` 里 `right.innerHTML = ''` 清空 `.drill-context-right`，`#saveStatus`（drill.js 启动时就缓存了引用的节点）随之离开 DOM | 练题页（官方外壳样式）上看不到任何存档反馈；`aria-live` 节点一起消失，读屏用户也收不到「已保存」。drill.js 仍往已脱离 DOM 的节点写文本，所以不会报错，属于**静默失效** | 清空前先摘下 `#saveStatus`，重排工具簇后再挂回去（同一节点，引用不断）；`tools/verify_flows.mjs` 加断言「存档状态条存在且非空」 |


| 9 | **计时到点后，已交卷的会话还能被重新拉回「作答视图」**：`restoreOrIntro()` 在时间到点时先按旧 `stage='answer'` 设了 `resumeStage`，再 `finalize()` 出分；`resumeStage` 仍是 `answer`，任何一次 `startSession()` 都会把落点写成答题页——而答题区已锁定，进去只能看到「题都在、全灰、不能答」的残影 | 计时归零（或跨天后回来）本该只看成绩页；一旦落到残影页，用户以为还有题没答、点哪里都没反应 | `restoreOrIntro()` 在 `timeout==='total'` 分支先把 `resumeStage='result'` 再 `finalize`；`startSession()` 开头加硬门「已 finished 且有 result → 直接回成绩页」，不再依赖按钮是否可见 |


| 10 | **判分支持两空 grid-in，练习/模考页面却只有单框**：`grade-core.dualCorrect` 按「第一空, 第二空」判，讲义页 `jiangyi-page.js` 也有双框，但 `drill.js` / `exam.js` 的 grid 分支只画一个 `#gridAnswer` | 题库当前 0 道双空题，所以线上没爆；一旦加进两空题，学生在练习/模考里第二空无处可填，必判错且无任何提示——属于「数据一来就爆」的缺口 | `drill.js` / `exam.js` 各加 `q.values.length > 1` 分支：两个框（第一空/第二空），每框独立 5 字符限制，存成 `"a, b"` 交给既有的 `dualCorrect`；`bluebook.css` 加 `.drill-grid-multi` 竖排样式；`test/grid-dual-ui.test.js` 三条静态守卫防止重构退回单框 |



## 阴影题实测（P0-2 验收口径）

`tools/verify_shaded_figures.mjs` 逐题打开 drill 题位，断言 `.td-figure svg` 存在、无 `.td-figure--missing`、无位图 `<img>`：

```
PASS U1-12   (L1#12)      svg=true 图元=41
PASS U1-13   (L1#13)      svg=true 图元=37
PASS TD-15-01(1.5#1)      svg=true 图元=37
PASS TD-15-02(1.5#2)      svg=true 图元=27
PASS TD-15-03(1.5#3)      svg=true 图元=41
PASS R04-104 (4.5.T26#4)  svg=true 图元=5
```

6/6 通过，截图在脚本 `--out` 目录（默认 `/tmp/shaded-proof`）。即：**P0-2 的渲染面已经是对的，缺陷只剩数据里的死指针**，本轮已清。

## 用户动作回归（新增 `tools/verify_flows.mjs`）

```bash
node tools/verify_flows.mjs                                  # 本地
node tools/verify_flows.mjs --base https://timnotcook.github.io/SAT-Math
CHROME_BIN=/usr/bin/chromium node tools/verify_flows.mjs     # Linux / CI
```

16 条断言，只动浏览器 localStorage，不写库：drill 的「作答落盘 → 刷新仍高亮 → 标记/划除持久 → 题号面板格数=题数 → 跳题」、wrong 的「预置答错出卡片 → 单元筛选收敛」、history 的「两条 bar → 展开收起 → 续做入口」、jiangyi 的「板块→小节→题干渲染」。

同轮把 11 个 CDP 脚本里硬编码的 macOS Chrome 路径收进 `tools/lib/chrome.mjs`：优先 `CHROME_BIN`，其次按平台找 Chrome/Chromium；找不到就明确报错。此前这些回归只能在 macOS 上跑，现在 Linux 上同样能跑（云主机 Chromium 146 全绿）。

`verify_shaded_figures` 里原来的固定 `sleep(1200)` 也换成了「轮询到 `#qNumber` 等于期望题位再取图」——`drill.html` 的 `#qNumber` 初值是 `1`，渲染慢一点就会把「题位没跳过去」读成「图没了」，出现假红（本轮真踩到一次）。

`verify_runtime` 的模考 line 题也从「靠随机抽中」改为「没抽中就重开，最多 5 卷」——`EXAM_FORCE_RETRY=1` 可强制走重开分支做自测（实测重开 2 次后命中题位 10、跳转 ok）。

## 判分/错题本端到端（新增）

```bash
node tools/verify_grading_ui.mjs            # 本地
node tools/verify_grading_ui.mjs --base https://timnotcook.github.io/SAT-Math
```

六个用例：mcq 答对 / mcq 答错 / grid 分数答对 / grid 明显错值 / 答错后错题本出现 / 订正后错题本保留并标「已在练习中订正」。做法是清 localStorage → 打开指定题位 → 作答 → 交卷 → 读结果页计数与错题页卡片，只读不写库。

## 三个脚本怎么跑

```bash
node tools/verify_assets.mjs          # 静态：引用/令牌/SW 版本/题库一致性
node tools/verify_runtime.mjs         # 运行时：逐页收 JS 异常、console.error、4xx/5xx、加载失败
node tools/verify_shaded_figures.mjs  # 阴影题矢量图渲染（6 条记录）
# 都能加 --base https://timnotcook.github.io/SAT-Math 直接打线上
```

`verify_runtime.mjs` 这一轮的结果：六页 0 个 JS 异常、0 个 4xx；`index.html` 有一条 `ERR_CONNECTION_RESET`（根跳转桩里对 Supabase 的探测请求被网络侧 reset，非站点缺陷，已标注忽略）。

## 计时到点路径（新增 `tools/verify_exam_timeout.mjs`）

35 分钟的计时没人愿意坐着等，所以「到点会发生什么」长期只能靠读代码相信。这个脚本不 mock 任何东西，只把会话里的比对字段改到过去，用真实页面走完整条路：

```bash
node tools/verify_exam_timeout.mjs                                  # 本地
node tools/verify_exam_timeout.mjs --base https://timnotcook.github.io/SAT-Math
CHROME_BIN=/usr/bin/chromium node tools/verify_exam_timeout.mjs     # Linux / CI
```

8 条断言：① 起卷进答题视图、卷面 22 题 Module 1；② Module 1 到点 + 重载 → 开始页明示「已进入 Module 2」→ 点 Start 后卷面补齐 44 题；③ 总时间到点 + 重载 → 点 Start 直接停在成绩页，会话 `finished/auto/endReason='time'`，成绩记录只多一条且 `total=44`（重复进入不会重复写），结果页文案含 `Auto-submitted` 与模块二路径。

第 9 条缺陷就是这条新脚本第一次跑出来的：它断言「停在成绩页」，实测是 `stage-answer`——成绩记录都对，只是落点错。

一个跑批环境的事实，写进脚本注释里：本地 `python3 -m http.server` 冷启动时并发拉十几个 defer 脚本，偶尔会 reset 掉一个（`exam-core.js` 掉线 → `exam.js` 第 6 行 `C` 未定义 → 整页点不动）。脚本对这种情况整页重载（最多 3 次）并打印 `WARN`，线上 CDN 不复现。这一轮排查时顺带发现机器磁盘只剩 442MB，清理 `/tmp` 下历史浏览器 profile 与截图目录后回到 11GB——reset 与「写到 `/tmp/runtime-proof` 报 ENOENT」都发生在磁盘打满之后，属同一原因。

## 阴影题坐标不再写死（`verify_shaded_figures`）

原来 `CASES` 里写的是 `{id:'U1-12', sec:'L1', i:12}` 这种手填坐标，题库一重排（或前面插一道题）脚本仍会照旧打印 PASS，但看的已经是别的题——静默错位。现在只写题 id，题位在页面里用 `TD_APP.CATALOG` 反查（口径与 `app-core.js` 一致：`legacy → L<unit>`、按 `no` 再按 `id` 排序），反查不到直接 FAIL 并说明原因。输出同时带板块总题数，例如 `U1-12 (L1#12/15)`、`R04-104 (4.5.T26#4/37)`。

## 脚本可移植性守卫（`test/tools-portability.test.js`）

三条静态断言：除 `tools/lib/chrome.mjs` 外任何脚本不许出现 macOS Chrome 绝对路径；凡带 `remote-debugging-port` 的脚本必须 `import { CHROME } from '…/lib/chrome.mjs'`；`chrome.mjs` 必须导出 `CHROME`、支持 `CHROME_BIN`、候选表同时覆盖 macOS 与 Linux。用「往工具脚本尾部插一行 `/Applications/Google Chrome…`」的负向测试确认会红，插回去即绿。

> 第 10 条怎么验：题库里没有双空题，`verify_grading_ui` 在页面启动时往 `TD_APP.CATALOG['1.1']` 尾部注入一道合成题（`ZZ-DUAL`，两空 250 / 123.5），走的是与用户同一条路径（真的渲染两个框 → 输入 → 落盘 → 交卷 → 判分），不是 mock 渲染函数。新增两条用例：**两空都填对 → right=1 / wrong=0**、**两空顺序颠倒 → right=0 / wrong=1**（证明 dualCorrect 的两空语义真的生效，不是只要填了就给分）。加上 ① `test/grading.test.js` 的 `dualCorrect` 5 条单测、② `test/grid-dual-ui.test.js` 三条静态守卫（负向：把分支改 `if(false)` 会红），这条缺口算闭合。脚本总数因此从 6 条涨到 8 条。

## 还没动的

- `images/fig/` 下仍有历史位图（约 179 个引用）供未被矢量覆盖的题兜底；新录题一律矢量，不再新增位图（`test/jiangyi.test.js` 已守）。
- `questions.js` 旧脚本（`fold_patches.py` / `merge_transcribe_fragment.py` / `patch_answers.py`）仍在按路径写根目录那份，迁移属于另一单活，本轮只做标注，不改脚本。

## 回归脚手架自己的两个 bug（2026-11-26，都已修）

一直有个"随机变红"在现场晃：同一份线上代码，`verify_flows` 有时 16/16、有时 12/16，红的是"drill 起练进入做题视图且有选项"，连带 3 条依赖作答的用例一起红。查下来不是产品坏了，是测试脚手架自己：

1. **临时 profile 从不清**。13 个 CDP 脚本各自 `--user-data-dir=/tmp/<prefix>-${Date.now()}`，跑完没人删。攒到 **913 个目录 / ~19G**，磁盘只剩 6G，python http.server 在高并发冷启动时就开始 reset 连接。修法：`tools/lib/chrome.mjs` 新增 `tempProfile()`（退出/SIGINT/SIGTERM 自动删）+ `sweepStaleProfiles()`（启动时收掉 1 小时前同前缀残留，被 kill -9 的也能被下一次收尸）；13 个脚本全部改用它。
2. **`python3 -m http.server` 并发拉 defer 脚本会直接 RST**。CDP 里实测到 `Network.loadingFailed: net::ERR_CONNECTION_RESET` 一次 reset 掉整批脚本，`TD_APP`/`TD_UI` 全 undefined、整页空白——看起来像"drill 起不来"，其实是服务器把请求打死了。修法：新增 `tools/lib/serve.mjs`（node:http，并发安全、随机端口、写 marker 再回读自证"这端口确实是本仓库"），`verify_flows / grading_ui / runtime / shaded / timeout / acct / nav / a11y / session` 全部切过去，`--base` 模式不受影响。

修完实测：`verify_flows` 连跑 **4 次全 16/16**（之前四次里两次 12/16）；`verify_nav` 38/38、`verify_a11y` 20/20、`verify_acct_entry` 26/26、`verify_session` 22/22、`verify_grading_ui` 8/8、`verify_shaded_figures` 6/6、`verify_exam_timeout` 8/8、`test/*.test.js` 190/0。守卫：`test/tools-portability.test.js` 新增 3 条（写死 `/tmp` profile 要红、没用 `tempProfile()` 要红、`spawn('python3', [... 'http.server' ...])` 要红），负向验过——把 `verify_flows` 改回 `/tmp/vfl-${Date.now()}` 立刻红。

> 教训：回归红之前先怀疑脚手架。判据不是"多跑一次就绿了"，而是"连跑 4 次都不红"。

## 计时到点自动交卷：错题到底进没进错题本（2026-11-26 补验）

`verify_exam_timeout` 原来的 8 条只验到「成绩页出来了、记录落了一条」，没验「错的那道有没有进错题本」——这条路径最容易静默漏。补了三步：Module 2 里找一道**在题库里真存在、且不是 dup/retired** 的 MCQ → 跳过去点一个错选项 → 让真实倒计时走到零（不刷新页面，刷新会丢 Module 2 作答，那是另一条待验路径）。结果：成绩记录 `detail` 里那道 `correct:false`、`given` 就是点的那个字母；错题回顾页切到对应 UNIT 后按「板块 · 第 N 题」能定位到卡片。脚本 8→12 条，连跑 2 次 12/12。

补充两条同一路径的断言（`verify_exam_timeout` 8→13 条，连跑 2 次 13/13）：

- **中途刷新不丢答题**：答完一题后整页重载，会话与选中态都还在（重载后先落在开始页、点 Start 才回答题视图，这是设计，不是丢失）。
- **别名题的错题本归属**：卷面 id 可能是别名（`TD-15-01` → `U1-12`），错题本按 canonical 展示，所以断言必须按 canonical 的「板块 · 第 N 题」定位。先用 `TD_ALIAS` 映射再比对，之前不看别名会误判成"错题没进本子"。

## 错题台账漏迁别名（第 11 条，2026-11-26）

`app-core.js` 的 `normalize()` 一直只把 `answers` / `marks` 按 `TD_ALIAS` 重映射，**`wrongLog` 没管**。两个静默后果：

1. 旧板块键被 `delete` 掉时，`wrongLog` 不在 `answers/marks` 里，跟着一起消失 → 以前错过的题“从没输过”（错题蒸发，和第 6 条修过的现象同源但换了入口）。
2. 同一板块内也可能存着别名 id 的 `wrongLog`（`SP2-001` vs `R03-001`）：键不重映射，`wrong-page` 按 canonical `q.id` 查不到 → “已订正”永远显示不出来。

修法：`normalize()` 里旧板块迁移补搬 `src.wrongLog`（按 `ALIAS` 重映射、已存在则不覆盖）；新增一遍全量 `wrongLog` 键重映射（canonical 优先，保留最初的答错时间）。新增 `test/wronglog-migrate.test.js` 3 条（vm 里跑真实 `app-core` + `data/aliases.js`，触发 `setAnswer` 走真实写盘路径）。负向验过：把重映射段删掉 → 3 条全红，恢复 → 3 pass。全量 `node --test` 197/0，runtime 六页 0 异常、flows 16/16、grading 8/8。

## 错题本在慢网下先渲染成空白（第 12 条，2026-11-27）

线上连跑 `verify_exam_timeout` 时撞到一次「错题回顾页 0 张卡片、`#wrongList` 文本为空」，而成绩记录里那道题明明是 `correct:false`。根因不是判分也不是错题台账，而是 `wrong-page.js` 的启动顺序：

- 错题页是十几条 `defer` 脚本串起来的，题库 `data/questions.js` 有几 MB。首屏慢的时候 `all=collect()` 跑完，`questionById()` 还查不到题 → `add()` 直接 `return`，`render()` 就画了一个空列表。
- 这个空白是**粘住的**：之后题库读完了也不会自己重画（只有用户手动切 UNIT 或调 `refresh()` 才重算）。真实学生打开看到的是一页「没有错题」，会以为记录被清了。

修法：`render()` 之后挂 `load` 自检——`all` 为空就 `collect()` 重算一遍，有内容才重画（空就是真没错题，不重复渲染）。`history-page.js` 早就用 DOMContentLoaded + load 双兜底，错题页是唯一漏网的。

同轮修了三条脚手架的假红（都不是产品 bug）：

- `verify_flows` / `verify_grading_ui` / `verify_exam_timeout` / `verify_runtime` 的导航只等 `readyState`，线上首屏慢时读到的还是旧文档，`localStorage` 抛 `SecurityError` → 11/16；改成先等地址栏落到目标 URL 前缀，再等 `readyState`。
- `verify_exam_timeout` 在错题页读 unit 时没等题库就绪，读到 0 就点 `data-unit="0"`（必然点空）；改成等 `TD_BANK` 有内容、等筛选按钮真画出来，再读卡片，空列表时兜底 `TD_IMPORT_WRONG.refresh()`。
- `verify_session` 断言「开始页无作废提示」已经过时：开机兜底后会正常显示「已恢复存档、计时没停、点 Start 继续」，改成只排除「存档已过期」文案。

验收：`node --test` 202/0；线上 flows 16/16、grading 8/8、exam_timeout 13/13、runtime 六页 0 异常、assets 全绿、shaded 6/6、nav 38/38、a11y 20/20、acct 26/26、session 22/22。

## 窄屏点击热区不足 44px（第 13 条，2026-11-27）

`verify_a11y` 只验「有没有可访问名」，`verify_runtime` 只验「有没有报错」，两样都不看尺寸。新写的 `tools/verify_mobile.mjs` 在 375×812 与 320×568 两个视口下量了实尺寸，第一次跑就红了两条：

- 做题页 `.drill-page-button`（上一题 / 下一题）被 `bluebook.css` 固定成 `height:36px!important`，375 和 320 宽下都只有 **36px**；
- 模考开始页 `#btnStart` 只有 **41px**：`.exam-start-actions .btn{min-height:44px}` 本来写了，但同一文件 742 行的 `.btn{min-height:0!important}` 把它盖掉了。

两者都低于 iOS HIG 的 44pt，手指点偏一点就落空。修法：`bluebook.css` 末尾加窄屏/触屏媒体查询 `@media (max-width:820px),(pointer:coarse)`，把这两类按钮抬到 44px；对 `.exam-start-actions .btn` 必须用 `!important` 才压得住 742 行那条。桌面版（>820px 且非触屏）观感不变——Bluebook 桌面按钮本来就是 36px。

同轮新增验收器 `tools/verify_mobile.mjs`（375/320 两档 × 首页 / 练题页 / 错题页 / 模考开始页，检查横向溢出 + 溢出元素定位 + 热区尺寸，错题页用合成成绩记录种一条错题），以及守门测试 `test/mobile-target.test.js`（防止有人为了「还原截图」把 44px 那段删回去）。

验收：本地 `node --test` 204/0；`verify_mobile` 16/16；线上 `verify_mobile` 16/16、`verify_a11y` 20/20（Back/Next 实测 50×44）、`verify_flows` 16/16、`verify_grading_ui` 8/8、`verify_nav` 38/38、`verify_shaded_figures` 6/6、`verify_runtime` 六页 0 异常。线上 `v=ada8ef824389`。

## 讲义页主按钮也是 40px；验收器扩到图表题 / 讲义页 / 记录页（第 13 条续，2026-11-27）

`verify_mobile` 扩到三个新场景后，又红了一条：讲义复习页的「下一题」（`#jyNext`，`.btn.primary`）实测 **40px**——上一轮只修了 `.exam-start-actions .btn`，没管通用主按钮。补 `.btn.primary{min-height:44px!important}` 后 375 / 320 两档都到 44px。

同时把验收口径钉死在新扩的场景上（28 条）：

- **图表题**：不手填题位，先在 `CATALOG` 里用 `TD_FIG.showFigure()` 找一道真有图的题再导航，断言 `scrollWidth` 不超视口、SVG 右边界在视口内（固定宽度的 SVG 最容易被 320 宽撑破）。
- **讲义复习页**：点第一张 board 卡 → 第一个非空小节 → 进入题目视图，量横向溢出与「下一题」热区。
- **记录页**：种两条成绩记录后打开，量横向溢出（记录条里的长路径/用时最容易顶出去）。

顺手记一个坑：`TD_BANK` 有两个数组——`units` 和 `questions`，图表题的 id（如 `U1-12`）只在 `questions` 里；用 `all` 查会全部落空，误报「题库里没有带图的题」。

验收：本地 `node --test` 218/0（队友同时补了 t031 的守门断言）；本地 `verify_mobile` 28/28；线上 `verify_mobile` **28/28**、`verify_a11y` 20/20、`verify_flows` 16/16、`verify_nav` 38/38。线上 `v=ada8ef824389`。

## 记录页错题题干在手机上被截成半句；验收器补成绩页（第 13 条续二，2026-11-27）

`verify_mobile` 加了「行内元素 scrollWidth 明显大于 clientWidth 且 overflow:hidden 就算截断」的检查，记录页第一条就红：`.hist-wrong-stem` 在 375 宽下只有 **122px**，题干「ax + by = b In the equation above…」被切成半句。桌面靠 `title` 悬浮提示补全，手机没有 hover，等于信息丢了。

修法：`app.css` 末尾（必须放在 `.hist-wrong-stem` 原定义**之后**，否则被 `white-space:nowrap` 反压）加 `@media(max-width:640px)`——错题行改成两列、题干 `white-space:normal` + `-webkit-line-clamp:2`、答案另起一行。改完题干宽度 122→224px，两行能读完半道题。

同轮把模考**成绩页**也拉进验收器：种一份「一小时前开始、限时已过」的会话，点 Start 走真实交卷路径落到 `stage-result`，然后量：

- 整页 `scrollWidth` 不超视口；
- `#resKV` 八个指标右边界不越界、最窄单元格 ≥40px（之前在手机上「限时 / 实耗 1:00:00 / 0:59:12」这类最长值最容易把格子撑破）；
- `#resUnits / #resTopics` 的 `.kp-row` 不越界；
- 切到题单 tab 后仍不横滑。

一个踩过的坑：以为成绩卡是 `<table>`，实际是 `#resKV` 的一组 `<div>`，按 table 选择器去查会一直「没有表格」。验收器现在按真实结构量。

验收：本地 `node --test` 223/0；本地 `verify_mobile` 42/42；线上 `verify_mobile` **42/42**、`verify_a11y` 20/20、`verify_flows` 16/16。线上 `v=ada8ef824389`。

## 验收器补键盘可达与答案对比两栏（第 13 条续三，2026-11-27）

热区抬到 44px 之后补两项检查，`verify_mobile` 从 42 条到 **50 条**：

- **键盘可达**：CDP 真发 Tab 键 24 次，记录焦点轨迹，断言能走到选项（`.drill-choice`）和 `#btnNext`，并且没有把焦点困在同一元素（24 步只落在 ≤2 个元素就算死循环）。全绿：选项与 Next 都能 Tab 到。
- **答案对比两栏**：错题卡里「你的答案 / 正确答案」两栏逐格量右边界 + `overflow:hidden` 下 `scrollWidth > clientWidth` 的截断，320 / 375 两档均无越界、无截断（长小数与千分位目前都放得下）。

这两个场景本轮没抓到新缺陷，但把口径钉住了：`test/mobile-target.test.js` 里加了三条存在性断言（缺 `Input.dispatchKeyEvent` / 缺 `answer-compare` / 缺 `resKV` 都会红），防止以后有人精简验收器时把覆盖悄悄删掉。

全绿复核（线上 `https://timnotcook.github.io/SAT-Math`，`v=ada8ef824389`）：`node --test` 223/0；`verify_mobile` 50/50；`verify_flows` 16/16；`verify_grading_ui` 8/8；`verify_exam_timeout` 13/13；`verify_runtime` 六页 0 异常；`verify_nav` 38/38；`verify_a11y` 20/20；`verify_acct_entry` 26/26；`verify_session` 22/22；`verify_shaded_figures` 6/6；`verify_assets` 全绿。

## 第 14、15 条：存档恢复漏搬 wrongLog / 非数组仓库打崩整页（2026-11-27）

两条都是「数据在，页面却看不见」的静默蒸发，入口不同：

**第 14 条 —— `progress-save.js` 的 `restore()` 漏合并 `wrongLog`。**
存档（`tdsat_progress_save_v1`）里每个板块带着 `wrongLog`，恢复时却只按 ts 合并 `answers`、`marks`、`cursor`、`submitted`。于是「换设备/重装后恢复存档」这一路，本机 `wrongLog` 是空的：`answers` 现在是对的，错题本又靠 `wrongLog` 记住「当初错的那个答案」，判不出「曾错过、已订正」→ 这些题在错题回顾里凭空消失。和第 11 条 `normalize()` 是同一类病，换了入口。
修法：恢复时按 `ts` 新者优先把存档 `wrongLog` 合并进本机，只加不删；本机 `wrongLog` 缺失/非法（非对象、是数组）时初始化为 `{}`。与 `app-core` 的 `normalize()` 同口径（那边是别名重映射，这边是跨存档搬运）。
验证：`test/progress-restore-wronglog.test.js` 3 条（vm 跑真实 `progress-save.js`：搬进来 / 本机较新不被覆盖 / 缺字段自动建），先证红（2 红 1 绿）后证绿（3 绿）。

**第 15 条 —— 成绩仓库被写成对象时错题本与记录页整页空白。**
`wrong-page.js` 与 `history-page.js` 的 `load()` 都是 `JSON.parse(...) || []`：只挡了 `null`，没挡「真值但不是数组」。只要 `tdsat_exam_suite_results_v1` / `tdsat_exam_suite_abandoned_v1` 被旧版结构或云端合并写成对象，后面立刻 `.forEach / .filter / .sort` 抛 `TypeError`，两页停在占位、永不重画（和第 12 条「慢网空白」同一种用户体感：数据还在，页面是空的）。
修法：`wrong-page.js` 加 `loadArr()` 只认 `Array.isArray`（旧 `tdsat_state_v1` 仍走对象路径不动）；`history-page.js` 的 `load()` 直接改成只认数组，其余当空列表。
验证：`test/array-guard.test.js` 2 条（vm 跑真实页面脚本，种对象值断言不抛错、记录页落到空态占位），同样先证红（2 红）后证绿（2 绿）。

全绿复核：`node --test` **236/0**；本地 `verify_mobile` 50/50、`verify_flows` 16/16。

## 第 16 条：exam.js 读成绩仓库裸假设数组，脏存档直接白屏（2026-11-27）

写了个「脏存档体检」`tools/verify_junk.mjs`：先往 `localStorage` 里种九种「合法 JSON 但形状不对」的值（成绩仓库写成对象、`wrongLog` 写成数组、session 字段是字符串、progress 存档半截 JSON……），再逐页导航，断言不抛异常、关键容器非空、模考页不白屏。

首跑就红：`exam.html?mode=mock` 抛 `TypeError: (load(...) || []).forEach is not a function`（`exam.js:122 mergedState`），栈一路走到 `newSession → restoreOrIntro`，整个模考页停在半截、连 Start 都没有。根因和第 15 条同源：`load()` 只挡 JSON 解析失败，`|| []` 只挡 `null`，挡不住「真值对象」。同一份文件里 `KEY_RESULTS` 被这样裸用了 5 处，`KEY_ABANDONED` 2 处，`oldState()` 还把 `s.wrong/settings` 当对象直接 `Object.keys`。

修法：`exam.js` 加两个降级器 `asArr` / `asObj`，所有仓库读取一律过一遍；`r.detail` 也改成 `asArr(r.detail)`（成绩记录里 `detail` 被写成对象时，结果页三个 tab 会一起崩）。

验证：`tools/verify_junk.mjs` 六页 0 异常、`#wrongList` / `#histList` 非空、模考页落到开始页（Start 可见、正文 4780 字）；把 `exam.js` 换回旧版即复现 2 项异常 + 白屏（先证红后证绿）。`test/array-guard.test.js` 加 2 条静态守卫（缺 `asArr/asObj`、或再出现 `load(KEY_x) || []` 都会红；`verify_junk` 必须复用 `lib/chrome` + `lib/serve` 并种关键脏键）。

回归：`node --test` **239/0**；本地 `verify_runtime` 六页 0 异常、`verify_flows` 16/16、`verify_grading_ui` 8/8、`verify_exam_timeout` 13/13、`verify_session` 22/22。

## 第 17 条：成绩记录内部的 `detail` 写成对象时，错题本与记录页一起崩（2026-11-27）

`verify_junk` 扩到三套脏值档案（A 混型、B 半截会话 + 坏导入、C 极端数值 + 版本漂移），B 套首跑两页同时红：

- `wrong-page.js:150` `Uncaught TypeError: (r.detail || []).forEach is not a function` → `#wrongList` 直接空白（0 字）；
- `history-page.js:113` `(rec.detail || []).filter is not a function` → 记录页只画出半截。

同一类病再往里一层：第 15 条修的是「仓库本身不是数组」，这条是「仓库是数组、但每条记录里的 `detail` 不是数组」。`detail` 由交卷写入，正常一定是数组，但云端旧结构 / 手工导入 / 半截会话都可能把它写成对象或字符串。B 套里还塞了 `null` 和数字条目，`wrong-page` 在 `r.mode` 上再崩一次（`Cannot read properties of null`）。

修法：`wrong-page.js` 加 `asArr()`，`r.detail` 与仓库都过一遍，条目不是对象就跳过；`history-page.js` 同样加 `asArr()`，`wrongRows()` / 「错题（N）」计数都只认数组且过滤 `null` 条目。

验证：`test/array-guard.test.js` 新增 1 条（vm 跑两页真实脚本，种「detail 是字符串 + 数组里有 null/数字」），先证红（1 红）后证绿（5/5）。`verify_junk` 三套 × 六页全绿（有画像 B 从「2 项异常 + 错题本 0 字」变成「0 异常 + 40 字」）。

回归：`node --test` **244/0**；`verify_junk` 3×6 全绿；`verify_flows` 16/16；`verify_exam_timeout` 13/13；`verify_session` 22/22；`verify_runtime` 六页 0 异常。

## 第 18 条：云端合并在「一边坏 JSON」时会把坏值顶上去，反推云端冲掉账号好数据（2026-11-27）

审 `cloud-account.js` 的 `mergeLocalWithCloud()`：`JSON.parse(local)/JSON.parse(cloud)` 任一失败，`catch` 里一律 `out[k] = local[k]`。于是「本机写盘中断留下半截 JSON、云端完好」这一场景下，合并结果里这一键被替换成本机的坏串；紧接着 `silentPush` 把整包推回云端——账号里唯一的好档案被坏档案覆盖，换设备也救不回来。方向反过来（云端坏、本机好）没问题，只是运气。

修法：`catch` 里再判一次哪边能 `JSON.parse`，能用的那份留下；两边都坏才回退本机。顺手把 `canon / deepMerge / mergeLocalWithCloud / mergeArrays / itemSig` 只读挂到 `window.TD_CLOUD_MERGE`，给无账号环境下的单测用（不联网、不写云）。

验证：`test/cloud-merge.test.js` 3 条（vm 跑真实 `cloud-account.js`，只取钩子）——本机坏/云端好保留云端、云端坏/本机好保留本机、两边都好按 ts 深合并。用「旧代码 + 只补钩子」复现：`坏的本机存档覆盖了云端好数据` 1 红；新代码 3 绿。

回归：`node --test` 全量全绿；`verify_junk` 3×6、`verify_flows` 16/16、`verify_mobile` 50/50、`verify_runtime` 六页 0 异常。

## 第 19 条：两台设备的模考会话被逐字段深合并，拼出「半张卷子」（2026-11-27）

`mergeLocalWithCloud()` 对所有 `tdsat_*` 键一律 `deepMerge`。会话（`tdsat_exam_suite_session_v1`）和显式存档（`tdsat_progress_save_v1`）是「整份状态」，不是可合并的字段集合：

用真实 `mergeLocalWithCloud` 复现（设备 A：`startedAt=1000`、2 题卷面、答 1 题；设备 B：`startedAt=2000`、3 题卷面、已交卷）：

```
paper: [A,B,C,D,E]      ← 两台设备的卷面取并集，5 道题
answers: {A,C,D}        ← 两张卷的作答交错
startedAt: 1000, stage: "answer", finished: true, result: {score:1}   ← 阶段/时间/结果互相打架
```

落回 exam.html 就是一叠对不上的题号与答案，`repairSaved()` 只能当结构异常整卷作废（用户白丢一次模考），最坏是判分错。存档同理：`position` 取一边、`sections` 取另一边，恢复出来的落点是错的。

修法：加 `ATOMIC_KEYS`（会话按 `startedAt`、存档按 `savedAt`），这类键整份取新、平手取本机，绝不逐字段合并；其余键（作答台账、马克、成绩仓库）仍按原规则深合并/并集。

验证：`test/cloud-merge.test.js` 加 3 条（会话不拼接取新、本机更新保留本机、存档按 `savedAt` 整份取新）。去掉 `ATOMIC_KEYS` 分支复现 3 红（`会话被逐字段拼成了半张卷子`），恢复后 6 绿。

回归：`node --test` 全量全绿；`verify_junk` 3×6、`verify_flows` 16/16、`verify_session` 22/22、`verify_acct_entry` 26/26。

## 第 20 条：`wrong.html` 带 Git 冲突标记上线，错题页重复加载整套脚本（2026-11-27）

在 rebase 后被 `test/conflict-markers.test.js` 拦住才发现：队友那次 `fix(dark)` 提交（`836f2e6`）把 **未解决的冲突标记连同两份重复内容** 一起提交了，`wrong.html` 里两处 Git 冲突块（起始行 + 等号行 + 结束行）至今在线上。后果：

- 「<<< HEAD」这类文本出现在 `<head>` 里，浏览器把标记当正文推到页面前面；
- `<style>` 之后整段 `<script src=…>` 出现两遍 —— 错题页十几条 defer 脚本被重复请求、重复执行，`render()` 跑两次（这次没炸是脚本都幂等，纯属运气）；
- 一旦哪天有人只在其中一份上改，页面行为就取决于哪份先执行。

处置：`wrong.html` 保留 HEAD 一侧、删掉重复块（两处内容当时只差 `?v=` 令牌）。根因加固：`bump_assets.py` 增加 `assert_no_conflict_markers()`，`main()` 里先于 `digest()` 执行，任何参与哈希/改写的文件带冲突起始行 / 等号行 / 结束行 就直接 `exit 2`——「在没解决的冲突上跑 bump」这条路被封死（我拿 `wrong.html` 追加一行标记验证：`exit=2`、`FAIL 这些文件还带 Git 冲突标记：wrong.html`）。

验证：`wrong.html` 标记计数 0；`node --test` **265/0**（含 `conflict-markers` 与新增的 bump 闸门断言）；`verify_junk` 3×6、`verify_flows` 16/16、`verify_runtime` 六页 0 异常。

顺带说明：这轮 rebase 也把我自己第 19 条的提交挂在 `836f2e6` 之上，所以线上 `wrong.html` 的标记在我推之前一直在；推完即恢复。

## 第 21 条：导入错题仓库 `items` 形状不对，错题本整页空白（2026-11-27）

`verify_junk` 加第四套画像 `D-auxkeys`：把 `tdsat_crossout_v1`、`tdsat_scratch_*`、`tdsat_exam_last_paper_v1`、`tdsat_exam_special_v1`、`tdsat_jiangyi_v1`、`tdsat_theme`、`tdsat_auth_v1`、`tdsat_imported_wrong_v1` 都写成错形状。首跑红在错题页：

`wrong-page.js:219` `(readImport().items || []).filter is not a function` → `#wrongList` 直接 0 字。`readImport()` 本身只保证「是对象」，`items` 可以是字符串/数字；`importedHtml()` 每次 render 都会跑，所以一坏就是整页空白。同文件 `importData()` 入口的 `data.items || … || []` 也只挡了 falsy。

修法：`items` 一律过 `asArr()`（导入数据入口、列表渲染两处），条目非对象跳过。其余七个辅助键在四套画像 × 六页里没有炸。

顺带固化了「冲突标记闸门」的第二道：`safe_push.sh` 在 bump 之前先 `git grep '^(<<<<<<<|>>>>>>>)'`，命中即 `exit 4` 并列出文件——bump 里的闸门只在「真的跑到 bump」时生效，这道在 rebase/stash 之后就拦。

验证：`test/array-guard.test.js` 加 1 条（种 `tdsat_imported_wrong_v1.items='no'`，错题本不崩且仍画出卡片），旧代码复现 `错题本被坏导入仓库打崩：(readImport(...).items || []).filter is not a function` 1 红，新代码 7 绿。`verify_junk` **4 套 × 六页**全绿。

回归：`node --test` 全量全绿；`verify_junk` 4×6、`verify_flows` 16/16、`verify_runtime` 六页 0 异常。

## 第 22 条：从 PDF 复制/输入法带出的「假负号」被判错（2026-11-27）

`grade-core.js` 的 `gridEntry()` 只认 ASCII `-`：`/^-?(?:\d+…)$/`。而学生在 Mac/iOS 上打出来的减号、从 PDF 复制的负号、以及 iOS 智能标点，常常是 **U+2212「−」**、或 **en/em dash「–」「—」**，还可能夹着零宽字符 / BOM。这些输入看上去就是 `-5`，但 `gridEntry` 直接返回 `null` → `isCorrect` 判错。

更讽刺的是同一个仓库里 `wrong-page.js` 的 `num()` 早就 `replace(/[−–]/g,'-')` 了——判分比错题分析更严，于是错题本说「你这题其实是对的」，卷面却扣了分。

修法：`gridEntry()` 先进一次归一化（去 `\u00a0\u200b\u200c\u200d\ufeff`、把 `\u2212\u2013\u2014` 换成 `-`）再走 5/6 字符格规则；`parseNum()` 原有的同类替换保留（双保险）。`dualCorrect` 走同一个 `gridEntry`，两个空格的题一并修好。

验证：`test/grading.test.js` 加 9 条（U+2212 减号、en dash 负分数、em dash、零宽、BOM、`−5` 判对、`–5` 判对、`+5` 仍判错、双空 `−2, 3` 判对）。旧代码复现 4 红（两条 `gridEntry` + 两条 `isCorrect`），新代码 84/0。

回归：`node --test` 全量全绿；`verify_grading_ui` 8/8、`verify_exam_timeout` 13/13、`verify_flows` 16/16。

## 第 23 条：清空作答后「曾经错过」的题从错题本消失（2026-11-27）

复现：`tdsat_app_v1` 里 `sections.L1.answers` 为空、`wrongLog` 里还留着 `U1-01:{v:'A'}`（学生第一次答错、之后把选项再点一次清空，或从别的设备恢复存档只带来 wrongLog）。`wrong-page.js` 的 `collect()` 只从 `answers[q.id]` 出发：`a` 不存在时不看 `wrongLog`，整题直接蒸发。而 `app-core.js setAnswer()` 的注释白纸黑字写着「之后订正/清空作答都不会把『曾经错过』抹掉」，实际没兑现。

修法：`collect()` 的 wrongLog 分支去掉 `a&&a.correct` 前置条件——只要台账里有一个「按当前答案仍然算错」的作答，就记一笔；`a` 存在且已订正时仍由后面的复核循环标 `corrected=true`。

验证：`test/array-guard.test.js` +1 条（only-wrongLog 存档下错题本必须非空且含该题），旧代码 1 红、新代码 8/0；`node --test` 全量全绿；`verify_junk` 5 套 × 六页全绿。

## 第 24 条：老存档的成绩报告缺 estimate/report → 点「查看成绩报告」白屏（2026-11-27）

复现（`tools/verify_result_degrade.mjs`）：`tdsat_exam_suite_session_v1` 里 `finished:true`、22 题卷面与 uid 都合法，但 `result` 是旧版本/半截写入的形状（`estimate:null`、`report:null`）。`parseSession` 只校验卷面与时钟，放行后开始页显示「View Score Report」；一点，`renderResult` 的 `r.estimate.scaled` 抛 `Cannot read properties of null (reading 'scaled')`，成绩页整页白屏。

同一函数里还有一串同类裸取：`r.report.units/topics/priority`、`r.correct/r.total/r.elapsed/r.durationSec`、`p.wrongIds.join`；`renderResultList` 对 `detail` 里的 null 条目也是裸 `d.correct`。任一字段残缺都会把「已交卷、有成绩」变成打不开的报告。

修法：`renderResult` 开头统一降级——`detail0` 过滤非对象条目，`total/correct/elapsed/durationSec` 非有限数时从 detail 现算或归零，`estimate/report` 过 `asObj`、数组过 `asArr`；分数显示「— / 800」，原始分「— / —」，报告空态照常渲染。列表页与错因聚合同样先过滤 null 条目。

验证：`tools/verify_result_degrade.mjs` 在临时 profile 种残缺 result、点 Start：旧代码 1 条 TypeError、成绩页不可见；新代码 0 异常、`resultShown:true`、分数 `— / 800`、`Correct / Total 5 / 22`。`test/array-guard.test.js` +1 条静态守卫（必须 `asObj(r.estimate)`、禁止裸取），旧代码 1 红、新代码全绿。

回归：`node --test` 284/0；`verify_exam_timeout` 13/13、`verify_flows` 16/16、`verify_grading_ui` 8/8、`verify_runtime` 六页 0 异常、`verify_junk` 5×6。

## 第 25 条：成绩记录里的 report/estimate 与 detail null 条目打崩记录页（2026-11-27）

`history-page.js` 把 `report.priority` 当成数组用：云端合并/旧版本/手工导入写出 `{priority:"x"}` 时，`prio.slice(...).map` 直接 TypeError；`priority` 数组里夹一个 `null` 时，`p.name` 再崩一次。同一页还裸取 `rec.estimate.raw/rawMax`，遇到半截 estimate 会渲染成 `undefined / undefined`。

顺着这条线用 `verify_junk` 新增 `H-bad-report` 画像，又炸出 exam.js：`mergedState()` 的 `asArr(r.detail).forEach(d => { if (d.correct) ... })` 没跳过 `detail` 里的 `null`/数字条目，模考开始页在 `newSession` 阶段就抛 `Cannot read properties of null (reading 'correct')`——错题池因此整块建不出来。

修法：`history-page.js` 加 `asObj`，`report/estimate` 全部降级，`priority` 过 `asArr` 且过滤非对象，`wrongIds` 过 `asArr`，原始分非数字显示「—」；`exam.js mergedState` 的 detail 条目先判对象再读 `correct`。

验证：`test/array-guard.test.js` +1 条（坏 report/estimate + null 条目，旧代码 `prio.slice(...).map is not a function` 1 红，新代码 10/0）；`verify_junk` 新增 H 画像，6 套 × 六页全绿（旧 exam.js 在 H 下复现 2 条异常、Start 页 4859 字但错题池空）。

回归：`node --test` 288/0；`verify_junk` 6×6；`verify_runtime` 六页 0 异常；`verify_exam_timeout` 13/13。

## 第 26 条：导入错题的 given 是对象/数字 → 错题本整页空白（2026-11-27）

`wrong-page.js` 的 `analysis()` 第一行就是 `x.given.trim()`。自己导入的错题经 `normalizeItem` 会转成字符串，但**已存进 localStorage 的历史导入记录**（旧导入器、手工改过、云端合并）里 `given` 可能是对象或数字；`importedGroupHtml()` 直接把它塞进 `x.given`，于是渲染第一张卡片时抛 `x.given.trim is not a function`，整页错题本白掉。

修法：`analysis()` 把 `given` 先 `String(x.given == null ? '' : x.given).trim()`，与 `add()` 落库时的 `String(given)` 口径对齐。

验证：`test/array-guard.test.js` +1 条（导入项 `given:{x:1}` 与 `given:123`，旧代码 1 红 `x.given.trim is not a function`，新代码 11/0）；`verify_junk` 新增 `I-import-given` 画像，7 套 × 六页全绿。

回归：`node --test` 292/0；`verify_junk` 7×6；`verify_runtime` 六页 0 异常。

## 第 29 条：单元抽查一开考就崩 / 卷面被上一场模考顶替（2026-11-27）

`exam.html?mode=quiz` 的开场页会先跑一次 `newSession()` 画题数与时长，脏数据正是死在这一步：
`importedWrongIds()` 对导入仓库写死 `(d.items || []).forEach`，`items` 是对象/数字时（旧导入器、云端合并）直接 TypeError；`exam-core.unitWrongIds()` 对成绩历史写死 `h.detail.forEach`，`history` 里夹 `null` 或 `detail` 是字符串时同样崩。两处一炸，页面只剩「This page could not finish loading」，Start 点了也只会再抛 `Cannot set properties of null`。

顺着 `verify_junk` 把单元抽查页加进体检、并真的点 Start，又炸出第三层：上一页模考留下的**活会话**（同一 localStorage key、`startedAt` 非 0）会被 `persist()` 当成同一场复用——`out = disk` 后只回填本地变化的字段，于是模考的 22 题 paper 被拼进抽查卷，uid 对不上就直接 `S.answers[uid].locked` 崩；uid 若能对上，旧答案会被静默记到新题上，错得更隐蔽。

修法：`importedWrongIds` 只遍历 `Array.isArray(d.items)`；`unitWrongIds` 对 `history`/`detail` 双层校验数组并跳过 null/非对象条目；`persist()` 复用活会话前要求 **mode、单元、卷面签名三者一致**（`snap(disk.paper) === snap(S.paper)`），不同场次一律以本页新卷为准。

验证：`verify_junk` 升级为 7 页（新增 `exam.html?mode=quiz&unit=1.1` 并点击 Start），断言无异常、正文 ≥200 字、落库卷面全部属于 Unit 1 且答案覆盖 paper；旧代码复现 `(d.items||[]).forEach is not a function`、`(h.detail||[]).forEach is not a function`、`reading 'locked'` 三条异常，新代码 10 套脏值 × 7 页全绿。

回归：`node --test` 309/0（`unitWrongIds` 新增 null/非数组 detail 单测、`persist` 同卷闸门静态守卫）；`verify_junk` 10×7；`bump_assets.py` PASS `b7d6c31456f6`。

## 第 30 条：m2Options 里夹 null/字符串 → 模考进模块二就白屏（2026-11-27）

`parseSession` 对 22 题、还在模块一的模考存档只检查 `m2Options.hard/easy` **是不是数组**，不检查数组里的条目。云端合并或旧版本写进 `hard:[null]`、`easy:['junk']` 时存档仍判合法，恢复后一进模块二：
`S.paper = S.paper.concat(S.m2Options[path])` 把 null 拼进卷面 → `S.answers[x.uid]`、`renderQuestion` 的 `cur().id` 连续崩，模考整页白掉；更坏的情况是字符串恰好凑成 uid，旧答案会被记到不存在的题上。

修法：`parseSession` 对 22 题模考的 `hard/easy` 逐项校验——必须是对象、`uid` 非空字符串、`id` 确实在题库里；任一不合法就整份存档判 `m2-options` 过期并走留档/新卷流程，绝不把脏候选拼进卷面。

验证：`tools/verify_m2` 复核用合法 22 题卷 + `m2Options:{hard:[null],easy:['junk']}`、模块一已超时；旧代码点 Start 后抛 `Cannot read properties of undefined (reading 'id')`，新代码 0 异常、停在模块一，存档不再续进模块二。`test/session.test.js` +3 条（hard 夹 null、easy 夹字符串均判 `expired`，正常候选仍 `ok`）。

回归：`node --test` 316/0（session 19/19）；`verify_junk` 11×7；`verify_exam_timeout` 13/13、`verify_flows` 16/16。

## 第 31 条：Unit 1 的抽查存档在 Unit 2 页面恢复 → 页头写 2、题全是 1（2026-11-27）

`parseSession` 只核对 `mode === 'quiz'`，不看存档属于哪个单元。先在 Unit 1 开一场抽查（活会话留在 `tdsat_exam_suite_session_v1`），再打开 `exam.html?mode=quiz&unit=2`：存档被当成「同一场」恢复，页头写 `Unit 2`，卷面 24 题全部来自 Unit 1，交卷后成绩和错题也记到 Unit 2，属于静默串卷。

修法：`parseSession` 新增 `opts.unitId`，抽查存档的 `unitId` 与当前页不一致时整份判 `expired/unit`，走留档/新卷；`exam.js` 同时把 `unitId` 传进解析器，并让 `isQuestionId` 对抽查只认当前单元的题（双保险）。

验证：`tools/verify_quiz_unit.mjs` 种一场 Unit 1、24 题、模块一进行中的抽查存档，再进 Unit 2 点 Start；旧代码恢复出 `unitId=1`、24/24 题不属于 Unit 2，新代码 `unitId=2`、28 题全部属于 Unit 2、0 异常。`test/session.test.js` +2 条（跨单元 → `expired/unit`，同单元仍 `ok`）。

回归：`node --test` 320/0；`verify_junk` 11×7；`verify_exam_timeout` 13/13。

## 第 32 条：44 题却标模块一 → 模块一计时到点就崩在 enterModule2（2026-11-27）

`parseSession` 只按卷面长度 22/44 放行，不看 `module`。旧存档或云端合并留下「44 题 + `module:1` + `m2Options:null`」时，恢复后只显示前 22 题，模块一倒计时一到，`enterModule2()` 去取 `S.m2Options[path]`，直接 `Cannot read properties of null (reading 'easy')`；更隐蔽的是 `module` 被写成字符串 `"2"`，会被当成模块一，44 题只显示前一半。

修法：模考存档先归一化 `module`（`Number(...)===2`），22 题必须停在模块一、44 题必须已在模块二，反向形态一律判 `expired/shape`；44 题 + 字符串 `"2"` 归一化后正常恢复。

验证：`tools/verify_paper_shape.mjs` 种 44 题、`module:1`、`m2Options:null`、模块一已超时的存档，点 Start；旧代码抛 `reading 'easy'`，新代码判过期后重开 22 题模块一卷、0 异常、正文 381 字。`test/session.test.js` +2 条（44 题标模块一 → `shape`；字符串 `"2"` → 正常 `ok` 且 `m1Size=22`）。

回归：`node --test` 322/0；`verify_junk` 11×7；`verify_exam_timeout` 13/13。

## 第 33 条：旧 settings 里 total/perQ 是字符串 → 开场 NaN:NaN、倒计时永不结束（2026-11-27）

`practiceDurationSec` 直接 `Math.round(settings.total || 35)`、`n * (settings.perQ || 95)`。旧版本或云端合并把 `total:'x'`、`perQ:'x'` 写进 `tdsat_state_v1.settings` 时，字符串是真值、走不进默认值，`Math.round('x')` 得到 `NaN`：抽查开场页显示 `NaN:NaN 限时`，开考后 `endsAt = startedAt + NaN`，倒计时永远走不到 0。

修法：先 `Number(...)` 并检查 `Number.isFinite`/`>0`；非法时回落到 95 秒/题的官方节奏，题数也做有限化兜底，保证 `durationSec` 永远有限且 ≥60。

验证：`tools/verify_duration_nan.mjs` 种 `tdsat_state_v1={settings:{tmode:'total',total:'x'}}` 后进抽查页；旧代码开场含 `NaN`、开考后 `durationSec` 落库为 null、`ends-started` 为负，新代码开场无 NaN、`durationSec=2280`（24 题 × 95 秒）、结束时间正常。`test/session.test.js` +2 条（非法字符串回落 24×95，合法 35 分钟/60 秒每题仍按设置算）。

回归：`node --test` 325/0；`verify_junk` 11×7；`verify_exam_timeout` 13/13。

## 第 34 条：作答值是对象/数组 → 恢复后输入框显示 [object Object]，导航算已答、判分算空（2026-11-27）

`parseSession` 只把 `a.v == null` 补成空串，对象/数组原样保留。云端合并或旧版本把 `v:{x:1}`、`v:['A']` 写进存档时，恢复后单空 grid 输入框直接显示 `[object Object]`，导航按 `a.v` 真值算「已作答」，交卷判分却走 `String` 拿不到合法答案，等同于空答；数字作答也会以非字符串形态落库。

修法：恢复时统一作答值——字符串原样保留，有限数字 `String(v)`，其余（对象、数组、布尔、NaN/Infinity）全部清空，保证 DOM 和判分看到同一份可判分文本。

验证：`tools/verify_answer_value.mjs` 种一场 22 题模块一存档，第 3 题（U1-03，grid）`v:{x:1}`、第 4 题 `v:['A']`、第 5 题 `v:3`。旧代码恢复后输入框值 `"[object Object]"`、落库仍是对象；新代码输入框为空串、`M1-03` 落库 `""`，0 异常。`test/session.test.js` +1 条（对象/数组清空、数字转字符串）。

回归：`node --test` 326/0；`verify_junk` 11×7；`verify_exam_timeout` 13/13。

## 第 35 条：成绩记录里的对象作答被错因汇总判成「概念没掌握」（2026-11-27）

`analysis.analyze` 直接 `String(given)`。成绩记录是云端合并/旧版本产物，`detail.given` 可能是 `{x:1}` 或 `['A']` 时，`String({})` 得到 `"[object Object]"`，被判成「写了答案但知识点没掌握」；结果页自己的答案栏走 `safeText` 显示为空，两处口径相反，错因分类也就错了。

修法：`given` 是对象/数组/函数时按空串处理，和展示层 `safeText` 对齐；字符串/数字仍正常分析。

验证：`tools/verify_result_given.mjs` 种一份已交卷 44 题模考会话，`result.detail[0].given={x:1}`，点 Start 进结果页。旧代码类型汇总为「知识点概念未掌握」并给出公式类建议；新代码归为「未作答 / 时间分配」，页面无 `[object Object]`，0 异常。新增 `test/analysis-shape.test.js` 2 条（对象/数组→blank、正常字符串仍分析）。

回归：`node --test` 330/0；`verify_junk` 11×7；`verify_exam_timeout` 13/13。

## 第 36 条：板块 answers/marks/wrongLog 被写成字符串 → 练习页点选项就 TypeError（2026-11-27）

`secIn` 只判断 `!s.answers`，字符串 `"junk"` 是真值就放过。云端合并/旧版本把某个板块的 `answers`、`marks` 或 `wrongLog` 写成字符串时，练习页点选项走 `setAnswer` → `st.answers[qid] = …`，严格模式下直接 `Cannot create property 'TD-11-01' on string 'junk'`，答案写不进去；`marks`/`wrongLog` 同样会在标记或错题台账写入时崩。

修法：`secIn` 统一按普通对象校验——字符串、数组、null 一律重建为 `{}`，新建板块也带 `wrongLog:{}`；读路径同样修复，宁可丢这一段坏记录，也不让页面写不进新答案。

验证：`tools/verify_state_shape.mjs` 种 `tdsat_app_v1` 的 `1.1` 板块 `answers:'junk',marks:[],wrongLog:'x'`，开 `drill.html?sec=1.1&i=1` 点第一个选项。旧代码抛 `Cannot create property 'TD-11-01' on string 'junk'`、落库仍为 string；新代码 answers 变对象、选项 `A` 正常落库、0 异常。新增 `test/state-shape.test.js` 1 条（真实 app-core 磁盘读写路径）。

回归：`node --test` 331/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 37 条：cursor 归一化补测——对象/NaN 也能落到空题，字符串用例没兜住（2026-11-27）

`secIn` 修完 `answers/marks/wrongLog` 后，`cursor:{x:1}`、`NaN`、`-5`、`'junk'` 这类值仍原样透传；`drill.js` 用 `Math.min(list.length-1, saved.cursor||0)` 算题号，对象/NaN 参与运算后得到 `NaN`，`questions[NaN]` 是空，页面既没有题也没有选项，URL 还写成 `i=NaN`。上游并发提交 `60cf6f4` 已把 `cursor` 统一 `Number` 后取非负整数，但它的回归只覆盖了字符串 `'3'`，对象/NaN/负数仍没有用例，也没有浏览器探针。

补法：`test/state-shape.test.js` 增加对象、`NaN`、负数、`'junk'`、`null` 五种输入都归一为 `0`；新建 `tools/verify_cursor_shape.mjs`，种 `tdsat_app_v1` 的 `1.1` 板块 `cursor:{x:1}`，开 `drill.html?sec=1.1&i=1` 实测题号与 URL。

验证：旧逻辑（只对字符串 `Number`）对象 cursor 时题号 `NaN`、URL `i=NaN`、选项 0 个；当前实现选项 4 个、正文 254 字、URL `?sec=1.1&unit=1&i=1`，0 异常。`node --test` 335/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 38 条：main 上六个页面的 `?v=` 与内容哈希脱节——改完样式没 bump，线上继续吃旧缓存（2026-11-27）

`python3 bump_assets.py --check` 在 origin `d270056` 上直接红：内容哈希 `5a2e12222cb1`，六个页面和 `sw.js` 却仍是 `da604e743c60`。来源是队友 `6da3108`（drill 窄屏装饰圆环）改了 `drill.html` 后没跑 bump，页面引用的 JS/CSS 还是上一版令牌；浏览器按旧 `?v=` 命中强缓存，样式/脚本改动对老用户根本不生效。

修法：`python3 bump_assets.py` 重算并把六页与 `sw.js` 一起写成同一令牌。第 39/40 条又改了 JS，哈希再次变化，最终再跑一次对齐到 `0fef92bc1f8b`，`bump_assets.py --check` 通过。

回归：`node --test` 338/0 中的 `version-sync.test.js` 恢复通过；线上六页令牌已核对为同一个 `v=eeab7010d77c`。

## 第 39 条：模考存档 `answers` 是数组时被当普通对象放行，刷新一次整卷作答归零（2026-11-27）

`parseSession` 只判断 `!s.answers || typeof s.answers !== 'object'`。数组的 `typeof` 同样是 `object`，旧版/云端合并来的 `answers: []` 会直接放行；随后按 `answers[uid]` 写进去的是数组的字符串自定义属性，`JSON.stringify` 序列化数组时只保留数字下标，这些属性全部被丢掉——刷新后整卷作答变空，成绩、错题本跟着全错。

修法：`answers` 是数组时一律重建为 `{}`，与板块 answers/sections 的普通对象口径一致。验证：把同一份 `answers: []` 存档跑真实 `parseSession`，旧代码 `answersIsArray=true`、写 `M1-0` 后序列化 `(lost)`；新代码 `answersIsArray=false`、落库 `A`。`test/session.test.js` 新增 1 条，旧代码 27/28、新代码 28/28。

## 第 40 条：本机 `sections` / 单个板块是数组时，「恢复存档」成功回执但合并结果被 JSON 吞掉（2026-11-27）

`progress-save.js restore()` 用 `typeof live.sections === 'object'` 判断本机容器，数组照样放行；`cur` 也只看 `typeof`。于是 `live.sections=[]` 或 `sections['1.1']=[]` 时，合并结果全挂成数组的自定义属性，`localStorage.setItem(LIVE, JSON.stringify(live))` 一写只剩 `[]`——UI 返回 `ok:true`，用户以为恢复成功，实际整份作答/错题台账消失。

修法：`live.sections`、单个 `cur` 是数组时重建普通对象；存档里的 `answers` / `marks` 也显式排除数组。验证（真实 `progress-save.js` + 真实题库）：本机 `sections:[]`、存档带 `1.1` 的 `TD-11-01=A`，旧代码 `ok:true / sectionsIsArray:true / answer:undefined`，新代码 `ok:true / sectionsIsArray:false / answer:A`。`test/progress-restore-wronglog.test.js` 新增 2 条，旧代码 3/5、新代码 5/5。

回归：`node --test` 338/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 41 条：练习板块的作答值是对象/数组——输入框显示 `[object Object]`，统计还当已作答（2026-11-27）

`secIn` 第 36 条只保证 `answers` 容器是对象，没管每条记录本身。云端合并/旧版本把 `answers['TD-11-01']` 写成 `{v:{x:1}}`、`['A']` 或裸数字时：drill 的 grid 输入框直接 `value = 对象`，界面显示 `[object Object]`；`computeStats` 又用 `String(a.v).trim() !== ''` 判断，把这些坏值算成「已作答」，进度和正确率都对不上。

修法：`secIn` 遍历 `answers`，记录不是普通对象时重建为 `{v}`；`v` 只保留字符串/有限数字（数字转字符串），对象/数组/布尔一律空串，与 `parseSession` 的答案值口径一致。验证：直接跑真实 `app-core.js`，种 `{v:{x:1}} / ['A'] / 3` 三条作答，旧代码 5/6（对象值原样保留），新代码 6/6（前两条 `v:''`、数字变 `'3'`）。全量 `node --test` 340/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 42 条：保存进度时本机 `sections` 是数组——无 `last` 直接 TypeError，有 `last` 把空数组写进存档（2026-11-27）

`progress-save.js snapshot()` 用 `typeof live.sections === 'object'` 判断容器，数组照样放行。没有 `last` 时兜底板块走 `secs[fallback].cursor`，数组里根本没有这个键，直接 `Cannot read properties of undefined (reading 'cursor')`，保存进度失败；有 `last` 时虽然不崩，却把 `sections: []` 原样写进存档，`JSON.stringify` 只留 `[]`，用户之后用这份存档恢复时所有板块/作答全空。

修法：`snapshot` 的 `secs` 显式排除数组；遍历已有板块，板块记录不是普通对象时重建 `{answers:{},marks:{},cursor:0}`；兜底取 cursor 时用 `(secs[fallback] || {})`。验证：真实 `progress-save.js`，本机 `sections:[]`、无 `last`，旧代码抛 TypeError，新代码 snapshot 成功且存档 `sections` 是普通对象；本文件测试旧代码 3/6、新代码 6/6。全量 `node --test` 341/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 43 条：旧快照写出的 `sections: []` 存档仍被判「可恢复」，恢复回执成功但什么都没搬（2026-11-27）

第 42 条修了 snapshot 不再写数组，但已经被旧代码写坏的存档还在本机/云端：`inspect()` 只判断 `typeof d.sections === 'object'`，数组照样判 `ok`；`restore()` 对它 `Object.keys([])` 得到空数组，直接返回 `ok:true`。用户看到「存档有效、恢复成功」，实际板块和作答一个都没回来，比直接报 corrupt 更误导。

修法：`inspect()` 的必填字段校验增加 `Array.isArray(d.sections)`，数组 sections 直接判 `corrupt`（reason「存档缺少必要字段」），恢复入口随之拒绝，不再给假成功。验证：真实 `progress-save.js`，存档 `sections:[]`，旧代码 `inspect.status=ok`、`restore().ok=true`；新代码 `corrupt`、`restore().ok=false`。本文件测试旧代码 3/7、新代码 7/7。全量 `node --test` 342/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 44 条：成绩仓库数组里混入数字/字符串——记录页渲染出「日期/分数全是 —」的幽灵成绩（2026-11-27）

`history-page.js` 对 `tdsat_exam_suite_results_v1` 只做了 `filter(r => r && !r.void)`：`5`、`'junk'`、`false` 这些 truthy 值全部通过，`rowHtml` 照样按记录渲染，页面出现一条「官方模考 · 全卷 44 题 / 日期 — / 正确率 0%」的假成绩，点开也没有任何 detail。云端合并或手工导入只要混进一个坏条目，用户就会以为多考了一场。

修法：结果与未完成存档都只认普通对象（`typeof === 'object' && !Array.isArray && !r.void`），数字/字符串/数组一律过滤；有效记录为零时落「还没有模考或抽查记录」空态。验证：真实 `history-page.js`，仓库 `[5,'junk',null,false]`，旧代码渲染出「官方模考」幽灵行，新代码直接空态。`test/array-guard.test.js` 旧代码 18/19、新代码 19/19。全量 `node --test` 343/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 45 条：导入错题仓库 `items` 混入数字/字符串——错题本多出「题干暂缺」的幽灵导入卡（2026-11-27）

`wrong-page.js importedGroupHtml()` 对 `tdsat_imported_wrong_v1.items` 只做 `it && (!it.matchId || it.readOnly)`：`5`、`'junk'` 这些 truthy 原始值、甚至数组全被当成一条导入记录，标题写「独立记录 3 道」，页面多出没有题干、没有答案的幽灵卡；有效的那一条反而被淹没。云端合并或手工导入只要混进一个坏值就会出现。

修法：导入记录只认普通对象（`typeof === 'object' && !Array.isArray`），原始值和数组过滤掉，标题数量按真实条目算。验证：真实 `wrong-page.js`，仓库 `items:[5,'junk',null, 一条有效]`，旧代码标题 3 道并画幽灵卡，新代码标题 1 道、只保留有效卡。`test/array-guard.test.js` 旧代码 18/20、新代码 20/20。全量 `node --test` 347/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 46 条：成绩记录 `detail` 数组混入数字/字符串——记录页多出「— / —」幽灵错题行（2026-11-27）

`history-page.js wrongRows()` 对 `detail` 也只做 `d && !isRight(d.correct)`：`5`、`'junk'` 的 `correct` 是 undefined，`!isRight(undefined)` 为 true，于是被当成错题行渲染，id、你的答案、正确答案全是「—」；`resultBody` 里的「错题（N）」也把坏值算进去。云端合并或半截导入的 detail 只要混进一个原始值，页面就多一条假错题。

修法：detail 条目只认普通对象（`isDetail(d)`），`wrongRows` 和错题计数共用同一个过滤口径；有效错题为零时落「本次全部答对」。验证：真实 `history-page.js`，记录 `detail:[5,'junk',null]`，旧代码画出 2 条 `hist-wrong-row`、错题数 2，新代码 0 条并显示「本次全部答对」。`test/array-guard.test.js` 新代码 21/21。全量 `node --test` 348/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 47 条：成绩页 `detail/report` 里混入数组条目——结果页出现 Q? / — / ✗ 的幽灵行（2026-11-27）

`exam.js renderResult()` / `renderResultList()` 用 `d && typeof d === 'object'` 过滤 detail，`units/topics/priority` 也一样。数组的 `typeof` 也是 object，`[ ... ]` 会通过过滤：结果页把它当一条错题渲染成 `Q?`、你的答案「—」、正确「—」、`✗`，补强区块也会多出空白单元/考点行。云端合并或半截导入把 detail 条目写成数组就会复现。

修法：新增 `isRec = v => v && typeof v === 'object' && !Array.isArray(v)`，`detail0`、`allD`、`weaknessReport` 聚合、`units/topics/priority` 全部改走 `isRec`；`mergedState` 的 detail 过滤也排除数组。验证：静态回归锁住旧过滤式不再出现、`filter(isRec)` 至少 6 处；`test/array-guard.test.js` 新代码 22/22。全量 `node --test` 349/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 48 条：进度存档 snapshot 遇到 cursor 对象——位置写成 NaN → null，存档判 corrupt 且永久锁死（2026-11-27）

`progress-save.js snapshot()` 取 `cursor` 后直接 `+1`。云端合并或旧版把 `cursor` 写成 `{x:1}` 时，`"[object Object]1"` 经 `Math.min/Math.max` 变 `NaN`，`JSON.stringify` 再写成 `null`；`inspect()` 判 `corrupt`，`canWrite()` 从此永远 false，用户手动存档被永久拒绝。

修法：新增 `cursorNum()`，只接受非负有限数并向下取整，其余归一为 0；snapshot 归一板块 `cursor`、`last` 分支和 fallback 分支都走它。验证：本机 `cursor:{x:1}`，旧代码 `snapshot → corrupt（位置超出范围）`，新代码 `ok`、`position.n=1`、`inspect().status=ok`；该文件 8/8。全量 `node --test` 354/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 49 条：记录页 date 为 null/0 时显示「1970 年」假交卷时间（2026-11-27）

`history-page.js fmtDate()` 把 `null`、`0`、`false` 交给 `new Date(t)`，浏览器把它们当 Unix 零点，记录页头部与「交卷时间」直接显示 1970-01-01。云端旧结构/手工导入缺日期时，用户会以为这是真实记录时间。

修法：`fmtDate` 先拒绝 `null`、空串、布尔；数字只接受 `>0` 的有限值，否则显示「—」；非数字字符串仍交给 `Date` 解析。验证：记录 `date:null` 与 `date:0`，旧代码 innerHTML 出现 `1970`，新代码显示「—」；`test/array-guard.test.js` 25/25。全量 `node --test` 357/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 50 条：进度存档摘要把对象答案算「已答」，恢复后却是空白（2026-11-27）

`progress-save.js` 的 `inspect()` 与 `snapshot()` 摘要只判 `a.v != null && String(a.v).trim() !== ''`：`v:{x:1}` 会变成 `"[object Object]"` 被算成已答，但恢复后 `secIn` 会把它归一成空值，存档面板的「已答」与实际恢复结果不一致。

修法：新增 `hasAnswer()`，只统计字符串/数字/布尔等非对象且 trim 非空的 `v`；`inspect` 与 `snapshot` 共用。验证：存档 `v:{x:1}, correct:true` 旧摘要 `answered=1`，新摘要 `answered=0`、`correct=0`；该文件 10/10。全量 `node --test` 369/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 51 条：顶部导航 class 引号没闭合，aria-current 被吞进 class（2026-11-27）

`app-core.js nav()` 拼导航时写成 `class="' + (...) + '>'`，少了一个闭合双引号；实际输出 `<a ... class="on> aria-current="page">`。浏览器会把 `on> aria-current=` 当成 class 值，当前页的 `a.on` 高亮失效，`aria-current` 也不是属性，读屏软件读不到「当前页」。

修法：把 class 值单独用一层引号闭合：`class="' + (...) + '"' + (active ? ' aria-current="page"' : '') + '>'`。验证：vm 里跑真实 `app-core.js nav('drill')`，旧输出含 `class="on>`，新输出为合法的 `class="on" aria-current="page"`；`test/nav.test.js` 7/7。全量 `node --test` 372/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 52 条：迁移旧板块时目标 wrongLog 是字符串/数组，错题台账丢失或页面 TypeError（2026-11-27）

`app-core.js normalize()` 迁移旧节 `wrongLog` 时只保证 `dst.answers`、`dst.marks` 是对象，没检查 `dst.wrongLog`。目标板块的 `wrongLog` 是 `'junk'` 时，strict mode 下 `dst.wrongLog[qid] = ...` 直接 `Cannot create property ... on string`，整页加载崩；是数组时属性写进数组自定义键，`JSON.stringify` 后只剩 `[]`，旧错题蒸发。

修法：迁移前把 `dst.wrongLog` 归成普通对象，源 `src.wrongLog` 只接受普通对象。验证：旧节 `2.6` → `2.7.T23`，目标 `wrongLog:'junk'`，旧代码 TypeError，新代码可写回且 `R03-361` 记录落库；`test/state-shape.test.js` 8/8。全量 `node --test` 375/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 53 条：wrongLog 条目 v 是对象，错题本画「未作答」幽灵卡（2026-11-27）

云端合并/旧版可能把 `wrongLog[qid]` 写成 `{v:{x:1}}`。`wrong-page.js collect()` 原来只判 `wl && String(wl.v).trim()`，对象 `v` 会得到 `[object Object]`，`stillWrong` 判错后 `add()` 再把对象降级成空串，于是凭空多一张「你的答案 未作答」的错题卡。

修法：只接收字符串/有限数字的 `v`，对象/数组条目直接跳过。验证：真实板块第一条题种 `{v:{x:1},ts:…}`，旧代码渲染「未作答」，新代码不渲染；`test/array-guard.test.js` 新增回归。全量 `node --test` 383/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 54 条：成绩页逐题回顾对旧存档填空仍显示「正确答案 —」（2026-11-27）

`exam-core scoreSession` 已在新成绩里把 grid 的 `value` 回填 `answer`，记录页 `history-page` 也补了兜底，但成绩页 `exam.js renderResultList()` 仍直接 `safeText(d.answer)`。修复前交卷的存档里 37 道 SP2 填空题 `answer:null`，从 session 恢复成绩页时「正确答案」还是「—」。

修法：`dAnswer` 先取 `d.answer`/`d.value`，为空再按题号回查题库 `answer`，grid 再兜 `value`/`values`；错因分析复用同一份 `bankQ`。验证：`test/grid-answer-display.test.js` 新增成绩页静态回归，旧代码断言「成绩页缺 d.answer/d.value 兜底」失败；全量 `node --test` 385/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 55 条：讲义独立状态/成绩仓库是字符串或对象，答题/交卷直接崩（2026-11-27）

`jiangyi-core.js` 的状态初始化只写 `var S = read(KEY) || {...}`。`tdsat_jiangyi_v1` 是 JSON 字符串时，`S` 变成原始值，严格模式下 `S.answers = {}` 直接 TypeError，讲义页整页初始化失败；`answers` 是字符串时答题 `S.answers[q.id]=…` 同样 TypeError；成绩仓库是对象时 `submitSection` 的 `all.push(rec)` 报 `all.push is not a function`，交卷丢失。

修法：状态容器 `S/answers/submitted/last` 统一过普通对象判定，答案条目归一成 `{v,correct,ts}`，非字符串/有限数字的 v 清空；`submitSection` 读成绩仓库只认数组，非数组重建。验证：`test/jiangyi-state-shape.test.js` 三条回归，旧代码分别报 `Cannot create property 'answers' on string 'junk'`、`all.push is not a function`；全量 `node --test` 392/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 56 条：讲义交卷 detail 缺 answer，记录页错题行显示「正确 —」（2026-11-27）

`jiangyi-core submitSection()` 写 `detail` 时只落 `given/correct`，没落 `answer`。记录页 `wrongRows()` 读 `d.answer`，讲义题 id 又不在 `TD_BANK`，`byId` 查不到，只能印「正确 —」。修法：按题库 `answer` → `value` → `values` 把正确答案写进每条 detail。验证：`test/jiangyi-state-shape.test.js` 新增「讲义交卷 detail 带正确答案」，旧代码 `detail.answer` 为空失败，新代码通过；全量 `node --test` 406/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 57 条：模考存档 answers 条目是裸字符串/数字，刷新后作答被清空（2026-11-27）

`exam-core parseSession()` 对 `s.answers[uid]` 只判 `typeof === 'object'`，裸字符串 `'A'` 或数字 `7` 被当成坏值重置成 `{v:''}`。云端合并/旧版若写出 `answers: {"M1-1":"A"}`，刷新后该题答案消失、判分归零。修法：字符串/有限数字恢复为 `{v:String(a)}`，对象/数组仍清空防止 `[object Object]`。验证：`test/session.test.js` 新增「裸字符串/数字作答恢复成可判分对象」，旧代码该子测试失败；全量 `node --test` 434/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 58 条：旧讲义成绩在记录页仍显示「正确 —」，因为 JY 题不在 TD_BANK（2026-11-27）

`history-page byId()` 只查 `TD_BANK`，讲义成绩 detail 的题号是 `JY…`，查不到；旧讲义 detail 又没有 `answer`（#56 前写入的存档），错题行只能印「正确 —」。修法：history.html 横向加载 `data/jiangyi.js`，`byId` 兜底查 `JY_BANK`，`wrongRows` 缺 answer 时回查 `q.answer`（grid 再兜 `value/values`）。验证：`test/array-guard.test.js` 新增旧讲义成绩回归，旧代码「正确 —」失败，新代码通过；全量 `node --test` 454/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 59 条：练习页 marks 值是字符串 "false"，题号仍显示为已标记（2026-11-27）

`app-core secIn()` 原来只把 `marks` 容器归成对象，没有归一值。云端合并/旧版把 `marks[qid]` 写成 `"false"` 时，`!!st.marks[qid]` 为真，练习导航题号一直亮「已标记」；再点一次标记 `! "false"` 又得到 false，行为正好相反。上游 `c8c77bc` 已合入 `isRightFlag` 归一，本地复核时发现自己的补丁把同一行重复插入了一次，已去重；补 `test/state-shape.test.js`「marks 值是字符串 false 时归一成布尔 false」回归锁。旧代码该用例失败，新代码通过。全量 `node --test` 455/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 60 条：进度存档 version/savedAt/position.n 是数字字符串，被误判 corrupt 锁死恢复（2026-11-27）

`progress-save inspect()` 对 `version`、`savedAt`、`position.n` 用严格 `typeof === 'number'`。云端合并/旧版若写成 `"1"`、`"1700…"`、`"2"`，存档其实完全可恢复，却被判 `corrupt`，`canWrite()` 永久 false，手动恢复/覆盖都被拒。修法：三个字段统一 `Number()` 后校验（version 必须等于当前，savedAt 必须有限且 >0，n 必须是范围内整数），返回值也用归一后的数字。验证：`test/progress-restore-wronglog.test.js` 新增「数字字符串仍可识别并恢复」，旧代码报「存档缺少必要字段」失败，新代码通过；全量 `node --test` 459/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 61 条：云端 `sections` 是数组时，深合并用它顶掉本机整个对象（2026-11-27）

`cloud-account deepMerge()` 遇到「一边数组、一边对象」时固定返回数组：`return Array.isArray(lo) ? lo : co`。首次登录合并本机无主进度时，云端只要有一个坏形状 `sections: []`，就会把本机 `sections` 对象整段替换成数组；随后 `applyPayload` 写盘，`app-core normalize()` 只能把数组重置成空对象——本机所有作答看似同步成功，实际全部蒸发。修法：容器形状冲突时保留非数组那侧（本项目所有状态容器都是对象，数组一律视为坏形状）。验证：`test/cloud-merge.test.js` 新增「云端 sections 是数组时不顶掉本机的对象 sections」，旧代码报「云端坏数组顶掉了本机 sections」失败，新代码通过；全量 `node --test` 460/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 62 条：云合并只认原生数字时间戳，字符串 ts 让旧答案赢、记录重复（2026-11-27）

`cloud-account deepMerge()` 和 `itemSig()` 都写死 `typeof x.ts === 'number'`。旧版/手工导入把 `ts` 写成 `"1700…"` 时：答题记录不再走「时间新者赢」，两条记录会继续按对象深合并，最后 `v/correct` 平手取本机——云端更新的答案被本机旧答案压住；记录数组的签名也从 `t:200` 变成整串 JSON，同一条记录数字版/字符串版各算一条，成绩页出现重复行。修法：新增 `stampNum()`，接受有限非负数字或数字字符串，`deepMerge` 与 `itemSig` 统一用它。验证：`test/cloud-merge.test.js` 新增「字符串 ts 的作答仍按时间取新」，旧代码失败（本机 A 压住云端 B），新代码取云端 B；全量 `node --test` 461/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 63 条：进度存档 answers 条目是 null，本机已有作答时恢复直接 TypeError（2026-11-27）

`progress-save restore()` 合并答案时无条件读 `Number(incoming.ts)`。存档里 `answers[qid]` 是 `null` 时：本机没有该题作答，`!existing` 短路掩盖问题；一旦本机已有作答（正是最需要保护进度的场景），就会读 `null.ts` 抛 `Cannot read properties of null`，整次恢复失败，用户只看到「恢复失败：存档状态异常」。同一条路径对裸字符串/数字答案也会 `.ts` 取值失败。修法：先拒绝 null/数组；裸字符串/有限数字按 app-core 口径转成 `{v:String(a), ts:0}`；对象仍按 ts 新者胜。验证：`test/progress-restore-wronglog.test.js` 新增「null / 裸值答案遇到本机已有作答」，旧代码 `Cannot read properties of null (reading 'ts')` 失败，新代码恢复成功且本机 C 不被 null 覆盖；全量 `node --test` 463/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 64 条：m2Options 是空数组/半截候选，parseSession 仍放行进入半张 Module 2（2026-11-27）

`exam-core parseSession()` 对 22 题模考存档只检查 `m2Options.hard/easy` 是数组且 `every` 每个候选题合法；空数组和只有 4 题的半截数组 `every` 都返回 true，存档被判 `ok`。学生选路径进 Module 2 后 `S.paper` 只有 22 + 0/4 题，题目导航空白，最终成绩按不足 44 题计算。修法：两条候选分支必须各自正好 `per`（22）题，再逐个校验实例。验证：`test/session.test.js` 新增「hard/easy 是空数组或半截候选 → 判过期」，旧代码放行失败，新代码 `reason='m2-options'`；测试夹具同步改成真实 22×2 候选。全量 `node --test` 472/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 65 条：进度存档 answers 条目是裸字符串时，摘要把已作答算成 0（2026-11-27）

`progress-save hasAnswer()` 只看 `a.v`：存档/live 里 `answers[qid]` 被旧版或云端合并写成裸字符串 `"C"` 时，`a.v` 是 undefined，摘要显示 0/1236，用户以为进度没保存；但 `restore()` 第 63 条已经能把它恢复成 `{v:'C'}`。修法：`hasAnswer()` 先识别裸字符串/有限数字，按 `String(a).trim()` 判空，再走原来的 `{v}` 分支。验证：`test/progress-restore-wronglog.test.js` 新增「存档 answers 条目是裸字符串时，摘要按已作答统计」，旧代码 `answered=0` 失败，新代码 1；全量 `node --test` 476/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 66 条：模考卷面/Module 2 候选的 uid 重复，同一格答案被两道题共用（2026-11-27）

`exam-core parseSession()` 只检查每个 paper / m2Options 实例的 uid 是非空字符串、题号合法，没有检查唯一性。云端合并或旧版把同一道题拼两次时，44 题卷面里两个位置共用一个 uid：作答写到同一格，导航和判分都串题；Module 2 候选有重复 uid 时，进入模块后 `answers[x.uid]` 被后一条覆盖，题号还在但答案错位。修法：paper 逐项建 `seenPaperUid`，重复直接 `paper-uid-dup` 判过期；hard/easy 各加 `uniqUid()`，重复候选同样 `m2-options` 判过期。验证：`test/session.test.js` 新增「paper / m2Options 的 uid 重复 → 判过期」，旧代码放行失败，新代码拒绝；全量 `node --test` 495/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 67 条：finished 的 result 是数组/字符串/缺 detail，成绩页被放行成假成绩单（2026-11-27）

`exam-core parseSession()` 对 `s.finished` 只看 `!s.result`：`result: []`、`"junk"`、`{}`、`{detail:null}` 都是 truthy，存档被判 `ok`，页面直接进成绩态。随后 `renderResultList()` 用 `asArr(r.detail)` 得到空数组，页头分数/题数全是 0，学生看到一张空白「0/0」成绩单，且无法回到答题态。修法：finished 必须有普通对象且 `detail` 是数组；形状不对就 `finished=false`、`locked=false`、`result=null`，stage 从 result 退回 answer。验证：`test/session.test.js` 新增五种坏 result 的回归，旧代码放行失败，新代码全部回到答题态；全量 `node --test` 496/0；`verify_junk` 11×7；`verify_flows` 16/16。

## 第 68 条：result.detail 是空数组或一排 null，仍被当合法成绩单（2026-11-27）

第 67 条要求 `result.detail` 是数组，但 `{detail: []}` 和 `Array(paper.length).fill(null)` 也满足「是数组」，会被放行进入成绩态；`renderResultList()` 过滤掉 null 后仍是空列表，页头 0/0、空白成绩单，跟没有 result 一样。修法：合法 result 的 detail 必须与 paper 等长，并且逐条是普通对象；空数组/一排 null/长度不符一律回到答题态。验证：`test/session.test.js` 新增「空数组/一排 null 回到答题态，逐题对齐才保留成绩」，旧代码放行失败，新代码拒绝且合法 detail 仍保留；全量 `node --test` 497/0；`verify_junk` 11×7；`verify_flows` 16/16。
