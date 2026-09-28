const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sql } = require('./database');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// No hard-coded fallback in production: a known secret would let anyone forge tokens.
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-only-insecure-secret');
const TOKEN_TTL = '30d';
const USERNAME_RE = /^[A-Za-z0-9_-]{3,24}$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72; // bcrypt only uses the first 72 bytes
const MAX_SAVE_VERSION = 2;

function requireSecret(res) {
    if (JWT_SECRET) return true;
    res.status(500).json({ error: 'Server misconfigured: JWT_SECRET is not set.' });
    return false;
}

function signToken(user) {
    return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function validateCredentials(body) {
    const { username, password } = body || {};
    if (typeof username !== 'string' || !USERNAME_RE.test(username)) return 'Username must be 3-24 letters, numbers, _ or -.';
    if (typeof password !== 'string' || password.length < MIN_PASSWORD || Buffer.byteLength(password) > MAX_PASSWORD) {
        return `Password must be ${MIN_PASSWORD}-${MAX_PASSWORD} characters.`;
    }
    return null;
}

const authenticateToken = (req, res, next) => {
    if (!requireSecret(res)) return;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

app.post('/api/register', async (req, res) => {
    if (!requireSecret(res)) return;
    const invalid = validateCredentials(req.body);
    if (invalid) return res.status(400).json({ error: invalid });
    const { username, password } = req.body;

    try {
        const hash = await bcrypt.hash(password, 10);
        const { rows } = await sql`
            INSERT INTO users (username, password_hash)
            VALUES (${username}, ${hash})
            RETURNING id;
        `;
        res.json({ token: signToken({ id: rows[0].id, username }), message: 'Registration successful' });
    } catch (err) {
        if (err.code === '23505') { // Postgres unique violation
            return res.status(400).json({ error: 'Username already exists' });
        }
        console.error('register failed', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/login', async (req, res) => {
    if (!requireSecret(res)) return;
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') return res.status(400).json({ error: 'Invalid credentials' });
    try {
        const { rows } = await sql`SELECT id, username, password_hash FROM users WHERE username = ${username}`;
        if (rows.length === 0) return res.status(400).json({ error: 'Invalid credentials' });

        const user = rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

        res.json({ token: signToken(user), message: 'Login successful' });
    } catch (err) {
        console.error('login failed', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/save', authenticateToken, async (req, res) => {
    const state = req.body && req.body.state;
    if (!state || typeof state !== 'object' || Array.isArray(state)) return res.status(400).json({ error: 'No state provided' });
    if (!Number.isInteger(state.version) || state.version < 1 || state.version > MAX_SAVE_VERSION) {
        return res.status(400).json({ error: 'Unsupported save version' });
    }

    try {
        const savedAt = Date.now();
        await sql`
            UPDATE users
            SET game_state = ${JSON.stringify(state)}, last_saved = ${savedAt}
            WHERE id = ${req.user.id};
        `;
        res.json({ success: true, timestamp: savedAt });
    } catch (err) {
        console.error('save failed', err);
        res.status(500).json({ error: 'Failed to save game state' });
    }
});

app.get('/api/load', authenticateToken, async (req, res) => {
    try {
        const { rows } = await sql`SELECT game_state, last_saved FROM users WHERE id = ${req.user.id}`;
        if (rows.length === 0 || !rows[0].game_state) return res.json({ state: null });

        // Postgres returns BIGINT as a string; parseInt handles it.
        res.json({ state: JSON.parse(rows[0].game_state), lastSaved: parseInt(rows[0].last_saved, 10) });
    } catch (err) {
        console.error('load failed', err);
        res.status(500).json({ error: 'Failed to load game state' });
    }
});

// VERY IMPORTANT FOR VERCEL
module.exports = app;
