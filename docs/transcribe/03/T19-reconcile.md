# Topic 19 · Distributions and Measurements of Center and Spread — 读题核对台账（R03-121…R03-151）

> 题包：三切片（VM 单次推送体量限制 + 无 git 凭证，沿用 T24-b1 批次先例）：`fragments/T19.json`（#1–#10）、`fragments/T19-b2.json`（#11–#20）、`fragments/T19-b3.json`（#21–#31），合计 31 题，section `2.7.T19`；布局与入库命令见 `T19-layout.md`。
> 读图素材：`docs/transcribe/03/pages/p08.jpg … p13.jpg`（书页 116–126）。
> 口径：只转录+复算，未写 `data/*.js`；答案全部独立复算，本册 PDF 无答案页（p20 右半为 04 扉页），无答案页可对照，复算过程见各题。
> 自检：`python3 tools/merge_transcribe_fragment.py --fragment … --dry-run` 对三切片分别通过（无 FAIL/非法字段）；section `2.7.T19` 未声明的 advisory 属预期。

## 答案汇总

| 册# | R03 id | 题型 | 答案 | value | 书页 |
|---|---|---|---|---|---|
| 1 | R03-121 | mcq | C | — | 116 |
| 2 | R03-122 | grid | 1 | 1 | 116 |
| 3 | R03-123 | mcq | A | — | 116 |
| 4 | R03-124 | mcq | B | — | 117 |
| 5 | R03-125 | mcq | C | — | 117 |
| 6 | R03-126 | mcq | C | — | 118 |
| 7 | R03-127 | mcq | A | — | 118 |
| 8 | R03-128 | mcq | D | — | 119 |
| 9 | R03-129 | mcq | A | — | 119 |
| 10 | R03-130 | grid | 0 | 0 | 120 |
| 11 | R03-131 | grid | 16 | 16 | 120 |
| 12 | R03-132 | mcq | B | — | 120 |
| 13 | R03-133 | grid | 2 | 2 | 121 |
| 14 | R03-134 | mcq | A | — | 121 |
| 15 | R03-135 | mcq | B | — | 122 |
| 16 | R03-136 | grid | 1 | 1 | 122 |
| 17 | R03-137 | mcq | D | — | 122 |
| 18 | R03-138 | mcq | A | — | 123 |
| 19 | R03-139 | mcq | D | — | 123 |
| 20 | R03-140 | mcq | A | — | 123 |
| 21 | R03-141 | grid | 52 | 52 | 124 |
| 22 | R03-142 | mcq | B | — | 124 |
| 23 | R03-143 | mcq | D | — | 124 |
| 24 | R03-144 | mcq | C | — | 124 |
| 25 | R03-145 | grid | 41 | 41 | 125 |
| 26 | R03-146 | grid | 44 | 44 | 125 |
| 27 | R03-147 | mcq | C | — | 125 |
| 28 | R03-148 | grid | 15.25 | 15.25 | 125 |
| 29 | R03-149 | mcq | C | — | 126 |
| 30 | R03-150 | grid | 2.6 | 2.6 | 126 |
| 31 | R03-151 | mcq | A | — | 126 |

---

## 逐题核对

### #1 · R03-121 · mcq · C · p08 左（书页 116）
- **原页定位**：p08.jpg 左半页上部，箱线图双条，横轴 20–32 Mass (kilograms)。
- **逐字核对**：题干 "The box plots summarize the masses, in kilograms, of two groups of gazelles. Based on the box plots, which of the following statements must be true?"；选项 A/B 谈 mean、C/D 谈 median，四选项逐字照录。
- **易错点**：箱线图不提供均值，A/B 无法判定；中位数线 Group 1 在 Group 2 右侧 → C。
- **图表↔spec**：`figSpec.chart` 两条 `kind:box`（Group 1: lo21/q1 22.5/med25.5/q3 27/hi30；Group 2: lo22/q1 23/med24.5/q3 25.5/hi28，五数为图上估读）。
- **复算**：无需数值计算，比较中位数相对位置即可；均值不可由箱线图推出。
- **结论**：C，逐字已核。

### #2 · R03-122 · grid · 1 · p08 左（书页 116）
- **原页定位**：p08.jpg 左半页中部，第二条双箱线图。
- **逐字核对**："The two box plots show the distribution of number of books read over the summer by the students in two different English classes. What is the positive difference between the ranges of number of books read over the summer for the two classes?"
- **易错点**：原书页轴误印 "Mass (kilograms)"（题干为 books），照原页保留在 spec label，台账备注；求"positive difference"，两 range 顺序不影响。
- **图表↔spec**：两条 box（G1: 21→28；G2: 22→28，端点像素复测：左帽 21.1/22.1，右帽均 28.1）。
- **复算**：G1 range = 28−21 = 7；G2 range = 28−22 = 6；正差 = 1。
- **结论**：value=1，逐字已核。

