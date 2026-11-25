/* 题库裁定守门测试（裁定源 = docs/transcribe/bank-rulings.json，总监 2026-11-25 口径）：
   - retire/merge 目标必须真实存在，alias 必须指向活着（非 retired/merged）的 canonical；
   - hideSections 的节点必须存在且已标 hidden；
   - labels 的群组节点 cn/sub 必须与裁定一致；
   - variants 的 variantOf 必须存在（且不能是 retired/merged）；
   - 计数口径：声明层 count 合计 == 未被裁掉的题数（retired / mergedInto 不计）。
*/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RULINGS = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/transcribe/bank-rulings.json'), 'utf8'));

function loadBank() {
  const sandbox = { window: {} };
  const src = fs.readFileSync(path.join(ROOT, 'data/questions.js'), 'utf8');
  new Function('window', src)(sandbox.window);
  return sandbox.window.TD_BANK;
}
function loadAlias() {
  const sandbox = { window: {} };
  new Function('window', fs.readFileSync(path.join(ROOT, 'data/aliases.js'), 'utf8'))(sandbox.window);
  return sandbox.window.TD_ALIAS;
}

const BANK = loadBank();
const ALIAS = loadAlias();
const byId = new Map(BANK.questions.map(q => [q.id, q]));
const nodes = new Map();
for (const u of BANK.units) for (const s of (u.sections || [])) nodes.set(s.id, s);
const dead = id => { const q = byId.get(id); return !!q && !!(q.retired || q.mergedInto); };

test('retire：目标存在、标了 retired、alias 指向活着的 canonical', () => {
  for (const r of RULINGS.retire) {
    const q = byId.get(r.id);
    assert.ok(q, `retire 目标不存在：${r.id}`);
    assert.equal(q.retired, true, `${r.id} 未标 retired`);
    assert.equal(q.alias, r.alias, `${r.id} alias 与裁定不一致`);
    const to = byId.get(r.alias);
    assert.ok(to, `alias 目标不存在：${r.id} -> ${r.alias}`);
    assert.ok(!dead(r.alias), `alias 指向了已裁掉的题：${r.id} -> ${r.alias}`);
    assert.equal(ALIAS[r.id], r.alias, `data/aliases.js 缺 ${r.id} -> ${r.alias}`);
  }
});

test('merge：书内重复印的副本指向 canonical，且题干逐字相同', () => {
  for (const m of RULINGS.merge) {
    const q = byId.get(m.id);
    assert.ok(q, `merge 目标不存在：${m.id}`);
    assert.equal(q.mergedInto, m.into, `${m.id} 未标 mergedInto`);
    assert.ok(byId.get(m.into), `mergedInto 目标不存在：${m.into}`);
    assert.ok(!dead(m.into), `mergedInto 指向了已裁掉的题：${m.into}`);
    const norm = s => String(s || '').replace(/\s+/g, ' ').trim();
    assert.equal(norm(q.stem), norm(byId.get(m.into).stem), `${m.id} 与 ${m.into} 题干不再逐字相同`);
    assert.equal(ALIAS[m.id], m.into, `data/aliases.js 缺 ${m.id} -> ${m.into}`);
  }
});

test('rehome：题确实挂到了裁定的新 section', () => {
  for (const h of RULINGS.rehome) {
    const q = byId.get(h.id);
    assert.ok(q, `rehome 目标不存在：${h.id}`);
    assert.equal(q.section, h.section, `${h.id} 未改挂到 ${h.section}`);
  }
});

test('hideSections：旧板块节点存在但不是可见板块来源（标了 hidden）', () => {
  for (const s of RULINGS.hideSections) {
    const node = nodes.get(s.id);
    assert.ok(node, `hideSections 节点不存在：${s.id}`);
    assert.equal(node.hidden, true, `${s.id} 未标 hidden`);
  }
});

test('labels：群组节点显示名与裁定一致', () => {
  for (const lb of RULINGS.labels) {
    const node = nodes.get(lb.id);
    assert.ok(node, `labels 目标不存在：${lb.id}`);
    assert.equal(node.cn, lb.cn, `${lb.id} cn 与裁定不一致`);
    if (lb.sub) assert.equal(node.sub, lb.sub, `${lb.id} sub 与裁定不一致`);
  }
});

test('variants：variantOf 指向存在且活着的母题', () => {
  for (const v of RULINGS.variants) {
    const q = byId.get(v.id);
    assert.ok(q, `variants 目标不存在：${v.id}`);
    assert.equal(q.variant, true, `${v.id} 未标 variant`);
    assert.equal(q.variantOf, v.variantOf, `${v.id} variantOf 与裁定不一致`);
    assert.ok(byId.get(v.variantOf), `母题不存在：${v.variantOf}`);
    assert.ok(!dead(v.variantOf), `母题已被裁掉：${v.variantOf}`);
  }
});

test('计数口径：声明层 count 合计 == 未被裁掉的题数', () => {
  const active = BANK.questions.filter(q => !q.retired && !q.mergedInto);
  let leafSum = 0;
  for (const u of BANK.units) {
    let unitLeaf = 0;
    for (const s of (u.sections || [])) {
      if (s.isGroup) continue;
      unitLeaf += (s.count || 0);
    }
    leafSum += unitLeaf;
    assert.equal(unitLeaf, u.total, `Unit ${u.id} total 与叶子合计不一致`);
  }
  assert.equal(leafSum, active.length, '叶子 count 合计与活题数不一致（有题被漏计或被重复计）');
});
