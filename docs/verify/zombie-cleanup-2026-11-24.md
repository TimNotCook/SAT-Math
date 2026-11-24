# 云主机僵尸副本清理记录（开发者④）

日期：2026-11-24　执行环境：云主机（linux，env `vm`）

## 清理前盘点

| 目录 | 体积 | HEAD | 相对 origin/main | 结论 |
|---|---|---|---|---|
| `~/satrepo` | 61M | 7ba5840 | ahead 50 / behind 108，工作区 4 个文件未提交 | 旧 Prep 镜像血统，内容已被主线取代 → 删 |
| `~/satrepo-vm` | 45M | e0b3183 | ahead 0 / behind 87，工作区干净 | 落后 87 提交的只读快照 → 删 |
| `~/SAT-Math-vm` | 48M | 落后 10 | ahead 0 / behind 10 | 保留为主机权威副本，已 reset 到 origin/main |
| `~/prep` | — | 39c9f84 | 指向 `TimNotCook/SAT-Math-Prep` | **不动**（另一线上仓库，按边界规则不写入、不删除） |

## satrepo 删除前的内容核对（证据，均在本机 origin 引用上实际比对）

- **题号集合**：satrepo 的 `data/*` 是主线子集，无 satrepo 独有题目；`data/questions.js`、`data/text.js` 均比 origin 少 1000+ 行。
- **SP1-046 题干订正**（3621497「2x - wy = 47」）：origin/main `data/text.js` 已是同一写法。
- **登录超时兜底**（72b7929，实际在 `firebase-cloud.js`）：origin/main 已有 11 处「超时」文案，含「登录窗口加载超时…可改用 Apple 账号或邮箱登录」原文。
- **计算器关闭键 / 工具栏开关**（328f782、809492a）：origin/main `figures.js` 已有对应逻辑。
- **fmtMath 小数/千分位保护热修**（f927c51…1d41bfa 一路打补丁）：origin 已改走「补丁全部退休、源文件唯一事实」通道（fe8a9fb），不再需要内联 shim。
- **drill.js 空态提示**（`emptyNotice`）：origin/main 已有同名实现。
- **wrong.html 大改（+365 行）**：satrepo 是单体旧版；origin 已拆出 `wrong-page.js`（249 行）并保留 `wrong.html`，属结构重构，非丢失功能。
- **只存在于 satrepo 的 3 个文件**：
  - `.github/workflows/deploy.yml`：GitHub Pages 已走 branch 部署（classic），该 workflow 与现状重复，origin 已无。
  - `pdf-import.js`：origin 的 HTML 不再引用（0 处引用）。
  - `images/fig/TD-34-08.png`：1552×115 题干公式裁图；origin `data/text.json` 的 `TD-34-08.image` 指向 `images/TD-34-08.png`，但 `analysis.js:184` 注释明确「q.image 只是占位路径，不能作为图题依据」，渲染层不加载该字段，线上 404 不产生破图。

结论：satrepo / satrepo-vm 均**无独有内容、无未上线提交**，删除不丢东西。

## 执行结果

- `rm -rf ~/satrepo ~/satrepo-vm` → 释放约 112M
- `git -C ~/SAT-Math-vm reset --hard origin/main` → HEAD 073a1a9，工作区干净，与线上完全一致
- `~/prep` 原样保留

## 顺带核对的验收项（2026-11-24 当次）

- 题库题量：`data/questions.json` → **1009**（`data/text.json` 另有 3 条无答案键的旧文本条目 SP2-033 / SR-162 / TD-34-08，不参与判分）
- `npm test`：66 tests / 8 suites / 0 fail（含 `test/shaded-region.test.js`）
- 线上资源令牌：`v=2f54674265f8`（6ab8485 起生效）
