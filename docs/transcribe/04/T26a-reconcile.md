# T26a 对账台账 · 04 Geometry · Topic 26（Right Triangles and Trigonometry）#1–#19

- 题包：`docs/transcribe/04/fragments/T26a.json`（R04-101 … R04-119，19 题连续无重复）
- 素材：`docs/transcribe/04/pages/p10.jpg`（书页 159，#1–#4）、`p11.jpg`（书页 160–161，#5–#14）、`p12.jpg`（书页 162，#15–#19）
- 答案口径：扫描件 18 页仅收录题目（书页 142–174），**册内答案页未入扫描**；每题均独立复算后定稿，未抄答案页。
- 易错点逐项：角度度数 `°`、边长标注、`sin/cos/tan` 写法（`tan(A)`、`cos A`、`sin(B)` 照原页括号有无）、根号 `√` 与分数写法（叠分数 inline 为 `a√b/c`、`c/√d`）、斜体变量、单位（centimeters/inches/square centimeters/square units）。

## 自检记录（merge dry-run，未写盘）

| 批次 | 命令 | 输出 |
|---|---|---|
| #1–#6 | `python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/04/fragments/T26a.json --dry-run` | 题包 book=04 topic=26 section=4.5.T26 · 共 6 题；将新增 R04-101…R04-106；[dry-run] 未写盘，无 FAIL |
| #1–#13 | 同上 | 共 13 题；将新增 R04-101…R04-113；无 FAIL |
| #1–#19 | 同上 | 共 19 题；将新增 R04-101…R04-119；无 FAIL（未声明 section 的 advisory FAIL 按预期忽略） |

---

## #1（R04-101，grid）
- **原页定位**：p10.jpg 右半（书页 159）左上题框，册内 #1。
- **逐字核对**：题干 "The perimeter of an equilateral triangle is 624 centimeters. The height of this triangle is k√3 centimeters, where k is a constant. What is the value of k?"
  - 易错点：`624` 三位数无千分位；`k√3` 斜体变量 k；单位 `centimeters` 出现两次；grid 题无选项。
- **选项确认**：grid，`choices:{}`，无选项。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**：等边边长 s = 624/3 = 208；高 h = (√3/2)s = (√3/2)·208 = 104√3 = k√3 → **k = 104**（value 104，answer "104"）。
- **结论**：逐字已核，复算自洽。

## #2（R04-102，mcq）
- **原页定位**：p10.jpg 右半（书页 159）左下题框，册内 #2。
- **逐字核对**："An isosceles right triangle has a hypotenuse of length 58 inches. What is the perimeter, in inches, of this triangle?"
  - 易错点：`hypotenuse` 拼写；`58 inches`；`isosceles right triangle`；选项加号无空格（58+58√2 / 58+116√2，照原页）。
- **选项逐项**：A `29√2`；B `58√2`；C `58+58√2`；D `58+116√2`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**：直角边 = 58/√2 = 29√2；P = 2·29√2 + 58 = 58 + 58√2 → **C**。
- **结论**：逐字已核，复算自洽。

## #3（R04-103，mcq）
- **原页定位**：p10.jpg 右半（书页 159）右上题框，册内 #3。
- **逐字核对**："An isosceles right triangle has a perimeter of 94 + 94√2 inches. What is the length, in inches, of one leg of this triangle?"
  - 易错点：题干 `94 + 94√2` 加号两侧有空格（照原页）；选项无空格；`one leg` 非 hypotenuse。
- **选项逐项**：A `47`；B `47√2`；C `94`；D `94√2`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**：设直角边 a，斜边 a√2，P = a(2+√2) = 94(1+√2)；a = 94(1+√2)/(2+√2) = 94 → **C**。
- **结论**：逐字已核，复算自洽。

## #4（R04-104，mcq，阴影）
- **原页定位**：p10.jpg 右半（书页 159）右下题框，册内 #4。
- **逐字核对**："Note: Figure not drawn to scale.\nA graphic designer is creating a logo for a company. The logo is shown in the figure above. The logo is in the shape of a trapezoid and consists of three congruent equilateral triangles. If the perimeter of the logo is 20 centimeters, what is the combined area of the shaded regions, in square centimeters, of the logo?"
  - 易错点：`congruent equilateral triangles`；`20 centimeters`；单位 `square centimeters`；`shaded regions`（阴影题，须 region 通路）。
