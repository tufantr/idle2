// The API on the fantasyidle.com server: the same Express app Vercel ran (api/index.js), listening on the
// machine itself. nginx serves the game's files and passes /api/ here (deploy/vps/nginx.conf); systemd keeps it
// running (deploy/vps/fantasyidle-api.service), with its settings in /etc/fantasyidle/api.env.
const app = require('../../api/index.js');

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '127.0.0.1';
const server = app.listen(port, host, () => console.log(`Fantasy Idle API on http://${host}:${port}`));

// systemd stops it with SIGTERM: finish the requests under way first
process.on('SIGTERM', () => server.close(() => process.exit(0)));
