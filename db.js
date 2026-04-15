const db = require("better-sqlite3")("myapp.db");

db.pragma("journal_mode = WAL");

db.exec(`
    CREATE TABLE IF NOT EXISTS profiles(
    id INT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL
    )
    `);

module.exports = db;
