#!/usr/bin/env node
/* SAT Math 线上金丝雀。
 *
 * 用法：
 *   node tools/canary.mjs
 *   EXPECTED_SHA=<main commit> node tools/canary.mjs
 *   FEISHU_WEBHOOK=<url> node tools/canary.mjs
 *
 * 检查：六页可打开且无构建残留、release.json 与预期提交一致、认证服务可用、
 * Supabase 安全配置没有漂移。失败退出码 1，供 Actions / 外部探针直接判红。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const BASE = String(process.env.CANARY_BASE || 'https://timnotcook.github.io/SAT-Math/').replace(/\/+$/, '/');
const EXPECTED_SHA = String(process.env.EXPECTED_SHA || '').trim().toLowerCase();
const FEISHU = String(process.env.FEISHU_WEBHOOK || '').trim();
const TIMEOUT = Number(process.env.CANARY_TIMEOUT_MS || 15000);
const STRICT_SECURITY = String(process.env.SECURITY_STRICT || '') === '1';
const JSON_ONLY = process.argv.includes('--json');

const checks = [];
const warnings = [];

function record(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail: String(detail || '') });
}
function warn(name, detail) {
  warnings.push({ name, detail: String(detail || '') });
}

async function get(url, headers) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      headers: Object.assign({ 'cache-control': 'no-cache' }, headers || {}),
      signal: ctrl.signal,
      redirect: 'follow'
    });
    const text = await res.text();
    return { status: res.status, ok: res.ok, text };
  } finally {
    clearTimeout(timer);
  }
}

async function checkPage(file) {
  const url = new URL(file, BASE).href + '?v=' + Date.now();
  let last = '';
  for (let i = 0; i < 2; i++) {
    try {
      const r = await get(url + (i ? '&r=' + i : ''));
      if (r.status !== 200) { last = 'HTTP ' + r.status; continue; }
      if (!/<title[^>]*>[^<]+<\/title>/i.test(r.text)) { last = '缺少非空 title'; continue; }
      if (!/<\/html>/i.test(r.text)) { last = 'HTML 不完整'; continue; }
      if (/^<{7}|^>{7}/m.test(r.text)) { last = '页面含冲突标记'; continue; }
      return record(file, true, 'HTTP 200');
    } catch (e) {
      last = '请求失败: ' + (e && e.message || e);
    }
  }
  return record(file, false, last || '未知失败');
}

async function checkRelease() {
  try {
    const r = await get(new URL('release.json', BASE).href + '?v=' + Date.now());
    if (r.status !== 200) return record('release.json', false, 'HTTP ' + r.status);
    let j;
    try { j = JSON.parse(r.text); } catch (e) { return record('release.json', false, '不是合法 JSON'); }
    if (!/^[0-9a-f]{40}$/.test(String(j.commit || ''))) return record('release.json', false, 'commit 不是 40 位 SHA');
    if (!j.builtAt || Number.isNaN(Date.parse(j.builtAt))) return record('release.json', false, 'builtAt 缺失/非法');
    if (EXPECTED_SHA && String(j.commit).toLowerCase() !== EXPECTED_SHA) {
      return record('release.json', false, '线上 ' + String(j.commit).slice(0, 7) + '，预期 ' + EXPECTED_SHA.slice(0, 7));
    }
    return record('release.json', true, String(j.short || j.commit.slice(0, 7)) + ' @ ' + j.builtAt);
  } catch (e) {
    return record('release.json', false, '请求失败: ' + (e && e.message || e));
  }
}

async function checkVersion() {
  try {
    const r = await get(new URL('version.json', BASE).href + '?v=' + Date.now());
    if (r.status !== 200) return record('version.json', false, 'HTTP ' + r.status);
    let j;
    try { j = JSON.parse(r.text); } catch (e) { return record('version.json', false, '不是合法 JSON'); }
    if (!j.v) return record('version.json', false, '缺少 v');
    return record('version.json', true, String(j.v));
  } catch (e) {
    return record('version.json', false, '请求失败: ' + (e && e.message || e));
  }
}

function readSupabase() {
  const src = readFileSync(resolve(ROOT, 'cloud-config.js'), 'utf8');
  const block = src.match(/supabase\s*:\s*\{[\s\S]*?url\s*:\s*'([^']+)'[\s\S]*?anonKey\s*:\s*'([^']+)'/);
  if (!block) return null;
  return { url: block[1].replace(/\/+$/, ''), anonKey: block[2] };
}

async function checkAuth() {
  const cfg = readSupabase();
  if (!cfg) return record('auth-settings', false, 'cloud-config.js 里找不到 Supabase 配置');
  try {
    const r = await get(cfg.url + '/auth/v1/settings', { apikey: cfg.anonKey });
    if (r.status !== 200) return record('auth-settings', false, 'HTTP ' + r.status);
    let j;
    try { j = JSON.parse(r.text); } catch (e) { return record('auth-settings', false, 'settings 不是合法 JSON'); }
    const gaps = [];
    if (j.mailer_autoconfirm === true) gaps.push('邮箱注册不验证归属（mailer_autoconfirm=true）');
    if (j.external && j.external.phone === true) gaps.push('手机号注册未验证（external.phone=true）');
    if (j.external && j.external.anonymous_users === true) gaps.push('匿名登录开着（external.anonymous_users=true）');
    /* 安全配置漂移是 P0，但当前仓库没有 service_role、改不了控制台；默认只报
       警告，等控制台修好后把 SECURITY_STRICT=1 打开，变成硬门禁。 */
    if (gaps.length) {
      const detail = gaps.join('；');
      if (STRICT_SECURITY) return record('auth-settings', false, detail);
      warn('auth-settings', detail);
    }
    return record('auth-settings', true, 'HTTP 200' + (gaps.length ? '（有安全警告）' : ''));
  } catch (e) {
    return record('auth-settings', false, '请求失败: ' + (e && e.message || e));
  }
}

async function notify(text) {
  if (!FEISHU) return;
  try {
    await fetch(FEISHU, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ msg_type: 'text', content: { text } }),
      signal: AbortSignal.timeout(10000)
    });
  } catch (e) {
    console.error('Feishu 告警发送失败:', e && e.message || e);
  }
}

const PAGES = ['index.html', 'exam.html', 'drill.html', 'wrong.html', 'jiangyi.html', 'history.html'];
await Promise.all(PAGES.map(checkPage));
await checkRelease();
await checkVersion();
await checkAuth();

const failed = checks.filter(c => !c.ok);
const report = {
  ok: failed.length === 0,
  base: BASE,
  checkedAt: new Date().toISOString(),
  expected: EXPECTED_SHA || '',
  checks,
  warnings
};

if (JSON_ONLY) {
  console.log(JSON.stringify(report));
} else {
  for (const c of checks) console.log((c.ok ? 'PASS ' : 'FAIL ') + c.name + ' · ' + c.detail);
  for (const w of warnings) console.log('WARN ' + w.name + ' · ' + w.detail);
}

if (failed.length) {
  const lines = failed.slice(0, 8).map(c => '- ' + c.name + ': ' + c.detail);
  await notify(['【SAT Math 线上告警】', '站点：' + BASE, '时间：' + report.checkedAt, ...lines,
    EXPECTED_SHA ? '预期提交：' + EXPECTED_SHA.slice(0, 7) : '', '回滚：Actions → rollback'].filter(Boolean).join('\n'));
  process.exit(1);
}
