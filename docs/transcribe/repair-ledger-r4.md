# r4 修复包落库台账（2026-11-26）

> 配套落库器：`tools/apply_repair_pack.py`（幂等，可重跑）；输入归档：`docs/transcribe/r4/`。

> 裁定口径：不改题面去迁就答案；已判 MATCH 的题不动；`duplicate_of` 非活跃副本只落一次。


## 一、分批提交与线上版本

| 批次 | 内容 | 字段/条目 | commit | 测试 | 线上 `?v=` |
|---|---|---|---|---|---|
| 批1 stems | 整字段重录题干 | 33 字段 | `be6ee31ab5b171765e209b179a783eef154dc49b` | 163 pass / 0 fail | 4b4858dbc9aa |
| 批2 choices | 整字段重录选项（含 TD-42-10 补四选项） | 28 题 / 68 字段 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` | 165 pass / 0 fail | 600acaa88fbf |
| 批3 substring | find→replace 精确订正 | 32 字段 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` | 165 pass / 0 fail | b97dd65991d8 |
| 批4 tables | 表题/表头/列分组订正 | 11 题 / 12 字段 | `956ec21d3df2f374cb3aa452cf0c37e7be38c22c` | 165 pass / 0 fail | 97d9c7ffd4e1 |
| 批5 specs | 摘除误挂 spec/裁图 + spec 修订 | 19 摘除 + 6 修订 | `6567e31f40de0e9d00fc42b2df459e130e69d943` | 165 pass / 0 fail | 282a62d7a2c9 |
| 批6 answers | ANSWER_DIFF 答案订正（TD-42-10 grid→mcq） | 5 题 / 11 字段 | `525c75efa000ff5d75f5419f0004a2e8eac636cc` | 165 pass / 0 fail | 99646a218827 |

线上复核（codeload main + GitHub Pages 实抓，`Cache-Control: no-cache`）：题库总数 **1292**，`retired` **61**，`mergedInto` **1**，`hidden` **2**（section 级：2.6.T17 / 2.6.T18），`variant` **0**，与基线一致，本批未改动任何计数。


## 二、答案订正（ANSWER_DIFF，批6）

| id | 页源 | 订正前答案 | 订正后答案 | value | type | 依据页 | commit |
|---|---|---|---|---|---|---|---|
| TD-11-16 | 练习册 P11 · #16 | 7 | **42/5** | 8.4 | grid | p241 | `525c75efa000ff5d75f5419f0004a2e8eac636cc` |
| TD-11-18 | 练习册 P12 · #18 | -5/9 | **44/3** | 14.67 | grid | p241 | `525c75efa000ff5d75f5419f0004a2e8eac636cc` |
| TD-13-17 | 练习册 P35 · #17 | 4 | **17/4** | 4.25 | grid | p241 | `525c75efa000ff5d75f5419f0004a2e8eac636cc` |
| TD-21-33 | 练习册 P72 · #33 | 108 | **54/5** | 10.8 | grid | p242 | `525c75efa000ff5d75f5419f0004a2e8eac636cc` |
| TD-42-10 | 练习册 P207 · #10 | 13 | **A** | null | mcq | p245 | `525c75efa000ff5d75f5419f0004a2e8eac636cc` |

**ANSWER_CONFLICT（4 条，不改库）**：按 2026-11-26 裁定，以「题目来源书自带答案」为准，`答案 2.pdf`（Topic 题册答案）仅作交叉参考；这 4 条库内值本就等于自带答案，故未改数据。⚠️ r4 三份输入未枚举这 4 条的具体 id，本台账先记裁定类别；待审计清单回填后补 id 列。


## 三、题干重录（批1）

