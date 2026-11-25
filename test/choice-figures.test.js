/* 统一选项图通路：显式 choiceFigures 与旧 TD_CHOICE_CROPS 都从同一个解析器出。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function boot() {
  const sandbox = { console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'data/jiangyi_figures.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'choice-figures.js'), 'utf8'), sandbox);
  return sandbox;
}

test('choiceFigures.vector：JY1-040 的四个面板各自渲染', () => {
  const W = boot();
  ['A', 'B', 'C', 'D'].forEach(L => {
    const hit = W.TD_CHOICE_FIGURES.resolve({ id: 'JY1-040', choiceFigures: { [L]: { vector: 'JY1-040#' + L } } }, L);
    assert.strictEqual(hit.kind, 'vector');
    assert.match(hit.html, /^<div class="td-choicegraph td-choicegraph--field"><svg /);
  });
});

test('choiceFigures.image：只接受 images/choice 下的登记裁图', () => {
  const W = boot();
  const q = { id: 'X', choiceFigures: { A: { image: 'images/choice/X_A.png' }, B: { image: 'images/scans/X_B.png' } } };
  const a = W.TD_CHOICE_FIGURES.resolve(q, 'A');
  assert.strictEqual(a.kind, 'image');
  assert.match(a.html, /^<img class="drill-choice-fig" src="images\/choice\/X_A.png"/);
  const b = W.TD_CHOICE_FIGURES.resolve(q, 'B');
  assert.strictEqual(b.kind, 'missing');
});

test('旧通路输出不变：TD_CHOICE_CROPS 仍生成原样的裁图 img', () => {
  const W = boot();
  W.TD_CHOICE_CROPS = { 'U1-01': { A: 'images/choice/U1-01_A.png' } };
  const q = { id: 'U1-01' };
  const hit = W.TD_CHOICE_FIGURES.resolve(q, 'A', { text: { figure: ['A'] } });
  assert.strictEqual(hit.source, 'legacy');
  assert.strictEqual(hit.html,
    '<img class="drill-choice-fig" src="images/choice/U1-01_A.png" alt="选项 A" loading="lazy" decoding="async" ' +
    'onerror="var p=document.createElement(\'span\');p.className=\'drill-choice-placeholder\';p.textContent=\'图形暂缺\';this.replaceWith(p);">');
});
