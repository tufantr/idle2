const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_fantasy_key_123';

// Auth Middleware
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

// Register
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    try {
        const hash = await bcrypt.hash(password, 10);
        const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
        const info = stmt.run(username, hash);
        
        const token = jwt.sign({ id: info.lastInsertRowid, username }, JWT_SECRET);
        res.json({ token, message: 'Registration successful' });
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
        const user = stmt.get(username);

        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
        res.json({ token, gameState: user.game_state, message: 'Login successful' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Save Game
app.post('/api/save', authenticateToken, (req, res) => {
    const gameStateRaw = req.body.state;
    if (!gameStateRaw) return res.status(400).json({ error: 'No state provided' });

    try {
        const gameStateStr = JSON.stringify(gameStateRaw);
        const stmt = db.prepare('UPDATE users SET game_state = ?, last_saved = ? WHERE id = ?');
        stmt.run(gameStateStr, Date.now(), req.user.id);
        res.json({ success: true, timestamp: Date.now() });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save game state' });
    }
});

// Load Game
app.get('/api/load', authenticateToken, (req, res) => {
    try {
        const stmt = db.prepare('SELECT game_state, last_saved FROM users WHERE id = ?');
        const user = stmt.get(req.user.id);
        if (!user || !user.game_state) return res.json({ state: null });
        
        res.json({ state: JSON.parse(user.game_state), lastSaved: user.last_saved });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load game state' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
