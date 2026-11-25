# Topic 20 · Models and Scatterplots — 读题核对台账（R03-181…R03-192）

> 题包：单文件 `fragments/T20.json`（#1–#12，14.0KB < 20KB 推送上限，未切片），section `2.7.T20`，unit=2，origin=`pdf`，paper 含「专项」；布局见 `T20-T21-layout.md`。
> 读图素材：`docs/transcribe/03/pages/p13.jpg … p16.jpg`（书页 127–132；横版跨页，一图两页）。
> 口径：只转录+复算，未写 `data/*.js`；本册扫描无答案页，答案全部独立复算，式子见各题；外部答案站点不作来源。
> 自检：`python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/03/fragments/T20.json --dry-run` 分段跑（#1–#6 / #7–#12 / 全量 12 题）均「将新增 N 题」、FAIL 0、无非法字段；section `2.7.T20` 未声明的 advisory 属预期，不改数据文件。

## 答案汇总

| 册# | R03 id | 题型 | 答案 | value | 书页 |
|---|---|---|---|---|---|
| 1 | R03-181 | mcq | A | — | 127 |
| 2 | R03-182 | mcq | D | — | 127 |
| 3 | R03-183 | grid | 4.5 | 4.5 | 128 |
| 4 | R03-184 | grid | 285 | 285 | 128 |
| 5 | R03-185 | mcq | A | — | 129 |
| 6 | R03-186 | mcq | D | — | 129 |
| 7 | R03-187 | mcq | B | — | 130 |
| 8 | R03-188 | mcq | A | — | 130 |
| 9 | R03-189 | mcq | D | — | 131 |
| 10 | R03-190 | mcq | A | — | 131 |
| 11 | R03-191 | mcq | C | — | 131 |
| 12 | R03-192 | mcq | A | — | 132 |

---

## 逐题核对

### #1 · R03-181 · mcq · A · p13 右（书页 127）
- **原页定位**：p13.jpg 右半页上部，散点图 "Minimum Wage"，横轴 Years since 1940（0–80，步长 10），纵轴 Minimum wage (dollars per hour)（0–8，步长 1），含拟合直线。
- **逐字核对**：题干 "The scatterplot above shows the federal-mandated minimum wage every 10 years between 1940 and 2010. A line of best fit is shown, and its equation is y = 0.096x − 0.488 . What does the line of best fit predict about the increase in the minimum wage over the 70-year period?"（方程后空格+句点照原页；减号 U+2212）。
- **选项逐项**：
  - A "Each year between 1940 and 2010, the average increase in minimum wage was 0.096 dollars." ✓
  - B "Each year between 1940 and 2010, the average increase in minimum wage was 0.49 dollars." ✓（0.49 系把截距 −0.488 绝对值当增速）
  - C "Every 10 years between 1940 and 2010, the average increase in minimum wage was 0.096 dollars." ✓（把年化增速错成十年）
  - D "Every 10 years between 1940 and 2010, the average increase in minimum wage was 0.488 dollars." ✓
- **图表↔spec**：`figSpec.chart`，`series[0] kind:points`（8 个点目读近似），`series[1] kind:line` 过 (0,−0.488)、(80,7.192)，即方程本身。
- **独立复算**：斜率 0.096 美元/年 = 每年平均增 0.096；截距 −0.488 是外推零点，不是增速；每 10 年应增 0.96。选 A。
- **结论**：A，逐字已核。

### #2 · R03-182 · mcq · D · p13 右（书页 127）
- **原页定位**：p13.jpg 右半页下部，散点图 "Ice Cream Sales"，横轴 Temperature (°C)（10–26，步长 2），纵轴 Sales (dollars)（300–1,000，步长 100），12 个点+拟合线。
- **逐字核对**："The scatterplot above shows a company's ice cream sales d, in dollars, and the high temperature t, in degrees Celsius (°C), on 12 different days. A line of best fit for the data is also shown. Which of the following could be an equation of the line of best fit?"（°C、company's 撇号照录）。
- **选项逐项**：A "d = 0.03t + 402" ✓；B "d = 10t + 402" ✓；C "d = 33t + 300" ✓；D "d = 33t + 84" ✓。
- **图表↔spec**：`kind:points`（12 点目读近似）+ `kind:line` 过 (10,414)、(26,942)。
- **独立复算**：D：t=12 → 33×12+84=480；t=26 → 33×26+84=942，与图上首尾点吻合；A 斜率 0.03、B 斜率 10 远小于图中升幅，C 截距 300 与图线纵截（约 400+）不符。选 D。
- **结论**：D，逐字已核。

