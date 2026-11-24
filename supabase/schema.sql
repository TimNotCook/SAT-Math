-- SAT Math 账号与进度同步 —— Supabase 表结构
-- 用法：Supabase 控制台 → SQL Editor → 整段粘贴执行。执行一次即可（幂等）。

-- 1) 学习档案：一人一行，只有本人（auth.uid()）能读写
create table if not exists public.progress (
  user_id    uuid primary key,
  payload    jsonb not null default '{}',
  nickname   text,
  email      text,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

drop policy if exists progress_own on public.progress;
create policy progress_own on public.progress
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2) 用户名 ↔ 邮箱映射：登录前（未登录）要能按用户名查到邮箱
--    注意：这张表对匿名可读，等于"知道用户名就能拿到邮箱"，属于已知代价，
--    只放在个人站、且用户名注册需登录后写入，可接受再上。
create table if not exists public.usernames (
  username   text primary key check (username ~ '^[a-z0-9_]{3,20}$'),
  uid        uuid not null,
  email      text not null,
  created_at timestamptz not null default now()
);

alter table public.usernames enable row level security;

drop policy if exists usernames_read on public.usernames;
create policy usernames_read on public.usernames
  for select
  to anon, authenticated
  using (true);

drop policy if exists usernames_insert on public.usernames;
create policy usernames_insert on public.usernames
  for insert
  to authenticated
  with check (auth.uid() = uid);

-- 3) 校验（跑完可自查）
--    select count(*) from pg_tables where tablename in ('progress','usernames');  -- 应为 2
