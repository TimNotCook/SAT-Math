# Topic 21 · Probability and Conditional Probability — 读题核对台账（R03-241…R03-251）

> 题包：单文件 `fragments/T21.json`（#1–#11，11.4KB < 20KB 推送上限，未切片），section `2.7.T21`，unit=2，origin=`pdf`，paper 含「专项」；布局见 `T20-T21-layout.md`。
> 读图素材：`docs/transcribe/03/pages/p16.jpg … p17.jpg`（书页 133–135；横版跨页，一图两页）。
> 口径：只转录+复算，未写 `data/*.js`；本册扫描无答案页，答案全部独立复算，式子见各题；外部答案站点不作来源。
> 自检：`python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/03/fragments/T21.json --dry-run` 分段跑（#1–#6 / #7–#11 / 全量 11 题）均「将新增 N 题」、FAIL 0、无非法字段；section `2.7.T21` 未声明的 advisory 属预期，不改数据文件。

## 答案汇总

| 册# | R03 id | 题型 | 答案 | value | 书页 |
|---|---|---|---|---|---|
| 1 | R03-241 | grid | 8 | 8 | 133 |
| 2 | R03-242 | grid | 54 | 54 | 133 |
| 3 | R03-243 | grid | 1/3 | 0.3333… | 133 |
| 4 | R03-244 | grid | 42 | 42 | 133 |
| 5 | R03-245 | grid | 23/60 | 0.3833… | 134 |
| 6 | R03-246 | grid | 1/4 | 0.25 | 134 |
| 7 | R03-247 | mcq | B | — | 134 |
| 8 | R03-248 | grid | 5/7 | 0.7143… | 135 |
| 9 | R03-249 | grid | 15/31 | 0.4839… | 135 |
| 10 | R03-250 | mcq | D | — | 135 |
| 11 | R03-251 | mcq | C | — | 135 |

---

## 逐题核对

### #1 · R03-241 · grid · 8 · p16 右（书页 133）
- **原页定位**：p16.jpg 右半页上部，血型×Rh 表（组头 Blood type 跨 A/B/AB/O）。
- **逐字核对**："Human blood can be classified into four common blood types—A, B, AB, and O. It is also characterized by the presence (+) or absence (−) of the rhesus factor.\nThe table above shows the distribution of blood type and rhesus factor for a group of people. If one of these people who is rhesus negative (−) is chosen at random, the probability that the person has blood type B is 1/9. What is the value of x?"（em dash、(+)/(−) 照录；平分数 1/9 照抄）。
- **选项逐项**：grid，无选项。
- **表格↔spec**：`figSpec.table`，head ["Rhesus factor","A","B","AB","O"]，headGroups [{label:"Blood type", span:4}]；rows：+ / 33 / 93 / 37 / 7；− / 7 / 2 / 1 / x。
- **独立复算**：− 组总数 = 7+2+1+x = 10+x；P(B|−) = 2/(10+x) = 1/9 → 10+x = 18 → x = 8。
- **结论**：value=8，逐字已核。

### #2 · R03-242 · grid · 54 · p16 右（书页 133）
- **原页定位**：p16.jpg 右半页中部，纯文字题（无图无表）。
- **逐字核对**："At a convention center, there are a total of 225 visitors. Each visitor is located in either room A, room B, or room C. If one of these visitors is selected at random, the probability of selecting a visitor who is located in room A is 0.44, and the probability of selecting a visitor who is located in room B is 0.32. How many visitors are located in room C?"
- **选项逐项**：grid，无选项。
- **表格↔spec**：无 figSpec。
- **独立复算**：P(C) = 1 − 0.44 − 0.32 = 0.24；225 × 0.24 = 54。
- **结论**：value=54，逐字已核。

