// The Postgres connection. Vercel Postgres reads its connection string from the environment
// (POSTGRES_URL); the schema is created by store.ensureSchema() on an instance's first request.
const { sql } = require('@vercel/postgres');

module.exports = { sql };
