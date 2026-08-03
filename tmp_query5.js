const Database = require('better-sqlite3');
const db = new Database('./prisma/dev.db');
const authors = db.prepare('SELECT id, name, authorName FROM Author WHERE name LIKE "%Taqi%" OR authorName LIKE "%Taqi%"').all();
console.log('Taqi authors in DB:', authors);

const maududi = db.prepare('SELECT id, name, authorName FROM Author WHERE name LIKE "%Maududi%" OR authorName LIKE "%Maududi%"').all();
console.log('Maududi authors in DB:', maududi);
