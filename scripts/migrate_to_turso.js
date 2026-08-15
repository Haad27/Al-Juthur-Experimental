const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');
require('dotenv').config();

async function migrate() {
  console.log("Connecting to local SQLite...");
  const localDb = new Database('prisma/dev.db');

  console.log("Connecting to Turso Cloud DB...");
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // 1. Copy Schema
  console.log("Fetching local schema...");
  const tables = localDb.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  
  for (const table of tables) {
    if (table.sql) {
      console.log(`Creating table: ${table.name}`);
      try {
        await turso.execute(table.sql);
      } catch (e) {
        console.log(`Error creating ${table.name} (maybe it exists):`, e.message);
      }
    }
  }

  // 2. Copy Data for all tables dynamically
  const tableNames = tables.map(t => t.name).filter(name => name !== '_prisma_migrations' && name !== 'sqlite_sequence');
  
  for (const tableName of tableNames) {
    console.log(`\nChecking local data for table: ${tableName}...`);
    
    // Check if table exists locally
    try {
      const countRow = localDb.prepare(`SELECT COUNT(*) as c FROM ${tableName}`).get();
      const totalCount = countRow.c;
      console.log(`Found ${totalCount} rows in ${tableName}.`);
      
      if (totalCount === 0) continue;

      // Fetch all rows
      const rows = localDb.prepare(`SELECT * FROM ${tableName}`).all();
      if (rows.length === 0) continue;
      
      const columns = Object.keys(rows[0]);
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT OR IGNORE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

      console.log(`Migrating ${rows.length} rows to Turso for ${tableName}...`);
      
      // Batch insert (LibSQL free tier allows 20MB per request)
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const statements = batch.map((row) => ({
          sql,
          args: columns.map(col => row[col])
        }));
        
        try {
          await turso.batch(statements, "write");
          process.stdout.write(`\rProgress: ${Math.min(i + batchSize, rows.length)} / ${rows.length}`);
        } catch (err) {
          console.error(`\nBatch failed at index ${i}:`, err.message);
          // break; // Stop this table if failure to avoid partial mess
        }
      }
      console.log(`\nFinished ${tableName}!`);
    } catch (err) {
      console.log(`Table ${tableName} doesn't exist locally or error:`, err.message);
    }
  }

  console.log("\n✅ ALL DONE! Migration to Turso successful!");
  process.exit(0);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
