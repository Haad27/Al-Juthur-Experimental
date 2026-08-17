const Database = require('better-sqlite3');
const db = new Database('dev.db');

const rows = db.prepare("SELECT surahId, numberInSurah, text FROM Ayah").all();
console.log('Total Ayahs in dev.db:', rows.length);

for (const r of rows) {
  if (r.text.includes('\u0633') && r.text.includes('\u0644') && r.text.includes('\u0637')) {
    console.log(`Surah ${r.surahId}:${r.numberInSurah} -> ${r.text.slice(0, 80)}`);
    const words = r.text.split(/\s+/);
    for (const w of words) {
      if (w.includes('\u0633') && w.includes('\u0637')) {
        const chars = [...w].map(c => `${c} (U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')})`).join(' ');
        console.log(`Word: "${w}" ->`, chars);
      }
    }
    break;
  }
}
