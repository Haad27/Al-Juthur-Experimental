import Database from 'better-sqlite3';
import path from 'path';

function inspectDb(dbPath: string, name: string) {
  console.log(`\n========================================`);
  console.log(`Inspecting DB: ${name}`);
  console.log(`========================================`);
  try {
    const db = new Database(dbPath, { readonly: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    console.log('Tables:', tables.map(t => t.name).join(', '));

    for (const t of tables) {
      const count = (db.prepare(`SELECT COUNT(*) as cnt FROM "${t.name}"`).get() as any).cnt;
      console.log(`\nTable: ${t.name} (Rows: ${count})`);
      const columns = db.prepare(`PRAGMA table_info("${t.name}")`).all() as any[];
      console.log('Columns:', columns.map(c => `${c.name} (${c.type})`).join(', '));

      const samples = db.prepare(`SELECT * FROM "${t.name}" LIMIT 2`).all();
      console.log('Samples:', JSON.stringify(samples, null, 2));
    }
  } catch (err: any) {
    console.error(`Error reading ${name}:`, err.message);
  }
}

const basePath = path.join(process.cwd(), 'database', 'lexicon', 'data');
inspectDb(path.join(basePath, 'arabic_lexicons.sqlite'), 'arabic_lexicons.sqlite');
inspectDb(path.join(basePath, 'word-root.db'), 'word-root.db');
