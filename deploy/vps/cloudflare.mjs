#!/usr/bin/env node
// Points fantasyidle.com at the server and sets up HTTPS on Cloudflare (README "The server"):
// - an origin certificate for the server (Cloudflare's, fifteen years), its key made there and never leaving it;
// - the DNS records: the game, www and the wiki, all through Cloudflare's proxy;
// - SSL "Full (strict)", Always Use HTTPS, TLS 1.2 at least, and the server's own caching headers respected.
// Running it again changes only what isn't right yet. The token (fantasyidle.com only: DNS, SSL and Certificates,
// Zone Settings; made by the owner) is read from ~/.config/fantasyidle/cloudflare-token and never printed.
//   node deploy/vps/cloudflare.mjs
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';

const IP = process.env.FANTASYIDLE_IP || '75.127.4.7';
const DOMAIN = 'fantasyidle.com';
const API = 'https://api.cloudflare.com/client/v4';
const token = readFileSync(`${homedir()}/.config/fantasyidle/cloudflare-token`, 'utf8').trim();

async function cf(path, { method = 'GET', body } = {}) {
    const res = await fetch(API + path, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!data.success) throw new Error(`${method} ${path}: ${(data.errors || []).map(e => e.message).join('; ') || res.status}`);
    return data.result;
}

const ssh = (command, input) => execFileSync('ssh', ['-i', `${homedir()}/.ssh/fantasyidle_ed25519`, '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes',
    '-o', `UserKnownHostsFile=${homedir()}/.ssh/known_hosts_fantasyidle`, '-o', 'StrictHostKeyChecking=yes', `root@${IP}`, command], { input, encoding: 'utf8' });

const [zone] = await cf(`/zones?name=${DOMAIN}`);
if (!zone) throw new Error(`the token sees no zone ${DOMAIN}`);

// 1. the origin certificate: a new one only when there is none, or it runs out within 30 days
const current = ssh('test -s /etc/ssl/fantasyidle/origin.pem && openssl x509 -checkend 2592000 -noout -in /etc/ssl/fantasyidle/origin.pem >/dev/null && echo ok || echo none').trim();
if (current === 'ok') console.log('origin certificate: in place');
else {
    // the key is written on the server; only the request (public) comes back here
    const csr = ssh(`set -e; install -d -m 0700 /etc/ssl/fantasyidle; cd /etc/ssl/fantasyidle; umask 077
        openssl req -new -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -keyout origin.key.new -subj "/CN=${DOMAIN}" 2>/dev/null`);
    const cert = await cf('/certificates', { method: 'POST', body: { hostnames: [DOMAIN, `*.${DOMAIN}`], requested_validity: 5475, request_type: 'origin-ecc', csr } });
    ssh('set -e; cd /etc/ssl/fantasyidle; umask 077; cat > origin.pem.new; mv origin.key.new origin.key; mv origin.pem.new origin.pem; chmod 600 origin.key; chmod 644 origin.pem', cert.certificate);
    console.log(`origin certificate: issued, until ${cert.expires_on}`);
}

// 2. the DNS records, through Cloudflare's proxy
const want = [
    { type: 'A', name: DOMAIN, content: IP },
    { type: 'CNAME', name: `www.${DOMAIN}`, content: DOMAIN },
    { type: 'A', name: `wiki.${DOMAIN}`, content: IP }
];
const records = await cf(`/zones/${zone.id}/dns_records?per_page=100`);
for (const w of want) {
    const body = { ...w, proxied: true, ttl: 1, comment: 'the fantasyidle.com server (deploy/vps/cloudflare.mjs)' };
    const found = records.find(r => r.name === w.name && ['A', 'AAAA', 'CNAME'].includes(r.type));
    if (!found) { await cf(`/zones/${zone.id}/dns_records`, { method: 'POST', body }); console.log(`DNS ${w.name}: added`); }
    else if (found.type !== w.type || found.content !== w.content || !found.proxied) { await cf(`/zones/${zone.id}/dns_records/${found.id}`, { method: 'PUT', body }); console.log(`DNS ${w.name}: corrected`); }
    else console.log(`DNS ${w.name}: in place`);
}

// 3. HTTPS: Cloudflare to the server checked against the origin certificate, visitors always on HTTPS
// and browsers keep the server's own word on caching (its default, 4 hours, held players on old files after a deploy)
for (const [setting, value] of [['ssl', 'strict'], ['always_use_https', 'on'], ['min_tls_version', '1.2'], ['browser_cache_ttl', 0]]) {
    const now = await cf(`/zones/${zone.id}/settings/${setting}`);
    if (now.value === value) console.log(`${setting}: ${value}`);
    else { await cf(`/zones/${zone.id}/settings/${setting}`, { method: 'PATCH', body: { value } }); console.log(`${setting}: ${now.value} -> ${value}`); }
}
