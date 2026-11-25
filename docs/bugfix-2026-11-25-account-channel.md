# P1-B 修复记录：登录面板默认展示不可用的用户名通道 + anon 42501 决策（2026-11-25）

## 复现步骤
1. 打开 https://timnotcook.github.io/SAT-Math/drill.html → 右上「账户」打开设置面板。
2. 默认主位是「登录（用户名 + 密码）」表单；巡检快照时 `usernames` 为 0 行，
   随便填用户名 + 密码点「登录」→ RPC `resolve_login` 返回空 → 抛 404「没有找到这个用户名」。
3. 面板上没有任何一句说明「此通道现在登不进去」，用户只会以为站点坏了；
   唯一真可用的 GitHub 令牌通道反而藏在折叠按钮「其他登录方式（GitHub 令牌）」里。

## 根因
- 面板渲染顺序写死：`hasSB`（Supabase 配置存在）就把用户名 + 密码表单放主位，
  GitHub 令牌永远走 `renderAltLogin` 的折叠块。**主入口是否可用从来没参与排序**——
  巡检时 `usernames` 为 0 行，同日复测已有 1 行（`timnotcook`，`resolve_login` 200），
  行数变化从来不是面板排序的输入，这才是根因；界面文案跟着行数变才会再次失真。
- 登录失败本身走 SECURITY DEFINER 的 `resolve_login` RPC，与 anon 列级授权无关；
  42501 只影响客户端直读 `usernames` 的注册查重 `usernameTaken()`。

## 修法（选了方案 ②：GitHub 令牌提主位，用户名通道折叠为「需先注册」说明块）
理由：主入口骗人的成本最高——用户第一眼看到的表单必然失败，把唯一可用通道放主位最直接；
用户名表单不删除、不禁用，折叠保留，老用户试错时 404 与注册说明同屏，不再静默；
说明文案写「对已注册账号开放 / 可就地注册」，不绑定具体行数，不会再随库内容失真。

`cloud-account.js`：
- 新增 `renderGhPrimary(b)`：GitHub 令牌通道默认展开、标「当前可用」，放面板主位。
- 新增 `renderSupaMaintenance(b)`：用户名 + 密码通道默认折叠（`supaMaintainOpen` 记录展开态，
  renderBody 重渲染后保留；登出收回）；展开先给淡黄说明块，再放原表单
  （`supaRegister / supaVerify / supaReset` 分支原样复用）。
- `hasSB` 分支改为 `renderGhPrimary` → 分隔线「用户名通道维护中」→ `renderSupaMaintenance`；
  WorkBuddy / Firebase 分支的 `renderAltLogin` 备用折叠保持原样。
- 折叠块标题：「用户名 + 密码登录（需先注册）」；说明文案：
  「本站用户名账号只对已注册账号开放。如果你还没注册，或登录时看到「没有找到这个用户名」，
  请直接用上方 GitHub 令牌登录（做题进度照样自动保存）；也可以在这里就地注册。」

`supa-cloud.js`：
- `usernameTaken()` 的 catch 由静默 `return false` 改为 `console.warn` 显式降级并注释写明：
  本探测只 `select=username`（已授权列）；被拒（授权回退/网络）时查重交唯一索引兜底，
  不在客户端猜「可用」。

## 42501 最终决策
**不改库、不客户端硬糊**。实测（命令与原文见 `docs/account-model.md` 三之附）：
anon 读 `username / user_id` 列线上已授权（200），`email` 列与 `select=*` 返回
`401 / 42501 permission denied`——这是设计如此（email 永不外露）。
最小授权/回滚 SQL 留档 `docs/sql/anon-usernames-select.sql`（重建/复核用，需管理员在
Supabase Dashboard 执行，客户端 anon key 不可自助授权）。客户端 `usernameTaken` 显式降级。

## 证据
- curl 42501 原文：见 `docs/account-model.md` 三之附 A–G。
- 截图：`docs/ui-shots/bugfix-2026-11-25/acct-*.png`（默认面板新主位、展开维护块后的
  404 失败提示、GitHub 通道可见态；390 / 655 / 1280 三档）。
- 线上态截图与 `?v=` 记录见本文件末尾「线上实测」。

## 线上实测
- HEAD：`51ba63d`（cloud-account.js 1385 行完整版落地；远端曾被分段推送留成截断坏态，本提交恢复）。
- 资源版本：五页 `?v=3a31dbadc74c` 同值（index / drill / exam / wrong / jiangyi）。
- 面板实际表现（线上 `https://timnotcook.github.io/SAT-Math`，headless Chrome 直打）：
  - 入口 `.td-acct-btn` 点击后 `.td-acct-layer[data-open="1"]`，面板 1280 档 `430×618`、390 档 `350×656`，宽度 > 0 不出框。
  - 默认主位为「GitHub 令牌登录（当前可用）」；「用户名 + 密码登录（需先注册）」默认折叠，展开先出淡黄说明块，原表单保留不禁用。
  - 折叠块内提交 `bogus-zzz` + 任意密码 → 红条「没有找到这个用户名。」与淡黄说明同屏，不再静默。
- 截图（10 张，三档视口）：`docs/ui-shots/bugfix-2026-11-25/`
  `acct-default-drill-{1280,655,390}.png`、`acct-default-exam-1280.png`、
  `acct-maintain-open-{1280,655,390}.png`、`acct-404-{1280,655,390}.png`。
- 回归：`node tools/verify_acct_entry.mjs --base https://timnotcook.github.io/SAT-Math`
  = 16/18。两条 FAIL 均为 `acct/drill-result·宽度`、`acct/drill-result·390 宽度`（0×0 parent=0
  rail=0/none/0 ctx=0/none）：resultView 可见时 `.site-rail` 被 app.css 冻结规则 `display:none`、
  该视图又无 `.drill-context-right` 可挂，属 main 既有宿主缺口基线，与本次改动无关。

### 文案更正复核（2026-11-25 晚，云主机直连 Supabase 复跑）
- `GET /rest/v1/usernames?select=username` → 200 `[{"username":"timnotcook"}]`（巡检快照为 0 行，
  复测已有 1 行；「库里没有可登录账号」是时点事实，不能写进界面当永久说明）。
- `POST /rest/v1/rpc/resolve_login {"p_username":"timnotcook"}` → 200 `"timnotcook@satmath.local"`；
  `{"p_username":"bogus-zzz"}` → 200 `null`。
- `select=email` / `select=*` → 401 `42501 permission denied for table usernames`（结论不变，保留）。
- 本次仅改折叠块标题与淡黄说明文案（不绑定行数），GitHub 主位、折叠态、登出复位、表单不禁用均未动。
- 改后资源版本：`?v=` 待本次推送后回填（本地 bump_assets 试算 `6505db3d661c`，以 safe_push 实推为准）。
