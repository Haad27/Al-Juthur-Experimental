const Database = require('better-sqlite3');
const path = require('path');

const ERA_EARLY = "Early Classical (7th-10th CE)";
const ERA_MEDIEVAL = "Medieval (11th-14th CE)";
const ERA_POST = "Post-Classical (15th-18th CE)";
const ERA_MODERN = "Modern & Contemporary (19th-21st CE)";

const TAGS = [
  { name: "Athari / Riwayah", color: "amber" },
  { name: "Linguistic & Rhetoric", color: "emerald" },
  { name: "Legal / Fiqhi", color: "blue" },
  { name: "Sufi / Ishari", color: "purple" },
  { name: "Modern Comprehensive", color: "cyan" },
  { name: "Abridged / Translation", color: "zinc" }
];

const CLASSIFICATIONS = {
  // Early Classical
  "Ar Tafsir Al Tabari": { era: ERA_EARLY, tags: ["Athari / Riwayah"] },
  "Tafsir Al Samarqandi": { era: ERA_EARLY, tags: ["Athari / Riwayah"] },
  "Tafsir Ibn Abi Zamanin": { era: ERA_EARLY, tags: ["Athari / Riwayah"] },
  "Tafsir Al Mawardi": { era: ERA_EARLY, tags: ["Linguistic & Rhetoric"] },
  "En Tafsir Al Tustari": { era: ERA_EARLY, tags: ["Sufi / Ishari"] },
  "En Tafsir Ibn Abbas": { era: ERA_EARLY, tags: ["Athari / Riwayah"] },
  "Al Wajiz Wahidi": { era: ERA_EARLY, tags: ["Athari / Riwayah"] },
  "En Asbab Al Nuzul By Al Wahidi": { era: ERA_EARLY, tags: ["Athari / Riwayah"] },

  // Medieval
  "Al Kashshaf Al Zamakhshari": { era: ERA_MEDIEVAL, tags: ["Linguistic & Rhetoric"] },
  "Tafsir Al Razi": { era: ERA_MEDIEVAL, tags: ["Linguistic & Rhetoric"] },
  "Ar Tafsir Al Baghawi": { era: ERA_MEDIEVAL, tags: ["Athari / Riwayah"] },
  "Al Muharrar Al Wajiz Ibn Atiyyah": { era: ERA_MEDIEVAL, tags: ["Linguistic & Rhetoric"] },
  "Ar Tafseer Al Qurtubi": { era: ERA_MEDIEVAL, tags: ["Legal / Fiqhi"] },
  "Ar Tafsir Ibn Kathir": { era: ERA_MEDIEVAL, tags: ["Athari / Riwayah"] },
  "En Tafisr Ibn Kathir": { era: ERA_MEDIEVAL, tags: ["Athari / Riwayah"] },
  "Bn Tafseer Ibn E Kaseer": { era: ERA_MEDIEVAL, tags: ["Athari / Riwayah"] },
  "Tr Tafsir Ibne Kathir": { era: ERA_MEDIEVAL, tags: ["Athari / Riwayah"] },
  "Tafseer Ibn E Kaseer Urdu": { era: ERA_MEDIEVAL, tags: ["Athari / Riwayah"] },
  "Ru Tafsir Ibne Kahtir": { era: ERA_MEDIEVAL, tags: ["Athari / Riwayah"] },
  "Tafsir Ibn Al Jawzi": { era: ERA_MEDIEVAL, tags: ["Athari / Riwayah"] },
  "Tafsir Al Baydawi": { era: ERA_MEDIEVAL, tags: ["Linguistic & Rhetoric"] },
  "Tafsir Al Nasafi": { era: ERA_MEDIEVAL, tags: ["Linguistic & Rhetoric"] },
  "Tafsir Al Tha Alibi": { era: ERA_MEDIEVAL, tags: ["Linguistic & Rhetoric"] },
  "Tafsir Ibn Juzay": { era: ERA_MEDIEVAL, tags: ["Legal / Fiqhi"] },
  "Tafsir Ibn Al Qayyim": { era: ERA_MEDIEVAL, tags: ["Athari / Riwayah"] },
  "En Kashf Al Asrar Tafsir": { era: ERA_MEDIEVAL, tags: ["Sufi / Ishari"] },
  "En Kashani Tafsir": { era: ERA_MEDIEVAL, tags: ["Sufi / Ishari"] },
  "Tafsir Al Sam Ani": { era: ERA_MEDIEVAL, tags: ["Athari / Riwayah"] },
  "Tafsir Ibn Abi Hatim": { era: ERA_MEDIEVAL, tags: ["Athari / Riwayah"] },
  "En Al Qushairi Tafsir": { era: ERA_MEDIEVAL, tags: ["Sufi / Ishari"] },

  // Post-Classical
  "Tafsir Jalalayn": { era: ERA_POST, tags: ["Abridged / Translation", "Linguistic & Rhetoric"] },
  "En Al Jalalayn": { era: ERA_POST, tags: ["Abridged / Translation", "Linguistic & Rhetoric"] },
  "Tafsir Al Jalalayn": { era: ERA_POST, tags: ["Abridged / Translation", "Linguistic & Rhetoric"] },
  "In Tafsir Jalalayn": { era: ERA_POST, tags: ["Abridged / Translation", "Linguistic & Rhetoric"] },
  "Al Durr Al Manthur": { era: ERA_POST, tags: ["Athari / Riwayah"] },
  "Nazam Al Durar Al Biqa I": { era: ERA_POST, tags: ["Linguistic & Rhetoric"] },
  "Al Nashr Li Ibn Al Jazari": { era: ERA_POST, tags: ["Linguistic & Rhetoric"] },
  "Fath Al Qadir Al Shawkani": { era: ERA_POST, tags: ["Athari / Riwayah", "Legal / Fiqhi"] },
  "Al Lubab Fi Ulum Al Kitab": { era: ERA_POST, tags: ["Linguistic & Rhetoric"] },
  "Al Dur Al Masun Lil Samin Al Halabi": { era: ERA_POST, tags: ["Linguistic & Rhetoric"] },
  "Tafsir Abi Al Su Ood": { era: ERA_POST, tags: ["Linguistic & Rhetoric"] },
  "Al Bahr Al Muhit": { era: ERA_POST, tags: ["Linguistic & Rhetoric"] },
  "Al Basit": { era: ERA_POST, tags: ["Linguistic & Rhetoric"] },
  "Al I Rab Al Muyassar": { era: ERA_POST, tags: ["Linguistic & Rhetoric"] },
  "Al Jadwal Fi I Rab Al Quran": { era: ERA_POST, tags: ["Linguistic & Rhetoric"] },
  "Alrab Al Quran Li Da As": { era: ERA_POST, tags: ["Linguistic & Rhetoric"] },
  "I Rab Al Quran Li Al Darwish": { era: ERA_POST, tags: ["Linguistic & Rhetoric"] },

  // Modern & Contemporary
  "Ar Tafseer Al Saddi": { era: ERA_MODERN, tags: ["Modern Comprehensive"] },
  "Tafsir As Saadi": { era: ERA_MODERN, tags: ["Modern Comprehensive"] },
  "Id Tafsir As Saadi": { era: ERA_MODERN, tags: ["Modern Comprehensive"] },
  "Sq Saadi": { era: ERA_MODERN, tags: ["Modern Comprehensive"] },
  "Fr Tafsir As Saadi": { era: ERA_MODERN, tags: ["Modern Comprehensive"] },
  "Ru Tafseer Al Saddi": { era: ERA_MODERN, tags: ["Modern Comprehensive"] },
  "Tafsir As Saadi Russian": { era: ERA_MODERN, tags: ["Modern Comprehensive"] },
  "Tafsir Ibn Uthaymeen": { era: ERA_MODERN, tags: ["Modern Comprehensive"] },
  "Abu Bakr Jabir Al Jazairi": { era: ERA_MODERN, tags: ["Modern Comprehensive"] },
  "Ar Tafseer Tahrir Al Tanwir": { era: ERA_MODERN, tags: ["Linguistic & Rhetoric", "Modern Comprehensive"] },
  "Mahasin Al Ta Wil Al Qasimi": { era: ERA_MODERN, tags: ["Modern Comprehensive"] },
  "Adwa Al Bayan": { era: ERA_MODERN, tags: ["Modern Comprehensive"] },
  "Ar Tafsir Al Wasit": { era: ERA_MODERN, tags: ["Modern Comprehensive"] },
  "Ar Tafsir Muyassar": { era: ERA_MODERN, tags: ["Abridged / Translation"] },
  "Al Muyassar Fi Al Gharib": { era: ERA_MODERN, tags: ["Abridged / Translation"] },
  "Asseraj Fi Bayan Gharib Alquran": { era: ERA_MODERN, tags: ["Abridged / Translation"] },
  "Arabic Al Mukhtasar In Interpreting The Noble Quran": { era: ERA_MODERN, tags: ["Abridged / Translation"] },
  "Abridged Explanation Of The Quran": { era: ERA_MODERN, tags: ["Abridged / Translation"] },
  "En Tafsir Maarif Ul Quran": { era: ERA_MODERN, tags: ["Modern Comprehensive", "Legal / Fiqhi"] },
  "Tafsir Bayan Ul Quran": { era: ERA_MODERN, tags: ["Modern Comprehensive"] },
  "Tafsir Fe Zalul Quran Syed Qatab": { era: ERA_MODERN, tags: ["Modern Comprehensive"] },
  "Tazkirul Quran En": { era: ERA_MODERN, tags: ["Modern Comprehensive"] },
  "Tazkiru Quran Ur": { era: ERA_MODERN, tags: ["Modern Comprehensive"] },
  "Tadabbur Wa Amal": { era: ERA_MODERN, tags: ["Modern Comprehensive"] },
  "Tahlil Kalimat Al Qur An": { era: ERA_MODERN, tags: ["Linguistic & Rhetoric"] },
  "Ayah Dependency Graphs": { era: ERA_MODERN, tags: ["Linguistic & Rhetoric"] },
  "Al Qira At Al Mawsoo Ah Al Qur Aniyyah": { era: ERA_MODERN, tags: ["Linguistic & Rhetoric"] },
  "Mawsoo At Al Tafsir Al Ma Thoor": { era: ERA_MODERN, tags: ["Athari / Riwayah"] },
  "Bn Tafsir Abu Bakr Zakaria": { era: ERA_MODERN, tags: ["Modern Comprehensive"] },
  "Bn Tafsir Ahsanul Bayaan": { era: ERA_MODERN, tags: ["Modern Comprehensive"] },
  "Tafisr Fathul Majid Bn": { era: ERA_MODERN, tags: ["Modern Comprehensive"] },
  "Kurd Tafsir Rebar": { era: ERA_MODERN, tags: ["Modern Comprehensive"] },
  "Fath Al Bayan Li Al Qanuji": { era: ERA_POST, tags: ["Athari / Riwayah", "Legal / Fiqhi"] },
  "Tafsir Makhi": { era: ERA_MODERN, tags: ["Modern Comprehensive"] }
};

