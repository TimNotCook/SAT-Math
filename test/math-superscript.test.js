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
