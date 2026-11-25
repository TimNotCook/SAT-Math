# T25b 对账台账 · 04 Geometry · Topic 25（Lines, Angles, and Triangle）#20–#37

- 题包：`docs/transcribe/04/fragments/T25b.json`（R04-080 … R04-097，共 18 题；grid 14 / mcq 4）
- 权威源：扫描页 `docs/transcribe/04/pages/p08.jpg`（书页 154–155）、`p09.jpg`（156–157）、`p10.jpg`（158–159），300dpi 灰度；局部以 pymupdf 裁切等价的 PIL 高倍放大复核（PDF 在 Mac，VM 无 PDF，故用已入库页面图裁切）。
- 答案口径：本册扫描区间（142–174）无独立答案页；仅 #26 grid 框下印有答案数 122，其余题框下无印刷答案，一律独立复算后标注"扫描页未印，以复算为准"。
- 行内约定：减号 `−`（U+2212）、度数 `°`、根号 `√`、角 `∠`、三角 `Δ` 照原页；线段上划线不录入纯文本（`text.js` 家法为纯字母，如 `RT`）；`=` 两侧空格按家法统一（原页个别 `BC= 72.` 窄距不另标）。

---

## 批次 1：#20–#25（R04-080..085）自检记录

命令：`python3 /tmp/build_t25b.py`（批次切片内联校验）+ `python3 /tmp/check_t25b.py`（终文件校验）

```
[自检] B1 #20-#25: 6 题累计 6; 错误 0
[自检] B2 #26-#29: 4 题累计 10; 错误 0
[自检] B3 #30-#34: 5 题累计 15; 错误 0
[自检] B4 #35-#37: 3 题累计 18; 错误 0
PASS; wrote .../fragments/T25b.json 18 题
```

### R04-080 · #20 · grid · 464 · medium
- **原页定位**：p08（书页 155）左栏，跨中缝；图为四边形 KLMN（L 左下、M 左上、N 右上、K 右下），对角线 KM、LN 未画出；`Note: Figure not drawn to scale.`
- **逐字核对**：
  - 题干关键片段：`In quadrilateral KLMN shown, KL = 5, LM = 5, KN = 21, and MN = 21. Diagonals KM and LN (not shown) intersect at point G (not shown), where GK = 1 and GM = 1. If the length of diagonal LN is (√p + √w), where p and w are integers, what is the value of p + w?`
  - 度数符号：本题无。上下标：无。单位：无。括号：`(√p + √w)` 括号平衡 ✓；`(not shown)` 两处 ✓。连字符：无。变量大小写：`KLMN / KL / LM / KN / MN / KM / LN / G / GK / GM / p / w` 全大写顶点、小写 p,w ✓。above/below：无。
- **选项逐项**：grid，`choices:{}` ✓。
- **图形要素 ↔ spec**：四边形（风筝形）四边标注 5/5/21/21，对角线不画，交点 G 文字给定；无现成模板，合并写者宜 rawSvg（顶点 L/M/N/K、四边、注 not drawn to scale）。
- **答案复算**：KL=LM=5、KN=MN=21 → 关于 KM 轴对称的风筝形，LN⊥KM 于 G；GK=GM=1。Rt△GKL：GL=√(5²−1²)=√24；Rt△GKN：GN=√(21²−1²)=√440；LN=√24+√440 → p=24、w=440 → p+w=**464**。扫描页未印该题答案，以复算为准。
- **结论**：逐字已核，答案 464。

### R04-081 · #21 · grid · 28/3（9.33）· medium
- **原页定位**：p08（155）左栏 #20 下方；图为 Rt△ABC（B 直角），D 在 AB 上、E 在 AC 上，DE∥BC；`Note: Figure not drawn to scale.`
- **逐字核对**：
  - 题干关键片段：`In figure above, ΔABC is right triangle. DE is parallel to BC. The area of ΔABC is 504, DE = 24, and BC = 72. What is the length of DB?`
  - 易错点：开头 **`In figure above,` 无 the**（高倍裁切确认，非 "In the figure above"）；`above` 位置词保留 ✓；`ΔABC` 三角符号两处 ✓；数值 504 / 24 / 72 ✓；单位无；括号无；变量大写 ✓。
