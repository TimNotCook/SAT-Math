# 清理 qa.* 测试账号 · 执行手册（Supabase Dashboard）

> 给 Tim 用的一页纸。照着点，不用读代码。SQL 只在 `docs/sql/cleanup-qa.sql` 里有那一份，别另抄。
> 目标：删掉全部 `qa.*` 实测账号（内部伪邮箱 `qa.<名字>@satmath.local`）及它们在 `usernames` / `username_alias` / `progress` 里的连带数据，不碰任何真实账号。
> 账号口径 **11 个**；2026-11-25 只读实测 `usernames` 里只见到 **10 行**现役名，差的 1 个在第 2 步复核（见「0-A 执行前基线」）。
> 脱敏：文中 `<qa-NN>` 为占位符，仓库里不留明文测试账号名与密码。

## 0-B. 复核快照（2026-11-25 12:05 UTC+8 · 同一条只读通道）

同一条 curl 再打一次，`content-range` 已是 **`*/0`**，`usernames` 全表 **0 行**（`qa.*` 0 / 真人 0）。

- 含义：清理里「删 `public.usernames`」这一条**已生效**（谁跑的、跑没跑完另外三张表，本文档判断不了）。
- `0-A` 的 10 行是**执行前**快照，**保留原样留档，别改成 0**——两份数是「前 / 后」，不是矛盾。
- 后果：`cleanup-qa-verify.md` 的 **4A（清理前抓旧名 410）窗口已关闭**，410 证据只剩 **4B（另造临时对复验并回收）**这一条路。
- 还没验的：`auth.users` / `username_alias` / `progress` 三处仍需 Dashboard，见 `cleanup-qa-verify.md` 第 1–3 关。

## 0-A. 执行前基线（2026-11-25 11:02 UTC+8 · 只读通道实测 · 已脱敏）

**通道**：PostgREST + 项目 publishable key（`cloud-config.js` 里那把公开 key），匿名角色 `anon`，**只读**。
授权现状决定了能看到什么：`public.usernames` 对 anon 的行级策略是 `usernames_select_anon using (true)`（全表放开），列级只给 `username` / `user_id`。

```bash
curl -s -D - -o names.json \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Prefer: count=exact" \
  "$SUPA/rest/v1/usernames?select=username,user_id&limit=200"
# 响应头 content-range: 0-0/10  → 全表 10 行，limit=200 没截断
```

**实测结果（只报数量与形态，不写具体名）**

| 项 | 实测 | 说明 |
|---|---|---|
| `public.usernames` 总行数 | **10** | `content-range: 0-0/10` |
| 其中 `qa.*` | **10** | 占 100%，一条真人名都没有 |
| 其中真人现役名 | **0** | 删 `timalpha` + 探针邮箱后，线上已无真人账号 |
| 形态（字母位记 a、数字位记 9） | `qa.aa999999` ×5 · `qa.aaa999999` ×3 · `qa.a999999` ×2 | 长度 10–12，全部符合 `^[a-z0-9][a-z0-9._-]{2,19}$` |
| 去重 `user_id` | **10** | 一账号一行，无重复绑定 |

**这个通道拿不到什么（所以第 2 步仍必须在 Dashboard 跑）**

- `public.username_alias` / `public.progress`：anon 无授权，实打 `401 42501 permission denied`。
- `auth.users`：不在 PostgREST 暴露的 schema，任何前端 key 都读不到。
- `public.profiles`：**本库没有这张表** —— `GET /rest/v1/profiles` 返回 `PGRST205: Could not find the table 'public.profiles' in the schema cache`。真实档案表是 `public.progress`（列 `user_id / payload / nickname / updated_at`），核对时别去等一张不存在的表。

**和「11 个」口径差 1**

只读通道看到 10 行现役名，口径是 11 个 qa 账号。差的 1 个大概率是「auth 用户建成了、`usernames` 行没写成」（注册中途失败）。清理按 `email like 'qa.%@satmath.local'` 命中 auth 用户，**不受这 1 个影响**。
执行前务必先用第 2 步 2.2 的 `qa_users` 复核：是 11 就按 11 删，`qa_names` 会是 10。

