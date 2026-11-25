#!/usr/bin/env node
/* tools/versions.mjs — 五页资源版本守卫（可被 verify_nav 与 node --test 复用）
 *
 * 规则：index / exam / drill / wrong / jiangyi 五页，
 * 每页至少一个 src|href="...?v=..."，同页只能一个值，五页必须同值。
 * 任一不满足即 ok=false；CLI 退出码 1。 */
import { readFile } from 'fs/promises';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

export const PAGES = ['index.html', 'exam.html', 'drill.html', 'wrong.html', 'jiangyi.html'];
const TOKEN = /(?:src|href)="([^"?]*)\?v=([^"]+)"/g;

export function pageVersions(html) {
  const assets = [];
  TOKEN.lastIndex = 0;
  let m;
  while ((m = TOKEN.exec(String(html || '')))) assets.push({ path: m[1], version: m[2] });
  return assets;
}

export function summarize(htmlByPage, expected = null) {
  const pages = {};
  for (const name of PAGES) {
    const assets = pageVersions(htmlByPage[name] || '');
    pages[name] = { assets, values: [...new Set(assets.map(a => a.version))] };
  }
  const errors = [];
  for (const name of PAGES) {
    const p = pages[name];
    if (!p.assets.length) errors.push(`${name} 没有 ?v=`);
    else if (p.values.length !== 1) errors.push(`${name} 同页多值 ${p.values.join(',')}`);
  }
  const all = [...new Set(PAGES.flatMap(name => pages[name].values))];
  if (all.length !== 1) errors.push(`五页不同值 ${all.join(',')}`);
  if (expected != null && (all.length !== 1 || all[0] !== expected)) {
    errors.push(`版本未对齐内容哈希 ${all.join(',') || 'MISSING'} ≠ ${expected}`);
  }
  const version = all.length === 1 ? all[0] : null;
  const detail = PAGES.map(n => `${n}=${pages[n].values.join(',') || 'MISSING'}`).join(' | ');
  return { ok: errors.length === 0, version, detail, errors, pages };
}

export async function checkLocal(root) {
  const htmlByPage = {};
  for (const name of PAGES) {
    htmlByPage[name] = await readFile(join(root, name), 'utf8');
  }
  return summarize(htmlByPage);
}

/* 远程拉取的重试/诊断配置。
 * 背景：线上偶发 fetch failed（单次尝试、12s 超时太紧、错误只剩一句 "fetch failed"），
 * 一次 TCP 抖动/超时就被红牌。修法不是放松判定，而是「同一页给 3 次机会 + 把失败原因打印全」。 */
export const FETCH_DEFAULTS = {
  retries: 3,            // 总尝试次数（首次 + 2 次重试）
  backoffMs: [2000, 4000], // 第 1/2 次重试前等待，指数退避
  timeoutMs: 20000,      // 单次 fetch 超时（原 12s 对抖动连接偏紧）
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* 把一次失败尝试压成一行诊断：URL · HTTP 状态 · 错误名 · cause.code · 细节消息 */
export function describeAttempt(a) {
  const parts = [];
  if (a.url) parts.push(String(a.url));
  if (a.status) parts.push(`HTTP ${a.status}`);
  if (a.name) parts.push(a.name);
  if (a.code) parts.push(a.code);
  if (a.message) parts.push(a.message);
  return parts.join(' · ');
}

/* 把 checkBase 抛出的错误展开成可诊断的原因（重试聚合错误 / 普通网络错误通用） */
export function describeFetchError(e) {
  if (!e) return '未知错误';
  if (Array.isArray(e.attempts) && e.attempts.length) {
    return `共 ${e.attempts.length} 次尝试：` + e.attempts.map(a => `#${a.attempt} ${describeAttempt(a)}`).join('；');
  }
  const parts = [];
  if (e.url) parts.push(String(e.url));
  if (e.status) parts.push(`HTTP ${e.status}`);
  if (e.name) parts.push(e.name);
  const code = e.cause && e.cause.code;
  if (code) parts.push(code);
  const msg = (e.cause && e.cause.message) || e.message;
  if (msg) parts.push(msg);
  return parts.join(' · ');
}

/* 单页带退避重试的 fetch：
 * · 网络层错误（TypeError fetch failed / TimeoutError 超时）与 5xx → 重试；
 * · 4xx（404/403 等永久错误）→ 不重试，立刻抛；
 * · 重试仍失败 → 抛带 attempts 全记录的聚合错误，FAIL 语义不退让。 */
async function fetchPageWithRetry(url, cfg) {
  const attempts = [];
  let last = null;
  for (let attempt = 1; attempt <= cfg.retries; attempt++) {
    const at = new Date().toISOString();
    let res;
    try {
      res = await fetch(url, { headers: { 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(cfg.timeoutMs) });
    } catch (e) {
      const entry = { attempt, at, phase: 'network', url: String(url), name: e.name,
        code: e.cause && e.cause.code, message: (e.cause && e.cause.message) || e.message };
      attempts.push(entry);
      last = entry;
      if (attempt < cfg.retries) await sleep(cfg.backoffMs[attempt - 1] ?? cfg.backoffMs[cfg.backoffMs.length - 1]);
      continue;
    }
    if (!res.ok) {
      const entry = { attempt, at, phase: 'http', url: String(url), status: res.status,
        message: res.status >= 500 ? '服务端抖动，可重试' : '永久错误，重试无意义' };
      attempts.push(entry);
      last = entry;
      if (res.status < 500) {
        const err = new Error(`HTTP ${res.status}`);
        err.url = String(url); err.status = res.status; err.attempts = attempts;
        throw err;
      }
      if (attempt < cfg.retries) await sleep(cfg.backoffMs[attempt - 1] ?? cfg.backoffMs[cfg.backoffMs.length - 1]);
      continue;
    }
    return await res.text();
  }
  const err = new Error(`拉取失败（${cfg.retries} 次尝试后仍失败）`);
  err.url = String(url);
  err.attempts = attempts;
  if (last) { err.status = last.status; err.code = last.code; err.name = last.name; }
  throw err;
}

export async function checkBase(base, opts = {}) {
  const cfg = { ...FETCH_DEFAULTS, ...opts };
  const htmlByPage = {};
  for (const name of PAGES) {
    const url = new URL(name, String(base).replace(/\/+$/, '') + '/');
    url.searchParams.set('audit', String(Date.now()));
    htmlByPage[name] = await fetchPageWithRetry(url, cfg);
  }
  return summarize(htmlByPage);
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const args = process.argv.slice(2);
  const flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  const base = flag('--base');
  const opts = {};
  if (flag('--retries')) opts.retries = Number(flag('--retries'));
  if (flag('--timeout-ms')) opts.timeoutMs = Number(flag('--timeout-ms'));
  if (flag('--backoff-ms')) opts.backoffMs = flag('--backoff-ms').split(',').map(Number);
  try {
    const report = base ? await checkBase(base, opts) : await checkLocal(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
    console.log(`${report.ok ? 'PASS' : 'FAIL'} 五页资源版本同值`);
    console.log(`      期望 五页均至少 1 个 ?v=；每页唯一；跨页同值${base ? `；目标 ${base}` : ''}`);
    console.log(`      实测 ${report.detail}`);
    if (!report.ok) console.log(`      原因 ${report.errors.join('；')}`);
    process.exit(report.ok ? 0 : 1);
  } catch (e) {
    console.log(`FAIL 版本检查无法完成\n      原因 ${describeFetchError(e)}`);
    process.exit(1);
  }
}
