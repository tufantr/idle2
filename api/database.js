// The Postgres connection: Neon, added to the Vercel project from its Storage tab (README "The API").
// The integration names its pooled connection string DATABASE_URL, and POSTGRES_URL for older
// templates; either works. The pool is made on the first query, so an API with no database yet
// answers "Database unavailable" instead of failing to load. The schema is created by
// store.ensureSchema() on an instance's first request.
const { createPool } = require('@vercel/postgres');

let pool = null;

function sql(strings, ...values) {
    pool ||= createPool({ connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL || undefined });
    return pool.sql(strings, ...values);
}

module.exports = { sql };
