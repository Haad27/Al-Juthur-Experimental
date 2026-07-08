import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({});

async function main() {
  console.log("Seeding Database with Mock Tafsir data...");

  // 1. Create Languages
  const langEn = await prisma.language.upsert({ where: { code: 'en' }, update: {}, create: { code: 'en', name: 'English' } });
  const langAr = await prisma.language.upsert({ where: { code: 'ar' }, update: {}, create: { code: 'ar', name: 'Arabic' } });

  // 2. Create Authors
  const author1 = await prisma.author.create({ data: { name: 'Tafsir Ibn Kathir', languageId: langEn.id } });
  const author2 = await prisma.author.create({ data: { name: 'Tafsir Al-Jalalayn', languageId: langAr.id } });
  const author3 = await prisma.author.create({ data: { name: 'Tafsir As-Saadi', languageId: langEn.id } });

  // 3. Create Surah 1 (Al-Fatihah)
  const surah = await prisma.surah.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'الفاتحة', englishName: 'Al-Fatihah' }
  });

  // 4. Create Ayahs
  for (let i = 1; i <= 7; i++) {
    await prisma.ayah.upsert({
      where: { surahId_numberInSurah: { surahId: 1, numberInSurah: i } },
      update: {},
      create: { surahId: 1, numberInSurah: i, text: `Mock Arabic Text for Ayah ${i}` }
    });
  }

  const ayahs = await prisma.ayah.findMany({ where: { surahId: 1 } });

  // 5. Insert mock Tafsir for Ibn Kathir
  for (const ayah of ayahs) {
    await prisma.tafsirEntry.create({
      data: {
        authorId: author1.id,
        surahId: 1,
        ayahId: ayah.id,
        text: `(This is a placeholder for Tafsir Ibn Kathir - English) \n\nThe profound meaning of Ayah ${ayah.numberInSurah} reminds the believer of the ultimate mercy...`
      }
    });
    
    await prisma.tafsirEntry.create({
      data: {
        authorId: author2.id,
        surahId: 1,
        ayahId: ayah.id,
        text: `(تفسير الجلالين - عربي) \n\nتفسير الآية ${ayah.numberInSurah} يدل على عظمة الخالق...`
      }
    });
  }

  console.log("Seeding complete! Database is populated with Mock Tafsirs.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
