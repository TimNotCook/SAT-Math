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
BANK.forEach(q => { (bySection[q.section] = bySection[q.section] || []).push(q); });

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
    const m = /^讲义 p(\d+) #(\d+)$/.exec(q.source || '');
    assert.ok(m, q.id + ' 的 source 不是「讲义 p{页} #{题号}」：' + q.source);
    assert.strictEqual(Number(m[1]), q.page, q.id + ' source 页码与 page 不一致');
    assert.strictEqual(Number(m[2]), q.no, q.id + ' source 题号与 no 不一致');
  });
});

test('answer 逐字等于答案页的键（不自己算）', () => {
  BANK.forEach(q => {
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
    assert.ok(forms.some(f => String(q.answer).indexOf(f) >= 0),
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
    if (!q.fig) return;
    assert.ok(FG.JY_FIG.specs[q.fig], q.id + ' 引用的矢量 spec 不存在：' + q.fig);
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
