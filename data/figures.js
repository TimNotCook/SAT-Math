/* TD SAT Math · Geometry figure specs (production)
   Maps a question id -> a vector-figure spec consumed by figures.js.
   Templates: parallelLines / triangle / circle / rect.
   All figures are drawn as high-definition vector SVG — no raster scans, no watermark.
   Authored by re-reading the source scans; verified via _verify_draft.html.
*/
window.TD_FIG_SPECS = {

  /* ===================== PARALLEL LINES (9) =====================
     Template: parallelLines. Fields are QUADRANTS, not vague "sides":
       topUL/topUR/topLL/topLR = TOP intersection (line named by topLabel);
       botUL/botUR/botLL/botLR = BOTTOM intersection (bottomLabel).
     Legacy aliases: topLeft=topUL, topRight=topUR,
                     bottomLeft=botUL, bottomRight=botUR.
     Geometric size of each quadrant (measured from the rendered arcs):
       direction NE (default): UL obtuse, UR acute, LL acute, LR obtuse.
       direction SE:           UL acute,  UR obtuse, LL obtuse, LR acute.
     => A label >90° MUST sit in an obtuse quadrant, a label <90° in an
        acute one. Never infer the quadrant from the printed label position
        alone — check the transversal direction first. */

  'U4-01': {
    type: 'parallelLines',
    topLabel: 'k', bottomLabel: 'l', transLabel: 'd',
    // NE: 66° is the ACUTE angle below line k, left of transversal d (LL);
    // z is its obtuse supplement below line l, right of d (LR) -> z = 114.
    topLL: '66°', botLR: 'z',
    note: false
  },

  // NE: 164° and x° are CORRESPONDING angles, both in the obtuse UL wedge
  // (above the parallel, left of the transversal) -> x = 164, per the
  // printed answer key. Do NOT move x° to an acute quadrant.
  'U4-02': {
    type: 'parallelLines',
    topLabel: 'r', bottomLabel: 's', transLabel: 'n',
    topUL: '164°', botUL: 'x°',
    note: true
  },

  // U4-03 / TD-41-03: the scan's transversal runs upper-left -> lower-right.
  // SE: UL is acute, UR is obtuse. At the LOWER intersection x° is the small
  // upper-left angle (x = 180-142 = 38) and 142° the obtuse upper-right angle;
  // they are a linear pair and must NOT overlap.
  'U4-03': {
    type: 'parallelLines',
    topLabel: 'p', bottomLabel: 'q', transLabel: 't', direction: 'SE',
    botUL: 'x°', botUR: '142°',
    note: true
  },

  // U4-04：两直线相交，交点上 w°、下 z°（w=130 求 z）。与 TD-41-05 是同一道题，
  // 此前只有扫描裁剪图（线条锯齿带水印），补上矢量 spec 后改为高清自绘，不再用扫描图。
  'U4-04': {
    type: 'crossingLines',
    topLabel: 'w°', bottomLabel: 'z°',
    note: true
  },

  'U4-05': { type: 'rawSvg', svg: "<svg viewBox='0 0 360 240' xmlns='http://www.w3.org/2000/svg'>\n  <line x1='120' y1='30' x2='120' y2='210' stroke='#162c46' stroke-width='2.2'/>\n  <line x1='240' y1='30' x2='240' y2='210' stroke='#162c46' stroke-width='2.2'/>\n  <line x1='70' y1='215' x2='295' y2='25' stroke='#162c46' stroke-width='2.2'/>\n  <text x='120' y='22' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>r</text>\n  <text x='240' y='22' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>s</text>\n  <text x='303' y='24' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='start'>t</text>\n  <text x='92' y='196' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46'>x\u00b0</text>\n  <text x='258' y='60' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46'>y\u00b0</text>\n</svg>" },

  'TD-41-01': {
    type: 'parallelLines',
    topLabel: 'k', bottomLabel: 'l', transLabel: 'd',
    // NE: 66° is the ACUTE angle below line k, left of transversal d (LL);
    // z is its obtuse supplement below line l, right of d (LR) -> z = 114.
    topLL: '66°', botLR: 'z',
    note: false
  },

  // BUGFIX (figure/text mismatch): 164° was in topRight, which is the ACUTE
  // UR wedge for a NE transversal -> a 164° label on a ~36° arc. Source scan
  // and answer key (x = 164) both place it in the obtuse UL wedge, with x°
  // in the matching UL wedge at the lower intersection (corresponding pair).
  'TD-41-02': {
    type: 'parallelLines',
    topLabel: 'r', bottomLabel: 's', transLabel: 'n', direction: 'NE',
    topUL: '164°', botUL: 'x°',
    note: true
  },

  // Same printed problem as U4-03. SE: UL acute (x = 38), UR obtuse (142°).
  'TD-41-03': {
    type: 'parallelLines',
    topLabel: 'p', bottomLabel: 'q', transLabel: 't', direction: 'SE',
    botUL: 'x°', botUR: '142°',
    note: true
  },

  'TD-41-05': {
    type: 'crossingLines',
    topLabel: 'w°', bottomLabel: 'z°',
    note: true
  },

  'TD-41-06': { type: 'rawSvg', svg: "<svg viewBox='0 0 360 240' xmlns='http://www.w3.org/2000/svg'>\n  <line x1='120' y1='30' x2='120' y2='210' stroke='#162c46' stroke-width='2.2'/>\n  <line x1='240' y1='30' x2='240' y2='210' stroke='#162c46' stroke-width='2.2'/>\n  <line x1='70' y1='215' x2='295' y2='25' stroke='#162c46' stroke-width='2.2'/>\n  <text x='120' y='22' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>r</text>\n  <text x='240' y='22' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>s</text>\n  <text x='303' y='24' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='start'>t</text>\n  <text x='92' y='196' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46'>x\u00b0</text>\n  <text x='258' y='60' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46'>y\u00b0</text>\n</svg>" },

  // TD-41-04: five angle labels at the two intersections of the SE transversal.
  // SE quadrants: UL/LR acute, UR/LL obtuse. The correct choice is s = 135,
  // and 135° is deliberately placed in botLL, the OBTUSE lower-left wedge.
  // Top intersection: q° above-left, r° below-right.
  // Bottom intersection: s° above-right, 135° below-left, t° below-right.
  // The scan draws no arcs, only the labels — so use the label-only variant.
  'TD-41-04': {
    type: 'parallelLines',
    topLabel: 'm', bottomLabel: 'n', transLabel: 'k', direction: 'SE',
    topUL: 'q°', topLR: 'r°',
    botUR: 's°', botLL: '135°', botLR: 't°',
    noArcs: true, note: true
  },

  /* ===================== TRIANGLES (10) =====================
     Template: triangle. vertices default to [bottom-left, bottom-right, top]
     = labels[0], labels[1], labels[2]. right:[i] marks the right-angle vertex. */

  // 45-45-90 right triangle: right angle bottom-left, 45° bottom-right,
  // hypotenuse 13√2, unknown x on the left leg.
  'U4-09': {
    type: 'triangle',
    labels: ['A', 'B', 'C'],
    angles: { 0: '90°', 1: '45°', 2: '' },
    sides: { 1: '13√2', 2: 'x' },
    right: [0],
    note: true
  },

  'TD-42-10': {
    type: 'triangle',
    labels: ['A', 'B', 'C'],
    angles: { 0: '90°', 1: '45°', 2: '' },
    sides: { 1: '13√2', 2: 'x' },
    right: [0],
    note: true
  },

  // Right triangle: right angle bottom-left, 36° at top, unknown a° at bottom-right.
  'TD-42-11': {
    type: 'triangle',
    labels: ['A', 'B', 'C'],
    angles: { 0: '90°', 1: 'a°', 2: '36°' },
    sides: {},
    right: [0],
    note: true
  },

  // Right triangle: right angle bottom-left, x° at top; legs 13 (left, adj to x) and 22 (hypotenuse).
  'TD-44-01': {
    type: 'triangle',
    labels: ['A', 'B', 'C'],
    angles: { 0: '90°', 1: '', 2: 'x°' },
    sides: { 1: '22', 2: '13' },
    right: [0],
    note: true
  },

  // Printed question 4.4 #2 (p225): right triangle DEF, right angle at E,
  // DE = 35 (vertical leg), EF = 45 (base); the question asks for tan F.
  'TD-44-02': {
    type: 'triangle',
    pts: [[80, 60], [80, 180], [290, 180]],
    labels: ['D', 'E', 'F'],
    sides: { 0: '35', 1: '45' },
    right: [1],
    note: true
  },

  'TD-44-03': {
    type: 'triangle',
    // right:[1] needs the vertical leg at vertex 1, otherwise the 90° arc
    // and square would be drawn on a non-right corner.
    pts: [[70, 200], [290, 200], [290, 50]],
    labels: ['T', 'S', 'R'],
    angles: { 1: '90°' },
    sides: { 1: '√157', 2: '79' },
    right: [1],
    note: true
  },

  // Right triangle XYZ: right angle at Z (bottom-left), ZY=37 (bottom), XZ=29 (left leg); angle X at top.
  'TD-44-04': {
    type: 'triangle',
    labels: ['Z', 'Y', 'X'],
    angles: { 0: '90°' },
    sides: { 0: '37', 2: '29' },
    right: [0],
    note: true
  },

  // Right triangle: right angle bottom-left, x° at top; bottom leg 63, hypotenuse 73.
  'TD-44-05': {
    type: 'triangle',
    // 63 (base) / 73 (hypotenuse) => x at vertex 2 is ~60°, so give the
    // triangle a real 60° apex instead of the 45° default.
    pts: [[70, 200], [278, 200], [70, 80]],
    labels: ['A', 'B', 'C'],
    angles: { 0: '90°', 1: '', 2: 'x°' },
    sides: { 0: '63', 1: '73' },
    right: [0],
    note: true
  },

  // Right triangle ABC: right angle at C (bottom-right), AC=42 (bottom leg), AB=43 (hypotenuse); angle A at bottom-left.
  'TD-44-07': {
    type: 'triangle',
    pts: [[70, 200], [290, 200], [290, 145]], // right angle at vertex 1
    labels: ['A', 'C', 'B'],
    angles: { 1: '90°' },
    sides: { 0: '42', 2: '43' },
    right: [1],
    note: true
  },

  // Right triangle ABC: right angle at B (bottom-right), C=58° at top, hypotenuse AC=14.
  'TD-44-17': {
    type: 'triangle',
    // right angle at vertex 1 and a real 58° at vertex 2 (top).
    pts: [[70, 200], [262, 200], [262, 80]],
    labels: ['A', 'B', 'C'],
    angles: { 1: '90°', 2: '58°' },
    sides: { 2: '14' },
    right: [1],
    note: true
  },

  /* TD-23-16 / SR-129: bacteria concentration vs time.
     Source scan: x = Time (minutes) 0..80, y = Concentration (millions of
     cells per mL) 0..80. Exponential growth starting near (0,8) and reaching
     ~70 at x=80. Reconstructed as y = 8 * 1.0275^x, which places y=20 at
     x≈34 and y=30 at x≈49 -> the 20->30 increase takes ~15 minutes, matching
     the answer key (choice A = 15). Replaces the watermarked crop scan. */
  'TD-23-16': {
    type: 'chart',
    x: { min: 0, max: 80, step: 10, label: 'Time (minutes)' },
    y: { min: 0, max: 80, step: 10, label: 'Concentration of bacteria (millions of cells per mL)' },
    grid: true,
    series: [{ kind: 'exp', a: 8, b: 1.0275 }],
    marks: [{ x: 34, y: 20, label: '20', dy: -9 }, { x: 49, y: 30, label: '30', dy: 10 }]
  },
  'SR-129': {
    type: 'chart',
    x: { min: 0, max: 80, step: 10, label: 'Time (minutes)' },
    y: { min: 0, max: 80, step: 10, label: 'Concentration of bacteria (millions of cells per mL)' },
    grid: true,
    series: [{ kind: 'exp', a: 8, b: 1.0275 }],
    marks: []
  },

  /* 阴影不等式图（U1-12 / U1-13 / TD-15-01 / TD-15-02 / TD-15-03）2026-11-24 起
     一律走矢量 spec（不再有任何 images/fig/*.png 位图裁剪，注册表里也已摘除）。
     几何全部由题干不等式解析给出，不是照扫描图描的：
       y = 1-4x 右上方、y = 15x-20 左上方(过 (0,-20)，斜率 15)、y = -2x+13 右上方、
       横向带 33 <= y <= 60（只画下边界 y=33，上边界就是图框，不另画线）。
     轴按原书样式在原点交叉、带箭头，x/y 印在箭头旁；参数与答案自洽复盘见
     docs/verify/shaded-vector-2026-11-24.md。 */

  // TD-25-05: horizontal box plot, plain number line, no gridlines.
  // (lo, Q1, median, Q3, hi) = (85, 97, 114, 124, 138) — pixel-verified against the book scan.
  'TD-25-05': { type: 'chart', x: { min: 80, max: 140, step: 10 }, y: { min: 0, max: 10, step: 10 }, yAxis: false, grid: false, series: [{ kind: 'box', lo: 85, q1: 98, med: 115, q3: 125, hi: 138 }] },

  // SP1-086: system matching answer D: 4x + 10y = 32 and -8x - 10y = -64,
  // both lines pass through (8, 0) (x,y -2..10, every 1), origin "O".
  'SP1-086': {
    type: 'chart',
    x: { min: -2, max: 10, step: 1, label: 'x' },
    y: { min: -2, max: 10, step: 1, label: 'y' },
    grid: true,
    origin: 'O',
    series: [
      { kind: 'line', points: [[-2, 8], [10, -1.6]] },
      { kind: 'line', points: [[-2, 4], [10, -0.8]] }
    ]
  },

  /* ---- Data tables (replaces low-res raster table scans) ---- */
  'U2-02': { type: 'table', head: ['Year', 'Subscription sold'],
    rows: [['2012', '5,600'], ['2013', '5,880']] },
  'U2-03': { type: 'table', head: ['Group', 'number of objects'],
    rows: [['A', '325'], ['B', '68'], ['C', '572'], ['D', '102'], ['Total', '1,067']] },
  'TD-21-10': { type: 'table', head: ['Group', 'number of objects'],
    rows: [['A', '325'], ['B', '68'], ['C', '572'], ['D', '102'], ['Total', '1,067']] },
  'U2-10': { type: 'table', head: ['', 'Live north of Center St.', 'Live south of Center St.', 'Total'],
    rows: [['Less than 45 years old', '18', '12', '30'], ['At least 45 years old', '17', '88', '105'], ['Total', '35', '100', '135']] },
  'TD-24-07': { type: 'table', head: ['', 'Live north of Center St.', 'Live south of Center St.', 'Total'],
    rows: [['Less than 45 years old', '18', '12', '30'], ['At least 45 years old', '17', '88', '105'], ['Total', '35', '100', '135']] },
  'U2-15': { type: 'table', head: ['Sample', 'Percent in favor', 'Margin of error'],
    rows: [['A', '52%', '4.2%'], ['B', '48%', '1.6%']] },
  'TD-24-04': { type: 'table', head: ['', '0–9 years', '10–19 years', '20+ years', 'Total'],
    rows: [['Group A', '15', '18', '7', '40'], ['Group B', '6', '7', '27', '40'], ['Group C', '19', '15', '6', '40'], ['Total', '40', '40', '40', '120']] },
  'TD-24-06': { type: 'table', head: ['', 'Live north of Center St.', 'Live south of Center St.', 'Total'],
    rows: [['Less than 45 years old', '15', '14', '29'], ['At least 45 years old', '20', '86', '106'], ['Total', '35', '100', '135']] },
  'TD-24-08': { type: 'table', head: ['Subject', 'Sixth', 'Seventh', 'Eighth', 'Total'],
    rows: [['English', '4', '9', '9', '24'], ['Mathematics', '10', '1', '9', '20'], ['Science', '4', '6', '4', '14'], ['Social studies', '6', '9', '9', '24'], ['Total', '24', '25', '31', '80']] },
  'TD-24-15': { type: 'table', head: ['Flavor', 'Sprinkles', 'No Sprinkles'],
    rows: [['Chocolate', '60', '30'], ['Vanilla', '20', '30'], ['Twist', '80', '20']] },
  'TD-25-01': { type: 'table', head: ['UV index', 'Number of days'],
    rows: [['1', '9'], ['2', '15'], ['3', '12'], ['4', '13']] },
  'TD-25-02': { type: 'table', head: ['UV index', 'Number of days'],
    rows: [['1', '8'], ['2', '13'], ['3', '12'], ['4', '15']] },
  'TD-33-13': { type: 'rawSvg', svg: "<svg viewBox='0 0 430 190' xmlns='http://www.w3.org/2000/svg'>\n  <g stroke='#162c46' stroke-width='1.6' fill='none'>\n    <rect x='15' y='25' width='180' height='120'/>\n    <line x1='75' y1='25' x2='75' y2='145'/>\n    <line x1='115' y1='25' x2='115' y2='145'/>\n    <line x1='155' y1='25' x2='155' y2='145'/>\n    <line x1='15' y1='85' x2='195' y2='85'/>\n    <rect x='235' y='25' width='180' height='120'/>\n    <line x1='295' y1='25' x2='295' y2='145'/>\n    <line x1='335' y1='25' x2='335' y2='145'/>\n    <line x1='375' y1='25' x2='375' y2='145'/>\n    <line x1='235' y1='85' x2='415' y2='85'/>\n  </g>\n  <g font-family='Times New Roman,Georgia,serif' font-size='17' fill='#162c46' text-anchor='middle'>\n    <text x='45' y='64'>x</text>\n    <text x='95' y='64'>-1</text>\n    <text x='135' y='64'>0</text>\n    <text x='175' y='64'>1</text>\n    <text x='45' y='118'>q(x)</text>\n    <text x='95' y='118'>7</text>\n    <text x='135' y='118'>21</text>\n    <text x='175' y='118'>63</text>\n    <text x='265' y='64'>x</text>\n    <text x='315' y='64'>-1</text>\n    <text x='355' y='64'>0</text>\n    <text x='395' y='64'>1</text>\n    <text x='265' y='118'>q(x)</text>\n    <text x='315' y='106'>1</text>\n    <line x1='307' y1='112' x2='323' y2='112' stroke='#162c46' stroke-width='1.3'/>\n    <text x='315' y='128'>7</text>\n    <text x='355' y='118'>3</text>\n    <text x='395' y='118'>63</text>\n  </g>\n</svg>" },
  'TD-33-14': { type: 'table', head: ['x', 'h(x)'],
    rows: [['0', '30'], ['1', '31'], ['2', '33']] },

  'U2-11': { type: 'table', head: ['Score', 'Group A', 'Group B'],
    rows: [['2', '1', '0'], ['3', '1', '0'], ['4', '2', '0'], ['5', '1', '4'], ['6', '3', '2'], ['7', '0', '0'], ['8', '0', '2'], ['9', '1', '1'], ['10', '0', '2'], ['Total', '9', '11']] },
  'U3-18': { type: 'table', head: ['x', 'y'],
    rows: [['1', '13'], ['2', '21'], ['3', 'a']] },
  'TD-11-07': { type: 'table', head: ['x', 'y'],
    rows: [['−11', '−23'], ['6', '45']] },
  'TD-11-09': { type: 'table', head: ['x', 'y'],
    rows: [['−4', 'n + 142'], ['−2', 'n + 71'], ['0', 'n']] },
  'TD-11-10': { type: 'table', head: ['x', 'y'],
    rows: [['−6', '65'], ['−3', '56'], ['3', '38'], ['6', '29']] },
  'TD-23-12': { type: 'table', head: ['Time (years)', 'Total amount (dollars)'],
    rows: [['0', '867.00'], ['1', '870.47'], ['2', '873.95']] },
  'TD-24-12': { type: 'table', head: ['Age group', 'Proportion of the population'],
    rows: [['Less than 18 years old', '27%'], ['18–40 years old', '24%'], ['41–65 years old', '28%'], ['Greater than 65 years old', '21%']] },
  'TD-24-13': { type: 'table', head: ['Species', 'Yellow', 'Brown', 'Total'],
    rows: [['Grey wolf', '16', '2', '18'], ['Coyote', '7', '5', '12'], ['Total', '23', '7', '30']] },

  'TD-24-14': { type: 'table', head: ['', 'Site A', 'Site B', 'Total'],
    rows: [['Red maple', '35', '15', '50'], ['Chestnut oak', '31', '20', '51'], ['Total', '66', '35', '101']] },
  'TD-24-16': { type: 'table', head: ['', 'Flames', 'Panthers', 'Total'],
    rows: [['Small', '6', '9', '15'], ['Medium', '24', '33', '57'], ['Large', '18', '24', '42'], ['Total', '48', '66', '114']] },
  'TD-25-03': { type: 'table', head: ['Value', 'Frequency'],
    rows: [['13', '8'], ['20', '1'], ['27', '8'], ['34', '6']] },
  'TD-25-10': { type: 'table', head: ['Infant', 'Height', 'Infant', 'Height'],
    rows: [['A', '25', 'G', '22'], ['B', '22', 'H', '26'], ['C', '23', 'I', '30'], ['D', '27', 'J', '21'], ['E', '24', 'K', '27'], ['F', '30', 'L', '25']] },
  'TD-25-13': { type: 'table', head: ['Task', 'Time (minutes)'],
    rows: [['A', '7'], ['B', '3'], ['C', '16'], ['D', '12'], ['E', '12']] },
  'TD-25-24': { type: 'table', head: ['value', 'Data set A frequency', 'Data set B frequency'],
    rows: [['40', '2', '8'], ['43', '4', '7'], ['46', '5', '5'], ['49', '7', '4'], ['52', '8', '2']] },
  'TD-25-29': { type: 'table', head: ['Values', 'Data set A frequency', 'Data set B frequency', 'Data set C frequency', 'Data set D frequency'],
    rows: [['40', '0', '0', '8', '8'], ['43', '2', '3', '3', '4'], ['46', '4', '3', '3', '2'], ['49', '8', '8', '0', '0']] },
  'TD-33-24': { type: 'table', head: ['x', 'y'],
    rows: [['1', '13'], ['2', '21'], ['3', 'a']] },

  'TD-42-12': { type: 'table', head: ['', 'Perimeter'], rows: [['Triangle TUV', '50'], ['Triangle XYZ', '150']] },
  'TD-43-20': { type: 'table', head: ['', 'Area (square inches)', 'Perimeter (inches)'],
    rows: [['Rectangle A', '1,100', '370'], ['Rectangle B', '4,400', 'n']] }
,
  'U4-07': {"type":"rawSvg","svg":"<svg viewBox='0 0 440 320' xmlns='http://www.w3.org/2000/svg'>\n  <line x1='70' y1='250' x2='360' y2='250' stroke='#162c46' stroke-width='2'/>\n  <line x1='70' y1='250' x2='330' y2='70' stroke='#162c46' stroke-width='2'/>\n  <line x1='360' y1='250' x2='200' y2='160' stroke='#162c46' stroke-width='2'/>\n  <line x1='330' y1='70' x2='210' y2='250' stroke='#162c46' stroke-width='2'/>\n  <circle cx='70' cy='250' r='3' fill='#0f2a47'/>\n  <circle cx='360' cy='250' r='3' fill='#0f2a47'/>\n  <circle cx='330' cy='70' r='3' fill='#0f2a47'/>\n  <circle cx='200' cy='160' r='3' fill='#0f2a47'/>\n  <circle cx='210' cy='250' r='3' fill='#0f2a47'/>\n  <text x='70' y='272' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>D</text>\n  <text x='360' y='272' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>A</text>\n  <text x='340' y='62' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>B</text>\n  <text x='196' y='154' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>C</text>\n  <text x='206' y='272' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>E</text>\n  <path d='M 312 82 A 22 22 0 0 1 318 88' fill='none' stroke='#162c46' stroke-width='1.5'/>\n  <text x='290' y='74' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#c2410c' text-anchor='middle'>29°</text>\n  <path d='M 221 172 A 24 24 0 0 1 180 174' fill='none' stroke='#162c46' stroke-width='1.5'/>\n  <text x='200' y='198' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#c2410c' text-anchor='middle'>108°</text>\n  <path d='M 222 232 A 22 22 0 0 1 232 250' fill='none' stroke='#162c46' stroke-width='1.5'/>\n  <text x='252' y='232' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#c2410c' text-anchor='middle'>x°</text>\n</svg>"},
  'U4-08': {"type":"rawSvg","svg":"<svg viewBox='0 0 440 300' xmlns='http://www.w3.org/2000/svg'>\n  <polygon points='80,70 200,70 140,174' fill='none' stroke='#162c46' stroke-width='2'/>\n  <polygon points='280,60 400,60 340,210' fill='none' stroke='#162c46' stroke-width='2'/>\n  <path d='M 120 70 A 40 40 0 0 1 100 105' fill='none' stroke='#162c46' stroke-width='1.5'/>\n  <text x='72' y='64' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>A</text>\n  <text x='208' y='64' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>B</text>\n  <text x='140' y='196' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>C</text>\n  <text x='96' y='98' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#c2410c' text-anchor='middle'>60°</text>\n  <text x='96' y='126' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46' text-anchor='middle'>d</text>\n  <text x='272' y='54' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>X</text>\n  <text x='408' y='54' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>Y</text>\n  <text x='340' y='232' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>Z</text>\n</svg>"},
  'TD-42-09': {"type":"rawSvg","svg":"<svg viewBox='0 0 440 300' xmlns='http://www.w3.org/2000/svg'>\n  <polygon points='80,70 200,70 140,174' fill='none' stroke='#162c46' stroke-width='2'/>\n  <polygon points='280,60 400,60 340,210' fill='none' stroke='#162c46' stroke-width='2'/>\n  <path d='M 120 70 A 40 40 0 0 1 100 105' fill='none' stroke='#162c46' stroke-width='1.5'/>\n  <text x='72' y='64' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>A</text>\n  <text x='208' y='64' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>B</text>\n  <text x='140' y='196' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>C</text>\n  <text x='96' y='98' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#c2410c' text-anchor='middle'>60°</text>\n  <text x='96' y='126' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46' text-anchor='middle'>d</text>\n  <text x='272' y='54' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>X</text>\n  <text x='408' y='54' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>Y</text>\n  <text x='340' y='232' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>Z</text>\n</svg>"},
  'TD-42-15': {"type":"rawSvg","svg":"<svg viewBox='0 0 440 300' xmlns='http://www.w3.org/2000/svg'>\n  <line x1='60' y1='90' x2='340' y2='90' stroke='#162c46' stroke-width='2'/>\n  <line x1='200' y1='90' x2='270' y2='240' stroke='#162c46' stroke-width='2'/>\n  <line x1='340' y1='90' x2='270' y2='240' stroke='#162c46' stroke-width='2'/>\n  <circle cx='60' cy='90' r='3' fill='#0f2a47'/>\n  <circle cx='200' cy='90' r='3' fill='#0f2a47'/>\n  <circle cx='340' cy='90' r='3' fill='#0f2a47'/>\n  <circle cx='270' cy='240' r='3' fill='#0f2a47'/>\n  <text x='60' y='74' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>S</text>\n  <text x='200' y='74' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>R</text>\n  <text x='340' y='74' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>Q</text>\n  <text x='270' y='262' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>P</text>\n</svg>"},
  'TD-42-18': { type: 'triangle', pts: [[70, 200], [290, 200], [180, 55]], labels: ['A', 'C', 'B'] },
  'TD-43-01': { type: 'rawSvg', svg: "<svg viewBox='0 0 440 300' xmlns='http://www.w3.org/2000/svg'>\n  <rect x='60' y='140' width='320' height='120' fill='none' stroke='#162c46' stroke-width='2'/>\n  <path d='M 60 140 A 90 90 0 0 1 240 140' fill='none' stroke='#162c46' stroke-width='2'/>\n  <circle cx='150' cy='140' r='3' fill='#0f2a47'/>\n  <text x='52' y='132' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>N</text>\n  <text x='240' y='132' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>P</text>\n  <text x='388' y='132' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>Q</text>\n  <text x='150' y='162' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>O</text>\n  <text x='52' y='282' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>S</text>\n  <text x='388' y='282' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>R</text>\n</svg>" },
  'TD-43-02': {"type":"rawSvg","svg":"<svg viewBox='0 0 440 320' xmlns='http://www.w3.org/2000/svg'>\n  <polygon points='220,275 345,235 220,195 95,235' fill='#f7f9fc' stroke='#162c46' stroke-width='2'/>\n  <line x1='95' y1='235' x2='220' y2='195' stroke='#162c46' stroke-width='2' stroke-dasharray='5 4'/>\n  <line x1='345' y1='235' x2='220' y2='195' stroke='#162c46' stroke-width='2' stroke-dasharray='5 4'/>\n  <line x1='220' y1='70' x2='95' y2='235' stroke='#162c46' stroke-width='2'/>\n  <line x1='220' y1='70' x2='345' y2='235' stroke='#162c46' stroke-width='2'/>\n  <line x1='220' y1='70' x2='220' y2='195' stroke='#162c46' stroke-width='2' stroke-dasharray='5 4'/>\n  <line x1='220' y1='70' x2='220' y2='235' stroke='#162c46' stroke-width='2' stroke-dasharray='5 4'/>\n  <polyline points='220,235 232,235 232,223' fill='none' stroke='#162c46' stroke-width='1.5'/>\n  <text x='244' y='156' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>9 cm</text>\n</svg>"},
  'TD-43-05': {"type":"rawSvg","svg":"<svg viewBox='0 0 440 320' xmlns='http://www.w3.org/2000/svg'>\n  <ellipse cx='220' cy='80' rx='90' ry='28' fill='#f7f9fc' stroke='#162c46' stroke-width='2'/>\n  <ellipse cx='220' cy='250' rx='90' ry='28' fill='#f7f9fc' stroke='#162c46' stroke-width='2'/>\n  <path d='M 130 250 A 90 28 0 0 0 310 250' fill='none' stroke='#162c46' stroke-width='2' stroke-dasharray='5 4'/>\n  <line x1='130' y1='80' x2='130' y2='250' stroke='#162c46' stroke-width='2'/>\n  <line x1='310' y1='80' x2='310' y2='250' stroke='#162c46' stroke-width='2'/>\n  <line x1='220' y1='80' x2='310' y2='80' stroke='#162c46' stroke-width='2'/>\n  <circle cx='220' cy='80' r='3' fill='#0f2a47'/>\n  <text x='265' y='72' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>r</text>\n  <line x1='345' y1='80' x2='345' y2='250' stroke='#162c46' stroke-width='1.5'/>\n  <line x1='338' y1='80' x2='352' y2='80' stroke='#162c46' stroke-width='1.5'/>\n  <line x1='338' y1='250' x2='352' y2='250' stroke='#162c46' stroke-width='1.5'/>\n  <text x='362' y='168' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>h</text>\n</svg>"},
  'TD-43-06': {"type":"rawSvg","svg":"<svg viewBox='0 0 440 320' xmlns='http://www.w3.org/2000/svg'>\n  <ellipse cx='220' cy='80' rx='90' ry='28' fill='#f7f9fc' stroke='#162c46' stroke-width='2'/>\n  <ellipse cx='220' cy='250' rx='90' ry='28' fill='#f7f9fc' stroke='#162c46' stroke-width='2'/>\n  <path d='M 130 250 A 90 28 0 0 0 310 250' fill='none' stroke='#162c46' stroke-width='2' stroke-dasharray='5 4'/>\n  <line x1='130' y1='80' x2='130' y2='250' stroke='#162c46' stroke-width='2'/>\n  <line x1='310' y1='80' x2='310' y2='250' stroke='#162c46' stroke-width='2'/>\n  <line x1='220' y1='80' x2='310' y2='80' stroke='#162c46' stroke-width='2'/>\n  <circle cx='220' cy='80' r='3' fill='#0f2a47'/>\n  <text x='265' y='72' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>r</text>\n  <line x1='345' y1='80' x2='345' y2='250' stroke='#162c46' stroke-width='1.5'/>\n  <line x1='338' y1='80' x2='352' y2='80' stroke='#162c46' stroke-width='1.5'/>\n  <line x1='338' y1='250' x2='352' y2='250' stroke='#162c46' stroke-width='1.5'/>\n  <text x='362' y='168' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>h</text>\n</svg>"},
  'TD-43-24': {"type":"rawSvg","svg":"<svg viewBox='0 0 440 320' xmlns='http://www.w3.org/2000/svg'>\n  <path d='M 170 110 L 320 110' stroke='#162c46' stroke-width='2'/>\n  <path d='M 170 210 L 320 210' stroke='#162c46' stroke-width='2'/>\n  <path d='M 170 110 A 50 50 0 0 0 170 210' fill='#f7f9fc' stroke='#162c46' stroke-width='2'/>\n  <path d='M 320 110 A 14 50 0 0 1 320 210' fill='#f7f9fc' stroke='#162c46' stroke-width='2'/>\n  <path d='M 320 110 A 14 50 0 0 0 320 210' fill='none' stroke='#162c46' stroke-width='2' stroke-dasharray='5 4'/>\n  <circle cx='320' cy='160' r='3' fill='#0f2a47'/>\n  <line x1='320' y1='160' x2='320' y2='210' stroke='#162c46' stroke-width='1.5' stroke-dasharray='5 4'/>\n  <text x='336' y='190' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46' text-anchor='start'>3 ft</text>\n  <line x1='120' y1='255' x2='320' y2='255' stroke='#162c46' stroke-width='1.5'/>\n  <line x1='120' y1='249' x2='120' y2='261' stroke='#162c46' stroke-width='1.5'/>\n  <line x1='320' y1='249' x2='320' y2='261' stroke='#162c46' stroke-width='1.5'/>\n  <text x='220' y='278' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46' text-anchor='middle'>12 ft</text>\n</svg>"},
  'TD-44-06': {"type":"rawSvg","svg":"<svg viewBox='0 0 440 320' xmlns='http://www.w3.org/2000/svg'>\n  <line x1='70' y1='250' x2='360' y2='250' stroke='#162c46' stroke-width='2'/>\n  <line x1='360' y1='250' x2='360' y2='70' stroke='#162c46' stroke-width='2'/>\n  <line x1='70' y1='250' x2='360' y2='70' stroke='#162c46' stroke-width='2'/>\n  <line x1='199' y1='170' x2='360' y2='170' stroke='#162c46' stroke-width='2'/>\n  <polyline points='360,250 340,250 340,230' fill='none' stroke='#162c46' stroke-width='1.5'/>\n  <polyline points='360,170 340,170 340,150' fill='none' stroke='#162c46' stroke-width='1.5'/>\n  <text x='70' y='272' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>A</text>\n  <text x='360' y='62' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>C</text>\n  <text x='360' y='272' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>E</text>\n  <text x='195' y='164' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>B</text>\n  <text x='374' y='168' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='start'>D</text>\n</svg>"},
  'U2-04': {"type":"chart","x":{"min":0,"max":4,"step":1,"label":"x"},"y":{"min":0,"max":30,"step":5,"label":"y"},"grid":true,"series":[{"kind":"points","points":[[0,26],[0.5,27],[1,22],[1.5,21],[2,16],[2.5,14],[3,7.5],[3.5,9]]}]},
  'U2-05': {"type":"chart","x":{"min":0,"max":10,"step":2,"label":"x"},"y":{"min":0,"max":20,"step":4,"label":"y"},"grid":true,"series":[{"kind":"points","points":[[1,5],[2,9],[3,8.5],[4,9.5],[5,14],[6,11],[7,8],[8,11.5],[9,15.5]]},{"kind":"line","points":[[0,6],[10,14]]}]},
  'TD-11-03': { type: 'chart', x: { min: 0, max: 10, step: 2, label: 'x' }, y: { min: -10, max: 10, step: 2, label: 'y' }, grid: true, origin: 'O', series: [{ kind: 'line', points: [[0, 2], [4.5, -3]] }] },
  'TD-11-15': {"type":"chart","x":{"min":0,"max":10,"step":2,"label":"x"},"y":{"min":-10,"max":0,"step":2,"label":"y"},"grid":true,"origin":"O","series":[{"kind":"line","points":[[0,-1],[8,-6]]}],"marks":[{"x":0,"y":-1},{"x":8,"y":-6}]},
  'TD-11-18': {"type":"chart","x":{"min":-6,"max":10,"step":2,"label":"x"},"y":{"min":-10,"max":10,"step":2,"label":"y"},"grid":true,"origin":"O","series":[{"kind":"line","points":[[0,-4],[4,-1]]}],"marks":[{"x":0,"y":-4},{"x":4,"y":-1}]},
  'TD-11-20': { type: 'chart', x: { min: -6, max: 6, step: 2, label: 'x' }, y: { min: -6, max: 6, step: 2, label: 'y' }, grid: true, origin: 'O', series: [{ kind: 'line', points: [[0, 6], [4.8, -6]] }] },
  'TD-11-23': {"type":"chart","x":{"min":-4,"max":4,"step":1,"label":"x"},"y":{"min":-6,"max":6,"step":1,"label":"y"},"grid":true,"origin":"O","series":[{"kind":"line","points":[[-3,5],[3,-7]]}]},
  'TD-11-25': {"type":"chart","x":{"min":-6,"max":6,"step":2,"label":"x"},"y":{"min":-6,"max":6,"step":2,"label":"y"},"grid":true,"origin":"O","series":[{"kind":"line","points":[[0,1],[1,4]]}]},
  'TD-12-19': {"type":"chart","x":{"min":-8,"max":3,"step":1,"label":"x"},"y":{"min":1,"max":9,"step":1,"label":"y"},"grid":true,"origin":"O","series":[{"kind":"line","points":[[-6,9],[-1,4]]},{"kind":"line","points":[[-5,0],[0,5]]},{"kind":"line","points":[[-1,3],[3,7]]}],"marks":[{"x":-1,"y":4}]},
  'TD-12-28': {"type":"chart","x":{"min":-10,"max":10,"step":2,"label":"x"},"y":{"min":-10,"max":10,"step":2,"label":"y"},"grid":true,"origin":"O","series":[{"kind":"line","points":[[-10,4],[10,-6]]},{"kind":"line","points":[[-10,-4],[10,-4]]}],"marks":[{"x":2,"y":-2},{"x":4,"y":-3},{"x":6,"y":-4},{"x":8,"y":-5},{"x":10,"y":-6}]},
  'TD-12-30': {"type":"chart","x":{"min":-6,"max":6,"step":1,"label":"x"},"y":{"min":-6,"max":6,"step":1,"label":"y"},"grid":true,"origin":"O","series":[{"kind":"line","points":[[-6,5],[6,-7]]},{"kind":"line","points":[[-1,7.5],[4,-10]]}],"marks":[{"x":2,"y":-3}]},
  'TD-13-06': {"type":"chart","x":{"min":0,"max":50,"step":10,"label":"x"},"y":{"min":0,"max":50,"step":10,"label":"y"},"grid":true,"series":[{"kind":"line","points":[[0,33],[33,0]]}]},
  'TD-14-27': {"type":"chart","x":{"min":0,"max":10,"step":2,"label":"x"},"y":{"min":0,"max":80,"step":10,"label":"Bank account balance (dollars)"},"grid":true,"series":[{"kind":"line","points":[[0,9],[10,70]]}]},
  'SP1-057': {"type":"chart","x":{"min":0,"max":14,"step":2,"label":"x"},"y":{"min":0,"max":14,"step":2,"label":"y"},"grid":true,"series":[{"kind":"line","points":[[0,7],[8,0]]}],"marks":[{"x":0,"y":7},{"x":8,"y":0}]},
  'TD-22-01': {"type":"chart","x":{"min":0,"max":4,"step":1,"label":"x"},"y":{"min":0,"max":30,"step":5,"label":"y"},"grid":true,"series":[{"kind":"points","points":[[0,26],[0.5,27],[1,22],[1.5,21],[2,16],[2.5,14],[3,7.5],[3.5,9]]}]},
  'TD-22-02': {"type":"chart","x":{"min":0,"max":14,"step":2,"label":"x"},"y":{"min":0,"max":10,"step":2},"grid":true,"series":[{"kind":"points","points":[[1,2],[2.5,2.8],[4.5,4.5],[5.5,2.6],[7.5,7.7],[9,9.7],[10,9.2],[10.5,9.8]]}]},
  'TD-22-03': {"type":"chart","x":{"min":0,"max":10,"step":2,"label":"x"},"y":{"min":0,"max":10,"step":2,"label":"y"},"grid":true,"series":[{"kind":"points","points":[[0,10],[1,7],[2,7],[3,5],[5,5],[6,5],[7,4],[9,1],[10,2]]}]},
  'TD-22-04': {"type":"chart","x":{"min":-14,"max":0,"step":2,"label":"x"},"y":{"min":0,"max":20,"step":2,"label":"y"},"grid":true,"origin":"O","series":[{"kind":"points","points":[[-14,19],[-12,18],[-10,17],[-8,14],[-6,13],[-4,9]]},{"kind":"line","points":[[-14,19.7],[0,5.7]]}]},
  'TD-22-05': {"type":"chart","x":{"min":0,"max":8,"step":1,"label":"x"},"y":{"min":0,"max":16,"step":2,"label":"y"},"grid":true,"series":[{"kind":"points","points":[[1,10.5],[2,9.4],[4,7.7],[5,6.8],[6,6.5],[7,5.6]]},{"kind":"line","points":[[-1,11.8],[9,3.8]]}]},
  'TD-22-06': {"type":"chart","x":{"min":0,"max":10,"step":1,"label":"x"},"y":{"min":0,"max":20,"step":2,"label":"y"},"grid":true,"origin":"O","series":[{"kind":"points","points":[[1,7.3],[1.5,6.3],[3,9],[3.5,11.7],[5,13.5],[5.5,11.6],[6,14.3],[7,17.2],[8,18.8]]},{"kind":"line","points":[[0,4.6],[10,24.6]]}]},
  'TD-22-07': {"type":"chart","x":{"min":0,"max":10,"step":2,"label":"x"},"y":{"min":0,"max":20,"step":2},"grid":true,"series":[{"kind":"points","points":[[1,5],[2,9],[3,8.5],[4,9.5],[5,14],[6,11],[7,8],[8,11.5],[9,15.5]]},{"kind":"line","points":[[-1,4.65],[11,14.85]]}]},
  'TD-22-08': {"type":"chart","x":{"min":100,"max":130,"step":5,"label":"x","labels":[100,110,120,130]},"y":{"min":13,"max":15,"step":0.5,"label":"y"},"grid":true,"series":[{"kind":"points","points":[[100,14.2],[105,14.3],[110,14.5],[114,14.5],[118,14.7],[118.5,14.6],[125,14.9],[127,14.95],[128,14.9],[130,15]]},{"kind":"line","points":[[100,14.2],[130,15]]}]},
  'TD-22-09': { type: 'chart', x: { min: 0, max: 9, step: 1, label: 'Time (seconds)' }, y: { min: 0, max: 11, step: 1, label: 'Momentum (newton-seconds)' }, grid: true, series: [{ kind: 'line', points: [[0, 1], [1, 1.6], [2, 2], [3, 2.9], [4, 4], [5, 5.6], [6, 8], [7, 9.5], [7.5, 9.7], [8, 9]] }, { kind: 'points', points: [[0, 1], [2, 2], [4, 4], [6, 8], [8, 9]] }] },
  'TD-22-10': {"type":"chart","x":{"min":0,"max":8,"step":1,"label":"Time (days since June 1)"},"y":{"min":0,"max":80,"step":10,"label":"Temperature (°F)"},"grid":true,"series":[{"kind":"points","points":[[1,68],[2,60],[3,75],[4,68],[5,66],[6,63],[7,66]]}]},
  'TD-22-11': {"type":"chart","x":{"min":0,"max":45,"step":15,"label":"x"},"y":{"min":0,"max":60,"step":15,"label":"y"},"grid":true,"series":[{"kind":"points","points":[[11,45],[13,45.5],[14,43.5],[14.5,40.5],[14,37.5],[22,34],[26,30],[31,30],[33,25.5],[35,25],[37,28],[38,21]]},{"kind":"line","points":[[10,47],[39,20]]}]},
  'TD-22-12': {"type":"chart","x":{"min":0,"max":5,"step":1},"y":{"min":0,"max":14,"step":2,"label":"Population (in thousands)"},"grid":true,"series":[{"kind":"exp","a":3,"b":1.201}]},
  'TD-22-13': {"type":"chart","x":{"min":0,"max":5,"step":1},"y":{"min":0,"max":14,"step":2,"label":"y"},"grid":true,"series":[{"kind":"exp","a":5,"b":1.489}]},
  'TD-22-15': {"type":"chart","x":{"min":0,"max":10,"step":1,"label":"x"},"y":{"min":0,"max":800,"step":200},"grid":true,"series":[{"kind":"points","points":[[1,140],[2,350],[4,490],[6,625],[8,710],[9,680]]},{"kind":"line","points":[[0,170],[10.5,840]]}]},
  'TD-22-16': {"type":"chart","x":{"min":2000,"max":2050,"step":10,"label":"Years"},"y":{"min":0,"max":7000,"step":1000,"label":"Population"},"grid":true,"series":[{"kind":"points","points":[[2000,1000],[2005,1500],[2010,2400],[2015,3000],[2020,3400],[2025,4100],[2030,4900],[2035,5500],[2040,5900],[2045,6450],[2050,6500]]},{"kind":"line","points":[[2000,1000],[2050,6500]]}]},
  'TD-22-17': { type: 'chart', x: { min: 0, max: 6, step: 1, label: 'x' }, y: { min: 0, max: 13, step: 1, label: 'y' }, grid: true, series: [{ kind: 'line', points: [[0, 7], [1, 8.8], [2, 10], [3, 10.6], [4, 11], [5, 10.7], [6, 10]] }] },
  'TD-23-21': {"type":"chart","x":{"min":0,"max":80,"step":10,"label":"Time (minutes)"},"y":{"min":0,"max":80,"step":10,"label":"Concentration of bacteria (millions of cells per mL)"},"grid":true,"series":[{"kind":"exp","a":10,"b":1.019}]},
  'TD-25-07': {"type":"chart","x":{"min":1,"max":19,"step":3,"labels":[4,7,10,13,16]},"y":{"min":0,"max":7,"step":1},"grid":false,"yAxis":false,"series":[{"kind":"points","points":[[4,0.5],[4,1.5],[4,2.5],[4,3.5],[4,4.5],[7,0.5],[7,1.5],[7,2.5],[7,3.5],[7,4.5],[7,5.5],[10,0.5],[10,1.5],[10,2.5],[13,0.5],[13,1.5],[13,2.5],[13,3.5],[13,4.5],[13,5.5],[16,0.5],[16,1.5],[16,2.5],[16,3.5],[16,4.5]]}]},
  'TD-25-15': { type: 'chart', x: { min: 0, max: 5, step: 1, cats: [['Plot 1', 1.4], ['Plot 2', 2.4], ['Plot 3', 3.4], ['Plot 4', 4.4]] }, y: { min: 0, max: 90, step: 10, label: 'Trees planted', showZero: true }, grid: true, series: [{ kind: 'bar', bars: [{ x0: 1, x1: 1.8, h: 65 }, { x0: 2, x1: 2.8, h: 75 }, { x0: 3, x1: 3.8, h: 80 }, { x0: 4, x1: 4.8, h: 59 }] }] },
  'TD-25-16': { type: 'chart', x: { min: 0, max: 6, step: 1, cats: [['daisy', 1.4], ['orchid', 2.4], ['tulip', 3.4], ['lily', 4.4], ['sunflower', 5.4]] }, y: { min: 0, max: 200, step: 20, label: 'Number of flowers', showZero: true }, grid: true, series: [{ kind: 'bar', bars: [{ x0: 1, x1: 1.8, h: 60 }, { x0: 2, x1: 2.8, h: 100 }, { x0: 3, x1: 3.8, h: 190 }, { x0: 4, x1: 4.8, h: 180 }, { x0: 5, x1: 5.8, h: 170 }] }] },
  'TD-33-09': {"type":"chart","x":{"min":-6,"max":6,"step":1},"y":{"min":-14,"max":12,"step":2,"labels":[-4,-8,-12]},"grid":true,"origin":"O","series":[{"kind":"line","points":[[-6,12],[-5.75,12],[-5.5,12],[-5.25,12],[-5,12],[-4.75,12],[-4.5,12],[-4.25,12],[-4,12],[-3.75,12],[-3.5,12],[-3.25,6.02],[-3,0],[-2.75,-4.69],[-2.5,-8.17],[-2.25,-10.56],[-2,-12],[-1.75,-12.6],[-1.5,-12.5],[-1.25,-11.81],[-1,-10.67],[-0.75,-9.19],[-0.5,-7.5],[-0.25,-5.73],[0,-4],[0.25,-2.44],[0.5,-1.17],[0.75,-0.31],[1,0],[1.25,-0.35],[1.5,-1.5],[1.75,-3.56],[2,-6.67],[2.25,-10.94],[2.5,-14],[2.75,-14],[3,-14],[3.25,-14],[3.5,-14],[3.75,-14],[4,-14],[4.25,-14],[4.5,-14],[4.75,-14],[5,-14],[5.25,-14],[5.5,-14],[5.75,-14],[6,-14]]}],"marks":[{"x":-3,"y":0},{"x":1,"y":0},{"x":0,"y":-4}]},
  'TD-33-10': {"type":"chart","x":{"min":0,"max":12,"step":2},"y":{"min":-8,"max":8,"step":2},"grid":true,"origin":"O","series":[{"kind":"line","points":[[0,-8],[1,-8],[2,-8],[3,-8],[4,-8],[5,-8],[5.5,-7],[6,-5.5],[6.3,-4.6],[6.6,-4.3],[7,-4],[7.5,-4],[8,-4],[8.5,-4],[9,-3],[9.5,-2],[10,0],[10.5,2.5],[11,6],[11.3,8],[12,8]]}]},
  'TD-33-20': {"type":"chart","x":{"min":-12,"max":8,"step":4,"label":"x"},"y":{"min":-10,"max":8,"step":2,"labels":[-8,-6,-4,-2,2,4,6]},"grid":true,"origin":"O","series":[{"kind":"line","points":[[-12,1.29],[-11.8,1.29],[-11.6,1.3],[-11.4,1.31],[-11.2,1.32],[-11,1.33],[-10.8,1.34],[-10.6,1.36],[-10.4,1.37],[-10.2,1.38],[-10,1.4],[-9.8,1.42],[-9.6,1.43],[-9.4,1.45],[-9.2,1.48],[-9,1.5],[-8.8,1.53],[-8.6,1.56],[-8.4,1.59],[-8.2,1.62],[-8,1.67],[-7.8,1.71],[-7.6,1.77],[-7.4,1.83],[-7.2,1.91],[-7,2],[-6.8,2.11],[-6.6,2.25],[-6.4,2.43],[-6.2,2.67],[-6,3],[-5.8,3.5],[-5.6,4.33],[-5.4,6]]},{"kind":"line","points":[[-4.7,-5.67],[-4.5,-3],[-4.3,-1.86],[-4.1,-1.22],[-3.9,-0.82],[-3.7,-0.54],[-3.5,-0.33],[-3.3,-0.18],[-3.1,-0.05],[-2.9,0.05],[-2.7,0.13],[-2.5,0.2],[-2.3,0.26],[-2.1,0.31],[-1.9,0.35],[-1.7,0.39],[-1.5,0.43],[-1.3,0.46],[-1.1,0.49],[-0.9,0.51],[-0.7,0.53],[-0.5,0.56],[-0.3,0.57],[-0.1,0.59],[0.1,0.61],[0.3,0.62],[0.5,0.64],[0.7,0.65],[0.9,0.66],[1.1,0.67],[1.3,0.68],[1.5,0.69],[1.7,0.7],[1.9,0.71],[2.1,0.72],[2.3,0.73],[2.5,0.73],[2.7,0.74],[2.9,0.75],[3.1,0.75],[3.3,0.76],[3.5,0.76],[3.7,0.77],[3.9,0.78],[4.1,0.78],[4.3,0.78],[4.5,0.79],[4.7,0.79],[4.9,0.8],[5.1,0.8],[5.3,0.81],[5.5,0.81],[5.7,0.81],[5.9,0.82],[6.1,0.82],[6.3,0.82],[6.5,0.83],[6.7,0.83],[6.9,0.83],[7.1,0.83],[7.3,0.84],[7.5,0.84],[7.7,0.84],[7.9,0.84]]}]},
  'TD-34-18': {"type":"chart","x":{"min":-3,"max":3,"step":1},"y":{"min":0,"max":15,"step":1},"grid":true,"origin":"O","series":[{"kind":"exp","a":1,"b":4,"c":8}]},
  'TD-35-12': {"type":"chart","x":{"min":0,"max":4,"step":1,"label":"x"},"y":{"min":0,"max":1200,"step":400,"label":"y"},"grid":true,"series":[{"kind":"exp","a":300,"b":2.5}]},
  'TD-35-14': {"type":"chart","x":{"min":0,"max":14,"step":2},"y":{"min":0,"max":10,"step":2},"grid":true,"origin":"O","series":[{"kind":"line","points":[[0,4],[2,4.5],[4,5],[6,5.7],[8,6.5],[10,7.3],[12,8.2],[14,9.3]]}]},
  'SP1-025': { type: 'chart', x: { min: -10, max: 10, step: 2, label: 'x' }, y: { min: -10, max: 10, step: 2, label: 'y' }, grid: true, series: [{ kind: 'line', points: [[-10, 6], [10, 1.5]] }, { kind: 'line', points: [[-10, 2], [10, 2]] }], marks: [{ x: -5, y: 5 }, { x: 8, y: 2 }] },
  'SP1-058': {"type":"chart","x":{"min":-10,"max":10,"step":2},"y":{"min":-10,"max":10,"step":2},"grid":true,"series":[{"kind":"line","points":[[-10,36],[10,-24]]}],"marks":[{"x":0,"y":6},{"x":2,"y":0}]},
  'SP1-085': {"type":"chart","x":{"min":-10,"max":1,"step":1,"label":"x"},"y":{"min":-10,"max":1,"step":1,"label":"y"},"grid":true,"origin":"O","series":[{"kind":"line","points":[[-7.2,1],[1,-5.83]]}],"marks":[{"x":-6,"y":0},{"x":0,"y":-5}]},
  'TD-24-05': {"type":"table","head":["Rock type","Frequency"],"rows":[["igneous","10"],["metamorphic","23"],["sedimentary","17"]]},
  /* ===== 补建：13 题缺失配图（2026-11-14；TD-42-04 源图已自练习册 p205 提取，几何已核对 x=65°） ===== */
  'TD-34-06': {type:"chart",x:{min:-4,max:4,step:2,label:"x"},y:{min:-10,max:10,step:5,label:"y"},series:[{kind:"line",points:[[-4,-8],[4,-8]],dash:"5 4"},{kind:"line",points:[[-4,-7.938],[-3.8,-7.928],[-3.6,-7.918],[-3.4,-7.905],[-3.2,-7.891],[-3,-7.875],[-2.8,-7.856],[-2.6,-7.835],[-2.4,-7.811],[-2.2,-7.782],[-2,-7.75],[-1.8,-7.713],[-1.6,-7.67],[-1.4,-7.621],[-1.2,-7.565],[-1,-7.5],[-0.8,-7.426],[-0.6,-7.34],[-0.4,-7.242],[-0.2,-7.129],[0,-7],[0.2,-6.851],[0.4,-6.68],[0.6,-6.484],[0.8,-6.259],[1,-6],[1.2,-5.703],[1.4,-5.361],[1.6,-4.969],[1.8,-4.518],[2,-4],[2.2,-3.405],[2.4,-2.722],[2.6,-1.937],[2.8,-1.036],[3,0],[3.2,1.19],[3.4,2.556],[3.6,4.126],[3.8,5.929],[4,8]]}]},
  'SR-059': {type:"chart",x:{min:0,max:9,step:1,label:"x"},y:{min:0,max:12,step:2,label:"y"},series:[{kind:"line",points:[[-2,-8],[-1.8,-6.82],[-1.6,-5.68],[-1.4,-4.58],[-1.2,-3.52],[-1,-2.5],[-0.8,-1.52],[-0.6,-0.58],[-0.4,0.32],[-0.2,1.18],[0,2],[0.2,2.78],[0.4,3.52],[0.6,4.22],[0.8,4.88],[1,5.5],[1.2,6.08],[1.4,6.62],[1.6,7.12],[1.8,7.58],[2,8],[2.2,8.38],[2.4,8.72],[2.6,9.02],[2.8,9.28],[3,9.5],[3.2,9.68],[3.4,9.82],[3.6,9.92],[3.8,9.98],[4,10],[4.2,9.98],[4.4,9.92],[4.6,9.82],[4.8,9.68],[5,9.5],[5.2,9.28],[5.4,9.02],[5.6,8.72],[5.8,8.38],[6,8],[6.2,7.58],[6.4,7.12],[6.6,6.62],[6.8,6.08],[7,5.5],[7.2,4.88],[7.4,4.22],[7.6,3.52],[7.8,2.78],[8,2],[8.2,1.18],[8.4,0.32],[8.6,-0.58],[8.8,-1.52],[9,-2.5],[9.2,-3.52],[9.4,-4.58],[9.6,-5.68],[9.8,-6.82],[10,-8]]}],marks:[{x:6.3,y:8.2,label:"y = f(x)",arrow:true}]},
  'SP1-071': {type:"chart",x:{min:-1,max:4,step:1,label:"x"},y:{min:-8,max:8,step:2,label:"y"},series:[{kind:"line",points:[[-1,5.4],[-0.833,5],[-0.667,4.6],[-0.5,4.2],[-0.333,3.8],[-0.167,3.4],[0,3],[0.167,2.6],[0.333,2.2],[0.5,1.8],[0.667,1.4],[0.833,1],[1,0.6],[1.167,0.2],[1.333,-0.2],[1.5,-0.6],[1.667,-1],[1.833,-1.4],[2,-1.8],[2.167,-2.2],[2.333,-2.6],[2.5,-3],[2.667,-3.4],[2.833,-3.8],[3,-4.2],[3.167,-4.6],[3.333,-5],[3.5,-5.4],[3.667,-5.8],[3.833,-6.2],[4,-6.6]]}],marks:[{x:1.25,y:0,label:"x-int",dx:6,dy:14}]},
  'SP1-102': {type:"chart",x:{min:-5,max:5,step:5,label:"x"},y:{min:0,max:40,step:8,label:"y"},series:[{kind:"line",points:[[-6,-5],[-5.6,-3.4],[-5.2,-1.8],[-4.8,-0.2],[-4.4,1.4],[-4,3],[-3.6,4.6],[-3.2,6.2],[-2.8,7.8],[-2.4,9.4],[-2,11],[-1.6,12.6],[-1.2,14.2],[-0.8,15.8],[-0.4,17.4],[0,19],[0.4,20.6],[0.8,22.2],[1.2,23.8],[1.6,25.4],[2,27],[2.4,28.6],[2.8,30.2],[3.2,31.8],[3.6,33.4],[4,35],[4.4,36.6],[4.8,38.2],[5.2,39.8],[5.6,41.4],[6,43]]}],marks:[{x:0,y:19,label:"y-int",dx:8,dy:-6}]},
  'TD-33-11': {type:"chart",x:{min:-8,max:16,step:2,label:"x"},y:{min:0,max:11000,step:2000,label:"y"},series:[{kind:"line",points:[[-8,-4400],[-7.7,-3689],[-7.4,-2996],[-7.1,-2321],[-6.8,-1664],[-6.5,-1025],[-6.2,-404],[-5.9,199],[-5.6,784],[-5.3,1351],[-5,1900],[-4.7,2431],[-4.4,2944],[-4.1,3439],[-3.8,3916],[-3.5,4375],[-3.2,4816],[-2.9,5239],[-2.6,5644],[-2.3,6031],[-2,6400],[-1.7,6751],[-1.4,7084],[-1.1,7399],[-0.8,7696],[-0.5,7975],[-0.2,8236],[0.1,8479],[0.4,8704],[0.7,8911],[1,9100],[1.3,9271],[1.6,9424],[1.9,9559],[2.2,9676],[2.5,9775],[2.8,9856],[3.1,9919],[3.4,9964],[3.7,9991],[4,10000],[4.3,9991],[4.6,9964],[4.9,9919],[5.2,9856],[5.5,9775],[5.8,9676],[6.1,9559],[6.4,9424],[6.7,9271],[7,9100],[7.3,8911],[7.6,8704],[7.9,8479],[8.2,8236],[8.5,7975],[8.8,7696],[9.1,7399],[9.4,7084],[9.7,6751],[10,6400],[10.3,6031],[10.6,5644],[10.9,5239],[11.2,4816],[11.5,4375],[11.8,3916],[12.1,3439],[12.4,2944],[12.7,2431],[13,1900],[13.3,1351],[13.6,784],[13.9,199],[14.2,-404],[14.5,-1025],[14.8,-1664],[15.1,-2321],[15.4,-2996],[15.7,-3689],[16,-4400]]}],marks:[{x:4,y:10000,label:"vertex",dx:8,dy:-10}]},
  'TD-33-22': {type:"chart",x:{min:-5,max:3,step:2,label:"x"},y:{min:-30,max:120,step:30,label:"y"},series:[{kind:"line",points:[[-5,-28],[-4.9,-24.799],[-4.8,-21.792],[-4.7,-18.973],[-4.6,-16.336],[-4.5,-13.875],[-4.4,-11.584],[-4.3,-9.457],[-4.2,-7.488],[-4.1,-5.671],[-4,-4],[-3.9,-2.469],[-3.8,-1.072],[-3.7,0.197],[-3.6,1.344],[-3.5,2.375],[-3.4,3.296],[-3.3,4.113],[-3.2,4.832],[-3.1,5.459],[-3,6],[-2.9,6.461],[-2.8,6.848],[-2.7,7.167],[-2.6,7.424],[-2.5,7.625],[-2.4,7.776],[-2.3,7.883],[-2.2,7.952],[-2.1,7.989],[-2,8],[-1.9,7.991],[-1.8,7.968],[-1.7,7.937],[-1.6,7.904],[-1.5,7.875],[-1.4,7.856],[-1.3,7.853],[-1.2,7.872],[-1.1,7.919],[-1,8],[-0.9,8.121],[-0.8,8.288],[-0.7,8.507],[-0.6,8.784],[-0.5,9.125],[-0.4,9.536],[-0.3,10.023],[-0.2,10.592],[-0.1,11.249],[0,12],[0.1,12.851],[0.2,13.808],[0.3,14.877],[0.4,16.064],[0.5,17.375],[0.6,18.816],[0.7,20.393],[0.8,22.112],[0.9,23.979],[1,26],[1.1,28.181],[1.2,30.528],[1.3,33.047],[1.4,35.744],[1.5,38.625],[1.6,41.696],[1.7,44.963],[1.8,48.432],[1.9,52.109],[2,56],[2.1,60.111],[2.2,64.448],[2.3,69.017],[2.4,73.824],[2.5,78.875],[2.6,84.176],[2.7,89.733],[2.8,95.552],[2.9,101.639],[3,108]]}],marks:[{x:0,y:12,label:"y-int",dx:8,dy:-6}]},
  'TD-35-19': {type:"chart",x:{min:0,max:18,step:2,label:"x"},y:{min:10000,max:11000,step:1000,label:"y"},series:[{kind:"line",points:[[0,10294.231],[0.225,10314.048],[0.45,10333.37],[0.675,10352.195],[0.9,10370.524],[1.125,10388.357],[1.35,10405.694],[1.575,10422.534],[1.8,10438.879],[2.025,10454.727],[2.25,10470.08],[2.475,10484.936],[2.7,10499.296],[2.925,10513.16],[3.15,10526.528],[3.375,10539.399],[3.6,10551.775],[3.825,10563.654],[4.05,10575.038],[4.275,10585.925],[4.5,10596.316],[4.725,10606.211],[4.95,10615.61],[5.175,10624.512],[5.4,10632.919],[5.625,10640.829],[5.85,10648.244],[6.075,10655.162],[6.3,10661.584],[6.525,10667.51],[6.75,10672.94],[6.975,10677.873],[7.2,10682.311],[7.425,10686.252],[7.65,10689.698],[7.875,10692.647],[8.1,10695.1],[8.325,10697.057],[8.55,10698.518],[8.775,10699.482],[9,10699.951],[9.225,10699.923],[9.45,10699.4],[9.675,10698.38],[9.9,10696.864],[10.125,10694.852],[10.35,10692.344],[10.575,10689.339],[10.8,10685.839],[11.025,10681.842],[11.25,10677.35],[11.475,10672.361],[11.7,10666.876],[11.925,10660.895],[12.15,10654.418],[12.375,10647.444],[12.6,10639.975],[12.825,10632.009],[13.05,10623.548],[13.275,10614.59],[13.5,10605.136],[13.725,10595.186],[13.95,10584.74],[14.175,10573.797],[14.4,10562.359],[14.625,10550.424],[14.85,10537.994],[15.075,10525.067],[15.3,10511.644],[15.525,10497.725],[15.75,10483.31],[15.975,10468.398],[16.2,10452.991],[16.425,10437.087],[16.65,10420.688],[16.875,10403.792],[17.1,10386.4],[17.325,10368.512],[17.55,10350.128],[17.775,10331.247],[18,10311.871]]}],marks:[{x:9.1,y:10700,label:"vertex",dx:8,dy:-10}]},
  'TD-42-04': {type:"rawSvg",svg:"<svg viewBox='0 0 420 320' xmlns='http://www.w3.org/2000/svg'>   <line x1='40' y1='280' x2='292' y2='280' stroke='#162c46' stroke-width='2'/>   <line x1='40' y1='280' x2='357' y2='50' stroke='#162c46' stroke-width='2'/>   <line x1='166' y1='188' x2='292' y2='280' stroke='#162c46' stroke-width='2'/>   <line x1='357' y1='50' x2='250' y2='280' stroke='#162c46' stroke-width='2'/>   <circle cx='40' cy='280' r='3' fill='#0f2a47'/>   <circle cx='292' cy='280' r='3' fill='#0f2a47'/>   <circle cx='166' cy='188' r='3' fill='#0f2a47'/>   <circle cx='250' cy='280' r='3' fill='#0f2a47'/>   <circle cx='357' cy='50' r='3' fill='#0f2a47'/>   <text x='40' y='302' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>D</text>   <text x='292' y='302' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>A</text>   <text x='250' y='302' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>E</text>   <text x='156' y='180' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='end'>C</text>   <text x='365' y='44' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='start'>B</text>   <path d='M 262.7 252.8 L 265.7 254.4 L 268.5 256.3 L 271.0 258.6 L 273.3 261.1 L 275.3 263.9 L 277.0 266.8 L 278.3 270.0 L 279.2 273.2 L 279.8 276.6 L 280.0 280.0' fill='none' stroke='#c2410c' stroke-width='1.6'/>   <path d='M 193.5 208.0 L 189.2 212.8 L 184.2 216.7 L 178.5 219.6 L 172.4 221.4 L 166.0 222.0 L 159.6 221.4 L 153.5 219.6 L 147.8 216.7 L 142.8 212.8 L 138.5 208.0' fill='none' stroke='#c2410c' stroke-width='1.6'/>   <path d='M 344.3 77.2 L 343.0 76.5 L 341.6 75.8 L 340.4 75.0 L 339.1 74.1 L 337.9 73.1 L 336.7 72.1 L 335.6 71.1 L 334.6 70.0 L 333.6 68.8 L 332.7 67.6' fill='none' stroke='#c2410c' stroke-width='1.6'/>   <text x='294' y='274' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='start'>x°</text>   <text x='126' y='206' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='end'>108°</text>   <text x='381' y='36' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='start'>29°</text>   </svg>"},
  /* ===== 图表还原：把 OCR 的 [Table:/Graph:] 文本占位符换成真正的表格/坐标图 ===== */
  'SR-082': {type:"table",head:["x","y"],rows:[["21","-8"],["23","8"],["25","-8"]]},
  'SR-098': {type:"table",head:["x","h(x)"],rows:[["0","1.34"],["2","1.83"],["4","2.51"]]},
  'SR-173': {type:"table",head:["Number of cars","Maximum number of passengers and crew"],rows:[["2","79"],["5","187"],["9","331"]]},
  'SR-176': {type:"table",caption:"Energy per Gram of Typical Macronutrients",head:["Macronutrient","Food calories","Kilojoules"],rows:[["Protein","4.0","16.7"],["Fat","9.0","37.7"],["Carbohydrate","4.0","16.7"]]},
  'SR-177': {type:"table",head:["Amount of salt (grams)","Amount of water (liters)"],rows:[["195","5"],["234","6"],["273","7"]]},
  'SR-184': {type:"chart",x:{min:0,max:20,step:2,label:"Number of cornflowers"},y:{min:0,max:20,step:2,label:"Number of wallflowers"},series:[{kind:"points",points:[[0,12],[4,9],[8,6],[12,3],[16,0]]}]},
  'SR-185': {type:"chart",x:{min:0,max:20,step:2,label:"Hours at job A"},y:{min:0,max:10,step:5,label:"Number of hours at job B"},series:[{kind:"line",points:[[0,8],[16,0]]}]},
  'SR-187': {type:"chart",x:{min:0,max:100,step:10,label:"Company A"},y:{min:0,max:50,step:10,label:"Company B"},series:[{kind:"line",points:[[0,35],[90,0]]}]},
  /* ===== 表格题图表补全（题干引用 table above 但 OCR 把表格压进文字）===== */
  'SR-126': {type:"table",caption:"Growth of a Culture of Bacteria",head:["Day","Number of bacteria per milliliter at end of day"],rows:[["1","2.5 × 10^5"],["2","5.0 × 10^5"],["3","1.0 × 10^6"]]},
  'SR-137': {type:"table",head:["x","f(x)"],rows:[["1","a"],["2","a^5"],["3","a^9"]]},
  'SR-155': {type:"table",head:["x","p(x)"],rows:[["-2","5"],["-1","0"],["0","-3"],["1","-1"],["2","0"]]},
  'SP1-049': {type:"table",head:["x","f(x)"],rows:[["-11","21"],["-10","18"],["-9","15"],["-8","12"]]},
  'SP1-091': {type:"table",head:["x","y"],rows:[["3","7"],["k","11"],["12","n"]]},

  // SR-240: f(x)=a/(x+b), partial graph with vertical asymptote x=-4.
  // Passes (-7,-2),(-6,-3),(-5,-6) => f(x)=6/(x+4). Grid x:-10..0, y:-10..-1.
  'SR-240': {type:"chart",x:{min:-10,max:0,step:1,label:"x"},y:{min:-10,max:-1,step:1,label:"y"},series:[{kind:"line",points:[[-10.0,-1.0],[-9.88,-1.02],[-9.76,-1.042],[-9.64,-1.064],[-9.52,-1.087],[-9.4,-1.111],[-9.28,-1.136],[-9.16,-1.163],[-9.04,-1.19],[-8.92,-1.22],[-8.8,-1.25],[-8.68,-1.282],[-8.56,-1.316],[-8.44,-1.351],[-8.32,-1.389],[-8.2,-1.429],[-8.08,-1.471],[-7.96,-1.515],[-7.84,-1.562],[-7.72,-1.613],[-7.6,-1.667],[-7.48,-1.724],[-7.36,-1.786],[-7.24,-1.852],[-7.12,-1.923],[-7.0,-2.0],[-6.88,-2.083],[-6.76,-2.174],[-6.64,-2.273],[-6.52,-2.381],[-6.4,-2.5],[-6.28,-2.632],[-6.16,-2.778],[-6.04,-2.941],[-5.92,-3.125],[-5.8,-3.333],[-5.68,-3.571],[-5.56,-3.846],[-5.44,-4.167],[-5.32,-4.545],[-5.2,-5.0],[-5.08,-5.556],[-4.96,-6.25],[-4.84,-7.143],[-4.72,-8.333],[-4.6,-10.0],[-4.6,-10.0]]}]},
  // SR-228: 下降直线 y=-(1/4)x+2 (graph of f(x)+14), grid -10..10
  'SR-228': {type:"chart",x:{"min":-10,"max":10,"step":2,"label":"x"},y:{"min":-10,"max":10,"step":2,"label":"y"},series:[{"kind":"line","points":[[-10,4.5],[10,-0.5]]}]},
  // SR-229: 陡升直线 y=4x+1, grid -6..6
  'SR-229': {type:"chart",x:{"min":-6,"max":6,"step":2,"label":"x"},y:{"min":-6,"max":6,"step":2,"label":"y"},series:[{"kind":"line","points":[[-1.75,-6],[1.25,6]]}]},
  // SR-238: 下降直线 (graph of f(x)+19), y-int 3, x-int 1, grid x-5..5 y-1..12
  'SR-238': {type:"chart",x:{"min":-5,"max":5,"step":2,"label":"x"},y:{"min":-1,"max":12,"step":2,"label":"y"},series:[{"kind":"line","points":[[-2,11],[1.5,-1]]}]},
  // SR-239: 抛物线 y=2x^2+4x-6, vertex(-1,-8), roots -3/1, y-int -6
  'SR-239': {type:"chart",x:{"min":-6,"max":4,"step":2,"label":"x"},y:{"min":-10,"max":4,"step":2,"label":"y"},series:[{"kind":"line","points":[[-3.5,4.5],[-3.25,2.12],[-3.0,0.0],[-2.75,-1.88],[-2.5,-3.5],[-2.25,-4.88],[-2.0,-6.0],[-1.75,-6.88],[-1.5,-7.5],[-1.25,-7.88],[-1.0,-8.0],[-0.75,-7.88],[-0.5,-7.5],[-0.25,-6.88],[0.0,-6.0],[0.25,-4.88],[0.5,-3.5],[0.75,-1.88],[1.0,0.0],[1.25,2.12],[1.5,4.5]]},{"kind":"points","points":[[-2,-6],[0,-6],[-1,-8]]}]},
  // SR-241: 散点图 6 points decaying toward y=8
  'SR-241': {type:"chart",x:{"min":-8,"max":8,"step":2,"label":"x"},y:{"min":0,"max":22,"step":2,"label":"y"},series:[{"kind":"points","points":[[-6,20],[-5,18],[-1,10],[0,9],[3,9],[6,8]]}]},
  // SR-230: 2-column table of x/y values for line h.
  'SR-230': {type:"table",head:["x","y"],rows:[["18","130"],["23","160"],["26","178"]]},
  'SR-215': {type:"table",caption:"Townsend Realty Group Investments",head:["Property address","Purchase price (dollars)","Monthly rental price (dollars)"],rows:[["Clearwater Lane","128,000","950"],["Driftwood Drive","176,000","1,310"],["Edgemont Street","70,000","515"],["Glenview Street","140,000","1,040"],["Hamilton Circle","450,000","3,365"]]},


  /* PDF03 · Topic 17 表格（SP2-001/002） */
  'SP2-001': {
    'type': 'table',
    'head': ['Species of tree', 'Growth factor'],
    'rows': [
      ['Red maple', '4.5'],
      ['River birch', '3.5'],
      ['Cottonwood', '2.0'],
      ['Black walnut', '4.5'],
      ['White birch', '5.0'],
      ['American elm', '4.0'],
      ['Pin oak', '3.0'],
      ['Shagbark hickory', '7.5']
    ]
  },
  'SP2-002': {
    'type': 'table',
    'head': ['State', 'Low', 'Medium', 'High', 'Total'],
    'headGroups': [
      {
        'label': 'Power capacity',
        'span': 4
      }
    ],
    'rows': [
      ['Texas', '4', '2', '3', '9'],
      ['California', '1', '0', '1', '2'],
      ['Oregon', '1', '0', '1', '2'],
      ['Indiana', '0', '2', '0', '2'],
      ['Colorado', '1', '1', '0', '2'],
      ['Iowa', '2', '0', '0', '2'],
      ['Oklahoma', '1', '0', '0', '1'],
      ['Total', '10', '5', '5', '20']
    ]
  },
  'SP2-027': {
    type: 'chart',
    w: 460,
    h: 360,
    x: {
      min: 0,
      max: 12,
      step: 1,
      cats: [
        ['2003', 0], ['2004', 1], ['2005', 2], ['2006', 3], ['2007', 4],
        ['2008', 5], ['2009', 6], ['2010', 7], ['2011', 8], ['2012', 9],
        ['2013', 10], ['2014', 11], ['2015', 12]
      ]
    },
    y: { min: 0, max: 60, step: 10, label: 'Annual snowfall (inches)' },
    series: [
      {
        kind: 'line',
        points: [[0, 40], [1, 12], [2, 12], [3, 13], [4, 9], [5, 5], [6, 7], [7, 56], [8, 10], [9, 2], [10, 3], [11, 32], [12, 18]]
      },
      {
        kind: 'points',
        points: [[0, 40], [1, 12], [2, 12], [3, 13], [4, 9], [5, 5], [6, 7], [7, 56], [8, 10], [9, 2], [10, 3], [11, 32], [12, 18]]
      }
    ],
    marks: [
      { x: 0, y: 40, label: '(2003, 40)', dx: 12, dy: -16, ring: false },
      { x: 4, y: 9, label: '(2007, 10)', dx: 56, dy: -30, ring: false, arrow: true, bend: 16 }
    ]
  },
  /* PDF03 · Topic 18 表格（SP2-025/026/056） */
  'SP2-025': {
    'type': 'table',
    'head': ['', 'Warm', 'Cool', 'NO preference', 'Total'],
    'rows': [
      ['18-35 years old', '295', '168', '45', '508'],
      ['36-50 years old', '246', '123', '41', '410'],
      ['51-65 years old', '238', '117', '48', '403'],
      ['Greater than 65 years old', '137', '78', '64', '279'],
      ['Total', '916', '486', '198', '1,600']
    ]
  },
  'SP2-026': {
    'type': 'table',
    'head': ['Year', 'Subscriptions sold'],
    'rows': [
      ['2012', '5,600'],
      ['2013', '5,880']
    ]
  },
  'SP2-056': {
    'type': 'table',
    'head': ['Group', 'Number of objects'],
    'rows': [
      ['A', '225'],
      ['B', '66'],
      ['C', '414'],
      ['D', '99'],
      ['Total', '804']
    ]
  },

  /* ===== 以下表格规格原由 stem-patch.js 运行时注册，2026-11 折叠入源（数据/执行分离） ===== */
  'SR-156': { type: 'table', head: ['x', 'y'], rows: [['-5', '0'], ['8', '0'], ['9', '0']] },
  'SP1-048': { type: 'table', head: ['x', 'f(x)'], rows: [['1', '-64'], ['2', '0'], ['3', '64']] },
  'SP1-050': { type: 'table', head: ['x', 'g(x)'], rows: [['1', '58'], ['2', '54'], ['3', '50'], ['4', '46']] },
  'SP1-053': { type: 'table', head: ['x', 'y'], rows: [['\u221212', '\u221245'], ['6', '45']] },
  'SP1-054': { type: 'table', head: ['x', 'y'], rows: [['\u221218', '\u221248'], ['7', '52']] },
  'SP1-089': { type: 'table', head: ['x', 'y'], rows: [['k', '13'], ['k + 7', '\u221215']] },
  'SP1-090': { type: 'table', head: ['x', 'f(x)'], rows: [['\u22124', '0'], ['\u221219/5', '1'], ['\u221218/5', '2']] },
  'SP1-092': { type: 'table', head: ['x', 'y'], rows: [['0', 'n'], ['4', 'n + 19'], ['8', 'n + 38']] },
  'SP1-099': { type: 'table', head: ['x', 'g(x)'], rows: [['\u221227', '3'], ['\u22129', '0'], ['21', '5']] },
  'SP1-101': { type: 'table', head: ['x', 'y'], rows: [['\u22122s', '24'], ['\u2212s', '21'], ['s', '15']] },

};