| id | 页源 | 字段 | 订正前 | 订正后 | 状态 | commit |
|---|---|---|---|---|---|---|
| SP1-073 | 01 册 · p12 · #15 | stem | What is the y-coordinate of the y-intercept of the graph of (3x/7) - (5y/9) = 2… | What is the y-coordinate of the y-intercept of the graph of 3x/7 = −5y/9 + 21 i… | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| SR-267 | 02 册 · p99 · #17 | stem | The expression (x^{-2}y^{1/2})/(1/(x^{3}y^{-1})), where x > 1 and y > 1, is ⏎ e… | The expression (x^{-2}y^{1/2})/(x^{1/3} y^{-1}), where x > 1 and y > 1, is equi… | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| TD-12-14 | legacy-a · p019 · #14 | stem | The solution to the given system of equations is (x, y). What is the value of 1… | (x-2)-8(y+3)=123 ⏎ (x-2)+8(y+3)=432 ⏎ The solution to the given system of equat… | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| TD-12-15 | legacy-a · p020 · #15 | stem | The solution to the given system of equations is (x, y). What is the value of x… | y=3x+9 ⏎ 3y=8x-6 ⏎ The solution to the given system of equations is (x, y). Wha… | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| TD-12-16 | legacy-a · p020 · #16 | stem | The solution to the given system of equations is (x, y). What is the value of 1… | 7/2 x + 5y = 32 ⏎ 3/2 x + 5y = 28 ⏎ The solution to the given system of equatio… | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| TD-12-17 | legacy-a · p021 · #17 | stem | The solution to the given system of equations is (x, y). What is the value of 6… | 8y = 9x + 15 ⏎ -8y = 7x - 19 ⏎ The solution to the given system of equations is… | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| TD-12-18 | legacy-a · p021 · #18 | stem | In the given system of equations, h is a constant. If the system has no solutio… | 4x - 16y = 16y + 9 ⏎ hy = 6 + 4x ⏎ In the given system of equations, h is a con… | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| TD-12-20 | legacy-a · p022 · #20 | stem | For each real number r, which of the following points lies on the graph of each… | 5x + 7y = 8 ⏎ 30x + 42y = 48 ⏎ For each real number r, which of the following p… | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| TD-12-21 | legacy-a · p023 · #21 | stem | How many solutions does the given system of equations have? | y = 5x ⏎ y = 2x + 2 ⏎ How many solutions does the given system of equations hav… | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| TD-12-24 | legacy-a · p024 · #24 | stem | One of the two equations in a system of linear equations is given. The system h… | 7x - 56y = 14 ⏎ One of the two equations in a system of linear equations is giv… | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| U1-08 | legacy-a · p028 · #2 | stem | The function T estimates the temperature, in degrees Fahrenheit (°F), in a cert… | T(x) = 61 - 8x ⏎ The function T estimates the temperature, in degrees Fahrenhei… | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| TD-13-10 | legacy-a · p032 · #10 | stem | A marine biologist uses the given equation to estimate the weight, w, of a matu… | w = 3,150 + 450l ⏎ A marine biologist uses the given equation to estimate the w… | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| TD-15-05 | legacy-a · p055 · #5 | stem | Which point (x, y) is a solution to the given system of inequalities in the xy-… | y ≤ x + 2 ⏎ y ≥ -5x - 3 ⏎ Which point (x, y) is a solution to the given system … | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| TD-25-12 | legacy-b · p124 · #12 | stem | What is the maximum value of the data set shown? | Data set: 128, 118, 116, 132, 119, 129, 127, 109, 124, 121, 112 ⏎ What is the m… | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| TD-25-15 | legacy-b · p127 · #15 | stem | The bar graph shows the number of trees planted for 4 separate plots of land on… | The bar graph shows the number of trees planted for 4 separate plots of land on… | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| TD-25-16 | legacy-b · p128 · #16 | stem | The bar graph shows the distribution of flower type for the 700 flowers that a … | The bar graph shows the distribution of flower type for the 700 flowers that a … | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| TD-25-18 | legacy-b · p129 · #18 | stem | Data set A: 8, 11, 12, 15, 21, 27 ⏎ Data set B: 9, 12, 13, 16, 22, h ⏎ Data set… | Data set A: 8, 11, 12, 15, 21, 27 ⏎ Data set B: 9, 12, 13, 16, 22, h ⏎ Data set… | source_verified | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| TD-25-20 | legacy-b · p130 · #20 | stem | What is the median of the data set shown? | Data set: 12, 12, 18, 24, 29 ⏎ What is the median of the data set shown? | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| TD-32-05 | legacy-b · p155 · #5 | stem | solution to the given system of equations is (x, y) = (a, b). Which of the foll… | y=(x-6)(x+9) ⏎ y=4x-24 ⏎ The solution to the given system of equations is (x, y… | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| TD-32-06 | legacy-b · p155 · #6 | stem | solution to the given system of equations is (x, y). What is a possible value o… | x + 33 = y ⏎ (x + 33)² = y ⏎ The solution to the given system of equations is (… | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| TD-32-07 | legacy-b · p156 · #7 | stem | At what point (x, y) do the graphs of the equations in the given system interse… | x + 5 = 11 ⏎ y = 3x² + 3 ⏎ At what point (x, y) do the graphs of the equations … | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| TD-32-08 | legacy-b · p156 · #8 | stem | In the given system of equations, k is a constant. The solution to given equati… | (x+1)/(5x²) = k/x ⏎ In the given system of equations, k is a constant. The solu… | source_verified | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| TD-32-09 | legacy-b · p156 · #9 | stem | In the given equation, r and s are positive constants. The product of the solut… | 33x² + (33s + r)x + rs = 0 ⏎ In the given equation, r and s are positive consta… | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| TD-32-16 | legacy-b · p159 · #16 | stem | At how many points do the graphs of the given equations intersect in the xy-pla… | y = (x-7)(3x+4) ⏎ x = 3y - 1 ⏎ At how many points do the graphs of the given eq… | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| TD-32-17 | legacy-b · p159 · #17 | stem | If the given equations are graphed in the xy-plane, at how many points do the g… | y = 10 ⏎ y = -4(x-10)² + 6 ⏎ If the given equations are graphed in the xy-plane… | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| TD-32-22 | legacy-b · p161 · #22 | stem | What is the greatest solution to the given equation? | -3x² - 7x + 9 = 0 ⏎ What is the greatest solution to the given equation? | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| U3-10 | legacy-b · p163 · #27 | stem | In the given system of equations, a is a positive integer constant. The system … | y = -0.5 ⏎ y = x² + 10x + a ⏎ In the given system of equations, a is a positive… | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| U3-11 | legacy-b · p163 · #28 | stem | In the given equation, b is a positive integer. The equation has no real soluti… | -4x² + bx - 25 = 0 ⏎ In the given equation, b is a positive integer. The equati… | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| TD-32-31 | legacy-b · p164 · #31 | stem | If x = 3V5 and 5x = v5y, what is the value ofy? | If x = 3√5 and 5x = √5y, what is the value of y? | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| U3-15 | legacy-b · p165 · #32 | stem | In the given system of equations, q is a positive constant. The graphs of the e… | y = -4x² - 47 ⏎ y = qx - 43 ⏎ In the given system of equations, q is a positive… | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| TD-35-13 | legacy-b · p195 · #13 | stem | The equation gives the estimated number of online newsletter subscribers at the… | y = 400(2)^{2x} ⏎ The equation gives the estimated number of online newsletter … | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| U1-05 | jiangyi · p13 · #3 | stem | The solution to the given system of equations is x, y. What is the value of 2x? | x + 3 = -2y + 5 ⏎ x - 3 = 2y + 7 ⏎ The solution to the given system of equation… | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |
| U2-06 | jiangyi · p62 · #16 | stem | The equation above models the number of members, M, of a gym t years after the … | M = 1,800(1.02)^t ⏎ The equation above models the number of members, M, of a gy… | 已落库 | `be6ee31ab5b171765e209b179a783eef154dc49b` |


