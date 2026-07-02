let expenses = [];
let currentUser = null;

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
    if (!el.loginSection || !el.dashboardSection) return;

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
            // Save the real security token from your server
            localStorage.setItem("token", data.token);
            
            // Update the current user state
            currentUser = { username: username };
            localStorage.setItem("user", JSON.stringify(currentUser));
            
            // Route to dashboard
            navigateTo('dashboard');
            router();
        } else {
            showAuthMessage(data.error || "Invalid username or password.", "error");
        }
    } catch (error) {
        console.error("Login error:", error);
        showAuthMessage("Cannot connect to server.", "error");
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const username = document.getElementById("regUsername").value.trim();
    const password = document.getElementById("regPassword").value;
    const confirmPassword = document.getElementById("regConfirmPassword").value;

    if (!username || !password || !confirmPassword) {
        showAuthMessage("Please fill in all fields.", "error");
        return;
    }

    if (password !== confirmPassword) {
        showAuthMessage("Passwords do not match.", "error");
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            showAuthMessage("Registration successful!", "success");
            setTimeout(() => {
                navigateTo('login');
                router();
            }, 1000);
        } else {
            // Server rejected it (e.g., username taken)
            showAuthMessage(data.error || "Registration failed.", "error");
        }
    } catch (error) {
        console.error("Registration error:", error);
        showAuthMessage("Cannot connect to server.", "error");
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

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    currentUser = null;
    expenses = [];

    window.location.href = "login.html";
}
function initDashboardPage() {
    const el = getElements();

    if (!localStorage.getItem('token')) {
        window.location.replace('./login');
        return;
    }

    // Add this right when the dashboard loads
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        try {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser && parsedUser.username) {
                // Update the text directly on the screen
                document.getElementById('usernameDisplay').innerText = 'Welcome, ' + parsedUser.username;
            }
        } catch (error) {
            console.error("Could not parse user name.");
        }
    }

    el.usernameDisplay.textContent = 'Welcome, ' + (currentUser?.username || '');

    const today = new Date();
    const currentMonthString = today.toISOString().slice(0, 7);
    if (!el.monthSelector.value) el.monthSelector.value = currentMonthString;
    currentCalendarMonth = new Date(el.monthSelector.value + '-01');
    generateCalendar();
    fetchExpenses();
}

// ========== EXPENSE FUNCTIONS ==========
async function fetchExpenses() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const response = await fetch('/api/transactions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            let serverData = await response.json();
            
            // Smart unwrapping: Check if the server wrapped the array in an object
            let expensesArray = Array.isArray(serverData) 
                ? serverData 
                : (serverData.data || serverData.transactions || serverData.expenses || []);

            // Map the unwrapped array safely
            expenses = expensesArray.map(exp => ({
                ...exp,
                date: exp.date || new Date().toISOString().split('T')[0],
                expense_type: exp.type || exp.text 
            }));
            
            updateScreen(); 
        }
    } catch (error) {
        console.error("Failed to fetch expenses:", error);
    }
}
// Now it correctly accepts the 3 parameters sent by your event listener
async function addExpense(amount, type, date) {
    if (!amount || !type) {
        alert("Please fill all required fields.");
        return;
    }

    const token = localStorage.getItem("token");
    
    try {
        // Send the new expense to your Render server
        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                text: type,
                amount: parseFloat(amount),
                type: type,
                date: date 
            })
        });

        if (response.ok) {
            // If the server saved it successfully, pull the fresh data and update the screen
            await fetchExpenses(); 
            document.getElementById("expenseForm").reset();
        } else {
            alert("Failed to save expense to server.");
        }
    } catch (error) {
        console.error("Error saving expense:", error);
    }
}

async function deleteItem(id) {
    const token = localStorage.getItem("token");
    
    try {
        const response = await fetch(`/api/transactions/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            await fetchExpenses(); // Refresh the screen with the item removed
        }
    } catch (error) {
        console.error("Error deleting item:", error);
    }
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
    const isDashboardPage = el.dashboardSection && !el.loginForm;

    if (isDashboardPage) {
        initDashboardPage();

        el.expenseForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const amount = el.amountInput.value;
            const type = el.typeInput.value.trim();
            const today = new Date().toISOString().split('T')[0];
            await addExpense(amount, type, today);
        });

        el.monthSelector.addEventListener('change', updateScreen);

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

        return;
    }

    if (el.loginForm) el.loginForm.addEventListener('submit', handleLogin);
    if (el.registerForm) el.registerForm.addEventListener('submit', handleRegister);

    if (el.expenseForm) {
        el.expenseForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const amount = el.amountInput.value;
            const type = el.typeInput.value.trim();
            const today = new Date().toISOString().split('T')[0];
            await addExpense(amount, type, today);
        });
    }

    if (el.monthSelector) el.monthSelector.addEventListener('change', updateScreen);

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

    window.addEventListener('popstate', router);

    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) currentUser = JSON.parse(user);
    router();
});