/* Answer-CHOICE graphs (one coordinate plane per option), for graph-choice
   questions where the A/B/C/D options are themselves graphs. Recovered from
   the original workbook PDF (练习册); rendered as clean SVG by figures.js
   `choiceGraph()`. Values are the actual intercepts / curve shapes on the
   0..10 grid used in the book (or a wider window where the roots demand it). */
window.TD_CHOICE_GRAPHS = {

  /* ===== 选项图统一改成「完整坐标平面」spec（2026-11-25 重画） =====
     旧版只有 {kind,xInt,yInt,xmax,ymax}，画出来是 300×300 的简化格子：
     没有刻度数字、没有原点 O、线只连两个截距、曲线靠手调系数。
     新版一律写成 chart 形态（x/y 轴定义 + series），由正式图的同一个
     chart() 渲染：网格 + 刻度数字 + 原点 O + 轴箭头（箭头尖端落在边框），
     线的两端用裁剪框切在坐标系里，跟原书「线穿出网格」一致。
     几何口径：斜率/截距由题干方程解出，不靠像素反推。 */

  /* 40x + 30y = 600 → x 截距 15、y 截距 20，正确答案 B。
     A = 截距对调(20,15)；D = 同斜率整体放大(30,40)。
     C 沿用仓库既有口径（同 B 的截距、坐标轴标注区间更小）；原页 p89 扫描
     不在仓库，这条无法核刻度，已在 docs/choice-figures-12.md 标为待核。 */
  'TD-22-14': {
    A: { x: { min: 0, max: 40, step: 10, label: 'x', labels: [10, 20, 30, 40] },
         y: { min: 0, max: 40, step: 10, label: 'y', labels: [10, 20, 30, 40] },
         series: [{ kind: 'line', points: [[0, 15], [40, -15]] }] },
    B: { x: { min: 0, max: 40, step: 10, label: 'x', labels: [10, 20, 30, 40] },
         y: { min: 0, max: 40, step: 10, label: 'y', labels: [10, 20, 30, 40] },
         series: [{ kind: 'line', points: [[0, 20], [15, 0]] }] },
    C: { x: { min: 0, max: 20, step: 5, label: 'x', labels: [5, 10, 15, 20] },
         y: { min: 0, max: 20, step: 5, label: 'y', labels: [5, 10, 15, 20] },
         series: [{ kind: 'line', points: [[0, 20], [15, 0]] }] },
    D: { x: { min: 0, max: 40, step: 10, label: 'x', labels: [10, 20, 30, 40] },
         y: { min: 0, max: 40, step: 10, label: 'y', labels: [10, 20, 30, 40] },
         series: [{ kind: 'line', points: [[0, 40], [30, 0]] }] }
  },

  /* 递降指数函数 → 正确答案 D（y 截距 10、向右单调减）。
     A/B 两条直线（升/降），C 递升指数（过 (0,1)、x≈6 到 10）；
     A、C 的形状与原页裁剪图逐格对得上，B、D 原页裁剪只拍到 A、C，属既有口径。 */
  'TD-33-18': {
    A: { x: { min: 0, max: 10, step: 1, label: 'x', labels: [2, 4, 6, 8, 10] },
         y: { min: 0, max: 10, step: 1, label: 'y', labels: [2, 4, 6, 8, 10] },
         series: [{ kind: 'line', points: [[0, -3], [10, 12]] }] },
    B: { x: { min: 0, max: 10, step: 1, label: 'x', labels: [2, 4, 6, 8, 10] },
         y: { min: 0, max: 10, step: 1, label: 'y', labels: [2, 4, 6, 8, 10] },
         series: [{ kind: 'line', points: [[0, 6], [10, -9]] }] },
    C: { x: { min: 0, max: 10, step: 1, label: 'x', labels: [2, 4, 6, 8, 10] },
         y: { min: 0, max: 10, step: 1, label: 'y', labels: [2, 4, 6, 8, 10] },
         series: [{ kind: 'exp', a: 1, b: 1.47 }] },
    D: { x: { min: 0, max: 10, step: 1, label: 'x', labels: [2, 4, 6, 8, 10] },
         y: { min: 0, max: 10, step: 1, label: 'y', labels: [2, 4, 6, 8, 10] },
         series: [{ kind: 'exp', a: 10, b: 0.46 }] }
  },

  /* f(x)=0 有一解 x=7、且含因式 (x+5) → 图像必须过 (-5,0) 与 (7,0)，答案 A。
     四条都是三次曲线，只差第三根的位置/重根/开口方向——刻度读得出来才分得清。 */
  'TD-33-19': {
    A: { x: { min: -6, max: 8, step: 2, label: 'x', labels: [-6, -4, -2, 2, 4, 6, 8] },
         y: { min: -6, max: 6, step: 2, label: 'y', labels: [-6, -4, -2, 2, 4, 6] },
         series: [{ kind: 'poly', roots: [-5, 3, 7], sign: -1 }] },
    B: { x: { min: -6, max: 8, step: 2, label: 'x', labels: [-6, -4, -2, 2, 4, 6, 8] },
         y: { min: -6, max: 6, step: 2, label: 'y', labels: [-6, -4, -2, 2, 4, 6] },
         series: [{ kind: 'poly', roots: [-5, 2, 7], sign: 1 }] },
    C: { x: { min: -6, max: 8, step: 2, label: 'x', labels: [-6, -4, -2, 2, 4, 6, 8] },
         y: { min: -6, max: 6, step: 2, label: 'y', labels: [-6, -4, -2, 2, 4, 6] },
         series: [{ kind: 'poly', roots: [-5, 2.5, 7], sign: 1 }] },
    D: { x: { min: -6, max: 8, step: 2, label: 'x', labels: [-6, -4, -2, 2, 4, 6, 8] },
         y: { min: -6, max: 6, step: 2, label: 'y', labels: [-6, -4, -2, 2, 4, 6] },
         series: [{ kind: 'poly', roots: [-5, 4.5, 4.5], sign: -1 }] }
  }
};

