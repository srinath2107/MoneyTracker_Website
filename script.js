// Look inside localStorage. If it's empty, create a blank array [].
let expenses = JSON.parse(localStorage.getItem('myExpenses')) || [];

// Grab HTML elements
const monthSelector = document.getElementById('monthSelector');
const expenseForm = document.getElementById('expenseForm');
const amountInput = document.getElementById('amountInput');
const expenseList = document.getElementById('expenseList');
const totalDisplay = document.getElementById('totalDisplay');

// Set the Time Machine to the current month by default
const today = new Date();
const currentMonthString = today.toISOString().slice(0, 7); 
monthSelector.value = currentMonthString;


// Updates the screen based on the selected month
function updateScreen() {
    const selectedMonth = monthSelector.value; 
    
    const filteredExpenses = expenses.filter(exp => exp.date.startsWith(selectedMonth));
    
    expenseList.innerHTML = "";
    let currentTotal = 0;

    if (filteredExpenses.length === 0) {
        expenseList.innerHTML = "<p style='color: gray; font-style: italic;'>No expenses found for this month.</p>";
    }

    filteredExpenses.forEach(exp => {
        currentTotal += exp.amount; 
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'expense-item';
        
        itemDiv.innerHTML = `
            <span>₹${exp.amount.toFixed(2)} <small style="color:gray;">(${exp.date})</small></span>
            <span class="delete-btn" onclick="deleteItem(${exp.id})">✕</span>
        `;
        
        expenseList.appendChild(itemDiv);
    });

    totalDisplay.innerText = currentTotal.toFixed(2);
}


// Save a new expense
expenseForm.addEventListener('submit', function(event) {
    event.preventDefault(); 

    const enteredAmount = parseFloat(amountInput.value);

    if (enteredAmount > 0) {
        const newExpense = {
            id: Date.now(), 
            amount: enteredAmount,
            date: new Date().toISOString().split('T')[0] 
        };

        expenses.push(newExpense);
        localStorage.setItem('myExpenses', JSON.stringify(expenses));

        amountInput.value = ""; 
        updateScreen(); 
    }
});


// Delete an expense
function deleteItem(idToDelete) {
    if (confirm("Are you sure you want to delete this?")) {
        expenses = expenses.filter(exp => exp.id !== idToDelete);
        localStorage.setItem('myExpenses', JSON.stringify(expenses));
        updateScreen(); 
    }
}

// Every time the user changes the month dropdown, recalculate everything
monthSelector.addEventListener('change', updateScreen);

// Run this once as soon as the file opens to load the current month
updateScreen();