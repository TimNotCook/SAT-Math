#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 stem-patch.js 的图形规格折叠进 data/figures.js（运行时生效版本 = 补丁版本，以它为准）。
- TD_FIG_SPECS：19 条覆盖订正 + 10 条新增表格
- TD_CHOICE_GRAPHS['TD-22-14'].D：坐标订正
条目替换采用花括号计数定位，替换后逐一校验。"""
import re, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

# ---------- 补丁条目（与 data/stem-patch.js 逐字一致） ----------
TABLES = {
  'SR-156': '''{ type: 'table', head: ['x', 'y'], rows: [['-5', '0'], ['8', '0'], ['9', '0']] }''',
  'SP1-048': '''{ type: 'table', head: ['x', 'f(x)'], rows: [['1', '-64'], ['2', '0'], ['3', '64']] }''',
  'SP1-050': '''{ type: 'table', head: ['x', 'g(x)'], rows: [['1', '58'], ['2', '54'], ['3', '50'], ['4', '46']] }''',
  'SP1-053': '''{ type: 'table', head: ['x', 'y'], rows: [['\\u221212', '\\u221245'], ['6', '45']] }''',
  'SP1-054': '''{ type: 'table', head: ['x', 'y'], rows: [['\\u221218', '\\u221248'], ['7', '52']] }''',
  'SP1-089': '''{ type: 'table', head: ['x', 'y'], rows: [['k', '13'], ['k + 7', '\\u221215']] }''',
  'SP1-090': '''{ type: 'table', head: ['x', 'f(x)'], rows: [['\\u22124', '0'], ['\\u221219/5', '1'], ['\\u221218/5', '2']] }''',
  'SP1-092': '''{ type: 'table', head: ['x', 'y'], rows: [['0', 'n'], ['4', 'n + 19'], ['8', 'n + 38']] }''',
  'SP1-099': '''{ type: 'table', head: ['x', 'g(x)'], rows: [['\\u221227', '3'], ['\\u22129', '0'], ['21', '5']] }''',
  'SP1-101': '''{ type: 'table', head: ['x', 'y'], rows: [['\\u22122s', '24'], ['\\u2212s', '21'], ['s', '15']] }''',
}
FIGFIX = {
  'U4-05': '''{ type: 'rawSvg', svg: "<svg viewBox='0 0 360 240' xmlns='http://www.w3.org/2000/svg'>\\n  <line x1='120' y1='30' x2='120' y2='210' stroke='#162c46' stroke-width='2.2'/>\\n  <line x1='240' y1='30' x2='240' y2='210' stroke='#162c46' stroke-width='2.2'/>\\n  <line x1='70' y1='215' x2='295' y2='25' stroke='#162c46' stroke-width='2.2'/>\\n  <text x='120' y='22' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>r</text>\\n  <text x='240' y='22' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>s</text>\\n  <text x='303' y='24' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='start'>t</text>\\n  <text x='92' y='196' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46'>x\\u00b0</text>\\n  <text x='258' y='60' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46'>y\\u00b0</text>\\n</svg>" }''',
  'TD-41-06': '''{ type: 'rawSvg', svg: "<svg viewBox='0 0 360 240' xmlns='http://www.w3.org/2000/svg'>\\n  <line x1='120' y1='30' x2='120' y2='210' stroke='#162c46' stroke-width='2.2'/>\\n  <line x1='240' y1='30' x2='240' y2='210' stroke='#162c46' stroke-width='2.2'/>\\n  <line x1='70' y1='215' x2='295' y2='25' stroke='#162c46' stroke-width='2.2'/>\\n  <text x='120' y='22' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>r</text>\\n  <text x='240' y='22' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='middle'>s</text>\\n  <text x='303' y='24' font-family='Times New Roman,Georgia,serif' font-size='15' fill='#162c46' text-anchor='start'>t</text>\\n  <text x='92' y='196' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46'>x\\u00b0</text>\\n  <text x='258' y='60' font-family='Times New Roman,Georgia,serif' font-size='14' fill='#162c46'>y\\u00b0</text>\\n</svg>" }''',
  'TD-42-18': '''{ type: 'triangle', pts: [[70, 200], [290, 200], [180, 55]], labels: ['A', 'C', 'B'] }''',
  'TD-43-01': '''{ type: 'rawSvg', svg: "<svg viewBox='0 0 440 300' xmlns='http://www.w3.org/2000/svg'>\\n  <rect x='60' y='140' width='320' height='120' fill='none' stroke='#162c46' stroke-width='2'/>\\n  <path d='M 60 140 A 90 90 0 0 1 240 140' fill='none' stroke='#162c46' stroke-width='2'/>\\n  <circle cx='150' cy='140' r='3' fill='#0f2a47'/>\\n  <text x='52' y='132' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>N</text>\\n  <text x='240' y='132' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>P</text>\\n  <text x='388' y='132' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>Q</text>\\n  <text x='150' y='162' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>O</text>\\n  <text x='52' y='282' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>S</text>\\n  <text x='388' y='282' font-family='Times New Roman,Georgia,serif' font-size='16' fill='#162c46' text-anchor='middle'>R</text>\\n</svg>" }''',
  'TD-15-01': '''{ type: 'chart', x: { min: -6, max: 6, step: 2, label: 'x' }, y: { min: -50, max: 10, step: 10, label: 'y' }, grid: true, origin: 'O', series: [{ kind: 'line', dash: '6 4', points: [[-2, -50], [2, 10]] }] }''',
  'TD-15-03': '''{ type: 'chart', x: { min: -8, max: 8, step: 2, label: 'x' }, y: { min: -8, max: 8, step: 2, label: 'y' }, grid: true, origin: 'O', series: [{ kind: 'line', points: [[3, 8], [7, -3]] }] }''',
  'TD-11-03': '''{ type: 'chart', x: { min: 0, max: 10, step: 2, label: 'x' }, y: { min: -10, max: 10, step: 2, label: 'y' }, grid: true, origin: 'O', series: [{ kind: 'line', points: [[0, 2], [4.5, -3]] }] }''',
  'TD-22-09': '''{ type: 'chart', x: { min: 0, max: 9, step: 1, label: 'Time (seconds)' }, y: { min: 0, max: 11, step: 1, label: 'Momentum (newton-seconds)' }, grid: true, series: [{ kind: 'line', points: [[0, 1], [1, 1.6], [2, 2], [3, 2.9], [4, 4], [5, 5.6], [6, 8], [7, 9.5], [7.5, 9.7], [8, 9]] }, { kind: 'points', points: [[0, 1], [2, 2], [4, 4], [6, 8], [8, 9]] }] }''',
  'TD-22-17': '''{ type: 'chart', x: { min: 0, max: 6, step: 1, label: 'x' }, y: { min: 0, max: 13, step: 1, label: 'y' }, grid: true, series: [{ kind: 'line', points: [[0, 7], [1, 8.8], [2, 10], [3, 10.6], [4, 11], [5, 10.7], [6, 10]] }] }''',
  'SP1-025': '''{ type: 'chart', x: { min: -10, max: 10, step: 2, label: 'x' }, y: { min: -10, max: 10, step: 2, label: 'y' }, grid: true, series: [{ kind: 'line', points: [[-10, 6], [10, 1.5]] }, { kind: 'line', points: [[-10, 2], [10, 2]] }], marks: [{ x: -5, y: 5 }, { x: 8, y: 2 }] }''',
  'U1-12': '''{ type: 'chart', x: { min: -8, max: 8, step: 2, label: 'x' }, y: { min: -8, max: 8, step: 2, label: 'y' }, grid: true, origin: 'O', series: [{ kind: 'line', dash: '6 4', points: [[-1.5, 7], [2.5, -9]] }] }''',
  'U1-13': '''{ type: 'chart', x: { min: -6, max: 6, step: 2, label: 'x' }, y: { min: -50, max: 10, step: 10, label: 'y' }, grid: true, origin: 'O', series: [{ kind: 'line', dash: '6 4', points: [[-1.5, -42.5], [1.5, 2.5]] }] }''',
  'TD-25-15': '''{ type: 'chart', x: { min: 0, max: 5, step: 1, cats: [['Plot 1', 1.4], ['Plot 2', 2.4], ['Plot 3', 3.4], ['Plot 4', 4.4]] }, y: { min: 0, max: 90, step: 10, label: 'Trees planted', showZero: true }, grid: true, series: [{ kind: 'bar', bars: [{ x0: 1, x1: 1.8, h: 65 }, { x0: 2, x1: 2.8, h: 75 }, { x0: 3, x1: 3.8, h: 80 }, { x0: 4, x1: 4.8, h: 59 }] }] }''',
  'TD-25-16': '''{ type: 'chart', x: { min: 0, max: 6, step: 1, cats: [['daisy', 1.4], ['orchid', 2.4], ['tulip', 3.4], ['lily', 4.4], ['sunflower', 5.4]] }, y: { min: 0, max: 200, step: 20, label: 'Number of flowers', showZero: true }, grid: true, series: [{ kind: 'bar', bars: [{ x0: 1, x1: 1.8, h: 60 }, { x0: 2, x1: 2.8, h: 100 }, { x0: 3, x1: 3.8, h: 190 }, { x0: 4, x1: 4.8, h: 180 }, { x0: 5, x1: 5.8, h: 170 }] }] }''',
  'TD-25-05': '''{ type: 'chart', x: { min: 80, max: 140, step: 10 }, y: { min: 0, max: 10, step: 10 }, yAxis: false, grid: false, series: [{ kind: 'box', lo: 85, q1: 98, med: 115, q3: 125, hi: 138 }] }''',
  'TD-11-20': '''{ type: 'chart', x: { min: -6, max: 6, step: 2, label: 'x' }, y: { min: -6, max: 6, step: 2, label: 'y' }, grid: true, origin: 'O', series: [{ kind: 'line', points: [[0, 6], [4.8, -6]] }] }''',
  'TD-42-12': '''{ type: 'table', head: ['', 'Perimeter'], rows: [['Triangle TUV', '50'], ['Triangle XYZ', '150']] }''',
  'TD-15-02': '''{ type: 'chart', x: { min: -15, max: 15, step: 5, label: 'x' }, y: { min: 0, max: 60, step: 5, label: 'y' }, grid: true, origin: 'O', series: [{ kind: 'region', points: [[-15, 35], [-15, 60], [15, 60], [15, 35]] }] }''',
  'TD-33-13': '''{ type: 'rawSvg', svg: "<svg viewBox='0 0 430 190' xmlns='http://www.w3.org/2000/svg'>\\n  <g stroke='#162c46' stroke-width='1.6' fill='none'>\\n    <rect x='15' y='25' width='180' height='120'/>\\n    <line x1='75' y1='25' x2='75' y2='145'/>\\n    <line x1='115' y1='25' x2='115' y2='145'/>\\n    <line x1='155' y1='25' x2='155' y2='145'/>\\n    <line x1='15' y1='85' x2='195' y2='85'/>\\n    <rect x='235' y='25' width='180' height='120'/>\\n    <line x1='295' y1='25' x2='295' y2='145'/>\\n    <line x1='335' y1='25' x2='335' y2='145'/>\\n    <line x1='375' y1='25' x2='375' y2='145'/>\\n    <line x1='235' y1='85' x2='415' y2='85'/>\\n  </g>\\n  <g font-family='Times New Roman,Georgia,serif' font-size='17' fill='#162c46' text-anchor='middle'>\\n    <text x='45' y='64'>x</text>\\n    <text x='95' y='64'>-1</text>\\n    <text x='135' y='64'>0</text>\\n    <text x='175' y='64'>1</text>\\n    <text x='45' y='118'>q(x)</text>\\n    <text x='95' y='118'>7</text>\\n    <text x='135' y='118'>21</text>\\n    <text x='175' y='118'>63</text>\\n    <text x='265' y='64'>x</text>\\n    <text x='315' y='64'>-1</text>\\n    <text x='355' y='64'>0</text>\\n    <text x='395' y='64'>1</text>\\n    <text x='265' y='118'>q(x)</text>\\n    <text x='315' y='106'>1</text>\\n    <line x1='307' y1='112' x2='323' y2='112' stroke='#162c46' stroke-width='1.3'/>\\n    <text x='315' y='128'>7</text>\\n    <text x='355' y='118'>3</text>\\n    <text x='395' y='118'>63</text>\\n  </g>\\n</svg>" }''',
}
CHOICEFIX_D = "D: { kind: 'line', xInt: 30, yInt: 40, xmax: 40, ymax: 40 }"

src = open('data/figures.js', encoding='utf-8').read()

def replace_entry(src, qid, newbody):
    """替换 `  'ID': { ... },` 条目（花括号计数），保留原后缀逗号状态。"""
    m = re.search(r"(^  '" + re.escape(qid) + r"':\s*)", src, re.M)
    assert m, f'{qid} 未找到'
    start = m.end()
    assert src[start] == '{', f'{qid}: 条目不是对象开头'
    depth, i = 0, start
    in_str, esc, quote = False, False, ''
    while i < len(src):
        ch = src[i]
        if in_str:
            if esc: esc = False
            elif ch == '\\': esc = True
            elif ch == quote: in_str = False
        else:
            if ch in '"\'': in_str, quote = True, ch
            elif ch == '{': depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0: break
        i += 1
    end = i + 1
    tail = src[end:end+2]
    had_comma = tail.lstrip().startswith(',')
    repl = m.group(1) + newbody + (',' if had_comma else '')
    return src[:m.start()] + repl + (src[end+1:] if had_comma else src[end:])

# 覆盖 19 条 FIGFIX
for qid, body in FIGFIX.items():
    src = replace_entry(src, qid, body)
    print(f'覆盖: {qid}')

# TD-22-14 的 D 选项
old_d = "D: { kind: 'line', xInt: 0, yInt: 0, xmax: 20, ymax: 20 }"
assert old_d in src, 'TD-22-14 D 旧值未找到'
src = src.replace(old_d, CHOICEFIX_D)
print('订正: TD-22-14 D 选项')

# 在 TD_FIG_SPECS 结束前插入 10 条新增 TABLES
anchor = '\n\n};\n\n\n/* Answer-CHOICE graphs'
assert anchor in src, 'TD_FIG_SPECS 结束锚点未找到'
add = '\n\n  /* ===== 以下表格规格原由 stem-patch.js 运行时注册，2026-11 折叠入源（数据/执行分离） ===== */'
for qid, body in TABLES.items():
    add += "\n  '" + qid + "': " + body + ','
    print(f'新增: {qid}')
src = src.replace(anchor, add + anchor)

open('data/figures.js', 'w', encoding='utf-8').write(src)
print('figures.js 写回完成，大小', len(src))
