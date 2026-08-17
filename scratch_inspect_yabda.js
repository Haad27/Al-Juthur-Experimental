const Database = require('better-sqlite3');
const db = new Database('dev.db');

// Find occurrences of "يبدأ" or "يبدؤ"
const yabad = db.prepare("SELECT surahId, numberInSurah, text FROM Ayah WHERE text LIKE '%يَبْدَ%' OR text LIKE '%يَبْدُ%'").all();
console.log('--- Yabda ayahs ---');
for (const a of yabad) {
  console.log(`\nSurah ${a.surahId}:${a.numberInSurah}`);
  console.log('Text:', a.text);
  const words = a.text.split(/\s+/);
  for (const w of words) {
    if (w.includes('يَبْد')) {
      const chars = [...w].map(c => `${c} (U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')})`).join(' ');
      console.log(`Word: "${w}" ->`, chars);
    }
  }
}

// Find occurrences of "سلطان"
const sultan = db.prepare("SELECT surahId, numberInSurah, text FROM Ayah WHERE text LIKE '%سُلْطَ%'").all();
console.log('\n--- Sultan ayahs ---');
for (const a of sultan.slice(0, 5)) {
  console.log(`\nSurah ${a.surahId}:${a.numberInSurah}`);
  console.log('Text:', a.text);
  const words = a.text.split(/\s+/);
  for (const w of words) {
    if (w.includes('سُلْط')) {
      const chars = [...w].map(c => `${c} (U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')})`).join(' ');
      console.log(`Word: "${w}" ->`, chars);
    }
  }
}
