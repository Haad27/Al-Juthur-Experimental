const { createClient } = require('@libsql/client');
require('dotenv').config();

async function test() {
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    const res = await turso.execute('SELECT COUNT(*) as c FROM Author');
    console.log("Author count:", res.rows[0].c);

    const res2 = await turso.execute('SELECT COUNT(*) as c FROM Language');
    console.log("Language count:", res2.rows[0].c);

    const res3 = await turso.execute('SELECT COUNT(*) as c FROM TafsirEntry');
    console.log("Tafsir count:", res3.rows[0].c);

  } catch (e) {
    console.error("Error querying Turso:", e);
  }
}

test();