### #3 · R03-183 · grid · 4.5 · p14 左（书页 128）
- **原页定位**：p14.jpg 左半页上部，散点图无拟合线，横轴 Days after January 11（0–10，步长 2），纵轴 Length of time (hours)（0–16，步长 2）。
- **逐字核对**："The scatterplot shows the relationship between the length of time y, in hours, a certain bird spent in flight and the number of days after January 11, x.\nWhat is the average rate of change, in hours per day, of the length of time the bird spent in flight on January 13 to the length of time the bird spent in flight on January 15?"
- **选项逐项**：grid，无选项。
- **图表↔spec**：`kind:points` 10 点目读近似（第 2 天 y=6、第 4 天 y=15 为计算锚点）。
- **独立复算**：Jan 11 = day 0；Jan 13 = day 2（y=6）；Jan 15 = day 4（y=15）；平均变化率 = (15−6)/(4−2) = 9/2 = 4.5 小时/天。
- **结论**：value=4.5，逐字已核。

### #4 · R03-184 · grid · 285 · p14 左（书页 128）
- **原页定位**：p14.jpg 左半页下部，散点图 "Number of Beach Visitors versus Temperature"，横轴 Average temperature (°C)（25–35，步长 1），纵轴 Number of people（0–640，步长 80），11 点+拟合线。
- **逐字核对**："Each dot in the scatterplot above represents the temperature and the number of people who visited a beach in Lagos, Nigeria, on one of eleven different days. The line of best fit for the data is also shown. The line of best fit for the data has a slope of approximately 57. According to this estimate, how many additional people per day are predicted to visit the beach for each 5°C increase in average temperature?"（题面两次出现 "The line of best fit for the data"，照录不删）。
- **选项逐项**：grid，无选项。
- **图表↔spec**：`kind:points`（11 点目读）+ `kind:line` 过 (25,80)、(35,650)，斜率 57。
- **独立复算**：57 人/°C × 5°C = 285 人。
- **结论**：value=285，逐字已核。

### #5 · R03-185 · mcq · A · p14 右（书页 129）
- **原页定位**：p14.jpg 右半页上部，指数衰减散点+曲线，横轴 x（0–14，步长 2），纵轴 y（0–140，步长 20）。
- **逐字核对**："The scatterplot shows the relationship between two variables, x and y. An equation for the exponential model shown can be written as y = a(b)^{x}, where a and b are positive constants. Which of the following is closest to the value of b?"（上标 `^{x}` 照 spec §3 写法）。
- **选项逐项**：A "0.83" ✓；B "1.83" ✓；C "18.36" ✓；D "126.35" ✓。
- **图表↔spec**：`kind:exp`，a=127、b=0.83（x=0 截距≈127，衰减）。
- **独立复算**：曲线随 x 增大下降 → b<1，四选项中仅 A=0.83<1；B>1 为增长，C/D 是量级常数非底数。选 A。
- **结论**：A，逐字已核。

### #6 · R03-186 · mcq · D · p14 右（书页 129）
- **原页定位**：p14.jpg 右半页下部，散点图 "Electric Energy Generated by Nuclear Sources"，横轴 Time (years)（0–12，步长 2），纵轴 Energy (million megawatt-hours)（700–820，步长 20），无拟合线。
- **逐字核对**："The scatterplot below shows the amount of electric energy generated, in millions of megawatt-hours, by nuclear sources over a 10-year period.\nOf the following equations, which best models the data in the scatterplot?"
- **选项逐项**：
  - A "y = 1.674x^{2} + 19.76x − 745.73" ✓（开口向上+负截距）
  - B "y = −1.674x^{2} − 19.76x − 745.73" ✓（开口向下但截距 −745.73，起点在图外下方）
  - C "y = 1.674x^{2} + 19.76x + 745.73" ✓（开口向上）
  - D "y = −1.674x^{2} + 19.76x + 745.73" ✓（开口向下+正截距）
- **图表↔spec**：`kind:points` 10 点目读近似（x=1→762 … x=11→766，先升后降，顶点约 x=5.9）。
- **独立复算**：云团先升后降 → 二次项系数为负（排除 A/C）；x=0 附近值≈750–760 → 截距应为正 745.73（排除 B 的 −745.73）；D 顶点 x=−19.76/(2×−1.674)≈5.9，与图中峰值位置一致。选 D。
- **结论**：D，逐字已核。

### #7 · R03-187 · mcq · B · p15 左（书页 130）
- **原页定位**：p15.jpg 左半页上部，散点图 "Size and Sale Price of Houses in Town H"，横轴 Size (thousands of square feet)（0–3，步长 1），纵轴 Sale price (thousands of dollars)（0–400，步长 50），25 点无拟合线。
- **逐字核对**："The scatterplot above shows the size x and the sale price y of 25 houses for sale in Town H. Which of the following could be an equation for a line of best fit for the data?"
- **选项逐项**：A "y = 200x + 100" ✓；B "y = 100x + 100" ✓；C "y = 50x + 100" ✓；D "y = 100x" ✓。
- **图表↔spec**：`kind:points` 25 点目读近似。
- **独立复算**：云团中心带：x≈1 → y≈200，x≈2 → y≈300，x≈3 → y≈400，斜率≈100、截距≈100 → B；A 斜率 200 过陡，C 斜率 50 过平，D 过原点无截距。选 B。
- **结论**：B，逐字已核。

