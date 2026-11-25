# 3.1 验收回执 — 2026-11-25

- 节号：3.1 等价表达式：因式分解与分离（p103–p106，答案页 p194）
- 录入：6 题，`JY3-001 … JY3-006`（#1 D / #2 D / #3 B / #4 grid 8 / #5 A / #6 D，全部照答案页）
- 缺号：6 → 0（`gen_jiangyi_backlog.py`：need=243 have=128 miss=115；U3 由 68 剩 62）
- 原页核对：题干逐题对 p104–p106；本节无图、无表，不需矢量重画
- 结构：`bump_assets.py` 五页一致；`node --test test/*.test.js` 140 pass / 0 fail
- 顺手修：`tools/gen_jiangyi_prep.py` 原断言「3.1–4.5 缺题恒为 120」与进度矛盾 → 改为「不超过 120」；`test/jiangyi-prep.test.js` 合计行改为与真实缺号数比对
