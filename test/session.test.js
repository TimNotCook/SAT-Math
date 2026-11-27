'use strict';
/* 存档兼容层单测（纯函数，零依赖，node --test test/session.test.js）
 *
 * 覆盖的是「规则」而不是「补丁」：
 *   - 旧存档缺 m1Size 时，按官方 22/22 结构确定性重建，而不是猜一个区间
 *   - 无法重建的形态一律判过期，不允许返回一个「看起来对」的错区间
 *   - 题号区间在合法会话上永远非空（of 0 的根因）
 *   - 刷新回到开始页时的两种超时（模块一到期 / 总时间到期）
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const CORE_SRC = fs.readFileSync(path.join(ROOT, 'exam-core.js'), 'utf8');
const GRADE_SRC = fs.readFileSync(path.join(ROOT, 'grade-core.js'), 'utf8');

/* exam-core.js 依赖 window.TDGrade（判分唯一实现），在沙箱里按真实装配顺序加载。 */
function loadCore() {
  const sandbox = { Math, String, Number, Array, Object, JSON, Date, isFinite, window: {}, console };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(GRADE_SRC, sandbox, { filename: 'grade-core.js' });
  vm.runInContext(CORE_SRC, sandbox, { filename: 'exam-core.js' });
  const C = sandbox.window.TD_EXAM_CORE || sandbox.TD_EXAM_CORE;
  assert.ok(C && C.parseSession && C.sessionRange, 'exam-core.js 未暴露存档纯函数');
  return C;
}
const C = loadCore();

test('unitWrongIds 不被 null / 非数组的 history.detail 打崩', () => {
  const bank = [{ id: 'q-a', unit: 1 }, { id: 'q-b', unit: 1 }];
  const state = {
    wrong: {},
    history: [null, 5, { detail: null }, { detail: 'nope' },
      { detail: [null, [], { id: 'q-a', correct: 'false' }, { id: 'q-a', correct: false }, { id: 'q-b', correct: 'true' }] }],
  };
  assert.deepStrictEqual(C.unitWrongIds(bank, state, 1), ['q-a'],
    '只有 detail 里真正 correct:false（含字符串 "false"）的题目才算单元错题');
});

const PER = C.OFFICIAL.questionsPerModule;          // 22

function inst(i, mod) { return { uid: 'M' + (mod || 1) + '-' + i, id: 'Q' + i, module: mod || 1 }; }
function paper(n, mod) {
  return Array.from({ length: n }, (_, i) => inst(i, mod || (i < PER ? 1 : 2)));
}
function baseSave(over) {
  return Object.assign({
    mode: 'mock', sub: null, unitId: null, stage: 'answer', paper: paper(PER),
    answers: {}, idx: 0, module: 1, path: null,
    m2Options: { hard: paper(4, 2), easy: paper(4, 2) },
    durationSec: 4200, startedAt: Date.now() - 60 * 1000, endsAt: Date.now() + 69 * 60 * 1000,
    moduleEndsAt: Date.now() + 34 * 60 * 1000, finished: false, locked: false
  }, over || {});
}

describe('parseSession：作答值必须是可判分的字符串', () => {
  test('对象/数组作答清空，数字作答转字符串，不留 [object Object]', () => {
    const s = baseSave();
    s.answers['M1-1'] = { v: { x: 1 }, marked: true, spent: 5 };
    s.answers['M1-2'] = { v: ['A'], marked: false, spent: 0 };
    s.answers['M1-3'] = { v: 3, marked: false, spent: 0 };
    const r = C.parseSession(s, { mode: 'mock', isQuestionId: () => true });
    assert.equal(r.status, 'ok');
    assert.equal(r.session.answers['M1-1'].v, '');
    assert.equal(r.session.answers['M1-2'].v, '');
    assert.equal(r.session.answers['M1-3'].v, '3');
  });

  test('marked / locked / finished 是字符串 false 时按布尔 false 处理', () => {
    const s = baseSave({ finished: 'false', locked: 'false' });
    s.answers['M1-1'] = { v: 'A', marked: 'false', locked: 'false', spent: 5 };
    const r = C.parseSession(s, { mode: 'mock', isQuestionId: () => true });
    assert.equal(r.status, 'ok');
    assert.equal(r.session.answers['M1-1'].marked, false);
    assert.equal(r.session.answers['M1-1'].locked, false);
    assert.equal(r.session.finished, false);
    assert.equal(r.session.locked, false);
  });
});