### #8 · R03-188 · mcq · A · p15 中栏（书页 130）
- **原页定位**：p15.jpg 左半页中栏，双行投资表（无图）。
- **逐字核对**："Two investments were made as shown in the table above. The interest in Account A is compounded once per year. Which of the following is true about the investments?"
- **选项逐项**：
  - A "Account A always earns more money per year than Account B." ✓
  - B "Account A always earns less money per year than Account B." ✓
  - C "Account A earns more money per year than Account B at first but eventually earns less money per year." ✓
  - D "Account A earns less money per year than Account B at first but eventually earns more money per year." ✓
- **表格↔spec**：`figSpec.table`，head ["","Amount invested","Balance increase"]；rows：Account A / $500 / 6% annual interest；Account B / $1,000 / $25 per year。
- **独立复算**：A 首年利息 = 500×0.06 = $30 > B 的 $25；A 按年复利，利息逐年增大（30→31.8→…），永远 >25。选 A。
- **结论**：A，逐字已核。

### #9 · R03-189 · mcq · D · p15 右（书页 131）
- **原页定位**：p15.jpg 右半页上部，纯文字题（无图）。
- **逐字核对**："For x > 0, the function f is defined as follows:\nf(x) equals 201% of x\nWhich of the following could describe this function?"（定义块行末无句点，照录；`x > 0` 照原页）。
- **选项逐项**：A "Decreasing exponential" ✓；B "Decreasing linear" ✓；C "Increasing exponential" ✓；D "Increasing linear" ✓。
- **图表↔spec**：无 figSpec。
- **独立复算**：f(x) = 201% of x = 2.01x，正比例线性、斜率为正 → Increasing linear。选 D。
- **结论**：D，逐字已核。

### #10 · R03-190 · mcq · A · p15 右（书页 131）
- **原页定位**：p15.jpg 右半页中部，散点图 data set A，横轴 x（0–45，步长 15），纵轴 y（0–60，步长 15），含拟合线。
- **逐字核对**："The scatterplot shows the relationship between two variables, x and y, for data set A. A line of best fit for the data is also shown. Data set B is created by subtracting 9 units from the value of y for each data point from data set A. Which of the following is closest to the y-coordinate of the y-intercept of the line of best fit for data set B?"
- **选项逐项**：A "45.57" ✓；B "53" ✓；C "59.62" ✓；D "62.75" ✓。
- **图表↔spec**：`kind:points`（目读）+ `kind:line` 过 (0,54.57)、(40,24.3)（截距 54.57 目读）。
- **独立复算**：全体 y 减 9，直线平行下移 9 → 新截距 = A 的截距 −9；A 截距目读≈54.57（选项 C 59.62、B 53 均为未减或干扰值），54.57−9=45.57。选 A。
- **结论**：A，逐字已核。

### #11 · R03-191 · mcq · C · p15 右（书页 131）
- **原页定位**：p15.jpg 右半页上部（栏顶），散点图 "Total Protein and Total Fat for Eight Sandwiches"，横轴 Total protein (grams)（0–50，步长 10），纵轴 Total fat (grams)（0–80，步长 10），含拟合线。
- **逐字核对**："The scatterplot above shows the numbers of grams of both total protein and total fat for eight sandwiches on a restaurant menu. The line of best fit for the data is also shown. According to the line of best fit, which of the following is closest to the predicted increase in total fat, in grams, for every increase of 1 gram in total protein?"
- **选项逐项**：A "2.5" ✓；B "2.0" ✓；C "1.5" ✓；D "1.0" ✓。
- **图表↔spec**：`kind:points` 8 点目读 + `kind:line` 过 (10,14)、(48,69)。
- **独立复算**：斜率 = (69−14)/(48−10) = 55/38 ≈ 1.45，最接近 1.5。选 C。
- **结论**：C，逐字已核。

### #12 · R03-192 · mcq · A · p16 左（书页 132）
- **原页定位**：p16.jpg 左半页上部，散点图 data set E，横轴 x（0–20，步长 4），纵轴 y（0–50，步长 10），含拟合线。
- **逐字核对**："The scatterplot shows the relationship between two variables, x and y, for data set E. A line of best fit is shown. Data set F is created by multiplying the y-coordinate of each data point from data set E by 3.9. Which of the following could be an equation of a line of best fit for data set F?"
- **选项逐项**：A "y = 46.8 + 5.9x" ✓；B "y = 46.8 + 1.5x" ✓；C "y = 12 + 5.9x" ✓；D "y = 12 + 1.5x" ✓。
- **图表↔spec**：`kind:points` 10 点目读 + `kind:line` 过 (0,12)、(20,42)（E：截距 12、斜率 1.5）。
- **独立复算**：E 线 y=1.5x+12；y 坐标 ×3.9 → 新截距 12×3.9=46.8，新斜率 1.5×3.9=5.85≈5.9 → y=46.8+5.9x。选 A。
- **结论**：A，逐字已核。
