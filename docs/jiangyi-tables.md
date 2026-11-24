# 讲义复习 · 表格题清单（1.1–1.5，45 题）

2026-11-25 全量扫描结果：45 题里「表在题干」或「表是选项」的只有 2 题，其余题干的
shown / graph / figure 全部由 `fig` 走矢量重画，没有任何扫描裁图上线。

| 题号 | 小节 | 页码 | 表的形态 | 数据落点 | 状态 |
|---|---|---|---|---|---|
| JY1-003 | 1.1 | p8 #1 | 表在题干（两列 x / g(x)，四行） | `table` 字段：x=2,3,4,5 / g(x)=-4,-2,0,2 | 已结构化，线上渲染 `<table class="jy-table">`，四选项为文字公式 |
| JY1-042 | 1.5 | p32 #3 | 表是选项（A–D 各一张两列 x / y，三行） | `choiceTables`：A 13/27/48、B 17/31/52、C 21/27/52、D 21/35/56（x 均为 3/5/8） | 已结构化，选项内直接渲染真表格 |

两条都不裁原页、不带 TESTDAILY 水印，数值以 `docs/jiangyi-proof/` 的原页对照图逐格核对过
（JY1-042 原页排版为 A 左上、C 右上、B 左下、D 右下，数据顺序按 A/B/C/D 存）。

## 复现命令

```bash
# 1) 扫出所有「表在题干 / 表是选项」的题
python3 - <<'PY'
import re, json, pathlib
s = pathlib.Path('data/jiangyi.js').read_text(encoding='utf-8')
d = json.loads(re.search(r'window\.JY_BANK\s*=\s*(\[.*?\n\]);', s, re.S).group(1))
print('题数', len(d))
for q in d:
    if q.get('table') or q.get('choiceTables'):
        print(q['id'], q['section'], 'p'+str(q['page']), 'table=', bool(q.get('table')), 'choiceTables=', len(q.get('choiceTables') or []))
PY

# 2) 线上确认表格真的是 <table>，不是图片
#    https://timnotcook.github.io/SAT-Math/jiangyi.html?b=JY1&s=1.1&i=3   → 题干下 1 张 .jy-table
#    https://timnotcook.github.io/SAT-Math/jiangyi.html?b=JY1&s=1.5&i=3   → 四个选项各 1 张 .jy-table
```

## 渲染链路备注

`choiceTables` 是数据侧字段，`jiangyi-core.js` 的 normalize 目前不透传它
（core 属编程者），所以 `jiangyi-page.js` 直接按 id 从 `window.JY_BANK` 取原始记录。
等 core 加一行 `choiceTables: Array.isArray(raw.choiceTables) ? raw.choiceTables : null`，
page 里那 6 行兜底可以删掉，渲染结果不变。
