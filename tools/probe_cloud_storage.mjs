// 探针：storage 通道（database 403 时的备选承载）
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const BASE = process.env.BASE || 'https://timnotcook.github.io/SAT-Math';
const PAGE = '/drill.html';
const PORT = 9365;
const UD = '/tmp/cdp-st-' + Date.now();

const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--no-proxy-server', '--disable-gpu',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${UD}`,
  '--no-first-run', '--no-default-browser-check', BASE + PAGE
], { stdio: 'ignore' });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function findPage() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const p = list.find(t => t.type === 'page' && t.url.includes(PAGE.replace(/^\//, '')));
      if (p) return p;
    } catch {}
    await sleep(400);
  }
  throw new Error('no page target');
}

const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const cmd = (method, params = {}) => { const mid = ++id; return new Promise(res => { pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); }); };
await cmd('Runtime.enable');
await cmd('Network.enable');
await cmd('Log.enable');
const netUrls=[];
ws.addEventListener('message',(ev)=>{const m=JSON.parse(ev.data); if(m.method==='Network.requestWillBeSent'){netUrls.push('REQ '+m.params.request.method+' '+m.params.request.url);}
 if(m.method==='Network.responseReceived'){const r=m.params.response; if(r.url.includes('cloud/database')||r.url.includes('/v1/')){const h=r.headers||{}; netUrls.push('RES '+r.status+' '+r.url.replace('https://wbapp-ppcowwierzgpcol1drmipc.app.workbuddy.host','')+' | ACAO='+(h['access-control-allow-origin']||h['Access-Control-Allow-Origin']||'none')+' | ACAH='+((h['access-control-allow-headers']||h['Access-Control-Allow-Headers']||'none')).slice(0,80));}}
 if(m.method==='Network.loadingFailed'){netUrls.push('FAIL '+(m.params.errorText||'')+' '+m.params.blockedReason);}
 if(m.method==='Log.entryAdded'){netUrls.push('CONSOLE '+(m.params.entry.text||'').slice(0,160));}});
await sleep(3000);

const script = `(async () => {
  const cfg = window.TD_CLOUD_CONFIG || {};
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
  let callId = 900;
  const send = (method, args) => {
    const cid = callId++;
    const p = waitFor(m => m.type === 'reply' && m.id === cid, 15000);
    ifr.contentWindow.postMessage({ type:'call', id: cid, method, args: args || {},
      data: args && args.data, endpoint: cfg.endpoint, oauthRelayBaseUrl: cfg.oauthRelayBaseUrl || '',
      publishableKey: cfg.publishableKey }, '*');
    return p;
  };
  const ready = await waitFor(m => m.type === 'sdk-ready' || m.type === 'sdk-error', 20000);
  const out = { endpoint: cfg.endpoint || '', hasKey: !!cfg.publishableKey, readyType: ready.type || 'timeout', readyErr: (ready.error && ready.error.message) || '' };
  if (ready.type !== 'sdk-ready') return JSON.stringify(out);
  out.init = await send('init', { data:{}, endpoint: cfg.endpoint, publishableKey: cfg.publishableKey });
  const strip = (r) => r.timeout ? { timeout: true } : { ok: r.ok, data: r.ok ? r.data : null,
    err: r.ok ? null : { message: (r.error && (r.error.message || r.error.error_description)) || '', code: (r.error && r.error.code) || '', status: (r.error && r.error.status) || 0 } };
  out.buckets = strip(await send('storage', { op: 'buckets' }));
  const stamp = 'probe-' + Date.now() + '.json';
  out.upload = strip(await send('storage', { op: 'upload', bucket: 'tdsync', path: stamp, text: JSON.stringify({ hello: 'probe', at: new Date().toISOString() }) }));
  out.download = strip(await send('storage', { op: 'download', bucket: 'tdsync', path: stamp }));
  return JSON.stringify(out);
})()`;

const r = await cmd('Runtime.evaluate', { expression: script, awaitPromise: true, returnByValue: true });
const val = r.result?.result?.value;
console.log(typeof val === 'string' ? val : JSON.stringify(r.result));
console.log('--- 网络请求 ---');
console.log(netUrls.filter(u=>u.includes('cloud/database')||u.startsWith('FAIL')||u.startsWith('CONSOLE')||u.includes('/.cloud')).slice(-14).join('\n'));
try { ws.close(); } catch {}
chrome.kill('SIGKILL');
await sleep(300);
fs.rmSync(UD, { recursive: true, force: true });
