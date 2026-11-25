# T22-reconcile · Topic 22 Inference from Sample Statistics and Margin Of Error（#1–#9，R03-301…309）

- 册：03 Problem Solving and Data Analysis 专项练习（重录）；section 2.7.T22；unit=2；origin=pdf。
- 页面：p18 左（书页136，#1/#2/#3）→ p18 右（书页137，#4/#5/#6）→ p19 左（书页138，#7/#8/#9）。
- 本册无答案页（PDF 止于 p140），全部独立复算；旧 SP2/旧 U2 答案仅交叉对照，不一致处以自算为准。
- 切片：单文件 T22.json（9 题，13.0 KB，单次推送装得下），详见 T22-T23-layout.md。

## #1 · R03-301 · p18 左 · grid · 94
- 原页定位：p18 左半页（书页136 左栏顶），册内第 1 题，题头方块 1，表题 “Views on Nuclear Energy Use”。
- 逐字核对：关键片段：“411 randomly selected US residents”；“population of the United States was 300 million”；“best estimate, in millions, of the difference between the number of US residents who somewhat favor or strongly favor … and the number of those who somewhat oppose or strongly oppose it”；“(Round your answer to the nearest whole number.)”。表值：Strongly favor 56 / Somewhat favor 214 / Somewhat oppose 104 / Strongly oppose 37，逐项对上。
- 选项确认：grid，choices={}，无文字选项。
- 图表↔spec：结构化表格重绘（head=['Response','Frequency']，4 行），禁截图；表值与原页逐项核对一致。
- 答案复算：favor=56+214=270；oppose=104+37=141；差=(270−141)/411×300M=129/411×300=94.1606 → 94。
- 结论：逐字已核，字段入包。

## #2 · R03-302 · p18 左 · mcq · C
- 原页定位：p18 左半页右栏（书页136），册内第 2 题，题头方块 2。
- 逐字核对：关键片段：“In State X, Mr. Camp's eighth-grade class consisting of 26 students was surveyed and 34.6 percent of the students reported that they had at least two siblings”；“average eighth-grade class size in the state is 26”；“representative of students in the state's eighth-grade classes”；“1,800 eighth-grade classes”；问 “fewer than two siblings”。
- 选项确认：A=16,200；B=23,400；C=30,600；D=46,800，四项与原页逐一对上（千分位照录）。
- 图表：无图。
- 答案复算：全州学生=1,800×26=46,800；fewer than two=1−0.346=0.654；46,800×0.654=30,607.2 ≈ 30,600。选 C。
- 结论：逐字已核，字段入包。

## #3 · R03-303 · p18 左 · mcq · B
- 原页定位：p18 左半页右栏底（书页136），册内第 3 题，题头方块 3，表题 “Poll Results”。
- 逐字核对：关键片段：“A total of 803 voters selected at random were asked which candidate they would vote for in the upcoming election”；“if 6,424 people vote in the election, by how many votes would Angel Cruz be expected to win?”。表值：Angel Cruz 483 / Terry Smith 320，逐项对上。
- 选项确认：A=163；B=1,304；C=3,864；D=5,621，四项与原页逐一对上（千分位照录）。
- 图表↔spec：结构化表格重绘（head=['Candidate','Votes']，2 行），禁截图；表值与原页逐项核对一致。
- 答案复算：margin=(483−320)/803×6,424=163/803×6,424；6,424=803×8 → 163×8=1,304。选 B。
- 结论：逐字已核，字段入包。

## #4 · R03-304 · p18 右 · mcq · D 【旧 U2-15 同题，见本块末异同】
- 原页定位：p18 右半页（书页137 左栏顶），册内第 4 题，题头方块 4。
- 逐字核对：关键片段：“two random samples of votes for a proposition”；“selected from the same population, and the margins of error were calculated using the same method”；问 “most appropriate reason that the margin of error for sample A is greater than the margin of error for sample B?”。表值：Sample A 52% / 4.2%；Sample B 48% / 1.6%，逐项对上（% 与千分位无关，4.2%/1.6% 照录）。
- 选项确认：A=Sample A had a smaller number of votes that could not be recorded.；B=Sample A had a higher percent of favorable responses.；C=Sample A had a larger sample size.；D=Sample A had a smaller sample size.，四项与原页逐一对上。
- 图表↔spec：结构化表格重绘（head=['Sample','Percent in favor','Margin of error']，2 行），禁截图；表值与原页逐项核对一致。
- 答案复算：同方法同总体下 MOE∝1/√n；A 的 MOE 4.2%>B 1.6% → A 样本量更小。选 D。
- 与旧 U2-15 异同（台账 §7 #2，留 Tim 拍板，新题独立录、不合并不跳过）：题干逐字全同；选项 A–D 逐字全同；旧条 answer=D 与自算一致；旧条 section=2.7、paper=Unit 2 · 15 题卷、origin=legacy、带位图 `images/fig/U2-15.png`（表值未展开比对），新条 section=2.7.T22、origin=pdf、表走结构化 figSpec；差异仅在载体（位图→结构化表）与节位，内容无冲突。
- 结论：逐字已核，字段入包。

