#!/usr/bin/env python3
"""把 docs/transcribe/bank-rulings.json 的裁定幂等地落到 data/questions.js。

裁定源 = docs/transcribe/bank-rulings.json（总监口径，唯一真相）。
执行时机 = CI 在「合并题包」之后、「答案补丁」之前；也可本地手动跑。

处理档位（都不删数据行，只加字段 / 换挂载点）：
  retire      → 题上加 "retired":true,"alias":"<canonical>"（不进任何板块题量、不进错题本）
  merge       → 题上加 "mergedInto":"<canonical>"（同上，用于书内重复印）
  rehome      → 改题的 "section" 挂载点（题仍可练）
  hideSections→ 声明层节点上加 "hidden":true（入口不再出现，链接仍可解析）
  labels      → 改群组节点的 cn / 加 sub（板块显示名）
  variants    → 题上加 "variant":true,"variantOf":"<母题 id>"（仍可练，统计可识别同族）

安全：只在该题自己的 JSON 对象里插字段（按字符串定位 + 花括号配对，避开其余字节），
因此 diff 只有被裁定过的行。重复执行不会叠加字段；目标 id 不存在会直接失败退出。
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BANK = os.path.join(ROOT, 'data/questions.js')
RULINGS = os.path.join(ROOT, 'docs/transcribe/bank-rulings.json')


def load_rulings():
    with io.open(RULINGS, encoding='utf-8') as f:
        return json.load(f)


def obj_span(text, oid):
    """返回 "id":"<oid>" 所在 JSON 对象的花括号区间 [start, end)；找不到返回 None。"""
    key = '"id":"%s"' % oid
    i = text.find(key)
    if i < 0:
        return None
    start = text.rfind('{', 0, i)
    if start < 0:
        return None
    depth = 0
    j = start
    in_str = False
    esc = False
    while j < len(text):
        c = text[j]
        if in_str:
            if esc:
                esc = False
            elif c == '\\':
                esc = True
            elif c == '"':
                in_str = False
        else:
            if c == '"':
                in_str = True
            elif c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    return (start, j + 1)
        j += 1
    return None


def has_field(span_text, field):
    return ('"%s"' % field) in span_text


def add_fields(text, oid, fields, require=True):
    """在对象末尾追加 fields（dict，按给定顺序序列化）。返回 (新文本, 是否改动)。"""
    sp = obj_span(text, oid)
    if sp is None:
        if require:
            raise SystemExit('裁定目标不存在：%s' % oid)
        return text, False
    seg = text[sp[0]:sp[1]]
    todo = [(k, v) for k, v in fields.items() if not has_field(seg, k)]
    if not todo:
        return text, False
    payload = ''.join(',%s:%s' % (json.dumps(k, ensure_ascii=True),
                                  json.dumps(v, ensure_ascii=True)) for k, v in todo)
    new_seg = seg[:-1] + payload + '}'
    return text[:sp[0]] + new_seg + text[sp[1]:], True


def replace_field(text, oid, field, value):
    sp = obj_span(text, oid)
    if sp is None:
        raise SystemExit('裁定目标不存在：%s' % oid)
    seg = text[sp[0]:sp[1]]
    pat = re.compile(r'"%s":"(?:[^"\\]|\\.)*"' % field)
    if not pat.search(seg):
        raise SystemExit('%s 里没有字段 %s' % (oid, field))
    seg2 = pat.sub('"%s":%s' % (field, json.dumps(value, ensure_ascii=True)), seg, count=1)
    return text[:sp[0]] + seg2 + text[sp[1]:], seg2 != seg


def main():
    with io.open(BANK, encoding='utf-8') as f:
        text = f.read()
    rulings = load_rulings()
    changed = []

    for r in rulings.get('retire', []):
        text, ch = add_fields(text, r['id'], {'retired': True, 'alias': r['alias']})
        changed += [r['id']] if ch else []

    for m in rulings.get('merge', []):
        text, ch = add_fields(text, m['id'], {'mergedInto': m['into']})
        changed += [m['id']] if ch else []

    for h in rulings.get('rehome', []):
        sp = obj_span(text, h['id'])
        if sp is None:
            raise SystemExit('rehome 目标不存在：%s' % h['id'])
        cur = re.search(r'"section":"([^"]+)"', text[sp[0]:sp[1]])
        if cur and cur.group(1) != h['section']:
            text, _ = replace_field(text, h['id'], 'section', h['section'])
            changed.append(h['id'] + '→' + h['section'])

    for s in rulings.get('hideSections', []):
        text, ch = add_fields(text, s['id'], {'hidden': True})
        changed += ['hide ' + s['id']] if ch else []

    for lb in rulings.get('labels', []):
        text, ch = replace_field(text, lb['id'], 'cn', lb['cn'])
        if ch:
            changed.append('cn ' + lb['id'])
        if lb.get('sub'):
            text, ch2 = add_fields(text, lb['id'], {'sub': lb['sub']})
            if ch2:
                changed.append('sub ' + lb['id'])

    for v in rulings.get('variants', []):
        text, ch = add_fields(text, v['id'], {'variant': True, 'variantOf': v['variantOf']})
        changed += ['variant ' + v['id']] if ch else []

    if changed:
        with io.open(BANK, 'w', encoding='utf-8') as f:
            f.write(text)
    print('[apply-rulings] 改动 %d 处：%s' % (len(changed), ', '.join(changed[:6]) +
                                              (' …' if len(changed) > 6 else '')))
    if not changed:
        print('[apply-rulings] 无变化（已是最新裁定）')
    return 0


if __name__ == '__main__':
    sys.exit(main())
