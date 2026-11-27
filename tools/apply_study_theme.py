#!/usr/bin/env python3
import sys

MARKER = '/* ==== study-theme v2'
css = open('tools/study-theme.css', encoding='utf-8').read().strip()
path = 'glass.css'
s = open(path, encoding='utf-8').read()
if MARKER in s:
    print('already applied')
    sys.exit(0)
open(path, 'w', encoding='utf-8').write(s.rstrip() + '\n\n' + css + '\n')
print('study theme appended to glass.css')
