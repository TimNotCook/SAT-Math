# 03 Problem Solving and Data Analysis.pdf 扫描件逐页清单与题库差量台账

> 用途：为专项训练新建「Unit 2 · 03 Problem Solving 专项练习（重录）」板块（父组 `2.7`，子节 `2.7.T17`…`2.7.T23`，照 `docs/transcribe-spec.md` §6 模型 A）提供逐题归属、旧题库差量与分批依据。
> 本文件只做读图与对账，**未改动 `data/questions.js` / `data/text.js` / `data/figures.js`，未录任何题**。
> **逐字对账素材**：20 页渲染图存于 `docs/transcribe/03/pages/p01.jpg … p20.jpg`（300dpi 灰度 JPEG，3034×2051，原生扫描分辨率），录题代理以仓库页面图代替原件逐字核对。

## 0. 元信息

| 项 | 值 |
|---|---|
| 来源文件 | `/Users/tim.jizhou.huang/Desktop/03 Problem Solving and Data Analysis.pdf`（20 页，无文本层，印刷书影印） |
| 基线 HEAD | `c184252`（`node --test test/*.test.js` = 131 pass / 0 fail） |
| 识读方式 | 300dpi 渲染图人眼逐页识读；无 OCR；全部 20 页已在仓库页面图上复核 |
| 现有题库口径 | `data/questions.js` `unit=2` 共 **204 题**：legacy 15（`U2-*`，讲义/练习册旧录）、textbook 130（`TD-21/22/23/24/25-*`，TD 教材 2.1–2.5）、pdf-origin 59（`SP2-001…SP2-060`，`paper="03 Problem Solving and Data Analysis 专项练习"`，分挂 `2.6.T17`/`2.6.T18`） |
| 本册合计 | **129 题**：T17=23、T18=37、T19=31、T20=12、T21=11、T22=9、T23=6；mcq 70 / grid 59 |
| 编号建议 | 新录题前缀 `R03-`（照 `transcribe-spec.md` §2.4），section 填 `2.7.T17`…`2.7.T23`，source `03 Problem Solving · Topic N #k`，topic `专项练习 · Topic N · 第 k 题`，paper 含「专项」；新题禁用 `image` 位图，图形走 `TD_FIG_SPECS` 矢量 spec |

### 页面版式事实

- p01 = portrait 封面「03 Problem-Solving and Data Analysis」，带透印，无题。
- p02–p20 = rot=270 横版双页跨页，每页含两个书页；页脚印书页号（104 起）。
- 书页印刷页码对照：p02=104–105、p03=106–107、p04=108–109、p05=110–111、p06=112–113、p07=114–115、p08=116–117、p09=118–119、p10=120–121、p11=122–123、p12=124–125、p13=126–127、p14=128–129、p15=130–131、p16=132–133、p17=134–135、p18=136–137、p19=138–139、p20=140（左半）。
- p20 右半为「04 Geometry and Trigonometry」分册扉页，非本册，不录。
- 无缺页、无残页；p05 右栏 #10 与 #9 逐字重复（书内原题重复，见 §7 #1）。

---

## 1. 页级清单表

