# T18-layout · 切片布局 + 入库命令 + 自检记录

## 切片布局（37 题，R03-061…097 连续）

| 文件 | 册内题号 | id 段 |
|---|---|---|
| `fragments/T18.json` | #1-#13 | R03-061…073 |
| `fragments/T18-b2.json` | #14-#25 | R03-074…085 |
| `fragments/T18-b3.json` | #26-#37 | R03-086…097 |

## 入库命令（入库写者对三片各跑一次，等价整包）

```bash
python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/03/fragments/T18.json
python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/03/fragments/T18-b2.json
python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/03/fragments/T18-b3.json
```

## 自检记录（dry-run）

```
$ python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/03/fragments/T18.json --dry-run
题包: book='03' topic=18 section=2.7.T18 · 共 13 题 / 将新增 R03-061…R03-073；无 FAIL、无非法字段（2.7.T18 未声明 advisory 预期忽略）。
$ ... T18-b2.json --dry-run → 12 题 / R03-074…R03-085，clean。
$ ... T18-b3.json --dry-run → 12 题 / R03-086…R03-097，clean。
```

## 台账文件

- `T18-reconcile.md`（#1–#19）+ `T18-reconcile-b2.md`（#20–#37），37 块全。

## 通道说明

VM 无 git 凭证、Mac 离线，走 MCP push_files docs 通道；未写 data/*.js，未 force。
