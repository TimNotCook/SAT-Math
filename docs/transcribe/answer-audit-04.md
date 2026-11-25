# 04 Geometry 题包答案独立复核报告（answer-audit-04）

- 仓库：`TimNotCook/SAT-Math`，分支 `main`，题包目录 `docs/transcribe/04/fragments/`
- 复核日期：2026-11-25；复核方式：先屏蔽答案盲算 → 逐题自算 → 解封对表 → 初判 MISMATCH 逐条重审（含原图放大核对）
- 原则：不改题包、不改 `data/*.js`；MISMATCH 一条不瞒，也不为凑全对而迁就题包

## 1. 结论汇总

- 覆盖题数：**135/135**（grid 82 / mcq 53），无遗漏
- MATCH：**131**
- MISMATCH：**3**（R04-072、R04-077、R04-103）
- UNVERIFIABLE：**1**（R04-063）

### 1.1 分文件覆盖

| 题包 | 题数 | grid | mcq | MATCH | MISMATCH | UNVERIFIABLE |
|---|---|---|---|---|---|---|
| T24-b1.json | 8 | 6 | 2 | 8 | 0 | 0 |
| T24-b2.json | 17 | 11 | 6 | 17 | 0 | 0 |
| T24-b3.json | 17 | 11 | 6 | 17 | 0 | 0 |
| T25a.json | 19 | 13 | 6 | 16 | 2 | 1 |
| T26a.json | 19 | 10 | 9 | 18 | 1 | 0 |
| T26b.json | 18 | 12 | 6 | 18 | 0 | 0 |
| T27a.json | 19 | 8 | 11 | 19 | 0 | 0 |
| T27b-b1.json | 9 | 4 | 5 | 9 | 0 | 0 |
| T27b-b2.json | 9 | 7 | 2 | 9 | 0 | 0 |

## 2. 方法说明（含先屏蔽答案的证据）

1. **枚举**：OAuth `get_file_contents` 列目录，得 9 个题包（T24-b1/b2/b3、T25a、T26a、T26b、T27a、T27b-b1/b2；无 T25b.json），raw 全量下载。
2. **屏蔽答案**：`make_blind.py` 从每题剔除 `answer / value / hint / ledger / solution / explanation / verdict` 字段，只保留 stem / choices / figSpec，输出 `blind/*-blind.md` 与合并件 `blind/ALL-blind.md`；自算期间只读本盲算文件，**未看 answer/value**。生成命令：

```bash
python3 make_blind.py   # RAW=audit04/raw, BLIND=audit04/blind; STRIP={answer,value,hint,ledger,solution,explanation,verdict}
```

3. **逐题自算**：grid 题写算式+精确式+近似值；mcq 题先算结果再选字母；依赖图的题放大 `docs/transcribe/04/pages/p01–p18.jpg` 核对条件。
4. **解封对表**：自算完成后才读 `answer/value`，归一化（去 Unicode 负号、逗号答案串取首 token、分数/数值双解析）后比对，初判 MATCH 127 / MISMATCH 8。
5. **重审**：8 条初判 MISMATCH 全部回到题干+原图重新推导，4 条改判 MATCH、1 条改判 UNVERIFIABLE、3 条维持 MISMATCH。
6. **第二方法交叉验证（12 题抽样，全部 PASS）**：R04-001 二项展开、R04-003 分配律、R04-005 鞋带公式、R04-008 ½ab、R04-013 体积比分解、R04-016 比例链、R04-022 反解、R04-036 斜高/勾股、R04-066 相似比小数、R04-067 补角链、R04-103 周长回代、R04-125 sin/cos 互余。

## 3. 重点题独立推导（任务点名）

### R04-067（T25a #7，题包 83，曾出现 97）——MATCH

题干：AC=CD，∠EBC=45°，∠ACD=104°，求 x。

独立推导：
1. △ACD 等腰（AC=CD），顶角 ∠ACD=104° → 底角 ∠CAD=∠CDA=(180−104)/2=38°。
2. △BDE 中 ∠D=38°（=∠CDA），∠EBD=∠EBC=45° → ∠BED=180−38−45=97°。
3. x 与 ∠BED 互补（直线上邻补角）→ x=180−97=**83**。

