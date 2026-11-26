/* 守门：仓库里不许留 Git 冲突标记。
   事故背景（2026-11-26）：一次变基冲突后 `git add -A '*.html'` 把 `<<<<<<< HEAD` 一起提交，
   首页/练习/模考/错题/讲义/记录六张页面与 sw.js 全部带标记；页面仍能渲染，
   但 sw.js 解析失败 → 每页控制台报 ServiceWorker 注册失败，离线缓存全废。
   这个测试就是让这种「能跑但已经烂了」的提交当场红。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const EXT = new Set(['.js', '.mjs', '.html', '.css', '.json', '.md']);
const SKIP = new Set(['node_modules', '.git', 'shots-live', 'shots-live2']);

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (EXT.has(path.extname(name))) out.push(p);
  }
  return out;
}

test('仓库无 Git 冲突标记（<<<<<<< / ======= / >>>>>>>）', () => {
  const files = walk(ROOT, []);
  const hits = [];
  for (const f of files) {
    const s = fs.readFileSync(f, 'utf8');
    /* 只看行首标记，避免误伤文档里引用的示例；三者成对出现才算 */
    if (/^<<<<<<< /m.test(s) || /^>>>>>>> /m.test(s)) hits.push(path.relative(ROOT, f));
  }
  assert.deepStrictEqual(hits, [], '这些文件带冲突标记：' + hits.join('、'));
});

test('sw.js 能被 JS 引擎解析（解析失败 = 全站 SW 注册失败）', () => {
  const r = spawnSync(process.execPath, ['--check', path.join(ROOT, 'sw.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, 'sw.js 语法错误：' + (r.stderr || '').split('\n').slice(0, 4).join(' '));
});
