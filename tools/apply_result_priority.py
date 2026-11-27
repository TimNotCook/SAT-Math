"""成绩页：把「复习优先级排序」移到分数之前（先给下一步，再给数字）。
幂等：已含 result-priority 标记则退出。
"""
import io
import sys

PATH = "exam.js"
MARK = "result-priority"
OLD = "    renderTypeSummary();\n"
NEW = (
    "    /* result-priority: 把「复习优先级」移到分数之前——先给下一步，再给数字。DOM 层移动，阅读顺序一致 */\n"
    + "    (function(){var st=document.getElementById('stage-result');if(!st)return;"
    + "var sc=st.querySelector('.exam-score-panel'),pr=st.querySelector('.exam-priority-panel');"
    + "if(sc&&pr&&sc.parentNode&&pr.parentNode===sc.parentNode&&pr.nextElementSibling!==sc){sc.parentNode.insertBefore(pr,sc);}})();\n"
    + OLD
)

src = io.open(PATH, encoding="utf-8").read()
if MARK in src:
    print("result-priority already applied")
    sys.exit(0)
if src.count(OLD) != 1:
    print("anchor not unique: %d" % src.count(OLD))
    sys.exit(1)
io.open(PATH, "w", encoding="utf-8").write(src.replace(OLD, NEW))
print("result-priority injected")