- **选项逐项**：grid，`choices:{}` ✓。
- **图形要素 ↔ spec**：triangle 模板（right:[1]=B），D 在左腰 AB、E 在斜边 AC，DE∥BC 标注。
- **答案复算**：△ADE∽△ABC，比 24/72=1/3 → AD/AB=1/3；504=½·72·AB → AB=14；DB=14·(2/3)=**28/3≈9.33**。扫描页未印，以复算为准。
- **结论**：逐字已核，答案 28/3。

### R04-082 · #22 · grid · 10/3（多解）· medium
- **原页定位**：p08（155）中栏 #20 右侧；图为 Rt△ABC（C 直角），底边 A 到垂足 5、垂足到 C 共 7，内竖线 x，高 y；`Note: Figure not drawn to scale.`
- **逐字核对**：
  - 题干关键片段：`The area of triangle ABC above is at least 48 but no more than 60. If y is an integer, what is one possible value of x?`
  - 易错点：`above` 保留 ✓；`at least 48 but no more than 60` 区间词 ✓；`y is an integer`；问 x（内竖线）非 y ✓；无度数符号、无单位、无括号、无连字符。
- **选项逐项**：grid，`choices:{}` ✓。
- **图形要素 ↔ spec**：triangle（right:[2]=C），底边刻度 5/7、内竖线 x、高 y 标注。
- **答案复算**：底=12，面积=6y，48≤6y≤60 → y∈{8,9,10}；x=5y/12 → y=8→**10/3≈3.33**；y=9→15/4=3.75；y=10→25/6≈4.17，任填其一。扫描页未印，以复算为准。
- **结论**：逐字已核，答案 10/3（3.75 / 4.17 等价亦可）。

### R04-083 · #23 · grid · 30 · medium
- **原页定位**：p08（155）中栏 #22 下方；图为 Rt△CAE（A 直角），C-B-A 底边 CB=8，B 处竖线 BD=6，EA=18；`Note: Figure not drawn to scale.`
- **逐字核对**：
  - 题干关键片段：`In the figure above, BD is parallel to AE. What is the length of CE?`
  - 易错点：`above` ✓；`BD is parallel to AE`；问斜边 CE ✓；无度数符号、无单位、无括号。
- **选项逐项**：grid，`choices:{}` ✓。
- **图形要素 ↔ spec**：triangle（right:[1]=A），CB=8、BD=6、EA=18 标注，BD∥AE。
- **答案复算**：△CBD∽△CAE，CB/CA=6/18=1/3 → CA=24；CE=√(24²+18²)=√900=**30**。扫描页未印，以复算为准。
- **结论**：逐字已核，答案 30。

### R04-084 · #24 · grid · 189 · medium
- **原页定位**：p08（155）右栏；图为 Rt△ADE（E 直角），B 在 AD 上、C 在 AE 上为垂足，BC⊥AE；`Note: Figure not drawn to scale.`
- **逐字核对**：
  - 题干关键片段：`In the figure shown, AB = √85 units, AC = 7 units, and CE = 14 units. What is the area in square units, of triangle ADE?`
  - 易错点：`shown`（非 above）✓；根号 `√85` ✓；单位 `units` / `square units` 照抄 ✓；逗号在 `AC = 7 units, and CE = 14 units.` ✓；问面积 ✓。
- **选项逐项**：grid，`choices:{}` ✓。
- **图形要素 ↔ spec**：triangle（right:[2]=E），AB=√85、AC=7、CE=14 标注。
- **答案复算**：BC=√(85−49)=6；AC/AE=7/21=1/3 → DE=18；面积=½·21·18=**189**。扫描页未印，以复算为准。
- **结论**：逐字已核，答案 189。

