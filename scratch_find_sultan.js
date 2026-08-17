const Database = require('better-sqlite3');
const db = new Database('dev.db');

const rows = db.prepare("SELECT surahId, numberInSurah, text FROM Ayah").all();
let found = 0;
for (const r of rows) {
  if (r.text.includes('سُلْطَٰنًۭا') || r.text.includes('سُلْطَٰنًا') || r.text.includes('سُلْطَانًا') || r.text.includes('سُلْطَـٰنًا') || r.text.includes('سلطن') || r.text.includes('سُلْطَ')) {
    console.log(`\nSurah ${r.surahId}:${r.numberInSurah}`);
    const words = r.text.split(/\s+/);
    for (const w of words) {
      if (w.includes('س') && w.includes('ل') && w.includes('ط')) {
        const chars = [...w].map(c => `${c} (U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')})`).join(' ');
        console.log(`Word: "${w}" ->`, chars);
      }
    }
    found++;
    if (found > 5) break;
  }
}
