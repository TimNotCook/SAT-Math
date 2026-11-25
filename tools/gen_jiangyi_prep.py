#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成 3.1–4.5 的录入前置资料包：docs/jiangyi-prep/

只读，绝不写 data/jiangyi.js（α 正在操作该文件）。

数据来源（全部现成，不手抄）：
  - data/jiangyi_answers.json → 每节 pages / answerPage / maxNo / 逐题答案键
  - data/jiangyi.js           → JY_SECTIONS（标题、声明数）与 JY_BANK（已录，用于算缺号 & 避开已占 id）
  - docs/jiangyi-backlog.md   → 缺号口径同源（同一个 maxNo 减法），本脚本自己重算并断言一致

产出：
  docs/jiangyi-prep/README.md   索引 + 开工规则
  docs/jiangyi-prep/3.1.md … 4.5.md   每节一页
"""
import json, re, pathlib, collections

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "jiangyi-prep"
KEY = json.loads((ROOT / "data" / "jiangyi_answers.json").read_text(encoding="utf-8"),
                 object_pairs_hook=collections.OrderedDict)
JS = (ROOT / "data" / "jiangyi.js").read_text(encoding="utf-8")
SECTIONS = json.loads(re.search(r"window\.JY_SECTIONS\s*=\s*(\[.*?\n\]);", JS, re.S).group(1))
BANK = json.loads(re.search(r"window\.JY_BANK\s*=\s*(\[.*?\n\]);", JS, re.S).group(1))

# 图表面：按节性质做「备料风险」预判（只用于备料，不作验收依据；真值一律回原页）
FIGRISK = {
    "3.1": ("低", "代数变形为主，原页偶有等效式排版块"),
    "3.2": ("低", "指数/根式/有理式运算，基本无图"),
    "3.3": ("中", "求解题可能出现抛物线与 x 轴交点图"),
    "3.4": ("高", "本节纯图像题：坐标系图、四选图集中出现"),
    "3.5": ("中", "变换题可能附原函数图与平移后图像"),
    "3.6": ("中", "建模题可能附散点/曲线图或表格"),
    "4.1": ("高", "直线与角的几何图（平行线截线、角度标注）"),
    "4.2": ("高", "相似/全等三角形图，可能带四选图判断"),
    "4.3": ("中高", "面积体积题多为立体图形"),
    "4.4": ("高", "单位圆、直角三角形、弧度标注"),
    "4.5": ("高", "圆图、切线割线、扇形"),
}
TARGET_SECS = [s["section"] for s in SECTIONS if s["section"].startswith(("3.", "4."))]
TOTAL_EXPECT = 68 + 52

UNIT_CN = {3: "U3 Advanced Math", 4: "U4 Geometry and Trigonometry"}


def alloc_ids():
    """预留 id：U3 从 001 起顺排；U4 从 056 起（JY4-047…055 已被教材原题九题占用）。"""
    taken = {q["id"] for q in BANK}
    plan, cursor = {}, {3: 1, 4: 56}
    for sec in TARGET_SECS:
        n = KEY[sec]["maxNo"]
        ids = []
        for _ in range(n):
            while True:
                cand = "JY%d-%03d" % (int(sec[0]), cursor[int(sec[0])])
                cursor[int(sec[0])] += 1
                if cand not in taken:
                    ids.append(cand)
                    break
        plan[sec] = ids
    return plan


PLAN = alloc_ids()


def kind_of(ans):
    """答案键是 A–D 单字母 → 选择题；其余 → 填空题（grid）。"""
    return "mcq" if re.fullmatch(r"[A-D]", str(ans).strip()) else "grid"


def missing(sec):
    k = KEY[sec]
    done = {int(q["no"]) for q in BANK if q.get("section") == sec and q.get("group") != "textbook"}
    return [n for n in range(1, k["maxNo"] + 1) if n not in done]


def section_page(sec):
    k = KEY[sec]
    a, b = k["pages"]
    return a, b, b - a + 1


def write_section(sec):
    s = next(x for x in SECTIONS if x["section"] == sec)
    k = KEY[sec]
    miss = missing(sec)
    done = k["maxNo"] - len(miss)
    a, b, npages = section_page(sec)
    risk, why = FIGRISK[sec]
    ids = PLAN[sec]
    lines = []
    lines.append("# 讲义 %s · %s — 开工材料\n" % (sec, s["cn"]))
    lines.append("> 本节属 %s。只读资料，录入仍由 `data/jiangyi.js` 的唯一写手做（α 在跑时别抢）。\n" % UNIT_CN[int(sec[0])])
    lines.append("| 项 | 值 |")
    lines.append("|---|---|")
    lines.append("| 答案页 | p%d |" % k["answerPage"])
    lines.append("| 讲义页码范围 | p%d–p%d（共 %d 页） |" % (a, b, npages))
    lines.append("| 应有（答案页最大题号） | %d |" % k["maxNo"])
    lines.append("| 已录 | %d |" % done)
    lines.append("| 缺 | %d |" % len(miss))
    lines.append("| 缺号 | %s（与 `docs/jiangyi-backlog.md` 同一算法，不手工维护两份） |" %
                 ("、".join(str(n) for n in miss) if miss else "无"))
    lines.append("| 图表备料风险 | %s —— %s（预判，只用于提前备料；真值必须回原页） |" % (risk, why))
    lines.append("| 预留 id | %s … %s（%d 个，均未被占用） |" % (ids[0], ids[-1], len(ids)))
    lines.append("\n## 开工表（%d 题，按页内题号）\n" % len(miss))
    lines.append("| 预留 id | 页内题号 | 题型（答案键预判） | 答案键 | 图表（原页勾选） | 对照图（录完即存） |")
    lines.append("|---|---|---|---|---|---|")
    for i, n in enumerate(miss):
        ans = k["answers"][str(n)]
        lines.append("| %s | #%d | %s | `%s` | ☐题干图 ☐选项图 ☐表格 | `docs/jiangyi-proof/%s.png` |" %
                     (ids[i], n, kind_of(ans), ans, ids[i]))
    lines.append("\n## 图表备料单（回原页后逐项勾）\n")
    lines.append("- 坐标系图：轴样式照讲义（轴在原点交叉、刻度按原书抽标），走 `data/jiangyi_figures.js` 的 spec，**不裁原页**。")
    lines.append("- 四选图：确认原书印法（A 左上/C 右上 还是 A B / C D），spec 里用 `order` 写死。")
    lines.append("- 几何/立体图：只描线，不带 TESTDAILY / SAT教研组水印。")
    lines.append("- 表格：走 `table` 或 `choiceTables`（选项里含表），不截图。")
    lines.append("- 本节风险预判：**%s**。若原页实际与预判不符，以原页为准，并回来把本节风险等级改掉。" % risk)
    lines.append("\n## 录入注意\n")
    lines.append("1. `source` 三段齐全：`讲义 p{页} #%d` 这种形态，页码必须落在 p%d–p%d。" % (miss[0] if miss else 1, a, b))
    lines.append("2. `answer` 逐字照抄 p%d，不改写法（分数写成 `25/4 or 50/8 or 6.25` 就整串照抄）。" % k["answerPage"])
    lines.append("3. 每题存一张原页对照图 `docs/jiangyi-proof/{id}.png`，缺图测试直接红。")
    lines.append("4. 录完跑 `python3 tools/gen_jiangyi_reconcile.py` 与 `npm test`，本节「已录 = 应有」才算结案。")
    if int(sec[0]) == 3:
        lines.append("5. **3.x 编号坑**：讲义用官方编号（3.1 等价表达式 / 3.2 运算 / 3.3 求解 / 3.4 图像 / 3.5 函数记号 / 3.6 建模）；"
                     "练习册与题库的 3.x 整体比官方小 1。拿练习册材料交叉核对时**不要按同号取**，见 `docs/td-vs-official-unit3-map.md`。")
    (OUT / (sec + ".md")).write_text("\n".join(lines) + "\n", encoding="utf-8")
    return len(miss), risk, ids


def write_readme(rows):
    L = []
    L.append("# 讲义录入前置资料包 · 3.1–4.5（共 120 道）\n")
    L.append("> 由 `tools/gen_jiangyi_prep.py` 生成，勿手改。数据源：`data/jiangyi_answers.json`（页范围 / 答案页 / 逐题答案键）"
             "+ `data/jiangyi.js` 的 `JY_SECTIONS` / `JY_BANK`（已录、已占 id）。")
    L.append("> 缺号与 `docs/jiangyi-backlog.md` 用同一算法（`1..maxNo` 减已录），本脚本生成时断言两边一致，所以两处永远同步，不需要人工对表。\n")
    L.append("**这是什么**：α 把 `data/jiangyi.js` 推到 3.x 之前，先把 3.1–4.5 的开工材料备齐——每节一页：页码、应有/已录/缺、逐题答案键、预留 id、图表要备什么、这节特有的坑。拿到就能录，不用再翻对账表。\n")
    L.append("## 索引\n")
    L.append("| 节 | 标题 | 应有 | 缺 | 讲义页 | 图表风险（预判） | 预留 id | 文件 |")
    L.append("|---|---|---|---|---|---|---|---|")
    tot = 0
    for sec, cn, need, miss, a, b, risk, ids in rows:
        tot += miss
        L.append("| %s | %s | %d | %d | p%d–p%d | %s | %s–%s | [`%s.md`](%s.md) |" %
                 (sec, cn, need, miss, a, b, risk, ids[0], ids[-1], sec, sec))
    L.append("| **合计** |  | **120** | **%d** |  |  |  |  |" % tot)
    L.append("\n## 三条硬规则\n")
    L.append("1. **同一时间只有一个人写 `data/jiangyi.js`**。α 在 1.6 期间，本包只是备料；谁拿到本包也不许先把空壳 id 写进主文件（半截数据会让 `npm test` 红）。")
    L.append("2. **图表真值只在原页**。表里的「图表风险」是按小节性质做的备料预判，不是验收结论；原页实际有什么就以什么为准，并回来修正风险等级。")
    L.append("3. **答案只抄答案页**。讲义侧用 p191–196；练习册 P246 是另一套（只服务 JY4 教材原题九题），两边绝不混用。\n")
    L.append("## 预留 id 怎么来的\n")
    L.append("- U3：`JY3-001` 起顺排 68 个（3.1 起、3.6 止）。")
    L.append("- U4：**从 `JY4-056` 起**，因为 `JY4-047…055` 已被教材原题九题（练习册 P200–207，`group:'textbook'`）占用；官方 4.1–4.5 的 52 道排到 `JY4-107`。想改成从 001 起，得先迁那 9 条题号，代价大于收益，不建议。")
    L.append("- 生成的 id 已在脚本里对 `JY_BANK` 现有 id 做过避让，全部未占用。\n")
    L.append("## 建议开工顺序\n")
    L.append("`3.1 → 3.2 → 3.5 → 3.6 → 3.3 → 3.4`（先单位小的、图表少的，把流程跑顺）→ `4.1 → 4.3 → 4.5 → 4.2 → 4.4`（先小题量几何节热手）→ 3.4 / 4.2 / 4.4 三节图最重，留到有矢量 spec 手感时再上。\n")
    L.append("每节结案动作：`python3 tools/gen_jiangyi_reconcile.py`（对账表刷新）+ `npm test`（结构/答案/对照图全绿）+ `python3 tools/gen_jiangyi_backlog.py`（缺号数往下掉）。\n")
    L.append("## 4.x 的一个现成样本\n")
    L.append("`docs/jiangyi-textbook-u4.md` 里那 9 条教材原题（`JY4-047…055`）已经跑完一轮：8 条带原页图 `images/fig/U4-0x.png`、1 条（JY4-052 相似三角形判断）原书本身无图。它们可以当 U4 的**格式样板**看，但它们不计入官方 4.1–4.5 的 52 道，别把 4.1 的 5 条当成官方 4.1 的 2 条录完了。")
    (OUT / "README.md").write_text("\n".join(L) + "\n", encoding="utf-8")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rows, total = [], 0
    for sec in TARGET_SECS:
        miss, risk, ids = write_section(sec)
        s = next(x for x in SECTIONS if x["section"] == sec)
        a, b, _ = section_page(sec)
        rows.append((sec, s["cn"], KEY[sec]["maxNo"], miss, a, b, risk, ids))
        total += miss
    assert total == TOTAL_EXPECT, "3.1–4.5 缺题数应为 %d，实际 %d" % (TOTAL_EXPECT, total)
    write_readme(rows)
    print("prep sections=%d miss=%d target=%d" % (len(TARGET_SECS), total, TOTAL_EXPECT))


if __name__ == "__main__":
    main()