### #3 · R03-123 · mcq · A · p08 左（书页 116 右栏）
- **原页定位**：p08.jpg 左半页右栏，两张直方图 Data Set A / B，横轴 Integer 10–60，纵轴 Frequency 0–12。
- **逐字核对**：区间定义 "greater than or equal to 10, but less than 20" 等逐字；题干 "Two data sets of 23 integers each…"；选项 A 0 / B 1 / C 10 / D 23。
- **易错点**：区间左闭右开；两图频数柱高相同（3/4/7/9），不是"均值必然相等"而是"最小可能差为 0"。
- **图表↔spec**：`kind:bar` 两组柱（A/B 各 3,4,7,9）。
- **复算**：两集频数分布完全相同 → 每区间内可取相同整数使均值相等，最小差 0。
- **结论**：A，逐字已核。

### #4 · R03-124 · mcq · B · p08 右（书页 117 左栏）
- **原页定位**：p08.jpg 右半页左栏，直方图 Number of points 0–70，纵轴 0–30。
- **逐字核对**："last 50 games played"、"scores 18 points in the next game"、"new data set of 51 values"；I 谈 median、II 谈 mean，选项 I only / II only / I and II / Neither I nor II。
- **易错点**：I 不是"中位数下降"——50→51 个新中位数=原第 26 位，≥原中位数，不必真；II 中 18 < 全部原值(≥30)，均值必降。
- **图表↔spec**：bar 柱 30–40/40–50/50–60/60–70（柱高估读 3/7/26/14=50，不影响答案）。
- **复算**：I 假、II 真 → B。
- **结论**：B，逐字已核。

### #5 · R03-125 · mcq · C · p08 右（书页 117 右栏）
- **原页定位**：p08.jpg 右半页右栏，点图 Data Set A（22–26，15 点）。
- **逐字核对**："adding 56 to each of the values"；四选项 median equal/greater × range equal/greater 组合逐字。
- **易错点**：整体加常数 → 中位数+56（变大），极差不变。
- **图表↔spec**：`kind:points`（22×5, 23×4, 24×3, 25×2, 26×1）。
- **复算**：med A=23 → B=79；range A=4 → B=4 → C。
- **结论**：C，逐字已核。

### #6 · R03-126 · mcq · C · p09 左（书页 118 左栏）
- **原页定位**：p09.jpg 左半页左栏，点图 Number of bursts 1–5（13 点）。
- **逐字核对**："13 eruptions of a steam vent"、"additional eruption with 11 bursts"、"new data set of 14 eruptions"；I median / II mean；选项 I and II / I only / II only / Neither。
- **易错点**：加 11（远在右侧）中位数不变（I 假），均值上升（II 真）。
- **图表↔spec**：points（1×4, 2×5, 3×2, 4×1, 5×1）。
- **复算**：原中位=2，新中位=(2+2)/2=2；均值 29/13≈2.23 → 40/14≈2.86 → II only。
- **结论**：C，逐字已核。

### #7 · R03-127 · mcq · A · p09 左（书页 118 右栏）
- **原页定位**：p09.jpg 左半页右栏，双点图 Value 10–16。
- **逐字核对**：I median equal、II standard deviation equal；选项 I only / II only / I and II / Neither。
- **易错点**：两集中位数都=13（I 真）；分布形状不同，标准差不等（II 假），勿因对称外观误判。
- **图表↔spec**：两条 points（A: 10×1,11×4,12×2,13×3,14×2,15×3,16×1；B: 10×2,11×4,12×2,13×1,14×2,15×4,16×2，点数估读）。
- **复算**：A 16 个第 8/9 位均 13；B 17 个第 9 位=13。
- **结论**：A，逐字已核。

### #8 · R03-128 · mcq · D · p09 右（书页 119 左栏）
- **原页定位**：p09.jpg 右半页左栏，点图 Orbital period (days) 720–732（13 点）。
- **逐字核对**："rounded to the nearest whole number of Earth days"、"Jupiter's moons"、"553 days"、"14 orbital periods"；四选项 mean equal/less × median equal/less 组合逐字。
- **易错点**：553 远低于全部 → 均值降；13→14 中位数位置不变 → 相等。
- **图表↔spec**：points（720×2, 723×3, 724×2, 726×1, 727×1, 728×1, 730×2, 732×1）。
- **复算**：mean 降、median 不变 → D。
- **结论**：D，逐字已核。

