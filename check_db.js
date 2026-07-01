const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'money_tracker.db');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Open error:', err);
    process.exit(1);
  }
});

db.get("PRAGMA integrity_check;", (err, row) => {
  if (err) {
    console.error('PRAGMA error:', err);
    db.close();
    process.exit(1);
  }
  console.log('PRAGMA integrity_check ->', row);
  db.close();
});
