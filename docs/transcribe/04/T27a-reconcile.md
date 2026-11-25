# T27a 对账台账 · 04 Geometry · Topic 27（Circles）#1–#19

- 题包：`docs/transcribe/04/fragments/T27a.json`（R04-141 … R04-159，19 题连续无重复）
- 素材：`docs/transcribe/04/pages/p14.jpg` 右半（书页 167，#1–#4）、`p15.jpg` 左半（书页 168，#5–#10）、`p15.jpg` 右半（书页 169，#11–#14）、`p16.jpg` 左半（书页 170，#15–#19）
- 答案口径：扫描件 18 页仅收录题目（书页 142–174），**册内答案页未入扫描**；每题均独立复算后定稿，未抄答案页。
- 易错点逐项：圆标准式 `(x − h)² + (y − k)² = r²` 的配方；负号一律 `−`（U+2212）照原页；斜体变量 `r / k / c / t / w / n / p`；叠分数 inline（`199/2`、`6/5`、`√11 + 6`）；方程内运算符两侧空格照原页；`above` 位置词保留（#7/#13/#14/#17 方程在题干上方，stem 内 `\n` 分行）；#12 印刷线段记号 `QR` 上的段条按本仓惯例写为纯字母 `QR`；本批 19 题**全部无图**，`figSpec:null`。

## 自检记录（merge dry-run，未写盘）

| 批次 | 命令 | 输出 |
|---|---|---|
| #1–#5 | `python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/04/fragments/T27a.json --dry-run` | 题包 book=04 topic=27 section=4.5.T27 · 共 5 题；将新增 R04-141…R04-145；[dry-run] 未写盘，无 FAIL |
| #1–#10 | 同上 | 共 10 题；将新增 R04-141…R04-150；无 FAIL |
| #1–#15 | 同上 | 共 15 题；将新增 R04-141…R04-155；无 FAIL |
| #1–#19 | 同上 | 共 19 题；将新增 R04-141…R04-159；无 FAIL（未声明 section 的 advisory 按预期忽略） |

---

## #1（R04-141，grid）
- **原页定位**：p14.jpg 右半（书页 167）左上题框，册内 #1。
- **逐字核对**："The graph of x² + x + y² + y = 199/2 in the xy-plane is a circle. What is the length of the circle's radius?"
  - 易错点：叠分数 `199/2` inline 照抄（不写 `(199)/(2)`）；`circle's` 撇号照抄；方程内 `+`、`=` 两侧空格照原页；grid 题无选项。
- **选项确认**：grid，`choices:{}`，无选项。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：配方 (x + 1/2)² − 1/4 + (y + 1/2)² − 1/4 = 199/2 → (x + 1/2)² + (y + 1/2)² = 199/2 + 1/2 = 100 → r² = 100 → **r = 10**（value 10，answer "10"）。
- **结论**：逐字已核，复算自洽。

## #2（R04-142，grid）
- **原页定位**：p14.jpg 右半（书页 167）左下题框，册内 #2。
- **逐字核对**："The equation (x + 6)² + (y + 3)² = 121 defines a circle in the xy-plane. What is the radius of the circle?"
  - 易错点：`(x + 6)`、`(y + 3)` 括号内 `+` 两侧有空格（高倍放大确认，照原页）；`121` 为 r² 非 r；grid 题无选项。
- **选项确认**：grid，`choices:{}`，无选项。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：标准式 r² = 121 → r = √121 = **11**（value 11，answer "11"）。
- **结论**：逐字已核，复算自洽。

## #3（R04-143，grid）
- **原页定位**：p14.jpg 右半（书页 167）右上题框，册内 #3。
- **逐字核对**："A circle in the xy-plane has a diameter with endpoints (2, 4) and (2, 14). An equation of this circle is (x − 2)² + (y − 9)² = r², where r is a positive constant. What is the value of r?"
  - 易错点：端点坐标 `(2, 4)`、`(2, 14)` 逗号后空格；`(x − 2)² + (y − 9)² = r²` 负号 `−`（U+2212）；`r` 斜体；`positive constant`；grid 题无选项。
- **选项确认**：grid，`choices:{}`，无选项。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：两端点同 x = 2，直径 = |14 − 4| = 10；r = 10/2 = **5**；中点 (2, 9) 与题给方程圆心一致。（value 5，answer "5"）。
- **结论**：逐字已核，复算自洽。

## #4（R04-144，mcq）
- **原页定位**：p14.jpg 右半（书页 167）右下题框，册内 #4。
- **逐字核对**："In the xy-plane, the graph of 2x² − 6x + 2y² + 2y = 45 is a circle. What is the radius of the circle?"
  - 易错点：`2x² − 6x` 负号 `−`；`45` 为一般式右边非 r²；须先两边除 2 再配方。