题包 83 ✓ MATCH。97 是 ∠BED 本身（中间量），不是 x，旧误值 97 即在此步偷换。

### R04-070（T25a #10，题包 C，曾由 B 改 C 且依据外部站点）——MATCH

题干：△ABC 与 △DEF，∠B=∠E=27°，∠C=∠F=41°；哪项足以判定全等？

独立推导（不引用任何外部答案）：
1. 两组角分别相等 → 第三角 ∠A=∠D=112° 自动相等，只剩"边"能定全等。
2. A：只给 ∠A，仍是 AAA，形状定大小不定 → 不够。
3. B：只给 AB（非夹边，是 ∠B 的邻边/∠A 的对边）→ 边边角，不够。
4. C：给 BC 与 EF——BC 是 ∠B、∠C 的夹边，EF 是 ∠E、∠F 的夹边 → **ASA**，足以全等 ✓。
5. D：错误，AAA 不全等。

题包 C ✓ MATCH（本次为纯几何推导，未用外部站点）。

## 4. MISMATCH 逐条推导与裁决

### M1 — R04-072（T25a #12，mcq）：自算 D / 题包 B，建议改 D

题干：△LMN 与 △RST，∠L=∠R=60°，LN=10，RT=30；哪项足以证明相似？

逐项：
- A：MN=7、ST=7 → 1≠3，比例不等，排除。
- B：MN=7、ST=21 → LN/RT=10/30=1/3，MN/ST=7/21=1/3。但 60° 不是这两组边的夹角（LN、RT 是 ∠L、∠R 的邻边；MN、ST 是 60° 的对边），构成 **SSA**；且对边 7 < 邻边·sin60=10·(√3/2)≈8.66，存在两解，**不足以**判相似。
- C：∠M=70°、∠S=60° → LMN={60,70,50}，RST={60,60,60}，不相似。
- D：∠M=70°、∠T=50° → LMN={60,70,50}，RST={R=60, T=50, S=70} → 两角对应相等 **AA** ✓ 充分。

**裁决：题包 B 有误，建议改为 D。**

### M2 — R04-077（T25a #17，grid）：自算 121 / 题包 59，建议 121（弧位待核）

题干：r∥s，t 截两线；a=6k+31，b=k/5+56，求 c。图：a 在 r 右侧、t 上方；b 在 s 左侧、t 上方；c 在 s 左侧、t 下方。

推导：
1. a、b 是平行线间的同旁内角 → a+b=180：6k+31+k/5+56=180 → (31/5)k=93 → k=15 → b=59，a=121。
2. c 与 b 在 s 的同侧、t 的两侧 → 邻补角：c=180−b=**121**。
3. 题包 59 = b，仅当 c 是 b 的对顶角（c 在 s 右侧、t 下方）时成立；扫描图中 c 标注在 s 左侧。

**裁决：自算 121；建议改 121。若人工核对 p07 原图角弧确认 c 在对顶位置，则题包 59 成立，本报告随附该保留条件。**（§8.1 已用高倍图定案：c 为邻补角，c=121。）

### M3 — R04-103（T26a #3，mcq）：自算 B(47√2) / 题包 C(94)，建议改 B

题干：等腰直角三角形周长 94+94√2 英寸，求一条直角边（leg）。

推导：设 leg=L，斜边=L√2，周长=2L+L√2=L(2+√2)=94(1+√2)。

```
L = 94(1+√2)/(2+√2) = 94·[(1+√2)(2−√2)]/2 = 94·√2/2 = 47√2  → 选项 B
```

回代：L=47√2 → P=2·47√2+47√2·√2=94√2+94 ✓。题包 C=94=L√2 是**斜边**，题干问 leg，答非所问。

**裁决：题包 C 有误，建议改为 B。**

## 5. UNVERIFIABLE

### U1 — R04-063（T25a #3，grid）：题包 49，自算 21 已作废

