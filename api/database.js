// The Postgres connection. On the fantasyidle.com server (a VPS since October 2026, deploy/vps/) it is a local
// PostgreSQL reached through `pg`; on Vercel it was Neon, added from the project's Storage tab, reached through
// @vercel/postgres (README "The API"). DATABASE_URL (or POSTGRES_URL, for older Vercel templates) says which: a
// Neon address takes @vercel/postgres, any other one `pg`. Both give the same tagged template, sql`...${v}...`
// -> { rows }, as the tests' real-Postgres mode does (test/api.test.cjs). The pool is made on the first query,
// so an API with no database yet answers "Database unavailable" instead of failing to load. The schema is
// created by store.ensureSchema() on an instance's first request.

let query = null;
let madeFor = null;

const isNeon = url => /\.neon\.tech\b|vercel-storage\.com/i.test(url);

function connect(url) {
    if (!url) throw new Error('No database: set DATABASE_URL (or POSTGRES_URL) to a Postgres connection string');
    if (!isNeon(url)) {
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: url, max: 10 });
        pool.on('error', err => console.error('database pool:', err.message));   // an idle client dropped: the next query reconnects
        return (strings, values) => pool.query(strings.reduce((text, part, i) => text + '$' + i + part), values);
    }
    const { createPool } = require('@vercel/postgres');
    const pool = createPool({ connectionString: url });
    return (strings, values) => pool.sql(strings, ...values);
}

function sql(strings, ...values) {
    const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
    if (!query || madeFor !== url) { query = connect(url); madeFor = url; }
    return query(strings, values);
}

module.exports = { sql };
