#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""r4 修复包幂等落库器（2026-11-26 裁定口径）。

输入（随仓库归档于 docs/transcribe/r4/）：
  - repair-pack.json          主包（01–04 册 + 表题/表体）
  - repair-pack-legacy.json   legacy 包（练习册 a/b + 讲义 2 条）
  - answer-corrections-r4.json 5 条 ANSWER_DIFF 答案订正

落库分层（只动这五个数据文件，禁止整文件重排）：
  - data/text.js      stem / choices:A|B|C|D
  - data/questions.js answer / value / type
  - data/figures.js   表 caption/head/headGroups、figure spec（spec_edit / remove_spec）
  - data/figure_crops.js / data/choice_crops.js  remove_spec 删注册对象

批次（--batch）：
  stems      rewrite_field(:stem) 整字段重录题干
  choices    rewrite_field(:choice) 整字段重录选项
  substring  find→replace 精确子串替换（默认须唯一命中；replaceAll=true 才允许多处）
  tables     set_caption / table_cell（head[N] / headGroups）
  specs      remove_spec / spec_edit
  answers    answer-corrections-r4.json 五条（含 TD-42-10 type grid→mcq）

口径：
  - patch=null 的 noop / anchor / redraw_figure / add_table_spec 一律不动数据，只进待办台账。
  - duplicate_of 标注的非活跃副本只落一次（落 canonical 活跃条目）。
  - 幂等：目标值已等于补丁则记 NOOP，不重复写；重跑不会叠加。
  - 子串命中 0 次、或 >1 次且未标 replaceAll → FAIL 退出（1），不硬凑。

用法：
  python3 tools/apply_repair_pack.py --batch stems [--dry-run]
  python3 tools/apply_repair_pack.py --batch all
