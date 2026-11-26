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
