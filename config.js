// Set this to your Render backend URL after deploying server.js (see README).
// Example: https://money-tracker.onrender.com
const REMOTE_API_URL = 'https://money-tracker.onrender.com';

window.API_BASE_URL = (function () {
    const hostname = window.location.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return '';
    }

    if (hostname.endsWith('.onrender.com')) {
        return '';
    }

    if (hostname.endsWith('github.io')) {
        return REMOTE_API_URL.replace(/\/$/, '');
    }

    return '';
})();

async function apiRequest(path, options = {}) {
    const url = `${window.API_BASE_URL}${path}`;
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    const response = await fetch(url, { ...options, headers });
    let data = {};

    try {
        data = await response.json();
    } catch (_) {
        data = {};
    }

    if (!response.ok) {
        const error = new Error(data.message || 'Request failed');
        error.status = response.status;
        throw error;
    }

    return data;
}

function authHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleAuthFailure(error) {
    if (error.status === 401 || error.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.replace('./login');
    }
}
