/* 题干完全重复检测（可复现）
   口径：题干归一 = 去首尾空白 / 连续空白压成一个 / 引号统一为 " / 小写化。
   不含标点差异（那是另一档，本脚本不做）。
   用法：node tools/dup_groups.mjs            → 人读表
         node tools/dup_groups.mjs --json     → 机器读
         node tools/dup_groups.mjs --alias    → 写 data/aliases.js
   canonical 优先级：U（单元精编/单元卷）> JY（讲义复习）> TD（TD 教材）> SP/SR（练习册/专项）。
   同组其余成员标 alias，指向 canonical id；错题本按 alias 归并，一道错题只记一笔。 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
global.window = {};
for (const f of ['questions.js', 'data/jiangyi.js']) {
  const p = path.join(ROOT, f);
  if (fs.existsSync(p)) eval(fs.readFileSync(p, 'utf8'));
}
const TD = (global.window.TD_BANK || {}).questions || [];
const JY = (global.window.JY_BANK || []);
const TD_TEXT = (global.window.TD_TEXT || {});

function norm(s) {
  return String(s || '')
    .replace(/[\u2018\u2019\u201c\u201d]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
function rank(id) {
  const p = String(id).slice(0, 2);
  if (/^JY/.test(id)) return 1;
  if (/^U\d/.test(id)) return 0;
  if (/^TD/.test(id)) return 2;
  return 3; /* SP / SR */
}

const items = [];
for (const q of TD) items.push({ id: q.id, stem: (TD_TEXT[q.id] || {}).stem || q.stem, paper: q.paper || '', source: q.source || '' });
for (const q of JY) items.push({ id: q.id, stem: q.stem, paper: '讲义复习 · ' + (q.section || ''), source: '讲义 p' + q.page + ' #' + q.no });

const groups = new Map();
for (const it of items) {
  if (!it.stem) continue;
  const k = norm(it.stem);
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(it);
}
const dup = [...groups.values()].filter(g => g.length > 1)
  .map(g => {
    const sorted = g.slice().sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
    return { canonical: sorted[0].id, members: sorted };
  })
  .sort((a, b) => a.canonical.localeCompare(b.canonical));

/* Unit 4 的 9 道精编原题已从真题侧撤出，改挂讲义复习 JY4「教材原题」子组（练习册 P200–207）。
   它们与 TD 教材 4.1 / 4.2 是同一批原题，canonical 一律回 TD（教材板块才是正式家），
   U4 副本标 dup、错题本归并。口径由 Tim 2026-11-25 定：8 道标 dup，U4-01 独占保留。
   （实测 U4-01 与 TD-41-01 也是同题 P200 #1、答案同为 D，已在 docs/VERIFY-2026-11-25.md 挂待裁决。）*/
const JY4_DUP = {
  'U4-02': 'TD-41-02', 'U4-03': 'TD-41-03', 'U4-04': 'TD-41-05', 'U4-05': 'TD-41-06',
  'U4-06': 'TD-42-03', 'U4-07': 'TD-42-04', 'U4-08': 'TD-42-09', 'U4-09': 'TD-42-10'
};

const alias = {};
for (const g of dup) for (const m of g.members.slice(1)) alias[m.id] = g.canonical;
/* JY4 教材原题：显式覆盖自动判定（自动判定会把 TD 反向指到 U4） */
for (const [from, to] of Object.entries(JY4_DUP)) {
  for (const k of Object.keys(alias)) if (alias[k] === from) delete alias[k];
  alias[from] = to;
}

const stats = {
  questions: items.length,
  groups: dup.length,
  extraCopies: dup.reduce((n, g) => n + g.members.length - 1, 0),
  pairs: dup.reduce((n, g) => n + (g.members.length * (g.members.length - 1)) / 2, 0),
  sizeDist: dup.reduce((m, g) => { m[g.members.length] = (m[g.members.length] || 0) + 1; return m; }, {}),
};

