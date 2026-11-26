/* tools/lib/serve.mjs — 回归用的本地静态服务器（替代 python3 -m http.server）
 *
 * 为什么换掉 python：它并发拉十几个 defer 脚本时会直接 reset 连接
 * （实测 Network.loadingFailed: net::ERR_CONNECTION_RESET，一次能 reset 掉
 *  整批脚本，于是 TD_APP/TD_UI 全是 undefined、整页空白）。
 * 那种红不是产品坏了，是测试脚手架自己把请求打死了——直接换成 node:http，
 * 并发安全、零依赖，并且自证「这个端口确实是本仓库」：随机端口 + marker 回读。
 *
 * 用法：
 *   import { startStaticServer } from './lib/serve.mjs';
 *   const srv = await startStaticServer(ROOT, { mark: '.verify-xxx-marker' });
 *   BASE = srv.base;          // 进程退出时自动关
 *   srv.stop();               // 也可以手动关
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync, writeFileSync, unlinkSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { randomBytes } from 'node:crypto';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

export async function startStaticServer(root, { mark = '.verify-marker' } = {}) {
  const token = randomBytes(6).toString('hex');
  const markPath = join(root, mark);
  writeFileSync(markPath, token);

  const server = createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://x');
      let rel = decodeURIComponent(url.pathname);
      if (rel === '/') rel = '/index.html';
      const file = normalize(join(root, rel));
      if (!file.startsWith(normalize(root) + sep) && file !== normalize(root)) {
        res.writeHead(403).end('forbidden');
        return;
      }
      if (!existsSync(file) || !statSync(file).isFile()) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('not found');
        return;
      }
      res.writeHead(200, {
        'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
        'cache-control': 'no-store',
        'content-length': statSync(file).size,
      });
      createReadStream(file).pipe(res);
    } catch {
      res.writeHead(500).end('error');
    }
  });

  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  /* 自证：回读 marker，确认这个端口回的就是本仓库（不是别人的 worktree） */
  let ok = false;
  for (let i = 0; i < 40 && !ok; i++) {
    try {
      const r = await fetch(`${base}/${mark}`, { cache: 'no-store' });
      ok = r.ok && (await r.text()).trim() === token;
    } catch { /* 还没 listen 完就再来一次 */ }
    if (!ok) await new Promise((r) => setTimeout(r, 150));
  }

  const stop = () => {
    try { server.close(); } catch {}
    try { unlinkSync(markPath); } catch {}
  };
  process.once('exit', stop);
  for (const sig of ['SIGINT', 'SIGTERM']) process.once(sig, () => { stop(); process.exit(1); });

  if (!ok) { stop(); throw new Error(`静态服务器自证失败：${base}`); }
  return { base, port, stop, mark };
}
