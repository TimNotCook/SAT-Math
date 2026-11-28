#!/usr/bin/env node
/* tools/verify_all.mjs — 一条命令跑完所有页面验收（串行 + 自动起服务）
 *
 * 为什么要有它：仓库里有 30+ 个 tools/verify_*.mjs，各写各的入口——有的自带 server、
 * 有的必须 --base、有的不认任何参数。谁要全量跑一遍就得翻文档逐个拼命令行，
 * 少传一个参数就得到一片"页面坏了"的假红。更麻烦的是并发跑：多个 CDP 脚本同时
 * 抢随机端口、同时拉 1300 题的题库，页面还没渲染完就被断言，十几项一起红，
 * 看起来像产品崩了（实测 3 个并发：flows 11/16、mobile 48/50）。
 * 所以这里串行跑、每个之间留冷却，并把"谁红、红在哪一行"汇总成一份报告。
 *
 * 用法：
 *   node tools/verify_all.mjs                      # 自起本地服务，跑全部
 *   node tools/verify_all.mjs --base https://timnotcook.github.io/SAT-Math
 *   node tools/verify_all.mjs --only verify_mobile,verify_flows
 *   node tools/verify_all.mjs --skip verify_mobile
 *
 * 退出码：全部通过 0；有任何不合格 1（超时也算不合格）。
 */
import { spawn, execSync } from 'child_process';
import { readdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { startStaticServer } from './lib/serve.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);
const argVal = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const ONLY = argVal('--only', '').split(',').map((x) => x.trim()).filter(Boolean);
const SKIP = argVal('--skip', '').split(',').map((x) => x.trim()).filter(Boolean);
/* 单个验收器的墙钟上限。240s 的旧值在「上一轮 Chrome 残留 + 机器负载」时
   会把 acct_entry（实测 50s）、junk（实测 151s）判成 TIMEOUT——那不是页面坏，
   是验收器自己排队排死了。给到 7 分钟，超时仍会 SIGKILL 并把尾部输出带回来。 */
const TIMEOUT = Number(argVal('--timeout', '420000'));
const COOLDOWN = Number(argVal('--cooldown', '2500'));
const REPORT = argVal('--report', '/tmp/verify-all.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* 每个验收器自己会杀掉主进程，但 Chrome 的 helper 子进程常常活下来；
   跑一整轮下来能在机器上留下上百个 headless 进程，把下一次启动拖到超时——
   那看起来像"页面坏了"，实际是上一次的垃圾没清。串行跑时这里兜底扫一遍。 */
const sweepChrome = () => {
  try { execSync('pkill -f "headless=new" || true', { stdio: 'ignore' }); } catch {}
};

let BASE = argVal('--base', '');
let server = null;
if (!BASE) {
  server = await startStaticServer(ROOT);
  BASE = server.base;
}
BASE = BASE.replace(/\/+$/, '');

const files = readdirSync(join(ROOT, 'tools'))
  .filter((f) => /^verify_.*\.mjs$/.test(f) && f !== 'verify_all.mjs')
  .filter((f) => (ONLY.length ? ONLY.some((o) => f.includes(o)) : true))
  .filter((f) => !SKIP.some((s) => f.includes(s)))
  .sort();

const runOne = (file) => new Promise((res) => {
  const t0 = Date.now();
  const p = spawn(process.execPath, [join(ROOT, 'tools', file), '--base', BASE], {
    cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  p.stdout.on('data', (b) => { out += b; });
  p.stderr.on('data', (b) => { out += b; });
  const timer = setTimeout(() => {
    try { p.kill('SIGKILL'); } catch {}
    const lines = out.split('\n').filter((x) => x.trim());
    res({ file, code: 'TIMEOUT', ms: Date.now() - t0, tail: (lines[lines.length - 1] || '').slice(0, 160) });
  }, TIMEOUT);
  p.on('close', (code) => {
    clearTimeout(timer);
    const lines = out.split('\n').filter((x) => x.trim());
    res({ file, code, ms: Date.now() - t0, tail: (lines[lines.length - 1] || '').slice(0, 160) });
  });
});

const results = [];
let failed = 0;
for (const f of files) {
  const r = await runOne(f);
  results.push(r);
  const ok = r.code === 0;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${f}  ${Math.round(r.ms / 1000)}s  ${ok ? '' : '『' + r.tail + '』'}`);
  sweepChrome();
  await sleep(COOLDOWN);
}

writeFileSync(REPORT, JSON.stringify({ base: BASE, at: new Date().toISOString(), failed, results }, null, 2));
console.log(`\n${results.length - failed}/${results.length} 通过${failed ? '，' + failed + ' 项不合格：' : '，全绿'}${failed ? results.filter((r) => r.code !== 0).map((r) => r.file).join(', ') : ''}`);
console.log('报告：' + REPORT);

if (server) server.stop();
process.exit(failed ? 1 : 0);
