/* i18n.js — 全站中英切换
   设计原则：
   1) 中文是默认语言，页面代码里写的都是中文原文；
   2) 英文模式下不重写页面，而是在 DOM 层把「中文文本节点 / placeholder / title / aria-label」
      换成英文，动态渲染出来的新节点由 MutationObserver 补翻，避免逐个改 400 多处调用点；
   3) 认不出来的中文原样保留（宁可不翻，也不乱翻），未覆盖的条目靠后续补字典。
   设置入口在「设置 → 语言」，偏好存 tdsat_lang，只留在这台设备。 */
(function (global) {
  var KEY = 'tdsat_lang';
  var EN = {
    /* 顶部导航 / 模块 */
    '真题练习': 'Practice',
    '单元练习': 'Unit Practice',
    '专项训练': 'Targeted Practice',
    '专项练习': 'Targeted Practice',
    '专项复习': 'Targeted Review',
    '单元抽查': 'Unit Quiz',
    '错题回顾': 'Wrong Answers',
    '模考': 'Mock Test',
    '模考记录': 'Test History',
    '讲义复习': 'Lecture Review',
    '教材板块': 'Textbook',
    '精编原题组': 'Curated Set',
    '3.6 专项复习': '3.6 Targeted Review',
    '单元精编原题组 · 讲义 / 自测卷': 'Unit problem set · lecture / self-test',
    '退出本模块，返回上一个页面': 'Leave this module and go back',
    '退出': 'Exit',
    '设置': 'Settings',
    '关闭': 'Close',
    '返回': 'Back',
    '返回继续答题': 'Back to test',
    '返回答题': 'Back to test',

    /* 通用按钮 / 状态 */
    '上一题': 'Previous',
    '下一题': 'Next',
    '标记': 'Mark',
    '已标记': 'Marked',
    '标记本题': 'Mark this question',
    '取消标记': 'Unmark',
    '完成本板块': 'Finish section',
    '交卷': 'Submit',
    '检查': 'Check',
    '已锁定': 'Locked',
    '未作答': 'Unanswered',
    '已作答': 'Answered',
    '未答': 'Unanswered',
    '正确': 'Correct',
    '错误': 'Incorrect',
    '第一空': 'Blank 1',
    '第二空': 'Blank 2',
    '答案选项': 'Answer choices',
    '输入答案': 'Enter answer',
    '填写答案': 'Enter answer',
    '题干文字暂缺。': 'Question text is missing.',
    '查看图形答案 · Show graph answer': 'Show graph answer',
    '已保存到此设备': 'Saved on this device',
    '作答自动保存': 'Answers save automatically',
    '存档异常 · 自动备份已接管': 'Save error · backup took over',
    '刷新重试': 'Refresh and retry',
    '计算器': 'Calculator',
    '隐藏': 'Hide',
    '公式参考': 'Reference',
    '草稿': 'Scratch',
    '临时': 'Temp',

    /* 字号 / 主题 / 设置 */
    '账户': 'Account',
    '外观': 'Appearance',
    '练习': 'Practice',
    '关于': 'About',
    '语言': 'Language',
    '中文': 'Chinese',
    'English': 'English',
    '主题': 'Theme',
    '浅色': 'Light',
    '暗黑': 'Dark',
    '淡奶白或暗黑，立即生效并保存。': 'Light or dark. Applies instantly and is saved.',
    '字号': 'Text size',
    '小': 'Small',
    '标准': 'Standard',
    '大': 'Large',
    '调整全站文字大小，立即生效并保存。': 'Adjust text size across the site. Applies instantly and is saved.',
    '紧凑模式': 'Compact mode',
    '收紧页面留白，一屏显示更多题目。': 'Tighten spacing to fit more questions on screen.',
    '外观偏好保存在这台设备，刷新后依然有效。': 'Display preferences are saved on this device and survive a refresh.',
    '单元练习计算器': 'Calculator in Unit Practice',
    '只有单元练习受这个开关控制：专项训练、单元抽查与模考始终显示计算器。设置保存在这台设备。': 'Only Unit Practice follows this switch: Targeted Practice, Unit Quiz and Mock Test always show the calculator. Saved on this device.',
    '练习偏好自动保存在这台设备': 'Practice preferences are saved on this device',
    '外观偏好自动保存在这台设备': 'Display preferences are saved on this device',
    '语言偏好自动保存在这台设备': 'Language is saved on this device',
    '切换后立即生效，做题内容本身不受影响。': 'Applies immediately; your questions and progress are unaffected.',

    /* 账户 */
    '昵称': 'Nickname',
    '给自己起个名字': 'Pick a name',
    '保存': 'Save',
    '昵称只用于显示，不参与登录。': 'The nickname is only for display and is not used to sign in.',
    '退出登录': 'Sign out',
    '你的专属学习档案': 'Your study profile',
    '邮箱': 'Email',
    '邮箱链接登录': 'Sign in with email link',
    '发送登录邮件': 'Send sign-in link',
    '重新发送': 'Resend',
    '昵称已保存': 'Nickname saved',
    '已退出登录 · 进度仍保留在这台设备': 'Signed out · progress stays on this device',
    '未登录 · 进度保存在这台设备': 'Not signed in · progress saved on this device',
    '登录暂时不可用': 'Sign-in is temporarily unavailable',
    '正在打开你的学习档案…': 'Opening your study profile…',
    '进度已自动保存': 'Progress saved automatically',
    '暂时无法保存进度，联网后会自动重试': 'Cannot save right now; will retry when online',
    '做题进度会自动保存，换设备或重新登录后接着练，不需要任何手动操作。': 'Progress saves automatically, so you can continue on another device or after signing in again.',

    /* 模考 */
    'SAT 数学全真模考': 'SAT Math Full Mock Test',
    '成绩报告': 'Score report',
    '查看成绩报告': 'View score report',
    '查看错题': 'View wrong answers',
    '再测一次': 'Retake',
    '薄弱点报告': 'Weak-spot report',
    '逐题结果': 'Per-question results',
    '优先补强': 'Focus areas',
    '全部题目': 'All questions',
    '只看错题': 'Wrong only',
    '考试说明': 'Instructions',
    '检查答题': 'Review answers',
    '题目导航': 'Question navigator',
    '题号': 'No.',
    '题目 / 出处': 'Question / Source',
    '状态': 'Status',
    '你的答案': 'Your answer',
    '跳转': 'Go',
    '剩余时间': 'Time left',
    '计时开始，不可暂停或重置': 'Timer started; it cannot be paused or reset',
    '计时继续，不可暂停或重置': 'Timer continues; it cannot be paused or reset',
    '交卷并锁定答案': 'Submit and lock answers',
    '确认交卷？': 'Submit the test?',
    '确认交卷并锁定答案': 'Submit and lock answers',
    '进入 Module 2': 'Go to Module 2',
    '当前范围': 'Current range',
    '知识点': 'Skill',
    '填空': 'Grid-in',
    '选择': 'Multiple choice',
    '正确答案': 'Correct answer',
    '总用时': 'Total time',
    '平均每题': 'Average per question',
    '最长单题': 'Longest question',
    '错题数': 'Wrong answers',
    '正确率': 'Accuracy',
    '限时 / 实耗': 'Limit / actual',
    '本次练习正确率': 'Overall accuracy',
    '原始分（每题 1 分）': 'Raw score (1 point each)',
    '预估 SAT 数学分数 · 200–800': 'Estimated SAT Math score · 200–800',
    '答对 / 总题': 'Correct / total',
    '无错题': 'No wrong answers',

    /* 错题页 */
    '真实题干': 'Original question',
    '导入错题': 'Import wrong answers',
    '导入': 'Import',
    '综合': 'Mixed',
    '历史错题': 'Past wrong answers',
    '复习': 'Review',
    '未作答 / 时间分配': 'Unanswered / time management',
    '作答格式或数值转换': 'Answer format or conversion',
    '符号判断错误': 'Sign error',
    '倒数或比例关系混淆': 'Reciprocal or ratio mix-up',
    '倍数关系错误': 'Factor error',
    '计算精度不足': 'Rounding too early',
    '计算或公式应用错误': 'Calculation or formula error',
    '符号或方向判断错误': 'Sign or direction error',
    '倒数关系混淆': 'Reciprocal mix-up',
    '选项判断错误 · ': 'Choice error · ',
    '还没有错题记录': 'No wrong answers yet',
    '该单元暂无错题记录': 'No wrong answers in this unit yet',
    '题库暂无错题，仅显示导入错题': 'No wrong answers in the bank; imported ones only',

    /* 讲义 / 记录 */
    '教材原题': 'Textbook question',
    '讲义数据还在加载，稍等一下': 'Lecture data is still loading…',
    '未命名小节': 'Untitled section',
    '本节题目尚未录入，先在题库里补题': 'No questions in this section yet',
    '官方模考 · 未交卷': 'Official mock · not submitted',
    '未做完': 'Unfinished',
    '记录': 'History',

    /* 补：页面骨架里剩下的短标签 */
    '未作答 · 时间分配': 'Unanswered · time management',
    '交卷时间': 'Submitted',
    '答对': 'Correct',
    '用时': 'Time',
    '应该补哪块': 'What to work on',
    '全部错题': 'All wrong answers',
    '复盘': 'Review',
    '回到本题重练': 'Redo this question',
    '图片识别导入': 'Import from image',
    '登录云端账号': 'Sign in',
    '本单元': 'This unit',
    '开始单元抽查': 'Start unit quiz',
    '开始抽测': 'Start quiz',
    '限时': 'Time limit',
    '涵盖考点': 'Topics covered',
    '具体知识点': 'Skills',
    '组卷范围': 'Scope',
    '复习优先级排序': 'Review priority',
    '打开题目导航': 'Open question navigator',
    '选题小节': 'Choose a section',
    '选择小节': 'Choose a section',
    '交本节': 'Submit section',
    '本节结果': 'Section result',
    '回到小节列表': 'Back to sections',
    '四个子板块': 'Four areas',
    '返回四个子板块': 'Back to the four areas',
    '代数': 'Algebra',
    '几何': 'Geometry',
    '单元抽查 · U1': 'Unit Quiz · U1',
    '错题记录只增不改：导入仅追加记录，不修改、不删除任何已有错题与作答。': 'Wrong-answer history is append-only: imports never change or delete existing records.',
    '识别失败可重试：': 'Recognition failed, you can retry:',
    '重试失败项': 'Retry failed items',
    '拖入 / 点击选择截图，或直接粘贴（Ctrl/Cmd+V），松开即自动识别导入': 'Drop or click a screenshot, or paste (Ctrl/Cmd+V) to import automatically',
    '只切换界面文字；题目、讲义原文与你的作答记录不变。': 'Only interface text changes; questions, lecture text and your answers stay as they are.',
    '语言偏好自动保存在这台设备': 'Language is saved on this device',
    '已答': 'Answered',
    '当前': 'Current',
    '清空': 'Clear',
    '完成': 'Done',
    '粘贴或上传题目截图，AI 识别文字与公式后自动匹配题库后追加到错题回顾（只增不改）。':
      'Paste or upload a screenshot; AI reads the text and formulas, matches the bank, then appends to Wrong Answers (append-only).',
    '识别调用云端 AI，消耗应用积分；需从线上域名访问。':
      'Recognition uses cloud AI and costs credits; it requires the online domain.',
    '云端账号：未登录 · 图片识别需先登录': 'Cloud account: signed out · sign in to use image import',
    '需要先登录云端账号才能使用图片识别': 'Sign in to use image import',
    '回顾等式变形、斜率截距与函数代入。': 'Review equation manipulation, slope/intercept, and substitution.',
  };

  /* 带数字的句子：模板字符串拼出来的是一个整体文本节点，靠模式匹配 */
  var PATS = [
    [/^← 返回(.+)$/, '← Back to $1'],
    [/^返回(.+)$/, 'Back to $1'],
    [/(.+) · 第 (\d+) 题$/, '$1 · Question $2'],
    [/^Resume · (.+) 第 (\d+) 题$/, 'Resume · $1 Question $2'],
    [/^错题（(\d+)）$/, 'Wrong answers ($1)'],
    [/^第 (\d+) 单元$/, 'Unit $1'],
    [/^第 (\d+) 题$/, 'Question $1'],
    [/^第 (\d+) 题，/, 'Question $1, '],
    [/^ · 第 (\d+) 题$/, ' · Question $1'],
    [/^第 (\d+) 空$/, 'Blank $1'],
    [/^显示 (\d+) 道 · 含历史错题与已订正记录$/, 'Showing $1 · includes past and corrected items'],
    [/^(\d+) 道错题$/, '$1 wrong answers'],
    [/^(\d+) 道错题已加入错题回顾。$/, '$1 wrong answers added to Wrong Answers.'],
    [/^答对 (\d+) 题$/, '$1 correct'],
    [/^还有 (\d+) 题未作答，交卷后按错误计入成绩。$/, '$1 unanswered; they count as wrong after you submit.'],
    [/^剩余 (\d+) 分钟。$/, '$1 minutes left.'],
    [/^(\d+) 题$/, '$1 questions'],
    [/^(\d+) 道$/, '$1 questions'],
    [/^(\d+) 次记录$/, '$1 attempt'],
    [/^(\d+) 分$/, '$1 min'],
    [/^(\d+) 秒$/, '$1 s'],
    [/^(\d+) 题答对$/, '$1 correct'],
    [/^(\d+) 题，$/, '$1 questions, '],
    [/^已导入 (\d+) 道：新增错题 (\d+) 道 · 已有作答仅只读展示 (\d+) 道（未改动）· 未匹配 (\d+) 道$/,
      'Imported $1: $2 new, $3 read-only (existing answers), $4 unmatched'],
  ];

  function getLang() {
    try {
      var v = localStorage.getItem(KEY);
      if (v === 'en' || v === 'zh') return v;
    } catch (e) {}
    return 'zh';
  }

  function t(s) {
    if (s == null) return s;
    if (Object.prototype.hasOwnProperty.call(EN, s)) return EN[s];
    /* 含中文才做词块替换，纯英文/数字串原样返回，避免误伤题干 */
    if (/[\u4e00-\u9fff]/.test(s)) s = phraseReplace(s);
    if (!/[\u4e00-\u9fff]/.test(s)) return s;
    for (var i = 0; i < PATS.length; i++) {
      if (PATS[i][0].test(s)) return s.replace(PATS[i][0], PATS[i][1]);
    }
    return s;
  }

  var SKIP = /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|CODE|PRE)$/;

  function translateTextNode(node) {
    var raw = node.nodeValue;
    if (!raw || raw.indexOf('\u0000') >= 0) return;
    // 只处理含中文的节点
    if (!/[\u4e00-\u9fff]/.test(raw)) return;
    var trimmed = raw.trim();
    if (!trimmed) return;
    var out = t(trimmed);
    if (out === trimmed) return;
    node.nodeValue = raw.replace(trimmed, out);
  }

  function translateAttrs(elm) {
    ['placeholder', 'title', 'aria-label', 'alt'].forEach(function (name) {
      var v = elm.getAttribute && elm.getAttribute(name);
      if (!v || !/[\u4e00-\u9fff]/.test(v)) return;
      var out = t(v.trim());
      if (out !== v.trim()) elm.setAttribute(name, out);
    });
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { translateTextNode(root); return; }
    if (root.nodeType !== 1) return;
    if (SKIP.test(root.tagName)) return;
    if (root.hasAttribute && root.hasAttribute('data-i18n-skip')) return;
    translateAttrs(root);
    var stack = [root];
    while (stack.length) {
      var el = stack.pop();
      if (el.nodeType === 3) { translateTextNode(el); continue; }
      if (el.nodeType !== 1 || SKIP.test(el.tagName)) continue;
      if (el !== root && el.hasAttribute && el.hasAttribute('data-i18n-skip')) continue;
      var kids = el.childNodes;
      for (var i = 0; i < kids.length; i++) {
        var k = kids[i];
        if (k.nodeType === 3) translateTextNode(k);
        else if (k.nodeType === 1) { translateAttrs(k); stack.push(k); }
      }
    }
  }

  function applyAll() { if (typeof document !== 'undefined') walk(document.body); }

  function setLang(lang) {
    lang = (lang === 'en') ? 'en' : 'zh';
    try { localStorage.setItem(KEY, lang); } catch (e) { console.warn('保存语言失败', e); }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', lang === 'en' ? 'en' : 'zh-CN');
      document.documentElement.setAttribute('data-lang', lang);
      if (lang === 'en') applyAll();
    }
    if (global.TDSync) { try { global.TDSync.notify(KEY); } catch (e) {} }
    try { global.dispatchEvent(new CustomEvent('td-lang-change', { detail: { lang: lang } })); } catch (e) {}
    return lang;
  }


  /* 词块表：小节名 / 单元名 / 状态词出现在整句里时也能翻（长词优先替换，
     这样「Topic 20 · 模型与散点图」和「继续上次练习 · … 第 3 题」都能整体变英文）。 */
  var PHRASES = {
    /* 单元名 */
    '代数核心': 'Heart of Algebra',
    '问题解决与数据分析': 'Problem Solving & Data Analysis',
    '高等数学': 'Advanced Math',
    '几何与三角': 'Geometry & Trigonometry',
    /* 教材小节 */
    '线性方程与函数图像': 'Linear Equations and Graphs',
    '一元线性方程求解': 'Solving Linear Equations',
    '线性函数与方程解读': 'Interpreting Linear Functions and Equations',
    '线性方程与不等式应用题': 'Linear Equations and Inequalities Word Problems',
    '线性不等式与图像': 'Linear Inequalities and Graphs',
    '绝对值与方程': 'Absolute Value and Equations',
    '比率、百分比与单位换算': 'Ratios, Percentages, and Unit Conversion',
    '比率、比例与单位换算': 'Ratios, Proportions, and Unit Conversion',
    '散点图与统计图表': 'Scatterplots and Statistical Graphs',
    '线性与指数关系': 'Linear and Exponential Relationships',
    '概率与条件概率': 'Probability and Conditional Probability',
    '数据分析：集中与离散': 'Data Analysis: Center and Spread',
    '分布与集中、离散度量': 'Distributions and Measures of Center and Spread',
    '样本推断与误差范围': 'Inference from Sample Statistics and Margin of Error',
    '统计论断评估': 'Evaluating Statistical Claims',
    '模型与散点图': 'Models and Scatterplots',
    '百分数': 'Percentages',
    '指数、根式与多项式运算': 'Exponents, Radicals, and Polynomials',
    '二次、根式与分式方程': 'Quadratic, Radical, and Rational Equations',
    '二次与多项式函数图像': 'Graphs of Quadratic and Polynomial Functions',
    '函数记号与变换': 'Function Notation and Transformations',
    '非线性函数建模与解读': 'Modeling and Interpreting Nonlinear Functions',
    '非线性建模与解读': 'Modeling and Interpreting Nonlinear Relationships',
    '二次函数与建模': 'Quadratic Functions and Modeling',
    '多项式与因式': 'Polynomials and Factors',
    '有理式与根式': 'Rational and Radical Expressions',
    '指数与根式运算': 'Exponents and Radicals',
    '方程与不等式应用': 'Applications of Equations and Inequalities',
    '函数记号与图像': 'Function Notation and Graphs',
    '二次方程与判别式': 'Quadratic Equations and the Discriminant',
    '线性方程组解的个数': 'Number of Solutions of Linear Systems',
    '两点坐标与直线（Desmos）': 'Points, Lines, and Desmos',
    '线性关系典型题': 'Typical Linear Relationship Problems',
    '线性不等式': 'Linear Inequalities',
    '直线与角': 'Lines and Angles',
    '三角形全等与相似': 'Triangle Congruence and Similarity',
    '面积与体积': 'Area and Volume',
    '三角函数与单位圆': 'Trigonometry and the Unit Circle',
    '圆（练习册）': 'Circles (Workbook)',
    '几何综合': 'Geometry Review',
    '直角三角形与三角函数': 'Right Triangles and Trigonometry',
    '函数图像': 'Graphs of Functions',
    '绝对值': 'Absolute Value',
    '函数表达式变换': 'Transforming Function Expressions',
    /* 状态与常用短语 */
    '未开始': 'Not started',
    '进行中': 'In progress',
    '已完成': 'Completed',
    '继续上次练习 · ': 'Resume · ',
    '教材原题（练习册 P200–207）': 'Textbook questions (Workbook P200–207)',
    '讲义（TESTDAILY）': 'Lecture (TESTDAILY)',
    '专项训练': 'Targeted Practice',
    '专项练习': 'Targeted Practice',
    '薄弱点：': 'Weak spot: ',
    '讲义题目正在补充，稍后再来。': 'Lecture questions are still being added, check back later.',
    '真题练习': 'Practice',
  };
  var PKEYS = Object.keys(PHRASES).map(function (k) { return [k, PHRASES[k]]; })
    .sort(function (a, b) { return b[0].length - a[0].length; });

  function phraseReplace(s) {
    for (var i = 0; i < PKEYS.length; i++) {
      if (s.indexOf(PKEYS[i][0]) >= 0) s = s.split(PKEYS[i][0]).join(PKEYS[i][1]);
    }
    return s;
  }

  var api = { t: t, get: getLang, set: setLang, apply: applyAll, order: EN };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.TDI18n = api;

  if (typeof document !== 'undefined') {
    var lang0 = getLang();
    document.documentElement.setAttribute('lang', lang0 === 'en' ? 'en' : 'zh-CN');
    document.documentElement.setAttribute('data-lang', lang0);
    if (lang0 === 'en') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { applyAll(); watch(); });
      } else { applyAll(); watch(); }
    }
    function watch() {
      if (!global.MutationObserver || !document.body) return;
      var obs = new global.MutationObserver(function (muts) {
        if (getLang() !== 'en') return;
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i];
          if (m.type === 'characterData') translateTextNode(m.target);
          else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
        }
      });
      obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
