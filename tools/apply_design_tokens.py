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
    "tools/review-result-theme.css",
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
    "tools/history-card-theme.css",
    "tools/mobile-theme.css",
]
# 17 份：抽在开场 / 模考答题 / 开场标题 / 模考成绩 / 成绩单题行 /
# 目录+讲义 / 错题·记录空态 / 真题答题页 / 模考开场 / 板块结果 /
# 结果页底座 / 画布兜底 / 讲义首页 / 讲义做题页 / 记录·错题页头 /
# 记录页空态卡 / 手机端重排（末位，所有 @media 覆盖）。
# 38: 手机端页头左对齐、窄屏导航收窄。

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
