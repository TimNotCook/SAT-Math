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
    marks: [{ x: 34, y: 20, label: '20', dy: -9 }, { x: 49, y: 30, label: '30', dy: 10 }]
  },

  // U1-12: see the authoritative entry in the FOLDED block below (shaded region added 2026-11-24).
  'U1-12': { type: 'chart', x: { min: -8, max: 8, step: 2, label: 'x' }, y: { min: -8, max: 8, step: 2, label: 'y' }, grid: true, origin: 'O', series: [{ kind: 'line', dash: '6 4', points: [[-1.5, 7], [2.5, -9]] }] },

  // U1-13: see the authoritative entry in the FOLDED block below (shaded region added 2026-11-24).
  'U1-13': { type: 'chart', x: { min: -6, max: 6, step: 2, label: 'x' }, y: { min: -50, max: 10, step: 10, label: 'y' }, grid: true, origin: 'O', series: [{ kind: 'line', dash: '6 4', points: [[-1.5, -42.5], [1.5, 2.5]] }] },

  // TD-15-01: see the authoritative entry in the FOLDED block below (shaded region added 2026-11-24).
  'TD-15-01': { type: 'chart', x: { min: -6, max: 6, step: 2, label: 'x' }, y: { min: -50, max: 10, step: 10, label: 'y' }, grid: true, origin: 'O', series: [{ kind: 'line', dash: '6 4', points: [[-2, -50], [2, 10]] }] },

  // TD-15-03: see the authoritative entry in the FOLDED block below (shaded region + corrected line added 2026-11-24).
  'TD-15-03': { type: 'chart', x: { min: -8, max: 8, step: 2, label: 'x' }, y: { min: -8, max: 8, step: 2, label: 'y' }, grid: true, origin: 'O', series: [{ kind: 'line', points: [[3, 8], [7, -3]] }] },

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
  'TD-15-02': { type: 'chart', x: { min: -15, max: 15, step: 5, label: 'x' }, y: { min: 0, max: 60, step: 5, label: 'y' }, grid: true, origin: 'O', series: [{ kind: 'region', points: [[-15, 35], [-15, 60], [15, 60], [15, 35]] }] },
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
  'TD-33-08': {"type":"chart","x":{"min":-6,"max":6,"step":1},"y":{"min":-14,"max":12,"step":2,"labels":[-4,-8,-12]},"grid":true,"origin":"O","series":[{"kind":"line","points":[[-6,12],[-5.75,12],[-5.5,12],[-5.25,12],[-5,12],[-4.75,12],[-4.5,12],[-4.25,12],[-4,12],[-3.75,12],[-3.5,12],[-3.25,6.02],[-3,0],[-2.75,-4.69],[-2.5,-8.17],[-2.25,-10.56],[-2,-12],[-1.75,-12.6],[-1.5,-12.5],[-1.25,-11.81],[-1,-10.67],[-0.75,-9.19],[-0.5,-7.5],[-0.25,-5.73],[0,-4],[0.25,-2.44],[0.5,-1.17],[0.75,-0.31],[1,0],[1.25,-0.35],[1.5,-1.5],[1.75,-3.56],[2,-6.67],[2.25,-10.94],[2.5,-14],[2.75,-14],[3,-14],[3.25,-14],[3.5,-14],[3.75,-14],[4,-14],[4.25,-14],[4.5,-14],[4.75,-14],[5,-14],[5.25,-14],[5.5,-14],[5.75,-14],[6,-14]]}],"marks":[{"x":-3,"y":0},{"x":1,"y":0},{"x":0,"y":-4}]},
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
  'SR-059': {type:"chart",x:{min:-2,max:10,step:2,label:"x"},y:{min:-2,max:12,step:2,label:"y"},series:[{kind:"line",points:[[-2,-8],[-1.8,-6.82],[-1.6,-5.68],[-1.4,-4.58],[-1.2,-3.52],[-1,-2.5],[-0.8,-1.52],[-0.6,-0.58],[-0.4,0.32],[-0.2,1.18],[0,2],[0.2,2.78],[0.4,3.52],[0.6,4.22],[0.8,4.88],[1,5.5],[1.2,6.08],[1.4,6.62],[1.6,7.12],[1.8,7.58],[2,8],[2.2,8.38],[2.4,8.72],[2.6,9.02],[2.8,9.28],[3,9.5],[3.2,9.68],[3.4,9.82],[3.6,9.92],[3.8,9.98],[4,10],[4.2,9.98],[4.4,9.92],[4.6,9.82],[4.8,9.68],[5,9.5],[5.2,9.28],[5.4,9.02],[5.6,8.72],[5.8,8.38],[6,8],[6.2,7.58],[6.4,7.12],[6.6,6.62],[6.8,6.08],[7,5.5],[7.2,4.88],[7.4,4.22],[7.6,3.52],[7.8,2.78],[8,2],[8.2,1.18],[8.4,0.32],[8.6,-0.58],[8.8,-1.52],[9,-2.5],[9.2,-3.52],[9.4,-4.58],[9.6,-5.68],[9.8,-6.82],[10,-8]]}],marks:[{x:4,y:10,label:"vertex",dx:8,dy:-8}]},
  'SR-067': {type:"chart",x:{min:-6,max:2,step:2,label:"x"},y:{min:-2,max:8,step:2,label:"y"},series:[{kind:"line",points:[[-6,-28.56],[-5.867,-25.556],[-5.733,-22.689],[-5.6,-19.958],[-5.467,-17.364],[-5.333,-14.907],[-5.2,-12.586],[-5.067,-10.401],[-4.933,-8.353],[-4.8,-6.442],[-4.667,-4.667],[-4.533,-3.028],[-4.4,-1.526],[-4.267,-0.161],[-4.133,1.068],[-4,2.16],[-3.867,3.116],[-3.733,3.935],[-3.6,4.618],[-3.467,5.164],[-3.333,5.573],[-3.2,5.846],[-3.067,5.983],[-2.933,5.983],[-2.8,5.846],[-2.667,5.573],[-2.533,5.164],[-2.4,4.618],[-2.267,3.935],[-2.133,3.116],[-2,2.16],[-1.867,1.068],[-1.733,-0.161],[-1.6,-1.526],[-1.467,-3.028],[-1.333,-4.667],[-1.2,-6.442],[-1.067,-8.353],[-0.933,-10.401],[-0.8,-12.586],[-0.667,-14.907],[-0.533,-17.364],[-0.4,-19.958],[-0.267,-22.689],[-0.133,-25.556],[0,-28.56],[0.133,-31.7],[0.267,-34.977],[0.4,-38.39],[0.533,-41.94],[0.667,-45.627],[0.8,-49.45],[0.933,-53.409],[1.067,-57.505],[1.2,-61.738],[1.333,-66.107],[1.467,-70.612],[1.6,-75.254],[1.733,-80.033],[1.867,-84.948],[2,-90]]}],marks:[{x:-4.25,y:0,label:"x-int",dx:-30,dy:14},{x:-1.75,y:0,label:"x-int",dx:6,dy:14},{x:-3,y:6,label:"vertex",dx:-6,dy:-8}]},
  'SR-164': {type:"chart",x:{min:-1,max:9,step:2,label:"x"},y:{min:-4,max:20,step:4,label:"y"},series:[{kind:"line",points:[[-1,17.333],[-0.833,16.568],[-0.667,15.82],[-0.5,15.089],[-0.333,14.376],[-0.167,13.679],[0,13],[0.167,12.338],[0.333,11.693],[0.5,11.065],[0.667,10.455],[0.833,9.862],[1,9.286],[1.167,8.727],[1.333,8.185],[1.5,7.661],[1.667,7.153],[1.833,6.663],[2,6.19],[2.167,5.735],[2.333,5.296],[2.5,4.875],[2.667,4.471],[2.833,4.084],[3,3.714],[3.167,3.362],[3.333,3.026],[3.5,2.708],[3.667,2.407],[3.833,2.124],[4,1.857],[4.167,1.608],[4.333,1.376],[4.5,1.161],[4.667,0.963],[4.833,0.782],[5,0.619],[5.167,0.473],[5.333,0.344],[5.5,0.232],[5.667,0.138],[5.833,0.06],[6,0],[6.167,-0.043],[6.333,-0.069],[6.5,-0.077],[6.667,-0.069],[6.833,-0.043],[7,0],[7.167,0.06],[7.333,0.138],[7.5,0.232],[7.667,0.344],[7.833,0.473],[8,0.619],[8.167,0.782],[8.333,0.963],[8.5,1.161],[8.667,1.376],[8.833,1.608],[9,1.857]]}],marks:[{x:0,y:13,label:"y-int",dx:8,dy:-6},{x:6,y:0,label:"x-int",dx:4,dy:14},{x:7,y:0,label:"x-int",dx:4,dy:14}]},
  'SP1-071': {type:"chart",x:{min:-1,max:4,step:1,label:"x"},y:{min:-8,max:8,step:2,label:"y"},series:[{kind:"line",points:[[-1,5.4],[-0.833,5],[-0.667,4.6],[-0.5,4.2],[-0.333,3.8],[-0.167,3.4],[0,3],[0.167,2.6],[0.333,2.2],[0.5,1.8],[0.667,1.4],[0.833,1],[1,0.6],[1.167,0.2],[1.333,-0.2],[1.5,-0.6],[1.667,-1],[1.833,-1.4],[2,-1.8],[2.167,-2.2],[2.333,-2.6],[2.5,-3],[2.667,-3.4],[2.833,-3.8],[3,-4.2],[3.167,-4.6],[3.333,-5],[3.5,-5.4],[3.667,-5.8],[3.833,-6.2],[4,-6.6]]}],marks:[{x:1.25,y:0,label:"x-int",dx:6,dy:14}]},
  'SP1-102': {type:"chart",x:{min:-5,max:5,step:5,label:"x"},y:{min:0,max:40,step:8,label:"y"},series:[{kind:"line",points:[[-6,-5],[-5.6,-3.4],[-5.2,-1.8],[-4.8,-0.2],[-4.4,1.4],[-4,3],[-3.6,4.6],[-3.2,6.2],[-2.8,7.8],[-2.4,9.4],[-2,11],[-1.6,12.6],[-1.2,14.2],[-0.8,15.8],[-0.4,17.4],[0,19],[0.4,20.6],[0.8,22.2],[1.2,23.8],[1.6,25.4],[2,27],[2.4,28.6],[2.8,30.2],[3.2,31.8],[3.6,33.4],[4,35],[4.4,36.6],[4.8,38.2],[5.2,39.8],[5.6,41.4],[6,43]]}],marks:[{x:0,y:19,label:"y-int",dx:8,dy:-6}]},
  'TD-11-24': {type:"chart",x:{min:0,max:12,step:2,label:"x"},y:{min:-10,max:20,step:5,label:"y"},series:[{kind:"line",points:[[0,17],[0.4,16.2],[0.8,15.4],[1.2,14.6],[1.6,13.8],[2,13],[2.4,12.2],[2.8,11.4],[3.2,10.6],[3.6,9.8],[4,9],[4.4,8.2],[4.8,7.4],[5.2,6.6],[5.6,5.8],[6,5],[6.4,4.2],[6.8,3.4],[7.2,2.6],[7.6,1.8],[8,1],[8.4,0.2],[8.8,-0.6],[9.2,-1.4],[9.6,-2.2],[10,-3],[10.4,-3.8],[10.8,-4.6],[11.2,-5.4],[11.6,-6.2],[12,-7]]}],marks:[{x:7,y:3,label:"(7,3)",dx:8,dy:-8}]},
  'TD-33-11': {type:"chart",x:{min:-8,max:16,step:2,label:"x"},y:{min:0,max:11000,step:2000,label:"y"},series:[{kind:"line",points:[[-8,-4400],[-7.7,-3689],[-7.4,-2996],[-7.1,-2321],[-6.8,-1664],[-6.5,-1025],[-6.2,-404],[-5.9,199],[-5.6,784],[-5.3,1351],[-5,1900],[-4.7,2431],[-4.4,2944],[-4.1,3439],[-3.8,3916],[-3.5,4375],[-3.2,4816],[-2.9,5239],[-2.6,5644],[-2.3,6031],[-2,6400],[-1.7,6751],[-1.4,7084],[-1.1,7399],[-0.8,7696],[-0.5,7975],[-0.2,8236],[0.1,8479],[0.4,8704],[0.7,8911],[1,9100],[1.3,9271],[1.6,9424],[1.9,9559],[2.2,9676],[2.5,9775],[2.8,9856],[3.1,9919],[3.4,9964],[3.7,9991],[4,10000],[4.3,9991],[4.6,9964],[4.9,9919],[5.2,9856],[5.5,9775],[5.8,9676],[6.1,9559],[6.4,9424],[6.7,9271],[7,9100],[7.3,8911],[7.6,8704],[7.9,8479],[8.2,8236],[8.5,7975],[8.8,7696],[9.1,7399],[9.4,7084],[9.7,6751],[10,6400],[10.3,6031],[10.6,5644],[10.9,5239],[11.2,4816],[11.5,4375],[11.8,3916],[12.1,3439],[12.4,2944],[12.7,2431],[13,1900],[13.3,1351],[13.6,784],[13.9,199],[14.2,-404],[14.5,-1025],[14.8,-1664],[15.1,-2321],[15.4,-2996],[15.7,-3689],[16,-4400]]}],marks:[{x:4,y:10000,label:"vertex",dx:8,dy:-10}]},
  'TD-33-22': {type:"chart",x:{min:-5,max:3,step:2,label:"x"},y:{min:-30,max:120,step:30,label:"y"},series:[{kind:"line",points:[[-5,-28],[-4.9,-24.799],[-4.8,-21.792],[-4.7,-18.973],[-4.6,-16.336],[-4.5,-13.875],[-4.4,-11.584],[-4.3,-9.457],[-4.2,-7.488],[-4.1,-5.671],[-4,-4],[-3.9,-2.469],[-3.8,-1.072],[-3.7,0.197],[-3.6,1.344],[-3.5,2.375],[-3.4,3.296],[-3.3,4.113],[-3.2,4.832],[-3.1,5.459],[-3,6],[-2.9,6.461],[-2.8,6.848],[-2.7,7.167],[-2.6,7.424],[-2.5,7.625],[-2.4,7.776],[-2.3,7.883],[-2.2,7.952],[-2.1,7.989],[-2,8],[-1.9,7.991],[-1.8,7.968],[-1.7,7.937],[-1.6,7.904],[-1.5,7.875],[-1.4,7.856],[-1.3,7.853],[-1.2,7.872],[-1.1,7.919],[-1,8],[-0.9,8.121],[-0.8,8.288],[-0.7,8.507],[-0.6,8.784],[-0.5,9.125],[-0.4,9.536],[-0.3,10.023],[-0.2,10.592],[-0.1,11.249],[0,12],[0.1,12.851],[0.2,13.808],[0.3,14.877],[0.4,16.064],[0.5,17.375],[0.6,18.816],[0.7,20.393],[0.8,22.112],[0.9,23.979],[1,26],[1.1,28.181],[1.2,30.528],[1.3,33.047],[1.4,35.744],[1.5,38.625],[1.6,41.696],[1.7,44.963],[1.8,48.432],[1.9,52.109],[2,56],[2.1,60.111],[2.2,64.448],[2.3,69.017],[2.4,73.824],[2.5,78.875],[2.6,84.176],[2.7,89.733],[2.8,95.552],[2.9,101.639],[3,108]]}],marks:[{x:0,y:12,label:"y-int",dx:8,dy:-6}]},
  'TD-35-19': {type:"chart",x:{min:0,max:18,step:2,label:"x"},y:{min:10000,max:11000,step:1000,label:"y"},series:[{kind:"line",points:[[0,10294.231],[0.225,10314.048],[0.45,10333.37],[0.675,10352.195],[0.9,10370.524],[1.125,10388.357],[1.35,10405.694],[1.575,10422.534],[1.8,10438.879],[2.025,10454.727],[2.25,10470.08],[2.475,10484.936],[2.7,10499.296],[2.925,10513.16],[3.15,10526.528],[3.375,10539.399],[3.6,10551.775],[3.825,10563.654],[4.05,10575.038],[4.275,10585.925],[4.5,10596.316],[4.725,10606.211],[4.95,10615.61],[5.175,10624.512],[5.4,10632.919],[5.625,10640.829],[5.85,10648.244],[6.075,10655.162],[6.3,10661.584],[6.525,10667.51],[6.75,10672.94],[6.975,10677.873],[7.2,10682.311],[7.425,10686.252],[7.65,10689.698],[7.875,10692.647],[8.1,10695.1],[8.325,10697.057],[8.55,10698.518],[8.775,10699.482],[9,10699.951],[9.225,10699.923],[9.45,10699.4],[9.675,10698.38],[9.9,10696.864],[10.125,10694.852],[10.35,10692.344],[10.575,10689.339],[10.8,10685.839],[11.025,10681.842],[11.25,10677.35],[11.475,10672.361],[11.7,10666.876],[11.925,10660.895],[12.15,10654.418],[12.375,10647.444],[12.6,10639.975],[12.825,10632.009],[13.05,10623.548],[13.275,10614.59],[13.5,10605.136],[13.725,10595.186],[13.95,10584.74],[14.175,10573.797],[14.4,10562.359],[14.625,10550.424],[14.85,10537.994],[15.075,10525.067],[15.3,10511.644],[15.525,10497.725],[15.75,10483.31],[15.975,10468.398],[16.2,10452.991],[16.425,10437.087],[16.65,10420.688],[16.875,10403.792],[17.1,10386.4],[17.325,10368.512],[17.55,10350.128],[17.775,10331.247],[18,10311.871]]}],marks:[{x:9.1,y:10700,label:"vertex",dx:8,dy:-10}]},
  'SR-085': {type:"chart",x:{min:0,max:6,step:1,label:"x"},y:{min:0,max:10000,step:2000,label:"y"},series:[{kind:"exp",a:9000,b:0.66}],marks:[{x:0,y:9000,label:"y-int",dx:8,dy:-6}]},
  'SR-086': {type:"chart",x:{min:0,max:6,step:1,label:"t"},y:{min:0,max:10000,step:2000,label:"y"},series:[{kind:"exp",a:8000,b:0.65}],marks:[{x:0,y:8000,label:"y-int",dx:8,dy:-6}]},
  'TD-42-04': {type:"rawSvg",svg:"<svg viewBox='0 0 420 320' xmlns='http://www.w3.org/2000/svg'>   <line x1='40' y1='280' x2='292' y2='280' stroke='#162c46' stroke-width='2'/>   <line x1='40' y1='280' x2='357' y2='50' stroke='#162c46' stroke-width='2'/>   <line x1='166' y1='188' x2='292' y2='280' stroke='#162c46' stroke-width='2'/>   <line x1='357' y1='50' x2='250' y2='280' stroke='#162c46' stroke-width='2'/>   <circle cx='40' cy='280' r='3' fill='#0f2a47'/>   <circle cx='292' cy='280' r='3' fill='#0f2a47'/>   <circle cx='166' cy='188' r='3' fill='#0f2a47'/>   <circle cx='250' cy='280' r='3' fill='#0f2a47'/>   <circle cx='357' cy='50' r='3' fill='#0f2a47'/>   <text x='40' y='302' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>D</text>   <text x='292' y='302' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>A</text>   <text x='250' y='302' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>E</text>   <text x='156' y='180' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='end'>C</text>   <text x='365' y='44' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='start'>B</text>   <path d='M 262.7 252.8 L 265.7 254.4 L 268.5 256.3 L 271.0 258.6 L 273.3 261.1 L 275.3 263.9 L 277.0 266.8 L 278.3 270.0 L 279.2 273.2 L 279.8 276.6 L 280.0 280.0' fill='none' stroke='#c2410c' stroke-width='1.6'/>   <path d='M 193.5 208.0 L 189.2 212.8 L 184.2 216.7 L 178.5 219.6 L 172.4 221.4 L 166.0 222.0 L 159.6 221.4 L 153.5 219.6 L 147.8 216.7 L 142.8 212.8 L 138.5 208.0' fill='none' stroke='#c2410c' stroke-width='1.6'/>   <path d='M 344.3 77.2 L 343.0 76.5 L 341.6 75.8 L 340.4 75.0 L 339.1 74.1 L 337.9 73.1 L 336.7 72.1 L 335.6 71.1 L 334.6 70.0 L 333.6 68.8 L 332.7 67.6' fill='none' stroke='#c2410c' stroke-width='1.6'/>   <text x='294' y='274' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='start'>x°</text>   <text x='126' y='206' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='end'>108°</text>   <text x='381' y='36' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='start'>29°</text>   </svg>"},
  /* ===== 图表还原：把 OCR 的 [Table:/Graph:] 文本占位符换成真正的表格/坐标图 ===== */
  'SR-082': {type:"table",head:["x","y"],rows:[["21","-8"],["23","8"],["25","-8"]]},
  'SR-098': {type:"table",head:["x","h(x)"],rows:[["0","1.34"],["2","1.83"],["4","2.51"]]},
  'SR-173': {type:"table",head:["Number of cars","Maximum number of passengers and crew"],rows:[["2","79"],["5","187"],["9","331"]]},
  'SR-176': {type:"table",caption:"Energy per Gram of Typical Macronutrients",head:["Macronutrient","Food calories","Kilojoules"],rows:[["Protein","4.0","16.7"],["Fat","9.0","37.7"],["Carbohydrate","4.0","16.7"]]},
  'SR-177': {type:"table",head:["Amount of salt (grams)","Amount of water (liters)"],rows:[["195","5"],["234","6"],["273","7"]]},
  'SR-184': {type:"chart",x:{min:0,max:20,step:2,label:"Number of cornflowers"},y:{min:0,max:20,step:2,label:"Number of wallflowers"},series:[{kind:"points",points:[[0,12],[4,9],[8,6],[12,3],[16,0]]}]},
  'SR-185': {type:"chart",x:{min:0,max:20,step:2,label:"Hours at job A"},y:{min:0,max:10,step:2,label:"Hours at job B"},series:[{kind:"line",points:[[0,8],[16,0]]}]},
  'SR-187': {type:"chart",x:{min:0,max:100,step:10,label:"Shares of Company A"},y:{min:0,max:50,step:10,label:"Shares of Company B"},series:[{kind:"line",points:[[0,35],[90,0]]}]},
  /* ===== 表格题图表补全（题干引用 table above 但 OCR 把表格压进文字）===== */
  'SR-126': {type:"table",head:["Day","Number of bacteria per milliliter at end of day"],rows:[["1","2.5 × 10^5"],["2","5.0 × 10^5"],["3","1.0 × 10^6"]]},
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
    'head': ['Species of tree', 'Growthfactor'],
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

  // TD-22-14: 40x + 30y = 600  -> correct line x-int 15, y-int 20 (choice B).
  'TD-22-14': {
    A: { kind: 'line', xInt: 20, yInt: 15, xmax: 40, ymax: 40 },
    B: { kind: 'line', xInt: 15, yInt: 20, xmax: 40, ymax: 40 },
    C: { kind: 'line', xInt: 15, yInt: 20, xmax: 20, ymax: 20 },
    D: { kind: 'line', xInt: 30, yInt: 40, xmax: 40, ymax: 40 }
  },

  // TD-33-18: decreasing exponential function -> choice D.
  'TD-33-18': {
    A: { kind: 'line', xInt: 2, yInt: -3, xmin: 0, xmax: 10, ymin: -4, ymax: 12 },
    B: { kind: 'line', xInt: 4, yInt: 6, xmin: 0, xmax: 10, ymin: 0, ymax: 10 },
    C: { kind: 'expGrowth', yInt: 1, xmin: 0, xmax: 7, ymin: 0, ymax: 10 },
    D: { kind: 'expDecay', yInt: 10, xmin: 0, xmax: 10, ymin: 0, ymax: 10 }
  },

  // TD-33-19: polynomial with roots x=7 and x=-5 (factor x+5) -> choice A.
  'TD-33-19': {
    A: { kind: 'cubic', roots: [-5, 3, 7], sign: -1, xmin: -6, xmax: 8, ymin: -6, ymax: 6 },
    B: { kind: 'cubic', roots: [-5, 2, 7], sign: 1, xmin: -6, xmax: 8, ymin: -6, ymax: 6 },
    C: { kind: 'cubic', roots: [-5, 2.5, 7], sign: 1, xmin: -6, xmax: 8, ymin: -6, ymax: 6 },
    D: { kind: 'cubic', roots: [-5, 4.5, 4.5], sign: -1, xmin: -6, xmax: 8, ymin: -6, ymax: 6 }
  },

  // U1-01: which line has slope -1 through (0,1)? All four are negative-slope
  // lines; option B sits in the negative quadrant (both intercepts ≈ -1).
  'U1-01': {
    A: { kind: 'line', xInt: 1, yInt: 1, xmax: 4, ymax: 4 },
    B: { kind: 'line', xInt: -1, yInt: -1, xmin: -2, xmax: 2, ymin: -2, ymax: 2 },
    C: { kind: 'line', xInt: 3, yInt: 1, xmax: 4, ymax: 4 },
    D: { kind: 'line', xInt: 0.5, yInt: 1, xmax: 4, ymax: 4 }
  },

  // SR-232: ax + by = b, 0 < a < b -> y = -(a/b)x + b. Need positive intercepts
  // and a shallow negative slope in (-1, 0). Correct answer C (y-int 1, x-int 4).
  'SR-232': {
    A: { kind: 'line', xInt: 2, yInt: 2, xmin: -4, xmax: 4, ymin: -4, ymax: 4 },
    B: { kind: 'line', xInt: -2, yInt: -2, xmin: -4, xmax: 4, ymin: -4, ymax: 4 },
    C: { kind: 'line', xInt: 4, yInt: 1, xmin: -4, xmax: 4, ymin: -4, ymax: 4 },
    D: { kind: 'line', xInt: 1, yInt: 3, xmin: -4, xmax: 4, ymin: -4, ymax: 4 }
  }

};