## 四、选项重录（批2）

| id | 页源 | 字段 | 订正前 | 订正后 | 状态 | commit |
|---|---|---|---|---|---|---|
| SP1-029 | 01 册 · p07 · #4 | choice:D | 13 and 18 | 8 and 13 | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| SP1-031 | 01 册 · p08 · #6 | choice:A | x - 3 = 75 | x − 3 = −75 | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| SP1-031 | 01 册 · p08 · #6 | choice:C | 3 - x = 75 | 3 − x = −75 | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| SP1-059 | 01 册 · p11 · #1 | choice:B | (8r/7 + 9/7, r) | (−8r/7 + 9/7, r) | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| SP1-059 | 01 册 · p11 · #1 | choice:C | (8r/3 + 9/3, 8r/3 + 27/3) | (−8r/7 + 9, 8r/7 + 27) | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| SP1-059 | 01 册 · p11 · #1 | choice:D | (r + 9/3, r + 27/3) | (r/3 + 9, −r/3 + 27) | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| SP1-060 | 01 册 · p11 · #2 | choice:A | (r/5 - 7/2, -r/5 + 35) | (r/5 + 7, −r/5 + 35) | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| SP1-060 | 01 册 · p11 · #2 | choice:B | (-3r/2 - 7/2, r) | (−3r/2 + 7/2, r) | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| SP1-060 | 01 册 · p11 · #2 | choice:D | (r, -2r/3 + 7/3) | (r, −2r/3 + 7/2) | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| SP1-061 | 01 册 · p11 · #3 | choice:A | (r, -6r/7 - 5/7) | (r, −6r/7 + 5/7) | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| SP1-061 | 01 册 · p11 · #3 | choice:C | (r/4 + 5, r/4 + 20) | (r/4 + 5, −r/4 + 20) | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| SP1-061 | 01 册 · p11 · #3 | choice:D | (6r/7 + 5/7, -r) | (−6r/7 + 5/7, r) | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| SP1-062 | 01 册 · p11 · #4 | choice:A | (k, 2k - 3) | (t, 2t − 3) | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| SP1-062 | 01 册 · p11 · #4 | choice:B | (2k - 3, k) | (2t − 3, t) | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| SP1-062 | 01 册 · p11 · #4 | choice:C | (-k, 2k + 3) | (−t, 2t + 3) | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| SP1-062 | 01 册 · p11 · #4 | choice:D | (2k + 3, -k) | (2t + 3, −t) | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| SP1-068 | 01 册 · p12 · #10 | choice:D | y = 5x + 26 | y = 3x + 26 | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| SP1-081 | 01 册 · p13 · #23 | choice:B | 1/2 | −1/2 | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| SP1-103 | 01 册 · p15 · #45 | choice:D | (126d + 36, 0) | (126d + 26, 0) | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-14-26 | legacy-a · p048 · #26 | choice:D | (+c=28 0.35t + 0.15c = 21 | t+c=28; 0.35t+0.15c=21 | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-23-23 | legacy-a · p104 · #23 | choice:A | Each hour, the number of bacteria in the population is 16% greater than it was … | Each hour, the number of bacteria in the population is 16% greater than it was … | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-23-23 | legacy-a · p104 · #23 | choice:B | Each hour, the number of bacteria in the population is 1,600 greater than it wa… | Each hour, the number of bacteria in the population is 1,600 greater than it wa… | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-23-23 | legacy-a · p104 · #23 | choice:C | Each hour, the number of bacteria in the population is 1,600 less than it was t… | Each hour, the number of bacteria in the population is 1,600 less than it was t… | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-23-23 | legacy-a · p104 · #23 | choice:D | Each hour, the number of bacteria in the population is 16% less than it was the | Each hour, the number of bacteria in the population is 16% less than it was the… | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-23-24 | legacy-a · p104 · #24 | choice:A | g(x) = k(1.83)^{x} | g(x) = k(1.83^x)^{1/4} | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-23-24 | legacy-a · p104 · #24 | choice:B | g(x) = k(1.83)^{x+1} | g(x) = k(1.83^x)^4 | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-23-24 | legacy-a · p104 · #24 | choice:C | g(x) = k(1.83)^{x+4} | g(x) = k(1.83)^{x+1/4} | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-23-24 | legacy-a · p104 · #24 | choice:D | g(x) = k(1.83)^{4x} | g(x) = k(1.83)^{x-1/4} | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-23-25 | legacy-a · p105 · #25 | choice:B | 1.155 | 1 | source_doubt | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-23-25 | legacy-a · p105 · #25 | choice:D | 115.5 | 15.5 | source_doubt | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-24-09 | legacy-a · p112 · #9 | choice:A | 5,100 | 1/5,100 | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-25-17 | legacy-b · p129 · #17 | choice:D | There is no value of k such that the standard deviation of data set B will be l… | There is no value of k such that the standard deviation of data set B will be l… | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-31-09 | legacy-b · p139 · #9 | choice:B | 12x^{3}y + 5y | 12x²y + 5y | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-31-09 | legacy-b · p139 · #9 | choice:C | 12x^{2}y + 30xy^{2} | 12x²y + 30xy | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-32-25 | legacy-b · p162 · #25 | choice:A | x-22=0 | x² - 22 = 0 | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-32-25 | legacy-b · p162 · #25 | choice:B | x-11x=0 | x² - 11x = 0 | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-32-25 | legacy-b · p162 · #25 | choice:C | x- 11x + 121=0 | x² - 11x + 121 = 0 | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-32-25 | legacy-b · p162 · #25 | choice:D | x - 22x + 121 = 0 | x² - 22x + 121 = 0 | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-33-13 | legacy-b · p171 · #13 | choice:B | x: -1, 0, 1; q(x): 63, 21, 7 | x: -1, 0, 1; q(x): 1/7, 21, 63 | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-33-13 | legacy-b · p171 · #13 | choice:D | x: -1, 0, 1; q(x): 63, 3, 1/7 | x: -1, 0, 1; q(x): -63, 3, 63 | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-33-20 | legacy-b · p176 · #20 | choice:B | ⅖ | 4/5 | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-35-01 | legacy-b · p188 · #1 | choice:A | 5 years after the company started selling clothes online, its predicted annual … | 5 years after the company started selling clothes online, its predicted annual … | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-35-01 | legacy-b · p188 · #1 | choice:B | 5 years after the company started selling clothes online, its predicted annual … | 5 years after the company started selling clothes online, its predicted annual … | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-35-01 | legacy-b · p188 · #1 | choice:C | When the company's predicted annual revenue is approximately 648,650 dollars, it | When the company's predicted annual revenue is approximately 648,650 dollars, i… | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-35-01 | legacy-b · p188 · #1 | choice:D | When the company's predicted annual revenue is approximately 648,650 dollars, it | When the company's predicted annual revenue is approximately 648,650 dollars, i… | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-35-04 | legacy-b · p189 · #4 | choice:A | The company's estimated stock price increased $73 every day after the company | The company's estimated stock price increased $73 every day after the company w… | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-35-04 | legacy-b · p189 · #4 | choice:B | The company's estimated stock price increased $1 every 73 days after the company | The company's estimated stock price increased $1 every 73 days after the compan… | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-35-12 | legacy-b · p194 · #12 | choice:A | The estimated number of online newsletter subscribers at the end of the first | The estimated number of online newsletter subscribers at the end of the first s… | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-35-12 | legacy-b · p194 · #12 | choice:B | The estimated number of online newsletter subscribers increased every six months | The estimated number of online newsletter subscribers increased every six month… | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-35-12 | legacy-b · p194 · #12 | choice:C | The estimated number of online newsletter subscribers at the end of January 1993 | The estimated number of online newsletter subscribers at the end of January 199… | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-35-12 | legacy-b · p194 · #12 | choice:D | The estimated number of online newsletter subscribers increased by 750 at the e… | The estimated number of online newsletter subscribers increased by 750 at the e… | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-35-13 | legacy-b · p195 · #13 | choice:A | The estimated number of online newsletter subscribers at the end of the first | The estimated number of online newsletter subscribers at the end of the first s… | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-35-13 | legacy-b · p195 · #13 | choice:B | The estimated number of online newsletter subscribers at the end of January 1993 | The estimated number of online newsletter subscribers at the end of January 199… | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-35-13 | legacy-b · p195 · #13 | choice:C | The estimated number of online newsletter subscribers at the end of January 1994 | The estimated number of online newsletter subscribers at the end of January 199… | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-35-13 | legacy-b · p195 · #13 | choice:D | The estimated number of online newsletter subscribers at the end of January 1993 | The estimated number of online newsletter subscribers at the end of January 199… | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-35-15 | legacy-b · p196 · #15 | choice:A | The population of the town is estimated to be approximately 5 greater in 1956 t… | The population of the town is estimated to be approximately 5 greater in 1956 t… | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-35-15 | legacy-b · p196 · #15 | choice:C | The population of the town is estimated to be approximately 5 times greater in | The population of the town is estimated to be approximately 5 times greater in … | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-35-15 | legacy-b · p196 · #15 | choice:D | The population of the town is estimated to increase by approximately 563 every 5 | The population of the town is estimated to increase by approximately 563 every … | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-35-16 | legacy-b · p197 · #16 | choice:A | 2 minutes after the seal dives into the water, its estimated depth is 170 meters | 2 minutes after the seal dives into the water, its estimated depth is 170 meter… | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-35-16 | legacy-b · p197 · #16 | choice:D | 170 minutes after the seal dives into the water, its estimated depth is 2 meters | 170 minutes after the seal dives into the water, its estimated depth is 2 meter… | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-42-10 | legacy-b · p207 · #10 | choice:A | — | 13 | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-42-10 | legacy-b · p207 · #10 | choice:B | — | 13√2 | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-42-10 | legacy-b · p207 · #10 | choice:C | — | 26 | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-42-10 | legacy-b · p207 · #10 | choice:D | — | 26√2 | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-42-23 | legacy-b · p213 · #23 | choice:B | 9V2 | 9√2 | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-42-23 | legacy-b · p213 · #23 | choice:D | 18V2 | 18√2 | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-44-17 | legacy-b · p232 · #17 | choice:B | sin 58° | 14/sin 58° | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |
| TD-44-17 | legacy-b · p232 · #17 | choice:D | cos 58° | 14/cos 58° | 已落库 | `b0c6b247e94aa3007636fba1de8758d892ba2ddf` |