题干：Q,R,S,T 在 PV 上；RU∩SX=W；∠SQX=48°，∠SXQ=86°，∠SWU=85°，∠VTU=162°，求 ∠TUR。

说明：自算初版 21 走 △SRW 链，误取 ∠RSW=46°（题干未给），链不成立。题包 49 的链条（△SWU：∠WSU=46°=∠QSX、∠SWU=85° → ∠SUW=49°）需要图中 SU 与 SQ 方向对齐/平行这一**题干未写明**的关系；仅凭题干数值不能唯一推出 49。

**裁决：不判题包错（与官方题源一致），标记待人工对照 p06 原图核对角弧与隐含平行关系后定案。**（§8.2 高倍图复核：图上无角弧/平行标记，维持 UNVERIFIABLE。）

## 6. 全量对表（135 题）

| 题 id | 类型 | 自算 | 题包(answer/value) | 结论 | 来源 | 备注 |
|---|---|---|---|---|---|---|
| R04-001 | grid | 27556 | 27556 | MATCH | T24-b1.json |  |
| R04-002 | mcq | A | A | MATCH | T24-b1.json |  |
| R04-003 | grid | 518.4 | 518.4 | MATCH | T24-b1.json |  |
| R04-004 | grid | 29.68 | 29.68 | MATCH | T24-b1.json |  |
| R04-005 | grid | 24 | 24 | MATCH | T24-b1.json |  |
| R04-006 | grid | 6 | 6 | MATCH | T24-b1.json |  |
| R04-007 | grid | 1849 | 1849 | MATCH | T24-b1.json |  |
| R04-008 | mcq | B | B | MATCH | T24-b1.json |  |
| R04-009 | grid | 66 | 66 | MATCH | T24-b2.json |  |
| R04-010 | grid | 74088 | 74088 | MATCH | T24-b2.json |  |
| R04-011 | grid | 36504 | 36504 | MATCH | T24-b2.json |  |
| R04-012 | grid | 52 | 52 | MATCH | T24-b2.json |  |
| R04-013 | mcq | C | C | MATCH | T24-b2.json |  |
| R04-014 | mcq | D | D | MATCH | T24-b2.json |  |
| R04-015 | grid | 2216 | 2216 | MATCH | T24-b2.json |  |
| R04-016 | grid | 1512 | 1512 | MATCH | T24-b2.json |  |
| R04-017 | mcq | B | A | MATCH | T24-b2.json | 自算 B 错；(1/3)πr²·9=(1/3)π → 3r²=1 → r=1/3 → A，题包正确 |
| R04-018 | grid | 8 | 8 | MATCH | T24-b2.json |  |
| R04-019 | grid | 44 | 44 | MATCH | T24-b2.json |  |
| R04-020 | grid | 148 | 148 | MATCH | T24-b2.json |  |
| R04-021 | grid | 16.875 | 16.875 | MATCH | T24-b2.json |  |
| R04-022 | grid | 27 | 27 | MATCH | T24-b2.json |  |
| R04-023 | mcq | C | C | MATCH | T24-b2.json |  |
| R04-024 | mcq | D | D | MATCH | T24-b2.json |  |
| R04-025 | mcq | D | D | MATCH | T24-b2.json |  |
| R04-026 | grid | 3 | 3 | MATCH | T24-b3.json |  |
| R04-027 | grid | 26 | 26 | MATCH | T24-b3.json |  |
| R04-028 | mcq | D | D | MATCH | T24-b3.json |  |
| R04-029 | grid | 204 | 204 | MATCH | T24-b3.json |  |
| R04-030 | mcq | A | A | MATCH | T24-b3.json |  |
| R04-031 | mcq | D | D | MATCH | T24-b3.json |  |
| R04-032 | grid | 62.5 | 62.5 | MATCH | T24-b3.json |  |
| R04-033 | grid | 2025 | 2025 | MATCH | T24-b3.json |  |
| R04-034 | mcq | A | A | MATCH | T24-b3.json |  |
| R04-035 | mcq | B | B | MATCH | T24-b3.json |  |
| R04-036 | grid | 16 | 16 | MATCH | T24-b3.json |  |
| R04-037 | grid | 100 | 100 | MATCH | T24-b3.json |  |
| R04-038 | grid | 527.7 | 527.69 | MATCH | T24-b3.json |  |
| R04-039 | mcq | A | A | MATCH | T24-b3.json |  |
| R04-040 | grid | 23 | 23 | MATCH | T24-b3.json |  |
| R04-041 | grid | 8 | 8 | MATCH | T24-b3.json |  |
| R04-042 | grid | 132 | 132 | MATCH | T24-b3.json |  |
| R04-061 | grid | 101 | 101/2, 50.5 | MATCH | T25a.json | 自算 101 错；b=122→补角58，三角(43,58,79)，79+2w=180 → w=50.5，题包正确 |
| R04-062 | grid | 27.1 | 280/9, 31.11 | MATCH | T25a.json | 自算 27.1 错；△LRM~△PRQ，MR/RP=LR/RQ → RQ=190/9，LQ=10+190/9=280/9，题包正确 |
| R04-063 | grid | 21 | 49 | UNVERIFIABLE | T25a.json | 自算 21 链（误用∠RSW=46）作废；题包 49 依赖图中未明示的 SU/SQ 对齐关系，纯题干不能唯一推出，待原图核弧位 |
| R04-064 | grid | 83 | 83 | MATCH | T25a.json |  |
| R04-065 | grid | 30 | 30 | MATCH | T25a.json |  |
| R04-066 | grid | 54 | 54 | MATCH | T25a.json |  |
| R04-067 | grid | 83 | 83 | MATCH | T25a.json |  |
| R04-068 | grid | 57 | 64 | MATCH | T25a.json | 自算 57 错；114°=等腰△RTU顶角→底角33，外角 x=31+33=64，题包正确 |
| R04-069 | grid | 146 | 146 | MATCH | T25a.json |  |
| R04-070 | mcq | C | C | MATCH | T25a.json |  |
| R04-071 | mcq | D | D | MATCH | T25a.json |  |
| R04-072 | mcq | D | B | MISMATCH | T25a.json | 自算 D / 题包 B；B 为 SSA 不充分，D 为 AA 充分，建议改 D |
| R04-073 | mcq | B | B | MATCH | T25a.json |  |
| R04-074 | grid | 20 | 20 | MATCH | T25a.json |  |
| R04-075 | grid | 120 | 120 | MATCH | T25a.json |  |
| R04-076 | mcq | D | D | MATCH | T25a.json |  |
| R04-077 | grid | 121 | 59 | MISMATCH | T25a.json | 自算 121 / 题包 59；c 为 b 同侧补角=121（若 c 为对顶角则 59），弧位待核，建议 121 |
| R04-078 | grid | 62 | 62 | MATCH | T25a.json |  |
| R04-079 | mcq | D | D | MATCH | T25a.json |  |
| R04-101 | grid | 104 | 104 | MATCH | T26a.json |  |
| R04-102 | mcq | C | C | MATCH | T26a.json |  |
| R04-103 | mcq | B | C | MISMATCH | T26a.json | 自算 B(47√2) / 题包 C(94)；C 是斜边，题干问 leg，建议改 B |
| R04-104 | mcq | C | C | MATCH | T26a.json |  |
| R04-105 | mcq | D | D | MATCH | T26a.json |  |
| R04-106 | grid | 113 | 113 | MATCH | T26a.json |  |
| R04-107 | mcq | D | D | MATCH | T26a.json |  |
| R04-108 | mcq | C | C | MATCH | T26a.json |  |
| R04-109 | grid | 12 | 12 | MATCH | T26a.json |  |
| R04-110 | mcq | A | A | MATCH | T26a.json |  |
| R04-111 | grid | 66 | 66 | MATCH | T26a.json |  |
| R04-112 | grid | 12 | 12 | MATCH | T26a.json |  |
| R04-113 | mcq | B | B | MATCH | T26a.json |  |
| R04-114 | mcq | C | C | MATCH | T26a.json |  |
| R04-115 | grid | 46 | 46 | MATCH | T26a.json |  |
| R04-116 | grid | 0 | 0 | MATCH | T26a.json |  |
| R04-117 | grid | 24 | 24 | MATCH | T26a.json |  |
| R04-118 | grid | 16/23 | 16/23 | MATCH | T26a.json |  |
| R04-119 | grid | 0.5 | 1/2 | MATCH | T26a.json |  |
| R04-120 | grid | 21/29 | 21/29 | MATCH | T26b.json |  |
| R04-121 | mcq | C | C | MATCH | T26b.json |  |
| R04-122 | grid | 6 | 6 | MATCH | T26b.json |  |
| R04-123 | mcq | D | D | MATCH | T26b.json |  |
| R04-124 | grid | 7/50 | 7/50 | MATCH | T26b.json |  |
| R04-125 | grid | 15/17 | 15/17 | MATCH | T26b.json |  |
| R04-126 | grid | 177 | 177 | MATCH | T26b.json |  |
| R04-127 | grid | 20/29 | 20/29 | MATCH | T26b.json |  |
| R04-128 | grid | 346.8 | 346.8 | MATCH | T26b.json |  |
| R04-129 | grid | 12 | 12 | MATCH | T26b.json |  |
| R04-130 | grid | 392 | 392 | MATCH | T26b.json |  |
| R04-131 | grid | 103.2 | 103.2 | MATCH | T26b.json |  |
| R04-132 | grid | 250/3 | 250/3, 83.333, 83.33 | MATCH | T26b.json |  |
| R04-133 | mcq | C | C | MATCH | T26b.json |  |
| R04-134 | mcq | C | C | MATCH | T26b.json |  |
| R04-135 | mcq | D | D | MATCH | T26b.json |  |
| R04-136 | grid | -1/2 | −1/2 | MATCH | T26b.json |  |
| R04-137 | mcq | B | B | MATCH | T26b.json |  |
| R04-141 | grid | 10 | 10 | MATCH | T27a.json |  |
| R04-142 | grid | 11 | 11 | MATCH | T27a.json |  |
| R04-143 | grid | 5 | 5 | MATCH | T27a.json |  |
| R04-144 | mcq | A | A | MATCH | T27a.json |  |
| R04-145 | grid | 8 | 8 | MATCH | T27a.json |  |
| R04-146 | grid | 16 | 16 | MATCH | T27a.json |  |
| R04-147 | mcq | B | B | MATCH | T27a.json |  |
| R04-148 | grid | -52 | −52 | MATCH | T27a.json |  |
| R04-149 | grid | -73 | −73 | MATCH | T27a.json |  |
| R04-150 | mcq | A | A | MATCH | T27a.json |  |
| R04-151 | mcq | C | C | MATCH | T27a.json |  |
| R04-152 | mcq | B | B | MATCH | T27a.json |  |
| R04-153 | grid | 3 | 3 | MATCH | T27a.json |  |
| R04-154 | mcq | B | B | MATCH | T27a.json |  |
| R04-155 | mcq | C | C | MATCH | T27a.json |  |
| R04-156 | mcq | C | C | MATCH | T27a.json |  |
| R04-157 | mcq | A | A | MATCH | T27a.json |  |
| R04-158 | mcq | D | D | MATCH | T27a.json |  |
| R04-159 | mcq | D | D | MATCH | T27a.json |  |
| R04-160 | grid | 6 | 6 | MATCH | T27b-b1.json |  |
| R04-161 | mcq | B | B | MATCH | T27b-b1.json |  |
| R04-162 | mcq | B | B | MATCH | T27b-b1.json |  |
| R04-163 | mcq | D | D | MATCH | T27b-b1.json |  |
| R04-164 | mcq | D | D | MATCH | T27b-b1.json |  |
| R04-165 | grid | 28 | 28 | MATCH | T27b-b1.json |  |
| R04-166 | grid | 100 | 100 | MATCH | T27b-b1.json |  |
| R04-167 | grid | 46 | 46 | MATCH | T27b-b1.json |  |
| R04-168 | mcq | B | B | MATCH | T27b-b1.json |  |
| R04-169 | grid | 24 | 24 | MATCH | T27b-b2.json |  |
| R04-170 | mcq | B | B | MATCH | T27b-b2.json |  |
| R04-171 | grid | 72 | 72 | MATCH | T27b-b2.json |  |
| R04-172 | grid | 35 | 35 | MATCH | T27b-b2.json |  |
| R04-173 | grid | 1/6 | 1/6 | MATCH | T27b-b2.json |  |
| R04-174 | grid | 162 | 162 | MATCH | T27b-b2.json |  |
| R04-175 | grid | 72/5 | 72/5 | MATCH | T27b-b2.json |  |
| R04-176 | grid | 1768 | 1768 | MATCH | T27b-b2.json |  |
| R04-177 | mcq | A | A | MATCH | T27b-b2.json |  |

