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

function boot(files, store, opts) {
  const els = {};
  const sandbox = {
    console,
    localStorage: {
      getItem: k => { if (opts && opts.throwRead) throw new Error('storage denied'); return (k in store ? store[k] : null); },
      setItem: (k, v) => { if (opts && opts.throwWriteKey === k) throw new Error('storage denied'); store[k] = String(v); },
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

test('记录页：date 为 null/0 时不显示 1970 年，缺时间显示「—」', () => {
  const store = { tdsat_exam_suite_results_v1: JSON.stringify([
    { mode: 'quiz', date: null, total: 1, correct: 1, detail: [], report: {} },
    { mode: 'quiz', date: 0, total: 1, correct: 0, detail: [], report: {} },
  ]) };
  const els = boot(['history-page.js'], store).els;
  assert.ok(!/1970/.test(els.histList.innerHTML), 'null/0 的 date 被画成了 1970 年');
  assert.ok((els.histList.innerHTML.match(/—/g) || []).length >= 2, '缺时间没有显示「—」');
});

test('记录页：localStorage 读取被拒（隐私模式）时不崩页，落到空态', () => {
  let threw = null, box = null;
  try { box = boot(['history-page.js'], {}, { throwRead: true }).els.histList; } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '存储被拒时记录页崩了：' + (threw && threw.message));
  assert.ok(box && /还没有模考或抽查记录/.test(box.innerHTML), '存储被拒时没有落到空态');
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
  assert.ok(/exam\.html\?mode=quiz/.test(s), 'verify_junk 必须体检单元抽查页，不能只查 mode=mock（第 29 条）');
  assert.ok(/snap\(disk\.paper\) === snap\(S\.paper\)/.test(fs.readFileSync(path.join(__dirname, '..', 'exam.js'), 'utf8')),
    'persist() 只能复用「同一份卷」的活会话，否则会把上一场模考的 paper 拼到抽查卷上（第 29 条）');
  assert.ok(/K-import-objects/.test(s), 'verify_junk 缺少「导入错题展示字段全是对象」画像（第 28 条）');
  assert.ok(/L-history-objects/.test(s), 'verify_junk 缺少「成绩记录展示字段全是对象」画像（第 29 条）');
});

test('wrongLog 条目 v 是对象时，不画「未作答」幽灵错题卡', () => {
  /* 找一个真实板块和题目，只种这一条坏台账；正确/错误答案都不该出现。 */
  const store = { tdsat_app_v1: JSON.stringify({ sections: {} }) };
  const probe = boot(['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js', 'wrong-page.js'], {});
  const sec = probe.sandbox.TD_APP.SECS[0], qid = probe.sandbox.TD_APP.CATALOG[sec][0].id;
  const st = { sections: {} };
  st.sections[sec] = { answers: {}, marks: {}, wrongLog: {} };
  st.sections[sec].wrongLog[qid] = { v: { x: 1 }, ts: 1700000000000 };
  store.tdsat_app_v1 = JSON.stringify(st);
  let threw = null, els = null;
  try { els = boot(['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js', 'wrong-page.js'], store).els; }
  catch (e) { threw = e; }
  assert.strictEqual(threw, null, '对象 v 打崩错题本：' + (threw && threw.message));
  const html = els && els.wrongList ? els.wrongList.innerHTML : '';
  assert.ok(!/未作答/.test(html), '对象型 wrongLog.v 被画成了「未作答」幽灵错题');
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
test('导入错题数组混入数字/字符串时，不渲染幽灵卡片', () => {
  const store = { tdsat_imported_wrong_v1: JSON.stringify({ items: [
    5, 'junk', null,
    { key: 'ok', stem: '真实导入题', type: 'mcq', answer: 'A', given: 'B', choices: { A: '1' } },
  ] }) };
  let threw = null, els = null;
  try { els = boot(['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js', 'wrong-page.js'], store).els; }
  catch (e) { threw = e; }
  assert.strictEqual(threw, null, '坏条目打崩错题本：' + (threw && threw.message));
  const html = els && els.wrongList ? els.wrongList.innerHTML : '';
  assert.ok(!/导入错题 · 独立记录<span>3 道/.test(html), '数字/字符串/null 被算成了导入错题');
  assert.ok(/导入错题 · 独立记录<span>1 道/.test(html), '有效导入题没有单独保留');
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
test('导入错题仓库写盘失败时，不先把作答写进本机进度', () => {
  const store = {};
  const { sandbox } = boot(['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js', 'wrong-page.js'], store, { throwWriteKey: 'tdsat_imported_wrong_v1' });
  assert.throws(() => sandbox.TD_IMPORT_WRONG.importData({ items: [{ id: 'U1-01', given: 'B' }] }), /localStorage 写入失败/);
  assert.strictEqual(store.tdsat_app_v1, undefined, '错题仓库没写成，本机却已经写入了导入作答');
});

test('导入流程 normalizeItem 不把对象字段写成 [object Object]', () => {
  const store = {};
  const { els, sandbox } = boot(['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js', 'wrong-page.js'], store);
  sandbox.TD_IMPORT_WRONG.importData({ title: { x: 1 }, items: [
    { key: 'raw1', stem: { x: 1 }, choices: { A: { y: 1 } }, type: 'mcq', answer: { z: 1 }, given: { g: 1 }, topic: { t: 1 }, source: { s: 1 }, value: { v: 1 } },
    { key: 'raw2', stem: '1+1=?', choices: 'null', type: 'mcq', answer: 'A' },
    { key: 'raw3', stem: { x: 1 }, question: '对象字段后面的合法题干', type: 'mcq', answer: 'A', choices: { A: '1' } },
  ] });
  const saved = JSON.parse(store.tdsat_imported_wrong_v1 || '{}');
  assert.ok(!/\[object Object\]/.test(JSON.stringify(saved)), '导入时把对象字段存成了 [object Object]');
  assert.ok(!/\[object Object\]/.test(els.wrongList.innerHTML), '导入后的错题卡出现 [object Object]');
  const fallback = saved.items.find(x => x.stem === '对象字段后面的合法题干');
  assert.ok(fallback, '对象型 stem 把后面合法的 question 字段遮蔽了');
});
test('导入时旧 items 里有 null/非对象条目不崩，且被剔掉', () => {
  const store = { tdsat_imported_wrong_v1: JSON.stringify({ items: [null, 5, 'x', { key: 'old', stem: 'Old' }] }) };
  const { els, sandbox } = boot(['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js', 'wrong-page.js'], store);
  let threw = null;
  try { sandbox.TD_IMPORT_WRONG.importData({ items: [{ key: 'new1', stem: 'New', type: 'mcq', answer: 'A', choices: { A: '1' } }] }); }
  catch (e) { threw = e; }
  assert.strictEqual(threw, null, '旧 items 的 null/非对象条目打崩导入：' + (threw && threw.message));
  const saved = JSON.parse(store.tdsat_imported_wrong_v1 || '{}');
  assert.ok(saved.items.every(x => x && typeof x === 'object'), '导入后 items 里还留着 null/非对象条目');
  assert.ok(/New/.test(els.wrongList.innerHTML), '新导入没渲染出来');
});
test('导入仓库旧格式是数组时，新导入不覆盖丢旧错题', () => {
  const store = { tdsat_imported_wrong_v1: JSON.stringify([{ key: 'old', stem: 'Old', type: 'mcq', answer: 'A', choices: { A: '1' } }]) };
  const { sandbox } = boot(['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js', 'wrong-page.js'], store);
  sandbox.TD_IMPORT_WRONG.importData({ items: [{ key: 'new1', stem: 'New', type: 'mcq', answer: 'A', choices: { A: '2' } }] });
  const saved = JSON.parse(store.tdsat_imported_wrong_v1 || '{}');
  assert.ok(Array.isArray(saved.items), '旧数组没有被包成 items 数组');
  assert.ok(saved.items.some(x => x.key === 'old'), '旧数组里的错题被覆盖丢了');
  assert.ok(saved.items.some(x => /New/.test(String(x.stem))), '新错题没导入');
});



test('成绩记录 detail 数组混入数字/字符串时，不渲染幽灵错题行', () => {
  const store = { tdsat_exam_suite_results_v1: JSON.stringify([{
    date: 1700000000000, mode: 'mock', total: 2, correct: 2, elapsed: 60,
    detail: [5, 'junk', null], report: {},
  }]) };
  let threw = null, els = null;
  try { els = boot(['history-page.js'], store).els; }
  catch (e) { threw = e; }
  assert.strictEqual(threw, null, '坏 detail 打崩记录页：' + (threw && threw.message));
  const html = els && els.histList ? els.histList.innerHTML : '';
  assert.ok(!/hist-wrong-row/.test(html), '数字/字符串 is 被当成错题行');
  assert.ok(/本次全部答对/.test(html), '没有有效错题时没有落「全部答对」');
});

test('成绩仓库数组里混入数字/字符串时，不渲染幽灵记录', () => {
  const store = { tdsat_exam_suite_results_v1: JSON.stringify([5, 'junk', null, false]) };
  let threw = null, els = null;
  try { els = boot(['history-page.js'], store).els; }
  catch (e) { threw = e; }
  assert.strictEqual(threw, null, '坏条目打崩记录页：' + (threw && threw.message));
  const html = els && els.histList ? els.histList.innerHTML : '';
  assert.ok(!/官方模考|单元抽查/.test(html), '数字/字符串被渲染成了幽灵成绩记录');
  assert.ok(/还没有模考或抽查记录/.test(html), '没有有效记录时没有落空态');
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

test('错题本：成绩模式写成大写 MOCK 时，来源仍标成模考', () => {
  const store = { tdsat_exam_suite_results_v1: JSON.stringify([{
    date: 1700000000000, mode: 'MOCK', total: 2, correct: 1,
    detail: [{ id: 'U1-01', given: 'B', correct: false }],
  }]) };
  let threw = null, els = null;
  try { els = boot(['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js', 'wrong-page.js'], store).els; }
  catch (e) { threw = e; }
  assert.strictEqual(threw, null, '大写 MOCK 打崩错题本：' + (threw && threw.message));
  const html = els && els.wrongList ? els.wrongList.innerHTML : '';
  assert.ok(/模考/.test(html), '大写 MOCK 的模考错题没有标成模考');
  assert.ok(!/考试练习/.test(html), '大写 MOCK 被降级成「考试练习」');
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

test('exam.js 成绩页过滤 detail/report 里的数组条目，不画 Q?/— 幽灵行', () => {
  const s = fs.readFileSync(path.join(ROOT, 'exam.js'), 'utf8');
  assert.ok(/const isRec = v => !!v && typeof v === 'object' && !Array\.isArray\(v\)/.test(s), 'exam.js 缺少普通对象判定器');
  assert.ok(!/asArr\(r\.detail\)\.filter\(d => d && typeof d === 'object'\)/.test(s), 'detail 还接受数组条目');
  assert.ok((s.match(/filter\(isRec\)/g) || []).length >= 6, 'detail/report 的条目没有统一走 isRec');
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

test('记录页：抽查未做完档案只有 unitId 时，标题仍标出 U3', () => {
  const store = {
    tdsat_exam_suite_results_v1: JSON.stringify([]),
    tdsat_exam_suite_abandoned_v1: JSON.stringify([{
      date: 1700000000000, startedAt: 1700000000000, mode: 'quiz', unitId: 3,
      finished: false, answered: 5, total: 22,
    }]),
  };
  let threw = null, els = null;
  try { els = boot(['history-page.js'], store).els; } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '抽查未做完记录打崩：' + (threw && threw.message));
  const html = String(els && els.histList ? els.histList.innerHTML : '');
  assert.ok(/单元抽查 · U3/.test(html), '只有 unitId 的抽查标题没标出 U3');
});

test('记录页：抽查「继续这卷」必须带 unit，不能把 U3 存档带回 U1', () => {
  const store = {
    tdsat_exam_suite_results_v1: JSON.stringify([]),
    tdsat_exam_suite_abandoned_v1: JSON.stringify([{
      date: 1700000000000, startedAt: 1700000000000, mode: 'quiz', unitId: 3,
      finished: false, answered: 5, total: 22,
    }]),
    tdsat_exam_suite_session_v1: JSON.stringify({
      mode: 'quiz', unitId: 3, startedAt: 1700000000000, finished: false,
    }),
  };
  let threw = null, els = null;
  try { els = boot(['history-page.js'], store).els; } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '抽查未做完记录打崩：' + (threw && threw.message));
  const html = String(els && els.histList ? els.histList.innerHTML : '');
  assert.ok(/href="exam\.html\?mode=quiz&unit=3"/.test(html), '「继续这卷」没带 unit=3');
  assert.ok(!/href="exam\.html\?mode=quiz"/.test(html), '「继续这卷」落到默认 U1');
});

test('记录页：旧记录缺 correct/total 时从 detail 现算，不把 50% 显示成 0%', () => {
  const store = {
    tdsat_exam_suite_results_v1: JSON.stringify([{
      date: 1700000000000, mode: 'quiz', unit: '1.1', total: 2,
      detail: [{ id: 'TD-11-01', correct: true }, { id: 'TD-11-02', correct: false }],
    }]),
  };
  let threw = null, els = null;
  try { els = boot(['history-page.js'], store).els; } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '缺 correct 的记录打崩：' + (threw && threw.message));
  const html = String(els && els.histList ? els.histList.innerHTML : '');
  assert.ok(/50%/.test(html), 'detail 里的 50% 没有被算出来');
  assert.ok(/答对 <b>1 \/ 2<\/b>/.test(html), '答对题数仍按 0 显示');
});

test('记录页：correct 大于 total / total 小于 detail 时夹成可信分数，不显示 150%', () => {
  const store = {
    tdsat_exam_suite_results_v1: JSON.stringify([{
      date: 1700000000000, mode: 'quiz', total: 2, correct: 3,
      detail: [{ id: 'TD-11-01', correct: true }, { id: 'TD-11-02', correct: false }],
    }]),
  };
  let threw = null, els = null;
  try { els = boot(['history-page.js'], store).els; } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '坏分数记录打崩记录页：' + (threw && threw.message));
  const html = String(els && els.histList ? els.histList.innerHTML : '');
  assert.ok(!/150%/.test(html), 'correct 大于 total 仍显示 150%');
  assert.ok(/50%/.test(html), '有逐题明细时应按明细算成 50%');
  assert.ok(/答对 <b>1 \/ 2<\/b>/.test(html), '坏 correct 没有回落到明细题数');
});

test('记录页：模考 scaled 超出 200–800 时不当真，不显示「999 / 800」', () => {
  const store = {
    tdsat_exam_suite_results_v1: JSON.stringify([{
      date: 1700000000000, mode: 'mock', total: 2, correct: 1,
      estimate: { scaled: 999 },
      detail: [{ id: 'TD-11-01', correct: true }, { id: 'TD-11-02', correct: false }],
    }]),
  };
  let threw = null, els = null;
  try { els = boot(['history-page.js'], store).els; } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '坏 scaled 记录打崩记录页：' + (threw && threw.message));
  const html = String(els && els.histList ? els.histList.innerHTML : '');
  assert.ok(!/999 \/ 800/.test(html), '越界 scaled 仍显示成 999 / 800');
  assert.ok(/50%/.test(html), '越界 scaled 没有退回明细正确率');
});

test('记录页：模考记录没有 total/detail 时标题写全卷 44 题，不写 0 题', () => {
  const store = {
    tdsat_exam_suite_results_v1: JSON.stringify([{
      date: 1700000000000, mode: 'mock', estimate: { scaled: 700, raw: 30, rawMax: 44 },
    }]),
  };
  let threw = null, els = null;
  try { els = boot(['history-page.js'], store).els; } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '缺 total/detail 的模考记录打崩记录页：' + (threw && threw.message));
  const html = String(els && els.histList ? els.histList.innerHTML : '');
  assert.ok(/全卷 44 题/.test(html), '缺题数证据的模考没有按 44 题显示');
  assert.ok(!/全卷 0 题/.test(html), '模考标题仍写成全卷 0 题');
});

test('记录页：模考 total 被写成 999 时按 44 题封顶，不显示「全卷 999 题」', () => {
  const detail = Array.from({ length: 44 }, (_, i) => ({ id: 'TD-11-' + String(i + 1).padStart(2, '0'), correct: true }));
  const store = {
    tdsat_exam_suite_results_v1: JSON.stringify([{
      date: 1700000000000, mode: 'mock', total: 999, correct: 44,
      estimate: { scaled: 700 }, detail,
    }]),
  };
  let threw = null, els = null;
  try { els = boot(['history-page.js'], store).els; } catch (e) { threw = e; }
  assert.strictEqual(threw, null, 'total=999 的模考记录打崩记录页：' + (threw && threw.message));
  const html = String(els && els.histList ? els.histList.innerHTML : '');
  assert.ok(!/全卷 999 题/.test(html), '坏 total 仍把整卷印成 999 题');
  assert.ok(/全卷 44 题/.test(html), '模考没有按官方 44 题封顶');
  assert.ok(/答对 <b>44 \/ 44<\/b>/.test(html), '44/999 的分母没有按 44 题收敛');
});

test('记录页：finished/correct 是 Python 风格大写字符串时也按布尔处理', () => {
  const one = (finished, correct) => ({ date: 1700000000000, mode: 'mock', finished, total: 2, correct,
    detail: [{ id: 'TD-11-01', correct: 'True' }, { id: 'TD-11-02', correct: 'False' }] });
  let els = boot(['history-page.js'], { tdsat_exam_suite_results_v1: JSON.stringify([one('False', 1)]) }).els;
  const unfinished = String(els.histList.innerHTML);
  assert.ok(/未交卷/.test(unfinished), 'finished:"False" 被当成已交卷，没有显示未交卷');
  assert.ok(!/全卷 2 题/.test(unfinished), 'finished:"False" 的记录仍被印成正式成绩');

  els = boot(['history-page.js'], { tdsat_exam_suite_results_v1: JSON.stringify([one('True', 1)]) }).els;
  const finished = String(els.histList.innerHTML);
  assert.ok(/50%/.test(finished), 'correct:"True" 没有按答对计数，正确率算错');
  assert.ok((finished.match(/hist-wrong-row/g) || []).length === 1, '大写 correct 让错题行数量错误');
});

test('记录页：void 作废档案不能当正式成绩显示 0 分和整卷错题', () => {
  const store = {
    tdsat_exam_suite_results_v1: JSON.stringify([{
      date: 1700000000000, mode: 'mock', void: true, reason: 'invalid',
      total: 22, answered: 5, elapsed: 60, detail: [{ id: 'TD-11-01', given: 'B' }, { id: 'TD-11-02', given: '' }],
    }]),
  };
  let threw = null, els = null;
  try { els = boot(['history-page.js'], store).els; } catch (e) { threw = e; }
  assert.strictEqual(threw, null, 'void 记录打崩记录页：' + (threw && threw.message));
  const html = String(els && els.histList ? els.histList.innerHTML : '');
  assert.ok(/未做完/.test(html), 'void 档案没有显示为未做完');
  assert.ok(!/答对 <b>0 \/ 22<\/b>/.test(html), 'void 档案被当成 0 分正式成绩');
  assert.ok(!/错题（2）/.test(html), 'void 档案把未判分题全列成错题');
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

test('常规错题记录里作答是对象时，不把 [object Object] 印到「你的答案」', () => {
  const store = {
    tdsat_app_v1: JSON.stringify({ sections: { L1: { answers: { 'U1-01': { v: { x: 1 }, correct: false, ts: 1 } } } }, last: null }),
  };
  let threw = null, els = null;
  try { els = boot(['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js', 'wrong-page.js'], store).els; }
  catch (e) { threw = e; }
  assert.strictEqual(threw, null, '常规错题的对象作答打崩：' + (threw && threw.message));
  assert.ok(els && els.wrongList && els.wrongList.innerHTML.length > 0, '常规错题没画出来');
  assert.ok(!/\[object Object\]/.test(els.wrongList.innerHTML), '常规错题出现 [object Object]');
  assert.ok(/未作答/.test(els.wrongList.innerHTML), '对象作答没有降级成未作答');
});

test('导入项 key 归一后必须实际用于卡片 id，不能再拼原始对象', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'wrong-page.js'), 'utf8');
  assert.match(src, /var impMatch=plainText\(it\.matchId\),itemKey=plainText\(it\.key\)/,
    'key 必须先进 plainText');
  assert.match(src, /id:'IMP-'\+\(itemKey\|\|i\)/,
    '卡片 id 必须用归一后的 itemKey；只用变量不接线等于没修');
});

test('记录页：priority 条目是数组时不能画出一条字段全「—」的补强行', () => {
  const store = {
    tdsat_exam_suite_results_v1: JSON.stringify([{
      date: 1, mode: 'mock', total: 22, correct: 5, elapsed: 60, detail: [],
      report: { priority: [[]] }, estimate: {},
    }]),
  };
  let threw = null, els = null;
  try { els = boot(['history-page.js'], store).els; } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '数组 priority 打崩记录页：' + (threw && threw.message));
  assert.ok(!/hist-prio-row/.test(els.histList.innerHTML), '数组 priority 被画成了补强行');
  assert.ok(/暂无补强建议/.test(els.histList.innerHTML), '没有有效 priority 时应显示空态');
});

test('错题本正确答案为数字 0 时不能被 q.answer||\'\' 吞成未作答', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'wrong-page.js'), 'utf8');
  assert.ok(!/String\(q\.answer\|\|''\)/.test(src), 'stillWrong 还在用 String(q.answer||\'\')');
  assert.match(src, /q\.answer!=null\?q\.answer:\(q\.value!=null/, 'analysis 的正确答案回退应显式判 null');
  assert.ok(!/String\(a\.v\|\|''\)/.test(src), '讲义错题作答 0 又被 || 吞掉');
});

test('导入错题：readOnly 是字符串 "false" 时不能当只读卡', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'wrong-page.js'), 'utf8');
  assert.match(src, /isTrueFlag\(it\.readOnly\)/, 'readOnly 必须做真值归一');
  assert.ok(!/!!it\.readOnly/.test(src), '!! 会把字符串 false 当只读');
});

