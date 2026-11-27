#!/usr/bin/env python3
"""按教材规范重画抽查开场页的四张单元线稿（176×132，写入 exam.js 的 UNIT_ART）。

规范：
- 角的弧线以顶点为圆心，画在两条边之间的内侧（取短弧），不跨过边。
- 直角用方角标，标在真正是直角的顶点（U4 是高线与底边的交点）。
"""
import math
import re

AX = '#dbe7f8'
ACC = '#8fb3ee'
LT = '#c4d7f3'
FACE = '#f5faff'


def axes(grid=True):
    d = ('<path d="M18 104H152" stroke="%s" stroke-width="1.6" stroke-linecap="round"/>' % AX +
         '<path d="M160 104l-6-3.2V107.2z" stroke="%s" stroke-width="1.4" stroke-linejoin="round"/>' % AX +
         '<path d="M46 104V30" stroke="%s" stroke-width="1.6" stroke-linecap="round"/>' % AX +
         '<path d="M46 22l-3.2 6H49.2z" stroke="%s" stroke-width="1.4" stroke-linejoin="round"/>' % AX)
    if grid:
        for y in (40, 64, 88):
            d += '<path d="M46 %dH156" stroke="#edf4fc" stroke-width="1"/>' % y
        for x in (76, 106, 136):
            d += '<path d="M%d 104V40" stroke="#edf4fc" stroke-width="1"/>' % x
    return d


def arc_at(cx, cy, r, p1, p2, n=16):
    a1 = math.atan2(p1[1] - cy, p1[0] - cx)
    a2 = math.atan2(p2[1] - cy, p2[0] - cx)
    da = a2 - a1
    while da > math.pi:
        da -= 2 * math.pi
    while da < -math.pi:
        da += 2 * math.pi
    pts = [(cx + r * math.cos(a1 + da * t), cy + r * math.sin(a1 + da * t))
           for t in [i / (n - 1) for i in range(n)]]
    return '<path d="M' + ' L'.join('%.1f %.1f' % p for p in pts) + \
        '" stroke="%s" stroke-width="1.4" stroke-linecap="round" fill="none"/>' % ACC


def u1():
    x0, y0, x1, y1 = 52, 86, 144, 34
    d = '<path d="M%d %dL%d %d" stroke="%s" stroke-width="1.8" stroke-linecap="round"/>' % (x0, y0, x1, y1, ACC)
    k = (y1 - y0) / (x1 - x0)
    for x in (74, 126):
        y = y0 + k * (x - x0)
        d += '<path d="M%d %.1fV104" stroke="%s" stroke-width="1" stroke-dasharray="3 4"/>' % (x, y, LT)
        d += ('<circle cx="%d" cy="%.1f" r="4" fill="#fff" stroke="%s" stroke-width="1.8"/>'
              '<circle cx="%d" cy="%.1f" r="1.3" fill="%s"/>' % (x, y, ACC, x, y, ACC))
    return d


def u2():
    bars = [(48, 78, 16, 26), (76, 64, 16, 40), (104, 50, 16, 54), (132, 34, 16, 70)]
    d = ''
    for i, (x, y, w, h) in enumerate(bars):
        d += ('<rect x="%d" y="%d" width="%d" height="%d" rx="2" fill="%s" stroke="%s" stroke-width="1.5"/>'
              % (x, y, w, h, '#eaf3ff' if i == 3 else FACE, ACC if i == 3 else LT))
    d += '<path d="M44 84.3L158 24.6" stroke="%s" stroke-width="1.5" stroke-dasharray="5 5" stroke-linecap="round"/>' % ACC
    for x, y in ((56, 78), (84, 64), (112, 50), (140, 34)):
        d += '<circle cx="%d" cy="%d" r="2.4" fill="%s"/>' % (x, y, ACC)
    return d


def u3():
    cx, vy, k = 96, 96, 0.0125
    pts = [(x, vy - k * (x - cx) ** 2) for x in range(32, 161, 4)]
    d = '<path d="M' + ' L'.join('%d %.1f' % p for p in pts) + \
        '" stroke="%s" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>' % ACC
    d += '<path d="M96 104V36" stroke="%s" stroke-width="1" stroke-dasharray="3 4"/>' % LT
    d += '<circle cx="96" cy="96" r="3" fill="%s"/>' % ACC
    yl = 64
    dx = math.sqrt((vy - yl) / k)
    for x in (cx - dx, cx + dx):
        d += '<circle cx="%.0f" cy="%d" r="3.2" fill="#fff" stroke="%s" stroke-width="1.6"/>' % (x, yl, ACC)
    return d


def u4():
    A, B, C = (34, 104), (82, 30), (140, 104)
    d = '<path d="M34 104L82 30L140 104Z" stroke="%s" stroke-width="1.8" stroke-linejoin="round" fill="%s"/>' % (LT, FACE)
    d += '<path d="M82 30V104" stroke="%s" stroke-width="1" stroke-dasharray="4 4"/>' % LT
    d += '<path d="M74 104V96H82" stroke="%s" stroke-width="1.5" stroke-linejoin="round" fill="none"/>' % ACC
    d += arc_at(A[0], A[1], 19, C, B)
    d += arc_at(C[0], C[1], 19, A, B)
    for x, y in (A, B, C):
        d += '<circle cx="%d" cy="%d" r="2.8" fill="%s"/>' % (x, y, ACC)
    return d


ARTS = {1: u1(), 2: u2(), 3: u3(), 4: u4()}


def block(i):
    return ('<svg viewBox="0 0 176 132" width="176" height="132" fill="none" aria-hidden="true">'
            + axes(i != 4) + ARTS[i] + '</svg>')


def main():
    path = 'exam.js'
    src = open(path, encoding='utf-8').read()
    lines = '  const UNIT_ART = {\n'
    for i in (1, 2, 3, 4):
        lines += "    %d: '%s'%s\n" % (i, block(i).replace("'", "\\'"), ',' if i < 4 else '')
    lines += '  };\n'
    pat = re.compile(r'  const UNIT_ART = \{\n.*?\n  \};\n', re.S)
    if not pat.search(src):
        raise SystemExit('UNIT_ART block not found')
    src = pat.sub(lambda m: lines, src, count=1)
    open(path, 'w', encoding='utf-8').write(src)
    print('patched UNIT_ART')


if __name__ == '__main__':
    main()
