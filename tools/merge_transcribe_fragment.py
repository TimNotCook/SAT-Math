#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""merge_transcribe_fragment.py — 把读题代理产出的已验证题包机械并入题库（只新增）

用法：
  python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/04/fragments/T25.json
  python3 tools/merge_transcribe_fragment.py --fragment ... --dry-run
  python3 tools/merge_transcribe_fragment.py --fragment ... --no-rollup

题包 schema 见 docs/transcribe-fragment-schema.md；字段口径见 docs/transcribe-spec.md。

纪律（脚本硬保证）：
  · 只新增，绝不改写/重排/删除已有行；唯一允许的既有改动是给 questions[]/TD_TEXT
    最后一行补必要的尾逗号（git diff 表现为 1 行逗号改动 + 若干新增行）。
  · 幂等：整包 id 已全部存在 → 跳过并提示，零写入，退出码 0；
    部分 id 已存在（撞号混合）→ 报错退出（非零码），不做任何写入；
    包内 id 重复 / 字段非法 → 报错退出（非零码），三个数据文件一律不动。
  · ledger 台账字段只用于回查，不写进任何数据文件。

跑完自动执行（可用开关关）：
  · python3 tools/rollup_declarations.py --write   （--no-rollup 跳过）
  · python3 tools/transcribe_reconcile.py --check --ids <本包全部新 id>（结果打到 stdout，
    其退出码仅作参考：section 未声明等由入库写者另步补，不并入本脚本退出码）
