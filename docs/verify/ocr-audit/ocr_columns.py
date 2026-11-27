import os, subprocess
from PIL import Image
import numpy as np
from concurrent.futures import ThreadPoolExecutor
SRC={'03':('docs/transcribe/03/pages',102),'04':('docs/transcribe/04/pages',140)}
OUT='/tmp/cols3'; os.makedirs(OUT,exist_ok=True)
OCR='/Users/tim.jizhou.huang/ocr/ocr'
def gutter(im, x0, x1):
    g=np.array(im.convert('L').crop((x0,0,x1,im.size[1])).resize((x1-x0, 800)))
    dark=(g<120).sum(axis=0)
    mid=(x1-x0)//2
    # search widest gap within middle band
    band=dark[int((x1-x0)*0.30):int((x1-x0)*0.70)]
    thr=max(1.0, darksum) if False else 2
    best=(0,None)
    run=0; start=None
    for i,v in enumerate(band):
        if v<=thr:
            if start is None: start=i
            run+=1
        else:
            if start is not None and run>best[0]: best=(run,start+int((x1-x0)*0.30)+run//2)
            start=None; run=0
    if start is not None and run>best[0]: best=(run,start+int((x1-x0)*0.30)+run//2)
    return x0+(best[1] if best[1] else (x1-x0)//2)
def job(t):
    book,page,col,src=t
    im=Image.open(src); W,H=im.size
    px0,px1=(0,W//2) if col<2 else (W//2,W)
    g=gutter(im,px0,px1)
    box=(px0,0,g,H) if col%2==0 else (g,0,px1,H)
    p=f'{OUT}/{book}-{page}-{col}.jpg'; im.crop(box).save(p,quality=88)
    out=subprocess.run([OCR,p],capture_output=True,text=True).stdout
    open(f'{OUT}/{book}-{page}-{col}.txt','w').write(out)
tasks=[]
for book,(path,idx0) in SRC.items():
    files=sorted(x for x in os.listdir(path) if x.endswith('.jpg'))
    for fi,f in enumerate(files):
        for pside in (0,1):
            for c in (0,1):
                tasks.append((book, idx0+2*fi+pside, pside*2+c, os.path.join(path,f)))
with ThreadPoolExecutor(max_workers=6) as ex: list(ex.map(job,tasks))
print('done',len(tasks))