| PDF 页 | 版式 | 书页 | Topic | 题号区间 | 题数 | 题型 | 图表标记 | 对应图片路径 | 残缺/备注 |
|---|---|---|---|---|---|---|---|---|---|
| p01 | portrait 封面 | — | — | — | 0 | — | 无 | `docs/transcribe/03/pages/p01.jpg` | 透印；无题 |
| p02 | 横版双页 | 104–105 | T17 | #1–#7 | 7 | mcq 3 / grid 4 | #1 表（Species tree/Growthfactor）、#2 表（State×Power capacity） | `docs/transcribe/03/pages/p02.jpg` | 已复核 |
| p03 | 横版双页 | 106–107 | T17 | #8–#17 | 10 | mcq 4 / grid 6 | 无图 | `docs/transcribe/03/pages/p03.jpg` | 已复核 |
| p04 左 | 横版左栏 | 108 | T17 | #18–#23 | 6 | mcq 3 / grid 3 | 无图 | `docs/transcribe/03/pages/p04.jpg` | 已复核；右栏起 T18 |
| p04 右 | 横版右栏 | 109 | T18 | #1–#2 | 2 | mcq 2 | #2 表（Climate Preferences） | `docs/transcribe/03/pages/p04.jpg` | 已复核 |
| p05 左 | 横版左栏 | 110 | T18 | #3–#9 | 7 | mcq 1 / grid 6 | #3 表（Subscriptions sold）、#4 折线图（Washington DC 年降雪） | `docs/transcribe/03/pages/p05.jpg` | 已复核；#10 裁图存证 |
| p05 右 | 横版右栏 | 111 | T18 | #10–#16 | 7 | mcq 2 / grid 5 | 无图 | `docs/transcribe/03/pages/p05.jpg` | #10 与 #9 逐字重复（§7 #1） |
| p06 左 | 横版左栏 | 112 | T18 | #17–#22 | 6 | mcq 1 / grid 5 | 无图 | `docs/transcribe/03/pages/p06.jpg` | 已复核 |
| p06 右 | 横版右栏 | 113 | T18 | #23–#28 | 6 | mcq 2 / grid 4 | 无图 | `docs/transcribe/03/pages/p06.jpg` | 已复核 |
| p07 左 | 横版左栏 | 114 | T18 | #29–#34 | 6 | mcq 1 / grid 5 | #33 表（Group A/B/C/D objects） | `docs/transcribe/03/pages/p07.jpg` | 已复核 |
| p07 右 | 横版右栏 | 115 | T18 | #35–#37 | 3 | mcq 1 / grid 2 | 无图 | `docs/transcribe/03/pages/p07.jpg` | T18 收束于 #37 |
| p08 左 | 横版左栏 | 116 | T19 | #1–#3 | 3 | mcq 3 | #1 双箱线图（gazelles）、#2 双箱线图（books read）、#3 双直方图（Data Set A/B） | `docs/transcribe/03/pages/p08.jpg` | 已复核 |
| p08 右 | 横版右栏 | 117 | T19 | #4–#5 | 2 | mcq 2 | #4 直方图（basketball points）、#5 点图（Data Set A 22–26） | `docs/transcribe/03/pages/p08.jpg` | 已复核 |
| p09 左 | 横版左栏 | 118 | T19 | #6–#7 | 2 | mcq 2 | #6 点图（bursts）、#7 双点图（Value 10–16 A/B） | `docs/transcribe/03/pages/p09.jpg` | 已复核 |
| p09 右 | 横版右栏 | 119 | T19 | #8–#9 | 2 | mcq 2 | #8 点图（orbital period 720–732）、#9 频率表（Value 30–46 A/B） | `docs/transcribe/03/pages/p09.jpg` | 已复核 |
| p10 左 | 横版左栏 | 120 | T19 | #10–#12 | 3 | mcq 1 / grid 2 | #10 频率表（Value 1–5）、#11 频率表（Value 16/25/34/43）、#12 频率表（Weight 13–20/colonies） | `docs/transcribe/03/pages/p10.jpg` | 已复核 |
| p10 右 | 横版右栏 | 121 | T19 | #13–#14 | 2 | mcq 1 / grid 1 | #13 频率表（queen ants 1–5）、#14 四张频率表（A/B/C/D 70/80/90/100） | `docs/transcribe/03/pages/p10.jpg` | 已复核 |
| p11 左 | 横版左栏 | 122 | T19 | #15–#17 | 3 | mcq 2 / grid 1 | #15 表（State A–G bachelor %）、#16 频率表（Score 2–10 A/B）、#17 表（Data set X/Y） | `docs/transcribe/03/pages/p11.jpg` | 已复核 |
| p11 右 | 横版右栏 | 123 | T19 | #18–#20 | 3 | mcq 3 | 无图 | `docs/transcribe/03/pages/p11.jpg` | 已复核 |
| p12 左 | 横版左栏 | 124 | T19 | #21–#24 | 4 | mcq 3 / grid 1 | 无图 | `docs/transcribe/03/pages/p12.jpg` | 已复核 |
| p12 右 | 横版右栏 | 125 | T19 | #25–#28 | 4 | mcq 1 / grid 3 | 无图 | `docs/transcribe/03/pages/p12.jpg` | 已复核 |
| p13 左 | 横版左栏 | 126 | T19 | #29–#31 | 3 | mcq 2 / grid 1 | #30 表（Andrew/Maria masses） | `docs/transcribe/03/pages/p13.jpg` | 已复核；右栏起 T20 |
| p13 右 | 横版右栏 | 127 | T20 | #1–#2 | 2 | mcq 2 | #1 散点图（Minimum Wage）、#2 散点图（Ice Cream Sales） | `docs/transcribe/03/pages/p13.jpg` | 已复核 |
| p14 左 | 横版左栏 | 128 | T20 | #3–#4 | 2 | grid 2 | #3 散点图（bird flight）、#4 散点图（Beach Visitors vs Temperature） | `docs/transcribe/03/pages/p14.jpg` | 已复核 |
| p14 右 | 横版右栏 | 129 | T20 | #5–#6 | 2 | mcq 2 | #5 指数衰减曲线（y=a(b)^x）、#6 散点图（Electric Energy Nuclear Sources，二次） | `docs/transcribe/03/pages/p14.jpg` | 已复核 |
| p15 左 | 横版左栏 | 130 | T20 | #7–#8 | 2 | mcq 2 | #7 散点图（Size/Sale Price Town H）、#8 表（Account A/B） | `docs/transcribe/03/pages/p15.jpg` | 已复核 |
| p15 右 | 横版右栏 | 131 | T20 | #9–#11 | 3 | mcq 3 | #10 散点图（dataset A，B=A−9）、#11 散点图（Protein/Fat 8 sandwiches） | `docs/transcribe/03/pages/p15.jpg` | 已复核；#9 纯文字 |
| p16 左 | 横版左栏 | 132 | T20 | #12 | 1 | mcq 1 | #12 散点图（dataset E，F=E×3.9） | `docs/transcribe/03/pages/p16.jpg` | 已复核；右栏起 T21 |
| p16 右 | 横版右栏 | 133 | T21 | #1–#4 | 4 | grid 4 | #1 表（Blood type×Rhesus）、#3 表（Phone/Email × activities） | `docs/transcribe/03/pages/p16.jpg` | 已复核；#2/#4 纯文字 |
| p17 左 | 横版左栏 | 134 | T21 | #5–#7 | 3 | mcq 1 / grid 2 | #5 表（age×Group 90人）、#6 表（Subject×Grade 80人）、#7 表（bill/repairs 891） | `docs/transcribe/03/pages/p17.jpg` | 已复核 |
| p17 右 | 横版右栏 | 135 | T21 | #8–#11 | 4 | mcq 2 / grid 2 | #8 表（Contestants by Score and Day）、#10 表（T-shirts Lions/Stars）、#11 表（2013 State-Level Taxes） | `docs/transcribe/03/pages/p17.jpg` | 已复核；#9 纯文字 |
| p18 左 | 横版左栏 | 136 | T22 | #1–#3 | 3 | mcq 2 / grid 1 | #1 表（Nuclear Energy Use）、#3 表（Poll Results） | `docs/transcribe/03/pages/p18.jpg` | 已复核；#2 纯文字 |
| p18 右 | 横版右栏 | 137 | T22 | #4–#6 | 3 | mcq 3 | #4 表（Sample A/B favor/MOE）、#6 表（Texting behavior） | `docs/transcribe/03/pages/p18.jpg` | 已复核；#5 纯文字 |
| p19 左 | 横版左栏 | 138 | T22 | #7–#9 | 3 | mcq 3 | 无图 | `docs/transcribe/03/pages/p19.jpg` | 已复核；右栏起 T23 |
| p19 右 | 横版右栏 | 139 | T23 | #1–#3 | 3 | mcq 3 | #1 表（Hours practiced×points） | `docs/transcribe/03/pages/p19.jpg` | 已复核；#2/#3 纯文字 |
| p20 左 | 横版左栏 | 140 | T23 | #4–#6 | 3 | mcq 3 | 无图 | `docs/transcribe/03/pages/p20.jpg` | 已复核；右半为 04 分册扉页 |

> 跨页题干：本册无跨页题干（每题在单栏内排完）。

---

## 2. Topic 总表

| Topic | 册内原文标题（逐字） | PDF 页 | 书页 | 题号范围 | 题数 | mcq | grid | 图形负担 |
|---|---|---|---|---|---|---|---|---|
| Topic 17 | Ratios, Proportions, and Unit Conversion | p02–p04 左 | 104–108 | #1–#23 | 23 | 11 | 12 | 表 2（#1/#2）；其余纯文字 |
| Topic 18 | Percentages | p04 右–p07 | 109–115 | #1–#37 | 37 | 11 | 26 | 表 3（#2/#3/#33）、折线图 1（#4）；其余纯文字 |
| Topic 19 | Distributions and Measurements of Center and Spread | p08–p13 左 | 116–126 | #1–#31 | 31 | 21 | 10 | 箱线图 2、直方图 2、点图 4、频率表/数据表 10（#9–#17/#30） |
| Topic 20 | Models and Scatterplots | p13 右–p16 左 | 127–132 | #1–#12 | 12 | 10 | 2 | 散点图 9（#1/#2/#3/#4/#6/#7/#10/#11/#12）、指数曲线 1（#5）、表 1（#8） |
| Topic 21 | Probability and Conditional Probability | p16 右–p17 | 133–135 | #1–#11 | 11 | 3 | 8 | 表 8（#1/#3/#5/#6/#7/#8/#10/#11）；#2/#4/#9 纯文字 |
| Topic 22 | Inference from Sample Statistics and Margin Of Error | p18–p19 左 | 136–138 | #1–#9 | 9 | 8 | 1 | 表 4（#1/#3/#4/#6）；其余纯文字 |
| Topic 23 | Evaluating Statistical Claims | p19 右–p20 左 | 139–140 | #1–#6 | 6 | 6 | 0 | 表 1（#1）；其余纯文字 |
| **合计** | | p02–p20 | 104–140 | | **129** | **70** | **59** | 表 29、散点图 9、点图 4、箱线图 2、直方图 2、指数曲线 1、折线图 1 |

