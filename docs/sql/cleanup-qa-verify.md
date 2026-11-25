# 清理后核对清单（qa.* 账号删除的善后）

> 配合 `docs/sql/cleanup-qa.sql`（删）与 `docs/sql/cleanup-qa.md`（怎么点）使用。
> 每一条都写清 **哪张表 · 哪一列 · 看什么数**，照做即可，不用读代码。
> 建议顺序：第 0 关（免 dashboard）→ 第 1–3 关（Dashboard SQL）→ 第 4 关（HTTP + UI）。
> 4A 必须在**清理前**做完，否则 410 的证据就没了 —— **现在已经没得做了：清理已于 2026-11-25 11:00 前后执行完毕。**
> **现状（2026-11-25 11:00 前后 · Dashboard SQL Editor 实测 · 由总监执行并读数，本文档直接采用，不再复跑）**
>
> | 关 | 指标 | 实测值 | 判定 |
> |---|---|---|---|
> | 0 | `public.usernames` `content-range` | `*/0` | 通过 |
> | 1 | `qa_users_left`（`auth.users`） | **0** | 通过 |
> | 2 | `qa_prog_left` / `orphan_prog`（`progress`） | **0 / 0** | 通过 |
> | 3 | `qa_alias_left` / `orphan_alias`（`username_alias`） | **0 / 0** | 通过 |
> | 总数 | `users` / `names` / `alias` / `prog` | **1 / 0 / 0 / 0** | 通过（`users=1` 是清理后 auth 用户总数，不是 qa 残留） |
>
> 删前基线：`qa` **10** / `names` **10** / `alias` **7** / `progress` **10**。口径是 **10，不是 11**（见 `cleanup-qa.md` 0-A 的差 1 说明）。
> 第 1–3 关：**已由总监实测通过**，下列 SQL 保留为复核 / 回归用，不必重跑。
> 4A：**已关闭、不可复现**（清理执行前未抓证）。410 的唯一可复现场景见 **4B（登录态改名流程）**。

## 0. 基数从哪来（已定案，不必再采）

清理已于 **2026-11-25 11:00 前后**执行，前后两份数如下，本文档直接采用：

| 表 | 删前 | 删后 | 来源 |
|---|---|---|---|
| `public.usernames` | 10（其中 `qa.*` 10、真人 0） | **0**（`content-range: */0`） | 删前：PostgREST 匿名只读 `content-range: 0-0/10`；删后：同一条 curl |
| `auth.users` 里 qa | **10** | **0** | Dashboard SQL Editor（`qa_users_left`） |
| `username_alias` 里 qa | **7** | **0** | Dashboard SQL Editor（`qa_alias_left`） |
| `public.progress` 里 qa | **10** | **0** | Dashboard SQL Editor（`qa_prog_left`） |
| 四表总量 | — | `users=1 / names=0 / alias=0 / prog=0` | Dashboard SQL Editor |

**口径是 10，不是 11**。差的那 1 个从未在名表 / alias / progress 落过行（注册中途失败），删前三个数（10 / 7 / 10）与它无关。

---

## 第 0 关（免 Dashboard · 最早能确认"名字表清干净"）

**实测结果：`content-range: */0` —— 通过**（2026-11-25，总监在 Dashboard 执行清理后、匿名 curl 复读）。

**查什么**：`public.usernames` 的 `username` 列总数。

```bash
curl -s -D - -o /dev/null \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Prefer: count=exact" \
  "$SUPA/rest/v1/usernames?select=username&limit=1"
```

**看什么**：响应头 `content-range`。

- 期望：`*/0`（空表）或 `0-0/0`。
- 失败：还是 `/10` → 名字表没删掉，回 `cleanup-qa.md` 第 3 步重跑（已删的行会 0 行，无害）。

---

## 第 1 关：`auth.users` 里 `qa.*` 应为 0 —— **已由总监实测通过（`qa_users_left = 0`）**

**查哪张表哪一列**：`auth.users` 的 **`email`** 列（不是 `username`，auth 里没有用户名字段；qa 账号的 email 是内部伪邮箱 `qa.<名字>@satmath.local`）。

```sql
-- 1.1 计数
select count(*) as qa_users_left
from auth.users
where email like 'qa.%@satmath.local';

-- 1.2 如果 1.1 不是 0，把残留列出来（只给 postgres 看得到）
select id, email, created_at, last_sign_in_at
from auth.users
where email like 'qa.%@satmath.local'
order by created_at;
```