- **选项逐项**：A `5`；B `6.5`；C `√40`；D `√50`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：除 2：x² − 3x + y² + y = 45/2；配方 (x − 3/2)² − 9/4 + (y + 1/2)² − 1/4 = 45/2 → r² = 45/2 + 10/4 = 100/4 = 25 → r = 5 → **A**。
- **结论**：逐字已核，复算自洽。

## #5（R04-145，grid）
- **原页定位**：p15.jpg 左半（书页 168）左上题框，册内 #5。
- **逐字核对**："What is the diameter of the circle in the xy-plane with equation (x − 5)² + (y − 3)² = 16?"
  - 易错点：问 **diameter**（直径）非 radius；`(x − 5)² + (y − 3)² = 16`；grid 题无选项。
- **选项确认**：grid，`choices:{}`，无选项。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：r² = 16 → r = 4 → 直径 = 2r = **8**（value 8，answer "8"）。
- **结论**：逐字已核，复算自洽。

## #6（R04-146，grid）
- **原页定位**：p15.jpg 左半（书页 168）左中题框，册内 #6。
- **逐字核对**："Circle A in the xy-plane has the equation (x + 5)² + (y − 5)² = 4. Circle B has the same center as circle A. The radius of circle B is two times the radius of circle A. The equation defining circle B in the xy-plane is (x + 5)² + (y − 5)² = k, where k is a constant. What is the value of k?"
  - 易错点：两圆同圆心；`two times`（非 double）；第二处方程与 A 同形仅右边换 `k`；`k` 斜体；grid 题无选项。
- **选项确认**：grid，`choices:{}`，无选项。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：A：r_A² = 4 → r_A = 2；B：r_B = 2·2 = 4 → k = r_B² = **16**（value 16，answer "16"）。
- **结论**：逐字已核，复算自洽。

## #7（R04-147，mcq）
- **原页定位**：p15.jpg 左半（书页 168）左下题框，册内 #7。
- **逐字核对**："x² + 20x + y² + 16y = −20\nThe equation above defines a circle in the xy-plane. What are the coordinates of the center of the circle?"
  - 易错点：方程单独成行在题干**上方**（`above` 照抄，stem 内 `\n` 分行）；右边 `−20` 负号；问 center 坐标（非半径）。
- **选项逐项**：A `(−20, −16)`；B `(−10, −8)`；C `(10, 8)`；D `(20, 16)`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：配方 (x + 10)² − 100 + (y + 8)² − 64 = −20 → (x + 10)² + (y + 8)² = 144 → 圆心 (−10, −8) → **B**。
- **结论**：逐字已核，复算自洽。

## #8（R04-148，grid）
- **原页定位**：p15.jpg 左半（书页 168）右上题框，册内 #8。
- **逐字核对**："A circle in the xy-plane has its center at (−5, 2) and has a radius of 9. An equation of this circle is x² + y² + ax + by + c = 0, where a, b, and c are constants. What is the value of c?"
  - 易错点：圆心 `(−5, 2)` 负号；一般式 `x² + y² + ax + by + c = 0`；`a, b, c` 斜体；问常数项 c（非 a/b）；grid 题无选项。
- **选项确认**：grid，`choices:{}`，无选项。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：(x + 5)² + (y − 2)² = 81 → x² + 10x + 25 + y² − 4y + 4 = 81 → x² + y² + 10x − 4y − 52 = 0 → **c = −52**（value −52，answer "−52"）。
- **结论**：逐字已核，复算自洽。

## #9（R04-149，grid）
- **原页定位**：p15.jpg 左半（书页 168）右中题框，册内 #9。
- **逐字核对**："A circle in the xy-plane has its center at (−2, 2) and has a radius of 9. An equation of this circle is x² + y² + ax + by + c = 0, where a, b, and c are constants. What is the value of c?"
  - 易错点：与 #8 同型变式，圆心 `(−2, 2)`；一般式同形；问 c；grid 题无选项。
- **选项确认**：grid，`choices:{}`，无选项。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：(x + 2)² + (y − 2)² = 81 → x² + 4x + 4 + y² − 4y + 4 = 81 → x² + y² + 4x − 4y − 73 = 0 → **c = −73**（value −73，answer "−73"）。
- **结论**：逐字已核，复算自洽。

## #10（R04-150，mcq）
- **原页定位**：p15.jpg 左半（书页 168）右下题框，册内 #10。
- **逐字核对**："A circle in the xy-plane has its center at (−4, −6). Line k is tangent to this circle at the point (−7, −7). What is the slope of line k?"
  - 易错点：圆心 `(−4, −6)`、切点 `(−7, −7)` 双负号；`Line k` 斜体 k；切线⊥半径；问斜率。
