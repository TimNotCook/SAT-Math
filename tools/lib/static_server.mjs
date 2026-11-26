/* 极简静态服务器（并发安全）：python http.server 是单线程，Chrome 同时拉十几个
   资源时会被 reset，导致 app-core.js 偶发加载失败、反查 CATALOG 全空。
   用法：node tools/lib/static_server.mjs <port> <root> */
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join, normalize, resolve } from 'path';

const port = Number(process.argv[2] || 8765);
const root = resolve(process.argv[3] || '.');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json'
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let p = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
    if (!p || p === '') p = 'index.html';
    if (p.endsWith('/')) p += 'index.html';
    const file = join(root, p);
    if (!file.startsWith(root)) { res.writeHead(403); res.end('forbidden'); return; }
    const buf = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(buf);
  } catch (e) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
  }
}).listen(port, '127.0.0.1');