/* ax + by = b（0 < a < b）→ y = 1 − (a/b)x：y 截距 1、斜率在 (−1, 0)，
   正确答案 C（过 (0,1) 与 (3,0)）。SR-232 与 U1-01 是同一题同一组图，共用一份 spec。 */
window.TD_CHOICE_GRAPHS['U1-01'] = {
  A: { x: { min: -4, max: 4, step: 1, label: 'x', labels: [-4, -2, 2, 4] },
       y: { min: -4, max: 4, step: 1, label: 'y', labels: [-4, -2, 2, 4] },
       series: [{ kind: 'line', points: [[-4, 5], [4, -3]] }] },          /* y = -x + 1 */
  B: { x: { min: -4, max: 4, step: 1, label: 'x', labels: [-4, -2, 2, 4] },
       y: { min: -4, max: 4, step: 1, label: 'y', labels: [-4, -2, 2, 4] },
       series: [{ kind: 'line', points: [[-4, 3], [4, -5]] }] },          /* y = -x - 1 */
  C: { x: { min: -4, max: 4, step: 1, label: 'x', labels: [-4, -2, 2, 4] },
       y: { min: -4, max: 4, step: 1, label: 'y', labels: [-4, -2, 2, 4] },
       series: [{ kind: 'line', points: [[-4, 2.33], [4, -0.33]] }] },    /* y = -x/3 + 1 */
  D: { x: { min: -4, max: 4, step: 1, label: 'x', labels: [-4, -2, 2, 4] },
       y: { min: -4, max: 4, step: 1, label: 'y', labels: [-4, -2, 2, 4] },
       series: [{ kind: 'line', points: [[-4, 9], [4, -7]] }] }           /* y = -2x + 1 */
};
window.TD_CHOICE_GRAPHS['SR-232'] = window.TD_CHOICE_GRAPHS['U1-01'];



