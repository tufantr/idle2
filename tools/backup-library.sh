#!/bin/bash
# The owner's library of project backups, on their Google Drive (mounted by CloudMounter).
# Every run adds one new, complete, dated folder; a folder already there is never changed or replaced.
#
#   tools/backup-library.sh make             # builds a new entry, proves it locally, copies it to the Drive folder
#   tools/backup-library.sh uploaded <name>  # exits 0 once every file of the entry has reached Google
#   tools/backup-library.sh prove <name>     # drops the Mac's copies, downloads the entry from Google, checks every file
#
# Settings, from the environment: FI_WORK (where to build; a new temp folder if unset), FI_SCRATCH (working files to
# include), FI_EXTRA (a folder of files to include as report-doc/). Tracked files come from git's history, never from
# the working tree, so nothing waits on iCloud for them.
set -uo pipefail
die() { echo "STOPPED: $*" >&2; exit 1; }
say() { echo "== $*"; }

REPO=${FI_REPO:-$HOME/Documents/idle2}
DRIVE=${FI_DRIVE:-$HOME/Library/CloudStorage/CloudMounter-googledrive}
LIB="$DRIVE/Fantasy Idle backup"
CONF=$HOME/.config/fantasyidle
KEY=$CONF/backup-key.txt
MAC_DUMPS=$HOME/fantasyidle-backups
NOTES=$HOME/.claude/projects/-Users-tufanakarirmak-Documents-idle2/memory
DUMPS="$DRIVE/fantasyidle-backups"
KEY_NAME=fantasyidle-backup-key.txt

files_of() { find "$1" -type f ! -name .DS_Store -print0; }
drive_state() { fileproviderctl evaluate "$1" 2>&1 | sed -n "s/.*$2 = \([01]\);.*/\1/p" | head -1; }

evict() {   # the Mac's copies go; the files stay on Google
    osascript -l JavaScript - "$@" <<'JS' >/dev/null
ObjC.import('Foundation');
function run(argv) { const fm = $.NSFileManager.defaultManager; for (const p of argv) fm.evictUbiquitousItemAtURLError($.NSURL.fileURLWithPath(p), null); return argv.length; }
JS
}

dump_opens() {   # $1 key, $2 an encrypted dump: its first bytes must be a Postgres dump's
    [ "$(age -d -i "$1" "$2" 2>/dev/null | head -c 5)" = PGDMP ]
}

scan_secrets() {   # nothing secret may ride along in what is packed
    local bad=0 t tok k='KEY-' marks   # (spelled in parts, so this script doesn't match itself)
    marks="AGE-SECRET-$k|PRIVATE $k----"
    for t in "$@"; do [ -e "$t" ] || continue
        grep -rIlF -f "$CONF/cloudflare-token" --exclude-dir=node_modules "$t" 2>/dev/null && bad=1
        tok=$(sed -E 's/.*\/([A-Za-z0-9_-]{16,}).*/\1/' "$CONF/staging-link.txt")
        grep -rIlF -- "$tok" --exclude-dir=node_modules "$t" 2>/dev/null && bad=1
        grep -rIlE "$marks" --exclude-dir=node_modules "$t" 2>/dev/null && bad=1
    done
    [ $bad = 0 ]
}

