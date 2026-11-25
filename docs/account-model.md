# 账号模型：用户名即身份（2026-11-25）

## 一、结论
- 身份 = **用户名**；Supabase Auth 里的邮箱是内部伪邮箱 `<用户名>@satmath.local`，用户不填、界面不显示。
- 注册只收 `用户名 + 密码`；登录只收 `用户名 + 密码`；改名只改用户名，**不动 auth.users.email**（前端没有 service role key，也不需要）。
- 匿名端读不到邮箱：`email` 列没有给 anon 授权，登录查名走 RPC（见三）。

## 二、表结构（public）
| 表 | 列 | 说明 |
|---|---|---|
| `usernames` | `username`(PK)、`user_id`(unique)、`email`、`created_at`、`updated_at` | 现役用户名 → 内部伪邮箱 |
| `username_alias` | `username`(PK)、`email`、`user_id`、`created_at` | 曾用名 → 内部伪邮箱（只有伪邮箱，无隐私） |

唯一性：`usernames_username_uq(username)`、`usernames_user_id_uq(user_id)`、`username_alias` 主键即旧名唯一。
旧的 `uid` 列已重命名为 `user_id`。

## 三、RLS 与列级授权（选了「列级授权 + RPC」，不是全表开放）
策略：
- `usernames_select_anon`（anon, SELECT, `true`）——只能配合列级授权读 `username / user_id`
- `usernames_select_self`（authenticated, SELECT, `user_id = auth.uid()`）
- `usernames_insert_self`（authenticated, INSERT, `WITH CHECK user_id = auth.uid()`）
- `usernames_update_self`（authenticated, UPDATE, `USING user_id = auth.uid()` + `WITH CHECK user_id = auth.uid()`）
- `username_alias` 开启 RLS，**不给 anon / authenticated 任何策略**，只有 SECURITY DEFINER 函数能碰

列级授权（`revoke all` 之后逐列 grant）：
- `anon`：`select (username, user_id)` —— **没有 email**
- `authenticated`：`select (username, user_id, created_at, updated_at)`、`insert (username, user_id, email)`、`update (username, email, updated_at)`

函数：
- `resolve_login(p_username text) returns text`（SECURITY DEFINER，`execute` 给 anon）：先查 `usernames`，再查 `username_alias`，只返回内部伪邮箱
- `rename_username(p_new text) returns text`（SECURITY DEFINER，`execute` 只给 authenticated）：校验 `auth.uid()`、校验新名在两张表都未被占，旧名写入 `username_alias`，再改 `usernames.username`，一次事务内完成

## 四、客户端
- `supa-cloud.js`：`register(username, pw)` → `signUp(pseudoEmail)` → 写 `usernames` 行；`signInEmail(username, pw)` → `rpc/resolve_login` 取伪邮箱 → `signInWithPassword`；`renameUsername(newName)` → `rpc/rename_username`
- `cloud-account.js`：面板只有「用户名」「密码」，档案页加「用户名（登录用）+ 改用户名」，不再出现邮箱字段
- `cloud-config.js`：新增 `supabase.emailDomain = 'satmath.local'`

## 五、清理记录
- 2026-11-25 08:09 HKT（00:09 UTC）：已清理测试账号 `timalpha`（Auth 邮箱 satmath.demo1@qq.com）与探针 `satmath-probe2@qq.com`；连带删掉它们的 `usernames` / `username_alias` / `progress` 行，`auth.identities` 一并清。
- 清理后实测：`auth.users` 剩 1（`satmath-probe@qq.com`，无用户名、从未登录，属遗留探针）；`usernames` 0 行、`username_alias` 0 行、`progress` 0 行。

## 六、验收记录（2026-11-25）
### 1) 两台独立浏览器（两个全新 Chrome profile，各不带任何登录态）
序列与结果（浏览器内走站点自己的 `TDSUPA` 客户端，`?v=621ebd047247`）：
```
A register  -> {"ok":1,"user":"qa.web3","uid":"58be7744-9358-4d25-8bd5-8e2082137ec4"}
A archive   -> {"arch":{"n":0}}
A signOut   -> {"user":false}
B signIn    -> {"ok":1,"user":"qa.web3","uid":"58be7744-9358-4d25-8bd5-8e2082137ec4"}   # A、B 同 uid
B archive   -> {"arch":{"n":0}}                                                       # 快照一致
A rename    -> {"ok":1,"now":"qa.web4","user":"qa.web4"}
B old name  -> {"status":410,"err":"这个用户名已经改过名，请用新用户名登录。"}        # 旧名登录失败
B new name  -> {"ok":1,"user":"qa.web4","uid":"58be7744-9358-4d25-8bd5-8e2082137ec4"} # 新名登录成功，且显示新名
```
### 2) API 层（curl，直接打 GoTrue/PostgREST）
```
1 注册伪邮箱 qa.tim5@satmath.local  -> access_token YES
2 写 usernames 行（authenticated）   -> 201
3 匿名 resolve_login('qa.tim5')     -> "qa.tim5@satmath.local" 200
4 匿名 select=email                 -> 401 permission denied（email 列不开放）
5 匿名 select=username,user_id      -> 200 返回 [{username,user_id}]
6 用户名登录                         -> token YES
7 rename_username('qa.tim6')        -> "qa.tim6" 200
8 旧名 resolve -> null；is_retired_username -> true
9 旧名登录（客户端）                 -> 410「已改过名」
10 新名登录                          -> token YES
```
### 3) 测试与部署
- `node --test test/*.test.js` → **111 pass / 0 fail**
- 线上资源：`supa-cloud.js?v=621ebd047247`（`cloud-config.js` / `cloud-account.js` 同批 bump，drill/exam/wrong 三页同值）
- 证据图：`docs/account-evidence/panel-no-email.png`（设置面板只有 用户名 + 密码）、`docs/account-evidence/B-old-name-410.png`
- SQL 全文：`docs/sql/account-model.sql`

### 4) 已知边界（不粉饰）
- 伪邮箱是 Auth 的登录标识，改名不会改 `auth.users.email`（前端无 service role，红线内）。因此**知道旧伪邮箱 + 密码**仍能在 GoTrue 层直接换到 token；站点客户端只按用户名登录，旧名会以 410 拦住。要彻底废掉旧伪邮箱需 Edge Function + service role。
- 无邮箱即无自助改密，`renderSupaReset` 明示“联系管理员”。
- `auth.users` 仍剩 1 个遗留探针 `satmath-probe@qq.com`（无用户名、从未登录），要不要删等你一句话。