### R04-085 · #25 · grid · 44/3（14.67）· medium
- **原页定位**：p08（155）右栏 #24 下方；**无图**（纯文字）。
- **逐字核对**：
  - 题干关键片段：`In triangle RST, angle T is a right angle, point L lies on RS, point K lies on ST, and LK is parallel to RT. If the length of RT is 72 units, the length of LK is 24 units, and the area of triangle RST is 792 square units, what is the length of KT, in units?`
  - 易错点：`right angle` 拼写 ✓；`lies on RS / lies on ST`；`LK is parallel to RT`；单位 `units` / `square units` ✓；数值 72 / 24 / 792 ✓；问 KT ✓。
- **选项逐项**：grid，`choices:{}` ✓。
- **图形要素 ↔ spec**：无图；合并写者如需示意可用 triangle（right:[2]=T）+ LK∥RT。
- **答案复算**：△SLK∽△SRT 比 24/72=1/3 → SK/ST=1/3、KT/ST=2/3；792=½·72·ST → ST=22；KT=44/3≈**14.67**。扫描页未印，以复算为准。
- **结论**：逐字已核，答案 44/3。

---

## 批次 2：#26–#29（R04-086..089）自检记录

```
[自检] B2 #26-#29: 4 题累计 10; 错误 0
```

### R04-086 · #26 · grid · 122 · easy
- **原页定位**：p09（书页 156）左栏顶部；**无图**；grid 框下印刷答案 `122`。
- **逐字核对**：
  - 题干关键片段：`In triangle ABC, the measure of angle A is 29°, the measure of angle B is 90°, and the measure of angle C is (k/2)°. What is the value of k?`
  - 易错点：度数符号 `°` 三处 ✓；分数 `(k/2)` 括号 ✓；变量小写 k ✓；无单位。
- **选项逐项**：grid，`choices:{}` ✓。
- **图形要素 ↔ spec**：无图。
- **答案复算**：∠C=180−29−90=61°=(k/2)° → k=**122**；册内印刷 122 = 复算 122 ✓（唯一对得上印刷答案的题）。
- **结论**：逐字已核，答案 122，与册内印刷一致。

### R04-087 · #27 · grid · 12/5（2.4）· medium
- **原页定位**：p09（156）左栏 #26 下方；图为 Rt△MNP（N 直角），Q 为 N 到 MP 的垂足，MN=3、NP=4；`Note: Figure not drawn to scale.`
- **逐字核对**：
  - 题干关键片段：`In the figure above, what is the length of NQ?`
  - 易错点：`above` ✓；问斜边上的高 NQ ✓；无度数/单位/括号。
- **选项逐项**：grid，`choices:{}` ✓。
- **图形要素 ↔ spec**：triangle（right:[0]=N），MN=3、NP=4、NQ⊥MP。
- **答案复算**：MP=5；斜边上的高=MN·NP/MP=12/5=**2.4**。扫描页未印，以复算为准。
- **结论**：逐字已核，答案 12/5。

### R04-088 · #28 · grid · 9/2（4.5）· medium
- **原页定位**：p09（156）中栏顶部；图为 Rt△ABC（B 直角），BD⊥AC 于 D；`Note: Figure not drawn to scale.`
- **逐字核对**：
  - 题干关键片段：`In the figure above, BD = 6 and AD = 8. What is the length of DC?`
  - 易错点：`above` ✓；BD=6、AD=8 ✓；问 DC ✓。
- **选项逐项**：grid，`choices:{}` ✓。
- **图形要素 ↔ spec**：triangle（right:[0]=B），BD⊥AC，BD=6、AD=8。
- **答案复算**：射影定理 BD²=AD·DC → 36=8·DC → DC=**9/2=4.5**。扫描页未印，以复算为准。
- **结论**：逐字已核，答案 9/2。