test('记录页：旧讲义成绩 detail 缺 answer 时回查 JY 题库补正确答案', () => {
  const jyWin = {};
  new Function('window', fs.readFileSync(path.join(ROOT, 'data/jiangyi.js'), 'utf8'))(jyWin);
  const q = (jyWin.JY_BANK || []).find(x => x && x.answer);
  assert.ok(q, '讲义题库没有带答案的题');
  const store = { tdsat_exam_suite_results_v1: JSON.stringify([{
    mode: 'jiangyi', date: 1700000000000, total: 1, correct: 0,
    detail: [{ id: q.id, given: 'B', correct: false, type: q.type }],
  }]) };
  let threw = null, els = null;
  try { els = boot(['data/jiangyi.js', 'data/questions.js', 'history-page.js'], store).els; }
  catch (e) { threw = e; }
  assert.strictEqual(threw, null, '讲义旧成绩打崩记录页：' + (threw && threw.message));
  const html = els && els.histList ? els.histList.innerHTML : '';
  assert.ok(!/正确 <i>—<\/i>/.test(html), '旧讲义错题行仍显示「正确 —」');
  assert.ok(html.indexOf(escHtml(q.answer)) >= 0, '记录页没有用 JY 题库补出正确答案');
  function escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
});


test('成绩 detail 的 given 是对象/空值时，错题本不生成幽灵卡', () => {
  const store = { tdsat_exam_suite_results_v1: JSON.stringify([{
    date: 1700000000000, mode: 'mock', total: 2, correct: 0, elapsed: 60,
    detail: [
      { id: 'TD-11-01', given: { x: 1 }, correct: false },
      { id: 'TD-11-02', given: '', correct: false },
    ], report: {},
  }]) };
  let threw = null, els = null;
  try { els = boot(['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js', 'wrong-page.js'], store).els; }
  catch (e) { threw = e; }
  assert.strictEqual(threw, null, '坏成绩 detail 打崩错题本：' + (threw && threw.message));
  const html = els && els.wrongList ? els.wrongList.innerHTML : '';
  assert.ok(!/TD-11-01|TD-11-02/.test(html), '对象/空 given 被收成幽灵错题卡');
});


