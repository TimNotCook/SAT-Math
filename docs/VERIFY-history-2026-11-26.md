# 模考记录页（history.html）验收 · 2026-11-26

> 验收对象：`history.html` + `history-page.js`（上游 `d607a5a` 新落，主会话补做交互验收）。
> 方法：本地 `python3 -m http.server 8811` + headless Chrome CDP；先用种子数据写 `localStorage` 再刷新，覆盖「可续存档 / 失效存档 / 已交卷三种 mode / 空态」四种情形。截图在 `docs/ui-shots/history-2026-11-26/`。

## 结论

三档 **390 / 655 / 1280**：横向滚动 0、出框元素 0（修完后）；折叠展开与 `aria-expanded` 同步；空态引导与「继续这卷」两路都通。修了 3 处。

## 修的问题

| # | 现象（改前） | 处置 |
|---|---|---|
| 1 | 390 档 `.hist-score` 被 `display:none` 藏掉，手机上一页只剩彩色小圆点，**分数——这页的主信息——看不见** | ≤640 恢复显示，字号 13px；四列改为「点 / 标题 / 分数 / 箭头」 |
| 2 | 390 档标题与日期同一行 nowrap，246px 宽被切半：「官方模考 · 全卷 44 题 2026/11/26 13…」 | 日期 `small` 改 `display:block`、移到标题下一行；标题仍单行省略 |
| 3 | `render()` 用 `.reverse()` 赌存储顺序，未做完的组内变成「旧的在上」，最新存档反而排后面 | 两组都显式 `sort((a,b)=>b.date-a.date)`，未做完整体仍在已交卷之前 |

## 交互实测（390 档）

- 可续存档（`abandoned.startedAt === session.startedAt` 且 `!session.finished`）→ 显示蓝色「继续这卷」，链接 `exam.html?mode=<rec.mode>`；
- 失效存档（会话已被覆盖）→ 不显示按钮，灰字「存档已失效（会话已被覆盖），仅供查看。」；
- 已交卷三条（mock / quiz / jiangyi）展开后：KV 行（交卷时间、答对、用时；mock 另有原始分、自适应路径）、错题行数 3 / 1 / 1、补强行数 2 / 0 / 0，与种子数据一致；
- 点标题栏：`open` class 与 `aria-expanded` 同步翻转，`hist-body` `display` 在 none / block 间切换；
- 空态：清空 storage 后显示「还没有模考或抽查记录…」，链接指向 `exam.html?mode=mock`。

## 没覆盖到的

- **真实交卷链路**没验：本机只灌种子数据，没有登录做一次模考再交卷。写入 `tdsat_exam_suite_results_v1` 的字段（`estimate.scaled`、`report.priority`、`detail`）是按 `history-page.js` 读取侧反推的；若 exam.js 实际写的字段不同，页面会显示「—」而不是崩。这条需要一次真机模考才能签收。
- **云同步（原先判断错了，已纠正并修）**：一开始以为「记录页只读 localStorage、不读云端」，实测 `cloud-account.js` 的快照按 `tdsat_` 前缀整包上传（只排除 `tdsat_prefs_v1`），`tdsat_exam_suite_results_v1` / `tdsat_exam_suite_abandoned_v1` **本来就在云档案里**，登录后 `afterSignIn()` 会把云端 payload 并回本机。真正的坑是 **`history.html` 没装云模块**：新设备直接打开记录页，脚本不启动，页面只看到本机空记录（要先打开 drill/exam 之类的页才会触发合并）。已给 history 补上 `cloud-config.js` / `supa-cloud.js` / `cloud-account.js`，并在 `test/nav.test.js` 加了守门断言：五张数据页缺任一云脚本就红。记录页右上角现在也有「设置」入口（登录/档案）。

## 回归

`npm test` 151 pass / 0 fail；`node tools/verify_nav.mjs` 38/38；记录页装云脚本后 TDSync 存在、账号按钮挂载、三档仍 0 溢出；`tools/narrow_check.mjs` 的页面清单已补 `history.html`，后续窄屏走查自动覆盖。