**期望**：1.1 = **0**；1.2 = 0 行。

**陷阱**
- `like 'qa.%@satmath.local'` 同时要求「前缀 qa.」和「域名 satmath.local」，漏一个都会少算/多算。
- 只按 `email` 判，**不按** `raw_user_meta_data->>'username'`：改名不改 email（rename 只动 `usernames` / `username_alias`），按 metadata 会漏。
- 有残留且删不掉（报 `update or delete on table "users" violates foreign key...`）→ 先看第 2、3 关是不是还有子表行；或去 Authentication → Users 对该行点 **Delete user**。
- 删完若**总数**比预期少（不只少 qa 的那几个）→ 立刻停，按 `cleanup-qa.md` §6 走恢复，别继续删。

---

## 第 2 关：档案数据是否级联删干净 —— **已由总监实测通过（`qa_prog_left = 0`、`orphan_prog = 0`）**

**先纠一个口径**：本库**没有 `public.profiles` 这张表**（实测 `GET /rest/v1/profiles` 返回 `PGRST205 Could not find the table 'public.profiles' in the schema cache`）。
"档案"落在 **`public.progress`**，列是 `user_id / payload / nickname / updated_at`，主键按 `user_id` 冲突合并。
（`cleanup-qa.sql` 里第一条 delete 删的就是它。将来真建了 `profiles` 表，把下面 SQL 的表名与列名换成 `profiles` / `user_id` 即可，判定逻辑一样。）

```sql
-- 2.1 qa 账号在 progress 里还剩几行（按 user_id 关联 auth.users.email）
select count(*) as qa_progress_left
from public.progress p
where p.user_id in (select id from auth.users where email like 'qa.%@satmath.local');

-- 2.2 孤儿检查：progress 里存在、auth.users 里已经没有的 user_id（不限 qa，任何来源都算）
select count(*) as orphan_rows
from public.progress p
where not exists (select 1 from auth.users u where u.id = p.user_id);

-- 2.3 若 2.1 不是 0，列出具体 user_id 与 updated_at（不含内容，避免把答题数据贴到聊天里）
select p.user_id, p.nickname, p.updated_at
from public.progress p
where p.user_id in (select id from auth.users where email like 'qa.%@satmath.local')
order by p.updated_at;
```

**期望**
- 2.1 = **0**。
- 2.2 = **0**（如果 `progress` 对 `auth.users` 有 `on delete cascade`，删账号时已自动清；没有 cascade 就得靠 `cleanup-qa.sql` 第一条先删）。2.2 不为 0 时按 `cleanup-qa.md` §4 第二关的手法手工补删：
  ```sql
  delete from public.progress where user_id in (
    select p.user_id from public.progress p
    where not exists (select 1 from auth.users u where u.id = p.user_id)
  );
  ```
- 2.3 只在 2.1 非 0 时跑，用于定位。

**注意**：`progress` 也可能有**真人**行（若历史上有真人账号）。删完 `qa` 行后 `progress` 总数不为 0 是正常的，**只看 2.1 / 2.2 这两个 qa/孤儿指标**，别拿总数卡。

---

## 第 3 关：`username_alias` 是否还留着已删账号的旧名 —— **已由总监实测通过（`qa_alias_left = 0`、`orphan_alias = 0`）**

**查哪张表哪几列**：`public.username_alias` 的 **`username`**（旧名，主键）、**`email`**（旧名的内部伪邮箱）、**`user_id`**（所属账号）。
这张表 **不给 anon / authenticated 任何策略**，只有 `SECURITY DEFINER` 函数能碰，所以**只能**在 Dashboard 的 `postgres` 里查。

```sql
-- 3.1 qa 旧名剩几行
select count(*) as qa_alias_left
from public.username_alias
where username like 'qa.%'
   or email like 'qa.%@satmath.local';

-- 3.2 孤儿：旧名行的 user_id 在 auth.users 里已不存在（不限 qa）
select count(*) as orphan_alias
from public.username_alias a
where not exists (select 1 from auth.users u where u.id = a.user_id);

-- 3.3 若 3.1 非 0，列出来（这三列就是全部，没有敏感内容）
select username, email, user_id, created_at
from public.username_alias
where username like 'qa.%' or email like 'qa.%@satmath.local'
order by created_at;
```

**期望**：3.1 = **0**、3.2 = **0**、3.3 = 0 行。

