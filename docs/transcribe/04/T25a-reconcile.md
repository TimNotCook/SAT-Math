# T25a 对账台账 · Topic 25（Lines, Angles, and Triangle）#1–#19

- 题包：`docs/transcribe/04/fragments/T25a.json`（R04-061 … R04-079，19 题，grid 13 / mcq 6）
- 原页：`docs/transcribe/04/pages/p06.jpg`（书页 150–151，#1–#8）、`p07.jpg`（书页 152–153，#9–#17）、`p08.jpg`（书页 154，#18/#19；#20/#21 出范围）
- 口径：题干逐字照扫描；∠ 在题库文本层拼写为 `angle`（与 data/text.js 全库一致，0 处 ∠）；线段去 overline 写纯字母；#16 选项减号照扫描用 `−`（U+2212），#18 `2x - 53` 扫描为 ASCII 短横照抄；degree 符号 `°` 照抄。
- 自检命令：
  - `python3 scratch/selfcheck_t25a.py`（结构自检：必填字段/选项数/答案字母在选项内/grid value 有限数/figSpec 形态/id 连续）
  - `python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/04/fragments/T25a.json --dry-run`（入库脚本校验）
- 自检输出摘要：`题数: 19  id: R04-061 … R04-079 · type 分布: {'grid': 13, 'mcq': 6} · FAIL: 0`；merge dry-run `将新增 19 题 … [dry-run] 未写盘`，MERGE_EXIT=0。

---

## R04-061 · #1（grid，answer `101/2, 50.5`，value 50.5）

- **原页定位**：p06 左页（书 150）左栏顶部。
- **逐字核对**：题干 "In the figure, parallel lines q and t are intersected by lines r and s. If a = 43 and b = 122, what is the value of w?" 逐字抄自原页；易错点：`q`/`t` 小写斜体、`a = 43`、`b = 122` 数字无单位；句末问号；图下 "Note: Figure not drawn to scale." 不入题干。
- **图形对应**：q∥t 两条水平线；r、s 在 q 上方相交；a° 在 r∩s 处，b° 在 r∩q 处，两个 w° 在 s∩t 处。figSpec=rawSvg（parallelLines 模板只支持单截线，本题双截线，按规范用 rawSvg）。
- **复算**：r、q、s 围成三角形，内角 43（对顶）、180−122=58、第三角 180−43−58=79；q∥t，79° 与两个 w° 构成同旁和：79+2w=180 → w=101/2=50.5。官方答案册 `answers Lines Angles Triangles 31-40.pdf`（Tri.36）复核一致。
- **结论**：一致（零差异）。

## R04-062 · #2（grid，answer `280/9, 31.11`，value 31.11）

- **原页定位**：p06 左页（书 150）左栏底部。
- **逐字核对**："In the figure, LQ intersects MP at point R, and LM is parallel to PQ. The lengths of MR, LR, and RP are 9, 10, and 19, respectively. What is the length of LQ?" 易错点：`MR, LR, RP` 顺序为 9, 10, 19；`respectively`；平行写 LM∥PQ。
- **图形对应**：L–R–Q 水平共线；M 在上方、P 在下方；LM∥PQ；MP 交 LQ 于 R。figSpec=rawSvg。
- **复算**：LM∥PQ → △LMR∼△QPR（M↔P, L↔Q），MR/PR=LR/QR=9/19 → QR=10×19/9=190/9；LQ=LR+RQ=10+190/9=(90+190)/9=280/9≈31.11。
- **结论**：一致（零差异）。

## R04-063 · #3（grid，answer `49`，value 49）

- **原页定位**：p06 左页（书 150）右栏顶部。
- **逐字核对**："In the figure shown, points Q, R, S, and T lie on line segment PV, and line segment RU intersects line segment SX at point W. The measure of angle SQX is 48°, the measure of angle SXQ is 86°, the measure of angle SWU is 85°, and the measure of angle VTU is 162°. What is the measure, in degrees, of angle TUR?" 易错点：四个角度 48/86/85/162 顺序不可混；`line segment RU intersects line segment SX at point W`；`in degrees`。
- **图形对应**：P–Q–R–S–T–V 水平共线；X 在左下；QX、SX 成 △SQX；RU 交 SX 于 W；TU 连 T 到 U。figSpec=rawSvg。
- **复算**：△SQX：∠QSX=180−48−86=46°；△SWU 中 ∠WSU=∠QSX=46°、∠SWU=85° → ∠SUW=180−85−46=49°；R、W、U 共线，∠TUR=∠SUW=49°。线上同题 quiz 答案 49 复核一致。
- **结论**：一致（零差异）。

