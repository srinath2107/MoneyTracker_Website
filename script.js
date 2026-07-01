let expenses = [];
let currentUser = null;

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

function getCurrentUserKey() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        try {
            return JSON.parse(storedUser).username;
        } catch (error) {
            return null;
        }
    }
    return currentUser?.username || null;
}

// DOM Elements (lazy loading)
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

// ========== AUTHENTICATION FUNCTIONS ==========

function toggleForms() {
    const el = getElements();
    el.loginForm.classList.toggle('active-form');
    el.registerForm.classList.toggle('active-form');
    el.authMessage.style.display = 'none';
}

// Client-side navigation helpers
function navigateTo(path) {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const target = normalized === '/' ? '/login' : normalized;
    history.pushState({}, '', target);
    router();
}

function router() {
    const el = getElements();
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    const isLoginPage = path === '/login' || path === '/login.html' || path === '/';
    const isRegisterPage = path === '/register' || path === '/register.html';
    const isDashboardPage = path === '/dashboard' || path === '/dashboard.html';

    if (isDashboardPage) {
        // Require authentication
        if (!localStorage.getItem('token')) {
            history.replaceState({}, '', '/login');
            return router();
        }

        el.loginSection.style.display = 'none';
        el.dashboardSection.style.display = 'block';
        el.registerForm.classList.remove('active-form');
        el.loginForm.classList.add('active-form');

        if (!currentUser) {
            const stored = localStorage.getItem('user');
            if (stored) currentUser = JSON.parse(stored);
        }

        el.usernameDisplay.textContent = 'Welcome, ' + (currentUser?.username || '');

        const today = new Date();
        const currentMonthString = today.toISOString().slice(0, 7);
        if (!el.monthSelector.value) el.monthSelector.value = currentMonthString;
        currentCalendarMonth = new Date(el.monthSelector.value + '-01');
        generateCalendar();
        fetchExpenses();
    } else if (isRegisterPage) {
        el.loginSection.style.display = 'block';
        el.dashboardSection.style.display = 'none';
        el.registerForm.classList.add('active-form');
        el.loginForm.classList.remove('active-form');
    } else {
        el.loginSection.style.display = 'block';
        el.dashboardSection.style.display = 'none';
        el.loginForm.classList.add('active-form');
        el.registerForm.classList.remove('active-form');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const el = getElements();
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
        currentUser = { id: existingUser.id, username: existingUser.username };
        navigateTo('dashboard');
    } catch (error) {
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

        showAuthMessage('Registration successful! Please login.', 'success');
        setTimeout(() => toggleForms(), 1500);
    } catch (error) {
        showAuthMessage('Unable to register right now.', 'error');
    }
}

function showAuthMessage(message, type) {
    const el = getElements();
    el.authMessage.textContent = message;
    el.authMessage.style.display = 'block';
    el.authMessage.className = 'auth-message ' + type;
}

function showDashboard() {
    const el = getElements();
    // Keep showDashboard as a presentation helper; router handles visibility & data
    el.usernameDisplay.textContent = 'Welcome, ' + (currentUser?.username || '');
}

function logout() {
    const el = getElements();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    expenses = [];
    // Navigate to login route which will reset forms
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('regUsername').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regConfirmPassword').value = '';
    el.authMessage.style.display = 'none';
    navigateTo('login');
}

// ========== EXPENSE FUNCTIONS ==========

function fetchExpenses() {
    const username = getCurrentUserKey();
    if (!username) {
        expenses = [];
        updateScreen();
        return;
    }

    const expensesByUser = getStoredExpenses();
    expenses = expensesByUser[username] || [];
    updateScreen();
}

function addExpense(amount, type, date) {
    const el = getElements();
    const username = getCurrentUserKey();

    if (!username) {
        alert('Please log in first.');
        return;
    }

    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount)) {
        alert('Please enter a valid amount.');
        return;
    }

    const expenseEntry = {
        id: Date.now(),
        amount: parsedAmount,
        expense_type: type,
        date
    };

    const expensesByUser = getStoredExpenses();
    const userExpenses = expensesByUser[username] || [];
    userExpenses.push(expenseEntry);
    expensesByUser[username] = userExpenses;
    saveStoredExpenses(expensesByUser);

    expenses = userExpenses;
    updateScreen();
    el.amountInput.value = '';
    el.typeInput.value = '';
}

function deleteItem(id) {
    const username = getCurrentUserKey();
    if (!username) return;

    const expensesByUser = getStoredExpenses();
    const userExpenses = (expensesByUser[username] || []).filter(exp => exp.id !== id);
    expensesByUser[username] = userExpenses;
    saveStoredExpenses(expensesByUser);

    expenses = userExpenses;
    updateScreen();
}