"""
import argparse
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PACK_DIR = os.path.join(ROOT, "docs", "transcribe", "r4")

TEXT = os.path.join(ROOT, "data", "text.js")
BANK = os.path.join(ROOT, "data", "questions.js")
FIG = os.path.join(ROOT, "data", "figures.js")
FCROP = os.path.join(ROOT, "data", "figure_crops.js")
CCROP = os.path.join(ROOT, "data", "choice_crops.js")

SKIP_MODES = {"noop", "anchor", "redraw_figure", "add_table_spec"}

QSTR = r'"((?:[^"\\]|\\.)*)"'


# ---------------------------------------------------------------------------
# 补丁装载与活跃条目解析
# ---------------------------------------------------------------------------

def load_packs():
    packs = []
    for name in ("repair-pack.json", "repair-pack-legacy.json"):
        with io.open(os.path.join(PACK_DIR, name), encoding="utf-8") as f:
            packs.append(json.load(f))
    return packs


def canonical_map(packs):
    """返回 {id: bool}：False = 非活跃副本，补丁不落。"""
    canon = {}
    for d in packs:
        for dup in d.get("duplicate_items", []):
            if isinstance(dup, dict):
                canon[dup["id"]] = dup["canonical"]
    return canon


def redirect_map(packs):
    """主包旧录条目：canonical 字段存的是活跃条目 id（字符串），自身跳过。"""
    redirect = {}
    for d in packs:
        for it in d["items"]:
            c = it.get("canonical")
            if isinstance(c, str) and c and c != it["id"]:
                redirect[it["id"]] = c
    return redirect


def iter_patches(packs, canon, redirect):
    """逐条产出 (record, patch)；非活跃副本跳过。"""
    for d in packs:
        for it in d["items"]:
            i = it["id"]
            if i in redirect:
                continue
            if i in canon and not canon[i]:
                continue
            for p in it["patches"]:
                yield it, p


def classify(mode, field):
    if field == "stem" and mode in ("rewrite_field:stem", "rewrite_field"):
        return "stems"
    if field.startswith("choice:") and mode in ("rewrite_field:choice", "rewrite_field"):
        return "choices"
    if mode == "substring":
        return "substring"
    if field.startswith("table."):
        return "tables"
    if mode in ("remove_spec", "spec_edit"):
        return "specs"
    if mode == "type_fix":
        return "answers"
    return None


# ---------------------------------------------------------------------------
# 通用小工具
# ---------------------------------------------------------------------------

def decode(raw):
    return json.loads('"%s"' % raw)


def encode(value):
    """序列化为 JS 字符串字面量内部内容（不含外层引号），ensure_ascii 保留仓库转义习惯。"""
    return json.dumps(value, ensure_ascii=True)[1:-1]


def fail(msg):
    print("FAIL %s" % msg, file=sys.stderr)
    sys.exit(1)


def brace_span(text, start):
    """从 text[start]（应为 '{'）做花括号配对，返回 [start, end)。尊重字符串/转义。"""
    assert text[start] == "{", "brace_span 起点不是对象开头：%r" % text[start]
    depth, j, ins, esc, quote = 0, start, False, False, ""
    while j < len(text):
        c = text[j]
        if ins:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == quote:
                ins = False
        else:
            if c in "\"'":
                ins, quote = True, c
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    return start, j + 1
        j += 1
    fail("花括号未闭合：%s" % text[start:start+60])


def bracket_span(text, start):
    """从 text[start]（应为 '['）做方括号配对，返回 [start, end)。"""
    depth, j, ins, esc, quote = 0, start, False, False, ""
    while j < len(text):
        c = text[j]
        if ins:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == quote:
                ins = False
        else:
            if c in "\"'":
                ins, quote = True, c
            elif c == "[":
                depth += 1
            elif c == "]":
                depth -= 1
                if depth == 0:
                    return start, j + 1
        j += 1
    fail("方括号未闭合：%s" % text[start:start+60])


# ---------------------------------------------------------------------------
# data/text.js 操作（一题一行，按 "ID": { 定位整行）
# ---------------------------------------------------------------------------

class TextLayer:
    def __init__(self, path):
        self.path = path
        self.lines = io.open(path, encoding="utf-8").read().split("\n")
        self.changed = 0

    def record_line(self, qid):
        pat = re.compile(r'^  "%s": \{' % re.escape(qid))
        for idx, line in enumerate(self.lines):
            if pat.match(line):
                return idx
        return -1

    @staticmethod
    def _extract(line, key):
        m = re.search(r'"%s":%s' % (re.escape(key), QSTR), line)
        return m

    def set_field(self, qid, key, new_value, old_value, log):
        idx = self.record_line(qid)
        if idx < 0:
            fail("text.js 找不到记录：%s" % qid)
        line = self.lines[idx]
        m = self._extract(line, key)
        if m:
            cur = decode(m.group(1))
            if cur == new_value:
                log.append("NOOP  %s | %s | 已一致" % (qid, key))
                return
            self.lines[idx] = line[:m.start(1)] + encode(new_value) + line[m.end(1):]
            self.changed += 1
            log.append("SET   %s | %s | %r → %r" % (qid, key, old_value or cur, new_value))
        else:
            # 选项键缺失（TD-42-10 由 grid 补四选项）：插进 choices 对象
            cm = re.search(r'"choices":\{', line)
            if not cm:
                fail("%s 行内无 choices 对象：%s" % (qid, line[:120]))
            ostart = cm.end() - 1
            _, oend = brace_span(line, ostart)
            body = line[ostart + 1:oend - 1]
            prefix = "" if body.strip() == "" else ", "
            new_seg = '"%s":"%s"' % (key, encode(new_value))
            self.lines[idx] = line[:ostart + 1] + prefix + new_seg + line[oend - 1:]
            self.changed += 1
            log.append("ADD   %s | choice:%s | → %r" % (qid, key, new_value))

    def substring(self, qid, key, find, repl, replace_all, log):
        idx = self.record_line(qid)
        if idx < 0:
            fail("text.js 找不到记录：%s" % qid)
        line = self.lines[idx]
        m = self._extract(line, key)
        if not m:
            fail("%s 行内无字段 %s" % (qid, key))
        cur = decode(m.group(1))
        if find not in cur:
            if repl in cur:
                log.append("NOOP  %s | %s | 替换结果已在库" % (qid, key))
                return
            fail("%s | %s | 子串未命中：%r" % (qid, key, find[:50]))
        cnt = cur.count(find)
        if cnt > 1 and not replace_all:
            fail("%s | %s | 子串命中 %d 次（未标 replaceAll）：%r" % (qid, key, cnt, find[:50]))
        new = cur.replace(find, repl)
        if new == cur:
            log.append("NOOP  %s | %s | 无变化" % (qid, key))
            return
        self.lines[idx] = line[:m.start(1)] + encode(new) + line[m.end(1):]
        self.changed += 1
        log.append("SUB   %s | %s | %r → %r" % (qid, key, find[:40], repl[:40]))

    def write(self):
        if self.changed:
            io.open(self.path, "w", encoding="utf-8").write("\n".join(self.lines))


# ---------------------------------------------------------------------------
# data/questions.js 操作（一题一行，按 "id":"ID" 定位）
# ---------------------------------------------------------------------------

class BankLayer:
    def __init__(self, path):
        self.path = path
        self.lines = io.open(path, encoding="utf-8").read().split("\n")
        self.changed = 0

    def record_line(self, qid):
        pat = re.compile(r'"id":"%s"' % re.escape(qid))
        for idx, line in enumerate(self.lines):
            if pat.search(line):
                return idx
        return -1

    def set_answer(self, qid, answer, value, log, type_=None):
        idx = self.record_line(qid)
        if idx < 0:
            fail("questions.js 找不到记录：%s" % qid)
        line = self.lines[idx]
        m = re.search(r'"answer":"(.*?)"', line)
        if not m:
            fail("%s 行内无 answer 字段" % qid)
        old_ans = m.group(1)
        if old_ans != answer:
            self.lines[idx] = line[:m.start(1)] + answer + line[m.end(1):]
            line = self.lines[idx]
            self.changed += 1
            log.append("ANS   %s | answer | %r → %r" % (qid, old_ans, answer))
        else:
            log.append("NOOP  %s | answer | 已一致" % qid)
        if value is not None or True:
            vm = re.search(r'"value":(null|[^,}\s]+)', line)
            if vm:
                newv = "null" if value is None else json.dumps(value)
                if vm.group(1) != newv:
                    self.lines[idx] = line[:vm.start(1)] + newv + line[vm.end(1):]
                    line = self.lines[idx]
                    self.changed += 1
                    log.append("VAL   %s | value | %s → %s" % (qid, vm.group(1), newv))
        if type_ is not None:
            tm = re.search(r'"type":"(.*?)"', line)
            if tm and tm.group(1) != type_:
                self.lines[idx] = line[:tm.start(1)] + type_ + line[tm.end(1):]
                line = self.lines[idx]
                self.changed += 1
                log.append("TYPE  %s | type | %r → %r" % (qid, tm.group(1), type_))

    def write(self):
        if self.changed:
            io.open(self.path, "w", encoding="utf-8").write("\n".join(self.lines))


# ---------------------------------------------------------------------------
# data/figures.js 操作（条目花括号配对，局部外科手术，不重排其余字节）
# ---------------------------------------------------------------------------

class FigureLayer:
    def __init__(self, path):
        self.path = path
        self.src = io.open(path, encoding="utf-8").read()
        self.fcrop = io.open(FCROP, encoding="utf-8").read()
        self.ccrop = io.open(CCROP, encoding="utf-8").read()
        self.changed = 0

    def entry_span(self, qid):
        m = re.search(r"(^  ['\"]" + re.escape(qid) + r"['\"]:\s*)", self.src, re.M)
        if not m:
            return None
        body_start = m.end()
        if self.src[body_start] != "{":
            fail("%s 条目不是对象开头" % qid)
        _, body_end = brace_span(self.src, body_start)
        return m.start(), body_start, body_end

    def _replace_entry(self, span, new_body):
        start, body_start, body_end = span
        head = self.src[start:body_start]
        self.src = self.src[:start] + head + new_body + self.src[body_end:]
        self.changed += 1

    # ---- table.caption ----
    def set_caption(self, qid, caption, log):
        span = self.entry_span(qid)
        if not span:
            fail("figures.js 找不到条目：%s" % qid)
        start, bs, be = span
        body = self.src[bs:be]
        cm = re.search(r'["\']?caption["\']?:%s' % QSTR, body)
        if cm:
            cur = decode(cm.group(1))
            if cur == caption:
                log.append("NOOP  %s | table.caption | 已一致" % qid)
                return
            new_body = body[:cm.start(1)] + encode(caption) + body[cm.end(1):]
            self._replace_entry(span, new_body)
            log.append("CAP   %s | table.caption | %r → %r" % (qid, cur, caption))
        else:
            tm = re.search(r'["\']?type["\']?\s*:\s*["\']table["\']', body)
            if not tm:
                fail("%s 条目非 table，无法插 caption" % qid)
            ins = tm.end()
            new_body = body[:ins] + ',caption:"%s"' % encode(caption) + body[ins:]
            self._replace_entry(span, new_body)
            log.append("CAP+  %s | table.caption | → %r" % (qid, caption))

    # ---- table.head[N] ----
    def head_cell(self, qid, idx, value, log):
        span = self.entry_span(qid)
        if not span:
            fail("figures.js 找不到条目：%s" % qid)
        start, bs, be = span
        body = self.src[bs:be]
        hm = re.search(r'["\']?head["\']?\s*:\s*', body)
        if not hm:
            fail("%s 条目无 head 数组" % qid)
        arr_start = body.index("[", hm.end())
        _, arr_end = bracket_span(body, arr_start)
        arr_body = body[arr_start + 1:arr_end - 1]
        elems = self._head_elements(arr_body)
        if idx >= len(elems):
            fail("%s head 第 %d 列越界（共 %d 列）" % (qid, idx, len(elems)))
        old_raw, old_span = elems[idx]
        old = decode(old_raw)
        if old == value:
            log.append("NOOP  %s | table.head[%d] | 已一致" % (qid, idx))
            return
        new_arr = (arr_body[:old_span[0]] + '"%s"' % encode(value)
                   + arr_body[old_span[1]:])
        new_body = body[:arr_start] + "[" + new_arr + "]" + body[arr_end:]
        self._replace_entry(span, new_body)
        log.append("CELL  %s | table.head[%d] | %r → %r" % (qid, idx, old, value))

    @staticmethod
    def _head_elements(arr_body):
        """返回 [(raw_inner, (start,end))]，元素为带引号字符串。"""
        out, i = [], 0
        while i < len(arr_body):
            c = arr_body[i]
            if c in "\"'":
                j = i + 1
                esc = False
                while j < len(arr_body):
                    ch = arr_body[j]
                    if esc:
                        esc = False
                    elif ch == "\\":
                        esc = True
                    elif ch == c:
                        break
                    j += 1
                raw = arr_body[i + 1:j]
                out.append((raw, (i, j + 1)))
                i = j + 1
            else:
                i += 1
        return out

    # ---- table.headGroups ----
    def head_groups(self, qid, title, columns, log):
        span = self.entry_span(qid)
        if not span:
            fail("figures.js 找不到条目：%s" % qid)
        start, bs, be = span
        body = self.src[bs:be]
        groups = [{"label": title, "span": len(columns)}]
        new_block = "headGroups:" + json.dumps(groups, ensure_ascii=True)
        if re.search(r'["\']?headGroups["\']?\s*:', body):
            gm = re.search(r'["\']?headGroups["\']?\s*:\s*\[.*?\]', body)
            if not gm:
                fail("%s headGroups 块解析失败" % qid)
            cur = body[gm.start():gm.end()]
            if cur == new_block:
                log.append("NOOP  %s | table.headGroups | 已一致" % qid)
                return
            new_body = body[:gm.start()] + new_block + body[gm.end():]
            self._replace_entry(span, new_body)
            log.append("GRP   %s | table.headGroups | → %r" % (qid, groups))
        else:
            hm = re.search(r'["\']?head["\']?\s*:\s*\[.*?\]', body)
            if not hm:
                fail("%s 条目无 head 数组可挂 headGroups" % qid)
            ins = hm.end()
            new_body = body[:ins] + "," + new_block + body[ins:]
            self._replace_entry(span, new_body)
            log.append("GRP+  %s | table.headGroups | → %r" % (qid, groups))

    # ---- spec_edit：x/y 子对象深合并 ----
    def spec_merge(self, qid, patch, log):
        span = self.entry_span(qid)
        if not span:
            fail("figures.js 找不到 spec：%s" % qid)
        start, bs, be = span
        body = self.src[bs:be]
        for axis in ("x", "y"):
            if axis not in patch:
                continue
            am = re.search(r'["\']?%s["\']?\s*:\s*\{' % axis, body)
            if not am:
                fail("%s spec 无 %s 子对象" % (qid, axis))
            ostart = body.index("{", am.end() - 1)
            _, oend = brace_span(body, ostart)
            sub = body[ostart:oend]
            for k, v in patch[axis].items():
                sub = self._set_leaf(sub, k, v)
            body = body[:ostart] + sub + body[oend:]
        self._replace_entry(span, body)
        log.append("MERGE %s | figure.spec | %r" % (qid, patch))

    @staticmethod
    def _set_leaf(sub, key, value):
        vm = re.search(r'["\']?%s["\']?\s*:\s*([^,}]+)' % re.escape(key), sub)
        enc_v = json.dumps(value, ensure_ascii=True)
        if vm:
            if vm.group(1).strip() == enc_v:
                return sub
            return sub[:vm.start(1)] + enc_v + sub[vm.end(1):]
        # 叶子缺失：补到对象末尾 '}' 前
        return sub[:-1].rstrip() + ("," if sub[sub.rfind("{") + 1:].strip() else "") + "%s:%s}" % (
            json.dumps(key, ensure_ascii=True), enc_v)

    # ---- spec_edit：marks 增删 ----
    def spec_mark(self, qid, op, payload, log):
        span = self.entry_span(qid)
        if not span:
            fail("figures.js 找不到 spec：%s" % qid)
        start, bs, be = span
        body = self.src[bs:be]
        mm = re.search(r'["\']?marks["\']?\s*:\s*\[', body)
        if not mm:
            if op == "addMark":
                ins = body.rfind("}")
                mark = self._mark_text(payload)
                body = body[:ins] + ",marks:[" + mark + "]" + body[ins:]
                self._replace_entry(span, body)
                log.append("MARK+ %s | addMark | %r" % (qid, payload))
                return
            fail("%s spec 无 marks 数组，无法 %s" % (qid, op))
        arr_start = body.index("[", mm.end() - 1)
        _, arr_end = bracket_span(body, arr_start)
        arr_body = body[arr_start + 1:arr_end - 1]
        marks = self._parse_marks(arr_body)  # 现有 mark 保留原始片段文本
        if op == "addMark":
            marks.append(self._mark_text(payload))
            log.append("MARK+ %s | addMark | %r" % (qid, payload))
        elif op == "removeMark":
            marks = [m for m in marks if not self._match(m, payload)]
            log.append("MARK- %s | removeMark | %r" % (qid, payload))
        elif op == "removeMarks":
            for pl in payload:
                marks = [m for m in marks if not self._match(m, pl)]
            log.append("MARK- %s | removeMarks | %r" % (qid, payload))
        new_arr = ",".join(marks)
        new_body = body[:arr_start] + "[" + new_arr + "]" + body[arr_end:]
        self._replace_entry(span, new_body)

    @staticmethod
    def _parse_marks(arr_body):
        marks, i = [], 0
        while i < len(arr_body):
            if arr_body[i] == "{":
                _, j = brace_span(arr_body, i)
                seg = arr_body[i:j]
                marks.append(seg)
                i = j
            else:
                i += 1
        return marks

    @staticmethod
    def _match(seg, payload):
        def val(key):
            m = re.search(r"\b%s:\s*([^,}]+)" % key, seg)
            return m.group(1).strip().strip('"') if m else None
        return (val("x") == str(payload["x"]) and val("y") == str(payload["y"])
                and val("label") == str(payload.get("label", "")))

    @staticmethod
    def _mark_text(payload):
        parts = ["x:%s" % json.dumps(payload["x"], ensure_ascii=True),
                 "y:%s" % json.dumps(payload["y"], ensure_ascii=True)]
        if "label" in payload:
            parts.append("label:%s" % json.dumps(payload["label"], ensure_ascii=True))
        if payload.get("leader"):
            parts.append("arrow:true")
        for k in ("dx", "dy"):
            if k in payload:
                parts.append("%s:%s" % (k, json.dumps(payload[k], ensure_ascii=True)))
        return "{" + ",".join(parts) + "}"

    # ---- remove_spec：扫三个注册表删条目 ----
    def remove_spec(self, qid, log):
        hit = False
        # 1) figures.js TD_FIG_SPECS
        span = self.entry_span(qid)
        if span:
            start, bs, be = span
            # 连同尾逗号与多余空行一起删
            end = be
            if end < len(self.src) and self.src[end] == ",":
                end += 1
            if end < len(self.src) and self.src[end] == "\n":
                end += 1
            self.src = self.src[:start] + self.src[end:]
            self.changed += 1
            hit = True
            log.append("RM-spec %s | figures.js 删除 spec 条目" % qid)
        # 2) figure_crops.js 扁平字典
        fm = re.search(r'"%s"\s*:\s*"[^"]*",?' % re.escape(qid), self.fcrop)
        if fm:
            self.fcrop = self.fcrop[:fm.start()] + self.fcrop[fm.end():]
            self.changed += 1
            hit = True
            log.append("RM-crop %s | figure_crops.js 删除裁图注册" % qid)
        # 3) choice_crops.js 嵌套对象
        cm = re.search(r'"%s":\s*\{' % re.escape(qid), self.ccrop)
        if cm:
            ostart = self.ccrop.index("{", cm.start())
            _, oend = brace_span(self.ccrop, ostart)
            end = oend
            if end < len(self.ccrop) and self.ccrop[end] == ",":
                end += 1
            self.ccrop = self.ccrop[:cm.start()] + self.ccrop[end:]
            self.changed += 1
            hit = True
            log.append("RM-choicecrop %s | choice_crops.js 删除选项裁图" % qid)
        if not hit:
            log.append("NOOP  %s | remove_spec | 三个注册表均无此 id" % qid)

    def write(self):
        if self.changed:
            io.open(self.path, "w", encoding="utf-8").write(self.src)
            io.open(FCROP, "w", encoding="utf-8").write(self.fcrop)
            io.open(CCROP, "w", encoding="utf-8").write(self.ccrop)


# ---------------------------------------------------------------------------
# 批次驱动
# ---------------------------------------------------------------------------

def apply_batch(batch, dry_run):
    packs = load_packs()
    canon = canonical_map(packs)
    redirect = redirect_map(packs)
    log, skipped = [], []
    n_change = 0

    text = TextLayer(TEXT)
    bank = BankLayer(BANK)
    fig = FigureLayer(FIG)

    if batch == "answers":
        corr = json.load(io.open(os.path.join(PACK_DIR, "answer-corrections-r4.json"),
                                encoding="utf-8"))
        for c in corr["corrections"]:
            bank.set_answer(c["id"], c["answer"], c.get("value"), log,
                            type_=c.get("type"))
        # legacy 包内 TD-42-10 type_fix 已被上面覆盖，避免二次写
        for it, p in iter_patches(packs, canon, redirect):
            if p["mode"] == "type_fix":
                log.append("SKIP  %s | type_fix | 已由 answer-corrections-r4 覆盖" % it["id"])
    else:
        for it, p in iter_patches(packs, canon, redirect):
            i = it["id"]
            mode, field = p["mode"], p["field"]
            if mode in SKIP_MODES:
                skipped.append({"id": i, "mode": mode, "field": field,
                                "note": p.get("note", ""), "original": p.get("original")})
                continue
            b = classify(mode, field)
            if b != batch:
                continue
            if mode == "substring":
                key = "stem" if field == "stem" else field.split(":")[1]
                text.substring(i, key, p.get("find"), p.get("replace"),
                               bool(p.get("replaceAll")), log)
            elif field == "stem":
                text.set_field(i, "stem", p["patch"], p.get("current"), log)
            elif field.startswith("choice:"):
                letter = field.split(":")[1]
                text.set_field(i, letter, p["patch"], p.get("current"), log)
            elif field == "table.caption":
                fig.set_caption(i, p["patch"], log)
            elif re.match(r"table\.head\[(\d+)\]", field):
                idx = int(re.match(r"table\.head\[(\d+)\]", field).group(1))
                fig.head_cell(i, idx, p["patch"], log)
            elif field == "table.headGroups":
                pl = p["patch"]
                fig.head_groups(i, pl["title"], pl["columns"], log)
            elif mode == "remove_spec":
                fig.remove_spec(i, log)
            elif mode == "spec_edit":
                pl = p["patch"]
                if isinstance(pl, dict) and ("x" in pl or "y" in pl):
                    fig.spec_merge(i, pl, log)
                elif "addMark" in pl:
                    fig.spec_mark(i, "addMark", pl["addMark"], log)
                elif "removeMark" in pl:
                    fig.spec_mark(i, "removeMark", pl["removeMark"], log)
                elif "removeMarks" in pl:
                    fig.spec_mark(i, "removeMarks", pl["removeMarks"], log)
                else:
                    fail("%s spec_edit 载荷无法识别：%r" % (i, pl))

    n_change = text.changed + bank.changed + fig.changed
    for line in log:
        print(line)
    print("----")
    print("批次 %s：改动字段 %d；日志 %d 条；待办/跳过 %d 条"
          % (batch, n_change, len(log), len(skipped)))

    if not dry_run:
        text.write()
        bank.write()
        fig.write()
    else:
        print("(dry-run，未写盘)")

    return {"batch": batch, "changed": n_change, "log": log, "skipped": skipped}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch", required=True,
                    choices=["stems", "choices", "substring", "tables", "specs",
                             "answers", "all"])
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    batches = ["stems", "choices", "substring", "tables", "specs", "answers"] \
        if args.batch == "all" else [args.batch]
    for b in batches:
        print("===== batch: %s =====" % b)
        apply_batch(b, args.dry_run)


if __name__ == "__main__":
    main()
