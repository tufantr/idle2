#!/usr/bin/env bash
# Deploys a commit to the private staging copy, staging.fantasyidle.com (its own API on port 3001 and its own database,
# fantasyidle_staging; mail off), where every change is rehearsed before deploy.sh puts it live. Like deploy.sh, only
# what is committed goes up. First time on a server: deploy/vps/staging-setup.sh; fresh live data: staging-setup.sh data.
#   deploy/vps/stage.sh             # the working branch's tip
#   deploy/vps/stage.sh <commit>
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
SHA=$(git rev-parse --short=7 "${1:-HEAD}")
HOST=${FANTASYIDLE_HOST:-root@75.127.4.7}
SSH=(ssh -i "$HOME/.ssh/fantasyidle_ed25519" -o IdentitiesOnly=yes -o BatchMode=yes
     -o UserKnownHostsFile="$HOME/.ssh/known_hosts_fantasyidle" -o StrictHostKeyChecking=yes -o ServerAliveInterval=30)
echo "staging $SHA on $HOST"
git archive --format=tar "$SHA" | "${SSH[@]}" "$HOST" \
    "set -e; d=/srv/fantasyidle-staging/releases/$SHA; rm -rf \$d; mkdir -p \$d; tar -x -C \$d; bash \$d/deploy/vps/activate.sh --staging \$d"
