#!/usr/bin/env bash
# 站点双仓库同步：单一真源=本地目录(SAT-Math-Prep)。
# 任何页面/脚本/数据改动后运行本脚本，新仓库与旧仓库(timnotcook.github.io/SAT-Math/)内容完全一致。
# 用法: bash sync-both.sh "改动说明"
set -euo pipefail
MSG="${1:-sync site}"
TOKEN=$(printf 'protocol=https\nhost=github.com\n\n' | git credential-osxkeychain get 2>/dev/null | grep '^password=' | cut -d= -f2-)
[ -n "$TOKEN" ] || { echo "ERROR: no github token in keychain"; exit 1; }

echo "[1/2] Push to canonical repo SAT-Math-Prep ..."
git remote set-url origin "https://github.com/TimNotCook/SAT-Math-Prep.git"
git add -A
git commit -m "$MSG" 2>/dev/null || echo "  (nothing to commit)"
for try in 1 2 3; do git push origin main && break || { echo "  retry push $try"; sleep 3; }; done

echo "[2/2] Mirror all files to legacy repo SAT-Math ..."
rm -rf /tmp/satmath-mirror
for try in 1 2 3; do
  git clone --quiet "https://x-access-token:${TOKEN}@github.com/TimNotCook/SAT-Math.git" /tmp/satmath-mirror && break || { echo "  retry clone $try"; sleep 3; }
done
cd /tmp/satmath-mirror
git config user.name "mirror-bot"; git config user.email "mirror-bot@users.noreply.github.com"
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cd - >/dev/null
find . -mindepth 1 -maxdepth 1 ! -name .git ! -name .github -exec cp -a {} /tmp/satmath-mirror/ \;
cd /tmp/satmath-mirror
git add -A
if git diff --cached --quiet; then
  echo "  (legacy already current)"
else
  git commit -m "Mirror from SAT-Math-Prep: $MSG"
  for try in 1 2 3; do git push origin main && break || { echo "  retry mirror push $try"; sleep 3; }; done
fi
echo "DONE: both URLs now serve identical content."