"""
import argparse
import io
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QJS = os.path.join(ROOT, 'data/questions.js')
TJS = os.path.join(ROOT, 'data/text.js')
FJS = os.path.join(ROOT, 'data/figures.js')

VALID_LEVEL = {'easy', 'medium', 'hard'}
VALID_ORIGIN = {'legacy', 'textbook', 'pdf'}
VALID_BOOK = {'03', '04'}
# 与 data/questions.js 现有题行一致的字段顺序（只影响输出排版，不影响渲染）
Q_FIELDS = ['id', 'unit', 'no', 'source', 'topic', 'section', 'answer', 'value',
            'type', 'hint', 'level', 'paper', 'origin', 'stem']


class MergeError(Exception):
    pass


# ---------------------------------------------------------------------------
# 校验
# ---------------------------------------------------------------------------
def validate_fragment(frag):
    """返回 (questions, errors)。errors 非空即整包拒绝，不做任何写入。"""
    errors = []
    if not isinstance(frag, dict):
        return [], ['题包顶层必须是 JSON 对象']

    questions = frag.get('questions')
    if not isinstance(questions, list) or not questions:
        errors.append('questions 必须是非空数组')
        return [], errors

    book = frag.get('book')
    if book not in VALID_BOOK:
        errors.append('顶层 book 非法: %r（只允许 03/04）' % (book,))
    if not isinstance(frag.get('topic'), int) or frag['topic'] < 1:
        errors.append('顶层 topic 必须是正整数: %r' % (frag.get('topic'),))
    fsection = frag.get('section')
    if not fsection or not re.fullmatch(r'\d+\.\d+\.T\d+', str(fsection)):
        errors.append('顶层 section 缺失或不是 X.Y.TN 形态: %r' % fsection)

    seen_ids = {}
    out = []
    for i, q in enumerate(questions):
        tag = 'questions[%d]' % i
        if not isinstance(q, dict):
            errors.append('%s 必须是对象' % tag)
            continue
        # 必填字段（口径同 transcribe-spec.md §2.1）
        for f in ('id', 'unit', 'no', 'source', 'topic', 'section', 'type',
                  'answer', 'level', 'origin', 'paper', 'stem'):
            if q.get(f) is None or q.get(f) == '':
                errors.append('%s 缺必填字段: %s' % (tag, f))
        qid = q.get('id')
        # id 形态 + 包内重复
        if qid:
            if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]*', str(qid)):
                errors.append('%s id 形态非法: %r' % (tag, qid))
            if qid in seen_ids:
                errors.append('%s 包内 id 重复: %s（与 %s）' % (tag, qid, seen_ids[qid]))
            seen_ids[qid] = tag
        # 取值域
        if q.get('type') not in ('mcq', 'grid'):
            errors.append('%s type 非法: %r（只允许 mcq/grid）' % (tag, q.get('type')))
        if q.get('level') and q['level'] not in VALID_LEVEL:
            errors.append('%s level 非法: %r（只允许 easy/medium/hard）' % (tag, q.get('level')))
        if q.get('origin') and q['origin'] not in VALID_ORIGIN:
            errors.append('%s origin 非法: %r（只允许 legacy/textbook/pdf）' % (tag, q.get('origin')))
        # unit / section 自洽
        unit = q.get('unit')
        sec = q.get('section')
        if sec:
            m = re.fullmatch(r'(\d+)\.\d+\.T\d+', str(sec))
            if not m:
                errors.append('%s section 不是 X.Y.TN 形态: %r' % (tag, sec))
            elif int(m.group(1)) != unit:
                errors.append('%s section=%s 与 unit=%s 首段不一致' % (tag, sec, unit))
            if fsection and sec != fsection:
                errors.append('%s section=%s 与题包顶层 section=%s 不一致' % (tag, sec, fsection))
        if not isinstance(unit, int) or unit not in (1, 2, 3, 4):
            errors.append('%s unit 非法: %r（只允许 1–4 整数）' % (tag, unit))
        if not isinstance(q.get('no'), int) or q['no'] < 1:
            errors.append('%s no 必须是正整数: %r' % (tag, q.get('no')))
        # 位图禁令：题包不得带 image / 裁图登记
        for bad in ('image', 'choiceFigures'):
            if q.get(bad):
                errors.append('%s 禁带 %s 字段（新录题一律矢量，见 transcribe-spec.md §5）' % (tag, bad))
        choices = q.get('choices') or {}
        figure = q.get('figure') or []
        if q.get('type') == 'mcq':
            if not re.fullmatch(r'[A-E]', str(q.get('answer') or '')):
                errors.append('%s mcq answer 必须是单字母 A–E: %r' % (tag, q.get('answer')))
            else:
                letters_text = [k for k in 'ABCDE' if str(choices.get(k) or '').strip()]
                graphical = bool(figure) or bool(q.get('choiceGraphs'))
                if str(q['answer']) not in choices:
                    errors.append('%s mcq answer=%s 不在 choices 里' % (tag, q['answer']))
                if len(letters_text) != 4 and not graphical:
                    errors.append('%s mcq 文字选项不是 4 个（实际 %d），且无 figure/choiceGraphs 图形通路'
                                  % (tag, len(letters_text)))
            if q.get('value') is not None:
                errors.append('%s mcq 的 value 应为 null' % tag)
        elif q.get('type') == 'grid':
            val = q.get('value')
            if val is None or not isinstance(val, (int, float)) or isinstance(val, bool) \
                    or val != val or val in (float('inf'), float('-inf')):
                errors.append('%s grid 必须有有限数字 value（不能是字符串/布尔）' % tag)
            if not str(q.get('answer') or '').strip():
                errors.append('%s grid answer 为空' % tag)
            if choices:
                errors.append('%s grid 不应带 choices（应为空对象）' % tag)
        # figSpec / choiceGraphs 形态
        spec = q.get('figSpec')
        if spec is not None and not isinstance(spec, dict):
            errors.append('%s figSpec 必须是对象或 null' % tag)
        cg = q.get('choiceGraphs')
        if cg is not None:
            if not isinstance(cg, dict) or not cg:
                errors.append('%s choiceGraphs 必须是非空对象或 null' % tag)
            elif q.get('type') == 'mcq' and set(figure or []) - set(cg.keys()):
                errors.append('%s choiceGraphs 缺少 figure 登记的选项: %s'
                              % (tag, sorted(set(figure) - set(cg.keys()))))
        # paper 必须含「专项」（T 子节题，exam-core 靠它识别）
        if sec and re.search(r'\.T\d+$', str(sec)) and q.get('paper') and '专项' not in q['paper']:
            errors.append('%s T 子节题 paper 必须含「专项」二字: %r' % (tag, q['paper']))
        out.append(q)
    return out, errors


def existing_ids(qids, qjs_src, tjs_src, fjs_src):
    """返回 {id: 出现位置集合}；幂等判据：任一文件已出现即视为已入库。"""
    present = {}
    for qid in qids:
        locs = set()
        if '"id":"%s"' % qid in qjs_src:
            locs.add('questions.js')
        if '"%s":' % qid in tjs_src:
            locs.add('text.js')
        if '"%s"' % qid in fjs_src:
            locs.add('figures.js')
        if locs:
            present[qid] = locs
    return present


# ---------------------------------------------------------------------------
# 写出（纯新增；既有行只允许补尾逗号）
# ---------------------------------------------------------------------------
def emit_question_line(q):
    obj = {f: q.get(f) for f in Q_FIELDS}
    return '    ' + json.dumps(obj, ensure_ascii=True, separators=(',', ':'))


def emit_text_entry(q):
    entry = {
        'stem': q['stem'],
        'choices': q.get('choices') or {},
        'figure': q.get('figure') or [],
        'type': q['type'],
    }
    # 与现有 text.js 主流写法一致：非 ASCII 用 \uXXXX 转义
    return '  "%s": %s' % (q['id'], json.dumps(entry, ensure_ascii=True, separators=(',', ':')))


def append_questions(orig, new_qs):
    """在 questions[] 末尾追加；最后一行补尾逗号。返回新文本。"""
    lines = orig.split('\n')
    close_idx = None
    for i in range(len(lines) - 1, -1, -1):
        if lines[i].rstrip() == '  ]':
            close_idx = i
            break
    if close_idx is None:
        raise MergeError('未找到 questions 数组收尾行（  ]），拒绝写入')
    last_q = close_idx - 1
    if last_q >= 0 and not lines[last_q].rstrip().endswith(','):
        lines[last_q] = lines[last_q].rstrip() + ','
    emitted = [emit_question_line(q) + ',' for q in new_qs]
    emitted[-1] = emitted[-1].rstrip(',')  # 末行不带逗号
    lines[close_idx:close_idx] = emitted
    return '\n'.join(lines)


def append_text(orig, new_qs):
    lines = orig.split('\n')
    close_idx = None
    for i in range(len(lines) - 1, -1, -1):
        if lines[i].rstrip() == '};':
            close_idx = i
            break
    if close_idx is None:
        raise MergeError('未找到 TD_TEXT 收尾（};），拒绝写入')
    last_e = close_idx - 1
    if last_e >= 0 and not lines[last_e].rstrip().endswith(','):
        lines[last_e] = lines[last_e].rstrip() + ','
    emitted = [emit_text_entry(q) + ',' for q in new_qs]
    emitted[-1] = emitted[-1].rstrip(',')
    lines[close_idx:close_idx] = emitted
    return '\n'.join(lines)


def append_figures(orig, new_qs):
    """spec 走新的 Object.assign 块追加到文件尾；choiceGraphs 走末尾直接赋值。
    纯新增，不碰既有块。"""
    spec_block = []
    cg_block = []
    for q in new_qs:
        spec = q.get('figSpec')
        if spec:
            spec_block.append('  "%s": %s,' % (
                q['id'], json.dumps(spec, ensure_ascii=True, separators=(',', ':'))))
        cg = q.get('choiceGraphs')
        if cg:
            cg_block.append("window.TD_CHOICE_GRAPHS['%s'] = %s;" % (
                q['id'], json.dumps(cg, ensure_ascii=True, separators=(',', ':'))))
    out = orig.rstrip('\n')
    if spec_block:
        out += '\n\n/* 题包追加（merge_transcribe_fragment.py）：TD_FIG_SPECS */\n'
        out += 'Object.assign(window.TD_FIG_SPECS, {\n' + '\n'.join(spec_block) + '\n});\n'
    if cg_block:
        out += '\n/* 题包追加（merge_transcribe_fragment.py）：TD_CHOICE_GRAPHS */\n'
        out += '\n'.join(cg_block) + '\n'
    return out


def self_check_existing_preserved(before, after):
    """既有行必须全部仍在（末行允许多一个尾逗号）；违者说明改写了既有内容。"""
    old = [l.rstrip().rstrip(',') for l in before.split('\n') if l.strip()]
    new = [l.rstrip().rstrip(',') for l in after.split('\n') if l.strip()]
    missing = [l for l in old if l not in new]
    return missing


# ---------------------------------------------------------------------------
# 主流程
# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description='题包机械并入题库（只新增，幂等）')
    ap.add_argument('--fragment', required=True, help='题包 JSON 路径')
    ap.add_argument('--dry-run', action='store_true', help='只校验 + 打印，不写盘')
    ap.add_argument('--no-rollup', action='store_true', help='跳过 rollup_declarations.py --write')
    args = ap.parse_args()

    try:
        frag = json.load(io.open(args.fragment, encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as e:
        print('FAIL: 题包读取失败: %s' % e)
        return 1

    qjs = io.open(QJS, encoding='utf-8').read()
    tjs = io.open(TJS, encoding='utf-8').read()
    fjs = io.open(FJS, encoding='utf-8').read()

    questions, errors = validate_fragment(frag)
    if errors:
        for e in errors:
            print('FAIL: %s' % e)
        print('\n校验未过，未写入任何文件。')
        return 1

    # 幂等 / 撞号判据：任一文件已出现即视为已入库
    qids = [q['id'] for q in questions]
    present = existing_ids(qids, qjs, tjs, fjs)
    fresh = [q for q in questions if q['id'] not in present]

    print('题包: book=%r topic=%s section=%s · 共 %d 题' % (
        frag.get('book'), frag.get('topic'), frag.get('section'), len(questions)))
    if present:
        print('已存在: %s' % ', '.join('%s(%s)' % (k, ','.join(v)) for k, v in present.items()))
    print('将新增 %d 题: %s' % (len(fresh), ', '.join(q['id'] for q in fresh) or '无'))

    if args.dry_run:
        print('\n[dry-run] 未写盘。')
        return 0

    # 撞号混合：部分已存在、部分新增 → 拒绝，防止新旧混写
    if present and fresh:
        print('FAIL: 撞号混合——以下 id 已存在，其余为新增，拒绝混合写入（整包重发或先清冲突）: %s'
              % ', '.join(sorted(present)))
        return 1

    if not fresh:
        print('\n全部 id 已存在，零写入（幂等）。')
        return 0

    # 写前三快照
    before = {'q': qjs, 't': tjs, 'f': fjs}
    new_qjs = append_questions(qjs, fresh)
    new_tjs = append_text(tjs, fresh)
    new_fjs = append_figures(fjs, fresh)

    # 自检：既有行不得丢失
    for name, old, new in (('questions.js', before['q'], new_qjs),
                           ('text.js', before['t'], new_tjs),
                           ('figures.js', before['f'], new_fjs)):
        missing = self_check_existing_preserved(old, new)
        if missing:
            print('FAIL: 自检发现既有行丢失（%s），拒绝落盘：%s' % (name, missing[:3]))
            return 1

    io.open(QJS, 'w', encoding='utf-8').write(new_qjs)
    io.open(TJS, 'w', encoding='utf-8').write(new_tjs)
    io.open(FJS, 'w', encoding='utf-8').write(new_fjs)
    print('\n已写入 data/questions.js / data/text.js / data/figures.js（纯新增）。')

    if not args.no_rollup:
        print('\n== rollup_declarations.py --write ==')
        r = subprocess.run(['python3', 'tools/rollup_declarations.py', '--write'],
                            cwd=ROOT, capture_output=True, text=True)
        print(r.stdout)
        if r.stderr.strip():
            print(r.stderr)
        if r.returncode != 0:
            print('!! rollup 非零退出，请检查（数据已写入，未回滚）')
            return 1

    print('== transcribe_reconcile.py --check（参考输出，退出码不并入）==')
    r = subprocess.run(['python3', 'tools/transcribe_reconcile.py', '--check',
                         '--ids', ','.join(q['id'] for q in fresh)],
                        cwd=ROOT, capture_output=True, text=True)
    print(r.stdout)
    if r.stderr.strip():
        print(r.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
