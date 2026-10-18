#!/usr/bin/env bash
# Sets up the fantasyidle.com server (Ubuntu 24.04, RackNerd, October 2026) once; running it again changes nothing
# that is already right. As root, from a checkout:
#   ssh -i ~/.ssh/fantasyidle_ed25519 root@75.127.4.7 'bash -s' < deploy/vps/provision.sh
# Then deploy/vps/cloudflare.sh (DNS, HTTPS and the origin certificate) and deploy/vps/deploy.sh (the game).
# SSH is keys only (/etc/ssh/sshd_config.d/00-fantasyidle.conf, set by hand with the owner's OK: README "The server").
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

# --- packages, and security updates by themselves from now on
apt-get update -q
apt-get -y -q -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold full-upgrade
apt-get -y -q install unattended-upgrades fail2ban ufw nginx postgresql curl ca-certificates gnupg rsync
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

# --- Node.js 22, from NodeSource's signed apt repository (Ubuntu's own is 18; the API needs 20.19+)
if ! node -v 2>/dev/null | grep -q '^v22\.'; then
    install -d -m 0755 /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
    echo 'deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main' > /etc/apt/sources.list.d/nodesource.list
    apt-get update -q
    apt-get -y -q install nodejs
fi

# --- fail2ban: an address that keeps failing at SSH is shut out for an hour
cat > /etc/fail2ban/jail.d/fantasyidle.local <<'EOF'
[sshd]
enabled = true
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1h
EOF
systemctl enable fail2ban >/dev/null
systemctl restart fail2ban

# --- the firewall: SSH from anywhere; the web only from Cloudflare, so nobody reaches the game around it and the
#     visitor's address Cloudflare reports can be trusted (nginx makes it $remote_addr, below). Cloudflare's ranges
#     change seldom; running this again picks up new ones.
CF4=$(curl -fsSL https://www.cloudflare.com/ips-v4)
CF6=$(curl -fsSL https://www.cloudflare.com/ips-v6)
[ -n "$CF4" ] && [ -n "$CF6" ] || { echo "could not fetch Cloudflare's ranges"; exit 1; }
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow 22/tcp comment ssh >/dev/null
for ip in $CF4 $CF6; do ufw allow proto tcp from "$ip" to any port 80,443 comment cloudflare >/dev/null; done
ufw --force enable >/dev/null
{
    echo "# Cloudflare's ranges (deploy/vps/provision.sh): the visitor's address is the one it reports"
    for ip in $CF4 $CF6; do echo "set_real_ip_from $ip;"; done
    echo "real_ip_header CF-Connecting-IP;"
} > /etc/nginx/conf.d/cloudflare-realip.conf

# --- the app's user, its folders, and its database (reached by its socket: the user is the role, no password)
id fantasyidle >/dev/null 2>&1 || useradd --system --create-home --home-dir /srv/fantasyidle --shell /usr/sbin/nologin fantasyidle
install -d -m 0755 -o fantasyidle -g fantasyidle /srv/fantasyidle /srv/fantasyidle/releases /srv/fantasyidle/wiki /srv/fantasyidle/wiki/releases   # (nginx reads the files: the home useradd makes is private)
install -d -m 0750 -o root -g fantasyidle /etc/fantasyidle
runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_roles WHERE rolname = 'fantasyidle'" | grep -q 1 || runuser -u postgres -- createuser fantasyidle
runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname = 'fantasyidle'" | grep -q 1 || runuser -u postgres -- createdb -O fantasyidle fantasyidle
# the API's settings, made here once: the JWT secret never leaves this machine
if [ ! -f /etc/fantasyidle/api.env ]; then
    umask 077
    {
        echo 'DATABASE_URL=postgresql://fantasyidle@/fantasyidle?host=/var/run/postgresql'
        echo "JWT_SECRET=$(openssl rand -hex 48)"
        echo 'HOST=127.0.0.1'
        echo 'PORT=3000'
        echo 'NODE_ENV=production'
    } > /etc/fantasyidle/api.env
    chown root:fantasyidle /etc/fantasyidle/api.env
    chmod 0640 /etc/fantasyidle/api.env
fi

# --- the nightly database backup: kept 14 days on the server (copies elsewhere: README "The server")
install -d -m 0700 -o postgres -g postgres /var/backups/fantasyidle
cat > /etc/systemd/system/fantasyidle-backup.service <<'EOF'
[Unit]
Description=Fantasy Idle database backup (14 days kept)
After=postgresql.service

[Service]
Type=oneshot
User=postgres
ExecStart=/bin/sh -c 'pg_dump -Fc fantasyidle > /var/backups/fantasyidle/fantasyidle-$(date -u +%%Y-%%m-%%dT%%H%%MZ).dump && find /var/backups/fantasyidle -name "fantasyidle-*.dump" -mtime +14 -delete'
EOF
cat > /etc/systemd/system/fantasyidle-backup.timer <<'EOF'
[Unit]
Description=Fantasy Idle database backup, every night

[Timer]
OnCalendar=*-*-* 03:30:00 UTC
Persistent=true

[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now fantasyidle-backup.timer >/dev/null

echo "provisioned: $(node -v), $(nginx -v 2>&1 | cut -d/ -f2), $(psql --version | cut -d' ' -f3), ufw $(ufw status | head -1 | cut -d: -f2 | xargs)"