/* ===== 订正回写 FOLDED_PATCH_FIX (2026-11-22) =====
   原由 stem-patch.js / choice_crops.js 在运行时注入的图形订正，现固化为源数据。
   共 33 条 figure spec（10 新增 + 23 覆盖）与 1 条 choiceGraph；删补丁后此处为唯一来源。 */
Object.assign(window.TD_FIG_SPECS, {
  "U4-05": {"type":"rawSvg","svg":"<svg viewBox='0 0 360 240' xmlns='http://www.w3.org/2000/svg'>\n  <line x1='120' y1='30' x2='120' y2='210' stroke='#162c46' stroke-width='2.2'/>\n  <line x1='240' y1='30' x2='240' y2='210' stroke='#162c46' stroke-width='2.2'/>\n  <line x1='70' y1='215' x2='295' y2='25' stroke='#162c46' stroke-width='2.2'/>\n  <text x='120' y='22' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>r</text>\n  <text x='240' y='22' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>s</text>\n  <text x='303' y='24' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='start'>t</text>\n  <text x='92' y='196' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46'>x\u00b0</text>\n  <text x='258' y='60' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46'>y\u00b0</text>\n</svg>"},
  "TD-41-06": {"type":"rawSvg","svg":"<svg viewBox='0 0 360 240' xmlns='http://www.w3.org/2000/svg'>\n  <line x1='120' y1='30' x2='120' y2='210' stroke='#162c46' stroke-width='2.2'/>\n  <line x1='240' y1='30' x2='240' y2='210' stroke='#162c46' stroke-width='2.2'/>\n  <line x1='70' y1='215' x2='295' y2='25' stroke='#162c46' stroke-width='2.2'/>\n  <text x='120' y='22' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>r</text>\n  <text x='240' y='22' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>s</text>\n  <text x='303' y='24' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='start'>t</text>\n  <text x='92' y='196' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46'>x\u00b0</text>\n  <text x='258' y='60' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46'>y\u00b0</text>\n</svg>"},
  // 2026-11-24 阴影题补 region：讲义 p31 #2 / 练习册 p53 #1（U1-13 与 TD-15-01 同一张图）/ p54 #3
  "TD-25-05": {"type":"chart","x":{"min":80,"max":140,"step":10},"y":{"min":0,"max":10,"step":10},"yAxis":false,"grid":false,"series":[{"kind":"box","lo":85,"q1":98,"med":115,"q3":125,"hi":138}]},
  "TD-33-13": {"type":"rawSvg","svg":"<svg viewBox='0 0 430 190' xmlns='http://www.w3.org/2000/svg'>\n  <g stroke='#162c46' stroke-width='1.6' fill='none'>\n    <rect x='15' y='25' width='180' height='120'/>\n    <line x1='75' y1='25' x2='75' y2='145'/>\n    <line x1='115' y1='25' x2='115' y2='145'/>\n    <line x1='155' y1='25' x2='155' y2='145'/>\n    <line x1='15' y1='85' x2='195' y2='85'/>\n    <rect x='235' y='25' width='180' height='120'/>\n    <line x1='295' y1='25' x2='295' y2='145'/>\n    <line x1='335' y1='25' x2='335' y2='145'/>\n    <line x1='375' y1='25' x2='375' y2='145'/>\n    <line x1='235' y1='85' x2='415' y2='85'/>\n  </g>\n  <g font-family='Times New Roman,Georgia,serif' font-size='17' fill='#162c46' text-anchor='middle'>\n    <text x='45' y='64'>x</text>\n    <text x='95' y='64'>-1</text>\n    <text x='135' y='64'>0</text>\n    <text x='175' y='64'>1</text>\n    <text x='45' y='118'>q(x)</text>\n    <text x='95' y='118'>7</text>\n    <text x='135' y='118'>21</text>\n    <text x='175' y='118'>63</text>\n    <text x='265' y='64'>x</text>\n    <text x='315' y='64'>-1</text>\n    <text x='355' y='64'>0</text>\n    <text x='395' y='64'>1</text>\n    <text x='265' y='118'>q(x)</text>\n    <text x='315' y='106'>1</text>\n    <line x1='307' y1='112' x2='323' y2='112' stroke='#162c46' stroke-width='1.3'/>\n    <text x='315' y='128'>7</text>\n    <text x='355' y='118'>3</text>\n    <text x='395' y='118'>63</text>\n  </g>\n</svg>"},
  "TD-42-12": {"type":"table","head":["","Perimeter"],"rows":[["Triangle TUV","50"],["Triangle XYZ","150"]]},
  "TD-42-18": {"type":"triangle","pts":[[70,200],[290,200],[180,55]],"labels":["A","C","B"]},
  "TD-43-01": {"type":"rawSvg","svg":"<svg viewBox='0 0 440 300' xmlns='http://www.w3.org/2000/svg'>\n  <rect x='60' y='140' width='320' height='120' fill='none' stroke='#162c46' stroke-width='2'/>\n  <path d='M 60 140 A 90 90 0 0 1 240 140' fill='none' stroke='#162c46' stroke-width='2'/>\n  <circle cx='150' cy='140' r='3' fill='#0f2a47'/>\n  <text x='52' y='132' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>N</text>\n  <text x='240' y='132' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>P</text>\n  <text x='388' y='132' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>Q</text>\n  <text x='150' y='162' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>O</text>\n  <text x='52' y='282' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>S</text>\n  <text x='388' y='282' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>R</text>\n</svg>"},
  "TD-11-03": {"type":"chart","x":{"min":0,"max":10,"step":2,"label":"x"},"y":{"min":-10,"max":10,"step":2,"label":"y"},"grid":true,"origin":"O","series":[{"kind":"line","points":[[0,2],[4.5,-3]]}]},
  "TD-11-20": {"type":"chart","x":{"min":-6,"max":6,"step":2,"label":"x"},"y":{"min":-6,"max":6,"step":2,"label":"y"},"grid":true,"origin":"O","series":[{"kind":"line","points":[[0,6],[4.8,-6]]}]},
  "TD-22-09": {"type":"chart","x":{"min":0,"max":9,"step":1,"label":"Time (seconds)"},"y":{"min":0,"max":11,"step":1,"label":"Momentum (newton-seconds)"},"grid":true,"series":[{"kind":"line","points":[[0,1],[1,1.6],[2,2],[3,2.9],[4,4],[5,5.6],[6,8],[7,9.5],[7.5,9.7],[8,9]]},{"kind":"points","points":[[0,1],[2,2],[4,4],[6,8],[8,9]]}]},
  "TD-22-17": {"type":"chart","x":{"min":0,"max":6,"step":1,"label":"x"},"y":{"min":0,"max":13,"step":1,"label":"y"},"grid":true,"series":[{"kind":"line","points":[[0,7],[1,8.8],[2,10],[3,10.6],[4,11],[5,10.7],[6,10]]}]},
  "TD-25-15": {"type":"chart","x":{"min":0,"max":5,"step":1,"cats":[["Plot 1",1.4],["Plot 2",2.4],["Plot 3",3.4],["Plot 4",4.4]]},"y":{"min":0,"max":90,"step":10,"label":"Trees planted","showZero":true},"grid":true,"series":[{"kind":"bar","bars":[{"x0":1,"x1":1.8,"h":65},{"x0":2,"x1":2.8,"h":75},{"x0":3,"x1":3.8,"h":80},{"x0":4,"x1":4.8,"h":59}]}]},
  "SP1-025": {"type":"chart","x":{"min":-10,"max":10,"step":2,"label":"x"},"y":{"min":-10,"max":10,"step":2,"label":"y"},"grid":true,"series":[{"kind":"line","points":[[-10,6],[10,1.5]]},{"kind":"line","points":[[-10,2],[10,2]]}],"marks":[{"x":-5,"y":5},{"x":8,"y":2}]},
  "SR-176": {"type":"table",caption:"Energy per Gram of Typical Macronutrients","head":["Macronutrient","Food calories","Kilojoules"],"rows":[["Protein","4.0","16.7"],["Fat","9.0","37.7"],["Carbohydrate","4.0","16.7"]]},
  "SR-185": {"type":"chart","x":{"min":0,"max":20,"step":5,"label":"Number of hours at job A"},"y":{"min":0,"max":10,"step":5,"label":"Number of hours at job B"},"grid":true,"series":[{"kind":"line","points":[[16,0],[0,8]]}],"marks":[{"x":16,"y":0},{"x":0,"y":8}]},
  "SR-126": {"type":"table",caption:"Growth of a Culture of Bacteria","head":["Day","Number of bacteria per milliliter at end of day"],"rows":[["1","2.5 \u00d7 10\u2075"],["2","5.0 \u00d7 10\u2075"],["3","1.0 \u00d7 10\u2076"]]},
  "SR-137": {"type":"table","head":["x","f(x)"],"rows":[["1","a"],["2","a\u2075"],["3","a\u2079"]]},
  "SR-215": {"type":"table",caption:"Townsend Realty Group Investments","head":["Property address","Purchase price (dollars)","Monthly rental price (dollars)"],"rows":[["Clearwater Lane","128,000","950"],["Driftwood Drive","176,000","1,310"],["Edgemont Street","70,000","515"],["Glenview Street","140,000","1,040"],["Hamilton Circle","450,000","3,365"]]},
  "SR-156": {"type":"table","head":["x","y"],"rows":[["-5","0"],["8","0"],["9","0"]]},
  "SP1-048": {"type":"table","head":["x","f(x)"],"rows":[["1","-64"],["2","0"],["3","64"]]},
  "SP1-050": {"type":"table","head":["x","g(x)"],"rows":[["1","58"],["2","54"],["3","50"],["4","46"]]},
  "SP1-053": {"type":"table","head":["x","y"],"rows":[["\u221212","\u221245"],["6","45"]]},
  "SP1-054": {"type":"table","head":["x","y"],"rows":[["\u221218","\u221248"],["7","52"]]},
  "SP1-089": {"type":"table","head":["x","y"],"rows":[["k","13"],["k + 7","\u221215"]]},
  "SP1-090": {"type":"table","head":["x","f(x)"],"rows":[["\u22124","0"],["\u221219/5","1"],["\u221218/5","2"]]},
  "SP1-092": {"type":"table","head":["x","y"],"rows":[["0","n"],["4","n + 19"],["8","n + 38"]]},
  "SP1-099": {"type":"table","head":["x","g(x)"],"rows":[["\u221227","3"],["\u22129","0"],["21","5"]]},
  "SP1-101": {"type":"table","head":["x","y"],"rows":[["\u22122s","24"],["\u2212s","21"],["s","15"]]}
});
Object.assign(window.TD_FIG_SPECS, {
  /* ===== 阴影不等式图 → 矢量 spec 重画（2026-11-24） =====
     这 5 题此前依赖「原书图形 1:1 裁剪」的位图（有水印、有扫描噪点），
     现按要求改回矢量重画：轴在原点交叉（axesAt:'zero'）、网格步长与标签
     步长分离（与原书一致）、阴影由 region 多边形填出；无水印、无扫描纹。
     几何全部由题干不等式解析给出，不再依赖像素反推：
       U1-12            虚线 y = 1-4x，阴影 y > 1-4x        → 答案 D
       U1-13 / TD-15-01 虚线 y = 15x-20，阴影 y > 15x-20   → 答案 C（同一张图）
       TD-15-02         水平带 33 ≤ y ≤ 60                 → 答案 D（y ≥ 33）
       TD-15-03         实线 y = -2x+13，阴影 y > -2x+13   → 答案 D（(8,0) 在阴影内）
     标签步长按原书：U1-12/TD-15-03 每 2 标一次(网格 1)；U1-13 的 y 每 10 标一次
     (网格 5)；TD-15-02 的 x 每 5 标一次。 */
  "U1-12": {"type":"chart","w":430,"h":400,"x":{"min":-8,"max":8,"step":1,"label":"x","labels":[-8,-6,-4,-2,0,2,4,6,8]},"y":{"min":-8,"max":8,"step":1,"label":"y","labels":[-8,-6,-4,-2,2,4,6,8]},"grid":true,"origin":"O","axesAt":"zero","axisLabelsEnd":true,"yLabelPad":12,"series":[{"kind":"region","points":[[-1.85,8.4],[8.4,8.4],[8.4,-8.4],[2.35,-8.4]]},{"kind":"line","points":[[-1.85,8.4],[2.35,-8.4]],"dash":"7 4"}]},
  "U1-13": {"type":"chart","w":430,"h":420,"x":{"min":-7,"max":7,"step":1,"label":"x","labels":[-6,-4,-2,0,2,4,6]},"y":{"min":-55,"max":15,"step":5,"label":"y","labels":[10,-10,-20,-30,-40,-50]},"grid":true,"origin":"O","axesAt":"zero","axisLabelsEnd":true,"yLabelPad":26,"series":[{"kind":"region","points":[[-7.4,15.4],[2.36,15.4],[-2.36,-55.4],[-7.4,-55.4]]},{"kind":"line","points":[[-2.36,-55.4],[2.36,15.4]],"dash":"7 4"}]},
  "TD-15-01": {"type":"chart","w":430,"h":420,"x":{"min":-7,"max":7,"step":1,"label":"x","labels":[-6,-4,-2,0,2,4,6]},"y":{"min":-55,"max":15,"step":5,"label":"y","labels":[10,-10,-20,-30,-40,-50]},"grid":true,"origin":"O","axesAt":"zero","axisLabelsEnd":true,"yLabelPad":26,"series":[{"kind":"region","points":[[-7.4,15.4],[2.36,15.4],[-2.36,-55.4],[-7.4,-55.4]]},{"kind":"line","points":[[-2.36,-55.4],[2.36,15.4]],"dash":"7 4"}]},
  "TD-15-02": {"type":"chart","w":470,"h":400,"x":{"min":-15,"max":15,"step":5,"label":"x","labels":[-15,-10,-5,0,5,10,15]},"y":{"min":0,"max":60,"step":5,"label":"y","labels":[5,10,15,20,25,30,35,40,45,50,55,60]},"grid":true,"origin":"O","axesAt":"zero","axisLabelsEnd":true,"series":[{"kind":"region","points":[[-15.6,60.6],[15.6,60.6],[15.6,32.9],[-15.6,32.9]]},{"kind":"line","points":[[-15,33],[15,33]]}]},
  "TD-15-03": {"type":"chart","w":430,"h":400,"x":{"min":-8,"max":8,"step":1,"label":"x","labels":[-8,-6,-4,-2,0,2,4,6,8]},"y":{"min":-8,"max":8,"step":1,"label":"y","labels":[-8,-6,-4,-2,2,4,6,8]},"grid":true,"origin":"O","axesAt":"zero","axisLabelsEnd":true,"yLabelPad":12,"series":[{"kind":"region","points":[[2.3,8.4],[8.4,8.4],[8.4,-3.8]]},{"kind":"line","points":[[2.3,8.4],[8.4,-3.8]]}]}
});