describe('practiceDurationSec：旧设置里的非数字值不能产出 NaN 时长', () => {
  test('total / perQ 是字符串 x → 回落到 95 秒/题，有限且 ≥60', () => {
    const a = C.practiceDurationSec({ tmode: 'total', total: 'x' }, 24);
    const b = C.practiceDurationSec({ tmode: 'perq', perQ: 'x' }, 24);
    assert.equal(Number.isFinite(a), true);
    assert.equal(Number.isFinite(b), true);
    assert.equal(a, 24 * 95);
    assert.equal(b, 24 * 95);
  });
  test('合法设置仍按用户选择计算', () => {
    assert.equal(C.practiceDurationSec({ tmode: 'total', total: '35' }, 24), 2100);
    assert.equal(C.practiceDurationSec({ tmode: 'perq', perQ: '60' }, 24), 1440);
  });
});

describe('parseSession：单元抽查存档不得跨单元恢复', () => {
  test('Unit 1 的存档在 Unit 2 页面 → 判过期，绝不混着开考', () => {
    const s = baseSave({ mode: 'quiz', unitId: 1, paper: paper(4) });
    const r = C.parseSession(s, { mode: 'quiz', unitId: 2, isQuestionId: () => true });
    assert.equal(r.status, 'expired');
    assert.equal(r.reason, 'unit');
  });
  test('同一 unit 的存档仍可恢复', () => {
    const s = baseSave({ mode: 'quiz', unitId: 2, paper: paper(4) });
    const r = C.parseSession(s, { mode: 'quiz', unitId: 2, isQuestionId: () => true });
    assert.equal(r.status, 'ok');
  });
  test('unitId 是字符串 "2" 时归一成数字，后续严格比较不再误拒', () => {
    const s = baseSave({ mode: 'quiz', unitId: '2', paper: paper(4) });
    const r = C.parseSession(s, { mode: 'quiz', unitId: 2, isQuestionId: () => true });
    assert.equal(r.status, 'ok');
    assert.equal(r.session.unitId, 2);
  });
});

describe('parseSession：模考卷面长度与模块必须对得上', () => {
  test('44 题却标模块一 → 过期，绝不再进模块二重复拼卷', () => {
    const s = baseSave({ paper: paper(44), module: 1, m2Options: null });
    const r = C.parseSession(s, { mode: 'mock', isQuestionId: () => true });
    assert.equal(r.status, 'expired');
    assert.equal(r.reason, 'shape');
  });
  test('44 题、module 是字符串 "2" → 归一化后仍可恢复', () => {
    const s = baseSave({ paper: paper(44), module: '2', m2Options: null });
    const r = C.parseSession(s, { mode: 'mock', isQuestionId: () => true });
    assert.equal(r.status, 'ok');
    assert.equal(r.session.module, 2);
    assert.equal(r.session.m1Size, PER);
  });
});

describe('parseSession：m2Options 里的候选题必须是合法实例', () => {
  test('hard 里夹 null → 整份存档判过期，绝不拼进卷面', () => {
    const s = baseSave();
    s.m2Options.hard = [null, ...paper(3, 2)];
    const r = C.parseSession(s, { mode: 'mock' });
    assert.equal(r.status, 'expired');
    assert.equal(r.reason, 'm2-options');
    assert.equal(r.session, null);
  });
  test('easy 里夹字符串题号 → 同样判过期', () => {
    const s = baseSave();
    s.m2Options.easy = ['junk'];
    const r = C.parseSession(s, { mode: 'mock' });
    assert.equal(r.status, 'expired');
  });
  test('正常 hard/easy 候选仍可恢复', () => {
    const r = C.parseSession(baseSave(), { mode: 'mock' });
    assert.equal(r.status, 'ok');
  });
});

describe('parseSession：能重建就重建', () => {
  test('旧存档缺 m1Size / moduleEndsAt（22 题，模块一）→ 补齐为 22', () => {
    const s = baseSave();
    delete s.m1Size; delete s.moduleEndsAt;
    const r = C.parseSession(s, { mode: 'mock' });
    assert.equal(r.status, 'ok');
    assert.equal(r.session.m1Size, 22);
    assert.equal(r.session.moduleEndsAt, r.session.endsAt);
    const rg1 = C.sessionRange(r.session);
    assert.equal(rg1.lo, 0); assert.equal(rg1.hi, 21);
  });

  test('旧存档 44 题且已进模块二（缺 m1Size）→ m1Size=22，区间 22..43', () => {
    const s = baseSave({ module: 2, idx: 22, paper: paper(44) });
    delete s.m1Size;
    const r = C.parseSession(s, { mode: 'mock' });
    assert.equal(r.status, 'ok');
    const rg2 = C.sessionRange(r.session);
    assert.equal(rg2.lo, 22); assert.equal(rg2.hi, 43);
    assert.equal(r.session.idx, 22);
    assert.equal(r.session.paper.length, 44);
  });

  test('idx 越界被夹回本模块区间（模块二刷新落到第 1 题，而不是第 30 题）', () => {
    const s = baseSave({ module: 2, idx: 44, paper: paper(44) });
    const r = C.parseSession(s, { mode: 'mock' });
    assert.equal(r.status, 'ok');
    const rg = C.sessionRange(r.session);
    assert.ok(r.session.idx >= rg.lo && r.session.idx <= rg.hi);
    assert.equal(r.session.idx, 43);
    assert.equal(r.session.idx - rg.lo + 1, 22); // 44 被夹到 43 → 模块二第 22 题
  });

  test('缺作答记录时补齐，且不覆盖已锁定状态', () => {
    const s = baseSave({ answers: { 'M1-0': { v: 'A', marked: true, spent: 12, locked: true } } });
    const r = C.parseSession(s, { mode: 'mock' });
    assert.equal(r.status, 'ok');
    assert.equal(r.session.answers['M1-0'].v, 'A');
    assert.equal(r.session.answers['M1-0'].locked, true);
    assert.equal(r.session.answers['M1-1'].v, '');
  });
});

