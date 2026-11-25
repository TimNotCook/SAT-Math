# bugfix 2026-11-25：verify_nav「资源版本/五页同值」线上偶发 fetch failed（P2-C）

## 现象

`node tools/verify_nav.mjs --base https://timnotcook.github.io/SAT-Math` 线上偶发
37/38，末项「资源版本/五页同值」红牌；屏幕上只有一句 `fetch failed`，看不出是哪一页、
超时还是连接被重置还是 5xx。单独跑 `node tools/versions.mjs --base <线上>` 却 PASS，
说明不是「站点版本真的不一致」，而是那次 fetch 本身抖动。

## 根因排查与证据

### 改前代码现状（tools/versions.mjs checkBase）

- 五页**顺序** for-await 拉取（不是并发），每页**单次尝试**，无重试；
- 单次 `AbortSignal.timeout(12000)`，12s 对抖动连接偏紧；
- 网络异常原样抛；verify_nav.mjs 的 catch 只把 `e.message` 当 detail ——
  而 Node undici 的网络错误 `e.message` 恒为 `fetch failed`，真正的原因
  （`e.cause.code` / `e.cause.message`）被丢掉；
- HTTP 非 2xx 只抛 `${url} → HTTP ${res.status}`，没有逐次记录。

### 复现实验（改前/改前行为对照，原始输出）

实验 A：指向不存在的域名，看网络错误的 cause 结构。

```
$ node /tmp/repro.mjs
A 失败:
  e.name = TypeError
  e.message = fetch failed
  e.cause = Error
  e.cause.code = ECONNRESET
```

实验 B：对线上站点把超时压到 50ms（人为超时），连跑 3 次：

```
B#1 失败: name=TimeoutError message=The operation was aborted due to timeout cause=undefined code=undefined
B#2 失败: name=TimeoutError message=The operation was aborted due to timeout cause=undefined code=undefined
B#3 失败: name=TimeoutError message=The operation was aborted due to timeout cause=undefined code=undefined
```

实验 C：线上 404 路径（`/SAT-Math/nope-404.html`）→ `HTTP 404（ok=false）`，
走 `!res.ok` 分支，不是抛异常。

实验 D：6 路并发 × 4 轮压力拉取线上五页（复现"并发是否触发重置"）：
无失败；但冷启动首页在并发下单次 3391–3468ms，说明首字节延迟会被抖动放大。

补充（云主机网络复核，同一补丁）：不存在域名拿到的是 `ENOTFOUND · getaddrinfo
ENOTFOUND …`，证明 cause.code 通道对不同网络错误码通用（ECONNRESET /
ENOTFOUND / ECONNREFUSED / ETIMEDOUT / UND_ERR_CONNECT_TIMEOUT 都能透出）。

### 排除项

- **不是版本真不一致**：单独跑 versions.mjs 连续 6 次全 PASS，五页同值。
- **不是五页并发触发 Pages 限流**：改前代码本就是顺序 for-await，没有并发。
- **不是 Chrome/CDP 吃掉网络**：checkBase 的 fetch 是 Node 进程 undici 直连，
  不经过 CDP 通道；CDP 只服务页面导航与截图。

### 结论

单次尝试 + 12s 偏紧超时：遇到一次 TCP 瞬时重置（ECONNRESET）、连接超时
（ETIMEDOUT / UND_ERR_CONNECT_TIMEOUT）或慢响应超过 12s，就直接红牌；而错误信息
又被压成一句无信息量的 `fetch failed`，无法诊断。修法是「同一页给 3 次机会 +
把失败原因打印全」，**判定规则本身一寸不让**。

## 修法（tools/versions.mjs + tools/verify_nav.mjs）

1. **per-page 重试 + 指数退避**：每页总尝试 3 次（首次 + 2 次重试），
   重试前等待 2s / 4s（`backoffMs: [2000, 4000]`），可配。
2. **超时可配，默认放宽**：`timeoutMs` 默认 20000（原 12000），可配。
3. **重试分类**：网络层错误（TypeError fetch failed / TimeoutError）与 5xx → 重试；
   4xx（404/403 永久错误）→ 不重试，立刻抛，不浪费 6s 退避。
4. **失败信息字段**：聚合错误带 `attempts` 全记录，每条含
   `URL · HTTP 状态 · 错误名(name) · cause.code · 细节消息(cause.message)`；
   新增导出 `describeFetchError(e)` 统一展开（聚合错误 / 普通网络错误通用）。