/* ===== 订正回写 FOLDED_PATCH_FIX (2026-11-22) =====
   原由 stem-patch.js / choice_crops.js 在运行时注入的图形订正，现固化为源数据。
   共 33 条 figure spec（10 新增 + 23 覆盖）与 1 条 choiceGraph；删补丁后此处为唯一来源。 */
Object.assign(window.TD_FIG_SPECS, {
  "U4-05": {"type":"rawSvg","svg":"<svg viewBox='0 0 360 240' xmlns='http://www.w3.org/2000/svg'>\n  <line x1='120' y1='30' x2='120' y2='210' stroke='#162c46' stroke-width='2.2'/>\n  <line x1='240' y1='30' x2='240' y2='210' stroke='#162c46' stroke-width='2.2'/>\n  <line x1='70' y1='215' x2='295' y2='25' stroke='#162c46' stroke-width='2.2'/>\n  <text x='120' y='22' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>r</text>\n  <text x='240' y='22' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>s</text>\n  <text x='303' y='24' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='start'>t</text>\n  <text x='92' y='196' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46'>x\u00b0</text>\n  <text x='258' y='60' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46'>y\u00b0</text>\n</svg>"},
  "TD-41-06": {"type":"rawSvg","svg":"<svg viewBox='0 0 360 240' xmlns='http://www.w3.org/2000/svg'>\n  <line x1='120' y1='30' x2='120' y2='210' stroke='#162c46' stroke-width='2.2'/>\n  <line x1='240' y1='30' x2='240' y2='210' stroke='#162c46' stroke-width='2.2'/>\n  <line x1='70' y1='215' x2='295' y2='25' stroke='#162c46' stroke-width='2.2'/>\n  <text x='120' y='22' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>r</text>\n  <text x='240' y='22' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>s</text>\n  <text x='303' y='24' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='start'>t</text>\n  <text x='92' y='196' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46'>x\u00b0</text>\n  <text x='258' y='60' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46'>y\u00b0</text>\n</svg>"},
  // 2026-11-24 阴影题补 region：讲义 p31 #2 / 练习册 p53 #1（U1-13 与 TD-15-01 同一张图）/ p54 #3
  "U1-12": {"type":"chart","x":{"min":-8,"max":8,"step":2,"label":"x"},"y":{"min":-8,"max":8,"step":2,"label":"y"},"grid":true,"origin":"O","series":[{"kind":"region","points":[[-1.75,8],[8,8],[8,-8],[2.25,-8]]},{"kind":"line","dash":"6 4","points":[[-1.5,7],[2.5,-9]]}]},
  "U1-13": {"type":"chart","x":{"min":-6,"max":6,"step":2,"label":"x"},"y":{"min":-50,"max":10,"step":10,"label":"y"},"grid":true,"origin":"O","series":[{"kind":"region","points":[[-6,10],[2,10],[-2,-50],[-6,-50]]},{"kind":"line","dash":"6 4","points":[[-2,-50],[2,10]]}]},
  "TD-15-01": {"type":"chart","x":{"min":-6,"max":6,"step":2,"label":"x"},"y":{"min":-50,"max":10,"step":10,"label":"y"},"grid":true,"origin":"O","series":[{"kind":"region","points":[[-6,10],[2,10],[-2,-50],[-6,-50]]},{"kind":"line","dash":"6 4","points":[[-2,-50],[2,10]]}]},
  "TD-15-03": {"type":"chart","x":{"min":-8,"max":8,"step":2,"label":"x"},"y":{"min":-8,"max":8,"step":2,"label":"y"},"grid":true,"origin":"O","series":[{"kind":"region","points":[[2.5,8],[8,8],[8,-3]]},{"kind":"line","points":[[2.5,8],[8,-3]]}]},
  "TD-25-05": {"type":"chart","x":{"min":80,"max":140,"step":10},"y":{"min":0,"max":10,"step":10},"yAxis":false,"grid":false,"series":[{"kind":"box","lo":85,"q1":98,"med":115,"q3":125,"hi":138}]},
  "TD-33-13": {"type":"rawSvg","svg":"<svg viewBox='0 0 430 190' xmlns='http://www.w3.org/2000/svg'>\n  <g stroke='#162c46' stroke-width='1.6' fill='none'>\n    <rect x='15' y='25' width='180' height='120'/>\n    <line x1='75' y1='25' x2='75' y2='145'/>\n    <line x1='115' y1='25' x2='115' y2='145'/>\n    <line x1='155' y1='25' x2='155' y2='145'/>\n    <line x1='15' y1='85' x2='195' y2='85'/>\n    <rect x='235' y='25' width='180' height='120'/>\n    <line x1='295' y1='25' x2='295' y2='145'/>\n    <line x1='335' y1='25' x2='335' y2='145'/>\n    <line x1='375' y1='25' x2='375' y2='145'/>\n    <line x1='235' y1='85' x2='415' y2='85'/>\n  </g>\n  <g font-family='Times New Roman,Georgia,serif' font-size='17' fill='#162c46' text-anchor='middle'>\n    <text x='45' y='64'>x</text>\n    <text x='95' y='64'>-1</text>\n    <text x='135' y='64'>0</text>\n    <text x='175' y='64'>1</text>\n    <text x='45' y='118'>q(x)</text>\n    <text x='95' y='118'>7</text>\n    <text x='135' y='118'>21</text>\n    <text x='175' y='118'>63</text>\n    <text x='265' y='64'>x</text>\n    <text x='315' y='64'>-1</text>\n    <text x='355' y='64'>0</text>\n    <text x='395' y='64'>1</text>\n    <text x='265' y='118'>q(x)</text>\n    <text x='315' y='106'>1</text>\n    <line x1='307' y1='112' x2='323' y2='112' stroke='#162c46' stroke-width='1.3'/>\n    <text x='315' y='128'>7</text>\n    <text x='355' y='118'>3</text>\n    <text x='395' y='118'>63</text>\n  </g>\n</svg>"},
  "TD-42-12": {"type":"table","head":["","Perimeter"],"rows":[["Triangle TUV","50"],["Triangle XYZ","150"]]},
  "TD-42-18": {"type":"triangle","pts":[[70,200],[290,200],[180,55]],"labels":["A","C","B"]},
  "TD-43-01": {"type":"rawSvg","svg":"<svg viewBox='0 0 440 300' xmlns='http://www.w3.org/2000/svg'>\n  <rect x='60' y='140' width='320' height='120' fill='none' stroke='#162c46' stroke-width='2'/>\n  <path d='M 60 140 A 90 90 0 0 1 240 140' fill='none' stroke='#162c46' stroke-width='2'/>\n  <circle cx='150' cy='140' r='3' fill='#0f2a47'/>\n  <text x='52' y='132' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>N</text>\n  <text x='240' y='132' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>P</text>\n  <text x='388' y='132' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>Q</text>\n  <text x='150' y='162' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>O</text>\n  <text x='52' y='282' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>S</text>\n  <text x='388' y='282' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>R</text>\n</svg>"},
  "TD-11-03": {"type":"chart","x":{"min":0,"max":10,"step":2,"label":"x"},"y":{"min":-10,"max":10,"step":2,"label":"y"},"grid":true,"origin":"O","series":[{"kind":"line","points":[[0,2],[4.5,-3]]}]},
  "TD-11-20": {"type":"chart","x":{"min":-6,"max":6,"step":2,"label":"x"},"y":{"min":-6,"max":6,"step":2,"label":"y"},"grid":true,"origin":"O","series":[{"kind":"line","points":[[0,6],[4.8,-6]]}]},
  "TD-15-02": {"type":"chart","x":{"min":-15,"max":15,"step":5,"label":"x"},"y":{"min":0,"max":60,"step":5,"label":"y"},"grid":true,"origin":"O","series":[{"kind":"region","points":[[-15,35],[-15,60],[15,60],[15,35]]}]},
  "TD-22-09": {"type":"chart","x":{"min":0,"max":9,"step":1,"label":"Time (seconds)"},"y":{"min":0,"max":11,"step":1,"label":"Momentum (newton-seconds)"},"grid":true,"series":[{"kind":"line","points":[[0,1],[1,1.6],[2,2],[3,2.9],[4,4],[5,5.6],[6,8],[7,9.5],[7.5,9.7],[8,9]]},{"kind":"points","points":[[0,1],[2,2],[4,4],[6,8],[8,9]]}]},
  "TD-22-17": {"type":"chart","x":{"min":0,"max":6,"step":1,"label":"x"},"y":{"min":0,"max":13,"step":1,"label":"y"},"grid":true,"series":[{"kind":"line","points":[[0,7],[1,8.8],[2,10],[3,10.6],[4,11],[5,10.7],[6,10]]}]},
  "TD-25-15": {"type":"chart","x":{"min":0,"max":5,"step":1,"cats":[["Plot 1",1.4],["Plot 2",2.4],["Plot 3",3.4],["Plot 4",4.4]]},"y":{"min":0,"max":90,"step":10,"label":"Trees planted","showZero":true},"grid":true,"series":[{"kind":"bar","bars":[{"x0":1,"x1":1.8,"h":65},{"x0":2,"x1":2.8,"h":75},{"x0":3,"x1":3.8,"h":80},{"x0":4,"x1":4.8,"h":59}]}]},
  "SP1-025": {"type":"chart","x":{"min":-10,"max":10,"step":2,"label":"x"},"y":{"min":-10,"max":10,"step":2,"label":"y"},"grid":true,"series":[{"kind":"line","points":[[-10,6],[10,1.5]]},{"kind":"line","points":[[-10,2],[10,2]]}],"marks":[{"x":-5,"y":5},{"x":8,"y":2}]},
  "SR-176": {"type":"table","head":["Macronutrient","Food calories","Kilojoules"],"rows":[["Protein","4.0","16.7"],["Fat","9.0","37.7"],["Carbohydrate","4.0","16.7"]]},
  "SR-185": {"type":"chart","x":{"min":0,"max":20,"step":5,"label":"Number of hours at job A"},"y":{"min":0,"max":12,"step":4,"label":"Number of hours at job B"},"grid":true,"series":[{"kind":"line","points":[[16,0],[0,8]]}],"marks":[{"x":16,"y":0},{"x":0,"y":8}]},
  "SR-126": {"type":"table","head":["Day","Number of bacteria per milliliter at end of day"],"rows":[["1","2.5 \u00d7 10\u2075"],["2","5.0 \u00d7 10\u2075"],["3","1.0 \u00d7 10\u2076"]]},
  "SR-137": {"type":"table","head":["x","f(x)"],"rows":[["1","a"],["2","a\u2075"],["3","a\u2079"]]},
  "SR-215": {"type":"table","head":["Property address","Purchase price (dollars)","Monthly rental price (dollars)"],"rows":[["Clearwater Lane","128,000","950"],["Driftwood Drive","176,000","1,310"],["Edgemont Street","70,000","515"],["Glenview Street","140,000","1,040"],["Hamilton Circle","450,000","3,365"]]},
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
Object.assign(window.TD_CHOICE_GRAPHS, {
  "TD-22-14": {"A":{"kind":"line","xInt":20,"yInt":15,"xmax":40,"ymax":40},"B":{"kind":"line","xInt":15,"yInt":20,"xmax":40,"ymax":40},"C":{"kind":"line","xInt":15,"yInt":20,"xmax":20,"ymax":20},"D":{"kind":"line","xInt":30,"yInt":40,"xmax":40,"ymax":40}}
});
