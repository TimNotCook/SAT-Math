/* 写盘失败不能把当前作答从内存里抹掉。
   事故面：writeDisk() 无论 localStorage.setItem 成功与否都 syncFromDisk(st)，
   配额满/无痕只读时 setItem 抛错后 S 被重置回旧盘，刚选的那道题静默消失；
   save() 也没有返回值，导入流程无法知道本机作答没落盘。
   这里直接跑真实 app-core，注入 setItem 抛错验证。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function boot(seed) {
  const store = seed ? { tdsat_app_v1: JSON.stringify(seed) } : {};
  let denyWrites = false;
  const sandbox = {
    console,
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => {
        if (denyWrites) throw new Error('QuotaExceededError');
        store[k] = String(v);
      },
      removeItem: k => { delete store[k]; },
    },
    location: { search: '', hash: '', pathname: '/drill.html' },
    document: {
      getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
      addEventListener() {},
      createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {}, setAttribute() {} }),
    },
    window: {}, URLSearchParams, navigator: { language: 'zh' }, setTimeout, addEventListener() {},
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of ['data/questions.js', 'data/aliases.js', 'grade-core.js', 'app-core.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox);
  }
  return { A: sandbox.window.TD_APP, store, setDenyWrites: v => { denyWrites = v; } };
}

test('setItem 抛错时刚选的答案仍留在内存里，不被旧盘覆盖', () => {
  const { A, setDenyWrites } = boot(null);
  setDenyWrites(true);
  A.setAnswer('2.7.T17', 'R03-002', 'A');
  const st = A.secState('2.7.T17');
  assert.ok(st && st.answers['R03-002'], '写盘失败后答案从内存消失，刷新前页面显示也会被重置');
});

test('save() 明确返回写盘失败，成功时返回 true', () => {
  const { A, store, setDenyWrites } = boot(null);
  setDenyWrites(true);
  assert.equal(A.save(), false, '写盘失败必须让调用方知道');
  setDenyWrites(false);
  assert.equal(A.save(), true, '恢复可写后重试应成功');
  assert.ok(store.tdsat_app_v1, '成功路径应真正落盘');
});

test('写盘失败后恢复可写，下一次 save() 仍能补写未落盘的答案', () => {
  const { A, store, setDenyWrites } = boot(null);
  setDenyWrites(true);
  A.setAnswer('2.7.T17', 'R03-002', 'A');
  setDenyWrites(false);
  assert.equal(A.save(), true, '恢复可写后没有把内存里的答案补写出去');
  const disk = JSON.parse(store.tdsat_app_v1);
  assert.ok(disk.sections['2.7.T17'].answers['R03-002'], '磁盘上仍缺刚才那道题');
});

test('导入错题在 A.save() 失败时会明确告知本机作答未落盘', () => {
  const src = fs.readFileSync(path.join(ROOT, 'wrong-page.js'), 'utf8');
  assert.ok(src.includes('if(!A.save())localWriteFailed=true;'), 'importData 没检查 A.save() 的返回');
  assert.ok(src.includes('错题仓库已保存，但本机作答写入失败'), '保存失败仍只显示“已导入”，用户不知道刷新会丢进度');
});
