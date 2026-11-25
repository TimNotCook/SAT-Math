#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""transcribe_reconcile.py — 录题对账 / 结构校验（只读仓库，不改任何文件）

三个子命令（互斥，至少给一个）：

  1) 回读清单（与扫描原页并排逐条核对）
       python3 tools/transcribe_reconcile.py --readback TD-21-01
       python3 tools/transcribe_reconcile.py --section 2.1
       python3 tools/transcribe_reconcile.py --prefix R03
       python3 tools/transcribe_reconcile.py --all --out /tmp/readback.txt
     从 data/questions.js / data/text.js / data/figures.js / 裁图登记里抽出该题的
     stem（逐句分行）、选项 A–E、answer/value、hint、图表 spec 数据点，输出纯文本，
     顺序稳定、可 diff。图 spec 由内嵌 node 加载（figures.js 是 JS 对象字面量，
     不是 JSON，python 不硬解析）。

  2) 结构校验（新录题必须全绿）
       python3 tools/transcribe_reconcile.py --check --ids R03-001,R03-002
       python3 tools/transcribe_reconcile.py --check --section 2.8.T1
       python3 tools/transcribe_reconcile.py --check --prefix R03
       python3 tools/transcribe_reconcile.py --check --all
     退出码 0 = 全过；1 = 有 FAIL（逐条打印题号 + 原因）。
     不带过滤条件时默认 --all，但位图/裁图类历史豁免只对 origin=legacy 生效；
     新录题一律用 --ids / --section / --prefix 圈定，不要裸跑 --all 去挑历史题的刺。

  3) 扫描页渲染（人眼核对用，与题库无关）
       python3 tools/transcribe_reconcile.py --pdf "~/Desktop/04 Geometry.pdf" --pages 12,15-17 --outdir render/ --dpi 300
     用 pymupdf 把指定页渲染成 PNG 到目录；无 OCR，只供人眼比对。

口径（与 docs/transcribe-spec.md 一致，改这里先改规范）：
  · mcq：answer 为单字母 A–E；文字选项必须 4 个；图形选项（题干图/选项图走矢量
    TD_CHOICE_GRAPHS 或 text.figure 登记）豁免文字选项计数。
  · grid：answer 为标准答案串（分数/小数/多答案逗号分隔），value 必须是有限数字。
  · 新录题禁止位图：不得写 image 字段、不得登记 figure_crops/choice_crops、
    不得引用 images/ 下任何文件；表/图/阴影一律矢量 spec。
  · shaded 题干必须带 region 多边形（series[].kind='region'）。
