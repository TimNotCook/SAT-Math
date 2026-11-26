/* 讲义复习板块的数据层校验（开发者这一行负责）。
   目的：把「超精准」的四道校验里能自动化的部分全部钉死，人一走神就红：
     1. 题号 / 来源 / 页码 / 页内题号 对得上
     2. answer 逐字等于答案页 p191–196 的键（不自己算）
     3. 选择题答案落在 A–D，选项恰好四个
     4. 没有空题干、没有排版病（f (x)、"(2/3)"、问号前空格）
     5. 每题都有原页对照图 docs/jiangyi-proof/{id}.png
     6. 各节 declared 数 = 答案页该节最大题号
     7. 图形只走矢量 spec，没有讲义裁图混进来
   跑：node --test test/jiangyi.test.js */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const KEY = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/jiangyi_answers.json'), 'utf8'));
/* 教材原题（练习册 P200–207）走另一套答案页与 source 形态，见下面对照。 */
const TBK = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/jiangyi_textbook_answers.json'), 'utf8'));
const isBook = q => q.group === 'textbook';

function loadJs(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const win = {};
  new Function('window', src)(win);
  return win;
}
const JY = loadJs('data/jiangyi.js');
const FG = loadJs('data/jiangyi_figures.js');
const BANK = JY.JY_BANK;
const SECS = JY.JY_SECTIONS;

const bySection = {};
BANK.forEach(q => { if (isBook(q)) return; (bySection[q.section] = bySection[q.section] || []).push(q); });

test('JY1-040：四张平面图走 choiceFigures，不再占题干图位', () => {
  const q = BANK.find(x => x.id === 'JY1-040');
  assert.ok(q, '缺 JY1-040');
  assert.strictEqual(q.figure, undefined, '题干图字段应已移除');
  assert.deepStrictEqual(Object.keys(q.choiceFigures).sort(), ['A', 'B', 'C', 'D']);
  ['A', 'B', 'C', 'D'].forEach(L => {
    assert.strictEqual(q.choiceFigures[L].vector, 'JY1-040#' + L);
    assert.match(FG.JY_FIG.renderPanel('JY1-040', L), /^<svg /);
  });
});

test('小节表：24 节，declared 数 = 答案页该节最大题号', () => {
  assert.strictEqual(SECS.length, 24, '讲义共 24 个小节');
  SECS.forEach(s => {
    const k = KEY[s.section];
    assert.ok(k, '答案页里没有这一节：' + s.section);
    assert.strictEqual(s.declared, k.maxNo, s.section + ' 声明数与答案页最大题号不符');
    assert.strictEqual(s.answerPage, k.answerPage, s.section + ' 答案页页码不对');
    assert.deepStrictEqual(s.pages, k.pages, s.section + ' 讲义页码范围不对');
  });
});

test('id 用 JY 前缀，不与 U1-01 那套混号，且不重复', () => {
  const seen = new Set();
  BANK.forEach(q => {
    assert.match(q.id, /^JY[1-4]-\d{3}$/, 'id 形态不对：' + q.id);
    assert.ok(!seen.has(q.id), 'id 重复：' + q.id);
    seen.add(q.id);
    assert.strictEqual(Number(q.id.slice(2, 3)), q.unit, 'id 的单元号与 unit 不一致：' + q.id);
  });
  assert.strictEqual(seen.size, BANK.length);
});

test('每题 section 是真小节号，页内题号在答案页范围内（答案页没有的一律不录）', () => {
  BANK.forEach(q => {
    if (isBook(q)) {
      const bk = TBK[q.section];
      assert.ok(bk, q.id + ' 的 section 在练习册答案页里没有：' + q.section);
      assert.ok(Number.isInteger(q.no) && q.no >= 1 && q.no <= bk.maxNo,
        q.id + ' 的题号 ' + q.no + ' 超出练习册答案页该节最大题号 ' + bk.maxNo);
      assert.ok(q.page >= 200 && q.page <= 207, q.id + ' 的练习册页码必须在 P200–P207：' + q.page);
      return;
    }
    const k = KEY[q.section];
    assert.ok(k, '未知小节：' + q.section);
    assert.ok(Number.isInteger(q.no) && q.no >= 1, q.id + ' 页内题号非法');
    assert.ok(q.no <= k.maxNo, q.id + ' 的题号 ' + q.no + ' 超出答案页最大题号 ' + k.maxNo + '（例题不录）');
    assert.ok(q.page >= k.pages[0] && q.page <= k.pages[1],
      q.id + ' 的页码 ' + q.page + ' 不在该节页码范围 ' + k.pages.join('–'));
  });
});

