/* 选项闸门回归：mcq 四个选项没有任何内容来源（文字 / 裁图 / 矢量图）时，
   页面必须显式提示「选项缺失」而不是画四个空按钮。
   数据侧断言：这类题只能落在白名单里，新增一道就红。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
/* 白名单：目前为空——全量 mcq 都有可渲染的选项来源（文字 / 裁图 / 矢量图）。
   任何人新增缺选项题必须补数据，不许往这里加名字。 */
const WHITELIST = [];

function load() {
  const sandbox = { console, window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'data/questions.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'data/text.js'), 'utf8'), sandbox);
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, 'data/choice_crops.js'), 'utf8'), sandbox); } catch (e) { /* 无裁图数据 */ }
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, 'data/figures.js'), 'utf8'), sandbox); } catch (e) { /* 无矢量图数据 */ }
  return sandbox.window;
}

test('全量 mcq 缺选项数落在白名单内，且白名单内每题确实为空', () => {
  const W = load();
  const Q = W.TD_BANK.questions, T = W.TD_TEXT || {}, C = W.TD_CHOICE_CROPS || {}, G = W.TD_CHOICE_GRAPHS || {};
  const missing = [];
  Q.filter(q => q.type === 'mcq').forEach(q => {
    const t = T[q.id] || {};
    const ch = t.choices || {};
    const hasText = ['A', 'B', 'C', 'D'].some(L => String(ch[L] || '').trim());
    const hasCrop = C[q.id] && ['A', 'B', 'C', 'D'].some(L => C[q.id][L]);
    const hasVec = G[q.id] && ['A', 'B', 'C', 'D'].some(L => G[q.id][L]);
    if (!hasText && !hasCrop && !hasVec) missing.push(q.id);
  });
  assert.deepStrictEqual(missing.slice().sort(), WHITELIST.slice().sort(),
    '缺选项题集合变了：修好了请从白名单删，新缺的必须补数据而不是扩白名单');
});

test('练习页渲染：缺选项题不再生成四个空按钮', () => {
  const src = fs.readFileSync(path.join(ROOT, 'drill.js'), 'utf8');
  assert.match(src, /data-choices="missing"/);
  assert.match(src, /选项缺失/);
  assert.ok(src.includes('return it.txt || it.figSrc || it.vecFig'),
    '闸门判定必须同时看 文字 / 裁图 / 矢量图 三种来源');
});

test('模考页渲染同样走闸门', () => {
  const src = fs.readFileSync(path.join(ROOT, 'exam.js'), 'utf8');
  assert.match(src, /data-choices="missing"/);
  assert.match(src, /选项缺失/);
});
