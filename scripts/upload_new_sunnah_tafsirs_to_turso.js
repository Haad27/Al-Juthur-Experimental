require('dotenv').config();
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const BOOKS_TO_UPLOAD = [
  { id: 226, slug: "ar-tafsir-yahya-ibn-sallam", name: "Tafsir Yahya ibn Sallam" },
  { id: 227, slug: "ar-tafsir-abd-al-razzaq-al-sanani", name: "Tafsir Abd al-Razzaq" },
  { id: 228, slug: "ar-tafsir-ibn-khuwayz-mandad", name: "Tafsir Ibn Khuwayz Mandad" },
  { id: 229, slug: "ar-majaz-al-quran-abu-ubaida", name: "Majaz al-Quran" },
  { id: 230, slug: "ar-maani-al-quran-farra", name: "Ma'ani al-Quran (Farra)" },
  { id: 231, slug: "ar-maani-al-quran-akhfash", name: "Ma'ani al-Quran (Akhfash)" },
  { id: 232, slug: "ar-gharib-al-quran-ibn-qutaybah", name: "Gharib al-Quran (Ibn Qutaybah)" },
  { id: 233, slug: "ar-gharib-al-quran-zayd-ibn-ali", name: "Gharib al-Quran (Zayd ibn Ali)" },
  { id: 234, slug: "ar-nuzhat-al-qulub-sijistani", name: "Nuzhat al-Qulub (Sijistani)" },
  { id: 235, slug: "ar-tafsir-al-izz-ibn-abd-al-salam", name: "Tafsir al-Izz ibn Abd al-Salam" },
  { id: 236, slug: "ar-maani-al-quran-wa-irabuh-zajjaj", name: "Ma'ani al-Quran wa I'rabuh (Zajjaj)" },
  { id: 237, slug: "ar-tafsir-al-raghib-al-isfahani", name: "Tafsir al-Raghib al-Isfahani" },
  { id: 238, slug: "ar-al-nahr-al-madd-abu-hayyan", name: "Al-Nahr al-Madd (Abu Hayyan)" },
  { id: 239, slug: "ar-tadhkirat-al-arib-ibn-al-jawzi", name: "Tadhkirat al-Arib (Ibn al-Jawzi)" },
  { id: 240, slug: "ar-ijaz-al-bayan-naysaburi", name: "I'jaz al-Bayan (Naysaburi)" },
  { id: 241, slug: "ar-al-sirat-al-mustaqim-khidr", name: "Al-Sirat al-Mustaqim (Khidr)" },
  { id: 242, slug: "ar-ara-ibn-hazm-fi-al-tafsir", name: "Ara' Ibn Hazm fi al-Tafsir" },
  { id: 243, slug: "ar-juhud-ibn-abd-al-barr", name: "Juhud Ibn Abd al-Barr" },
  { id: 244, slug: "ar-juhud-al-imam-al-ghazali", name: "Juhud al-Imam al-Ghazali" },
  { id: 245, slug: "ar-juhud-al-qarafi-fi-al-tafsir", name: "Juhud al-Qarafi" },
  { id: 246, slug: "ar-tafsir-ibn-arafa-al-maliki", name: "Tafsir Ibn Arafa" },
  { id: 247, slug: "ar-al-taqyid-al-kabir-basili", name: "Al-Taqyid al-Kabir" },
  { id: 248, slug: "ar-al-tibyan-fi-gharib-al-quran-ibn-al-haim", name: "Al-Tibyan fi Gharib al-Quran" },
  { id: 249, slug: "ar-fath-al-rahman-zakariya-al-ansari", name: "Fath al-Rahman (Zakariya al-Ansari)" },
  { id: 250, slug: "ar-ghayat-al-amani-al-kurani", name: "Ghayat al-Amani (Al-Kurani)" },
  { id: 251, slug: "ar-hadaiq-al-ruh-wa-al-rayhan-harari", name: "Hadaiq al-Ruh wa al-Rayhan" },
  { id: 252, slug: "ar-majalis-al-tadhkir-ibn-badis", name: "Majalis al-Tadhkir (Ibn Badis)" },
  { id: 253, slug: "ar-al-adhb-al-namir-shinqiti", name: "Al-Adhb al-Namir (Shinqiti)" },
  { id: 254, slug: "ar-safwat-al-bayan-hasanein-makhlouf", name: "Safwat al-Bayan (Makhlouf)" },
  { id: 255, slug: "ar-al-taysir-fi-ahadith-al-tafsir-nasiri", name: "Al-Taysir fi Ahadith al-Tafsir" },
  { id: 256, slug: "ar-aysar-al-tafasir-humad", name: "Aysar al-Tafasir (Humad)" },
  { id: 257, slug: "ar-al-mushaf-al-mufassar-farid-wajdi", name: "Al-Mushaf al-Mufassar (Farid Wajdi)" },
  { id: 258, slug: "ar-awdah-al-tafasir-khatib", name: "Awdah al-Tafasir (Khatib)" },
  { id: 259, slug: "ar-al-tafsir-al-qurani-lil-quran-khatib", name: "Al-Tafsir al-Qur'ani lil-Qur'an" },
  { id: 260, slug: "ar-bayan-al-maani-al-ani", name: "Bayan al-Ma'ani (Al-Ani)" },
  { id: 261, slug: "ar-al-tafsir-al-shamil-amir-abd-al-aziz", name: "Al-Tafsir al-Shamil (Amir Abd al-Aziz)" },
  { id: 262, slug: "ar-al-mawsooah-al-quraniyyah-abyari", name: "Al-Mawsoo'ah al-Qur'aniyyah (Abyari)" },
  { id: 263, slug: "ar-gharib-al-quran-kamila-kuwari", name: "Tafsir Gharib al-Quran (Kamila al-Kuwari)" },
  { id: 264, slug: "ar-al-tafsir-al-bayani-al-qaddumi", name: "Al-Tafsir al-Bayani (Al-Qaddumi)" },
];

