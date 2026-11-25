# 04 Geometry 页面图（逐字对账素材）

- 用途：扫描原件 `04 Geometry.pdf` 只在 Mac Desktop，云主机无 PDF；录题代理以本目录页面图代替原件逐字核对（见 `docs/topic-transcribe-04.md` §2/§9）。
- 命名：`p01.jpg` … `p18.jpg`，页码补零两位，与 PDF 物理页一一对应。
- 规格：pymupdf 300dpi 灰度（`csGRAY`），JPEG quality 75–80，单页 <1MB；超限只降 quality，不降 dpi。
- 状态：**待渲染**（本次执行 Mac 离线、云主机无 PDF，图片未生成）。Mac 在线后按 `docs/topic-transcribe-04.md` §9 配方渲染入库。

```python
import fitz
doc = fitz.open("/Users/tim.jizhou.huang/Desktop/04 Geometry.pdf")
for i, page in enumerate(doc, 1):
    pix = page.get_pixmap(dpi=300, colorspace=fitz.csGRAY)
    pix.save(f"docs/transcribe/04/pages/p{i:02d}.jpg", jpg_quality=78)
```

| 文件 | PDF 页 | 书页 | 状态 |
|---|---|---|---|
| p01.jpg | p01 | 封面 | 待渲染 |
| p02.jpg | p02 | 142–143 | 待渲染 |
| p03.jpg | p03 | 144–145 | 待渲染 |
| p04.jpg | p04 | 146–147 | 待渲染 |
| p05.jpg | p05 | 148–149 | 待渲染 |
| p06.jpg | p06 | 150–151 | 待渲染 |
| p07.jpg | p07 | 152–153 | 待渲染 |
| p08.jpg | p08 | 154–155 | 待渲染 |
| p09.jpg | p09 | 156–157 | 待渲染 |
| p10.jpg | p10 | 158–159 | 待渲染 |
| p11.jpg | p11 | 160–161 | 待渲染 |
| p12.jpg | p12 | 162–163 | 待渲染 |
| p13.jpg | p13 | 164–165 | 待渲染 |
| p14.jpg | p14 | 166–167 | 待渲染 |
| p15.jpg | p15 | 168–169 | 待渲染 |
| p16.jpg | p16 | 170–171 | 待渲染 |
| p17.jpg | p17 | 172–173 | 待渲染 |
| p18.jpg | p18 | 174 | 待渲染 |
