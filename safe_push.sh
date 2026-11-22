#!/usr/bin/env bash
# safe_push.sh — 多 AI 并行协作的安全推送入口
# 用法：bash safe_push.sh "fix(ui): 这次改了什么"
# 顺序要点：先提交（工作区干净才能 rebase）→ rebase 吸收同事改动
#          → 基于最新代码重算版本号 → amend 并入 → push → 线上核实
set -u
cd "$(dirname "$0")"

MSG="${1:-chore: sync changes}"
REMOTE="origin"
BRANCH="main"

# git 网络通道在本机需要 HTTP/1.1；重试交给下面的循环
g() { git -c http.version=HTTP/1.1 -c http.postBuffer=524288000 "$@"; }

echo "==> [1/5] 先提交本地改动（工作区干净才能安全 rebase）"
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "$MSG" || { echo "!! commit 失败，停止"; exit 1; }
else
  echo "    无待提交改动"
fi

echo "==> [2/5] rebase 到线上最新（吸收同事的并行改动）"
pulled=0
for i in 1 2 3; do
  if g pull --rebase "$REMOTE" "$BRANCH"; then pulled=1; break; fi
  # rebase 中途冲突：停在冲突态，交给人工处理，绝不 --force
  if [ -d "$(git rev-parse --git-dir)/rebase-merge" ] || [ -d "$(git rev-parse --git-dir)/rebase-apply" ]; then
    echo "!! rebase 出现冲突，已停在冲突态。请人工解决后 git rebase --continue，勿强推。"
    exit 3
  fi
  echo "    pull 第 $i 次失败，重试…"
  sleep 2
done
if [ "$pulled" -ne 1 ]; then
  echo "!! pull 失败：为避免覆盖同事改动，已停止。请检查网络后重试。"
  exit 1
fi

echo "==> [3/5] rebase 后重新计算资源版本号（关键：版本号须基于双方最新代码）"
python3 bump_assets.py || { echo "!! bump_assets.py 失败，停止"; exit 1; }

echo "==> [4/5] 把重算的版本号并入刚才的提交"
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit --amend --no-edit || { echo "!! amend 失败，停止"; exit 1; }
else
  echo "    版本号无变化，无需 amend"
fi

echo "==> [5/5] 推送（失败重试，且不把失败当成功）"
pushed=0
for i in 1 2 3; do
  if g push "$REMOTE" "$BRANCH"; then pushed=1; break; fi
  echo "    push 第 $i 次失败，重试…"
  sleep 3
done
if [ "$pushed" -ne 1 ]; then
  echo "!! push 未成功。（git 报错不代表一定没推上去，请用 GitHub 接口核对线上 HEAD）"
  exit 2
fi

echo "完成。本地 HEAD: $(git rev-parse HEAD)"
git status -sb | head -1
echo "请用 GitHub 接口核对线上 HEAD 与本地一致。"