async function main() {
  console.log("=== Starting Upload of 39 Authentic Sunni Tafsirs to Turso ===");
  console.log("Loading Ayah mapping from Turso...");
  const ayahsRes = await turso.execute('SELECT id, surahId, numberInSurah FROM Ayah ORDER BY id');
  const ayahMap = new Map();
  for (const a of ayahsRes.rows) {
    ayahMap.set(`${a.surahId}:${a.numberInSurah}`, a.id);
  }
  console.log(`Loaded ${ayahMap.size} Ayahs from Turso.\n`);

  const BATCH_SIZE = 150;

  for (let idx = 0; idx < BOOKS_TO_UPLOAD.length; idx++) {
    const book = BOOKS_TO_UPLOAD[idx];
    const authorId = book.id;
    const slug = book.slug;
    const name = book.name;
    const baseDir = path.join(process.cwd(), 'database', 'downloaded_tafsirs', slug);

    if (!fs.existsSync(baseDir)) {
      console.log(`[${idx + 1}/${BOOKS_TO_UPLOAD.length}] Missing folder: ${baseDir}`);
      continue;
    }

    const countRes = await turso.execute({
      sql: 'SELECT COUNT(*) as c FROM TafsirEntry WHERE authorId = ?',
      args: [authorId]
    });
    const existingCount = Number(countRes.rows[0].c);
    if (existingCount >= 6236) {
      console.log(`[${idx + 1}/${BOOKS_TO_UPLOAD.length}] ${name} (ID ${authorId}) already uploaded (${existingCount} rows) -> Skipping.`);
      continue;
    }

    if (existingCount > 0) {
      console.log(`[${idx + 1}/${BOOKS_TO_UPLOAD.length}] Clearing partial ${existingCount} rows for ${name}...`);
      await turso.execute({
        sql: 'DELETE FROM TafsirEntry WHERE authorId = ?',
        args: [authorId]
      });
    }

    console.log(`[${idx + 1}/${BOOKS_TO_UPLOAD.length}] Reading files for ${name}...`);
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
    console.log(`  ✓ Done in ${elapsed}s! (${rows.length} rows inserted)\n`);
  }

  console.log("=== All 39 Authentic Sunni Tafsirs Uploaded to Turso Successfully! ===");
}

main().catch(console.error);