make_entry() {
    [ -d "$DRIVE" ] || die "CloudMounter's Google Drive is not mounted"
    mkdir -p "$LIB" || die "cannot make the library folder"
    local stamp name n=2 base out head patch
    stamp=$(date +%F); name=$stamp
    while [ -e "$LIB/$name" ]; do name="$stamp-$n"; n=$((n + 1)); done
    base=${FI_WORK:-$(mktemp -d)}; out="$base/$name"; mkdir -p "$out" || die "no work folder"
    say "entry $name, built in $out"
    head=$(git -C "$REPO" rev-parse --short HEAD); patch=$(git -C "$REPO" rev-parse --short build/r1-r25 2>/dev/null || echo "$head")

    say "the git history"
    git -C "$REPO" bundle create "$out/idle2-git-all-branches.bundle" --all 2>/dev/null || die "bundle failed"
    git -C "$REPO" bundle verify "$out/idle2-git-all-branches.bundle" >/dev/null 2>&1 || die "bundle does not verify"   # (inside a repository: run from anywhere else it always failed)
    rm -rf "$base/mirror"; git clone -q --mirror "$out/idle2-git-all-branches.bundle" "$base/mirror" || die "bundle does not restore"
    local want got; want=$(git -C "$REPO" for-each-ref | wc -l | tr -d ' '); got=$(git -C "$base/mirror" for-each-ref | wc -l | tr -d ' ')
    [ "$want" = "$got" ] || die "bundle restored $got refs of $want"
    git -C "$base/mirror" fsck --no-progress >/dev/null 2>&1 || die "restored history fails fsck"
    rm -rf "$base/mirror"; say "  $got refs restored and checked"

    say "plain copies of the files"
    git -C "$REPO" archive --format=zip -o "$out/idle2-files-$head.zip" HEAD || die "zip failed"
    [ "$patch" = "$head" ] || git -C "$REPO" archive --format=zip -o "$out/idle2-patch-files-$patch.zip" build/r1-r25 || die "patch zip failed"

    say "what git never held"
    local keep=(); for p in art .claude/launch.json runs; do [ -e "$REPO/$p" ] && keep+=("$p"); done
    tar -C "$REPO" -cf "$out/idle2-not-in-git.tar" --exclude .DS_Store "${keep[@]}" || die "tar failed"
    rm -rf "$base/check"; mkdir -p "$base/check"; tar -xf "$out/idle2-not-in-git.tar" -C "$base/check" || die "untar failed"
    for p in "${keep[@]}"; do diff -rq --exclude .DS_Store "$REPO/$p" "$base/check/$p" >/dev/null || die "$p differs from its copy"; done
    rm -rf "$base/check"

    say "the database copies"
    [ -d "$MAC_DUMPS" ] && tar -C "$(dirname "$MAC_DUMPS")" -cf "$out/fantasyidle-backups-from-mac.tar" --exclude .DS_Store "$(basename "$MAC_DUMPS")"
    tar -C "$DRIVE" -cf "$out/database-copies-from-drive.tar" --exclude .DS_Store fantasyidle-backups/nightly fantasyidle-backups/monthly || die "cannot read the database copies on Drive"
    local newest; newest=$(ls "$DUMPS/nightly" | grep "^fantasyidle-" | sort | tail -1)
    dump_opens "$KEY" "$DUMPS/nightly/$newest" || die "the backup key does not open $newest"
    say "  newest $newest opens with the key"

    say "notes and working files"
    tar -C "$(dirname "$NOTES")" -czf "$out/claude-memory-notes.tar.gz" --exclude .DS_Store "$(basename "$NOTES")" || die "notes failed"
    local scan=("$NOTES" "$REPO/runs" "$REPO/.claude/launch.json")
    if [ -n "${FI_SCRATCH:-}" ]; then
        tar -C "$FI_SCRATCH" -czf "$out/scratch-work.tar.gz" --exclude .DS_Store --exclude node_modules --exclude 'wt-*' --exclude 'lib-work*' --exclude drive-backup \
            --exclude focus-wiki --exclude live --exclude proto --exclude report-export . || die "scratch failed"
        for p in "$FI_SCRATCH"/*; do case "$(basename "$p")" in wt-*|node_modules|lib-work*|drive-backup|focus-wiki|live|proto|report-export) ;; *) scan+=("$p") ;; esac; done
    fi
    if [ -n "${FI_EXTRA:-}" ]; then mkdir -p "$out/report-doc"; cp "$FI_EXTRA"/* "$out/report-doc/" || die "extra failed"; scan+=("$FI_EXTRA"); fi
    scan_secrets "${scan[@]}" || die "a secret was found in what is being packed (files above)"
    say "  no secret in anything packed"

    cat > "$out/README.txt" <<EOF
Fantasy Idle: one full backup of the project, made $(date '+%-d %B %Y, %H:%M')

This folder is one entry of the library. It is never changed or replaced; a later backup is a new folder beside it.

WHAT IS HERE
  idle2-git-all-branches.bundle       The whole git history: every branch and tag, the patch's build branches and the
                                      save-point tag pre-patch-8a53d4d among them. The one that matters most.
  idle2-files-$head.zip            The project's files on the working branch (commit $head), to open without git.
  idle2-patch-files-$patch.zip      The same for the patch in progress, build/r1-r25 (commit $patch).
  idle2-not-in-git.tar                What git never held: the source paintings (art/), the preview settings and the simulator's runs.
  fantasyidle-backups-from-mac.tar    The Mac's ~/fantasyidle-backups: the pre-patch database dump (encrypted), the itch.io page's copy, the before-pictures.
  database-copies-from-drive.tar      Every nightly and monthly database copy on the Drive that day (encrypted), kept here beyond their rotation.
  claude-memory-notes.tar.gz          Claude's notes on this project.
  scratch-work.tar.gz                 Claude's working files that are not in git.
  report-doc/                         The report "Fantasy Idle: what to build next" and its build plan, as Markdown.
  SHA256SUMS.txt                      "shasum -a 256 -c SHA256SUMS.txt" here says whether every file is whole.

THE KEY
  ../keys/$KEY_NAME opens the encrypted database copies:
      age -d -i $KEY_NAME <file>.dump.age > <file>.dump

TO BRING THE PROJECT BACK ON ANOTHER COMPUTER
  1. git clone idle2-git-all-branches.bundle idle2      (the same history is also on GitHub: tufantr/idle2)
  2. cd idle2
     git remote set-url origin https://github.com/tufantr/idle2.git
     git checkout claude/intelligent-einstein-y5i5iq
  3. tar -xf ../idle2-not-in-git.tar                    (puts back art/, .claude/launch.json and runs/)
  4. Claude's notes: unpack claude-memory-notes.tar.gz into ~/.claude/projects/<the project's folder>/
  5. node --test test/*.test.mjs test/*.test.cjs        (checks that everything works)

NOT HERE
  The server's SSH key, the Cloudflare token and rclone's settings: they stay on the Mac. node_modules and the built wiki
  come back with one command each.
EOF
    (cd "$out" && find . -type f ! -name SHA256SUMS.txt ! -name .DS_Store | sed 's|^\./||' | sort | while IFS= read -r f; do shasum -a 256 "$f"; done > SHA256SUMS.txt) || die "checksums failed"

    say "copying to the Drive"
    [ ! -e "$LIB/$name" ] || die "$name appeared meanwhile"
    mkdir "$LIB/$name" && cp -X -R "$out/" "$LIB/$name/" || die "copy to the Drive failed"
    (cd "$LIB/$name" && shasum -a 256 -c SHA256SUMS.txt >/dev/null 2>&1) || die "the copy on the Drive folder does not match"

    mkdir -p "$LIB/keys"
    if [ ! -e "$LIB/keys/$KEY_NAME" ]; then
        cp -X "$KEY" "$LIB/keys/$KEY_NAME" || die "key copy failed"
        cat > "$LIB/keys/README.txt" <<EOF
$KEY_NAME is the private key that opens the encrypted database backups (fantasyidle-backups and the
database copies in each library entry). Anyone holding it can read them, so never share this folder.
To use it:  age -d -i $KEY_NAME <file>.dump.age > <file>.dump     (age: https://age-encryption.org)
EOF
    else cmp -s "$KEY" "$LIB/keys/$KEY_NAME" || die "the key on the Drive differs from the Mac's: nothing replaced"; fi

    {
        echo "Fantasy Idle: the backup library"
        echo
        echo "Each dated folder is one complete backup of the project and its own README says how to restore it."
        echo "Folders are never changed or replaced: a new backup is always a new folder. keys/ holds the database backup key."
        echo
        for d in "$LIB"/20*/; do
            local total=0 count=0 s
            while IFS= read -r -d '' f; do s=$(stat -f%z "$f"); total=$((total + s)); count=$((count + 1)); done < <(files_of "$d")
            printf '  %-14s %3d files  %4d MB\n' "$(basename "$d")" "$count" "$((total / 1000000))"
        done
    } > "$LIB/LIBRARY.txt"
    say "made $name ($(du -sh "$out" | cut -f1)); uploading in the background"
    echo "$name" > "$base/last-entry"
}