---

## 3. 逐题归属表（题号 → Topic → 题型 → 图表标记）

判定口径见 §4；本节只登记归属与题型/图形。

### Topic 17 · Ratios, Proportions, and Unit Conversion（#1–#23，pp104–108）

| # | 书页 | 题型 | 图表标记 |
|---|---|---|---|
| 1 | 104 | mcq | 表（Species tree/Growthfactor 八树种） |
| 2 | 105 | mcq | 表（State × Power capacity Low/Medium/High/Total） |
| 3 | 104 | grid | 无图（oak 807 kg/m³，cube 0.90m edge） |
| 4 | 104 | grid | 无图（wood 353 kg/m³，345 kg 求边长） |
| 5 | 104 | grid | 无图（26 棵树，cube 2.00cm，3.68g 求密度） |
| 6 | 105 | grid | 无图（pumice 29 处，3.00cm，0.230 g/cm³ 求质量） |
| 7 | 105 | mcq | 无图（R 半速 S，4x in y sec → S 24x 时间） |
| 8 | 106 | mcq | 无图（square map 45in/13mi，70% longer） |
| 9 | 106 | mcq | 无图（88 oz in 5y min，9y min） |
| 10 | 106 | grid | 无图（electric flux，大正方形边长 3×） |
| 11 | 106 | grid | 无图（Jeremy x$ 年翻倍，2005 年 480$） |
| 12 | 106 | grid | 无图（wire 32in，x=4+3y） |
| 13 | 107 | mcq | 无图（gentoo penguin 160m @6m/s） |
| 14 | 107 | mcq | 无图（sealant $43/gal 350ft²，double cover） |
| 15 | 107 | grid | 无图（4a/b=6.7，a/bn=26.8 求 n） |
| 16 | 107 | grid | 无图（x/y=84，cx/6y=84 求 c） |
| 17 | 107 | mcq | 无图（4.36 sq mi → sq yd） |
| 18 | 108 | mcq | 无图（11,863,808 sq yd → sq mi） |
| 19 | 108 | grid | 无图（56.00 sq nautical miles → km²） |
| 20 | 108 | grid | 无图（0.84 m³ → quarts） |
| 21 | 108 | mcq | 无图（250 ft²/hr → m²/min） |
| 22 | 108 | grid | 无图（2.2 m/s² → mi/min²） |
| 23 | 108 | mcq | 无图（blue:yellow=2:3，second batch 5 blue） |

### Topic 18 · Percentages（#1–#37，pp109–115）

| # | 书页 | 题型 | 图表标记 |
|---|---|---|---|
| 1 | 109 | mcq | 无图（Crunchy Grain cereal，¾ cup/210 cal/180mg K=5%） |
| 2 | 109 | mcq | 表（Climate Preferences：Warm/Cool/NO preference × 四年龄段） |
| 3 | 110 | mcq | 表（Subscriptions sold：2012=5,600 / 2013=5,880） |
| 4 | 110 | grid | 折线图（Annual snowfall Washington DC，2003=40 → 2007=10） |
| 5 | 110 | grid | 无图（210 is p% greater than 30） |
| 6 | 110 | mcq | 无图（0.35x = x 降百分之几） |
| 7 | 110 | grid | 无图（x 增 400% = 60） |
| 8 | 110 | grid | 无图（x 增 1,800% = 684） |
| 9 | 110 | grid | 无图（a 比 b 少 70%，c 比 a 多 80%，c 是 b 几倍） |
| 10 | 111 | grid | 无图（**与 #9 逐字重复**，§7 #1） |
| 11 | 111 | grid | 无图（a 比 b 少 70%，c 比 a 多 60%） |
| 12 | 111 | grid | 无图（a 比 b 多 60%，c 比 a 少 45%） |
| 13 | 111 | grid | 无图（a 比 b 多 110%，b 比 47 少 90%） |
| 14 | 111 | grid | 无图（w 比 z 多 110%，z 比 50 少 55%） |
| 15 | 111 | mcq | 无图（a=240%b，a=90%c，c=p%b） |
| 16 | 111 | mcq | 无图（a=2,241%×(b+c)，b=83%c，a 是 b 百分之几） |
| 17 | 112 | mcq | 无图（Chloe 2015→2016 +12%→2017 +4%） |
| 18 | 112 | grid | 无图（committee 15% parents/45% teachers/25% admins，6 students） |
| 19 | 112 | grid | 无图（souvenirs $7.00 wholesale，290% retail，80% off） |
| 20 | 112 | grid | 无图（books $5.00，270% price，70% off） |
| 21 | 112 | grid | 无图（shirts $4.00，270% retail，65% off） |
| 22 | 112 | grid | 无图（shirt $11.70，sale 80% less，cost 30% greater） |
| 23 | 113 | grid | 无图（three webinars 1,875/52%/36%） |
| 24 | 113 | grid | 无图（0.001% phosphorus，140g 样品） |
| 25 | 113 | mcq | 无图（37% green，37% green 中 42% metal，非 metal 占比） |
| 26 | 113 | mcq | 无图（comic +167% 2011→12，−16% 12→13） |
| 27 | 113 | grid | 无图（August 15 more than 3× September，共 363） |
| 28 | 113 | grid | 无图（zebras 2018=1.27×2014，2014=p% of 2018） |
| 29 | 114 | grid | 无图（dolphins 2018=2.82×2014，p% increase） |
| 30 | 114 | grid | 无图（30% removed，210 remain，求 removed） |
| 31 | 114 | grid | 无图（dragonflies Feb15=99，+12.50% Jan1→Feb15） |
| 32 | 114 | grid | 无图（78% nonfiction，fiction 中 60% western，990 fantasy） |
| 33 | 114 | grid | 表（Group A225/B66/C414/D99/Total804，C 是 A 的 p%） |
| 34 | 114 | mcq | 无图（particles A=6,000%C，C=0.008%B，a+b in terms of c） |
| 35 | 115 | grid | 无图（undergrad 6,650% postdoc，graduate 24% undergrad，3,192 graduate） |
| 36 | 115 | grid | 无图（kx = x 降 0.34%，求 k） |
| 37 | 115 | mcq | 无图（170 lb Earth，186.32 Neptune，Jupiter=252.8% Earth） |

### Topic 19 · Distributions and Measurements of Center and Spread（#1–#31，pp116–126）