## 7. 重审改判记录（初判 MISMATCH 8 条 → 终裁）

| 题 id | 初判 | 终裁 | 原因 |
|---|---|---|---|
| R04-017 | 自算B/题包A | MATCH | 自算漏除以 3：r²=1/9，题包 A=1/3 正确 |
| R04-061 | 自算101/题包50.5 | MATCH | w 为对顶角对，79+2w=180，题包正确 |
| R04-062 | 自算27.1/题包280/9 | MATCH | 相似对应边搞反，QR=190/9，题包正确 |
| R04-063 | 自算21/题包49 | UNVERIFIABLE | 自算链作废，题包依赖图中未明示关系 |
| R04-068 | 自算57/题包64 | MATCH | 114°为等腰顶角（非∠RTS），题包正确 |
| R04-072 | 自算D/题包B | MISMATCH 维持 | B=SSA，D=AA，建议 D |
| R04-077 | 自算121/题包59 | MISMATCH 维持（§8.1 定案 121） | c=180−b=121，高倍图确认邻补角 |
| R04-103 | 自算B/题包C | MISMATCH 维持 | C=斜边，leg=47√2，建议 B |

## 8. 高倍图补裁（2026-11-25，p06/p07 原页 3× 放大定案）

### 8.1 R04-077（T25a #17，grid）→ 终裁 **121**，已入补丁

