const Database = require('better-sqlite3');
const db = new Database('./prisma/dev.db');
const results = db.prepare("SELECT id, name, authorName FROM Author WHERE name LIKE '%Israr%' OR name LIKE '%Qutb%' OR name LIKE '%Zilal%' OR name LIKE '%Bayan%'").all();
console.log(results);
