#!/usr/bin/env python3
"""copy_audit.py — 界面文案盘点（可复现口径）

口径（与 docs/UI-COPY.md / docs/UI-COPY-TABLE.md 对齐）：
  1. 统计对象 = 会渲染给用户的**文案片段**：
     - '...' / "..." 字符串字面量（含中文才算）
     - `...` 模板字符串：只取 ${} 之外的**文本片段**（含中文才算），
       ${} 内的表达式不算（它们是代码，不是文案）
     - .html 中的**文本节点**（> 与 < 之间，含中文才算）；
       <script> / <style> 内部不按文本节点统计，按 JS 字面量统计
  2. 注释一律不计：// 、/* */、<!-- -->
  3. 同一文件同一行同一文本只计一次

用法（判据固定，任何人可复跑）：
  python3 tools/copy_audit.py --rev HEAD exam.js exam.html bluebook-shell.js
  python3 tools/copy_audit.py --rev HEAD drill.js drill.html index.html
  python3 tools/copy_audit.py --rev HEAD --summary exam.js exam.html bluebook-shell.js

输出 TSV：文件 <TAB> 行号 <TAB> 类型(literal|template|text) <TAB> 原文
"""
import argparse, re, subprocess, sys

CJK = re.compile(r'[\u4e00-\u9fa5]')


def load(path, rev=None):
    if rev:
        return subprocess.run(['git', 'show', f'{rev}:{path}'],
                              capture_output=True, text=True, check=True).stdout
    with open(path, encoding='utf-8') as f:
        return f.read()


def skip_template_expr(src, i, n, line):
    """i 指向 '${' 之后；返回 (位置, 行号)，位置为匹配的 '}' 之后。"""
    depth = 1
    while i < n:
        c = src[i]
        if c == '\n':
            line += 1
        elif c in '\'"`':
            q = c
            i += 1
            while i < n:
                if src[i] == '\\':
                    i += 2; continue
                if src[i] == '\n':
                    line += 1
                if src[i] == q:
                    break
                i += 1
        elif c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return i + 1, line
        i += 1
    return i, line


def audit(src, path):
    items, i, n, line = [], 0, len(src), 1
    in_script = False
    text_start, text_start_line = 0, 1

    def flush_text(a, b, a_line):
        chunk = src[a:b]
        if CJK.search(chunk):
            t = re.sub(r'\s+', ' ', chunk).strip()
            if t:
                items.append((path, a_line, 'text', t))

    while i < n:
        c = src[i]
        if c == '\n':
            line += 1; i += 1; continue

        # 注释
        if src.startswith('//', i):
            j = src.find('\n', i); i = n if j < 0 else j; continue
        if src.startswith('/*', i):
            j = src.find('*/', i + 2)
            if j < 0: break
            line += src.count('\n', i, j); i = j + 2; continue
        if src.startswith('<!--', i):
            j = src.find('-->', i + 4)
            if j < 0: break
            line += src.count('\n', i, j); i = j + 4; continue

        # HTML 结构
        if path.endswith('.html'):
            tag = re.match(r'<(script|style)\b', src[i:], re.I)
            if tag:
                if not in_script:
                    flush_text(text_start, i, text_start_line)
                in_script = True
                i += len(tag.group(0)); continue
            end = re.match(r'</(script|style)\s*>', src[i:], re.I)
            if end:
                in_script = False
                i += len(end.group(0)); text_start = i; text_start_line = line
                continue
            if not in_script:
                if c == '<':
                    flush_text(text_start, i, text_start_line)
                elif c == '>':
                    text_start = i + 1; text_start_line = line
                i += 1; continue

        # 字符串
        if c in '\'"':
            q, j, start_line = c, i + 1, line
            buf = []
            while j < n:
                if src[j] == '\\':
                    buf.append(src[j + 1] if j + 1 < n else ''); j += 2; continue
                if src[j] == '\n':
                    line += 1; break
                if src[j] == q:
                    break
                buf.append(src[j]); j += 1
            lit = ''.join(buf)
            if CJK.search(lit):
                items.append((path, start_line, 'literal', re.sub(r'\s+', ' ', lit).strip()))
            i = j + 1; continue

        # 模板字符串：只取 ${} 之外的文本片段
        if c == '`':
            j, text, text_line = i + 1, [], line
            while j < n:
                if src[j] == '\\':
                    text.append(src[j + 1] if j + 1 < n else ''); j += 2; continue
                if src.startswith('${', j):
                    seg = ''.join(text)
                    if CJK.search(seg):
                        s = re.sub(r'\s+', ' ', seg).strip()
                        if s:
                            items.append((path, text_line, 'template', s))
                    text = []
                    j, line = skip_template_expr(src, j + 2, n, line)
                    text_line = line
                    continue
                if src[j] == '`':
                    break
                if src[j] == '\n':
                    line += 1
                text.append(src[j]); j += 1
            seg = ''.join(text)
            if CJK.search(seg):
                s = re.sub(r'\s+', ' ', seg).strip()
                if s:
                    items.append((path, text_line, 'template', s))
            i = j + 1; continue

        i += 1

    if path.endswith('.html') and not in_script:
        flush_text(text_start, n, text_start_line)
    return items


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--rev', default=None)
    ap.add_argument('--summary', action='store_true')
    ap.add_argument('files', nargs='+')
    a = ap.parse_args()
    all_items = []
    per = {}
    for f in a.files:
        got = audit(load(f, a.rev), f)
        per[f] = len(got); all_items += got
    if a.summary:
        for f, c in per.items():
            print(f'{f}\t{c}')
        print(f'TOTAL\t{len(all_items)}')
        return
    for it in all_items:
        print('\t'.join(str(x) for x in it))
    print(f'# total={len(all_items)}', file=sys.stderr)


if __name__ == '__main__':
    main()