**为什么两个条件都查**：`cleanup-qa.sql` 按 `user_id` 删 alias；如果某条 alias 的 `user_id` 当初没写全（旧环境遗留），只按 `user_id` 会漏 → 所以 3.1 用 `username` / `email` 再兜一遍。真漏了补一条：

```sql
delete from public.username_alias
where username like 'qa.%' or email like 'qa.%@satmath.local';
```

**别误删真人曾用名**：条件里咬死 `qa.` 前缀 / `qa.` 邮箱，不要写成 `delete from public.username_alias where user_id in (...)` 之外的模糊条件。

---

## 第 4 关：旧名登录必须回 410，现役名回 200

> **⚠️ 判读前必读（本轮最重要的一句）**
> **库内没有该旧名时，旧名探测的正确期望是「用户名不存在」，不是 410**：
> `resolve_login('<旧名>')` → `null`，`is_retired_username('<旧名>')` → `false`，客户端回 **404 `auth/username-not-found`**（文案「没有找到这个用户名。」）。
> **410 只在「别名表里还留着该旧名」时成立**（`is_retired_username` → `true` → `auth/username-retired`）。
> 清理已把 qa 的 alias 删净，所以现在拿 qa 旧名验 410 **必然**得到 404 —— 这是正确结果，**不要按旧验收单判失败**。
> 410 的唯一可复现场景是 **4B 的登录态改名流程**（账号改名后 alias 里才留旧名，此时才该出 410）。

### 先说清机制（决定这条在什么时候做）

客户端登录不是直查表，是两跳（`supa-cloud.js` 的 `loginEmail`）：

1. `POST /rest/v1/rpc/resolve_login {p_username}` → 只查**现役名**（`public.usernames.username`），返回内部伪邮箱；
2. 返回空 → 再 `POST /rest/v1/rpc/is_retired_username {p_username}` → 查 `public.username_alias.username`；
   命中就 `throw errOf(410, {code:'auth/username-retired', msg:'这个用户名已经改过名，请用新用户名登录。'})`；
   不命中才 404 `auth/username-not-found`；
3. 拿到邮箱才 `POST /auth/v1/token?grant_type=password`。

**所以 410 的前提是「旧名还躺在 `username_alias` 里」。** 清理把 qa 账号连同 alias 一起删了（`qa_alias_left = 0`，第 3 关实测）——**现在 qa 旧名再登录只会是 404，不是 410**（这是删除后的正确语义，不是 bug，判读见 4C）。
要复现"旧名 410"，**唯一**的场景是 **4B：登录态下把一个账号改名**（改名动作本身往 `username_alias` 写入旧名，此时才该出 410）。"清理前抓证"那条路（4A）已随清理执行而永久关闭。

### 4A（❌ 已关闭、不可复现 —— 仅作历史记录，不要照着跑）

**状态：作废。** 清理已于 2026-11-25 11:00 前后由总监执行完毕，执行前没有抓这条证据，窗口不可回溯；现在按这套流程打，只会得到 404（因为 alias 里已无该旧名）。
下面留着是为了说明「当时如果抓，该怎么抓」，**不代表仍待办**。

用现存的、改过名的 qa 账号（`username_alias` 里能查到的那个旧名，姑且记作 `<old>`，新名记作 `<new>`）：

```bash
# 旧名：应返回空（null）
curl -s -X POST "$SUPA/rest/v1/rpc/resolve_login" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"p_username":"<old>"}'

# 旧名是否"已改名"：应为 true
curl -s -X POST "$SUPA/rest/v1/rpc/is_retired_username" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"p_username":"<old>"}'

# 新名：应返回 "<new>@satmath.local"
curl -s -X POST "$SUPA/rest/v1/rpc/resolve_login" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"p_username":"<new>"}'
```

UI 侧（同一时刻，浏览器）+ 一张截图：
- 设置 → 账户 → 用 `<old>` + 密码登录 → `.td-acct-err` = 「这个用户名已经改过名，请用新用户名登录。」（= 410）
- 用 `<new>` + 密码登录 → `.td-acct-err` 为空，档案页出现。

### 4B（★ 410 的唯一可复现场景：登录态改名流程 · 造一对临时账号，做完即删）

只有「账号先存在、再改名」这一步会在 `username_alias` 留下旧名，410 才成立。**验收 410 请只走这条。**

