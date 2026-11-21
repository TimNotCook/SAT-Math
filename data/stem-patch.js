/* 题干/表格/图形订正补丁：对照原题扫描订正，不改题面/选项/答案。 */
(function () {
  var STEM = {
    'SP1-049': 'The table shows some values of x and their corresponding values f(x) for the linear function f. What is the x-intercept of the graph of y = f(x) in the xy-plane?',
    'SP1-091': 'The table shows the coordinates of three points on a line in the xy-plane, where k and n are constants. If the slope of the line is 2, what is the value of k + n?',
    'SR-156': 'The table shows three values of x and their corresponding values of y, where y = f(x) + 3. The function f can be written in the form f(x) = x^{3} + bx^{2} + cx + d, where b, c, and d are constants. What is the y-intercept of the graph of y = f(x) in the xy-plane?',
    'SP1-048': 'For the linear function f, the table shows three values of x and their corresponding values of f(x). Function f is defined by f(x) = ax + b, where a and b are constants. What is the value of a - b?',
    'SP1-050': 'For the linear function g, the table shows four values of x and their corresponding values of g(x). The function g can be written as g(x) = mx + b, where m and b are constants. What is the value of b?',
    'SP1-053': 'The table shows two values of x and their corresponding values of y. The graph of the linear equation representing this relationship passes through the point (1/4, a). What is the value of a?',
    'SP1-054': 'The table shows two values of x and their corresponding values of y. The graph of the linear equation representing this relationship passes through the point (1/7, a). What is the value of a?',
    'SP1-089': 'The table gives coordinates of two points on a line in the xy-plane. The y-intercept of the line is (k \u2212 5, b), where k and b are constants. What is the value of b?',
    'SP1-090': 'The table shows three values of x and their corresponding values of f(x). For the linear function f, if h(x) = f(x) \u2212 13, which equation defines h?',
    'SP1-092': 'There is a linear relationship between x and y. The table shows three values of x and their corresponding value of y in terms of a constant n. What is the slope of the line that represents this relationship in the xy-plane?',
    'SP1-099': 'The table shows three values of x and their corresponding values of g(x), where g(x) = f(x)/(x + 3) and f is a linear function. What is the y-intercept of the graph of y = f(x) in the xy-plane?',
    'SP1-101': 'The table shows three values of x and their corresponding values of y, where s is a constant. There is a linear relationship between x and y. Which of the following equations represents this relationship?',
    'U2-02': 'The manager of an online news service received the report above on the number of subscriptions sold by the service. The manager estimated that the percent increase from 2012 to 2013 would be double the percent increase from 2013 to 2014. How many subscriptions did the manager expect would be sold in 2014?',
    'U2-03': 'The table summarizes the number of objects in each group. The number of objects in group C is p% of the number of objects in group A. What is the value of p?',
    'TD-21-10': 'The table summarizes the number of objects in each group. The number of objects in group C is p% of the number of objects in group A. What is the value of p?',
    'U2-10': 'The table summarizes members of a local organization by age and whether they live north or south of Center St. If a member of the organization is selected at random, what is the probability that the selected member is at least 45 years old?',
    'TD-24-07': 'The table summarizes members of a local organization by age and whether they live north or south of Center St. If a member of the organization is selected at random, what is the probability that the selected member is at least 45 years old?',
    'U2-15': 'The results of two random samples of votes for a proposition are shown above. The samples were selected from the same population, and the margins of error were calculated using the same method. Which of the following is the most appropriate reason that the margin of error for sample A is greater than the margin of error for sample B?',
    'TD-24-04': 'The table summarizes the distribution of age and assigned group for 120 participants in a study. One of these participants will be selected at random. What is the probability of selecting a participant from group A, given that the participant is at least 10 years of age?',
    'TD-24-08': 'The table gives the distribution of favorite core subject and grade level for 80 students. If a student is selected at random, what is the probability of selecting a student whose favorite core subject is mathematics?',
    'TD-24-15': 'The table gives the distribution of flavor and type of topping for customer orders at an ice cream shop. If a customer order is selected at random, what is the probability of selecting an order with sprinkles, given the flavor of ice cream is vanilla?',
    'U2-11': 'For a certain computer game, individuals receive an integer score that ranges from 2 through 10. The table below shows the frequency distribution of the scores of the 9 players in group A and the 11 players in group B. The median of the scores for group B is how much greater than the median of the scores for group A?',
    'TD-23-12': 'Sam opened a savings account at a bank. The table shows the exponential relationship between the time t, in years, since Sam opened the account and the total amount n, in dollars, in the account. If Sam made no additional deposits or withdrawals, which of the following equations best represents the relationship between t and n?',
    'TD-24-12': 'The table shows the distribution of people in a certain city by age group. If a person in this city is selected at random, which of the following is closest to the probability of selecting a person who is greater than 65 years old, given that the person is at least 18 years old?',
    'TD-24-13': 'The table shows the distribution by species and eye color for the 30 canids living in a nature conservancy. If one canid is selected at random, what is the probability that it will be either a grey wolf with yellow eyes or a coyote with brown eyes?',
    'TD-25-01': 'The table summarizes the UV index value recorded by a research assistant at noon each day for 49 days. According to the table, a UV index value of 1 was recorded on how many days?',
    'U2-12': 'The table summarizes the UV index value recorded by a research assistant at noon each day for 49 days. According to the table, a UV index value of 1 was recorded on how many days?',
    'TD-25-10': 'The table shows the heights, in inches, of 12 infants at a daycare. According to the table, what is the mean height, in inches, of these infants?',
    'TD-25-24': 'Data set A and data set B each consist of 26 values. The table shows the frequencies of the values for each data set. Which of the following statements best compares the means of the two data sets?',
    'TD-25-29': 'The table shows the frequencies of the data values for four data sets. Which data set has the greatest mean?',
    'TD-42-12': 'The table gives the perimeters of similar triangles TUV and XYZ, where TU corresponds to XY. The length of TU is 6. What is the length of XY?',
    'TD-43-20': 'The table gives the areas and perimeters of two similar rectangles, where n is a constant. What is the value of n?',
    'TD-24-05': 'Each rock in a collection of 50 rocks was classified as either igneous, metamorphic, or sedimentary, as shown in the frequency table. If one of these rocks is selected at random, what is the probability of selecting a rock that is igneous?',
    'TD-11-09': 'The table shows three values of x and their corresponding values of y, where n is a constant, for the linear relationship between x and y. What is the slope of the line that represents this relationship in the xy-plane?',
    'TD-22-12': 'In 2000, a census was taken to determine the population of a certain town. The graph gives the estimated population y, in thousands, of this town x years after the 2000 census was taken, where 0 ≤ x ≤ 5. Based on the graph, which of the following is the closest to the estimated population 2 years after the 2000 census was taken?',
    'TD-22-16': 'The scatterplot shows the population of town T starting in 2000 and projected through 2045. According to the line of best fit, which of the following best approximates the year in which the population of town T is projected to reach 5,000?',
    'TD-25-05': 'A store owner recorded the number of units of a certain product that were sold per day for 28 days. What is the minimum number of units of this product sold per day for these 28 days?'
  };
  (window.TD_BANK && window.TD_BANK.questions || []).forEach(function (q) {
    if (q && STEM[q.id]) q.stem = STEM[q.id];
  });
  var ANSWERS = { 'SR-215': 'B' };
  (window.TD_BANK && window.TD_BANK.questions || []).forEach(function (q) {
    if (q && ANSWERS[q.id]) q.answer = ANSWERS[q.id];
  });
  if (window.TD_TEXT) {
    Object.keys(window.TD_TEXT).forEach(function (k) {
      if (STEM[k] && window.TD_TEXT[k]) window.TD_TEXT[k].stem = STEM[k];
    });
  }
  var TABLES = {
    'SR-156': { type: 'table', head: ['x', 'y'], rows: [['-5', '0'], ['8', '0'], ['9', '0']] },
    'SP1-048': { type: 'table', head: ['x', 'f(x)'], rows: [['1', '-64'], ['2', '0'], ['3', '64']] },
    'SP1-050': { type: 'table', head: ['x', 'g(x)'], rows: [['1', '58'], ['2', '54'], ['3', '50'], ['4', '46']] },
    'SP1-053': { type: 'table', head: ['x', 'y'], rows: [['\u221212', '\u221245'], ['6', '45']] },
    'SP1-054': { type: 'table', head: ['x', 'y'], rows: [['\u221218', '\u221248'], ['7', '52']] },
    'SP1-089': { type: 'table', head: ['x', 'y'], rows: [['k', '13'], ['k + 7', '\u221215']] },
    'SP1-090': { type: 'table', head: ['x', 'f(x)'], rows: [['\u22124', '0'], ['\u221219/5', '1'], ['\u221218/5', '2']] },
    'SP1-092': { type: 'table', head: ['x', 'y'], rows: [['0', 'n'], ['4', 'n + 19'], ['8', 'n + 38']] },
    'SP1-099': { type: 'table', head: ['x', 'g(x)'], rows: [['\u221227', '3'], ['\u22129', '0'], ['21', '5']] },
    'SP1-101': { type: 'table', head: ['x', 'y'], rows: [['\u22122s', '24'], ['\u2212s', '21'], ['s', '15']] }
  };
  var FIGFIX = {
    'U4-05': {
      type: 'rawSvg',
      svg: "<svg viewBox='0 0 360 240' xmlns='http://www.w3.org/2000/svg'>\n  <line x1='120' y1='30' x2='120' y2='210' stroke='#162c46' stroke-width='2.2'/>\n  <line x1='240' y1='30' x2='240' y2='210' stroke='#162c46' stroke-width='2.2'/>\n  <line x1='70' y1='215' x2='295' y2='25' stroke='#162c46' stroke-width='2.2'/>\n  <text x='120' y='22' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>r</text>\n  <text x='240' y='22' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>s</text>\n  <text x='303' y='24' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='start'>t</text>\n  <text x='92' y='196' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46'>x°</text>\n  <text x='258' y='60' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46'>y°</text>\n</svg>"
    },
    'TD-41-06': {
      type: 'rawSvg',
      svg: "<svg viewBox='0 0 360 240' xmlns='http://www.w3.org/2000/svg'>\n  <line x1='120' y1='30' x2='120' y2='210' stroke='#162c46' stroke-width='2.2'/>\n  <line x1='240' y1='30' x2='240' y2='210' stroke='#162c46' stroke-width='2.2'/>\n  <line x1='70' y1='215' x2='295' y2='25' stroke='#162c46' stroke-width='2.2'/>\n  <text x='120' y='22' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>r</text>\n  <text x='240' y='22' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>s</text>\n  <text x='303' y='24' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='start'>t</text>\n  <text x='92' y='196' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46'>x°</text>\n  <text x='258' y='60' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46'>y°</text>\n</svg>"
    },
    'TD-42-18': { type: 'triangle', pts: [[70, 200], [290, 200], [180, 55]], labels: ['A', 'C', 'B'] },
    'TD-43-01': {
      type: 'rawSvg',
      svg: "<svg viewBox='0 0 440 300' xmlns='http://www.w3.org/2000/svg'>\n  <rect x='60' y='140' width='320' height='120' fill='none' stroke='#162c46' stroke-width='2'/>\n  <path d='M 60 140 A 90 90 0 0 1 240 140' fill='none' stroke='#162c46' stroke-width='2'/>\n  <circle cx='150' cy='140' r='3' fill='#0f2a47'/>\n  <text x='52' y='132' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>N</text>\n  <text x='240' y='132' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>P</text>\n  <text x='388' y='132' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>Q</text>\n  <text x='150' y='162' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>O</text>\n  <text x='52' y='282' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>S</text>\n  <text x='388' y='282' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>R</text>\n</svg>"
    },
    'TD-15-01': { type: 'chart', x: { min: -6, max: 6, step: 2, label: 'x' }, y: { min: -50, max: 10, step: 10, label: 'y' }, grid: true, origin: 'O', series: [{ kind: 'line', dash: '6 4', points: [[-2, -50], [2, 10]] }] },
    'TD-15-03': { type: 'chart', x: { min: -8, max: 8, step: 2, label: 'x' }, y: { min: -8, max: 8, step: 2, label: 'y' }, grid: true, origin: 'O', series: [{ kind: 'line', points: [[3, 8], [7, -3]] }] },
    'TD-11-03': { type: 'chart', x: { min: 0, max: 10, step: 2, label: 'x' }, y: { min: -10, max: 10, step: 2, label: 'y' }, grid: true, origin: 'O', series: [{ kind: 'line', points: [[0, 2], [4.5, -3]] }] },
    'TD-22-09': { type: 'chart', x: { min: 0, max: 9, step: 1, label: 'Time (seconds)' }, y: { min: 0, max: 11, step: 1, label: 'Momentum (newton-seconds)' }, grid: true, series: [{ kind: 'line', points: [[0, 1], [1, 1.6], [2, 2], [3, 2.9], [4, 4], [5, 5.6], [6, 8], [7, 9.5], [7.5, 9.7], [8, 9]] }, { kind: 'points', points: [[0, 1], [2, 2], [4, 4], [6, 8], [8, 9]] }] },
    'TD-22-17': { type: 'chart', x: { min: 0, max: 6, step: 1, label: 'x' }, y: { min: 0, max: 13, step: 1, label: 'y' }, grid: true, series: [{ kind: 'line', points: [[0, 7], [1, 8.8], [2, 10], [3, 10.6], [4, 11], [5, 10.7], [6, 10]] }] },
    'SP1-025': { type: 'chart', x: { min: -10, max: 10, step: 2, label: 'x' }, y: { min: -10, max: 10, step: 2, label: 'y' }, grid: true, series: [{ kind: 'line', points: [[-10, 6], [10, 1.5]] }, { kind: 'line', points: [[-10, 2], [10, 2]] }], marks: [{ x: -5, y: 5 }, { x: 8, y: 2 }] },
    'U1-12': { type: 'chart', x: { min: -8, max: 8, step: 2, label: 'x' }, y: { min: -8, max: 8, step: 2, label: 'y' }, grid: true, origin: 'O', series: [{ kind: 'line', dash: '6 4', points: [[-1.5, 7], [2.5, -9]] }] },
    'U1-13': { type: 'chart', x: { min: -6, max: 6, step: 2, label: 'x' }, y: { min: -50, max: 10, step: 10, label: 'y' }, grid: true, origin: 'O', series: [{ kind: 'line', dash: '6 4', points: [[-1.5, -42.5], [1.5, 2.5]] }] },
    'TD-25-15': { type: 'chart', x: { min: 0, max: 5, step: 1, cats: [['Plot 1', 1.4], ['Plot 2', 2.4], ['Plot 3', 3.4], ['Plot 4', 4.4]] }, y: { min: 0, max: 90, step: 10, label: 'Trees planted', showZero: true }, grid: true, series: [{ kind: 'bar', bars: [{ x0: 1, x1: 1.8, h: 65 }, { x0: 2, x1: 2.8, h: 75 }, { x0: 3, x1: 3.8, h: 80 }, { x0: 4, x1: 4.8, h: 59 }] }] },
    'TD-25-16': { type: 'chart', x: { min: 0, max: 6, step: 1, cats: [['daisy', 1.4], ['orchid', 2.4], ['tulip', 3.4], ['lily', 4.4], ['sunflower', 5.4]] }, y: { min: 0, max: 200, step: 20, label: 'Number of flowers', showZero: true }, grid: true, series: [{ kind: 'bar', bars: [{ x0: 1, x1: 1.8, h: 60 }, { x0: 2, x1: 2.8, h: 100 }, { x0: 3, x1: 3.8, h: 190 }, { x0: 4, x1: 4.8, h: 180 }, { x0: 5, x1: 5.8, h: 170 }] }] },
    'TD-25-05': { type: 'chart', x: { min: 80, max: 140, step: 10 }, y: { min: 0, max: 10, step: 10 }, yAxis: false, grid: false, series: [{ kind: 'box', lo: 85, q1: 98, med: 115, q3: 125, hi: 138 }] },
    'TD-11-20': { type: 'chart', x: { min: -6, max: 6, step: 2, label: 'x' }, y: { min: -6, max: 6, step: 2, label: 'y' }, grid: true, origin: 'O', series: [{ kind: 'line', points: [[0, 6], [4.8, -6]] }] },
    'TD-42-12': { type: 'table', head: ['', 'Perimeter'], rows: [['Triangle TUV', '50'], ['Triangle XYZ', '150']] },
    'TD-15-02': { type: 'chart', x: { min: -15, max: 15, step: 5, label: 'x' }, y: { min: 0, max: 60, step: 5, label: 'y' }, grid: true, origin: 'O', series: [{ kind: 'region', points: [[-15, 35], [-15, 60], [15, 60], [15, 35]] }] },
    'TD-33-13': {
      type: 'rawSvg',
      svg: "<svg viewBox='0 0 430 190' xmlns='http://www.w3.org/2000/svg'>\n  <g stroke='#162c46' stroke-width='1.6' fill='none'>\n    <rect x='15' y='25' width='180' height='120'/>\n    <line x1='75' y1='25' x2='75' y2='145'/>\n    <line x1='115' y1='25' x2='115' y2='145'/>\n    <line x1='155' y1='25' x2='155' y2='145'/>\n    <line x1='15' y1='85' x2='195' y2='85'/>\n    <rect x='235' y='25' width='180' height='120'/>\n    <line x1='295' y1='25' x2='295' y2='145'/>\n    <line x1='335' y1='25' x2='335' y2='145'/>\n    <line x1='375' y1='25' x2='375' y2='145'/>\n    <line x1='235' y1='85' x2='415' y2='85'/>\n  </g>\n  <g font-family='Times New Roman,Georgia,serif' font-size='17' fill='#162c46' text-anchor='middle'>\n    <text x='45' y='64'>x</text>\n    <text x='95' y='64'>-1</text>\n    <text x='135' y='64'>0</text>\n    <text x='175' y='64'>1</text>\n    <text x='45' y='118'>q(x)</text>\n    <text x='95' y='118'>7</text>\n    <text x='135' y='118'>21</text>\n    <text x='175' y='118'>63</text>\n    <text x='265' y='64'>x</text>\n    <text x='315' y='64'>-1</text>\n    <text x='355' y='64'>0</text>\n    <text x='395' y='64'>1</text>\n    <text x='265' y='118'>q(x)</text>\n    <text x='315' y='106'>1</text>\n    <line x1='307' y1='112' x2='323' y2='112' stroke='#162c46' stroke-width='1.3'/>\n    <text x='315' y='128'>7</text>\n    <text x='355' y='118'>3</text>\n    <text x='395' y='118'>63</text>\n  </g>\n</svg>"
    }
  };
  var CHOICEFIX = { 'TD-22-14': { D: { kind: 'line', xInt: 30, yInt: 40, xmax: 40, ymax: 40 } } };
  function registerTables() {
    window.TD_FIG_SPECS = window.TD_FIG_SPECS || {};
    Object.assign(window.TD_FIG_SPECS, TABLES);
    Object.assign(window.TD_FIG_SPECS, FIGFIX);
    window.TD_CHOICE_GRAPHS = window.TD_CHOICE_GRAPHS || {};
    Object.keys(CHOICEFIX).forEach(function (k) {
      window.TD_CHOICE_GRAPHS[k] = window.TD_CHOICE_GRAPHS[k] || {};
      Object.assign(window.TD_CHOICE_GRAPHS[k], CHOICEFIX[k]);
    });
  }
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', registerTables);
  } else {
    registerTables();
  }
})();