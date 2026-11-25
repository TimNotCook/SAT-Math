# JY4「教材原题」子组 · 九题落地与对账（开发者 · 2026-11-25）

## 数据
`data/jiangyi.js` → `JY_BANK` 新增 9 条（`group:'textbook'`），全部挂在 JY4 的 `TB4` 子组，**不占 4.1 / 4.2 官方 declared**（`boardStats('JY4')` 只算官方小节题，`groupStats('JY4')` 算这 9 题）。

| id | section | 练习册页 | 页内题号 | type | answer | 答案页 P246 键 | 对照图 |
|---|---|---|---|---|---|---|---|
| JY4-047 | 4.1 | P200 | #1 | mcq | D | 4.1 #1 = D | docs/jiangyi-proof/JY4-047.png |
| JY4-048 | 4.1 | P200 | #2 | grid | 164 | 4.1 #2 = 164 | docs/jiangyi-proof/JY4-048.png |
| JY4-049 | 4.1 | P201 | #3 | mcq | D | 4.1 #3 = D | docs/jiangyi-proof/JY4-049.png |
| JY4-050 | 4.1 | P202 | #5 | mcq | D | 4.1 #5 = D | docs/jiangyi-proof/JY4-050.png |
| JY4-051 | 4.1 | P203 | #6 | grid | 127 | 4.1 #6 = 127 | docs/jiangyi-proof/JY4-051.png |
| JY4-052 | 4.2 | P205 | #3 | mcq | A | 4.2 #3 = A | docs/jiangyi-proof/JY4-052.png |
| JY4-053 | 4.2 | P205 | #4 | grid | 65 | 4.2 #4 = 65 | docs/jiangyi-proof/JY4-053.png |
| JY4-054 | 4.2 | P207 | #9 | mcq | C | 4.2 #9 = C | docs/jiangyi-proof/JY4-054.png |
| JY4-055 | 4.2 | P207 | #10 | mcq | A | 4.2 #10 = A | docs/jiangyi-proof/JY4-055.png |

- `source` 写作 `练习册 P{页} #{题号}`（三段齐全，供数据校验）；题卡胶囊与页脚只显示 `练习册 P{页}`，不带题号（`jiangyi-core.sourceLabel`）。
- `answer` 逐字照抄练习册答案页 **P246** 的 4.1 / 4.2 键，存进 `data/jiangyi_textbook_answers.json`，不自算；讲义答案页 p191–196 是另一套，不混用。
- 对照图 = 该题所在练习册原页整页（120 dpi），红框标出本题；P204 / P206 没有入选题目，不单独出图。
- `figure` 指向 `images/fig/U4-0x.png`（原页题目图）；JY4-052（相似三角形判断）原书本身无图。

## 与 TD 题库的关系
九题仍是 TD 题库的 `U4-01 … U4-09`（id 未动、按 7ce2a1e 的口径在 TD 侧归并去重），JY 侧只是把同一批题挂进「教材原题」子组，两边答案一致（3.4/4.1/4.2 已逐题核过答案页）。
