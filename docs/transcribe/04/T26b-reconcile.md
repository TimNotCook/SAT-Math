# T26b 对账台账 · 04 Geometry · Topic 26（Right Triangles and Trigonometry）#20–#37

- 题包：`docs/transcribe/04/fragments/T26b.json`（R04-120 … R04-137，18 题连续无重复）
- 素材：`docs/transcribe/04/pages/p12.jpg`（书页 163，#20–#22）、`p13.jpg`（书页 164–165，#23–#34）、`p14.jpg`（书页 166，#35–#37）
- 答案口径：扫描件 18 页仅收录题目（书页 142–174），**册内答案页未入扫描**；每题均独立复算后定稿，未抄答案页。
- 易错点逐项：角度度数 `°`、弧度 `π`、`sin/cos/tan` 括号有无（`tan A` 无括号 vs `tan(A)`/`cos(K)`/`sin(D)` 带括号照原页）、根号 `√` 与叠分数 inline 写法、减号 `−`（U+2212）、不等号 `≤`、斜体变量、单位（millimeters/inches/units/centimeters）、`△`/`∠` 符号照抄。

## 自检记录（merge dry-run，未写盘）

| 批次 | 命令 | 输出 | 退出码 |
|---|---|---|---|
| #20–#24 | `python3 tools/merge_transcribe_fragment.py --fragment /tmp/T26b-20-24.json --dry-run` | 共 5 题；将新增 R04-120…R04-124；[dry-run] 未写盘 | 0 |
| #25–#28 | 同上（`/tmp/T26b-25-28.json`） | 共 4 题；将新增 R04-125…R04-128；无 FAIL | 0 |
| #29–#33 | 同上（`/tmp/T26b-29-33.json`） | 共 5 题；将新增 R04-129…R04-133；无 FAIL | 0 |
| #34–#37 | 同上（`/tmp/T26b-34-37.json`） | 共 4 题；将新增 R04-134…R04-137；无 FAIL | 0 |
| 全包 #20–#37 | `python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/04/fragments/T26b.json --dry-run` | 题包 book=04 topic=26 section=4.5.T26 · 共 18 题；将新增 R04-120…R04-137；[dry-run] 未写盘 | 0 |

> 未声明 section 的 advisory FAIL 按预期忽略（入库写者补 units[] 声明后再绿）。另跑本地不变量自检：id 序列 120–137 连续、mcq 答案字母均在 choices 且 4 选项齐全、grid `choices:{}` 且 value 为有限数字、paper 含「专项」、figSpec 为 dict/null，全部通过。

---

## #20（R04-120，grid）
- **原页定位**：p12.jpg 右半（书页 163）左栏上题框，册内 #20。
- **逐字核对**："Triangle ABC is similar to triangle DEF, where angle A corresponds to angle D and angles C and F are right angles. The length of AB is 2.9 times the length of DE. If tan A = 21/20, what is the value of sin D?"
  - 易错点：`tan A` 无括号（照原页，区别于 #24 的 `tan(A)`）；`2.9` 一位小数；`21/20` inline 分数；直角在 C/F；2.9 缩放比为干扰。
- **选项确认**：grid，`choices:{}`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算（独立复算）**：tan A = BC/AC = 21/20 → BC=21k, AC=20k, AB = k√(21²+20²) = 29k；∠D↔∠A，sin D = sin A = BC/AB = 21/29（value 0.7241379310344828，answer "21/29"）。
- **结论**：逐字已核，复算自洽。

## #21（R04-121，mcq）
- **原页定位**：p12.jpg 右半（书页 163）左栏中题框，册内 #21。
- **逐字核对**："The measure of angle W is 7π/6 radians. The measure of angle Q is 122π radians more than the measure of angle W. What is the value of sin Q?"
  - 易错点：`7π/6`、`122π`；`radians`；122π = 61·2π 整圈不影响终边。
- **选项逐项**：A `√3/2`；B `1/2`；C `−1/2`；D `−√3/2`（C/D 负号为 U+2212）。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算（独立复算）**：Q = 7π/6 + 122π = 7π/6 + 61·2π，终边同 7π/6（第三象限）；sin(7π/6) = −1/2 → **C**。
- **结论**：逐字已核，复算自洽。

## #22（R04-122，grid，配图）
- **原页定位**：p12.jpg 右半（书页 163）右栏上题框，册内 #22。
- **逐字核对**："Note: Figure not drawn to scale.\nIn the figure above, tan B = 3/4. If BC = 15 and DA = 4, what is the length of DE?"
  - 易错点：`tan B` 无括号；`3/4`、`BC = 15`、`DA = 4`；求 DE（非 BD/AB）。
