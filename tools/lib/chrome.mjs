/* tools/lib/chrome.mjs — 统一的 Chrome/Chromium 可执行路径解析
 *
 * 为什么要有它：11 个 CDP 脚本原来各自硬编码
 *   /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
 * 在 Linux / CI 上直接 ENOENT，等于这些回归只能在 Tim 的 Mac 上跑。
 * 解析顺序：
 *   1) 环境变量 CHROME_BIN（显式指定优先）
 *   2) 平台默认：macOS 的 Google Chrome / Chromium.app；Linux 的 chromium / chromium-browser / google-chrome
 *   3) 都找不到就抛出可读错误，提示设置 CHROME_BIN
 */
import { existsSync } from 'fs';

const CANDIDATES = process.env.CHROME_BIN
  ? [process.env.CHROME_BIN]
  : process.platform === 'darwin'
    ? [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
      ]
    : [
        '/usr/local/bin/chromium',
        '/usr/bin/chromium',
        '/usr/local/bin/chromium-browser',
        '/usr/bin/chromium-browser',
        '/usr/local/bin/google-chrome',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
      ];

const hit = CANDIDATES.find((p) => p && existsSync(p));
if (!hit) {
  console.error('找不到 Chrome/Chromium。请设置环境变量 CHROME_BIN 指向浏览器可执行文件。\n尝试过：\n  ' + CANDIDATES.join('\n  '));
  process.exit(2);
}

export const CHROME = hit;
export const HEADLESS_ARGS = ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'];

/* ---------- 临时浏览器 profile：必须自清理 ----------
 *
 * 事故：11 个回归脚本各自 `--user-data-dir=/tmp/<prefix>-${Date.now()}`，
 * 跑完没人删。长期累积到 /tmp 里 900+ 个目录、~19G，磁盘只剩 6G，
 * python http.server 在高并发冷启动时就 reset 连接，回归随机变红——
 * 看起来像"功能坏了"，实际是工具自己在漏垃圾。
 * 所以 profile 统一从这里拿：退出时删，启动时顺手收掉 1 小时前的同前缀残留
 * （被 kill -9 的跑法也能被后一次运行收尸）。
 */
import { mkdtempSync, readdirSync, rmSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const HOUR = 3600 * 1000;

export function sweepStaleProfiles(prefix, olderMs = HOUR) {
  try {
    const root = tmpdir();
    for (const name of readdirSync(root)) {
      if (!name.startsWith(prefix)) continue;
      const p = join(root, name);
      try {
        if (Date.now() - statSync(p).mtimeMs < olderMs) continue;
        rmSync(p, { recursive: true, force: true });
      } catch { /* 删不动就算了，不影响当前跑 */ }
    }
  } catch { /* tmpdir 读不了也不该把回归拖死 */ }
}

export function tempProfile(prefix = 'sat-') {
  sweepStaleProfiles(prefix);
  const dir = mkdtempSync(join(tmpdir(), prefix));
  const clean = () => { try { rmSync(dir, { recursive: true, force: true }); } catch {} };
  process.once('exit', clean);
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.once(sig, () => { clean(); process.exit(1); });
  }
  return dir;
}