/* 题包追加（merge_transcribe_fragment.py）：TD_FIG_SPECS */
Object.assign(window.TD_FIG_SPECS, {
  "R03-093": {"type":"table","head":["Group","Number of objects"],"rows":[["A","225"],["B","66"],["C","414"],["D","99"],["Total","804"]]},
});

/* 题包追加（merge_transcribe_fragment.py）：TD_FIG_SPECS */
Object.assign(window.TD_FIG_SPECS, {
  "R03-062": {"type":"table",caption:"Climate Preferences","head":["","Warm","Cool","NO preference","Total"],"rows":[["18-35 years old","295","168","45","508"],["36-50 years old","246","123","41","410"],["51-65 years old","238","117","48","403"],["Greater than 65 years old","137","78","64","279"],["Total","916","486","198","1,600"]]},
  "R03-063": {"type":"table","head":["Year","Subscriptions sold"],"rows":[["2012","5,600"],["2013","5,880"]]},
  "R03-064": {"type":"chart","x":{"min":2003,"max":2015,"step":2,"label":"Year"},"y":{"min":0,"max":60,"step":10,"label":"Annual snowfall (inches)"},"grid":true,"origin":"O","series":[{"kind":"line","points":[[2003,40],[2007,10]]}]},
});

/* 题包追加（merge_transcribe_fragment.py）：TD_FIG_SPECS */
Object.assign(window.TD_FIG_SPECS, {
  "R03-131": {"type":"table","head":["Value","Frequency"],"rows":[["16","10"],["25","1"],["34","10"],["43","4"]]},
  "R03-132": {"type":"table","head":["Weight (pounds)","Number of colonies"],"rows":[["13","12"],["14","8"],["15","5"],["16","7"],["17","9"],["18","10"],["19","13"],["20","7"]]},
  "R03-133": {"type":"table","head":["Number of queen ants","Number of colonies"],"rows":[["1","12"],["2","11"],["3","1"],["4","7"],["5","6"]]},
  "R03-135": {"type":"table",caption:"Percent of Residents Who Earned a Bachelor's Degree or Higher","head":["State","Percent of residents"],"rows":[["State A","21.9%"],["State B","27.9%"],["State C","25.9%"],["State D","19.5%"],["State E","30.1%"],["State F","36.4%"],["State G","35.5%"]]},
  "R03-136": {"type":"table","head":["Score","Group A","Group B"],headGroups:[{"label": "Score Frequencies", "span": 2}],"rows":[["2","1","0"],["3","1","0"],["4","2","0"],["5","1","4"],["6","3","2"],["7","0","0"],["8","0","2"],["9","1","1"],["10","0","2"],["Total","9","11"]]},
  "R03-137": {"type":"table","head":["Data set X","15","15","16","17","17","18","18","19","19"],"rows":[["Data set Y","1","1","2","3","3","4","4","5","5"]]},
});

