'use strict';
/* test/csp-supabase.test.js — 登录页的 CSP 必须放行 Supabase
 *
 * 事故：首页（index.html）的 connect-src 只写了 workbuddy 两个域名，没有 *.supabase.co；
 * 浏览器因此把所有 /auth/v1/* 请求拦成 "network error"，在首页点登录永远失败。
 * 规则：凡加载了 supa-cloud.js / cloud-account.js 的页面，connect-src 必须包含 Supabase。
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pages = ['index.html', 'exam.html', 'drill.html', 'wrong.html', 'jiangyi.html', 'history.html'];

for (const page of pages) {
  test(`${page}：connect-src 放行 Supabase`, () => {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const m = html.match(/connect-src([^;"]*)/);
    assert.ok(m, `${page} 应有 Content-Security-Policy 的 connect-src`);
    if (!/supa-cloud\.js/.test(html)) {
      // 没加载登录脚本的页面不强制，但一旦加载就必须放行，否则登录请求会被浏览器拦死
      assert.ok(true);
      return;
    }
    assert.ok(/https:\/\/\*\.supabase\.co/.test(m[1]), `${page} 的 connect-src 缺 https://*.supabase.co：${m[1]}`);
  });
}
