let expenses = [];
let currentUser = null;

// ========== UI & DOM HELPERS ==========

function getElements() {
    return {
        loginForm: document.getElementById('loginForm'),
        registerForm: document.getElementById('registerForm'),
        loginSection: document.getElementById('loginSection'),
        dashboardSection: document.getElementById('dashboardSection'),
        expenseForm: document.getElementById('expenseForm'),
        monthSelector: document.getElementById('monthSelector'),
        selectedMonthLabel: document.getElementById('selectedMonthLabel'),
        amountInput: document.getElementById('amountInput'),
        typeInput: document.getElementById('typeInput'),
        expenseList: document.getElementById('expenseList'),
        totalDisplay: document.getElementById('totalDisplay'),
        usernameDisplay: document.getElementById('usernameDisplay'),
        authMessage: document.getElementById('authMessage'),
        selectedDateHeader: document.getElementById('selectedDateHeader'),
        selectedDateExpenses: document.getElementById('selectedDateExpenses')
    };
}

function updateUI() {
    const el = getElements();
    const storedUser = localStorage.getItem('user');
    const userToDisplay = currentUser ? currentUser : (storedUser ? JSON.parse(storedUser) : null);
    
    if (userToDisplay && userToDisplay.username && el.usernameDisplay) {
        el.usernameDisplay.textContent = 'Welcome, ' + userToDisplay.username;
    }
}

// ========== AUTHENTICATION ==========

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (response.ok) {
            localStorage.setItem("token", data.token);
            currentUser = { username: username };
            localStorage.setItem("user", JSON.stringify(currentUser));
            navigateTo('dashboard');
        } else {
            showAuthMessage(data.error || "Login failed.", "error");
        }
    } catch (error) {
        showAuthMessage("Cannot connect to server.", "error");
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById("regUsername").value.trim();
    const password = document.getElementById("regPassword").value;
    const confirmPassword = document.getElementById("regConfirmPassword").value;

    if (password !== confirmPassword) return showAuthMessage("Passwords do not match.", "error");

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (response.ok) {
            showAuthMessage("Registration successful!", "success");
            setTimeout(() => { navigateTo('login'); }, 1000);
        } else {
            showAuthMessage("Registration failed.", "error");
        }
    } catch (error) {
        showAuthMessage("Cannot connect to server.", "error");
    }
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

// ========== ROUTER & INIT ==========

function navigateTo(path) {
    history.pushState({}, '', path.startsWith('/') ? path : `/${path}`);
    router();
}

function router() {
    const el = getElements();
    if (!el.loginSection || !el.dashboardSection) return;

    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    const isDashboardPage = path === '/dashboard' || path === '/dashboard.html';

    if (isDashboardPage) {
        if (!localStorage.getItem('token')) return navigateTo('login');
        el.loginSection.style.display = 'none';
        el.dashboardSection.style.display = 'block';
        
        // Wait for DOM to settle then update name
        setTimeout(updateUI, 100);
        
        initDashboardPage();
    } else {
        el.loginSection.style.display = 'block';
        el.dashboardSection.style.display = 'none';
    }
}

function initDashboardPage() {
    const el = getElements();
    const today = new Date();
    if (!el.monthSelector.value) el.monthSelector.value = today.toISOString().slice(0, 7);
    currentCalendarMonth = new Date(el.monthSelector.value + '-01');
    generateCalendar();
    fetchExpenses();
}

// ========== EXPENSES ==========

async function fetchExpenses() {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
        const response = await fetch('/api/transactions', { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
            const data = await response.json();
            expenses = (Array.isArray(data) ? data : (data.data || [])).map(exp => ({
                ...exp,
                expense_type: exp.type || exp.text
            }));
            updateScreen();
        }
    } catch (error) { console.error(error); }
}

async function addExpense(amount, type, date) {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ text: type, amount: parseFloat(amount), type: type, date: date })
        });
        if (response.ok) {
            await fetchExpenses();
            document.getElementById("expenseForm").reset();
        }
    } catch (error) { console.error(error); }
}

function updateScreen() {
    const el = getElements();
    const selectedMonth = el.monthSelector.value;
    const filtered = expenses.filter(exp => exp.date.startsWith(selectedMonth));
    el.expenseList.innerHTML = filtered.length ? "" : "<p>No expenses.</p>";
    let total = 0;
    filtered.forEach(exp => {
        total += parseFloat(exp.amount);
        const div = document.createElement('div');
        div.className = 'expense-item';
        div.innerHTML = `<span>₹${parseFloat(exp.amount).toFixed(2)} - ${exp.expense_type}</span>`;
        el.expenseList.appendChild(div);
    });
    el.totalDisplay.innerText = total.toFixed(2);
    generateCalendar();
}

// ========== EVENT LISTENERS ==========

document.addEventListener('DOMContentLoaded', () => {
    const el = getElements();
    if (el.loginForm) el.loginForm.addEventListener('submit', handleLogin);
    if (el.registerForm) el.registerForm.addEventListener('submit', handleRegister);
    if (el.expenseForm) el.expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addExpense(el.amountInput.value, el.typeInput.value, new Date().toISOString().split('T')[0]);
    });
    window.addEventListener('popstate', router);
    
    const user = localStorage.getItem('user');
    if (user) currentUser = JSON.parse(user);
    router();
});