# 修复记录：侧栏「设置」入口收口到「← 返回真题练习」同一组（2026-11-25）

## 现象
线上实测（基线 commit `45bb652`，本地 HEAD 同快照）三档宽度下，`.td-acct-btn`
（设置按钮）都不在「← 返回真题练习」的视觉组里：

- **宽屏 ≥1000（竖侧栏）**：按钮被 `margin:auto 0 0` 顶到侧栏最底，与返回链接
  纵向隔开整条侧栏的空白。wrong.html @1280：返回链接 `y=305.7`，按钮 `y=834.2`，
  **y 差 528.5px**（侧栏高 900px，按钮 bottom=878，贴底）。
- **≤999（横条模式）**：按钮被 `margin:0 0 0 auto` 单独推到横条最右端，与返回链接
  隔着一大片空白。wrong.html @655：返回链接 `x=12`（right=136.7），按钮 `x=597`，
  **水平间距 460.3px**；@390 两者还裂到两行（返回 `y=52.9`，按钮 `y=95.8`）。
- drill.html（无返回链接）同样受两条规则牵连：@1280 按钮贴底 `y=834.9`，
  @655 `x=597`、@390 `x=332` 吊在横条最右。

## 根因
全部逻辑在 `cloud-account.js`（注入样式 + `mountButton` 挂载）：

1. **宽屏贴底**：注入样式 `.site-rail .td-acct-btn.rail-settings{margin:auto 0 0;...}`
   —— 竖 flex 侧栏里 `margin-top:auto` 把按钮压到容器底部，和返回链接之间吃掉所有
   剩余高度。
2. **窄屏吊右**：`@media(max-width:999px){...margin:0 0 0 auto;...}` —— 横 flex 里
   `margin-left:auto` 把按钮单独推到行尾，返回链接留在导航流里，两者之间没有成组关系。
3. **挂载无锚点**：`place()` / `attach()` 直接 `appendChild(btn)` 成宿主最后一个子节点，
   靠 900ms 轮询重挂；DOM 位置不固定，样式层再怎么调都没有稳定的相邻关系可以依赖。

## 改法（只动 `cloud-account.js`；共享 CSS 的 `!important` 冻结条款未触碰）
方案：在分隔线之后建一个 `.rail-tail` 包裹组，返回链接与设置按钮永远在同一容器里；
宽屏竖排（链接在上、按钮紧挨其下），窄屏横排整组靠右、组内不换行不分裂。

`cloud-account.js` 注入样式（720–735 行）：
- 新增 `.rail-tail{display:flex;flex-direction:column;gap:4px;margin-top:6px}`；
- 宽屏按钮规则去掉 `margin:auto 0 0`，改为 `margin:0`；字号 / 内边距 / 圆角 / hover
  沿用原导航项视觉语言，未重新设计；
- `@media(max-width:999px)`：`.rail-tail` 改 `flex-direction:row;align-items:center;gap:8px`；
  `.rail-tail:has(.rail-back){margin-left:auto}` 把「链接 + 按钮」整组推右；
  按钮去掉 `margin:0 0 0 auto`，改为 `margin:0`；无返回链接的 drill 列表保持常规流，
  不单独甩到行尾。

`cloud-account.js` 挂载逻辑（1307–1361 行）：
- 新增 `railTail(rail)`：在 `.rail-sep` 之后取（或建）`.rail-tail`；有 `.rail-back`
  就把链接收进组内排前面，没有（drill 列表）组里只放按钮。
- 新增 `placeIn(h)`：rail 宿主把按钮插在组内返回链接之后（无链接则组内唯一）；
  ctx 宿主（做题视图 `.drill-context-right`）保持原「插入首个子节点」兜底路径不变。
- `place()` 每次轮询都会校验按钮是否仍在锚点位，位置被带偏就重新插回；不再靠
  `appendChild` 到宿主末尾硬凑。

## 本地三档数值（修复后，工作副本 HEAD 快照）
探针：CDP 无头 Chrome，视口 1280 / 655 / 390，等待 900ms 轮询至少两轮后读数。
完整结构化证据：`docs/ui-shots/bugfix-2026-11-25/settings-rail.json`。

### wrong.html（有 `.rail-back`）
| 宽度 | 按钮 rect (x,y,w×h) | 返回链接 rect (x,y,w×h) | y 差 | 水平间距 | 结论 |
|---|---|---|---|---|---|
| 1280 | 14, 354.6, 187×43.8 | 14, 311.7, 187×38.9 | 42.9（纵向 gap 4.0px） | — | 竖排相邻，链接下方；未贴底（bottom=398.4 / 栏高 900） |
| 655 | 597, 53.3, 46×38.1 | 464.3, 52.9, 124.7×38.9 | 0.4 | 8px | 同行相邻，整组靠右 |
| 390 | 332, 96.2, 46×38.1 | 199.3, 95.8, 124.7×38.9 | 0.4 | 8px | 同行相邻（第二行），整组靠右，无孤岛 |

### drill.html 列表（无 `.rail-back`，锚点在 `.rail-sep` 之后）
| 宽度 | 按钮 rect (x,y,w×h) | 分隔线 rect (y) | 结论 |
|---|---|---|---|
| 1280 | 14, 311.7, 187×43.1 | 290.7 | 分隔线下方整行，常规流排布，未贴底 |
| 655 | 537.9, 10.7, 46×37.4 | （窄屏隐藏） | 导航流末尾，与相邻项同 gap，未甩到行尾 |
| 390 | 236, 53.6, 46×37.4 | （窄屏隐藏） | 导航流末尾，与相邻项同 gap，无孤岛 |