### #9 · R03-129 · mcq · A · p09 右（书页 119 右栏）
- **原页定位**：p09.jpg 右半页右栏，频率表 Value 30/34/38/42/46 × A/B。
- **逐字核对**："each consist of 27 values"；选项 A>B / A<B / equal / not enough info。
- **图表↔spec**：table（30:2/9, 34:4/7, 38:5/5, 42:7/4, 46:9/2）。
- **复算**：A 和=60+136+190+294+414=1094（≈40.52）；B 和=270+238+190+168+92=958（≈35.48）→ A>B。
- **结论**：A，逐字已核。

### #10 · R03-130 · grid · 0 · p10 左（书页 120 左栏）
- **原页定位**：p10.jpg 左半页左栏上表，Value/Frequency：1:a, 2:2a, 3:3a, 4:2a, 5:a。
- **逐字核对**："where a is a positive integer"；"How much greater is the mean…than the median?"。
- **图表↔spec**：table。
- **复算**：总数 9a，中位落在值 3；均值=(1+4+9+8+5)/9=3；差=0。
- **结论**：value=0，逐字已核。

### #11 · R03-131 · grid · 16 · p10 左（书页 120 左栏下部）
- **原页定位**：p10.jpg 左半页，表 16:10, 25:1, 34:10, 43:4。
- **逐字核对**："The table shows the frequency of values in a data set. What is the minimum value of the data set?"
- **图表↔spec**：table。
- **复算**：表中最小取值即最小值 16。
- **结论**：value=16，逐字已核。

### #12 · R03-132 · mcq · B · p10 左（书页 120 右栏）
- **原页定位**：p10.jpg 左半页右栏，频率表 Weight(pounds) 13–20 × Number of colonies（书内复用 colonies 表头，照录）。
- **逐字核对**："71 tortoises"、"weight of 39 pounds"、"72 tortoises"；四选项 mean greater/less × median greater/equal/less 组合逐字。
- **易错点**：39 远大于 13–20 → 均值升；71→72 中位数位置不变 → 相等。
- **图表↔spec**：table（13:12,14:8,15:5,16:7,17:9,18:10,19:13,20:7）。
- **复算**：mean 升、median 相等 → B。
- **结论**：B，逐字已核。

### #13 · R03-133 · grid · 2 · p10 右（书页 121 左栏）
- **原页定位**：p10.jpg 右半页左栏，表 queen ants 1:12, 2:11, 3:1, 4:7, 5:6。
- **逐字核对**："Scientists collected acorns…colony's structure…median number of queen ants per colony?"
- **图表↔spec**：table。
- **复算**：共 37，累计 12→23→24→31→37，第 19 位=2。
- **结论**：value=2，逐字已核。

### #14 · R03-134 · mcq · A · p10 右（书页 121 右栏）
- **原页定位**：p10.jpg 右半页右栏，四张频率表选项 A–D（70/80/90/100）。
- **逐字核对**："Each of the following frequency tables represents a data set. Which data set has the greatest mean?"；选项表频数：A 4/5/6/7，B 6/6/6/6，C 7/6/6/7，D 8/5/5/8（文字化入 choices）。
- **图表↔spec**：无独立 figSpec（选项本身是表，已文字化）。
- **复算**：A=1920/22≈87.27；B=2040/24=85；C=2210/26=85；D=2210/26=85 → 最大 A。
- **结论**：A，逐字已核。

### #15 · R03-135 · mcq · B · p11 左（书页 122 左栏）
- **原页定位**：p11.jpg 左半页左栏，表 State A–G 百分比。
- **逐字核对**："all 50 states"、"median…for all 50 states was 26.95%"；选项 0.05%/0.95%/1.22%/7.45%。
- **图表↔spec**：table（21.9/27.9/25.9/19.5/30.1/36.4/35.5）。
- **复算**：排序 19.5,21.9,25.9,27.9,30.1,35.5,36.4，中位 27.9；差=27.9−26.95=0.95%。
- **结论**：B，逐字已核。

### #16 · R03-136 · grid · 1 · p11 左（书页 122 右栏上表）
- **原页定位**：p11.jpg 左半页右栏，Score 2–10 × Group A/B（Total 9/11）。
- **逐字核对**："integer score that ranges from 2 through 10"、"9 players in group A and the 11 players in group B"；"median…how much greater"。
- **图表↔spec**：table。
- **复算**：A 第 5 位=5；B 第 6 位=6；差=1。
- **结论**：value=1，逐字已核。

