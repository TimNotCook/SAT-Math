#!/usr/bin/env node
/* 讲义复习 · 数据层验收（编程者负责的那一层：数据契约，不校验内容对错）
   五项硬断言：
   1) 每节 count === 实际（各节应有数 = 答案页该节最大题号）
   2) source 三段齐全：讲义 p{页} #{页内题号}，且与 page / no 一致
   3) 无空题干
   4) 答案落在选项内（mcq 字母必须是 A–D 且选项数量足够；grid 必须是数字）
   5) 每题有原页对照图 docs/jiangyi-proof/<id>.png

   另外：id 只允许 JY1-001…JY4-046 新前缀、不得与 TD_BANK 混号；section 必须是
   1.1–4.5；题内顺序按「小节号 → 页码 → 页内题号」。

   用法：
     node tools/verify_jiangyi.mjs               # 本地检查，数据为空时 exit 2（未就绪）
     node tools/verify_jiangyi.mjs --allow-empty # CI 形态：数据未录入也算通过，仅报告
     node tools/verify_jiangyi.mjs --json        # 机器可读
     node tools/verify_jiangyi.mjs --strict      # 对账口径：任何一节 已录 ≠ 应有 即 FAIL
*/
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DATA = path.join(ROOT, 'data/jiangyi.js');
const QUESTIONS = path.join(ROOT, 'data/questions.js');
const PROOF = path.join(ROOT, 'docs/jiangyi-proof');
const args = process.argv.slice(2);
const allowEmpty = args.includes('--allow-empty');
const strict = args.includes('--strict');   /* 对上账表口径：差一道就 FAIL；否则只 WARN */
const asJson = args.includes('--json');

const fail = [];
const warn = [];
const info = [];
function bad(code, msg, extra) { fail.push({ code, msg, ...(extra || {}) }); }

const sandbox = { window: {} };
vm.createContext(sandbox);
if (fs.existsSync(DATA)) vm.runInContext(fs.readFileSync(DATA, 'utf8'), sandbox, { filename: DATA });
/* 题库侧实际结构是 JY_BANK + JY_SECTIONS；旧的 TD_JIANGYI 形状继续兼容。 */
const JY = sandbox.window.JY_BANK
  ? { sections: sandbox.window.JY_SECTIONS || [], questions: sandbox.window.JY_BANK }
  : sandbox.window.TD_JIANGYI;
if (!JY || !Array.isArray(JY.questions)) {
  console.error(fail.length ? '' : 'FAIL  data/jiangyi.js 未定义 window.TD_JIANGYI.questions');
  process.exit(2);
}

let bankIds = new Set();
if (fs.existsSync(QUESTIONS)) {
  const b = { window: {} };
  vm.createContext(b);
  try {
    vm.runInContext(fs.readFileSync(QUESTIONS, 'utf8'), b, { filename: QUESTIONS });
    (b.window.TD_BANK?.questions || []).forEach(q => bankIds.add(q.id));
  } catch (e) { warn.push('data/questions.js 读取失败，跳过混号检查：' + e.message); }
}

const declared = new Map();
if (Array.isArray(JY.sections)) {
  JY.sections.forEach(s => declared.set(`${s.unit}|${s.section}`, { expect: Number(s.declared) || 0, cn: s.cn || '' }));
} else {
  (JY.units || []).forEach(u => (u.sections || []).forEach(s => {
    declared.set(`${u.id}|${s.id}`, { expect: Number(s.expect) || 0, cn: s.cn || '' });
  }));
}

