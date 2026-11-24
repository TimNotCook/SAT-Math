/* 讲义复习题库（独立文件，不并入 questions.js）。
   来源：SAT 备考计划数学讲义（196 页），习题区；答案一律照抄答案页 p191–196，
   不自己算、不补、不猜。答案页上查不到题号的段落（含全部 Example 例题）不录。

   字段（固定，测试 test/jiangyi.test.js 会逐条检查）：
     id       JY{单元号}-{三位序号}，与现有 U1-01 那套完全不混号
     unit     1–4
     section  真实小节号 1.1–4.5
     no       页内题号（原书该页上的编号）
     page     讲义印刷页码
     source   "讲义 p{page} #{no}" 三段齐全
     type     mcq | grid
     stem / choices / answer / value
     table    可选，[["x","g (x)"],["2","-4"],...] 用真表格渲染，不用截图
     fig      可选，矢量 spec 的键（见 data/jiangyi_figures.js）

   各节 declared 数 = 答案页该节最大题号；已录必须等于它，差一道不算完成。 */

window.JY_SECTIONS = [
  {"section":"1.1","unit":1,"unitCn":"U1 Algebra","cn":"线性方程与函数图像","declared":9,"pages":[6,12],"answerPage":191},
  {"section":"1.2","unit":1,"unitCn":"U1 Algebra","cn":"一元线性方程求解","declared":11,"pages":[13,18],"answerPage":191},
  {"section":"1.3","unit":1,"unitCn":"U1 Algebra","cn":"线性函数与方程解读","declared":8,"pages":[19,23],"answerPage":191},
  {"section":"1.4","unit":1,"unitCn":"U1 Algebra","cn":"线性方程与不等式应用题","declared":11,"pages":[24,28],"answerPage":191},
  {"section":"1.5","unit":1,"unitCn":"U1 Algebra","cn":"线性不等式与图像","declared":6,"pages":[29,35],"answerPage":192},
  {"section":"1.6","unit":1,"unitCn":"U1 Algebra","cn":"绝对值与方程","declared":4,"pages":[36,38],"answerPage":192},
  {"section":"2.1","unit":2,"unitCn":"U2 Problem Solving and Data Analysis","cn":"比率、比例、百分比与单位换算","declared":13,"pages":[39,44],"answerPage":192},
  {"section":"2.2","unit":2,"unitCn":"U2 Problem Solving and Data Analysis","cn":"散点图与表格图像","declared":9,"pages":[45,53],"answerPage":192},
  {"section":"2.3","unit":2,"unitCn":"U2 Problem Solving and Data Analysis","cn":"线性与指数关系","declared":19,"pages":[54,65],"answerPage":193},
  {"section":"2.4","unit":2,"unitCn":"U2 Problem Solving and Data Analysis","cn":"概率与条件概率","declared":3,"pages":[66,69],"answerPage":193},
  {"section":"2.5","unit":2,"unitCn":"U2 Problem Solving and Data Analysis","cn":"数据分析：集中趋势与离散程度","declared":20,"pages":[70,90],"answerPage":193},
  {"section":"2.6","unit":2,"unitCn":"U2 Problem Solving and Data Analysis","cn":"调查、观察性研究与实验","declared":7,"pages":[91,99],"answerPage":193},
  {"section":"2.7","unit":2,"unitCn":"U2 Problem Solving and Data Analysis","cn":"样本统计推断与误差范围","declared":3,"pages":[100,102],"answerPage":193},
  {"section":"3.1","unit":3,"unitCn":"U3 Advanced Math","cn":"等价表达式：因式分解与分离","declared":6,"pages":[103,106],"answerPage":194},
  {"section":"3.2","unit":3,"unitCn":"U3 Advanced Math","cn":"运算：指数与根式、有理式、多项式","declared":11,"pages":[107,112],"answerPage":194},
  {"section":"3.3","unit":3,"unitCn":"U3 Advanced Math","cn":"求解：二次、根式、分式方程与非线性方程组","declared":19,"pages":[113,125],"answerPage":194},
  {"section":"3.4","unit":3,"unitCn":"U3 Advanced Math","cn":"图像：二次、指数与多项式函数","declared":22,"pages":[126,143],"answerPage":194},
  {"section":"3.5","unit":3,"unitCn":"U3 Advanced Math","cn":"函数记号与变换","declared":4,"pages":[144,146],"answerPage":195},
  {"section":"3.6","unit":3,"unitCn":"U3 Advanced Math","cn":"非线性函数的建立与解读","declared":6,"pages":[147,149],"answerPage":195},
  {"section":"4.1","unit":4,"unitCn":"U4 Geometry and Trigonometry","cn":"直线与角","declared":2,"pages":[150,152],"answerPage":195},
  {"section":"4.2","unit":4,"unitCn":"U4 Geometry and Trigonometry","cn":"三角形、全等与相似","declared":14,"pages":[153,163],"answerPage":195},
  {"section":"4.3","unit":4,"unitCn":"U4 Geometry and Trigonometry","cn":"面积与体积","declared":8,"pages":[164,168],"answerPage":195},
  {"section":"4.4","unit":4,"unitCn":"U4 Geometry and Trigonometry","cn":"三角函数与单位圆","declared":12,"pages":[169,179],"answerPage":196},
  {"section":"4.5","unit":4,"unitCn":"U4 Geometry and Trigonometry","cn":"圆","declared":16,"pages":[180,190],"answerPage":196}
];

