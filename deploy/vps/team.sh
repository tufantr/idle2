#!/usr/bin/env bash
# The team's tool on the server (api/team.js, README "The server"): run as root, it runs the live release's tool as the API's
# user with the API's settings. provision.sh installs it as /usr/local/bin/fantasyidle-team:
#   fantasyidle-team list
#   fantasyidle-team clear 12 --reason "what was wrong"
#   fantasyidle-team rename 12 --reason "what was wrong"
#   fantasyidle-team restore 7 --reason "the appeal was right"
#   fantasyidle-team log
set -euo pipefail
exec runuser -u fantasyidle -- bash -c 'set -a; . /etc/fantasyidle/api.env; set +a; cd /srv/fantasyidle/current && exec node api/team.js "$@"' fantasyidle-team "$@"
