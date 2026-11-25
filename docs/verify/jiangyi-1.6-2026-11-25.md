# 回执：U1 1.6「绝对值与方程」四题入库 + 缺号清零（U1 整节闭环）

窗口：2026-11-25 · 执行：开发者（数据侧）· 上游基线 `c029bd8`

## 一、改了什么

| 文件 | 改动 |
| --- | --- |
| `data/jiangyi.js` | 1.6 四题 `JY1-046`…`JY1-049`（`section:"1.6"`、`page` 37/37/37/38、`source` 逐题 `讲义 p37 #1…#4`），题干逐字对 p37–p38 原页；`JY1-047` 是填空（`type:"grid"`,`answer:"9"`,`value:9`），其余三题 `mcq`；四题无图无表，不挂 `figure`/`choiceTables` |
| `docs/jiangyi-proof/JY1-046.png` … `JY1-049.png` | 四张原页对照图，各为该题一整块裁剪（题号 + 题干 + 全部选项），无题号缺项 |
| `docs/jiangyi-backlog.md` | 由 `tools/gen_jiangyi_backlog.py` 重算：1.6 由 `4 / 0 / 4` → `4 / 4 / 0`，U1 小计 `49 / 49 / 0`，全册 `243 / 49 / 194`，完成节数 `6 / 24` |
| `tools/gen_jiangyi_backlog.py` | 派工注意第 1 条去掉「α 正在 1.6」的过期占位，改为「开工前看本表确认本节无人占用（U1 已全部结案，下一节从 2.1 起）」 |
| 五个页面 | 无改动：`bump_assets.py` 报 `already current`，资产版本仍是 `0c008daedc7c`（本轮只动台账与文档，未动 data 资产哈希） |

### 逐题核对（p36–p38 原页 300dpi，答案页 p192）

| id | 页 | 题干（原页逐字） | 选项 | 答案 | p192 |
|---|---|---|---|---|---|
| JY1-046 | 37 | `\|15 - x\| - 9 = 0` / What are all the possible solutions to the given equation? | -6 and -24 / -6 and 24 / 6 and -24 / 6 and 24 | D | 1. D ✔ |
| JY1-047 | 37 | `2\|4 - x\| + 3\|4 - x\| = 25` / What is the positive solution to the given equation? | 无（填空） | 9 | 2. 9 ✔ |
| JY1-048 | 37 | `f(x) = \|59 - 2x\|` / The function f is defined by the given equation. For which of the following values of k does f(k) = 3k? | 59/5 / 59/2 / 177/5 / 59 | A | 3. A ✔ |
| JY1-049 | 38 | How many solutions does the equation `\|x + 7\| = -4` have? | Zero / Exactly one / Exactly two / More than two | A | 4. A ✔ |

- 全页无水印裁切入库：四题只留文字字段，图一律不走 `figure_crops`；`docs/jiangyi-proof/` 只作对照，不进学生端。
- OCR 残渣复查：`f (x)`、`f (k)`、问号前空格、`\u00a0` 均未出现；`f(x)`/`f(k)` 与 `|59 - 2x|` 按原页记号紧排。
- p36 是纯理论页（`DEFINITION OF ABSOLUTE VALUE` + `|a| = { a if a ≥ 0 ; −a if a < 0 }` + `|x| = a ⟹ x = ±a (a ≥ 0)`），无题号，不进题库。

## 二、怎么验

```bash
cd /tmp/jy42wt
git show --stat 87ab6df            # 四题 + 四张对照图那次入库
grep -n '"section":"1.6"' data/jiangyi.js   # 4 条
python3 tools/gen_jiangyi_backlog.py         # need=243 have=49 miss=194，1.6 为 4/4/0
node --test test/*.test.js                   # 122 pass / 0 fail
```

线上核对（Pages，`?v=0c008daedc7c`）：

```bash
curl -s https://timnotcook.github.io/SAT-Math/data/jiangyi.js | grep -o '"JY1-04[6-9]"'
# "JY1-046" "JY1-047" "JY1-048" "JY1-049"
curl -s https://timnotcook.github.io/SAT-Math/jiangyi.html | grep -o 'jiangyi.js?v=[0-9a-f]*'
# jiangyi.js?v=0c008daedc7c
```

页面入口：`https://timnotcook.github.io/SAT-Math/jiangyi.html?v=0c008daedc7c&b=JY1&s=1.6&i=1…4`。

## 三、结果

- 节号：**1.6 绝对值与方程**
- 录了几题：**4**（1.6 应录 4，实有 4）
- 缺号：**4 → 0**；U1 小计 **4 → 0**，U1 五节全闭环
- commit：本轮 `docs(jiangyi): 1.6 四题台账落地…`（见 `git log`）；题库入库在 `87ab6df`
- 线上 v=：**0c008daedc7c**（`PASS 五页资源版本一致`，线上 `data/jiangyi.js` 已含四题）