test('错题本 plainText 不把布尔写成 true/false 文案', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'wrong-page.js'), 'utf8');
  assert.match(src, /typeof v==='object'\|\|typeof v==='boolean'/, 'plainText 缺少布尔排除');
});

test('常规错题记录 correct 是 Python 风格 "False" 时仍进错题本', () => {
  const store = {
    tdsat_app_v1: JSON.stringify({ sections: { '1.1': { answers: { 'TD-11-01': { v: 'A', correct: 'False', ts: 1 } } } }, last: null }),
  };
  let threw = null, els = null;
  try { els = boot(['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js', 'wrong-page.js'], store).els; }
  catch (e) { threw = e; }
  assert.strictEqual(threw, null, '大写 False 打崩错题本：' + (threw && threw.message));
  assert.ok(els && /TD-11-01|1\.1/.test(els.wrongList.innerHTML), 'correct:"False" 的错题没有进错题本');
});

test('练习统计：correct 是 "True" 时算答对，"False" 时算答错', () => {
  const store = {
    tdsat_app_v1: JSON.stringify({ sections: { '1.1': { answers: {
      'TD-11-01': { v: 'C', correct: 'True', ts: 1 },
      'TD-11-02': { v: 'A', correct: 'False', ts: 2 },
    } } }, last: null }),
  };
  const box = boot(['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js'], store);
  const stats = box.sandbox.window.TD_APP.stats('1.1');
  assert.equal(stats.answered, 2, '两道题没有都算已答');
  assert.equal(stats.correct, 1, '大写 True 没有被算成答对');
  assert.equal(stats.wrong, 1, '大写 False 没有被算成答错');
});