describe('parseSession：answers 是数组时重建为对象，刷新后作答不丢', () => {
  test('数组作答容器会被换成普通对象，并真正序列化', () => {
    const r = C.parseSession(baseSave({ answers: [] }), { mode: 'mock' });
    assert.equal(r.status, 'ok');
    assert.equal(Array.isArray(r.session.answers), false);
    r.session.answers['M1-0'] = { v: 'A', marked: false, spent: 1, locked: false };
    const disk = JSON.parse(JSON.stringify(r.session));
    assert.equal(disk.answers['M1-0'].v, 'A');
  });
});

describe('parseSession：不能重建就判过期，绝不猜区间', () => {
  test('paper 为空 → expired/paper-empty', () => {
    const r = C.parseSession(baseSave({ paper: [] }), { mode: 'mock' });
    assert.equal(r.status, 'expired');
    assert.equal(r.reason, 'paper-empty');
  });

  test('模块二但只有 22 题 → expired/shape（不能拿半张卷当整卷）', () => {
    const r = C.parseSession(baseSave({ module: 2 }), { mode: 'mock' });
    assert.equal(r.status, 'expired');
    assert.equal(r.reason, 'shape');
  });

  test('m1Size 被写成 30 → expired/m1，而不是退回整卷显示 of 44', () => {
    const r = C.parseSession(baseSave({ paper: paper(44), m1Size: 30 }), { mode: 'mock' });
    assert.equal(r.status, 'expired');
    assert.equal(r.reason, 'm1');
  });

  test('题目 id 已不在题库 → expired/bank', () => {
    const s = baseSave();
    s.paper[0] = Object.assign({}, s.paper[0], { id: 'NOT-IN-BANK' });
    const r = C.parseSession(s, { mode: 'mock', isQuestionId: id => id !== 'NOT-IN-BANK' });
    assert.equal(r.status, 'expired');
    assert.equal(r.reason, 'bank');
  });

  test('时钟字段缺失 → expired/clock', () => {
    const s = baseSave(); s.endsAt = 0;
    const r = C.parseSession(s, { mode: 'mock' });
    assert.equal(r.status, 'expired');
    assert.equal(r.reason, 'clock');
  });
});

describe('sessionRange：合法会话永不出现空区间', () => {
  test('模块一 / 模块二区间都是 22 题', () => {
    const m1 = C.parseSession(baseSave(), { mode: 'mock' }).session;
    const m2 = C.parseSession(baseSave({ module: 2, paper: paper(44), idx: 22 }), { mode: 'mock' }).session;
    assert.equal(C.sessionRange(m1).hi - C.sessionRange(m1).lo + 1, 22);
    assert.equal(C.sessionRange(m2).hi - C.sessionRange(m2).lo + 1, 22);
  });

  test('把 m1Size 抹成 0 → sessionRange 返回 null（由调用方作废，不给错数）', () => {
    const s = baseSave();
    s.m1Size = 0;
    assert.equal(C.sessionRange(s), null);
  });
});

describe('sessionTimeout：刷新后的两种时间到', () => {
  test('总时间走完 → total', () => {
    const s = baseSave({ endsAt: Date.now() - 1000 });
    assert.equal(C.sessionTimeout(s, Date.now()), 'total');
  });

  test('模块一到期但总时间未到 → module1（自动进模块二，不是直接出分）', () => {
    const s = baseSave({ moduleEndsAt: Date.now() - 1000, endsAt: Date.now() + 20 * 60 * 1000 });
    assert.equal(C.sessionTimeout(s, Date.now()), 'module1');
  });

  test('两个时间都没到 → 空字符串（正常恢复）', () => {
    assert.equal(C.sessionTimeout(baseSave(), Date.now()), '');
  });

  test('已交卷的会话不再判定超时', () => {
    const s = baseSave({ finished: true, endsAt: Date.now() - 1000 });
    assert.equal(C.sessionTimeout(s, Date.now()), '');
  });
});
