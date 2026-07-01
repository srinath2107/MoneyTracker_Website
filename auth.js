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
        const data = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = './dashboard';
    } catch (err) {
        if (err.message === 'Failed to fetch' && window.API_BASE_URL) {
            showAuthMessage('Cannot reach server. Check that the backend is deployed and REMOTE_API_URL in config.js is correct.', 'error');
            return;
        }
        showAuthMessage(err.message || 'Unable to log in right now.', 'error');
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
        await apiRequest('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, password, confirmPassword })
        });

        showAuthMessage('Registration successful! Redirecting to login...', 'success');
        setTimeout(() => { window.location.href = './login'; }, 1200);
    } catch (err) {
        if (err.message === 'Failed to fetch' && window.API_BASE_URL) {
            showAuthMessage('Cannot reach server. Check that the backend is deployed and REMOTE_API_URL in config.js is correct.', 'error');
            return;
        }
        showAuthMessage(err.message || 'Unable to register right now.', 'error');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
});
