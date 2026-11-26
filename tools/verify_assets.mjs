#!/usr/bin/env node
/* tools/verify_assets.mjs — 静态资产/题库一致性自检（只读，零依赖）
 *
 * 五类断言：
 *   1) 六页本地引用（src/href）都存在，?v= 全站唯一
 *   2) 页面无重复 id
 *   3) Service Worker 的 VERSION 跟随构建令牌（satmath-<token>）
 *   4) 题库(data/questions.js) ↔ 文本层(data/text.js) 一一对应，无缺无孤
 *   5) 每道 mcq 要么有选项文本、要么有 figure 声明且裁图存在；题干/题图引用的图片文件必须存在
 *
 * 用法：node tools/verify_assets.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PAGES = ['index.html', 'drill.html', 'exam.html', 'wrong.html', 'jiangyi.html', 'history.html'];
const fails = [];
const notes = [];
const fail = (m) => fails.push(m);

/* ---------- 1/2. 页面引用、重复 id、?v= ---------- */
const tokens = new Map();
for (const page of PAGES) {
  const abs = path.join(ROOT, page);
  if (!fs.existsSync(abs)) { fail(`${page} 不存在`); continue; }
  const html = fs.readFileSync(abs, 'utf8');
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const r = m[1];
    if (/^(https?:|data:|#|mailto:)/.test(r)) continue;
    const [pth, qs] = r.split('?');
    if (!fs.existsSync(path.join(ROOT, pth))) fail(`${page} 引用不存在：${r}`);
    const v = new URLSearchParams(qs || '').get('v');
    if (v) { if (!tokens.has(pth)) tokens.set(pth, new Set()); tokens.get(pth).add(v); }
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((x) => x[1]);
  const dup = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
  if (dup.length) fail(`${page} 重复 id：${dup.join(', ')}`);
}
for (const [f, s] of tokens) if (s.size > 1) fail(`${f} 的 ?v= 不一致：${[...s].join(' / ')}`);
const token = [...new Set([...tokens.values()].flatMap((s) => [...s]))];
if (token.length !== 1) fail(`全站 ?v= 不唯一：${token.join(' / ')}`);
else notes.push(`?v= 统一为 ${token[0]}`);

/* ---------- 3. Service Worker 版本 ---------- */
const swPath = path.join(ROOT, 'sw.js');
if (!fs.existsSync(swPath)) fail('sw.js 不存在');
else {
  const sw = fs.readFileSync(swPath, 'utf8');
  const ver = (sw.match(/var VERSION = '([^']+)';/) || [])[1];
  if (!ver) fail('sw.js 找不到 var VERSION');
  else if (token[0] && ver !== `satmath-${token[0]}`) fail(`sw.js VERSION=${ver} 未跟随构建令牌 satmath-${token[0]}（先跑 python3 bump_assets.py）`);
  else notes.push(`sw.js VERSION = ${ver}`);
  for (const f of [...sw.matchAll(/["']\.\/([^"']+)["']/g)].map((x) => x[1]).filter((x) => !x.endsWith('/')))
    if (!fs.existsSync(path.join(ROOT, f))) fail(`sw.js 预缓存文件不存在：${f}`);
}

/* ---------- 4/5. 题库 ↔ 文本层 ---------- */
const ctx = { window: {}, console };
vm.createContext(ctx);
for (const f of ['data/questions.js', 'data/text.js', 'data/choice_crops.js']) {
  if (!fs.existsSync(path.join(ROOT, f))) { fail(`${f} 不存在`); continue; }
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx); } catch (e) { fail(`${f} 执行报错：${e.message}`); }
}
const bank = ctx.window.TD_BANK;
const TEXT = ctx.window.TD_TEXT || {};
const CROPS = ctx.window.TD_CHOICE_CROPS || {};
if (!bank || !Array.isArray(bank.questions)) fail('data/questions.js 没产出 window.TD_BANK.questions');
else {
  const q = bank.questions;
  const ids = new Set(q.map((x) => x.id));
  const tIds = new Set(Object.keys(TEXT));
  const miss = [...ids].filter((id) => !tIds.has(id));
  const orph = [...tIds].filter((id) => !ids.has(id));
  if (miss.length) fail(`题库有 ${miss.length} 条没有文本层：${miss.slice(0, 5).join(', ')}`);
  if (orph.length) fail(`文本层有 ${orph.length} 条不在题库：${orph.slice(0, 5).join(', ')}`);
  if (ids.size !== q.length) fail(`题库 id 重复：${q.length} 条 / ${ids.size} 个唯一`);

  const seenImg = new Map();
  const checkImg = (src, where) => {
    if (!src || /^(http|data:)/.test(src)) return;
    const p = String(src).replace(/^\//, '');
    if (seenImg.has(p)) return;
    seenImg.set(p, where);
    if (!fs.existsSync(path.join(ROOT, p))) fail(`图片不存在：${where} → ${p}`);
  };
  const LETTERS = ['A', 'B', 'C', 'D'];
  let mcqBlank = 0, ansBad = 0;
  const figNoCrop = [];
  for (const it of q) {
    checkImg(it.image, it.id);
    const t = TEXT[it.id] || {};
    checkImg(t.image, `${it.id}.text`);
    const crops = CROPS[it.id] || {};
    for (const k of Object.keys(crops)) checkImg(crops[k], `${it.id}.choice${k}`);
    if (it.type === 'mcq') {
      const ch = t.choices || {};
      const filled = LETTERS.filter((l) => String(ch[l] || '').trim());
      const figList = Array.isArray(t.figure) ? t.figure : [];
      const hasImg = !!(it.image || t.image);
      if (!filled.length && !figList.length && !hasImg) { mcqBlank++; fail(`mcq 既无选项文本也无题图：${it.id}`); }
      if (filled.length) {
        const idx = 'ABCD'.indexOf(String(it.answer).trim().charAt(0).toUpperCase());
        if (!(idx >= 0 && idx < filled.length)) { ansBad++; if (ansBad <= 5) fail(`mcq 答案越界：${it.id} answer=${it.answer} 有效选项=${filled.length}`); }
      }
      for (const l of figList) if (!crops[l] && !hasImg) figNoCrop.push(`${it.id}:${l}`);
    } else if (it.type === 'grid') {
      /* grid-in 的标准答案可以是 answer（字母无关）或 value（分数/小数/备选，见 grade-core.js acceptedValues） */
      const key = [it.answer, it.value].some((x) => x !== null && x !== undefined && String(x).trim() !== '');
      if (!key) { ansBad++; if (ansBad <= 5) fail(`grid 无标准答案（answer/value 皆空）：${it.id}`); }
    }
  }
  if (figNoCrop.length) fail(`figure 声明缺裁图且无整图兜底：${figNoCrop.slice(0, 5).join(', ')}`);
  notes.push(`题库 ${q.length} 题（唯一 id ${ids.size}）；文本层 ${tIds.size} 条；引用图片 ${seenImg.size} 个；mcq 空选项 ${mcqBlank} / 答案异常 ${ansBad}`);
}

/* ---------- 输出 ---------- */
for (const n of notes) console.log('INFO ', n);
if (!fails.length) { console.log('\nPASS  静态自检全绿'); process.exit(0); }
console.log(`\nFAIL  ${fails.length} 项`);
for (const f of fails) console.log('  -', f);
process.exit(1);
