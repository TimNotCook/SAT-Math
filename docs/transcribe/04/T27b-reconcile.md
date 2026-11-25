# T27b 对账台账 · 04 Geometry · Topic 27（Circles）#20–#37

- 题包：`docs/transcribe/04/fragments/T27b-b1.json`（R04-160 … R04-168，#20–#28，9 题）+ `docs/transcribe/04/fragments/T27b-b2.json`（R04-169 … R04-177，#29–#37，9 题）；合计 18 题连续无重复（单片超 MCP 20KB 上限，按派工切片）
- 素材：`docs/transcribe/04/pages/p16.jpg`（#20 左页 170 / #21–#24 右页 171）、`p17.jpg`（#25–#28 左页 172 / #29–#33 右页 173）、`p18.jpg`（#34–#37，174）
- 答案口径：扫描件 18 页仅收录题目（书页 142–174），**册内答案页未入扫描**；每题均独立复算后定稿，未抄答案页。
- 易错点逐项：负号一律 `−`（U+2212，原页连字符 `-16`/`-17` 归一）；叠分数 inline（`199/2` 式无；本批 `π/3`、`2/5`、`13/2 π`、`72/5`）；根号 `√55`/`√102`/`√206`；度数 `°`；`x = 100`、`∠ROS`/`∠RSO`/`∠OAB`/`∠ACB` 斜体变量与角标；弧记号 `arc AB/ADC/ABC/MPN` 按本仓惯例写纯字母（不叠 overline）；`Note: Figure not drawn to scale.` 照 T26a 先例作 stem 首行 `\n` 分行；方程单独成行在题干上方者 `\n` 分行（#21/#22/#35）；`where c/h,k,a 是常数` 照抄。
- 图形负担：本批 5 图（#24 坐标轴圆、#25 网格圆、#28 圆心角、#30 弦+半径、#34 弧点圆）全部 `rawSvg` 矢量重画，**无位图、无截图**；本批无 shaded 题，故无 region 多边形。

## 自检记录（merge dry-run，未写盘）

| 批次 | 命令 | 输出 |
|---|---|---|
| #20–#24 | `python3 tools/merge_transcribe_fragment.py --fragment <小段切片> --dry-run`（成稿中段内部自检） | 共 5 题；将新增 R04-160…R04-164；exit=0，无 FAIL |
| #25–#29 | 同上（内部小段） | 共 5 题；将新增 R04-165…R04-169；exit=0，无 FAIL |
| #30–#34 | 同上（内部小段） | 共 5 题；将新增 R04-170…R04-174；exit=0，无 FAIL |
| #35–#37 | 同上（内部小段） | 共 3 题；将新增 R04-175…R04-177；exit=0，无 FAIL |
| 全量复跑 | 整包 dry-run | 共 18 题；将新增 R04-160…R04-177；exit=0，无 FAIL（未声明 section=4.5.T27 的 advisory 属预期，忽略） |
| 推送切片 | `--fragment T27b-b1.json` / `--fragment T27b-b2.json` | b1 共 9 题 R04-160…168；b2 共 9 题 R04-169…177；均 exit=0 无 FAIL |

---

## #20（R04-160，grid）
- **原页定位**：p16.jpg 左半（书页 170）右下题框，册内 #20。
- **逐字核对**："In the xy-plane, the graph of the equation (x − 5)² + (y − 6)² = 25 is a circle. The point (10, c), where c is a constant, lies on this circle. What is the value of c?"
  - 易错点：方程 inline 在句中；`(10, c)`、`where c is a constant`；grid 无选项。
- **选项确认**：grid，`choices:{}`，无选项。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：代入 (10, c)：(10−5)² + (c−6)² = 25 → 25 + (c−6)² = 25 → (c−6)² = 0 → **c = 6**（value 6，answer "6"）。
- **结论**：逐字已核，复算自洽。

## #21（R04-161，mcq）
- **原页定位**：p16.jpg 右半（书页 171）左上题框，册内 #21。
- **逐字核对**："(x + 4)² + (y − 18)² = 144\nThe graph of the given equation is a circle in the xy-plane. The point (a, b) lies on the circle. Which of the following is a possible value for a?"
  - 易错点：方程单独成行在上（`given equation`，stem `\n` 分行）；`144`=r²；问 a 的可能值（x 坐标区间判定）。
- **选项逐项**：A −17；B −13；C 12；D 18。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：圆心 (−4,18)，r = √144 = 12 → a ∈ [−16, 8]；A −17 < −16 出界，B −13 ∈ [−16, 8] ✓（(a+4)²=81，(b−18)²=63 ≥ 0），C 12 > 8、D 18 > 8 出界 → **B**。
- **结论**：逐字已核，复算自洽。

