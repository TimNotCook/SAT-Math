#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成《讲义对账表》：docs/jiangyi-reconcile.md
数据来源只有一个：data/jiangyi_answers.json（答案页 p191-196 逐节抄下来的键）。
已录数从 data/jiangyi.js 里数。两边不一致时表会自己说出来，不许手改表。
"""
import json, re, pathlib, collections

ROOT = pathlib.Path(__file__).resolve().parent.parent
KEY = json.loads((ROOT / "data" / "jiangyi_answers.json").read_text(), object_pairs_hook=collections.OrderedDict)
JS = (ROOT / "data" / "jiangyi.js").read_text() if (ROOT / "data" / "jiangyi.js").exists() else ""

UNITS = {"1": "U1 Algebra", "2": "U2 Problem Solving and Data Analysis",
         "3": "U3 Advanced Math", "4": "U4 Geometry and Trigonometry"}
TITLES = {
 "1.1": "Graphs of linear equations or functions",
 "1.2": "Solving linear equations",
 "1.3": "Interpreting linear functions or equations",
 "1.4": "Word problems: linear equations and inequalities",
 "1.5": "Linear inequalities and graphs",
 "1.6": "Absolute value and equations",
 "2.1": "Ratios, rates, proportions, percentages, and unit conversion",
 "2.2": "Scatter plots and tables and graphs",
 "2.3": "Linear and exponential relationship",
 "2.4": "Probabilities and conditional probabilities",
 "2.5": "Data analysis: center and spread",
 "2.6": "Survey, observational studies, and experiments",
 "2.7": "Inference from sample statistics and margin of error",
 "3.1": "Equivalent Expressions: factoring and isolating",
 "3.2": "Operation: exponents and radicals, rational expressions, polynomials",
 "3.3": "Solving: quadratic, radical, and fractional equations; systems of non-linear equations",
 "3.4": "Graphing: quadratic, exponential and polynomial functions",
 "3.5": "Function notations and transformations",
 "3.6": "Creating and interpreting nonlinear functions",
 "4.1": "Lines and angles",
 "4.2": "Triangles, congruence and similarity",
 "4.3": "Areas and volumes",
 "4.4": "Trigonometry and unit circle",
 "4.5": "Circles",
}


def entries():
    """从 data/jiangyi.js 的 JY_BANK 里取 (section, page)，SECTIONS 不算。"""
    out = []
    for m in re.finditer(r'"id"\s*:\s*"JY\d-\d{3}"\s*,\s*"unit"\s*:\s*\d\s*,\s*'
                         r'"section"\s*:\s*"(\d\.\d)"\s*,\s*"no"\s*:\s*\d+\s*,\s*'
                         r'"page"\s*:\s*(\d+)', JS):
        out.append((m.group(1), m.group(2)))
    return out


ENTRIES = entries()


def recorded(sec):
    return sum(1 for s, _ in ENTRIES if s == sec)


def pages_of(sec):
    return [p for s, p in ENTRIES if s == sec]


def main():
    lines, rows = [], []
    lines.append("# 讲义对账表（「讲义复习」板块 · 数据层）\n")
    lines.append("口径：**各节应有数 = 该节在答案页（讲义 p191–196）的最大题号**。已录数必须等于它，"
                 "差一道都不算完成。答案一律照抄答案页，不自己算；答案页上没有对应答案的段落"
                 "（含全部 Example 例题）一律不录。\n")
    lines.append("本表由 `tools/gen_jiangyi_reconcile.py` 从 `data/jiangyi_answers.json` + `data/jiangyi.js` 生成，"
                 "不手改。\n")

    for u in "1234":
        secs = [s for s in KEY if s.startswith(u + ".")]
        lines.append("\n## %s\n" % UNITS[u])
        lines.append("| 小节 | 标题 | 答案页 | 应有 N | 已录 M | 缺 N-M | 页码分布 | 答案键（照抄 p191–196） |")
        lines.append("|---|---|---|---|---|---|---|---|")
        for s in secs:
            k = KEY[s]
            have, need = recorded(s), k["maxNo"]
            miss = need - have
            keys = " ".join("%s.%s" % (n, k["answers"][n]) for n in k["answers"])
            pg = pages_of(s)
            if pg:
                cnt = collections.Counter(pg)
                dist = "、".join("p%s×%d" % (p, cnt[p]) for p in sorted(cnt, key=int))
            else:
                dist = "p%d–p%d（待逐题确认）" % (k["pages"][0], k["pages"][1])
            lines.append("| %s | %s | p%d | %d | %d | %d | %s | %s |" %
                         (s, TITLES[s], k["answerPage"], need, have, miss, dist, keys))
            rows.append((s, need, have))
        need = sum(KEY[s]["maxNo"] for s in secs)
        have = sum(recorded(s) for s in secs)
        lines.append("| **小计** |  |  | **%d** | **%d** | **%d** |  |  |" % (need, have, need - have))

    need = sum(r[1] for r in rows)
    have = sum(r[2] for r in rows)
    lines.append("\n## 合计\n")
    lines.append("| 应有 N | 已录 M | 缺 N-M |")
    lines.append("|---|---|---|")
    lines.append("| %d | %d | %d |" % (need, have, need - have))
    lines.append("\n单节全绿的记法：`已录 = 应有`。当前完成 **%d / %d 节**。\n" %
                 (sum(1 for r in rows if r[2] == r[1]), len(rows)))
    lines.append("\n## 内容缺口（视觉层，与上面数字对账表并列）\n")
    lines.append("数字对得上不代表页面看得对：这一节记的是「数据里有、页面上看不到」或「原页本身就缺」的条目。"
                 "来源 `data/content-gaps.json`，状态只允许：待修 / 待核 / 原页缺印 / 已核无缺。\n")
    gaps = json.loads((ROOT / "data" / "content-gaps.json").read_text())["gaps"] if (ROOT / "data" / "content-gaps.json").exists() else []
    lines.append("| 层 | 编号 | 位置 | 缺口类型 | 现象 | 证据 | 状态 |")
    lines.append("|---|---|---|---|---|---|---|")
    for g in gaps:
        lines.append("| %s | %s | %s | %s | %s | %s | %s |" %
                     (g["layer"], g["id"], g["loc"], g["kind"], g["detail"], g["evidence"], g["status"]))
    if gaps:
        todo = sum(1 for g in gaps if g["status"] == "待修")
        lines.append("\n待修 **%d** 条、待核 %d 条、原页缺印 %d 条、已核无缺 %d 条。\n" %
                     (todo, sum(1 for g in gaps if g["status"] == "待核"),
                      sum(1 for g in gaps if g["status"] == "原页缺印"),
                      sum(1 for g in gaps if g["status"] == "已核无缺")))
    lines.append("\n## 录入规则（可执行，已写进 test/jiangyi.test.js）\n")
    lines.append("1. 答案页（p191–196）里查不到题号的段落，一律不录——Example 例题就死在这一条上。")
    lines.append("2. 每题 `source` 必须三段齐全：`讲义 p{页} #{页内题号}`。")
    lines.append("3. 每题 `answer` 必须逐字等于本表答案键；选择题的答案必须落在 A–D 之内。")
    lines.append("4. 每题必须有一张原页对照图 `docs/jiangyi-proof/{id}.png`，缺图即视为未录。")
    lines.append("5. 图形只允许矢量 spec，`images/` 下不许出现讲义裁图（整本讲义带 TESTDAILY / SAT教研组水印）。")
    (ROOT / "docs" / "jiangyi-reconcile.md").write_text("\n".join(lines) + "\n")
    print("sections=%d need=%d have=%d" % (len(rows), need, have))


if __name__ == "__main__":
    main()
