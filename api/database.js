const { sql } = require('@vercel/postgres');

async function initDB() {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                game_state TEXT,
                last_saved BIGINT DEFAULT 0
            );
        `;
        console.log("Postgres connected and Users table verified.");
    } catch (e) {
        console.error("Database initialization skipped or failed (Vercel ENV missing?):", e.message);
    }
}

// Call on boot
initDB();

module.exports = { sql };