| # | 书页 | 题型 | 图表标记 |
|---|---|---|---|
| 1 | 116 | mcq | 双箱线图（gazelles Mass kg 20–32，mean/median 比较） |
| 2 | 116 | grid | 双箱线图（books read over summer，range 差） |
| 3 | 116 | mcq | 双直方图（Data Set A/B，23 integers each，mean 最小差） |
| 4 | 117 | mcq | 直方图（basketball points 0–70，加 18 分→51 值，I/II 判断） |
| 5 | 117 | mcq | 点图（Data Set A 22–26，B=A+56，median/range 比较） |
| 6 | 118 | mcq | 点图（bursts 1–5，13→14 eruptions，median/mean 比较） |
| 7 | 118 | mcq | 双点图（Value 10–16，median/std dev 比较） |
| 8 | 119 | mcq | 点图（orbital period 720–732，+553 天，mean/median 比较） |
| 9 | 119 | mcq | 频率表（Value 30/34/38/42/46，A/B 各 27 值，mean 比较） |
| 10 | 120 | grid | 频率表（Value 1:a, 2:2a, 3:3a, 4:2a, 5:a，mean−median） |
| 11 | 120 | grid | 频率表（Value 16:10, 25:1, 34:10, 43:4，minimum） |
| 12 | 120 | mcq | 频率表（Weight 13–20 / colonies，71→72 tortoises，mean/median） |
| 13 | 121 | grid | 频率表（queen ants 1:12, 2:11, 3:1, 4:7, 5:6，median） |
| 14 | 121 | mcq | 四张频率表（A/B/C/D，70/80/90/100，greatest mean） |
| 15 | 122 | mcq | 表（State A–G bachelor %，7 州 vs 全 50 州 median 26.95%） |
| 16 | 122 | grid | 频率表（Score 2–10，Group A 9 人 / Group B 11 人，B median−A median） |
| 17 | 122 | mcq | 表（Data set X 九值 / Y 九值，std dev q vs s） |
| 18 | 123 | mcq | 无图（两队各 10 人，mean 3.41/3.79，I/II/III 判断） |
| 19 | 123 | mcq | 无图（F=55 整数 170–290，G=F+10，mean/median 判断） |
| 20 | 123 | mcq | 无图（A:2,3,4,5,5；B:2,3,4,10，mean 比较） |
| 21 | 124 | grid | 无图（A=10 正整数<60，列出 9 个均值 42，mean(A) 整数>42，求最大） |
| 22 | 124 | mcq | 无图（A:4,4,5,5,6,14,6,7,7,8，去 14→B，median 比较） |
| 23 | 124 | mcq | 无图（27 数 mean=median=33，>33 +7 / <33 −7，何者不变） |
| 24 | 124 | mcq | 无图（电容 8,12,12,24,24 各 +2µF，mean/median） |
| 25 | 125 | grid | 无图（A 75 对象 mean25m，B 50 对象 mean65m，C 125 对象 mean） |
| 26 | 125 | grid | 无图（A 75 楼 mean32m，B 50 楼 mean62m，C 125 楼 mean） |
| 27 | 125 | mcq | 无图（8 人均 14.5，去最高剩 7 人均 12，最高分） |
| 28 | 125 | grid | 无图（20 人均 6.7 年，走 1 人剩 19 人均 6.25 年，离职者工龄） |
| 29 | 126 | mcq | 无图（a,27,28,b,32,45,c 升序，mean35/median28/range71 求 c） |
| 30 | 126 | grid | 表（Andrew/Maria 各 6 块岩石质量，Maria mean−Andrew mean=0.1 求 x） |
| 31 | 126 | mcq | 无图（Ari 84 株 2.8/6.3kg，Chihiro 同批+11.6kg，何者必真） |

### Topic 20 · Models and Scatterplots（#1–#12，pp127–132）

| # | 书页 | 题型 | 图表标记 |
|---|---|---|---|
| 1 | 127 | mcq | 散点图（Minimum Wage，y=0.096x−0.488，斜率解读） |
| 2 | 127 | mcq | 散点图（Ice Cream Sales，t℃/d$，拟合方程） |
| 3 | 128 | grid | 散点图（bird flight length vs Days after Jan 11，Jan13→15 平均变化率） |
| 4 | 128 | grid | 散点图（Beach Visitors vs Temperature，Lagos 11 天，slope 57，+5℃） |
| 5 | 129 | mcq | 指数衰减曲线（y=a(b)^x，a,b>0，b 最接近值） |
| 6 | 129 | mcq | 散点图（Electric Energy Generated by Nuclear Sources，二次模型四选） |
| 7 | 130 | mcq | 散点图（Size and Sale Price of Houses in Town H，25 栋，拟合方程） |
| 8 | 130 | mcq | 表（Account A $500 6% 年复利 / Account B $1,000 $25/年，年收益比较） |
| 9 | 131 | mcq | 无图（f(x)=201% of x，增减/线性指数判断） |
| 10 | 131 | mcq | 散点图（dataset A，B=A 各点 y−9，B 拟合线 y 截距） |
| 11 | 131 | mcq | 散点图（Total Protein and Total Fat for Eight Sandwiches，每 1g 蛋白脂肪增量） |
| 12 | 132 | mcq | 散点图（dataset E，F=E 各点 y×3.9，F 拟合线方程） |

### Topic 21 · Probability and Conditional Probability（#1–#11，pp133–135）

| # | 书页 | 题型 | 图表标记 |
|---|---|---|---|
| 1 | 133 | grid | 表（Blood type A/B/AB/O × Rhesus +/−，P(B|Rh−)=1/9 求 x） |
| 2 | 133 | grid | 无图（225 访客 A/B/C，P(A)=0.44，P(B)=0.32，求 C 人数） |
| 3 | 133 | grid | 表（Phone/Email × Dinner dance/Football/Picnic/Pool party，Email=2×Phone，P(Email|picnic)） |
| 4 | 133 | grid | 无图（MTN：83M→97M，P(MTN|Sep30)=0.43，p 百万） |
| 5 | 134 | grid | 表（age 0–9/10–19/20+ × Group A/B/C，90 人，P(A|≥10)） |
| 6 | 134 | grid | 表（Subject × Sixth/Seventh/Eighth，80 人，P(Math)） |
| 7 | 134 | mcq | 表（Asked bill / repairs，671/220/891，P(repairs|asked bill)） |
| 8 | 135 | grid | 表（Number of Contestants by Score and Day，D1/D2/D3，60 人，P(5分|D2或D3)） |
| 9 | 135 | grid | 无图（6 排桦树 8 高+6 短，5 排枫树 9 高+7 短，P(maple|≥20ft)） |
| 10 | 135 | mcq | 表（T-shirts Lions/Stars × Small/Medium/Large，116 件，P(Medium|Lions)） |
| 11 | 135 | mcq | 表（2013 State-Level Taxes：income tax × sales tax，39/4/6/1） |

### Topic 22 · Inference from Sample Statistics and Margin Of Error（#1–#9，pp136–138）

