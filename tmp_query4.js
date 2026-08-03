const Database = require('better-sqlite3');
const db = new Database('./prisma/dev.db');
const entries = db.prepare("SELECT COUNT(*) as c FROM TafsirEntry WHERE authorId = 94").get(); // assuming 94 is taqi usmani based on id 100084? No, let me query ID
const author = db.prepare("SELECT id, name FROM Author WHERE name LIKE '%Taqi%'").get();
console.log(author);
