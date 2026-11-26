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

## 还没动的

- `images/fig/` 下仍有历史位图（约 179 个引用）供未被矢量覆盖的题兜底；新录题一律矢量，不再新增位图（`test/jiangyi.test.js` 已守）。
- `questions.js` 旧脚本（`fold_patches.py` / `merge_transcribe_fragment.py` / `patch_answers.py`）仍在按路径写根目录那份，迁移属于另一单活，本轮只做标注，不改脚本。