## R04-064 · #4（grid，answer `83`，value 83）

- **原页定位**：p06 左页（书 150）右栏底部。
- **逐字核对**："Intersecting lines r, s, and t are shown below.\nWhat is the value of x?" 易错点：`below` 位置词；三小写线名 r/s/t。
- **图形对应**：s 竖直；r 缓降、t 陡降两条截线；106° 在 s∩r 上方，23° 在 r∩t 处，x° 在 s 左侧。figSpec=rawSvg。
- **复算**：106° 补角=74°；三角形内 74+23+第三角=180 → 第三角=83；x 与该角对顶相等 → x=83。
- **结论**：一致（零差异）。

## R04-065 · #5（grid，answer `30`，value 30）

- **原页定位**：p06 右页（书 151）左栏顶部。
- **逐字核对**："In the figure above, MQ and NR intersect at point P, NP = QP, and MP = PR. What is the measure, in degrees, of angle QMR? (Disregard the degree symbol when gridding your answer.)" 易错点：括号提示 `Disregard the degree symbol when gridding your answer.` 保留；`NP = QP`、`MP = PR` 两组等长。
- **图形对应**：N、Q 在上，M、R 在下；MQ、NR 交于 P；70° 在 Q，60° 在 P。figSpec=rawSvg。
- **复算**：∠QPR=60°，其补角 ∠MPR=120°；MP=PR → △MPR 等腰，底角 ∠PMR=(180−120)/2=30°；∠QMR=∠PMR=30°。
- **结论**：一致（零差异）。

## R04-066 · #6（grid，answer `54`，value 54）

- **原页定位**：p06 右页（书 151）左栏底部。
- **逐字核对**："In the figure shown, WZ and XY intersect at point Q. YQ = 63, WQ = 70, WX = 60, and XQ = 120. What is the length of YZ?" 易错点：四组数 63/70/60/120 对应 YQ/WQ/WX/XQ，勿换位。
- **图形对应**：W、Y 在上（各标 a°），X、Z 在下；WZ、XY 交于 Q（蝴蝶结）。figSpec=rawSvg。
- **复算**：△WQX∼△YQZ（W↔Y, X↔Z）：WQ/YQ=70/63=10/9=WX/YZ → YZ=60×9/10=54。线上 quiz 答案 54 复核一致。
- **结论**：一致（零差异）。

## R04-067 · #7（grid，answer `83`，value 83）

- **原页定位**：p06 右页（书 151）右栏顶部。
- **逐字核对**："In the figure, AC = CD. The measure of angle EBC is 45°, and the measure of angle ACD is 104°. What is the value of x?" 易错点：`AC = CD` 而非 AC=BC；45° 与 104° 位置。
- **图形对应**：△DBA，C 在 DB 上，E 在 DA 上；AC、BE 相交；x° 在 E。figSpec 沿用同库旧题 U4-07 rawSvg 骨架（29°/108° 换 45°/104°）。
- **复算**：AC=CD，∠ACD=104 → 底角 ∠CAD=(180−104)/2=38；△ABE 外角定理 x=∠EBC+∠CAD=45+38=83。**自查修正**：初算误取 Gauth AI 的 97；以同库旧题 U4-07（EBC=29, ACD=108 → 65=29+36）同型链条复核，定为 83。
- **结论**：差异已修（97 → 83，依据同型旧题链条）。

## R04-068 · #8（grid，answer `64`，value 64）

- **原页定位**：p06 右页（书 151）右栏底部。
- **逐字核对**："In the figure above, RT = TU. What is the value of x?" 易错点：`above`；仅给 RT=TU，度数全在图上（31° 在 S、114° 在 T、x° 在 V）。**题型确认**：扫描为 grid 填空框（非 mcq），线上版本同题为选项 72/66/64/58，本册按 grid 转录。
- **图形对应**：S 左上，R 左下，U 右下；T 在内，V 在 RU 上；31°∠S、114°∠STU、x°∠RVT。figSpec=rawSvg。
- **复算**：△STU：∠TUS=180−114−31=35；RT=TU → △RTU 等腰，顶角 ∠RTU=114，底角 ∠TUR=33；外角定理 x=∠VSU+∠SUV=31+33=64。Numerade/Testbook 答案 64 复核一致。
- **结论**：一致（零差异；题型按本册扫描取 grid）。

## R04-069 · #9（grid，answer `146`，value 146）

