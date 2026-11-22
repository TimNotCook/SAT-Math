#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""visual 比对器：逐像素对比 baseline 与 current 截图，输出漂移报告。

用法：
  python3 test/visual/compare.py [baseline_dir] [current_dir] [--threshold 0.001]

判定口径：
  - 逐像素计算 RGB 通道最大差 delta。
  - 「显著变化像素」= delta > 16（过滤字体抗锯齿 / 亚像素抖动噪声）。
  - 每张图显著变化占比 > threshold（默认 0.1%）判 FAIL。
  - 尺寸不一致直接 FAIL（说明布局变了）。

退出码：0 全通过；1 有 FAIL。
"""
import os, sys, json, hashlib
from PIL import Image, ImageChops

def load_manifest(d):
    p = os.path.join(d, 'manifest.json')
    if os.path.exists(p):
        with open(p, encoding='utf-8') as f:
            return json.load(f)['shots']
    return None

def diff_ratio(a, b):
    """返回 (显著变化占比, delta>2 占比)"""
    if a.size != b.size or a.mode != b.mode:
        return None, None
    da = ImageChops.difference(a.convert('RGB'), b.convert('RGB'))
    hist = da.histogram()  # 768 桶：R0..255, G0..255, B0..255
    total = a.size[0] * a.size[1]
    def frac_above(t):
        cnt = 0
        for ch in range(3):
            for v in range(t + 1, 256):
                cnt += hist[ch * 256 + v]
        return cnt / max(total, 1)
    return frac_above(16), frac_above(2)

def main():
    argv = sys.argv[1:]
    threshold = 0.001
    if '--threshold' in argv:
        i = argv.index('--threshold')
        threshold = float(argv[i + 1]); del argv[i:i + 2]
    base = argv[0] if len(argv) > 0 else 'test/visual/baseline'
    curr = argv[1] if len(argv) > 1 else 'test/visual/current'

    base_shots = load_manifest(base)
    if base_shots is None:
        base_files = sorted(f for f in os.listdir(base) if f.endswith('.png'))
        base_shots = [{'id': f[:-4], 'file': f} for f in base_files]
    else:
        base_shots = [{'id': s['id'], 'file': s['file']} for s in base_shots]

    rows = []
    fail = 0
    for s in base_shots:
        bp = os.path.join(base, s['file'])
        cp = os.path.join(curr, s['file'])
        if not os.path.exists(bp):
            rows.append((s['id'], 'MISSING_BASELINE', None, None, 'FAIL')); fail += 1; continue
        if not os.path.exists(cp):
            rows.append((s['id'], 'MISSING_CURRENT', None, None, 'FAIL')); fail += 1; continue
        try:
            a = Image.open(bp); b = Image.open(cp)
            big, small = diff_ratio(a, b)
            if big is None:
                rows.append((s['id'], 'SIZE_MISMATCH', None, None, 'FAIL')); fail += 1; continue
            status = 'PASS' if big <= threshold else 'FAIL'
            if big > threshold: fail += 1
            rows.append((s['id'], f'{big*100:.3f}%', f'{small*100:.3f}%', status, status))
        except Exception as e:
            rows.append((s['id'], f'ERR:{e}', None, None, 'FAIL')); fail += 1

    print('\n=== TD SAT Math 视觉回归报告 ===')
    print(f'baseline: {base}\ncurrent : {curr}\nthreshold: {threshold*100:.2f}% (delta>16 显著变化)\n')
    print(f'{"shot":<28}{"显著Δ>16":<14}{"Δ>2":<14}{"结论"}')
    print('-' * 72)
    for r in rows:
        print(f'{r[0]:<28}{r[1]:<14}{str(r[2] or ""):<14}{r[3]}')
    print('-' * 72)
    print(f'=== {len(rows)-fail} PASS / {fail} FAIL ===')
    sys.exit(1 if fail else 0)

if __name__ == '__main__':
    main()
