#!/usr/bin/env python3
"""按补丁清单改 data/questions.js 的答案（幂等，只改 answer/value 字段）。

merge_transcribe_fragment.py 只新增不改写，答案订正走本工具：
  docs/transcribe/answer-patches*.json = [{"id":"R04-072","answer":"D","value":null,"note":"..."}]
  也支持顶层 {"note": "...", "patches": [...]} 结构。
每题在 questions.js 里是一行，逐行按 "id" 定位后替换 answer / value。
answer 兼容 null 与带引号字符串；补丁目标 answer 统一写为带引号字符串。
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATCH_GLOB = os.path.join(ROOT, "docs", "transcribe", "answer-patches*.json")
QFILE = os.path.join(ROOT, "data", "questions.js")


def load_patches():
    patches = []
    for path in sorted(glob.glob(PATCH_GLOB)):
        data = json.load(open(path, encoding="utf-8"))
        if isinstance(data, dict):
            data = data.get("patches") or []
        for p in data:
            p = dict(p)
            p["_source"] = os.path.basename(path)
            patches.append(p)
    return patches


def main():
    patches = load_patches()
    if not patches:
        print("没有补丁文件，跳过。")
        return 0
    lines = open(QFILE, encoding="utf-8").read().split("\n")
    changed, missing, noop = [], [], []
    for p in patches:
        qid = p["id"]
        target = p["answer"]
        hit = False
        for i, line in enumerate(lines):
            if '"id":"%s"' % qid not in line:
                continue
            hit = True
            m = re.search(r'"answer":(null|"(?:[^"\\]|\\.)*")', line)
            if not m:
                print("FAIL %s 行内无 answer 字段" % qid)
                return 1
            raw = m.group(1)
            current = None if raw == "null" else json.loads(raw)
            if current == target:
                noop.append(qid)
            else:
                replacement = '"%s"' % target
                lines[i] = line[:m.start(1)] + replacement + line[m.end(1):]
                changed.append("%s: %s -> %s" % (qid, current, target))
            if "value" in p and p.get("value") is not None:
                vm = re.search(r'"value":(null|[^,}\s]+)', lines[i])
                if vm:
                    newv = "null" if p["value"] is None else json.dumps(p["value"])
                    lines[i] = lines[:vm.start(1)] if False else lines[i][:vm.start(1)] + newv + lines[i][vm.end(1):]
            break
        if not hit:
            missing.append(qid)
    if missing:
        print("FAIL 补丁指向不存在的题: %s" % ", ".join(missing))
        return 1
    if changed:
        open(QFILE, "w", encoding="utf-8").write("\n".join(lines))
    print("补丁应用：改 %d 条（%s）；已一致 %d 条（%s）"
          % (len(changed), "; ".join(changed) or "-", len(noop), ", ".join(noop) or "-"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
