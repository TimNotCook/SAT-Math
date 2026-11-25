# TASKS.md — 任务单与验收台账

> 最后更新：2026-11-25（HK）｜维护：主会话「当前工作进度」

> **线上读取提醒**：GitHub Pages 对 `docs/` 的 CDN 为 `Cache-Control: max-age=600`。推完 10 分钟内读到旧内容属正常，先看响应头 `age` 再下结论，别当漏推。
>
> **本表怎么更新**：凡「已实测」项都写明量它的命令，禁止手填记忆值。复核时照命令重跑一次即可对账。

## 铁律（权威定义：`AGENTS.md` →「🚨 铁律：一切成果只认线上仓库」）

**所有东西只放线上仓库 `TimNotCook/SAT-Math`，不放线下。** 细则以 `AGENTS.md` 为准，这里只记本项目落地动作：

- 唯一权威版本 = `origin/main`；交付前用 `git ls-remote origin refs/heads/main` 核对哈希。
- 现存本地工作区（草稿区，不承载独有内容）：Mac `~/Work/SAT-Math`、Mac `~/Work/SAT-Math-live`、云主机 `~/SAT-Math-vm`。
- 推送走 `safe_push.sh`，禁止 `git push --force`。
- `TimNotCook/SAT-Math-Prep` 是**另一个线上仓库**，不是本项目目标库；本项目唯一写入目标是 `SAT-Math`。对它的 404 属于“无权限看到”，不等于已删除，不要据此推断。

## 基线快照（2026-11-25 实测，附量法）

| 项 | 值 | 怎么量的 |
|---|---|---|
| `origin/main` | `97613d0` | `git ls-remote origin refs/heads/main` |
| 线上页面 | `index` / `drill` / `exam` / `wrong` / `jiangyi` 全部 HTTP 200 | `curl -s -o /dev/null -w "%{http_code}" https://timnotcook.github.io/SAT-Math/<page>.html` |
| 题库 | **1010** 题：easy 281 / medium 565 / hard 164；mcq 641 / grid 369 | `node -e` 起 `vm` 跑 `data/questions.js`，按 `level` 与 `type` 计数（注意字段名是 `level`，没有 `difficulty`） |
| 单元分布 | 1–268 / 2–204 / 3–453 / 4–85 | 同上一条脚本，按 `unit` 计数 |
| 登录后端（线上实况） | **Supabase 已启用**（用户名即身份：`usernames` / `username_alias` / `resolve_login`；`cloud-config.js` 里 `url` + `anonKey` + `emailDomain: 'satmath.local'`）；WorkBuddy `endpoint` + `publishableKey` 仍在；GitHub 令牌通道在 | `sed -n '1,30p' cloud-config.js`；`git show origin/main:supa-cloud.js` |
| Firebase 状态 | 模块已摘除：`firebase-cloud.js` 与 `vendor/firebase/` 均不存在，五页无引用，CSP 无 firebase 域名 | `ls firebase-cloud.js vendor/firebase`；`grep -c firebase-cloud *.html` |
| Supabase 迁移分支 | `backup/supabase-auth-5a0c22b` 仍存在且**未合并**（`git merge-base --is-ancestor 5a0c22b origin/main` 退出码 1） | 同左命令 + `git ls-remote --heads origin` |

## 分工表（2026-11-24 老板下发，逐字保留）

| 人 | 任务 | 根因 | 验收 |
|---|---|---|---|
| 编程者 | ① 修模考旧存档兼容（P0-1）✅**已闭合**（`30dfb0a`，边界补强 `114b81a`）：恢复前校验 `m1Size`/`paper`/`endsAt`，缺失就重建模块一，或明示「存档已过期，请重新开始」；② 去掉重复 Reference（P0-3）✅**已闭合**（`30dfb0a`）；③ 练习页顶栏改回真实板块名（P1-4）✅**已闭合**（`30dfb0a`，文案统一 `332bfc4`） | `restoreOrIntro` 无字段校验；shell 硬编码 | 三种存档（旧/新/残缺）都能正常开考；练习页顶栏显示「1.1 线性方程与函数图像」；题面只有一个 Reference |
| 码农 α | 登录收尾：补用户名映射表、补档案表让云同步真正可用；顺带回归设置面板账户页（三条通道 + 忘记密码）— **用户名映射表已落地**（`docs/sql/account-model.sql`：`usernames` / `username_alias` / 三个 SECURITY DEFINER 函数）；**本库没有 `profiles` 表，档案落在 `public.progress`**（列 `user_id / payload / nickname / updated_at`） | 无 `profiles` 表 | 三条通道真机登录；换设备登录能看到进度；设置面板各页签无遮挡；设置入口四视图可见（回归脚本 `tools/verify_acct_entry.mjs`） |
| 码农 β | ① 统一文案（P1-5）并品牌/导航对齐（P1-7）；② 修窄屏溢出（P2-8）；③ 清 Firebase 死代码和 CSP 白名单；④ 删掉「题库 1009 题」 | 多套模板并存、无 i18n 层 | 四页导航项完全一致、品牌统一；390/655/1280 三档无溢出；CSP 报错 0 |
| 开发者 | ① 给 4 道阴影题补 `region`（P0-2），并按原题 PDF 核对阴影方向；② 批量修数学排版（P1-6）：`f (x)`→`f(x)`、`(2/3)` 去掉括号、问号前空格；③ 建一条自动校验：题干含 shaded 但 spec 无 `region` 就报错；④ 云主机 reset 到 `origin/main`，清掉僵尸副本；⑤ Unit 4 那 9 道精编原题已迁入讲义复习 JY4（教材原题子组，练习册 P200–207），真题侧不再保留隐藏板块 | figure spec 缺字段、文本从 PDF 带病导入 | 5 道阴影题逐个截图与原题一致；校验脚本能拦住下次同类错误；题库仍 1009 且判分回归全过 |
| 主会话（我） | 验收与台账：维护本文件、复核各人结论、跑站点与题库回归；不碰业务代码 | — | 每人交付必须带 commit hash + 线上验证证据，缺一不签收 |