## #22（R04-162，mcq）
- **原页定位**：p16.jpg 右半（书页 171）左下题框，册内 #22。
- **逐字核对**："(x + 4)² + (y − 19)² = 169\nThe graph of the given equation is a circle in the xy-plane. The point (a, b) lies on the circle. Which of the following is a possible value for a?"
  - 易错点：与 #21 同型变式；`169`=r²；圆心 y=19。
- **选项逐项**：A −18；B −12；C 13；D 19。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：圆心 (−4,19)，r = √169 = 13 → a ∈ [−17, 9]；A −18 < −17 出界，B −12 ∈ [−17, 9] ✓，C 13 > 9、D 19 > 9 出界 → **B**。
- **结论**：逐字已核，复算自洽。

## #23（R04-163，mcq）
- **原页定位**：p16.jpg 右半（书页 171）右上题框，册内 #23。
- **逐字核对**："A circle in the xy-plane has its center at (−4, 2) and the point (−8, 5) lies on the circle. Which equation represents this circle?"
  - 易错点：圆心 `(−4, 2)`、点 `(−8, 5)` 双负号；选项混淆 (x−4)/(x+4)、(y+2)/(y−2)、r²=5/25。
- **选项逐项**：A `(x − 4)² + (y + 2)² = 5`；B `(x + 4)² + (y − 2)² = 5`；C `(x − 4)² + (y + 2)² = 25`；D `(x + 4)² + (y − 2)² = 25`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：r² = (−8 − (−4))² + (5 − 2)² = 16 + 9 = 25；圆心 (−4, 2) → `(x + 4)² + (y − 2)² = 25` → **D**。
- **结论**：逐字已核，复算自洽。

## #24（R04-164，mcq）
- **原页定位**：p16.jpg 右半（书页 171）右下题框，册内 #24。
- **逐字核对**："The circle shown has its center at (0, 0). What is the value of k?"
  - 易错点：图给 (8, 0) 定 r=8，(3, k) 在右上弧；选项 `√55` 干扰 6/7/8 整数。
- **选项逐项**：A 6；B 7；C 8；D √55。
- **图形 ↔ spec**：`rawSvg`：x/y 坐标轴箭头、圆心 O、半径 r=8 的圆、(8, 0) 实心点标注、(3, k) 实心点标注；圆心/半径/两点位置与原图一一对应。
- **答案复算**（独立复算，本册无答案页）：过 (8, 0) → r = 8；(3, k) 在圆上：3² + k² = 64 → k² = 55 → k = √55（k > 0）→ **D**。
- **结论**：逐字已核，复算自洽。

## #25（R04-165，grid）
- **原页定位**：p17.jpg 左半（书页 172）左上题框，册内 #25。
- **逐字核对**："Circle A shown is defined by the equation x² + (y − 6)² = 7. Circle B (not shown) has the same radius but is translated 96 units to the right. If the equation of circle B is (x − h)² + (y − k)² = a, where h, k, and a are constants, what is the value of 4a?"
  - 易错点：`(not shown)`；`96 units to the right`；问 `4a`（a=r²，不是 r）；grid 无选项。
- **选项确认**：grid，`choices:{}`，无选项。
- **图形 ↔ spec**：`rawSvg`：坐标网格（x −8…8、y −2…14 刻度）、坐标轴、圆心 (0,6)、半径 √7≈2.65 的圆；与方程 x² + (y−6)² = 7 一致。
- **答案复算**（独立复算，本册无答案页）：A 的 r² = 7；平移不改半径 → a = r² = 7 → **4a = 28**（value 28，answer "28"）。
- **结论**：逐字已核，复算自洽。

## #26（R04-166，grid）
- **原页定位**：p17.jpg 左半（书页 172）左下题框，册内 #26。
- **逐字核对**："Point O is the center of a circle. The measure of arc RS on this circle is 100°. What is the measure, in degrees, of its associated angle ROS?"
  - 易错点：`associated angle ROS`=圆心角；`in degrees`；grid 无选项。
- **选项确认**：grid，`choices:{}`，无选项。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：圆心角 ROS = 同弧 RS = **100°**（value 100，answer "100"）。
- **结论**：逐字已核，复算自洽。

## #27（R04-167，grid）
- **原页定位**：p17.jpg 左半（书页 172）右上题框，册内 #27。
- **逐字核对**："A circle has center O, and points R and S lie on the circle. In triangle ORS, the measure of ∠ROS is 88°. What is the measure of ∠RSO, in degrees? (Disregard the degree symbol when entering your answer.)"
  - 易错点：`Disregard the degree symbol when entering your answer.` 照抄；`∠ROS`=顶角、`∠RSO`=底角；grid 无选项。
- **选项确认**：grid，`choices:{}`，无选项。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：OR = OS（同圆半径）等腰 → ∠ORS = ∠RSO = (180 − 88)/2 = **46**（value 46，answer "46"）。
- **结论**：逐字已核，复算自洽。