- **原页定位**：p07 左页（书 152）左栏顶部。
- **逐字核对**："In the figure, RT = TU, the measure of angle VST is 24°, and the measure of angle RVS is 41°. What is the value of x?" 易错点：VST=24（非同型变体 29/26/27），RVS=41。
- **图形对应**：U–V–R 水平底边；S 右上；T 在 US 上；连 VS、RS、RT；x° 在 T。figSpec=rawSvg。
- **复算**：△USV 外角 ∠RVS=41=∠SUV(α)+∠VST=α+24 → α=17；RT=TU → △RTU 等腰，∠TRU=∠TUR=α=17；x=∠RTU=180−2×17=146。同型 29/41 版 x=156=180−2×12，链条验证一致。
- **结论**：一致（零差异）。

## R04-070 · #10（mcq，answer C）

- **原页定位**：p07 左页（书 152）左栏底部。
- **逐字核对**："In triangles ABC and DEF, angles B and E each have measure 27° and angles C and F each have measure 41°. Which additional piece of information is sufficient to determine whether triangle ABC is congruent to triangle DEF?"
  - A The measure of angle A
  - B The length of side AB
  - C The lengths of sides BC and EF
  - D No additional information is necessary.
  易错点：C 是"两条边 BC 和 EF"（对应边，夹在 27°/41° 之间），非单条；D 结尾 `necessary`。
- **图形**：无图，figSpec=null。
- **复算**：两角相等仅得相似；C 给出对应边 BC、EF 长度可判 ASA 全等。**自查修正**：初稿误记 B；Gauth 专家答案 C 复核改定。
- **结论**：差异已修（B → C）。

## R04-071 · #11（mcq，answer D）

- **原页定位**：p07 左页（书 152）右栏顶部。
- **逐字核对**："In triangle DEF, the measure of angle D is 46° and the measure of angle E is 99°. In triangle RST, the measure of angle R is 46° and the measure of angle S is 99°. Which of the following additional pieces of information is needed to determine whether triangle DEF is similar to triangle RST?"
  - A The measure of angle F
  - B The measure of angle T
  - C The measure of angle F and the measure of angle T
  - D No additional information is needed.
- **图形**：无图，figSpec=null。
- **复算**：∠D=∠R=46、∠E=∠S=99，第三角 ∠F=∠T=35 自动推出，AA 相似无需补充 → D。
- **结论**：一致（零差异）。

## R04-072 · #12（mcq，answer B）

- **原页定位**：p07 左页（书 152）右栏底部。
- **逐字核对**："In triangles LMN and RST, angles L and R each have measure 60°, LN = 10, and RT = 30. Which additional piece of information is sufficient to prove that triangle LMN is similar to triangle RST?"
  - A MN = 7 and ST = 7
  - B MN = 7 and ST = 21
  - C The measures of angles M and S are 70° and 60°, respectively.
  - D The measures of angles M and T are 70° and 50°, respectively.
  易错点：LN/RT=10/30=1/3；C 给 M=70/S=60 不对应；D 给 M=70/T=50 不对应。
- **图形**：无图，figSpec=null。
- **复算**：B：MN/ST=7/21=1/3=LN/RT，夹角 ∠L=∠R=60° → SAS 相似。
- **结论**：一致（零差异）。

## R04-073 · #13（mcq，answer B）

- **原页定位**：p07 右页（书 153）左栏顶部。
- **逐字核对**："In triangle ABC, the measure of angle A is 56° and AC = 35. In triangle PQR, the measure of angle P is 56° and PR = 105. Which additional piece of information is sufficient to prove that triangle ABC is similar to triangle PQR?"
  - A AB = 50 and PQ = 50.
  - B The measures of angle B and angle R are 32° and 92°, respectively.
  - C The measures of angle B and angle Q are 56° and 32°, respectively.
  - D AB = 50 and QR = 150.
  易错点：B 是 B↔R（32/92），C 是 B↔Q（56/32）勿混。
- **图形**：无图，figSpec=null。
- **复算**：B：∠B=32 → ∠C=180−56−32=92=∠R；∠Q=180−56−92=32=∠B → AA。
- **结论**：一致（零差异）。

## R04-074 · #14（grid，answer `20`，value 20）

- **原页定位**：p07 右页（书 153）左栏中部。
- **逐字核对**："Triangle XYZ is similar to triangle RST such that X, Y, and Z correspond to R, S, and T, respectively. The measure of angle Z is 20° and 2XY = RS. What is the measure of angle T, in degree ?" 易错点：扫描原文 `in degree ?`（单数 degree、问号前空格）照抄；`2XY = RS` 是边长干扰。
- **图形**：无图，figSpec=null。
- **复算**：Z↔T 对应，相似保角 → ∠T=∠Z=20。
- **结论**：一致（零差异）。

