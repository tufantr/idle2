#!/usr/bin/env bash
# Looks at the game from the server itself, the way a player's browser comes in through nginx: the page, the API, and an
# upload as big as a save. Run each hour by fantasyidle-probe.timer, and by activate.sh at the end of every deploy.
# On 19 November 2026 a test of nginx's settings left nginx's folder for request bodies to the wrong user: every cloud
# save failed for eight hours while the page and the API's small answers stayed fine. Only an upload shows that, and
# nginx's own log says why, so both are looked at.
#   bash deploy/vps/probe.sh             # look; mail the owner if something is wrong (at most once in six hours)
#   bash deploy/vps/probe.sh --quiet     # look only: exit 1 if something is wrong (activate.sh)
#   bash deploy/vps/probe.sh --staging   # the staging copy, through its gate (quiet)
# The owner's address, the mail key and the staging gate are read from their files and never printed.
set -euo pipefail
QUIET=0
HOST=fantasyidle.com
for arg in "$@"; do
    case $arg in
        --quiet) QUIET=1 ;;
        --staging) HOST=staging.fantasyidle.com; QUIET=1 ;;
        *) echo "unknown option: $arg"; exit 2 ;;
    esac
done
# (PROBE_ORIGIN, PROBE_ERROR_LOG and PROBE_STAMP stand in for the real ones in test/probe.test.mjs)
ORIGIN=${PROBE_ORIGIN:-https://$HOST}
ERROR_LOG=${PROBE_ERROR_LOG:-/var/log/nginx/error.log}
STAMP=${PROBE_STAMP:-/var/lib/fantasyidle/probe-alerted}
CURL=(curl -s -o /dev/null -w '%{http_code}' --max-time 20)
# nginx on this machine, under its own name, with its origin certificate (Cloudflare's, not one curl knows)
[ -n "${PROBE_ORIGIN:-}" ] || CURL+=(-k --resolve "$HOST:443:127.0.0.1")
GATE_FILE=/etc/fantasyidle/staging-gate
headers() {   # staging answers only a browser with the gate's cookie: given as a header from a file, never on the command line
    if [ "$HOST" = staging.fantasyidle.com ] && [ -z "${PROBE_ORIGIN:-}" ]; then printf 'Cookie: fi_staging=%s\n' "$(cat "$GATE_FILE")"; fi
}

PROBLEMS=()
expect() {   # expect <what> <the codes that are well> <curl's arguments...>
    local what=$1 good=$2; shift 2
    local code
    code=$("${CURL[@]}" -H @<(headers) "$@" || true)
    [[ " $good " == *" $code "* ]] || PROBLEMS+=("$what answered $code")
}
expect 'the page' '200' "$ORIGIN/"
expect 'the API' '200' "$ORIGIN/api/health"
# an upload the size of a big save, without an account: the API must refuse it (401). A 5xx is nginx or the API failing
# before the account is even looked at, which is what every player's save would meet.
BODY=$(mktemp)
trap 'rm -f "$BODY"' EXIT
python3 -c 'import json; print(json.dumps({"state": {"probe": "x" * 200000}}))' > "$BODY"
expect 'an upload as big as a save' '401' -X POST -H 'Content-Type: application/json' --data-binary @"$BODY" "$ORIGIN/api/save"

# nginx's own complaints of the last 65 minutes, at the levels that mean requests fail
if [ -r "$ERROR_LOG" ]; then
    SINCE=$(date -u -d '-65 min' '+%Y/%m/%d %H:%M:%S' 2>/dev/null || date -u -v-65M '+%Y/%m/%d %H:%M:%S')
    BAD=$(awk -v since="$SINCE" '($1 " " $2) >= since && /\[(crit|alert|emerg)\]/' "$ERROR_LOG" | sed -E 's/, client: [^,]+//; s/^[^ ]+ [^ ]+ //' | cut -c1-200)
    if [ -n "$BAD" ]; then
        COUNT=$(grep -c '' <<< "$BAD")   # (no `| head` here: with pipefail its early exit stops the script)
        PROBLEMS+=("nginx logged $COUNT failures in the last hour, the first: ${BAD%%$'\n'*}")
    fi
fi

if [ ${#PROBLEMS[@]} -eq 0 ]; then echo "probe: $HOST is well"; [ $QUIET = 1 ] || rm -f "$STAMP"; exit 0; fi   # (well again: the next trouble mails at once)
TEXT="The hourly look at $HOST found: $(printf '%s; ' "${PROBLEMS[@]}")On the server: tail -n 20 /var/log/nginx/error.log, journalctl -u fantasyidle-api -n 50."
echo "probe: $TEXT"
[ $QUIET = 1 ] && exit 1

# the mail, at most once in six hours (the next look still prints)
if [ -f "$STAMP" ] && [ $(( $(date +%s) - $(cat "$STAMP" 2>/dev/null || echo 0) )) -lt 21600 ]; then exit 1; fi
set -a; . /etc/fantasyidle/api.env; set +a
if [ -z "${OWNER_ALERT_EMAIL:-}" ] || [ -z "${RESEND_API_KEY:-}" ]; then echo "no address or mail key: no alert"; exit 1; fi
FROM=${MAIL_FROM:-Fantasy Idle <noreply@fantasyidle.com>}
python3 - "$FROM" "$OWNER_ALERT_EMAIL" "Fantasy Idle: $HOST needs a look" "$TEXT" <<'PY' | curl -fsS -o /dev/null https://api.resend.com/emails -H "Authorization: Bearer $RESEND_API_KEY" -H 'Content-Type: application/json' --data-binary @-
import json, sys
f, to, subject, text = sys.argv[1:5]
print(json.dumps({"from": f, "to": [to], "subject": subject, "text": text}))
PY
mkdir -p "$(dirname "$STAMP")"
date +%s > "$STAMP"
echo "alert sent"
exit 1