function seedDatabase(dbPath) {
  console.log(`\nSeeding database: ${dbPath}`);
  const db = new Database(dbPath);
  
  // Ensure table Tag and _AuthorToTag exist (in case Prisma push didn't run on this specific copy yet)
  db.exec(`
    CREATE TABLE IF NOT EXISTS "Tag" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "color" TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "Tag_name_key" ON "Tag"("name");
    CREATE TABLE IF NOT EXISTS "_AuthorToTag" (
      "A" INTEGER NOT NULL,
      "B" INTEGER NOT NULL,
      FOREIGN KEY ("A") REFERENCES "Author" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY ("B") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "_AuthorToTag_AB_unique" ON "_AuthorToTag"("A", "B");
    CREATE INDEX IF NOT EXISTS "_AuthorToTag_B_index" ON "_AuthorToTag"("B");
  `);

  const insertTag = db.prepare(`INSERT OR IGNORE INTO Tag (name, color) VALUES (?, ?)`);
  const getTagId = db.prepare(`SELECT id FROM Tag WHERE name = ?`);
  
  // Insert all tags
  for (const t of TAGS) {
    insertTag.run(t.name, t.color);
  }

  const tagMap = {};
  for (const t of TAGS) {
    const row = getTagId.get(t.name);
    if (row) tagMap[t.name] = row.id;
  }

  const authors = db.prepare(`SELECT id, name FROM Author`).all();
  const updateAuthor = db.prepare(`UPDATE Author SET era = ? WHERE id = ?`);
  const insertAuthorTag = db.prepare(`INSERT OR IGNORE INTO _AuthorToTag (A, B) VALUES (?, ?)`);
  const clearAuthorTags = db.prepare(`DELETE FROM _AuthorToTag WHERE A = ?`);

  db.transaction(() => {
    let count = 0;
    for (const auth of authors) {
      let info = CLASSIFICATIONS[auth.name];
      if (!info) {
        // Fallback for Mokhtasar and modern translations
        if (auth.name.includes("Mokhtasar") || auth.name.includes("Mukhtasar") || auth.name.includes("Saadi")) {
          info = { era: ERA_MODERN, tags: ["Abridged / Translation"] };
        } else {
          info = { era: ERA_MODERN, tags: ["Modern Comprehensive"] };
        }
      }

      updateAuthor.run(info.era, auth.id);
      clearAuthorTags.run(auth.id);

      for (const tagName of info.tags) {
        const tagId = tagMap[tagName];
        if (tagId) {
          insertAuthorTag.run(auth.id, tagId);
        }
      }
      count++;
    }
    console.log(`Successfully classified ${count} authors.`);
  })();

  db.close();
}

const rootDb = path.join(__dirname, '..', 'dev.db');
const prismaDb = path.join(__dirname, '..', 'prisma', 'dev.db');

seedDatabase(rootDb);
seedDatabase(prismaDb);
