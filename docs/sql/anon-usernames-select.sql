-- ===========================================================================
-- **不执行·已封档**（2026-11-25 裁定）
-- ---------------------------------------------------------------------------
-- · anon 可枚举全站用户名 → 抢注 / 撞库的代价，大于「注册前先看一眼名字能不能用」
--   的体验收益；匿名读表查重这条路按裁定废弃。
-- · 注册查重改由数据库唯一约束承担：signup 撞上已存在的确定性伪邮箱（422
--   user_already_exists）、插 usernames 行撞上唯一索引（Postgres 23505），
--   客户端当场翻 409，不再预读表枚举。
-- · 本文件保留仅作历史与回滚参考：新代码不依赖 anon 对 usernames 的任何列级
--   SELECT；线上若残留 username / user_id 两列授权，属历史遗留，可按文末
--   回滚语句回收。下面的 GRANT 语句不要再贴进 Dashboard 执行。
-- ===========================================================================

-- anon 读 public.usernames 的最小列级授权（登录前查名 / 计数用途）【已封档，勿执行】
-- ---------------------------------------------------------------------------
-- 【执行位置】需管理员在 Supabase Dashboard → SQL Editor 手动执行，客户端（anon key）
-- 不可自助授权；本仓库没有 service_role key，前端无法、也不应提权。
--
-- 【用途写死】（历史用途，新代码已不再使用）只允许 anon 在「登录前查重 / 账号计数」时读 username 列：
--   · 注册前 usernameTaken() 直读：/usernames?username=eq.<name>&select=username
--   · （可选）账号计数：Prefer: count=exact + select=username
-- 不含 email、不含 user_id 之外的任何列；email 列永远不授给 anon。
--
-- 【2026-11-25 线上复核】当前线上已生效等价授权（username, user_id 两列可读），
-- 本文件用于重建 / 迁移 / 复核：若换项目或授权被回收，粘一次本文件即可复原，
-- 不要给 anon 全表 GRANT SELECT（那会把 email 列一起放开）。
-- 实测矩阵（anonKey 直打 PostgREST，命令见 docs/account-model.md 第三节附）：
--   select=username              → 200
--   select=username,user_id      → 200
--   select=email                 → 401 / 42501 permission denied（设计如此）
--   select=username,email         → 401 / 42501
--   select=*                     → 401 / 42501

-- 1) 先收干净（避免历史全表授权残留），再按列最小授予
revoke all on public.usernames from anon;
grant select (username, user_id) on public.usernames to anon;
-- 只需要查名/计数时可收紧为单列：
-- grant select (username) on public.usernames to anon;

-- 2) RLS 策略配合（列级授权之外，行可见性由策略决定；与 docs/sql/account-model.sql 一致）
-- create policy if not exists usernames_select_anon on public.usernames
--   for select to anon using (true);

-- 回滚（撤销 anon 的列级授权，回到「匿名读不到 usernames」）：
-- revoke select (username, user_id) on public.usernames from anon;
-- drop policy if exists usernames_select_anon on public.usernames;
