"""给答题页顶栏注入 2px 进度线：在 exam.js 渲染每题时写 CSS 变量。
幂等：已含 progress-rail 标记则直接退出。
"""
import io
import sys

PATH = "exam.js"
MARK = "progress-rail"
OLD = "    $('qNum').textContent = String(pos);\n"
NEW = (
    OLD
    + "    /* progress-rail: 顶栏底部 2px 进度线（样式在 glass.css 的 question-theme 块） */\n"
    + "    (function(){const bar=document.querySelector('.drill-questionbar-inner');"
    + "if(bar&&total>0)bar.style.setProperty('--q-progress',(pos/total*100).toFixed(2)+'%');})();\n"
)

src = io.open(PATH, encoding="utf-8").read()
if MARK in src:
    print("progress-rail already applied")
    sys.exit(0)
if src.count(OLD) != 1:
    print("anchor not unique: %d" % src.count(OLD))
    sys.exit(1)
io.open(PATH, "w", encoding="utf-8").write(src.replace(OLD, NEW))
print("progress-rail injected")
