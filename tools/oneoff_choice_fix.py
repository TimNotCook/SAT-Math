# -*- coding: utf-8 -*-
"""一次性补丁：SR-099 选项底数 + 两行选项保留换行（原书两条方程分两行）。
在 CI 里跑（本机没有 push 凭据时用），跑完由 workflow 删除本文件。
所有替换都断言命中次数，命中不对直接失败——宁可不改，不能改错。"""
import sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 幂等：已经打过补丁就直接退出（重跑 workflow 时不会红）
IGNORE_IF = ('data/text.js', '50(1.6)^{x+1}')
if open(os.path.join(ROOT, IGNORE_IF[0]), encoding='utf-8').read().count(IGNORE_IF[1]):
    print('already patched, skip')
    sys.exit(0)


def edit(rel, pairs):
    p = os.path.join(ROOT, rel)
    s = open(p, encoding='utf-8').read()
    for old, new, want in pairs:
        n = s.count(old)
        if n != want:
            print('FAIL %s: 期望 %d 次，实际 %d 次：%s' % (rel, want, n, old[:70]))
            sys.exit(1)
        s = s.replace(old, new)
    open(p, 'w', encoding='utf-8').write(s)
    print('OK %s（%d 条替换）' % (rel, len(pairs)))


edit('data/text.js', [
    # SR-099：讲义 p135 #15 原页印 1.6 系（四个式子都等于 80·1.6^x，k=f(1)=128 在 C 里当系数）
    ('{"A":"f(x) = 50(2)^{x+1}","B":"f(x) = 80(2)^{x}","C":"f(x) = 128(2)^{x-1}","D":"f(x) = 205(2)^{x-2}"}',
     '{"A":"f(x) = 50(1.6)^{x+1}","B":"f(x) = 80(1.6)^{x}","C":"f(x) = 128(1.6)^{x-1}","D":"f(x) = 204.8(1.6)^{x-2}"}', 1),
    # TD-12-27：练习册 P26 #27 原页每题两条方程分两行
    ('"-4x+9y=-8 4x-9y=8"', '"-4x+9y=-8\\n4x-9y=8"', 1),
    ('"4x-9y=8 5x+10y=9"', '"4x-9y=8\\n5x+10y=9"', 1),
    ('"4x-9y=8 -12x+27y=-24"', '"4x-9y=8\\n-12x+27y=-24"', 1),
    ('"-4x+9y=8 8x-18y=16"', '"-4x+9y=8\\n8x-18y=16"', 1),
])

edit('bluebook.css', [
    ('.drill-choice-text{flex:1;min-width:0;word-break:break-word;',
     '.drill-choice-text{flex:1;min-width:0;word-break:break-word;white-space:pre-wrap;', 1),
    ('.answer-compare{', '.answer-compare{white-space:pre-wrap;', 2),
])
print('patch ok')