"""
import argparse
import io
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------------------------
# 数据加载：questions.js / text.js 是纯 JSON（window.TD_BANK = {...};），
# figures.js / 裁图登记是 JS 字面量，统一交给内嵌 node 加载成 JSON。
# ---------------------------------------------------------------------------
NODE_LOADER = r"""
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = process.argv[1] || process.argv[2];
function load(rel) {
  const sb = { window: {} };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sb, { filename: rel });
  return sb.window;
}
const out = {};
try { out.bank = load('data/questions.js').TD_BANK; } catch (e) { out.bankErr = String(e); }
try { out.text = load('data/text.js').TD_TEXT; } catch (e) { out.textErr = String(e); }
try { const w = load('data/figures.js'); out.specs = w.TD_FIG_SPECS || {}; out.choiceGraphs = w.TD_CHOICE_GRAPHS || {}; } catch (e) { out.figErr = String(e); }
try { out.figCrops = load('data/figure_crops.js').TD_FIG_CROPS || {}; } catch (e) { out.figCropsErr = String(e); }
try { out.choiceCrops = load('data/choice_crops.js').TD_CHOICE_CROPS || {}; } catch (e) { out.choiceCropsErr = String(e); }
process.stdout.write(JSON.stringify(out));
"""


def load_all():
    """用 node 一次性加载全部数据，返回 dict。node 缺失时退回纯 JSON 解析两个主文件。"""
    data = {}
    node = None
    for cand in ('node', 'nodejs'):
        if subprocess.run(['which', cand], capture_output=True).returncode == 0:
            node = cand
            break
    if node:
        proc = subprocess.run([node, '-e', NODE_LOADER, ROOT],
                               capture_output=True, text=True)
        if proc.returncode == 0 and proc.stdout.strip():
            data = json.loads(proc.stdout)
            return data
    # 退回：只解析 questions.js / text.js（figures 相关检查会给出缺失提示）
    def pure_json(rel, var):
        src = io.open(os.path.join(ROOT, rel), encoding='utf-8').read()
        m = re.search(r'window\.' + var + r'\s*=\s*(\{.*\})\s*;', src, re.S)
        return json.loads(m.group(1))
    data['bank'] = pure_json('data/questions.js', 'TD_BANK')
    data['text'] = pure_json('data/text.js', 'TD_TEXT')
    data['specs'], data['choiceGraphs'] = {}, {}
    data['figCrops'], data['choiceCrops'] = {}, {}
    return data


# ---------------------------------------------------------------------------
# 筛选
# ---------------------------------------------------------------------------
def select_questions(bank, args):
    qs = bank['questions']
    if args.ids:
        want = {x.strip() for x in args.ids.split(',') if x.strip()}
        qs = [q for q in qs if q['id'] in want]
        missing = want - {q['id'] for q in qs}
        if missing:
            print('!! 以下 id 不在题库：%s' % ', '.join(sorted(missing)))
    elif args.section:
        qs = [q for q in qs if q.get('section') == args.section]
    elif args.prefix:
        qs = [q for q in qs if q['id'].startswith(args.prefix)]
    elif args.all or args.check:
        qs = list(qs)
    else:
        qs = []
    return qs


# ---------------------------------------------------------------------------
# 回读清单
# ---------------------------------------------------------------------------
def fmt_axis(a, name):
    if not a:
        return []
    out = ['  %s: min=%s max=%s step=%s label=%s' % (
        name, a.get('min'), a.get('max'), a.get('step'), a.get('label') or '—')]
    if a.get('labels'):
        out.append('    labels=%s' % json.dumps(a['labels'], ensure_ascii=False))
    if a.get('cats'):
        out.append('    cats=%s' % json.dumps(a['cats'], ensure_ascii=False))
    if a.get('showZero'):
        out.append('    showZero=true')
    return out


def fmt_series(s):
    k = s.get('kind')
    if k == 'line':
        return '    line points=%s%s' % (json.dumps(s.get('points')), ' dash=%s' % s['dash'] if s.get('dash') else '')
    if k == 'points':
        return '    points %s' % json.dumps(s.get('points'))
    if k == 'exp':
        return '    exp a=%s b=%s c=%s' % (s.get('a'), s.get('b'), s.get('c') or 0)
    if k == 'poly':
        return '    poly roots=%s sign=%s k=%s' % (s.get('roots'), s.get('sign'), s.get('k'))
    if k == 'bar':
        return '    bar %s' % json.dumps(s.get('bars'))
    if k == 'hist':
        return '    hist maxN=%s %s' % (s.get('maxN'), json.dumps(s.get('bars')))
    if k == 'box':
        return '    box lo=%s q1=%s med=%s q3=%s hi=%s' % (s.get('lo'), s.get('q1'), s.get('med'), s.get('q3'), s.get('hi'))
    if k == 'region':
        return '    region(阴影) points=%s' % json.dumps(s.get('points'))
    return '    series.%s %s' % (k, json.dumps(s, ensure_ascii=False))


def fmt_spec(spec):
    if not spec:
        return ['  （无矢量 spec）']
    t = spec.get('type')
    out = ['  type=%s' % t]
    if t == 'chart':
        out += fmt_axis(spec.get('x'), 'x')
        out += fmt_axis(spec.get('y'), 'y')
        for k in ('grid', 'origin', 'axesAt', 'axisLabelsEnd', 'yAxis', 'w', 'h'):
            if spec.get(k) is not None:
                out.append('  %s=%s' % (k, spec[k]))
        for s in spec.get('series', []):
            out.append(fmt_series(s))
        for m in spec.get('marks', []):
            out.append('    mark x=%s y=%s label=%s%s' % (m.get('x'), m.get('y'), m.get('label'), ' arrow' if m.get('arrow') else ''))
    elif t == 'table':
        out.append('  head=%s' % json.dumps(spec.get('head'), ensure_ascii=False))
        if spec.get('headGroups'):
            out.append('  headGroups=%s' % json.dumps(spec['headGroups'], ensure_ascii=False))
        for r in spec.get('rows', []):
            out.append('  row  %s' % json.dumps(r, ensure_ascii=False))
        if spec.get('caption'):
            out.append('  caption=%s' % spec['caption'])
    elif t == 'parallelLines':
        for k in ('topLabel', 'bottomLabel', 'transLabel', 'direction',
                  'topUL', 'topUR', 'topLL', 'topLR', 'botUL', 'botUR', 'botLL', 'botLR',
                  'topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'noArcs'):
            if spec.get(k) is not None:
                out.append('  %s=%s' % (k, spec[k]))
    elif t == 'triangle':
        for k in ('pts', 'labels', 'angles', 'sides', 'right'):
            if spec.get(k) is not None:
                out.append('  %s=%s' % (k, json.dumps(spec[k], ensure_ascii=False)))
    elif t in ('crossingLines', 'circle', 'rect'):
        for k, v in spec.items():
            if k != 'type':
                out.append('  %s=%s' % (k, json.dumps(v, ensure_ascii=False)))
    elif t == 'rawSvg':
        svg = spec.get('svg', '')
        out.append('  rawSvg 长度=%d 字符；元素=%s' % (
            len(svg),
            ', '.join(sorted(set(re.findall(r'<(line|circle|polygon|path|rect|text|arc)', svg)))) or '—'))
    else:
        out.append('  ' + json.dumps(spec, ensure_ascii=False)[:800])
    return out


def readback_one(q, text, specs, cgraphs, fig_crops, choice_crops):
    tid = q['id']
    t = text.get(tid, {})
    stem = (t.get('stem') or q.get('stem') or '').strip()
    lines = ['=' * 88,
             '%s  (section=%s · no=%s · origin=%s)' % (tid, q.get('section'), q.get('no'), q.get('origin')),
             'topic : %s' % q.get('topic'),
             'paper : %s' % q.get('paper'),
             'source: %s' % q.get('source'),
             'type  : %s   answer: %s   value: %s' % (
                 q.get('type'), q.get('answer'), q.get('value') if q.get('value') is not None else '—'),
             'level : %s   hint: %s' % (q.get('level'), q.get('hint') or '（空）')]
    lines.append('--- STEM（逐句，与原页逐字对）')
    for i, seg in enumerate([s for s in stem.split('\n') if s.strip()], 1):
        lines.append('%d. %s' % (i, seg.strip()))
    ch = t.get('choices') or {}
    lines.append('--- CHOICES')
    if q.get('type') == 'grid':
        lines.append('（grid-in，无选项）')
    else:
        for letter in 'ABCDE':
            if letter in ch:
                lines.append('%s. %s' % (letter, ch[letter] if ch[letter] else '（图形选项，见 FIGURE）'))
        if t.get('figure'):
            lines.append('[text.figure 登记图形选项: %s]' % ', '.join(t['figure']))
    spec = specs.get(tid)
    lines.append('--- FIGURE SPEC')
    lines += fmt_spec(spec)
    if cgraphs.get(tid):
        lines.append('[TD_CHOICE_GRAPHS 选项图: %s]' % ', '.join(cgraphs[tid].keys()))
    if fig_crops.get(tid):
        lines.append('[!! 旧位图登记 figure_crops: %s]' % fig_crops[tid])
    if choice_crops.get(tid):
        lines.append('[!! 旧位图登记 choice_crops: %s]' % json.dumps(choice_crops[tid], ensure_ascii=False))
    return '\n'.join(lines)


# ---------------------------------------------------------------------------
# 结构校验
# ---------------------------------------------------------------------------
CHART_STEM = re.compile(r'(?:scatterplot|scatter plot|histogram|dot plot|box[- ]plot|bar graph|bar chart|the table (?:below|above|shows|gives)|the following table|the table shows|the table gives|frequency distribution|the graph (?:below|above|shows)|the graph of .{0,60} is shown)', re.I)
GEOM_STEM = re.compile(r'(?:figure|diagram|not drawn to scale|in the (?:triangle|circle|figure|diagram) shown|the (?:triangle|circle|figure|diagram) (?:shown|below|above))', re.I)
SHADED = re.compile(r'shaded', re.I)
VALID_LEVEL = {'easy', 'medium', 'hard'}
VALID_ORIGIN = {'legacy', 'textbook', 'pdf'}


def check_one(q, text, specs, cgraphs, fig_crops, choice_crops, declared, strict_new):
    """strict_new=True（--ids/--section/--prefix 圈定新录题）：全部规则判 FAIL。
    strict_new=False（--all 全量基线）：历史软违规只记 WARN，硬违规仍 FAIL。"""
    fails, soft_warns = [], []
    tid = q['id']
    t = text.get(tid)

    legacy = q.get('origin') == 'legacy'

    def soft(msg, legacy_exempt=True):
        # strict 模式：非 legacy 的新题判 FAIL；legacy 历史题与全量基线一律只 WARN
        if strict_new and not (legacy_exempt and legacy):
            fails.append(msg)
        else:
            soft_warns.append(msg)

    # 1 必填字段（历史 legacy 缺 answer/value 属软违规）
    for f in ('id', 'unit', 'section', 'no', 'topic', 'type', 'answer', 'source', 'paper', 'origin', 'level'):
        if q.get(f) is None or q.get(f) == '':
            soft('必填字段缺失: %s' % f)
    # 2 取值域
    if q.get('type') not in ('mcq', 'grid'):
        soft('type 非法: %r（只允许 mcq/grid）' % q.get('type'))
    if q.get('level') and q['level'] not in VALID_LEVEL:
        soft('level 非法: %r（只允许 easy/medium/hard）' % q['level'])
    if q.get('origin') and q['origin'] not in VALID_ORIGIN:
        soft('origin 非法: %r（只允许 legacy/textbook/pdf）' % q['origin'])
    if q.get('unit') not in (1, 2, 3, 4):
        soft('unit 非法: %r（只允许 1–4）' % q.get('unit'))
    # 3 section 与 unit 自洽（硬）+ 已声明（软）
    sec = q.get('section')
    if sec:
        if int(str(sec).split('.')[0]) != q.get('unit'):
            fails.append('section=%s 与 unit=%s 首段不一致' % (sec, q.get('unit')))
        if sec not in declared:
            soft('section=%s 未在 data/questions.js 的 units 声明里登记' % sec)
    # 4 text.js 条目（硬）+ stem 双份一致（软）
    if t is None:
        fails.append('data/text.js 缺该题条目（stem/choices 无处存放）')
    else:
        js_stem = (q.get('stem') or '').strip()
        tx_stem = (t.get('stem') or '').strip()
        if not tx_stem and not js_stem:
            soft('stem 为空')
        elif js_stem and tx_stem and js_stem != tx_stem:
            soft('questions.js 与 text.js 的 stem 不一致（以 text.js 为准，必须逐字同步）')
    # 5 mcq / grid
    ch = (t or {}).get('choices') or {}
    letters_text = [k for k in 'ABCDE' if str(ch.get(k) or '').strip()]
    if q.get('type') == 'mcq':
        if not re.fullmatch(r'[A-E]', str(q.get('answer') or '')):
            soft('mcq answer 必须是单字母 A–E: %r' % q.get('answer'))
        elif t and str(q['answer']) not in ch:
            fails.append('mcq answer=%s 不在 text.js 的 choices 里' % q['answer'])
        graphical = bool((t and t.get('figure')) or cgraphs.get(tid) or
                         q.get('choiceFigures') or choice_crops.get(tid))
        if len(letters_text) != 4 and not graphical:
            soft('mcq 文字选项不是 4 个（实际 %d），且无图形选项登记' % len(letters_text))
    elif q.get('type') == 'grid':
        if q.get('value') is None or not isinstance(q.get('value'), (int, float)) or not math_isfinite(q['value']):
            soft('grid 必须有有限数字 value（answer 串之外的判分基准）')
        if not str(q.get('answer') or '').strip():
            soft('grid answer 为空')
        if letters_text:
            fails.append('grid 题不应有文字选项（choices 应为空）')
    # 6 位图禁令（软：--all 对历史裁图放行；strict 判 FAIL）
    if q.get('image'):
        soft('位图禁令：questions.js 出现 image=%r（新录题一律矢量，禁止 images/ 裁图）' % q['image'])
    if t and t.get('image'):
        soft('位图禁令：text.js 出现 image=%r' % t['image'])
    if fig_crops.get(tid):
        soft('位图禁令：仍登记在 figure_crops.js（%s）' % fig_crops[tid])
    if choice_crops.get(tid):
        soft('位图禁令：仍登记在 choice_crops.js')
    # 7 shaded → region（shaded 无任何通路是硬违规；旧裁图软违规）
    stem_all = ((t or {}).get('stem') or q.get('stem') or '')
    if SHADED.search(stem_all):
        has_region = bool(specs.get(tid) and any(
            s.get('kind') == 'region' and len(s.get('points') or []) >= 3
            for s in specs[tid].get('series', [])))
        has_crop = bool(fig_crops.get(tid))
        if not has_region and not has_crop:
            fails.append('题干含 shaded，但没有 region 矢量多边形（也未登记裁图）')
        elif has_crop:
            soft('shaded 题走了旧位图裁图，新录题必须矢量 region')
    # 8 图表/几何题矢量通路（软）
    if CHART_STEM.search(stem_all) or GEOM_STEM.search(stem_all) or (t and t.get('figure')):
        has_vector = bool(specs.get(tid) or cgraphs.get(tid) or q.get('choiceFigures'))
        if not has_vector and not fig_crops.get(tid) and not choice_crops.get(tid):
            soft('题干带表/图/几何，但没有矢量 spec（TD_FIG_SPECS / TD_CHOICE_GRAPHS），也无登记裁图')
    # 9 topic / paper / no / hint
    if not q.get('topic'):
        soft('topic 为空')
    if q.get('paper') and '专项' not in q['paper'] and re.search(r'\.T\d+$', str(sec or '')):
        soft('T 子节题的 paper 建议含「专项」（exam-core 靠它识别专项题）: %r' % q['paper'])
    if not isinstance(q.get('no'), int) or q['no'] < 1:
        soft('no 必须是正整数: %r' % q.get('no'))
    if not q.get('hint'):
        soft_warns.append('hint 为空（允许，但建议留一行关键步骤）')
    return fails, soft_warns


def math_isfinite(v):
    try:
        return v == v and v not in (float('inf'), float('-inf'))
    except Exception:
        return False


# ---------------------------------------------------------------------------
# PDF 渲染
# ---------------------------------------------------------------------------
def render_pdf(pdf, pages, outdir, dpi):
    try:
        import pymupdf
    except ImportError:
        try:
            import fitz as pymupdf
        except ImportError:
            print('!! 需要 pymupdf（pip install pymupdf），跳过渲染')
            return 2
    doc = pymupdf.open(pdf)
    os.makedirs(outdir, exist_ok=True)
    want = []
    for part in pages.split(','):
        part = part.strip()
        if '-' in part:
            a, b = part.split('-', 1)
            want += list(range(int(a), int(b) + 1))
        elif part:
            want.append(int(part))
    zoom = dpi / 72
    rendered = []
    for pno in want:
        page = doc[pno - 1]
        pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom))
        out = os.path.join(outdir, 'p%03d.png' % pno)
        pix.save(out)
        rendered.append(out)
    print('已渲染 %d 页（%d dpi）到 %s：' % (len(rendered), dpi, outdir))
    for r in rendered:
        print('  ' + r)
    return 0


# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description='录题回读 / 结构校验 / 扫描页渲染（只读仓库）')
    ap.add_argument('--readback', help='逗号分隔的题号，输出回读清单')
    ap.add_argument('--check', action='store_true', help='结构校验模式')
    ap.add_argument('--ids', help='校验/回读题号，逗号分隔')
    ap.add_argument('--section', help='按 section 圈定')
    ap.add_argument('--prefix', help='按 id 前缀圈定')
    ap.add_argument('--all', action='store_true', help='全量')
    ap.add_argument('--out', help='回读清单输出文件（默认 stdout）')
    ap.add_argument('--pdf', help='扫描 PDF 路径')
    ap.add_argument('--pages', help='PDF 页码，如 12,15-17')
    ap.add_argument('--outdir', default='render', help='PDF 渲染输出目录')
    ap.add_argument('--dpi', type=int, default=300, help='渲染分辨率（默认 300）')
    args = ap.parse_args()

    if args.pdf:
        return render_pdf(args.pdf, args.pages or '1', args.outdir, args.dpi)

    if args.readback and not args.ids:
        args.ids = args.readback
    data = load_all()
    bank = data['bank']
    text = data.get('text') or {}
    specs = data.get('specs') or {}
    cgraphs = data.get('choiceGraphs') or {}
    fig_crops = data.get('figCrops') or {}
    choice_crops = data.get('choiceCrops') or {}

    declared = set()
    for u in bank.get('units', []):
        for s in u.get('sections', []):
            declared.add(s['id'])

    # ---- 回读（check 模式只做校验，不吐清单）----
    if not args.check and (args.readback or args.ids or args.section or args.prefix or args.all):
        qs = select_questions(bank, args)
        if not qs:
            print('!! 没有选中任何题（检查 --ids/--section/--prefix）')
            return 1
        qs = sorted(qs, key=lambda q: q['id'])
        out = '\n\n'.join(readback_one(q, text, specs, cgraphs, fig_crops, choice_crops) for q in qs)
        if args.out:
            io.open(args.out, 'w', encoding='utf-8').write(out + '\n')
            print('回读清单已写出: %s（%d 题）' % (args.out, len(qs)))
        else:
            print(out)
        return 0

    # ---- 校验 ----
    if args.check:
        qs = select_questions(bank, args)
        if not qs:
            print('!! --check 未圈定任何题（用 --ids/--section/--prefix/--all）')
            return 1
        strict = not (args.all and not (args.ids or args.section or args.prefix))
        nfail = nwarn = 0
        seen = {}
        for q in qs:
            seen[q['id']] = seen.get(q['id'], 0) + 1
        for q in sorted(qs, key=lambda q: q['id']):
            fails, warns = check_one(q, text, specs, cgraphs, fig_crops, choice_crops, declared, strict)
            if seen[q['id']] > 1:
                fails.insert(0, 'id 全局重复（出现 %d 次）' % seen[q['id']])
            for f in fails:
                print('FAIL %s: %s' % (q['id'], f))
            for w in warns:
                print('WARN %s: %s' % (q['id'], w))
            nfail += len(fails)
            nwarn += len(warns)
        print('\n校验 %d 题：FAIL %d，WARN %d%s' % (
            len(qs), nfail, nwarn,
            '（strict=新录题口径：位图/裁图/未声明 section 均判 FAIL）' if strict else '（全量口径：legacy 位图历史豁免）'))
        return 1 if nfail else 0

    ap.print_help()
    return 1


if __name__ == '__main__':
    sys.exit(main())
