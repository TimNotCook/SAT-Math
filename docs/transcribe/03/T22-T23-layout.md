# T22-T23-layout · 切片布局 + 入库命令 + 自检记录

## 切片布局（15 题，id 连续不重复）

| 文件 | 册内题号 | id 段 | 大小 |
|---|---|---|---|
| `fragments/T22.json` | T22 #1-#9 | R03-301…R03-309 | 13.0 KB |
| `fragments/T23.json` | T23 #1-#6 | R03-361…R03-366 | 8.4 KB |

两文件均为单文件（单次推送装得下，未切 b2）；号段未碰 R03-001…023 / 061…097 / 121…151 / 181…192 / 241…251。

## 入库命令（入库写者对两文件各跑一次，等价整包）

```bash
python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/03/fragments/T22.json
python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/03/fragments/T23.json
```

## 自检记录（dry-run，2026-11-25）

```
$ python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/03/fragments/T22.json --dry-run
题包: book='03' topic=22 section=2.7.T22 · 共 9 题
将新增 9 题: R03-301, R03-302, R03-303, R03-304, R03-305, R03-306, R03-307, R03-308, R03-309
[dry-run] 未写盘。  → FAIL 0，无非法字段（2.7.T22 未声明 advisory 预期忽略）。

$ python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/03/fragments/T23.json --dry-run
题包: book='03' topic=23 section=2.7.T23 · 共 6 题
将新增 6 题: R03-361, R03-362, R03-363, R03-364, R03-365, R03-366
[dry-run] 未写盘。  → FAIL 0，无非法字段（2.7.T23 未声明 advisory 预期忽略）。
```

字段自检（脚本内联断言）：15 题 unit=2、section 与包一致、origin=pdf、paper 含「专项」、无 `image` 位图字段、id 包内无重复；mcq answer∈choices、value=null；grid R03-301 answer="94"、value=94。

## 台账文件

- `T22-reconcile.md`（#1–#9）、`T23-reconcile.md`（#1–#6），15 块全。
- 重复题备注：T22-4↔旧 U2-15、T23-6↔旧 U2-13 异同已写进各自 reconcile 块，留 Tim 拍板，未合并未跳过。

## 通道说明

VM 无 git 凭证（push/GITHUB_TOKEN/gh/ssh 均不可用），走 MCP push_files docs 通道内联送达；未写 data/*.js，未 force；推后回拉 raw 逐字段比对 + git ls-remote。
