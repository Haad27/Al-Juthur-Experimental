const Database = require('better-sqlite3');
const path = require('path');

const AUTHOR_DATA = {
  1: { name: "Tafsir Ibn Uthaymeen", authorName: "Shaykh Muhammad ibn Salih al-Uthaymeen" },
  2: { name: "Aysar al-Tafasir", authorName: "Shaykh Abu Bakr Jabir al-Jazairi" },
  3: { name: "Adwa' al-Bayan", authorName: "Shaykh Muhammad al-Amin al-Shinqiti" },
  4: { name: "Al-Bahr al-Muhit", authorName: "Abu Hayyan al-Gharnati al-Andalusi" },
  5: { name: "Al-Basit", authorName: "Abu al-Hasan Ali ibn Ahmad al-Wahidi" },
  6: { name: "Al-Durr al-Masun", authorName: "Al-Samin al-Halabi" },
  7: { name: "Al-Durr al-Manthur", authorName: "Imam Jalal al-Din al-Suyuti" },
  8: { name: "Al-I'rab al-Muyassar", authorName: "Khalid Abdul-Rahman Al-Ak / Group of Scholars" },
  9: { name: "Al-Jadwal fi I'rab al-Quran", authorName: "Mahmud ibn Abdul-Rahim al-Safi" },
  10: { name: "Al-Kashshaf", authorName: "Abu al-Qasim Mahmud al-Zamakhshari" },
  11: { name: "Al-Lubab fi 'Ulum al-Kitab", authorName: "Ibn Adil al-Hanbali" },
  12: { name: "Al-Muharrar al-Wajiz", authorName: "Ibn Atiyyah al-Andalusi" },
  13: { name: "Al-Muyassar fi al-Gharib", authorName: "Center for Quranic Studies" },
  14: { name: "Al-Nashr fi al-Qira'at", authorName: "Imam Ibn al-Jazari" },
  15: { name: "Al-Qira'at al-Mawsu'ah", authorName: "Dr. Abdul-Latif Al-Khatib" },
  16: { name: "Al-Wajiz", authorName: "Imam Ali ibn Ahmad al-Wahidi" },
  17: { name: "I'rab al-Quran (Da'as)", authorName: "Ahmad al-Da'as & Ahmad al-Qawasmi" },
  18: { name: "Tafsir al-Qurtubi", authorName: "Imam Abu Abdullah al-Qurtubi" },
  19: { name: "Tafsir as-Sa'di", authorName: "Shaykh Abdur-Rahman ibn Nasir as-Sa'di" },
  20: { name: "Tahrir al-Tanwir (Tafsir Ibn 'Ashur)", authorName: "Shaykh Muhammad al-Tahir ibn 'Ashur" },
  21: { name: "Tafsir al-Baghawi", authorName: "Imam Abu Muhammad al-Baghawi" },
  22: { name: "Tafsir al-Tabari", authorName: "Imam Abu Ja'far Muhammad ibn Jarir al-Tabari" },
  23: { name: "Al-Tafsir al-Wasit", authorName: "Shaykh Muhammad Sayyid Tantawy" },
  24: { name: "Tafsir Ibn Kathir", authorName: "Hafiz Ibn Kathir" },
  25: { name: "Al-Tafsir al-Muyassar", authorName: "King Fahd Quran Printing Complex" },
  26: { name: "Al-Mukhtasar fi Tafsir al-Quran", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  27: { name: "Al-Siraj fi Bayan Gharib al-Quran", authorName: "Dr. Muhammad ibn Abdul-Aziz al-Khudairi" },
  28: { name: "Ayah Dependency Graphs", authorName: "Quranic Arabic Corpus Team" },
  29: { name: "Fath al-Bayan", authorName: "Siddiq Hasan Khan al-Qanuji" },
  30: { name: "Fath al-Qadir", authorName: "Imam Muhammad al-Shawkani" },
  31: { name: "I'rab al-Quran (Darwish)", authorName: "Muhyiddin al-Darwish" },
  32: { name: "Jami' al-Bayan (Al-Iji)", authorName: "Muhammad ibn Abdul-Rahman al-Iji" },
  33: { name: "Mahasin al-Ta'wil", authorName: "Shaykh Muhammad Jamal al-Din al-Qasimi" },
  34: { name: "Mawsu'at al-Tafsir al-Ma'thur", authorName: "Center for Quranic Studies" },
  35: { name: "Nazm al-Durar", authorName: "Burhan al-Din al-Biqa'i" },
  36: { name: "Tadabbur wa 'Amal", authorName: "Center for Quranic Reflection (Tadabbur)" },
  37: { name: "Tafsir Abi al-Su'ud", authorName: "Abu al-Sa'ud al-Amadi" },
  38: { name: "Tafsir al-Alusi (Ruh al-Ma'ani)", authorName: "Imam Shihab al-Din al-Alusi" },
  39: { name: "Tafsir al-Baydawi", authorName: "Imam Nasir al-Din al-Baydawi" },
  40: { name: "Tafsir al-Mawardi", authorName: "Abu al-Hasan al-Mawardi" },
  41: { name: "Tafsir al-Nasafi", authorName: "Imam Abu al-Barakat al-Nasafi" },
  42: { name: "Tafsir al-Razi (Mafatih al-Ghayb)", authorName: "Imam Fakhr al-Din al-Razi" },
  43: { name: "Tafsir al-Sam'ani", authorName: "Abu al-Muzaffar al-Sam'ani" },
  44: { name: "Tafsir al-Samarqandi", authorName: "Abu al-Layth al-Samarqandi" },
  45: { name: "Tafsir al-Tha'alibi", authorName: "Abu Zayd Abd al-Rahman al-Tha'alibi" },
  46: { name: "Tafsir as-Sa'di", authorName: "Shaykh Abdur-Rahman ibn Nasir as-Sa'di" },
  47: { name: "Tafsir Ibn Abi Hatim", authorName: "Imam Ibn Abi Hatim al-Razi" },
  48: { name: "Tafsir Ibn Abi Zamanin", authorName: "Ibn Abi Zamanin al-Andalusi" },
  49: { name: "Tafsir Ibn al-Jawzi (Zad al-Masir)", authorName: "Imam Ibn al-Jawzi" },
  50: { name: "Tafsir Ibn al-Qayyim", authorName: "Imam Ibn Qayyim al-Jawziyya" },
  51: { name: "Tafsir Ibn Juzay", authorName: "Ibn Juzay al-Kalbi al-Gharnati" },
  52: { name: "Tafsir al-Jalalayn", authorName: "Jalal al-Din al-Mahalli & Jalal al-Din al-Suyuti" },
  53: { name: "Tafsir Makki ibn Abi Talib", authorName: "Makki ibn Abi Talib al-Qaysi" },
  54: { name: "Tahlil Kalimat al-Quran", authorName: "Center for Quranic Studies" },
  55: { name: "Al-Mukhtasar (Bengali)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  56: { name: "Tafsir Ibn Kathir (Bengali)", authorName: "Hafiz Ibn Kathir" },
  57: { name: "Tafsir Abu Bakr Zakaria (Bengali)", authorName: "Shaykh Dr. Abu Bakr Muhammad Zakaria" },
  58: { name: "Tafsir Ahsanul Bayaan (Bengali)", authorName: "Hafiz Salahuddin Yusuf" },
  59: { name: "Tafsir Fathul Majid (Bengali)", authorName: "Shaykh Abdul Rahman bin Hasan Al ash-Sheikh" },
  60: { name: "Abridged Explanation of the Quran (English)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  61: { name: "Tafsir Ibn Kathir (English)", authorName: "Hafiz Ibn Kathir" },
  62: { name: "Ma'arif-ul-Quran (English)", authorName: "Mufti Muhammad Shafi" },
  63: { name: "Tafsir al-Jalalayn (English)", authorName: "Jalal al-Din al-Mahalli & Jalal al-Din al-Suyuti" },
  64: { name: "Tazkirul Quran (English)", authorName: "Maulana Wahiduddin Khan" },
  65: { name: "Tafsir as-Sa'di (Indonesian)", authorName: "Shaykh Abdur-Rahman ibn Nasir as-Sa'di" },
  66: { name: "Tafsir al-Jalalayn (Indonesian)", authorName: "Jalal al-Din al-Mahalli & Jalal al-Din al-Suyuti" },
  67: { name: "Al-Mukhtasar (Indonesian)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  68: { name: "Tafsir Rebar (Kurdish)", authorName: "Rebar Team (Kurdish)" },
  69: { name: "Al-Mukhtasar (Kurdish)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  70: { name: "Al-Mukhtasar (Assamese)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  71: { name: "Al-Mukhtasar (Azeri)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  72: { name: "Al-Mukhtasar (Bosnian)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  73: { name: "Al-Mukhtasar (Chinese)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  74: { name: "Tafsir as-Sa'di (French)", authorName: "Shaykh Abdur-Rahman ibn Nasir as-Sa'di" },
  75: { name: "Al-Mukhtasar (French)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  76: { name: "Al-Mukhtasar (Fulani)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  77: { name: "Al-Mukhtasar (Hindi)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  78: { name: "Al-Mukhtasar (Italian)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  79: { name: "Al-Mukhtasar (Japanese)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  80: { name: "Al-Mukhtasar (Khmer)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  81: { name: "Al-Mukhtasar (Kyrgyz)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  82: { name: "Al-Mukhtasar (Malayalam)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  83: { name: "Al-Mukhtasar (Serbian)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  84: { name: "Al-Mukhtasar (Sinhalese)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  85: { name: "Al-Mukhtasar (Spanish)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  86: { name: "Tafsir as-Sa'di (Albanian)", authorName: "Shaykh Abdur-Rahman ibn Nasir as-Sa'di" },
  87: { name: "Al-Mukhtasar (Tagalog)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  88: { name: "Al-Mukhtasar (Tamil)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  89: { name: "Al-Mukhtasar (Telugu)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  90: { name: "Al-Mukhtasar (Thai)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  91: { name: "Al-Mukhtasar (Uyghur)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  92: { name: "Al-Mukhtasar (Uzbek)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  93: { name: "Al-Mukhtasar (Vietnamese)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  94: { name: "Al-Mukhtasar (Persian)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  95: { name: "Tafsir as-Sa'di (Russian)", authorName: "Shaykh Abdur-Rahman ibn Nasir as-Sa'di" },
  96: { name: "Tafsir Ibn Kathir (Russian)", authorName: "Hafiz Ibn Kathir" },
  97: { name: "Al-Mukhtasar (Russian)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  98: { name: "Tafsir as-Sa'di (Russian Concise)", authorName: "Shaykh Abdur-Rahman ibn Nasir as-Sa'di" },
  99: { name: "Tafsir as-Sa'di (Turkish)", authorName: "Shaykh Abdur-Rahman ibn Nasir as-Sa'di" },
  100: { name: "Tafsir Ibn Kathir (Turkish)", authorName: "Hafiz Ibn Kathir" },
  101: { name: "Al-Mukhtasar (Turkish)", authorName: "Center for Quranic Interpretation (Al-Mukhtasar)" },
  102: { name: "Tafsir Ibn Kathir (Urdu)", authorName: "Hafiz Ibn Kathir" },
  103: { name: "Tafsir as-Sa'di (Urdu)", authorName: "Shaykh Abdur-Rahman ibn Nasir as-Sa'di" },
  104: { name: "Bayan-ul-Quran (Urdu)", authorName: "Maulana Ashraf Ali Thanwi" },
  105: { name: "Fi Zilal al-Quran (Urdu)", authorName: "Sayyid Qutb" },
  106: { name: "Tazkirul Quran (Urdu)", authorName: "Maulana Wahiduddin Khan" },
  107: { name: "Kashf al-Asrar (English)", authorName: "Rashid al-Din Maybudi" },
  108: { name: "Lata'if al-Isharat (Tafsir al-Qushayri)", authorName: "Imam Abu al-Qasim al-Qushayri" },
  109: { name: "Tafsir al-Kashani (English)", authorName: "Abd al-Razzaq al-Kashani" },
  110: { name: "Tafsir al-Tustari (English)", authorName: "Sahl al-Tustari" },
  111: { name: "Asbab al-Nuzul (Al-Wahidi)", authorName: "Imam Ali ibn Ahmad al-Wahidi" },
  112: { name: "Tanwir al-Miqbas (Tafsir Ibn 'Abbas)", authorName: "Attributed to Abdullah ibn Abbas" },
  113: { name: "Tafsir al-Jalalayn (English Abridged)", authorName: "Jalal al-Din al-Mahalli & Jalal al-Din al-Suyuti" }
};

function updateDb(dbPath) {
  const fs = require('fs');
  if (!fs.existsSync(dbPath)) {
    console.log('DB path does not exist, skipping:', dbPath);
    return;
  }
  console.log('Updating database at:', dbPath);
  const db = new Database(dbPath);

  // 1. Add column authorName if not exists
  const columns = db.prepare(`PRAGMA table_info(Author)`).all();
  const hasAuthorName = columns.some(c => c.name === 'authorName');
  if (!hasAuthorName) {
    console.log('Adding authorName column to Author table...');
    db.prepare(`ALTER TABLE Author ADD COLUMN authorName TEXT`).run();
  }

  // 2. Update name and authorName for each author ID
  const updateStmt = db.prepare(`UPDATE Author SET name = ?, authorName = ? WHERE id = ?`);

  let updatedCount = 0;
  db.transaction(() => {
    for (const [idStr, data] of Object.entries(AUTHOR_DATA)) {
      const id = parseInt(idStr, 10);
      const res = updateStmt.run(data.name, data.authorName, id);
      if (res.changes > 0) updatedCount++;
    }
  })();

  console.log(`Successfully updated ${updatedCount} entries in ${dbPath}!`);
  db.close();
}

function main() {
  updateDb(path.join(process.cwd(), 'prisma', 'dev.db'));
  updateDb(path.join(process.cwd(), 'dev.db'));
}

main();
