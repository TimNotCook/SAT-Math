/* JY4「教材原题」子组路由回归（不依赖真实题库数据，用 9 题 fixture 锁接口）：
   - 子组单独成组，不计入 JY4 官方小节题数
   - 来源标签走「练习册 P… #…」，不写成讲义页码
   - 子组能独立交卷、出结果
   真实数据的 9 题由开发者在 data/jiangyi.js 落地后自动进入同一路由。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function boot(extra) {
  const store = {};
  const sandbox = {
    console,
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    window: {}, URLSearchParams, navigator: { language: 'zh' }, setTimeout, addEventListener() {}
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'data/jiangyi_figures.js'), 'utf8'), sandbox);
  sandbox.JY_SECTIONS = extra.sections;
  sandbox.JY_BANK = extra.questions;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'jiangyi-core.js'), 'utf8'), sandbox);
  return sandbox.window.TD_JY;
}

const textbook = Array.from({ length: 9 }, (_, i) => ({
  id: 'JY4-0' + (47 + i), unit: 4, section: i < 5 ? '4.1' : '4.2', no: i + 2,
  page: 200 + i, source: '练习册 P' + (200 + i) + ' #' + (i + 2),
  stem: 'Textbook original question ' + (i + 1), choices: ['A', 'B', 'C', 'D'],
  answer: ['D', '164', 'D', 'D', '127', 'A', '65', 'C', 'A'][i],
  type: 'mcq'
}));

const official = [{
  id: 'JY4-001', unit: 4, section: '4.1', no: 1, page: 190,
  source: '讲义 p190 #1', stem: 'Official handout question', choices: ['A', 'B', 'C', 'D'], answer: 'A'
}];

const sections = [
  { section: '4.1', unit: 4, unitCn: 'U4 Geometry and Trigonometry', cn: '直线与角', declared: 1, pages: [188, 192], answerPage: 195 },
  { section: '4.2', unit: 4, unitCn: 'U4 Geometry and Trigonometry', cn: '三角形与圆', declared: 1, pages: [193, 199], answerPage: 196 }
];

test('教材原题单独成组：9 题、标签固定、不进官方小节', () => {
  const J = boot({ sections, questions: official.concat(textbook) });
  assert.strictEqual(J.TB_GROUP.label, 'Unit 4・教材原题（练习册 P200–207）');
  assert.strictEqual(J.groupQuestions('JY4').length, 9);
  assert.strictEqual(J.questionsOf('JY4', 'TB4').length, 9);
  assert.ok(!J.sectionsOf('JY4').includes('TB4'), 'TB4 不能出现在官方小节列表');
  assert.strictEqual(J.boardStats('JY4').total, 1, 'JY4 官方计数只算官方小节题');
  assert.strictEqual(J.groupStats('JY4').total, 9);
});

test('来源胶囊：教材原题写练习册原页，官方题仍写讲义页码', () => {
  const J = boot({ sections, questions: official.concat(textbook) });
  const q = J.BY_ID['JY4-047'];
  assert.strictEqual(J.sourceLabel(q), '练习册 P200 #2');
  assert.strictEqual(J.sourceLabel(J.BY_ID['JY4-001']), '4.1 · p190 #1');
});

test('子组可独立交卷，记录 mode=jiangyi、section=TB4', () => {
  const J = boot({ sections, questions: official.concat(textbook) });
  const rec = J.submitSection('JY4', 'TB4');
  assert.ok(rec, '子组交卷应成功');
  assert.strictEqual(rec.mode, 'jiangyi');
  assert.strictEqual(rec.section, 'TB4');
  assert.strictEqual(rec.total, 9);
});

test('数据自检不会把练习册来源判成讲义 source 违规', () => {
  const J = boot({ sections, questions: official.concat(textbook) });
  const issues = J.audit().filter(x => x.rule === 'source' || x.rule === 'source-textbook');
  assert.strictEqual(issues.length, 0, JSON.stringify(issues));
});