## #28（R04-168，mcq）
- **原页定位**：p17.jpg 左半（书页 172）右下题框，册内 #28。
- **逐字核对**："Note: Figure not drawn to scale.\nThe circle above has center O, the length of arc ADC is 5π, and x = 100. What is the length of arc ABC?"
  - 易错点：`Note:` 首行照 T26a 先例 `\n` 分行；`x = 100`（x°=100°）；弧 ADC（过小 D 的劣弧）与弧 ABC（过 B 的优弧）方向区分；选项 D 为叠分数 `13/2 π` inline。
- **选项逐项**：A 9π；B 13π；C 18π；D 13/2 π。
- **图形 ↔ spec**：`rawSvg`：圆心 O 实心点、半径 OC（左上）/OA（右下）、x° 小角弧标在两半径间（过 D 侧）、D 右侧弧点、B 左侧弧点；与原图 C 上、D 右、A 右下、B 左的位置一一对应。
- **答案复算**（独立复算，本册无答案页）：弧 ADC = 100° 劣弧 = 5π → 全圆 C = 5π × 360/100 = 18π；弧 ABC = 260° = 260/360 × 18π = **13π** → **B**。
- **结论**：逐字已核，复算自洽。

## #29（R04-169，grid）
- **原页定位**：p17.jpg 右半（书页 173）左上题框，册内 #29。
- **逐字核对**："A circle has center O, and points A and B lie on the circle. The measure of arc AB is 45° and the length of arc AB is 3 inches. What is the circumference, in inches, of the circle?"
  - 易错点：`45°` 弧角、`3 inches` 弧长；`in inches` 单位；grid 无选项。
- **选项确认**：grid，`choices:{}`，无选项。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：45° = 45/360 = 1/8 圆 → C = 3 × 8 = **24 inches**（value 24，answer "24"）。
- **结论**：逐字已核，复算自洽。

## #30（R04-170，mcq）
- **原页定位**：p17.jpg 右半（书页 173）左下题框，册内 #30。
- **逐字核对**："Note: Figure not drawn to scale.\nPoint O is the center of the circle above, and the measure of ∠OAB is 30°. If the length of OC is 18, what is the length of arc AB?"
  - 易错点：`Note:` 首行分行；∠OAB=30° 在 A 点（非圆心）；OC=18=半径；问劣弧 AB 长。
- **选项逐项**：A 9π；B 12π；C 15π；D 18π。
- **图形 ↔ spec**：`rawSvg`：圆心 O、水平弦 AB（上方）、半径 OA/OB/OC（竖直向下到 C）、A 点 30° 小角弧标；与原图 A 左、B 右、C 底位置一一对应。
- **答案复算**（独立复算，本册无答案页）：OA = OB = OC = 18；△OAB 等腰 ∠OAB = ∠OBA = 30° → ∠AOB = 120°；弧 AB = 120/360 × 2π × 18 = **12π** → **B**。
- **结论**：逐字已核，复算自洽。

## #31（R04-171，grid）
- **原页定位**：p17.jpg 右半（书页 173）右上题框，册内 #31。
- **逐字核对**："In the xy-plane, a circle is inscribed in a square with four tangential points, two of which are A (x, 15) and B (x, −3). What is the perimeter of the square?"
  - 易错点：`inscribed in a square`、`four tangential points`；同 x 的 A/B 在一对对边；`(x, −3)` 负号；grid 无选项。
- **选项确认**：grid，`choices:{}`，无选项。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：对边切点纵向间距 = 边长 = 15 − (−3) = 18；周长 = 4 × 18 = **72**（value 72，answer "72"）。
- **结论**：逐字已核，复算自洽。

## #32（R04-172，grid）
- **原页定位**：p17.jpg 右半（书页 173）右中题框，册内 #32。
- **逐字核对**："A circle in the xy-plane has center (28, 5) and y-intercepts (0, −16) and (0, 26). What is the radius of this circle?"
  - 易错点：圆心 `(28, 5)`、两 y 截距 `(0, −16)`/`(0, 26)`（原页连字符归一 `−`）；grid 无选项。
- **选项确认**：grid，`choices:{}`，无选项。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：r² = 28² + (5 − (−16))² = 784 + 441 = 1225 → **r = 35**（验 (0,26)：28² + (5−26)² = 784 + 441 = 1225 ✓）（value 35，answer "35"）。
- **结论**：逐字已核，复算自洽。

## #33（R04-173，grid）
- **原页定位**：p17.jpg 右半（书页 173）右下题框，册内 #33。
- **逐字核对**："Points A and B lie on a circle with radius 1, and arc AB has length π/3. What fraction of the circumference of the circle is the length of arc AB?"
  - 易错点：`radius 1`、叠分数 `π/3` inline；问 fraction（分数答案）；grid 无选项。