### R04-089 · #29 · grid · 3 · hard
- **原页定位**：p09（156）中栏 #28 下方；图同 #28（Rt△ABC，B 直角，BD⊥AC）；`Note: Figure not drawn to scale.`
- **逐字核对**：
  - 题干关键片段：`In the figure shown, AD = 121/3 and AB = 11√130/3. What is the length of DC?`
  - 易错点：`shown` ✓；堆叠分数 121/3、(11√130)/3 纯文本写 `121/3`、`11√130/3` ✓；根号 `√130` ✓；问 DC ✓。
- **选项逐项**：grid，`choices:{}` ✓。
- **图形要素 ↔ spec**：同 #28 triangle（right:[0]=B）。
- **答案复算**：BD²=AB²−AD²=[121·130−121²]/9=121 → BD=11；BD²=AD·DC → 121=(121/3)·DC → DC=**3**。扫描页未印，以复算为准。
- **结论**：逐字已核，答案 3。

---

## 批次 3：#30–#34（R04-090..094）自检记录

```
[自检] B3 #30-#34: 5 题累计 15; 错误 0
```

### R04-090 · #30 · mcq · D · easy
- **原页定位**：p09（书页 157）左栏顶部；**无图**（正方形文字描述）。
- **逐字核对**：
  - 题干关键片段：`Quadrilateral ABCD is a square with diagonal AC, where AC = 13. Which of the following statements is true?`
  - 易错点：`diagonal AC`；`where AC = 13`；`Which of the following statements is true?` ✓。
- **选项逐项**：
  - A `BC = 26` —— 对角线 13，边长 13/√2，✗；
  - B `CD = 13` —— 边≠对角线，✗；
  - C `AB is congruent to AC.` —— 边≅对角线，✗；
  - D `ΔABC is congruent to ΔCDA.` —— 斜边 AC=CA 公共、直角边 AB=CD，HL 全等，✓。
- **图形要素 ↔ spec**：无图。
- **答案复算**：A/B/C 均把边与对角线混同；D 成立 → **D**。册内未圈选，独立复算定 D。
- **结论**：逐字已核，答案 D。

### R04-091 · #31 · grid · 125 · medium
- **原页定位**：p09（157）左栏 #30 下方；**无图**。
- **逐字核对**：
  - 题干关键片段：`In triangle RST, the measure of angle R is 39°, the measure of angle S is x°, and the measure of angle T is (8x − 3)°. Point L lies on RS, point K lies on ST, and LK is parallel to RT. What is the measure, in degrees, of angle SKL? (Disregard the degree symbol when entering your answer.)`
  - 易错点：度数 `°` ✓；减号 `−`（U+2212）在 `(8x − 3)°` ✓；`(Disregard the degree symbol when entering your answer.)` 括注照抄 ✓；变量 x 小写 ✓。
- **选项逐项**：grid，`choices:{}` ✓。
- **图形要素 ↔ spec**：无图；示意可用 triangle + LK∥RT。
- **答案复算**：39+x+8x−3=180 → x=16，∠T=125°；LK∥RT → △SLK∽△SRT，∠SKL 对应 ∠T=**125**。扫描页未印，以复算为准。
- **结论**：逐字已核，答案 125。

### R04-092 · #32 · grid · 55/57（0.965）· easy
- **原页定位**：p09（157）左栏 #31 下方；**无图**。
- **逐字核对**：
  - 题干关键片段：`A polygon has exactly 57 sides. If the measure of each of the 57 interior angles of this polygon is (180p)°, what is the value of p?`
  - 易错点：`exactly 57 sides`；`(180p)°` 括号与度数 ✓；p 小写 ✓。
- **选项逐项**：grid，`choices:{}` ✓。
- **图形要素 ↔ spec**：无图。
- **答案复算**：内角和=(57−2)·180=55·180，每个角=55·180/57=180·(55/57) → p=**55/57≈0.965**。扫描页未印，以复算为准。
- **结论**：逐字已核，答案 55/57。

