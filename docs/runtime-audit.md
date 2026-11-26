# 运行时体检（2026-11-26 自查轮）

> 口径：只读。三个脚本都只做导航/读 DOM/读文件，不写库、不改数据。
> 基线：`origin/main` 61244ad 之后的工作树。

## 这一轮揪出来的东西

| # | 问题 | 影响 | 处置 |
|---|---|---|---|
| 1 | `data/text.js` / `data/questions.js` 里 5 道阴影题（U1-12、U1-13、TD-15-01、TD-15-02、TD-15-03）仍指 `images/fig/*.png`，而这些文件线上 404 | 视觉上没坏（`figures.js` 先查 `TD_FIG_SPECS`，矢量图已覆盖），但留下会 404 的死指针，新人照它会生成位图 | 删掉 10 处死 `image` 字段；矢量 spec 未动 |
| 2 | `sw.js` 的 `var VERSION = 'satmath-v2'` 自 2026-11-23 起没再变过，注释却写「每次部署请 bump」 | 每次发版缓存桶不变，导航缓存里的旧 HTML / 旧 SW 逻辑不会自愈 | `bump_assets.py` 现在把 `VERSION` 写成 `satmath-<构建令牌>`，并把 `sw.js` 纳入哈希（VERSION 行先抹掉，避免自指）；`--check` 会验它跟令牌一致 |
| 3 | 根目录 `questions.js`（1009 题）头部仍自称「唯一答案源」 | 与 `data/questions.js`（1292）双源，谁改错都可能白干 | 头部改成「历史快照，唯一答案源 = data/questions.js」，并说明哪些旧脚本还在引用它 |
| 4 | 缺一条能拦住「引用不存在的图 / 题库与文本层掉队」的校验 | 这类坏数据只会在页面上表现为“图没了/选项空白”，没人报警 | 新增 `tools/verify_assets.mjs`（进 `test/assets.test.js`，随 `node --test` 跑） |

## 阴影题实测（P0-2 验收口径）

`tools/verify_shaded_figures.mjs` 逐题打开 drill 题位，断言 `.td-figure svg` 存在、无 `.td-figure--missing`、无位图 `<img>`：

```
PASS U1-12   (L1#12)      svg=true 图元=41
PASS U1-13   (L1#13)      svg=true 图元=37
PASS TD-15-01(1.5#1)      svg=true 图元=37
PASS TD-15-02(1.5#2)      svg=true 图元=27
PASS TD-15-03(1.5#3)      svg=true 图元=41
PASS R04-104 (4.5.T26#4)  svg=true 图元=5
```

6/6 通过，截图在脚本 `--out` 目录（默认 `/tmp/shaded-proof`）。即：**P0-2 的渲染面已经是对的，缺陷只剩数据里的死指针**，本轮已清。

## 三个脚本怎么跑

```bash
node tools/verify_assets.mjs          # 静态：引用/令牌/SW 版本/题库一致性
node tools/verify_runtime.mjs         # 运行时：逐页收 JS 异常、console.error、4xx/5xx、加载失败
node tools/verify_shaded_figures.mjs  # 阴影题矢量图渲染（6 条记录）
# 都能加 --base https://timnotcook.github.io/SAT-Math 直接打线上
```

`verify_runtime.mjs` 这一轮的结果：六页 0 个 JS 异常、0 个 4xx；`index.html` 有一条 `ERR_CONNECTION_RESET`（根跳转桩里对 Supabase 的探测请求被网络侧 reset，非站点缺陷，已标注忽略）。

## 还没动的

- `images/fig/` 下仍有历史位图（约 179 个引用）供未被矢量覆盖的题兜底；新录题一律矢量，不再新增位图（`test/jiangyi.test.js` 已守）。
- `questions.js` 旧脚本（`fold_patches.py` / `merge_transcribe_fragment.py` / `patch_answers.py`）仍在按路径写根目录那份，迁移属于另一单活，本轮只做标注，不改脚本。