| # | 书页 | 题型 | 图表标记 |
|---|---|---|---|
| 1 | 136 | grid | 表（Views on Nuclear Energy Use 56/214/104/37，411 人，总体 300M） |
| 2 | 136 | mcq | 无图（Mr Camp 26 人 34.6%≥2 兄弟姐妹，州均班 26 人，1,800 班） |
| 3 | 136 | mcq | 表（Poll Results：Cruz 483 / Smith 320，803 人，6,424 票） |
| 4 | 137 | mcq | 表（Sample A 52%/MOE4.2%，Sample B 48%/MOE1.6%，MOE 差异原因） |
| 5 | 137 | mcq | 无图（p̂=0.2，MOE=0.05，可信区间判断） |
| 6 | 137 | mcq | 表（Texting behavior Light/Medium/Heavy，799 人，heavy 30%±3%） |
| 7 | 138 | mcq | 无图（gym 135 人 83%±6.34%，换 270 人样本 MOE 变化） |
| 8 | 138 | mcq | 无图（Poecilia reticulata 16.64mm，区间 15.87–17.41，求 MOE） |
| 9 | 138 | mcq | 无图（烤箱样本 14.2±1 vs 14.4±2.3，MOE 差异原因） |

### Topic 23 · Evaluating Statistical Claims（#1–#6，pp139–140）

| # | 书页 | 题型 | 图表标记 |
|---|---|---|---|
| 1 | 139 | mcq | 表（Hours practiced 3–5h/>5h × 6–13/14+ points，40 队，最大可推广总体） |
| 2 | 139 | mcq | 无图（baobab 50 棵 17 岁两组浇水，最大适用组） |
| 3 | 139 | mcq | 无图（40 四年级生抽样 32 人认为公告有用，最大总体） |
| 4 | 140 | mcq | 无图（psychologist 35 学生随机样本，最大可推广总体） |
| 5 | 140 | mcq | 无图（cable news website poll 28% Yes/70% No，为何不代表全美） |
| 6 | 140 | mcq | 无图（Tabitha 20 户 playground，mean 2.4，必真陈述） |

---

## 4. 旧录对应表（册题号 ↔ 现有 `data/questions.js` unit=2 条目）

判定口径：**有对应**=旧题库同数字同题（题干逐字一致）；**对应但内容不一致**=同模板不同数字/条件（同族变式）；**无对应**=旧库无同型题。旧条答案/value 照录，重录时答案须独立复算（`transcribe-spec.md` §0 #4）。

### 4.1 有对应（同题，61 条）

| 册题 | 旧 id | section | 旧 source | 旧题型 | 旧答案/value | 备注 |
|---|---|---|---|---|---|---|
| T17-1 | SP2-001 | 2.6.T17 | 03 Problem Solving · Topic 17 #1 | mcq | C | 表已有矢量 spec |
| T17-2 | SP2-002 | 2.6.T17 | 03 Problem Solving · Topic 17 #2 | mcq | D | 表已有矢量 spec |
| T17-3 | SP2-003 | 2.6.T17 | 03 Problem Solving · Topic 17 #3 | grid | 588 | |
| T17-4 | SP2-004 | 2.6.T17 | 03 Problem Solving · Topic 17 #4 | grid | 0.99 | |
| T17-5 | SP2-005 | 2.6.T17 | 03 Problem Solving · Topic 17 #5 | grid | 0.46 | 另 ↔ TD-21-16 同族（§4.2） |
| T17-6 | SP2-006 | 2.6.T17 | 03 Problem Solving · Topic 17 #6 | grid | 6.21 | |
| T17-7 | SP2-007 | 2.6.T17 | 03 Problem Solving · Topic 17 #7 | mcq | B | |
| T17-8 | SP2-008 | 2.6.T17 | 03 Problem Solving · Topic 17 #8 | mcq | B | 另 ↔ TD-21-43 同族（§4.2） |
| T17-9 | SP2-009 | 2.6.T17 | 03 Problem Solving · Topic 17 #9 | mcq | D | |
| T17-10 | SP2-010 | 2.6.T17 | 03 Problem Solving · Topic 17 #10 | grid | 4176 | |
| T17-11 | SP2-011 | 2.6.T17 | 03 Problem Solving · Topic 17 #11 | grid | 30 | |
| T17-12 | SP2-012 | 2.6.T17 | 03 Problem Solving · Topic 17 #12 | grid | 25 | |
| T17-13 | SP2-013 | 2.6.T17 | 03 Problem Solving · Topic 17 #13 | mcq | D | |
| T17-14 | SP2-014 | 2.6.T17 | 03 Problem Solving · Topic 17 #14 | mcq | C | |
| T17-15 | SP2-015 | 2.6.T17 | 03 Problem Solving · Topic 17 #15 | grid | 1/16 | |
| T17-16 | SP2-016 | 2.6.T17 | 03 Problem Solving · Topic 17 #16 | grid | 6 | |
| T17-17 | SP2-017 | 2.6.T17 | 03 Problem Solving · Topic 17 #17 | mcq | D | 另 ↔ TD-21-19 同族（§4.2） |
| T17-18 | SP2-018 | 2.6.T17 | 03 Problem Solving · Topic 17 #18 | mcq | B | |
| T17-19 | SP2-019 | 2.6.T17 | 03 Problem Solving · Topic 17 #19 | grid | 192.1 | alias TD-21-28（`data/aliases.js`） |
| T17-20 | SP2-020 | 2.6.T17 | 03 Problem Solving · Topic 17 #20 | grid | 887.6 | |
| T17-21 | SP2-021 | 2.6.T17 | 03 Problem Solving · Topic 17 #21 | mcq | A | 另 ↔ TD-21-27 同族（§4.2） |
| T17-22 | SP2-022 | 2.6.T17 | 03 Problem Solving · Topic 17 #22 | grid | 4.9 | 另 ↔ TD-21-31 同族（§4.2） |
| T17-23 | SP2-023 | 2.6.T17 | 03 Problem Solving · Topic 17 #23 | mcq | D | |
| T18-1 | SP2-024 | 2.6.T18 | 03 Problem Solving · Topic 18 #1 | mcq | B | |
| T18-2 | SP2-025 | 2.6.T18 | 03 Problem Solving · Topic 18 #2 | mcq | A | 表已有矢量 spec |
| T18-3 | SP2-026 | 2.6.T18 | 03 Problem Solving · Topic 18 #3 | mcq | B | alias U2-02；表已有矢量 spec |
| T18-4 | SP2-027 | 2.6.T18 | 03 Problem Solving · Topic 18 #4 | grid | 75 | 折线图已有矢量 spec |
| T18-5 | SP2-028 | 2.6.T18 | 03 Problem Solving · Topic 18 #5 | grid | 600 | |
| T18-6 | SP2-029 | 2.6.T18 | 03 Problem Solving · Topic 18 #6 | mcq | D | |
| T18-7 | SP2-030 | 2.6.T18 | 03 Problem Solving · Topic 18 #7 | grid | 12 | |
| T18-8 | SP2-031 | 2.6.T18 | 03 Problem Solving · Topic 18 #8 | grid | 36 | |
| T18-9 | SP2-032 | 2.6.T18 | 03 Problem Solving · Topic 18 #9 | grid | 0.54 | |
| T18-11 | SP2-034 | 2.6.T18 | 03 Problem Solving · Topic 18 #11 | grid | 0.48 | |
| T18-12 | SP2-035 | 2.6.T18 | 03 Problem Solving · Topic 18 #12 | grid | 0.88 | |
| T18-13 | SP2-036 | 2.6.T18 | 03 Problem Solving · Topic 18 #13 | grid | 9.87 | |
| T18-14 | SP2-037 | 2.6.T18 | 03 Problem Solving · Topic 18 #14 | grid | 47.25 | |
| T18-15 | SP2-038 | 2.6.T18 | 03 Problem Solving · Topic 18 #15 | mcq | D | |
| T18-16 | SP2-039 | 2.6.T18 | 03 Problem Solving · Topic 18 #16 | mcq | D | |
| T18-17 | SP2-040 | 2.6.T18 | 03 Problem Solving · Topic 18 #17 | mcq | C | |
| T18-18 | SP2-041 | 2.6.T18 | 03 Problem Solving · Topic 18 #18 | grid | 8 | |
| T18-19 | SP2-042 | 2.6.T18 | 03 Problem Solving · Topic 18 #19 | grid | 4.06 | |
| T18-20 | SP2-043 | 2.6.T18 | 03 Problem Solving · Topic 18 #20 | grid | 4.05 | |
| T18-21 | SP2-044 | 2.6.T18 | 03 Problem Solving · Topic 18 #21 | grid | 3.78 | |
| T18-22 | SP2-045 | 2.6.T18 | 03 Problem Solving · Topic 18 #22 | grid | 1.8 | |
| T18-23 | SP2-046 | 2.6.T18 | 03 Problem Solving · Topic 18 #23 | grid | 351 | 另 ↔ TD-21-34 同族（§4.2） |
| T18-24 | SP2-047 | 2.6.T18 | 03 Problem Solving · Topic 18 #24 | grid | 0.0014 | 另 ↔ TD-21-15 同族（§4.2） |
| T18-25 | SP2-048 | 2.6.T18 | 03 Problem Solving · Topic 18 #25 | mcq | C | |
| T18-26 | SP2-049 | 2.6.T18 | 03 Problem Solving · Topic 18 #26 | mcq | A | |
| T18-27 | SP2-050 | 2.6.T18 | 03 Problem Solving · Topic 18 #27 | grid | 87 | |
| T18-28 | SP2-051 | 2.6.T18 | 03 Problem Solving · Topic 18 #28 | grid | 79 | |
| T18-29 | SP2-052 | 2.6.T18 | 03 Problem Solving · Topic 18 #29 | grid | 182 | |
| T18-30 | SP2-053 | 2.6.T18 | 03 Problem Solving · Topic 18 #30 | grid | 90 | 另 ↔ TD-21-35 同族（§4.2） |
| T18-31 | SP2-054 | 2.6.T18 | 03 Problem Solving · Topic 18 #31 | grid | 88 | 另 ↔ TD-21-42 同族（§4.2） |
| T18-32 | SP2-055 | 2.6.T18 | 03 Problem Solving · Topic 18 #32 | grid | 11250 | |
| T18-33 | SP2-056 | 2.6.T18 | 03 Problem Solving · Topic 18 #33 | grid | 184 | alias U2-03；表已有矢量 spec；另 ↔ TD-21-10 同族（§4.2） |
| T18-34 | SP2-057 | 2.6.T18 | 03 Problem Solving · Topic 18 #34 | mcq | A | 另 ↔ TD-21-12 同族（§4.2） |
| T18-35 | SP2-058 | 2.6.T18 | 03 Problem Solving · Topic 18 #35 | grid | 13500 | |
| T18-36 | SP2-059 | 2.6.T18 | 03 Problem Solving · Topic 18 #36 | grid | 0.9966 | |
| T18-37 | SP2-060 | 2.6.T18 | 03 Problem Solving · Topic 18 #37 | mcq | A | |
| T22-4 | U2-15 | 2.7 | 讲义 p102 #3 | mcq | D | 题干全同；旧条为位图 `images/fig/U2-15.png`，表值以册内页复核（§7 #2） |
| T23-6 | U2-13 | 2.6 | 讲义 p92 #1 | mcq | C | 题干全同，选项全同；无图（§7 #3） |

