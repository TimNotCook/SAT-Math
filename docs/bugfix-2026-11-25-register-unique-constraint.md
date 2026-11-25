# 变更记录：注册查重从「匿名读表枚举」改为「唯一约束兜底」（2026-11-25）

## 一、背景（裁定要点）
- **旧实现**：`register(username, pw)` 先调 `usernameTaken()`，用 anon key 直读
  `usernames?username=eq.<name>&select=username` 预读查重；读表被拒/网络失败时
  catch 里 `console.warn` 后 `return false` 降级，把「判不出来」当成「没重名」。
- **裁定**：anon 能遍历全站用户名，抢注 / 撞库的代价大于「注册前先看一眼名字能不能用」
  的体验收益；匿名读表查重这条路废弃。查重完全交给数据库唯一约束承担，新代码不向
  anon 申请、也不依赖 `usernames` 表的任何列级 SELECT。
- 现役账号体系只有一个真实用户名 `timnotcook`（内部邮箱 `timnotcook@satmath.local`），
  因此「用户名被占」必然等价于「确定性伪邮箱已注册」。

## 二、改了什么（文件 + 行号级）

### `supa-cloud.js`
- **删除** `usernameTaken()`（旧 194–210 行）：匿名预读表路径整段移除，注册流程不再
  调用；全仓 grep 确认无其他 JS 引用（仅历史文档提及）。
- **新增** `isConflictError(e)`（203–213 行）：只认服务端唯一约束顶回来的冲突信号——
  - GoTrue：`user_already_exists` / `User already registered` / `already been registered` /
    `email-already-in-use`；
  - PostgREST / Postgres：`23505` / `unique_violation` / `duplicate key` / `unique constraint`。
  网络失败、42501 授权拒绝、5xx 一律不命中，原样上抛，不冒充冲突。
- **新增** `errUsernameTaken()`（215–218 行）：409 + 文案「这个用户名已被占用，换一个吧。」
  + `code = 'auth/username-already-in-use'`。
- **改写** `register`（316–350 行）：
  1. 本地格式 / 密码长度校验不变；
  2. 直接 `POST /auth/v1/signup`（确定性伪邮箱 `<用户名>@satmath.local`）；
  3. signup 抛错命中冲突 → 翻 409；其余错误原样抛；
  4. 回包无 `access_token` 时，先按冲突字段复核：确属占用才 409，否则保留既有
     400「注册没有拿到会话…请管理员在 Auth 设置里关闭邮箱确认」——两条报错不许串；
  5. `sessionFrom` 后 `bindUsername` 抛唯一索引冲突（23505）→ 409；其余错误原样抛。
- 注释写明：判定靠数据库唯一约束，不靠匿名端枚举；不留任何向后兼容的「先读表」分支。

### `docs/sql/anon-usernames-select.sql`
- 文件最顶部加「**不执行·已封档**」标注与三条理由（枚举风险 / 查重改由唯一约束承担 /
  保留仅作历史与回滚参考）；下方 GRANT 语句原样留档，不要再贴进 Dashboard 执行。

### `docs/account-model.md`
- 新增「三之附二：2026-11-25 晚裁定」：anon 读 `usernames` 为设计禁止；注册查重走
  唯一约束，不授予任何列级 SELECT；线上残留的 `username / user_id` 授权仅为历史，
  新代码不依赖。
- 三之附白天实测矩阵（A/B/F 200、C/D/E 401/42501）原样保留，不篡改实测事实；
  两条 anon 策略 / 授权标注为「历史残留」。

### `test/register-conflict.test.js`（新增，8 例）
vm 沙箱加载 `supa-cloud.js`，stub `fetch` / `localStorage`，覆盖：
合法新用户名通过校验且不预读表；格式错 / 密码不足 6 位 400 且不发请求；
422 `user_already_exists` → 409 占用文案且不再写 `usernames`；
`bindUsername` 23505 → 409；网络 reject / 42501 / 5xx 不误判成占用；
无会话且无冲突字段 → 走既有邮箱确认报错。

## 三、怎么验（命令 + 真实数字）
- `node --check supa-cloud.js`：通过（CHECK_OK）。
- `node --check test/register-conflict.test.js`：通过。
- `node --test test/*.test.js`：**139 pass / 0 fail**（改动前基线 131 pass / 0 fail，
  本次新增 8 例，未改既有用例语义）。
- **真实 anon 探针**（只读，未创建新用户、未写任何数据）：
  ```
  POST https://ofsnrzfmjqyrmkvdwnbo.supabase.co/auth/v1/signup
  apikey: sb_publishable_lUmLQYeK0WBOh3BfTb9OXA_pxX_wjbp
  body: {"email":"timnotcook@satmath.local","password":"probe-only-not-creating-000"}
  → HTTP/2 422
  header: x-sb-error-code: user_already_exists
  body: {"code":422,"error_code":"user_already_exists","msg":"User already registered"}
  ```
  实测时刻：2026-11-25 19:34 HKT（11:34:53 GMT，cf-ray a60058bfdaac09c0-HKG）。
- `python3 bump_assets.py --check`：PASS（五页 `?v=` 同值）。

## 四、已知边界（不粉饰）
- signup 已创建 auth 用户、随后 `bindUsername` 撞唯一索引（竞态或历史残留行）时，
  会留下孤儿 auth 用户；前端无 service role，清理需管理员在 Dashboard 处理。
- 200 回包只带 `user`、不带会话、且 body 无冲突字段时，无法与「开启了 Confirm email
  的新注册」区分，按既有邮箱确认报错处理；当前项目邮箱确认关闭，实测冲突走 422。

## 五、commit 与线上版本
- 推送前 HEAD：`45bb6526d487188d11aa68e3b8f62200053a569a`（= origin/main 基线）。
- 本次 commit：`e7bb1c06bda9677a7a66ab7d153ed5af275aeb17`（短 `e7bb1c0`），
  `git ls-remote origin refs/heads/main` 核对远端 HEAD 与本地一致。
- 线上 `?v=`：**`edad4807f62c`**，index / exam / drill / wrong / jiangyi 五页同值。
  实测时刻 2026-11-25 19:43 HKT：回拉线上 `supa-cloud.js?v=edad4807f62c`，
  与本地工作区 `diff` 完全一致；`isConflictError` 命中 5 处、`auth/username-already-in-use`
  在 217 行、全文件无 `usernameTaken` 残留。
