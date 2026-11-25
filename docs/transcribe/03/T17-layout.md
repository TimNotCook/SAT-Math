# T17-layout · 切片布局 + 入库命令 + 自检记录

## 切片布局（23 题，R03-001…023 连续）

| 文件 | 册内题号 | id 段 |
|---|---|---|
| `fragments/T17.json` | #1-#12 | R03-001…012 |
| `fragments/T17-b2.json` | #13-#23 | R03-013…023 |

## 入库命令（入库写者对两片各跑一次，等价整包）

```bash
python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/03/fragments/T17.json
python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/03/fragments/T17-b2.json
```

## 自检记录（dry-run）

```
$ python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/03/fragments/T17.json --dry-run
题包: book='03' topic=17 section=2.7.T17 · 共 12 题 / 将新增 R03-001…R03-012；无 FAIL、无非法字段（2.7.T17 未声明 advisory 预期忽略）。
$ ... T17-b2.json --dry-run → 11 题 / R03-013…R03-023，clean。
```

## 台账文件

- `T17-reconcile.md`（#1–#12）+ `T17-reconcile-b2.md`（#13–#23），23 块全。

## 通道说明

VM 无 git 凭证、Mac 离线，走 MCP push_files docs 通道；未写 data/*.js，未 force。
