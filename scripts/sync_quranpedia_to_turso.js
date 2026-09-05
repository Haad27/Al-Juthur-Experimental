require('dotenv').config();
const { createClient } = require('@libsql/client');

const NEW_AUTHORS = [
  { id: 201, name: "Tafsir al-Manar (تفسير المنار)", authorName: "Muhammad Rashid Rida", era: "Modern & Contemporary (19th-21st CE)", tags: [5] },
  { id: 202, name: "Tafsir al-Sha'rawi (تفسير الشعراوي)", authorName: "Shaykh Muhammad Metwalli al-Sha'rawi", era: "Modern & Contemporary (19th-21st CE)", tags: [5] },
  { id: 203, name: "Al-Tafsir al-Munir (التفسير المنير)", authorName: "Dr. Wahbah al-Zuhayli", era: "Modern & Contemporary (19th-21st CE)", tags: [5, 3] },
  { id: 204, name: "Al-Tafsir al-Wasit (الوسيط للزحيلي)", authorName: "Dr. Wahbah al-Zuhayli", era: "Modern & Contemporary (19th-21st CE)", tags: [5] },
  { id: 205, name: "Safwat al-Tafasir (صفوة التفاسير)", authorName: "Shaykh Muhammad Ali al-Sabuni", era: "Modern & Contemporary (19th-21st CE)", tags: [5, 6] },
  { id: 206, name: "Mukhtasar Ibn Kathir (مختصر تفسير ابن كثير)", authorName: "Shaykh Muhammad Ali al-Sabuni", era: "Modern & Contemporary (19th-21st CE)", tags: [1, 6] },
  { id: 207, name: "Tafsir al-Maraghi (تفسير المراغي)", authorName: "Ahmad Mustafa al-Maraghi", era: "Modern & Contemporary (19th-21st CE)", tags: [5, 2] },
  { id: 208, name: "Al-Tafsir al-Hadith (التفسير الحديث)", authorName: "Muhammad Izzat Darwaza", era: "Modern & Contemporary (19th-21st CE)", tags: [5] },
  { id: 209, name: "Ruh al-Bayan (روح البيان)", authorName: "Ismail Haqqi al-Burusawi", era: "Post-Classical (15th-18th CE)", tags: [4, 2] },
  { id: 210, name: "Al-Kashf wal-Bayan (تفسير الثعلبي)", authorName: "Abu Ishaq al-Tha'labi", era: "Early Classical (7th-10th CE)", tags: [1] },
  { id: 211, name: "Lubab al-Ta'wil (تفسير الخازن)", authorName: "Ali ibn Muhammad al-Khazin", era: "Medieval (11th-14th CE)", tags: [1] },
  { id: 212, name: "Ahkam al-Quran (أحكام القرآن للجصاص)", authorName: "Abu Bakr al-Jassas", era: "Early Classical (7th-10th CE)", tags: [3] },
  { id: 213, name: "Ahkam al-Quran (أحكام القرآن لابن العربي)", authorName: "Abu Bakr ibn al-Arabi al-Maliki", era: "Medieval (11th-14th CE)", tags: [3] },
  { id: 214, name: "Ahkam al-Quran (أحكام القرآن للهراسي)", authorName: "Imam Ilkiya al-Harrasi", era: "Medieval (11th-14th CE)", tags: [3] },
  { id: 215, name: "Ta'wilat Ahl al-Sunnah (تفسير الماتريدي)", authorName: "Abu Mansur al-Maturidi", era: "Early Classical (7th-10th CE)", tags: [2] },
  { id: 216, name: "Al-Bahr al-Madid (البحر المديد لابن عجيبة)", authorName: "Ahmad ibn Ajiba", era: "Post-Classical (15th-18th CE)", tags: [4] },
  { id: 217, name: "Tafsir Muqatil ibn Sulayman (تفسير مقاتل بن سليمان)", authorName: "Muqatil ibn Sulayman", era: "Early Classical (7th-10th CE)", tags: [1] },
  { id: 218, name: "Tafsir Mujahid (تفسير مجاهد بن جبر)", authorName: "Imam Mujahid ibn Jabr", era: "Early Classical (7th-10th CE)", tags: [1] },
  { id: 219, name: "Tafsir al-Imam Malik (تفسير الإمام مالك)", authorName: "Imam Malik ibn Anas", era: "Early Classical (7th-10th CE)", tags: [1, 3] },
  { id: 220, name: "Tafsir al-Imam al-Shafi'i (تفسير الإمام الشافعي)", authorName: "Imam Muhammad ibn Idris al-Shafi'i", era: "Early Classical (7th-10th CE)", tags: [3, 1] },
  { id: 221, name: "Tafsir al-Nasa'i (تفسير النسائي)", authorName: "Imam Ahmad ibn Shu'ayb al-Nasa'i", era: "Early Classical (7th-10th CE)", tags: [1] },
  { id: 222, name: "Al-Hidayah ila Bulugh al-Nihayah (الهداية لمكي)", authorName: "Imam Makki ibn Abi Talib", era: "Early Classical (7th-10th CE)", tags: [2] },
  { id: 223, name: "Hashiyat al-Sawi (حاشية الصاوي على الجلالين)", authorName: "Ahmad ibn Muhammad al-Sawi", era: "Post-Classical (15th-18th CE)", tags: [2, 5] },
  { id: 224, name: "Tafsir Sufyan al-Thawri (تفسير سفيان الثوري)", authorName: "Imam Sufyan al-Thawri", era: "Early Classical (7th-10th CE)", tags: [1] },
  { id: 225, name: "Ghara'ib al-Quran (غرائب القرآن للنيسابوري)", authorName: "Nizam al-Din al-Naysaburi", era: "Medieval (11th-14th CE)", tags: [2, 4] }
];

async function syncToTurso() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.log("No Turso credentials found in .env, skipping Turso sync.");
    return;
  }

  console.log("Connecting to Turso...");
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  for (const author of NEW_AUTHORS) {
    console.log(`Syncing ${author.id}: ${author.name}...`);
    await turso.execute({
      sql: `INSERT INTO Author (id, name, authorName, languageId, era)
            VALUES (?, ?, ?, 1, ?)
            ON CONFLICT(id) DO UPDATE SET name = excluded.name, authorName = excluded.authorName, era = excluded.era;`,
      args: [author.id, author.name, author.authorName, author.era]
    });

    for (const tagId of author.tags) {
      try {
        await turso.execute({
          sql: `INSERT OR IGNORE INTO _AuthorToTag (A, B) VALUES (?, ?);`,
          args: [author.id, tagId]
        });
      } catch (err) {
        // ignore duplicate
      }
    }
  }

  console.log("All 25 authors and tags synced to Turso successfully!");
}

syncToTurso().catch(console.error);