- 裁剪位置：`docs/transcribe/04/pages/p07.jpg` 书页 153 右栏 #17 图形（x 0.70–0.98、y 0.46–0.72），3× LANCZOS 放大。
- 图上看清：r、s 两条竖平行线，t 自左上向右下斜穿；`a°` 在 r 右侧、t 上方（r、s 之间）；`b°` 在 s 左侧、t 上方（r、s 之间）；`c°` 在 s 左侧、t 下方。b、c 在 s 的同一侧、t 的两侧，是**邻补角**；对顶角应在 s 右侧、t 下方，图中不是。
- 推导：a、b 为同旁内角 → a+b=180：6k+31+k/5+56=180 → (31/5)k=93 → k=15 → b=59；c=180−b=**121**（整数，符合 grid）。
- 裁决：题包 59 错误，改 121；`answer-patches.json` 已追加 `{"id":"R04-077","answer":"121","value":121}`。

### 8.2 R04-063（T25a #3，grid）→ 维持 **UNVERIFIABLE**，不打补丁

- 裁剪位置：`docs/transcribe/04/pages/p06.jpg` 书页 150 中栏 #3 图形（x 0.26–0.52、y 0.16–0.42），3× LANCZOS 放大。
- 图上看清：Q→X、R→U、S→X、S→U、T→U，W=RU∩SX；**全图无任何角弧、无平行/等角/刻度标记**，SU 方向无任何约束。
- 分析：△SQX 仅给出 ∠QSX=46°；△SWU 只知 ∠SWU=85°，∠WSU 题干未给（SU 不沿 SQ，∠WSU≠∠QSX），故 ∠SUW=95°−θ 随 θ 自由变化，∠TUR 随之不唯一；题包 49 相当于默认 θ=46°，图上无支撑。
- 裁决：**图形缺标注，无法唯一判定**；维持 UNVERIFIABLE，不改题包、不打补丁。

