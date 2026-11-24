/* 重复题干 alias 与内容缺口台账的守门测试：
   - aliases 不许有链（alias 指向的还得是 canonical）
   - alias 双方都得真实存在于题库/讲义
   - canonical 优先级不许倒挂（U > JY > TD > SP/SR）
   - content-gaps 的状态只允许四档 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
function load(file, key) {
  const sandbox = { window: {} };
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  new Function('window', src)(sandbox.window);
  return sandbox.window[key];
}

const ALIAS = load('data/aliases.js', 'TD_ALIAS');
const BANK = load('questions.js', 'TD_BANK').questions;
const JYBANK = fs.existsSync(path.join(ROOT, 'data/jiangyi.js')) ? load('data/jiangyi.js', 'JY_BANK') : [];
const ids = new Set([...BANK.map(q => q.id), ...JYBANK.map(q => q.id)]);

function rank(id) {
  if (/^U\d/.test(id)) return 0;
  if (/^JY/.test(id)) return 1;
  if (/^TD/.test(id)) return 2;
  return 3;
}

test('alias 无链、双方都在题库里', () => {
  for (const [from, to] of Object.entries(ALIAS)) {
    assert.ok(ids.has(from), `alias 源不存在：${from}`);
    assert.ok(ids.has(to), `alias 目标不存在：${to}`);
    assert.ok(!ALIAS[to], `alias 成链：${from} -> ${to} -> ${ALIAS[to]}（目标必须是 canonical）`);
  }
});

test('canonical 优先级不倒挂', () => {
  for (const [from, to] of Object.entries(ALIAS)) {
    assert.ok(rank(to) <= rank(from), `优先级倒挂：${from}(${rank(from)}) -> ${to}(${rank(to)})`);
  }
});

test('content-gaps 状态四档且 id 存在', () => {
  const f = path.join(ROOT, 'data/content-gaps.json');
  if (!fs.existsSync(f)) return;
  const gaps = JSON.parse(fs.readFileSync(f, 'utf8')).gaps;
  const allowed = ['待修', '待核', '原页缺印', '已核无缺'];
  for (const g of gaps) {
    assert.ok(allowed.includes(g.status), `状态非法：${g.id} ${g.status}`);
    assert.ok(ids.has(g.id), `缺口指向的题不存在：${g.id}`);
  }
});