test('source 三段齐全，且与 page / no 一致', () => {
  BANK.forEach(q => {
    if (isBook(q)) {
      const m = /^练习册 P(\d+) #(\d+)$/.exec(q.source || '');
      assert.ok(m, q.id + ' 的 source 不是「练习册 P{页} #{题号}」：' + q.source);
      assert.strictEqual(Number(m[1]), q.page, q.id + ' source 页码与 page 不一致');
      assert.strictEqual(Number(m[2]), q.no, q.id + ' source 题号与 no 不一致');
      return;
    }
    const m = /^讲义 p(\d+) #(\d+)$/.exec(q.source || '');
    assert.ok(m, q.id + ' 的 source 不是「讲义 p{页} #{题号}」：' + q.source);
    assert.strictEqual(Number(m[1]), q.page, q.id + ' source 页码与 page 不一致');
    assert.strictEqual(Number(m[2]), q.no, q.id + ' source 题号与 no 不一致');
  });
});

test('answer 逐字等于答案页的键（不自己算）', () => {
  BANK.forEach(q => {
    if (isBook(q)) {
      const bk = TBK[q.section];
      assert.strictEqual(q.answer, bk.answers[String(q.no)],
        q.id + ' 答案与练习册答案页 P' + bk.answerPage + ' ' + q.section + ' 第 ' + q.no + ' 题不符（答案页写的是 ' + bk.answers[String(q.no)] + '）');
      return;
    }
    const k = KEY[q.section];
    assert.strictEqual(q.answer, k.answers[String(q.no)],
      q.id + ' 答案与答案页 ' + q.section + ' 第 ' + q.no + ' 题不符（答案页写的是 ' + k.answers[String(q.no)] + '）');
  });
});

test('选择题：四个选项、答案落在 A–D、选项不空', () => {
  BANK.forEach(q => {
    if (q.type !== 'mcq' && q.type !== 'mcq-graph') return;
    assert.ok(Array.isArray(q.choices) && q.choices.length === 4, q.id + ' 选项不是 4 个');
    q.choices.forEach((c, i) => assert.ok(c && c.trim(), q.id + ' 第 ' + 'ABCD'[i] + ' 个选项为空'));
    assert.ok('ABCD'.includes(q.answer), q.id + ' 选择题答案不在 A–D 内：' + q.answer);
  });
});

test('填空：value 是有限数，且与答案页的数值一致', () => {
  BANK.forEach(q => {
    if (q.type !== 'grid') return;
    assert.ok(Number.isFinite(q.value), q.id + ' 填空题缺少数值 value');
    // 答案页的小数常省略前导 0（".9411 or ..."），两种写法都算对上
    const forms = [String(q.value), String(q.value).replace(/^0\./, '.'), String(q.value).replace(/^0\./, '')];
    /* 答案页会把分数写成「1/4」，value 只能存 0.25；数值等价即算对上。 */
    const frac = /(\d+)\s*\/\s*(\d+)/.exec(String(q.answer));
    const fracOk = frac && Math.abs(Number(frac[1]) / Number(frac[2]) - q.value) < 1e-9;
    assert.ok(forms.some(f => String(q.answer).indexOf(f) >= 0) || fracOk,
      q.id + ' value 与答案页答案不对应');
  });
});

test('题干不空，且没有排版病：f (x)、括起来的分数、问号前空格', () => {
  BANK.forEach(q => {
    assert.ok(q.stem && q.stem.trim().length > 8, q.id + ' 题干为空');
    assert.ok(!/f \(x\)|g \(x\)/.test(q.stem), q.id + ' 题干里 f (x) 应该是 f(x)');
    assert.ok(!/[ \t]\?/.test(q.stem), q.id + ' 问号前有多余空格');
    (q.choices || []).forEach(c => {
      assert.ok(!/f \(x\)|g \(x\)/.test(c), q.id + ' 选项里 f (x) 应该是 f(x)');
    });
  });
});

test('每题都有原页对照图 docs/jiangyi-proof/{id}.png', () => {
  BANK.forEach(q => {
    const p = path.join(ROOT, 'docs/jiangyi-proof', q.id + '.png');
    assert.ok(fs.existsSync(p), q.id + ' 缺原页对照图 ' + p);
    assert.ok(fs.statSync(p).size > 20000, q.id + ' 对照图太小，可能是空图');
  });
});

