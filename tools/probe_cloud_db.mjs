#!/usr/bin/env node
/**
 * probe_cloud_db.mjs —— 云端数据表可用性探针（可复现证据）
 *
 * 干什么：在线上真实页面里，通过 auth-relay.html 的 postMessage 通道，
 *         依次对 WorkBuddy 后端的数据路由发起 select 探测，打印每次请求的
 *         真实 HTTP 状态、CORS 头、错误码，用来判断"能不能读写数据表"。
 *
 * 为什么需要它：profiles 表 / 用户名映射表能不能落地，取决的是后端有没有
 *              给本站 Origin 开放数据库路由，不是代码写没写。这个探针把
 *              答案固定成可重跑的证据，而不是口头结论。
 *
 * 用法：
 *   node tools/probe_cloud_db.mjs
 *   node tools/probe_cloud_db.mjs https://timnotcook.github.io/SAT-Math
 *   TABLES=profiles,usernames node tools/probe_cloud_db.mjs
 *
 * 退出码：0 = 打印完成；1 = 页面/SDK 没起来（环境问题，不是结论）。
 * 依赖：本机 Chrome；Node 18+（用到内置 fetch / WebSocket）。
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = (process.argv[2] || 'https://timnotcook.github.io/SAT-Math').replace(/\/$/, '');
const PAGE = process.env.PAGE || '/drill.html';
const TABLES = (process.env.TABLES || 'profiles,usernames,kv,users,progress').split(',');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.CDP_PORT || 9343);
const UD = fs.mkdtempSync(path.join(os.tmpdir(), 'probe-cloud-db-'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = spawn(CHROME, [
  '--headless=new', '--no-proxy-server', '--disable-gpu', '--no-first-run',
  '--no-default-browser-check', `--remote-debugging-port=${PORT}`, `--user-data-dir=${UD}`,
  BASE + PAGE,
], { stdio: 'ignore' });

let ws;
try {
  // 等页面靶子出现
  let page = null;
  for (let i = 0; i < 40 && !page; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      page = list.find((t) => t.type === 'page' && t.url.includes(PAGE.replace(/^\//, '')));
    } catch { /* 还没起来 */ }
    if (!page) await sleep(400);
  }
  if (!page) throw new Error(`页面没起来：${BASE}${PAGE}`);

  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  const net = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Network.requestWillBeSent') {
      net.push('→ ' + m.params.request.method + ' ' + m.params.request.url);
    } else if (m.method === 'Network.responseReceived') {
      const r = m.params.response;
      if (!r.url.includes('/.cloud/') && !r.url.includes('/v1/')) return;
      const h = r.headers || {};
      net.push('← ' + r.status + ' ' + r.url.replace(/^https?:\/\/[^/]+/, '') +
        ' | ACAO=' + (h['access-control-allow-origin'] || h['Access-Control-Allow-Origin'] || 'none'));
    } else if (m.method === 'Network.loadingFailed') {
      net.push('✗ ' + (m.params.errorText || 'failed') + ' ' + (m.params.blockedReason ? '[' + m.params.blockedReason + ']' : ''));
    }
  });
  const cmd = (method, params = {}) => {
    const mid = ++id;
    return new Promise((res) => { pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); });
  };
  await cmd('Runtime.enable');
  await cmd('Network.enable');
  await sleep(3000); // 等 config/核心脚本加载完

  const script = `(async () => {
    const cfg = window.TD_CLOUD_CONFIG || {};
    if (!cfg.endpoint || !cfg.publishableKey) return JSON.stringify({ fatal: '页面没读到 TD_CLOUD_CONFIG' });
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
      setTimeout(() => { window.removeEventListener('message', h); resolve({ timeout: true }); }, ms || 15000);
    });
    let callId = 1;
    const send = (method, args) => {
      const cid = callId++;
      const p = waitFor((m) => m.type === 'reply' && m.id === cid, 15000);
      ifr.contentWindow.postMessage({ type: 'call', id: cid, method, args: args || {},
        data: args && args.data, endpoint: cfg.endpoint, oauthRelayBaseUrl: cfg.oauthRelayBaseUrl || '',
        publishableKey: cfg.publishableKey }, '*');
      return p;
    };
    const ready = await waitFor((m) => m.type === 'sdk-ready' || m.type === 'sdk-error', 20000);
    const out = { endpoint: cfg.endpoint, sdk: ready.type || 'timeout' };
    if (ready.type !== 'sdk-ready') { out.error = (ready.error && ready.error.message) || 'SDK 没起来'; return JSON.stringify(out); }
    out.init = await send('init', { data: {}, endpoint: cfg.endpoint, publishableKey: cfg.publishableKey });
    out.session = await send('getSession', {});
    out.tables = {};
    for (const t of ${JSON.stringify(TABLES)}) {
      const r = await send('db', { table: t, op: 'select' });
      out.tables[t] = r.timeout ? { timeout: true }
        : r.ok ? { ok: true, rows: Array.isArray(r.data) ? r.data.length : (r.data ? 1 : 0) }
        : { ok: false, message: (r.error && (r.error.message || r.error.error_description)) || '', code: (r.error && r.error.code) || '' };
    }
    return JSON.stringify(out);
  })()`;

  const r = await cmd('Runtime.evaluate', { expression: script, awaitPromise: true, returnByValue: true });
  const val = r.result && r.result.result && r.result.result.value;
  const parsed = typeof val === 'string' ? JSON.parse(val) : { fatal: 'evaluate 没返回' };

  console.log('== 探针：' + BASE + PAGE + ' ==');
  console.log('后端：' + (parsed.endpoint || '?'));
  console.log('SDK：' + (parsed.sdk || '?') + '，init：' + (parsed.init && parsed.init.ok ? 'ok' : 'fail'));
  console.log('');
  Object.entries(parsed.tables || {}).forEach(([t, v]) => {
    console.log(`  ${t.padEnd(12)} ` + (v.ok ? `可读 rows=${v.rows}` : `不可用 → ${v.message}${v.code ? ' [' + v.code + ']' : ''}`));
  });
  console.log('');
  const lines = net.filter((l) => l.includes('/.cloud/') || l.startsWith('✗')).slice(-8);
  if (lines.length) { console.log('== 网络实况（最后 8 条）=='); lines.forEach((l) => console.log('  ' + l)); }

  const blocked = !!(parsed.tables && Object.values(parsed.tables).some((v) => !v.ok && /Failed to fetch|403|401|permission/i.test(String(v.message))));
  console.log('');
  console.log(blocked ? '结论：数据路由被后端拦住（表结构层面无从谈起）' : '结论：数据路由可用（可继续判断表是否存在）');
} finally {
  try { if (ws) ws.close(); } catch { /* ignore */ }
  chrome.kill('SIGKILL');
  await sleep(200);
  fs.rmSync(UD, { recursive: true, force: true });
}
