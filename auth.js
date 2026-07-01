function getStoredUsers() {
    try {
        return JSON.parse(localStorage.getItem('moneyTrackerUsers') || '[]');
    } catch (error) {
        return [];
    }
}

function saveStoredUsers(users) {
    localStorage.setItem('moneyTrackerUsers', JSON.stringify(users));
}

function getStoredExpenses() {
    try {
        return JSON.parse(localStorage.getItem('moneyTrackerExpenses') || '{}');
    } catch (error) {
        return {};
    }
}

function saveStoredExpenses(expensesByUser) {
    localStorage.setItem('moneyTrackerExpenses', JSON.stringify(expensesByUser));
}

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'money-tracker-static');
    const buffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buffer)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function showAuthMessage(msg, type) {
    const el = document.getElementById('authMessage');
    if (!el) return;
    el.textContent = msg;
    el.className = 'auth-message ' + (type || '');
    el.style.display = 'block';
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        showAuthMessage('Please enter both username and password.', 'error');
        return;
    }

    try {
        const users = getStoredUsers();
        const existingUser = users.find(user => user.username.toLowerCase() === username.toLowerCase());
        const passwordHash = await hashPassword(password);

        if (!existingUser || existingUser.passwordHash !== passwordHash) {
            showAuthMessage('Invalid username or password.', 'error');
            return;
        }

        localStorage.setItem('token', 'local');
        localStorage.setItem('user', JSON.stringify({ id: existingUser.id, username: existingUser.username }));
        window.location.href = './index.html#dashboard';
    } catch (err) {
        showAuthMessage('Unable to log in right now.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    if (!username || !password || !confirmPassword) {
        showAuthMessage('Please fill in all fields.', 'error');
        return;
    }

    if (password.length < 6) {
        showAuthMessage('Password must be at least 6 characters.', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showAuthMessage('Passwords do not match.', 'error');
        return;
    }

    try {
        const users = getStoredUsers();
        if (users.some(user => user.username.toLowerCase() === username.toLowerCase())) {
            showAuthMessage('Username already exists.', 'error');
            return;
        }

        const passwordHash = await hashPassword(password);
        users.push({ id: Date.now(), username, passwordHash });
        saveStoredUsers(users);

        const expensesByUser = getStoredExpenses();
        expensesByUser[username] = [];
        saveStoredExpenses(expensesByUser);

        showAuthMessage('Registration successful! Redirecting to login...', 'success');
        setTimeout(() => { window.location.href = './index.html#login'; }, 1200);
    } catch (err) {
        showAuthMessage('Unable to register right now.', 'error');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
});