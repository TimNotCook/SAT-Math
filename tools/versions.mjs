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

export async function checkBase(base) {
  const htmlByPage = {};
  for (const name of PAGES) {
    const url = new URL(name, String(base).replace(/\/+$/, '') + '/');
    url.searchParams.set('audit', String(Date.now()));
    const res = await fetch(url, { headers: { 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
    htmlByPage[name] = await res.text();
  }
  return summarize(htmlByPage);
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const args = process.argv.slice(2);
  const flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  const base = flag('--base');
  try {
    const report = base ? await checkBase(base) : await checkLocal(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
    console.log(`${report.ok ? 'PASS' : 'FAIL'} 五页资源版本同值`);
    console.log(`      期望 五页均至少 1 个 ?v=；每页唯一；跨页同值${base ? `；目标 ${base}` : ''}`);
    console.log(`      实测 ${report.detail}`);
    if (!report.ok) console.log(`      原因 ${report.errors.join('；')}`);
    process.exit(report.ok ? 0 : 1);
  } catch (e) {
    console.log(`FAIL 版本检查无法完成\n      原因 ${e.message}`);
    process.exit(1);
  }
}
