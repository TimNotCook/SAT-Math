# 题包（fragment）JSON Schema —— 读题代理产出 / 入库写者机械并入

> 两线架构：**读题代理**只读扫描页图（`docs/transcribe/03/pages/pNN.jpg`、
> `docs/transcribe/04/pages/pNN.jpg`），把已验证题包写到
> `docs/transcribe/<book>/fragments/T<NN>.json`，**不碰任何 `data/*.js`**；
> **入库写者**跑 `tools/merge_transcribe_fragment.py --fragment <题包>` 机械并入。
> 字段口径以 [`docs/transcribe-spec.md`](transcribe-spec.md) §2/§5 为准，本文只定义题包 JSON 本身。

## 0. 铁律

1. 题包只放**已逐字核对**的题；脚本不再做人眼核对，格式非法直接拒整包。
2. `ledger` 仅台账（pdfPage/side/recompute/verdict），**不写进任何数据文件**。
3. 新录题一律矢量：题包内**禁止**出现 `image`、`choiceFigures` 字段，禁止引用 `images/`。
4. 脚本只新增：已入库的整包重发 → 零写入；部分撞号 → 报错不混写。

## 1. 顶层结构

```json
{
  "book": "04",
  "topic": 25,
  "section": "4.5.T25",
  "questions": [ { … }, { … } ]
}
```

| 字段 | 类型 | 必填 | 口径 |
|---|---|---|---|
| `book` | string | 是 | `"03"` / `"04"`，两册二选一 |
| `topic` | int | 是 | 正整数，册子内 Topic 号（与 `section` 末段、`topic` 文案一致） |
| `section` | string | 是 | `X.Y.TN` 形态；= 本包每道题的 `section`（Topic 子节 id，不填父组，见 transcribe-spec §6.3） |
| `questions` | array | 是 | 非空；元素见 §2 |

## 2. 题目对象字段表（`questions[]` 元素）

| 字段 | 类型 | 必填 | 取值 / 写法 | 落地去向 |
|---|---|---|---|---|
| `id` | string | 是 | 全局唯一，`R04-061` 形态（字母/数字/`-`/`_`）；包内不得重复；新批次前缀见 transcribe-spec §2.4 | questions.js / text.js / figures.js 主键 |
| `unit` | int | 是 | `1`–`4`；必须等于 `section` 首段（04 册 = 4，03 册 = 2） | questions.js |
| `no` | int | 是 | 正整数，册内顺序号从 1 起 | questions.js |
| `source` | string | 是 | `04 Geometry · Topic 25 #1`（照 transcribe-spec §2.3 SP2 行格式） | questions.js |
| `topic` | string | 是 | `专项练习 · Topic 25 · 第 1 题` | questions.js |
| `section` | string | 是 | Topic 子节 id（`4.5.T25`），不填父组 `4.5` | questions.js |
| `type` | string | 是 | `mcq` / `grid`，无其他值 | questions.js / text.js |
| `answer` | string | 是 | mcq：单字母 `"A"`–`"E"`，且必须在 `choices` 里；grid：答案串（`"3/4"`、`".0625, 1/16"`） | questions.js |
| `value` | number\|null | mcq 必填 `null`；grid 必填 | grid 必须是**有限数字**（整数/浮点，不能是字符串/布尔）；mcq 填 `null` | questions.js |
| `level` | string | 是 | `easy` / `medium` / `hard` | questions.js |
| `origin` | string | 是 | 新录扫描册一律 `pdf`；勿用 `legacy`（l4-merge 拦 legacy+unit4） | questions.js |
| `paper` | string | 是 | `04 Geometry and Trigonometry 专项练习（重录）`；**T 子节题必须含「专项」** | questions.js |
| `hint` | string | 可空 | 一行关键步骤缩写；允许 `""`，建议留 | questions.js |
| `stem` | string | 是 | 逐字题干，多行用 `\n`；与 text.js 双份逐字一致 | questions.js + text.js |
| `choices` | object | mcq 必填 / grid 应为 `{}` | mcq：`{"A":"…","B":"…","C":"…","D":"…"}` 四个非空文字选项；图形选项题（`figure`/`choiceGraphs` 通路）可空；grid：空对象 | text.js |
| `figure` | array | 否 | 图形选项登记列表，如 `["A","B","C","D"]`；普通题 `[]` 或省略 | text.js |
| `figSpec` | object\|null | 否 | 该题矢量图 spec（§3），无图省略/`null` | figures.js → `TD_FIG_SPECS[id]` |
| `choiceGraphs` | object\|null | 否 | 选项图（§4），无省略/`null` | figures.js → `TD_CHOICE_GRAPHS[id]` |
| `ledger` | object | 否 | 台账，**不入库**：`{"pdfPage":"p05","side":"左","recompute":"复算步骤…","verdict":"逐字已核"}` | — |

