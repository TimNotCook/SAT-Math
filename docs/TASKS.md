# TASKS.md — 任务单与验收台账

> 最后更新：2026-11-26（HK）｜维护：主会话「当前工作进度」
>
> 口径修正：题库规模与 Firebase 状态以**实测**为准（见「基线快照」）；旧版 1009 与「清 Firebase 死代码」待办两条已作废，别再照着排期。

> **线上读取提醒**：GitHub Pages 对 `docs/` 的 CDN 为 `Cache-Control: max-age=600`。推完 10 分钟内读到旧内容属正常，先看响应头 `age` 再下结论，别当漏推。
>
> **本表怎么更新**：凡「已实测」项都写明量它的命令，禁止手填记忆值。复核时照命令重跑一次即可对账。

## 铁律（权威定义：`AGENTS.md` →「🚨 铁律：一切成果只认线上仓库」）

**所有东西只放线上仓库 `TimNotCook/SAT-Math`，不放线下。** 细则以 `AGENTS.md` 为准，这里只记本项目落地动作：

- 唯一权威版本 = `origin/main`；交付前用 `git ls-remote origin refs/heads/main` 核对哈希。
- 现存本地工作区（草稿区，不承载独有内容）：Mac `~/Work/SAT-Math`、Mac `~/Work/SAT-Math-live`、云主机 `~/SAT-Math-vm`。
- 推送走 `safe_push.sh`，禁止 `git push --force`。
- `TimNotCook/SAT-Math-Prep` 是**另一个线上仓库**，不是本项目目标库；本项目唯一写入目标是 `SAT-Math`。对它的 404 属于“无权限看到”，不等于已删除，不要据此推断。

## 基线快照（2026-11-26 实测，附量法）

| 项 | 值 | 怎么量的 |
|---|---|---|
| `origin/main` | `f329e03`（2026-11-26 抓取时） | `git ls-remote origin refs/heads/main` |
| 线上页面 | `index` / `drill` / `exam` / `wrong` / `jiangyi` 全部 HTTP 200 | `curl -s -o /dev/null -w "%{http_code}" https://timnotcook.github.io/SAT-Math/<page>.html` |
| 题库 | **1292** 题（id 全唯一）：easy 281 / medium 565 / hard 164 + 2026-11-25/26 逐字录入包（R03/R04 等）；mcq / grid 比例随新包变动 | `node -e` 起 `vm` 跑 `data/questions.js`，`TD_BANK.questions.length` 与 `new Set(id)` 计数（字段名是 `level`，没有 `difficulty`） |
| 单元分布 | 1–268 / 2–333 / 3–453 / 4–238 |
| 讲义复习进度 | 官方 24 节 / 应有 **243** / 已录 **243** / 缺 **0** / 完成 **24 / 24 节** | `python3 tools/gen_jiangyi_reconcile.py`（输出 `need=243 have=243`）与 `docs/jiangyi-backlog.md` | 同上一条脚本，按 `unit` 计数 |
| 登录后端（线上实况） | **Supabase 邮箱 magic link 单通道**（`cloud-config.js` 的 `supabase.url` + `anonKey` + `siteUrl`；`/otp` 显式带 `redirect_to` 回跳 `/SAT-Math/`）；GitHub 令牌、用户名密码、Firebase、WorkBuddy 登录通道均已下线。WorkBuddy 的 `endpoint` / `publishableKey` **只服务图片识别 VLM**，不是登录 | `sed -n '1,30p' cloud-config.js`；`docs/bugfix-2026-11-25-login-otp-only.md`；`docs/account-model.md` |
| Firebase 状态 | 模块已摘除：`firebase-cloud.js` 与 `vendor/firebase/` 均不存在，五页无引用，CSP 无 firebase 域名 | `ls firebase-cloud.js vendor/firebase`；`grep -c firebase-cloud *.html` |
| Supabase 迁移分支 | `backup/supabase-auth-5a0c22b` 仍存在且**未合并**（`git merge-base --is-ancestor 5a0c22b origin/main` 退出码 1） | 同左命令 + `git ls-remote --heads origin` |

## 分工表（只保留未完成；已完成项见下一节「已完成（勿重复做）」）

