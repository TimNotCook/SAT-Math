# 云同步落地结论（码农 α · 2026-11-24 定稿）

> **结论：`profiles` 和 `usernames` 在现有后端都做不到。**
> 不是"没建表"，也不是"缺登录态"——是网关把整个 `/.cloud/*`（database + storage）对本站 Origin 一律 403，
> 响应里连 CORS 头都不给，浏览器连请求都发不出去。认证 `/v1/*` 正常，说明这个应用**只开了认证，没开数据库和存储**。
> 下面两段探针任何人可重跑复现。

## 一、证据（两条命令，30 秒）

```bash
node tools/probe_cloud_db.mjs        # database
node tools/probe_cloud_storage.mjs   # storage
```

2026-11-24 线上 main 实跑：

```
== database ==
  profiles     不可用 → TypeError: Failed to fetch
  usernames    不可用 → TypeError: Failed to fetch
  ← 403 /.cloud/database/rest/profiles?select=id%2Cpayload%2Cupdated_at | ACAO=none

== storage ==
  匿名写 users/<假uid>/  拒绝 → Failed to fetch
  非法桶名              拒绝 → Only the "runtime" storage bucket is available.   ← SDK 客户端拦的
  非法路径              拒绝 → Object paths must use users/<uid>/... or shared/<ownerUid>/.... ← SDK 客户端拦的
  ← 403 /.cloud/storage/object/runtime/users/anon-probe/probe-….json | ACAO=none
```

读法：
- 后两条是 SDK 自己的校验（说明桶名/路径规则确实存在），但**合法路径那一条走到底仍然是 403 且无 CORS 头**；
- database 与 storage 是同一类拦截 → 被挡的是 `/.cloud/*` 这个前缀，不是某张表，也不是"没登录"；
- 同一后端 `/v1/verification`、`/v1/signin` 是通的（发码、密码登录都能过）。

为什么必须看状态码：如果只是缺登录态，那是 401 + CORS 头；现在是 403 + 无头，浏览器层就断了，登录也救不回来。

## 二、三件事各自的结论

| 事 | 结论 |
|---|---|
| `profiles` 表 | **做不到**：database 未开通；替代方案（runtime 桶文件存储）同样 403，也不成立 |
| 用户名映射表 | **做不到**：既没有表，也没有"登录前可读"的通道（storage 下载要登录，且同样 403） |
| 云同步 | **是假的**：`workbuddy-cloud.js` 的 `getArchive/pushProgress` 一直 try/catch 静默兜底，403 被吞，界面照样显示"进度自动保存"，实际只写本机 localStorage。这就是"换设备看不到进度"的机制 |

客户端链路（登录 → 读档案 → 合并本机 → 定时推）本身完整，缺的只有后端落点。

## 三、已做的无害改动（不改变结论）

- `workbuddy-cloud.js`：档案读写改成 **storage 优先、db 兜底**（commit `d23a48e`）。
  后端哪天开通 `/.cloud/*` 会自动生效，不用再改客户端；没开通时行为与之前一致（返回 false，不阻断登录）。
- `auth-relay.html`：加受限 `storage` 通道（只放 `runtime`/`tdsync` 前缀桶），commit `e9f0d08`。
  没有它就无法证明 storage 是 403 而不是"没写"。

## 四、两条出路（都要你拍）

| | 怎么做 | 谁来 | 我这边工时 |
|---|---|---|---|
| **B（最少改动）** | 平台给本应用开通 `/.cloud/database/rest` 与 `/.cloud/storage`，并把 `https://timnotcook.github.io` 加进 CORS 白名单 | WorkBuddy 侧，不在我们手里，等待不可控 | 开表 1h + 联调 1h |
| **A（我们自己能控）** | Supabase 免费版：你给 `URL + anon key` | 你 5 分钟 | 4–6h（建表 + RLS + 客户端接入 + 两机实测） |

选 A 时直接用这份表结构（已按现有客户端字段对齐）：

```sql
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  payload    jsonb not null default '{}',
  nickname   text,
  updated_at timestamptz not null default now()
);
alter table profiles enable row level security;
create policy profiles_own on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create table usernames (
  username   text primary key check (username ~ '^[a-z0-9_]{3,20}$'),
  uid        uuid not null references auth.users(id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);
```

用户名这条还有一个要先拍的点：
- **做法 1（推荐，今天能收）**：用户名只做展示名，登录仍用邮箱。零泄露、不依赖新后端。
- **做法 2**：真用户名登录。需要 `usernames` 匿名可读，等于"知道用户名就能拿到邮箱"，只能靠限流缓解，不能根治。

## 五、我需要两句话

1. 走 **A（Supabase）** 还是 **B（等平台开库）**；走 A 就把 `URL + anon key` 给我。
2. 用户名走 **做法 1** 还是 **做法 2**。

在这两句话之前，台账上这两格只能记：**阻塞，后端未开 `/.cloud/*`（证据：`tools/probe_cloud_db.mjs`、`tools/probe_cloud_storage.mjs`）**。
