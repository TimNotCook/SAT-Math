# Topic 24 · Area and Volume — 逐题复算与逐字核对台账

> 来源：`docs/transcribe/04/pages/p02.jpg … p05.jpg`（书页 142–149，300dpi 灰度 JPEG）。
> 题包：`docs/transcribe/04/fragments/T24-b1.json`（首片 #1–#8）；后续分片追加。
> 口径：题干/选项逐字照扫描页录入；答案独立复算，无答案键页，以复算为准。
> 校验门：`python3 tools/transcribe_reconcile.py --check --section 4.5.T24`（退出 0，FAIL 0/WARN 0）；`node --test test/*.test.js`（仅 version-sync 因 bump 未跑红，safe_push 自动补）。

## 批次 B1：#1–#8（题包 T24-b1.json，id R04-001…R04-008）

| # | id | 页/侧 | 题型 | 答案 | 独立复算 | 逐字核对 | 图 |
|---|---|---|---|---|---|---|---|
| 1 | R04-001 | p02 左（书页142 左栏） | grid | **27556** | 边长比 166，面积比 = 166² = 27,556 | ✅ 题干两句、`k` 变量、问号逐字一致 | 无 |
| 2 | R04-002 | p02 左（书页142 左栏） | mcq **A** | 149,796 | 立方体 68³=314,432；球 (4/3)π·34³≈164,636.2；差≈149,795.8 → 就近 149,796（A）。B/C/D 为球体/立方体/干扰值 | ✅ edge length 68 inches、radius 34 inches、nearest cubic inch、not taken up；选项 A 149,796 / B 164,500 / C 190,955 / D 310,800 逐字（含千分位逗号） | 无 |
| 3 | R04-003 | p02 左（书页142 右栏） | grid | **518.4** | 360 × 1.2 × 1.2 = 518.4 | ✅ 360 square inches、increased by 20%、square inches 逐字 | 无 |
| 4 | R04-004 | p02 左（书页142 右栏） | grid | **29.68** | **无答案页可比（册内扫描无答案键页），按复算入**：线段端点 (-5,3)→(5,9)，腿长 = √[(5−(−5))²+(9−3)²] = √(10²+6²) = √136 = 2√34；三角形面积 = ½·(2√34)·L = 48√13 → L = 2·48√13/(2√34) = 48√13/√34 = 48·√13·√34/34 ≈ 29.6807；grid 取 29.68，与精确值偏差 0.0023（<1% 判分容差） | ✅ xy-plane、48√13 square units、other leg 逐字；端点坐标按网格复核 (-5,3)/(5,9) | chart（line+points） |
| 5 | R04-005 | p02 右（书页143 左栏） | grid | **24** | 三点 (-3,4),(5,3),(5,-3)：竖直底 6、水平高 8，面积 = ½·6·8 = 24 | ✅ three points shown、square units 逐字；三点坐标按网格复核 | chart（points） |
| 6 | R04-006 | p02 右（书页143 左栏） | grid | **6** | 三点 (7,12),(4,9),(7,6) 构成直角三角形，斜边=6 为直径，r=3，C=6π → k=6 | ✅ define a circle、kπ、constant 逐字；三点坐标按网格复核 | chart（points） |
| 7 | R04-007 | p02 右（书页143 右栏） | grid | **1849** | (129n/3n)² = 43² = 1849 | ✅ 3n、129n、positive constant、how many times 逐字 | 无 |
| 8 | R04-008 | p02 右（书页143 右栏） | mcq **B** | 12 | 腿 2√2 与 6√2（√80 为斜边），面积 = ½·2√2·6√2 = 12（B） | ✅ 2√2、6√2、√80、units 逐字；A 8√2 + √80 / B 12 / C 24√80 / D 24 逐字 | 无 |

### B1 校验记录（VM `/home/user/satm-t24` @ 58c5264）

- `python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/04/fragments/T24-b1.json --dry-run` → 新增 8 题 R04-001…R04-008，零 FAIL。
- 正式并入后 `python3 tools/rollup_declarations.py --write`：4.5 group=8、4.5.T24=8、U4 total=93，全 OK。
- `node` vm.runInContext 三文件加载无 SyntaxError，TD_BANK.questions 含 R04- 8 条。
- `node --test test/*.test.js`：130 pass / 1 fail（仅 version-sync，bump_assets 待 safe_push 跑，门控正常）。
- `python3 tools/transcribe_reconcile.py --check --section 4.5.T24`：校验 8 题，FAIL 0 / WARN 0，退出 0。
- `git diff --stat`：questions.js/text.js 仅末行补逗号 + 新增；figures.js 仅尾加 Object.assign 块；声明行由 rollup 回填（纯计数变化）。

### Mac 落推运行手册（VM 无凭证，仅供 Mac 在线后照跑）

VM 只做题包/台账/校验，不 push；Mac 侧拉到含 58c5264 的 origin/main 后照序执行：

```bash
# 1. 把 docs/transcribe/04/fragments/T24-b1.json 与本台账、§10 进度表带到 Mac 工作副本
git pull --ff-only origin/main
# 2. 题包机械并入（脚本自动 rollup --write + reconcile 参考输出）
python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/04/fragments/T24-b1.json
# 3. 补 4.5/4.5.T24 声明（脚本不自动建节点；在 unit 4 sections 的 4.4 之后插入）
#    {"id":"4.5","cn":"04 Geometry 专项练习（重录）","count":0,"isGroup":true,"childCount":0},
#    {"id":"4.5.T24","cn":"Topic 24 · Area and Volume","count":0,"topic":24,"parent":"4.5"}
#    （先插声明再跑 merge 也行；merge 内 rollup 会回填 count/childCount/total）
python3 tools/rollup_declarations.py --write
# 4. 门控
node --test test/*.test.js
python3 tools/transcribe_reconcile.py --check --section 4.5.T24
# 5. 落推（自动 commit→rebase→bump_assets→amend→push；禁止旁路直推）
bash safe_push.sh "feat(04): T24 专项 B1 #1–#8 + 4.5/4.5.T24 声明"
# 6. 线上验证
node tools/versions.mjs --base https://timnotcook.github.io/SAT-Math
curl -s https://timnotcook.github.io/SAT-Math/data/questions.js | grep -c '"R04-'
```

## 待续（#9–#42）

- #9–#42 题干待按 p03–p05 逐字落盘（本台账后续分片追加行）。
- 图形缺口登记（§8）：#10 圆锥、#13 圆柱、#38 四棱锥走 rawSvg；#4/#5/#6 chart 已入。
