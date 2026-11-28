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
    '单元': 'Unit',
    '板块': 'Sections',
    '专项板块': 'Targeted sections',
    '选择板块': 'Choose a section',
    '专项练习': 'Targeted Practice',
    '专项复习': 'Targeted Review',
    '单元抽查': 'Unit Quiz',
    '错题回顾': 'Wrong Answers',
    '错题记录只增不改：导入仅追加记录，不修改、不删除任何已有错题与作答。': 'Wrong answers only grow: imports only append records; nothing you already answered is modified or deleted.',
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
    '返回板块列表': 'Back to sections',
    '继续练习本板块': 'Continue this section',
    '答错': 'Incorrect',
    '总题数': 'Total',
    '查看错题回顾': 'View Wrong Answers',
    '板块结果': 'Section result',
    '查看本题': 'View question',
    '前往': 'Go',
    '敲几个词或数字，比如 4x 或 slope': 'Search keywords, e.g. 4x',
    '两种用法：': 'Two ways: ',
    '贴图': 'paste an image',
    '让引擎自动认字配题；': ' to let the engine read it and match a question; ',
    '懒等': 'in a hurry? ',
    '就在下面搜框里敲题干里的几个词或数字，直接点题导入。导入只增不改，不会动你已有的作答记录。': ' type a few words or numbers from the question into the search box below and pick one to import. Import only adds records; your existing answers stay untouched.',
    '贴图走本地引擎，首次要下载约 7MB 组件（十几秒），之后有缓存；登录云端账号可换成更准的模型。': 'Images are read by a local engine (about 7 MB the first time, then cached). Sign in to use the more accurate cloud model.',
    '云端账号：检测中…': 'Cloud account: checking…',
    '云端账号：未登录 · 本地识别可用，登录后精度更高': 'Cloud account: signed out',
    '云端账号：未登录（用离线识别）': 'Cloud account: signed out (offline OCR)',
    '云端账号：已登录（云端精确识别）': 'Cloud account: signed in',
    '正在初始化识别内核…': 'Preparing the OCR engine…',
    '粘贴或拖入题目截图后，系统会自动识别文字与公式、自动匹配题库并写入错题回顾，无需任何额外操作。': 'Paste or drop a screenshot; the system reads the text, matches a question, and adds it to Wrong Answers automatically.',
    '点题号可直接跳回修改；也可以在下表里直接改答案。交卷后答案锁定。': 'Select a question number to jump back to it, or edit answers directly in the table below. Answers are locked after you submit.',
    '完成本板块并查看结果': 'Finish section and view results',
    '交卷': 'Submit',
    '检查': 'Check',
    '已锁定': 'Locked',
    '未作答': 'Unanswered',
    '已作答': 'Answered',
    '未答': 'Unanswered',
    '正确': 'Correct',
    '· 正确': '· Correct',
    '原始分': 'Raw score',
    '自适应路径': 'Adaptive path',
    '暂无补强建议。': 'No focused review suggestions yet.',
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
    '进度自动保存，换设备登录后接着练。': 'Progress saves automatically — pick it up on another device.',

    /* 模考 */
    'SAT 数学全真模考': 'SAT Math Full Mock Test',
    '成绩报告': 'Score report',
    '查看成绩报告': 'View score report',
    '查看错题': 'View wrong answers',
    '再测一次': 'Retake',
    '薄弱点报告': 'Weak-spot report',
    '逐题结果': 'Per-question results',
    'SAT Math Prep · 抽查与模考': 'SAT Math Prep · Quizzes and mock tests',
    '本次错题类型分布（按你的作答自动归因）': 'Mistake types from your answers',
    '薄弱点': 'Weak spots',
    '当前范围没有待订正错题。': 'No wrong answers to fix in this range.',
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
    '作答格式或数值转换': 'Answer format or conversion',
    '倒数或比例关系混淆': 'Reciprocal or ratio mix-up',
    '倍数关系错误': 'Factor error',
    '计算精度不足': 'Rounding too early',
    '符号或方向判断错误': 'Sign or direction error',
    '倒数关系混淆': 'Reciprocal mix-up',
    '选项判断错误 · ': 'Choice error · ',
    '还没有错题记录': 'No wrong answers yet',
    '题库暂无错题，仅显示导入错题': 'No wrong answers in the bank — showing imported ones only',
    '题库里还没有错题': 'No wrong answers from the bank yet',
    '下面是你导入的错题；做真题或抽查答错的题也会记到这里。': 'Below are the questions you imported. Misses from practice or quizzes land here too.',
    '道题': 'questions',
    '完成真题练习、单元抽查或模考后，错题会自动汇总到这里。': 'Wrong answers from Practice, Unit Quiz, and Mock Test collect here automatically.',
    '开始真题练习': 'Start Practice',
    '还没有模考或抽查记录': 'No mock test or quiz records yet',
    '做完一次模考或抽查，交卷后成绩、错题和补强报告都会出现在这里。': 'Finish a mock test or unit quiz and your score, wrong answers, and review report show up here.',
    '去做一次模考': 'Take a mock test',

    /* 题库知识点名（单元抽查开始页、成绩页 Topics to Review 直接展示） */
    'x 截距': 'x-intercept',
    'x 截距（填空）': 'x-intercept (fill-in)',
    '「c>n 时无实解」求临界值': 'Critical value when there is no real solution for c > n',
    '三角形内角与图形求角（填空）': 'Triangle angles and angles from a figure (fill-in)',
    '二次函数建模求指定时刻高度': 'Model the height at a given time with a quadratic',
    '二次函数最小值对应的 x': 'x at the minimum of a quadratic',
    '二维表概率': 'Probability from a two-way table',
    '函数值 T(5)=21 的语义': 'Meaning of T(5) = 21',
    '分式方程中变量隔离': 'Isolate a variable in a rational equation',
    '分式方程化为一元二次': 'Reduce a rational equation to a quadratic',
    '分式方程的所有解（增根）': 'All solutions of a rational equation (extraneous roots)',
    '判别式恰有一个实根': 'Discriminant with exactly one real root',
    '含参二次函数过定点求参数': 'Parameter of a quadratic through a fixed point',
    '多项式乘积中一次项系数': 'Linear coefficient in a polynomial product',
    '实际值与预测值之差': 'Difference between actual and predicted values',
    '展开后与分数系数比较求 a+b+c': 'Expand and compare fractional coefficients to find a + b + c',
    '平行线与垂直：由图形求角': 'Parallel and perpendicular lines: angles from a figure',
    '平行线与截线：角度计算': 'Parallel lines and a transversal: angle calculation',
    '平行线被截线所截求角（填空）': 'Angles from parallel lines cut by a transversal (fill-in)',
    '抛体运动顶点式建模': 'Vertex-form model for projectile motion',
    '抛物线与直线恰有一个交点': 'Parabola and line with exactly one intersection',
    '抽样偏差与结论范围': 'Sampling bias and scope of conclusions',
    '指数函数 x 截距与 y 截距定 b': 'Use x- and y-intercepts of an exponential to find b',
    '指数模型时间单位换算': 'Time-unit conversion in an exponential model',
    '散点图选拟合直线': 'Choose the line of best fit for a scatterplot',
    '数据表读取': 'Read data from a table',
    '整体代换解线性方程': 'Solve linear equations by group substitution',
    '方程组整体代换求值': 'Evaluate a system by group substitution',
    '方程组求 2x': 'Find 2x from a system',
    '无实解时参数的最大整数值': 'Largest integer parameter with no real solution',
    '无实解时参数的最小整数值': 'Smallest integer parameter with no real solution',
    '样本量与误差的关系': 'Sample size and margin of error',
    '根式方程与平方运算': 'Radical equations and squaring',
    '根式方程求解与验根': 'Solve a radical equation and check for extraneous roots',
    '求根公式与 m+q': 'Quadratic formula with m + q',
    '求根形式反推判别式 k': 'Work back from root form to discriminant k',
    '特殊直角三角形边长': 'Side lengths of special right triangles',
    '由参数判断直线图像': 'Identify a line graph from its parameters',
    '由图像反推不等式': 'Infer an inequality from its graph',
    '由增长规律写指数方程': 'Write an exponential equation from a growth pattern',
    '由文字条件列二次方程': 'Set up a quadratic from a word problem',
    '由文字题列方程组': 'Set up a system of equations from a word problem',
    '由斜率与点求解析式': 'Find the equation from slope and a point',
    '由表格识别指数函数': 'Recognize an exponential function from a table',
    '直线与抛物线有两个交点': 'Line and parabola with two intersections',
    '直线方程与夹角参数（填空）': 'Line equation and angle parameters (fill-in)',
    '相交直线与对顶角求角': 'Angles of intersecting lines and vertical angles',
    '相似三角形对应角判断': 'Corresponding angles of similar triangles',
    '等腰三角形相似与角度': 'Isosceles triangles: similarity and angles',
    '简单概率': 'Simple probability',
    '线性 / 指数增长判别': 'Distinguish linear and exponential growth',
    '线性模型代值': 'Evaluate a linear model',
    '线性模型斜率的实际含义': 'Meaning of a linear model slope in context',
    '绝对值方程双解': 'Two solutions of an absolute-value equation',
    '绝对值方程可能值': 'Possible values in an absolute-value equation',
    '行程文字题建模': 'Model a distance word problem',
    '表格求百分比（填空）': 'Percent from a table (fill-in)',
    '误差范围的结论表述': 'State a conclusion within a margin of error',
    '连续百分比增长': 'Repeated percent growth',
    '长宽比与比例': 'Aspect ratio and proportions',
    '阴影区域 ↔ 不等式': 'Shaded region and its inequality',
    '顶点坐标的实际意义辨析': 'Interpret the real-world meaning of the vertex',
    '顶点式 + 纵向伸缩后截距差': 'Vertex form with vertical scaling: intercept difference',
    '顶点式求系数再求 f(-2)-f(0)': 'Coefficients from vertex form, then f(-2) - f(0)',
    '频数表求中位数（填空）': 'Median from a frequency table (fill-in)',
    '该单元暂无错题记录': 'No wrong answers in this unit yet',

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
    '识别失败可重试：': 'Recognition failed, you can retry:',
    '拖入截图，或粘贴（Ctrl/Cmd+V）': 'Drop a screenshot, or paste (Ctrl/Cmd+V)',
    '图认不出？把题干文字贴进来。': 'Can\'t read it? Paste the question text.',
    '把截图拖进来，认得出就自动进错题本。': 'Drop a screenshot in — if it reads, it lands in your wrong answers.',
    '重试失败项': 'Retry failed items',
    '拖入 / 点击选择截图，或直接粘贴（Ctrl/Cmd+V），松开即自动识别导入': 'Drop or click a screenshot, or paste (Ctrl/Cmd+V) to import automatically',
    '只切换界面文字；题目、讲义原文与你的作答记录不变。': 'Only interface text changes; questions, lecture text and your answers stay as they are.',
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
    '钢笔': 'Pen',
    '荧光笔': 'Highlighter',
    '橡皮（整笔擦除）': 'Eraser (whole stroke)',
    '颜色 1': 'Color 1',
    '颜色 2': 'Color 2',
    '颜色 3': 'Color 3',
    '细': 'Thin',
    '中': 'Medium',
    '粗': 'Thick',
    '撤销': 'Undo',
    '重做': 'Redo',
    '清空本题': 'Clear this question',
    '移动：让开画布，可点选项与翻页': 'Move: pan the canvas aside to tap choices and turn pages',
    '草稿板：在题目上涂画标记、写草稿，答案可直接填写': 'Scratch pad: draw on the question and take notes; answers can be typed directly',
    '题目工具': 'Question tools',
    '全站导航': 'Site navigation',

    /* 设置面板 · 账户（登录 / 注册 / 重置 / 已登录） */
    '保存密码': 'Save password',
    '已经通过重置链接登录，在下面设一个新密码就完成重置。': 'You are signed in through the reset link. Set a new password below to finish resetting.',
    '登录密码': 'Password',
    '至少 8 位，设好后可换设备登录': 'At least 8 characters; lets you sign in on other devices',
    '设好密码后，换设备可以直接用邮箱或手机号 + 密码登录，不必等邮件。':
      'Once a password is set you can sign in on another device with email or phone + password, no email needed.',
    '账号模块未能加载，做题与进度照常保存，不受影响。':
      'The account module did not load. Practice and progress still save as usual.',
    '重置密码': 'Reset password',
    '注册时用的邮箱': 'The email you signed up with',
    '发送重置链接': 'Send reset link',
    '返回登录': 'Back to sign in',
    '重置链接只发到邮箱。': 'The reset link is sent by email only.',
    '改用邮箱 / 手机号 + 密码登录': 'Use email / phone + password',
    '邮件里的按钮只能用一次，几分钟内有效；收不到就去垃圾箱翻一下。':
      'The button in the email works once and expires in a few minutes; check spam if it does not arrive.',
    '邮箱验证码': 'Email code',
    '验证码': 'Code',
    '邮件里的 6 位数字': '6-digit code from the email',
    '验证码就在邮件正文里，有效期 1 小时；收不到先去垃圾箱翻一下。':
      'The code is in the email body and is valid for 1 hour; check spam first.',
    '邮箱或手机号': 'Email or phone',
    '邮箱 / 手机号 + 密码': 'Email / phone + password',
    '密码': 'Password',
    '至少 8 位': 'At least 8 characters',
    '忘记密码？': 'Forgot password?',
    '登录': 'Sign in',
    '注册新账号': 'Create an account',
    '设置密码': 'Choose a password',
    '确认密码': 'Confirm password',
    '再输一次': 'Type it again',
    '确认新密码': 'Confirm new password',
    '注册并登录': 'Create account and sign in',
    '手机号账号没有短信验证，建议用邮箱注册。': 'Phone accounts have no SMS verification — email is recommended.',
    '注册完直接登录。': 'You are signed in right after signing up.',
    '重置链接只发到邮箱。手机号账号没有短信重置；如果还处于登录状态，请在设置里改密码。':
      'Reset links go to email only. Phone accounts can change the password after signing in.',

    '改用邮箱链接登录': 'Use email link instead',
    '改用邮箱验证码登录': 'Use email code instead',
    '登录成功，正在读取你的学习档案…': 'Signed in, loading your profile…',
    '手机号或密码不对。': 'Wrong phone number or password.',
    '邮箱或密码不对。': 'Wrong email or password.',
    '这个账号是手机号，收不到重置邮件。': 'This account is a phone number, so it cannot receive reset email.',
    '手机号请用密码登录，登录邮件只发到邮箱。': 'Phone accounts sign in with a password; sign-in email only goes to email addresses.',
    '邮箱格式不正确，请检查后再试。': 'That email does not look right, please check it.',
    '这个邮箱已经注册过了，直接点「登录」。': 'This email is already registered — tap “Sign in”.',
    '操作太频繁了，等一分钟再试。': 'Too many attempts. Wait a minute and try again.',
    '网络异常，请检查连接后重试。': 'Network problem. Check your connection and try again.',
    '登录服务返回异常，请刷新页面后重试。': 'The sign-in service returned an error. Refresh and try again.',
    '登录链接已失效或邮件有误，请重新发送登录邮件。': 'That sign-in link has expired or the email is wrong. Send a new one.',
    '密码至少 8 位。': 'A password needs at least 8 characters.',
    '密码最多 72 位，请删短一点再试。': 'A password can be at most 72 characters. Please shorten it and try again.',
    '请先填写邮箱或手机号。': 'Enter your email or phone number first.',
    '请先填写邮箱。': 'Enter your email first.',
    '请输入密码。': 'Enter your password first.',
    '登录模块未加载，请刷新页面重试。': 'The sign-in module is not loaded. Refresh and try again.',
    '密码太短或强度不够，换一个更长一点的密码再试。':
      'That password is too short or too weak. Try a longer one.',
    '新密码不能和旧密码一样，换一个再保存。': 'The new password must be different from your current one.',
    '当前暂未开放新账号注册，请稍后再试。': 'New sign-ups are temporarily closed. Please try again later.',
    '手机号注册需要短信验证，当前暂未开通；请改用邮箱注册。已有手机号账号可以直接登录。':
      'Phone sign-up needs SMS verification, which is not available yet. Please use email instead. Existing phone accounts can still sign in.',
    '手机号注册没有直接登录成功；这个号码没有可收确认邮件的邮箱，请稍后重试，或改用邮箱注册。':
      'Phone sign-up did not finish. This number has no email inbox for a confirmation message; try again later or sign up with email.',
    '手机号注册需要短信验证，当前暂未开通；请用邮箱注册。已有手机号账号可以直接登录。':
      'Phone sign-up needs SMS verification, which is not available yet. Please use email instead. Existing phone accounts can still sign in.',
    '注册成功，但邮箱还没确认：先去邮件里点确认链接（垃圾箱也翻一下），再回来登录。':
      'Your account was created, but the email is not confirmed yet. Open the confirmation link in your inbox (check spam), then sign in.',
    '邮箱还没有验证：先去邮件里点确认链接（垃圾箱也翻一下），再回来登录。':
      'This email is not verified yet. Open the confirmation link in your inbox (check spam), then sign in.',
    '登录服务暂时连不上，请检查网络后重试。':
      'Cannot reach the sign-in service right now. Check your connection and try again.',
    '操作失败，请稍后重试。': 'That did not work. Please try again later.',
    '两次输入的密码不一致，请重新确认。': 'The two passwords do not match. Please confirm them again.',
    '两次输入的新密码不一致，请重新确认。': 'The two new passwords do not match. Please confirm them again.',
    '昵称不能为空。': 'Nickname cannot be empty.',
    '请先填写注册时用的邮箱。': 'Enter the email you signed up with first.',
    '请先登录。': 'Please sign in first.',
    '请先登录': 'Please sign in first.',
    '请输入邮件里的 6 位数字验证码。': 'Enter the 6-digit code from the email.',
    '验证码通道尚未启用，请用密码或邮件链接登录。':
      'The email-code option is not enabled yet. Use password or email-link sign-in.',
    '手机号请用密码登录，验证码只发到邮箱。':
      'Phone accounts sign in with a password; codes are sent to email only.',
    '注册成功，但还需要去邮箱点确认链接；确认后再回来登录。':
      'Your account was created. Open the confirmation link in your inbox, then come back and sign in.',
    '注册没有返回登录态，请刷新页面后重试。': 'Sign-up did not return a session. Refresh the page and try again.',
    '登录失败，请重试。': 'Sign-in failed. Please try again.',
    '登录状态已失效，请重新登录。': 'Your session has expired. Please sign in again.',
    '续期没有拿到新会话': 'Could not refresh the session.',
    '请输入邮件里收到的 6 位数字验证码。': 'Enter the 6-digit code sent to your email.',
    '这个地址是系统内部账号，不能直接注册或登录；手机号请直接填号码，邮箱请用普通邮箱。':
      'This address is reserved for internal accounts and cannot be used to sign up or sign in. Enter your phone number directly, or use a normal email address.',
    '邮箱或手机号格式不正确，请检查后再试。': 'That email or phone number does not look right. Please check it.',
    '邮箱格式不正确，请检查后再发送登录邮件。': 'That email does not look right. Check it before sending the sign-in email.',
    '邮箱格式不正确，请检查后再发送重置链接。': 'That email does not look right. Check it before sending the reset link.',
    '邮箱格式不正确，请检查后再获取验证码。': 'That email does not look right. Check it before requesting a code.',
    '保存登录状态失败': 'Could not save the sign-in state.',
    '昵称不能为空': 'Nickname cannot be empty.',
    '登录已失效，需要重新登录': 'Your session has expired. Please sign in again.',
    '登录链接已失效或已被使用，请重新发送登录邮件。':
      'That sign-in link has expired or was already used. Send a new one.',
    '登录链接已被取消，请重新发送登录邮件。': 'The sign-in link was cancelled. Send a new one.',
    '登录链接没有完成，请重新发送登录邮件。': 'The sign-in link did not complete. Send a new one.',
    '续期暂时失败，保留登录状态稍后重试':
      'Could not refresh the session; you are still signed in. Try again later.',
    '网络较慢：连不上登录服务，请检查网络后重试。':
      'The connection is slow and the sign-in service cannot be reached. Check your network and try again.',
    '云端档案内容异常，已保留本机进度，未覆盖':
      'The cloud profile is malformed. Your local progress was kept and not overwritten.',
    '云端档案内容异常，已退出该账号；本机进度未受影响':
      'The cloud profile is malformed, so this account was signed out. Your local progress is unaffected.',
    '云端档案已合并到本机，但暂时无法写回云端，联网后会自动重试':
      'The cloud profile was merged into this device but could not be written back yet; it will retry when online.',
    '密码已保存，下次可以用这个账号登录。': 'Password saved. You can sign in with this account next time.',
    '当前页面已退出，但浏览器拒绝清除登录缓存；刷新后可能仍处于登录状态，请先清出空间再退出':
      'You are signed out on this page, but the browser refused to clear the sign-in cache. A refresh may sign you back in; free some storage and sign out again.',
    '暂时无法读取你的学习档案，这台设备上的进度不受影响':
      'Cannot read your study profile right now. Progress on this device is unaffected.',
    '本地暂存已合并到本机，但暂时无法写回云端，联网后会自动重试':
      'The local draft was merged into this device but could not be written back yet; it will retry when online.',
    '本地暂存档案形状异常，已保留未合并，本机进度不受影响':
      'The local draft has an unexpected shape and was kept unmerged. Local progress is unaffected.',
    '本机存储不可写，已退出该账号；本机进度未受影响':
      'This browser storage is read-only, so the account was signed out. Local progress is unaffected.',
    '本机存储不可写，无法暂存当前账号进度，已取消切换；本机进度未受影响':
      'This browser storage is read-only, so the account switch was cancelled and current progress was not saved. Local progress is unaffected.',
    '登录成功，但浏览器存储不可写；刷新后需要重新登录。':
      'Signed in, but browser storage is read-only. You will need to sign in again after a refresh.',
    '已发送到 {email}，点邮件里的登录按钮即可完成登录。链接只能用一次，请尽快点击（也可以在垃圾箱里找一下）。':
      'Sent to {email}. Open the sign-in button in the email to finish. The link works once, so use it soon (check spam too).',
    '重置链接已发到 {email}，点邮件里的按钮就回到这里设新密码（垃圾箱也翻一下）。':
      'Reset link sent to {email}. Open the button in the email to come back and set a new password (check spam too).',
    '验证码已发到 {email}，收 6 位数字填到下面；没收到先翻垃圾箱。':
      'Code sent to {email}. Enter the 6-digit code below; check spam if it does not arrive.',
    '验证码已发到 {email}；要换邮箱请重新获取。':
      'Code sent to {email}. To use another email, request a new code.',
    '重新发送 ({seconds}s)': 'Resend in {seconds}s',
    '获取验证码': 'Get code',
    '重新获取': 'Resend code',
    '重新获取 ({seconds}s)': 'Resend code in {seconds}s',
    '已为你建立专属学习档案': 'Your study profile is ready.',
    '已打开你在其他设备上的进度': 'Opened the progress from your other device.',
    '这个手机号已经注册过了，直接点「登录」。': 'This phone number is already registered — tap “Sign in”.',
    '账号已建立，正在读取你的学习档案…': 'Account created. Loading your study profile…',
    '验证码不对或已过期，请重新获取。': 'The code is wrong or has expired. Request a new one.',

    /* 设置面板 · 练习 / 关于 */
    '打开后，单元练习答题页也会显示计算器按钮；关闭则只有专项训练、单元抽查与模考可用。':
      'When on, the calculator also appears in Unit Practice; when off it is available only in Targeted Practice, Unit Quiz and Mock Test.',
    '登录后每位用户都有独立的学习档案，进度自动保存、自动跟随。':
      'Each signed-in user gets a separate study profile; progress saves and follows automatically.',
    '登录完全自愿，不登录也能使用全部功能。':
      'Signing in is optional — every feature works without an account.',

    /* 无障碍 / 悬停提示（英文页面上读屏也不该念中文） */
    '主要功能': 'Main navigation',
    '本板块成绩': 'Section score',
    '关闭题号弹层': 'Close the question map',
    '题号状态说明': 'Question status legend',
    '选择单元': 'Choose a unit',
    '错题学习总览': 'Wrong-answer overview',
    '关闭图片识别面板': 'Close image import',
    '拖入图片或点击选择，也可直接粘贴': 'Drop or click to pick a screenshot, or paste it here',
    '粘贴题干文字导入': 'Paste the question text to import',
    '按题干关键词查题': 'Find a question by keyword',
    '图认不出？把题干文字复制/打进来（英文原文最准），点右边按钮同样能配题导入。':
      'Image not readable? Paste the question text here.',
    '等不及？敲题干里的几个词或数字，比如 4x 24x 36 或 slope':
      'Search keywords, e.g. 4x',
    '不用贴图，自己造一张测试图跑一遍，确认这台机器能不能识别':
      'No screenshot needed: build a test image and check whether this device can read it',
    '只删掉本次导入写进去的记录，不动你原来的作答':
      'Removes only what this import wrote; your existing answers stay',
    '用文字导入': 'Import from text',
    '在题库里找': 'Find in the bank',
    '自检': 'Self-test',
    '撤销本次导入': 'Undo this import',
    '上传题目截图，AI 识别文字与公式并自动匹配题库':
      'Upload a question screenshot; AI reads the text and formulas and matches the bank',
    '登录云端账号后才能使用云端 AI 图片识别':
      'Sign in to the cloud account to use cloud AI image reading',
    '错题统计': 'Wrong-answer stats',
    '按单元筛选': 'Filter by unit',
    '题目信息': 'Question info',
    '本节成绩': 'Section score',
    /* 记录页「未做完档案」的继续入口：此前只有 exam.js 的官方卷态走
       'Continue test'，history 页这颗按钮是硬编码中文，英文模式下裸露。 */
    '继续这卷': 'Continue this test',
    /* 错因标题：错题页 .cause-box 首行是「错因 · topic」拼装串，
       t() 按 ' · ' 切开逐段查本表，所以这里只放不带 topic 的那半句。 */
    '未作答 / 时间分配': 'Unanswered / time management',
    '作答格式': 'Answer format',
    '符号判断错误': 'Sign error',
    '整体符号 / 移项错误': 'Overall sign / transposition error',
    '斜率符号错误': 'Slope sign error',
    '截距符号错误': 'Intercept sign error',
    '截距计算错误': 'Intercept calculation error',
    '斜率计算错误': 'Slope calculation error',
    '倒数 / 比例混淆': 'Reciprocal / ratio confusion',
    '倍数 / 单位换算错误': 'Multiple / unit conversion error',
    '倍数与单位换算': 'Multiple and unit conversion',
    '计算精度 / 算术失误': 'Precision / arithmetic error',
    '图像对应关系判断错误': 'Graph matching error',
    '图像对应关系': 'Graph matching',
    '指数 / 变量位置混淆': 'Exponent / variable position confusion',
    '增长率底数 / 周期换算错误': 'Growth base / period conversion error',
    '方程形式判断错误': 'Equation form error',
    '方程形式判断': 'Equation form',
    '计算或公式应用错误': 'Calculation or formula error',
    '数值判断错误': 'Value error',
    '概念判断错误': 'Concept error',
    '知识点概念未掌握': 'Concept not mastered',
    '条件转化失误': 'Condition handling error',
  };

  /* 带数字的句子：模板字符串拼出来的是一个整体文本节点，靠模式匹配 */
  var PATS = [
    [/^划掉选项 ([A-E])$/, 'Cross out choice $1'],
    [/^取消划掉选项 ([A-E])$/, 'Restore choice $1'],
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
    /* 题号计数是「第 N / M 题」这种拼接串，字典按整串匹配永远命中不了，
       英文模式下讲义题号、练习页脚、结果分数都留在中文（实测 "第 1 / 9 题"）。
       这里按模式翻，和 exam.js 里 OFFICIAL 分支的 "Question N of M" 保持同一口径。 */
    [/^第 (\d+) \/ (\d+) 题$/, 'Question $1 of $2'],
    [/^第 (\d+) \/ (\d+) 空$/, 'Blank $1 of $2'],
    [/^答对 (\d+) \/ (\d+) 题$/, '$1 of $2 correct'],
    [/^(\d+) \/ (\d+) 题答对$/, '$1 of $2 correct'],
    [/^答对 (\d+) \/ (\d+) 题 · 正确率 (\d+)%$/, '$1 of $2 correct · $3% accuracy'],
    /* 讲义面包屑是 "讲义复习 › U1" 一整串，' › ' 不参与 ' · ' 拆分，同上。 */
    [/^讲义复习 › U(\d+)$/, 'Lecture Review › U$1'],
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
    /* 记录页成绩卡：标题/原始分/自适应路径/正确答案都是脚本拼出来的整串，
       字典按整串永远命中不了，按模式翻。 */
    [/^官方模考 · 全卷 (\d+) 题$/, 'Official Mock · Full test, $1 questions'],
    [/^官方模考 · 未交卷$/, 'Official Mock · Not submitted'],
    [/^原始分 (.+) \/ (\d+)$/, 'Raw score $1 / $2'],
    [/^自适应路径 (.+)$/, 'Adaptive path $1'],
    [/ · 正确 (.+)$/, ' · Correct $1'],
  ];

  var FORCED_LANG = null;
  function getLang() {
    if (FORCED_LANG) return FORCED_LANG;
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
    if (/[\u4e00-\u9fff]/.test(s)) {
      s = phraseReplace(s);
      /* 「A · B · C」整串：按分隔符切开逐段查字典，标题/面包屑靠这个拼出来 */
      if (/[\u4e00-\u9fff]/.test(s)) {
        s = s.split(' · ').map(function (part) {
          var k = part.trim();
          if (Object.prototype.hasOwnProperty.call(EN, k)) return EN[k];
          var pk = phraseReplace(k);
          return /[\u4e00-\u9fff]/.test(pk) ? k : pk;
        }).join(' · ');
      }
    }
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

  var ORIG_TITLE = null;
  function applyAll() {
    if (typeof document === 'undefined') return;
    walk(document.body);
    document.body.setAttribute('data-i18n-en', '1');
    /* 浏览器标签标题也一起翻（首屏只翻一次，切回中文用原文还原） */
    if (ORIG_TITLE == null) ORIG_TITLE = document.title;
    document.title = getLang() === 'en' ? t(ORIG_TITLE) : ORIG_TITLE;
  }

  function setLang(lang) {
    lang = (lang === 'en') ? 'en' : 'zh';
    try { localStorage.setItem(KEY, lang); } catch (e) { console.warn('保存语言失败', e); }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', lang === 'en' ? 'en' : 'zh-CN');
      document.documentElement.setAttribute('data-lang', lang);
      if (lang === 'en') { applyAll(); watch(); }
      else {
        /* 英文模式是就地替换 DOM 文本，切回中文没法逐处还原：直接重载一次，
           页面回到代码里写的中文原文。作答都自动保存，重载不丢数据。 */
        if (document.body && document.body.getAttribute('data-i18n-en') === '1') {
          try { document.location.reload(); } catch (e) {}
        } else if (ORIG_TITLE != null) document.title = ORIG_TITLE;
      }
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

  /* 单页强制语言：模考页是英文 Bluebook 界面，设置面板也要跟着英文，
     但用户全站的偏好不能被这一次改动。 */
  function force(lang) {
    FORCED_LANG = (lang === 'en') ? 'en' : 'zh';
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', FORCED_LANG === 'en' ? 'en' : 'zh-CN');
      document.documentElement.setAttribute('data-lang', FORCED_LANG);
      if (FORCED_LANG === 'en') { applyAll(); watch(); }
    }
    return FORCED_LANG;
  }

  var api = { t: t, get: getLang, set: setLang, apply: applyAll, order: EN, force: force };

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
    var WATCHING = false;
    function watch() {
      if (WATCHING) return;
      if (!global.MutationObserver || !document.body) return;
      WATCHING = true;
      var obs = new global.MutationObserver(function (muts) {
        if (getLang() !== 'en') return;
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i];
          if (m.type === 'characterData') translateTextNode(m.target);
          else if (m.type === 'attributes') translateAttrs(m.target);
          else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
        }
      });
      obs.observe(document.body, {
        childList: true, subtree: true, characterData: true,
        attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label', 'alt']
      });
      /* <title> 由各页脚本随时改写（每换一节就换标题），单独盯 head：
         英文模式下标题一出现中文就翻，切回中文后由页面自己写回原文。 */
      try {
        var headObs = new global.MutationObserver(function () {
          if (getLang() !== 'en') return;
          var ti = document.title;
          if (!ti || !/[\u4e00-\u9fff]/.test(ti)) return;
          var out = t(ti);
          if (out === ti) return;   /* 翻不动就别写，写同值会再触发观察者 → 死循环 */
          ORIG_TITLE = ti;
          document.title = out;
        });
        headObs.observe(document.head || document.documentElement, { childList: true, subtree: true, characterData: true });
      } catch (e) {}
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
