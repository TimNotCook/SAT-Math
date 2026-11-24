/* 讲义复习板块（编程者层）单元测试：排序、来源标签、进度统计、与现有板块隔离。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function boot(fixture) {
  const store = {};
  const sandbox = {
    window: { TD_JIANGYI: fixture },
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); }
    },
    console
  };
  sandbox.window.localStorage = sandbox.localStorage;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'grade-core.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'jiangyi-core.js'), 'utf8'), sandbox);
  return { J: sandbox.window.TD_JY, store };
}

const fixture = {
  units: [
    { id: 1, en: 'Algebra', cn: '代数', sections: [
      { id: '1.1', cn: '线性方程', expect: 2 },
      { id: '1.2', cn: '比例', expect: 1 }
    ] },
    { id: 3, en: 'Advanced Math', cn: '高等数学', sections: [{ id: '3.4', cn: '二次函数', expect: 1 }] }
  ],
  questions: [
    { id: 'JY1-002', unit: 1, section: '1.1', page: 132, no: 3, source: '讲义 p132 #3', stem: 'b', choices: ['1', '2'], answer: 'B' },
    { id: 'JY1-001', unit: 1, section: '1.1', page: 131, no: 12, source: '讲义 p131 #12', stem: 'a', choices: ['1', '2'], answer: 'A' },
    { id: 'JY1-003', unit: 1, section: '1.2', page: 133, no: 1, source: '讲义 p133 #1', stem: 'c', choices: ['1', '2'], answer: 'A' },
    { id: 'JY3-001', unit: 3, section: '3.4', page: 141, no: 5, source: '讲义 p141 #5', stem: 'd', choices: ['1', '2'], answer: 'B' }
  ]
};

test('板块内顺序：小节号 → 页码 → 页内题号', () => {
  const { J } = boot(fixture);
  assert.strictEqual(JSON.stringify(J.ALL.map(q => q.id)), JSON.stringify(['JY1-001', 'JY1-002', 'JY1-003', 'JY3-001']));
});

test('来源标签形如 3.4 · p131 #12', () => {
  const { J } = boot(fixture);
  assert.strictEqual(J.sourceLabel(J.BY_ID['JY1-001']), '1.1 · p131 #12');
  assert.strictEqual(J.sourceLabel(J.BY_ID['JY3-001']), '3.4 · p141 #5');
});

test('四个子板块固定存在，编号 JY1–JY4', () => {
  const { J } = boot(fixture);
  assert.strictEqual(JSON.stringify(J.boards().map(b => b.id)), JSON.stringify(['JY1', 'JY2', 'JY3', 'JY4']));
  assert.strictEqual(JSON.stringify(J.sectionsOf('JY1')), JSON.stringify(['1.1', '1.2']));
});

test('作答后进度/完成度按题数与对账数计算', () => {
  const { J } = boot(fixture);
  J.answerQ(J.BY_ID['JY1-001'], 'A');
  J.answerQ(J.BY_ID['JY1-002'], 'A'); // 错
  const sec = J.stats('JY1', '1.1');
  assert.strictEqual(sec.total, 2);
  assert.strictEqual(sec.answered, 2);
  assert.strictEqual(sec.correct, 1);
  assert.strictEqual(sec.complete, true);
  assert.strictEqual(sec.expect, 2);
  const board = J.boardStats('JY1');
  assert.strictEqual(board.answered, 2);
  assert.strictEqual(board.percent, 67);
});

test('对账未平会标出来（应有 N ≠ 已录 M）', () => {
  const { J } = boot(fixture);
  const sec = J.stats('JY1', '1.2');
  assert.strictEqual(sec.expect, 1);
  assert.strictEqual(sec.reconciled, true);
  const bad = boot({ units: [{ id: 1, en: 'Algebra', cn: '代数', sections: [{ id: '1.1', expect: 5 }] }], questions: fixture.questions.slice(0, 2) });
  assert.strictEqual(bad.J.stats('JY1', '1.1').reconciled, false);
});

test('交卷写 mode=jiangyi 的记录，不进教材 44 题统计口径', () => {
  const { J, store } = boot(fixture);
  J.answerQ(J.BY_ID['JY1-001'], 'A');
  const rec = J.submitSection('JY1', '1.1');
  assert.strictEqual(rec.mode, 'jiangyi');
  assert.strictEqual(rec.total, 2);
  const saved = JSON.parse(store['tdsat_exam_suite_results_v1']);
  assert.strictEqual(saved.length, 1);
  assert.strictEqual(saved[0].mode, 'jiangyi');
  assert.ok(store['tdsat_jiangyi_v1'], '状态用独立 key');
});

/* 空题干在归一化阶段就被丢弃（不会进页面），由 tools/verify_jiangyi.mjs 报；
   这里验 audit 对 source / answer / count 的判定。 */
test('audit 能同时抓 count / source / answer 三类问题', () => {
  const { J } = boot({
    units: [{ id: 1, en: 'Algebra', cn: '代数', sections: [{ id: '1.1', expect: 3 }] }],
    questions: [
      { id: 'JY1-001', unit: 1, section: '1.1', page: 131, no: 12, source: '讲义 p131 #12', stem: 'ok', choices: ['1', '2'], answer: 'A' },
      { id: 'JY1-002', unit: 1, section: '1.1', page: 131, no: 13, source: 'p131 #13', stem: 'bad', choices: ['1', '2'], answer: 'E' }
    ]
  });
  const rules = J.audit().map(x => x.rule);
  assert.ok(rules.includes('source'));
  assert.ok(rules.includes('count'));
  assert.ok(rules.includes('answer-letter'));
});