/* 题包追加（merge_transcribe_fragment.py）：TD_FIG_SPECS */
Object.assign(window.TD_FIG_SPECS, {
  "R03-150": {"type":"table","head":["","Masses (kilograms)"],"rows":[["Andrew","2.4, 2.5, 3.6, 3.1, 2.5, 2.7"],["Maria","x, 3.1, 2.7, 2.9, 3.3, 2.8"]]},
});

/* 题包追加（merge_transcribe_fragment.py）：TD_FIG_SPECS */
Object.assign(window.TD_FIG_SPECS, {
  "R03-121": {"type":"chart","x":{"min":20,"max":32,"step":2,"label":"Mass (kilograms)"},"y":{"min":0,"max":10,"step":10},"yAxis":false,"grid":false,"series":[{"kind":"box","lo":21,"q1":22.5,"med":25.5,"q3":27,"hi":30,"label":"Group 1"},{"kind":"box","lo":22,"q1":23,"med":24.5,"q3":25.5,"hi":28,"label":"Group 2"}]},
  "R03-122": {"type":"chart","x":{"min":20,"max":32,"step":2,"label":"Mass (kilograms)"},"y":{"min":0,"max":10,"step":10},"yAxis":false,"grid":false,"series":[{"kind":"box","lo":21,"q1":22,"med":25,"q3":26,"hi":28,"label":"Group 1"},{"kind":"box","lo":22,"q1":23,"med":24,"q3":25,"hi":28,"label":"Group 2"}]},
  "R03-123": {"type":"chart","x":{"min":10,"max":60,"step":10,"label":"Integer"},"y":{"min":0,"max":12,"step":2,"label":"Frequency","showZero":true},"grid":true,"series":[{"kind":"bar","label":"Data Set A","bars":[{"x0":10,"x1":20,"h":3},{"x0":20,"x1":30,"h":4},{"x0":30,"x1":40,"h":7},{"x0":40,"x1":50,"h":9}]},{"kind":"bar","label":"Data Set B","bars":[{"x0":12,"x1":22,"h":3},{"x0":22,"x1":32,"h":4},{"x0":32,"x1":42,"h":7},{"x0":42,"x1":52,"h":9}]}]},
  "R03-124": {"type":"chart","x":{"min":0,"max":70,"step":10,"label":"Number of points"},"y":{"min":0,"max":30,"step":5,"label":"Frequency","showZero":true},"grid":true,"series":[{"kind":"bar","bars":[{"x0":30,"x1":40,"h":3},{"x0":40,"x1":50,"h":7},{"x0":50,"x1":60,"h":26},{"x0":60,"x1":70,"h":14}]}]},
  "R03-125": {"type":"chart","x":{"min":22,"max":26,"step":1},"y":{"min":0,"max":6,"step":1},"yAxis":false,"grid":false,"series":[{"kind":"points","points":[[22,0.5],[22,1.5],[22,2.5],[22,3.5],[22,4.5],[23,0.5],[23,1.5],[23,2.5],[23,3.5],[24,0.5],[24,1.5],[24,2.5],[25,0.5],[25,1.5],[26,0.5]]}]},
  "R03-126": {"type":"chart","x":{"min":1,"max":5,"step":1,"label":"Number of bursts"},"y":{"min":0,"max":6,"step":1},"yAxis":false,"grid":false,"series":[{"kind":"points","points":[[1,0.5],[1,1.5],[1,2.5],[1,3.5],[2,0.5],[2,1.5],[2,2.5],[2,3.5],[2,4.5],[3,0.5],[3,1.5],[4,0.5],[5,0.5]]}]},
  "R03-127": {"type":"chart","x":{"min":10,"max":16,"step":1,"label":"Value"},"y":{"min":0,"max":6,"step":1},"yAxis":false,"grid":false,"series":[{"kind":"points","label":"A","points":[[10,0.5],[11,0.5],[11,1.5],[11,2.5],[11,3.5],[12,0.5],[12,1.5],[13,0.5],[13,1.5],[13,2.5],[14,0.5],[14,1.5],[15,0.5],[15,1.5],[15,2.5],[16,0.5]]},{"kind":"points","label":"B","points":[[10,0.5],[10,1.5],[11,0.5],[11,1.5],[11,2.5],[11,3.5],[12,0.5],[12,1.5],[13,0.5],[14,0.5],[14,1.5],[15,0.5],[15,1.5],[15,2.5],[15,3.5],[16,0.5],[16,1.5]]}]},
  "R03-128": {"type":"chart","x":{"min":720,"max":732,"step":2,"label":"Orbital period (days)"},"y":{"min":0,"max":4,"step":1},"yAxis":false,"grid":false,"series":[{"kind":"points","points":[[720,0.5],[720,1.5],[723,0.5],[723,1.5],[723,2.5],[724,0.5],[724,1.5],[726,0.5],[727,0.5],[728,0.5],[730,0.5],[730,1.5],[732,0.5]]}]},
  "R03-129": {"type":"table","head":["Value","Data set A frequency","Data set B frequency"],"rows":[["30","2","9"],["34","4","7"],["38","5","5"],["42","7","4"],["46","9","2"]]},
  "R03-130": {"type":"table","head":["Value","Frequency"],"rows":[["1","a"],["2","2a"],["3","3a"],["4","2a"],["5","a"]]},
});

/* 题包追加（merge_transcribe_fragment.py）：TD_FIG_SPECS */
Object.assign(window.TD_FIG_SPECS, {
  "R04-004": {"type":"chart","w":430,"h":380,"x":{"min":-8,"max":8,"step":2,"label":"x"},"y":{"min":0,"max":16,"step":2,"label":"y"},"grid":true,"origin":"O","series":[{"kind":"line","points":[[-5,3],[5,9]]},{"kind":"points","points":[[-5,3],[5,9]]}]},
  "R04-005": {"type":"chart","w":400,"h":380,"x":{"min":-5,"max":7,"step":1,"label":"x"},"y":{"min":-5,"max":10,"step":1,"label":"y"},"grid":true,"origin":"O","series":[{"kind":"points","points":[[-3,4],[5,3],[5,-3]]}]},
  "R04-006": {"type":"chart","w":420,"h":380,"x":{"min":0,"max":14,"step":2,"label":"x"},"y":{"min":0,"max":14,"step":2,"label":"y"},"grid":true,"origin":"O","series":[{"kind":"points","points":[[7,12],[4,9],[7,6]]}]},
});

/* 题包追加（merge_transcribe_fragment.py）：TD_FIG_SPECS */
Object.assign(window.TD_FIG_SPECS, {
  "R04-010": {"type":"rawSvg","svg":"<svg viewBox='0 0 300 240' xmlns='http://www.w3.org/2000/svg'><path d='M150 35 L70 195' stroke='#162c46' stroke-width='2' fill='none'/><path d='M150 35 L230 195' stroke='#162c46' stroke-width='2' fill='none'/><path d='M70 195 A80 24 0 0 0 230 195' stroke='#162c46' stroke-width='2' fill='none'/><path d='M70 195 A80 24 0 0 1 230 195' stroke='#162c46' stroke-width='1.5' stroke-dasharray='6 5' fill='none'/><circle cx='96' cy='200' r='3' fill='#0f2a47'/><text x='150' y='28' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>A</text><text x='86' y='222' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46'>B</text></svg>"},
  "R04-013": {"type":"rawSvg","svg":"<svg viewBox='0 0 300 240' xmlns='http://www.w3.org/2000/svg'><ellipse cx='150' cy='60' rx='70' ry='18' stroke='#162c46' stroke-width='2' fill='none'/><line x1='80' y1='60' x2='80' y2='185' stroke='#162c46' stroke-width='2'/><line x1='220' y1='60' x2='220' y2='185' stroke='#162c46' stroke-width='2'/><path d='M80 185 A70 18 0 0 0 220 185' stroke='#162c46' stroke-width='2' fill='none'/><path d='M80 185 A70 18 0 0 1 220 185' stroke='#162c46' stroke-width='1.5' stroke-dasharray='6 5' fill='none'/><line x1='150' y1='60' x2='196' y2='46' stroke='#162c46' stroke-width='1.4'/><text x='202' y='44' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46'>r</text><text x='230' y='128' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46'>h</text></svg>"},
});