- **选项逐项**：A `−3`；B `−1/3`；C `1/3`；D `3`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：半径斜率 = (−7 − (−6))/(−7 − (−4)) = (−1)/(−3) = 1/3；切线 ⊥ 半径 → m = −3 → **A**。
- **结论**：逐字已核，复算自洽。

## #11（R04-151，mcq）
- **原页定位**：p15.jpg 右半（书页 169）左上题框，册内 #11。
- **逐字核对**："A circle in the xy-plane has its center at (−1, 1). Line t is tangent to this circle at the point (5, −4). Which of the following points also lies on line t?"
  - 易错点：`Line t`（字母 t，非 k）；圆心 `(−1, 1)`、切点 `(5, −4)`；问"哪点也在切线 t 上"。
- **选项逐项**：A `(0, 6/5)`；B `(4, 7)`；C `(10, 2)`；D `(11, 1)`（A 的 6/5 叠分数 inline）。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：半径斜率 = (−4 − 1)/(5 − (−1)) = −5/6；切线 m = 6/5，过 (5, −4)：y + 4 = (6/5)(x − 5)。验 C(10, 2)：2 + 4 = 6，(6/5)(10 − 5) = 6 ✓；A：6/5 + 4 = 26/5 ≠ −6；B：11 ≠ −6/5；D：5 ≠ 36/5 → **C**。
- **结论**：逐字已核，复算自洽。

## #12（R04-152，mcq）
- **原页定位**：p15.jpg 右半（书页 169）左下题框，册内 #12。
- **逐字核对**："Points Q and R lie on a circle with center P. The radius of this circle is 9 inches. Triangle PQR has a perimeter of 31 inches. What is the length, in inches, of QR?"
  - 易错点：单位 `inches` 两处；`PQ = PR = 9`（同圆半径）；印刷 `QR` 上的线段段条按本仓惯例写纯字母 `QR`；问 QR 边长。
- **选项逐项**：A `13√2`；B `13`；C `9√2`；D `9`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：PQ = PR = 9；QR = 31 − 9 − 9 = **13** → **B**。
- **结论**：逐字已核，复算自洽。

## #13（R04-153，grid）
- **原页定位**：p15.jpg 右半（书页 169）右上题框，册内 #13。
- **逐字核对**："8x² + 112px + 8y² − 64py = −448p²\nIn the xy-plane, the graph of the given equation is a circle. The length of the radius of the circle is np, where n and p are positive constants. What is the value of n?"
  - 易错点：方程单独成行在题干上方（`given equation`，stem 内 `\n`）；`112px`、`−64py`、`−448p²` 系数与 p 的幂次；半径 = np（n、p 正整数/常数）；grid 题无选项。
- **选项确认**：grid，`choices:{}`，无选项。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：除 8：x² + 14px + y² − 8py = −56p²；配方 (x + 7p)² − 49p² + (y − 4p)² − 16p² = −56p² → r² = 9p² → r = 3p = np → **n = 3**（value 3，answer "3"）。
- **结论**：逐字已核，复算自洽。

## #14（R04-154，mcq）
- **原页定位**：p15.jpg 右半（书页 169）右下题框，册内 #14。
- **逐字核对**："x² + x√t + y² − y − 69 = 0\nThe given equation, where t is a constant, defines a circle in the xy-plane. The radius of this circle is √86. What is the value of t?"
  - 易错点：方程单独成行在上；`x√t`（√ 包住 t，非 √(x)）；半径 `√86`；`t` 斜体常数。
- **选项逐项**：A `69`；B `67`；C `35`；D `33`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：配方 (x + √t/2)² − t/4 + (y − 1/2)² − 1/4 = 69 → r² = t/4 + 1/4 + 69 = 86 → t/4 = 67/4 → **t = 67** → **B**。
- **结论**：逐字已核，复算自洽。

## #15（R04-155，mcq）
- **原页定位**：p16.jpg 左半（书页 170）左上题框，册内 #15。
- **逐字核对**："Which of the following equations represents a circle in the xy-plane that intersects the y-axis at exactly one point?"
  - 易错点：`exactly one point`（切 y 轴）；无给定方程，四选项各写圆方程；`y-axis`。