### #17 · R03-137 · mcq · D · p11 左（书页 122 右栏下部）
- **原页定位**：p11.jpg 左半页右栏，表 X 九值 / Y 九值。
- **逐字核对**："standard deviation of data set X is q…of data set Y is s"；选项 q<s / cannot be determined / q>s / q=s。
- **图表↔spec**：table（X: 15,15,16,17,17,18,18,19,19；Y: 1,1,2,3,3,4,4,5,5）。
- **复算**：X=Y+14 整体平移，标准差不变 q=s。
- **结论**：D，逐字已核。

### #18 · R03-138 · mcq · A · p11 右（书页 123 左栏）
- **原页定位**：p11.jpg 右半页左栏，文字题 Team A 3.41 / Team B 3.79 minutes，I/II/III 三条。
- **逐字核对**："10 members each"、"MUST be true"（原文大写 MUST 照录）；I every member、II median、III at least one member；选项 III only / I and III / II and III / I, II, and III。
- **复算**：均值不蕴含逐项大小（I 假）、不决定中位数（II 假）；若 B 全员≤A 全员则 mean B≤mean A，与 3.79>3.41 矛盾 → III 必真 → A。
- **结论**：A，逐字已核。

### #19 · R03-139 · mcq · D · p11 右（书页 123 右栏上部）
- **原页定位**：p11.jpg 右半页右栏，纯文字。
- **逐字核对**："55 integers between 170 and 290"、"as well as the integer 10"；I mean / II median；选项 I only / II only / I and II / Neither。
- **易错点**：题目问"must be less for F than G"——加 10 后 mean 下降（F>G，I 假）；median F≥G（II 假）。
- **复算**：两者都不满足"F 小于 G" → D。
- **结论**：D，逐字已核。

### #20 · R03-140 · mcq · A · p11 右（书页 123 右栏下部）
- **原页定位**：p11.jpg 右半页右栏下部，纯文字 Data set A: 2,3,4,5,5 / B: 2,3,4,10。
- **逐字核对**：选项 A<B / A>B / equal / not enough information。
- **复算**：A=19/5=3.8；B=19/4=4.75 → A<B。
- **结论**：A，逐字已核。

### #21 · R03-141 · grid · 52 · p12 左（书页 124 左栏上部）
- **原页定位**：p12.jpg 左半页左栏上部，清单 43,45,44,43,38,39,40,46,40。
- **逐字核对**："10 positive integers less than 60"、"mean of these 9 integers is 42"、"mean…is an integer that is greater than 42"、"largest integer"。
- **复算**：9 数和=378；M=43 → x=430−378=52(<60)；M=44 → x=62 超界；最大=52。
- **结论**：value=52，逐字已核。

### #22 · R03-142 · mcq · B · p12 左（书页 124 左栏下部）
- **原页定位**：p12.jpg 左半页左栏下部，Data set A: 4,4,5,5,6,14,6,7,7,8。
- **逐字核对**："period of 11 days"（题干）与 10 个值并存，照录；"data value 14 is removed"；四选项 median greater/equal/less / not enough。
- **复算**：A 排序中位=(6+6)/2=6；去 14 后 B 第 5 位=6，相等 → B。
- **结论**：B，逐字已核。

### #23 · R03-143 · mcq · D · p12 左（书页 124 右栏上部）
- **原页定位**：p12.jpg 左半页右栏上部，纯文字。
- **逐字核对**："27 different numbers"、"mean of 33 and a median of 33"、"adding 7…greater than the median and subtracting 7…less than the median"；选项 Median / Mean / Sum of the numbers / Standard deviation。
- **复算**：13 个 +7、13 个 −7：总和、均值、中位数不变；两端远离中位数，标准差变大 → D。
- **结论**：D，逐字已核。

### #24 · R03-144 · mcq · C · p12 左（书页 124 右栏下部）
- **原页定位**：p12.jpg 左半页右栏下部，数据 8,12,12,24,24，µF。
- **逐字核对**："maximum capacity, in microfarads (µF)"、"increase…by 2 µF"；四选项 mean 16/18 × median 12/14 组合。
- **复算**：原均值=80/5=16、中位=12；各 +2 → 均值 18、中位 14 → C。
- **结论**：C，逐字已核。

### #25 · R03-145 · grid · 41 · p12 右（书页 125 左栏上部）
- **原页定位**：p12.jpg 右半页左栏上部，纯文字 75 个 mean25 / 50 个 mean65。
- **逐字核对**："heights of 75 objects…mean of 25 meters"、"50 objects…65 meters"、"125 objects…mean, in meters"。
- **复算**：(75×25+50×65)/125=5125/125=41。
- **结论**：value=41，逐字已核。

