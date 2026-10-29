#!/usr/bin/env bash
# Makes a release live on the fantasyidle.com server; deploy/vps/deploy.sh unpacks a commit into
# /srv/fantasyidle/releases/<commit> and runs this there, as root:
#   bash /srv/fantasyidle/releases/<commit>/deploy/vps/activate.sh /srv/fantasyidle/releases/<commit>
# The game's files, the API's packages for this machine, and the wiki, all from the one commit; then the switch,
# and a release whose API doesn't answer is switched back. The last five releases are kept.
set -euo pipefail
REL=$(readlink -f "$1")
SHA=$(basename "$REL")
ROOT=/srv/fantasyidle
WIKI=$ROOT/wiki/releases/$SHA
cd "$REL"

# the files the browser loads, and nothing more (as on Vercel: no docs, tools, tests, wiki sources or server code)
rm -rf public
mkdir public
cp -a index.html manifest.json style.css src assets public/
# the commit, as the version this copy of the game is (src/version.js) and as the one live, which an open page asks
# for to learn that a newer one is out (version.json, src/ui/update.js)
printf "export const VERSION = '%s';\n" "$SHA" > public/src/version.js
printf '{"version":"%s"}\n' "$SHA" > public/version.json
chown -R fantasyidle:fantasyidle "$REL"

# the API's packages, built for this machine (bcrypt is native); npm's cache in the app's home
runuser -u fantasyidle -- env HOME=$ROOT bash -c 'cd api && rm -rf node_modules && npm ci --omit=dev --no-audit --no-fund --loglevel=error'

# the wiki, from the same commit
rm -rf "$WIKI"
runuser -u fantasyidle -- env HOME=$ROOT WIKI_VERSION="$SHA" node wiki/build.mjs --out "$WIKI" >/dev/null

# the web server's and the API's settings travel with the code
install -m 0644 deploy/vps/fantasyidle-api.service /etc/systemd/system/fantasyidle-api.service
install -m 0644 deploy/vps/nginx.conf /etc/nginx/sites-available/fantasyidle
ln -sfn /etc/nginx/sites-available/fantasyidle /etc/nginx/sites-enabled/fantasyidle
rm -f /etc/nginx/sites-enabled/default
systemctl daemon-reload
systemctl enable fantasyidle-api >/dev/null 2>&1
[ -f /etc/ssl/fantasyidle/origin.pem ] || { echo "no origin certificate yet: run deploy/vps/cloudflare.sh first"; exit 1; }
nginx -t -q

# the switch, and the check
PREV=$(readlink -f $ROOT/current 2>/dev/null || true)
PREV_WIKI=$(readlink -f $ROOT/wiki/current 2>/dev/null || true)
swap() { ln -sfn "$2" "$1.new" && mv -T "$1.new" "$1"; }
swap $ROOT/current "$REL"
swap $ROOT/wiki/current "$WIKI"
systemctl restart fantasyidle-api
healthy() { for _ in $(seq 1 30); do curl -fsS -o /dev/null http://127.0.0.1:3000/api/health && return 0; sleep 0.5; done; return 1; }
if ! healthy; then
    echo "the API of $SHA did not answer: switching back"
    journalctl -u fantasyidle-api -n 20 --no-pager || true
    if [ -n "$PREV" ] && [ "$PREV" != "$REL" ]; then swap $ROOT/current "$PREV"; swap $ROOT/wiki/current "$PREV_WIKI"; systemctl restart fantasyidle-api; fi
    exit 1
fi
systemctl reload nginx

# the last five releases kept
ls -1dt $ROOT/releases/*/ | tail -n +6 | xargs -r rm -rf
ls -1dt $ROOT/wiki/releases/*/ | tail -n +6 | xargs -r rm -rf
echo "live: $SHA ($(curl -fsS http://127.0.0.1:3000/api/health))"
