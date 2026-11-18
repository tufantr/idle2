#!/usr/bin/env bash
# Mails the owner that the backups need a look (P-094): run by systemd when a backup fails (OnFailure) and each
# morning by fantasyidle-backup-check.timer, which mails only when the newest copy on Drive is over 26 hours old.
# The address (OWNER_ALERT_EMAIL) and the mail key live only in the API's env file, /etc/fantasyidle/api.env: neither
# is printed, logged or committed. The mail goes through Resend, as the game's own mail does (api/mail.js).
#   bash deploy/vps/backup-alert.sh failed     # "the night's backup failed"
#   bash deploy/vps/backup-alert.sh check      # mail only if Drive's newest copy is stale
#   bash deploy/vps/backup-alert.sh test       # a test mail, to see that alerts arrive
set -euo pipefail
MODE=${1:-failed}
REMOTE=${FANTASYIDLE_BACKUP_REMOTE:-fi-gdrive:fantasyidle-backups}
set -a; . /etc/fantasyidle/api.env; set +a
[ -n "${OWNER_ALERT_EMAIL:-}" ] && [ -n "${RESEND_API_KEY:-}" ] || { echo "no address or mail key: no alert"; exit 0; }
if [ "$MODE" = check ]; then
    NEWEST=$(rclone --config /etc/fantasyidle/rclone.conf --quiet lsjson "$REMOTE/nightly/" 2>/dev/null | python3 -c 'import json,sys,datetime as d
items = json.load(sys.stdin) or []
print(max((d.datetime.fromisoformat(i["ModTime"].replace("Z", "+00:00")).timestamp() for i in items), default=0))' || echo 0)
    AGE_H=$(python3 -c "import time; print(int((time.time() - float('$NEWEST')) / 3600))")
    [ "$AGE_H" -gt 26 ] || exit 0
    SUBJECT="Fantasy Idle: no backup on Drive for ${AGE_H} hours"
    TEXT="The newest backup copy on Google Drive is ${AGE_H} hours old. The nightly job may have failed, or Google's permission may have lapsed. On the server: journalctl -u fantasyidle-backup -n 50"
elif [ "$MODE" = test ]; then
    SUBJECT="Fantasy Idle: backup alerts work"
    TEXT="This is a test. From now on the server mails this address if a night's backup fails, or if Google Drive holds no copy from the last 26 hours. The backups are encrypted to the key on your Mac (~/.config/fantasyidle/backup-key.txt): keep a copy of it in your password manager."
else
    SUBJECT="Fantasy Idle: the night's backup failed"
    TEXT="The nightly backup did not reach Google Drive. On the server: journalctl -u fantasyidle-backup -n 50"
fi
FROM=${MAIL_FROM:-Fantasy Idle <noreply@fantasyidle.com>}
python3 - "$FROM" "$OWNER_ALERT_EMAIL" "$SUBJECT" "$TEXT" <<'PY' | curl -fsS -o /dev/null https://api.resend.com/emails -H "Authorization: Bearer $RESEND_API_KEY" -H 'Content-Type: application/json' --data-binary @-
import json, sys
f, to, subject, text = sys.argv[1:5]
print(json.dumps({"from": f, "to": [to], "subject": subject, "text": text}))
PY
echo "alert sent: $SUBJECT"