### #3 · R03-243 · grid · 1/3 · p16 右（书页 133）
- **原页定位**：p16.jpg 右半页上部右侧，Phone/Email 双列百分比表。
- **逐字核对**："An alumni association survey asked each high school graduate to select the one activity he or she preferred for the association's next event. Some of the people responded by phone, and the others responded by email. The table above shows the distribution of preferred activity, in percent, for each response type used. For the survey, the number of email responses was twice the number of phone responses. If a person who preferred a picnic is selected at random, what is the probability that the person responded by email?"
- **选项逐项**：grid，无选项。
- **表格↔spec**：`figSpec.table`，head ["","Phone","Email"]；rows：Dinner dance 55%/80%；Football game 20%/10%；Picnic 20%/5%；Pool party 5%/5%；Total 100%/100%。
- **独立复算**：设电话 p、邮件 2p；野餐人数 = 0.20p + 0.05×2p = 0.30p，其中邮件野餐 = 0.10p；P(邮件|野餐) = 0.10p/0.30p = 1/3。
- **结论**：answer "1/3"，value=1/3，逐字已核。

### #4 · R03-244 · grid · 42 · p16 右（书页 133）
- **原页定位**：p16.jpg 右半页下部，纯文字题（无图无表）。
- **逐字核对**："On May 10, 2015, there were 83 million Internet subscribers in Nigeria. The major Internet providers were MTN, Globacom, Airtel, Etisalat, and Visafone. By September 30, 2015, the number of Internet subscribers in Nigeria had increased to 97 million. If an Internet subscriber in Nigeria on September 30, 2015, is selected at random, the probability that the person selected was an MTN subscriber is 0.43. There were p million MTN subscribers in Nigeria on September 30, 2015. To the nearest integer, what is the value of p ?"（句末 "p ?" 前空格照原页）。
- **选项逐项**：grid，无选项。
- **表格↔spec**：无 figSpec。
- **独立复算**：p = 97 × 0.43 = 41.71 → 最近整数 42（83 million 为背景干扰）。
- **结论**：value=42，逐字已核。

### #5 · R03-245 · grid · 23/60 · p17 左（书页 134）
- **原页定位**：p17.jpg 左半页上部，年龄×分组表。
- **逐字核对**："The table summarizes the distribution of age and assigned group for 90 participants in a study.\nOne of these participants will be selected at random. What is the probability of selecting a participant from group A, given that the participant is at least 10 years of age? (Express your answer as a decimal or fraction, not as a percent.)"
- **选项逐项**：grid，无选项。
- **表格↔spec**：`figSpec.table`，head ["","0-9 years","10-19 years","20+ years","Total"]；rows：Group A 7/14/9/30；Group B 6/4/20/30；Group C 17/12/1/30；Total 30/30/30/90。
- **独立复算**：条件域 ≥10 岁 = 30+30 = 60；其中 A 组 = 14+9 = 23；P = 23/60。
- **结论**：answer "23/60"，value=23/60，逐字已核。

### #6 · R03-246 · grid · 1/4 · p17 左（书页 134）
- **原页定位**：p17.jpg 左半页中部，学科×年级表（组头 Grade level 跨 Sixth/Seventh/Eighth）。
- **逐字核对**："The table gives the distribution of favorite core subject and grade level for 80 students.\nIf a student is selected at random, what is the probability of selecting a student whose favorite core subject is mathematics?"
- **选项逐项**：grid，无选项。
- **表格↔spec**：`figSpec.table`，head ["Subject","Sixth","Seventh","Eighth","Total"]，headGroups [{label:"Grade level", span:3}]；rows：English 4/10/7/21；Mathematics 10/1/9/20；Science 2/8/4/14；Social studies 8/7/10/25；Total 24/26/30/80。
- **独立复算**：P(Math) = 20/80 = 1/4 = 0.25。
- **结论**：answer "1/4"，value=0.25，逐字已核。

### #7 · R03-247 · mcq · B · p17 左（书页 134）
- **原页定位**：p17.jpg 左半页上部右侧，bill×repairs 表。
- **逐字核对**："Employees working for a customer service line at an electric company recorded all the calls last Monday and noted whether the caller asked for repairs and whether the caller asked about a bill. The results are summarized in the table below.\nIf a caller last Monday who asked about his or her bill is selected at random, which of the following is closest to the probability that the customer also asked for repairs?"
- **选项逐项**：A "0.05" ✓；B "0.07" ✓；C "0.20" ✓；D "0.27" ✓。
- **表格↔spec**：`figSpec.table`，head ["","Asked for repairs","Did not ask for repairs","Total"]；rows：Asked about a bill 48/623/671；Did not ask about a bill 130/90/220；Total 178/713/891。
- **独立复算**：P(repairs|asked bill) = 48/671 ≈ 0.07154 → 最近 0.07。选 B。
- **结论**：B，逐字已核。