## #5 · R03-305 · p18 右 · mcq · A
- 原页定位：p18 右半页（书页137 左栏中），册内第 5 题，题头方块 5，无图。
- 逐字核对：关键片段：“estimate that the proportion … is 0.2, with an associated margin of error of 0.05”；问 “most appropriate conclusion about the proportion”。
- 选项确认：A=It is plausible that the proportion is between 0.15 and 0.25.；B=It is plausible that the proportion is less than 0.15.；C=The proportion is exactly 0.2.；D=It is plausible that the proportion is greater than 0.25.，四项与原页逐一对上。
- 图表：无图。
- 答案复算：可信区间=0.2±0.05=[0.15,0.25]，区间内值为 plausible，区间外不作断言；C 把点估计当总体定值。选 A。
- 交叉备注：与旧 TD-25-21 同族（MOE 0.08 版本），题面数值不同，非同题，仅备注。
- 结论：逐字已核，字段入包。

## #6 · R03-306 · p18 右 · mcq · D
- 原页定位：p18 右半页（书页137 右栏顶），册内第 6 题，题头方块 6。
- 逐字核对：关键片段：“799 randomly selected US teens”；“how often they talked on a cell phone and about their texting behavior”；“estimate of the percent … who are heavy texters is 30% and the associated margin of error is 3%”。表值：Light 110/146/256；Medium 139/164/303；Heavy 166/74/240；Total 415/384/799，逐项对上。
- 选项确认：A=Approximately 3% of the teens in the study who are classified as heavy texters are not really heavy texters.；B=It is not possible that the percent of all US teens who are heavy texters is less than 27%.；C=The percent of all US teens who are heavy texters is 33%.；D=It is doubtful that the percent of all US teens who are heavy texters is 35%.，四项与原页逐一对上。
- 图表↔spec：结构化表格重绘（head=['Texting behavior','Talks on cell phone daily','Does not talk on cell phone daily','Total']，4 行+Total 行），禁截图；表值与原页逐项核对一致。
- 答案复算：区间=30%±3%=[27%,33%]；35% 在区间外 → doubtful。A 误读 MOE（MOE 不是“3% 不是真常客”）；B 27% 为下界仍可能；C 把区间上界当总体定值。选 D。
- 结论：逐字已核，字段入包。

## #7 · R03-307 · p19 左 · mcq · A
- 原页定位：p19 左半页（书页138 左栏顶），册内第 7 题，题头方块 7，无图。
- 逐字核对：关键片段：“sample of 135 members at random”；“estimates that 83% … would continue to pay … if the price increased, with an associated margin of error of 6.34%”；“repeated with a random sample of 270 members and the results are calculated in the same way”；问 larger sample 的 effect。
- 选项确认：A=The margin of error will be lower.；B=The margin of error will be higher.；C=The estimate of the percentage of the gym's members that would continue to pay for a membership if the price increased will be lower.；D=同句尾 will be higher.，四项与原页逐一对上。
- 图表：无图。
- 答案复算：样本量 135→270（×2），MOE∝1/√n → 下降；估计值本身无系统性升降。选 A。
- 结论：逐字已核，字段入包。

## #8 · R03-308 · p19 左 · mcq · A
- 原页定位：p19 左半页（书页138 左栏中），册内第 8 题，题头方块 8，无图。
- 逐字核对：关键片段：“Poecilia reticulata, a type of fish, from a certain location in Indonesia”；“sample mean length … 16.64 millimeters”；“between 15.87 and 17.41 millimeters”；问 margin of error, in millimeters。
- 选项确认：A=0.77；B=2.31；C=15.87；D=16.64，四项与原页逐一对上。
- 图表：无图。
- 答案复算：MOE=(17.41−15.87)/2=1.54/2=0.77 mm（中点=(15.87+17.41)/2=16.64 与样本均值一致，互证）。选 A。
- 结论：逐字已核，字段入包。

## #9 · R03-309 · p19 左 · mcq · B
- 原页定位：p19 左半页（书页138 右栏），册内第 9 题，题头方块 9，无图。
- 逐字核对：关键片段：“2 random samples of ovens … preheat to 325 degrees Fahrenheit (°F)”；第一样本 14.2 min / MOE 1 min；第二样本 14.4 min / MOE 2.3 min；“Assuming the margin of error were calculated the same way”；问 first sample MOE 更小的原因。
- 选项确认：A=The first sample contained fewer ovens than the second sample.；B=The first sample contained more ovens than the second sample.；C=The first sample took less time on average to preheat to 325°F than the second sample.；D=The first sample took more time on average to preheat to 325°F than the second sample.，四项与原页逐一对上。
- 图表：无图。
- 答案复算：同方法下 MOE 小 → 样本量大；平均预热时长 14.2 vs 14.4 与 MOE 无关。第一样本烤箱更多。选 B。
- 结论：逐字已核，字段入包。