## 9. T25b 批次复核（R04-080 … R04-097，18 题，2026-11-25 追加）

范围：`docs/transcribe/04/fragments/T25b.json`，册内 #20–#37（grid 14 / mcq 4）。方法同前：盲版抽取（屏蔽 `answer`/`value`/台账列）→ 逐题自算 → 解封对表；图依赖题用 `docs/transcribe/04/pages/p08.jpg–p10.jpg` 原页 3× 放大核对。

**结论：MATCH 18 / MISMATCH 0 / UNVERIFIABLE 0；无需新增补丁，`answer-patches.json` 维持原 3 条（R04-072→D、R04-103→B、R04-077→121）。**

### 9.1 对表（18 题全量）

| 题 id | 册# | 类型 | 自算 | 题包(value) | 结论 | 要点 |
|---|---|---|---|---|---|---|
| R04-080 | 20 | grid | 464 | 464 | MATCH | 筝形对角线，p+w=24+440 |
| R04-081 | 21 | grid | 28/3 | 9.3333 (28/3) | MATCH | 相似比1/3，DB=14−14/3 |
| R04-082 | 22 | grid | 10/3 | 3.3333 (10/3) | MATCH | 合法值之一；answer列另列15/4、25/6 |
| R04-083 | 23 | grid | 30 | 30 | MATCH | 问斜边CE=√(24²+18²) |
| R04-084 | 24 | grid | 189 | 189 | MATCH | 相似1/3，½·21·18 |
| R04-085 | 25 | grid | 44/3 | 14.6667 (44/3) | MATCH | ST=22，KT=22·2/3 |
| R04-086 | 26 | grid | 122 | 122 | MATCH | 29+90+k/2=180 |
| R04-087 | 27 | grid | 12/5 | 2.4 (12/5) | MATCH | 3-4-5斜高=12/5 |
| R04-088 | 28 | grid | 9/2 | 4.5 (9/2) | MATCH | 斜高定理BD²=AD·DC |
| R04-089 | 29 | grid | 3 | 3 | MATCH | BD=11，DC=121/(121/3) |
| R04-090 | 30 | mcq | D | D | MATCH | △ABC≅△CDA（SSS） |
| R04-091 | 31 | grid | 125 | 125 | MATCH | ∠T=125，LK∥RT |
| R04-092 | 32 | grid | 55/57 | 0.96491 (55/57) | MATCH | 内角=(57−2)/57 |
| R04-093 | 33 | grid | 1760 | 1760 | MATCH | α+3(180−α)=1760−14x |
| R04-094 | 34 | mcq | A | A | MATCH | −14x+1540 不可由四角和构成 |
| R04-095 | 35 | mcq | C | C | MATCH | ∠N=∠R=90−t，与k无关 |
| R04-096 | 36 | grid | 47 | 47 | MATCH | 360−139−174 |
| R04-097 | 37 | mcq | D | D | MATCH | D为常数，不充分 |