test('图片导入撤销只覆盖最近一批，不是整页生命周期', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'image-import.js'), 'utf8');
  const checked = src.slice(src.indexOf('function importChecked('), src.indexOf('function finderRender('));
  const singleStart = src.indexOf('function importSingle(');
  const single = src.slice(singleStart, singleStart + 1400);
  /* 默认入口仍要在开始前清空上一批；多题拆分/常规导入需要沿用同一批时
     由 keepBatch 显式跳过，不能删掉默认清理逻辑。 */
  assert.ok(checked.indexOf('if (!keepBatch) beginBatch();') > -1, 'importChecked 默认入口没有清空上一批撤销清单');
  assert.ok(single.indexOf('if (!keepBatch) beginBatch();') > -1, 'importSingle 默认入口没有清空上一批撤销清单');
});

test('记录页：单元抽查 total 被写成 999 时封顶 30，不印 0 / 999', () => {
  const store = {
    tdsat_exam_suite_results_v1: JSON.stringify([{
      date: 1700000000000, mode: 'quiz', finished: true, total: 999, correct: 0,
      detail: [], report: {},
    }]),
  };
  const els = boot(['history-page.js'], store).els;
  assert.ok(/0 \/ 30/.test(els.histList.innerHTML), '抽查 999 没有被封顶到 30');
  assert.ok(!/999/.test(els.histList.innerHTML), '记录页仍印出 999 题');
});

