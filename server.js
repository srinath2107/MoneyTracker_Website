const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// SQLite Database Setup
const db = new sqlite3.Database(process.env.DB_PATH || './money_tracker.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize Database Tables
function initializeDatabase() {
    db.serialize(() => {
        // Create Users Table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create Expenses Table
        db.run(`
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                expense_type TEXT NOT NULL DEFAULT '',
                date TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `, () => {
            db.all("PRAGMA table_info(expenses)", [], (err, rows) => {
                if (!err && rows && !rows.some(col => col.name === 'expense_type')) {
                    db.run(`ALTER TABLE expenses ADD COLUMN expense_type TEXT NOT NULL DEFAULT ''`);
                }
            });
        });
    });
}

// Helper function to run queries with promises
const runQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

const getQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const allQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(403).json({ message: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid token' });
        }
        req.userId = decoded.id;
        req.username = decoded.username;
        next();
    });
};

// ========== AUTHENTICATION ROUTES ==========

// Register Route
app.post('/api/auth/register', async (req, res) => {
    const { username, password, confirmPassword } = req.body;

    if (!username || !password || !confirmPassword) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    try {
        // Check if user already exists
        const existingUser = await getQuery('SELECT username FROM users WHERE username = ?', [username]);
        
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        // Hash password
        const hashedPassword = await bcryptjs.hash(password, 8);

        // Insert user into database
        await runQuery('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);

        return res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        const user = await getQuery('SELECT id, username, password FROM users WHERE username = ?', [username]);

        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const isPasswordValid = await bcryptjs.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        // Generate JWT token
        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
            expiresIn: '7d'
        });

        return res.status(200).json({
            message: 'Login successful',
            token,
            user: { id: user.id, username: user.username }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ========== EXPENSE ROUTES ==========

// Add Expense
app.post('/api/expenses', verifyToken, async (req, res) => {
    const { amount, date, expense_type } = req.body;
    const userId = req.userId;

    if (!amount || !date || !expense_type) {
        return res.status(400).json({ message: 'Amount, type, and date are required' });
    }

    try {
        await runQuery('INSERT INTO expenses (user_id, amount, expense_type, date) VALUES (?, ?, ?, ?)', 
            [userId, amount, expense_type, date]);

        return res.status(201).json({ message: 'Expense added successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get Expenses
app.get('/api/expenses', verifyToken, async (req, res) => {
    const userId = req.userId;

    try {
        const expenses = await allQuery(
            'SELECT id, amount, expense_type, date FROM expenses WHERE user_id = ? ORDER BY date DESC',
            [userId]
        );

        return res.status(200).json({ expenses });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete Expense
app.delete('/api/expenses/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;

    try {
        const result = await runQuery(
            'DELETE FROM expenses WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        return res.status(200).json({ message: 'Expense deleted successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Serve index.html for any non-API route (SPA routing support)
// Redirect root to login page and serve auth pages individually
app.get('/', (req, res) => {
    return res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

// Serve the dashboard explicitly at /dashboard only
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// This file is no longer used for routing but remains for backup if needed.


// Any other non-API route -> redirect to login
app.get('*', (req, res) => {
    return res.redirect('/login');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