```text
1. 注册 tmpA（用户名形如 tp<时间戳>，别用 qa. 前缀，免得和第 3 关混淆）
2. 改名 tmpA → tmpB（设置 → 账户 → 改用户名）
3. 旧名 tmpA 登录 → 应 410；新名 tmpB 登录 → 应成功
4. 截图存 docs/account-evidence/（文件名别带明文名）
5. 删掉这对：
```

```sql
delete from public.progress       where user_id in (select id from auth.users where email like 'tp%@satmath.local');
delete from public.username_alias where user_id in (select id from auth.users where email like 'tp%@satmath.local');
delete from public.usernames      where user_id in (select id from auth.users where email like 'tp%@satmath.local');
delete from auth.users            where email like 'tp%@satmath.local';
```

### 4C（清理后对 qa 旧名的正确期望：**“用户名不存在”，不是 410**）

| 动作 | 接口 | 期望 | 说明 |
|---|---|---|---|
| `resolve_login('<qa 旧名>')` | `POST /rest/v1/rpc/resolve_login` | **null** | 现役名表 `names = 0`，查不到 |
| `is_retired_username('<qa 旧名>')` | `POST /rest/v1/rpc/is_retired_username` | **false** | 别名表 `alias = 0`，旧名已被删净 |
| 客户端用 `<qa 旧名>` 登录 | UI | **404** `auth/username-not-found`，文案「没有找到这个用户名。」 | **不是 410**，符合预期 |

**判读**：出现 404 是**正确**结果（等价于“用户名不存在”），不要判失败。
若这里出现 410（`is_retired_username` = true），才说明 alias 没删干净 → 回第 3 关。

---

## 收尾（勾完再收工）

- [x] 第 0 关 `content-range` = `*/0`（总监实测）
- [x] 第 1 关 `qa_users_left` = 0（总监实测）
- [x] 第 2 关 `qa_prog_left` = 0、`orphan_prog` = 0（总监实测）
- [x] 第 3 关 `qa_alias_left` = 0、`orphan_alias` = 0（总监实测）
- [x] 总量 `users / names / alias / prog` = `1 / 0 / 0 / 0`（总监实测）
- [x] 4A **已关闭、不可复现**（清理前未抓证，作废，不判欠账）
- [ ] 4C 交 404「用户名不存在」的复核（qa 旧名）**或** 4B 交 410（临时对，验完即删）—— 二选一即可
- [ ] 浏览器里退出登录 / 清 `localStorage`：qa 账号的 session token 还有效，别拿旧 tab 继续点
- [ ] `docs/account-model.md` §五 补一行实测：`清理 qa.* 10 个；users=?→1、names=10→0、alias=7→0、progress=10→0`（`users` 删前值待总监补）
- [ ] 仓库明文扫描：`grep -rIoE 'qa\.[a-z0-9]{2,}' docs --include='*.md'` 只剩 `qa.%` 通配与 `<qa-NN>` 占位（`cleanup-qa.sql` 文件名会误命中，忽略）
- [ ] 仓库明文扫描：`grep -rIoE 'qa\.[a-z0-9]{2,}' docs --include='*.md'` 只剩 `qa.%` 通配与 `<qa-NN>` 占位（`cleanup-qa.sql` 文件名会误命中，忽略）

## 失败速查

| 现象 | 最可能的原因 | 去哪查 |
|---|---|---|
| 名字表 curl 仍 `/10` | `usernames` 没删到（清理未跑或顺序反了）；现测应为 `*/0` | 第 0 关 → `cleanup-qa.md` §3 |
| `qa_users_left` ≠ 0 且删不掉 | 子表还有行（`progress` / `alias`），或该用户有活跃 session | 第 2、3 关；Authentication → Users 手动 Delete user |
| `qa_progress_left` ≠ 0 但账号已没了 | `progress` 缺 `on delete cascade` | 第 2 关 2.2 的补删 SQL |
| `qa_alias_left` ≠ 0 但 `qa_users_left` = 0 | alias 的 `user_id` 当初没写全，按 `user_id` 删漏了 | 第 3 关的兜底 delete（按 `username` / `email`） |
| 旧名登录回 404 而不是 410 | alias 行已随账号删净（**清理后的正确语义**，等价“用户名不存在”） | 正常，不判失败；要 410 证据走 4B |
| 旧名登录回 410 但账号已删 | alias 行没删干净 | 第 3 关，期望 `is_retired_username` = false |
