#!/usr/bin/env bash
# The nightly backup, off the server (P-094, README "The server"). Runs as root from fantasyidle-backup.service after
# the night's dump: the newest dump is encrypted to the owner's age key (/etc/fantasyidle/backup-recipient.txt: only the
# public half lives here, so this server can write a backup it can't read) and copied to the owner's Google Drive with
# rclone (scope drive.file: it sees only the files it made). Drive keeps 30 nightly copies and the first of each month
# for a year. A failure mails the owner (backup-alert.sh), and so does a check each morning that finds no fresh copy.
#   bash deploy/vps/backup.sh            # the newest dump
#   bash deploy/vps/backup.sh <file>     # one dump, e.g. before a deploy
set -euo pipefail
DUMPS=/var/backups/fantasyidle
REMOTE=${FANTASYIDLE_BACKUP_REMOTE:-fi-gdrive:fantasyidle-backups}
RCLONE=(rclone --config /etc/fantasyidle/rclone.conf --quiet)
RECIPIENT=/etc/fantasyidle/backup-recipient.txt
SRC=${1:-$(ls -1t "$DUMPS"/*.dump | head -1)}
[ -s "$SRC" ] || { echo "no dump to back up"; exit 1; }
runuser -u postgres -- pg_restore --list "$SRC" >/dev/null   # a dump that doesn't read is not worth a copy
OUT=$(mktemp -d)
trap 'rm -rf "$OUT"' EXIT
NAME=$(basename "$SRC").age
age -R "$RECIPIENT" -o "$OUT/$NAME" "$SRC"
"${RCLONE[@]}" copyto "$OUT/$NAME" "$REMOTE/nightly/$NAME"
# the first copy of each month stays a year
MONTH=$(date -u +%Y-%m)
"${RCLONE[@]}" lsf "$REMOTE/monthly/" 2>/dev/null | grep -q "$MONTH" || "${RCLONE[@]}" copyto "$OUT/$NAME" "$REMOTE/monthly/$MONTH-$NAME"
# keep 30 nightly copies and 12 monthly ones (names sort by date)
"${RCLONE[@]}" lsf "$REMOTE/nightly/" | sort | head -n -30 | while read -r f; do "${RCLONE[@]}" deletefile "$REMOTE/nightly/$f"; done
"${RCLONE[@]}" lsf "$REMOTE/monthly/" | sort | head -n -12 | while read -r f; do "${RCLONE[@]}" deletefile "$REMOTE/monthly/$f"; done
echo "backed up $NAME ($(stat -c %s "$OUT/$NAME") bytes) to $REMOTE"