### #26 · R03-146 · grid · 44 · p12 右（书页 125 左栏下部）
- **原页定位**：p12.jpg 右半页左栏下部，75 buildings mean32 / 50 buildings mean62。
- **逐字核对**：与 #25 同模板，objects→buildings，数值 32/62；其余逐字。
- **复算**：(75×32+50×62)/125=5500/125=44。
- **结论**：value=44，逐字已核。

### #27 · R03-147 · mcq · C · p12 右（书页 125 右栏上部）
- **原页定位**：p12.jpg 右半页右栏上部，纯文字 8 人 mean14.5，去最高后 7 人 mean12。
- **逐字核对**："highest individual score is removed"；选项 20/24/32/36。
- **复算**：8×14.5=116；7×12=84；最高=32 → C。
- **结论**：C，逐字已核。

### #28 · R03-148 · grid · 15.25 · p12 右（书页 125 右栏下部）
- **原页定位**：p12.jpg 右半页右栏下部，纯文字 20 人 mean6.7 → 19 人 mean6.25。
- **逐字核对**："construction company"、"reduced to 6.25 years"、"How many years did the employee who left…work"。
- **复算**：20×6.7=134；19×6.25=118.75；离职者=15.25 年。
- **结论**：value=15.25，逐字已核。

### #29 · R03-149 · mcq · C · p13 左（书页 126 左栏上部）
- **原页定位**：p13.jpg 左半页左栏上部，数列 a,27,28,b,32,45,c（升序）。
- **逐字核对**："listed in ascending order, where a, b, and c are constants"、"mean is 35, the median is 28, and the range is 71"；选项 53/71/78/98。
- **复算**：中位(第4位)=b=28；和=245 → a+b+c=113；c−a=71 → c=78, a=7 → C。
- **结论**：C，逐字已核。

### #30 · R03-150 · grid · 2.6 · p13 左（书页 126 左栏下部）
- **原页定位**：p13.jpg 左半页左栏下部，表 Andrew 六值 / Maria 六值（含 x）。
- **逐字核对**："Andrew and Maria each collected six rocks"、"mean…Maria…0.1 kilogram greater than…Andrew"、"value of x"。
- **图表↔spec**：table。
- **复算**：Andrew 和=16.8（均值 2.8）；Maria 均值 2.9 和 17.4；已知和 14.8 → x=2.6。
- **结论**：value=2.6，逐字已核。

### #31 · R03-151 · mcq · A · p13 左（书页 126 右栏）
- **原页定位**：p13.jpg 左半页右栏，纯文字 84 株 2.8–6.3 kg，另加 11.6 kg。
- **逐字核对**："lightest…2.8 kilograms (kg)"、"heaviest…6.3 kg"、"additional plant…11.6 kg"；四选项 mean/median/range/SD 比较逐字。
- **复算**：加 11.6(>6.3)：均值升（A 真）；中位未必变（B 假）；range 3.5→8.8（C 假）；SD 增大（D 假）→ A。
- **结论**：A，逐字已核。

---

## 自检记录（dry-run）

| 切片文件 | 题数 | id 范围 | dry-run 结果 |
|---|---|---|---|
| `fragments/T19.json` | 10 | R03-121…R03-130 | 通过，将新增 10 题，无 FAIL/非法字段 |
| `fragments/T19-b2.json` | 10 | R03-131…R03-140 | 通过，将新增 10 题，无 FAIL/非法字段 |
| `fragments/T19-b3.json` | 11 | R03-141…R03-151 | 通过，将新增 11 题，无 FAIL/非法字段 |

本地整包（31 题）dry-run：将新增 R03-121…R03-151 共 31 题，无 FAIL；`2.7.T19` 未声明 advisory 预期忽略。

## 自查修掉的差异

1. #2 原书页轴印作 "Mass (kilograms)"（题干实为 books）——照录并在 ledger 标注，未擅改。
2. #12 原书表头复用 "Number of colonies"（题干为 tortoises 体重）——照录并标注。
3. #4 直方图柱高为图上估读（合计校准 50），不影响 II-only 结论，ledger 已注明。
4. #1/#2 箱线图五数为图上估读，脚本不校验内部几何；答案只依赖中位数/极差相对关系。
5. 题包初版无 `range` 顶层字段，已补 `"range":"#1-#31"`。
6. 推送阶段发现 VM 无 git 凭证且单次调用体量受限，31 题完整包拆为三切片（10/10/11），与本地权威题包逐字段比对 0 差异，布局见 `T19-layout.md`。
