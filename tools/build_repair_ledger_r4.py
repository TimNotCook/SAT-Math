#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""由 r4 三份补丁包生成 docs/transcribe/repair-ledger-r4.md 落库台账。"""
import json
import os
import re
import io

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PACK_DIR = os.path.join(ROOT, "docs", "transcribe", "r4")
OUT = os.path.join(ROOT, "docs", "transcribe", "repair-ledger-r4.md")

COMMIT = {
    "stems": "be6ee31ab5b171765e209b179a783eef154dc49b",
    "choices": "b0c6b247e94aa3007636fba1de8758d892ba2ddf",
    "substring": "28d85dfdedda874bb163b88c3bfacc2d906fc86f",
    "tables": "956ec21d3df2f374cb3aa452cf0c37e7be38c22c",
    "specs": "6567e31f40de0e9d00fc42b2df459e130e69d943",
    "answers": "525c75efa000ff5d75f5419f0004a2e8eac636cc",
}

# 口径 #3：数据错→按原页改回（source_verified）；原页本身可疑→照原页原样录（source_doubt）
SOURCE_VERIFIED = {"TD-32-08", "TD-41-02", "TD-25-18"}
SOURCE_DOUBT = {"TD-16-05", "TD-24-04", "TD-24-07", "U2-10", "TD-23-25"}


def load(name):
    return json.load(io.open(os.path.join(PACK_DIR, name), encoding="utf-8"))


def short(v, n=80):
    if v is None:
        return "—"
    s = str(v).replace("|", "\\|").replace("\n", " ⏎ ")
    return s if len(s) <= n else s[: n - 1] + "…"