- **选项确认**：grid，`choices:{}`。
- **图形 ↔ spec**：原图 = 直角在 A 的大直角△BAC（B 顶、A 左下直角、C 右下），D 在 AB 上（直角标记），DE 水平连到斜边上的 E；`figSpec.type=rawSvg` 手绘 svg：外三角三边 + DE 水平线 + A/D 两处直角小方块 + 顶点标签 B/A/C/D/E。
- **答案复算（独立复算）**：tan B = AC/AB = 3/4，BC=15 为斜边（3-4-5 乘 3）→ AC=9, AB=12；BD = AB−DA = 8；DE∥AC，△BDE∽△BAC，DE/AC = BD/BA = 8/12 = 2/3 → DE = 9·2/3 = **6**（value 6）。
- **结论**：逐字已核，复算自洽。

## #23（R04-123，mcq）
- **原页定位**：p13.jpg 左半（书页 164）左栏上题框，册内 #23。
- **逐字核对**："In a right triangle, the tangent of one of the two acute angles is √3/3. What is the tangent of the other acute angle?"
  - 易错点：`√3/3` inline 分数；`the other acute angle`；两锐角互余。
- **选项逐项**：A `−√3/3`；B `−3/√3`；C `√3/3`；D `3/√3`（负号 U+2212；分母带根号照原页不化简）。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算（独立复算）**：√3/3 = 1/√3 = tan30°；另一锐角 = 60°，tan60° = √3 = 3/√3；锐角正切为正，A/B 负号排除 → **D**。
- **结论**：逐字已核，复算自洽。

## #24（R04-124，grid）
- **原页定位**：p13.jpg 左半（书页 164）左栏中题框，册内 #24。
- **逐字核对**："Triangle ABC is similar to triangle DEF, where angle A corresponds to angle D and angle C corresponds to angle F. Angles C and F are right angles.\nIf tan(A) = 50/7, what is the value of tan(E)?"
  - 易错点：`tan(A)`、`tan(E)` 带括号（照原页，区别于 #20/#27 的 `tan A`）；A↔D、C↔F → B↔E；整段换行 `