test('成绩页：抽查 total 999 也按明细/30 封顶', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'exam.js'), 'utf8');
  assert.match(src, /MODE === 'quiz' && total > 30/, '成绩页没有抽查 30 题封顶');
});

test('记录页：模考 mode 写成大写 MOCK 时仍按 44 题封顶并标成模考', () => {
  const detail = Array.from({ length: 44 }, (_, i) => ({ id: 'TD-11-' + String(i + 1).padStart(2, '0'), correct: true }));
  const store = {
    tdsat_exam_suite_results_v1: JSON.stringify([{
      date: 1700000000000, mode: 'MOCK', total: 999, correct: 44, detail,
    }]),
  };
  let threw = null, els = null;
  try { els = boot(['history-page.js'], store).els; } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '大写 MOCK 记录打崩记录页：' + (threw && threw.message));
  const html = String(els && els.histList ? els.histList.innerHTML : '');
  assert.ok(!/全卷 999 题/.test(html), '大写 MOCK 的坏 total 仍印成 999 题');
  assert.ok(/全卷 44 题/.test(html), '大写 MOCK 没有按官方 44 题封顶');
  assert.ok(/100%/.test(html), '大写 MOCK 的正确率没有按 44 题重算');
});

test('记录页：刚交卷但未做完档案没清掉时，不再重复显示「未做完」', () => {
  const store = {
    tdsat_exam_suite_results_v1: JSON.stringify([]),
    tdsat_exam_suite_abandoned_v1: JSON.stringify([{
      date: 1700000000000, startedAt: 1700000000000, mode: 'quiz', unitId: 3,
      finished: false, answered: 5, total: 22,
    }]),
    tdsat_exam_suite_session_v1: JSON.stringify({
      mode: 'QUIZ', unitId: 3, startedAt: 1700000000000, finished: true,
    }),
  };
  let threw = null, els = null;
  try { els = boot(['history-page.js'], store).els; } catch (e) { threw = e; }
  assert.strictEqual(threw, null, '记录页被已交卷会话打崩：' + (threw && threw.message));
  const html = String(els && els.histList ? els.histList.innerHTML : '');
  assert.ok(!/未做完|继续这卷/.test(html), '已交卷的会话仍显示未做完档案，看起来像重复记录');
});

