require('dotenv').config();
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const TARGET_BOOKS = [
  { id: 201, slug: "ar-tafsir-al-manar", name: "Tafsir al-Manar" },
  { id: 202, slug: "ar-tafsir-al-shaarawi", name: "Tafsir al-Sha'rawi" },
  { id: 203, slug: "ar-al-tafsir-al-munir", name: "Al-Tafsir al-Munir" },
  { id: 204, slug: "ar-al-tafsir-al-wasit-zuhayli", name: "Al-Tafsir al-Wasit" },
  { id: 205, slug: "ar-safwat-al-tafasir", name: "Safwat al-Tafasir" },
  { id: 206, slug: "ar-mukhtasar-ibn-kathir-sabuni", name: "Mukhtasar Ibn Kathir" },
  { id: 207, slug: "ar-tafsir-al-maraghi", name: "Tafsir al-Maraghi" },
  { id: 208, slug: "ar-al-tafsir-al-hadith", name: "Al-Tafsir al-Hadith" },
  { id: 209, slug: "ar-ruh-al-bayan", name: "Ruh al-Bayan" },
  { id: 210, slug: "ar-al-kashf-wal-bayan-thalabi", name: "Al-Kashf wal-Bayan" },
  { id: 211, slug: "ar-lubab-al-tawil-khazin", name: "Lubab al-Ta'wil" },
  { id: 212, slug: "ar-ahkam-al-quran-jassas", name: "Ahkam al-Quran (Jassas)" },
  { id: 213, slug: "ar-ahkam-al-quran-ibn-al-arabi", name: "Ahkam al-Quran (Ibn al-Arabi)" },
  { id: 214, slug: "ar-ahkam-al-quran-harrasi", name: "Ahkam al-Quran (Harrasi)" },
  { id: 215, slug: "ar-tawilat-ahl-al-sunnah-maturidi", name: "Ta'wilat Ahl al-Sunnah" },
  { id: 216, slug: "ar-al-bahr-al-madid-ibn-ajiba", name: "Al-Bahr al-Madid" },
  { id: 217, slug: "ar-tafsir-muqatil-ibn-sulayman", name: "Tafsir Muqatil" },
  { id: 218, slug: "ar-tafsir-mujahid", name: "Tafsir Mujahid" },
  { id: 219, slug: "ar-tafsir-imam-malik", name: "Tafsir Imam Malik" },
  { id: 220, slug: "ar-tafsir-imam-al-shafii", name: "Tafsir Imam al-Shafi'i" },
  { id: 221, slug: "ar-tafsir-al-nasai", name: "Tafsir al-Nasa'i" },
  { id: 222, slug: "ar-al-hidayah-makki", name: "Al-Hidayah (Makki)" },
  { id: 223, slug: "ar-hashiyat-al-sawi", name: "Hashiyat al-Sawi" },
  { id: 224, slug: "ar-tafsir-sufyan-al-thawri", name: "Tafsir Sufyan al-Thawri" },
  { id: 225, slug: "ar-gharaib-al-quran-naysaburi", name: "Ghara'ib al-Quran" }
];

async function main() {
  console.log("=== Starting Full Upload to Turso TafsirEntry ===");
  console.log("Loading Ayah mapping from Turso...");
  const ayahsRes = await turso.execute('SELECT id, surahId, numberInSurah FROM Ayah ORDER BY id');
  const ayahMap = new Map();
  for (const a of ayahsRes.rows) {
    ayahMap.set(`${a.surahId}:${a.numberInSurah}`, a.id);
  }
  console.log(`Loaded ${ayahMap.size} Ayahs.\n`);

  const BATCH_SIZE = 150; // 150 rows * 4 = 600 parameters (safe for SQLite limit of 999)

  for (let idx = 0; idx < TARGET_BOOKS.length; idx++) {
    const book = TARGET_BOOKS[idx];
    const authorId = book.id;
    const slug = book.slug;
    const name = book.name;
    const baseDir = path.join(process.cwd(), 'database', 'downloaded_tafsirs', slug);

    if (!fs.existsSync(baseDir)) {
      console.log(`[${idx + 1}/${TARGET_BOOKS.length}] Directory missing for ${name}: ${baseDir}`);
      continue;
    }

    // Check if already uploaded
    const countRes = await turso.execute({
      sql: 'SELECT COUNT(*) as c FROM TafsirEntry WHERE authorId = ?',
      args: [authorId]
    });
    const existingCount = Number(countRes.rows[0].c);
    if (existingCount >= 6236) {
      console.log(`[${idx + 1}/${TARGET_BOOKS.length}] ${name} already has ${existingCount} rows in Turso -> Skipping.`);
      continue;
    }

    // Delete partial rows if any
    if (existingCount > 0) {
      console.log(`[${idx + 1}/${TARGET_BOOKS.length}] Clearing partial ${existingCount} rows for ${name}...`);
      await turso.execute({
        sql: 'DELETE FROM TafsirEntry WHERE authorId = ?',
        args: [authorId]
      });
    }

    console.log(`[${idx + 1}/${TARGET_BOOKS.length}] Reading files for ${name}...`);
    const rows = [];
    for (let s = 1; s <= 114; s++) {
      const fpath = path.join(baseDir, `${s}.json`);
      if (!fs.existsSync(fpath)) continue;
      const items = JSON.parse(fs.readFileSync(fpath, 'utf8'));
      for (const item of items) {
        const vNum = item.ayah;
        const text = item.text || "";
        const ayahId = ayahMap.get(`${s}:${vNum}`);
        if (ayahId) {
          rows.push({ authorId, surahId: s, ayahId, text });
        }
      }
    }

    console.log(`  Uploading ${rows.length} rows to Turso in batches of ${BATCH_SIZE}...`);
    const start = Date.now();
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const chunk = rows.slice(i, i + BATCH_SIZE);
      const placeholders = chunk.map(() => '(?, ?, ?, ?)').join(', ');
      const args = [];
      chunk.forEach(r => args.push(r.authorId, r.surahId, r.ayahId, r.text));
      await turso.execute({
        sql: `INSERT INTO TafsirEntry (authorId, surahId, ayahId, text) VALUES ${placeholders}`,
        args
      });
    }
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  Done in ${elapsed}s! (${rows.length} rows inserted)\n`);
  }

  console.log("=== All 25 Tafsirs Fully Uploaded to Turso TafsirEntry! ===");
}

main().catch(console.error);
