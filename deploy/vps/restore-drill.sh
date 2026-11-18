#!/usr/bin/env bash
# The monthly restore drill (P-094): the newest nightly dump restored into a scratch database, which must hold every
# table and the accounts, then dropped. A drill that fails mails the owner (fantasyidle-backup-alert.service). The
# copies on Drive are encrypted to the owner's key, which this server doesn't hold: drill those from the owner's Mac.
set -euo pipefail
D=$(ls -1t /var/backups/fantasyidle/*.dump | head -1)
cd /tmp
runuser -u postgres -- dropdb --if-exists fi_drill
runuser -u postgres -- createdb fi_drill
trap 'runuser -u postgres -- dropdb --if-exists fi_drill' EXIT
runuser -u postgres -- pg_restore --no-owner -d fi_drill "$D"
TABLES=$(runuser -u postgres -- psql -Atq -d fi_drill -c "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'")
USERS=$(runuser -u postgres -- psql -Atq -d fi_drill -c "SELECT count(*) FROM users")
LIVE=$(runuser -u postgres -- psql -Atq -d fantasyidle -c "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'")
[ "$TABLES" -ge "$LIVE" ] && [ "$USERS" -gt 0 ] || { echo "drill failed: $TABLES tables (live $LIVE), $USERS accounts"; exit 1; }
echo "drill ok: $(basename "$D"): $TABLES tables, $USERS accounts"
