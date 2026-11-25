# T19 题包文件布局与入库说明（R03-121…R03-151，31 题）

## 为什么是三个切片
VM 无 git 凭证（`git push` 报 could not read Username；`GITHUB_TOKEN` 401；`gh` 未登录；Mac 离线），只能经 MCP 通道推送文档类文件；单次调用可承载体量约 20KB，31 题完整题包（约 55KB，含点图坐标）无法一次写入。沿用仓库既有批次切片先例（`docs/transcribe/04/fragments/T24-b1.json`），按 10/10/11 题分三批：

| 文件 | 题号 | id 号段 | 题数 |
|---|---|---|---|
| `docs/transcribe/03/fragments/T19.json` | #1–#10 | R03-121…R03-130 | 10 |
| `docs/transcribe/03/fragments/T19-b2.json` | #11–#20 | R03-131…R03-140 | 10 |
| `docs/transcribe/03/fragments/T19-b3.json` | #21–#31 | R03-141…R03-151 | 11 |

三片 section 均为 `2.7.T19`，id 连续不重复、不越界；与本地权威题包逐字段（no/type/answer/value/level/stem/choices/figSpec）比对，31 题 0 差异。

## 入库命令（入库写者依次跑三次，等价于单包 31 题）

```bash
python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/03/fragments/T19.json
python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/03/fragments/T19-b2.json
python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/03/fragments/T19-b3.json
```

## 自检（dry-run，三片全绿，无 FAIL/非法字段；`2.7.T19` 未声明 advisory 预期忽略）

- `T19.json`：共 10 题，将新增 R03-121…R03-130
- `T19-b2.json`：共 10 题，将新增 R03-131…R03-140
- `T19-b3.json`：共 11 题，将新增 R03-141…R03-151

逐题复算、图表↔spec 对应、易错点记录见 `docs/transcribe/03/T19-reconcile.md`（31 题全量）。