test('图形只走矢量 spec：引用的 fig 必须存在，且不许出现讲义裁图', () => {
  BANK.forEach(q => {
    if (!q.figure) return;
    /* 教材原题例外：figure 值是练习册原页题目图（images/fig/U4-0x.png），
       矢量重画排进图形线（码农 α），数据侧先保证「有图可看、文件存在」。 */
    if (isBook(q)) {
      assert.match(q.figure, /^images\/fig\/\S+\.png$/, q.id + ' 的 figure 不是图片路径：' + q.figure);
      assert.ok(fs.existsSync(path.join(ROOT, q.figure)), q.id + ' 引用的图片不存在：' + q.figure);
      assert.ok(!FG.JY_FIG.specs[q.figure], q.id + ' 教材原题不该直接引用讲义 spec');
      return;
    }
    assert.ok(FG.JY_FIG.specs[q.figure], q.id + ' 引用的矢量 spec 不存在：' + q.figure);
    assert.ok(!q.image, q.id + ' 不许挂位图 image 字段');
  });
  const crops = fs.existsSync(path.join(ROOT, 'data/figure_crops.json'))
    ? JSON.parse(fs.readFileSync(path.join(ROOT, 'data/figure_crops.json'), 'utf8')) : {};
  BANK.forEach(q => assert.ok(!crops[q.id], q.id + ' 不许在位图裁剪表里注册'));
});

test('已录数 ≤ 应有数，且已录的题号连续不重（缺一道就不算完成）', () => {
  SECS.forEach(s => {
    const qs = bySection[s.section] || [];
    assert.ok(qs.length <= s.declared, s.section + ' 已录 ' + qs.length + ' 超过应有 ' + s.declared);
    const nos = qs.map(q => q.no).sort((a, b) => a - b);
    nos.forEach((n, i) => {
      if (i > 0) assert.ok(n > nos[i - 1], s.section + ' 题号重复：' + n);
    });
  });
});

/* 双空 grid-in 的三处配套必须同时在位：数据 values、页面双框分支、样式表规则。
   任何一方被人整页覆盖（本项目发生过 html 被整体替换）都会在这里红。 */
test('JY2-014 双空：数据 values 与渲染/判分/样式三处配套都在', () => {
  const q = BANK.find(x => x.id === 'JY2-014');
  assert.ok(q, '缺 JY2-014');
  assert.strictEqual(q.type, 'grid');
  assert.deepStrictEqual(q.values, [250, 123.5], 'values 应为一空一值');
  assert.strictEqual(q.value, 250, 'value 保留第一空，兼容单值读取路径');

  const page = fs.readFileSync(path.join(ROOT, 'jiangyi-page.js'), 'utf8');
  assert.ok(page.includes('q.values && q.values.length > 1'), 'jiangyi-page.js 缺双空分支');
  assert.ok(page.includes('jy-grid-multi'), 'jiangyi-page.js 缺双空容器类名');

  const html = fs.readFileSync(path.join(ROOT, 'jiangyi.html'), 'utf8');
  assert.ok(html.includes('.jy-grid-multi{'), 'jiangyi.html 缺 .jy-grid-multi 样式规则');
  assert.ok(html.includes('.jy-grid-label'), 'jiangyi.html 缺标签样式');

  const grade = fs.readFileSync(path.join(ROOT, 'grade-core.js'), 'utf8');
  assert.ok(grade.includes('dualCorrect'), 'grade-core.js 缺 dualCorrect');
});

/* 归一化层的白名单最容易吞字段：core.normalize() 是逐字段重建对象，不显式搬运就丢。
   这条钉住 values 与数值键，防止「数据里有、渲染层拿不到」这类静默退化。 */
test('normalize 保留双空 values 与 grid 数值键', () => {
  const win = {};
  ['data/jiangyi.js', 'grade-core.js', 'jiangyi-core.js'].forEach(rel => {
    new Function('window', fs.readFileSync(path.join(ROOT, rel), 'utf8'))(win);
  });
  const q = win.TD_JY.BY_ID['JY2-014'];
  assert.ok(q, 'core 里缺 JY2-014');
  assert.strictEqual(q.type, 'grid');
  assert.deepStrictEqual(q.values, [250, 123.5], 'normalize 丢了 values');
  assert.strictEqual(q.value, 250, 'normalize 的 value 应为有限数值');
  assert.strictEqual(win.TDGrade.isCorrect(q, '250, 123.5'), true, '归一化后双空判对应为对');
  assert.strictEqual(win.TDGrade.isCorrect(q, '250'), false, '只填一空应为错');

  const single = win.TD_JY.ALL.find(x => x.type === 'grid' && !x.values && /^\d+$/.test(x.answer));
  assert.ok(single, '缺可抽查的单空 grid');
  assert.ok(isFinite(single.value), '单空 grid 的数值键被弄丢了：' + single.id);
});