**清理后应为（期望值）**

| 表 | qa 行（清理前） | 清理后 qa 行应剩 |
|---|---|---|
| `auth.users` | 以 2.2 `qa_users` 为准（口径 11） | **0** |
| `public.usernames` | **10**（实测） | **0** |
| `public.username_alias` | 以 2.2 `qa_alias` 为准（改名过的账号） | **0**（全表可能仍 >0：真人曾用名不受影响） |
| `public.progress` | 以 2.2 `qa_progress` 为准（只算真做过题的） | **0** |
| 真人现役名 | **0** | **0**（删完不会"少人"——线上本来就没有真人账号） |

**不用 Dashboard 就能先验的一条**：清理后重跑上面那条 curl，`content-range` 应变成 `*/0`（或 `0-0/0` 空结果）。这是最早能确认"名字表真删干净"的信号。

## 0. 动手前先知道三件事

1. **删了不可逆**。账号、用户名、曾用名、学习档案一起没。想留证据就先在下面第 2 步把 `qa.*` 名单复制到本地（`docs/account-evidence/` 已经有一份 14 步序列截图，够了就不用再存）。
2. **只用 Dashboard 的 SQL Editor**（postgres 角色）。不要拿 `service_role` key 去 PostgREST 删，也不要在浏览器控制台里删。
3. **SQL 里的注释写着 7 个，是 11-25 早上两机序列的旧数**；Tim 口径现在是 **11 个**。以第 2 步实测名单为准：**不是 11 行就停下，把多出来的名字记下来再决定**，别硬跑。

## 1. 打开 SQL Editor

| 步骤 | 点哪里 | 看到什么 |
|---|---|---|
| 1 | 打开 `https://supabase.com/dashboard` → 选中项目 **sat-math** | 项目概览页 |
| 2 | 左侧栏 **SQL Editor** → 右上 **New query** | 空白编辑区，右上角是 Run（或 `Ctrl/⌘ + Enter`） |
| 3 | 确认编辑器左上显示的是 `postgres` / 项目名 | 不是的话先切项目，别在别的项目跑 |

## 2. 盘点 + 记基线（先跑这一段，不改数据）

把下面整段贴进 New query，Run 一次。**这一段全是 select，删不了东西。**

```sql
-- 2.1 名单（应有 11 行；多于/少于 11 都停）
select id, email, created_at
from auth.users
where email like 'qa.%@satmath.local'
order by email;

-- 2.2 每张表里 qa.* 的行数（后面算“应剩多少”要用）
select
  (select count(*) from auth.users            where email like 'qa.%@satmath.local') as qa_users,
  (select count(*) from public.usernames      where user_id in (select id from auth.users where email like 'qa.%@satmath.local')) as qa_names,
  (select count(*) from public.username_alias where user_id in (select id from auth.users where email like 'qa.%@satmath.local')
                                                     or username like 'qa.%')                                                   as qa_alias,
  (select count(*) from public.progress       where user_id in (select id from auth.users where email like 'qa.%@satmath.local')) as qa_progress;

-- 2.3 四表当前总数（基线）
select
  (select count(*) from auth.users)              as users,
  (select count(*) from public.usernames)        as names,
  (select count(*) from public.username_alias)   as alias,
  (select count(*) from public.progress)         as prog;
```

把两个结果填进这张表（**手写下来**，下一步要对）：

| 表 | 跑前基线（2.3 的数） | 其中 qa 行数（2.2 的数） | 跑后应为（基线 − qa） |
|---|---|---|---|
| `auth.users` | ______ | ______ | ______ |
| `public.usernames` | ______ | ______ | ______ |
| `public.username_alias` | ______ | ______ | ______ |
| `public.progress` | ______ | ______ | ______ |