### R04-093 · #33 · grid · 1760 · hard
- **原页定位**：p09（157）右栏顶部；**无图**。
- **逐字核对**：
  - 题干关键片段：`A line intersects two parallel lines, forming four acute angles and four obtuse angles. The measure of one of the acute angles is (7x − 610)°. The sum of the measures of one of the acute angles and three of the obtuse angles is (−14x + w) °. What is the value of w?`
  - 易错点：`(7x − 610)°` 减号 ✓；`(−14x + w) °` **° 前原页有空格**，照抄保留 ✓；`three of the obtuse angles` ✓；w 小写 ✓。
- **选项逐项**：grid，`choices:{}` ✓。
- **图形要素 ↔ spec**：无图；如需示意用 parallelLines。
- **答案复算**：锐角 a=7x−610，钝角 b=790−7x；a+3b=(7x−610)+3(790−7x)=−14x+1760 → w=**1760**。扫描页未印，以复算为准。
- **结论**：逐字已核，答案 1760。

### R04-094 · #34 · mcq · A · hard
- **原页定位**：p09（157）右栏 #33 下方；**无图**。
- **逐字核对**：
  - 题干关键片段：`A line intersects two parallel lines, forming four acute angles and four obtuse angles. The measure of one of these eight angles is (7x − 250)°. The sum of the measures of four of the eight angles is k°. Which of the following could NOT be equivalent to k, for all values of x?`
  - 易错点：`could NOT` 大写 NOT ✓；`(7x − 250)°` 减号 ✓；`for all values of x` ✓。
- **选项逐项**：
  - A `−14x + 1,540` —— 千分位逗号 ✓；a+3b=−14x+1,040 ≠ 此式 ✗；
  - B `14x − 320` —— 3a+b=14x−320 ✓ 等价；
  - C `−28x + 1,720` —— 4b=−28x+1,720 ✓ 等价；
  - D `360` —— 2a+2b=360 ✓ 等价。
- **图形要素 ↔ spec**：无图；示意 parallelLines。
- **答案复算**：仅 A 不能等价 → **A**。册内未圈选，独立复算定 A。
- **结论**：逐字已核，答案 A。

---

## 批次 4：#35–#37（R04-095..097）自检记录

```
[自检] B4 #35-#37: 3 题累计 18; 错误 0
```

### R04-095 · #35 · mcq · C · hard
- **原页定位**：p10（书页 158）左栏顶部；**无图**（坐标文字描述）。
- **逐字核对**：
  - 题干关键片段：`Triangles PQR and LMN are graphed in the xy-plane. Triangle PQR has vertices P, Q, and R at (5, 2), (5, 4), and (7, 2), respectively. Triangle LMN has vertices L, M, and N at (5, 2), (5, 4 + k), and (7 + k, 2), respectively, where k is a positive constant. If the measure of ∠Q is t°, what is the measure of ∠N?`
  - 易错点：`xy-plane` ✓；坐标逗号空格 `(5, 2)` ✓；`4 + k`、`7 + k` 空格 ✓；`positive constant`；`∠Q`/`∠N` 角符号 ✓；`t°` ✓。
- **选项逐项**：
  - A `(90 − (t − k))°`；B `(90 − (t + k))°`；C `(90 − t)°`；D `(90 + k)` —— **D 无 °**，照抄 ✓。
- **图形要素 ↔ spec**：无图；示意可 chart 画两直角三角形。
- **答案复算**：PQR：QP=2、PR=2 → ∠Q=45°=t；LMN：NM 水平跨度 2+k、竖直高度 2+k → ∠N=45°=90−t，与 k 无关 → **C**。册内未圈选，独立复算定 C。
- **结论**：逐字已核，答案 C。

