const Database = require('better-sqlite3');
const db = new Database('dev.db');

const rows = db.prepare("SELECT surahId, numberInSurah, text FROM Ayah WHERE text LIKE '%سُلْطَ%'").all();
for (const r of rows) {
  const words = r.text.split(/\s+/);
  for (const w of words) {
    if (w.includes('سُلْط')) {
      const chars = [...w].map(c => `${c} (U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')})`).join(' ');
      console.log(`Surah ${r.surahId}:${r.numberInSurah} -> Word: "${w}" ->`, chars);
    }
  }
}