/* 题包追加（merge_transcribe_fragment.py）：TD_FIG_SPECS */
Object.assign(window.TD_FIG_SPECS, {
  "R04-038": {"type":"rawSvg","svg":"<svg viewBox='0 0 300 260' xmlns='http://www.w3.org/2000/svg'><polygon points='150,30 70,180 230,180' stroke='#162c46' stroke-width='2' fill='none'/><polygon points='70,180 150,220 230,180 150,140' stroke='#162c46' stroke-width='1.5' fill='none' stroke-dasharray='5 4'/><line x1='150' y1='30' x2='150' y2='180' stroke='#162c46' stroke-width='1.5' stroke-dasharray='5 4'/><path d='M150 180 L162 180 L162 168' stroke='#162c46' stroke-width='1.2' fill='none'/><text x='162' y='108' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46'>h</text><text x='88' y='200' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46'>\u2113</text><text x='218' y='206' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46'>w</text></svg>"},
});

/* 题包追加（merge_transcribe_fragment.py）：TD_FIG_SPECS */
Object.assign(window.TD_FIG_SPECS, {
  "R04-061": {"type":"rawSvg","svg":"<svg viewBox='0 0 440 300' xmlns='http://www.w3.org/2000/svg' font-family='Times New Roman,Georgia,serif'><line x1='40' y1='150' x2='400' y2='150' stroke='#162c46' stroke-width='2'/><line x1='60' y1='250' x2='420' y2='250' stroke='#162c46' stroke-width='2'/><line x1='150' y1='40' x2='120' y2='285' stroke='#162c46' stroke-width='2'/><line x1='260' y1='40' x2='330' y2='285' stroke='#162c46' stroke-width='2'/><text x='132' y='142' font-size='15' fill='#162c46'>q</text><text x='42' y='242' font-size='15' fill='#162c46'>t</text><text x='146' y='34' font-size='15' fill='#162c46'>r</text><text x='264' y='34' font-size='15' fill='#162c46'>s</text><text x='196' y='96' font-size='14' fill='#162c46'>a&#176;</text><text x='96' y='142' font-size='14' fill='#162c46'>b&#176;</text><text x='318' y='236' font-size='14' fill='#162c46'>w&#176;</text><text x='338' y='268' font-size='14' fill='#162c46'>w&#176;</text></svg>"},
  "R04-062": {"type":"rawSvg","svg":"<svg viewBox='0 0 440 300' xmlns='http://www.w3.org/2000/svg' font-family='Times New Roman,Georgia,serif'><line x1='60' y1='160' x2='380' y2='160' stroke='#162c46' stroke-width='2'/><line x1='60' y1='160' x2='170' y2='70' stroke='#162c46' stroke-width='2'/><line x1='170' y1='70' x2='220' y2='160' stroke='#162c46' stroke-width='2'/><line x1='220' y1='160' x2='300' y2='250' stroke='#162c46' stroke-width='2'/><line x1='300' y1='250' x2='380' y2='160' stroke='#162c46' stroke-width='2'/><circle cx='220' cy='160' r='3' fill='#0f2a47'/><text x='48' y='166' font-size='16' fill='#162c46'>L</text><text x='214' y='150' font-size='16' fill='#162c46'>R</text><text x='386' y='166' font-size='16' fill='#162c46'>Q</text><text x='164' y='62' font-size='16' fill='#162c46'>M</text><text x='296' y='272' font-size='16' fill='#162c46'>P</text></svg>"},
  "R04-063": {"type":"rawSvg","svg":"<svg viewBox='0 0 440 300' xmlns='http://www.w3.org/2000/svg' font-family='Times New Roman,Georgia,serif'><line x1='30' y1='110' x2='410' y2='110' stroke='#162c46' stroke-width='2'/><line x1='90' y1='110' x2='130' y2='210' stroke='#162c46' stroke-width='2'/><line x1='250' y1='110' x2='130' y2='210' stroke='#162c46' stroke-width='2'/><line x1='170' y1='110' x2='300' y2='240' stroke='#162c46' stroke-width='2'/><line x1='250' y1='110' x2='300' y2='240' stroke='#162c46' stroke-width='2'/><line x1='340' y1='110' x2='300' y2='240' stroke='#162c46' stroke-width='2'/><circle cx='212' cy='162' r='3' fill='#0f2a47'/><text x='24' y='104' font-size='15' fill='#162c46'>P</text><text x='84' y='104' font-size='15' fill='#162c46'>Q</text><text x='164' y='104' font-size='15' fill='#162c46'>R</text><text x='244' y='104' font-size='15' fill='#162c46'>S</text><text x='334' y='104' font-size='15' fill='#162c46'>T</text><text x='414' y='104' font-size='15' fill='#162c46'>V</text><text x='124' y='232' font-size='15' fill='#162c46'>X</text><text x='206' y='158' font-size='15' fill='#162c46'>W</text><text x='294' y='262' font-size='15' fill='#162c46'>U</text></svg>"},
  "R04-064": {"type":"rawSvg","svg":"<svg viewBox='0 0 440 300' xmlns='http://www.w3.org/2000/svg' font-family='Times New Roman,Georgia,serif'><line x1='180' y1='40' x2='180' y2='270' stroke='#162c46' stroke-width='2'/><line x1='60' y1='90' x2='380' y2='180' stroke='#162c46' stroke-width='2'/><line x1='80' y1='220' x2='400' y2='200' stroke='#162c46' stroke-width='2'/><text x='174' y='34' font-size='15' fill='#162c46'>s</text><text x='386' y='176' font-size='15' fill='#162c46'>r</text><text x='406' y='206' font-size='15' fill='#162c46'>t</text><text x='196' y='92' font-size='14' fill='#162c46'>106&#176;</text><text x='296' y='196' font-size='14' fill='#162c46'>23&#176;</text><text x='146' y='214' font-size='14' fill='#162c46'>x&#176;</text></svg>"},
  "R04-065": {"type":"rawSvg","svg":"<svg viewBox='0 0 440 300' xmlns='http://www.w3.org/2000/svg' font-family='Times New Roman,Georgia,serif'><line x1='90' y1='230' x2='350' y2='230' stroke='#162c46' stroke-width='2'/><line x1='90' y1='230' x2='150' y2='90' stroke='#162c46' stroke-width='2'/><line x1='150' y1='90' x2='220' y2='230' stroke='#162c46' stroke-width='2'/><line x1='220' y1='230' x2='290' y2='90' stroke='#162c46' stroke-width='2'/><line x1='290' y1='90' x2='350' y2='230' stroke='#162c46' stroke-width='2'/><circle cx='220' cy='160' r='3' fill='#0f2a47'/><text x='82' y='252' font-size='16' fill='#162c46'>M</text><text x='352' y='252' font-size='16' fill='#162c46'>R</text><text x='144' y='82' font-size='16' fill='#162c46'>N</text><text x='286' y='82' font-size='16' fill='#162c46'>Q</text><text x='214' y='154' font-size='15' fill='#162c46'>P</text><text x='300' y='128' font-size='14' fill='#162c46'>70&#176;</text><text x='228' y='182' font-size='14' fill='#162c46'>60&#176;</text></svg>"},
  "R04-066": {"type":"rawSvg","svg":"<svg viewBox='0 0 440 300' xmlns='http://www.w3.org/2000/svg' font-family='Times New Roman,Georgia,serif'><line x1='90' y1='90' x2='350' y2='230' stroke='#162c46' stroke-width='2'/><line x1='350' y1='90' x2='90' y2='230' stroke='#162c46' stroke-width='2'/><circle cx='220' cy='160' r='3' fill='#0f2a47'/><text x='82' y='84' font-size='16' fill='#162c46'>W</text><text x='352' y='84' font-size='16' fill='#162c46'>Y</text><text x='82' y='252' font-size='16' fill='#162c46'>X</text><text x='352' y='252' font-size='16' fill='#162c46'>Z</text><text x='214' y='154' font-size='15' fill='#162c46'>Q</text><text x='104' y='120' font-size='14' fill='#162c46'>a&#176;</text><text x='330' y='120' font-size='14' fill='#162c46'>a&#176;</text></svg>"},
  "R04-067": {"type":"rawSvg","svg":"<svg viewBox='0 0 440 300' xmlns='http://www.w3.org/2000/svg' font-family='Times New Roman,Georgia,serif'><line x1='70' y1='250' x2='360' y2='250' stroke='#162c46' stroke-width='2'/><line x1='70' y1='250' x2='330' y2='70' stroke='#162c46' stroke-width='2'/><line x1='360' y1='250' x2='200' y2='160' stroke='#162c46' stroke-width='2'/><line x1='330' y1='70' x2='210' y2='250' stroke='#162c46' stroke-width='2'/><circle cx='70' cy='250' r='3' fill='#0f2a47'/><circle cx='360' cy='250' r='3' fill='#0f2a47'/><circle cx='330' cy='70' r='3' fill='#0f2a47'/><circle cx='200' cy='160' r='3' fill='#0f2a47'/><circle cx='210' cy='250' r='3' fill='#0f2a47'/><text x='70' y='272' font-size='16' fill='#162c46' text-anchor='middle'>D</text><text x='360' y='272' font-size='16' fill='#162c46' text-anchor='middle'>A</text><text x='340' y='62' font-size='16' fill='#162c46' text-anchor='middle'>B</text><text x='196' y='154' font-size='16' fill='#162c46' text-anchor='middle'>C</text><text x='206' y='272' font-size='16' fill='#162c46' text-anchor='middle'>E</text><text x='290' y='74' font-size='14' fill='#c2410c'>45&#176;</text><text x='200' y='198' font-size='14' fill='#c2410c'>104&#176;</text><text x='252' y='232' font-size='14' fill='#c2410c'>x&#176;</text></svg>"},
  "R04-068": {"type":"rawSvg","svg":"<svg viewBox='0 0 440 300' xmlns='http://www.w3.org/2000/svg' font-family='Times New Roman,Georgia,serif'><line x1='80' y1='240' x2='380' y2='240' stroke='#162c46' stroke-width='2'/><line x1='120' y1='70' x2='380' y2='240' stroke='#162c46' stroke-width='2'/><line x1='80' y1='240' x2='230' y2='150' stroke='#162c46' stroke-width='2'/><line x1='230' y1='150' x2='250' y2='240' stroke='#162c46' stroke-width='2'/><circle cx='250' cy='240' r='3' fill='#0f2a47'/><text x='114' y='62' font-size='16' fill='#162c46'>S</text><text x='72' y='262' font-size='16' fill='#162c46'>R</text><text x='386' y='262' font-size='16' fill='#162c46'>U</text><text x='236' y='146' font-size='16' fill='#162c46'>T</text><text x='244' y='262' font-size='16' fill='#162c46'>V</text><text x='140' y='120' font-size='14' fill='#162c46'>31&#176;</text><text x='238' y='178' font-size='14' fill='#162c46'>114&#176;</text><text x='238' y='232' font-size='14' fill='#162c46'>x&#176;</text></svg>"},
  "R04-069": {"type":"rawSvg","svg":"<svg viewBox='0 0 440 300' xmlns='http://www.w3.org/2000/svg' font-family='Times New Roman,Georgia,serif'><line x1='60' y1='250' x2='380' y2='250' stroke='#162c46' stroke-width='2'/><line x1='60' y1='250' x2='330' y2='70' stroke='#162c46' stroke-width='2'/><line x1='250' y1='250' x2='330' y2='70' stroke='#162c46' stroke-width='2'/><line x1='380' y1='250' x2='250' y2='250' stroke='#162c46' stroke-width='2'/><line x1='380' y1='250' x2='180' y2='160' stroke='#162c46' stroke-width='2'/><circle cx='180' cy='160' r='3' fill='#0f2a47'/><text x='52' y='272' font-size='16' fill='#162c46'>U</text><text x='244' y='272' font-size='16' fill='#162c46'>V</text><text x='386' y='272' font-size='16' fill='#162c46'>R</text><text x='324' y='62' font-size='16' fill='#162c46'>S</text><text x='172' y='154' font-size='16' fill='#162c46'>T</text><text x='172' y='186' font-size='14' fill='#162c46'>x&#176;</text></svg>"},
  "R04-077": {"type":"rawSvg","svg":"<svg viewBox='0 0 440 300' xmlns='http://www.w3.org/2000/svg' font-family='Times New Roman,Georgia,serif'><line x1='180' y1='50' x2='180' y2='270' stroke='#162c46' stroke-width='2'/><line x1='300' y1='50' x2='300' y2='270' stroke='#162c46' stroke-width='2'/><line x1='110' y1='70' x2='360' y2='260' stroke='#162c46' stroke-width='2'/><text x='174' y='44' font-size='15' fill='#162c46'>r</text><text x='294' y='44' font-size='15' fill='#162c46'>s</text><text x='104' y='64' font-size='15' fill='#162c46'>t</text><text x='196' y='128' font-size='14' fill='#162c46'>a&#176;</text><text x='252' y='196' font-size='14' fill='#162c46'>b&#176;</text><text x='268' y='232' font-size='14' fill='#162c46'>c&#176;</text></svg>"},
  "R04-078": {"type":"rawSvg","svg":"<svg viewBox='0 0 440 300' xmlns='http://www.w3.org/2000/svg' font-family='Times New Roman,Georgia,serif'><line x1='100' y1='90' x2='380' y2='90' stroke='#162c46' stroke-width='2'/><line x1='100' y1='90' x2='200' y2='260' stroke='#162c46' stroke-width='2'/><line x1='380' y1='90' x2='200' y2='260' stroke='#162c46' stroke-width='2'/><line x1='160' y1='170' x2='320' y2='260' stroke='#162c46' stroke-width='2'/><circle cx='100' cy='90' r='3' fill='#0f2a47'/><circle cx='380' cy='90' r='3' fill='#0f2a47'/><circle cx='160' cy='170' r='3' fill='#0f2a47'/><circle cx='200' cy='260' r='3' fill='#0f2a47'/><circle cx='320' cy='260' r='3' fill='#0f2a47'/><text x='94' y='82' font-size='16' fill='#162c46'>A</text><text x='386' y='82' font-size='16' fill='#162c46'>D</text><text x='146' y='172' font-size='16' fill='#162c46'>B</text><text x='196' y='196' font-size='15' fill='#162c46'>C</text><text x='314' y='282' font-size='16' fill='#162c46'>E</text><text x='40' y='262' font-size='16' fill='#162c46'>G</text><text x='206' y='184' font-size='14' fill='#162c46'>y&#176;</text><text x='138' y='196' font-size='14' fill='#162c46'>z&#176;</text><text x='326' y='248' font-size='14' fill='#162c46'>x&#176;</text></svg>"},
});

/* 题包追加（merge_transcribe_fragment.py）：TD_FIG_SPECS */
Object.assign(window.TD_FIG_SPECS, {
  "R04-104": {"type":"rawSvg","svg":"<svg viewBox='0 0 360 200' xmlns='http://www.w3.org/2000/svg'>\n  <g stroke='#162c46' stroke-width='2' fill='none' stroke-linejoin='round'>\n    <polygon points='40,160 100,60 220,60 280,160'/>\n    <line x1='100' y1='60' x2='160' y2='160'/>\n    <line x1='220' y1='60' x2='160' y2='160'/>\n  </g>\n  <polygon points='40,160 100,60 160,160' fill='rgba(22,44,70,0.22)' stroke='none'/>\n  <polygon points='160,160 220,60 280,160' fill='rgba(22,44,70,0.22)' stroke='none'/>\n</svg>","series":[{"kind":"region","points":[[40,0],[100,100],[160,0]]},{"kind":"region","points":[[160,0],[220,100],[280,0]]}]},
  "R04-116": {"type":"triangle","pts":[[70,200],[270,90],[270,200]],"labels":["R","S","T"],"angles":{"1":"90\u00b0"},"sides":{"0":"12","1":"5"},"right":[1],"note":true},
  "R04-117": {"type":"triangle","pts":[[70,200],[270,70],[270,200]],"labels":["A","B","C"],"angles":{"2":"90\u00b0"},"sides":{"0":"26"},"right":[2],"note":true},
  "R04-118": {"type":"triangle","pts":[[70,60],[70,200],[270,200]],"labels":["","",""],"angles":{"0":"x\u00b0"},"sides":{"1":"16","2":"23"},"right":[1],"note":true},
  "R04-119": {"type":"triangle","pts":[[80,60],[80,200],[280,200]],"labels":["A","B","C"],"angles":{"1":"90\u00b0","2":"30\u00b0"},"sides":{"2":"108"},"right":[1],"note":true},
});

/* 题包追加（merge_transcribe_fragment.py）：TD_FIG_SPECS */
Object.assign(window.TD_FIG_SPECS, {
  "R04-122": {"type":"rawSvg","svg":"<svg viewBox='0 0 360 260' xmlns='http://www.w3.org/2000/svg'>\n  <g stroke='#162c46' stroke-width='2' fill='none' stroke-linejoin='round'>\n    <line x1='80' y1='40' x2='80' y2='220'/>\n    <line x1='80' y1='220' x2='300' y2='220'/>\n    <line x1='80' y1='40' x2='300' y2='220'/>\n    <line x1='80' y1='150' x2='214' y2='150'/>\n    <polyline points='80,208 92,208 92,220'/>\n    <polyline points='80,162 92,162 92,150'/>\n  </g>\n  <g font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>\n    <text x='80' y='30'>B</text>\n    <text x='64' y='238'>A</text>\n    <text x='314' y='228'>C</text>\n    <text x='60' y='156'>D</text>\n    <text x='226' y='144'>E</text>\n  </g>\n</svg>"},
  "R04-128": {"type":"rawSvg","svg":"<svg viewBox='0 0 420 230' xmlns='http://www.w3.org/2000/svg'>\n  <g stroke='#162c46' stroke-width='2' fill='none' stroke-linejoin='round'>\n    <line x1='60' y1='180' x2='340' y2='180'/>\n    <line x1='340' y1='180' x2='340' y2='70'/>\n    <line x1='60' y1='180' x2='340' y2='70'/>\n    <polyline points='328,180 328,168 340,168'/>\n  </g>\n  <path d='M 95 180 A 35 35 0 0 0 92 166' fill='none' stroke='#162c46' stroke-width='1.5'/>\n  <g font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>\n    <text x='86' y='172'>\u03b8</text>\n    <text x='200' y='205'>x</text>\n    <text x='362' y='118'>height of the ramp</text>\n    <text x='195' y='108'>length of the ramp</text>\n  </g>\n</svg>"},
});

