#!/usr/bin/env bash
# Deploys a commit of the game, its API and its wiki to fantasyidle.com (README "The server"). Only what is
# committed goes up, as a git archive: never art/, runs/, shots/ or anything uncommitted.
#   deploy/vps/deploy.sh             # the working branch's tip
#   deploy/vps/deploy.sh <commit>
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
SHA=$(git rev-parse --short=7 "${1:-HEAD}")
HOST=${FANTASYIDLE_HOST:-root@75.127.4.7}
SSH=(ssh -i "$HOME/.ssh/fantasyidle_ed25519" -o IdentitiesOnly=yes -o BatchMode=yes
     -o UserKnownHostsFile="$HOME/.ssh/known_hosts_fantasyidle" -o StrictHostKeyChecking=yes -o ServerAliveInterval=30)
echo "deploying $SHA to $HOST"
git archive --format=tar "$SHA" | "${SSH[@]}" "$HOST" \
    "set -e; d=/srv/fantasyidle/releases/$SHA; rm -rf \$d; mkdir -p \$d; tar -x -C \$d; bash \$d/deploy/vps/activate.sh \$d"
