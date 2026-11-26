const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function loadBank() {
  const sandbox = { window: {} };
  new Function('window', fs.readFileSync(path.join(ROOT, 'data/questions.js'), 'utf8'))(sandbox.window);
  return sandbox.window.TD_BANK;
}
const BANK = loadBank();
const byId = id => BANK.questions.find(q => q.id === id);

/* t031 答案补丁 79 条：id -> 落库答案（答案键对表 + 题干复核）。
   SP1-019 补丁对位错位（3/2 属邻题 SP1-018），代数复核 g/k=2/7，按 2/7 落库。 */
const EXPECTED = {
  "R04-072": "D",
  "R04-077": "121",
  "SP1-004": ".9411, .9412, 16/17",
  "SP1-005": "-.9333, -14/15",
  "SP1-006": "403",
  "SP1-007": "1/7",
  "SP1-009": "2",
  "SP1-010": "8",
  "SP1-011": "6",
  "SP1-012": "3.5",
  "SP1-013": "10",
  "SP1-014": "-34",
  "SP1-015": "-28",
  "SP1-016": "18",
  "SP1-018": "3/2",
  "SP1-019": "2/7",
  "SP1-026": "-22",
  "SP1-027": "-.3267, -.3266, -.326, -.327",
  "SP1-028": "144",
  "SP1-032": "11",
  "SP1-033": "20",
  "SP1-034": "-113",
  "SP1-035": "14",
  "SP1-036": "-26",
  "SP1-037": "3/2",
  "SP1-038": "80",
  "SP1-039": "-5",
  "SP1-040": "35",
  "SP1-041": "20",
  "SP1-042": "1.8, 9/5",
  "SP1-043": "3",
  "SP1-044": "1677",
  "SP1-045": "71",
  "SP1-046": "11",
  "SP1-048": "192",
  "SP1-050": "62",
  "SP1-051": "45/8",
  "SP1-053": "65/4",
  "SP1-054": "172/7",
  "SP1-055": "-2",
  "SP1-056": "74",
  "SP1-057": "24/7",
  "SP1-063": "16.38",
  "SP1-064": "515",
  "SP1-065": "35",
  "SP1-066": "0.04",
  "SP1-070": "12.8",
  "SP1-071": "1.25",
  "SP1-072": "-100",
  "SP1-073": "189/5",
  "SP1-074": ".5, 1/2",
  "SP1-075": "35",
  "SP1-076": ".25, 1/4",
  "SP1-077": "5/7",
  "SP1-078": "-10",
  "SP1-079": "24",
  "SP1-082": "3/4",
  "SP1-085": "6/5",
  "SP1-087": "-4",
  "SP1-088": "2/43",
  "SP1-089": "33",
  "SP1-091": "30",
  "SP1-092": "19/4",
  "SP1-093": "7/2",
  "SP1-094": "-12",
  "SP1-095": "2/7",
  "SP1-096": "-192 or -204",
  "SP1-097": "168",
  "SP1-098": "34",
  "SP1-104": "D",
  "SP1-113": "26",
  "SP1-115": "28",
  "SP1-117": "22",
  "SP1-119": "-14",
  "SP1-120": "-25",
  "SP1-121": "33",
  "SP1-122": "20",
  "SP1-123": "182",
  "SR-163": "A",
};

test('t031 补丁 79 条 answer 全部等于落库值', () => {
  for (const [id, ans] of Object.entries(EXPECTED)) {
    const q = byId(id);
    assert.ok(q, id + ' 不存在');
    assert.ok(typeof q.answer === 'string' && q.answer.length > 0, id + ' 答案仍为空');
    assert.strictEqual(q.answer, ans, id + ' answer=' + JSON.stringify(q.answer) + '，应为 ' + JSON.stringify(ans));
  }
});

test('抽查六条关键订正/回填', () => {
  const spot = {
    'SP1-104': 'D',      /* C→D：步行更快 ⇔ 20<w+5 */
    'SR-163': 'A',      /* D→A：常数项 18b=(2b)·9 ⇒ 因子 3x+9 */
    'SP1-004': '.9411, .9412, 16/17',
    'SP1-042': '1.8, 9/5',
    'SP1-063': '16.38',
    'SP1-064': '515',
  };
  for (const [id, ans] of Object.entries(spot)) {
    assert.strictEqual(byId(id).answer, ans, id + ' 抽查值不符');
  }
});