window.JY_BANK = [
{"id":"JY1-001","unit":1,"section":"1.1","no":1,"page":7,"source":"讲义 p7 #1","type":"mcq","answer":"A","fig":"JY1-001",
 "stem":"The graph of the line in the xy-plane above shows the relationship between the quantities x and y. Which of the following equations represents x in terms of y?",
 "choices":["x = 12 - (3/2)y","x = 12 - (2/3)y","x = 8 - (3/2)y","x = 8 - (2/3)y"]},
{"id":"JY1-002","unit":1,"section":"1.1","no":2,"page":7,"source":"讲义 p7 #2","type":"grid","answer":"14","value":14,"fig":"JY1-002",
 "stem":"The graph of the linear equation 6x + By = 42 is shown, where B is a constant. what is the value of B?"},
{"id":"JY1-003","unit":1,"section":"1.1","no":3,"page":8,"source":"讲义 p8 #3","type":"mcq","answer":"B",
 "table":[["x","g(x)"],["2","-4"],["3","-2"],["4","0"],["5","2"]],
 "stem":"The table shows four values of x and their corresponding values of g(x) for function g. Which equation defines function g?",
 "choices":["g(x) = x - 6","g(x) = 2x - 8","g(x) = 3x - 12","g(x) = 4x - 12"]},
{"id":"JY1-004","unit":1,"section":"1.1","no":4,"page":8,"source":"讲义 p8 #4","type":"mcq","answer":"D",
 "stem":"The graph of 7x + 2y = -31 in the xy-plane has an x-intercept at (a, 0) and a y-intercept at (0, b), where a and b are constants. What is the value of b/a?",
 "choices":["- 7/2","- 2/7","2/7","7/2"]},
{"id":"JY1-005","unit":1,"section":"1.1","no":5,"page":9,"source":"讲义 p9 #5","type":"mcq-graph","answer":"C","fig":"JY1-005","choices":["A","B","C","D"],
 "stem":"ax + by = b\nIn the equation above, a and b are constants and 0 < a < b. Which of the following could represent the graph of the equation in the xy-plane?"},
{"id":"JY1-006","unit":1,"section":"1.1","no":6,"page":11,"source":"讲义 p11 #6","type":"mcq","answer":"C",
 "stem":"Line p is defined by 2y + 18x = 9. Line r is perpendicular to line p in the xy-plane. What is the slope of line r?",
 "choices":["-9","- 1/9","1/9","9"]},
{"id":"JY1-007","unit":1,"section":"1.1","no":7,"page":11,"source":"讲义 p11 #7","type":"mcq","answer":"A",
 "stem":"Line l in the xy-plane is perpendicular to the line with equation x = 2. What is the slope of line l?",
 "choices":["0","- 1/2","-2","The slope of line l is undefined."]},
{"id":"JY1-008","unit":1,"section":"1.1","no":8,"page":12,"source":"讲义 p12 #8","type":"mcq","answer":"D",
 "stem":"In the xy-plane, line k is defined by x + y = 0. Line j is perpendicular to line k, and the y-intercept of line j is (0, 3). Which of the following is an equation of line j?",
 "choices":["x + y = 3","x + y = -3","x - y = 3","x - y = -3"]},
{"id":"JY1-009","unit":1,"section":"1.1","no":9,"page":12,"source":"讲义 p12 #9","type":"mcq","answer":"A","fig":"JY1-009",
 "stem":"Line k is shown in the xy-plane. Line j (not shown) is perpendicular to line k and passes through the point (-20, -19). Which equation defines line j?",
 "choices":["y = (2/5)x - 11","y = (2/5)x - 27","y = (5/2)x - 11","y = (5/2)x - 27"]}
];