## 五、子串精确订正（批3）

| id | 页源 | 字段 | 订正前 | 订正后 | 状态 | commit |
|---|---|---|---|---|---|---|
| SP1-019 | 01 册 · p06 · #19 | stem | In the given equations, g and k are constants. | In the given system of equations, g and k are constants. | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| SP1-029 | 01 册 · p07 · #4 | stem | (x − 5)/3 | (x+6)/3 | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| SP1-050 | 01 册 · p09 · #3 | stem | g(x) = mx + b | g(x) = −mx + b | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| SP1-062 | 01 册 · p11 · #4 | stem | For each real number r, | For each real number t, | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| SP1-084 | 01 册 · p13 · #26 | stem | Line ℓ | Line j | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| SP1-085 | 01 册 · p13 · #27 | stem | Line ℓ | Line j | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| SP1-112 | 01 册 · p17 · #9 | stem | best interpretation of 11x | best interpretation of 14y | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| R03-142 | 03 册 · 03-p12 · #22 | stem | 6, 7, 7, 8 ⏎  | 6, 7, 7, 8, 8 ⏎  | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| R03-302 | 03 册 · 03-p18 · #2 | stem | The average eighth-grade class size in the state is 26. The students in | The average eighth-grade class size in the state is 26. If the students in | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| R03-309 | 03 册 · 03-p19 · #9 | stem | Assuming the margin of error | Assuming the margins of error | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| SR-186 | 02 册 · p78 · #21 | stem | Odaliys | Odalys | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| SR-224 | 02 册 · p88 · #59 | stem | a number x, | a number, x, | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| TD-14-31 | legacy-a · p050 · #31 | choice:D | 72≤14+X≤77 | 72≤14+x≤77 | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| TD-16-05 | legacy-a · p058 · #5 | stem | -4\|x - 8\| | -\|x - 8\| | source_doubt | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| TD-22-15 | legacy-a · p090 · #15 | stem |  5 67 8 9 10x |  | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| TD-22-17 | legacy-a · p092 · #17 | choice:A | O | 0 | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| TD-23-18 | legacy-a · p101 · #18 | stem | P(t) = 260(1.03) (2) | P(t) = 260(1.03)^{(3/2)t} | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| TD-23-24 | legacy-a · p104 · #24 | stem | increase of x by 1. | increase of x by 1/4. | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| TD-25-06 | legacy-b · p121 · #6 | stem | Orbital period (days)  |  | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| TD-25-07 | legacy-b · p122 · #7 | stem | Capacity (UF)  |  | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| TD-31-04 | legacy-b · p137 · #4 | stem | ak/11 = b/(14 + m) | ak = (b/11)(14 + m) | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| TD-32-13 | legacy-b · p158 · #13 | stem | x= 2,601 | x² = 2,601 ⏎  | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| TD-32-14 | legacy-b · p158 · #14 | stem | (x + 8)^{2} = -256 | (x + 81)^{2} = -256 | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| TD-32-33 | legacy-b · p165 · #33 | choice:C | 13 8F | 13 | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| TD-33-10 | legacy-b · p170 · #10 | stem | f(x)-0 | f(x)=0 | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| TD-33-11 | legacy-b · p170 · #11 | stem | y=-100x +800x+8,400 | y=-100x²+800x+8,400 | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| TD-33-20 | legacy-b · p176 · #20 | stem | y = x+4 + k | y = (x+4)/(x+5) + k | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| U3-20 | legacy-b · p178 · #26 | stem | Function fis | Function f is | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| TD-33-28 | legacy-b · p179 · #28 | stem | value off(-2)-f(O) | value of f(-2)-f(0) | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| TD-41-01 | legacy-b · p200 · #1 | stem | line I | line l | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| TD-42-23 | legacy-b · p213 · #23 | stem | 18 + 18V2 | 18 + 18√2 | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |
| TD-43-14 | legacy-b · p220 · #14 | stem | 80pi cm^3 | 80π cm³ | 已落库 | `28d85dfdedda874bb163b88c3bfacc2d906fc86f` |


