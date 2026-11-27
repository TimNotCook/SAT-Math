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

验收：本地 `node --test` 204/0；`verify_mobile` 16/16；线上 `verify_mobile` 16/16、`verify_a11y` 20/20（Back/Next 实测 50×44）、`verify_flows` 16/16、`verify_grading_ui` 8/8、`verify_nav` 38/38、`verify_shaded_figures` 6/6、`verify_runtime` 六页 0 异常。线上 `v=c7bc5fa41550`。

## 讲义页主按钮也是 40px；验收器扩到图表题 / 讲义页 / 记录页（第 13 条续，2026-11-27）

`verify_mobile` 扩到三个新场景后，又红了一条：讲义复习页的「下一题」（`#jyNext`，`.btn.primary`）实测 **40px**——上一轮只修了 `.exam-start-actions .btn`，没管通用主按钮。补 `.btn.primary{min-height:44px!important}` 后 375 / 320 两档都到 44px。

同时把验收口径钉死在新扩的场景上（28 条）：

- **图表题**：不手填题位，先在 `CATALOG` 里用 `TD_FIG.showFigure()` 找一道真有图的题再导航，断言 `scrollWidth` 不超视口、SVG 右边界在视口内（固定宽度的 SVG 最容易被 320 宽撑破）。
- **讲义复习页**：点第一张 board 卡 → 第一个非空小节 → 进入题目视图，量横向溢出与「下一题」热区。
- **记录页**：种两条成绩记录后打开，量横向溢出（记录条里的长路径/用时最容易顶出去）。

顺手记一个坑：`TD_BANK` 有两个数组——`units` 和 `questions`，图表题的 id（如 `U1-12`）只在 `questions` 里；用 `all` 查会全部落空，误报「题库里没有带图的题」。

验收：本地 `node --test` 218/0（队友同时补了 t031 的守门断言）；本地 `verify_mobile` 28/28；线上 `verify_mobile` **28/28**、`verify_a11y` 20/20、`verify_flows` 16/16、`verify_nav` 38/38。线上 `v=3c36a67b7fc0`。

## 记录页错题题干在手机上被截成半句；验收器补成绩页（第 13 条续二，2026-11-27）

`verify_mobile` 加了「行内元素 scrollWidth 明显大于 clientWidth 且 overflow:hidden 就算截断」的检查，记录页第一条就红：`.hist-wrong-stem` 在 375 宽下只有 **122px**，题干「ax + by = b In the equation above…」被切成半句。桌面靠 `title` 悬浮提示补全，手机没有 hover，等于信息丢了。

修法：`app.css` 末尾（必须放在 `.hist-wrong-stem` 原定义**之后**，否则被 `white-space:nowrap` 反压）加 `@media(max-width:640px)`——错题行改成两列、题干 `white-space:normal` + `-webkit-line-clamp:2`、答案另起一行。改完题干宽度 122→224px，两行能读完半道题。

同轮把模考**成绩页**也拉进验收器：种一份「一小时前开始、限时已过」的会话，点 Start 走真实交卷路径落到 `stage-result`，然后量：

- 整页 `scrollWidth` 不超视口；
- `#resKV` 八个指标右边界不越界、最窄单元格 ≥40px（之前在手机上「限时 / 实耗 1:00:00 / 0:59:12」这类最长值最容易把格子撑破）；
- `#resUnits / #resTopics` 的 `.kp-row` 不越界；
- 切到题单 tab 后仍不横滑。

一个踩过的坑：以为成绩卡是 `<table>`，实际是 `#resKV` 的一组 `<div>`，按 table 选择器去查会一直「没有表格」。验收器现在按真实结构量。

验收：本地 `node --test` 223/0；本地 `verify_mobile` 42/42；线上 `verify_mobile` **42/42**、`verify_a11y` 20/20、`verify_flows` 16/16。线上 `v=47d49ef91390`。

## 验收器补键盘可达与答案对比两栏（第 13 条续三，2026-11-27）

热区抬到 44px 之后补两项检查，`verify_mobile` 从 42 条到 **50 条**：

- **键盘可达**：CDP 真发 Tab 键 24 次，记录焦点轨迹，断言能走到选项（`.drill-choice`）和 `#btnNext`，并且没有把焦点困在同一元素（24 步只落在 ≤2 个元素就算死循环）。全绿：选项与 Next 都能 Tab 到。
- **答案对比两栏**：错题卡里「你的答案 / 正确答案」两栏逐格量右边界 + `overflow:hidden` 下 `scrollWidth > clientWidth` 的截断，320 / 375 两档均无越界、无截断（长小数与千分位目前都放得下）。

这两个场景本轮没抓到新缺陷，但把口径钉住了：`test/mobile-target.test.js` 里加了三条存在性断言（缺 `Input.dispatchKeyEvent` / 缺 `answer-compare` / 缺 `resKV` 都会红），防止以后有人精简验收器时把覆盖悄悄删掉。

全绿复核（线上 `https://timnotcook.github.io/SAT-Math`，`v=47d49ef91390`）：`node --test` 223/0；`verify_mobile` 50/50；`verify_flows` 16/16；`verify_grading_ui` 8/8；`verify_exam_timeout` 13/13；`verify_runtime` 六页 0 异常；`verify_nav` 38/38；`verify_a11y` 20/20；`verify_acct_entry` 26/26；`verify_session` 22/22；`verify_shaded_figures` 6/6；`verify_assets` 全绿。

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