- **选项逐项**：A `2√3`；B `4√3`；C `8√3`；D `16`。
- **图形 ↔ spec**：原图 = 梯形外轮廓内含 3 个全等等边三角（左▲阴影、中▽白、右▲阴影）；`figSpec.type=rawSvg` 手绘 svg（外框梯形 + 两条内分隔线 + 两块阴影多边形），并附 `series[].kind=region` 两块多边形供 shaded 校验门控。
- **答案复算**：外轮廓 5 条等边边：5s = 20 → s = 4；单块等边面积 = (√3/4)·4² = 4√3；两块阴影 = 8√3 → **C**。
- **结论**：逐字已核，复算自洽。

## #5（R04-105，mcq）
- **原页定位**：p11.jpg 左半（书页 160）左上题框，册内 #5。
- **逐字核对**：给定块 `RS = 440 / ST = 384 / TR = 584`（等号两侧空格照抄）；"The side lengths of right triangle RST are given. Triangle RST is similar to triangle UVW, where S corresponds to V and T corresponds to W. What is the value of tan W?"
  - 易错点：对应关系 S↔V、T↔W（R↔U）；`tan W` 无括号；三边长 440/384/584 勾股验证 440²+384²=341056=584²。
- **选项逐项**：A `48/73`；B `55/73`；C `48/55`；D `55/48`（叠分数 inline 照抄）。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**：∠W ↔ ∠T；tan T = 对边 RS/邻边 ST = 440/384 = 55/48 → **D**。
- **结论**：逐字已核，复算自洽。

## #6（R04-106，grid）
- **原页定位**：p11.jpg 左半（书页 160）左下题框，册内 #6。
- **逐字核对**："A right triangle has legs with lengths of 24 centimeters and 21 centimeters. If the length of this triangle's hypotenuse, in centimeters, can be written in the form 3√d, where d is an integer, what is the value of d?"
  - 易错点：`triangle's` 撇号；`3√d` 形式；`d is an integer`；单位 centimeters。
- **选项确认**：grid，`choices:{}`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**：h = √(24²+21²) = √(576+441) = √1017 = √(9·113) = 3√113 → **d = 113**（value 113）。
- **结论**：逐字已核，复算自洽。

## #7（R04-107，mcq）
- **原页定位**：p11.jpg 左半（书页 160）右上题框，册内 #7。
- **逐字核对**："Triangle ABC is similar to triangle DEF, where A corresponds to D and C corresponds to F. Angles C and F are right angles. If tan(A) = √3 and DF = 125, what is the length of DE?"
  - 易错点：`tan(A)` 带括号（照原页）；直角在 C/F；A↔D、C↔F；`DF = 125`。
- **选项逐项**：A `125√3/3`；B `125√3/2`；C `125√3`；D `250`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**：tan D = EF/DF = √3 → EF = 125√3；DE = √(125² + (125√3)²) = √62500 = 250 → **D**。
- **结论**：逐字已核，复算自洽。

## #8（R04-108，mcq）
- **原页定位**：p11.jpg 左半（书页 160）右下题框，册内 #8。
- **逐字核对**："Triangle ABC is similar to triangle DEF, where angle A corresponds to angle D and angle C corresponds to angle F. Angles B and E are right angles. If cos A = 14/√421, what is the value of 1/sin F?"
  - 易错点：直角在 B/E（非 A/C）；`cos A` 无括号；叠分数 `14/√421`；求 `1/sin F` 倒数。
- **选项逐项**：A `15/√421`；B `14/√421`；C `√421/14`；D `√421/15`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**：∠F ↔ ∠C = 90°−∠A，sin F = sin C = cos A = 14/√421；1/sin F = √421/14 → **C**。（勾股第三边 √(421−196)=15 对应干扰项 D。）
- **结论**：逐字已核，复算自洽。

## #9（R04-109，grid）
- **原页定位**：p11.jpg 右半（书页 161）左上题框，册内 #9。
- **逐字核对**："The length of a rectangle's diagonal is 3√17, and the length of the rectangle's shorter side is 3. What is the length of the rectangle's longer side?"
  - 易错点：`rectangle's` 撇号；`3√17`；shorter side 3。
- **选项确认**：grid，`choices:{}`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**：l² = (3√17)² − 3² = 153 − 9 = 144 → l = **12**（value 12）。
- **结论**：逐字已核，复算自洽。

