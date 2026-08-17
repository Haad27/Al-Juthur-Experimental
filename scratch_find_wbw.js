const fs = require('fs');
const wbw = JSON.parse(fs.readFileSync('database/word-by-word-translation/english-wbw-translation.json', 'utf8'));

const Database = require('better-sqlite3');
const db = new Database('dev.db');

for (const [key, value] of Object.entries(wbw)) {
  if (value.toLowerCase().includes('authority') || value.toLowerCase().includes('an authority')) {
    console.log(`WBW Key: ${key} -> Meaning: "${value}"`);
    const [s, a] = key.split(':');
    const ayah = db.prepare('SELECT text FROM Ayah WHERE surahId = ? AND numberInSurah = ?').get(s, a);
    if (ayah) {
      console.log(`Ayah ${key} text:`, ayah.text);
      const words = ayah.text.split(/\s+/);
      for (const w of words) {
        const chars = [...w].map(c => `${c} (U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')})`).join(' ');
        console.log(`  Word: "${w}" ->`, chars);
      }
    }
    break;
  }
}
