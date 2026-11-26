# 讲义录入 4.2 三角形、全等与相似 —— 交付核验（2026-11-26）

## 节号 / 题量

- 节号：`4.2`（Unit 4 Geometry and Trigonometry），原页 p153–p163，答案页 p195，declared 14。
- 本次录入 **14 道**：`JY4-060 … JY4-073`（题号 #1–#14，无缺号、题号递增）。
- 全册缺号：**51 → 37**（`need=243 have=206 miss=37 sections=24`）；本节 **0/14 → 14/14**。
- 教材原题子组未动：`JY4-052…055`（`group:"textbook"`，`source:"练习册 P…"`）仍各自独立，未重复计入官方 14。

## 逐题口径（题干 / 答案）

| id | 原页 | 类型 | 答案 | 备注 |
| --- | --- | --- | --- | --- |
| JY4-060 | p154 #1 | grid | 83 | 图 `JY4-060`（geo 四点+斜线）；`Note: Figure not drawn to scale.` 并入 stem 首句 |
| JY4-061 | p154 #2 | mcq | C | 选项含 √2 |
| JY4-062 | p155 #3 | mcq | B | 选项含 √2 |
| JY4-063 | p155 #4 | grid | 104 | 等边三角形高 k√3 |
| JY4-064 | p155 #5 | grid | 42 | 高 21，周长 a√3 |
| JY4-065 | p157 #6 | mcq | B | 选项含 m∠CAB 等，△ 用正三角字符 |
| JY4-066 | p157 #7 | mcq | C | |
| JY4-067 | p158 #8 | mcq | D | 图 `JY4-067`（AE、BD 交于 C，两条 10 标注） |
| JY4-068 | p160 #9 | mcq | C | ∠Z 20°、2XY = RS |
| JY4-069 | p160 #10 | mcq | D | AA 已足，No additional information is needed. |
| JY4-070 | p161 #11 | mcq | D | 答案键 D：∠M=70°、∠T=50° 补足 AA；B 的 MN/ST 是 ∠N/∠T 的邻边，对应角未给，SSA 不足 |
| JY4-071 | p161 #12 | grid | 4.5 or 9/2 | 图 `JY4-071`（BD⊥AC，两处直角符号）；DC = 6²/8 = 4.5 |
| JY4-072 | p163 #13 | grid | 70 | 图 `JY4-072`（正九边形九连线）；x = (180 − 40)/2 |
| JY4-073 | p163 #14 | grid | 85/87 or .977 | value 0.977；内角 = (87−2)×180/87 |

题干一律逐字对原页录入，未带 `f (x)`、问号前空格、OCR 残渣；`p156`（全等定理）、`p159`（相似定理）、`p162`（多边形性质）为概念页，不录题。

## 图表

四张图全为 `geo` 矢量重画（spec 现算，无裁页、无扫描件）：

- `JY4-060`：底边 D–E–A 共线，D–B 长斜线（C 落在其上），C–A、B–E 交叉，标 x° / 104° / 45°。
- `JY4-067`：AE、BD 两段相交于 C，AB、DE 各标 10。
- `JY4-071`：△ABC 以 AC 为底、BD 垂直 AC；本轮给 `geo` 新增 `rights`（按两条边的单位方向画直角小方框），D 与 B 各一处。
- `JY4-072`：正九边形九个顶点坐标按 40° 步长计算，九条半径线 + 九条边，右下三角形底角标 x°。

## JY1-042 note 口径（Tim 指定，已确认）

- 字段值与指定文本一致：`教材原页只印出一条 y > 7x - 4，题干写作 system of inequalities 与页面不符，属教材漏印；按原页录入可见内容，不自行补写。`
- `note` 只在数据层：`jiangyi-core.js` 与 `jiangyi-page.js` 中 `note` 零引用，`note` 不进学生端渲染。题干、choiceTables、答案 D 均未改动（本次提交未触碰 `JY1-042`）。

## 验收

- `python3 tools/gen_jiangyi_prep.py` → 开工表与缺题数一致（`jiangyi-prep.test.js` 绿）。
- `python3 tools/gen_jiangyi_backlog.py` → `need=243 have=206 miss=37 sections=24`。
- `python3 bump_assets.py .` → `PASS 五页资源版本一致：4de343fe4d80`。
- `node --test test/*.test.js` → **142 pass / 0 fail**。
