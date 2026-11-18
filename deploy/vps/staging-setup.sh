#!/usr/bin/env bash
# The private staging copy of the game, staging.fantasyidle.com, where every change is rehearsed on a copy of the live
# data before it goes live (deploy/vps/stage.sh deploys to it). Run as root on the server, from a release folder:
#   bash deploy/vps/staging-setup.sh          # its database, settings, API service and web block (safe to rerun)
#   bash deploy/vps/staging-setup.sh data     # fresh live data: the newest nightly dump restored into it
#   bash deploy/vps/staging-setup.sh link     # the private link that lets a browser in (for the owner)
# Its settings are live's with their own database (fantasyidle_staging), token secret and port (3001), and no mail key:
# staging sends no mail. Nothing here touches the live game, its database or its settings.
set -euo pipefail
HERE=$(dirname "$(readlink -f "$0")")
DB=fantasyidle_staging
ENV=/etc/fantasyidle/api-staging.env
GATE=/etc/fantasyidle/staging-gate
restore() {
    local d; d=$(ls -1t /var/backups/fantasyidle/*.dump | head -1)
    systemctl stop fantasyidle-api-staging 2>/dev/null || true
    runuser -u postgres -- dropdb --if-exists $DB
    runuser -u postgres -- createdb -O fantasyidle $DB
    (cd /tmp && runuser -u postgres -- pg_restore --no-owner --role=fantasyidle -d $DB "$d")
    echo "staging data: $(basename "$d")"
    [ -L /srv/fantasyidle-staging/current ] && systemctl start fantasyidle-api-staging || true
}
case "${1:-setup}" in
    data) restore; exit 0 ;;
    link) echo "https://staging.fantasyidle.com/__staging/$(cat $GATE)"; exit 0 ;;
esac
if [ ! -f $ENV ]; then
    (umask 077
     sed -e '/^RESEND_API_KEY=/d' -e '/^OWNER_ALERT_EMAIL=/d' -e '/^JWT_SECRET=/d' -e '/^PORT=/d' \
         -e "s#@/fantasyidle?#@/$DB?#" /etc/fantasyidle/api.env > $ENV
     printf 'JWT_SECRET=%s\nPORT=3001\n' "$(openssl rand -hex 32)" >> $ENV)
    chown root:fantasyidle $ENV
    chmod 0640 $ENV
fi
grep -q "@/$DB?" $ENV || { echo "the staging settings don't point at $DB: stopping"; exit 1; }
! grep -q '^RESEND_API_KEY=' $ENV || { echo "the staging settings hold a mail key: stopping"; exit 1; }
[ -f $GATE ] || (umask 077; openssl rand -hex 16 > $GATE)
for d in /srv/fantasyidle-staging /srv/fantasyidle-staging/releases; do install -d -o root -g root -m 0755 $d; done
install -m 0644 "$HERE/fantasyidle-api-staging.service" /etc/systemd/system/fantasyidle-api-staging.service
(umask 077; sed "s/__GATE__/$(cat $GATE)/g" "$HERE/nginx-staging.conf" > /etc/nginx/sites-available/fantasyidle-staging)
ln -sfn /etc/nginx/sites-available/fantasyidle-staging /etc/nginx/sites-enabled/fantasyidle-staging
systemctl daemon-reload
systemctl enable fantasyidle-api-staging >/dev/null 2>&1
runuser -u postgres -- psql -Atqc "SELECT 1 FROM pg_database WHERE datname = '$DB'" | grep -q 1 || restore
nginx -t -q && systemctl reload nginx
echo "staging is set up: deploy with deploy/vps/stage.sh"
