const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sql } = require('./database');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_fantasy_key_123';

const authenticateToken = (req, res, next) => {
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
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    try {
        const hash = await bcrypt.hash(password, 10);
        // Postgres returns rows
        const { rows } = await sql`
            INSERT INTO users (username, password_hash)
            VALUES (${username}, ${hash})
            RETURNING id;
        `;
        
        const token = jwt.sign({ id: rows[0].id, username }, JWT_SECRET);
        res.json({ token, message: 'Registration successful' });
    } catch (err) {
        if (err.code === '23505') { // Postgres unique violation code
            return res.status(400).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: 'Internal server error: ' + err.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const { rows } = await sql`SELECT * FROM users WHERE username = ${username}`;
        if (rows.length === 0) return res.status(400).json({ error: 'Invalid credentials' });

        const user = rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
        res.json({ token, gameState: user.game_state, message: 'Login successful' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/save', authenticateToken, async (req, res) => {
    const gameStateRaw = req.body.state;
    if (!gameStateRaw) return res.status(400).json({ error: 'No state provided' });

    try {
        const gameStateStr = JSON.stringify(gameStateRaw);
        await sql`
            UPDATE users 
            SET game_state = ${gameStateStr}, last_saved = ${Date.now()}
            WHERE id = ${req.user.id};
        `;
        res.json({ success: true, timestamp: Date.now() });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save game state' });
    }
});

app.get('/api/load', authenticateToken, async (req, res) => {
    try {
        const { rows } = await sql`SELECT game_state, last_saved FROM users WHERE id = ${req.user.id}`;
        if (rows.length === 0 || !rows[0].game_state) return res.json({ state: null });
        
        // Postgres returns BIGINT as strings often due to JS precision bounds, parseInt handles it.
        res.json({ state: JSON.parse(rows[0].game_state), lastSaved: parseInt(rows[0].last_saved) });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load game state' });
    }
});

// VERY IMPORTANT FOR VERCEL
module.exports = app;
