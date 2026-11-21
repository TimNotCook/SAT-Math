/* =========================================================================
   TD_ANALYSIS — 仅依靠用户填入的答案（所选选项字母 / 填空数值）精确归因错因，
   并给出针对性改进方向。不调用任何外部模型：全部由所选答案与正确答案的
   数值关系、方程结构、题型板块规则本地推断。

   API:
     TD_ANALYSIS.analyze(q, given, text)
       q     题库记录（type/answer/section/topic/image…）
       given 用户填入的答案（MCQ 为字母，grid 为数值字符串）
       text  可选，window.TD_TEXT[q.id]（stem / choices）；缺省自动读取全局
       返回 { type, title, cause, fix }
     TD_ANALYSIS.aggregate(detail, bank, text)
       成绩明细数组（scoreSession 产物）→ 按错因类型聚合
       返回 [{ type, label, count, ids, fix }]，按次数降序
   ========================================================================= */
(function () {
  'use strict';

  /* ---------- 基础解析 ---------- */
  function num(s) {
    s = String(s == null ? '' : s).trim().replace(/[−–]/g, '-').replace(/,/g, '');
    var f = /^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/.exec(s);
    if (f && +f[2]) return +f[1] / +f[2];
    return /^-?\d+(\.\d+)?$/.test(s) ? +s : null;
  }
  /* 提取字符串中出现的全部数字（含分数），供关系比对 */
  function nums(s) {
    var out = [], re = /-?\d+(?:\.\d+)?(?:\s*\/\s*-?\d+(?:\.\d+)?)?/g, m;
    while ((m = re.exec(String(s == null ? '' : s)))) {
      var v = m[0], f = /^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/.exec(v);
      out.push(f ? +f[1] / +f[2] : +v);
    }
    return out;
  }
  function choiceText(q, L, text) {
    var e = text || (window.TD_TEXT || {})[q.id] || {};
    var v = (e.choices && e.choices[L]) || (q.choices && q.choices[L]);
    return v ? String(v) : '';
  }
  function near(a, b, rel) {
    return b !== 0 && Math.abs(a - b) / Math.abs(b) <= (rel || 0.08);
  }
  function ratioOf(a, b) { return b ? a / b : NaN; }

  /* ---------- 错误类型自查步骤：这类错下次怎么防 ---------- */
  var TYPE_FIX = {
    sign: '①移项、去括号、两边同乘负数时逐项变号；②解出后先查正负号，再代回原式验证两边相等。',
    reciprocal: '①先写清谁是分子谁是分母；②比例式交叉相乘 a/b=c/d → ad=bc，不换位；③斜率 m=Δy/Δx，别把横、纵坐标增量弄反。',
    factor: '①先确认是不是百分比（×100）、单位换算（×10/×1000）或缩放；②面积是边长的平方关系，别只乘一次；③换算前后各写一遍对照。',
    precision: '①草稿上分步写，中间不提前舍入；②最后一步再按题目要求处理小数；③把得数代回原题反推一遍。',
    format: '填空题只填数值或分数：整数直接写，分数写成 a/b，不带单位、汉字或多余空格。',
    eqStruct: '①把两边整理成标准式（y=mx+b 或原式形式）；②逐项核对斜率、截距、指数、底数；③代入已知点反解未知项。',
    concept: '①把题目条件逐条翻译成式子；②套对应公式并写出每一步变形；③结果代回原题检验，别只凭估算选答案。'
  };

  /* ---------- 板块练习建议库（按 section 前缀精确匹配；专项细分在前，大类在后） ---------- */
  var FIX_LIB = [
    { re: /^1\.7\.T1/, fix: '「解的个数」专项：两式化标准式后比斜率与截距——斜率不同唯一解，斜率同截距同无穷解，斜率同截距不同无解；含参数要分情况讨论。' },
    { re: /^1\.7\.T2/, fix: '一元方程专项：去分母 → 移项合并 → 求解，每步写清楚，解完代回原式。' },
    { re: /^1\.7\.T3/, fix: '两点定直线专项：m=Δy/Δx，代一个点求 b，画出来核对再选。' },
    { re: /^1\.7\.T4/, fix: '线性关系典型题：先读懂量与量的对应关系，设未知数列式，代入验证。' },
    { re: /^1\.7\.T5/, fix: '线性不等式专项：先写等式找边界，再判增减方向，端点是否包含单独验证。' },
    { re: /^1\.1/, fix: '图像题：先写成 y=mx+b，在图上找两个格点算 m=Δy/Δx，再代点求 b，逐项排除，不要目测估计。' },
    { re: /^1\.2/, fix: '一元方程：把所求量整体设为 v，去分母逐项乘到，移项必变号，解完代回原式。' },
    { re: /^1\.3/, fix: '线性模型：斜率是单位变化量、截距是初始值，结合题意解释后再选。' },
    { re: /^1\.4/, fix: '应用题：先设两个未知数，写清两句等量关系列方程组，加减消元后回代。' },
    { re: /^1\.5/, fix: '阴影区域与不等式：先定边界直线，再用原点试出满足不等式的一侧，端点看虚实圈。' },
    { re: /^1\.6/, fix: '绝对值方程：|A|=B 拆成 A=B 和 A=−B 两解，分别验根，别漏解。' },
    { re: /^2\.1/, fix: '比率与百分比：分清部分与总体，百分比=部分/总体×100%，先统一单位再算。' },
    { re: /^2\.2/, fix: '散点图：先读坐标轴刻度与单位，看整体趋势方向与强弱，离群点单独看。' },
    { re: /^2\.3/, fix: '线性与指数：每步加固定值是线性，每步乘固定倍是指数，别混；指数先找增长率底数。' },
    { re: /^2\.4/, fix: '概率：列全所有等可能结果，概率=有利结果/总数，分清放回与不放回。' },
    { re: /^2\.5/, fix: '统计量：先看清问的是均值、中位数、众数还是极差，再动手算。' },
    { re: /^2\.6/, fix: '抽样：样本要随机且能代表总体，结论只能外推到同类人群。' },
    { re: /^2\.7/, fix: '误差范围：结论落在估计值上下误差区间内表述，别超出范围。' },
    { re: /^3\.6/, fix: '高等数学专项：先辨认题型（二次 / 因式 / 有理式 / 变换），写出完整变形过程，结果代回检验。' },
    { re: /^3\.1/, fix: '多项式运算：按分配律逐项相乘，合并同类项，特别核对一次项与常数项。' },
    { re: /^3\.2/, fix: '二次 / 根式 / 分式方程：求根公式写全，增根代回检验，别漏负根。' },
    { re: /^3\.3/, fix: '二次函数图像：先定开口与顶点，代入定点求参数，留意判别式。' },
    { re: /^3\.4/, fix: '函数记号：f(a) 就是把 x 换成 a 代入；变换题先写原函数再做平移。' },
    { re: /^3\.5/, fix: '非线性建模：先定类型（二次 / 指数），代入定点求参数，注意定义域。' },
    { re: /^3\./, fix: '先确定函数类型，代入定点求参数，注意定义域与符号。' },
    { re: /^4\.1/, fix: '平行线与垂直：标出同位角、内错角、对顶角，先找相等关系再算角。' },
    { re: /^4\.2/, fix: '相似三角形：找对应角相等、对应边成比例，写清对应关系再列比例式。' },
    { re: /^4\.3/, fix: '面积与体积：公式写对，单位先统一，半径、边长别代错。' },
    { re: /^4\.4/, fix: '三角函数与单位圆：先定象限与符号，特殊角值记熟，分清角度与弧度。' },
    { re: /^4\./, fix: '把已知量标在图上，确认对应边与角后套公式，先统一单位。' }
  ];
  function sectionFix(section, topic, stem) {
    var s = String(section || ''), t = String(topic || '') + ' ' + String(stem || '');
    for (var i = 0; i < FIX_LIB.length; i++) if (FIX_LIB[i].re.test(s)) return FIX_LIB[i].fix;
    if (/斜率|截距|图像|直线/.test(t)) return '先写成 y=mx+b，对照图上两点求斜率和截距。';
    if (/百分比|比例|分数|比率/.test(t)) return '设基准量为 1，写清谁比谁，交叉相乘不跳步。';
    if (/几何|三角形|圆|角度|面积|体积/.test(t)) return '把已知量标在图上，确认对应关系后套公式，注意单位。';
    return '重练该知识点时写出完整步骤，结果代回原题检验，不要只凭估算选答案。';
  }
  /* 组合：错误类型自查步骤 + 本板块练习建议 */
  function compose(type, section, topic, stem) {
    var s = sectionFix(section, topic, stem);
    return TYPE_FIX[type] ? TYPE_FIX[type] + '；' + s : s;
  }

  /* ---------- 方程结构拆解（y=mx+b / 指数模型） ---------- */
  function eqParts(s) {
    s = String(s || '').replace(/\s+/g, '');
    var res = { m: null, b: null, exp: null, base: null, hasEq: s.indexOf('=') >= 0 };
    if (!res.hasEq) return res;
    var rhs = s.split('=').pop();
    var mM = rhs.match(/(-?\d*\.?\d*)\s*x/);
    if (mM) {
      var raw = mM[1];
      res.m = raw === '' || raw === '+' ? 1 : raw === '-' ? -1 : parseFloat(raw);
    }
    /* 常数项：rhs 中不依附于 x 的数字（可能在 x 前或后）；分数常数不参与数值比较 */
    var allNums = rhs.match(/[+-]?\d+\.?\d*(?:\/\d+\.?\d*)?/g) || [];
    allNums.forEach(function (v) {
      if (!/x/.test(v) && !/\//.test(v)) res.b = parseFloat(v);
    });
    /* 指数只在出现 ^ / 上标时提取，避免把普通尾数误判成指数 */
    if (/\^|ⁿ|²|³/.test(rhs)) {
      var eM = rhs.match(/\^?\{?([\dqxyz/]+)\}?$/);
      if (eM) res.exp = eM[1];
    }
    var baseM = rhs.match(/\(([\d.]+)\)/);
    if (baseM) res.base = parseFloat(baseM[1]);
    return res;
  }

  /* ---------- 主分析 ---------- */
  function analyze(q, given, text) {
    q = q || {};
    given = String(given == null ? '' : given).trim();
    text = text || (window.TD_TEXT || {})[q.id] || {};
    var correct = String(q.answer == null ? '' : q.answer).trim();
    var topic = String(q.topic || ''), section = String(q.section || ''), stem = String(text.stem || q.stem || '');
    var fix = sectionFix(section, topic, stem);

    /* 未作答 */
    if (!given) {
      return { type: 'blank', title: '未作答 · 时间分配',
        cause: '本次没有留下答案。可能是耗时过长被跳过，或前面题占用了时间。',
        fix: '每题先花 10 秒判取舍：超过 90 秒没思路先标记跳过，留时间给会做的题。' };
    }

    /* ---- 填空题（grid） ---- */
    if (q.type === 'grid') {
      var a = num(given), b = num(q.value != null ? q.value : correct);
      if (a === null || b === null) {
        return { type: 'format', title: '作答格式或数值转换',
          cause: '你的填写是「' + given + '」。填空题只接受数值或分数（如 12、3/4），检查是否混入文字、符号或多余空格。',
          fix: '按题目要求的形式填写：整数 / 小数 / 分数；分数写成 a/b，不要带单位文字。' };
      }
      if (Math.abs(a + b) <= Math.max(1e-4, Math.abs(b) * 1e-4) && Math.abs(a - b) > Math.max(1e-3, Math.abs(b) * 1e-3)) {
        return { type: 'sign', title: '符号判断错误',
          cause: '数值绝对值接近，但正负号相反。移项、去括号或定斜率方向时符号搞错了。',
          fix: compose('sign', section, topic, stem) };
      }
      if (b && Math.abs(a - 1 / b) <= Math.max(1e-3, Math.abs(1 / b) * 1e-3)) {
        return { type: 'reciprocal', title: '倒数或比例关系混淆',
          cause: '你的数值接近正确答案的倒数，分子分母搞反了。',
          fix: compose('reciprocal', section, topic, stem) };
      }
      var r = ratioOf(a, b);
      if (b && [2, 10, 100, 0.5, 0.1, 0.01].some(function (k) { return Math.abs(r - k) < 0.03; })) {
        return { type: 'factor', title: '倍数 / 单位换算错误',
          cause: '你的答案与正确答案约相差 ' + (Math.abs(r) > 1 ? Math.abs(r) : (1 / Math.abs(r)).toFixed(1)) + ' 倍，常见于百分比、缩放或单位换算。',
          fix: compose('factor', section, topic, stem) };
      }
      if (near(a, b, 0.08)) {
        return { type: 'precision', title: '计算精度 / 算术失误',
          cause: '数值接近但不满足判分精度，中间步骤舍入或最后一步算错。',
          fix: compose('precision', section, topic, stem) };
      }
      return { type: 'concept', title: '计算或公式应用错误 · ' + topic,
        cause: '你的数值（' + given + '）与正确答案（' + (q.value != null ? q.value : correct) + '）不一致，条件转化或公式用错。',
        fix: compose('concept', section, topic, stem) };
    }

    /* ---- 选择题（mcq） ---- */
    var gt = choiceText(q, given, text), ct = choiceText(q, correct, text);
    var gn = nums(gt), cn = nums(ct);

    /* 图像 / 图表题：题库注册了几何图或裁剪图的题，选项差异要对照图判断，
       先于数值与方程比对拦截（q.image 只是占位路径，不能作为图题依据） */
    var regFig = (window.TD_FIG_SPECS && window.TD_FIG_SPECS[q.id]) ||
                 (window.TD_FIG_CROPS && window.TD_FIG_CROPS[q.id]);
    if (regFig) {
      return { type: 'graph', title: '图像对应关系判断错误',
        cause: '这题配有图形 / 图表，选项之间的差异要对照图才能看出来，光看文字比对不出。',
        fix: '在草稿上标出截距、交点与增减趋势，先缩小范围再选，别凭印象。' };
    }

    /* 方程形式选项：先做结构比对 */
    if (ct.indexOf('=') >= 0 && gt.indexOf('=') >= 0) {
      var A = eqParts(gt), B = eqParts(ct);
      if (A.m != null && B.m != null && A.b != null && B.b != null) {
        var mSign = Math.sign(A.m) !== Math.sign(B.m), bSign = Math.sign(A.b) !== Math.sign(B.b);
        if (mSign && bSign) return { type: 'sign', title: '整体符号 / 移项错误',
          cause: '你选的式子斜率与截距符号都反了，移项或两边同乘时符号处理有误。',
          fix: '两边同乘负数记得逐项变号；写成 y=mx+b 后逐项核对符号。' };
        if (mSign) return { type: 'sign', title: '斜率符号错误',
          cause: '截距对但斜率符号反了：增减方向判断或系数符号搞错。',
          fix: '先看图像升降定斜率正负，再代入点核对系数。' };
        if (bSign) return { type: 'sign', title: '截距符号错误',
          cause: '斜率对但截距符号反了，常数项移项时没变号。',
          fix: '常数项移项必须变号；代 x=0 读 y 截距复核。' };
        if (A.m === B.m && A.b !== B.b) return { type: 'eqStruct', title: '截距计算错误',
          cause: '斜率对得上，但常数项（截距）求错：没有把已知点代入式中解出 b。',
          fix: '斜率确定后，把已知点代入 y=mx+b，反解出截距 b。' };
        if (A.b === B.b && A.m !== B.m) return { type: 'eqStruct', title: '斜率计算错误',
          cause: '截距对但斜率求错：两点纵坐标差除以横坐标差算反或算错。',
          fix: '斜率 m=Δy/Δx，用图上两个明确的点计算，别把分子分母弄反。' };
      }
      if (A.exp && B.exp && A.exp !== B.exp) return { type: 'eqStruct', title: '指数 / 变量位置混淆',
        cause: '指数位置或变量代换搞反了（如 q/4 写成 4q、x⁴ 写成 4^x）。',
        fix: '对照题意逐项核对底数、指数与变量位置，别把周期写进指数分子。' };
      if (A.base != null && B.base != null && Math.abs(A.base - B.base) > 1e-6) return { type: 'eqStruct', title: '增长率底数 / 周期换算错误',
        cause: '增长模型的底数或周期换算有误（如年利率与季度利率、指数周期）。',
        fix: '先统一时间单位，年利率拆成每期利率：(1+r)^(期数)，别直接改底数。' };
      return { type: 'eqStruct', title: '方程形式判断错误 · ' + topic,
        cause: '你选的式子与正确式结构不同：斜率、截距、底数或指数有一项对不上。',
        fix: compose('eqStruct', section, topic, stem) };
    }

    /* 纯数值选项：关系比对（选项必须整体是数字，避免「图1/图2」这类编号被误算） */
    var pureNum = function (s) { return /^[−\-\u2013\d\s./()]+$/.test(String(s == null ? '' : s).trim()); };
    if (gn.length && cn.length && pureNum(gt) && pureNum(ct)) {
      var g0 = gn[0], c0 = cn[0];
      if (c0 !== 0 && Math.abs(g0 + c0) <= Math.max(1e-6, Math.abs(c0) * 1e-6) && Math.abs(g0 - c0) > 1e-6) {
        return { type: 'sign', title: '符号判断错误',
          cause: '你选的数值与正确选项符号相反，移项 / 去括号 / 定方向时变号出错。',
          fix: compose('sign', section, topic, stem) };
      }
      if (c0 && Math.abs(g0 - 1 / c0) <= Math.max(1e-3, Math.abs(1 / c0) * 1e-3)) {
        return { type: 'reciprocal', title: '倒数关系混淆',
          cause: '你选的数值是正确选项的倒数，分子分母搞反了。',
          fix: compose('reciprocal', section, topic, stem) };
      }
      var rr = ratioOf(g0, c0);
      if (c0 && [2, 10, 100, 0.5, 0.1, 0.01].some(function (k) { return Math.abs(rr - k) < 0.03; })) {
        return { type: 'factor', title: '倍数 / 单位换算错误',
          cause: '你的答案与正确答案约相差 ' + (Math.abs(rr) > 1 ? Math.abs(rr) : (1 / Math.abs(rr)).toFixed(1)) + ' 倍。',
          fix: compose('factor', section, topic, stem) };
      }
      if (near(g0, c0, 0.08)) {
        return { type: 'precision', title: '计算精度 / 算术失误',
          cause: '数值接近但选错，中间一步算术或舍入出了错。',
          fix: compose('precision', section, topic, stem) };
      }
      return { type: 'concept', title: '数值判断错误 · ' + topic,
        cause: '你选 ' + given + (gt ? '（' + gt + '）' : '') + '，正确是 ' + correct + (ct ? '（' + ct + '）' : '') + '，条件转化或公式应用有误。',
        fix: compose('concept', section, topic, stem) };
    }

    /* 定性选项（解的个数 / I、II、III 等）：概念未到位 */
    return { type: 'concept', title: '概念判断错误 · ' + topic,
      cause: '你选 ' + given + (gt ? '（' + gt + '）' : '') + '，正确是 ' + correct + (ct ? '（' + ct + '）' : '') + '，该知识点的条件关系没有理清。',
      fix: compose('concept', section, topic, stem) };
  }

  /* ---------- 聚合：本次错题按错因类型分组 ---------- */
  var TYPE_LABEL = {
    sign: '符号判断错误', reciprocal: '倒数 / 比例混淆', factor: '倍数与单位换算',
    precision: '计算精度 / 算术失误', eqStruct: '方程形式判断', concept: '知识点概念未掌握',
    graph: '图像对应关系', blank: '未作答 / 时间分配', format: '作答格式', generic: '条件转化失误'
  };
  function aggregate(detail, bank, text) {
    bank = bank || (window.TD_BANK && window.TD_BANK.questions) || [];
    text = text || window.TD_TEXT || {};
    var groups = {};
    (detail || []).forEach(function (d) {
      if (d.correct) return;
      var q = d.q || bank.find(function (x) { return x.id === d.id; }) || d;
      var a = analyze(q, d.given, text[q.id]);
      var g = groups[a.type] || (groups[a.type] = { type: a.type, label: TYPE_LABEL[a.type] || a.type, count: 0, ids: [], fix: a.fix });
      g.count++; g.ids.push(d.id || q.id);
    });
    return Object.keys(groups).map(function (k) { return groups[k]; })
      .sort(function (a, b) { return b.count - a.count; });
  }

  window.TD_ANALYSIS = { analyze: analyze, aggregate: aggregate, TYPE_LABEL: TYPE_LABEL };
})();