const qs = JY.questions;
const counts = new Map();
const ids = new Set();
for (const [i, q] of qs.entries()) {
  const where = `#${i + 1} ${q && q.id ? q.id : '(无 id)'}`;
  if (!q || typeof q !== 'object') { bad('shape', `${where} 不是对象`); continue; }

  /* id：新前缀 + 唯一 + 不与现有题库混号 */
  if (!/^JY[1-4]-\d{3}$/.test(String(q.id || ''))) bad('id', `${where} id 必须是 JY1-001 形态`);
  else if (ids.has(q.id)) bad('id-dup', `${where} id 重复`);
  else if (bankIds.has(q.id)) bad('id-mix', `${where} 与 TD_BANK 混号`);
  ids.add(q.id);

  /* section：真实小节号 + 与 unit 一致 */
  const mUnit = /^JY([1-4])-\d{3}$/.exec(String(q.id || ''));
  if (!/^[1-4]\.\d/.test(String(q.section || ''))) bad('section', `${where} section 必须是 1.1–4.5`);
  else if (mUnit && Number(mUnit[1]) !== Number(q.section.split('.')[0])) {
    bad('section-unit', `${where} section=${q.section} 与 id 单元 JY${mUnit[1]} 不一致`);
  }
  const page = Number(q.page), no = Number(q.no);
  const src = String(q.source || '').trim();
  /* 教材原题（JY4 子组）来自练习册 P200–207：单独校验练习册口径，不计入讲义各节对账 */
  const isBook = q.group === 'textbook' || /^练习册/i.test(src);
  if (isBook) {
    if (!/^练习册\s*P\d+\s*#\d+$/i.test(src)) bad('source-textbook', `${where} source 必须是「练习册 P{页} #{题号}」：${src || '(空)'}`);
    else if (src.replace(/\s+/g, '') !== `练习册P${page}#${no}`) bad('source-mismatch', `${where} source=${src} 与 page=${page}/no=${no} 不一致`);
    if (!(page >= 200 && page <= 207)) bad('page-textbook', `${where} 练习册页码必须在 P200–207：${page}`);
  } else {
    const key = `${q.unit || (mUnit ? mUnit[1] : '?')}|${q.section}`;
    counts.set(key, (counts.get(key) || 0) + 1);
    if (!/^讲义\s*p\d+\s*#\d+$/.test(src)) bad('source', `${where} source 不是「讲义 p{页} #{页内题号}」：${src || '(空)'}`);
    else if (src !== `讲义 p${page} #${no}`) bad('source-mismatch', `${where} source=${src} 与 page=${page}/no=${no} 不一致`);
  }
  if (!(page > 0) || !(no > 0)) bad('page', `${where} page / no 必须是正整数`);

  /* 题干与答案 */
  const stem = String(q.stem || '').replace(/\s+/g, ' ').trim();
  if (!stem) bad('stem', `${where} 空题干`);
  const choices = Array.isArray(q.choices) ? q.choices : null;
  const ans = String(q.answer == null ? '' : q.answer).trim();
  if (choices && choices.length >= 2) {
    if (!/^[A-D]$/i.test(ans)) bad('answer', `${where} 选择题 answer 必须是 A–D：${ans || '(空)'}`);
    else if (ans.toUpperCase().charCodeAt(0) - 65 >= choices.length) bad('answer-range', `${where} answer=${ans} 超出 ${choices.length} 个选项`);
    if (choices.some(c => !String(c == null ? '' : c).trim())) bad('choice-empty', `${where} 有空选项`);
  } else {
    /* 填空题：answer 可以照抄答案页的备选写法（`.5 or 1/2`、`第一空 250，第二空 123.5`），
       判分只认数值字段 value；value 缺失才退回 answer 是否可解析为数字。 */
    const ansNum = Number(String(ans).replace(/^[-−]/, '-').replace(/,/g, ''));
    if (!Number.isFinite(q.value) && !Number.isFinite(ansNum)) {
      bad('answer-grid', `${where} 填空题缺数值 value，answer 也不可解析：${ans || '(空)'}`);
    }
  }

  /* 对照图 */
  const proofName = path.basename(String(q.proof || `${q.id}.png`));
  const proofPath = path.join(PROOF, proofName);
  if (!fs.existsSync(proofPath)) bad('proof', `${where} 缺原页对照图 docs/jiangyi-proof/${proofName}`);
  else if (fs.statSync(proofPath).size < 8 * 1024) bad('proof-size', `${where} 对照图过小（${fs.statSync(proofPath).size}B），疑似占位`);
}

/* 1) 每节 count === 声明 expect */
for (const [k, d] of declared.entries()) {
  const got = counts.get(k) || 0;
  if (!d.expect) { warn.push(`${k} 未声明 expect（答案页应有数），无法对账`); continue; }
  if (got !== d.expect) {
    const msg = `${k}：答案页应有 ${d.expect} / 已录 ${got} / 缺 ${d.expect - got}`;
    if (strict) bad('count', msg); else warn.push('未平 ' + msg);
  }
}
for (const [k, n] of counts.entries()) {
  if (!declared.has(k)) warn.push(`${k}：录了 ${n} 题，但 units[].sections 未声明该节`);
}

/* 顺序：官方 24 节与教材原题子组各自独立排（strict 小节号 → 页码 → 页内题号）。
   教材原题来自练习册 P200–207、section 仍写 4.1/4.2 但单独成组，不能和讲义页混排。 */
const secKey = s => (+String(s).split('.')[0] || 0) * 100 + (+String(s).split('.')[1] || 0);
for (const [label, list] of [['官方小节', qs.filter(q => q.group !== 'textbook')], ['教材原题', qs.filter(q => q.group === 'textbook')]]) {
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1], b = list[i];
    if (!a || !b) continue;
    if (secKey(a.section) > secKey(b.section) || (a.section === b.section && (a.page > b.page || (a.page === b.page && a.no > b.no)))) {
      bad('order', `${label}：${a.id} / ${b.id} 顺序不符合「小节号 → 页码 → 页内题号」`);
      break;
    }
  }
}

const summary = { questions: qs.length, textbookGroup: qs.filter(q => /^练习册/i.test(String(q.source || '').trim())).length, sectionsDeclared: declared.size, sectionsRecorded: counts.size, proofFiles: fs.existsSync(PROOF) ? fs.readdirSync(PROOF).filter(f => f.endsWith('.png')).length : 0 };

if (asJson) {
  console.log(JSON.stringify({ summary, fail, warn }, null, 2));
} else {
  const lines = [];
  lines.push(`讲义复习数据：${summary.questions} 题 · 声明小节 ${summary.sectionsDeclared} · 实有小节 ${summary.sectionsRecorded} · 对照图 ${summary.proofFiles} 张`);
  fail.forEach(f => lines.push(`FAIL  [${f.code}] ${f.msg}`));
  warn.forEach(w => lines.push(`WARN  ${w}`));
  console.log(lines.join('\n'));
}

if (!qs.length) {
  if (!allowEmpty) { console.log('数据未就绪：data/jiangyi.js 仍是占位（0 题）。--allow-empty 可仅报告。'); process.exit(2); }
  process.exit(0);
}
process.exit(fail.length ? 1 : 0);
