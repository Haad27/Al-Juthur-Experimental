const Database = require('better-sqlite3');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const ayahs = await prisma.ayah.findMany({
    where: { surahId: 1 },
    orderBy: { numberInSurah: 'asc' }
  });
  console.log(ayahs[0].text);
}
test();