### 9.2 逐题推导（图依赖与易混题）

- **R04-080 (#20, grid) = 464**：筝形 KL=LM=5、KN=MN=21，对角线交于 G，GK=GM=1。Rt△KGL：LG²=KL²−GK²=25−1=24；Rt△KGN：GN²=KN²−GK²=441−1=440；LN=LG+GN=√24+√440，故 p=24、w=440，p+w=**464** ✓
- **R04-081 (#21, grid) = 28/3**：△ABC 直角，DE∥BC，DE/BC=24/72=1/3；½·AB·72=504 → AB=14；AD=AB/3=14/3，DB=14−14/3=**28/3**（9.333）✓
- **R04-082 (#22, grid) = 10/3（合法值之一）**：p08 图：AC=5+7=12，高 y，面积=6y∈[48,60] → y∈{8,9,10}（整数）；相似 x/5=y/12 → x=5y/12：y=8→**10/3**、y=9→15/4、y=10→25/6。题干"one possible value"，题包 value=10/3 合法 ✓（answer 列另两个值同为合法，非冲突）
- **R04-083 (#23, grid) = 30**：p08 图：BD∥AE，∠A=90°，CB=8、BD=6、AE=18。△CBD~△CAE：CB/CA=BD/AE=1/3 → CA=24；问的是斜边 CE=√(24²+18²)=√900=**30**（不是 CA）✓
- **R04-084 (#24, grid) = 189**：p08 图：Rt△ABC（∠C=90°），BC=√(AB²−AC²)=√(85−49)=6；△ABC~△ADE，AC/AE=7/(7+14)=1/3 → DE=18；面积 ADE=½·AE·DE=½·21·18=**189** ✓
- **R04-085 (#25, grid) = 44/3**：∠T=90，½·RT·ST=792 → ST=22；LK∥RT，LK/RT=1/3 → SK=ST/3=22/3；KT=ST−SK=**44/3**（14.667）✓
- **R04-086 (#26, grid) = 122**：29+90+(k/2)=180 → k/2=61 → k=**122** ✓
- **R04-087 (#27, grid) = 12/5**：p09 图：MN=3、NP=4、MP=5（3-4-5），NQ⊥MP；斜高 NQ=2·面积/MP=2·6/5=**12/5**（2.4）✓
- **R04-088 (#28, grid) = 9/2**：p09 图：BD 为斜边高，BD²=AD·DC → 36=8·DC → DC=**9/2**（4.5）✓
- **R04-089 (#29, grid) = 3**：BD²=AB²−AD²=(121·130−121²)/9=1089/9=121 → BD=11；DC=BD²/AD=121/(121/3)=**3** ✓
- **R04-090 (#30, mcq) = D**：正方形对角线 AC=13，边长=13/√2；A(BC=26)、B(CD=13)、C(AB≅AC) 均错；D：△ABC 与 △CDA 两直角边对应相等（SSS）✓
- **R04-091 (#31, grid) = 125**：39+x+(8x−3)=180 → 9x=144 → x=16，∠T=125；LK∥RT，∠SKL 与 ∠T 对应 → **125** ✓
- **R04-092 (#32, grid) = 55/57**：单内角=(57−2)·180/57=(180p)° → p=**55/57**（0.96491）✓
- **R04-093 (#33, grid) = 1760**：锐角 α=7x−610，钝角=180−α；α+3(180−α)=540−2α=540−14x+1220=**1760**−14x → w=1760 ✓
- **R04-094 (#34, mcq) = A**：四角和仅四种：4α=28x−1000；3α+obt=14x−320（B✓）；2α+2obt=360（D✓）；α+3obt=1720−28x（C✓）；−14x+1540 不可得 → **A** ✓
- **R04-095 (#35, mcq) = C**：PQR 直角在 P，∠Q=t、∠R=90−t；LMN 直角在 L，顶点对应 P↔L、Q↔M、R↔N，∠N=∠R=**(90−t)°**，与 k 无关 ✓
- **R04-096 (#36, grid) = 47**：凸五边形 AB∥DE，过 C 作平行线分 ∠C；∠C=360−139−174=**47** ✓
- **R04-097 (#37, mcq) = D**：x+y=147；A（x+2y）、B（2x+y）、C（−2x+2y）均为可联立解出 x,y 的独立式；D=33−2(x+y)=−261 为常数，**不充分** ✓

### 9.3 同类陷阱核查

- SSA/ASS：本批无判定相似/全等题走 SSA（#30 为 SSS 全等、#35 为坐标相似对应、#37 为充分性线性判别）。
- 问哪条边：#23 问斜边 CE（30）非 CA（24）；#24 问面积（189）非边长；无 leg/斜边错位。
- 对顶角/邻补角：#33、#34 按"锐角×4、钝角×4"分类求和，未混用对顶角。
- 第二方法数值抽查：#23 18²+24²=900=30² 勾股回代；#25 KT=22·(2/3)=44/3；#33 取 x=100 → α=90、α+3obt=360，公式 1760−1400=360 ✓；#31 ∠SKL 同位角=∠T=125 ✓。