### 做题视图兜底（`drill.html?sec=1.1&i=1`，`.drill-context-right` + `ctx-settings`）
| 宽度 | 父级 className | 按钮 rect (x,y,w×h) | 结论 |
|---|---|---|---|
| 1280 | drill-context-right bb-tools | 1056.1, 6.3, 42×33.4 | 兜底路径原样可用 |
| 655 | drill-context-right bb-tools | 431.1, 6.3, 42×33.4 | 兜底路径原样可用 |
| 390 | drill-context-right bb-tools | 166.1, 6.3, 42×33.4 | 兜底路径原样可用 |

## 证据产物
- 截图（9 张，6 张必备 + 3 张做题视图兜底）：
  - `docs/ui-shots/bugfix-2026-11-25/settings-rail-{1280,655,390}.png`（wrong 有返回链接）
  - `docs/ui-shots/bugfix-2026-11-25/settings-rail-drill-{1280,655,390}.png`（drill 无返回链接）
  - `docs/ui-shots/bugfix-2026-11-25/settings-rail-ctx-{1280,655,390}.png`（做题视图兜底）
- 结构化数值（父级 className、rect、y 差、水平间距、逐条验收结论、基线对照）：
  `docs/ui-shots/bugfix-2026-11-25/settings-rail.json`

## 本地验收
- `node --test test/*.test.js`：**139 / 139 通过，0 失败**（基线 131/0；并入隔壁 2.5–2.7 题库提交后测试增至 139）。
- `python3 bump_assets.py` 后 `python3 bump_assets.py --check`：**PASS**，五页 `?v=` 同值。
- `node tools/verify_a11y.mjs --out /tmp/proof-a11y-local`：**20 / 20 通过，0 失败**。
- `node tools/verify_session.mjs --out /tmp/proof-session-local`：**22 / 22 通过，0 失败**。
- `node tools/narrow_check.mjs http://127.0.0.1:8481 /tmp/proof-narrow-local`：
  **14 屏次，横向滚动 0，出框 0**。

## 线上实测
- 修复提交：`8722a0cc24e3657be2ed1ce5b424ae085c3b53f6`（`fix(ui): 设置入口收口到「← 返回真题练习」同一组……`），推送时间 2026-11-25 19:15:59 +0700，普通 `push origin main`，未使用 force push。
- 线上 `?v=` 实测：**`09e7f0f6bc57`**（2026-11-25 19:22 +0700 回拉五页 HTML 核对；该合并哈希在隔壁 2.7 题库提交 `1017ddf` 后刷新，`cloud-account.js` 本体未变）。
- 线上 `cloud-account.js` 与本地逐字节一致（SHA-256 前 16 位 `c98f1d0c379cf88e`）：`.rail-tail` 规则 ×7，旧的 `margin:auto 0 0` / `margin:0 0 0 auto` 计数 **0**。

### 线上三档复测（CDP 无头 Chrome，等待轮询至少两轮后读数；与本地修复后数值一致）

#### wrong.html（有 `.rail-back`，父级 `rail-tail`）
| 宽度 | 按钮 rect (x,y,w×h) | 返回链接 rect (x,y,w×h) | y 差 | 水平间距 | 结论 |
|---|---|---|---|---|---|
| 1280 | 14, 354.6, 187×43.8 | 14, 311.7, 187×38.9 | 42.9（纵向 gap 4.0px） | — | 竖排相邻，链接下方；未贴底（bottom=398.4 / 栏高 900） |
| 655 | 597, 53.3, 46×38.1 | 464.3, 52.9, 124.7×38.9 | 0.4 | 8px | 同行相邻，整组靠右 |
| 390 | 332, 96.2, 46×38.1 | 199.3, 95.8, 124.7×38.9 | 0.4 | 8px | 同行相邻（第二行），整组靠右，无孤岛 |

#### drill.html 列表（无 `.rail-back`，父级 `rail-tail`，锚点在 `.rail-sep` 之后）
| 宽度 | 按钮 rect (x,y,w×h) | 结论 |
|---|---|---|
| 1280 | 14, 311.7, 187×43.1 | 分隔线下方整行，常规流排布，未贴底 |
| 655 | 537.9, 10.7, 46×37.4 | 导航流末尾，与相邻项同 gap，未甩到行尾 |
| 390 | 236, 53.6, 46×37.4 | 导航流末尾，与相邻项同 gap，无孤岛 |

#### 做题视图兜底（`drill.html?sec=1.1&i=1`，父级 `drill-context-right bb-tools`）
| 宽度 | 按钮 rect (x,y,w×h) | 结论 |
|---|---|---|
| 1280 | 1056.1, 6.3, 42×33.4 | 兜底路径原样可用 |
| 655 | 431.1, 6.3, 42×33.4 | 兜底路径原样可用 |
| 390 | 166.1, 6.3, 42×33.4 | 兜底路径原样可用 |

### 线上验收脚本（base `https://timnotcook.github.io/SAT-Math`，2026-11-25 19:2x +0700）
- `node tools/verify_a11y.mjs --base <线上> --out /tmp/proof-live2-a11y`：**20 / 20 通过，0 失败**，退出码 0。
- `node tools/verify_session.mjs --base <线上> --out /tmp/proof-live2-session`：**22 / 22 通过，0 失败**，退出码 0。
- `node tools/narrow_check.mjs <线上> /tmp/proof-live2-narrow`：**14 屏次，横向滚动 0**，退出码 0。模考/做题视图下有 8 个题面、选项节点 sw 略宽于 clientW（`overflowX:hidden`，无横向滚动），名单内不含 `.td-acct-btn` / `.rail-tail`，与本次设置入口改动无关。
