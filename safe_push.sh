#!/usr/bin/env bash
# safe_push.sh — 多 AI 并行协作的安全推送入口
# 用法：bash safe_push.sh "fix(ui): 这次改了什么"
#
# 顺序要点（每一步都为"共享工作区有两个助手"设计）：
#   1) 先提交自己的改动（工作区干净才好 rebase）
#   2) rebase 到线上最新，吸收同事已推的提交
#      · rebase 前又被并行会话写脏工作区 → stash 保护
#      · HTML 的 ?v= 哈希冲突（bump_assets.py 自动产物）→ 自动保留线上结构、重算版本号
#      · 代码 / 结构冲突 → 停下等人工，绝不自动覆盖同事改动
#   3) 基于双方最新代码重算版本号 → amend 并入提交
#   4) push（失败重试 + ls-remote 核对，commit_refs_rules / 502 等抖动不误判为失败）
set -u
cd "$(dirname "$0")"

MSG="${1:-chore: sync changes}"
REMOTE="origin"
BRANCH="main"

g() { git -c http.version=HTTP/1.1 -c http.postBuffer=524288000 "$@"; }
rebase_active() { [ -d "$(git rev-parse --git-dir)/rebase-merge" ] || [ -d "$(git rev-parse --git-dir)/rebase-apply" ]; }

# 判断"我的提交（阶段3）相对共同祖先（阶段1）对该 HTML 是否只改了 ?v= 哈希行"。
# bump_assets.py 只改 ?v= 哈希：若我这边除此之外没动 HTML，冲突就是「同事的结构改动 +
# 我的哈希改动」的叠加，可安全保留线上(ours)结构、再重算哈希。
html_my_diff_is_hash_only() {
  local f="$1" base mine
  base=$(git show ":1:$f" 2>/dev/null | sed -E 's/\?v=[0-9a-f]+/?v=HASH/g')
  mine=$(git show ":3:$f" 2>/dev/null | sed -E 's/\?v=[0-9a-f]+/?v=HASH/g')
  [ -n "$base" ] && [ "$base" = "$mine" ]
}

# 自动解决"仅 HTML 的 ?v= 哈希冲突"：保留 rebase 基础(ours)的 HTML 结构，
# 之后 bump_assets.py 会基于双方合并后的代码重算哈希，谁的改动都不会被缓存挡住。
auto_resolve_html_conflicts() {
  local unmerged f
  unmerged=$(git diff --name-only --diff-filter=U 2>/dev/null)
  [ -z "$unmerged" ] && return 1
  for f in $unmerged; do
    case "$f" in
      *.html) ;;
      *) echo "    !! 冲突含非 HTML 文件（${f}），不自动处理"; return 1 ;;
    esac
  done
  for f in $unmerged; do
    if ! html_my_diff_is_hash_only "$f"; then
      echo "    !! [${f}] 我这边不止改了 ?v= 哈希行（可能有结构改动），不自动处理"
      return 1
    fi
  done
  echo "    检测到纯 HTML ?v= 哈希冲突，自动保留线上结构并重算版本号…"
  for f in $unmerged; do
    git checkout --ours -- "$f" || return 1
    git add "$f" || return 1
  done
  return 0
}

# 逐轮尝试自动完成 rebase。返回 0=已完成，1=需要人工介入。
finish_rebase_auto() {
  local tries=0
  while rebase_active; do
    tries=$((tries + 1))
    [ "$tries" -gt 10 ] && return 1
    if ! auto_resolve_html_conflicts; then
      echo "!! rebase 冲突无法自动解决（涉及代码/结构改动），请人工解决后 git rebase --continue，勿强推。"
      return 1
    fi
    echo "    已自动解决，继续 rebase…"
    if ! git rebase --continue; then
      # 又停在新的冲突态 → 回到循环继续；否则真失败
      rebase_active || return 1
    fi
  done
  return 0
}

echo "==> [1/4] 提交本地改动（工作区干净才能安全 rebase）"
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "$MSG" || { echo "!! commit 失败，停止"; exit 1; }
else
  echo "    无待提交改动"
fi

echo "==> [2/4] rebase 到线上最新（吸收同事的并行改动）"
stashed=0
if [ -n "$(git status --porcelain)" ]; then
  echo "    检测到 rebase 前又有并行改动，先 stash 保护…"
  git stash push -u -m "safe_push auto-stash $(date +%s)" && stashed=1
fi
pulled=0
for i in 1 2 3; do
  if g pull --rebase "$REMOTE" "$BRANCH"; then pulled=1; break; fi
  if rebase_active; then
    if finish_rebase_auto; then
      pulled=1; break
    fi
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

echo "==> [3/4] 基于双方最新代码重算资源版本号"
python3 bump_assets.py || { echo "!! bump_assets.py 失败，停止"; exit 1; }

echo "==> [4/4] 重算版本号并入提交后推送"
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit --amend --no-edit || { echo "!! amend 失败，停止"; exit 1; }
fi
pushed=0
for i in 1 2 3; do
  if g push "$REMOTE" "$BRANCH"; then pushed=1; break; fi
  # commit_refs_rules / 502 等抖动：报错不代表没推上，用 ls-remote 核对线上真实 HEAD
  local_head=$(git rev-parse HEAD)
  remote_head=$(git ls-remote "$REMOTE" "$BRANCH" 2>/dev/null | awk '{print $1}')
  if [ -n "$remote_head" ] && [ "$remote_head" = "$local_head" ]; then
    echo "    push 报错但线上 HEAD 已与本地一致（网络抖动），视为成功。"
    pushed=1; break
  fi
  echo "    push 第 $i 次失败，重试…"
  sleep 3
done
if [ "$pushed" -ne 1 ]; then
  echo "!! push 未成功。请用 git ls-remote origin main 核对线上 HEAD。"
  exit 2
fi

echo "完成。本地 HEAD: $(git rev-parse HEAD)"
git status -sb | head -1
