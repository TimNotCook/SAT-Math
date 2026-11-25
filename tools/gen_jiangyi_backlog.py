#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成《讲义录入派工清单》：docs/jiangyi-backlog.md

数据来源（全部只读，不碰 data/jiangyi.js 的写入）：
  - data/jiangyi.js        → JY_SECTIONS 的声明（declared / pages）与 JY_BANK 已录题目
  - data/jiangyi_answers.json → 答案页的 maxNo（官方应有数）
  - docs/jiangyi-tables.md → 已确认的表格题小节（有就标）

口径：
  - 「应有」= 答案页 maxNo（与 docs/jiangyi-reconcile.md 同一口径）
  - 「已录」只数**官方小节**的题，排除 group=='textbook'（那是 JY4 教材原题子组，不计入官方 243）
  - 「缺号」= 1..maxNo 里没录到的页内题号，用来直接派工
生成物勿手改，改数据后重跑本脚本。
"""
import json, re, pathlib, collections

ROOT = pathlib.Path(__file__).resolve().parent.parent
JS = (ROOT / "data" / "jiangyi.js").read_text(encoding="utf-8")
KEY = json.loads((ROOT / "data" / "jiangyi_answers.json").read_text(encoding="utf-8"), object_pairs_hook=collections.OrderedDict)

UNITS = {"1": "U1 Algebra", "2": "U2 Problem Solving and Data Analysis",
         "3": "U3 Advanced Math", "4": "U4 Geometry and Trigonometry"}


def sections():
    m = re.search(r"window\.JY_SECTIONS\s*=\s*(\[.*?\n\]);", JS, re.S)
    return json.loads(m.group(1)) if m else []


def bank():
    m = re.search(r"window\.JY_BANK\s*=\s*(\[.*?\n\]);", JS, re.S)
    return json.loads(m.group(1)) if m else []


SECTIONS = sections()
BANK = bank()
OFFICIAL = [q for q in BANK if (q.get("group") or "") != "textbook"]
BY_SEC = collections.defaultdict(list)
for q in OFFICIAL:
    BY_SEC[q.get("section")].append(q)

TABLE_SECS = set()
tp = ROOT / "docs" / "jiangyi-tables.md"
if tp.exists():
    for s in re.findall(r"^\|\s*JY\d-\d{3}\s*\|\s*(\d\.\d)\s*\|", tp.read_text(encoding="utf-8"), re.M):
        TABLE_SECS.add(s)


def fig_note(sec):
    qs = BY_SEC.get(sec, [])
    if not qs:
        return "未录，图表待翻原页"
    figs = sum(1 for q in qs if q.get("figure") or q.get("fig"))
    tables = sum(1 for q in qs if q.get("table") or q.get("choiceTables"))
    bits = []
    if figs:
        bits.append("矢量图 %d" % figs)
    if tables:
        bits.append("表格 %d" % tables)
    if sec in TABLE_SECS and not tables:
        bits.append("表格清单另记")
    return "；".join(bits) if bits else "无图无表（已录样本）"


def main():
    rows, lines = [], []
    lines.append("# 讲义录入派工清单（按小节拆）\n")
    lines.append("> 由 `tools/gen_jiangyi_backlog.py` 从 `data/jiangyi.js` 的声明 + `data/jiangyi_answers.json` 的答案页生成，勿手改。")
    lines.append("> 「已录」只数官方小节，**排除 JY4 教材原题子组**（`group=='textbook'`，不计入官方 243）。\n")
    total_need = total_have = 0
    for u in "1234":
        secs = [s for s in SECTIONS if str(s.get("unit")) == u]
        if not secs:
            continue
        lines.append("## %s\n" % UNITS[u])
        lines.append("| 小节 | 标题 | 答案页 | 应有 | 已录 | 缺 | 缺号（页内题号） | 原书页码 | 图表（已录样本） |")
        lines.append("|---|---|---|---|---|---|---|---|---|")
        u_need = u_have = 0
        for s in secs:
            sec = s["section"]
            need = KEY[sec]["maxNo"] if sec in KEY else int(s.get("declared") or 0)
            have = len(BY_SEC.get(sec, []))
            nums = sorted(int(q.get("no")) for q in BY_SEC.get(sec, []) if q.get("no"))
            missing = [n for n in range(1, need + 1) if n not in nums]
            miss = need - have
            pages = s.get("pages") or []
            prange = "p%d–p%d" % (pages[0], pages[-1]) if pages else "—"
            lines.append("| %s | %s | p%s | %d | %d | %d | %s | %s | %s |" %
                         (sec, s.get("cn", ""), KEY[sec]["answerPage"] if sec in KEY else "—",
                          need, have, miss, "、".join(str(n) for n in missing) if missing else "—",
                          prange, fig_note(sec)))
            u_need += need
            u_have += have
        lines.append("| **小计** |  |  | **%d** | **%d** | **%d** |  |  |  |\n" % (u_need, u_have, u_need - u_have))
        total_need += u_need
        total_have += u_have
    lines.append("\n## 合计\n")
    lines.append("| 应有 | 已录 | 缺 | 完成节数 |")
    lines.append("|---|---|---|---|")
    done = sum(1 for s in SECTIONS if len(BY_SEC.get(s["section"], [])) == (KEY[s["section"]]["maxNo"] if s["section"] in KEY else 0))
    lines.append("| %d | %d | %d | %d / %d |" % (total_need, total_have, total_need - total_have, done, len(SECTIONS)))
    lines.append("\n派工注意：")
    lines.append("1. `data/jiangyi.js` 同一时间只允许一个人写；α 正在 1.6，本节不要派第二人，冲突会整文件覆盖。")
    lines.append("2. 缺号列是「页内题号」，对应 `source` 必须写成 `讲义 p{页} #页内题号`；页码从原书页码范围里数。")
    lines.append("3. 图表列只反映**已录样本**的实况；没录的节要翻原页确认（大图逐张走矢量 spec，表格走 `table` / `choiceTables`，一律不许裁原页）。")
    lines.append("4. 每节录完跑 `python3 tools/gen_jiangyi_reconcile.py`，`已录 = 应有` 才算结案。")
    (ROOT / "docs" / "jiangyi-backlog.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("backlog need=%d have=%d miss=%d sections=%d" % (total_need, total_have, total_need - total_have, len(SECTIONS)))


if __name__ == "__main__":
    main()