test('记录页把刚交卷卷的残留未做完档案当场补删，而不是只隐藏', () => {
  const fs = require('node:fs'), path = require('node:path');
  const hist = fs.readFileSync(path.join(__dirname, '..', 'history-page.js'), 'utf8');
  assert.match(hist, /abandoned\.length !== abandonedRaw\.length[\s\S]*save\(ABANDONED, abandoned\)/, '记录页只隐藏不补删，换卷后残留档案会再次冒出来');
});

test('同一卷的旧大写 mode 未被新未做完档案重复压入', () => {
  const fs = require('node:fs'), path = require('node:path');
  const exam = fs.readFileSync(path.join(__dirname, '..', 'exam.js'), 'utf8');
  assert.match(exam, /const sameMode = x =>[\s\S]*?findIndex\(x =>[^\n]*sameMode\(x\)/, 'archiveAbandoned 仍按大小写严格比较，会压出两条未做完');
});

test('留档写盘失败后不能开新卷覆盖唯一原会话', () => {
  const fs = require('node:fs'), path = require('node:path');
  const exam = fs.readFileSync(path.join(__dirname, '..', 'exam.js'), 'utf8');
  assert.match(exam, /if \(preserveSession\)[\s\S]*?kept = load\(KEY_SESSION\)[\s\S]*?return;/, 'Start 没有挡住会覆盖原会话的新卷');
  assert.match(exam, /salvageThenClear\(S, 'runtime'\)[\s\S]*?preserveSession = true/, 'runtimeVoid 留档失败后没有锁住原会话');
  assert.match(exam, /const canClear = started[\s\S]*?preserveSession = true/, 'recoverInvalid 留档失败后没有锁住原会话');
});

test('大写 mode 的坏存档也要被留档清理，不能当成“别的模式”放过', () => {
  const fs = require('node:fs'), path = require('node:path');
  const exam = fs.readFileSync(path.join(__dirname, '..', 'exam.js'), 'utf8');
  assert.match(exam, /const sameSavedMode = v =>[\s\S]*?if \(saved && sameSavedMode\(saved\.mode\)\)/, 'recoverInvalid 仍按大小写严格比较 mode');
  assert.match(exam, /savedModeNorm === 'quiz'[\s\S]*?Number\(session\.unitId\)/, '大写 QUIZ 留档没有沿用原 unitId');
});
