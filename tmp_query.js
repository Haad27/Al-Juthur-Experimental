const Database = require('better-sqlite3');
const db = new Database('./prisma/dev.db');
const results = db.prepare("SELECT id, name, authorName FROM Author WHERE name LIKE '%Maududi%' OR name LIKE '%Usmani%' OR name LIKE '%Tafheem%' OR name LIKE '%Taqi%'").all();
console.log(results);
