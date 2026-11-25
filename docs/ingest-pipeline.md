# 题包自动入库管线（ingest-transcribe-fragments）

> 本文只说明通道与验收口径；题目台账见 `docs/transcribe/` 下各章节文件，不在此重复。

## 1. 入库通道现状

workflow：`.github/workflows/ingest-transcribe-fragments.yml`（name: `ingest-transcribe-fragments`）。

- **触发器**：push 到 `main` 且路径命中 `docs/transcribe/**` 或本 workflow 文件；另支持 `workflow_dispatch` 手动触发。`concurrency: ingest-fragments` 保证同点串行。
- **作业内顺序**（`set -e`，任何一步失败即中止、不提交）：
  1. **Declare sections**：内联 Python 扫描 `docs/transcribe/*/fragments/*.json`，按每题的 `unit`/`section` 在 `data/questions.js` 章节树里补建缺失的分组（`4.5`、`2.7`）与 topic 节点；已存在的节跳过，不重复插入。
  2. **Merge fragments**：逐题包执行 `python3 tools/merge_transcribe_fragment.py --fragment <f>`，结构校验通过后写入 `data/questions.js`、`data/text.js`、`data/figures.js`。
  3. **Rollup, bump, test**：`python3 tools/rollup_declarations.py --write` 回填各节/各组计数；`python3 bump_assets.py` 刷新五页 `?v=`；`node --test test/*.test.js`。
  4. **Commit if changed**：无变更则 `NO_CHANGES` 退出；有变更以 `github-actions[bot]` 身份 `git add -A && git commit && git push`。测试不过或声明失败则不提交。
- **部署**：Pages 用官方 action 从 `main` 发版（`ci(pages)`），push 即触发重建。

## 2. 为什么改通道

- Mac 环境（`client:582478…`）长期 `DEVICE_OFFLINE`，云主机无 git 推送凭证；此前人工本地通道卡了整轮。
- CI 使用仓库自身 `contents: write` 权限，绕开本地凭证：读题代理把 fragment 落到 `main`，作业自动完成声明、合并、回填、版本号与测试后回推。

## 3. 读写者边界（不变）

- 读题代理只写 `docs/transcribe/**/fragments/*.json` 与对账台账文档；
- `data/*.js`（questions/text/figures）只能由本作业写入，人工不直接改 `data/*.js`；
- `data/questions.json`、`data/text.json`、根 `questions.js`、`aliases.js` 不在本管线范围内，不动。

## 4. 验收命令清单

| 检查 | 命令 | 通过标准 |
| --- | --- | --- |
| 声明/计数自洽 | `python3 tools/rollup_declarations.py --write` | 末尾「合计问题项：0」；`4.5` 组 = `4.5.T24+T25+T26+T27` 之和，`2.7` 组 = `2.7.T17+T18+T19` 之和（自行复算一遍） |
| 回归测试 | `node --test test/*.test.js` | 131 pass / 0 fail |
| 五页版本一致 | `node tools/versions.mjs --base https://timnotcook.github.io/SAT-Math` | index/exam/drill/wrong/jiangyi 五页 `?v=` 同值 |
| 线上题数抽查 | `curl -s https://timnotcook.github.io/SAT-Math/data/questions.js \| grep -c '"R04-'` / `grep -c '"R03-'` | 与 rollup 分册合计对得上（HEAD `42208e8` 实测 R04=135、R03=91，题包持续到达后数字会变，按自洽判） |
| 推送落点 | `git ls-remote origin refs/heads/main` | 与本地 `git rev-parse HEAD` 一致 |

## 5. 已知风险（待办，本次不动）

- Merge 步骤是 `python3 tools/merge_transcribe_fragment.py --fragment "$f" | tail -3`：管道会吞掉 python 的退出码，`set -e` 拦不住单个题包 FAIL。当前判据以「rollup 问题项 0 + 131 测试」为准。
- 待办：改造作业使某题包 FAIL 时显式非零退出（例如 `set -o pipefail` 或直接读 merge 退出码），不要在本轮顺手改。
