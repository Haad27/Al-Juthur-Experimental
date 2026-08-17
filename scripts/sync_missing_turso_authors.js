require('dotenv').config();
const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');

async function syncAuthorsToTurso() {
  const localDb = new Database('./prisma/dev.db', { readonly: true });
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const authorsToSync = [
    {
      id: 114,
      name: 'Al-Mukhtasar (Pashto)',
      authorName: 'Center for Quranic Interpretation (Al-Mukhtasar)',
      languageId: 11,
      era: 'Contemporary',
    },
    {
      id: 125,
      name: 'Tanwir al-Miqbas min Tafsir Ibn Abbas (Arabic Full)',
      authorName: 'Attributed to Abdullah ibn Abbas',
      languageId: 1,
      era: 'Classical',
    },
    {
      id: 128,
      name: "Lata'if al-Isharat (Tafsir al-Qushayri English)",
      authorName: 'Imam Abu al-Qasim al-Qushayri',
      languageId: 3,
      era: 'Classical',
    },
    {
      id: 129,
      name: 'Asbab al-Nuzul (Al-Wahidi English)',
      authorName: 'Imam Ali ibn Ahmad al-Wahidi',
      languageId: 3,
      era: 'Classical',
    },
    {
      id: 131,
      name: "Tanwir al-Miqbas (Tafsir Ibn 'Abbas English)",
      authorName: 'Attributed to Abdullah ibn Abbas',
      languageId: 3,
      era: 'Classical',
    },
    {
      id: 138,
      name: 'Tafheem-ul-Quran (Urdu)',
      authorName: "Sayyid Abul A'la Maududi",
      languageId: 10,
      era: 'Modern',
    },
    {
      id: 139,
      name: 'Aasan Tarjuma Quran & Notes (Urdu)',
      authorName: 'Mufti Muhammad Taqi Usmani',
      languageId: 10,
      era: 'Contemporary',
    },
  ];

  for (const a of authorsToSync) {
    console.log('Syncing author:', a.id, a.name);
    await turso.execute({
      sql: 'INSERT INTO Author (id, name, authorName, languageId, era) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, authorName = excluded.authorName, languageId = excluded.languageId, era = excluded.era',
      args: [a.id, a.name, a.authorName, a.languageId, a.era],
    });
  }

  // Sync tags for these authors
  const localTags = localDb
    .prepare(
      'SELECT at.A as authorId, at.B as tagId FROM _AuthorToTag at WHERE at.A IN (114, 125, 128, 129, 131, 138, 139)'
    )
    .all();

  for (const t of localTags) {
    try {
      await turso.execute({
        sql: 'INSERT OR IGNORE INTO _AuthorToTag (A, B) VALUES (?, ?)',
        args: [t.authorId, t.tagId],
      });
    } catch (e) {
      console.warn('Tag note:', e.message);
    }
  }

  // Sync Pashto TafsirEntry into Turso
  const psEntries = localDb
    .prepare('SELECT authorId, surahId, ayahId, text FROM TafsirEntry WHERE authorId = 114')
    .all();
  console.log(`Found ${psEntries.length} Pashto TafsirEntry rows to sync...`);

  const BATCH_SIZE = 250;
  for (let i = 0; i < psEntries.length; i += BATCH_SIZE) {
    const chunk = psEntries.slice(i, i + BATCH_SIZE);
    const statements = chunk.map((entry) => ({
      sql: 'INSERT OR IGNORE INTO TafsirEntry (authorId, surahId, ayahId, text) VALUES (?, ?, ?, ?)',
      args: [entry.authorId, entry.surahId, entry.ayahId, entry.text],
    }));
    await turso.batch(statements, 'write');
    console.log(`Synced Pashto entries ${i + chunk.length} / ${psEntries.length}`);
  }

  console.log('Successfully completed sync to Turso!');

  // Verify
  const psAuthors = await turso.execute('SELECT * FROM Author WHERE languageId = 11');
  console.log('Pashto authors in Turso now:', psAuthors.rows);
  const psEntryCount = await turso.execute('SELECT count(*) as count FROM TafsirEntry WHERE authorId = 114');
  console.log('Pashto TafsirEntry count in Turso:', psEntryCount.rows[0].count);
}

syncAuthorsToTurso()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
