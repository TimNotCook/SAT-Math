/* 裸 "^" 指数必须渲染成上标。
   题库里有 18 道题把上标写成 x^2 / 2^x / ^(t-12)（原书印的是上标），
   fmtMath 只认 ^{...}，于是 "^(t-12)" 会原样印给考生。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function load(file, key) {
  const sb = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sb);
  return sb.window[key];
}
const F = load('figures.js', 'TD_FIG');
const BANK = load('data/questions.js', 'TD_BANK');
const TXT = load('data/text.js', 'TD_TEXT');

test('fmtMath：裸指数渲染成上标', () => {
  const cases = [
    ['y=-16(x-6.8)^2+740', 'y=-16(x-6.8)<sup>2</sup>+740'],
    ['c = 1,600(1.05)^m', 'c = 1,600(1.05)<sup>m</sup>'],
    ['C(t)=210(58/57)^(t-12)+7', '<sup>t-12</sup>'],
    ['f(x)=a^x+b', 'a<sup>x</sup>'],
    ['80pi cm^3', 'cm<sup>3</sup>'],
  ];
  for (const [raw, expect] of cases) {
    const html = F.fmtMath(raw);
    assert.ok(!html.includes('^'), `残留裸 ^：${raw} → ${html}`);
    assert.ok(html.includes(expect), `${raw} → ${html}`);
  }
  /* ^{...} 不许被二次处理 */
  assert.strictEqual(F.fmtMath('2^{x+2}'), '2<sup>x+2</sup>');
});

test('全库：渲染后题干/选项/提示里不残留裸 ^', () => {
  const leaks = [];
  const items = (q) => {
    const out = [[q.stem || '', 'stem']];
    if (q.hint) out.push([q.hint, 'hint']);
    const t = TXT[q.id] || {};
    const ch = (q.choices && q.choices.length) ? q.choices : Object.values(t.choices || {});
    ch.forEach((v, i) => out.push([String(v), 'choice' + i]));
    return out;
  };
  for (const q of BANK.questions) {
    for (const [raw, where] of items(q)) {
      const plain = F.fmtMath(raw).replace(/<[^>]+>/g, '');
      if (plain.includes('^')) leaks.push(`${q.id} ${where}: ${plain.slice(0, 60)}`);
    }
  }
  assert.strictEqual(leaks.length, 0, '残留裸 ^：' + leaks.slice(0, 5).join(' / '));
});

test('TD-31-25：题干用 π 而不是 pi（练习册 P145 #25 原页）', () => {
  const q = BANK.questions.find((x) => x.id === 'TD-31-25');
  assert.ok(q, '缺 TD-31-25');
  assert.ok(q.stem.includes('\u03c0'), '题干应含 π');
  assert.ok(!/\bpi\b/.test(q.stem.replace(/\u03c0/g, '')), '题干不该出现 "pi"');
});
test('fmtMath：根号里套分数要印成「根号横线 + 上下叠分式」', () => {
  const cases = ['\u2074\u221a(1/b^{3})', '\u221a(x/y) - 19', '\u221a((5x\u22124z)/(20x\u00b2z\u00b2))', '\u221a(1/(4xz\u00b2-5x\u00b2z))'];
  for (const raw of cases) {
    const html = F.fmtMath(raw);
    assert.ok(/td-sqrt[\s\S]*td-frac/.test(html), `根号里应是叠分式：${raw} \u2192 ${html}`);
    assert.ok(!html.replace(/<[^>]+>/g, '').includes('/'), `叠分式里不该留斜杠：${raw} \u2192 ${html}`);
  }
  /* 根号里没有分数时不许动 */
  const plain = F.fmtMath('\u221a((x-2)^{2})');
  assert.ok(!plain.includes('td-frac'), `不该把普通根式改成叠分式：${plain}`);
});
test('fmtMath：分式分子带系数/π/上标时整串压成分子（不许只取一个字符）', () => {
  const num = (html) => (html.match(/td-num">([^<]*)/) || [])[1] || '';
  assert.strictEqual(num(F.fmtMath('20\u03c0x/(\u03c0\u00b2-x\u00b2)')), '20\u03c0x');
  assert.strictEqual(num(F.fmtMath('20\u03c0\u00b2/(\u03c0\u00b2 - x\u00b2)')), '20\u03c0\u00b2');
  assert.strictEqual(num(F.fmtMath('5\u03c0/4')), '5\u03c0');
  assert.strictEqual(num(F.fmtMath('prs/(pr + ps + rs)')), 'prs');
  assert.ok(num(F.fmtMath('prs/(pr + ps + rs)')) !== '', '应压成叠分式');
});