### R04-096 · #36 · grid · 47 · medium
- **原页定位**：p10（158）左栏 #35 下方；**无图**。
- **逐字核对**：
  - 题干关键片段：`In convex pentagon ABCDE, segment AB is parallel to segment DE. The measure of angle B is 139 degrees, and the measure of angle D is 174 degrees. What is the measure, in degrees, of angle C?`
  - 易错点：`convex pentagon`；`degrees` 英文拼写（非 ° 符号）两处 ✓；139 / 174 ✓；问 angle C ✓。
- **选项逐项**：grid，`choices:{}` ✓。
- **图形要素 ↔ spec**：无图。
- **答案复算**：AB∥DE，截线 AE → ∠A+∠E=180；五边形和 540=∠A+139+∠C+174+∠E → ∠C=540−180−139−174=**47**。扫描页未印，以复算为准。
- **结论**：逐字已核，答案 47。

### R04-097 · #37 · mcq · D · hard
- **原页定位**：p10 左页（书页 158）右栏，题干跨中缝、选项在 158 右栏；**无图**。
- **逐字核对**：
  - 题干关键片段：`In triangle XYZ, the measure of angle X is x°, the measure of angle Y is y°, and the measure of angle Z is 33°. If x > y > 33, which of the following additional pieces of information is NOT sufficient to determine the values of x and y?`
  - 易错点：`x > y > 33` 连写不等号 ✓；`NOT sufficient` 大写 NOT ✓；`additional pieces of information` ✓；度数 `°` 三处 ✓。
- **选项逐项**：
  - A `The value of 33 − x − 2y`；B `The value of 33 + 2x + y`；C `The value of 33 − 2x + 2y`；D `The value of 33 − 2x − 2y`（减号 − 照抄）。
- **图形要素 ↔ spec**：无图。
- **答案复算**：x+y=147；A/B/C 各给独立线性组合可解；D=33−2(x+y)=−261 恒成立，无新信息 → **D**。册内未圈选，独立复算定 D。
- **结论**：逐字已核，答案 D。

---

## 终检命令与输出

```
$ python3 /tmp/check_t25b.py
题数=18  id=R04-080..R04-097  no=20..37
PASS: 必填字段/选项数/答案字母/grid value/figSpec/id连续 全部通过

$ python3 -c "import json; json.load(open('docs/transcribe/04/fragments/T25b.json',encoding='utf-8'))"
JSON OK（可解析）
```

## 官方合并脚本 dry-run（入库写者口径校验）

```
$ python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/04/fragments/T25b.json --dry-run
题包: book='04' topic=25 section=4.5.T25 · 共 18 题
将新增 18 题: R04-080 … R04-097（全量，无撞号）
[dry-run] 未写盘。
exit=0
```
脚本硬规则（mcq answer∈A–E 在 choices 内、grid value 有限数字、choices 空对象、section=unit、paper 含「专项」、禁 image 位图）全部通过。

## 自查修掉的差异（初稿 → 终稿）

1. **#21 开头冠词**：初稿拟写 `In the figure above,`，高倍裁切证明原页为 `In figure above,`（无 the），已改。
2. **#37 版面定位**：初裁误判在右页，重裁确认跨中缝、主体在 158 右栏，台账 side 已据实标注（非文字差异）。
3. **#29 分数形态**：确认堆叠分数为 121/3 与 (11√130)/3，纯文本写 `11√130/3`，未误加括号。
4. **#33 空格**：`(−14x + w) °` 度数前原页带空格，照抄保留，未"美化"。
5. **value 精度（推送前对齐家法）**：对照远端 T26b，grid `value` 由三位小数改为精确浮点（28/3=9.333333333333334、10/3=3.3333333333333335、44/3=14.666666666666666、55/57=0.9649122807017544；2.4/4.5 本就精确）；validator 仅要求有限数字，此条为一致性微调。

合计文字类修正 1 处（#21），定位/格式类核对修正 3 处，家法格式对齐 1 条（#5）。