| 人 | 任务 | 阻塞点（现状） | 验收 |
|---|---|---|---|
| 码农 α | 讲义录入已清零（4.5 十六 + 2.5 #10 于 `61002ef` 入库），转入待命：后续只接主会话派的新节或返工单 | 无阻塞；`data/jiangyi.js` 写入权已释放（243/243，`verify_jiangyi` 0 FAIL） | 新派单须带原页页码 + 答案页核对 |
| 开发者 | ① 给阴影题补 `region`（P0-2），按原题 PDF 逐个核对阴影方向；② 批量修数学排版（P1-6）：`f (x)`→`f(x)`、`(2/3)` 去括号、问号前空格；③ 加校验：题干含 shaded 但 spec 无 `region` 就报错；④ 云主机清僵尸副本（仅限确认无独有内容、且不是 `SAT-Math-Prep` 的副本） | 阴影题口径已定案 **5 道**（见「已定案」第 1 条），按此验收；云主机疑似残留 `~/satrepo`、`~/satrepo-vm`，需逐个核对后再动 | 阴影题逐个截图与原题一致；校验脚本能拦住同类错误；题库仍 **1292** 且判分回归全过 |
| 码农 β | 账号面板与云同步收尾（magic link 单通道下的档案读取、换设备进度、设置页回归） | 6 位数字码需自定义 SMTP + 模板改造后才能切回；当前只能 magic link | 真机 magic link 登录；换设备能看到进度 |
| 主会话（我） | 验收与台账：维护本文件、复核各人结论、跑站点与题库回归；不碰业务代码 | — | 每人交付必须带 commit hash + 线上验证证据，缺一不签收 |

## 已完成（勿重复做）

- **讲义 4.5 十六题 + 2.5 #10 入库**（`61002ef`，JY4-128…143、JY2-054 点图选项），官方 243/243、24/24 节清零。
- **讲义 2.x 全部入库**（2.1 `6e7300a` / 2.2 `0235019` / 2.3 `ad1b592` / 2.4 `7cb7e7b` / 2.5 `4a2f313` / 2.6 `21bc683` / 2.7 `1017ddf`），剩 2.5 #10 一条挂在 α。
- **讲义 3.x 全部入库**（3.1 `0f078f1` / 3.2 `bad4eb5` / 3.3 `00cf518` / 3.4 `657e0a9` / 3.5+3.6 `27e3efa`），68 / 68 全绿。
- **讲义 4.1–4.4 入库**（4.1 `dde65b0` / 4.2 `234b58c` / 4.3 `f329e03` / 4.4 `fc10e43`），官方 U4 已录 36 / 52。
- **JY1-005 / JY1-040 选项图接线**（`523506c` + `6cc86cd`）：两题选项按钮各 4 张矢量图，2026-11-26 线上实测 `n=4 / svg=4`；缺口表状态由「待修」改「已修复」。
- **登录用户名映射**：`docs/sql/account-model.sql` 落地 `usernames` / `username_alias` / 三个 SECURITY DEFINER 函数；本库无 `profiles` 表，档案落 `public.progress`。设置入口回归脚本 `tools/verify_acct_entry.mjs`。**不要再按「无用户名映射」派活。**
- **文案 / 导航 / 窄屏（β 原 ①②）**：五项导航统一、品牌直指 `drill.html`、统一「错题回顾」、390 窄屏模考 `Section` 不再截断；三档 21 屏次 0 溢出，证据 `docs/VERIFY-2026-11-25.md` §7、截图 `docs/ui-shots/narrow-2026-11-25/`。
- **P0-1 模考旧存档修复**：闭合于 `30dfb0a`（恢复前校验 `m1Size`/`paper`/`endsAt`，残缺存档按官方 22/22 重建或明示过期），边界补强在 `114b81a`（作废不静默清零、模块二刷新、超时刷新）。回归证据：`test/session.test.js`（缺 `m1Size` 补 22、`m1Size=30` → expired/m1、`m1Size=0` → `sessionRange` 返回 null）。
- **P0-3 重复 Reference 已修**：同一笔 `30dfb0a`。核对：`exam.js:1122` 只渲染 `#btnReference` 一个入口，`app-ui.js:227` 的 `bindTools` 按配置单例绑定。
- **P1-4 练习页顶栏改回真实板块名**：`30dfb0a`；导航文案统一在 `332bfc4`（去掉「（JY1–JY4）」后缀）。
- **设置入口挂载**：`2a0d472`（侧栏 `site-rail`）+ `2269ce4`（做题视图整块隐藏侧栏时改挂顶部工具条右侧）+ **本轮修复**（`cloud-account.js`：结果页挂 `.drill-result-actions`、模考作答挂 `.exam-toolbar-actions`、检查/交卷/成绩走 fixed 右下角兜底，切回列表自动收回）。矩阵与坑见 `docs/settings-entry-coverage.md`；回归 `tools/verify_acct_entry.mjs` **26/26**。
- **qa.\* 测试账号清理**：2026-11-25 11:00 前后由总监在 Dashboard SQL Editor 执行，四表归零（`users=1 / names=0 / alias=0 / prog=0`），核对清单见 `docs/sql/cleanup-qa-verify.md`。