## 已完成（勿重复做）

- **P0-1 模考旧存档修复**：闭合于 `30dfb0a`（恢复前校验 `m1Size`/`paper`/`endsAt`，残缺存档按官方 22/22 重建或明示过期），边界补强在 `114b81a`（作废不静默清零、模块二刷新、超时刷新）。回归证据：`test/session.test.js`（缺 `m1Size` 补 22、`m1Size=30` → expired/m1、`m1Size=0` → `sessionRange` 返回 null）。
- **P0-3 重复 Reference 已修**：同一笔 `30dfb0a`。核对：`exam.js:1122` 只渲染 `#btnReference` 一个入口，`app-ui.js:227` 的 `bindTools` 按配置单例绑定。
- **P1-4 练习页顶栏改回真实板块名**：`30dfb0a`；导航文案统一在 `332bfc4`（去掉「（JY1–JY4）」后缀）。
- **设置入口挂载**：`2a0d472`（侧栏 `site-rail`）+ `2269ce4`（做题视图整块隐藏侧栏时改挂顶部工具条右侧）。**已知缺口**：结果视图里 `site-rail` 与 `.drill-context-right` 同时不可见（`app.css:532-537` 的冻结规则），此时按钮 `width=0`——见 `tools/verify_acct_entry.mjs` 的两条红项，待编程者评估宿主。
- **qa.\* 测试账号清理**：2026-11-25 11:00 前后由总监在 Dashboard SQL Editor 执行，四表归零（`users=1 / names=0 / alias=0 / prog=0`），核对清单见 `docs/sql/cleanup-qa-verify.md`。

- **云主机归位（开发者④前半段）**：`~/SAT-Math-vm` 原在 `ca36aa8`，与 `54535f9` 逐字节相同（`git diff` 为空），已 `reset --hard origin/main`；现三份工作区一致。开发者只需做④剩下的「清僵尸副本」——**仅限确认无独有内容、且不是 `SAT-Math-Prep` 的副本**（云主机上疑似残留 `~/satrepo`、`~/satrepo-vm`，需逐个核对）。
- 任务台账 `docs/TASKS.md` 入库（`8f6e46c`、`ead8277`）。
- **1.7.T2「Topic 2 · 一元线性方程求解」22 题（18 grid + 4 MCQ，SP1-026…SP1-047）**：
  - 2026-11-19 逐题列式验算 22 题，未发现答案键错误（线上 `questions.js` 与本地一致）。
  - 2026-11-20 用户指认 SP1-046 题干识别有误：`data/text.js` 原显示 `2x + wy = 47`，按该式解得 w=33 与答案键 `value=11` 冲突；已订正为 `2x - wy = 47`（正确解 x=128、w=11），全量比对 `TD_BANK` 与 `TD_TEXT` 无其他实质差异。commit `3621497`，线上 `text.js` 令牌 `7206b62faa5a` 生效。
  - 复核：`node -e` 统计 `"section":"1.7.T2"` 共 22 条（grid 18 / mcq 4）；`grep -c '2x - wy = 47' data/text.js` 为 1。此前台账确实漏记该板块。

## 冲突与待澄清（开工前先看）

1. **码农 β③「清 Firebase 死代码」会打断码农 α 的登录收尾**。Firebase 不是死代码：`drill.html` 明确引入 `firebase-cloud.js`，`cloud-config.js`/`cloud-account.js` 都在调它，Google 与邮箱密码通道依赖它。建议改为「仅清 Supabase 迁移后确认无用的调用」，等码农 α 的三通道回归过了再动。
2. **阴影题数量对不上**：开发者①写「4 道」，验收写「5 道」。需要老板给准数，否则验收无法判定。
3. 「删掉题库 1009 题」（码农 β④）删的是**页面文案**，不是题目；题库仍须 1009 题，与开发者验收里的「题库仍 1009」不冲突。
4. **`SAT-Math-Prep` 边界（全员遵守，此前“可清理”结论作废）**：它是另一个线上仓库，不是本项目目标库。任何交付物、任务单、素材都**不许往里放**，也不许拿它当备份或第二信源；本机 `~/Work/SAT-Math-Prep` 副本**原样保留**——不删除、不改动、不往里提交（用户 2026-11-24 明确指示）。用本机凭据访问同样是 `Repository not found`，属于“无权限看到”，不等于已删除。

## 签收规则

1. 回帖必须带：commit hash、改动文件清单、线上验证结果（截图或 HTTP/控制台证据）。
2. 只说「已推送」不算完成，要报 Pages 生效后的实测。
3. 两人动同一文件前先在群里报备，按 `AGENTS.md` 的分工边界避让。
