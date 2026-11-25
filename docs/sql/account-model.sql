-- 账号模型：用户名即身份（2026-11-25 已在 sat-math 项目执行）
-- 身份 = 用户名；Supabase Auth 里的邮箱是内部伪邮箱 <用户名>@satmath.local

-- 1) 列名对齐 + 唯一索引
alter table public.usernames rename column uid to user_id;      -- 若仍是 uid
alter table public.usernames add column if not exists updated_at timestamptz not null default now();
create unique index if not exists usernames_username_uq on public.usernames (username);
create unique index if not exists usernames_user_id_uq  on public.usernames (user_id);
alter table public.usernames drop constraint if exists usernames_username_check;
alter table public.usernames add constraint usernames_username_check
  check (username ~ '^[a-z0-9][a-z0-9._-]{2,19}$');

-- 2) 曾用名表：旧名 → 内部伪邮箱 → user_id
create table if not exists public.username_alias (
  username   text primary key,
  email      text not null,
  user_id    uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists username_alias_user_id_idx on public.username_alias (user_id);

-- 3) RLS
alter table public.usernames       enable row level security;
alter table public.username_alias  enable row level security;
drop policy if exists usernames_read        on public.usernames;
drop policy if exists usernames_insert      on public.usernames;
create policy usernames_select_anon on public.usernames for select to anon          using (true);
create policy usernames_select_self on public.usernames for select to authenticated using (user_id = auth.uid());
create policy usernames_insert_self on public.usernames for insert to authenticated with check (user_id = auth.uid());
create policy usernames_update_self on public.usernames for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- username_alias 不给 anon / authenticated 任何策略，只有 SECURITY DEFINER 函数能碰

-- 4) 列级授权（匿名只给 username / user_id，email 不外露）
grant usage on schema public to anon, authenticated;
revoke all on public.usernames      from anon, authenticated;
revoke all on public.username_alias from anon, authenticated;
grant select (username, user_id) on public.usernames to anon;
grant select (username, user_id, created_at, updated_at) on public.usernames to authenticated;
grant insert (username, user_id, email) on public.usernames to authenticated;
grant update (username, email, updated_at) on public.usernames to authenticated;
grant select on public.username_alias to authenticated;

-- 5) 登录查名（只认现役名；旧名一律登不上）
create or replace function public.resolve_login(p_username text)
returns text language sql stable security definer set search_path = public, pg_temp as $$
  select (select u.email from public.usernames u where u.username = lower(btrim(p_username)));
$$;
revoke all on function public.resolve_login(text) from public;
grant execute on function public.resolve_login(text) to anon, authenticated;

create or replace function public.is_retired_username(p_username text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.username_alias a where a.username = lower(btrim(p_username)));
$$;
revoke all on function public.is_retired_username(text) from public;
grant execute on function public.is_retired_username(text) to anon, authenticated;

-- 6) 改名：一次事务内「旧名入 alias + 改现役名」，只允许改自己
create or replace function public.rename_username(p_new text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_old text; v_email text; v_new text := lower(btrim(p_new));
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if v_new !~ '^[a-z0-9][a-z0-9._-]{2,19}$' then raise exception 'invalid username' using errcode = '22023'; end if;
  select username, email into v_old, v_email from public.usernames where user_id = v_uid;
  if v_old is null then raise exception 'username not bound' using errcode = 'P0002'; end if;
  if v_new = v_old then return v_new; end if;
  if exists (select 1 from public.usernames where username = v_new)
     or exists (select 1 from public.username_alias where username = v_new) then
    raise exception 'username taken' using errcode = '23505';
  end if;
  delete from public.username_alias where username = v_new and user_id <> v_uid;
  insert into public.username_alias(username, email, user_id) values (v_old, v_email, v_uid)
    on conflict (username) do update set email = excluded.email, user_id = excluded.user_id, created_at = now();
  update public.usernames set username = v_new, updated_at = now() where user_id = v_uid;
  return v_new;
end $$;
revoke all on function public.rename_username(text) from public;
grant execute on function public.rename_username(text) to authenticated;
