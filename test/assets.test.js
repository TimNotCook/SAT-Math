/* test/assets.test.js — 静态资产自检进 CI
 * 直接跑 tools/verify_assets.mjs，任何一条红都算测试失败。
 * 覆盖：六页引用存在性 / ?v= 全站唯一 / 无重复 id / sw.js VERSION 跟随构建令牌 /
 *       题库↔文本层一一对应 / 图片文件存在 / mcq 选项与 grid 标准答案完整。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('静态自检：资源引用 / 版本令牌 / 题库一致性', () => {
  const r = spawnSync(process.execPath, ['tools/verify_assets.mjs'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  assert.match(r.stdout, /PASS\s+静态自检全绿/);
});
