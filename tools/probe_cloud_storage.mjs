#!/usr/bin/env node
/**
 * probe_cloud_storage.mjs —— storage 通道能不能承载 profiles / usernames（可复现证据）
 *
 * 回答两个问题：
 *   1) runtime 桶对本应用开放吗？对象路径规则是什么？
 *   2) 不带登录态（匿名）能不能写？失败是 CORS 403 还是 401？
 *
 * 用法：node tools/probe_cloud_storage.mjs
 * 输出：每条动作的 SDK 错误 + 该请求的真实 HTTP 状态 / CORS 头。
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = (process.argv[2] || 'https://timnotcook.github.io/SAT-Math').replace(/\/$/, '');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.CDP_PORT || 9371);
const UD = fs.mkdtempSync(path.join(os.tmpdir(), 'probe-st-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless=new', '--no-proxy-server', '--disable-gpu', '--no-first-run',
  '--no-default-browser-check', `--remote-debugging-port=${PORT}`, `--user-data-dir=${UD}`,
  BASE + '/drill.html',
], { stdio: 'ignore' });

let ws;
try {
  let page = null;
  for (let i = 0; i < 40 && !page; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      page = list.find((t) => t.type === 'page' && t.url.includes('drill.html'));
    } catch { /* 还没起来 */ }
    if (!page) await sleep(400);
  }
  if (!page) throw new Error('页面没起来');

  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  const net = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Network.responseReceived') {
      const r = m.params.response;
      if (!r.url.includes('/.cloud/')) return;
      const h = r.headers || {};
      net.push(r.status + ' ' + r.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 96) +
        ' | ACAO=' + (h['access-control-allow-origin'] || h['access-control-allow-origin'] || 'none'));
    } else if (m.method === 'Network.loadingFailed') {
      net.push('✗ ' + (m.params.errorText || '') + ' ' + m.params.url);
    }
  });
  const cmd = (method, params = {}) => {
    const mid = ++id;
    return new Promise((res) => { pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); });
  };
  await cmd('Runtime.enable');
  await cmd('Network.enable');
  await sleep(3500);

  const script = `(async () => {
    const cfg = window.TD_CLOUD_CONFIG || {};
    if (!cfg.endpoint || !document.body) return JSON.stringify({ fatal: '页面未就绪' });
    const ifr = document.createElement('iframe');
    ifr.style.cssText = 'width:1px;height:1px;opacity:0;position:fixed;left:-9999px';
    ifr.src = 'auth-relay.html';
    document.body.appendChild(ifr);
    const waitFor = (pred, ms) => new Promise((resolve) => {
      const h = (ev) => {
        const m = ev.data;
        if (!m || typeof m !== 'object' || ev.source !== ifr.contentWindow) return;
        if (pred(m)) { window.removeEventListener('message', h); resolve(m); }
      };
      window.addEventListener('message', h);
      setTimeout(() => { window.removeEventListener('message', h); resolve({ timeout: true }); }, ms || 20000);
    });
    let callId = 1;
    const send = (method, args) => {
      const cid = callId++;
      const p = waitFor((m) => m.type === 'reply' && m.id === cid, 20000);
      ifr.contentWindow.postMessage({ type: 'call', id: cid, method, args: args || {},
        data: args && args.data, endpoint: cfg.endpoint, oauthRelayBaseUrl: cfg.oauthRelayBaseUrl || '',
        publishableKey: cfg.publishableKey }, '*');
      return p;
    };
    const ready = await waitFor((m) => m.type === 'sdk-ready' || m.type === 'sdk-error', 25000);
    if (ready.type !== 'sdk-ready') return JSON.stringify({ fatal: 'SDK 没起来', err: ready.error });
    const init = await send('init', { data: {}, endpoint: cfg.endpoint, publishableKey: cfg.publishableKey });
    const out = { init: init.ok ? 'ok' : 'fail', session: await send('getSession', {}), tries: [] };
    const stamp = 'probe-' + Date.now() + '.json';
    const cases = [
      { label: '匿名写 users/<假uid>/', bucket: 'runtime', path: 'users/anon-probe/' + stamp, op: 'upload' },
      { label: '非法桶名', bucket: 'tdsync-probe', path: 'x/' + stamp, op: 'upload' },
      { label: '非法路径', bucket: 'runtime', path: 'profiles/' + stamp, op: 'upload' },
    ]
    for (const c of cases) {
      const r = await send('storage', { op: c.op, bucket: c.bucket, path: c.path, text: JSON.stringify({ hello: 1 }) });
      out.tries.push({ label: c.label, ok: r.ok, err: r.ok ? null : ((r.error && (r.error.message || r.error.error_description)) || '') });
    }
    return JSON.stringify(out);
  })()`;

  const r = await cmd('Runtime.evaluate', { expression: script, awaitPromise: true, returnByValue: true });
  const v = r.result && r.result.result && r.result.result.value;
  const parsed = typeof v === 'string' ? JSON.parse(v) : { fatal: 'evaluate 无返回', raw: r.result };
  console.log('== storage 探针：' + BASE + ' ==');
  console.log('init=' + (parsed.init || parsed.fatal) + '  session=' + JSON.stringify(parsed.session && parsed.session.data));
  (parsed.tries || []).forEach((t) => console.log('  ' + t.label.padEnd(22) + (t.ok ? '可写' : '拒绝 → ' + t.err)));
  console.log('\n== 真实 HTTP（/.cloud/storage 段）==');
  net.filter((l) => l.includes('/storage')).slice(-6).forEach((l) => console.log('  ' + l));
} finally {
  try { if (ws) ws.close(); } catch { /* ignore */ }
  chrome.kill('SIGKILL');
  await sleep(200);
  fs.rmSync(UD, { recursive: true, force: true });
}
