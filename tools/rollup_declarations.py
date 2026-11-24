#!/usr/bin/env python3
"""按数据实际重算声明层（sections 的 count / isGroup 的 childCount / unit 的 total）。

口径（唯一口径，禁止手改数字）：
  1. 叶子节（有 "id"、无 "parent"、非 isGroup）：count = questions 里 section 等于该 id 的题数。
  2. 群组节（isGroup:true，如 1.7 / 3.6）：count = 该群组下所有 parent 指向它的子节 count 之和；
     childCount = 子节个数。群组自身不直接挂题。
  3. T 子节（形如 3.6.T8）：属叶子，按 section 精确匹配计数。
  4. unit.total = 该单元所有叶子节 count 之和（群组节点不重复计入）。
  5. 题库里出现、但 units 里没有声明的 section（例如 2.6 / 2.7）：脚本只报告，绝不自动新增节点。
  6. 声明了但一题没有的叶子节：报告为 0，不删除节点。

用法：
  python3 tools/rollup_declarations.py            # 只出对账表，不改文件
  python3 tools/rollup_declarations.py --write    # 回填 data/questions.js 的 count / childCount / total
"""
import io
import json
import re
import sys
from collections import Counter

ROOT = 'data/questions.js'
BANK_RE = re.compile(r'(window\.TD_BANK\s*=\s*)(\{.*\})(;\s*)$', re.S)


def load():
    src = io.open(ROOT, encoding='utf-8').read()
    m = BANK_RE.search(src)
    if not m:
        raise SystemExit('data/questions.js 里没找到 window.TD_BANK = {...};')
    bank = json.loads(m.group(2))
    return src, m, bank


def compute(bank):
    actual = Counter(q.get('section') for q in bank['questions'])
    declared = set()
    groups = {}
    leaf_per_unit = {}
    for u in bank['units']:
        uid = u['id']
        leaf = []
        for s in u['sections']:
            sid = s['id']
            declared.add(sid)
            if s.get('isGroup'):
                groups[sid] = s
            elif 'parent' in s:
                leaf.append(sid)
            else:
                leaf.append(sid)
        leaf_per_unit[uid] = leaf
    return actual, declared, groups, leaf_per_unit


def report(bank):
    actual, declared, groups, leaf_per_unit = compute(bank)
    rows = []
    problems = []
    for u in bank['units']:
        print('\n== Unit %s %s ==' % (u['id'], u.get('cn', '')))
        leaf_total = 0
        child_sum = Counter()
        for s in u['sections']:
            sid = s['id']
            if s.get('isGroup'):
                kids = [x for x in u['sections'] if x.get('parent') == sid]
                calc = sum(actual.get(k['id'], 0) for k in kids)
                dec = s.get('count')
                print('  %-9s group  declared=%s actual=%s %s' % (
                    sid, dec, calc, 'OK' if dec == calc else '<<< 差 %+d' % (calc - (dec or 0))))
                if dec != calc:
                    problems.append((sid, dec, calc))
                if s.get('childCount') != len(kids):
                    problems.append((sid + '.childCount', s.get('childCount'), len(kids)))
                child_sum[sid] = calc
                continue
            dec = s.get('count')
            calc = actual.get(sid, 0)
            leaf_total += calc
            mark = 'OK' if dec == calc else '<<< 差 %+d' % (calc - (dec or 0))
            print('  %-9s        declared=%s actual=%s %s' % (sid, dec, calc, mark))
            if dec != calc:
                problems.append((sid, dec, calc))
        tot = u.get('total')
        mark = 'OK' if tot == leaf_total else '<<< 差 %+d' % (leaf_total - (tot or 0))
        print('  total: declared=%s actual=%s %s' % (tot, leaf_total, mark))
        if tot != leaf_total:
            problems.append(('unit%s.total' % u['id'], tot, leaf_total))

    orphans = sorted(k for k in actual if k and k not in declared)
    if orphans:
        print('\n!! 未声明的 section（只报告，不自动建节点）：')
        for k in orphans:
            print('   %-9s %d 题' % (k, actual[k]))
    group_ids = set(groups)
    ghosts = sorted(k for k in declared if actual.get(k, 0) == 0 and k not in group_ids)
    if ghosts:
        print('\n!! 声明了但 0 题的叶子节：%s' % ', '.join(ghosts))
    print('\n合计问题项：%d' % len(problems))
    return problems, orphans


def _obj_span(text, start):
    """从 start（指向 '{'）起找到配对的 '}'，返回 (s, e) 闭区间。"""
    depth = 0
    for i in range(start, len(text)):
        c = text[i]
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return start, i
    raise ValueError('unbalanced braces')


def patch(bank, src):
    actual, declared, groups, leaf_per_unit = compute(bank)
    units_start = src.find('"units"')
    arr_start = src.find('[', units_start)
    pos = arr_start
    out = []
    for u in bank['units']:
        u_start = src.find('{', pos)
        u_s, u_e = _obj_span(src, u_start)
        body = src[u_s:u_e + 1]
        # unit.total
        leaf_total = sum(actual.get(s, 0) for s in leaf_per_unit[u['id']])
        body = re.sub(r'"total":\s*\d+', '"total":%d' % leaf_total, body, count=1)
        # sections
        for s in u['sections']:
            sid = s['id']
            if s.get('isGroup'):
                calc = sum(actual.get(x['id'], 0) for x in u['sections'] if x.get('parent') == sid)
            else:
                calc = actual.get(sid, 0)
            # 找到包含该 id 的节对象
            m = re.search(r'\{"count":(\d+),("cn":"[^"]*",)?"id":"%s"' % re.escape(sid), body)
            if not m:
                m = re.search(r'\{"id":"%s"' % re.escape(sid), body)
            if not m:
                raise SystemExit('定位不到 section %s' % sid)
            o_s = body.find('{', m.start()) if m.group(0).startswith('{"id"') else m.start()
            o_s, o_e = _obj_span(body, o_s)
            obj = body[o_s:o_e + 1]
            obj2 = re.sub(r'"count":\s*\d+', '"count":%d' % calc, obj, count=1)
            if s.get('isGroup'):
                kids = len([x for x in u['sections'] if x.get('parent') == sid])
                if '"childCount"' in obj2:
                    obj2 = re.sub(r'"childCount":\s*\d+', '"childCount":%d' % kids, obj2, count=1)
            body = body[:o_s] + obj2 + body[o_e + 1:]
        out.append((u_s, u_e + 1, body))
        pos = u_e + 1
    for s, e, body in reversed(out):
        src = src[:s] + body + src[e:]
    return src


def main():
    write = '--write' in sys.argv
    src, m, bank = load()
    problems, orphans = report(bank)
    if write:
        new = patch(bank, src)
        io.open(ROOT, 'w', encoding='utf-8').write(new)
        print('\n已回填 %s' % ROOT)
    elif problems:
        print('\n（未加 --write，文件未改动）')


if __name__ == '__main__':
    main()
