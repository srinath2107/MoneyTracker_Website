# Money Tracker - Setup Guide

A secure expense tracking web application with user authentication and SQLite database integration.

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **Git** (optional, for version control)

**Note:** No need to install or configure any database - SQLite is built-in!

---

## ⚡ Step 1: Install Dependencies

```bash
cd c:\Users\srina\Downloads\Money Tracker V1\MoneyTracker_Website
npm install
```

This will install all required packages:
- Express.js (backend framework)
- SQLite3 (embedded database)
- bcryptjs (password hashing)
- jsonwebtoken (authentication tokens)
- cors (cross-origin requests)

---

## 🔧 Step 2: Configure Environment (Optional)

The `.env` file is already set up. If you want to change the port or database location, edit [.env](.env):

```
DB_PATH=./money_tracker.db
JWT_SECRET=your_super_secret_key_12345_change_this_in_production
PORT=5000
```

---

## ▶️ Step 3: Start the Application

Simply run:
```bash
npm start
```

You should see:
```
Connected to SQLite database
Server is running on http://localhost:5000
```

That's it! Database tables are automatically created on first run.

---

## 🎯 Access the Application

Open your browser and go to:
```
http://localhost:5000
```

---

## 🎯 Using the Application

### Create Account:
1. Click "Register here"
2. Enter username and password (min 6 characters)
3. Confirm password
4. Click "Register"

### Login:
1. Enter your username and password
2. Click "Login"
3. You'll be redirected to the dashboard

### Track Expenses:
1. Select a month using the date picker
2. Enter amount and click "Add Expense"
3. View all expenses for the selected month
4. Delete expenses by clicking the ✕ button

### Logout:
Click the "Logout" button in the top right corner

---

## 🛠️ Development Mode

For development with auto-reload on file changes:

```bash
npm run dev
```

This requires `nodemon` (already installed as dev dependency)

---

## 📁 Project Structure

```
MoneyTracker/
├── server.js              # Backend API (Node.js + Express)
├── index.html             # Frontend (Login + Dashboard)
├── script.js              # Frontend JavaScript
├── style.css              # Styling
├── money_tracker.db       # SQLite Database (auto-created)
├── package.json           # Node.js dependencies
├── .env                   # Configuration file
├── .env.example           # Example configuration
├── .gitignore             # Git ignore file
└── README.md              # This file
```

---

## 🔐 Security Features

- ✅ Password hashing with bcryptjs
- ✅ JWT token-based authentication
- ✅ SQLite database with user isolation
- ✅ Protected API endpoints
- ✅ User-specific expense isolation
- ✅ Token expiration (7 days)

---

## 🐛 Troubleshooting

| Error | Solution |
|-------|----------|
| **Port 5000 already in use** | Change PORT in .env to another number (e.g., 5001) |
| **Module not found** | Run `npm install` again |
| **CORS error in browser** | Check API_URL in script.js matches your server URL |
| **Database locked error** | Close other connections and restart server |

---

## 📝 Database

The SQLite database (`money_tracker.db`) is automatically created in the project folder on first run. It contains:

- **users table**: Stores usernames and hashed passwords
- **expenses table**: Stores expenses linked to users

No additional setup needed!

---

## 🚀 Deployment

For production deployment:
1. Use environment-specific `.env` files
2. Deploy the Node.js backend to a host such as Render, Railway, Fly.io, or Heroku
3. Keep the frontend on the same origin as the API, or update the API URL if you use a separate domain
4. Use a strong JWT_SECRET

> Note: GitHub Pages only serves static files, so this app cannot run its Express backend there without a separate Node.js hosting service.

---

## 📚 Technologies Used

- **Frontend:** HTML, CSS, JavaScript (Vanilla)
- **Backend:** Node.js, Express.js
- **Database:** SQLite
- **Authentication:** JWT, bcryptjs
- **Others:** CORS

---

## ✨ Key Features

- 🔐 Secure user authentication
- 💰 Expense tracking by month
- 📱 Responsive mobile-friendly design
- ⚡ Fast SQLite database
- 🎨 Beautiful modern UI
- 🔄 Real-time updates

---

## 📞 Support

If you face any issues:
1. Check the `.env` file configuration
2. Check browser console (F12) for error messages
3. Check server terminal for backend errors
4. Restart the server: Press `Ctrl+C` then `npm start`

---

**Ready to track your expenses securely! 💰**