### 2.1 mcq / grid 硬规则（脚本校验，违反整包拒绝）

- mcq：`answer` ∈ `A–E` 且在 `choices` 内；文字选项须 4 个，除非走 `figure` + `choiceGraphs` 图形通路；`value` 必须为 `null`。
- grid：`value` 为有限数字；`answer` 非空；`choices` 必须为空对象。
- `section` 首段 = `unit`；题内 `section` = 顶层 `section`。
- `paper` 对 T 子节题必须含「专项」。

## 3. `figSpec` 写法（TD_FIG_SPECS[id]）

照 transcribe-spec §5 找同类现有题抄骨架，脚本只做形态校验（对象），不校验内部几何。

```jsonc
// table（表格，结构化重绘，禁止截图）
"figSpec": {
  "type": "table",
  "head": ["Property", "Value"],
  "rows": [["Area", "55"], ["Perimeter", "125"]]
}

// chart（坐标系/折线/散点/柱状/箱线）
"figSpec": {
  "type": "chart",
  "x": {"min": 0, "max": 10, "step": 1, "label": "x"},
  "y": {"min": 0, "max": 100, "step": 10, "label": "Trees"},
  "grid": true, "origin": "O", "w": 430, "h": 400,
  "series": [{"kind": "line", "points": [[0, 0], [10, 100]]}]
}

// shaded 题：series 内必须含 {"kind": "region", "points": [[x, y], …≥3 点]}（§5.5）
```

类型：`chart` / `table` / `parallelLines` / `triangle` / `crossingLines` / `rawSvg`；`circle`/`rect` 数据零使用，新题优先 rawSvg。

## 4. `choiceGraphs` 写法（TD_CHOICE_GRAPHS[id]）

仅"四个选项各是一张小图"时用；键 = 选项字母，值 = 迷你 chart（`x`/`y`/`series`，结构同 §3 chart）。
若 `figure` 登记了某字母，`choiceGraphs` 必须覆盖该字母。

```jsonc
"choiceGraphs": {
  "A": {"x": {"min": -4, "max": 4, "step": 1}, "y": {"min": -4, "max": 4, "step": 1},
        "series": [{"kind": "line", "points": [[-4, 5], [4, -3]]}]},
  "B": { … }, "C": { … }, "D": { … }
}
```

## 5. 合并命令

```bash
# 预演：只校验 + 打印将追加的行数与 id 列表，不写盘
python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/04/fragments/T25.json --dry-run

# 正式并入：写 questions.js / text.js / figures.js → 自动跑 rollup --write → --check 对账
python3 tools/merge_transcribe_fragment.py --fragment docs/transcribe/04/fragments/T25.json

# 关闭自动 rollup（极少用）
python3 tools/merge_transcribe_fragment.py --fragment … --no-rollup
```

自动后续：
1. `python3 tools/rollup_declarations.py --write`（重算声明层 count/childCount/total，新 section 未声明只报告不自动加节点）；
2. `python3 tools/transcribe_reconcile.py --check --ids <本包全部新 id>`（结果打到 stdout，退出码仅参考：未声明 section 在 strict 口径下判 FAIL，由入库写者补 units[] 声明后再绿，不并入脚本退出码）。

> `bump_assets.py` 由 `safe_push.sh` 在推送前自动跑（重算五页 `?v=` 哈希），
> 合并脚本不负责；改动数据后若直接跑 `node --test`，`version-sync` 会因哈希未换变红，
> 这是正常门控，不是脚本缺陷。

## 6. 退出码与错误表

| 情形 | 脚本行为 | 退出码 |
|---|---|---|
| 校验全过 + `--dry-run` | 打印新增 id 列表，不写盘 | 0 |
| 整包 id 全部已存在 | 提示幂等，**零写入** | 0 |
| 部分 id 已存在、部分新增（撞号混合） | 报错，**不做任何写入** | 1 |
| 包内 id 重复 / 字段非法 / 取值域越界 / section 不自洽 | 打印全部 FAIL 项，**不做任何写入** | 1 |
| 题包读取失败（路径/JSON 坏） | 报错 | 1 |
| 落盘前自检发现既有行丢失 | 拒绝落盘 | 1 |
| rollup 非零退出 | 报错（数据已写入，需人工看） | 1 |

写入后纪律：`git diff --stat` 必须是纯新增（questions.js/text.js 仅末行补逗号，figures.js 仅尾加块）；
`node --test test/*.test.js` 全绿；`python3 tools/rollup_declarations.py`（只读）无新问题项。