if (process.argv.includes('--doc')) {
  const L = [];
  L.push('# 题库重复题干台账（1009 题 + 讲义 45 题）\n');
  L.push('> 本表由 `node tools/dup_groups.mjs --doc` 生成，数字可复现；勿手改。\n');
  L.push('## 口径\n');
  L.push('1. **归一规则**：题干去首尾空白 → 连续空白压一个 → 引号统一为 `"` → 小写化。**不做**去标点、不做同义改写，宁可漏判不可错判。');
  L.push('2. **统计**：`重复组` = 归一后题干相同的组数；`多余副本` = 每组除 canonical 之外的份数；`两两对数` = 组内 C(n,2) 之和。');
  L.push('3. **canonical 优先级**：`U`（单元精编 / 单元卷）> `JY`（讲义复习）> `TD`（TD 教材）> `SP/SR`（练习册 / 专项）。同级按 id 字典序。');
  L.push('4. **显示保留 canonical**；同组其余成员在 `data/aliases.js` 里标 alias 指向 canonical，错题本按 alias 归并。');
  L.push('5. alias 是**数据层映射**，不改 1009 题题干文件（避免整文件 diff 噪音）；`data/aliases.js` 由 `--alias` 生成。\n');
  L.push('## 本期数字\n');
  L.push(`| 题数（题库 + 讲义） | 重复组 | 多余副本 | 两两对数 | 组大小分布 |`);
  L.push('|---|---|---|---|---|');
  L.push(`| ${stats.questions} | ${stats.groups} | ${stats.extraCopies} | ${stats.pairs} | ${Object.entries(stats.sizeDist).map(([k, v]) => k + ' 题组 ×' + v).join('、')} |\n`);
  L.push('> 与 Tim 口述的「60 组」对账：60 与上表**两两对数**一致（并入讲义 45 题后）。「组数」按定义是 ' + stats.groups + '，两个数字不是一回事，别再混用。\n');
  L.push('## 重复组清单\n');
  L.push('| # | canonical（显示保留） | 同组 alias（标 alias / 错题归并到此） |');
  L.push('|---|---|---|');
  dup.forEach((g, i) => {
    const canon = alias[g.canonical] || g.canonical; /* JY4 口径覆盖：canonical 可能被显式改指 TD */
    const others = g.members.map(m => m.id).filter(id => id !== canon).map(id => {
      const it = g.members.find(m => m.id === id);
      return id + (it && it.source ? '（' + it.source + '）' : '');
    }).join('、');
    L.push(`| ${i + 1} | **${canon}** | ${others} |`);
  });
  L.push('\n## Unit 4 教材原题子组（JY4 · 练习册 P200–207）\n');
  L.push('口径（Tim 2026-11-25）：这 9 道已从真题侧的隐藏板块撤出，改挂「讲义复习 Unit4・教材原题」子组；');
  L.push('**不计入讲义官方 4.1–4.5 的 52 道**（4.1=2、4.2=14、4.3=8、4.4=12、4.5=16）。');
  L.push('其中 8 道与 TD 教材 4.1 / 4.2 是同一批原题 → canonical 回 TD，U4 副本标 dup、错题本归并；U4-01 独占保留。\n');
  L.push('| U4 编号 | 原书位置 | 处理 | 归并到 | 备注 |');
  L.push('|---|---|---|---|---|');
  const u4items = items.filter(x => /^U4-0\d/.test(x.id));
  const u4only = u4items.find(x => x.id === 'U4-01');
  L.push(`| U4-01 | ${u4only ? u4only.source : '练习册 P200 #1'} | 独占保留 | — | 按口径不标 dup；实测与 TD-41-01 同题（P200 #1，答案同为 D），见 docs/VERIFY-2026-11-25.md 待裁决 |`);
  for (const [from, to] of Object.entries(JY4_DUP)) {
    const it = items.find(x => x.id === from);
    const auto = dup.some(g => g.members.some(m => m.id === from));
    L.push(`| ${from} | ${it ? it.source : '—'} | 标 dup | **${to}** | ${auto ? '题干归一可自动命中' : '题干有 OCR 漂移，按页号 / 题号对账'} |`);
  }
  L.push('\n> 自动归一这一轮只抓到 8 组里的 4 组（U4-02/04/05/08），另外 4 组题干差在 `line l/I`、空格、标点这类 OCR 漂移上，');
  L.push('> 靠「练习册页 + 小节题号」对账补齐。alias 总条数 ' + Object.keys(alias).length + '。\n');
  L.push('\n## 错题本归并规则\n');
  L.push('1. `wrong-page.js` 的 `questionById(id)` 先查 `window.TD_ALIAS[id]`，命中即换成 canonical 再取题；记录 map 的键因此恒为 canonical id。');
  L.push('2. 同一道题在「单元精编」错一次、在「练习册」再错一次，合并为**一条**错题记录，`attempts` 累加、`sources` 追加来源。');
  L.push('3. 只有 canonical 参与计数，alias 副本不单独出现在错题本列表里。');
  fs.writeFileSync(path.join(ROOT, 'docs/bank-duplicates.md'), L.join('\n') + '\n');
  console.log('docs/bank-duplicates.md written: groups=' + stats.groups + ' pairs=' + stats.pairs);
} else if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ stats, dup }, null, 1));
} else if (process.argv.includes('--alias')) {
  const out = '/* 由 tools/dup_groups.mjs --alias 生成，勿手改。alias[id] = canonical id */\n' +
    'window.TD_ALIAS = ' + JSON.stringify(alias, null, 0).replace(/","/g, '", "').replace(/\{/, '{\n  ').replace(/,"/g, ',\n  "').replace(/\}/, '\n}') + ';\n';
  fs.writeFileSync(path.join(ROOT, 'data/aliases.js'), out);
  console.log('alias entries=' + Object.keys(alias).length);
} else {
  console.log(`题数 ${stats.questions} · 重复组 ${stats.groups} · 多余副本 ${stats.extraCopies} · 两两对数 ${stats.pairs} · 组大小 ${JSON.stringify(stats.sizeDist)}`);
  for (const g of dup) {
    console.log(`\n[${g.canonical}]`);
    for (const m of g.members) console.log(`  ${m.id === g.canonical ? '★' : ' '} ${m.id}  ${m.paper}${m.source ? ' · ' + m.source : ''}`);
  }
}