判定线：`qa_users` 以口径 11 为准（第 2 步实测），`qa_names = 10`（2026-11-25 只读实测 10 行；注册中途失败的那 1 个没有名字行），`qa_alias` 只算改过名的账号（11-25 序列里改过 `<qa-01>→<qa-02>`、`qa.seq…→qa.sq…`，所以是 **2~11 之间**，具体看 2.2 给的数），`qa_progress` 只算真做过题的账号（**可能小于 11**，看 2.2）。**别用“应该都是 11”去卡 progress**——没做过题的账号本来就没有档案行。

## 3. 执行删除（就一份 SQL）

1. 打开仓库里的 **`docs/sql/cleanup-qa.sql`**，整段复制（4 条 `delete` + 末尾 1 条 `select`）。
2. 粘到 SQL Editor 的新查询里，**整段一次 Run**（顺序是 progress → username_alias → usernames → auth.users，倒着删外键才不会报错，别自己调顺序）。
3. 看到结果区返回一行计数（`users / names / alias / prog`），这就是删完的四表总数。

## 4. 跑完怎么核（三关，全过才算完）

**第一关：四表总数等于表里算的「跑后应为」**

再跑一遍下面这段，四个数和第 2 步算的「跑后应为」逐个对：

```sql
select
  (select count(*) from auth.users)              as users,
  (select count(*) from public.usernames)        as names,
  (select count(*) from public.username_alias)   as alias,
  (select count(*) from public.progress)         as prog;
```

**第二关：qa.* 在四张表里应为 0**

```sql
select
  (select count(*) from auth.users            where email like 'qa.%@satmath.local') as users_left,
  (select count(*) from public.usernames      where user_id in (select id from auth.users where email like 'qa.%@satmath.local')) as names_left,
  (select count(*) from public.username_alias where username like 'qa.%')                                                          as alias_left,
  (select count(*) from public.progress       where user_id in (select id from auth.users where email like 'qa.%@satmath.local')) as prog_left;
```

四个都必须 **0**。`alias_left` 不为 0 而 `users_left` 是 0，说明曾用名表里有孤儿行（旧环境下 `user_id` 没写全），手工再删一次 `delete from public.username_alias where username like 'qa.%';` 再核。

**第三关：真实账号没被误伤**

- Supabase Dashboard → **Authentication → Users**：按 created_at 倒序看一眼，剩下的是真实账号；翻到最老的一条，确认不是 `qa.` 开头。
- 抽一个真实名去登录页试：能登进去、云端档案还在（`progress` 行的数量没掉得比预期多）。
- 别在浏览器里用刚才 qa 账号的旧 session 继续点——本地 `localStorage` 里的 token 还有效，先退出登录 / 清缓存。

## 5. 收尾（三件事，别漏）

1. 在 `docs/account-model.md` 末尾记一行：`2026-11-25 清理 qa.* 账号 N 个；四表基数 users=X→X-N、names=…`（把实际数抄进去，别只写“已清理”）。
2. 如果 `docs/sql/cleanup-qa.sql` 顶部注释的「7 个」和你实测的 11 不一致，顺手把注释改成实测数（那是文档，不改逻辑）。
3. Dashboard → **Settings → API** 不用动；本次没换 key。

## 6. 出问题怎么办

| 现象 | 原因 | 处理 |
|---|---|---|
| `delete from auth.users` 报外键错 | 先删了父表或顺序反了 | 回第 3 步，严格按 `cleanup-qa.sql` 的顺序重跑（前面已删的会 0 行，无害） |
| 删完 `auth.users` 少了不止 11 行 | `like 'qa.%@…'` 把真实账号也命中了（比如有人真叫 qa.xxx） | 立刻停，从 Dashboard 的 **Backups / PITR** 恢复；没有备份就先按第 2 步名单人工核对，别继续删 |
| 某个 qa 账号删不掉（Auth 里还在） | 有未过期的 session / 触发器 | Authentication → Users 里对该用户 **Delete user** 按钮删一次 |
| `progress` 剩的比预期多 | 2.2 那步的 `qa_progress` 本来就不是 11，按实际差值核 | 用第二关的 `prog_left=0` 判定，别追总数 |
