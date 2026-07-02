require('dotenv').config(); // Loads variables from your .env file
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(express.json()); // Allows the server to accept JSON data
app.use(express.urlencoded({ extended: true }));

// Serve your static frontend files (HTML, CSS, JS) from the root directory
app.use(express.static(__dirname)); 

// ==========================================
// DATABASE CONNECTION
// ==========================================
// Connects to your existing SQLite database
const db = new sqlite3.Database('./money_tracker.db', (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Optional: Ensure tables exist if you haven't created them yet
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            text TEXT,
            amount REAL,
            type TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);
    }
});

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// Register a new user
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
            if (err) return res.status(400).json({ error: 'Username already exists' });
            res.status(201).json({ message: 'User registered successfully!' });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Login user
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

        // Create a token to keep the user logged in
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'fallback_secret_key', { expiresIn: '1h' });
        // Add username to the response
res.json({ message: 'Logged in successfully', token: token, username: user.username });
    });
});

// Middleware to verify if a user is logged in before they can add/view money
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided' });

    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET || 'fallback_secret_key', (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Unauthorized' });
        req.userId = decoded.id; // Attach the user ID to the request
        next();
    });
};

// ==========================================
// TRANSACTION ROUTES (Protected)
// ==========================================

// Get all transactions for the logged-in user
// Serve the main index/redirect on the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve the login page for clean URLs
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Serve the registration page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

// Serve the dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Add a new transaction
app.post('/api/transactions', verifyToken, (req, res) => {
    const { text, amount, type } = req.body;
    db.run('INSERT INTO transactions (user_id, text, amount, type) VALUES (?, ?, ?, ?)', 
        [req.userId, text, amount, type], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: this.lastID, text, amount, type });
    });
});

// Delete a transaction
app.delete('/api/transactions/:id', verifyToken, (req, res) => {
    const transactionId = req.params.id;
    db.run('DELETE FROM transactions WHERE id = ? AND user_id = ?', [transactionId, req.userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Transaction deleted' });
    });
});

// ==========================================
// START SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});