` 照原页空行。
- **选项确认**：grid，`choices:{}`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算（独立复算）**：∠E↔∠B = 90°−∠A，tan E = tan B = cot A = 1/tan A = **7/50**（value 0.14，answer "7/50"）。
- **结论**：逐字已核，复算自洽。

## #25（R04-125，grid）
- **原页定位**：p13.jpg 左半（书页 164）左栏下题框，册内 #25。
- **逐字核对**："In triangle JKL, cos(K) = 24/51 and angle J is a right angle. What is the value of cos(L)?"
  - 易错点：`cos(K)`、`cos(L)` 带括号；`24/51` 不约分照抄；直角在 J。
- **选项确认**：grid，`choices:{}`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算（独立复算）**：cos K = JK/KL = 24/51；JL = √(51²−24²) = √(2601−576) = √2025 = 45；cos L = JL/KL = 45/51 = **15/17**（value 0.8823529411764706，answer "15/17"）。
- **结论**：逐字已核，复算自洽。

## #26（R04-126，grid）
- **原页定位**：p13.jpg 左半（书页 164）右栏上题框，册内 #26。
- **逐字核对**："In △ABC, ∠B is a right angle and the length of BC is 236 millimeters. If cos A = 3/5, what is the length, in millimeters, of AB?"
  - 易错点：`△ABC`、`∠B` 符号照抄；`cos A` 无括号；`236 millimeters`；求 AB（邻边，非 BC）。
- **选项确认**：grid，`choices:{}`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算（独立复算）**：直角在 B，cos A = AB/AC = 3/5 → AB:BC:AC = 3:4:5；BC = 4 份 = 236 → 每份 59；AB = 3·59 = **177**（value 177）。
- **结论**：逐字已核，复算自洽。

## #27（R04-127，grid）
- **原页定位**：p13.jpg 左半（书页 164）右栏中题框，册内 #27。
- **逐字核对**："Triangle ABC is similar to triangle DEF, where angle A corresponds to angle D and angles C and F are right angles. The length of AB is 2.8 times the length of DE.\nIf tan A = 20/21, what is the value of sin D?"
  - 易错点：`tan A` 无括号；`2.8` 一位小数（区别 #20 的 2.9）；`20/21`；2.8 缩放比为干扰。
- **选项确认**：grid，`choices:{}`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算（独立复算）**：tan A = BC/AC = 20/21 → BC=20k, AC=21k, AB = k√(20²+21²) = 29k；∠D↔∠A，sin D = sin A = BC/AB = **20/29**（value 0.6896551724137931，answer "20/29"）。
- **结论**：逐字已核，复算自洽。

## #28（R04-128，grid，配图）
- **原页定位**：p13.jpg 左半（书页 164）右栏下题框，册内 #28。
- **逐字核对**："Note: Figure not drawn to scale.\nAccording to a US law, ramps for use by the general public must form an angle with level ground such that tanθ ≤ 1/12. If the ramp in the figure conforms to this law and has a height of 28.9 inches, what is the least possible value of x, in inches?"
  - 易错点：`tanθ` 无括号、`θ` 变量；`≤`（U+2264）；`1/12`；`28.9 inches`；`least possible value`（取等号边界）。
- **选项确认**：grid，`choices:{}`。
- **图形 ↔ spec**：原图 = 坡道直角三角形，θ 在左下，底边标 x，斜边标 "length of the ramp"，竖直边标 "height of the ramp"；`figSpec.type=rawSvg` 手绘 svg：水平地面 + 竖直高边 + 斜边 + 直角小方块 + θ 弧标 + x/双标签。
- **答案复算（独立复算）**：tanθ = 28.9/x ≤ 1/12 → x ≥ 12·28.9 = **346.8**（value 346.8，answer "346.8"）。
- **结论**：逐字已核，复算自洽。

## #29（R04-129，grid）
- **原页定位**：p13.jpg 右半（书页 165）左栏上题框，册内 #29。
- **逐字核对**："For two acute angles, ∠Q and ∠R, cos Q = sin R. The measures, in degrees, of ∠Q and ∠R are x + 24 and 4x + 6, respectively. What is the value of x?"
  - 易错点：`∠Q`、`∠R` 符号；`cos Q = sin R` 无括号；`x + 24`、`4x + 6` 加号两侧空格照抄；`in degrees`。
- **选项确认**：grid，`choices:{}`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算（独立复算）**：锐角 cos Q = sin R → Q + R = 90°；(x+24) + (4x+6) = 90 → 5x + 30 = 90 → x = **12**（value 12）。
- **结论**：逐字已核，复算自洽。

## #30（R04-130，grid）
- **原页定位**：p13.jpg 右半（书页 165）左栏中上题框，册内 #30。
- **逐字核对**："In triangle XYZ, angle Y is a right angle, the measure of angle Z is 39°, and the length of YZ is 28 units. If the area, in square units, of triangle XYZ can be represented by the expression k tan 39°, where k is a constant, what is the value of k?"
  - 易错点：`39°` 度数；`YZ = 28 units`；`k tan 39°`（k 为系数，非角度）；`square units`。
- **选项确认**：grid，`choices:{}`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算（独立复算）**：直角在 Y，tan Z = XY/YZ → XY = 28tan39°；面积 = ½·YZ·XY = ½·28·28tan39° = **392**tan39° → k = 392（value 392）。
- **结论**：逐字已核，复算自洽。

## #31（R04-131，grid）
- **原页定位**：p13.jpg 右半（书页 165）左栏中下题框，册内 #31。
- **逐字核对**："In right triangle ABC, angles A and B are acute, side AC has a length of 25.8, and tan B = 1/4. What is the length of side BC, rounded to the nearest tenth?"
  - 易错点：`25.8` 一位小数；`tan B = 1/4`；`rounded to the nearest tenth`；直角在 C（A、B 均锐角）。
- **选项确认**：grid，`choices:{}`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算（独立复算）**：tan B = AC/BC = 1/4 → BC = 4·AC = 4·25.8 = **103.2**（已是十分位，value 103.2，answer "103.2"）。
- **结论**：逐字已核，复算自洽。

## #32（R04-132，grid）
- **原页定位**：p13.jpg 右半（书页 165）左栏下题框，册内 #32。
- **逐字核对**："The perimeter of an equilateral triangle is 750 centimeters. The three vertices of the triangle lie on a circle. The radius of the circle is w√3 centimeters. What is the value of w?"
  - 易错点：`750 centimeters`；`w√3` 斜体变量 w；外接圆（三顶点共圆）；求系数 w。
- **选项确认**：grid，`choices:{}`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算（独立复算）**：边长 s = 750/3 = 250；等边外接圆半径 R = s/√3 = 250/√3 = 250√3/3 = w√3 → **w = 250/3** ≈ 83.333（value 83.33333333333333，answer "250/3, 83.333, 83.33"）。
- **结论**：逐字已核，复算自洽。

## #33（R04-133，mcq）
- **原页定位**：p13.jpg 右半（书页 165）右栏上题框，册内 #33。
- **逐字核对**："Which of the following expressions is equivalent to (sin22°)(cos68°)+(cos22°)(sin68°)?"
  - 易错点：三角函数与度数间无空格（`sin22°`、`cos68°` 照原页）；乘号省略、`+` 两侧无空格；上标 `²`（U+00B2）。
- **选项逐项**：A `2(cos68°)(sin22°)`；B `2(cos68°)+2(cos22°)`；C `(cos68°)²+(cos22°)²`；D `(cos68°)²+(sin22°)²`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算（独立复算）**：sin22° = cos68°，cos22° = sin68°；原式 = cos²68° + sin²68° = 1；又 cos22° = sin68°，故 (cos68°)² + (cos22°)² = cos²68° + sin²68° = 1 → **C**（数值验证两式均 = 1.0）。
- **结论**：逐字已核，复算自洽。

## #34（R04-134，mcq）
- **原页定位**：p13.jpg 右半（书页 165）右栏下题框，册内 #34。
- **逐字核对**："The difference between the measure of angle A and the measure of angle B is −11/12 π radians. Which expression shows the difference between the measure of angle A and the measure of angle B, in degrees?"
  - 易错点：`−11/12 π` 负号 U+2212、π 紧贴分数；`radians` → `in degrees`；换算因子 180°/π（非 360°/π、非 π/180°）。
- **选项逐项**：A `−11/12 · 180°/π`（漏 π 项）；B `−11/12 π · π/180°`（方向反）；C `−11/12 π · 180°/π`；D `−11/12 π · 360°/π`（整圈因子）。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算（独立复算）**：弧度化度 = rad × 180°/π；(−11/12 π)·(180°/π) → **C**。
- **结论**：逐字已核，复算自洽。

## #35（R04-135，mcq）
- **原页定位**：p14.jpg 左半（书页 166）左栏上题框，册内 #35。
- **逐字核对**："Point F lies on a unit circle in the xy-plane and has coordinates (1, 0). Point G is the center of the circle and has coordinates (0, 0). Point H also lies on the circle and has coordinates (−1, y), where y is a constant. Which of the following could be the positive measure of angle FGH, in radians?"
  - 易错点：`(1, 0)`、`(0, 0)`、`(−1, y)`（负号 U+2212）；`unit circle`；`positive measure`；y 为常数（单位圆 x=−1 强制 y=0）。
- **选项逐项**：A `59π/2`；B `61π/2`；C `56π`；D `57π`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算（独立复算）**：单位圆上 x=−1 → y=0，H=(−1,0)；GF 在正 x 轴、GH 在负 x 轴，∠FGH ≡ π (mod 2π)；57π = 28·2π + π 符合；59π/2、61π/2 终边在 y 轴，56π 终边回正 x 轴，均不符 → **D**。
- **结论**：逐字已核，复算自洽。

## #36（R04-136，grid）
- **原页定位**：p14.jpg 左半（书页 166）左栏下题框，册内 #36。
- **逐字核对**："Point N lies on a unit circle in the xy-plane and has coordinates (1, 0). Point O is the center of the circle and has coordinates (0, 0). Point M also lies on the unit circle, and the measure of angle NOM is 356π/3 radians. If the coordinates of point M are (a, b), where a and b are constants, what is the value of a?"
  - 易错点：`356π/3`；`(a, b)`；求横坐标 a（=cos 终边角），非 b。
- **选项确认**：grid，`choices:{}`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算（独立复算）**：356π/3 减整圈 2π=6π/3：356 mod 6 = 2 → 终边 2π/3；a = cos(2π/3) = **−1/2**（value −0.5，answer "−1/2"）。
- **结论**：逐字已核，复算自洽。

## #37（R04-137，mcq）
- **原页定位**：p14.jpg 左半（书页 166）右栏上题框，册内 #37。
- **逐字核对**："The measure of angle D is 5π/4 radians. What is the value of sin(D)?"
  - 易错点：`5π/4`；`sin(D)` 带括号；第三象限正弦为负。
- **选项逐项**：A `−√3/2`；B `−√2/2`；C `1/2`；D `√2/2`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算（独立复算）**：5π/4 = π + π/4（第三象限），sin(5π/4) = −sin(π/4) = **−√2/2** → **B**。
- **结论**：逐字已核，复算自洽。

---

## 汇总
- mcq 6 题：#21=C、#23=D、#33=C、#34=C、#35=D、#37=B；grid 12 题：#20=21/29、#22=6、#24=7/50、#25=15/17、#26=177、#27=20/29、#28=346.8、#29=12、#30=392、#31=103.2、#32=250/3、#36=−1/2。合计 18 题。
- 配图 2 题：#22（rawSvg 直角△+DE 辅助线）、#28（rawSvg 坡道三角+θ/x/双标签）；其余 16 题 `figSpec:null`。
- 自查修掉的差异条数：**0**（题干/选项一次成稿，放大复核与本地不变量自检、数值复算均未发现需改字）。