> SP2-033 不存在（旧录缺 T18-10），见 §7 #1。

### 4.2 对应但内容不一致（同族变式，23 条）

| 册题 | 旧条目 | section | 旧 source | 图注 | 差异点（册题 vs 旧题） |
|---|---|---|---|---|---|
| T17-5 | TD-21-16 | 2.1 | 练习册 P66 · 2.1 #16 | 无图 | 26 树/3.68g→0.46 vs 22 树/5.92g→0.74 |
| T17-8 | TD-21-43 | 2.1 | 练习册 P75 · 2.1 #43 | 无图 | 45in/13mi/70% longer vs 35in/17mi/55% shorter |
| T17-17 | TD-21-19 | 2.1 | 练习册 P67 · 2.1 #19 | 无图 | 4.36 sq mi → sq yd vs 3.51 sq mi |
| T17-21 | TD-21-27 | 2.1 | 练习册 P69 · 2.1 #27 | 无图 | 250 ft²/hr vs 90 ft²/hr |
| T17-22 | TD-21-31 | 2.1 | 练习册 P71 · 2.1 #31 | 无图 | 2.2 m/s² vs 12.1 m/s² |
| T18-23 | TD-21-34 | 2.1 | 练习册 P72 · 2.1 #34 | 无图 | 1,875/52%→351 vs 3,750/54%→729 |
| T18-24 | TD-21-15 | 2.1 | 练习册 P66 · 2.1 #15 | 无图 | 140g 样品 vs 240g |
| T18-30 | TD-21-35 | 2.1 | 练习册 P72 · 2.1 #35 | 无图 | 30% removed/210 remain vs 60%/420 remain |
| T18-31 | TD-21-42 | 2.1 | 练习册 P75 · 2.1 #42 | 无图 | dragonflies 99/+12.50% vs butterflies 168/+31.25% |
| T18-33 | TD-21-10 | 2.1 | 练习册 P64 · 2.1 #10 | 位图待核 | 表值 ans184 vs ans176（表在 `images/fig/`，未展开比对） |
| T18-34 | TD-21-12 | 2.1 | 练习册 P65 · 2.1 #12 | 无图 | A=6,000%C/C=0.008%B vs 6,600%/0.004% |
| T19-8 | TD-25-06 | 2.5 | 练习册 P121 · 2.5 #6 | 无图 | +553 天 vs +632 天 |
| T19-9 | TD-25-24 | 2.5 | 练习册 P132 · 2.5 #24 | 位图待核 | 27 值 A/B 频率表 vs 26 值（位图未比对） |
| T19-11 | TD-25-03 | 2.5 | 练习册 P120 · 2.5 #3 | 位图待核 | 频率表 minimum（位图未比对） |
| T19-14 | TD-25-14 | 2.5 | 练习册 P126 · 2.5 #14 | 位图待核 | 四张频率表 greatest mean（位图未比对） |
| T19-24 | TD-25-07 | 2.5 | 练习册 P122 · 2.5 #7 | 位图 | +2µF vs +14µF |
| T19-31 | TD-25-28 | 2.5 | 练习册 P134 · 2.5 #28 | 无图 | 84 株/6.3kg/+11.6kg vs 86 株/6.2kg/+11.7kg |
| T20-9 | TD-23-05 | 2.3 | 练习册 P95 · 2.3 #5 | 无图 | f(x)=201% of x vs 300% of x |
| T21-2 | TD-24-11 | 2.4 | 练习册 P117 · 2.4 #11 | 无图 | 225 人/0.44/0.32 vs 375 人/0.48/0.28 |
| T21-5 | TD-24-04 | 2.4 | 练习册 P106 · 2.4 #4 | 位图待核 | 90 人 age×Group vs 120 人（位图未比对） |
| T21-6 | TD-24-08 | 2.4 | 练习册 P111 · 2.4 #8 | 位图待核 | 册题 grid P(Math) vs 旧题 mcq；表位图未比对 |
| T21-10 | TD-24-16 | 2.4 | 练习册 P117 · 2.4 #16 | 位图待核 | Lions vs Flames；表位图未比对 |
| T22-5 | TD-25-21 | 2.5 | 练习册 P133 · 2.5 #21 | 无图 | MOE 0.05 vs 0.08 |