/* 题包追加（merge_transcribe_fragment.py）：TD_FIG_SPECS */
Object.assign(window.TD_FIG_SPECS, {
  "R04-164": {"type":"rawSvg","svg":"<svg viewBox='0 0 360 300' xmlns='http://www.w3.org/2000/svg'>\n  <line x1='45' y1='150' x2='322' y2='150' stroke='#162c46' stroke-width='1.8'/>\n  <line x1='322' y1='150' x2='312' y2='145' stroke='#162c46' stroke-width='1.8'/>\n  <line x1='322' y1='150' x2='312' y2='155' stroke='#162c46' stroke-width='1.8'/>\n  <line x1='180' y1='262' x2='180' y2='38' stroke='#162c46' stroke-width='1.8'/>\n  <line x1='180' y1='38' x2='175' y2='48' stroke='#162c46' stroke-width='1.8'/>\n  <line x1='180' y1='38' x2='185' y2='48' stroke='#162c46' stroke-width='1.8'/>\n  <circle cx='180' cy='150' r='110' fill='none' stroke='#162c46' stroke-width='2'/>\n  <circle cx='290' cy='150' r='3.5' fill='#0f2a47'/>\n  <circle cx='221' cy='48' r='3.5' fill='#0f2a47'/>\n  <text x='330' y='156' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='start'>x</text>\n  <text x='188' y='34' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='start'>y</text>\n  <text x='168' y='168' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>O</text>\n  <text x='298' y='144' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='start'>(8, 0)</text>\n  <text x='229' y='44' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='start'>(3, k)</text>\n</svg>"},
  "R04-165": {"type":"rawSvg","svg":"<svg viewBox='0 0 400 320' xmlns='http://www.w3.org/2000/svg'>\n  <line x1='49' y1='17' x2='49' y2='289' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='66' y1='17' x2='66' y2='289' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='83' y1='17' x2='83' y2='289' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='100' y1='17' x2='100' y2='289' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='117' y1='17' x2='117' y2='289' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='134' y1='17' x2='134' y2='289' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='151' y1='17' x2='151' y2='289' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='168' y1='17' x2='168' y2='289' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='185' y1='17' x2='185' y2='289' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='202' y1='17' x2='202' y2='289' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='219' y1='17' x2='219' y2='289' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='236' y1='17' x2='236' y2='289' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='253' y1='17' x2='253' y2='289' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='270' y1='17' x2='270' y2='289' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='287' y1='17' x2='287' y2='289' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='304' y1='17' x2='304' y2='289' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='321' y1='17' x2='321' y2='289' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='49' y1='289' x2='321' y2='289' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='49' y1='272' x2='321' y2='272' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='49' y1='255' x2='321' y2='255' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='49' y1='238' x2='321' y2='238' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='49' y1='221' x2='321' y2='221' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='49' y1='204' x2='321' y2='204' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='49' y1='187' x2='321' y2='187' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='49' y1='170' x2='321' y2='170' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='49' y1='153' x2='321' y2='153' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='49' y1='136' x2='321' y2='136' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='49' y1='119' x2='321' y2='119' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='49' y1='102' x2='321' y2='102' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='49' y1='85' x2='321' y2='85' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='49' y1='68' x2='321' y2='68' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='49' y1='51' x2='321' y2='51' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='49' y1='34' x2='321' y2='34' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='49' y1='17' x2='321' y2='17' stroke='#e4e9f0' stroke-width='1'/>\n  <line x1='49' y1='255' x2='321' y2='255' stroke='#162c46' stroke-width='1.6'/>\n  <line x1='185' y1='17' x2='185' y2='289' stroke='#162c46' stroke-width='1.6'/>\n  <circle cx='185' cy='153' r='45' fill='none' stroke='#162c46' stroke-width='2'/>\n  <text x='49' y='273' font-family='Times New Roman,Georgia,serif' font-size='12' fill='#162c46' text-anchor='middle'>-8</text>\n  <text x='83' y='273' font-family='Times New Roman,Georgia,serif' font-size='12' fill='#162c46' text-anchor='middle'>-6</text>\n  <text x='117' y='273' font-family='Times New Roman,Georgia,serif' font-size='12' fill='#162c46' text-anchor='middle'>-4</text>\n  <text x='151' y='273' font-family='Times New Roman,Georgia,serif' font-size='12' fill='#162c46' text-anchor='middle'>-2</text>\n  <text x='219' y='273' font-family='Times New Roman,Georgia,serif' font-size='12' fill='#162c46' text-anchor='middle'>2</text>\n  <text x='253' y='273' font-family='Times New Roman,Georgia,serif' font-size='12' fill='#162c46' text-anchor='middle'>4</text>\n  <text x='287' y='273' font-family='Times New Roman,Georgia,serif' font-size='12' fill='#162c46' text-anchor='middle'>6</text>\n  <text x='321' y='273' font-family='Times New Roman,Georgia,serif' font-size='12' fill='#162c46' text-anchor='middle'>8</text>\n  <text x='177' y='293' font-family='Times New Roman,Georgia,serif' font-size='12' fill='#162c46' text-anchor='end'>-2</text>\n  <text x='177' y='225' font-family='Times New Roman,Georgia,serif' font-size='12' fill='#162c46' text-anchor='end'>2</text>\n  <text x='177' y='191' font-family='Times New Roman,Georgia,serif' font-size='12' fill='#162c46' text-anchor='end'>4</text>\n  <text x='177' y='157' font-family='Times New Roman,Georgia,serif' font-size='12' fill='#162c46' text-anchor='end'>6</text>\n  <text x='177' y='123' font-family='Times New Roman,Georgia,serif' font-size='12' fill='#162c46' text-anchor='end'>8</text>\n  <text x='177' y='89' font-family='Times New Roman,Georgia,serif' font-size='12' fill='#162c46' text-anchor='end'>10</text>\n  <text x='177' y='55' font-family='Times New Roman,Georgia,serif' font-size='12' fill='#162c46' text-anchor='end'>12</text>\n  <text x='177' y='21' font-family='Times New Roman,Georgia,serif' font-size='12' fill='#162c46' text-anchor='end'>14</text>\n  <text x='175' y='273' font-family='Times New Roman,Georgia,serif' font-size='12' fill='#162c46' text-anchor='end'>0</text>\n  <text x='331' y='249' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='start'>x</text>\n  <text x='193' y='9' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='start'>y</text>\n</svg>"},
  "R04-168": {"type":"rawSvg","svg":"<svg viewBox='0 0 360 300' xmlns='http://www.w3.org/2000/svg'>\n  <circle cx='180' cy='150' r='105' fill='none' stroke='#162c46' stroke-width='2'/>\n  <line x1='180' y1='150' x2='161.8' y2='46.6' stroke='#162c46' stroke-width='1.8'/>\n  <line x1='180' y1='150' x2='240.2' y2='236' stroke='#162c46' stroke-width='1.8'/>\n  <path d='M 175.5 124.4 A 26 26 0 0 1 194.9 171.3' fill='none' stroke='#162c46' stroke-width='1.5'/>\n  <circle cx='180' cy='150' r='3.5' fill='#0f2a47'/>\n  <circle cx='161.8' cy='46.6' r='3.5' fill='#0f2a47'/>\n  <circle cx='266' cy='89.8' r='3.5' fill='#0f2a47'/>\n  <circle cx='240.2' cy='236' r='3.5' fill='#0f2a47'/>\n  <circle cx='76.6' cy='168.2' r='3.5' fill='#0f2a47'/>\n  <text x='161.8' y='32.6' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>C</text>\n  <text x='280' y='87.8' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='start'>D</text>\n  <text x='250.2' y='254' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='start'>A</text>\n  <text x='62.6' y='174.2' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='end'>B</text>\n  <text x='166' y='164' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='end'>O</text>\n  <text x='198' y='136' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46' text-anchor='middle'>x\u00b0</text>\n</svg>"},
});

/* 题包追加（merge_transcribe_fragment.py）：TD_FIG_SPECS */
Object.assign(window.TD_FIG_SPECS, {
  "R04-170": {"type":"rawSvg","svg":"<svg viewBox='0 0 360 320' xmlns='http://www.w3.org/2000/svg'>\n  <circle cx='180' cy='160' r='105' fill='none' stroke='#162c46' stroke-width='2'/>\n  <line x1='89.1' y1='107.5' x2='270.9' y2='107.5' stroke='#162c46' stroke-width='1.8'/>\n  <line x1='180' y1='160' x2='89.1' y2='107.5' stroke='#162c46' stroke-width='1.8'/>\n  <line x1='180' y1='160' x2='270.9' y2='107.5' stroke='#162c46' stroke-width='1.8'/>\n  <line x1='180' y1='160' x2='180' y2='265' stroke='#162c46' stroke-width='1.8'/>\n  <path d='M 113.1 107.5 A 24 24 0 0 1 109.9 119.5' fill='none' stroke='#162c46' stroke-width='1.5'/>\n  <circle cx='180' cy='160' r='3.5' fill='#0f2a47'/>\n  <text x='77.1' y='101.5' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='end'>A</text>\n  <text x='282.9' y='101.5' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='start'>B</text>\n  <text x='166' y='176' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='end'>O</text>\n  <text x='180' y='287' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>C</text>\n  <text x='122' y='132' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46' text-anchor='middle'>30\u00b0</text>\n</svg>"},
  "R04-174": {"type":"rawSvg","svg":"<svg viewBox='0 0 360 300' xmlns='http://www.w3.org/2000/svg'>\n  <circle cx='180' cy='150' r='100' fill='none' stroke='#162c46' stroke-width='2'/>\n  <circle cx='180' cy='150' r='3.5' fill='#0f2a47'/>\n  <circle cx='109.3' cy='79.3' r='3.5' fill='#0f2a47'/>\n  <circle cx='250.7' cy='79.3' r='3.5' fill='#0f2a47'/>\n  <circle cx='266.6' cy='200' r='3.5' fill='#0f2a47'/>\n  <text x='101.3' y='67.3' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='end'>M</text>\n  <text x='258.7' y='67.3' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='start'>N</text>\n  <text x='278.6' y='210' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='start'>P</text>\n</svg>"},
});

/* 题包追加（merge_transcribe_fragment.py）：TD_FIG_SPECS */
Object.assign(window.TD_FIG_SPECS, {
  "R03-001": {"type":"table","head":["Species of tree","Growthfactor"],"rows":[["Red maple","4.5"],["River birch","3.5"],["Cottonwood","2.0"],["Black walnut","4.5"],["White birch","5.0"],["American elm","4.0"],["Pin oak","3.0"],["Shagbark hickory","7.5"]]},
  "R03-002": {"type":"table","head":["State","Low","Medium","High","Total"],headGroups:[{"label": "Power capacity", "span": 4}],"rows":[["Texas","4","2","3","9"],["California","1","0","1","2"],["Oregon","1","0","1","2"],["Indiana","0","2","0","2"],["Colorado","1","1","0","2"],["Iowa","2","0","0","2"],["Oklahoma","1","0","0","1"],["Total","10","5","5","20"]]},
});

/* 题包追加（merge_transcribe_fragment.py）：TD_FIG_SPECS */
Object.assign(window.TD_FIG_SPECS, {
  "R03-301": {"type":"table",caption:"Views on Nuclear Energy Use","head":["Response","Frequency"],"rows":[["Strongly favor","56"],["Somewhat favor","214"],["Somewhat oppose","104"],["Strongly oppose","37"]]},
  "R03-303": {"type":"table",caption:"Poll Results","head":["Candidate","Votes"],"rows":[["Angel Cruz","483"],["Terry Smith","320"]]},
  "R03-304": {"type":"table","head":["Sample","Percent in favor","Margin of error"],"rows":[["A","52%","4.2%"],["B","48%","1.6%"]]},
  "R03-306": {"type":"table","head":["Texting behavior","Talks on cell phone daily","Does not talk on cell phone daily","Total"],"rows":[["Light","110","146","256"],["Medium","139","164","303"],["Heavy","166","74","240"],["Total","415","384","799"]]},
});

/* 题包追加（merge_transcribe_fragment.py）：TD_FIG_SPECS */
Object.assign(window.TD_FIG_SPECS, {
  "R03-361": {"type":"table","head":["Hours practiced","6 to 13 points","14 or more points","Total"],headGroups:[{"label": "Number of points per round", "span": 3}],"rows":[["3 to 5 hours","6","4","10"],["More than 5 hours","4","26","30"],["Total","10","30","40"]]},
});

/* 题包追加（merge_transcribe_fragment.py）：TD_FIG_SPECS */
Object.assign(window.TD_FIG_SPECS, {
  "R03-241": {"type":"table","head":["Rhesus factor","A","B","AB","O"],"headGroups":[{"label":"Blood type","span":4}],"rows":[["+","33","93","37","7"],["\u2212","7","2","1","x"]]},
  "R03-243": {"type":"table","head":["","Phone","Email"],"rows":[["Dinner dance","55%","80%"],["Football game","20%","10%"],["Picnic","20%","5%"],["Pool party","5%","5%"],["Total","100%","100%"]]},
  "R03-245": {"type":"table","head":["","0-9 years","10-19 years","20+ years","Total"],"rows":[["Group A","7","14","9","30"],["Group B","6","4","20","30"],["Group C","17","12","1","30"],["Total","30","30","30","90"]]},
  "R03-246": {"type":"table","head":["Subject","Sixth","Seventh","Eighth","Total"],"headGroups":[{"label":"Grade level","span":3}],"rows":[["English","4","10","7","21"],["Mathematics","10","1","9","20"],["Science","2","8","4","14"],["Social studies","8","7","10","25"],["Total","24","26","30","80"]]},
  "R03-247": {"type":"table","head":["","Asked for repairs","Did not ask for repairs","Total"],"rows":[["Asked about a bill","48","623","671"],["Did not ask about a bill","130","90","220"],["Total","178","713","891"]]},
  "R03-248": {"type":"table","caption":"Number of Contestants by Score and Day","head":["Day","5 out of 5","4 out of 5","3 out of 5","2 out of 5","1 out of 5","0 out of 5","Total"],"rows":[["Day 1","2","3","4","6","2","3","20"],["Day 2","2","3","5","5","4","1","20"],["Day 3","3","3","4","5","3","2","20"],["Total","7","9","13","16","9","6","60"]]},
  "R03-250": {"type":"table","head":["","Lions","Stars","Total"],"rows":[["Small","6","8","14"],["Medium","24","34","58"],["Large","18","26","44"],["Total","48","68","116"]]},
  "R03-251": {"type":"table","caption":"2013 State-Level Taxes","head":["","State sales tax","No state sales tax"],"rows":[["State income tax","39","4"],["No state income tax","6","1"]]},
});

/* 题包追加（merge_transcribe_fragment.py）：TD_FIG_SPECS */
Object.assign(window.TD_FIG_SPECS, {
  "R03-181": {"type":"chart","x":{"min":0,"max":80,"step":10,"label":"Years since 1940"},"y":{"min":0,"max":8,"step":1,"label":"Minimum wage (dollars per hour)"},"grid":true,"origin":"O","series":[{"kind":"points","points":[[0,0.3],[10,0.9],[20,1.25],[30,1.9],[40,3.4],[50,4.2],[60,5.4],[70,7.5]]},{"kind":"line","points":[[0,-0.488],[80,7.192]]}]},
  "R03-182": {"type":"chart","x":{"min":10,"max":26,"step":2,"label":"Temperature (\u00b0C)"},"y":{"min":300,"max":1000,"step":100,"label":"Sales (dollars)"},"grid":true,"origin":"O","series":[{"kind":"points","points":[[12,470],[14,480],[15,500],[16,600],[17,680],[18,690],[18.5,685],[19.5,685],[22,780],[22.5,720],[23.5,810],[25,870]]},{"kind":"line","points":[[10,414],[26,942]]}]},
  "R03-183": {"type":"chart","x":{"min":0,"max":10,"step":2,"label":"Days after January 11"},"y":{"min":0,"max":16,"step":2,"label":"Length of time (hours)"},"grid":true,"origin":"O","series":[{"kind":"points","points":[[1,14],[2,6],[3,10],[4,15],[5,14.2],[6,7],[7,11],[8,14],[9,13.8],[10,13.5]]}]},
  "R03-184": {"type":"chart","x":{"min":25,"max":35,"step":1,"label":"Average temperature (\u00b0C)"},"y":{"min":0,"max":640,"step":80,"label":"Number of people"},"grid":true,"origin":"O","series":[{"kind":"points","points":[[27,120],[28.5,360],[29.5,240],[30,385],[30.5,325],[31,480],[31.8,560],[33.5,480],[34.3,530],[34.6,640],[35.5,610]]},{"kind":"line","points":[[25,80],[35,650]]}]},
  "R03-185": {"type":"chart","x":{"min":0,"max":14,"step":2,"label":"x"},"y":{"min":0,"max":140,"step":20,"label":"y"},"grid":true,"origin":"O","series":[{"kind":"exp","a":127,"b":0.83}]},
  "R03-186": {"type":"chart","x":{"min":0,"max":12,"step":2,"label":"Time (years)"},"y":{"min":700,"max":820,"step":20,"label":"Energy (million megawatt-hours)"},"grid":true,"origin":"O","series":[{"kind":"points","points":[[1,762],[2,787],[3,779],[4,785],[5,802],[6,801],[7,794],[8,803],[10,786],[11,766]]}]},
  "R03-187": {"type":"chart","x":{"min":0,"max":3,"step":1,"label":"Size (thousands of square feet)"},"y":{"min":0,"max":400,"step":50,"label":"Sale price (thousands of dollars)"},"grid":true,"origin":"O","series":[{"kind":"points","points":[[1,190],[1.1,200],[1.2,235],[1.3,222],[1.4,260],[1.5,285],[1.6,315],[1.7,338],[1.7,215],[1.75,250],[1.8,242],[1.85,275],[1.9,245],[1.95,260],[2,325],[2.05,275],[2.1,228],[2.15,280],[2.2,360],[2.3,343],[2.4,245],[2.5,358],[2.6,330],[2.7,355],[2.9,355]]}]},
  "R03-188": {"type":"table","head":["","Amount invested","Balance increase"],"rows":[["Account A","$500","6% annual interest"],["Account B","$1,000","$25 per year"]]},
  "R03-190": {"type":"chart","x":{"min":0,"max":45,"step":15,"label":"x"},"y":{"min":0,"max":60,"step":15,"label":"y"},"grid":true,"origin":"O","series":[{"kind":"points","points":[[10,47],[11,45.5],[12,43.5],[13,40.5],[14,37.5],[22,34],[26,30],[31,30],[33,25.5],[35,25],[37,28],[38,21]]},{"kind":"line","points":[[0,54.57],[40,24.3]]}]},
  "R03-191": {"type":"chart","x":{"min":0,"max":50,"step":10,"label":"Total protein (grams)"},"y":{"min":0,"max":80,"step":10,"label":"Total fat (grams)"},"grid":true,"origin":"O","series":[{"kind":"points","points":[[10,13],[14,17],[20,32],[23,39],[26,41],[32,50],[40,63],[48,69]]},{"kind":"line","points":[[10,14],[48,69]]}]},
  "R03-192": {"type":"chart","x":{"min":0,"max":20,"step":4,"label":"x"},"y":{"min":0,"max":50,"step":10,"label":"y"},"grid":true,"origin":"O","series":[{"kind":"points","points":[[1,13.5],[2,14.5],[5,17.5],[7,21.5],[10,26],[11,28.5],[14,33.5],[17,38.5],[18,40.5],[20,43.5]]},{"kind":"line","points":[[0,12],[20,42]]}]},
});