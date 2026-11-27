"""把 tools/ 下的设计 token 同步进 glass.css（按 marker 整体替换，幂等）。

用法：python3 tools/apply_design_tokens.py
"""
import io

MARKER = "/* ==== study-theme v2"
SOURCES = [
    "tools/study-theme.css",
    "tools/question-theme.css",
    "tools/intro-theme.css",
    "tools/result-theme.css",
    "tools/catalog-theme.css",
    "tools/archive-theme.css",
    "tools/practice-theme.css",
    "tools/mock-theme.css",
    "tools/result-practice-theme.css",
    "tools/result-rail-base.css",
    "tools/canvas-base.css",
    "tools/notes-theme.css",
    "tools/notes-quiz-theme.css",
    "tools/empty-state-theme.css",
]
# 每页一份 theme：study(抽查开场) / question(模考答题) / intro(开场标题层) /
# result(模考成绩) / catalog(练习首页+讲义) / archive(错题·记录空态) /
# practice(真题答题页) / mock(模考开场) / result-practice(板块结果) /
# result-rail-base(结果页左栏底座) / canvas-base(画布兜底) /
# notes-theme(讲义首页目录卡) / notes-quiz-theme(讲义做题页+本节结果) /
# empty-state-theme(记录/错题空态)。
# 27: 空态。

src = io.open("glass.css", encoding="utf-8").read()
i = src.find(MARKER)
base = (src[:i] if i != -1 else src).rstrip()

blocks = [io.open(f, encoding="utf-8").read().strip() for f in SOURCES]
out = base + "\n\n" + "\n\n".join(blocks) + "\n"
while "\n\n\n" in out:
    out = out.replace("\n\n\n", "\n\n")
assert out.count("{") == out.count("}"), "brace mismatch"
io.open("glass.css", "w", encoding="utf-8").write(out)
print("glass.css synced: %d bytes" % len(out))