> 其余 56 条册题在旧库中无同型、无同族题（旧库 2.1–2.5 为 TD 教材体系，T19–T23 专题在旧库无覆盖），逐行见 §3「无图/表外」行与 §5。

---

## 5. 差量统计（HEAD c184252）

| 口径 | 数量 | 可追页码/题号 |
|---|---|---|
| 本册题量 | **129**（T17=23 / T18=37 / T19=31 / T20=12 / T21=11 / T22=9 / T23=6） | §2 |
| 已录（同题） | **61**（SP2 59 + U2-15 + U2-13） | §4.1；SP2-001…023=T17 全 23，SP2-024…032/034…060=T18 除 #10 外 36 |
| 对应但不一致（同族变式） | **23**（旧条目去重后 23 条；其中 11 条与同题旧条并存于 T17/T18，12 条仅同族无同题） | §4.2 |
| 纯无对应 | **56**（=129−61 同题−12 仅同族） | §3 表内逐题 |
| 现有 unit=2 题库 | 204 题（legacy 15 / textbook 130 / pdf-origin SP2 59）；与本册交集仅 §4.1 的 61 同题 + §4.2 的 23 同族 | `data/questions.js` |
| 本册需新画图形 | 表 29、散点图 9、点图 4、箱线图 2、直方图 2、指数曲线 1、折线图 1；旧 SP2 仅 6 条已有矢量 spec（SP2-001/002/025/026/056=table，SP2-027=chart） | §2 图形负担列 |

> 分 Topic 差量：T17 全 23 已录；T18 已录 36（#10 缺）；T19/T20/T21/T22/T23 共 69 题，仅 T22-4、T23-6 有同题旧条，其余 67 题无同题旧条。

---

## 6. 派工映射表（03-B1…B22 → 录题代理直接切分）

> 每批 5–10 题（B20/B21/B22 仅 3 题，因 Topic 收束页，不单批扩混 Topic），按 Topic 切；新 id `R03-` 号段按册内 Topic 分块预留 60 个：T17→R03-001 起、T18→R03-061 起、T19→R03-121 起、T20→R03-181 起、T21→R03-241 起、T22→R03-301 起、T23→R03-361 起。section 填 `2.7.T<册内Topic号>`。

| 批次 | section | 册内题号清单 | PDF 页（书页） | 题数 | R03 号段 | 图形负担 | 备注 |
|---|---|---|---|---|---|---|---|
| 03-B1 | 2.7.T17 | T17-1, T17-2, T17-3, T17-4, T17-5, T17-6, T17-7 | p02（104–105） | 7 | R03-001…007 | 表 2（#1/#2，旧 spec 可参照） | 全有 SP2 旧条 |
| 03-B2 | 2.7.T17 | T17-8, T17-9, T17-10, T17-11, T17-12, T17-13, T17-14, T17-15, T17-16, T17-17 | p03（106–107） | 10 | R03-008…017 | 无图 | 全有 SP2 旧条 |
| 03-B3 | 2.7.T17 | T17-18, T17-19, T17-20, T17-21, T17-22, T17-23 | p04 左（108） | 6 | R03-018…023 | 无图 | 全有 SP2 旧条 |
| 03-B4 | 2.7.T18 | T18-1, T18-2, T18-3, T18-4, T18-5, T18-6, T18-7 | p04 右–p05 左（109–110） | 7 | R03-061…067 | 表 2（#2/#3）、折线图 1（#4，旧 spec 可参照） | 全有 SP2 旧条 |
| 03-B5 | 2.7.T18 | T18-8, T18-9, T18-10, T18-11, T18-12, T18-13, T18-14, T18-15, T18-16 | p05（110–111） | 9 | R03-068…076 | 无图 | #10 旧缺（§7 #1）；#8/#9/#11–#16 有 SP2 旧条 |
| 03-B6 | 2.7.T18 | T18-17, T18-18, T18-19, T18-20, T18-21, T18-22 | p06 左（112） | 6 | R03-077…082 | 无图 | 全有 SP2 旧条 |
| 03-B7 | 2.7.T18 | T18-23, T18-24, T18-25, T18-26, T18-27, T18-28 | p06 右（113） | 6 | R03-083…088 | 无图 | 全有 SP2 旧条 |
| 03-B8 | 2.7.T18 | T18-29, T18-30, T18-31, T18-32, T18-33, T18-34, T18-35, T18-36, T18-37 | p07（114–115） | 9 | R03-089…097 | 表 1（#33，旧 spec 可参照） | 全有 SP2 旧条 |
| 03-B9 | 2.7.T19 | T19-1, T19-2, T19-3, T19-4, T19-5 | p08（116–117） | 5 | R03-121…125 | 箱线图 2、直方图 2、点图 1 | 无旧条；图形负担最高批 |
| 03-B10 | 2.7.T19 | T19-6, T19-7, T19-8, T19-9 | p09（118–119） | 4 | R03-126…129 | 点图 3、频率表 1 | 无旧条 |
| 03-B11 | 2.7.T19 | T19-10, T19-11, T19-12, T19-13, T19-14 | p10（120–121） | 5 | R03-130…134 | 频率表 5 | 无旧条 |
| 03-B12 | 2.7.T19 | T19-15, T19-16, T19-17, T19-18, T19-19, T19-20 | p11（122–123） | 6 | R03-135…140 | 表 3（#15/#16/#17） | 无旧条 |
| 03-B13 | 2.7.T19 | T19-21, T19-22, T19-23, T19-24, T19-25, T19-26, T19-27 | p12（124–125） | 7 | R03-141…147 | 无图 | 无旧条 |
| 03-B14 | 2.7.T19 | T19-28, T19-29, T19-30, T19-31 | p12 右–p13 左（125–126） | 4 | R03-148…151 | 表 1（#30） | 无旧条 |
| 03-B15 | 2.7.T20 | T20-1, T20-2, T20-3, T20-4, T20-5, T20-6 | p13 右–p14（127–129） | 6 | R03-181…186 | 散点图 5（#1/#2/#3/#4/#6）、指数曲线 1（#5） | 无旧条 |
| 03-B16 | 2.7.T20 | T20-7, T20-8, T20-9, T20-10, T20-11, T20-12 | p15–p16 左（130–132） | 6 | R03-187…192 | 散点图 4（#7/#10/#11/#12）、表 1（#8） | 无旧条 |
| 03-B17 | 2.7.T21 | T21-1, T21-2, T21-3, T21-4, T21-5, T21-6 | p16 右–p17 左（133–134） | 6 | R03-241…246 | 表 4（#1/#3/#5/#6） | 无旧条 |
| 03-B18 | 2.7.T21 | T21-7, T21-8, T21-9, T21-10, T21-11 | p17 右（135） | 5 | R03-247…251 | 表 3（#8/#10/#11） | 无旧条 |
| 03-B19 | 2.7.T22 | T22-1, T22-2, T22-3, T22-4, T22-5, T22-6 | p18（136–137） | 6 | R03-301…306 | 表 4（#1/#3/#4/#6） | T22-4 有旧条 U2-15 |
| 03-B20 | 2.7.T22 | T22-7, T22-8, T22-9 | p19 左（138） | 3 | R03-307…309 | 无图 | 无旧条 |
| 03-B21 | 2.7.T23 | T23-1, T23-2, T23-3 | p19 右（139） | 3 | R03-361…363 | 表 1（#1） | 无旧条 |
| 03-B22 | 2.7.T23 | T23-4, T23-5, T23-6 | p20 左（140） | 3 | R03-364…366 | 无图 | T23-6 有旧条 U2-13 |

