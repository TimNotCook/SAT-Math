# -*- coding: utf-8 -*-
"""一次性补丁：fmtMath 支持裸 "^" 指数（x^2 / 2^x / ^(t-12)）+ TD-31-25 题干改 π。
CI 里跑，跑完 workflow 自删；已打过则跳过。"""
import os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def patch(path, old, new, tag):
    p = os.path.join(ROOT, path)
    s = open(p, encoding='utf-8').read()
    if s.count(old) == 0 and s.count(new) > 0:
        print('skip (already patched):', tag); return
    if s.count(old) != 1:
        print('FAIL: %s 命中 %d 次' % (tag, s.count(old))); sys.exit(1)
    open(p, 'w', encoding='utf-8').write(s.replace(old, new, 1))
    print('patched:', tag)

# 1) figures.js — 在 ^{...} 规则后面插入裸指数规则
OLD1 = """    // 1) superscripts ^{...}
    s = s.replace(/\\^\\{([^{}]*)\\}/g, function (m, body) { return keep('<sup>' + body + '</sup>'); });
"""
NEW1 = OLD1 + """    // 1c) 裸指数：题库里有 18 道题把上标写成 x^2 / 2^x / ^(t-12)（原书印的是上标），
    //     不转换就把 "^2" 原样印给考生。只认紧跟的 "(...)"、一串数字、单个字母，
    //     或一个被数字守卫换掉的十进制数，其它 ^ 一律不动。
    s = s.replace(/\\^\\(([^()]*)\\)/g, function (m, body) { return keep('<sup>' + body + '</sup>'); });
    s = s.replace(/\\^([0-9]{1,3}|[A-Za-z])/g, function (m, body) { return keep('<sup>' + body + '</sup>'); });
    s = s.replace(/\\^(\\uE000\\d+\\uE000)/g, function (m, body) { return keep('<sup>' + body + '</sup>'); });
"""
patch('figures.js', OLD1, NEW1, 'figures.js bare caret')

# 2) 题干改 π（练习册 P145 #25 原页印 π²、π）
q_old = 'Which expression is equivalent to (20pi^2)/(pi^2 - x^2) - (20pi)/(x + pi), where x > pi ?'
q_new = 'Which expression is equivalent to (20\u03c0^{2})/(\u03c0^{2} - x^{2}) - (20\u03c0)/(x + \u03c0), where x > \u03c0 ?'
patch('data/questions.js', q_old, q_new, 'questions.js TD-31-25 π')
t_old = 'Which expression is equivalent to (20pi^2)/(pi^2 - x^2) - (20pi)/(x + pi), where x > pi?'
t_new = 'Which expression is equivalent to (20\u03c0^{2})/(\u03c0^{2} - x^{2}) - (20\u03c0)/(x + \u03c0), where x > \u03c0?'
patch('data/text.js', t_old, t_new, 'text.js TD-31-25 π')

# 3) 回归测试
TEST = r'''/* 裸 "^" 指数必须渲染成上标。
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
'''
open(os.path.join(ROOT, 'test/math-superscript.test.js'), 'w', encoding='utf-8').write(TEST)
print('wrote test/math-superscript.test.js')