### #8 · R03-248 · grid · 5/7 · p17 右（书页 135）
- **原页定位**：p17.jpg 右半页上部，"Number of Contestants by Score and Day" 表。
- **逐字核对**："The same 20 contestants, on each of 3 days, answered 5 questions in order to win a prize. Each contestant received 1 point for each correct answer. The number of contestants receiving a given score on each day is shown in the table above.\nNo contestant received the same score on two different days. If a contestant is selected at random, what is the probability that the selected contestant received a score of 5 on Day 2 or Day 3, given that the contestant received a score of 5 on one of the three days?"
- **选项逐项**：grid，无选项。
- **表格↔spec**：`figSpec.table`（caption "Number of Contestants by Score and Day"），head ["Day","5 out of 5","4 out of 5","3 out of 5","2 out of 5","1 out of 5","0 out of 5","Total"]；rows：Day 1 2/3/4/6/2/3/20；Day 2 2/3/5/5/4/1/20；Day 3 3/3/4/5/3/2/20；Total 7/9/13/16/9/6/60。
- **独立复算**：条件域=三天得分 5 合计 2+2+3=7；其中 Day2 或 Day3 = 2+3=5；P = 5/7。
- **结论**：answer "5/7"，value=5/7，逐字已核。

### #9 · R03-249 · grid · 15/31 · p17 右（书页 135）
- **原页定位**：p17.jpg 右半页中部，纯文字题（无图无表）。
- **逐字核对**："A grove has 6 rows of birch trees and 5 rows of maple trees. Each row of birch trees has 8 trees 20 feet or taller and 6 trees shorter than 20 feet. Each row of maple trees has 9 trees 20 feet or taller and 7 trees shorter than 20 feet. A tree from one of these rows will be selected at random. What is the probability of selecting a maple tree, given that the tree is 20 feet or taller?"
- **选项逐项**：grid，无选项。
- **表格↔spec**：无 figSpec。
- **独立复算**：≥20 ft：桦 = 6×8 = 48，枫 = 5×9 = 45，合计 93；P(枫|≥20) = 45/93 = 15/31。
- **结论**：answer "15/31"，value=15/31，逐字已核。

### #10 · R03-250 · mcq · D · p17 右（书页 135）
- **原页定位**：p17.jpg 右半页上部右侧，T 恤 size×team 表。
- **逐字核对**："A bin contains a mixture of T-shirts for two sports teams. The table shows the number of T-shirts in the bin, classified by size and sports team.\nOne T-shirt from the bin will be selected at random. What is the probability of selecting a T-shirt that is medium, given that the T-shirt is a Lions T-shirt?"（T-shirts/T-shirt 连字符照录）。
- **选项逐项**：A "0.21" ✓；B "0.24" ✓；C "0.41" ✓；D "0.50" ✓。
- **表格↔spec**：`figSpec.table`，head ["","Lions","Stars","Total"]；rows：Small 6/8/14；Medium 24/34/58；Large 18/26/44；Total 48/68/116。
- **独立复算**：P(Medium|Lions) = 24/48 = 0.50。选 D。
- **结论**：D，逐字已核。

### #11 · R03-251 · mcq · C · p17 右（书页 135）
- **原页定位**：p17.jpg 右半页下部，"2013 State-Level Taxes" 表。
- **逐字核对**："The table below shows the distribution of US states according to whether they have a state-level sales tax and a state-level income tax.\nTo the nearest tenth of a percent, what percent of states with a state-level sales tax do not have a state-level income tax?"
- **选项逐项**：A "6.0%" ✓；B "12.0%" ✓；C "13.3%" ✓；D "14.0%" ✓。
- **表格↔spec**：`figSpec.table`（caption "2013 State-Level Taxes"），head ["","State sales tax","No state sales tax"]；rows：State income tax 39/4；No state income tax 6/1。
- **独立复算**：有销售税 = 39+6 = 45；其中无所得税 = 6；6/45 = 13.333…% → 13.3%。选 C。
- **结论**：C，逐字已核。