function updateScreen() {
    const el = getElements();
    const selectedMonth = el.monthSelector.value;
    
    const filteredExpenses = expenses.filter(exp => exp.date.startsWith(selectedMonth));
    
    el.expenseList.innerHTML = "";
    let currentTotal = 0;

    if (filteredExpenses.length === 0) {
        el.expenseList.innerHTML = "<p style='color: gray; font-style: italic;'>No expenses found for this month.</p>";
    }

    filteredExpenses.forEach(exp => {
        currentTotal += parseFloat(exp.amount);
        const typeLabel = exp.expense_type ? ` - ${exp.expense_type}` : '';
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'expense-item';
        
        itemDiv.innerHTML = `
            <span>₹${parseFloat(exp.amount).toFixed(2)}${typeLabel} <small style="color:gray;">(${exp.date})</small></span>
            <span class="delete-btn" onclick="deleteItem(${exp.id})">✕</span>
        `;
        
        el.expenseList.appendChild(itemDiv);
    });

    el.totalDisplay.innerText = currentTotal.toFixed(2);
    
    // Update calendar when expenses change
    generateCalendar();
}

// ========== CALENDAR FUNCTIONS ==========

let currentCalendarMonth = new Date();

function generateCalendar() {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    
    // Update month header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('calendarMonth').textContent = `${monthNames[month]} ${year}`;
    
    // Get first day of month and total days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const calendarDaysEl = document.getElementById('calendarDays');
    calendarDaysEl.innerHTML = '';
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day other-month';
        dayEl.textContent = day;
        calendarDaysEl.appendChild(dayEl);
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = day;
        
        // Check if today
        const today = new Date();
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayEl.classList.add('today');
        }
        
        // Check if has expenses
        const dayExpenses = expenses.filter(exp => exp.date === dateStr);
        if (dayExpenses.length > 0) {
            dayEl.classList.add('has-expense');
            const total = dayExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
            dayEl.innerHTML += `<div class="expense-badge">₹${total.toFixed(0)}</div>`;
        }
        
        // Add click event
        dayEl.addEventListener('click', () => showDayExpenses(dateStr));
        calendarDaysEl.appendChild(dayEl);
    }
    
    // Next month days
    const totalCells = calendarDaysEl.children.length;
    const remainingCells = 42 - totalCells; // 6 rows * 7 days
    for (let day = 1; day <= remainingCells; day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day other-month';
        dayEl.textContent = day;
        calendarDaysEl.appendChild(dayEl);
    }
}

function showDayExpenses(dateStr) {
    const el = getElements();
    const dayExpenses = expenses.filter(exp => exp.date === dateStr);
    el.selectedDateHeader.textContent = `Expenses for ${dateStr}`;

    if (dayExpenses.length === 0) {
        el.selectedDateExpenses.innerHTML = '<p style="color: gray;">No amount added on this day.</p>';
        return;
    }

    const clickedDate = new Date(dateStr);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthYearLabel = `${monthNames[clickedDate.getMonth()]} ${clickedDate.getFullYear()}`;
    const day = String(clickedDate.getDate()).padStart(2, '0');
    el.selectedMonthLabel.textContent = `${day} ${monthYearLabel}`;
    el.monthSelector.value = `${clickedDate.getFullYear()}-${String(clickedDate.getMonth() + 1).padStart(2, '0')}`;
    updateScreen();

    const total = dayExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const expenseRows = dayExpenses.map(exp => {
        return `<div class="day-expense-row"><span>₹${parseFloat(exp.amount).toFixed(2)}</span><span>${exp.expense_type}</span></div>`;
    }).join('');

    el.selectedDateExpenses.innerHTML = `
        <div class="day-expense-summary">Total: <strong>₹${total.toFixed(2)}</strong></div>
        ${expenseRows}
    `;
}

// ========== EVENT LISTENERS ==========

document.addEventListener('DOMContentLoaded', function() {
    const el = getElements();
    
    el.loginForm.addEventListener('submit', handleLogin);
    el.registerForm.addEventListener('submit', handleRegister);

    el.expenseForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const amount = el.amountInput.value;
        const type = el.typeInput.value.trim();
        const today = new Date().toISOString().split('T')[0];
        addExpense(amount, type, today);
    });

    el.monthSelector.addEventListener('change', updateScreen);

    // Toggle between login and register forms
    const toggleToRegister = document.getElementById('toggleToRegister');
    const toggleToLogin = document.getElementById('toggleToLogin');
    
    if (toggleToRegister) {
        toggleToRegister.addEventListener('click', function(e) {
            e.preventDefault();
            navigateTo('register');
        });
    }
    
    if (toggleToLogin) {
        toggleToLogin.addEventListener('click', function(e) {
            e.preventDefault();
            navigateTo('login');
        });
    }

    // Calendar navigation
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', function() {
            currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() - 1);
            generateCalendar();
        });
    }
    
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', function() {
            currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + 1);
            generateCalendar();
        });
    }

    // Handle browser navigation
    window.addEventListener('popstate', router);

    // Initialize router to show correct view based on URL
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) currentUser = JSON.parse(user);
    router();
});
