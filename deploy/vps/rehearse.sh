#!/usr/bin/env bash
# The rehearsal before a landing, run on the server from the release under test (the one staged with deploy/vps/stage.sh),
# as root, over a fresh copy of the live data in the staging database:
#   bash /srv/fantasyidle-staging/current/deploy/vps/rehearse.sh
#   ... --no-data                  over the data staging holds now, no refresh
#   ... --allow-number-changes     a landing meant to move the server's numbers: they are reported, not failed
#   ... --old <dir>                the version to compare with (default: the release live now)
# On a development machine, made-up accounts (test/helpers/rehearse-fixtures.mjs) and the API tests on their in-memory store:
#   bash deploy/vps/rehearse.sh --fixtures <dir> --memory --old <checkout of the old version>
# (The browsers' part runs on the owner's Mac, against the same staged release: node tools/rehearse-browsers.mjs.)
# It refreshes the data (deploy/vps/staging-setup.sh data), runs the checks (deploy/vps/rehearse.mjs) as the app's user, runs the
# API tests in throwaway databases it makes and always drops, and exits 1 if a check failed, 2 if it could not run. It prints
# numbers and test names: nothing from any account, and neither the settings nor what the tools print on failing (their
# messages can quote what they were reading), so a failure is told by its kind and looked into by hand.
set -uo pipefail
HERE=$(dirname "$(readlink -f "$0")")
REL=$(dirname "$(dirname "$HERE")")
OLD=$(readlink -f /srv/fantasyidle/current 2>/dev/null || echo /srv/fantasyidle/current)
ENV_FILE=/etc/fantasyidle/api-staging.env
REFRESH=1 MEMORY=0 FIXTURES='' NUMBERS=''
usage() { echo "usage: rehearse.sh [--no-data] [--allow-number-changes] [--old <dir>] [--env-file <file>] [--fixtures <dir>] [--memory]"; exit 2; }
while [ $# -gt 0 ]; do
    case "$1" in
        --no-data) REFRESH=0 ;;
        --memory) MEMORY=1 ;;
        --allow-number-changes) NUMBERS=--allow-number-changes ;;
        --old) [ $# -ge 2 ] || usage; OLD=$(readlink -f "$2"); shift ;;
        --env-file) [ $# -ge 2 ] || usage; ENV_FILE=$(readlink -f "$2"); shift ;;
        --fixtures) [ $# -ge 2 ] || usage; FIXTURES=$(readlink -f "$2"); REFRESH=0; shift ;;
        *) usage ;;
    esac
    shift
done

NODE=$(command -v node) || { echo "rehearsal: no node here"; exit 2; }
ROOT=0; [ "$(id -u)" = 0 ] && ROOT=1
cd "$REL" || exit 2   # (somewhere the app's user may stand)
if [ $ROOT = 0 ] && { [ -z "$FIXTURES" ] || [ $MEMORY = 0 ]; }; then echo "rehearsal: run it as root (only --fixtures with --memory runs without)"; exit 2; fi
[ "$(readlink -f "$OLD")" != "$REL" ] || { echo "rehearsal: the old version and the release under test are the same folder"; exit 2; }
for f in "$REL/deploy/vps/rehearse.mjs" "$REL/src/game.js" "$REL/api/index.js" "$OLD/src/game.js" "$OLD/test/api.test.cjs"; do
    [ -e "$f" ] || { echo "rehearsal: a file is missing: $f"; exit 2; }
done

WORK=$(mktemp -d "${TMPDIR:-/tmp}/fi-rehearse.XXXXXX") || exit 2
TEST_DB=fantasyidle_rehearse_$$
TEST_DB_OLD=${TEST_DB}_old
DB_MADE=0
pg() { (cd /tmp && runuser -u postgres -- "$@"); }
dropdbs() {
    for db in "$TEST_DB" "$TEST_DB_OLD"; do
        pg dropdb --if-exists --force "$db" >/dev/null 2>&1 || pg dropdb --if-exists "$db" >/dev/null 2>&1 \
            || echo "rehearsal: the throwaway database $db could not be dropped: drop it by hand"
    done
}
cleanup() {
    [ $DB_MADE = 0 ] || dropdbs
    rm -rf "$WORK"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

# the app's user runs the checks, with nothing of root's environment; the database settings are read from the settings file
app() {
    if [ $ROOT = 1 ]; then runuser -u fantasyidle -- env -i HOME=/srv/fantasyidle PATH=/usr/bin:/bin "$@"
    else env -i HOME="$HOME" PATH="$PATH" "$@"; fi
}
if [ $ROOT = 1 ]; then
    chown fantasyidle: "$WORK"
    for f in "$OLD/src/game.js" "$OLD/test/api.test.cjs" "$REL/src/game.js" "$ENV_FILE"; do
        app test -r "$f" || { echo "rehearsal: the app's user can't read $f"; exit 2; }
    done
fi
rehearse() { app "$NODE" --no-warnings "$REL/deploy/vps/rehearse.mjs" "$@" 2>"$WORK/stderr"; }

echo "Rehearsal of $(basename "$REL") against the old game $(basename "$OLD")"
if [ $REFRESH = 1 ]; then
    if out=$(bash "$HERE/staging-setup.sh" data 2>&1); then
        printf '%s\n' "$out" | grep -E '^staging data: [A-Za-z0-9._-]+$' || echo "staging data: refreshed"
    else
        echo "rehearsal: the data refresh failed (exit $?)"; exit 2
    fi
else
    echo "staging data: as it stands, not refreshed"
fi

FAILED=''
note() { # a step's exit: 0 fine, 1 a check failed, anything else it could not run
    case "$2" in
        0) ;;
        1) FAILED="$FAILED, $1" ;;
        *) echo "rehearsal: $1 could not run (exit $2)"; FAILED="$FAILED, $1 (did not run)" ;;
    esac
}

SOURCE=(--env-file "$ENV_FILE"); [ -n "$FIXTURES" ] && SOURCE=(--fixtures "$FIXTURES")
rehearse checks --old "$OLD" "${SOURCE[@]}" ${NUMBERS:+"$NUMBERS"}; note "the checks" $?

mkdir "$WORK/api"; [ $ROOT = 0 ] || chown fantasyidle: "$WORK/api"
if [ $MEMORY = 1 ]; then
    rehearse api-tests --old "$OLD" --memory --work "$WORK/api"; note "the API tests" $?
else
    DB_MADE=1
    dropdbs >/dev/null   # (nothing of another run's under these names)
    if pg createdb -O fantasyidle "$TEST_DB" >/dev/null 2>&1 && pg createdb -O fantasyidle "$TEST_DB_OLD" >/dev/null 2>&1; then
        rehearse api-tests --old "$OLD" --env-file "$ENV_FILE" --database "$TEST_DB" --old-database "$TEST_DB_OLD" --work "$WORK/api"; note "the API tests" $?
    else
        note "the API tests" 2
    fi
fi

if [ -z "$FAILED" ]; then echo "REHEARSAL PASSED"; exit 0; fi
echo "REHEARSAL FAILED: ${FAILED#, }"
exit 1
