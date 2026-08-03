const Database = require('better-sqlite3');
const db = new Database('./prisma/dev.db');
const entries = db.prepare("SELECT COUNT(*) as c FROM TafsirEntry WHERE authorId = 138").get();
console.log('138 (Maududi UR):', entries.c);