def main():
    packs = [load("repair-pack.json"), load("repair-pack-legacy.json")]
    canon, redirect = {}, {}
    for d in packs:
        for dup in d.get("duplicate_items", []):
            if isinstance(dup, dict):
                canon[dup["id"]] = dup["canonical"]
    for d in packs:
        for it in d["items"]:
            c = it.get("canonical")
            if isinstance(c, str) and c and c != it["id"]:
                redirect[it["id"]] = c

    rows = {"stems": [], "choices": [], "substring": [], "tables": [], "specs": []}
    seen = {"stems": set(), "choices": set(), "substring": set(), "tables": set(), "specs": set()}
    todos, skipped = [], []

    for d in packs:
        for it in d["items"]:
            i = it["id"]
            if i in redirect:
                continue
            if i in canon and not canon[i]:
                continue
            for p in it["patches"]:
                mode, field = p["mode"], p["field"]
                rec = {"id": i, "page_ref": it["page_ref"], "field": field,
                       "note": p.get("note", "")}
                if mode in ("noop", "anchor", "redraw_figure", "add_table_spec"):
                    todos.append((rec, mode, p))
                    continue
                if mode == "type_fix":
                    continue  # 已并入 answers 批
                if field == "stem" and mode in ("rewrite_field:stem", "rewrite_field"):
                    b = "stems"
                    prev, new = p.get("current"), p["patch"]
                elif field.startswith("choice:") and mode in ("rewrite_field:choice", "rewrite_field"):
                    b = "choices"
                    prev, new = p.get("current"), p["patch"]
                elif mode == "substring":
                    b = "substring"
                    prev, new = p.get("find"), p.get("replace")
                elif field.startswith("table."):
                    b = "tables"
                    prev, new = p.get("current"), p["patch"]
                elif mode == "remove_spec":
                    b = "specs"
                    prev, new = "误挂 spec/裁图注册", "已摘除注册条目"
                elif mode == "spec_edit":
                    b = "specs"
                    prev, new = p.get("current"), json.dumps(p["patch"], ensure_ascii=False)
                else:
                    skipped.append((rec, mode, p))
                    continue
                if i in SOURCE_VERIFIED:
                    status = "source_verified"
                elif i in SOURCE_DOUBT:
                    status = "source_doubt"
                else:
                    status = "已落库"
                key = (rec["id"], rec["field"], str(prev), str(new), status)
                if key in seen[b]:
                    continue
                seen[b].add(key)
                rows[b].append((rec, prev, new, status))

    corr = load("answer-corrections-r4.json")["corrections"]

    out = []
    out.append("# r4 修复包落库台账（2026-11-26）\n")
    out.append("> 配套落库器：`tools/apply_repair_pack.py`（幂等，可重跑）；输入归档：`docs/transcribe/r4/`。\n")
    out.append("> 裁定口径：不改题面去迁就答案；已判 MATCH 的题不动；`duplicate_of` 非活跃副本只落一次。\n")

    out.append("\n## 一、分批提交与线上版本\n")
    out.append("| 批次 | 内容 | 字段/条目 | commit | 测试 | 线上 `?v=` |")
    out.append("|---|---|---|---|---|---|")
    out.append("| 批1 stems | 整字段重录题干 | 33 字段 | `%s` | 163 pass / 0 fail | 4b4858dbc9aa |" % COMMIT["stems"])
    out.append("| 批2 choices | 整字段重录选项（含 TD-42-10 补四选项） | 28 题 / 68 字段 | `%s` | 165 pass / 0 fail | 600acaa88fbf |" % COMMIT["choices"])
    out.append("| 批3 substring | find→replace 精确订正 | 32 字段 | `%s` | 165 pass / 0 fail | b97dd65991d8 |" % COMMIT["substring"])
    out.append("| 批4 tables | 表题/表头/列分组订正 | 11 题 / 12 字段 | `%s` | 165 pass / 0 fail | 97d9c7ffd4e1 |" % COMMIT["tables"])
    out.append("| 批5 specs | 摘除误挂 spec/裁图 + spec 修订 | 19 摘除 + 6 修订 | `%s` | 165 pass / 0 fail | 282a62d7a2c9 |" % COMMIT["specs"])
    out.append("| 批6 answers | ANSWER_DIFF 答案订正（TD-42-10 grid→mcq） | 5 题 / 11 字段 | `%s` | 165 pass / 0 fail | 99646a218827 |" % COMMIT["answers"])
    out.append("")
    out.append("线上复核（codeload main + GitHub Pages 实抓，`Cache-Control: no-cache`）：题库总数 **1292**，"
               "`retired` **61**，`mergedInto` **1**，`hidden` **2**（section 级：2.6.T17 / 2.6.T18），"
               "`variant` **0**，与基线一致，本批未改动任何计数。\n")

    out.append("\n## 二、答案订正（ANSWER_DIFF，批6）\n")
    out.append("| id | 页源 | 订正前答案 | 订正后答案 | value | type | 依据页 | commit |")
    out.append("|---|---|---|---|---|---|---|---|")
    for c in corr:
        src = "%s P%s · #%s" % (c.get("book", ""), c.get("page", ""), c.get("no", ""))
        val = "null" if c.get("value") is None else c["value"]
        type_ = c.get("type", "mcq" if c["answer"] in ("A", "B", "C", "D") else "grid")
        out.append("| %s | %s | %s | **%s** | %s | %s | %s | `%s` |" % (
            c["id"], short(src, 30), c.get("prev_answer", "—"),
            c["answer"], val, type_, short(c.get("key_page", ""), 30), COMMIT["answers"]))
    out.append("")
    out.append("**ANSWER_CONFLICT（4 条，不改库）**：按 2026-11-26 裁定，以「题目来源书自带答案」为准，"
               "`答案 2.pdf`（Topic 题册答案）仅作交叉参考；这 4 条库内值本就等于自带答案，故未改数据。"
               "⚠️ r4 三份输入未枚举这 4 条的具体 id，本台账先记裁定类别；待审计清单回填后补 id 列。\n")

    batch_titles = [
        ("stems", "三、题干重录（批1）"),
        ("choices", "四、选项重录（批2）"),
        ("substring", "五、子串精确订正（批3）"),
        ("tables", "六、表格题订正（批4）"),
        ("specs", "七、spec 摘除与修订（批5）"),
    ]
    for key, title in batch_titles:
        out.append("\n## %s\n" % title)
        out.append("| id | 页源 | 字段 | 订正前 | 订正后 | 状态 | commit |")
        out.append("|---|---|---|---|---|---|---|")
        for rec, prev, new, status in rows[key]:
            out.append("| %s | %s | %s | %s | %s | %s | `%s` |" % (
                rec["id"], short(rec["page_ref"], 24), rec["field"],
                short(prev), short(new), status, COMMIT[key]))
        out.append("")

    out.append("\n## 八、待办（本批不落数据）\n")
    out.append("### 8.1 缺图待重画（redraw_figure，patch=null）\n")
    out.append("| id | 页源 | 说明 |")
    out.append("|---|---|---|")
    for rec, mode, p in todos:
        if mode == "redraw_figure":
            out.append("| %s | %s | %s |" % (rec["id"], short(rec["page_ref"], 24), short(rec["note"], 90)))
    out.append("")
    out.append("### 8.2 缺表待补（add_table_spec，patch=null）\n")
    out.append("| id | 页源 | 说明 |")
    out.append("|---|---|---|")
    for rec, mode, p in todos:
        if mode == "add_table_spec":
            out.append("| %s | %s | %s |" % (rec["id"], short(rec["page_ref"], 24), short(rec["note"], 90)))
    out.append("")
    out.append("### 8.3 锚点订正（anchor，不动数据）\n")
    out.append("| id | 页源 | 说明 |")
    out.append("|---|---|---|")
    for rec, mode, p in todos:
        if mode == "anchor":
            out.append("| %s | %s | %s |" % (rec["id"], short(rec["page_ref"], 24), short(rec["note"], 90)))
    out.append("")
    out.append("### 8.4 台账标记 noop（不改题面，落库前回看原页）\n")
    out.append("| id | 页源 | 状态 | 说明 |")
    out.append("|---|---|---|---|")
    for rec, mode, p in todos:
        if mode == "noop":
            st = "source_doubt" if rec["id"] in SOURCE_DOUBT else "已落库(noop)"
            out.append("| %s | %s | %s | %s |" % (rec["id"], short(rec["page_ref"], 24), st, short(rec["note"], 90)))
    out.append("")

    io.open(OUT, "w", encoding="utf-8").write("\n".join(out))
    print("written:", OUT)
    for k in rows:
        print(k, len(rows[k]))
    print("todos", len(todos), "skipped", len(skipped))


if __name__ == "__main__":
    main()
