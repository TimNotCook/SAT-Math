#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""给 HTML 里的数据/逻辑脚本加内容哈希版本号，防止浏览器缓存旧题干。

每次题库或代码变化后运行：计算所列 JS 文件内容的短哈希，重写各 HTML 的
<script src="...?v=HASH">。幂等——哈希不变时文件不改动。

用法：python3 bump_assets.py [项目根]
      python3 bump_assets.py --check [项目根]   # 只校验五页版本，不写文件
"""
import os, re, io, sys, hashlib

CHECK = '--check' in sys.argv[1:]
_ARGS = [a for a in sys.argv[1:] if not a.startswith('-')]
ROOT = os.path.dirname(os.path.abspath(__file__)) if not _ARGS else os.path.abspath(_ARGS[0])

# 参与哈希的文件（顺序固定）
HASH_FILES = [
    'data/questions.js', 'data/bank-active.js', 'data/text.js', 'data/figures.js',
    'data/figure_crops.js', 'data/choice_crops.js',
    'grade-core.js', 'app-core.js', 'app-ui.js', 'figures.js', 'exam-core.js', 'analysis.js',
    'exam.js', 'drill.js', 'history-page.js', 'choice-figures.js', 'crossout.js', 'progress-save.js', 'pdf-import.js', 'image-import.js',
    'bluebook-shell.js', 'cloud-config.js', 'cloud-account.js',
    'supa-cloud.js',
    'scratch-pad.js', 'wrong-page.js', 'theme.js', 'i18n.js',
    'app.css', 'bluebook.css', 'glass.css',
    # 讲义复习（jiangyi）：图与数据改动必须能换版本，否则改了也到不了浏览器
    # （本项目已经吃过两次「文件建了但页面拿的是旧缓存」的亏：supa-cloud.js）
    'data/jiangyi.js', 'data/jiangyi_figures.js', 'jiangyi-core.js', 'jiangyi-page.js',
    # 重复题干 alias 映射（改动即换版本，否则错题本归并到不了浏览器）
    'data/aliases.js',
    # HTML 原始内容参与摘要：文案改动也能刷新缓存（先读原文再替换，幂等不破坏自引用）
    'index.html', 'exam.html', 'drill.html', 'wrong.html', 'jiangyi.html', 'history.html',
    # Service Worker 自身：逻辑改动也要换版本号（VERSION 行在摘要里被抹掉，避免自指）
    'sw.js',
]
# 需要加版本号的脚本（CSS 也一起，避免样式缓存）
BUMP = [
    'data/questions.js', 'data/bank-active.js', 'data/text.js', 'data/figures.js',
    'data/figure_crops.js', 'data/choice_crops.js',
    'grade-core.js', 'app-core.js', 'app-ui.js', 'figures.js', 'exam-core.js', 'analysis.js',
    'exam.js', 'drill.js', 'history-page.js', 'choice-figures.js', 'crossout.js', 'progress-save.js', 'pdf-import.js', 'image-import.js',
    'bluebook-shell.js', 'cloud-config.js', 'cloud-account.js',
    'supa-cloud.js', 'scratch-pad.js', 'wrong-page.js', 'theme.js', 'i18n.js', 'app.css', 'bluebook.css', 'glass.css',
    'data/jiangyi.js', 'data/jiangyi_figures.js', 'jiangyi-core.js', 'jiangyi-page.js',
    'data/aliases.js',
]
HTML = ['index.html', 'exam.html', 'drill.html', 'wrong.html', 'jiangyi.html', 'history.html']
TOKEN = re.compile(r'(?:src|href)="[^"]*?\?v=([^"]+)"')


def page_versions():
    """按 HTML 读取每页所有 ?v= 值；任何一页缺 token 或一页多值都算不合法。"""
    out = {}
    for name in HTML:
        p = os.path.join(ROOT, name)
        if not os.path.exists(p):
            out[name] = []
            continue
        html = io.open(p, encoding='utf-8').read()
        out[name] = TOKEN.findall(html)
    return out


def assert_versions_synced(expected=None):
    """五页必须都至少带一个 ?v=，每页内部唯一，跨页也唯一。"""
    per = page_versions()
    shown = ' | '.join('%s=%s' % (n, ','.join(sorted(set(v))) if v else 'MISSING') for n, v in per.items())
    bad = []
    for n, vals in per.items():
        if not vals:
            bad.append('%s 没有 ?v=' % n)
        elif len(set(vals)) != 1:
            bad.append('%s 同页多值 %s' % (n, ','.join(sorted(set(vals)))))
    allv = set(v for vals in per.values() for v in vals)
    if len(allv) != 1:
        bad.append('五页不同值 %s' % ','.join(sorted(allv)))
    if expected is not None and allv != {expected}:
        bad.append('版本未对齐内容哈希 %s ≠ %s' % (','.join(sorted(allv)), expected))
    print('page versions :', shown)
    if bad:
        print('FAIL 五页资源版本不一致：' + '；'.join(bad))
        raise SystemExit(1)
    print('PASS 五页资源版本一致：' + sorted(allv)[0])


CONFLICT = re.compile(r'^(?:<<<<<<<|=======|>>>>>>>)', re.M)


def assert_no_conflict_markers():
    """带冲突标记的文件绝不能进哈希/提交：曾有一次 bump 在未解决的
    wrong.html 上运行，把 <<<<<<< HEAD 连同两份重复脚本一起带上线。"""
    bad = []
    for f in HASH_FILES + BUMP:
        p = os.path.join(ROOT, f)
        if not os.path.exists(p):
            continue
        txt = io.open(p, encoding='utf-8', errors='replace').read()
        if CONFLICT.search(txt):
            bad.append(f)
    if bad:
        print('FAIL 这些文件还带 Git 冲突标记：' + '、'.join(bad))
        raise SystemExit(2)


def digest():
    h = hashlib.sha256()
    html_names = set(HTML)
    for f in HASH_FILES:
        p = os.path.join(ROOT, f)
        if os.path.exists(p):
            h.update(f.encode('utf-8'))
            data = open(p, 'rb').read()
            # HTML 参与摘要时先去掉已写入的 ?v= 令牌，否则每次重跑哈希都会变（非幂等）
            if f in html_names:
                data = re.sub(rb'(\?v=)[0-9a-f]+', rb'\1', data)
            if f == 'sw.js':
                data = re.sub(rb"(var VERSION = ')[^']*(';)", rb'\1\2', data)
            h.update(data)
    return h.hexdigest()[:12]


def stamp_sw(v):
    """把 sw.js 的缓存桶名跟构建令牌绑死：每次部署换桶，旧缓存自愈。"""
    p = os.path.join(ROOT, 'sw.js')
    if not os.path.exists(p):
        return False
    s = io.open(p, encoding='utf-8').read()
    new = re.sub(r"(var VERSION = ')[^']*(';)", lambda m: m.group(1) + 'satmath-' + v + m.group(2), s, count=1)
    if new != s:
        io.open(p, 'w', encoding='utf-8').write(new)
        return True
    return False


def sw_version():
    p = os.path.join(ROOT, 'sw.js')
    if not os.path.exists(p):
        return None
    m = re.search(r"var VERSION = '([^']*)';", io.open(p, encoding='utf-8').read())
    return m.group(1) if m else None


def main():
    assert_no_conflict_markers()
    v = digest()
    if CHECK:
        print('asset version:', v)
        assert_versions_synced(v)
        return v
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
    if stamp_sw(v):
        changed.append('sw.js')
    print('asset version:', v)
    print('updated files :', changed if changed else 'none (already current)')
    print('sw cache       :', sw_version())
    assert_versions_synced(v)
    if sw_version() != 'satmath-' + v:
        print('FAIL sw.js VERSION 未跟随构建令牌：%s ≠ satmath-%s' % (sw_version(), v))
        raise SystemExit(1)
    return v


if __name__ == '__main__':
    main()