## R04-075 · #15（grid，answer `120`，value 120）

- **原页定位**：p07 右页（书 153）左栏底部。
- **逐字核对**："Quadrilaterals PQRS and WXYZ are similar, where P, Q, and R correspond to W, X, and Y, respectively. The measure of angle S is 120°, PS = 40, and WZ = 8. What is the measure of angle Z, in degree ?" 易错点：S↔Z（P,Q,R↔W,X,Y 推出）；`in degree ?` 照抄；PS=40/WZ=8 边长干扰。
- **图形**：无图，figSpec=null。
- **复算**：对应角相等 → ∠Z=∠S=120。
- **结论**：一致（零差异）。

## R04-076 · #16（mcq，answer D）

- **原页定位**：p07 右页（书 153）右栏顶部。
- **逐字核对**："Triangle ABC is similar to triangle XYZ, where A and B correspond to X and Y respectively. The length of each side of triangle XYZ is k times the length of its corresponding side in triangle ABC, where k is an integer greater than 1. The measure, in degrees, of angle Z can be represented by the expression 8x + 27, where x is an integer. Which of the following expressions represents the measure, in degrees, of angle C for all possible values of x?"
  - A 180 − k(8x + 27)
  - B 90 − (8x + 27)
  - C k(8x + 27)
  - D 8x + 27
  易错点：选项 A/B 减号为扫描 `−`（U+2212），已照抄；k 只缩放边长不影响角。
- **图形**：无图，figSpec=null。
- **复算**：相似保角，C↔Z → ∠C=∠Z=8x+27。
- **结论**：一致（零差异；减号字形已按扫描修）。

## R04-077 · #17（grid，answer `59`，value 59）

- **原页定位**：p07 右页（书 153）右栏底部。
- **逐字核对**："In the figure, lines r and s are parallel and line t intersects both lines. If a = 6k + 31 and b = k/5 + 56, what is the value of c?" 易错点：`k/5` 斜杠分数照抄；a、b 成线性对（非相等）。
- **图形对应**：r、s 竖直平行，t 斜截；a° 在 r 右上，b° 在 r 右下，c° 在 s 左下。figSpec=rawSvg。
- **复算**：a+b=180 → 6k+31+k/5+56=180 → (31/5)k=93 → k=15；b=59；c 与 b 内错相等 → c=59。
- **结论**：一致（零差异）。

## R04-078 · #18（grid，answer `62`，value 62）

- **原页定位**：p08 左页（书 154）左栏上部。
- **逐字核对**："In the figure, AG is parallel to DE, point B lies on AG, and AE intersects DB at point C. If y = 2x - 53 and z = 133, what is the value of x?" 易错点：`2x - 53` 扫描为 ASCII 短横照抄；z=133 在 B，y 在 C，x 在 E。
- **图形对应**：A、D 顶；B 在 AG 上；C=AE∩DB；y° 在 C，z° 在 B，x° 在 E。figSpec=rawSvg。
- **复算**：z=133 → ∠ABD=47；AG∥DE → ∠BAE=x=∠AED；△ABC：x+47+y=180 → x+y=133；联立 y=2x−53 → 3x=186 → x=62，y=71。
- **结论**：一致（零差异）。

## R04-079 · #19（mcq，answer D）

- **原页定位**：p08 左页（书 154）左栏下部。
- **逐字核对**："In triangle ABC, the measure of angle B is 90° and BD is an altitude of the triangle. The length of AB is 15 and the length of AC is 23 greater than the length of AB. What is the value of BC/BD?"
  - A 15/38
  - B 15/23
  - C 23/15
  - D 38/15
  易错点：AC=AB+23=38（非 23）；求 BC/BD 非 BD/BC。
- **图形**：无图（原页 #19 未配图），figSpec=null。
- **复算**：AB=15，AC=38；BD=AB·BC/AC=15·BC/38 → BC/BD=38/15。
- **结论**：一致（零差异）。

---

## 自查修掉的差异汇总（4 处）

1. #10 答案 B → **C**（初稿误记；对应边 BC/EF 才能 ASA，Gauth 专家答案复核）。
2. #7 答案 97 → **83**（弃用 Gauth AI 错误链，按同库旧题 U4-07 同型外角链 45+38）。
3. #16 选项 A/B 减号 ASCII `-` → 扫描 `−`（U+2212）照抄。
4. ledger 页侧 11 处左/右半页标签按 p06/p07 跨页版式订正。

另：#8 题型按本册扫描确认为 grid（线上版本为 mcq）；#9 由 24/41 独立链条解出 146（同型 29/41→156 验证）。