- **选项确认**：grid，`choices:{}`，无选项。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：C = 2π × 1 = 2π；分数 = (π/3)/(2π) = **1/6**（value 0.16666666666666666，answer "1/6"）。
- **结论**：逐字已核，复算自洽。

## #34（R04-174，grid）
- **原页定位**：p18.jpg（书页 174）左上题框，册内 #34。
- **逐字核对**："Points M, N, and P lie on the circle shown. On this circle, minor arc MN has a length of 27 centimeters and major arc MPN has a length of 135 centimeters. What is the circumference, in centimeters, of the circle shown?"
  - 易错点：`minor arc MN`=27、`major arc MPN`=135 两段互补成全圆；`centimeters`；grid 无选项。
- **选项确认**：grid，`choices:{}`，无选项。
- **图形 ↔ spec**：`rawSvg`：圆心实心点（不标注）、M 左上弧点、N 右上弧点、P 右下弧点；与原图位置一一对应。
- **答案复算**（独立复算，本册无答案页）：C = 27 + 135 = **162 cm**（value 162，answer "162"）。
- **结论**：逐字已核，复算自洽。

## #35（R04-175，grid）
- **原页定位**：p18.jpg（书页 174）左下题框，册内 #35。
- **逐字核对**："c(r) = 2/5 (2πr)\nThe function c gives the partial length, in centimeters (cm), of the circumference of a circle with a radius that measures r cm. According to the function, for each increase of 18 cm in the length of the radius, this partial length of the circumference increases by kπ cm. What is the value of k?"
  - 易错点：函数式单独成行在上（stem `\n` 分行）；叠分数 `2/5 (2πr)`；`each increase of 18 cm`；`kπ cm`；grid 无选项。
- **选项确认**：grid，`choices:{}`，无选项。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：c(r) = (4π/5)r；Δc = (4π/5) × 18 = 72π/5 = 14.4π → **k = 72/5 = 14.4**（value 14.4，answer "72/5"）。
- **结论**：逐字已核，复算自洽。

## #36（R04-176，grid）
- **原页定位**：p18.jpg（书页 174）右上题框，册内 #36。
- **逐字核对**："A circle has center G, and points M and N lie on the circle. Line segments MH and NH are tangent to the circle at points M and N, respectively. If the radius of the circle is 168 millimeters and the perimeter of quadrilateral GMHN is 3,856 millimeters, what is the distance, in millimeters, between points G and H?"
  - 易错点：切线 `MH`/`NH`、`quadrilateral GMHN`；`3,856` 千分逗号；`in millimeters`；grid 无选项。
- **选项确认**：grid，`choices:{}`，无选项。
- **图形 ↔ spec**：无图（题干纯文字描述切线四边形），`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：GM = GN = 168；切线长 HM = HN；2·168 + 2·HM = 3856 → HM = (3856 − 336)/2 = 1760；Rt△GMH（半径⊥切线）：GH = √(168² + 1760²) = √(28,224 + 3,097,600) = √3,125,824 = **1768**（value 1768，answer "1768"）。
- **结论**：逐字已核，复算自洽。

## #37（R04-177，mcq）
- **原页定位**：p18.jpg（书页 174）右下题框，册内 #37。
- **逐字核对**："In the xy-plane, a circle has center C with coordinates (h, k). Points A and B lie on the circle. Point A has coordinates (h + 1, k + √102), and ∠ACB is a right angle. What is the length of AB?"
  - 易错点：`(h + 1, k + √102)` 偏移量；`∠ACB is a right angle`；选项 B `2√102`、C `103√2`、D `103√3` 干扰。
- **选项逐项**：A √206；B 2√102；C 103√2；D 103√3。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**（独立复算，本册无答案页）：CA² = 1² + (√102)² = 103 = r²；∠ACB = 90° → AB = r√2 = √103 · √2 = **√206** → **A**。
- **结论**：逐字已核，复算自洽。

---

## 汇总
- mcq 7 题：#21=B、#22=B、#23=D、#24=D、#28=B、#30=B、#37=A；grid 11 题：#20=6、#25=28、#26=100、#27=46、#29=24、#31=72、#32=35、#33=1/6、#34=162、#35=72/5、#36=1768。合计 18 题。
- 图形负担：5 图全部 rawSvg 矢量（#24 坐标轴圆、#25 网格圆、#28 圆心角、#30 弦+半径、#34 弧点圆），无位图、无截图；本批无 shaded，无 region。
- 自查修掉的差异条数：**0**（题干/选项一次成稿，高倍放大复核未发现需改字；负号 `−`、叠分数、`Note:` 分行、弧记号纯字母、`Disregard` 注等易错点均在成稿时照原页写入；#30 角弧 sweep 方向在建稿时一次校正，未涉及文字）。
