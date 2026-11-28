import io, re, sys
p = 'exam.js'
s = io.open(p, encoding='utf-8').read()
if '<<<<<<<' in s:
    s = re.sub(r'<<<<<<< HEAD\n(.*?)=======\n.*?>>>>>>> [^\n]*\n', r'\1', s, count=1, flags=re.S)
    io.open(p, 'w', encoding='utf-8').write(s)
if '<<<<<<<' in s or '\n>>>>>>>' in s:
    print('still has markers'); sys.exit(1)
print('ok')