- **云主机归位（开发者④前半段）**：`~/SAT-Math-vm` 原在 `ca36aa8`，与 `54535f9` 逐字节相同（`git diff` 为空），已 `reset --hard origin/main`；现三份工作区一致。开发者只需做④剩下的「清僵尸副本」——**仅限确认无独有内容、且不是 `SAT-Math-Prep` 的副本**（云主机上疑似残留 `~/satrepo`、`~/satrepo-vm`，需逐个核对）。
- 任务台账 `docs/TASKS.md` 入库（`8f6e46c`、`ead8277`）。
- **1.7.T2「Topic 2 · 一元线性方程求解」22 题（18 grid + 4 MCQ，SP1-026…SP1-047）**：
  - 2026-11-19 逐题列式验算 22 题，未发现答案键错误（线上 `questions.js` 与本地一致）。
  - 2026-11-20 用户指认 SP1-046 题干识别有误：`data/text.js` 原显示 `2x + wy = 47`，按该式解得 w=33 与答案键 `value=11` 冲突；已订正为 `2x - wy = 47`（正确解 x=128、w=11），全量比对 `TD_BANK` 与 `TD_TEXT` 无其他实质差异。commit `3621497`，线上 `text.js` 令牌 `7206b62faa5a` 生效。
  - 复核：`node -e` 统计 `"section":"1.7.T2"` 共 22 条（grid 18 / mcq 4）；`grep -c '2x - wy = 47' data/text.js` 为 1。此前台账确实漏记该板块。

## 冲突与待澄清（开工前先看）

1. ~~阴影题数量对不上~~ 已定案，见下节「已定案（勿再问）」第 1 条，按 **5 道** 验收。
2. 题库口径：`data/questions.js` 实计 **1292**（2026-11-26）；`data/questions.json` 是**不维护的历史快照**（1009，见 `docs/transcribe-spec.md` §1），任何「题库 1009/1010」的旧说法都过期，一律以 js 实计为准。
3. **`SAT-Math-Prep` 边界（全员遵守，此前“可清理”结论作废）**：它是另一个线上仓库，不是本项目目标库。任何交付物、任务单、素材都**不许往里放**，也不许拿它当备份或第二信源；本机 `~/Work/SAT-Math-Prep` 副本**原样保留**——不删除、不改动、不往里提交（用户 2026-11-24 明确指示）。用本机凭据访问同样是 `Repository not found`，属于“无权限看到”，不等于已删除。

## 已定案（勿再问）

1. **阴影题 = 5 道（6 条记录）**。判据：`data/questions.js` 里题干含 `shaded region(s)` 的记录 6 条 —— `U1-12`、`U1-13`、`TD-15-01`、`TD-15-02`、`TD-15-03`、`R04-104`；其中 `U1-13` 与 `TD-15-01` 是同一题（练习册 P53 #1，同一张图，别名已在 `data/aliases.js`），去重后 **5 道**：U1-12、TD-15-01、TD-15-02、TD-15-03、R04-104。「4 道」只数了 TD-15 那组，漏了 U1-12 与 R04-104；验收一律按 5 道。
2. **`JY4-047` 已归并到 `TD-41-01`**（`data/aliases.js` 里 `"JY4-047":"TD-41-01"`）。同题实测：练习册 P200 #1，答案同为 D。归并只影响错题本（`wrong-page.js` 是唯一读 `TD_ALIAS` 的模块），错题只记一笔；讲义侧 `JY_BANK` 里的 JY4-047 照旧展示原页对照。此前并不上是因为 alias 成链（`U4-09 → TD-42-10 → JY4-055`）与 rank 倒挂，`4fc8f22` 的 chain-flatten + JY4 rank=3 已修掉这两个拦路条件，现在 `npm test` 142 全绿。
3. ~~2.5 #10 缓录~~ 已补（`61002ef`，`JY2-054` 点图选项），243/243 清零；此条作废。

## 签收规则

1. 回帖必须带：commit hash、改动文件清单、线上验证结果（截图或 HTTP/控制台证据）。
2. 只说「已推送」不算完成，要报 Pages 生效后的实测。
3. 两人动同一文件前先在群里报备，按 `AGENTS.md` 的分工边界避让。