- **选项逐项**：A `(x − 8)² + (y − 8)² = 16`；B `(x − 9)² + (y − 4)² = 16`；C `(x − 4)² + (y − 9)² = 16`；D `x² + (y − 4)² = 16`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：切 y 轴 ⇔ |圆心 x| = r = 4：A(8,8) d = 8 ≠ 4；B(9,4) d = 9 ≠ 4；C(4,9) d = 4 = r ✓；D 圆心 (0,4) 在 y 轴上，交两点 → **C**。
- **结论**：逐字已核，复算自洽。

## #16（R04-156，mcq）
- **原页定位**：p16.jpg 左半（书页 170）左中题框，册内 #16。
- **逐字核对**："A circle in the xy-plane intersects the line y = x at exactly one point. Which equation, where w is a positive constant, could define this circle?"
  - 易错点：切线对象是直线 `y = x`（非坐标轴）；`w` 斜体正整数常数；四选项右边均为 `= w`。
- **选项逐项**：A `(x − 31)² + (y − 31)² = w`；B `(x + 31)² + (y + 31)² = w`；C `x² + (y − 31)² = w`；D `x² + y² = w`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：切 y = x ⇔ |h − k|/√2 = √w > 0：A(31,31)、B(−31,−31)、D(0,0) 圆心都在 y = x 上，距离 0 → 交两点；C(0,31) 距离 = 31/√2 = √w → w = 961/2 > 0 ✓ → **C**。
- **结论**：逐字已核，复算自洽。

## #17（R04-157，mcq）
- **原页定位**：p16.jpg 左半（书页 170）左下题框，册内 #17。
- **逐字核对**："(x − 6)² + (y + 5)² = 16\nIn the xy-plane, the graph of the equation above is a circle. Point P is on the circle and has coordinates (10, −5). If PQ is a diameter of the circle, what are the coordinates of point Q?"
  - 易错点：方程单独成行在上（`above` 照抄）；`(10, −5)`；`PQ` 直径（印刷段条按惯例写纯字母）；求 Q 坐标。
- **选项逐项**：A `(2, −5)`；B `(6, −1)`；C `(6, −5)`；D `(6, −9)`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：圆心 C(6, −5)；C 是 PQ 中点，Q = 2C − P = (12 − 10, −10 + 5) = (2, −5) → **A**。
- **结论**：逐字已核，复算自洽。

## #18（R04-158，mcq）
- **原页定位**：p16.jpg 左半（书页 170）右上题框，册内 #18。
- **逐字核对**："A circle in the xy-plane has equation (x + 3)² + (y − 1)² = 25. Which of the following points does NOT lie in the interior of the circle?"
  - 易错点：`NOT` 大写照抄；`interior`（内部，严格 d < 5）；圆心 (−3, 1)、r = 5。
- **选项逐项**：A `(−7, 3)`；B `(−3, 1)`；C `(0, 0)`；D `(3, 2)`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：d² 对比 25：A(−7,3) d² = 16 + 4 = 20 < 25 内；B(−3,1) d = 0 内；C(0,0) d² = 9 + 1 = 10 < 25 内；D(3,2) d² = 36 + 1 = 37 > 25 圆外 → **D**。
- **结论**：逐字已核，复算自洽。

## #19（R04-159，mcq）
- **原页定位**：p16.jpg 左半（书页 170）右下题框，册内 #19。
- **逐字核对**："(x + 6)² + (y − 7)² = 25\nIn the xy-plane, the graph of the given equation is a circle. Which point lies on this circle?"
  - 易错点：方程单独成行在上；圆心 (−6, 7)、r = 5；选项带 `√11`、`√14` 复合坐标。
- **选项逐项**：A `(−6, 7)`；B `(6, −7)`；C `(√11 + 6, √14 − 7)`；D `(√11 − 6, √14 + 7)`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：圆心 (−6, 7)，r² = 25：A 是圆心 d = 0；B d² = 144 + 196；C 偏移 (√11 + 12, √14 − 14)；D(√11 − 6, √14 + 7) 偏移 (√11, √14)，d² = 11 + 14 = 25 ✓ → **D**。
- **结论**：逐字已核，复算自洽。

---

## 汇总
- mcq 11 题：#4=A、#7=B、#10=A、#11=C、#12=B、#14=B、#15=C、#16=C、#17=A、#18=D、#19=D；grid 8 题：#1=10、#2=11、#3=5、#5=8、#6=16、#8=−52、#9=−73、#13=3。合计 19 题。
- 图形负担：本批 #1–#19 全部纯文字无图（圆图 #24/#25/#28/#30/#34 均在本批范围外），全部 `figSpec:null`、`choiceGraphs:null`。
- 自查修掉的差异条数：**0**（题干/选项一次成稿，高倍放大复核未发现需改字；负号 `−`、叠分数、`above`、撇号等易错点均在成稿时照原页写入）。
