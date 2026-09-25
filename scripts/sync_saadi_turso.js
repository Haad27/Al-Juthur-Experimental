require('dotenv').config();
const { createClient } = require('@libsql/client');

async function main() {
  if (!process.env.TURSO_DATABASE_URL) {
    console.log('No TURSO_DATABASE_URL configured, skipping Turso check.');
    return;
  }
  console.log('Connecting to Turso...');
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const existing = await turso.execute({
    sql: 'SELECT * FROM Author WHERE id = ?',
    args: [265]
  });

  if (existing.rows && existing.rows.length > 0) {
    console.log('Author 265 already in Turso:', existing.rows[0]);
  } else {
    await turso.execute({
      sql: 'INSERT INTO Author (id, name, authorName, languageId, era) VALUES (?, ?, ?, ?, ?)',
      args: [265, "Tafsir as-Sa'di", "Shaykh Abdur-Rahman ibn Nasir as-Sa'di", 3, "Modern & Contemporary (19th-21st CE)"]
    });
    console.log('Inserted Author 265 into Turso successfully.');
  }
}

main().catch(console.error);