uploaded() {
    local bad=0 f
    while IFS= read -r -d '' f; do [ "$(drive_state "$f" isUploaded)" = 1 ] || { bad=1; echo "waiting: ${f#"$LIB"/}"; }; done < <(files_of "$LIB/$1"; files_of "$LIB/keys"; printf '%s\0' "$LIB/LIBRARY.txt")
    return $bad
}

prove() {
    local name=$1 f list=()
    while IFS= read -r -d '' f; do list+=("$f"); done < <(files_of "$LIB/$name"; files_of "$LIB/keys")
    evict "${list[@]}"; sleep 3
    local still=0; for f in "${list[@]}"; do [ "$(drive_state "$f" isDownloaded)" = 0 ] || still=$((still + 1)); done
    say "$((${#list[@]} - still)) of ${#list[@]} files are now on Google only; reading them back"
    (cd "$LIB/$name" && shasum -a 256 -c SHA256SUMS.txt) || die "a file came back different"
    cmp -s "$KEY" "$LIB/keys/$KEY_NAME" || die "the key came back different"
    local newest; newest=$(ls "$DUMPS/nightly" | grep "^fantasyidle-" | sort | tail -1)
    dump_opens "$LIB/keys/$KEY_NAME" "$DUMPS/nightly/$newest" || die "the Drive's key does not open $newest"
    say "the Drive's key opens $newest"
    evict "${list[@]}"
    say "proved: $name"
}

case "${1:-}" in
    make) make_entry ;;
    uploaded) uploaded "$2" ;;
    prove) prove "$2" ;;
    *) sed -n 2,9p "$0"; exit 2 ;;
esac
