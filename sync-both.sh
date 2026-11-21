#!/usr/bin/env bash
# 站点同步：单一真源=本地目录(SAT-Math)，直接提交推送到远端 SAT-Math。
# 任何页面/脚本/数据改动后运行本脚本，远端与本地内容保持一致。
# 用法: bash sync-both.sh "改动说明"
set -euo pipefail
MSG="${1:-sync site}"
TOKEN=$(printf 'protocol=https\nhost=github.com\n\n' | git credential-osxkeychain get 2>/dev/null | grep '^password=' | cut -d= -f2-)
[ -n "$TOKEN" ] || { echo "ERROR: no github token in keychain"; exit 1; }

echo "[1/1] Push to canonical repo SAT-Math ..."
git remote set-url origin "https://github.com/TimNotCook/SAT-Math.git"
git add -A
git commit -m "$MSG" 2>/dev/null || echo "  (nothing to commit)"
for try in 1 2 3; do git push origin main && break || { echo "  retry push $try"; sleep 3; }; done
echo "DONE: SAT-Math now serves latest content."
