"""把 tools/ 下的设计 token 同步进 glass.css（按 marker 整体替换，幂等）。

用法：python3 tools/apply_design_tokens.py

2026-11-28：整体回退到原来的主题（"改回原来的主题"）。
SOURCES 清空 => glass.css 只保留原始底座（淡奶白 + 蓝图蓝 + 白玻璃卡），
纸面 / 沙色那套覆盖层整段移除。要恢复：把下面注释里的 23 份按顺序填回 SOURCES，
再推一次本文件即可，脚本幂等、按 marker 整段替换。
"""
import io

MARKER = "/* ==== study-theme v2"
SOURCES = []
# 原 23 份（回到纸面主题时按原顺序填回）：
# tools/study-theme.css
# tools/question-theme.css
# tools/intro-theme.css
# tools/result-theme.css
# tools/review-result-theme.css
# tools/catalog-theme.css
# tools/archive-theme.css
# tools/practice-theme.css
# tools/practice-theme-nav.css
# tools/reference-sheet-theme.css
# tools/mock-theme.css
# tools/result-practice-theme.css
# tools/result-practice-refine.css
# tools/result-blank-guard.css
# tools/result-rail-base.css
# tools/canvas-base.css
# tools/notes-theme.css
# tools/notes-quiz-theme.css
# tools/jy-result-theme.css
# tools/empty-state-theme.css
# tools/history-card-theme.css
# tools/mobile-theme.css
# tools/dark-theme.css

src = io.open("glass.css", encoding="utf-8").read()
i = src.find(MARKER)
base = (src[:i] if i != -1 else src).rstrip()

out = base + "\n"
if SOURCES:
    blocks = [io.open(f, encoding="utf-8").read().strip() for f in SOURCES]
    out = base + "\n\n" + "\n\n".join(blocks) + "\n"
while "\n\n\n" in out:
    out = out.replace("\n\n\n", "\n\n")
assert out.count("{") == out.count("}"), "brace mismatch"
io.open("glass.css", "w", encoding="utf-8").write(out)
print("glass.css synced: %d bytes" % len(out))
