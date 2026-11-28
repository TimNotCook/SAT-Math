/* test/session-idx-fraction.test.js — 存档 idx 被写成小数时不能恢复成半个题号 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const CORE_SRC = fs.readFileSync(path.join(ROOT, 'exam-core.js'), 'utf8');
const GRADE_SRC = fs.readFileSync(path.join(ROOT, 'grade-core.js'), 'utf8');

function loadCore() {
  const sandbox = { Math, String, Number, Array, Object, JSON, Date, isFinite, window: {}, console };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(GRADE_SRC, sandbox, { filename: 'grade-core.js' });
  vm.runInContext(CORE_SRC, sandbox, { filename: 'exam-core.js' });
  const C = sandbox.window.TD_EXAM_CORE || sandbox.TD_EXAM_CORE;
  assert.ok(C && C.parseSession, 'exam-core.js 未暴露 parseSession');
  return C;
}
const C = loadCore();

const PER = C.OFFICIAL.questionsPerModule;
const inst = i => ({ uid: 'M1-' + i, id: 'Q' + i, module: 1 });
const paper = n => Array.from({ length: n }, (_, i) => inst(i));
function baseSave(over) {
  return Object.assign({
    mode: 'mock', sub: null, unitId: null, stage: 'answer', paper: paper(PER),
    answers: {}, idx: 0, module: 1, path: null,
    m2Options: { hard: paper(PER).map((x, i) => ({ ...x, uid: 'H' + i })), easy: paper(PER).map((x, i) => ({ ...x, uid: 'E' + i })) },
    durationSec: 4200, startedAt: Date.now() - 60 * 1000, endsAt: Date.now() + 69 * 60 * 1000,
    moduleEndsAt: Date.now() + 34 * 60 * 1000, finished: false, locked: false
  }, over || {});
}

test('parseSession：idx 是小数时夹成整数，paper[idx] 不能是 undefined', () => {
  for (const idx of [1.5, '1.9', 0.4, 21.9]) {
    const r = C.parseSession(baseSave({ idx }), { mode: 'mock', isQuestionId: () => true });
    assert.equal(r.status, 'ok', 'idx=' + idx + ' 被判过期');
    assert.ok(Number.isInteger(r.session.idx), 'idx=' + idx + ' 恢复成了非整数：' + r.session.idx);
    assert.ok(r.session.paper[r.session.idx], 'idx=' + idx + ' 指向空题：paper[' + r.session.idx + ']');
  }
});