## 六、表格题订正（批4）

| id | 页源 | 字段 | 订正前 | 订正后 | 状态 | commit |
|---|---|---|---|---|---|---|
| R03-001 | 03 册 · 03-p02 · #1 | table.head[1] | Growth factor | Growthfactor | 已落库 | `956ec21d3df2f374cb3aa452cf0c37e7be38c22c` |
| SR-126 | 02 册 · p62 · #42 | table.caption | — | Growth of a Culture of Bacteria | 已落库 | `956ec21d3df2f374cb3aa452cf0c37e7be38c22c` |
| SR-176 | 02 册 · p75 · #11 | table.caption | — | Energy per Gram of Typical Macronutrients | 已落库 | `956ec21d3df2f374cb3aa452cf0c37e7be38c22c` |
| R03-062 | 03 册 · 03-p04 | table.caption | — | Climate Preferences | 已落库 | `956ec21d3df2f374cb3aa452cf0c37e7be38c22c` |
| R03-135 | 03 册 · 03-p11 | table.caption | — | Percent of Residents Who Earned a Bachelor's Degree or Higher | 已落库 | `956ec21d3df2f374cb3aa452cf0c37e7be38c22c` |
| R03-301 | 03 册 · 03-p18 | table.caption | — | Views on Nuclear Energy Use | 已落库 | `956ec21d3df2f374cb3aa452cf0c37e7be38c22c` |
| R03-303 | 03 册 · 03-p18 | table.caption | — | Poll Results | 已落库 | `956ec21d3df2f374cb3aa452cf0c37e7be38c22c` |
| SR-215 | 02 册 · p85 | table.caption | — | Townsend Realty Group Investments | 已落库 | `956ec21d3df2f374cb3aa452cf0c37e7be38c22c` |
| R03-002 | 03 册 · 03-p02 | table.headGroups | — | {'title': 'Power capacity', 'columns': ['Low', 'Medium', 'High', 'Total']} | 已落库 | `956ec21d3df2f374cb3aa452cf0c37e7be38c22c` |
| R03-136 | 03 册 · 03-p11 | table.headGroups | — | {'title': 'Score Frequencies', 'columns': ['Group A', 'Group B']} | 已落库 | `956ec21d3df2f374cb3aa452cf0c37e7be38c22c` |
| R03-361 | 03 册 · 03-p19 | table.headGroups | — | {'title': 'Number of points per round', 'columns': ['6 to 13 points', '14 or mo… | 已落库 | `956ec21d3df2f374cb3aa452cf0c37e7be38c22c` |
| R03-062 | 03 册 · 03-p04 | table.head[0] | Age group |  | 已落库 | `956ec21d3df2f374cb3aa452cf0c37e7be38c22c` |


## 七、spec 摘除与修订（批5）

| id | 页源 | 字段 | 订正前 | 订正后 | 状态 | commit |
|---|---|---|---|---|---|---|
| SR-059 | 02 册 · p44 · #12 | figure.spec | {'type': 'chart', 'x': {'min': -2, 'max': 10, 'step': 2, 'label': 'x'}, 'y': {'… | {"x": {"min": 0, "max": 9, "step": 1, "label": "x"}, "y": {"min": 0, "max": 12,… | 已落库 | `6567e31f40de0e9d00fc42b2df459e130e69d943` |
| SR-059 | 02 册 · p44 · #12 | figure.spec | {'type': 'chart', 'x': {'min': -2, 'max': 10, 'step': 2, 'label': 'x'}, 'y': {'… | {"addMark": {"x": 6.3, "y": 8.2, "label": "y = f(x)", "leader": true}} | 已落库 | `6567e31f40de0e9d00fc42b2df459e130e69d943` |
| SR-059 | 02 册 · p44 · #12 | figure.spec | {'type': 'chart', 'x': {'min': -2, 'max': 10, 'step': 2, 'label': 'x'}, 'y': {'… | {"removeMark": {"x": 4, "y": 10, "label": "vertex"}} | 已落库 | `6567e31f40de0e9d00fc42b2df459e130e69d943` |
| SR-067 | 02 册 · p46 · #2 | figure.spec | 误挂 spec/裁图注册 | 已摘除注册条目 | 已落库 | `6567e31f40de0e9d00fc42b2df459e130e69d943` |
| SR-085 | 02 册 · p50 · #1 | figure.spec | 误挂 spec/裁图注册 | 已摘除注册条目 | 已落库 | `6567e31f40de0e9d00fc42b2df459e130e69d943` |
| SR-086 | 02 册 · p50 · #2 | figure.spec | 误挂 spec/裁图注册 | 已摘除注册条目 | 已落库 | `6567e31f40de0e9d00fc42b2df459e130e69d943` |
| SR-129 | 02 册 · p63 · #45 | figure.spec | {'type': 'chart', 'x': {'min': 0, 'max': 80, 'step': 10, 'label': 'Time (minute… | {"removeMarks": [{"x": 34, "y": 20, "label": "20"}, {"x": 49, "y": 30, "label":… | 已落库 | `6567e31f40de0e9d00fc42b2df459e130e69d943` |
| SR-164 | 02 册 · p72 · #25 | figure.spec | 误挂 spec/裁图注册 | 已摘除注册条目 | 已落库 | `6567e31f40de0e9d00fc42b2df459e130e69d943` |
| SR-185 | 02 册 · p78 · #20 | figure.spec | {'type': 'chart', 'x': {'min': 0, 'max': 20, 'step': 5, 'label': 'Number of hou… | {"y": {"min": 0, "max": 10, "step": 5, "label": "Number of hours at job B"}} | 已落库 | `6567e31f40de0e9d00fc42b2df459e130e69d943` |
| SR-187 | 02 册 · p78 · #22 | figure.spec | {'type': 'chart', 'x': {'min': 0, 'max': 100, 'step': 10, 'label': 'Shares of C… | {"x": {"label": "Company A"}, "y": {"label": "Company B"}} | 已落库 | `6567e31f40de0e9d00fc42b2df459e130e69d943` |
| TD-11-24 | legacy-a · p015 · #24 | figure.spec | 误挂 spec/裁图注册 | 已摘除注册条目 | 已落库 | `6567e31f40de0e9d00fc42b2df459e130e69d943` |
| TD-16-04 | legacy-a · p058 · #4 | figure.spec | 误挂 spec/裁图注册 | 已摘除注册条目 | 已落库 | `6567e31f40de0e9d00fc42b2df459e130e69d943` |
| TD-16-05 | legacy-a · p058 · #5 | figure.spec | 误挂 spec/裁图注册 | 已摘除注册条目 | source_doubt | `6567e31f40de0e9d00fc42b2df459e130e69d943` |
| TD-21-18 | legacy-a · p067 · #18 | figure.spec | 误挂 spec/裁图注册 | 已摘除注册条目 | 已落库 | `6567e31f40de0e9d00fc42b2df459e130e69d943` |
| TD-21-19 | legacy-a · p067 · #19 | figure.spec | 误挂 spec/裁图注册 | 已摘除注册条目 | 已落库 | `6567e31f40de0e9d00fc42b2df459e130e69d943` |
| TD-21-26 | legacy-a · p069 · #26 | figure.spec | 误挂 spec/裁图注册 | 已摘除注册条目 | 已落库 | `6567e31f40de0e9d00fc42b2df459e130e69d943` |
| TD-21-27 | legacy-a · p069 · #27 | figure.spec | 误挂 spec/裁图注册 | 已摘除注册条目 | 已落库 | `6567e31f40de0e9d00fc42b2df459e130e69d943` |
| TD-21-31 | legacy-a · p071 · #31 | figure.spec | 误挂 spec/裁图注册 | 已摘除注册条目 | 已落库 | `6567e31f40de0e9d00fc42b2df459e130e69d943` |
| TD-21-32 | legacy-a · p071 · #32 | figure.spec | 误挂 spec/裁图注册 | 已摘除注册条目 | 已落库 | `6567e31f40de0e9d00fc42b2df459e130e69d943` |
| TD-23-13 | legacy-a · p099 · #13 | figure.spec | 误挂 spec/裁图注册 | 已摘除注册条目 | 已落库 | `6567e31f40de0e9d00fc42b2df459e130e69d943` |
| U2-09 | legacy-a · p106 · #3 | figure.spec | 误挂 spec/裁图注册 | 已摘除注册条目 | 已落库 | `6567e31f40de0e9d00fc42b2df459e130e69d943` |
| TD-24-09 | legacy-a · p112 · #9 | figure.spec | 误挂 spec/裁图注册 | 已摘除注册条目 | 已落库 | `6567e31f40de0e9d00fc42b2df459e130e69d943` |
| TD-24-10 | legacy-a · p112 · #10 | figure.spec | 误挂 spec/裁图注册 | 已摘除注册条目 | 已落库 | `6567e31f40de0e9d00fc42b2df459e130e69d943` |
| TD-33-08 | legacy-b · p169 · #8 | figure.spec | 误挂 spec/裁图注册 | 已摘除注册条目 | 已落库 | `6567e31f40de0e9d00fc42b2df459e130e69d943` |
| TD-34-03 | legacy-b · p181 · #3 | figure.spec | 误挂 spec/裁图注册 | 已摘除注册条目 | 已落库 | `6567e31f40de0e9d00fc42b2df459e130e69d943` |


## 八、待办（本批不落数据）

### 8.1 缺图待重画（redraw_figure，patch=null）

| id | 页源 | 说明 |
|---|---|---|
| R04-080 | 04 册 · p08 · #20 | 原页有图而数据侧无矢量 spec 也无裁剪图，图形未入库；需按原页结构重画（见原页结构描述），补入 figSpec 与裁剪图。 |
| R04-081 | 04 册 · p08 · #21 | 原页有图而数据侧无矢量 spec 也无裁剪图，图形未入库；需按原页结构重画（见原页结构描述），补入 figSpec 与裁剪图。 |
| R04-082 | 04 册 · p08 · #22 | 原页有图而数据侧无矢量 spec 也无裁剪图，图形未入库；需按原页结构重画（见原页结构描述），补入 figSpec 与裁剪图。 |
| R04-083 | 04 册 · p08 · #23 | 原页有图而数据侧无矢量 spec 也无裁剪图，图形未入库；需按原页结构重画（见原页结构描述），补入 figSpec 与裁剪图。 |
| R04-084 | 04 册 · p08 · #24 | 原页有图而数据侧无矢量 spec 也无裁剪图，图形未入库；需按原页结构重画（见原页结构描述），补入 figSpec 与裁剪图。 |
| R04-087 | 04 册 · p09 · #27 | 原页有图而数据侧无矢量 spec 也无裁剪图，图形未入库；需按原页结构重画（见原页结构描述），补入 figSpec 与裁剪图。 |
| R04-088 | 04 册 · p09 · #28 | 原页有图而数据侧无矢量 spec 也无裁剪图，图形未入库；需按原页结构重画（见原页结构描述），补入 figSpec 与裁剪图。 |
| R04-089 | 04 册 · p09 · #29 | 原页有图而数据侧无矢量 spec 也无裁剪图，图形未入库；需按原页结构重画（见原页结构描述），补入 figSpec 与裁剪图。 |
| TD-25-06 | legacy-b · p121 · #6 | 原页点状图未入库；按原页重画：横轴 720–732（步长 2），13 颗木星卫星轨道周期散点，图题 Orbital period (days)。 |
| TD-33-18 | legacy-b · p174 · #18 | 裁剪图仅含 A、C；B（递减直线）、D（递减指数曲线）未入库，按原页补画选项图。 |

### 8.2 缺表待补（add_table_spec，patch=null）

| id | 页源 | 说明 |
|---|---|---|
| U2-12 | legacy-a · p118 · #1 | 原页有表而数据侧表未入库（text.figure=[]，无 spec/裁剪）；表体：UV index 1→9 天、2→15 天、3→12 天、4→13 天，合计 49 天；题干与… |

### 8.3 锚点订正（anchor，不动数据）

| id | 页源 | 说明 |
|---|---|---|
| TD-41-02 | legacy-b · p201 · #2 | 锚点页码错位：原页 p201 无第 2 题，本条应归属 p200#2；题干与裁剪图与 p200#2 一致。 |

### 8.4 台账标记 noop（不改题面，落库前回看原页）

| id | 页源 | 状态 | 说明 |
|---|---|---|---|
| R03-144 | 03 册 · 03-p12 · #24 | 已落库(noop) | 台账判定：原页单位作 uF，数据题干/选项记 µF，属同一单位的字形标准化，不强制回改 uF。落库前回看原页确认印刷符号；若原页确为 uF 再行订正，否则保持 µF。 |
| TD-24-04 | legacy-a · p107 · #4 | source_doubt | 原页疑错印 "is participant"，数据写作 "a participant"；不改题面迁就，落库前回看原页确认是错印还是转写错误。表格裁图与原页一致。 |
| TD-24-07 | legacy-a · p110 · #7 | source_doubt | 原页漏印连词 or，数据已补回 "north or south"；无需改动，落库前回看原页确认漏印。表格与选项一致。 |