> 题数合计：B1–B3=23（T17）、B4–B8=37（T18）、B9–B14=31（T19）、B15–B16=12（T20）、B17–B18=11（T21）、B19–B20=9（T22）、B21–B22=6（T23），共 129，与 §2/§5 自洽。

---

### 7.0 已裁定（Tim 2026-11-25，按"利益最大化"口径执行）

裁定源 = `docs/transcribe/bank-rulings.json`，由 `tools/apply_bank_rulings.py` 幂等落库，CI 在合并题包后、答案补丁前执行。原 7.1–7.8 保留为历史记录。

| # | 裁定 | 落地 |
|---|---|---|
| 1 | T18 #9/#10 书内逐字重复 → **留一条**，保留 `R03-069`；`R03-070` 不删行，标 `mergedInto:"R03-069"`，不进板块计数；`data/aliases.js` 加 `R03-070 → R03-069` | 原图仲裁：书页 110 #9 与 111 #10 逐字同题（p05 左/右，2.8× 放大，70%/80%/positive number 全同），确认是书内重复印而非转录抄重 |
| 2 | T22-4 ↔ U2-15、T23-6 ↔ U2-13 → **保留新录**；旧条标 `retired:true` 且 alias 指向新条，不计入任何板块题量 | `U2-15 → R03-304`、`U2-13 → R03-366`；旧条仍在数据里可回查，只是不再进练习池 |
| 3 | 23 条同族变式 → **全部保留可练**，标 `variant:true` + `variantOf` 指向母题，台账单列「变式」 | 批次 3 落地（见 §4.2 表 + 「变式」列） |
| 4 | 旧 SP2 板块（2.6.T17/2.6.T18）→ 数据与题保留，**入口隐藏**；旧链接/旧进度经 alias 解析到 2.7.T17/T18 | 59 条 SP2 全部 `retired:true` + alias；两个节点加 `hidden:true`；旧 localStorage 进度按别名迁进新节 |
| 5 | 板块显示名 → 主标题「Unit 2 · 专项练习」「Unit 4 · 专项练习」，册名作副标题 | 群组节点 `2.7` / `4.5` 的 `cn` / `sub` 已改；板块行 `cn` 一律「Topic N · 中文主名」，英文原名进 `sub` |
| 6 | 线上反馈·四板块标题自我重复（T20–T23 显示「Topic 20 · Topic 20」）→ 补中文主名、英文原名放副标题 | 占位文案 `Topic N` 全部替换：T20 模型与散点图 / T21 概率与条件概率 / T22 样本推断与误差范围 / T23 统计论断评估 |
| 7 | 线上反馈·U4 四个 Topic 名混语言且 T25「Geometry」与单元同义 → 中文主名 + 英文副标 | T24 面积与体积 / T25 几何综合 / T26 直角三角形与三角函数 / T27 圆；`sub` 保留原著英文名 |

顺带清理（不属裁定范围，但避免幻影板块）：旧 15 题卷 `U2-14`（误差范围题，唯一不重复）从误挂的群组节点 `2.7` 改挂 `2.7.T22`，继续可练；`U2-13`/`U2-15` 归并后 `2.6`/`2.7` 两个残留节点不再挂题。

## 7. 待裁定（录入派单前需 Tim 拍板）

1. **T18-10 书内重复题**：册内 #10 与 #9 逐字相同（a 比 b 少 70%，c 比 a 多 80%，c 是 b 几倍），旧录缺 SP2-033。建议按书独立录为 R03-070 并在 hint 标注「与 #9 同文」，还是跳过不录？
2. **T22-4 ↔ U2-15 去留**：题干全同（两样本 52%/4.2% vs 48%/1.6%，MOE 大小原因），旧条为位图 `images/fig/U2-15.png`，表值未展开比对。新条 R03-304 独立录、还是勘误替换 U2-15？旧位图按规范不得沿用。
3. **T23-6 ↔ U2-13 去留**：题干选项全同（Tabitha 20 户，mean 2.4，C=flawed biased），旧条在 2.6 讲义。新条 R03-366 独立录、还是替换 U2-13？
4. **23 条同族变式口径**：默认新条独立以 R03- 录入、不改旧条；是否改为对旧条做数字勘误？（§4.2）
5. **位图待核 7 条**：TD-21-10、TD-25-03、TD-25-14、TD-25-24、TD-24-04、TD-24-08、TD-24-16 的表值存于 `images/fig/*.png`，本次未展开；派工前可选择展开复核或直接按册内页新画。
6. **旧 SP2 板块（2.6.T17/T18）去留**：全量重录后旧 59 条保留并存、还是由新 R03 条替换？alias（SP2-019→TD-21-28、SP2-026→U2-02、SP2-056→U2-03）的 canonical 归属一并拍板。
7. **板块命名**：新父组 `2.7 03 Problem Solving 专项练习（重录）`，子节 `2.7.T17`…`2.7.T23`；注意与现有 `2.6`（SP2 旧录）并存，目录显示名须带「专项」区分。
8. **p20 右半**为「04 Geometry and Trigonometry」分册扉页，非本册，不录（04 册另见 `docs/topic-transcribe-04.md`）。
