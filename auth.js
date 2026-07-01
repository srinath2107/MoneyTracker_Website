const API_URL = (() => {
    const params = new URLSearchParams(window.location.search);
    const configuredApiUrl = params.get('api') || window.__API_URL__ || '';

    if (configuredApiUrl) {
        return configuredApiUrl.replace(/\/$/, '');
    }

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000/api';
    }

    return `${window.location.origin}/api`;
})();

function showAuthMessage(msg, type) {
    const el = document.getElementById('authMessage');
    el.textContent = msg;
    el.className = 'auth-message ' + (type || '');
    el.style.display = 'block';
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = './index.html#dashboard';
        } else {
            showAuthMessage(data.message, 'error');
        }
    } catch (err) {
        showAuthMessage('Connection error: ' + err.message, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, confirmPassword })
        });

        const data = await response.json();
        if (response.ok) {
            showAuthMessage('Registration successful! Redirecting to login...', 'success');
            setTimeout(() => { window.location.href = './index.html#login'; }, 1200);
        } else {
            showAuthMessage(data.message, 'error');
        }
    } catch (err) {
        showAuthMessage('Connection error: ' + err.message, 'error');
    }
}

// Wire up listeners depending on which page is loaded
window.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
});