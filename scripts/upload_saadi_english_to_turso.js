require('dotenv').config();
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const AUTHOR_ID = 265;
const SLUG = "en-tafsir-as-saadi";
const NAME = "Tafsir as-Sa'di (English)";

async function main() {
  console.log("=== Uploading Tafsir as-Sa'di English (Author 265) to Turso ===");

  // 1. Ensure Author 265 exists
  console.log("Checking Author 265 in Turso...");
  const authRes = await turso.execute({
    sql: 'SELECT * FROM Author WHERE id = ?',
    args: [AUTHOR_ID]
  });
  if (authRes.rows.length === 0) {
    console.log("Creating Author 265 in Turso...");
    await turso.execute({
      sql: 'INSERT INTO Author (id, name, authorName, languageId, era) VALUES (?, ?, ?, ?, ?)',
      args: [AUTHOR_ID, "Tafsir as-Sa'di", "Shaykh Abdur-Rahman ibn Nasir as-Sa'di", 3, "Modern & Contemporary (19th-21st CE)"]
    });
  } else {
    console.log("Author 265 already exists in Turso:", authRes.rows[0]);
  }

  // 2. Load Ayah mapping
  console.log("Loading Ayah mapping from Turso...");
  const ayahsRes = await turso.execute('SELECT id, surahId, numberInSurah FROM Ayah ORDER BY id');
  const ayahMap = new Map();
  for (const a of ayahsRes.rows) {
    ayahMap.set(`${a.surahId}:${a.numberInSurah}`, a.id);
  }
  console.log(`Loaded ${ayahMap.size} Ayahs.`);

  // 3. Check existing entries count
  const countRes = await turso.execute({
    sql: 'SELECT COUNT(*) as c FROM TafsirEntry WHERE authorId = ?',
    args: [AUTHOR_ID]
  });
  const existingCount = Number(countRes.rows[0].c);
  console.log(`Current TafsirEntry count for author 265: ${existingCount}`);

  if (existingCount > 0) {
    console.log(`Clearing existing ${existingCount} rows for author 265...`);
    await turso.execute({
      sql: 'DELETE FROM TafsirEntry WHERE authorId = ?',
      args: [AUTHOR_ID]
    });
  }

  // 4. Read all 114 Surah JSON files
  const baseDir = path.join(process.cwd(), 'database', 'downloaded_tafsirs', SLUG);
  const rows = [];
  for (let s = 1; s <= 114; s++) {
    const fpath = path.join(baseDir, `${s}.json`);
    if (!fs.existsSync(fpath)) {
      console.warn(`Missing Surah file: ${fpath}`);
      continue;
    }
    const raw = fs.readFileSync(fpath, 'utf8');
    const items = JSON.parse(raw);
    const list = Array.isArray(items) ? items : (items.ayahs || []);
    for (let idx = 0; idx < list.length; idx++) {
      const item = list[idx];
      const vNum = item.ayah || item.numberInSurah || (idx + 1);
      const text = item.text || "";
      const ayahId = ayahMap.get(`${s}:${vNum}`);
      if (ayahId) {
        rows.push({ authorId: AUTHOR_ID, surahId: s, ayahId, text });
      } else {
        console.warn(`Could not find Ayah ID for ${s}:${vNum}`);
      }
    }
  }

  console.log(`Prepared ${rows.length} TafsirEntry rows. Starting batch insert to Turso...`);
  const BATCH_SIZE = 150;
  const start = Date.now();

  for (let b = 0; b < rows.length; b += BATCH_SIZE) {
    const batch = rows.slice(b, b + BATCH_SIZE);
    const placeholders = batch.map(() => '(?, ?, ?, ?)').join(', ');
    const args = [];
    for (const r of batch) {
      args.push(r.authorId, r.surahId, r.ayahId, r.text);
    }
    await turso.execute({
      sql: `INSERT INTO TafsirEntry (authorId, surahId, ayahId, text) VALUES ${placeholders}`,
      args: args
    });
    if ((b + BATCH_SIZE) % 600 === 0 || b + BATCH_SIZE >= rows.length) {
      console.log(`  Uploaded ${Math.min(b + BATCH_SIZE, rows.length)} / ${rows.length} rows...`);
    }
  }

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`✅ Successfully uploaded all ${rows.length} entries for ${NAME} into Turso in ${duration}s!`);
}

main().catch(console.error);
