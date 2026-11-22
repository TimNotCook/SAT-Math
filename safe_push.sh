#!/usr/bin/env bash
# safe_push.sh — 多 AI 并行协作的安全推送入口
# 用法：bash safe_push.sh "fix(ui): 这次改了什么"
#
# 顺序要点（每一步都为"共享工作区有两个助手"设计）：
#   1) 先提交自己的改动（工作区干净才好 rebase）
#   2) rebase 到线上最新，吸收同事已推的提交
#   3) 若 rebase 期间同事又写了工作区 → stash 收起 → rebase → pop 还原
#   4) 基于双方最新代码重算版本号 → amend 并入提交
#   5) push（重试，且不把失败当成功）→ 提示用 GitHub 接口核实
set -u
cd "$(dirname "$0")"

MSG="${1:-chore: sync changes}"
REMOTE="origin"
BRANCH="main"

g() { git -c http.version=HTTP/1.1 -c http.postBuffer=524288000 "$@"; }
rebase_active() { [ -d "$(git rev-parse --git-dir)/rebase-merge" ] || [ -d "$(git rev-parse --git-dir)/rebase-apply" ]; }

echo "==> [1/5] 提交本地改动（工作区干净才能安全 rebase）"
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "$MSG" || { echo "!! commit 失败，停止"; exit 1; }
else
  echo "    无待提交改动"
fi

echo "==> [2/5] rebase 到线上最新（吸收同事的并行改动）"
# rebase 前若工作区又被并行会话弄脏，先 stash，rebase 完再 pop
stashed=0
if [ -n "$(git status --porcelain)" ]; then
  echo "    检测到 rebase 前又有并行改动，先 stash 保护…"
  git stash push -u -m "safe_push auto-stash $(date +%s)" && stashed=1
fi
pulled=0
for i in 1 2 3; do
  if g pull --rebase "$REMOTE" "$BRANCH"; then pulled=1; break; fi
  if rebase_active; then
    echo "!! rebase 出现冲突，停在冲突态。请人工解决后 git rebase --continue，勿强推。"
    [ "$stashed" = 1 ] && echo "    （你的改动在 stash 里，rebase 完记得 git stash pop）"
    exit 3
  fi
  echo "    pull 第 $i 次失败，重试…"
  sleep 2
done
if [ "$pulled" -ne 1 ]; then
  echo "!! pull 失败：为避免覆盖同事改动，已停止。"
  [ "$stashed" = 1 ] && echo "    （你的改动在 stash 里，用 git stash pop 找回）"
  exit 1
fi
if [ "$stashed" = 1 ]; then
  echo "    还原刚才 stash 的并行改动…"
  git stash pop || echo "    !! stash pop 有冲突，请人工处理（改动仍在 stash 中）"
fi

echo "==> [3/5] 基于双方最新代码重算资源版本号"
python3 bump_assets.py || { echo "!! bump_assets.py 失败，停止"; exit 1; }

echo "==> [4/5] 把重算的版本号与还原的并行改动并入提交"
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit --amend --no-edit || { echo "!! amend 失败，停止"; exit 1; }
else
  echo "    无改动，无需 amend"
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
