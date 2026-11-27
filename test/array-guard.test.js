/* 成绩仓库/错题键被写成「对象」而不是数组时的整页崩溃回归。
   事故面：wrong-page.js 与 history-page.js 的 load() 都写着
   `JSON.parse(...) || []` —— 只要值是真值对象（旧版结构、云端合并写错、
   手工导入），后面的 .forEach / .filter / .sort 立刻 TypeError，
   页面停在占位、永不重画（和第 12 条「错题本慢网空白」同一种用户体感）。
   修法：只认 Array.isArray，其余一律当空列表。这里直接跑两个真实页面脚本。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function fakeEl() {
  return {
    innerHTML: '', hidden: false, dataset: {},
    classList: { add() {}, remove() {}, toggle() { return true; } },
    setAttribute() {}, getAttribute() { return null; }, appendChild() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener() {},
  };
}

function boot(files, store) {
  const els = {};
  const sandbox = {
    console,
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; },
    },
    location: { search: '', hash: '', pathname: '/', href: '', replaceState() {}, assign() {} },
    history: { replaceState() {} },
    document: {
      getElementById: id => (els[id] = els[id] || fakeEl()),
      querySelector: () => null, querySelectorAll: () => [],
      addEventListener() {},
      body: { classList: { add() {}, remove() {}, toggle() { return true; } }, appendChild() {} },
      createElement: () => fakeEl(),
    },
    window: {}, URLSearchParams, navigator: { language: 'zh' }, addEventListener() {},
    setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox);
  return { els, sandbox };
}

test('错题本：成绩仓库是对象时不崩页，仍渲染出列表容器', () => {
  const store = { tdsat_exam_suite_results_v1: JSON.stringify({ items: [{ bad: true }] }) };
  let threw = null;
  try {
    boot(['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js', 'wrong-page.js'], store);
  } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '错题本被非数组成绩仓库打崩了：' + (threw && threw.message));
});

test('记录页：成绩仓库是对象时不崩页，落到「还没有记录」占位', () => {
  const store = {
    tdsat_exam_suite_results_v1: JSON.stringify({ items: [] }),
    tdsat_exam_suite_abandoned_v1: JSON.stringify({ nope: 1 }),
  };
  let threw = null, box = null;
  try { box = boot(['history-page.js'], store).els.histList; } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '记录页被非数组仓库打崩了：' + (threw && threw.message));
  assert.ok(box && /还没有模考或抽查记录/.test(box.innerHTML), '记录页没有落到空态占位');
});

test('exam.js 读仓库一律过 asArr/asObj，不再裸 `|| []` / `|| {}`', () => {
  const s = fs.readFileSync(path.join(ROOT, 'exam.js'), 'utf8');
  assert.ok(/const asArr = v =>/.test(s) && /const asObj = v =>/.test(s), 'exam.js 缺少 asArr/asObj 降级器');
  assert.ok(!/(load\((?:KEY_)[A-Z]+\)\s*\|\|\s*\[\])/.test(s),
    'exam.js 里还有 `load(KEY_x) || []` 的裸数组假设');
});

test('脏存档体检脚本存在、复用 lib/chrome 与 lib/serve', () => {
  const s = fs.readFileSync(path.join(ROOT, 'tools/verify_junk.mjs'), 'utf8');
  assert.ok(/from '\.\/lib\/chrome\.mjs'/.test(s) && /tempProfile\('vjk-'\)/.test(s), 'verify_junk 没复用 chrome 临时 profile');
  assert.ok(/from '\.\/lib\/serve\.mjs'/.test(s) && /startStaticServer/.test(s), 'verify_junk 没复用静态服务器');
  assert.ok(/tdsat_exam_suite_results_v1/.test(s) && /tdsat_progress_save_v1/.test(s), 'verify_junk 没种关键脏键');
  assert.ok(/PROFILES/.test(s) && /B-halfsession/.test(s) && /C-extremes/.test(s), 'verify_junk 的脏值档案少于三套');
  assert.ok(/E-wronglog-only/.test(s), 'verify_junk 缺少「只剩 wrongLog 台账」画像（第 23 条）');
  assert.ok(/H-bad-report/.test(s), 'verify_junk 缺少「成绩记录 report 错类型」画像（第 25 条）');
  assert.ok(/I-import-given/.test(s), 'verify_junk 缺少「导入错题 given 错类型」画像（第 26 条）');
  assert.ok(/J-import-stem/.test(s), 'verify_junk 缺少「导入错题 stem 错类型」画像（第 27 条）');
  assert.ok(/K-import-objects/.test(s), 'verify_junk 缺少「导入错题展示字段全是对象」画像（第 28 条）');
  assert.ok(/L-history-objects/.test(s), 'verify_junk 缺少「成绩记录展示字段全是对象」画像（第 29 条）');
});

test('导入错题 stem 是对象/数组时不崩页', () => {
  const store = {
    tdsat_imported_wrong_v1: JSON.stringify({ items: [
      { key: 'j1', stem: { x: 1 }, type: 'mcq', answer: 'A', given: 'A', choices: { A: '1' } },
      { key: 'j2', stem: ['1+1=?'], type: 'mcq', answer: 'A', given: 'A', choices: { A: '2' } },
    ] }),
  };
  let threw = null, els = null;
  try { els = boot(['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js', 'wrong-page.js'], store).els; }
  catch (e) { threw = e; }
  assert.strictEqual(threw, null, '导入错题 stem 错类型打崩错题本：' + (threw && threw.message));
  assert.ok(els && els.wrongList && els.wrongList.innerHTML.length > 0, '导入错题没画出卡片');
  assert.ok(/题干文字暂缺/.test(els.wrongList.innerHTML), '对象型 stem 没有落缺省文案');
});
test('导入错题展示字段是对象时不出 [object Object]', () => {
  const store = {
    tdsat_imported_wrong_v1: JSON.stringify({ items: [
      { key: 'v1', stem: 'Test', choices: { A: { x: 1 } }, type: 'mcq', answer: { x: 1 }, given: { y: 2 }, topic: { x: 1 }, source: { x: 1 }, importedAt: { x: 1 } },
      { key: 'v2', stem: 'Bad match', choices: { A: '1' }, type: 'mcq', answer: 'A', given: 'A', readOnly: true, matchId: 'NO-SUCH' },
    ] }),
  };
  let threw = null, els = null;
  try { els = boot(['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js', 'wrong-page.js'], store).els; }
  catch (e) { threw = e; }
  assert.strictEqual(threw, null, '导入错题脏字段打崩：' + (threw && threw.message));
  assert.ok(els && els.wrongList && els.wrongList.innerHTML.length > 0, '导入错题没画出卡片');
  assert.ok(!/\[object Object\]/.test(els.wrongList.innerHTML), '错题卡出现 [object Object]');
  assert.ok(/未作答/.test(els.wrongList.innerHTML), '对象型 given 没有降级成未作答');
  assert.ok(!/其中 1 道已匹配题库/.test(els.wrongList.innerHTML), 'matchId 无效却宣称已匹配题库');
});
test('导入流程 normalizeItem 不把对象字段写成 [object Object]', () => {
  const store = {};
  const { els, sandbox } = boot(['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js', 'wrong-page.js'], store);
  sandbox.TD_IMPORT_WRONG.importData({ items: [
    { key: 'raw1', stem: { x: 1 }, choices: { A: { y: 1 } }, type: 'mcq', answer: { z: 1 }, given: { g: 1 }, topic: { t: 1 }, source: { s: 1 }, value: { v: 1 } },
  ] });
  const saved = JSON.parse(store.tdsat_imported_wrong_v1 || '{}');
  assert.ok(!/\[object Object\]/.test(JSON.stringify(saved)), '导入时把对象字段存成了 [object Object]');
  assert.ok(!/\[object Object\]/.test(els.wrongList.innerHTML), '导入后的错题卡出现 [object Object]');
});

test('记录页字段全是对象时不显示 [object Object]、NaN 或 Invalid Date', () => {
  const store = {
    tdsat_exam_suite_results_v1: JSON.stringify([{
      date: { x: 1 }, mode: { x: 1 }, unit: { x: 1 }, board: { x: 1 }, section: { x: 1 },
      total: { x: 1 }, correct: { x: 1 }, elapsed: { x: 1 },
      detail: [{ id: { x: 1 }, given: { x: 1 }, answer: { x: 1 }, topic: { x: 1 }, correct: false }],
      report: { priority: [{ name: { x: 1 }, reason: { x: 1 }, action: { x: 1 }, wrongIds: [{ x: 1 }] }] },
    }]),
  };
  let threw = null, els = null;
  try { els = boot(['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js', 'history-page.js'], store).els; }
  catch (e) { threw = e; }
  assert.strictEqual(threw, null, '记录页脏字段打崩：' + (threw && threw.message));
  const html = els && els.histList ? els.histList.innerHTML : '';
  assert.ok(html.length > 0, '记录页没画出内容');
  assert.ok(!/\[object Object\]/.test(html), '记录页出现 [object Object]');
  assert.ok(!/NaN/.test(html), '记录页出现 NaN');
  assert.ok(!/Invalid Date/.test(html), '记录页出现 Invalid Date');
});



test('成绩记录里 detail 是对象、条目是 null 时，错题本与记录页都不崩', () => {
  const store = {
    tdsat_exam_suite_results_v1: JSON.stringify([
      { date: 1, mode: 'mock', detail: 'nope', total: 'x' }, null, 5,
    ]),
  };
  let threw = null, els = null;
  try {
    els = boot(['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js', 'wrong-page.js'], store).els;
  } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '错题本被坏 detail 打崩：' + (threw && threw.message));
  assert.ok(els && els.wrongList && els.wrongList.innerHTML.length > 0, '错题本没画出东西');

  threw = null;
  try { boot(['history-page.js'], store); } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '记录页被坏 detail 打崩：' + (threw && threw.message));
});

test('exam.js 成绩页对残缺 result 降级：estimate/report 缺失也不白屏', () => {
  const s = fs.readFileSync(path.join(ROOT, 'exam.js'), 'utf8');
  assert.ok(/const est = asObj\(r.estimate\), rep = asObj\(r.report\)/.test(s),
    'renderResult 没有把 estimate/report 过 asObj 降级');
  assert.ok(!/r\.estimate\.(scaled|raw|rawMax|path)/.test(s), 'renderResult 还在裸取 r.estimate 字段');
  assert.ok(!/asArr\(r\.detail\)\.forEach\(d => \{\s*if \(d\.correct\)/.test(s),
    'mergedState 对 detail 里的 null 条目没有跳过（第 25 条同源）');
  assert.ok(!/rep\.(units|topics|priority)\./.test(s), 'renderResult 还在裸取 report 的数组字段');
});

test('bump_assets.py 拒绝在任何带冲突标记的文件上跑', () => {
  const s = fs.readFileSync(path.join(ROOT, 'bump_assets.py'), 'utf8');
  assert.ok(/def assert_no_conflict_markers\(\)/.test(s), 'bump_assets 缺冲突标记闸门');
  assert.ok(/assert_no_conflict_markers\(\)\n    v = digest\(\)/.test(s), '闸门没有在 main 里先于 digest 执行');
});

test('作答被清空、只剩 wrongLog 台账时，错题本仍然保留这道「曾经错过」的题', () => {
  const store = {
    tdsat_app_v1: JSON.stringify({ sections: { L1: { answers: {}, wrongLog: { 'U1-01': { v: 'A', ts: 1 } } } }, last: null }),
  };
  let threw = null, els = null;
  try {
    els = boot(['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js', 'wrong-page.js'], store).els;
  } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '错题本被「只有 wrongLog」的存档打崩：' + (threw && threw.message));
  assert.ok(els && /U1-01|1\.1/.test(els.wrongList.innerHTML), '清空作答后，wrongLog 里的错题被错题本弄丢了');
  assert.ok(/还没有错题记录/.test(els.wrongList.innerHTML) === false, '错题本落到空态，说明 wrongLog 没被收集');
});

test('记录页：report.priority 是字符串、priority 条目缺字段时不崩，仍渲染记录', () => {
  const store = {
    tdsat_exam_suite_results_v1: JSON.stringify([{
      date: 1, mode: 'mock', total: 22, correct: 5, elapsed: 60, detail: [],
      report: { priority: 'x' }, estimate: { raw: 'x', rawMax: null, path: 5 },
    }, {
      date: 2, mode: 'mock', total: 22, correct: 5, elapsed: 60, detail: [],
      report: { priority: [{ name: '换元', reason: 5 }, null] }, estimate: 'nope',
    }]),
  };
  let threw = null, els = null;
  try { els = boot(['history-page.js'], store).els; } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '记录页被坏 report/estimate 打崩：' + (threw && threw.message));
  assert.ok(els && String(els.histList.innerHTML).length > 0, '记录页没画出记录');
});

test('导入错题里的 given 是对象/数字时，错题本不崩且仍画出卡片', () => {
  const store = {
    tdsat_imported_wrong_v1: JSON.stringify({ items: [
      { key: 's:x', stem: '1+1=?', type: 'mcq', answer: 'A', given: { x: 1 }, choices: { A: '2', B: '3' } },
      { key: 's:y', stem: '2+2=?', type: 'mcq', answer: 'B', given: 123, choices: { A: '3', B: '4' } },
    ] }),
  };
  let threw = null, els = null;
  try {
    els = boot(['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js', 'wrong-page.js'], store).els;
  } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '错题本被导入项里的 given 对象打崩：' + (threw && threw.message));
  assert.ok(els && /导入/.test(els.wrongList.innerHTML), '导入错题没有渲染出来');
});

test('导入错题仓库 items 是字符串/数字时，错题本不崩且仍画出卡片', () => {
  const store = {
    tdsat_imported_wrong_v1: JSON.stringify({ items: 'no', n: {} }),
    tdsat_app_v1: JSON.stringify({ sections: { '1.1': { answers: { 'U1-01': { v: 'A', correct: false, ts: 1 } } } }, last: null }),
  };
  let threw = null, els = null;
  try {
    els = boot(['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js', 'wrong-page.js'], store).els;
  } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '错题本被坏导入仓库打崩：' + (threw && threw.message));
  assert.ok(els && els.wrongList && els.wrongList.innerHTML.length > 0, '错题本没画出东西');
});
