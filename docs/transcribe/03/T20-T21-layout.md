# T20–T21 题包文件布局与入库说明（R03-181…R03-192、R03-241…R03-251，共 23 题）

## 切片布局

两题包均在单次推送上限（约 20KB）内，**未切片**：

| 文件 | 题号 | id 号段 | 题数 | 字节 |
|---|---|---|---|---|
| `docs/transcribe/03/fragments/T20.json` | #1–#12 | R03-181…R03-192 | 12 | 14,036 |
| `docs/transcribe/03/fragments/T21.json` | #1–#11 | R03-241…R03-251 | 11 | 11,401 |

两包 section 分别为 `2.7.T20` / `2.7.T21`，unit=2，id 连续不重复、不越界；未写 `data/questions.js` / `data/text.js` / `data/figures.js`（入库由仓库 Actions 自动完成）。

## 入库命令（入库写者依次跑）

```bash
python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/03/fragments/T20.json
python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/03/fragments/T21.json
```

## 分段 dry-run 自检记录（均 FAIL 0、无非法字段；section 未声明 advisory 预期忽略）

| 批次 | 文件 | 题数 | dry-run 输出（节选） |
|---|---|---|---|
| T20 b1 | （临时切片，#1–#6） | 6 | 将新增 6 题: R03-181, R03-182, R03-183, R03-184, R03-185, R03-186 |
| T20 b2 | （临时切片，#7–#12） | 6 | 将新增 6 题: R03-187, R03-188, R03-189, R03-190, R03-191, R03-192 |
| T20 全量 | `fragments/T20.json` | 12 | 将新增 12 题: R03-181 … R03-192 |
| T21 b1 | （临时切片，#1–#6） | 6 | 将新增 6 题: R03-241, R03-242, R03-243, R03-244, R03-245, R03-246 |
| T21 b2 | （临时切片，#7–#11） | 5 | 将新增 5 题: R03-247, R03-248, R03-249, R03-250, R03-251 |
| T21 全量 | `fragments/T21.json` | 11 | 将新增 11 题: R03-241 … R03-251 |

## 结构自检

- 两包 `python3 -m json.tool` 解析通过；题数=12/11，`no` 连续 1..N，id 号段与任务区间一致（R03-181…192 / R03-241…251）。
- 每题 `section` 与顶层一致、`unit=2`、`origin="pdf"`、`paper` 含「专项」；mcq 四文字选项齐全且 answer 在 choices 内，grid `choices={}`、`value` 为有限数字。
- 位图禁令：两包无 `image` / `choiceFigures` 字段；8 张表全部 `figSpec.table` 结构化重绘，散点/指数曲线 `figSpec.chart` 矢量重画（`kind:points/line/exp`）。
- 逐题复算、选项逐项、表格图表↔spec 对应见 `T20-reconcile.md`（12 题）与 `T21-reconcile.md`（11 题）。

## 终检记录（定稿后全量复跑）

- 全量 dry-run：T20「将新增 12 题: R03-181 … R03-192」、T21「将新增 11 题: R03-241 … R03-251」，均 FAIL 0、无非法字段。
- 定稿后自查回写 1 条：R03-190（#10）拟合直线端点与复算截距 54.57 不自洽，端点改为 [[0,54.57],[40,24.3]]，重跑 dry-run 通过。
- JSON `python3 -m json.tool` 解析通过；两文件紧凑单行格式对齐 T18/T19 先例。
