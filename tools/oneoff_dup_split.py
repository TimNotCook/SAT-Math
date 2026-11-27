# -*- coding: utf-8 -*-
"""一次性补丁：tools/dup_groups.mjs 加 SPLITS 分家（清单写进 data/dup-splits.json）。
CI 里跑，跑完 workflow 自删；已打过则跳过。"""
import json, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SETS = [
 ["TD-24-06"], ["TD-24-07", "U2-10"], ["U1-12", "JY1-041"], ["U1-13", "TD-15-01"],
 ["U2-04", "TD-22-01"], ["TD-22-02"], ["TD-22-03"], ["TD-12-27"], ["SP1-024"],
 ["R03-134"], ["TD-25-14"], ["R03-246"], ["TD-24-08"],
]
doc = {
 "why": "同题干 ≠ 同一道题：这些位置题干归一后相同，但表格/散点/选项数据不同，各书页码也不同。每组各自成家，只在本组内部认 duplicate，避免错题本把两道不同的题并成一笔。",
 "sets": SETS,
 "note": {
  "TD-24-06": "练习册 P109 2.4 #6：表 15/14/29、20/86/106",
  "TD-24-07": "练习册 P110 2.4 #7：表 18/12/30、17/88/105（U2-10 是它的副本）",
  "U1-12": "讲义 p31 #2：选项 y<1+4x 系",
  "U1-13": "练习册 P53 1.5 #1：选项 y>3x-20 / y>15x-20",
  "U2-04": "练习册 P76 2.2 #1（TD-22-01 是它的副本）",
  "TD-22-02": "练习册 P77 2.2 #2：另一张散点图",
  "TD-22-03": "练习册 P78 2.2 #3：另一张散点图",
  "TD-12-27": "练习册 P26 1.2 #27：方程组 -4x+9y=-8 系",
  "SP1-024": "01 册同题干，方程组 -2x+3y=-9 系",
  "R03-134": "03 册 p121 T19 #14：频率表值 70/80/90/100",
  "TD-25-14": "练习册 P126 2.5 #14：频率表值 10/20/30/40",
  "R03-246": "03 册 T21 #6：表 4/10/7/21 … 合计 24/26/30/80、填空",
  "TD-24-08": "练习册 P111 2.4 #8：表 4/9/9/24 … 合计 24/25/31/80、四选一",
 },
}
open(os.path.join(ROOT, 'data/dup-splits.json'), 'w', encoding='utf-8').write(json.dumps(doc, ensure_ascii=False, indent=1) + '\n')

OLD = """const dup = [...groups.values()].filter(g => g.length > 1)
  .map(g => {
    const sorted = g.slice().sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
    return { canonical: sorted[0].id, members: sorted };
  })
  .sort((a, b) => a.canonical.localeCompare(b.canonical));
"""
NEW = """const dup0 = [...groups.values()].filter(g => g.length > 1)
  .map(g => {
    const sorted = g.slice().sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
    return { canonical: sorted[0].id, members: sorted };
  })
  .sort((a, b) => a.canonical.localeCompare(b.canonical));

const SPLITS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/dup-splits.json'), 'utf8')).sets;

/* 同题干 ≠ 同一道题（清单在 data/dup-splits.json）：每组各自成家，只在本组内部认 duplicate。 */
function splitGroup(g) {
  const sets = SPLITS.filter(s => s.some(id => g.members.some(m => m.id === id)));
  if (!sets.length) return [g];
  const out = sets
    .map(s => ({ canonical: '', members: g.members.filter(m => s.includes(m.id)) }))
    .filter(x => x.members.length);
  const rest = g.members.filter(m => !sets.some(s => s.includes(m.id)));
  if (rest.length) out.push({ canonical: '', members: rest });
  return out.map(x => {
    const sorted = x.members.slice().sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
    return { canonical: sorted[0].id, members: sorted };
  });
}
const dup = dup0.flatMap(splitGroup).filter(g => g.members.length > 1)
  .sort((a, b) => a.canonical.localeCompare(b.canonical));
"""
p = os.path.join(ROOT, 'tools/dup_groups.mjs')
s = open(p, encoding='utf-8').read()
if s.count(OLD) == 0 and s.count(NEW) > 0:
    print('already patched, skip'); sys.exit(0)
if s.count(OLD) != 1:
    print('FAIL: OLD 命中 %d 次' % s.count(OLD)); sys.exit(1)
open(p, 'w', encoding='utf-8').write(s.replace(OLD, NEW, 1))
print('dup_groups patched')
