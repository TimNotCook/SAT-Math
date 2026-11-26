# 双空 grid-in：JY2-014（讲义 p45 #1）核对单

- 日期：2026-11-26
- 题：2.2 第 1 题，原页两处 `____`（scatter plot 读图 + 最佳拟合线方程）
- 口径：**两空全对才算对**，不给部分分（College Board 双空题即全或无）；`answer` 文本保持「第一空 250，第二空 123.5」不变，题干 / figure / 选项未动。

## 三处配套（缺一处就退化成单空或永远判错）

| 层 | 文件 | 关键点 |
|---|---|---|
| 数据 | `data/jiangyi.js` | `JY2-014` 增 `"values": [250, 123.5]`，保留 `"value": 250` 供单值读取路径 |
| 归一化 | `jiangyi-core.js` `normalize()` | 白名单重建对象，必须显式搬运 `values`；`value` 用 `raw.value` 优先、`answer` 仅在其为纯数字时兜底——旧写法 `Number(answer)` 对中文答案得 `NaN`，该题此前**永远判错** |
| 判分 | `grade-core.js` `dualCorrect` | 按 `,`/`;` 拆段，段数必须等于键数，逐段 `gridEntry`→`parseNum`→1% 容差 |
| 渲染 | `jiangyi-page.js` | `q.values.length > 1` 走双框分支，标签「第一空 / 第二空」，答案串存 `"250, 123.5"` |
| 样式 | `jiangyi.html` | `.jy-grid-multi` 两行网格 + `.jy-grid-label` 右对齐标签 + 按钮占整行 |

## 验收

- `node --test test/*.test.js`：**160 pass / 0 fail**（含双空判分 8 条 + normalize/样式配套守卫 2 条）
- 判分抽样：`250, 123.5` 对；`250` 错；`123.5, 250` 错；`248.5, 123.5` 对；`250, 130` 错
- 线上真实页面（2.2 第 1 题）：两个 textbox，`aria-label` 分别为「第一空」「第二空」；填 250 / 123.5 点确定后 localStorage `tdsat_jiangyi_v1` 记 `{"v":"250, 123.5","correct":true}`

## 事故与教训

1. 首版只改了数据 + 页面 + 判分，漏了 `normalize()` 白名单 → 线上仍是单框、且该题此前一直判错。已补测试钉住。
2. `jiangyi.html` 曾被他人整页替换，双空 CSS 丢失。已补守卫测试（`.jy-grid-multi{` 必须在 html 里）。
3. GitHub Pages CDN `max-age=600`：同一路径在部署后 10 分钟内仍可能命中旧副本，核验时必须看 `age` / `x-cache`，或直接读页面内 `?v=` 与脚本内容。