## #10（R04-110，mcq）
- **原页定位**：p11.jpg 右半（书页 161）左中题框，册内 #10。
- **逐字核对**："A square is inscribed in a circle. The radius of the circle is 20√2/2 inches. What is the side length, in inches, of the square?"
  - 易错点：叠分数半径 `20√2/2`（inline 照抄，不化简）；`inscribed in a circle`；单位 inches。
- **选项逐项**：A `20`；B `20√2/2`；C `20√2`；D `40`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**：对角线 = 2r = 20√2；边长 = 对角线/√2 = 20 → **A**。
- **结论**：逐字已核，复算自洽。

## #11（R04-111，grid）
- **原页定位**：p11.jpg 右半（书页 161）左下题框，册内 #11。
- **逐字核对**："A rectangle is inscribed in a circle, such that each vertex of the rectangle lies on the circumference of the circle. The diagonal of the rectangle is twice the length of the shortest side of the rectangle. The area of the rectangle is 1,089√3 square units. What is the length, in units, of the diameter of the circle?"
  - 易错点：`1,089√3` 千分位逗号；`square units`；对角线 = 2×短边；求 diameter。
- **选项确认**：grid，`choices:{}`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**：短边 a，长 a√3，面积 a²√3 = 1,089√3 → a² = 1089 → a = 33；直径 = 对角线 = 2a = **66**（value 66）。
- **结论**：逐字已核，复算自洽。

## #12（R04-112，grid）
- **原页定位**：p11.jpg 右半（书页 161）右上题框，册内 #12。
- **逐字核对**："A triangle with angle measures 30°, 60°, and 90° has a perimeter of 18 + 6√3. What is the length of the longest side of the triangle?"
  - 易错点：三个度数 `30°, 60°, 90°` 逗号照抄；`18 + 6√3` 加号两侧空格；求 longest side（斜边 2x）。
- **选项确认**：grid，`choices:{}`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**：30-60-90 三边 x, x√3, 2x；P = x(3+√3) = 6(3+√3) → x = 6；最长边 2x = **12**（value 12）。
- **结论**：逐字已核，复算自洽。

## #13（R04-113，mcq）
- **原页定位**：p11.jpg 右半（书页 161）右中题框，册内 #13。
- **逐字核对**："The length of one side of an equilateral triangle is 37. The length of the base of an isosceles triangle is 37, and the corresponding height of the isosceles triangle is √3 times the height of the equilateral triangle. What is the perimeter of the isosceles triangle?"
  - 易错点：两个三角形共用 37；`√3 times`；`corresponding height`；选项根号内 13/10/5/2 不可混。
- **选项逐项**：A `37√13+37`；B `37√10+37`；C `37√5+37`；D `37√2+37`（加号无空格照抄）。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**：等边高 = 37√3/2；等腰高 = √3 倍 = 111/2；半底 37/2；腰 = √((37/2)² + (111/2)²) = √13690/2 = 37√10/2；P = 2·腰 + 37 = 37√10 + 37 → **B**。
- **结论**：逐字已核，复算自洽。

## #14（R04-114，mcq）
- **原页定位**：p11.jpg 右半（书页 161）右下题框，册内 #14。
- **逐字核对**："The perimeter of an isosceles right triangle is 24 + 24√2 inches. What is the length, in inches, of the hypotenuse of this triangle?"
  - 易错点：求 hypotenuse（不是 leg）；`24 + 24√2` 加号空格照抄；单位 inches。
- **选项逐项**：A `12`；B `12√2`；C `24`；D `24√2`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**：斜边 h，直角边 h/√2；P = h + 2·h/√2 = h(1+√2) = 24(1+√2) → h = **24** → **C**。
- **结论**：逐字已核，复算自洽。

## #15（R04-115，grid）
- **原页定位**：p12.jpg 左半（书页 162）左上题框，册内 #15。
- **逐字核对**："If the perimeter of an equilateral triangle with a height of 23 is a√3, what is the value of a?"
  - 易错点：高 23（非 46）；`a√3`；求周长表达式系数 a。
- **选项确认**：grid，`choices:{}`。
- **图形 ↔ spec**：无图，`figSpec:null`。
- **答案复算**：23 = (√3/2)s → s = 46/√3；P = 3s = 138/√3 = 46√3 = a√3 → **a = 46**（value 46）。
- **结论**：逐字已核，复算自洽。

