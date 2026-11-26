/* test/tools-portability.test.js — 回归脚本不许再绑死某一台机器的浏览器
 *
 * 背景：11 个 CDP 脚本原来各自写死 macOS 的
 *   /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
 * Linux/CI 上直接 ENOENT，等于整套回归只能在总监那台 Mac 上跑。
 * 现在统一走 tools/lib/chrome.mjs（CHROME_BIN 优先 → macOS Chrome/Chromium
 * → Linux chromium / chromium-browser / google-chrome）。
 *
 * 守卫口径：
 *   1) 除 tools/lib/chrome.mjs 外，任何 .mjs 都不许出现绝对 Chrome 路径；
 *   2) 凡是起 CDP（含 remote-debugging-port）的脚本，必须 import CHROME；
 *   3) tools/lib/chrome.mjs 必须真的导出 CHROME，且候选表里既有 macOS 又有 Linux。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOOLS = resolve(ROOT, 'tools');

function walk(dir, out = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(mjs|js)$/.test(ent.name)) out.push(p);
  }
  return out;
}

const files = walk(TOOLS);
const rel = (p) => p.slice(ROOT.length + 1).split('\\').join('/');

test('回归脚本不写死 Chrome 绝对路径（统一走 tools/lib/chrome.mjs）', () => {
  const offenders = [];
  for (const f of files) {
    if (rel(f) === 'tools/lib/chrome.mjs') continue;
    const src = readFileSync(f, 'utf8');
    if (/Applications\/Google Chrome/.test(src) || /Contents\/MacOS\/(Google Chrome|Chromium)/.test(src)) offenders.push(rel(f));
  }
  assert.equal(offenders.length, 0, `写死 macOS Chrome 路径：${offenders.join(', ')}`);
});

test('所有 CDP 脚本都从 lib/chrome.mjs 取浏览器', () => {
  const offenders = [];
  for (const f of files) {
    if (rel(f) === 'tools/lib/chrome.mjs') continue;
    const src = readFileSync(f, 'utf8');
    if (!/remote-debugging-port/.test(src)) continue;
    if (!/from\s+['"](?:\.\/|\.\.\/)?lib\/chrome\.mjs['"]/.test(src)) offenders.push(rel(f));
    if (!/\bCHROME\b/.test(src)) offenders.push(rel(f) + '（没用到 CHROME）');
  }
  assert.equal(offenders.length, 0, `CDP 脚本未接入 lib/chrome.mjs：${offenders.join(', ')}`);
});

test('lib/chrome.mjs 导出 CHROME 且覆盖 macOS / Linux', () => {
  const src = readFileSync(resolve(TOOLS, 'lib/chrome.mjs'), 'utf8');
  assert.match(src, /export\s+const\s+CHROME/, '未导出 CHROME');
  assert.match(src, /CHROME_BIN/, '不支持 CHROME_BIN 覆盖');
  assert.match(src, /Applications\/Google Chrome/, '缺 macOS 候选');
  assert.match(src, /chromium/, '缺 Linux 候选');
});
