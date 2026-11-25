-- 清理 UI 级实测留下的 qa.* 测试账号（2026-11-25 两机 + 同机两套序列共 7 个）
-- 在 Supabase Dashboard → SQL Editor 里整段粘贴执行；执行后跑最后那条 select 核对四个计数。
-- 只用 dashboard 的 postgres 角色，不涉及任何 key。

delete from public.progress       where user_id in (select id from auth.users where email like 'qa.%@satmath.local');
delete from public.username_alias where user_id in (select id from auth.users where email like 'qa.%@satmath.local');
delete from public.usernames      where user_id in (select id from auth.users where email like 'qa.%@satmath.local');
delete from auth.users            where email like 'qa.%@satmath.local';

select (select count(*) from auth.users)              as users,
       (select count(*) from public.usernames)        as names,
       (select count(*) from public.username_alias)   as alias,
       (select count(*) from public.progress)         as prog;
