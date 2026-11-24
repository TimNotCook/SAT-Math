# 云同步落地决策（码农 α · 2026-11-24）

> **16:20 更新（先看这段，下面的旧结论已被它取代）**
> database 确实建不了表（403，见证据），但 **storage 的 `runtime` 桶是通的**，对象路径必须 `users/<uid>/…`。
> 也就是说后端给的是"按用户隔离的文件存储"，不是关系表 —— **`profiles` 不用换后端了**，已改走
> `runtime/users/<uid>/tdsat-profile.json`（commit `d23a48e`），**只差一个能登录的账号做真机验收**。
> 用户名映射表仍然没有"登录前公共可读"的通道（storage 下载也要登录态），建议先退回"用户名只做展示名"。

> 一句话：`profiles` 表和用户名映射表**不是"忘了建"，是建不了** —— WorkBuddy 后端的数据路由对本站 Origin 一律 403，
> 连"表在不在"都问不到。要么换后端（Supabase，推荐），要么平台侧开库。今天先交证据 + 三条路，你拍一条我立刻做。

## 一、证据（30 秒可复现）

```bash
node tools/probe_cloud_db.mjs
```

2026-11-24 线上 main 实跑输出：

```
后端：https://wbapp-ppcowwierzgpcol1drmipc.app.workbuddy.host
SDK：sdk-ready，init：ok

  profiles     不可用 → TypeError: Failed to fetch
  usernames    不可用 → TypeError: Failed to fetch
  kv           不可用 → TypeError: Failed to fetch
  users        不可用 → TypeError: Failed to fetch
  progress     不可用 → TypeError: Failed to fetch

== 网络实况 ==
  → OPTIONS https://.../.cloud/database/rest/profiles?select=id%2Cpayload%2Cupdated_at
  ← 403 /.cloud/database/rest/profiles?... | ACAO=none
  ✗ net::ERR_FAILED
```

**为什么是"建不了"而不是"没建"**：SDK 的真实数据请求打到 `/.cloud/database/rest/<表名>`，浏览器的 CORS 预检（OPTIONS）直接 403，
且响应里没有任何 `Access-Control-Allow-Origin` → 浏览器连 GET 都发不出去。这不是表结构问题，是整个数据路由没对本应用开放。
同一后端上 `/v1/verification`、`/v1/signin` 是可用的（登录能过），说明**只开了认证，没开数据库**。

顺带解释"换设备看不到进度"的机制：`workbuddy-cloud.js` 的 `getArchive` / `pushProgress` 都用 try/catch 静默兜底，
403 被吞掉，用户界面照样显示"已登录 · 进度自动保存"，实际只写在本机 localStorage。

## 二、三条路（选一条）

| | 方案 | 需要谁做什么 | 我这边工时 | 风险 / 代价 |
|---|---|---|---|---|
| **A（推荐）** | **Supabase 建 `profiles` + `usernames`** | 你给 **项目 URL + anon key**（免费版，控制台 5 分钟） | 4–6 小时（建表 + RLS + 客户端接入 + 两机实测） | 国内可直连（已实测）；多一个云厂商；免费额度够用 |
| B | 让 WorkBuddy 平台开数据库 | 应用控制台开通 database、把 `https://timnotcook.github.io` 加进 CORS、建表 | 我改代码 2 小时 | 责任方不在我们手里，等待不可控；且要重开一次联调 |
| C（兜底） | GitHub 令牌通道（**代码已可用**） | 用户自备 GitHub PAT，粘贴一次 | 0（已有） | 要 GitHub 账号；令牌存 sessionStorage，**每次重启浏览器要重贴**，不算"登录即同步" |

推荐 **A 为主 + C 兜底**：A 保证"邮箱密码登录换设备就能看到进度"，C 让已经有 PAT 的人今天就能用。

## 三、表结构（A / B 通用，可直接跑）

```sql
-- 1) 学习档案：一人一行，只有本人能读写
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  payload     jsonb not null default '{}',
  nickname    text,
  updated_at  timestamptz not null default now()
);
alter table profiles enable row level security;
create policy profiles_own on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- 2) 用户名登记（若要做"用户名登录"）
create table usernames (
  username    text primary key check (username ~ '^[a-z0-9_]{3,20}$'),
  uid         uuid not null references auth.users(id) on delete cascade,
  email       text not null,
  created_at  timestamptz not null default now()
);
```

### 用户名这条要单独拍一下：两种做法，代价不同

- **做法 1（零泄露，推荐）**：用户名**只做展示名**，登录仍用邮箱。
  不需要 `usernames` 表，今天就能做，只改 UI 文案与「显示名」字段。
- **做法 2（真·用户名登录）**：需要 `usernames` 表**匿名可读**（登录前要解析）。但表里一旦放明文邮箱，
  任何人拿到用户名就能批量取邮箱（撞库/骚扰面）。缓解手段只有限流 RPC，不能根治。

我建议先上 **做法 1**，等有后端了再评估做法 2。**这条也请你拍。**

## 四、客户端要改的点（A 方案确定后我一次性交）

| 文件 | 改什么 |
|---|---|
| `workbuddy-cloud.js` | `getArchive` / `pushProgress` 换成 Supabase 读写；403 不再静默吞 |
| `cloud-account.js` | `auth()` 增加 supabase 分支；同步失败时状态改成「仅本机保存」而不是「进度自动保存」 |
| `cloud-config.js` | 增加 supabase URL / anon key 字段 |
| 设置面板 | 账户页三通道文案对齐，补「同步状态」明细（上次同步时间 / 是否成功） |

## 五、我需要你回的一句话

1. 选 **A / B / C**（选 A 的话把 Supabase `URL + anon key` 贴给我，5 分钟就能开工）；
2. 用户名走 **做法 1（只做展示名）** 还是 **做法 2（真用户名登录）**。

## 六、16:20 的落地状态（取代上面"选 A/B/C"那一段）

| 事 | 现在在哪 | 还差什么 |
|---|---|---|
| `profiles`（档案） | **已改道 storage**：`runtime/users/<uid>/tdsat-profile.json`，db 保留兜底，commit `d23a48e`；relay 新增受限 `storage` 通道，commit `fe241a1`→`e9f0d08` | **一个能登录的账号**（邮箱+密码）才能在真机上验"写完→换机读回" |
| 跨设备同步 | 客户端链路本来完整（`afterSignIn` → `getArchive` → `mergeLocalWithCloud` → `silentPush`） | 同上；11-25 上午两机实测必须拿到账号 |
| 用户名映射表 | **做不了**：storage 下载同样要登录态，`shared/<ownerUid>/` 也只对 owner 可见，没有"登录前公共可读" | 要么平台开 database，要么 Supabase，要么退回做法 1（只做展示名） |

所以现在的卡点只剩两件外部输入：**① 测试账号（邮箱+密码）② 用户名要不要退回展示名**。
Supabase 只剩"用户名映射表"这一件事需要它，`profiles` 不必再等。
