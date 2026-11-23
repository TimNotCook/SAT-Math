#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""给 HTML 里的数据/逻辑脚本加内容哈希版本号，防止浏览器缓存旧题干。

每次题库或代码变化后运行：计算所列 JS 文件内容的短哈希，重写各 HTML 的
<script src="...?v=HASH">。幂等——哈希不变时文件不改动。

用法：python3 bump_assets.py [项目根]
"""
import os, re, io, sys, hashlib

ROOT = os.path.dirname(os.path.abspath(__file__)) if len(sys.argv) < 2 else os.path.abspath(sys.argv[1])

# 参与哈希的文件（顺序固定）
HASH_FILES = [
    'data/questions.js', 'data/text.js', 'data/figures.js',
    'data/figure_crops.js', 'data/choice_crops.js',
    'app-core.js', 'app-ui.js', 'figures.js', 'exam-core.js', 'analysis.js',
    'exam.js', 'drill.js', 'progress-save.js', 'pdf-import.js', 'image-import.js',
    'bluebook-shell.js', 'cloud-config.js', 'firebase-cloud.js', 'cloud-account.js',
    'workbuddy-cloud.js',
    'scratch-pad.js',
    'app.css', 'bluebook.css',
    # HTML 原始内容参与摘要：文案改动也能刷新缓存（先读原文再替换，幂等不破坏自引用）
    'exam.html', 'drill.html', 'wrong.html',
]
# 需要加版本号的脚本（CSS 也一起，避免样式缓存）
BUMP = [
    'data/questions.js', 'data/text.js', 'data/figures.js',
    'data/figure_crops.js', 'data/choice_crops.js',
    'app-core.js', 'app-ui.js', 'figures.js', 'exam-core.js', 'analysis.js',
    'exam.js', 'drill.js', 'progress-save.js', 'pdf-import.js', 'image-import.js',
    'bluebook-shell.js', 'cloud-config.js', 'firebase-cloud.js', 'cloud-account.js',
    'workbuddy-cloud.js', 'scratch-pad.js', 'app.css', 'bluebook.css',
]
HTML = ['exam.html', 'drill.html', 'wrong.html']


def digest():
    h = hashlib.sha256()
    html_names = {'exam.html', 'drill.html', 'wrong.html'}
    for f in HASH_FILES:
        p = os.path.join(ROOT, f)
        if os.path.exists(p):
            h.update(f.encode('utf-8'))
            data = open(p, 'rb').read()
            # HTML 参与摘要时先去掉已写入的 ?v= 令牌，否则每次重跑哈希都会变（非幂等）
            if f in html_names:
                data = re.sub(rb'(\?v=)[0-9a-f]+', rb'\1', data)
            h.update(data)
    return h.hexdigest()[:12]


def main():
    v = digest()
    changed = []
    for name in HTML:
        p = os.path.join(ROOT, name)
        if not os.path.exists(p):
            continue
        s = io.open(p, encoding='utf-8').read()
        orig = s
        for src in BUMP:
            # src="path" / src="path?v=old"  (and CSS link href="...")
            for attr in ('src', 'href'):
                pat = re.compile(r'(' + attr + r'=(["\']))' + re.escape(src) + r'(\?v=[^"\']*)?\2')
                s = pat.sub(lambda m: m.group(1) + src + '?v=' + v + m.group(2), s)
        if s != orig:
            io.open(p, 'w', encoding='utf-8').write(s)
            changed.append(name)
    print('asset version:', v)
    print('updated HTML :', changed if changed else 'none (already current)')
    return v


if __name__ == '__main__':
    main()
