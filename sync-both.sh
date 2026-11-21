#!/usr/bin/env bash
# 把当前目录的完整站点同步到新仓库(SAT-Math-Prep)和旧仓库(SAT-Math)。
# 单一真源：本目录。任何改动后运行本脚本，两边网址都会显示相同内容。
set -e
MSG="${1:-sync site}"
TOKEN=$(printf 'protocol=https\nhost=github.com\n\n' | git credential-osxkeychain get 2>/dev/null | grep '^password=' | cut -d= -f2-)
[ -n "$TOKEN" ] || { echo "no github token"; exit 1; }
# 1) 推新仓库
git remote set-url origin "https://github.com/TimNotCook/SAT-Math-Prep.git"
git add -A && git commit -m "$MSG" 2>/dev/null || true
git push origin main
# 2) 镜像到旧仓库（force，保证完全一致）
rm -rf /tmp/satmath-mirror && git clone --quiet "https://x-access-token:${TOKEN}@github.com/TimNotCook/SAT-Math.git" /tmp/satmath-mirror
cd /tmp/satmath-mirror
git config user.name "mirror-bot"; git config user.email "mirror-bot@users.noreply.github.com"
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cd - >/dev/null
find . -mindepth 1 -maxdepth 1 ! -name .git ! -name sync-both.sh ! -name .github -exec cp -a {} /tmp/satmath-mirror/ \;
cd /tmp/satmath-mirror && git add -A
if ! git diff --cached --quiet; then git commit -m "Mirror: $MSG"; git push origin main; fi
echo "Both repositories synced."
