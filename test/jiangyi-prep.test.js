/* 3.1–4.5 开工材料包的一致性校验：docs/jiangyi-prep/ 不许跟数据漂移。
   跑：node --test test/jiangyi-prep.test.js */
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
const SECS = JY.JY_SECTIONS.filter(s => s.section.startsWith('3.') || s.section.startsWith('4.'));

const missOf = sec => {
  const done = new Set(JY.JY_BANK.filter(q => q.section === sec && q.group !== 'textbook').map(q => q.no));
  return [...Array(KEY[sec].maxNo).keys()].map(i => i + 1).filter(n => !done.has(n));
};

test('3.x–4.x 共 11 节、120 道，每节一页材料', () => {
  assert.strictEqual(SECS.length, 11, '应有 11 节（3.1–3.6 + 4.1–4.5）');
  const total = SECS.reduce((n, s) => n + KEY[s.section].maxNo, 0);
  assert.strictEqual(total, 120, '3.x–4.x 应为 120 道');
  SECS.forEach(s => {
    assert.ok(fs.existsSync(path.join(ROOT, 'docs/jiangyi-prep', s.section + '.md')), '缺材料页：' + s.section);
  });
});

test('每节开工表的行数 = 该节缺题数，且 id 全库不重复', () => {
  const taken = new Set(JY.JY_BANK.map(q => q.id));
  const seen = new Set();
  SECS.forEach(s => {
    const md = fs.readFileSync(path.join(ROOT, 'docs/jiangyi-prep', s.section + '.md'), 'utf8');
    const rows = md.split('\n').filter(l => /^\| JY[34]-\d{3} \| #\d+ \|/.test(l));
    const miss = missOf(s.section);
    assert.strictEqual(rows.length, miss.length, s.section + ' 开工表行数与缺题数不符');
    rows.forEach((l, i) => {
      const id = l.split('|')[1].trim();
      assert.ok(!taken.has(id), id + ' 已被 JY_BANK 占用');
      assert.ok(!seen.has(id), id + ' 在材料包里重复分配');
      seen.add(id);
      assert.ok(l.includes('#' + miss[i] + ' |'), s.section + ' 第 ' + (i + 1) + ' 行的题号与缺号顺序不符');
    });
  });
});

test('答案键逐条照抄答案页，不自己算', () => {
  SECS.forEach(s => {
    const md = fs.readFileSync(path.join(ROOT, 'docs/jiangyi-prep', s.section + '.md'), 'utf8');
    const k = KEY[s.section];
    missOf(s.section).forEach(n => {
      assert.ok(md.includes('`' + k.answers[String(n)] + '`'), s.section + ' #' + n + ' 的答案键与答案页不一致');
    });
  });
});

test('README 索引的合计是 120', () => {
  const md = fs.readFileSync(path.join(ROOT, 'docs/jiangyi-prep/README.md'), 'utf8');
  assert.match(md, /\| \*\*合计\*\* \|[^|]*\| \*\*120\*\* \| \*\*120\*\* \|/);
});