5. **verify_nav.mjs catch**：不再只取 `e.message`，改用 `describeFetchError(e)`
   作为 detail/errors，红牌时能指名「哪个 URL + 什么状态/错误码」。
6. **CLI 可配**：`--retries N --backoff-ms 2000,4000 --timeout-ms 20000`。

### 语义不退让（硬约束）

- 重试仍失败 → `ok=false`、退出码 1；
- 禁止 catch 后当 PASS、禁止无限重试、禁止把检查降级成 warning；
- 规则本身（每页至少 1 个 ?v=、每页唯一、五页同值）未改一字。

## 其他 tools/*.mjs 同类点排查

逐个 grep `fetch(`：除 versions.mjs 外，所有 fetch 都打向本机 CDP
（`http://127.0.0.1:${PORT}/json/version`、`/json/list`），且前面已有 40–60 轮
等待循环兜底（mock_cjk / narrow_check / quiz_regress / title_check /
verify_acct_entry / verify_a11y / verify_session / probe_cloud_db /
probe_cloud_storage / verify_nav 的 CDP 握手段）。本机回环失败是即时的、不会抖动，
**不存在第二个「远程单次 fetch 无重试、错误不可诊断」的点**，故不改其他脚本语义。

## 本地自测记录（人为制造失败，原始输出）

### 实验 1：不存在的 host（`--retries 3 --backoff-ms 2000,4000`）

```
$ node tools/versions.mjs --base https://nonexistent-host-satmath-9f3k2.example --retries 3 --backoff-ms 2000,4000
FAIL 版本检查无法完成
      原因 共 3 次尝试：#1 https://nonexistent-host-satmath-9f3k2.example/index.html?audit=1795592020578 · TypeError · ECONNRESET · Client network socket disconnected before secure TLS connection was established；#2 https://nonexistent-host-satmath-9f3k2.example/index.html?audit=1795592020578 · TypeError · ECONNRESET · Client network socket disconnected before secure TLS connection was established；#3 https://nonexistent-host-satmath-9f3k2.example/index.html?audit=1795592020578 · TypeError · ECONNRESET · Client network socket disconnected before secure TLS connection was established
exit=1
```

### 实验 2：线上 404 路径（永久错误，不重试）

```
$ node tools/versions.mjs --base https://timnotcook.github.io/SAT-Math/nope-404-probe
FAIL 版本检查无法完成
      原因 共 1 次尝试：#1 https://timnotcook.github.io/SAT-Math/nope-404-probe/index.html?audit=1795592035187 · HTTP 404 · 永久错误，重试无意义
exit=1
```

### 实验 3：人为 50ms 超时压线上（`--timeout-ms 50 --retries 3 --backoff-ms 300,300`）

```
$ node tools/versions.mjs --base https://timnotcook.github.io/SAT-Math --timeout-ms 50 --retries 3 --backoff-ms 300,300
FAIL 版本检查无法完成
      原因 共 3 次尝试：#1 https://timnotcook.github.io/SAT-Math/index.html?audit=1795592040644 · TimeoutError · The operation was aborted due to timeout；#2 https://timnotcook.github.io/SAT-Math/index.html?audit=1795592040644 · TimeoutError · The operation was aborted due to timeout；#3 https://timnotcook.github.io/SAT-Math/index.html?audit=1795592040644 · TimeoutError · The operation was aborted due to timeout
exit=1
```

### 重试救回路径（monkeypatch 前两次抛 ECONNRESET，第三次放行）

```
heal ok = true version = 70f626f24ada fetch 调用次数 = 7
彻底失败诊断： 共 2 次尝试：#1 https://timnotcook.github.io/SAT-Math/index.html?audit=1795592071221 · TypeError · ECONNRESET · x；#2 https://timnotcook.github.io/SAT-Math/index.html?audit=1795592071221 · TypeError · ECONNRESET · x
```

### 测试与 bump

- `node --test test/*.test.js`：123 pass / 0 fail（本工作副本基线）；
  远端最新 main 干净副本复核 131 pass / 0 fail。
- `python3 bump_assets.py`：PASS 五页资源版本一致，HTML 无改动。

## 线上验收（5 连跑）

见 `docs/bugfix-2026-11-25/verify-nav-5runs.txt`。
