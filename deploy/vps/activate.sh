#!/usr/bin/env bash
# Makes a release live on the fantasyidle.com server; deploy/vps/deploy.sh unpacks a commit into
# /srv/fantasyidle/releases/<commit> and runs this there, as root:
#   bash /srv/fantasyidle/releases/<commit>/deploy/vps/activate.sh /srv/fantasyidle/releases/<commit>
#   bash .../activate.sh --staging /srv/fantasyidle-staging/releases/<commit>     # the private staging copy (stage.sh)
# The game's files, the API's packages for this machine, and the wiki, all from the one commit; then the switch,
# and a release whose API doesn't answer is switched back. The last five releases are kept.
# The release stays root's: the API's packages are built as the app user in a folder of their own and copied in, so a
# package's install script can't change what root then installs or runs from the release (P-103).
set -euo pipefail
STAGING=0
if [ "${1:-}" = --staging ]; then STAGING=1; shift; fi
REL=$(readlink -f "$1")
SHA=$(basename "$REL")
if [ $STAGING = 1 ]; then
    ROOT=/srv/fantasyidle-staging; UNIT=fantasyidle-api-staging; PORT=3001
else
    ROOT=/srv/fantasyidle; UNIT=fantasyidle-api; PORT=3000
fi
WIKI=$ROOT/wiki/releases/$SHA
# the folders that hold releases are root's too, so the app user can't swap one (its npm cache, .npm, stays its own)
for d in "$ROOT" "$ROOT/releases" "$ROOT/wiki" "$ROOT/wiki/releases"; do install -d -o root -g root -m 0755 "$d"; chown root:root "$d"; done
cd "$REL"
chown -R root:root "$REL"
chmod -R go-w "$REL"

# the files the browser loads, and nothing more (as on Vercel: no docs, tools, tests, wiki sources or server code)
rm -rf public
mkdir public
cp -a index.html manifest.json style.css src assets public/
# the commit, as the version this copy of the game is (src/version.js) and as the one live, which an open page asks
# for to learn that a newer one is out (version.json, src/ui/update.js)
printf "export const VERSION = '%s';\n" "$SHA" > public/src/version.js
printf '{"version":"%s"}\n' "$SHA" > public/version.json

# the API's packages, built for this machine (bcrypt is native) by the app user, in a folder that is all it can write;
# npm's cache in the app's home
BUILD=$(mktemp -d "$ROOT/build.XXXXXX")
trap 'rm -rf "$BUILD"' EXIT
cp api/package.json api/package-lock.json "$BUILD/"
chown -R fantasyidle:fantasyidle "$BUILD"
runuser -u fantasyidle -- env HOME=/srv/fantasyidle bash -c "cd '$BUILD' && npm ci --omit=dev --no-audit --no-fund --loglevel=error"
rm -rf api/node_modules
cp -a "$BUILD/node_modules" api/node_modules
chown -R root:root api/node_modules
chmod -R go-w api/node_modules

if [ $STAGING = 0 ]; then
    # the wiki, from the same commit, built as the app user into its own folder
    rm -rf "$WIKI"
    install -d -o fantasyidle -g fantasyidle "$WIKI"
    runuser -u fantasyidle -- env HOME=/srv/fantasyidle WIKI_VERSION="$SHA" node wiki/build.mjs --out "$WIKI" >/dev/null
    chown -R root:root "$WIKI"
    # the web server's and the API's settings travel with the code
    install -m 0644 deploy/vps/fantasyidle-api.service /etc/systemd/system/fantasyidle-api.service
    install -m 0644 deploy/vps/nginx.conf /etc/nginx/sites-available/fantasyidle
    ln -sfn /etc/nginx/sites-available/fantasyidle /etc/nginx/sites-enabled/fantasyidle
    rm -f /etc/nginx/sites-enabled/default
    systemctl daemon-reload
    systemctl enable fantasyidle-api >/dev/null 2>&1
fi
[ -f /etc/ssl/fantasyidle/origin.pem ] || { echo "no origin certificate yet: run node deploy/vps/cloudflare.mjs first"; exit 1; }
nginx -t -q

# the switch, and the check
PREV=$(readlink -f $ROOT/current 2>/dev/null || true)
PREV_WIKI=$(readlink -f $ROOT/wiki/current 2>/dev/null || true)
swap() { ln -sfn "$2" "$1.new" && mv -T "$1.new" "$1"; }
swap $ROOT/current "$REL"
[ $STAGING = 1 ] || swap $ROOT/wiki/current "$WIKI"
systemctl restart $UNIT
healthy() { for _ in $(seq 1 30); do curl -fsS -o /dev/null http://127.0.0.1:$PORT/api/health && return 0; sleep 0.5; done; return 1; }
if ! healthy; then
    echo "the API of $SHA did not answer: switching back"
    journalctl -u $UNIT -n 20 --no-pager || true
    if [ -n "$PREV" ] && [ "$PREV" != "$REL" ]; then
        swap $ROOT/current "$PREV"
        [ $STAGING = 1 ] || [ -z "$PREV_WIKI" ] || swap $ROOT/wiki/current "$PREV_WIKI"
        systemctl restart $UNIT
    fi
    exit 1
fi
systemctl reload nginx

# the last five releases kept (the saved ones live in /srv/fantasyidle/saved, outside this)
ls -1dt $ROOT/releases/*/ | tail -n +6 | xargs -r rm -rf
[ $STAGING = 1 ] || ls -1dt $ROOT/wiki/releases/*/ | tail -n +6 | xargs -r rm -rf
echo "live: $SHA$([ $STAGING = 1 ] && echo ' (staging)') ($(curl -fsS http://127.0.0.1:$PORT/api/health))"