## #16（R04-116，grid）
- **原页定位**：p12.jpg 左半（书页 162）左中题框，册内 #16。
- **逐字核对**："Note: Figure not drawn to scale.\nIn triangle RST above, point W (not shown) lies on RT. What is the value of cos(∠RSW) − sin(∠WST)?"
  - 易错点：`cos(∠RSW)` 带括号、`sin(∠WST)` 带括号；减号 `−`（U+2212）；∠ 符号；W 未画出、在 RT 上；12/5 为干扰数据。
- **选项确认**：grid，`choices:{}`。
- **图形 ↔ spec**：原图直角在 S，RS=12（边0）、ST=5（边1）；`figSpec.type=triangle`，pts=[[70,200]R,[270,90]S,[270,200]T]，`right:[1]`，`angles:{1:"90°"}`，`sides:{0:"12",1:"5"}`，`note:true`。
- **答案复算**：W 在 RT 上，射线 SW 夹在直角 ∠RST 内：∠RSW + ∠WST = 90°，故 sin(∠WST) = cos(∠RSW)，差 = **0**（value 0）。
- **结论**：逐字已核，复算自洽。

## #17（R04-117，grid）
- **原页定位**：p12.jpg 左半（书页 162）左下题框，册内 #17。
- **逐字核对**："Note: Figure not drawn to scale.\nTriangle ABC above is a right triangle, and sin(B) = 5/13. What is the length of side BC?"
  - 易错点：`sin(B)` 带括号；叠分数 5/13；AB=26（图上斜边标注）；求 BC（非 AC）。
- **选项确认**：grid，`choices:{}`。
- **图形 ↔ spec**：原图直角在 C（右下），斜边 AB=26；`figSpec.type=triangle`，pts=[[70,200]A,[270,70]B,[270,200]C]，`right:[2]`，`angles:{2:"90°"}`，`sides:{0:"26"}`，`note:true`。
- **答案复算**：sin B = AC/AB = 5/13，AB = 26 → AC = 10；BC = √(26² − 10²) = √576 = **24**（value 24）。
- **结论**：逐字已核，复算自洽。

## #18（R04-118，grid）
- **原页定位**：p12.jpg 左半（书页 162）右上题框，册内 #18。
- **逐字核对**："Note: Figure not drawn to scale.\nIn the triangle shown, what is the value of sin x°?"
  - 易错点：`x°` 度数；无字母顶点；斜边 23、底边 16；求 sin x°（x 在左上）。
- **选项确认**：grid，`choices:{}`。
- **图形 ↔ spec**：原图直角在左下，x° 在左上，斜边 23（边2）、底边 16（边1）；`figSpec.type=triangle`，pts=[[70,60]左上,[70,200]左下,[270,200]右下]，`labels:["","",""]`，`right:[1]`，`angles:{0:"x°"}`，`sides:{1:"16",2:"23"}`，`note:true`。
- **答案复算**：sin x° = 对边（底边 16）/斜边 23 = **16/23**（value 0.6956521739130435）。
- **结论**：逐字已核，复算自洽。

## #19（R04-119，grid）
- **原页定位**：p12.jpg 左半（书页 162）右下题框，册内 #19。
- **逐字核对**："Note: Figure not drawn to scale.\nIn the triangle shown above, ∠B = 90°, AC = 108, and the value of cosC is √3/2. What is the value of cosA?"
  - 易错点：`∠B = 90°`、`cosC`/`cosA` 无括号（照原页）；`√3/2`；AC=108 斜边；30° 标在 C。
- **选项确认**：grid，`choices:{}`。
- **图形 ↔ spec**：原图 B 左下直角、C 右下 30°、A 左上，AC=108（边2）；`figSpec.type=triangle`，pts=[[80,60]A,[80,200]B,[280,200]C]，`right:[1]`，`angles:{1:"90°",2:"30°"}`，`sides:{2:"108"}`，`note:true`。
- **答案复算**：cos C = √3/2 → ∠C = 30° → ∠A = 60°；AB = √(108² − (54√3)²) = 54；cos A = AB/AC = 54/108 = **1/2**（value 0.5）。
- **结论**：逐字已核，复算自洽。

---

## 汇总
- mcq 9 题：#2=C、#3=C、#4=C、#5=D、#7=D、#8=C、#10=A、#13=B、#14=C；grid 10 题：#1=104、#6=113、#9=12、#11=66、#12=12、#15=46、#16=0、#17=24、#18=16/23、#19=1/2。合计 19 题。
- 自查修掉的差异条数：**0**（全部题干/选项一次成稿，放大复核未发现需改字）。